'use client';

import { useState, useEffect } from 'react';
import { Clock as ClockIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarClockProps {
  collapsed?: boolean;
}

export function SidebarClock({ collapsed }: SidebarClockProps) {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    // Set initial time after mount to avoid hydration mismatch and linter warning
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
  const date = time.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  
  // Get timezone name/offset for clarity
  const timeZoneName = Intl.DateTimeFormat('pt-BR', { timeZoneName: 'short' })
    .formatToParts(time)
    .find(part => part.type === 'timeZoneName')?.value || '';

  return (
    <div className={cn(
      "px-4 py-3 bg-[rgba(30,41,59,0.3)] border border-[rgba(255,255,255,0.05)] rounded-xl transition-all duration-300",
      collapsed ? "p-2 items-center justify-center flex" : "flex flex-col gap-1"
    )}>
      {collapsed ? (
        <div className="flex flex-col items-center gap-1">
          <ClockIcon size={16} className="text-blue-400 animate-pulse" />
          <span className="text-[10px] font-bold text-slate-400 tabular-nums">{hours}:{minutes}</span>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Horário do Sistema</span>
            <span className="text-[9px] font-bold text-blue-500/80 px-1.5 py-0.5 bg-blue-500/10 rounded uppercase">{timeZoneName}</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-white tabular-nums tracking-tighter">
              {hours}:{minutes}
            </span>
            <span className="text-[10px] font-medium text-slate-500 tabular-nums">
              :{seconds}
            </span>
          </div>
          <p className="text-[9px] font-medium text-slate-400 capitalize">
            {day}, {date}
          </p>
        </>
      )}
    </div>
  );
}
