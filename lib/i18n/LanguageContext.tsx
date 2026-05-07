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
  const language: Language = 'pt';

  const handleSetLanguage = (lang: Language) => {
    // Language is locked to PT
  };

  const t = translations[language];

  const value = React.useMemo(() => ({ 
    language, 
    setLanguage: handleSetLanguage, 
    t 
  }), [t]);

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
