'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { 
  Users, 
  BookOpen, 
  MoreVertical,
  Plus,
  Filter,
  CheckCircle2,
  XCircle,
  Mail,
  Hash
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export default function AlunosPage() {
  const { t } = useI18n();
  const [alunos, setAlunos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlunos = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('alunos')
        .select(`
          *,
          turma:turmas(nome, curso:cursos(nome))
        `)
        .is('deleted_at', null);
      if (data) setAlunos(data);
      setLoading(false);
    };
    fetchAlunos();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.students.title}</h1>
          <p className="text-slate-500 text-sm italic">{t.students.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm">
            <Filter size={16} />
            Filters
          </button>
          <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm shadow-blue-100">
            <Plus size={18} />
            {t.students.add}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 flex justify-center">
             <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600"></div>
          </div>
        ) : alunos.map((aluno, i) => (
          <motion.div
            key={aluno.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                <Users size={20} />
              </div>
              <button className="p-1 hover:bg-slate-50 rounded text-slate-400">
                <MoreVertical size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-slate-800 text-base mb-1 truncate">{aluno.nome}</h3>
                <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                  <Mail size={12} />
                  <span className="truncate">{aluno.email}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-50">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t.students.registration}</p>
                  <p className="text-sm font-bold text-slate-700 flex items-center gap-1">
                    <span className="text-slate-300">#</span>{aluno.matricula}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t.students.status}</p>
                  <span className={cn(
                    "px-2 py-0.5 text-[10px] font-bold uppercase rounded ring-1 ring-inset",
                    aluno.status === 'ativo' 
                      ? "bg-green-100 text-green-700 ring-green-600/20" 
                      : "bg-amber-100 text-amber-700 ring-amber-600/20"
                  )}>
                    {aluno.status}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-500 uppercase">
                    {aluno.turma?.nome || 'N/A'}
                  </span>
                </div>
                <button className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">
                  {t.nav.grades} →
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
