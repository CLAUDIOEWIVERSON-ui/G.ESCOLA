'use client';

import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import schoolLogo from '@/src/assets/images/school_logo_1778971528475.png';
const INTERNAL_SEAL_LOGO = '/assets/aistudio/Gemini_Generated_Image_ja9nk9ja9nk9ja9n_eb0b9a97.jpeg';

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
    sm: isInternal ? 'w-28 h-28' : 'w-16 h-16',
    md: isInternal ? 'w-[136px] h-[136px]' : 'w-20 h-20',
    lg: isInternal ? 'w-44 h-44' : 'w-44 h-44'
  };

  // If collapsed, always horizontal (just the icon) and smaller if it's in a sidebar
  const finalOrientation = collapsed ? 'horizontal' : orientation;
  const finalSize = collapsed && size === 'lg' ? 'md' : size;
  
  const isVertical = finalOrientation === 'vertical';
  const finalSizeClass = collapsed 
    ? (isInternal ? 'w-[54px] h-[54px]' : 'w-[42px] h-[42px]') 
    : iconSizes[finalSize];

  return (
    <div className={cn(
      "flex items-center",
      isVertical ? "flex-col justify-center gap-3" : "flex-row gap-2 w-full",
      className
    )}>
      <div className={cn("relative shrink-0 group [perspective:900px]", finalSizeClass)}>
        {/* Emblem Container (3D Challenge Coin without white background when internal, circular white badge when external) */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={cn(
            "relative w-full h-full flex items-center justify-center overflow-hidden transition-all duration-300",
            isInternal 
              ? cn(
                  "rounded-full border-0 bg-transparent transform-gpu group-hover:scale-[1.04] group-hover:-translate-y-0.5",
                  dark
                    ? "shadow-[0_14px_26px_-4px_rgba(0,0,0,0.45),0_6px_12px_-2px_rgba(0,0,0,0.28),0_2px_6px_rgba(161,98,7,0.28)]"
                    : "shadow-[0_18px_34px_-4px_rgba(0,0,0,0.9),0_8px_16px_-2px_rgba(0,0,0,0.65),0_0_24px_rgba(234,179,8,0.18)]"
                )
              : "bg-white rounded-full p-[2px] border border-slate-200/40 shadow-sm"
          )}
        >
          <div className="relative w-full h-full rounded-full overflow-hidden">
            <Image
              src={isInternal ? INTERNAL_SEAL_LOGO : schoolLogo}
              alt={isInternal ? "Moeda MANBrSTP" : "School Logo"}
              fill
              priority={isInternal}
              quality={100}
              className={cn(
                isInternal
                  ? "object-cover object-center contrast-[1.06] saturate-[1.06] scale-[1.105] -translate-x-[3.3%]"
                  : "object-contain"
              )}
              referrerPolicy="no-referrer"
              sizes={isInternal ? "(max-width: 640px) 54px, 176px" : "(max-width: 640px) 42px, (max-width: 768px) 80px, 176px"}
            />
          </div>
          {isInternal && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_22%,rgba(255,255,255,0.32)_0%,rgba(255,255,255,0)_48%,rgba(0,0,0,0.22)_100%)] shadow-[inset_0_2px_6px_rgba(255,250,210,0.55),inset_0_-6px_12px_rgba(0,0,0,0.35)]"
            />
          )}
        </motion.div>
      </div>

      {!collapsed && (
        <motion.div
          initial={{ opacity: 0, x: isVertical ? 0 : -8, y: isVertical ? 8 : 0 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          className={cn("flex flex-col justify-center", isVertical ? "items-center text-center w-full" : "items-start flex-1")}
        >
          <span className={cn(
            "font-bold tracking-tight leading-none transition-colors",
            finalSize === 'lg' ? "text-2xl" : "text-sm",
            dark ? "text-black" : "text-white"
          )}>
            SISTEMA DE
          </span>
          <span className={cn(
            "font-black uppercase tracking-wider mt-1 leading-none whitespace-normal break-words transition-colors",
            finalSize === 'lg' ? "text-sm" : "text-[10px]",
            dark ? "text-black" : "text-white"
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
                    : "bg-gradient-to-b from-blue-500/25 to-blue-600/5 border-t border-t-blue-400/40 border-x border-x-blue-500/20 border-b-2 border-b-blue-600/50 text-white shadow-[0_2.5px_4px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.15)]"
                  : userRole.toLowerCase() === 'instrutor' || userRole.toLowerCase() === 'instructor'
                    ? dark 
                      ? "bg-gradient-to-b from-amber-50 to-amber-100/50 border-t border-t-white border-x border-x-amber-100/80 border-b-2 border-b-amber-300/80 text-amber-700 shadow-[0_2px_3px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]" 
                      : "bg-gradient-to-b from-amber-500/25 to-amber-600/5 border-t border-t-amber-400/40 border-x border-x-amber-500/20 border-b-2 border-b-amber-600/50 text-white shadow-[0_2.5px_4px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.15)]"
                    : dark 
                      ? "bg-white border border-black text-black" 
                      : "bg-gradient-to-b from-slate-500/25 to-slate-600/5 border-t border-t-slate-400/30 border-x border-x-slate-500/10 border-b-2 border-b-slate-600/50 text-white shadow-[0_2.5px_4px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.1)]"
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
