import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenAI } from '@google/genai';

export const dynamic = 'force-dynamic';

// Initialize Gemini on the server side lazily only when needed
let aiInstance: GoogleGenAI | null = null;

// Modular global cache to avoid repetitive database reads and Gemini API requests in the same container session
let thoughtCache: {
  data_exibicao: string;
  data: any;
} | null = null;

// Cool-down timestamp to respect the Gemini API rate limits/quota (429) and avoid spamming/retrying when blocked.
let geminiBlockedUntil = 0;

// Shared active promise to prevent parallel/duplicate requests from hitting Supabase/Gemini concurrently
let activeRequestPromise: Promise<any> | null = null;

function getGeminiAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined');
    }
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// A robust list of offline quotes to fall back on in extreme cases (e.g., API limits or offline mode)
const fallbackQuotes = [
  {
    texto: "Tudo posso naquele que me fortalece.",
    autor: "Apóstolo Paulo (Filipenses 4:13)",
    categoria: "religioso"
  },
  {
    texto: "O único modo de fazer um excelente trabalho é amar o que você faz.",
    autor: "Steve Jobs",
    categoria: "motivacional"
  },
  {
    texto: "Conhece-te a ti mesmo e conhecerás o universo e os deuses.",
    autor: "Sócrates",
    categoria: "filosofico"
  },
  {
    texto: "A fé é dar o primeiro passo, mesmo quando você não vê toda a escada.",
    autor: "Martin Luther King Jr.",
    categoria: "religioso"
  },
  {
    texto: "O segredo de progredir é começar.",
    autor: "Mark Twain",
    categoria: "motivacional"
  }
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const force = searchParams.get('force') === 'true';
    const category = searchParams.get('category') || ''; // 'religioso', 'motivacional', 'filosofico'
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Check in-memory session cache first to prevent redundant DB reads or API requests under load
    if (!force && thoughtCache && thoughtCache.data_exibicao === todayStr) {
      return NextResponse.json({ success: true, data: thoughtCache.data });
    }

    // Resolve action encapsulating the core logic
    const resolveAction = async () => {
      const supabase = await createClient();

      // 2. Attempt to query today's thought from the database if not forced to regenerate
      if (!force) {
        try {
          const { data, error } = await supabase
            .from('pensamento_dia')
            .select('*')
            .eq('data_exibicao', todayStr)
            .maybeSingle();

          if (data && !error) {
            thoughtCache = {
              data_exibicao: todayStr,
              data
            };
            return data;
          }
        } catch (dbReadErr) {
          console.warn('[DB Read Warning] Failed reading pensée from DB:', dbReadErr);
        }
      }

      // Checking table existence or another check by executing a select query
      const { error: checkTableError } = await supabase
        .from('pensamento_dia')
        .select('id')
        .limit(1);
      
      // Checking if the error is due to the table not existing ('42P01')
      const isTableMissing = checkTableError && checkTableError.code === '42P01';

      // No quote for today, let's generate one dynamically using the Gemini API!
      let generatedQuote = { texto: '', autor: '' };

      if (!process.env.GEMINI_API_KEY) {
        console.warn('[Gemini API] GEMINI_API_KEY is not defined. Falling back to preloaded thoughts catalog.');
        const filteredFallbacks = category 
          ? fallbackQuotes.filter(q => q.categoria === category)
          : fallbackQuotes;
        const candidates = filteredFallbacks.length > 0 ? filteredFallbacks : fallbackQuotes;
        const randomIndex = Math.floor(Math.random() * candidates.length);
        generatedQuote = candidates[randomIndex];
      } else if (Date.now() < geminiBlockedUntil) {
        console.warn(`[Gemini API Cooldown] Skipping Gemini API call because it was previously rate-limited. Falls back immediately to preloaded list. Time left: ${Math.round((geminiBlockedUntil - Date.now()) / 1000)}s`);
        const filteredFallbacks = category 
          ? fallbackQuotes.filter(q => q.categoria === category)
          : fallbackQuotes;
        const candidates = filteredFallbacks.length > 0 ? filteredFallbacks : fallbackQuotes;
        const randomIndex = Math.floor(Math.random() * candidates.length);
        generatedQuote = candidates[randomIndex];
      } else {
        try {
          let themePrompt = 'Gere um belo pensamento do dia que se enquadre em um dos seguintes temas: religioso, motivacional/incentivação ou filosófico.';
          let systemInstruction = 'Você é um curador literário e espiritual de alto refinamento. Elabore frases profundas em português com o respectivo autor histórico ou religioso consagrado (sempre com autor real ou creditado, como passagens bíblicas, filósofos gregos ou pensadores modernos).';

          if (category === 'religioso') {
            themePrompt = 'Gere um belo pensamento do dia estritamente focado em espiritualidade, ensinamentos bíblicos, fé ou comunhão religiosa.';
            systemInstruction = 'Você é um teólogo e curador espiritual de alto refinamento. Elabore frases de profunda inspiração religiosa ou espiritual em português com o respectivo autor consagrado (ex: passagens bíblicas reais, santos, teólogos, líderes religiosos de renome).';
          } else if (category === 'motivacional') {
            themePrompt = 'Gere uma bela frase ou pensamento do dia focado em motivação, superação, incentivo aos estudos, resiliência ou desenvolvimento de carreira.';
            systemInstruction = 'Você é um especialista em desenvolvimento humano e alta performance de refinada elegância. Escreva uma frase inspiradora e altamente motivacional em português que impulsione a persistência e a evolução acadêmica e pessoal, citando o autor correspondente (ex: pensadores modernos, inventores, empreendedores ou líderes de alto impacto).';
          } else if (category === 'filosofico') {
            themePrompt = 'Gere um belo pensamento do dia estritamente filosófico, focado em sabedoria, ética, autoconhecimento ou reflexão existencial.';
            systemInstruction = 'Você é um filósofo acadêmico e pensador existencial refinado. Escreva uma frase profunda e reflexiva em português sobre ética, autoconhecimento, tempo ou sabedoria humana, citando o autor grego, romano, oriental ou moderno correspondente.';
          }

          const response = await getGeminiAI().models.generateContent({
            model: 'gemini-3.5-flash',
            contents: `${themePrompt} Varie os autores e temas. Retorne estritamente em formato JSON estruturado com os campos "texto" (o pensamento) e "autor".`,
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'OBJECT' as any,
                properties: {
                  texto: {
                    type: 'STRING' as any,
                    description: 'A frase ou pensamento inspirador do dia em português.'
                  },
                  autor: {
                    type: 'STRING' as any,
                    description: 'O nome do autor do pensamento.'
                  }
                },
                required: ['texto', 'autor']
              }
            }
          });

          if (response && response.text) {
            generatedQuote = JSON.parse(response.text.trim());
          } else {
            console.warn('[Gemini API] Empty response returned from dynamic generator. Falling back.');
            const filteredFallbacks = category 
              ? fallbackQuotes.filter(q => q.categoria === category)
              : fallbackQuotes;
            const candidates = filteredFallbacks.length > 0 ? filteredFallbacks : fallbackQuotes;
            const randomIndex = Math.floor(Math.random() * candidates.length);
            generatedQuote = candidates[randomIndex];
          }
        } catch (apiError: any) {
          console.warn('[Gemini API Error] Falling back to preloaded thoughts catalog gracefully. Reason:', apiError?.message || apiError);
          
          // Cooldown mechanism: block the Gemini API calls for 10 minutes if we hit a 429 rate limit or quota issue
          const errMsg = String(apiError?.message || apiError?.status || apiError || '').toLowerCase();
          if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('resource_exhausted')) {
            console.warn('[Gemini API Cooldown] Quota exceeded. Cooldown active for 10 minutes.');
            geminiBlockedUntil = Date.now() + 10 * 60 * 1000;
          }

          // Pick random fallback catalog item
          const filteredFallbacks = category 
            ? fallbackQuotes.filter(q => q.categoria === category)
            : fallbackQuotes;
          const candidates = filteredFallbacks.length > 0 ? filteredFallbacks : fallbackQuotes;
          const randomIndex = Math.floor(Math.random() * candidates.length);
          generatedQuote = candidates[randomIndex];
        }
      }

      if (!generatedQuote.texto || !generatedQuote.autor) {
        generatedQuote = fallbackQuotes[0];
      }

      // Try to insert the quote into Supabase for today's persistent retrieval
      if (!isTableMissing) {
        try {
          const { data: insertedData, error: insertError } = await supabase
            .from('pensamento_dia')
            .upsert({
              texto: generatedQuote.texto,
              autor: generatedQuote.autor,
              data_exibicao: todayStr
            }, { onConflict: 'data_exibicao' })
            .select('*')
            .maybeSingle();

          if (insertedData && !insertError) {
            // Cache the inserted thought
            thoughtCache = {
              data_exibicao: todayStr,
              data: insertedData
            };
            return insertedData;
          } else {
            console.warn('[insert warning]', insertError);
          }
        } catch (dbErr) {
          console.error('[db insert catch error]', dbErr);
        }
      }

      // If table doesn't exist yet or DB insert failed, return dynamic quote with helper flags
      const fallbackResponse = {
        id: 'temp-id',
        texto: generatedQuote.texto,
        autor: generatedQuote.autor,
        data_exibicao: todayStr,
        isDemo: true,
        reason: isTableMissing ? 'table_missing' : 'insert_failed'
      };

      // Cache the fallback thought so that subsequent requests don't hit Supabase or Gemini
      thoughtCache = {
        data_exibicao: todayStr,
        data: fallbackResponse
      };

      return fallbackResponse;
    };

    // 3. Coordinate concurrent fetches safely with activeRequestPromise
    if (!force) {
      if (!activeRequestPromise) {
        activeRequestPromise = resolveAction().finally(() => {
          activeRequestPromise = null;
        });
      }
      const data = await activeRequestPromise;
      return NextResponse.json({ success: true, data });
    } else {
      const data = await resolveAction();
      return NextResponse.json({ success: true, data });
    }

  } catch (error: any) {
    console.error('[GET pensamento-dia error]:', error);
    return NextResponse.json({ error: error.message || 'Erro ao processar pensamento do dia' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { texto, autor } = await req.json();
    if (!texto || !autor) {
      return NextResponse.json({ error: 'Texto e autor são obrigatórios.' }, { status: 400 });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Attempt to upsert the thought for today
    const { data, error } = await supabase
      .from('pensamento_dia')
      .upsert(
        {
          texto,
          autor,
          data_exibicao: todayStr
        },
        { onConflict: 'data_exibicao' }
      )
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('[POST thoughts DB error]', error);
      if (error.code === '42P01') {
        return NextResponse.json({ 
          error: 'A tabela "pensamento_dia" ainda não foi criada no Supabase. Por favor, vá na aba Configurações e aplique o script da migração "31_create_pensamento_dia.sql".' 
        }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (data) {
      // Keep memory cache updated on manual changes
      thoughtCache = {
        data_exibicao: todayStr,
        data
      };
    }

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error('[POST pensamento-dia error]:', error);
    return NextResponse.json({ error: error.message || 'Erro ao salvar novo pensamento' }, { status: 500 });
  }
}
