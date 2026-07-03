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

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('TIMEOUT'));
    }, timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

// A robust list of offline quotes to fall back on in extreme cases (e.g., API limits or offline mode)
const fallbackQuotes = [
  {
    texto: "Tudo posso naquele que me fortalece.",
    autor: "Apóstolo Paulo (Filipenses 4:13)",
    categoria: "religioso"
  },
  {
    texto: "A fé é dar o primeiro passo, mesmo quando você não vê toda a escada.",
    autor: "Martin Luther King Jr.",
    categoria: "religioso"
  },
  {
    texto: "O único modo de fazer um excelente trabalho é amar o que você faz.",
    autor: "Steve Jobs",
    categoria: "motivacional"
  },
  {
    texto: "O segredo de progredir é começar.",
    autor: "Mark Twain",
    categoria: "motivacional"
  },
  {
    texto: "Conhece-te a ti mesmo e conhecerás o universo e os deuses.",
    autor: "Sócrates",
    categoria: "filosofico"
  },
  {
    texto: "Não vivemos para pensar, pensamos para viver.",
    autor: "Ortega y Gasset",
    categoria: "filosofico"
  },
  {
    texto: "Você tem poder sobre sua mente, não sobre eventos externos. Perceba isso e encontrará força.",
    autor: "Marco Aurélio",
    categoria: "estoico"
  },
  {
    texto: "Apressa-te a viver bem e pensa que cada dia, por si só, é uma vida.",
    autor: "Sêneca",
    categoria: "estoico"
  },
  {
    texto: "A melhor maneira de prever o futuro é criá-lo.",
    autor: "Peter Drucker",
    categoria: "lideranca"
  },
  {
    texto: "O guerreiro de sucesso é o homem comum, com foco de laser.",
    autor: "Bruce Lee",
    categoria: "lideranca"
  },
  {
    texto: "A jornada de mil milhas começa com um único passo.",
    autor: "Lao Tzu",
    categoria: "oriental"
  },
  {
    texto: "Seja como a água corrente: sem resistência, mas capaz de moldar o mundo.",
    autor: "Provérbio Zen",
    categoria: "oriental"
  },
  {
    texto: "A imaginação é mais importante que o conhecimento.",
    autor: "Albert Einstein",
    categoria: "criatividade"
  },
  {
    texto: "Não falhei. Apenas descobri 10.000 maneiras que não funcionam.",
    autor: "Thomas Edison",
    categoria: "criatividade"
  },
  {
    texto: "A gratidão não é apenas a maior das virtudes, mas a mãe de todas as outras.",
    autor: "Cícero",
    categoria: "gratidao"
  },
  {
    texto: "Se a única oração que você disser em toda a sua vida for 'obrigado', isso será suficiente.",
    autor: "Mestre Eckhart",
    categoria: "gratidao"
  },
  {
    texto: "Acredite que pode e você já está no meio do caminho.",
    autor: "Theodore Roosevelt",
    categoria: "otimismo"
  },
  {
    texto: "Mesmo a noite mais escura terminará com o nascer do sol.",
    autor: "Victor Hugo",
    categoria: "otimismo"
  },
  {
    texto: "A educação é a arma mais poderosa que você pode usar para mudar o mundo.",
    autor: "Nelson Mandela",
    categoria: "educacao"
  },
  {
    texto: "Feliz aquele que transfere o que sabe e aprende o que ensina.",
    autor: "Cora Coralina",
    categoria: "educacao"
  },
  {
    texto: "Comece onde você está. Use o que você tem. Faça o que puder.",
    autor: "Arthur Ashe",
    categoria: "geral"
  },
  {
    texto: "O impossível é apenas uma opinião.",
    autor: "Paulo Coelho",
    categoria: "geral"
  }
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const force = searchParams.get('force') === 'true';
    const category = searchParams.get('category') || ''; // Theme categories
    const todayStr = new Date().toISOString().split('T')[0];

    // We query the database on every GET request instead of using an in-memory thoughtCache bypass.
    // This ensures any manual admin thoughts are immediately synchronized for all sessions and devices.
    // Concurrent first-loads are still coalesced safely via activeRequestPromise.

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
      let generatedQuote = { texto: '', autor: '', reflexao: '' };

      const pickRandomFallback = (cat: string) => {
        const filteredFallbacks = cat 
          ? fallbackQuotes.filter(q => q.categoria === cat)
          : fallbackQuotes;
        const candidates = filteredFallbacks.length > 0 ? filteredFallbacks : fallbackQuotes;
        const randomIndex = Math.floor(Math.random() * candidates.length);
        const selected = candidates[randomIndex];
        return {
          texto: selected.texto,
          autor: selected.autor,
          reflexao: 'A sabedoria contida nesta lição nos inspira a refletir de forma profunda sobre a força diária e as virtudes do refinamento pessoal constante.'
        };
      };

      if (!process.env.GEMINI_API_KEY) {
        console.warn('[Gemini API] GEMINI_API_KEY is not defined. Falling back to preloaded thoughts catalog.');
        generatedQuote = pickRandomFallback(category);
      } else if (Date.now() < geminiBlockedUntil) {
        console.warn(`[Gemini API Cooldown] Skipping Gemini API call because it was previously rate-limited. Falls back immediately to preloaded list. Time left: ${Math.round((geminiBlockedUntil - Date.now()) / 1000)}s`);
        generatedQuote = pickRandomFallback(category);
      } else {
        try {
          let themePrompt = 'Gere um belo pensamento do dia inspirador.';
          let systemInstruction = 'Você é um curador literário e espiritual de alto refinamento. Elabore frases profundas em português com o respectivo autor histórico ou religioso consagrado (sempre com autor real ou creditado, como passagens bíblicas, filósofos gregos ou pensadores modernos).';

          switch (category) {
            case 'religioso':
              themePrompt = 'Gere um belo pensamento do dia focado em espiritualidade, ensinamentos bíblicos, fé ou comunhão religiosa.';
              systemInstruction = 'Você é um teólogo e curador espiritual. Escreva uma frase inspiradora bíblica ou religiosa em português com autor consagrado, passagens bíblicas reais ou teólogos de renome.';
              break;
            case 'motivacional':
              themePrompt = 'Gere um pensamento focado em superação, motivação para vencer, resiliência e dedicação.';
              systemInstruction = 'Você é um especialista em desenvolvimento de alta performance. Escreva uma profunda frase motivacional em português que impulsione o foco e conquistas, citando autor real correspondente.';
              break;
            case 'filosofico':
              themePrompt = 'Gere um belo pensamento filosófico focado em sabedoria, ética ou reflexão existencial.';
              systemInstruction = 'Você é um filósofo acadêmico de refinado conhecimento. Escreva uma frase profunda em português sobre ética, autoconhecimento ou sabedoria de vida, atribuída a pensadores reais antigos ou modernos.';
              break;
            case 'estoico':
              themePrompt = 'Gere um ensinamento estoico sobre controle mental, resiliência frente às dificuldades, dicotomia do controle ou foco.';
              systemInstruction = 'Você é especialista em filosofia estoica. Escreva um conselho de vida ou pensamento estoico baseado nos escritos de Marco Aurélio, Sêneca ou Epicteto.';
              break;
            case 'lideranca':
              themePrompt = 'Gere uma citação inspiradora sobre liderança, ética profissional, foco em equipe, integridade ou visão estratégica.';
              systemInstruction = 'Você é especialista em governança e desenvolvimento de equipes. Escreva uma lição de liderança ou caráter em português com fonte em autores reais ou líderes históricos renomados.';
              break;
            case 'oriental':
              themePrompt = 'Gere uma citação oriental, pensamento budista, taoísta, ensinamento de Confúcio ou provérbio zen.';
              systemInstruction = 'Você é especialista em filosofia oriental. Traga uma lição de harmonia, moderação, desapego, fluxo ou paz interior em português bem atribuída.';
              break;
            case 'criatividade':
              themePrompt = 'Gere uma frase sobre inovação, curiosidade intelectual, ciência, quebrar barreiras ou processo criativo.';
              systemInstruction = 'Você é mestre da ciência e artes do pensamento inventivo. Escreva sobre criatividade e superação de limites intelectuais em português e cite inventores reais.';
              break;
            case 'gratidao':
              themePrompt = 'Gere uma mensagem profunda de gratidão, apreço pela vida, bondade humana ou fraternidade.';
              systemInstruction = 'Você é defensor do bem e da inteligência interpessoal. Formule um belo pensamento centrado em gratidão sincera de impacto humano positivo.';
              break;
            case 'otimismo':
              themePrompt = 'Gere um pensamento otimista, focado em esperança, amanhã luminoso, superação técnica ou novos começos.';
              systemInstruction = 'Você é um gerador de esperança realista. Escreva uma frase em português sobre otimismo ou futuro radiante e o poder da esperança humana ativa.';
              break;
            case 'educacao':
              themePrompt = 'Gere uma frase sobre o poder do estudo, valor da educação, professores, crescimento intelectual permanente ou busca de conhecimento.';
              systemInstruction = 'Você é um educador consagrado. Gere um ensinamento sobre a força transformadora da educação escolar, disciplina de aprendizado e conhecimento.';
              break;
            default:
              themePrompt = 'Gere um belo pensamento do dia que se enquadre em temas gerais de sabedoria, persistência, ética ou fé.';
              systemInstruction = 'Você é um curador espiritual literário. Traga uma frase reflexiva célebre em português que inspire o dia de estudantes e profissionais.';
              break;
          }

          let response;
          try {
            response = await withTimeout(
              getGeminiAI().models.generateContent({
                model: 'gemini-3.1-flash-lite',
                contents: `${themePrompt} Varie os autores e temas. Retorne estritamente em formato JSON estruturado com os campos "texto" (o pensamento), "autor" e "reflexao" (uma reflexão breve e profunda inspirada no pensamento).`,
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
                      },
                      reflexao: {
                        type: 'STRING' as any,
                        description: 'Uma breve, profunda e edificante reflexão em português sobre a lição prática ou aplicação deste pensamento para o dia de hoje.'
                      }
                    },
                    required: ['texto', 'autor', 'reflexao']
                  }
                }
              }),
              12000
            );
          } catch (primaryError: any) {
            console.warn('[Gemini API Primary Model Error or Timeout] Main model gemini-3.1-flash-lite failed or timed out. Retrying with fallback model gemini-3.5-flash. Reason:', primaryError?.message || primaryError);
            // Try with the other model with 8000ms timeout
            response = await withTimeout(
              getGeminiAI().models.generateContent({
                model: 'gemini-3.5-flash',
                contents: `${themePrompt} Varie os autores e temas. Retorne estritamente em formato JSON estruturado com os campos "texto" (o pensamento), "autor" e "reflexao" (uma reflexão breve e profunda inspirada no pensamento).`,
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
                      },
                      reflexao: {
                        type: 'STRING' as any,
                        description: 'Uma breve, profunda e edificante reflexão em português sobre a lição prática ou aplicação deste pensamento para o dia de hoje.'
                      }
                    },
                    required: ['texto', 'autor', 'reflexao']
                  }
                }
              }),
              8000
            );
          }

          if (response && response.text) {
            generatedQuote = JSON.parse(response.text.trim());
          } else {
            console.warn('[Gemini API] Empty response returned from dynamic generator. Falling back.');
            const filteredFallbacks = category 
              ? fallbackQuotes.filter(q => q.categoria === category)
              : fallbackQuotes;
            const candidates = filteredFallbacks.length > 0 ? filteredFallbacks : fallbackQuotes;
            const randomIndex = Math.floor(Math.random() * candidates.length);
            const selectedQuote = candidates[randomIndex];
            generatedQuote = {
              texto: selectedQuote.texto,
              autor: selectedQuote.autor,
              reflexao: ''
            };
          }
        } catch (apiError: any) {
          console.warn('[Gemini API Error or Timeout] Falling back to preloaded thoughts catalog gracefully. Reason:', apiError?.message || apiError);
          
          // Cooldown mechanism: block the Gemini API calls for 10 minutes if we hit a 429 rate limit, quota issue, or a timeout!
          const errMsg = String(apiError?.message || apiError?.status || apiError || '').toLowerCase();
          if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('resource_exhausted') || errMsg.includes('timeout')) {
            console.warn('[Gemini API Cooldown] Quota exceeded or limit/timeout hit. Cooldown active for 10 minutes.');
            geminiBlockedUntil = Date.now() + 10 * 60 * 1000;
          }

          // Pick random fallback catalog item
          const filteredFallbacks = category 
            ? fallbackQuotes.filter(q => q.categoria === category)
            : fallbackQuotes;
          const candidates = filteredFallbacks.length > 0 ? filteredFallbacks : fallbackQuotes;
          const randomIndex = Math.floor(Math.random() * candidates.length);
          const selectedQuote = candidates[randomIndex];
          generatedQuote = {
            texto: selectedQuote.texto,
            autor: selectedQuote.autor,
            reflexao: ''
          };
        }
      }

      if (!generatedQuote.texto || !generatedQuote.autor) {
        generatedQuote = fallbackQuotes[0] as any;
      }

      // Ensure reflexao field is present, even if chosen from a legacy fallback quote catalog
      if (!generatedQuote.reflexao) {
        generatedQuote.reflexao = `${generatedQuote.texto} — Este ensinamento nos convida a reavaliar as nossas atitudes, cultivando clareza de propósito, ética e resiliência a cada novo amanhecer.`;
      }

      // Try to insert the quote into Supabase for today's persistent retrieval
      if (!isTableMissing) {
        try {
          const upsertPayload: any = {
            texto: generatedQuote.texto,
            autor: generatedQuote.autor,
            reflexao: generatedQuote.reflexao,
            data_exibicao: todayStr
          };

          let { data: insertedData, error: insertError } = await supabase
            .from('pensamento_dia')
            .upsert(upsertPayload, { onConflict: 'data_exibicao' })
            .select('*')
            .maybeSingle();

          // Graceful fallback retry if column 'reflexao' doesn't exist in Supabase yet
          if (insertError && (insertError.code === '42703' || String(insertError.message || '').includes('reflexao'))) {
            console.warn('[Reflexao column missing in DB - Retrying insertion without it]');
            delete upsertPayload.reflexao;
            const retryRes = await supabase
              .from('pensamento_dia')
              .upsert(upsertPayload, { onConflict: 'data_exibicao' })
              .select('*')
              .maybeSingle();
            insertedData = retryRes.data;
            insertError = retryRes.error;
          }

          if (insertedData && !insertError) {
            // Force assign reflexao if retry was used, so client still gets it
            if (!insertedData.reflexao && generatedQuote.reflexao) {
              insertedData.reflexao = generatedQuote.reflexao;
            }
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
        reflexao: generatedQuote.reflexao,
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

    const { texto, autor, reflexao } = await req.json();
    if (!texto || !autor) {
      return NextResponse.json({ error: 'Texto e autor são obrigatórios.' }, { status: 400 });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const fallbackResponse: any = {
      id: 'temp-id',
      texto,
      autor,
      reflexao: reflexao || '',
      data_exibicao: todayStr,
      isDemo: true
    };

    // Attempt to upsert the thought for today
    const upsertPayload: any = {
      texto,
      autor,
      reflexao: reflexao || '',
      data_exibicao: todayStr
    };

    let { data, error } = await supabase
      .from('pensamento_dia')
      .upsert(upsertPayload, { onConflict: 'data_exibicao' })
      .select('*')
      .maybeSingle();

    // Graceful fallback retry if column 'reflexao' doesn't exist yet
    if (error && (error.code === '42703' || String(error.message || '').includes('reflexao'))) {
      console.warn('[POST thoughts reflexao column missing - Retrying without reflexao]');
      delete upsertPayload.reflexao;
      const retryRes = await supabase
        .from('pensamento_dia')
        .upsert(upsertPayload, { onConflict: 'data_exibicao' })
        .select('*')
        .maybeSingle();
      data = retryRes.data;
      error = retryRes.error;
    }

    if (data && !error && !data.reflexao && reflexao) {
      data.reflexao = reflexao;
    }

    if (error) {
      console.warn('[POST thoughts DB error - falling back to cache]', error);
      // Keep memory cache updated on manual changes as a fallback
      thoughtCache = {
        data_exibicao: todayStr,
        data: fallbackResponse
      };
      return NextResponse.json({ 
        success: true, 
        data: fallbackResponse,
        warning: 'Salvo em cache temporária (banco de dados offline ou tabela não migrada).'
      });
    }

    const savedData = data || fallbackResponse;

    // Keep memory cache updated on manual changes
    thoughtCache = {
      data_exibicao: todayStr,
      data: savedData
    };

    return NextResponse.json({ success: true, data: savedData });

  } catch (error: any) {
    console.error('[POST pensamento-dia error]:', error);
    return NextResponse.json({ error: error.message || 'Erro ao salvar novo pensamento' }, { status: 500 });
  }
}
