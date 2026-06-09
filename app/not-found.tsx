'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { FileQuestion, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div id="not-found-container" className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <motion.div 
        id="not-found-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center"
      >
        <div id="not-found-icon-wrapper" className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6">
          <FileQuestion id="not-found-icon" className="w-8 h-8 text-blue-600" />
        </div>
        
        <h1 id="not-found-title" className="text-4xl font-bold text-slate-800 tracking-tight mb-2">404</h1>
        <h2 id="not-found-subtitle" className="text-xl font-semibold text-slate-700 mb-4">Página Não Encontrada</h2>
        
        <p id="not-found-text" className="text-slate-500 mb-8 leading-relaxed">
          O link de acesso fornecido ou a página que você está tentando acessar pode ter sido movida, excluída ou não existe.
        </p>

        <div id="not-found-actions" className="flex flex-col space-y-3">
          <Link 
            id="not-found-btn-home"
            href="/"
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition duration-200"
          >
            <Home className="w-5 h-5" />
            Voltar para o Início
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
