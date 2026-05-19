'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { useUser } from '@/lib/auth/UserContext';
import { 
  Users, 
  BookOpen, 
  GraduationCap,
  Layers as LayersIcon,
  X,
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';

export default function DashboardPage() {
  const { t, language } = useI18n();
  const { profile, isAdmin, isInstrutor, isAluno } = useUser();
  const [stats, setStats] = useState({
    turmasInternacionais: 0,
    alunosExterior: 0,
  });
  const [alunosExterior, setAlunosExterior] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPhoto, setExpandedPhoto] = useState<{url: string, name: string} | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (isAluno) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [
          { count: turmasIntCount },
          { data: alunosExteriorData }
        ] = await Promise.all([
          supabase.from('turmas')
            .select('*', { count: 'exact', head: true })
            .eq('internacional', true)
            .is('deleted_at', null),
          supabase.from('alunos')
            .select(`
              id,
              nome,
              posto_graduacao,
              om,
              foto_url,
              turma:turmas!inner(
                nome,
                ano,
                data_inicio,
                data_fim,
                internacional,
                localizacao,
                curso:cursos(
                  nome
                )
              )
            `)
            .eq('turma.internacional', true)
            .is('deleted_at', null)
        ]);

        setStats({
          turmasInternacionais: turmasIntCount || 0,
          alunosExterior: alunosExteriorData?.length || 0,
        });
        setAlunosExterior(alunosExteriorData || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [isAluno]);

  if (isAluno) {
    const alunoT = {
      pt: {
        welcome: "Bem-vindo,",
        subtitle: "Área do Aluno • Gestão Acadêmica v4.0",
        myStats: "Minhas Informações",
        shortcuts: "Acesso Rápido",
        reportCard: "Meu Boletim",
        schedule: "Minhas Aulas",
        profile: "Meu Perfil",
        grades: "Minhas Notas",
        status: "Status da Matrícula",
        active: "Matriculado / Ativo",
        academicProgress: "Progresso Acadêmico",
        nextClass: "Próxima Aula",
        todayClass: "Aula de Hoje às 08:30h"
      },
      en: {
        welcome: "Welcome,",
        subtitle: "Student Area • Academic Management v4.0",
        myStats: "My Information",
        shortcuts: "Quick Access",
        reportCard: "My Report Card",
        schedule: "My Classes",
        profile: "My Profile",
        grades: "My Grades",
        status: "Enrollment Status",
        active: "Enrolled / Active",
        academicProgress: "Academic Progress",
        nextClass: "Next Class",
        todayClass: "Today's Class at 08:30am"
      }
    };
    const cT = language === 'pt' ? alunoT.pt : alunoT.en;

    return (
      <div className="space-y-8 max-w-5xl mx-auto">
        <header className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-slate-200 pb-8 transition-all">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">{cT.subtitle}</p>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">
              {cT.welcome} <span className="text-blue-600">{profile?.full_name?.split(' ')[0]}</span>
            </h1>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mt-4 sm:mt-0"
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100 shadow-sm shadow-emerald-50">
              <CheckCircle2 size={16} />
              <span className="text-xs font-bold uppercase tracking-wide">{cT.active}</span>
            </div>
          </motion.div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <Link href="/boletim" className="group">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-blue-400 shadow-sm hover:shadow-xl hover:shadow-blue-50 transition-all h-full flex flex-col justify-between">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform mb-4">
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 uppercase tracking-tighter text-lg">{cT.reportCard}</h3>
                  <p className="text-slate-500 text-sm font-medium mt-1">Visualize suas notas e médias.</p>
                </div>
              </div>
            </Link>

            <Link href="/horario" className="group">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-amber-400 shadow-sm hover:shadow-xl hover:shadow-amber-50 transition-all h-full flex flex-col justify-between">
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform mb-4">
                  <Calendar size={24} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 uppercase tracking-tighter text-lg">{cT.schedule}</h3>
                  <p className="text-slate-500 text-sm font-medium mt-1">Detalhe semanal de suas aulas.</p>
                </div>
              </div>
            </Link>

            <Link href="/configuracoes" className="group sm:col-span-2">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-emerald-400 shadow-sm hover:shadow-xl hover:shadow-emerald-50 transition-all flex items-center gap-6">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
                  <GraduationCap size={32} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 uppercase tracking-tighter text-xl">{cT.profile}</h3>
                  <p className="text-slate-500 text-sm font-medium mt-1">Gerencie seus dados e senha de acesso.</p>
                </div>
              </div>
            </Link>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <div className="bg-slate-950 text-white p-6 rounded-3xl shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-20 rotate-12">
                <LayoutDashboard size={120} />
              </div>
              <div className="relative z-10">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <Clock size={12} className="text-blue-500" />
                  {cT.nextClass}
                </h4>
                <p className="text-xl font-bold mb-1">{cT.todayClass}</p>
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">Auditório Principal</p>
                
                <div className="mt-8 pt-8 border-t border-white/10">
                   <div className="flex justify-between items-end mb-2">
                     <span className="text-[10px] font-bold text-slate-500 uppercase">{cT.academicProgress}</span>
                     <span className="text-xs font-black text-blue-400">75%</span>
                   </div>
                   <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                     <motion.div 
                       initial={{ width: 0 }}
                       animate={{ width: "75%" }}
                       transition={{ delay: 0.5, duration: 1 }}
                       className="h-full bg-blue-500 rounded-full"
                     />
                   </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const statCards = [
    { name: t.dashboard.activeClassesIntl, value: stats.turmasInternacionais, icon: BookOpen, color: 'bg-emerald-600' },
    { name: t.dashboard.studentsAbroad, value: stats.alunosExterior, icon: GraduationCap, color: 'bg-purple-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                <th className="px-6 py-4">{t.dashboard.courseLocation}</th>
                <th className="px-6 py-4 text-center">{t.dashboard.startEnd}</th>
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
                alunosExterior.slice(0, 15).map((aluno) => {
                  const turmaData = Array.isArray((aluno as any).turma) ? (aluno as any).turma[0] : (aluno as any).turma;
                  const curso = Array.isArray(turmaData?.curso) ? turmaData.curso[0] : turmaData?.curso;
                  return (
                    <tr key={aluno.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {aluno.foto_url ? (
                            <div 
                              className="w-12 h-16 rounded-lg overflow-hidden border border-slate-200 shrink-0 shadow-sm hover:scale-105 transition-transform cursor-pointer relative bg-slate-100 group"
                              onClick={() => setExpandedPhoto({ url: aluno.foto_url, name: aluno.nome })}
                            >
                              <Image 
                                src={aluno.foto_url} 
                                alt={aluno.nome} 
                                fill
                                className="object-cover" 
                                referrerPolicy="no-referrer" 
                                sizes="48px"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                <LayersIcon size={14} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-12 h-16 rounded-lg bg-slate-100 flex flex-col items-center justify-center text-slate-400 shrink-0 border border-slate-200">
                              <Users size={16} />
                              <span className="text-[8px] font-bold mt-0.5">3x4</span>
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-800">
                              {aluno.posto_graduacao ? `${aluno.posto_graduacao} ` : ''}{aluno.nome}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono uppercase">
                              {aluno.om || '-'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-600">{curso?.nome || '-'}</div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">{turmaData?.localizacao || '-'}</div>
                      </td>
                      <td className="px-6 py-4 text-center text-slate-500 font-mono text-xs">
                        {turmaData?.data_inicio ? new Date(turmaData.data_inicio).getFullYear() : '-'} / {turmaData?.data_fim ? new Date(turmaData.data_fim).getFullYear() : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {expandedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(15,23,42,0.9)]"
            onClick={() => setExpandedPhoto(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-full max-h-full flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="absolute -top-12 right-0 p-2 text-white bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.2)] rounded-full transition-colors"
                onClick={() => setExpandedPhoto(null)}
              >
                <X size={24} />
              </button>
              
              <div className="bg-white p-2 rounded-2xl shadow-2xl relative">
                <div className="relative w-[90vw] h-[80vh] sm:w-[500px] sm:h-[667px] rounded-xl overflow-hidden bg-slate-50 border border-slate-100">
                  <Image
                    src={expandedPhoto.url}
                    alt={expandedPhoto.name}
                    fill
                    className="object-contain"
                    referrerPolicy="no-referrer"
                    sizes="(max-width: 640px) 90vw, 500px"
                    priority
                  />
                </div>
                <div className="mt-4 text-center pb-2">
                  <h4 className="text-xl font-bold text-slate-800">{expandedPhoto.name}</h4>
                  <p className="text-slate-500 font-mono text-xs uppercase mt-1 tracking-widest border-t border-slate-100 pt-2 mx-4">Foto Identificação 3x4</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
