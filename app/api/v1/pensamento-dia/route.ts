import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
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

// A rich, diverse catalog of offline quotes to fall back on if API is unreachable.
// None of these quotes or authors should collide easily, and selection avoids previously displayed items.
const fallbackQuotes = [
  {
    texto: "Tudo posso naquele que me fortalece.",
    autor: "Apóstolo Paulo (Filipenses 4:13)",
    reflexao: "A fé nos dá vigor para enfrentar os dias mais desafiadores, sabendo que nossa força interior provém de um propósito maior.",
    categoria: "religioso"
  },
  {
    texto: "A fé é dar o primeiro passo, mesmo quando você não vê toda a escada.",
    autor: "Martin Luther King Jr.",
    reflexao: "Grandes transformações começam com a coragem de agir no presente, mesmo cercados por incertezas sobre o destino final.",
    categoria: "religioso"
  },
  {
    texto: "O único modo de fazer um excelente trabalho é amar o que você faz.",
    autor: "Steve Jobs",
    reflexao: "A paixão pelo processo transforma a obrigação em maestria, impulsionando a excelência mesmo nas tarefas mais simples.",
    categoria: "motivacional"
  },
  {
    texto: "O segredo de progredir é começar.",
    autor: "Mark Twain",
    reflexao: "Muitas vezes a inércia nos paralisa; quebrar tarefas grandiosas em passos minúsculos destrava nosso verdadeiro potencial.",
    categoria: "motivacional"
  },
  {
    texto: "Conhece-te a ti mesmo e conhecerás o universo e os deuses.",
    autor: "Sócrates",
    reflexao: "O autoconhecimento é o alicerce de todas as virtudes e a bússola para navegar as tempestades do mundo exterior.",
    categoria: "filosofico"
  },
  {
    texto: "Não vivemos para pensar, pensamos para viver.",
    autor: "Ortega y Gasset",
    reflexao: "A reflexão só cumpre sua missão quando se traduz em escolhas conscientes, sabedoria viva e ação prática no cotidiano.",
    categoria: "filosofico"
  },
  {
    texto: "Você tem poder sobre sua mente, não sobre eventos externos. Perceba isso e encontrará força.",
    autor: "Marco Aurélio",
    reflexao: "A verdadeira serenidade nasce quando paramos de lutar contra o que não podemos controlar e assumimos o domínio de nossas reações.",
    categoria: "estoico"
  },
  {
    texto: "Apressa-te a viver bem e pensa que cada dia, por si só, é uma vida.",
    autor: "Sêneca",
    reflexao: "Não adie a sua paz nem a sua dedicação. Trate este dia de hoje como uma oportunidade singular de expressar suas melhores virtudes.",
    categoria: "estoico"
  },
  {
    texto: "A melhor maneira de prever o futuro é criá-lo.",
    autor: "Peter Drucker",
    reflexao: "O futuro não é algo que simplesmente nos acontece; ele é esculpido pelas decisões e atitudes que tomamos nas horas presentes.",
    categoria: "lideranca"
  },
  {
    texto: "O guerreiro de sucesso é o homem comum, com foco de laser.",
    autor: "Bruce Lee",
    reflexao: "Mais importante que um talento nato extraordinário é a disciplina obstinada de manter o foco constante naquilo que realmente importa.",
    categoria: "lideranca"
  },
  {
    texto: "A jornada de mil milhas começa com um único passo.",
    autor: "Lao Tzu",
    reflexao: "Não se intimide pela distância de seus objetivos mais altos. A constância do passo diário vence qualquer montanha.",
    categoria: "oriental"
  },
  {
    texto: "Seja como a água corrente: sem resistência, mas capaz de moldar o mundo.",
    autor: "Provérbio Zen",
    reflexao: "A flexibilidade e a humildade conseguem contornar obstáculos rígidos e abrir caminhos onde a força bruta falharia.",
    categoria: "oriental"
  },
  {
    texto: "A imaginação é mais importante que o conhecimento.",
    autor: "Albert Einstein",
    reflexao: "O conhecimento mapeia o que já existe; a imaginação e a ousadia criativa abrem portas para o que ainda podemos construir.",
    categoria: "criatividade"
  },
  {
    texto: "Não falhei. Apenas descobri 10.000 maneiras que não funcionam.",
    autor: "Thomas Edison",
    reflexao: "Cada tentativa frustrada é na verdade um aprendizado acumulado que nos aproxima do acerto definitivo.",
    categoria: "criatividade"
  },
  {
    texto: "A gratidão não é apenas a maior das virtudes, mas a mãe de todas as outras.",
    autor: "Cícero",
    reflexao: "Um coração grato enxerga oportunidades onde outros veem carência, nutrindo a generosidade e a paz de espírito.",
    categoria: "gratidao"
  },
  {
    texto: "Se a única oração que você disser em toda a sua vida for 'obrigado', isso será suficiente.",
    autor: "Mestre Eckhart",
    reflexao: "Agradecer pelo simples milagre de estar vivo e ter a chance de recomeçar hoje reorganiza toda a nossa perspectiva de mundo.",
    categoria: "gratidao"
  },
  {
    texto: "Acredite que pode e você já está no meio do caminho.",
    autor: "Theodore Roosevelt",
    reflexao: "A confiança realista em nossas capacidades dissipa as primeiras dúvidas que costumam paralisar os nossos projetos.",
    categoria: "otimismo"
  },
  {
    texto: "Mesmo a noite mais escura terminará com o nascer do sol.",
    autor: "Victor Hugo",
    reflexao: "As dificuldades e dores são passageiras; manter a esperança ativa é a luz que nos guia até o amanhecer.",
    categoria: "otimismo"
  },
  {
    texto: "A educação é a arma mais poderosa que você pode usar para mudar o mundo.",
    autor: "Nelson Mandela",
    reflexao: "O conhecimento liberta a mente, quebra ciclos de vulnerabilidade e constrói pontes para um futuro com mais justiça e dignidade.",
    categoria: "educacao"
  },
  {
    texto: "Feliz aquele que transfere o que sabe e aprende o que ensina.",
    autor: "Cora Coralina",
    reflexao: "O verdadeiro mestre é um eterno aprendiz; a partilha generosa do saber engrandece tanto quem ensina quanto quem aprende.",
    categoria: "educacao"
  },
  {
    texto: "Comece onde você está. Use o que você tem. Faça o que puder.",
    autor: "Arthur Ashe",
    reflexao: "Não espere condições perfeitas para agir com retidão e afinco. A dignidade está em entregar o nosso melhor com os recursos disponíveis agora.",
    categoria: "geral"
  },
  {
    texto: "A persistência é o menor caminho para o êxito.",
    autor: "Charles Chaplin",
    reflexao: "A persistência silenciosa diante do cansaço é a virtude que separa as boas intenções das realizações concretas.",
    categoria: "geral"
  },
  {
    texto: "Quem olha para fora sonha, quem olha para dentro desperta.",
    autor: "Carl Gustav Jung",
    reflexao: "O despertar da nossa consciência acontece no silêncio da introspecção e na coragem de encarar nossas próprias verdades.",
    categoria: "filosofico"
  },
  {
    texto: "O segredo da mudança é concentrar toda a sua energia não em lutar contra o velho, mas em construir o novo.",
    autor: "Dan Millman",
    reflexao: "Deixe ir o que já passou e dedique sua energia criativa a plantar as sementes do que você deseja colher no futuro.",
    categoria: "motivacional"
  },
  {
    texto: "Não espere por circunstâncias ideais; tome as circunstâncias que tiver e faça-as ideais.",
    autor: "Swami Vivekananda",
    reflexao: "A mente madura transforma o chão duro em solo fértil por meio da atitude resiliente e do empenho constante.",
    categoria: "oriental"
  },
  {
    texto: "A sabedoria começa na reflexão sobre o que é essencial para a alma.",
    autor: "Platão",
    reflexao: "Filtrar os ruídos e focar no que edifica nosso caráter nos protege das distrações fúteis do dia a dia.",
    categoria: "filosofico"
  }
];

// Helper to clean raw text and parse JSON generated by LLMs
function parseGeneratedJson(rawText: string): { texto?: string; autor?: string; reflexao?: string } | null {
  if (!rawText) return null;
  try {
    const cleaned = rawText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    return JSON.parse(cleaned);
  } catch {
    // If strict JSON parsing failed, try extracting via regex matching fields
    try {
      const textoMatch = rawText.match(/"texto"\s*:\s*"([^"]+)"/);
      const autorMatch = rawText.match(/"autor"\s*:\s*"([^"]+)"/);
      const reflexaoMatch = rawText.match(/"reflexao"\s*:\s*"([^"]+)"/);
      if (textoMatch && autorMatch) {
        return {
          texto: textoMatch[1],
          autor: autorMatch[1],
          reflexao: reflexaoMatch ? reflexaoMatch[1] : undefined
        };
      }
    } catch {}
  }
  return null;
}

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
          const { data, error } = await supabaseAdmin
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

        // FIRST FIX: Prevent Gemini spam by reusing memory cache if DB insert failed previously (e.g. RLS blocked anonymous insert)
        if (thoughtCache && thoughtCache.data_exibicao === todayStr && thoughtCache.data) {
          return thoughtCache.data;
        }
      }

      // Checking table existence or another check by executing a select query
      const { error: checkTableError } = await supabaseAdmin
        .from('pensamento_dia')
        .select('id')
        .limit(1);
      
      // Checking if the error is due to the table not existing ('42P01')
      const isTableMissing = checkTableError && checkTableError.code === '42P01';

      // Query recent thoughts from DB to ensure novelty and prevent repetitions
      let recentTexts: string[] = [];
      let recentAuthors: string[] = [];
      try {
        const { data: recentRows } = await supabaseAdmin
          .from('pensamento_dia')
          .select('texto, autor')
          .order('data_exibicao', { ascending: false })
          .limit(40);
        if (recentRows && recentRows.length > 0) {
          recentTexts = recentRows.map(r => r.texto?.trim()).filter(Boolean);
          recentAuthors = recentRows.map(r => r.autor?.trim()).filter(Boolean);
        }
      } catch (historyErr) {
        console.warn('[DB History Read Warning]:', historyErr);
      }

      // No quote for today, let's generate one dynamically using the Gemini API!
      let generatedQuote = { texto: '', autor: '', reflexao: '' };

      const pickRandomFallback = (cat: string) => {
        const filteredFallbacks = cat 
          ? fallbackQuotes.filter(q => q.categoria === cat)
          : fallbackQuotes;
        const candidates = filteredFallbacks.length > 0 ? filteredFallbacks : fallbackQuotes;
        
        // Filter out quotes that match recent texts in the database
        const unrepeated = candidates.filter(c => {
          const textLower = c.texto.toLowerCase().trim();
          return !recentTexts.some(r => r.toLowerCase().trim().includes(textLower.slice(0, 25)));
        });

        const pool = unrepeated.length > 0 ? unrepeated : candidates;
        const randomIndex = Math.floor(Math.random() * pool.length);
        const selected = pool[randomIndex];
        return {
          texto: selected.texto,
          autor: selected.autor,
          reflexao: selected.reflexao || 'A sabedoria contida nesta lição nos inspira a refletir de forma profunda sobre a força diária e as virtudes do refinamento pessoal constante.'
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
          let themePrompt = 'Gere um belo e inédito pensamento do dia inspirador.';
          let systemInstruction = 'Você é um curador literário, ético e espiritual de alto refinamento. Elabore reflexões e pensamentos profundos e inspiradores em português com autoria real, consagrada e variada (filósofos, cientistas, educadores, grandes líderes éticos, provérbios ou pensadores contemporâneos).';

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
              themePrompt = 'Gere um belo pensamento do dia que se enquadre em temas de sabedoria, persistência, ética, coragem ou propósito.';
              systemInstruction = 'Você é um curador literário e humanista. Traga uma frase reflexiva célebre ou inspiradora em português que motive o dia de estudantes e profissionais.';
              break;
          }

          // Build anti-repetition blacklist instructions
          const avoidQuotesSample = recentTexts.slice(0, 15).map(t => `"${t.slice(0, 45)}..."`).join(', ');
          const avoidAuthorsSample = Array.from(new Set(recentAuthors)).slice(0, 10).join(', ');

          const uniquenessDirectives = [
            'IMPORTANTE: É terminantemente proibido repetir frases ou reflexões já utilizadas recentemente.',
            avoidQuotesSample ? `Frases recentemente utilizadas que NÃO PODEM SER REPETIDAS: [${avoidQuotesSample}].` : '',
            avoidAuthorsSample ? `Autores já bastante frequentes (priorize outros autores para diversificar): [${avoidAuthorsSample}].` : '',
            'NUNCA repita frases clássicas batidas como "O correr da vida embrulha tudo" de Guimarães Rosa ou "O sucesso é a soma de pequenos esforços" de Robert Collier.',
            'A frase (texto) e a reflexão prática (reflexao) DEVEM SER TOTALMENTE INÉDITAS, originais e exclusivas para o dia de hoje.',
            'Retorne estritamente em formato JSON com as chaves: "texto" (a frase ou pensamento), "autor" (o nome do autor ou pensador) e "reflexao" (uma reflexão profunda e inédita de 2 a 3 frases sobre como aplicar essa lição hoje).'
          ].filter(Boolean).join(' ');

          const fullUserPrompt = `${themePrompt} ${uniquenessDirectives}`;

          // High-availability model priority cascade
          const candidateModels = [
            'gemini-3-flash-preview',
            'gemini-3.6-flash',
            'gemini-3.1-flash-lite',
            'gemini-3.5-flash-lite',
            'gemini-3.8-flash'
          ];

          let parsedResult: { texto?: string; autor?: string; reflexao?: string } | null = null;
          let lastModelError: any = null;

          for (const modelName of candidateModels) {
            try {
              const response = await withTimeout(
                getGeminiAI().models.generateContent({
                  model: modelName,
                  contents: fullUserPrompt,
                  config: {
                    systemInstruction,
                    responseMimeType: 'application/json'
                  }
                }),
                4500
              );

              if (response && response.text) {
                const parsed = parseGeneratedJson(response.text);
                if (parsed && parsed.texto && parsed.autor) {
                  // Check that it does not collide with recent database entries
                  const isRepetitive = recentTexts.some(rt => 
                    rt.toLowerCase().includes(parsed.texto!.toLowerCase().slice(0, 25))
                  );
                  if (!isRepetitive) {
                    parsedResult = parsed;
                    break;
                  } else {
                    console.warn(`[Gemini Generation] Model ${modelName} returned a repetitive quote. Trying next model...`);
                  }
                }
              }
            } catch (err: any) {
              lastModelError = err;
              const errStr = String(err?.message || err || '');
              console.warn(`[Gemini Model Fail] Model ${modelName} encountered error: ${errStr.slice(0, 80)}. Trying fallback model...`);
            }
          }

          if (parsedResult && parsedResult.texto && parsedResult.autor) {
            generatedQuote = {
              texto: parsedResult.texto.trim(),
              autor: parsedResult.autor.trim(),
              reflexao: (parsedResult.reflexao || '').trim()
            };
          } else {
            console.warn('[Gemini Cascade] All Gemini models either failed or were unavailable. Falling back to diverse offline catalog.', lastModelError?.message);
            generatedQuote = pickRandomFallback(category);
          }
        } catch (apiError: any) {
          console.warn('[Gemini API General Error] Falling back to preloaded thoughts catalog gracefully. Reason:', apiError?.message || apiError);
          
          const errMsg = String(apiError?.message || apiError?.status || apiError || '').toLowerCase();
          if (errMsg.includes('429') || errMsg.includes('resource_exhausted')) {
            console.warn('[Gemini API Cooldown] Rate limit encountered. Cooldown active for 3 minutes.');
            geminiBlockedUntil = Date.now() + 3 * 60 * 1000;
          }

          generatedQuote = pickRandomFallback(category);
        }
      }

      if (!generatedQuote.texto || !generatedQuote.autor) {
        generatedQuote = pickRandomFallback(category);
      }

      // Ensure reflexao field is present, inspiring and unpublished
      if (!generatedQuote.reflexao) {
        generatedQuote.reflexao = `${generatedQuote.texto} — Este ensinamento nos convida a cultivar serenidade, perseverança e clareza de propósito para vencer os desafios de hoje.`;
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

          let { data: insertedData, error: insertError } = await supabaseAdmin
            .from('pensamento_dia')
            .upsert(upsertPayload, { onConflict: 'data_exibicao' })
            .select('*')
            .maybeSingle();

          // Graceful fallback retry if column 'reflexao' doesn't exist in Supabase yet
          if (insertError && (insertError.code === '42703' || String(insertError.message || '').includes('reflexao'))) {
            console.warn('[Reflexao column missing in DB - Retrying insertion without it]');
            delete upsertPayload.reflexao;
            const retryRes = await supabaseAdmin
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

    let { data, error } = await supabaseAdmin
      .from('pensamento_dia')
      .upsert(upsertPayload, { onConflict: 'data_exibicao' })
      .select('*')
      .maybeSingle();

    // Graceful fallback retry if column 'reflexao' doesn't exist yet
    if (error && (error.code === '42703' || String(error.message || '').includes('reflexao'))) {
      console.warn('[POST thoughts reflexao column missing - Retrying without reflexao]');
      delete upsertPayload.reflexao;
      const retryRes = await supabaseAdmin
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
