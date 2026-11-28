'use client';

import React from 'react';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnergyLoadingBarProps {
  fullScreen?: boolean;
  className?: string;
}

export function EnergyLoadingBar({ fullScreen = false, className }: EnergyLoadingBarProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Aguarde......"
      className={cn(
        'w-full flex flex-col items-center justify-center bg-white text-black px-6 select-none',
        fullScreen ? 'min-h-screen' : 'min-h-[55vh] py-16',
        className
      )}
    >
      <div className="w-full max-w-xs sm:max-w-sm flex flex-col items-center gap-3">
        <div className="flex items-center justify-center gap-2 energy-loading-label">
          <Zap
            size={18}
            className="energy-loading-bolt text-emerald-600 fill-emerald-500 animate-pulse shrink-0"
          />
          <span className="text-base sm:text-lg font-black tracking-widest text-black">
            Aguarde......
          </span>
        </div>

        <div className="w-full flex items-center justify-center">
          <div className="energy-loading-track flex-1 h-6 sm:h-7 rounded-xl border-2 border-black bg-slate-100 p-1 relative overflow-hidden shadow-[0_4px_14px_rgba(0,0,0,0.12),inset_0_2px_4px_rgba(0,0,0,0.12)]">
            <div className="energy-loading-fill h-full rounded-lg relative overflow-hidden">
              <div className="energy-loading-shine absolute inset-0" />
            </div>

            {/* Subtle segmented energy bars overlay */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-1 grid grid-cols-8 gap-1"
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-full border-r border-white/35 last:border-r-0"
                />
              ))}
            </div>
          </div>
          <div
            aria-hidden="true"
            className="energy-loading-cap w-1.5 sm:w-2 h-3.5 bg-black rounded-r-sm shrink-0"
          />
        </div>
      </div>
    </div>
  );
}
