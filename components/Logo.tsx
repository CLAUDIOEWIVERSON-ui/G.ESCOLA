'use client';

import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import schoolLogo from '@/src/assets/images/school_logo_1778971528475.png';
import internalLogo from '@/src/assets/images/brazil_shield_logo_1780469604695.png';

interface LogoProps {
  className?: string;
  collapsed?: boolean;
  dark?: boolean;
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
  userRole?: string;
  isInternal?: boolean;
}

export function Logo({ 
  className, 
  collapsed = false, 
  dark = false,
  size = 'lg',
  orientation = 'vertical',
  userRole,
  isInternal = false
}: LogoProps) {
  
  const iconSizes = {
    sm: isInternal ? 'w-32 h-32' : 'w-16 h-16',
    md: isInternal ? 'w-40 h-40' : 'w-20 h-20',
    lg: isInternal ? 'w-88 h-88' : 'w-44 h-44'
  };

  // If collapsed, always horizontal (just the icon) and smaller if it's in a sidebar
  const finalOrientation = collapsed ? 'horizontal' : orientation;
  const finalSize = collapsed && size === 'lg' ? 'md' : size;
  
  const isVertical = finalOrientation === 'vertical';
  const finalSizeClass = collapsed 
    ? (isInternal ? 'w-[64px] h-[64px]' : 'w-[42px] h-[42px]') 
    : iconSizes[finalSize];

  return (
    <div className={cn(
      "flex items-center",
      isVertical ? "flex-col justify-center gap-3" : "flex-row gap-2 w-full",
      className
    )}>
      <div className={cn("relative shrink-0 group", finalSizeClass)}>
        {/* Emblem Container with high-contrast background (circular badge when external, transparent when internal) */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={cn(
            "relative w-full h-full flex items-center justify-center overflow-hidden transition-all duration-300",
            isInternal 
              ? "bg-transparent rounded-2xl shadow-md" 
              : "bg-white rounded-full p-[2px] border border-slate-200/40 shadow-sm"
          )}
        >
          <div className="relative w-full h-full">
            <Image
              src={isInternal ? internalLogo : schoolLogo}
              alt="School Logo"
              fill
              className="object-contain"
              referrerPolicy="no-referrer"
              sizes="(max-width: 640px) 42px, (max-width: 768px) 80px, 176px"
            />
          </div>
        </motion.div>
      </div>

      {!collapsed && (
        <motion.div
          initial={{ opacity: 0, x: isVertical ? 0 : -8, y: isVertical ? 8 : 0 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          className={cn("flex flex-col justify-center", isVertical ? "items-center text-center w-full" : "items-start flex-1")}
        >
          <span className={cn(
            "font-bold tracking-tight leading-none",
            finalSize === 'lg' ? "text-2xl" : "text-sm",
            dark ? "text-slate-900" : "text-white"
          )}>
            SISTEMA DE
          </span>
          <span className={cn(
            "font-black uppercase tracking-wider mt-1 leading-none whitespace-normal break-words",
            finalSize === 'lg' ? "text-sm text-yellow-500" : "text-[10px]",
            dark ? "text-[#002776]" : "text-yellow-400"
          )}>
            GESTÃO ESCOLAR
          </span>
          {userRole && (
            <div className="mt-2 shrink-0">
              <span className={cn(
                "inline-flex items-center px-2.5 py-0.5 text-[9px] font-black tracking-widest rounded-full uppercase transition-all duration-300 select-none",
                userRole.toLowerCase() === 'administrador' || userRole.toLowerCase() === 'administrator' || userRole.toLowerCase() === 'admin'
                  ? dark 
                    ? "bg-gradient-to-b from-blue-50 to-blue-100/50 border-t border-t-white border-x border-x-blue-100/80 border-b-2 border-b-blue-300/80 text-blue-700 shadow-[0_2px_3px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]" 
                    : "bg-gradient-to-b from-blue-500/25 to-blue-600/5 border-t border-t-blue-400/40 border-x border-x-blue-500/20 border-b-2 border-b-blue-600/50 text-blue-300 shadow-[0_2.5px_4px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.15)]"
                  : userRole.toLowerCase() === 'instrutor' || userRole.toLowerCase() === 'instructor'
                    ? dark 
                      ? "bg-gradient-to-b from-amber-50 to-amber-100/50 border-t border-t-white border-x border-x-amber-100/80 border-b-2 border-b-amber-300/80 text-amber-700 shadow-[0_2px_3px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]" 
                      : "bg-gradient-to-b from-amber-500/25 to-amber-600/5 border-t border-t-amber-400/40 border-x border-x-amber-500/20 border-b-2 border-b-amber-600/50 text-amber-300 shadow-[0_2.5px_4px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.15)]"
                    : dark 
                      ? "bg-gradient-to-b from-slate-100 to-slate-200/50 border-t border-t-white border-x border-x-slate-200/80 border-b-2 border-b-slate-300 text-slate-700 shadow-[0_2px_3px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]" 
                      : "bg-gradient-to-b from-slate-500/25 to-slate-600/5 border-t border-t-slate-400/30 border-x border-x-slate-500/10 border-b-2 border-b-slate-600/50 text-slate-300 shadow-[0_2.5px_4px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.1)]"
              )}>
                {userRole}
              </span>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
