'use client';

import { useEffect } from 'react';
import { BackButton } from '@/components/BackButton';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 text-slate-800">
      <h2 className="text-2xl font-bold mb-2">Algo deu errado!</h2>
      <p className="text-sm text-slate-500 mb-4">{error.message || 'Erro inesperado na aplicação.'}</p>
      <div className="flex items-center gap-3">
        <BackButton fallbackPath="/dashboard" showLabelAlways={true} className="px-4 py-2 text-sm" />
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition cursor-pointer"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
