'use client';

import { useI18n } from '@/lib/i18n/LanguageContext';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'motion/react';

export default function ForbiddenPage() {
  const { language } = useI18n();
  const router = useRouter();

  const t = {
    pt: {
      title: "Acesso Negado",
      message: "Você não tem permissão para acessar esta página. Esta ação foi registrada.",
      back: "Voltar",
      home: "Ir para o Início",
      contact: "Se você acredita que isso é um erro, entre em contato com o administrador."
    },
    en: {
      title: "Access Denied",
      message: "You do not have permission to access this page. This action has been logged.",
      back: "Go Back",
      home: "Go to Home",
      contact: "If you believe this is an error, please contact the administrator."
    }
  };

  const currentT = language === 'pt' ? t.pt : t.en;

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-6 shadow-xl shadow-red-100"
      >
        <ShieldAlert size={48} strokeWidth={1.5} />
      </motion.div>
      
      <motion.h1 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tighter"
      >
        {currentT.title}
      </motion.h1>
      
      <motion.p 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-slate-500 max-w-md mb-8 font-medium"
      >
        {currentT.message}
      </motion.p>
      
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold hover:bg-slate-50 transition-all shadow-sm"
        >
          <ArrowLeft size={18} />
          {currentT.back}
        </button>
        
        <Link
          href="/dashboard"
          className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
        >
          <Home size={18} />
          {currentT.home}
        </Link>
      </motion.div>
      
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-12 text-xs text-slate-400 font-medium"
      >
        {currentT.contact}
      </motion.p>
    </div>
  );
}
