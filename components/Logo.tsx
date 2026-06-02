'use client';

import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import schoolLogo from '@/src/assets/images/school_logo_1778971528475.png';

interface LogoProps {
  className?: string;
  collapsed?: boolean;
  dark?: boolean;
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
  userRole?: string;
}

export function Logo({ 
  className, 
  collapsed = false, 
  dark = false,
  size = 'lg',
  orientation = 'vertical',
  userRole
}: LogoProps) {
  
  const iconSizes = {
    sm: 'w-16 h-16',
    md: 'w-20 h-20',
    lg: 'w-44 h-44'
  };

  // If collapsed, always horizontal (just the icon) and smaller if it's in a sidebar
  const finalOrientation = collapsed ? 'horizontal' : orientation;
  const finalSize = collapsed && size === 'lg' ? 'md' : size;
  
  const isVertical = finalOrientation === 'vertical';
  const finalSizeClass = collapsed ? 'w-[42px] h-[42px]' : iconSizes[finalSize];

  return (
    <div className={cn(
      "flex items-center",
      isVertical ? "flex-col justify-center gap-3" : "flex-row gap-2 w-full",
      className
    )}>
      <div className={cn("relative shrink-0 group", finalSizeClass)}>
        {/* Emblem Container with high-contrast white background circular badge */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative w-full h-full bg-white rounded-full p-2 border border-slate-200/40 shadow-sm flex items-center justify-center overflow-hidden"
        >
          <div className="relative w-full h-full">
            <Image
              src={schoolLogo}
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
                "inline-flex items-center px-2 py-0.5 text-[9px] font-black tracking-widest rounded uppercase border transition-colors",
                userRole.toLowerCase() === 'administrador' || userRole.toLowerCase() === 'administrator' || userRole.toLowerCase() === 'admin'
                  ? dark 
                    ? "bg-blue-50 border-blue-200 text-blue-700" 
                    : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                  : userRole.toLowerCase() === 'instrutor' || userRole.toLowerCase() === 'instructor'
                    ? dark 
                      ? "bg-amber-50 border-amber-200 text-amber-700" 
                      : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                    : dark 
                      ? "bg-slate-100 border-slate-300 text-slate-700" 
                      : "bg-slate-500/10 border-slate-500/20 text-slate-400"
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
