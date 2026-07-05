'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800 p-4 text-center">
      <h1 className="text-6xl font-black text-blue-600 mb-4 font-sans">404</h1>
      <h2 className="text-2xl font-bold mb-2">Página Não Encontrada</h2>
      <p className="text-slate-500 mb-6 max-w-md text-sm">
        A página que você está procurando não existe ou foi movida.
      </p>
      <Link 
        href="/dashboard"
        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all text-sm uppercase tracking-widest"
      >
        Voltar ao início
      </Link>
    </div>
  );
}
