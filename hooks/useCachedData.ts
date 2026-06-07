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

      let filteredData = dbData;
      if (role === 'instrutor' && grupoResponsavel) {
        if (grupoResponsavel === 'MAN') {
          filteredData = dbData.filter((c: any) => c.grupo_responsavel === 'MAN');
        } else if (grupoResponsavel === 'GAT') {
          filteredData = dbData.filter((c: any) => c.grupo_responsavel === 'GAT');
        } else if (grupoResponsavel === 'AMBOS') {
          filteredData = dbData.filter((c: any) => c.grupo_responsavel === 'MAN' || c.grupo_responsavel === 'GAT');
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
        .select('*, curso:cursos(nome, documento_criacao, categoria)')
        .is('deleted_at', null)
        .order('nome');

      if (dbError) throw dbError;
      if (!dbData) return [];

      let filteredData = dbData;
      if (role === 'instrutor' && grupoResponsavel) {
        if (grupoResponsavel === 'MAN') {
          filteredData = dbData.filter((t: any) => t.grupo_responsavel === 'MAN');
        } else if (grupoResponsavel === 'GAT') {
          filteredData = dbData.filter((t: any) => t.grupo_responsavel === 'GAT');
        } else if (grupoResponsavel === 'AMBOS') {
          filteredData = dbData.filter((t: any) => t.grupo_responsavel === 'MAN' || t.grupo_responsavel === 'GAT');
        }
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
  const { data, error, isLoading, mutate: swrMutate } = useSWR(
    'supabase:dashboardStats',
    async () => {
      const [
        alunosExteriorRes,
        cursosRes,
        turmasRes,
        alunosRes
      ] = await Promise.all([
        supabase.from('alunos')
          .select(`
            id,
            nome,
            posto_graduacao,
            om,
            foto_url,
            genero,
            tipo_aluno,
            data_inicio_curso,
            data_fim_curso,
            turma:turmas!inner(
              nome,
              ano,
              data_inicio,
              data_fim,
              internacional,
              localizacao,
              curso:cursos(
                nome
              )
            )
          `)
          .eq('turma.internacional', true)
          .is('deleted_at', null),
        supabase.from('cursos')
          .select('id, nome, categoria')
          .is('deleted_at', null),
        supabase.from('turmas')
          .select('id, nome, curso_id, status')
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
      const activeTurmas = turmasRes.data || [];
      const activeAlunos = alunosRes.data || [];
      const alunosExteriorData = alunosExteriorRes.data || [];

      // Map course id to course object
      const courseMap = new Map<string, { id: string; nome: string; categoria: string | null }>();
      activeCursos.forEach((c: any) => {
        courseMap.set(c.id, c);
      });

      // Map turma id to course object with status
      const turmaCoursesMap = new Map<string, { id: string; nome: string; categoria: string | null; status: string | null }>();
      activeTurmas.forEach((t: any) => {
        if (t.curso_id) {
          const c = courseMap.get(t.curso_id);
          if (c) {
            turmaCoursesMap.set(t.id, { ...c, status: t.status });
          }
        }
      });

      // Count turmas by category of their course - Active only, non-concluded
      let expeditoTurmasCount = 0;
      let carreiraTurmasCount = 0;
      let especialTurmasCount = 0;

      activeTurmas.forEach((t: any) => {
        const isAtiva = t.status === 'ativa' || !t.status;
        if (isAtiva && t.curso_id) {
          const course = courseMap.get(t.curso_id);
          if (course) {
            const cat = course.categoria?.toLowerCase();
            if (cat === 'expedito') {
              expeditoTurmasCount++;
            } else if (cat === 'carreira') {
              carreiraTurmasCount++;
            } else if (cat === 'especial') {
              especialTurmasCount++;
            }
          }
        }
      });

      // Count students by course category (only for active turmas)
      let expeditoAlunosCount = 0;
      let carreiraAlunosCount = 0;
      let especialAlunosCount = 0;

      activeAlunos.forEach((al: any) => {
        if (al.turma_id) {
          const course = turmaCoursesMap.get(al.turma_id);
          if (course) {
            const isAtiva = course.status === 'ativa' || !course.status;
            if (isAtiva) {
              const cat = course.categoria?.toLowerCase();
              if (cat === 'expedito') {
                expeditoAlunosCount++;
              } else if (cat === 'carreira') {
                carreiraAlunosCount++;
              } {
                const cat2 = course.categoria?.toLowerCase();
                if (cat2 === 'especial') {
                  especialAlunosCount++;
                }
              }
            }
          }
        }
      });

      return {
        stats: {
          alunosExterior: alunosExteriorData.length,
          turmasExpedito: expeditoTurmasCount,
          turmasCarreira: carreiraTurmasCount,
          turmasEspeciais: especialTurmasCount,
          studentsExpedito: expeditoAlunosCount,
          studentsCarreira: carreiraAlunosCount,
          studentsEspeciais: especialAlunosCount,
        },
        alunosExterior: alunosExteriorData
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
          studentsExpedito: 0,
          studentsCarreira: 0,
          studentsEspeciais: 0,
        },
        alunosExterior: []
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
    mutate('supabase:dashboardStats'),
  ];
  await Promise.all(mutators);
}
