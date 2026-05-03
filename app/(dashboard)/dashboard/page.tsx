'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { 
  Users, 
  BookOpen, 
  Library, 
  TrendingUp, 
  Clock,
  ArrowUpRight,
  GraduationCap
} from 'lucide-react';
import { motion } from 'motion/react';

export default function DashboardPage() {
  const { t } = useI18n();
  const [stats, setStats] = useState({
    alunos: 0,
    cursos: 0,
    turmas: 0,
    media: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      const [
        { count: alunos },
        { count: cursos },
        { count: turmas },
        { data: notas }
      ] = await Promise.all([
        supabase.from('alunos').select('*', { count: 'exact', head: true }),
        supabase.from('cursos').select('*', { count: 'exact', head: true }),
        supabase.from('turmas').select('*', { count: 'exact', head: true }),
        supabase.from('notas').select('nota_final')
      ]);

      const avg = notas?.length ? notas.reduce((acc, n) => acc + (n.nota_final || 0), 0) / notas.length : 0;

      setStats({
        alunos: alunos || 0,
        cursos: cursos || 0,
        turmas: turmas || 0,
        media: avg
      });
    };
    fetchStats();
  }, []);

  const statCards = [
    { name: t.dashboard.totalStudents, value: stats.alunos, icon: Users, color: 'bg-blue-500' },
    { name: t.dashboard.totalCourses, value: stats.cursos, icon: BookOpen, color: 'bg-indigo-500' },
    { name: t.dashboard.activeClasses, value: stats.turmas, icon: Library, color: 'bg-emerald-500' },
    { name: t.dashboard.avgGrades, value: stats.media.toFixed(1), icon: TrendingUp, color: 'bg-amber-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, i) => (
          <motion.div
            key={card.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"
          >
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{card.name}</p>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-slate-800">{card.value}</span>
              <div className="flex flex-col items-end">
                {card.name === t.dashboard.avgGrades ? (
                  <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1">
                    <div className="bg-blue-500 h-full" style={{ width: `${Math.min(Number(card.value) * 10, 100)}%` }}></div>
                  </div>
                ) : (
                  <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded uppercase">
                    stable
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Clock size={16} className="text-slate-400" />
              {t.dashboard.recentActivity}
            </h3>
          </div>
          <div className="divide-y divide-slate-50">
            {[1, 2, 3, 4].map((_, i) => (
              <div key={i} className="p-4 hover:bg-slate-50 transition-colors flex items-center gap-4">
                <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center text-slate-500 shrink-0">
                  <BookOpen size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">Course &quot;AI Foundations&quot; updated by admin</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">2 hours ago</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden flex flex-col h-full border border-slate-800">
           <div className="absolute -right-8 -top-8 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>
           <div className="relative z-10 flex-1">
             <GraduationCap size={40} className="mb-4 text-blue-500 opacity-80" />
             <h2 className="text-xl font-bold mb-2">{t.dashboard.schoolStatus}: Active</h2>
             <p className="text-slate-400 text-sm leading-relaxed mb-6">{t.dashboard.schoolStatusDesc}</p>
           </div>
           <div className="relative z-10 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase mb-2">
                <span>{t.dashboard.sync}</span>
                <span className="text-blue-400">98% Success</span>
              </div>
              <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full w-[98%]"></div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
