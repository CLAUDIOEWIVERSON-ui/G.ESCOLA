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
    totalAlunos: 0,
    turmasAtivas: 0,
    cursosNacionaisAtivos: 0,
  });
  const [turmasAndamento, setTurmasAndamento] = useState<any[]>([]);
  const [alunosExterior, setAlunosExterior] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [
          { count: totalAlunos },
          { data: turmasData },
          { data: cursosAtivosData },
          { data: alunosData }
        ] = await Promise.all([
          supabase.from('alunos').select('*', { count: 'exact', head: true }).is('deleted_at', null),
          supabase.from('turmas')
            .select(`
              id,
              nome,
              ano_letivo,
              curso:cursos(
                id,
                nome,
                internacional
              )
            `)
            .is('deleted_at', null),
          supabase.from('cursos')
            .select('*')
            .eq('internacional', false)
            .is('deleted_at', null),
          supabase.from('alunos')
            .select(`
              id,
              nome,
              posto_graduacao,
              om,
              turma:turmas(
                nome,
                ano_letivo,
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

        // Filter students in international courses
        const filteredAlunosExterior = alunosData?.filter(a => (a.turma as any)?.curso?.internacional) || [];

        // Filter courses that have at least one turma
        const filteredCursos = cursosAtivosData?.filter(c => 
          turmasData?.some(t => {
            const course = (t as any).curso;
            return course?.id === c.id;
          })
        ) || [];

        setStats({
          totalAlunos: totalAlunos || 0,
          turmasAtivas: turmasData?.length || 0,
          cursosNacionaisAtivos: filteredCursos.length || 0,
        });
        setTurmasAndamento(turmasData || []);
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
    { name: t.dashboard.totalStudents, value: stats.totalAlunos, icon: Users, color: 'bg-indigo-600' },
    { name: t.dashboard.activeClasses, value: stats.turmasAtivas, icon: Library, color: 'bg-emerald-600' },
    { name: t.dashboard.activeNationalCourses, value: stats.cursosNacionaisAtivos, icon: BookOpen, color: 'bg-blue-600' },
    { name: t.dashboard.studentsAbroad, value: alunosExterior.length, icon: GraduationCap, color: 'bg-purple-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, i) => (
          <motion.div
            key={card.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-lg ${card.color} text-white`}>
                <card.icon size={20} />
              </div>
              <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded uppercase">
                {t.dashboard.stable}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{card.name}</p>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold text-slate-800">{card.value}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Library size={16} className="text-slate-400" />
              Turmas em Andamento
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] font-bold text-slate-400 border-b border-slate-100 uppercase tracking-wider">
                  <th className="px-6 py-4">{t.classes.name}</th>
                  <th className="px-6 py-4">{t.nav.courses}</th>
                  <th className="px-6 py-4 text-center">{t.classes.year}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {turmasAndamento.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-slate-400 italic">
                      {t.common.noneFound}
                    </td>
                  </tr>
                ) : (
                  turmasAndamento.slice(0, 5).map((turma) => (
                    <tr key={turma.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">{turma.nome}</td>
                      <td className="px-6 py-4 text-slate-600">{(turma.curso as any)?.nome || '-'}</td>
                      <td className="px-6 py-4 text-center text-slate-500 font-mono text-xs">{turma.ano_letivo}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
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
                  <th className="px-6 py-4">{t.students.name}</th>
                  <th className="px-6 py-4">Curso / Local</th>
                  <th className="px-6 py-4 text-center">Início / Fim</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {alunosExterior.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-slate-400 italic">
                      {t.common.noInternationalStudents}
                    </td>
                  </tr>
                ) : (
                  alunosExterior.slice(0, 5).map((aluno) => {
                    const curso = (aluno.turma as any)?.curso;
                    return (
                      <tr key={aluno.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800">
                            {aluno.posto_graduacao ? `${aluno.posto_graduacao} ` : ''}{aluno.nome}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono uppercase">
                            {aluno.om || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-slate-600">{curso?.nome || '-'}</div>
                          <div className="text-[10px] text-slate-400 uppercase font-bold">{curso?.localizacao || '-'}</div>
                        </td>
                        <td className="px-6 py-4 text-center text-slate-500 font-mono text-xs">
                          {curso?.data_inicio ? new Date(curso.data_inicio).getFullYear() : '-'} / {curso?.data_fim ? new Date(curso.data_fim).getFullYear() : '-'}
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
