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
    cursosInternacionais: 0,
    cursosNacionais: 0,
    media: 0
  });
  const [alunosExterior, setAlunosExterior] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [
          { count: totalAlunos },
          { data: cursosInternacionais },
          { data: cursosNacionais },
          { data: notas },
          { data: listAlunosExterior }
        ] = await Promise.all([
          supabase.from('alunos').select('*', { count: 'exact', head: true }).is('deleted_at', null),
          supabase.from('cursos').select('id', { count: 'exact' }).eq('internacional', true).is('deleted_at', null),
          supabase.from('cursos').select('id', { count: 'exact' }).eq('internacional', false).is('deleted_at', null),
          supabase.from('notas').select('nota_final'),
          supabase.from('alunos')
            .select(`
              id,
              nome,
              turma:turmas(
                nome,
                curso:cursos(
                  nome,
                  internacional,
                  localizacao,
                  data_inicio,
                  data_fim
                )
              )
            `)
            .is('deleted_at', null)
        ]);

        const avg = notas?.length ? notas.reduce((acc, n) => acc + (n.nota_final || 0), 0) / notas.length : 0;
        
        // Filter students that are actually in international courses
        const filteredAlunosExterior = listAlunosExterior?.filter(a => (a.turma as any)?.curso?.internacional) || [];

        setStats({
          alunos: totalAlunos || 0,
          cursosInternacionais: cursosInternacionais?.length || 0,
          cursosNacionais: cursosNacionais?.length || 0,
          media: avg
        });
        setAlunosExterior(filteredAlunosExterior);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const statCards = [
    { name: t.dashboard.totalStudents, value: stats.alunos, icon: Users, color: 'bg-blue-500' },
    { name: t.dashboard.internationalCourses, value: stats.cursosInternacionais, icon: BookOpen, color: 'bg-purple-600' },
    { name: t.dashboard.nationalCourses, value: stats.cursosNacionais, icon: Library, color: 'bg-emerald-600' },
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
                    {t.dashboard.stable}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Users size={16} className="text-slate-400" />
              {t.dashboard.studentsAbroad}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] font-bold text-slate-400 border-b border-slate-100 uppercase tracking-wider">
                  <th className="px-6 py-4">{t.reportCard.student}</th>
                  <th className="px-6 py-4">{t.nav.courses}</th>
                  <th className="px-6 py-4 text-center">{t.dashboard.location}</th>
                  <th className="px-6 py-4 text-center">{t.dashboard.courseStart}</th>
                  <th className="px-6 py-4 text-center">{t.dashboard.courseEnd}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                  {alunosExterior.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400 italic text-sm">
                      {t.common.noInternationalStudents}
                    </td>
                  </tr>
                ) : (
                  alunosExterior.map((aluno) => {
                    const curso = (aluno.turma as any)?.curso;
                    return (
                      <tr key={aluno.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-slate-800">{aluno.nome}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-600 font-medium">{curso?.nome}</div>
                          <div className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">{(aluno.turma as any)?.nome}</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                            {curso?.localizacao || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-xs text-slate-500 font-mono">
                          {curso?.data_inicio ? new Date(curso.data_inicio).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 text-center text-xs text-slate-500 font-mono">
                          {curso?.data_fim ? new Date(curso.data_fim).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
