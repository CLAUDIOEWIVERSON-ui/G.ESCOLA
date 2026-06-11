'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Core critical error layout:', error);
  }, [error]);

  return (
    <html lang="pt">
      <body className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800 p-4 text-center">
        <h1 className="text-6xl font-black text-red-650 mb-4 font-sans">Erro Crítico</h1>
        <h2 className="text-2xl font-bold mb-2">Algo deu errado</h2>
        <p className="text-slate-500 mb-6 max-w-md text-sm">
          {error.message || 'Ocorreu um erro crítico de inicialização no sistema.'}
        </p>
        <button
          onClick={() => reset()}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-150 hover:bg-blue-700 transition-all text-sm uppercase tracking-widest cursor-pointer"
        >
          Recarregar
        </button>
      </body>
    </html>
  );
}
