'use client';

import { useI18n } from '@/lib/i18n/LanguageContext';
import { Languages } from 'lucide-react';

export function LanguageToggle() {
  const { language, setLanguage } = useI18n();

  return (
    <button
      id="language-toggle"
      onClick={() => setLanguage(language === 'pt' ? 'en' : 'pt')}
      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all text-[10px] font-bold text-slate-500 uppercase tracking-widest shadow-sm bg-white"
    >
      <Languages size={14} className="text-slate-400" />
      {language}
    </button>
  );
}
