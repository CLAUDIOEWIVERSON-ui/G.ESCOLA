'use client';

import { useState, useEffect } from 'react';
import { Clock as ClockIcon, Calendar as CalendarIcon } from 'lucide-react';

export function HeaderClock() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    const initialTimer = setTimeout(() => {
      setTime(new Date());
    }, 0);

    return () => {
      clearInterval(timer);
      clearTimeout(initialTimer);
    };
  }, []);

  if (!time) return null;

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const seconds = time.getSeconds().toString().padStart(2, '0');
  const weekday = time.toLocaleDateString('pt-BR', { weekday: 'short' });
  const dateStr = time.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  return (
    <div id="header-clock" className="flex items-center gap-3 px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl transition-all duration-300 hover:bg-slate-100 hover:border-slate-300 shadow-sm shrink-0">
      {/* Visual Clock with blinking colon and real-time seconds */}
      <div className="flex items-center gap-2">
        <ClockIcon size={14} className="text-blue-500 animate-pulse shrink-0" />
        <div className="flex items-center font-mono text-xs sm:text-sm font-bold text-slate-700 tracking-tight">
          <span>{hours}</span>
          <span className="animate-[pulse_1s_infinite] mx-0.5 text-blue-500 font-bold">:</span>
          <span>{minutes}</span>
          <span className="text-[9px] text-slate-400 font-medium ml-1 w-4 tabular-nums">
            {seconds}
          </span>
        </div>
      </div>
      
      {/* Minimal Divider */}
      <div className="h-4 w-[1px] bg-slate-200" />
      
      {/* Elegant Date */}
      <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">
        <CalendarIcon size={12} className="text-slate-400 shrink-0" />
        <span className="hidden sm:inline-block capitalize">{weekday},</span>
        <span>{dateStr}</span>
      </div>
    </div>
  );
}
