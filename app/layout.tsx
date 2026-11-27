import type { Metadata, Viewport } from 'next';
import { EB_Garamond, Cinzel, Lora, Great_Vibes } from 'next/font/google';
import './globals.css';
import { LanguageProvider } from '@/lib/i18n/LanguageContext';
import { UserProvider } from '@/lib/auth/UserContext';
import { Toaster } from 'sonner';
import { RouteHistoryTracker } from '@/components/BackButton';
import { CalculatorProvider } from '@/lib/calculator/CalculatorContext';
import { FloatingCalculator } from '@/components/FloatingCalculator';

const ebGaramond = EB_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  style: ['normal', 'italic'],
  variable: '--font-garamond',
  display: 'swap',
});

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-cinzel',
  display: 'swap',
});

const lora = Lora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-lora',
  display: 'swap',
});

const greatVibes = Great_Vibes({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-script',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SISTEMA DE GESTÃO ESCOLAR',
  description: 'Sistema completo de gerenciamento escolar',
};

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#ffffff',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html
      lang="pt"
      suppressHydrationWarning
      className={`${ebGaramond.variable} ${cinzel.variable} ${lora.variable} ${greatVibes.variable}`}
    >
      <head>
        <meta name="color-scheme" content="light only" />
        <meta name="supported-color-schemes" content="light" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                localStorage.removeItem('school_theme_mode');
                localStorage.removeItem('school_card_color_settings');
                document.documentElement.classList.remove('dark');
                document.documentElement.setAttribute('data-theme', 'light');
                document.documentElement.style.colorScheme = 'light';
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning className="antialiased min-h-screen bg-slate-50 text-slate-900 print:bg-white print:text-black">
        <LanguageProvider>
          <UserProvider>
            <CalculatorProvider>
              <RouteHistoryTracker />
              {children}
              <FloatingCalculator />
              <Toaster position="top-right" richColors closeButton />
            </CalculatorProvider>
          </UserProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
