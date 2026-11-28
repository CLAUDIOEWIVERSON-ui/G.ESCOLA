'use client';

import React from 'react';
import Link from 'next/link';
import { RefreshCw, AlertTriangle, MousePointerClick, Home } from 'lucide-react';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { cn } from '@/lib/utils';

interface PageReloadPromptProps {
  isStudentUser?: boolean;
  onRetry?: () => void;
  title?: string;
  description?: string;
  className?: string;
}

export function PageReloadPrompt({
  isStudentUser = false,
  onRetry,
  title,
  description,
  className,
}: PageReloadPromptProps) {
  const { language } = useI18n();
  const isPt = language === 'pt';

  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    } else if (onRetry) {
      onRetry();
    }
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'w-full min-h-[62vh] flex items-center justify-center p-4 sm:p-8 select-none',
        className
      )}
    >
      <div
        className={cn(
          'w-full max-w-md rounded-2xl border p-6 sm:p-8 text-center flex flex-col items-center gap-5 shadow-lg',
          isStudentUser
            ? 'bg-white border-2 border-black text-black shadow-[0_12px_30px_rgba(0,0,0,0.08)]'
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-900/5'
        )}
      >
        <div
          className={cn(
            'w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0',
            isStudentUser
              ? 'bg-white border-2 border-black text-black'
              : 'bg-amber-50 border-amber-200 text-amber-600'
          )}
        >
          <AlertTriangle size={28} />
        </div>

        <div className="space-y-2">
          <h2
            className={cn(
              'text-lg sm:text-xl font-black tracking-tight',
              isStudentUser ? 'text-black' : 'text-slate-900'
            )}
          >
            {title ||
              (isPt
                ? 'O conteúdo da página não carregou'
                : 'Page content failed to load')}
          </h2>
          <p
            className={cn(
              'text-xs sm:text-sm font-medium leading-relaxed',
              isStudentUser ? 'text-black' : 'text-slate-600'
            )}
          >
            {description ||
              (isPt
                ? 'Se apenas a barra de módulos estiver aparecendo, clique no atalho abaixo para recarregar a página imediatamente.'
                : 'If only the module bar is visible, click the shortcut below to reload the page right away.')}
          </p>
        </div>

        <div className="w-full flex flex-col gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleReload}
            className={cn(
              'w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all cursor-pointer active:scale-[0.98] shadow-md',
              isStudentUser
                ? 'student-solid-btn border-2 border-black bg-black text-white hover:bg-neutral-800'
                : 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-700 shadow-blue-600/20'
            )}
          >
            <RefreshCw size={17} className="shrink-0" />
            <span>{isPt ? 'Recarregar Página' : 'Reload Page'}</span>
            <span
              className={cn(
                'ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border',
                isStudentUser
                  ? 'border-white/40 bg-white/15 text-white'
                  : 'border-white/30 bg-white/15 text-white'
              )}
            >
              F5
            </span>
          </button>

          <div
            className={cn(
              'flex items-center justify-center gap-1.5 text-[11px] font-semibold',
              isStudentUser ? 'text-black' : 'text-slate-500'
            )}
          >
            <MousePointerClick size={13} className="shrink-0" />
            <span>
              {isPt
                ? 'Clique no botão acima ou pressione F5 / Ctrl + R'
                : 'Click the button above or press F5 / Ctrl + R'}
            </span>
          </div>

          <div className="pt-2 border-t border-slate-200 flex items-center justify-center gap-3">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer',
                  isStudentUser
                    ? 'bg-white text-black border-slate-300 hover:border-black'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                )}
              >
                <RefreshCw size={13} />
                <span>{isPt ? 'Tentar novamente' : 'Try again'}</span>
              </button>
            )}
            <Link
              href="/dashboard"
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors',
                isStudentUser
                  ? 'bg-white text-black border-slate-300 hover:border-black'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              )}
            >
              <Home size={13} />
              <span>{isPt ? 'Voltar ao Início' : 'Back to Home'}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
