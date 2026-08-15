import type {Metadata} from 'next';
import './globals.css';
import { LanguageProvider } from '@/lib/i18n/LanguageContext';
import { UserProvider } from '@/lib/auth/UserContext';
import { ThemeProvider } from '@/lib/theme/ThemeContext';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'SISTEMA DE GESTÃO ESCOLAR',
  description: 'Sistema completo de gerenciamento escolar',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('school_theme_mode');
                var isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                if (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                  isDark = true;
                }
                if (isDark) {
                  document.documentElement.classList.add('dark');
                  document.documentElement.setAttribute('data-theme', 'dark');
                  document.documentElement.style.colorScheme = 'dark';
                } else {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.setAttribute('data-theme', 'light');
                  document.documentElement.style.colorScheme = 'light';
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning className="antialiased min-h-screen bg-slate-50 text-slate-900 print:bg-white print:text-black">
        <ThemeProvider>
          <LanguageProvider>
            <UserProvider>
              {children}
              <Toaster position="top-right" richColors closeButton />
            </UserProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
