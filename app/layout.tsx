import type {Metadata} from 'next';
import './globals.css';
import { LanguageProvider } from '@/lib/i18n/LanguageContext';
import { UserProvider } from '@/lib/auth/UserContext';
import { Toaster } from 'sonner';
import ActivityTracker from '@/components/ActivityTracker';

export const metadata: Metadata = {
  title: 'SISTEMA DE GESTÃO ESCOLAR',
  description: 'Sistema completo de gerenciamento escolar',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt">
      <body suppressHydrationWarning className="antialiased min-h-screen bg-slate-50">
        <LanguageProvider>
          <UserProvider>
            {children}
            <ActivityTracker />
            <Toaster position="top-right" richColors closeButton />
          </UserProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
