import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenAI, Type } from '@google/genai';

// Initialize Gemini on the server side lazily only when needed
let aiInstance: GoogleGenAI | null = null;
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
    autor: "Apóstolo Paulo (Filipenses 4:13)"
  },
  {
    texto: "O único modo de fazer um excelente trabalho é amar o que você faz.",
    autor: "Steve Jobs"
  },
  {
    texto: "Conhece-te a ti mesmo e conhecerás o universo e os deuses.",
    autor: "Sócrates"
  },
  {
    texto: "A fé é dar o primeiro passo, mesmo quando você não vê toda a escada.",
    autor: "Martin Luther King Jr."
  },
  {
    texto: "O segredo de progredir é começar.",
    autor: "Mark Twain"
  }
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const force = searchParams.get('force') === 'true';
    const supabase = await createClient();
    const todayStr = new Date().toISOString().split('T')[0];

    // Attempt to query today's thought from the database if not forced to regenerate
    if (!force) {
      const { data, error } = await supabase
        .from('pensamento_dia')
        .select('*')
        .eq('data_exibicao', todayStr)
        .maybeSingle();

      if (data) {
        return NextResponse.json({ success: true, data });
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
      const randomIndex = Math.floor(Math.random() * fallbackQuotes.length);
      generatedQuote = fallbackQuotes[randomIndex];
    } else {
      try {
        const response = await getGeminiAI().models.generateContent({
          model: 'gemini-3.5-flash',
          contents: 'Gere um belo pensamento do dia que se enquadre em um dos seguintes temas: religioso, motivacional/incentivação ou filosófico. Varie os autores e temas. Retorne estritamente em formato JSON estruturado com os campos "texto" (o pensamento) e "autor".',
          config: {
            systemInstruction: 'Você é um curador literário e espiritual de alto refinamento. Elabore frases profundas em português com o respectivo autor histórico ou religioso consagrado (sempre com autor real ou creditado, como passagens bíblicas, filósofos gregos ou pensadores modernos).',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                texto: {
                  type: Type.STRING,
                  description: 'A frase ou pensamento inspirador do dia em português.'
                },
                autor: {
                  type: Type.STRING,
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
          const randomIndex = Math.floor(Math.random() * fallbackQuotes.length);
          generatedQuote = fallbackQuotes[randomIndex];
        }
      } catch (apiError: any) {
        console.warn('[Gemini API Error] Falling back to preloaded thoughts catalog gracefully. Reason:', apiError?.message || apiError);
        // Pick random fallback catalog item
        const randomIndex = Math.floor(Math.random() * fallbackQuotes.length);
        generatedQuote = fallbackQuotes[randomIndex];
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

        if (insertedData) {
          return NextResponse.json({ success: true, data: insertedData });
        } else {
          console.warn('[insert warning]', insertError);
        }
      } catch (dbErr) {
        console.error('[db insert catch error]', dbErr);
      }
    }

    // If table doesn't exist yet or DB insert failed, return dynamic quote with helper flags
    return NextResponse.json({
      success: true,
      data: {
        id: 'temp-id',
        texto: generatedQuote.texto,
        autor: generatedQuote.autor,
        data_exibicao: todayStr,
        isDemo: true,
        reason: isTableMissing ? 'table_missing' : 'insert_failed'
      }
    });

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

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error('[POST pensamento-dia error]:', error);
    return NextResponse.json({ error: error.message || 'Erro ao salvar novo pensamento' }, { status: 500 });
  }
}
