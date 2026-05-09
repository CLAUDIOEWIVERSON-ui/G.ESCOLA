'use client';

import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export function Logo({ className, collapsed = false }: { className?: string, collapsed?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative w-10 h-10 shrink-0 group">
        {/* Emblem Container */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative w-full h-full"
        >
          {/* The Flag Rectangle */}
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            {/* Rectangular Flag Background */}
            <rect 
              x="5" y="25" width="90" height="50" rx="4"
              fill="#009b3a" 
              stroke="#D4AF37" 
              strokeWidth="3"
            />
            
            {/* Brazilian Flag Elements inside the rectangle */}
            {/* Yellow Diamond */}
            <path d="M50 32 L 85 50 L 50 68 L 15 50 Z" fill="#fedd00" />
            
            {/* Blue Circle */}
            <circle cx="50" cy="50" r="10" fill="#002776" />
            
            {/* White Band */}
            <path 
              d="M42 52 Q 50 48 58 52" 
              fill="none" 
              stroke="white" 
              strokeWidth="1.5" 
              strokeLinecap="round"
            />

            {/* The Quill (Pena) - Adjusted for the rectangular flag */}
            <motion.path 
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
              d="M75 15 C 70 30, 60 70, 45 85 L 42 88" 
              fill="none" 
              stroke="#B8860B" 
              strokeWidth="4" 
              strokeLinecap="round"
            />
            {/* Feather details */}
            <path 
              d="M75 15 C 85 30, 75 55, 55 75 C 65 60, 70 40, 75 15 Z" 
              fill="#D4AF37"
              opacity="0.9"
            />

            {/* The Inkwell (Tinteiro) - At the base */}
            <rect x="48" y="78" width="20" height="12" rx="2" fill="#B8860B" stroke="#8B4513" strokeWidth="1" />
            <rect x="52" y="80" width="12" height="7" rx="1" fill="#1a1a1a" />
          </svg>
        </motion.div>
      </div>

      {!collapsed && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col"
        >
          <span className="font-bold text-white tracking-tight leading-none text-lg">
            SISTEMA DE
          </span>
          <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest mt-0.5">
            GESTÃO ESCOLAR
          </span>
        </motion.div>
      )}
    </div>
  );
}
