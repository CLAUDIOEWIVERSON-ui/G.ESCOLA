'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('System error boundary caught:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800 p-4 text-center">
      <h1 className="text-6xl font-black text-red-650 mb-4 font-sans">Erro</h1>
      <h2 className="text-2xl font-bold mb-2">Ocorreu um erro no sistema</h2>
      <p className="text-slate-500 mb-6 max-w-md text-sm">
        {error.message || 'Desculpe, ocorreu um erro inesperado. Nossa equipe técnica já foi notificada.'}
      </p>
      <div className="flex gap-4 justify-center">
        <button
          onClick={() => reset()}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-150 hover:bg-blue-700 transition-all text-sm uppercase tracking-widest cursor-pointer"
        >
          Tentar novamente
        </button>
        <a
          href="/dashboard"
          className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-all text-sm uppercase tracking-widest"
        >
          Ir para o início
        </a>
      </div>
    </div>
  );
}
