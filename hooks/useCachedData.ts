'use client';

import useSWR, { mutate } from 'swr';
import { supabase } from '@/lib/supabase/client';
import { useUser } from '@/lib/auth/UserContext';

// Standard SWR options to limit aggressive polling and focus revalidation, 
// keeping network operations light and professional.
const DEFAULT_SWR_OPTIONS = {
  revalidateOnFocus: false,      // Prevent refreshing simply because user changed tabs
  revalidateOnReconnect: true,  // Revalidate when internet connection resumes
  dedupingInterval: 120000,     // Consider data fresh for 2 minutes (deduplicate requests in this window)
};

/**
 * Fetch and decode courses list with strict caching
 */
export function useCursos() {
  const { profile } = useUser();
  const role = profile?.role;
  const grupoResponsavel = profile?.grupo_responsavel;

  const { data, error, isLoading, mutate: swrMutate } = useSWR(
    ['supabase:cursos', role, grupoResponsavel],
    async () => {
      const { data: dbData, error: dbError } = await supabase
        .from('cursos')
        .select('*')
        .is('deleted_at', null)
        .order('nome');

      if (dbError) throw dbError;
      if (!dbData) return [];

      const mappedData = dbData.map((t: any) => {
        if (t.status === 'ativa' && t.ativa === false) {
          return { ...t, status: 'pré-inscrito(a)(s)' };
        }
        return t;
      });

      let filteredData = mappedData;
      if (role === 'instrutor' && grupoResponsavel) {
        if (grupoResponsavel === 'MAN') {
          filteredData = mappedData.filter((c: any) => c.grupo_responsavel === 'MAN');
        } else if (grupoResponsavel === 'GAT') {
          filteredData = mappedData.filter((c: any) => c.grupo_responsavel === 'GAT');
        } else if (grupoResponsavel === 'AMBOS') {
          filteredData = mappedData.filter((c: any) => c.grupo_responsavel === 'MAN' || c.grupo_responsavel === 'GAT');
        }
      }

      const units = ['dia', 'semana', 'mes', 'ano'];
      return filteredData.map((item: any) => {
        const dbVal = item.ano_inicio || 13; // default 1 year (1 * 10 + 3)
        const val = Math.floor(dbVal / 10);
        const unitIdx = dbVal % 10;
        
        return {
          ...item,
          duracao: val || 1,
          duracao_unidade: (units[unitIdx] || 'ano') as any,
          qtd_modulos: item.qtd_modulos || 4,
          internacional: !!item.internacional,
          localizacao: item.localizacao || ''
        };
      });
    },
    DEFAULT_SWR_OPTIONS
  );

  return {
    cursos: data || [],
    loading: isLoading,
    error,
    mutate: swrMutate,
  };
}

/**
 * Fetch turmas with automatic join for courses names and strict caching
 */
export function useTurmas() {
  const { profile } = useUser();
  const role = profile?.role;
  const grupoResponsavel = profile?.grupo_responsavel;

  const { data, error, isLoading, mutate: swrMutate } = useSWR(
    ['supabase:turmas', role, grupoResponsavel],
    async () => {
      const { data: dbData, error: dbError } = await supabase
        .from('turmas')
        .select('*, curso:cursos(nome, documento_criacao, categoria, qtd_modulos, grupo_responsavel)')
        .is('deleted_at', null)
        .order('nome');

      if (dbError) throw dbError;
      if (!dbData) return [];

      const mappedData = dbData.map((t: any) => {
        if (t.status === 'ativa' && t.ativa === false) {
          return { ...t, status: 'pré-inscrito(a)(s)' };
        }
        return t;
      });

      let filteredData = mappedData;
      if (role === 'instrutor' && grupoResponsavel) {
        filteredData = mappedData.filter((t: any) => {
          const courseGroup = t.curso?.grupo_responsavel || t.grupo_responsavel;
          if (!courseGroup) return false;
          if (grupoResponsavel === 'MAN') {
            return courseGroup === 'MAN';
          } else if (grupoResponsavel === 'GAT') {
            return courseGroup === 'GAT';
          } else if (grupoResponsavel === 'AMBOS') {
            return courseGroup === 'MAN' || courseGroup === 'GAT';
          }
          return false;
        });
      }

      return filteredData;
    },
    DEFAULT_SWR_OPTIONS
  );

  return {
    turmas: data || [],
    loading: isLoading,
    error,
    mutate: swrMutate,
  };
}

/**
 * Fetch subjects/disciplinas with strict caching
 */
export function useDisciplinas() {
  const { data, error, isLoading, mutate: swrMutate } = useSWR(
    'supabase:disciplinas',
    async () => {
      const { data: dbData, error: dbError } = await supabase
        .from('disciplinas')
        .select('*')
        .is('deleted_at', null)
        .order('nome');

      if (dbError) throw dbError;
      return dbData || [];
    },
    DEFAULT_SWR_OPTIONS
  );

  return {
    disciplinas: data || [],
    loading: isLoading,
    error,
    mutate: swrMutate,
  };
}

/**
 * Fetch global configuration settings (media_aprovacao, frequencia_minima etc)
 */
export function useConfiguracoes() {
  const { data, error, isLoading, mutate: swrMutate } = useSWR(
    'supabase:configuracoes',
    async () => {
      const { data: dbData, error: dbError } = await supabase
        .from('configuracoes')
        .select('*')
        .single();

      if (dbError) throw dbError;
      return dbData || { media_aprovacao: 7, media_recuperacao: 5, frequencia_minima: 75, nota_maxima: 10 };
    },
    {
      ...DEFAULT_SWR_OPTIONS,
      revalidateOnFocus: false,
    }
  );

  return {
    configuracoes: data,
    loading: isLoading,
    error,
    mutate: swrMutate,
  };
}

/**
 * Fetch all students/alunos with strict caching
 */
export function useAlunos() {
  const { data, error, isLoading, mutate: swrMutate } = useSWR(
    'supabase:alunos',
    async () => {
      const { data: dbData, error: dbError } = await supabase
        .from('alunos')
        .select('*')
        .is('deleted_at', null)
        .order('nome');

      if (dbError) throw dbError;
      return dbData || [];
    },
    DEFAULT_SWR_OPTIONS
  );

  return {
    alunos: data || [],
    loading: isLoading,
    error,
    mutate: swrMutate,
  };
}

/**
 * Fetch and compile aggregated dashboard statistics with caching
 */
export function useDashboardStats() {
  const { profile } = useUser();
  const role = profile?.role;
  const grupoResponsavel = profile?.grupo_responsavel;

  const { data, error, isLoading, mutate: swrMutate } = useSWR(
    ['supabase:dashboardStats', role, grupoResponsavel],
    async () => {
      const [
        alunosExteriorRes,
        cursosRes,
        turmasRes,
        alunosRes
      ] = await Promise.all([
        supabase.from('alunos')
          .select(`
            *,
            turma:turmas!inner(
              *,
              curso:cursos(*)
            )
          `)
          .eq('turma.internacional', true)
          .is('deleted_at', null),
        supabase.from('cursos')
          .select('id, nome, categoria, documento_criacao')
          .is('deleted_at', null),
        supabase.from('turmas')
          .select('id, nome, categoria, ano, data_inicio, data_fim, status, internacional, localizacao, periodo, capacidade_max, instrutor, grupo_responsavel, curso_id, documento_criacao, arquivada, curso:cursos(id, nome, categoria, grupo_responsavel, documento_criacao)')
          .is('deleted_at', null),
        supabase.from('alunos')
          .select('id, turma_id')
          .is('deleted_at', null)
      ]);

      if (alunosExteriorRes.error) throw alunosExteriorRes.error;
      if (cursosRes.error) throw cursosRes.error;
      if (turmasRes.error) throw turmasRes.error;
      if (alunosRes.error) throw alunosRes.error;

      const activeCursos = cursosRes.data || [];
      const activeTurmas = (turmasRes.data || []).map((t: any) => {
        if (t.status === 'ativa' && t.ativa === false) {
          return { ...t, status: 'pré-inscrito(a)(s)' };
        }
        return t;
      });
      const activeAlunos = alunosRes.data || [];
      const alunosExteriorData = alunosExteriorRes.data || [];

      // Filter active turmas if user is instructor
      let filteredTurmas = activeTurmas;
      if (role === 'instrutor' && grupoResponsavel) {
        filteredTurmas = activeTurmas.filter((t: any) => {
          const courseGroup = t.curso?.grupo_responsavel || t.grupo_responsavel;
          if (!courseGroup) return false;
          if (grupoResponsavel === 'MAN') {
            return courseGroup === 'MAN';
          } else if (grupoResponsavel === 'GAT') {
            return courseGroup === 'GAT';
          } else if (grupoResponsavel === 'AMBOS') {
            return courseGroup === 'MAN' || courseGroup === 'GAT';
          }
          return false;
        });
      }

      // Filter international/exterior students by responsibility group of their class/turma
      let filteredAlunosExterior = alunosExteriorData;
      if (role === 'instrutor' && grupoResponsavel) {
        filteredAlunosExterior = alunosExteriorData.filter((aluno: any) => {
          const tData = Array.isArray(aluno.turma) ? aluno.turma[0] : aluno.turma;
          if (!tData) return false;
          
          const courseGroup = tData.curso?.grupo_responsavel || tData.grupo_responsavel;
          if (!courseGroup) return false;

          if (grupoResponsavel === 'MAN') {
            return courseGroup === 'MAN';
          } else if (grupoResponsavel === 'GAT') {
            return courseGroup === 'GAT';
          } else if (grupoResponsavel === 'AMBOS') {
            return courseGroup === 'MAN' || courseGroup === 'GAT';
          }
          return true;
        });
      }

      // Map course id to course object
      const courseMap = new Map<string, { id: string; nome: string; categoria: string | null }>();
      activeCursos.forEach((c: any) => {
        courseMap.set(c.id, c);
      });

      // Helper function to resolve category accurately
      const resolveTurmaCategory = (turma: any, course: any): 'expedito' | 'carreira' | 'especial' | 'ead' => {
        const catRaw = (turma?.categoria || course?.categoria || '').toString().toLowerCase().trim();
        const nomeTurma = (turma?.nome || '').toLowerCase();
        const nomeCurso = (course?.nome || '').toLowerCase();

        if (catRaw === 'carreira' || catRaw === 'carreiras' || catRaw.includes('carreir')) {
          return 'carreira';
        }
        if (catRaw === 'especial' || catRaw === 'especiais' || catRaw.includes('especi')) {
          return 'especial';
        }
        if (catRaw === 'ead' || catRaw.includes('distancia') || catRaw.includes('distância') || nomeTurma.includes('ead') || nomeCurso.includes('ead')) {
          return 'ead';
        }
        // Default category for naval training courses is expedito
        return 'expedito';
      };

      // Map turma id to course & category with status
      const turmaMetaMap = new Map<string, { categoria: 'expedito' | 'carreira' | 'especial' | 'ead'; isAtiva: boolean; isPreInscrito: boolean; isArquivada: boolean }>();

      // Map turma id to number of active students
      const alunoCountByTurmaMap = new Map<string, number>();
      activeAlunos.forEach((al: any) => {
        if (al.turma_id) {
          alunoCountByTurmaMap.set(al.turma_id, (alunoCountByTurmaMap.get(al.turma_id) || 0) + 1);
        }
      });

      // Count and compile turmas by category of their course - Active only, non-concluded and non-archived
      const expeditoTurmasList: any[] = [];
      const carreiraTurmasList: any[] = [];
      const especialTurmasList: any[] = [];
      const eadTurmasList: any[] = [];
      const preInscritasTurmasList: any[] = [];
      const arquivadasTurmasList: any[] = [];

      filteredTurmas.forEach((t: any) => {
        const course = (t.curso_id ? courseMap.get(t.curso_id) : null) || (Array.isArray(t.curso) ? t.curso[0] : t.curso);
        const alunoCount = alunoCountByTurmaMap.get(t.id) || 0;
        const tWithCourse = { 
          ...t, 
          curso: course || t.curso,
          alunos_count: alunoCount,
          total_alunos: alunoCount
        };
        
        const statusLower = (t.status || 'ativa').toString().toLowerCase().trim();
        const isArquivada = Boolean(t.arquivada) === true || statusLower === 'arquivada' || statusLower === 'arquivado';
        const isConcluida = !isArquivada && (statusLower === 'concluida' || statusLower === 'concluída' || statusLower === 'concluido' || statusLower === 'concluído' || statusLower === 'cancelada');
        const isPreInscrito = !isArquivada && !isConcluida && (statusLower === 'pré-inscrito(a)(s)' || statusLower === 'pre-inscrito' || statusLower === 'pre_inscrito' || (statusLower === 'ativa' && t.ativa === false));
        const isAtiva = !isArquivada && !isConcluida && !isPreInscrito;

        const category = resolveTurmaCategory(t, course);

        turmaMetaMap.set(t.id, {
          categoria: category,
          isAtiva,
          isPreInscrito,
          isArquivada
        });

        if (isArquivada) {
          arquivadasTurmasList.push(tWithCourse);
        } else if (isAtiva) {
          if (category === 'expedito') {
            expeditoTurmasList.push(tWithCourse);
          } else if (category === 'carreira') {
            carreiraTurmasList.push(tWithCourse);
          } else if (category === 'especial') {
            especialTurmasList.push(tWithCourse);
          } else if (category === 'ead') {
            eadTurmasList.push(tWithCourse);
          }
        } else if (isPreInscrito) {
          preInscritasTurmasList.push(tWithCourse);
        }
      });

      // Count students by course category (only for active, non-archived responsible turmas)
      let expeditoAlunosCount = 0;
      let carreiraAlunosCount = 0;
      let especialAlunosCount = 0;
      let eadAlunosCount = 0;
      let preInscritosAlunosCount = 0;
      let arquivadasAlunosCount = 0;

      activeAlunos.forEach((al: any) => {
        if (al.turma_id) {
          const meta = turmaMetaMap.get(al.turma_id);
          if (meta) {
            if (meta.isArquivada) {
              arquivadasAlunosCount++;
            } else if (meta.isAtiva) {
              if (meta.categoria === 'expedito') {
                expeditoAlunosCount++;
              } else if (meta.categoria === 'carreira') {
                carreiraAlunosCount++;
              } else if (meta.categoria === 'especial') {
                especialAlunosCount++;
              } else if (meta.categoria === 'ead') {
                eadAlunosCount++;
              }
            } else if (meta.isPreInscrito) {
              preInscritosAlunosCount++;
            }
          }
        }
      });

      return {
        stats: {
          alunosExterior: filteredAlunosExterior.length,
          turmasExpedito: expeditoTurmasList.length,
          turmasCarreira: carreiraTurmasList.length,
          turmasEspeciais: especialTurmasList.length,
          turmasEad: eadTurmasList.length,
          turmasPreInscritas: preInscritasTurmasList.length,
          turmasArquivadas: arquivadasTurmasList.length,
          studentsExpedito: expeditoAlunosCount,
          studentsCarreira: carreiraAlunosCount,
          studentsEspeciais: especialAlunosCount,
          studentsEad: eadAlunosCount,
          studentsPreInscritos: preInscritosAlunosCount,
          studentsArquivadas: arquivadasAlunosCount,
        },
        alunosExterior: filteredAlunosExterior,
        turmasExpeditoList: expeditoTurmasList,
        turmasCarreiraList: carreiraTurmasList,
        turmasEspeciaisList: especialTurmasList,
        turmasEadList: eadTurmasList,
        turmasPreInscritasList: preInscritasTurmasList,
        turmasArquivadasList: arquivadasTurmasList,
      };
    },
    {
      ...DEFAULT_SWR_OPTIONS,
      fallbackData: {
        stats: {
          alunosExterior: 0,
          turmasExpedito: 0,
          turmasCarreira: 0,
          turmasEspeciais: 0,
          turmasEad: 0,
          turmasPreInscritas: 0,
          turmasArquivadas: 0,
          studentsExpedito: 0,
          studentsCarreira: 0,
          studentsEspeciais: 0,
          studentsEad: 0,
          studentsPreInscritos: 0,
          studentsArquivadas: 0,
        },
        alunosExterior: [],
        turmasExpeditoList: [],
        turmasCarreiraList: [],
        turmasEspeciaisList: [],
        turmasEadList: [],
        turmasPreInscritasList: [],
        turmasArquivadasList: [],
      }
    }
  );

  return {
    dashboardData: data,
    loading: isLoading,
    error,
    mutate: swrMutate,
  };
}

/**
 * Helper to force mutate/refresh all main caches
 */
export async function revalidateAllCaches() {
  const mutators = [
    mutate((key: any) => Array.isArray(key) ? key[0] === 'supabase:cursos' : key === 'supabase:cursos'),
    mutate((key: any) => Array.isArray(key) ? key[0] === 'supabase:turmas' : key === 'supabase:turmas'),
    mutate('supabase:disciplinas'),
    mutate('supabase:configuracoes'),
    mutate('supabase:alunos'),
    mutate((key: any) => Array.isArray(key) ? key[0] === 'supabase:dashboardStats' : key === 'supabase:dashboardStats'),
  ];
  await Promise.all(mutators);
}
