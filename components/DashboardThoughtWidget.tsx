'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Quote, Sparkles, ArrowRight, Volume2, VolumeX, Copy, Check } from 'lucide-react';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function DashboardThoughtWidget({ studentTheme = false }: { studentTheme?: boolean } = {}) {
  const { language } = useI18n();
  const isPt = language === 'pt';
  const [thought, setThought] = useState<{ texto: string; autor: string; reflexao?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchThought = async () => {
      try {
        const res = await fetch('/api/v1/pensamento-dia');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success && data.data) {
            setThought(data.data);
          }
        }
      } catch (e) {
        // Quiet failover
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchThought();
    return () => {
      isMounted = false;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleCopy = () => {
    if (!thought) return;
    navigator.clipboard.writeText(`"${thought.texto}" — ${thought.autor}`);
    setCopied(true);
    toast.success(isPt ? 'Citação copiada!' : 'Quote copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeech = () => {
    if (!thought || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }
    window.speechSynthesis.cancel();
    const text = `${thought.texto}. Autor: ${thought.autor}.${thought.reflexao ? ` Reflexão: ${thought.reflexao}` : ''}`;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = isPt ? 'pt-BR' : 'en-US';
    u.onstart = () => setIsPlaying(true);
    u.onend = () => setIsPlaying(false);
    u.onerror = () => setIsPlaying(false);
    window.speechSynthesis.speak(u);
  };

  if (loading || !thought) return null;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl p-4 sm:p-5 shadow-xs transition-all border",
        studentTheme
          ? "bg-white border-slate-300 text-black"
          : "border-amber-200/80 dark:border-amber-900/40 bg-gradient-to-r from-amber-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950"
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          <div
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border mt-0.5",
              studentTheme
                ? "bg-white text-black border-slate-300"
                : "bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-300/60 dark:border-amber-700/50"
            )}
          >
            <Quote size={18} className="rotate-180" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span
                className={cn(
                  "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border",
                  studentTheme
                    ? "text-black bg-white border-slate-300"
                    : "text-amber-700 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-950/80 border-amber-300/50 dark:border-amber-800"
                )}
              >
                {isPt ? 'Pensamento do Dia' : 'Thought of the Day'}
              </span>
            </div>
            <p
              className={cn(
                "text-xs sm:text-sm font-serif italic line-clamp-2 leading-relaxed",
                studentTheme ? "text-black" : "text-slate-800 dark:text-slate-200"
              )}
            >
              &ldquo;{thought.texto}&rdquo;
            </p>
            <p
              className={cn(
                "text-[11px] font-bold mt-1 truncate",
                studentTheme ? "text-black" : "text-slate-500 dark:text-slate-400"
              )}
            >
              — {thought.autor}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            onClick={handleSpeech}
            className={cn(
              "p-2 rounded-xl border text-xs transition-all cursor-pointer shadow-2xs",
              studentTheme
                ? isPlaying
                  ? "bg-white text-black border-2 border-black animate-pulse"
                  : "bg-white text-black border-slate-300 hover:border-black"
                : isPlaying 
                  ? "bg-amber-500 text-white border-amber-600 animate-pulse" 
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:text-amber-600"
            )}
            title={isPlaying ? (isPt ? 'Pausar áudio' : 'Pause audio') : (isPt ? 'Ouvir reflexão' : 'Listen')}
          >
            {isPlaying ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>

          <button
            onClick={handleCopy}
            className={cn(
              "p-2 rounded-xl border cursor-pointer shadow-2xs",
              studentTheme
                ? "bg-white text-black border-slate-300 hover:border-black"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
            )}
            title={isPt ? 'Copiar citação' : 'Copy quote'}
          >
            {copied ? <Check size={14} className={studentTheme ? "text-black" : "text-emerald-500"} /> : <Copy size={14} />}
          </button>

          <Link
            href="/pensamento-do-dia"
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95",
              studentTheme
                ? "bg-white hover:bg-slate-100 text-black border border-black"
                : "bg-amber-500 hover:bg-amber-600 text-white"
            )}
          >
            <span>{isPt ? 'Ver Módulo' : 'Open Module'}</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}
