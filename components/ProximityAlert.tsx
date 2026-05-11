'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { Bell, Calendar, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function ProximityAlert() {
  const { t } = useI18n();
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkEvents = async () => {
      try {
        const today = new Date();
        today.setHours(0,0,0,0);
        
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 3); // Check next 3 days for alert
        
        const { data, error } = await supabase
          .from('eventos')
          .select('*')
          .gte('data', today.toISOString().split('T')[0])
          .lte('data', nextWeek.toISOString().split('T')[0])
          .order('data', { ascending: true });

        if (error) {
          // If table doesn't exist yet, we just ignore it for now
          if (error.code === '42P01' || error.code === 'PGRST205') {
            console.warn('Aviso: Tabela "eventos" não encontrada. Execute a migração SQL para habilitar este recurso.');
            return;
          }
          throw error;
        }
        
        if (data && data.length > 0) {
          setUpcomingEvents(data);
          setIsVisible(true);
          
          // Auto hide after 10 seconds
          const timer = setTimeout(() => {
            setIsVisible(false);
          }, 10000);
          return () => clearTimeout(timer);
        }
      } catch (error) {
        console.error('Error checking proximity events:', JSON.stringify(error, null, 2) === '{}' ? error : JSON.stringify(error, null, 2));
      }
    };

    checkEvents();
  }, []);

  if (!isVisible || upcomingEvents.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        whileHover={{ y: -4 }}
        className="fixed bottom-8 right-8 z-[100] max-w-sm w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden cursor-pointer group"
      >
        <Link href="/calendario" className="block">
          <div className="p-1 bg-amber-500 animate-pulse" />
          <div className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-amber-600 mb-1">
                  <Bell size={16} className="animate-bounce" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{t.calendar.proximityAlert}</span>
                </div>
                <h4 className="text-sm font-bold text-slate-800 mb-1 group-hover:text-amber-600 transition-colors">
                  {upcomingEvents.length === 1 
                    ? 'Você tem um evento próximo!' 
                    : `Você tem ${upcomingEvents.length} eventos próximos!`}
                </h4>
                <div className="space-y-2 mt-3">
                  {upcomingEvents.slice(0, 3).map((event) => (
                    <div key={event.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg border border-slate-100 group-hover:bg-amber-50 group-hover:border-amber-100 transition-colors">
                      <div className={cn("w-2 h-8 rounded-full", event.cor)} />
                      <div className="flex-1 overflow-hidden">
                        <p className="text-xs font-bold text-slate-700 truncate">{event.titulo}</p>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Calendar size={10} />
                          {new Date(event.data).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsVisible(false);
                }}
                className="p-1 hover:bg-slate-100 rounded text-slate-400 transition-colors relative z-10"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </Link>
      </motion.div>
    </AnimatePresence>
  );
}
