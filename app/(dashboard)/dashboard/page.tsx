'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { useUser } from '@/lib/auth/UserContext';
import { useDashboardStats } from '@/hooks/useCachedData';
import Link from 'next/link';
import { 
  Users, 
  BookOpen, 
  GraduationCap,
  Layers as LayersIcon,
  X,
  BookMarked,
  Award,
  KeyRound,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import maleAvatar from '@/src/assets/images/avatar_male_1778977230783.png';
import femaleAvatar from '@/src/assets/images/avatar_female_1778977246051.png';

export default function DashboardPage() {
  const { t } = useI18n();
  const { profile } = useUser();
  const { dashboardData, loading } = useDashboardStats();
  const { stats, alunosExterior } = dashboardData;
  const [expandedPhoto, setExpandedPhoto] = useState<{url: string, name: string} | null>(null);

  const statCards = [
    { 
      name: t.dashboard.studentsAbroad, 
      value: stats.alunosExterior, 
      icon: GraduationCap, 
      color: 'bg-purple-600',
      shouldShow: stats.alunosExterior > 0
    },
    { 
      name: t.dashboard.turmasExpedito, 
      value: stats.turmasExpedito, 
      icon: BookOpen, 
      color: 'bg-amber-500',
      shouldShow: stats.studentsExpedito > 0
    },
    { 
      name: t.dashboard.turmasCarreira, 
      value: stats.turmasCarreira, 
      icon: BookMarked, 
      color: 'bg-emerald-600',
      shouldShow: stats.studentsCarreira > 0
    },
    { 
      name: t.dashboard.turmasEspeciais, 
      value: stats.turmasEspeciais, 
      icon: Award, 
      color: 'bg-blue-600',
      shouldShow: stats.studentsEspeciais > 0
    },
  ].filter(card => card.shouldShow);

  return (
    <div className="space-y-6">
      {profile && !profile.has_changed_password && (
        <motion.div
          initial={{ opacity: 0, y: -15, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="relative bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-6 shadow-md overflow-hidden"
        >
          {/* Decorative glowing background */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500 shadow-lg shadow-amber-500/20 text-white flex items-center justify-center shrink-0 border border-amber-400">
                <KeyRound size={24} className="animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white px-2 py-0.5 rounded-full">
                    Atenção
                  </span>
                  <span className="text-xs font-bold text-amber-700 font-mono">
                    Segurança da Conta
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">
                  Proteja seu acesso: Altere sua senha temporária!
                </h3>
                <p className="text-xs text-slate-600 max-w-2xl leading-relaxed font-medium">
                  Para maior segurança dos seus dados de boletins e cursos, é recomendado atualizar a sua senha de primeiro acesso. Esta redefinição autônoma poderá ser feita **somente uma vez** diretamente por você.
                </p>
              </div>
            </div>
            
            <Link 
              href="/configuracoes"
              className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold px-6 py-3 rounded-xl text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all group shrink-0"
            >
              Alterar Minha Senha
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </motion.div>
      )}

      {statCards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
      )}

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
                            <div className="w-12 h-16 rounded-lg overflow-hidden border border-slate-200 shrink-0 shadow-sm relative bg-slate-100">
                              <Image 
                                src={aluno.genero === 'feminino' ? femaleAvatar : maleAvatar} 
                                alt={aluno.nome} 
                                fill
                                className="object-cover opacity-60" 
                                referrerPolicy="no-referrer" 
                                sizes="48px"
                              />
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
                        {turmaData?.internacional ? (
                          <div className="flex flex-col items-center justify-center leading-normal">
                            <span className="text-slate-800 font-bold whitespace-nowrap">
                              {aluno.data_inicio_curso ? aluno.data_inicio_curso.split('-').reverse().join('/') : '—'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-sans uppercase font-extrabold my-0.5">a</span>
                            <span className="text-slate-800 font-bold whitespace-nowrap">
                              {aluno.data_fim_curso ? aluno.data_fim_curso.split('-').reverse().join('/') : '—'}
                            </span>
                          </div>
                        ) : (
                          <span>
                            {turmaData?.data_inicio ? new Date(turmaData.data_inicio).getFullYear() : '-'} / {turmaData?.data_fim ? new Date(turmaData.data_fim).getFullYear() : '-'}
                          </span>
                        )}
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
