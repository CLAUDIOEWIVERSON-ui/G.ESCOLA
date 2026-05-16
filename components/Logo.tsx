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
}

export function Logo({ 
  className, 
  collapsed = false, 
  dark = false,
  size = 'lg',
  orientation = 'vertical'
}: LogoProps) {
  
  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-24 h-24'
  };

  // If collapsed, always horizontal (just the icon) and smaller if it's in a sidebar
  const finalOrientation = collapsed ? 'horizontal' : orientation;
  const finalSize = collapsed && size === 'lg' ? 'md' : size;
  
  const isVertical = finalOrientation === 'vertical';

  return (
    <div className={cn(
      "flex items-center",
      isVertical ? "flex-col justify-center gap-4" : "flex-row gap-3",
      className
    )}>
      <div className={cn("relative shrink-0 group", iconSizes[finalSize])}>
        {/* Emblem Container */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative w-full h-full"
        >
          <Image
            src={schoolLogo}
            alt="School Logo"
            fill
            className="object-contain drop-shadow-md"
            referrerPolicy="no-referrer"
          />
        </motion.div>
      </div>

      {!collapsed && (
        <motion.div
          initial={{ opacity: 0, x: isVertical ? 0 : -10, y: isVertical ? 10 : 0 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          className={cn("flex flex-col", isVertical ? "items-center text-center" : "items-start")}
        >
          <span className={cn(
            "font-bold tracking-tight leading-none",
            finalSize === 'lg' ? "text-xl" : "text-lg",
            dark ? "text-slate-900" : "text-white"
          )}>
            SISTEMA DE
          </span>
          <span className={cn(
            "font-bold uppercase tracking-widest mt-1",
            finalSize === 'lg' ? "text-xs" : "text-[10px]",
            dark ? "text-[#002776]" : "text-yellow-400"
          )}>
            GESTÃO ESCOLAR
          </span>
        </motion.div>
      )}
    </div>
  );
}
