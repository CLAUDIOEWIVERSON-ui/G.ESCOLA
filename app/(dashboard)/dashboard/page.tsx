'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { 
  Users, 
  BookOpen, 
  GraduationCap,
  Layers,
  X,
  RefreshCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';

export default function DashboardPage() {
  const { t } = useI18n();
  const [stats, setStats] = useState({
    turmasInternacionais: 0,
    alunosExterior: 0,
  });
  const [alunosExterior, setAlunosExterior] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedPhoto, setExpandedPhoto] = useState<{url: string, name: string} | null>(null);

  const fetchDashboardData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    
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
              id,
              nome,
              ano,
              data_inicio,
              data_fim,
              internacional,
              localizacao,
              deleted_at,
              curso:cursos(
                id,
                nome
              )
            )
          `)
          .eq('turma.internacional', true)
          .is('deleted_at', null)
          .is('turma.deleted_at', null)
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
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDashboardData(false);
  }, [fetchDashboardData]);

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
          <button 
            onClick={() => fetchDashboardData(true)}
            disabled={loading || refreshing}
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-50"
            title={t.common.refresh}
          >
            <RefreshCcw size={16} className={refreshing ? "animate-spin" : ""} />
          </button>
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
                                <Layers size={14} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
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
                        <div className="text-slate-700 font-medium leading-tight">{curso?.nome || '-'}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0 rounded font-black uppercase tracking-tighter border border-blue-100">
                            {turmaData?.nome || '-'}
                          </span>
                          <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                            <Layers size={10} className="text-slate-300" />
                            {turmaData?.localizacao || '-'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center">
                          <div className="text-[9px] text-blue-500 font-black uppercase tracking-widest mb-1">
                            ANO {turmaData?.ano || '-'}
                          </div>
                          <div className="text-slate-600 font-mono text-[11px] font-bold">
                            {turmaData?.data_inicio ? turmaData.data_inicio.split('-').reverse().join('/') : '-'}
                          </div>
                          <div className="w-px h-2 bg-slate-200 my-0.5" />
                          <div className="text-slate-400 font-mono text-[11px]">
                            {turmaData?.data_fim ? turmaData.data_fim.split('-').reverse().join('/') : '-'}
                          </div>
                        </div>
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm"
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
                className="absolute -top-12 right-0 p-2 text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                onClick={() => setExpandedPhoto(null)}
              >
                <X size={24} />
              </button>
              
              <div className="bg-white p-2 rounded-2xl shadow-2xl relative">
                <div className="relative w-[90vw] h-[80vh] sm:w-[500px] sm:h-[667px] rounded-xl overflow-hidden shadow-inner bg-slate-50">
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
