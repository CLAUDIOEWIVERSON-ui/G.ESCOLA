'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Language } from './translations';

type TranslationKeys = typeof translations.pt;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationKeys;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('app-language') as Language;
      if (saved && (saved === 'pt' || saved === 'en')) {
        return saved;
      }
    }
    return 'pt';
  });

  const handleSetLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('app-language', lang);
      document.cookie = `app-language=${lang}; path=/; max-age=31536000; SameSite=Lax`;
    }
  };

  const t = translations[language] || translations.pt;

  const value = React.useMemo(() => ({ 
    language, 
    setLanguage: handleSetLanguage, 
    t 
  }), [language, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within a LanguageProvider');
  }
  return context;
}
