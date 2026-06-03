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
  data: string;
  cor: string;
  exibir_aluno?: boolean;
}

interface EventMarqueeProps {
  thought?: { texto: string; autor: string } | null;
}

export function EventMarquee({ thought }: EventMarqueeProps = {}) {
  const { isAluno } = useUser();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [pensamento, setPensamento] = useState<{ texto: string; autor: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (thought) return;
    const fetchPensamento = async () => {
      try {
        const res = await fetch('/api/v1/pensamento-dia');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data && json.data.texto) {
            setPensamento(json.data);
          }
        }
      } catch (err) {
        console.error('Error fetching thought of the day for marquee:', err);
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

        let query = supabase
          .from('eventos')
          .select('id, titulo, data, cor, exibir_aluno')
          .gte('data', today.toISOString())
          .order('data', { ascending: true })
          .limit(15);
        
        let data: any[] | null = null;
        let { data: primaryData, error } = await query;
        data = primaryData;
        
        // Dynamic fallback if the exibir_aluno column doesn't exist yet
        if (error && (error.message.includes('exibir_aluno') || error.code === 'PGRST204' || error.hint?.includes('exibir_aluno'))) {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('eventos')
            .select('id, titulo, data, cor')
            .gte('data', today.toISOString())
            .order('data', { ascending: true })
            .limit(15);
          
          if (fallbackError) throw fallbackError;
          data = fallbackData;
        } else if (error) {
          if (error.code === '42P01') {
            setEventos([]);
            return;
          }
          throw error;
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

  const filteredEventos = eventos.filter(evento => {
    if (isAluno) {
      // If the admin has chosen to hide it from students or not selected it, hide it.
      // If the column 'exibir_aluno' is undefined (meaning the database migration hasn't been run yet), 
      // fallback to true to prevent a blank state until mig is run.
      return evento.exibir_aluno !== false;
    }
    return true;
  });

  if (loading) return null;
  if (filteredEventos.length === 0 && !activeThought) return null;

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
