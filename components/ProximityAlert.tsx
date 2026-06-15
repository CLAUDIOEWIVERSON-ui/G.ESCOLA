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
  const { t } = useI18n();
  const { isAluno, profile, isAdmin } = useUser();
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(12);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const checkEvents = async () => {
      try {
        const today = new Date();
        today.setHours(0,0,0,0);
        
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 3); // Check next 3 days for alert
        
        // Select custom attributes safely
        let data: any[] | null = null;
        let { data: primaryData, error } = await supabase
          .from('eventos')
          .select('id, titulo, descricao, data, cor, exibir_aluno, exibir_instrutor, creator_id, is_exclusive')
          .gte('data', today.toISOString().split('T')[0])
          .lte('data', nextWeek.toISOString().split('T')[0])
          .order('data', { ascending: true });
        data = primaryData;

        if (error) {
          // Fallback if the columns do not exist yet
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('eventos')
            .select('id, titulo, descricao, data, cor, exibir_aluno')
            .gte('data', today.toISOString().split('T')[0])
            .lte('data', nextWeek.toISOString().split('T')[0])
            .order('data', { ascending: true });
            
          if (fallbackError) {
            const { data: minData, error: minError } = await supabase
              .from('eventos')
              .select('id, titulo, descricao, data, cor')
              .gte('data', today.toISOString().split('T')[0])
              .lte('data', nextWeek.toISOString().split('T')[0])
              .order('data', { ascending: true });
            
            if (minError) {
              if (minError.code === '42P01' || minError.code === 'PGRST205') {
                console.warn('Aviso: Tabela "eventos" não encontrada.');
                return;
              }
              throw minError;
            }
            data = minData;
          } else {
            data = fallbackData;
          }
        }
        
        if (data && data.length > 0) {
          // Parse metadata tags from description
          const parsed = data.map(evt => {
            let desc = evt.descricao || '';
            let parsedCreatorId = evt.creator_id || null;
            let parsedIsExclusive = evt.is_exclusive === true;
            let parsedExibirInstrutor = evt.exibir_instrutor !== false;
            let parsedExibirAluno = evt.exibir_aluno !== false;

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
              descricao: desc.trim(),
              creator_id: parsedCreatorId || undefined,
              is_exclusive: parsedIsExclusive,
              exibir_instrutor: parsedExibirInstrutor,
              exibir_aluno: parsedExibirAluno
            };
          });

          // Filter by owner & exclusivity rules
          const filtered = parsed.filter(evt => {
            const currentUserId = profile?.id;
            const isOwner = currentUserId && evt.creator_id === currentUserId;
            const isInstrutor = profile?.role === 'instrutor';
            
            if (isAdmin) {
              if (isOwner) return true;
              if (evt.is_exclusive) return false;
              return true;
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
        <div className="p-1 bg-amber-500 animate-pulse w-full" />
        <div className="p-5 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3 shrink-0">
            <div className="flex items-center gap-2 text-amber-600">
              <Bell size={18} className="animate-bounce" />
              <span className="text-xs font-black uppercase tracking-widest">{t.calendar.proximityAlert || 'Alerta de Proximidade'}</span>
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
              {upcomingEvents.length === 1 
                ? 'Você tem um evento próximo!' 
                : `Você tem ${upcomingEvents.length} eventos próximos!`}
            </h4>
            <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
              {upcomingEvents.slice(0, 3).map((event) => (
                <Link 
                  key={event.id}
                  href="/calendario" 
                  className="block text-left transition-transform hover:scale-[1.01] focus:outline-none"
                >
                  <div className="flex items-start gap-3 p-3 bg-slate-50 hover:bg-amber-50 rounded-xl border border-slate-100 hover:border-amber-200 transition-all">
                    <div className={cn("w-2 h-10 rounded-full shrink-0", event.cor || "bg-amber-500")} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 break-words whitespace-normal leading-tight">
                        {event.titulo}
                      </p>
                      {event.descricao && (
                        <p className="text-[10px] text-slate-500 mt-1 break-words whitespace-normal leading-relaxed">
                          {event.descricao}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-1.5 font-medium">
                        <Calendar size={11} className="text-slate-400" />
                        {new Date(event.data).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
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
            className="h-full bg-amber-500"
            initial={{ width: "100%" }}
            animate={{ width: isHovered ? "100%" : `${(secondsLeft / 12) * 100}%` }}
            transition={{ duration: isHovered ? 0.2 : 1, ease: "linear" }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
