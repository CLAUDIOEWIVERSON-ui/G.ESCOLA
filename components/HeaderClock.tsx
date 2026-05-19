'use client';

import { useState, useEffect } from 'react';
import { Clock as ClockIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const day = time.toLocaleDateString('pt-BR', { weekday: 'long' });
  const date = time.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
  
  return (
    <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60 shadow-sm transition-all hover:bg-white hover:shadow-md group">
      <div className="flex items-center gap-2">
        <ClockIcon size={14} className="text-blue-500 group-hover:animate-pulse" />
        <div className="flex items-baseline gap-0.5">
          <span className="text-sm font-bold text-slate-700 tabular-nums">
            {hours}:{minutes}
          </span>
          <span className="text-[10px] font-medium text-slate-400 tabular-nums w-[14px]">
            :{seconds}
          </span>
        </div>
      </div>
      
      <div className="hidden sm:block w-px h-4 bg-slate-200" />
      
      <div className="hidden sm:flex flex-col items-start leading-none">
        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 group-hover:text-blue-500 transition-colors">
          {day}
        </span>
        <span className="text-[10px] font-bold text-slate-600">
          {date}
        </span>
      </div>
    </div>
  );
}
