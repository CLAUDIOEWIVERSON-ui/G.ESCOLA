import type {Metadata} from 'next';
import './globals.css';
import { LanguageProvider } from '@/lib/i18n/LanguageContext';
import { UserProvider } from '@/lib/auth/UserContext';

export const metadata: Metadata = {
  title: 'SGE - Sistema de Gestão Escolar',
  description: 'Sistema completo de gerenciamento escolar',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt">
      <body suppressHydrationWarning className="antialiased min-h-screen bg-slate-50">
        <LanguageProvider>
          <UserProvider>
            {children}
          </UserProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
