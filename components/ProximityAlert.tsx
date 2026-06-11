'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { useUser } from '@/lib/auth/UserContext';
import { Bell, Calendar, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const playBellSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    
    const fundamental = 880; // A5
    const harmonics = [1, 1.5, 2, 2.5, 3];
    const gains = [0.4, 0.2, 0.1, 0.05, 0.02];
    
    harmonics.forEach((ratio, i) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(fundamental * ratio, now);
      
      const decay = 2.0 / (ratio * 0.9);
      gainNode.gain.setValueAtTime(gains[i] * 0.25, now);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + decay);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + decay);
    });
  } catch (err) {
    console.warn('Erro ao tocar som de sino nos alertas:', err);
  }
};

export function ProximityAlert() {
  const { t, language } = useI18n();
  const { isAluno } = useUser();
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(12);
  const [isHovered, setIsHovered] = useState(false);

  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local time
  const hasEventToday = upcomingEvents.some(evt => (evt.data || '').split('T')[0] === todayStr);

  useEffect(() => {
    const checkEvents = async () => {
      try {
        const today = new Date();
        today.setHours(0,0,0,0);
        
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 3); // Check next 3 days for alert
        
        // Select including 'exibir_aluno' safely
        let data: any[] | null = null;
        let { data: primaryData, error } = await supabase
          .from('eventos')
          .select('id, titulo, descricao, data, cor, exibir_aluno')
          .gte('data', today.toISOString().split('T')[0])
          .lte('data', nextWeek.toISOString().split('T')[0])
          .order('data', { ascending: true });
        data = primaryData;

        if (error && (error.message.includes('exibir_aluno') || error.code === 'PGRST204' || error.hint?.includes('exibir_aluno'))) {
          // Fallback if the column exibir_aluno doesn't exist yet
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('eventos')
            .select('id, titulo, descricao, data, cor')
            .gte('data', today.toISOString().split('T')[0])
            .lte('data', nextWeek.toISOString().split('T')[0])
            .order('data', { ascending: true });
            
          if (fallbackError) throw fallbackError;
          data = fallbackData;
        } else if (error) {
          if (error.code === '42P01' || error.code === 'PGRST205') {
            console.warn('Aviso: Tabela "eventos" não encontrada. Execute a migração SQL para habilitar este recurso.');
            return;
          }
          throw error;
        }
        
        if (data && data.length > 0) {
          // Filter out if the user is Aluno and exibir_aluno is explicitly false
          const filtered = data.filter(evt => {
            if (isAluno) {
              return evt.exibir_aluno !== false;
            }
            return true;
          });

          if (filtered.length > 0) {
            setUpcomingEvents(filtered);
            setSecondsLeft(12);
            setIsVisible(true);
            
            // Tocar som de sino uma vez ao dia no primeiro acesso, se a preferência estiver ativa
            try {
              const playPref = localStorage.getItem('school_config_play_alert_bell');
              if (playPref !== 'false') {
                const todayStr = new Date().toISOString().split('T')[0];
                const lastPlayed = localStorage.getItem('school_alert_bell_last_played_date');
                if (lastPlayed !== todayStr) {
                  playBellSound();
                  localStorage.setItem('school_alert_bell_last_played_date', todayStr);
                }
              }
            } catch (err) {
              console.warn('Erro ao disparar som de sino:', err);
            }
          }
        }
      } catch (error) {
        console.error('Error checking proximity events:', JSON.stringify(error, null, 2) === '{}' ? error : JSON.stringify(error, null, 2));
      }
    };

    checkEvents();
  }, [isAluno]);

  useEffect(() => {
    if (!isVisible || upcomingEvents.length === 0) return;

    const interval = setInterval(() => {
      if (!isHovered) {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            setIsVisible(false);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible, upcomingEvents, isHovered]);

  if (!isVisible || upcomingEvents.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="fixed bottom-8 right-8 z-[100] max-w-[calc(100vw-2rem)] sm:max-w-md w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800 transition-all duration-300 group"
      >
        <div className={cn("p-1 w-full animate-pulse", hasEventToday ? "bg-rose-500" : "bg-amber-500")} />
        <div className="p-5 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3 shrink-0">
            <div className={cn("flex items-center gap-2", hasEventToday ? "text-rose-600 animate-pulse" : "text-amber-600")}>
              <Bell size={18} className="animate-bounce" />
              <span className="text-xs font-black uppercase tracking-widest font-mono">
                {hasEventToday 
                  ? (language === 'pt' ? 'Compromisso Hoje!' : 'Event Today!')
                  : (t.calendar.proximityAlert || 'Alerta de Proximidade')}
              </span>
            </div>
            <button 
              onClick={() => setIsVisible(false)}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1">
            <h4 className="text-sm font-extrabold text-slate-900 leading-snug mb-3">
              {hasEventToday
                ? (upcomingEvents.length === 1 
                  ? 'Você tem um compromisso hoje!' 
                  : `Você tem ${upcomingEvents.length} compromissos hoje!`)
                : (upcomingEvents.length === 1 
                  ? 'Você tem um evento próximo!' 
                  : `Você tem ${upcomingEvents.length} eventos próximos!`)}
            </h4>
            <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
              {upcomingEvents.slice(0, 3).map((event) => {
                const isToday = (event.data || '').split('T')[0] === todayStr;
                return (
                  <Link 
                    key={event.id}
                    href="/calendario" 
                    className="block text-left transition-transform hover:scale-[1.01] focus:outline-none"
                  >
                    <div className={cn(
                      "flex items-start gap-3 p-3 rounded-xl border transition-all",
                      isToday 
                        ? "bg-rose-50 border-rose-100 hover:bg-rose-100 hover:border-rose-200" 
                        : "bg-slate-50 border-slate-100 hover:bg-amber-50 hover:border-amber-200"
                    )}>
                      <div className={cn(
                        "w-2 h-10 rounded-full shrink-0", 
                        isToday ? "bg-rose-500 animate-pulse" : (event.cor || "bg-amber-500")
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold text-slate-800 break-words whitespace-normal leading-tight">
                            {event.titulo}
                          </p>
                          {isToday && (
                            <span className="shrink-0 inline-block bg-rose-600 text-white font-black text-[9px] px-1.5 py-0.5 rounded-md uppercase tracking-wider animate-pulse font-mono">
                              {language === 'pt' ? 'Hoje!' : 'Today!'}
                            </span>
                          )}
                        </div>
                        {event.descricao && (
                          <p className="text-[10px] text-slate-500 mt-1 break-words whitespace-normal leading-relaxed">
                            {event.descricao}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-1.5 font-medium">
                          <Calendar size={11} className={isToday ? "text-rose-450" : "text-slate-400"} />
                          <span className={cn(isToday ? "text-rose-600 font-bold" : "")}>
                            {isToday 
                              ? (language === 'pt' ? 'Hoje!' : 'Today!') 
                              : new Date(event.data).toLocaleDateString('pt-BR')}
                          </span>
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Action Close Button */}
          <button 
            type="button"
            onClick={() => setIsVisible(false)}
            className="w-full mt-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs tracking-wider uppercase transition-all duration-200 active:scale-95 shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <X size={14} />
            Fechar Alerta {secondsLeft > 0 && `(${secondsLeft}s)`}
          </button>
        </div>

        {/* Progress Countdown Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 pointer-events-none">
          <motion.div 
            className={cn("h-full", hasEventToday ? "bg-rose-500" : "bg-amber-500")}
            initial={{ width: "100%" }}
            animate={{ width: isHovered ? "100%" : `${(secondsLeft / 12) * 100}%` }}
            transition={{ duration: isHovered ? 0.2 : 1, ease: "linear" }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
