'use client';

import { useState, useEffect } from 'react';
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
  ArrowRight,
  Quote,
  Sparkles,
  Pencil,
  Check,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { toast } from 'sonner';
import maleAvatar from '@/src/assets/images/avatar_male_1778977230783.png';
import femaleAvatar from '@/src/assets/images/avatar_female_1778977246051.png';

export default function DashboardPage() {
  const { t } = useI18n();
  const { profile } = useUser();
  const { dashboardData, loading } = useDashboardStats();
  const { stats, alunosExterior } = dashboardData;
  const [expandedPhoto, setExpandedPhoto] = useState<{url: string, name: string} | null>(null);

  // States for Thought of the Day
  const [pensamento, setPensamento] = useState<{ texto: string; autor: string; id?: string; isDemo?: boolean } | null>(null);
  const [loadingPensamento, setLoadingPensamento] = useState(true);
  const [isEditingPensamento, setIsEditingPensamento] = useState(false);
  const [editTexto, setEditTexto] = useState('');
  const [editAutor, setEditAutor] = useState('');
  const [savingPensamento, setSavingPensamento] = useState(false);
  const [regeneratingPensamento, setRegeneratingPensamento] = useState(false);

  // Fetch Thought
  const fetchPensamento = async (forceRegenerate = false) => {
    try {
      if (forceRegenerate) {
        setRegeneratingPensamento(true);
      } else {
        setLoadingPensamento(true);
      }
      const res = await fetch(`/api/v1/pensamento-dia${forceRegenerate ? '?force=true' : ''}`);
      const json = await res.json();
      if (json.success && json.data) {
        setPensamento(json.data);
        setEditTexto(json.data.texto);
        setEditAutor(json.data.autor);
        if (forceRegenerate) {
          toast.success('Pensamento renovado com IA com sucesso!');
        }
      } else {
        toast.error('Não foi possível obter o pensamento do dia.');
      }
    } catch (err) {
      console.error('Error fetching thought:', err);
      toast.error('Erro de conexão ao carregar pensamento do dia.');
    } finally {
      setLoadingPensamento(false);
      setRegeneratingPensamento(false);
    }
  };

  // Save/Edit Custom Thought
  const salvarPensamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTexto.trim() || !editAutor.trim()) {
      toast.error('Todos os campos são obrigatórios.');
      return;
    }
    try {
      setSavingPensamento(true);
      const res = await fetch('/api/v1/pensamento-dia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ texto: editTexto, autor: editAutor })
      });
      const json = await res.json();
      if (json.success) {
        setPensamento(json.data);
        setIsEditingPensamento(false);
        toast.success('Pensamento do dia atualizado para hoje!');
      } else {
        toast.error(json.error || 'Erro ao salvar novo pensamento.');
      }
    } catch (err) {
      console.error('Error saving thought:', err);
      toast.error('Erro de conexão ao salvar pensamento.');
    } finally {
      setSavingPensamento(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPensamento();
  }, []);

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

      {/* PENSAMENTO DO DIA CARD */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-6 sm:p-8 shadow-xl border border-slate-700/50"
      >
        {/* Decorative ambient glowing backdrops */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -ml-16 -mb-16" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  <Quote size={16} />
                </span>
                <span className="text-xs font-black uppercase tracking-widest text-indigo-300">
                  Semente Diária • Pensamento do Dia
                </span>
              </div>
              
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-300">
                <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 uppercase">
                  🏛️ Filosofia
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 uppercase">
                  ✨ Incentivo
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 uppercase">
                  🌿 Fé
                </span>
              </div>
            </div>

            {loadingPensamento ? (
              <div className="space-y-3 py-4 animate-pulse">
                <div className="h-4 bg-slate-700 rounded w-3/4" />
                <div className="h-4 bg-slate-700 rounded w-1/2" />
                <div className="h-3 bg-slate-700 rounded w-1/4 mt-4" />
              </div>
            ) : pensamento ? (
              <div className="space-y-4 py-2">
                <blockquote className="text-lg sm:text-xl font-medium italic text-slate-100 font-serif leading-relaxed">
                  &ldquo; {pensamento.texto} &rdquo;
                </blockquote>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-0.5 bg-indigo-400 rounded-full" />
                  <cite className="not-italic text-sm font-bold text-indigo-300 font-sans">
                    {pensamento.autor}
                  </cite>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 italic">Eis que uma nova reflexão está sendo colhida...</p>
            )}

            {/* If table missing warning for admin */}
            {pensamento?.isDemo && profile?.role === 'admin' && (
              <div className="mt-2 text-xs bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-lg p-2.5 flex items-start gap-2">
                <span className="font-extrabold uppercase text-[9px] bg-amber-500 text-slate-900 px-1 py-0.5 rounded shrink-0">Aviso da Base</span>
                <div className="leading-relaxed">
                  A tabela <code className="font-mono bg-slate-900 px-1 py-0.5 text-[11px] rounded text-amber-400">pensamento_dia</code> ainda não está instalada no Supabase. O pensamento gerado de hoje é demonstrativo e expirará. Vá em <strong>Configurações</strong> e execute a migração <code className="font-mono bg-slate-900 px-1 py-0.5 text-[11px] rounded text-amber-400">31_create_pensamento_dia.sql</code> para ativar de forma permanente para todos!
                </div>
              </div>
            )}
          </div>

          {/* Controls for Admin Roles */}
          {profile?.role === 'admin' && (
            <div className="flex flex-row md:flex-col gap-2 shrink-0 self-start md:self-center">
              <button
                type="button"
                onClick={() => setIsEditingPensamento(true)}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all border border-white/10 shadow-md whitespace-nowrap"
              >
                <Pencil size={12} />
                Escrever Pensamento
              </button>

              <button
                type="button"
                disabled={regeneratingPensamento}
                onClick={() => fetchPensamento(true)}
                className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 active:scale-95 disabled:opacity-50 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-500/20 whitespace-nowrap"
              >
                {regeneratingPensamento ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Sparkles size={12} />
                )}
                Renovar com IA (Gemini)
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* EDIT MODAL */}
      <AnimatePresence>
        {isEditingPensamento && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 sm:p-8 flex flex-col border border-slate-100 text-slate-800"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="text-indigo-600" size={18} />
                  <h3 className="text-lg font-bold text-slate-950">
                    Definir Pensamento do Dia
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingPensamento(false)}
                  className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={salvarPensamento} className="space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Insira o pensamento inspirador de hoje. O pensamento será compartilhado na tela inicial (Dashboard) de todos os instrutores e alunos em tempo real.
                </p>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Pensamento / Citação
                  </label>
                  <textarea
                    rows={4}
                    value={editTexto}
                    onChange={(e) => setEditTexto(e.target.value)}
                    placeholder="Escreva a citação reflexiva religiosa, inspiradora ou filosófica..."
                    className="w-full text-sm px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 transition-colors placeholder:text-slate-400 text-slate-800 font-serif leading-relaxed"
                    maxLength={500}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Autor
                  </label>
                  <input
                    type="text"
                    value={editAutor}
                    onChange={(e) => setEditAutor(e.target.value)}
                    placeholder="Ex: Confúcio, Santo Agostinho, Provérbios 16:3..."
                    className="w-full text-sm px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 transition-colors text-slate-800 font-medium"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100 mt-4 shrink-0 bg-white">
                  <button
                    type="button"
                    onClick={() => setIsEditingPensamento(false)}
                    className="flex-1 py-3 px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-xl transition-all active:scale-95"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingPensamento}
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-slate-900 to-indigo-950 hover:from-slate-850 hover:to-indigo-900 active:scale-95 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-lg flex items-center justify-center gap-1.5 border-0"
                  >
                    {savingPensamento ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Check size={12} />
                    )}
                    Salvar para Todos
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
