'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { motion } from 'motion/react';
import { Calendar, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Evento {
  id: string;
  titulo: string;
  data: string;
  cor: string;
}

export function EventMarquee() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEventos = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
          .from('eventos')
          .select('id, titulo, data, cor')
          .gte('data', today.toISOString())
          .order('data', { ascending: true })
          .limit(8);
        
        if (error) {
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

  if (loading || eventos.length === 0) return null;

  return (
    <div className="w-full bg-slate-900 text-white overflow-hidden h-9 flex items-center border-b border-white/10 relative z-50 shrink-0">
      <div className="absolute left-0 top-0 bottom-0 px-4 bg-blue-600 flex items-center gap-2 z-20 shadow-[4px_0_15px_rgba(0,0,0,0.3)]">
        <Bell size={14} className="animate-pulse text-white" />
        <span className="text-[10px] font-black uppercase tracking-tighter whitespace-nowrap">Eventos Próximos</span>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <motion.div
          animate={{ x: [0, -1500] }}
          transition={{ 
            duration: 35, 
            repeat: Infinity, 
            ease: "linear" 
          }}
          className="inline-flex items-center gap-16 pl-40"
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`set-${i}`} className="inline-flex items-center gap-16">
              {eventos.map((evento) => (
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
