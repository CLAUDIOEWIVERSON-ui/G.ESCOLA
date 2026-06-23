'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useUser } from '@/lib/auth/UserContext';
import { motion } from 'motion/react';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Evento {
  id: string;
  titulo: string;
  descricao?: string;
  data: string;
  cor: string;
  exibir_aluno?: boolean;
  exibir_instrutor?: boolean;
  uniforme_dia?: string;
  creator_id?: string;
  is_exclusive?: boolean;
}

interface EvaluationFormBanner {
  id: string;
  nome: string;
  status?: string;
  data_fim?: string | null;
  data_postergacao?: string | null;
  liberar_formularios?: boolean;
}

interface EventMarqueeProps {
  thought?: { texto: string; autor: string } | null;
}

export function EventMarquee({ thought }: EventMarqueeProps = {}) {
  const { isAluno, profile, isAdmin } = useUser();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [pensamento, setPensamento] = useState<{ texto: string; autor: string } | null>(null);
  const [evaluationBanners, setEvaluationBanners] = useState<EvaluationFormBanner[]>([]);
  const [loading, setLoading] = useState(true);

  const formatBannerDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2].slice(0, 2)}/${parts[1]}/${parts[0]}`;
      }
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    const fetchEvaluationBanners = async () => {
      try {
        const { data, error } = await supabase
          .from('turmas')
          .select('id, nome, status, data_fim, data_postergacao, liberar_formularios')
          .eq('status', 'ativa')
          .eq('liberar_formularios', true);

        if (error) {
          console.warn('Could not load evaluation banners:', error.message);
          return;
        }

        if (data) {
          setEvaluationBanners(data);
        }
      } catch (err) {
        console.error('Catch fetching evaluation banners:', err);
      }
    };

    fetchEvaluationBanners();
    const bannerInterval = setInterval(fetchEvaluationBanners, 3 * 60 * 1000);
    return () => clearInterval(bannerInterval);
  }, []);

  useEffect(() => {
    if (thought) return;
    const fetchPensamento = async () => {
      try {
        const res = await fetch('/api/v1/pensamento-dia');
        if (res.ok) {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const json = await res.json();
            if (json.success && json.data && json.data.texto) {
              setPensamento(json.data);
            }
          }
        }
      } catch (err) {
        // Quietly failover during transitionary server reload phases
      }
    };
    fetchPensamento();
  }, [thought]);

  const activeThought = thought || pensamento;

  useEffect(() => {
    const fetchEventos = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let data: any[] | null = null;
        const { data: primaryData, error } = await supabase
          .from('eventos')
          .select('id, titulo, descricao, data, cor, exibir_aluno, exibir_instrutor, uniforme_dia, creator_id, is_exclusive')
          .gte('data', today.toISOString())
          .order('data', { ascending: true })
          .limit(15);
        
        data = primaryData;

        // Dynamic fallback with multi-column grace handling if columns don't exist yet
        if (error) {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('eventos')
            .select('id, titulo, descricao, data, cor, exibir_aluno, uniforme_dia')
            .gte('data', today.toISOString())
            .order('data', { ascending: true })
            .limit(15);
          
          if (fallbackError) {
            const { data: minData, error: minError } = await supabase
              .from('eventos')
              .select('id, titulo, descricao, data, cor')
              .gte('data', today.toISOString())
              .order('data', { ascending: true })
              .limit(15);
            if (minError) {
              if (minError.code === '42P01') {
                setEventos([]);
                return;
              }
              throw minError;
            }
            data = minData;
          } else {
            data = fallbackData;
          }
        }

        if (data) setEventos(data);
      } catch (error) {
        console.error('Error fetching marquee events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEventos();
    const interval = setInterval(fetchEventos, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredEventos = eventos.map(evt => {
    let desc = evt.descricao || '';
    let parsedCreatorId = evt.creator_id || null;
    let parsedIsExclusive = evt.is_exclusive === true;
    let parsedExibirInstrutor = evt.exibir_instrutor !== false;
    let parsedExibirAluno = evt.exibir_aluno !== false;

    // Try parsing tags
    const creatorMatch = desc.match(/\[creator:([^\]]+)\]/);
    if (creatorMatch) {
      parsedCreatorId = creatorMatch[1];
      desc = desc.replace(/\[creator:[^\]]+\]/, '');
    }

    const exclusiveMatch = desc.match(/\[exclusive:([^\]]+)\]/);
    if (exclusiveMatch) {
      parsedIsExclusive = exclusiveMatch[1] === 'true';
      desc = desc.replace(/\[exclusive:[^\]]+\]/, '');
    } else if (creatorMatch) {
      if (parsedCreatorId === 'admin') {
        parsedIsExclusive = false;
      } else {
        parsedIsExclusive = true;
      }
    }

    const instrutorMatch = desc.match(/\[exibir_instrutor:([^\]]+)\]/);
    if (instrutorMatch) {
      parsedExibirInstrutor = instrutorMatch[1] === 'true';
      desc = desc.replace(/\[exibir_instrutor:[^\]]+\]/, '');
    }

    const alunoMatch = desc.match(/\[exibir_aluno:([^\]]+)\]/);
    if (alunoMatch) {
      parsedExibirAluno = alunoMatch[1] === 'true';
      desc = desc.replace(/\[exibir_aluno:[^\]]+\]/, '');
    }

    return {
      ...evt,
      descricao: desc,
      creator_id: parsedCreatorId || undefined,
      is_exclusive: parsedIsExclusive,
      exibir_instrutor: parsedExibirInstrutor,
      exibir_aluno: parsedExibirAluno
    };
  }).filter(evt => {
    const currentUserId = profile?.id;
    const isOwner = currentUserId && evt.creator_id === currentUserId;
    const isInstrutor = profile?.role === 'instrutor';
    
    if (isAdmin) {
      if (isOwner) return true;
      if (evt.is_exclusive) return false;
      return true; // Show general ones
    } else {
      if (isAluno && !isOwner) {
        if (evt.exibir_aluno === false) return false;
      }
      if (isInstrutor && !isOwner) {
        if (evt.exibir_instrutor === false) return false;
      }
      if (isOwner) return true;
      if (!evt.is_exclusive) return true;
      return false;
    }
  });

  if (loading) return null;
  if (filteredEventos.length === 0 && !activeThought && evaluationBanners.length === 0) return null;

  return (
    <div className="w-full bg-slate-900 text-white overflow-hidden h-9 flex items-center border-b border-white/10 relative z-50 shrink-0">
      <div className="absolute left-0 top-0 bottom-0 px-4 bg-blue-600 flex items-center gap-2 z-20 shadow-[4px_0_15px_rgba(0,0,0,0.3)]">
        <Bell size={14} className="animate-pulse text-white" />
        <span className="text-[10px] font-black uppercase tracking-tighter whitespace-nowrap">Eventos Próximos</span>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <motion.div
          animate={{ x: [0, -2500] }}
          transition={{ 
            duration: 55, 
            repeat: Infinity, 
            ease: "linear" 
          }}
          className="inline-flex items-center gap-16 pl-40"
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`set-${i}`} className="inline-flex items-center gap-16">
              {evaluationBanners.map((banner) => {
                const dateLimit = banner.data_postergacao || banner.data_fim;
                const formattedDate = formatBannerDate(dateLimit);
                return (
                  <div key={`eval-banner-${banner.id}-${i}`} className="flex items-center gap-2 bg-rose-500/10 py-0.5 px-3 rounded-xl border border-rose-500/30 mr-2 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.2)]">
                    <span className="text-[9px] font-black uppercase tracking-widest text-rose-400 whitespace-nowrap">
                      📋 AVALIAÇÃO PÓS-ESCOLAR:
                    </span>
                    <span className="text-xs font-bold text-slate-100 whitespace-nowrap">
                      Turma &ldquo;{banner.nome}&rdquo;
                    </span>
                    <span className="text-[10px] font-medium text-slate-300 whitespace-nowrap">
                      disponível para preenchimento {formattedDate ? `até ${formattedDate}` : 'liberado'}!
                    </span>
                  </div>
                );
              })}
              {activeThought && (
                <div key={`pensamento-${i}`} className="flex items-center gap-2 bg-blue-500/10 py-0.5 px-3 rounded-full border border-blue-500/20 mr-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-blue-400 whitespace-nowrap">
                    💡 Pensamento do Dia:
                  </span>
                  <span className="text-xs font-medium text-slate-200 italic whitespace-nowrap select-all">
                    &ldquo;{activeThought.texto}&rdquo;
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 not-italic whitespace-nowrap">
                    — {activeThought.autor}
                  </span>
                </div>
              )}
              {filteredEventos.map((evento) => (
                <div key={`${evento.id}-${i}`} className="flex items-center gap-3">
                  <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", evento.cor)} />
                  <span className="text-xs font-bold text-slate-100 whitespace-nowrap">
                    {evento.titulo}
                  </span>
                  {evento.uniforme_dia && (
                    <span className="text-[10px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded uppercase tracking-widest whitespace-nowrap">
                      🥋 Uniforme: {evento.uniforme_dia}
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest whitespace-nowrap">
                    {new Date(evento.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </motion.div>
      </div>
      
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-slate-900 to-transparent z-10 pointer-events-none" />
    </div>
  );
}
