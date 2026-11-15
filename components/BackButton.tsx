'use client';

import { Suspense, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/LanguageContext';

const HISTORY_STORAGE_KEY = 'sge_nav_history';
const GOING_BACK_KEY = 'sge_nav_going_back';
const MAX_HISTORY_LENGTH = 40;

function readHistory(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function writeHistory(history: string[]) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(-MAX_HISTORY_LENGTH)));
  } catch {
    // Ignore storage quota errors
  }
}

function RouteHistoryTrackerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    const search = searchParams?.toString();
    const currentUrl = search ? `${pathname}?${search}` : pathname;

    try {
      const goingBack = sessionStorage.getItem(GOING_BACK_KEY) === '1';
      if (goingBack) {
        sessionStorage.removeItem(GOING_BACK_KEY);
        const history = readHistory();
        if (history[history.length - 1] !== currentUrl) {
          writeHistory([...history, currentUrl]);
        }
        return;
      }

      const history = readHistory();
      if (history[history.length - 1] !== currentUrl) {
        writeHistory([...history, currentUrl]);
      }
    } catch {
      // Ignore sessionStorage errors
    }
  }, [pathname, searchParams]);

  return null;
}

export function RouteHistoryTracker() {
  return (
    <Suspense fallback={null}>
      <RouteHistoryTrackerInner />
    </Suspense>
  );
}

interface BackButtonProps {
  fallbackPath?: string;
  isStudentUser?: boolean;
  excludeLogin?: boolean;
  label?: string;
  title?: string;
  className?: string;
  showLabelAlways?: boolean;
}

function BackButtonInner({
  fallbackPath = '/dashboard',
  isStudentUser = false,
  excludeLogin = false,
  label,
  title,
  className,
  showLabelAlways = false,
}: BackButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { language } = useI18n();

  const resolvedLabel = label || (language === 'pt' ? 'Voltar' : 'Back');
  const resolvedTitle =
    title || (language === 'pt' ? 'Voltar para a última página' : 'Back to previous page');

  const handleGoBack = () => {
    const search = searchParams?.toString();
    const currentUrl = pathname ? (search ? `${pathname}?${search}` : pathname) : '';

    try {
      const history = readHistory();
      // Remove current route(s) from the top of stack
      while (history.length > 0 && history[history.length - 1] === currentUrl) {
        history.pop();
      }

      // Optionally skip /login when authenticated inside the dashboard
      if (excludeLogin) {
        while (history.length > 0 && history[history.length - 1].startsWith('/login')) {
          history.pop();
        }
      }

      const previousUrl = history[history.length - 1];
      if (previousUrl && previousUrl !== currentUrl) {
        writeHistory(history);
        sessionStorage.setItem(GOING_BACK_KEY, '1');
        router.push(previousUrl);
        return;
      }
    } catch {
      // Fall through to browser history / fallbackPath
    }

    if (
      typeof window !== 'undefined' &&
      window.history.length > 1 &&
      document.referrer &&
      document.referrer.startsWith(window.location.origin) &&
      !(excludeLogin && document.referrer.includes('/login'))
    ) {
      router.back();
      return;
    }

    router.push(fallbackPath);
  };

  return (
    <button
      type="button"
      onClick={handleGoBack}
      title={resolvedTitle}
      aria-label={resolvedTitle}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer active:scale-95 print:hidden shrink-0',
        isStudentUser
          ? 'bg-white text-black border-slate-300 hover:border-black hover:bg-slate-100'
          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900',
        className
      )}
    >
      <ArrowLeft size={16} className="shrink-0" />
      <span className={showLabelAlways ? 'inline' : 'hidden sm:inline'}>{resolvedLabel}</span>
    </button>
  );
}

export function BackButton(props: BackButtonProps) {
  return (
    <Suspense
      fallback={
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-400 print:hidden shrink-0">
          <ArrowLeft size={16} />
        </span>
      }
    >
      <BackButtonInner {...props} />
    </Suspense>
  );
}
