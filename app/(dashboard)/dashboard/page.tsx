'use client';

import { useState, useEffect, useRef } from 'react';
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
  Loader2,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { toast } from 'sonner';
import maleAvatar from '@/src/assets/images/avatar_male_1778977230783.png';
import femaleAvatar from '@/src/assets/images/avatar_female_1778977246051.png';
import militaryMaleAvatar from '@/src/assets/images/avatar_military_male_1779964887322.png';
import militaryFemaleAvatar from '@/src/assets/images/avatar_military_female_1779964903107.png';

export default function DashboardPage() {
  const { t, language } = useI18n();
  const { profile } = useUser();
  const { dashboardData, loading } = useDashboardStats();
  
  const { 
    stats = {
      alunosExterior: 0,
      turmasExpedito: 0,
      turmasCarreira: 0,
      turmasEspeciais: 0,
    }, 
    alunosExterior = [],
    turmasExpeditoList = [],
    turmasCarreiraList = [],
    turmasEspeciaisList = []
  } = dashboardData || {};

  const [selectedCard, setSelectedCard] = useState<string>('exterior');
  const [expandedPhoto, setExpandedPhoto] = useState<{url: string, name: string} | null>(null);
  const detailsRef = useRef<HTMLDivElement>(null);

  const handleCardClick = (cardId: string) => {
    setSelectedCard(cardId);
    setTimeout(() => {
      detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // States for Thought of the Day
  const [pensamento, setPensamento] = useState<{ texto: string; autor: string; id?: string; isDemo?: boolean } | null>(null);
  const [loadingPensamento, setLoadingPensamento] = useState(true);
  const [isEditingPensamento, setIsEditingPensamento] = useState(false);
  const [editTexto, setEditTexto] = useState('');
  const [editAutor, setEditAutor] = useState('');
  const [savingPensamento, setSavingPensamento] = useState(false);
  const [regeneratingPensamento, setRegeneratingPensamento] = useState(false);
  const [categorySelectorOpen, setCategorySelectorOpen] = useState(false);
  const [selectedIaCategory, setSelectedIaCategory] = useState('');
  const [generatingModalPensamento, setGeneratingModalPensamento] = useState(false);

  // Fetch Thought
  const fetchPensamento = async (forceRegenerate = false, category = '') => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Check localStorage first for instant display
    if (typeof window !== 'undefined' && !forceRegenerate) {
      try {
        const cached = localStorage.getItem(`pensamento_dia_custom_${todayStr}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          setPensamento(parsed);
          setEditTexto(parsed.texto);
          setEditAutor(parsed.autor);
          setLoadingPensamento(false);
        }
      } catch (e) {
        console.warn('Error reading from localStorage:', e);
      }
    }

    try {
      if (forceRegenerate) {
        setRegeneratingPensamento(true);
      } else if (!pensamento) {
        setLoadingPensamento(true);
      }
      let url = `/api/v1/pensamento-dia${forceRegenerate ? '?force=true' : ''}`;
      if (forceRegenerate && category) {
        url += `&category=${category}`;
      }
      const res = await fetch(url);
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const json = await res.json();
        if (json.success && json.data) {
          setPensamento(json.data);
          setEditTexto(json.data.texto);
          setEditAutor(json.data.autor);
          
          if (typeof window !== 'undefined') {
            localStorage.setItem(`pensamento_dia_custom_${todayStr}`, JSON.stringify(json.data));
          }

          if (forceRegenerate) {
            toast.success('Pensamento renovado com IA com sucesso!');
          }
        } else {
          toast.error('Não foi possível obter o pensamento do dia.');
        }
      } else {
        toast.error('O servidor retornou uma resposta inválida. Tente novamente mais tarde.');
      }
    } catch (err) {
      console.error('Error fetching thought:', err);
      if (typeof window !== 'undefined' && !localStorage.getItem(`pensamento_dia_custom_${todayStr}`)) {
        toast.error('Erro de conexão ao carregar pensamento do dia.');
      }
    } finally {
      setLoadingPensamento(false);
      setRegeneratingPensamento(false);
    }
  };

  const gerarPensamentoComIa = async () => {
    try {
      setGeneratingModalPensamento(true);
      const res = await fetch(`/api/v1/pensamento-dia?force=true&category=${selectedIaCategory}`);
      const json = await res.json();
      if (json.success && json.data) {
        setEditTexto(json.data.texto);
        setEditAutor(json.data.autor);
        toast.success('Sugestão gerada com sucesso! Você pode editar ou salvar.');
      } else {
        toast.error('Não foi possível gerar sugestão da IA.');
      }
    } catch (err) {
      console.error('Error generating thought suggestion:', err);
      toast.error('Erro ao conectar com a IA.');
    } finally {
      setGeneratingModalPensamento(false);
    }
  };

  // Save/Edit Custom Thought
  const salvarPensamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTexto.trim() || !editAutor.trim()) {
      toast.error('Todos os campos são obrigatórios.');
      return;
    }
    const todayStr = new Date().toISOString().split('T')[0];
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
        
        if (typeof window !== 'undefined') {
          localStorage.setItem(`pensamento_dia_custom_${todayStr}`, JSON.stringify(json.data));
        }

        if (json.warning) {
          toast.success('Salvo! Atualizado temporariamente para este dispositivo.');
        } else {
          toast.success('Pensamento do dia atualizado para hoje!');
        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statCards = [
    { 
      id: 'exterior',
      name: t.dashboard.studentsAbroad, 
      value: stats.alunosExterior, 
      icon: GraduationCap, 
      color: 'bg-purple-600',
      shouldShow: true
    },
    { 
      id: 'expedito',
      name: t.dashboard.turmasExpedito, 
      value: stats.turmasExpedito, 
      icon: BookOpen, 
      color: 'bg-amber-500',
      shouldShow: true
    },
    { 
      id: 'carreira',
      name: t.dashboard.turmasCarreira, 
      value: stats.turmasCarreira, 
      icon: BookMarked, 
      color: 'bg-emerald-600',
      shouldShow: true
    },
    { 
      id: 'especial',
      name: t.dashboard.turmasEspeciais, 
      value: stats.turmasEspeciais, 
      icon: Award, 
      color: 'bg-blue-600',
      shouldShow: true
    },
  ];

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

      {/* PENSAMENTO DO DIA (SUBLIME & DISCRETO) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-slate-50/70 border border-slate-200/50 rounded-xl text-slate-600 text-xs"
      >
        <div className="flex items-start md:items-center gap-2.5 flex-1 min-w-0">
          <Quote size={12} className="text-indigo-500/70 shrink-0 mt-0.5 md:mt-0" />
          <div className="flex-1 min-w-0 leading-relaxed text-slate-600 font-sans">
            {loadingPensamento ? (
              <span className="animate-pulse bg-slate-200 h-3 w-48 inline-block rounded" />
            ) : pensamento ? (
              <span className="text-xs">
                <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider mr-2 select-none">
                  Semente Diária:
                </span>
                <span className="font-serif italic text-slate-700 font-medium leading-normal">
                  &ldquo;{pensamento.texto}&rdquo;
                </span>
                <span className="text-[11px] text-slate-500 font-medium ml-1.5 not-italic select-all">— {pensamento.autor}</span>
                {pensamento?.isDemo && profile?.role === 'admin' && (
                  <span className="text-[9px] text-amber-600 font-bold ml-2 inline-flex items-center gap-0.5 bg-amber-50 px-1 py-0.2 rounded border border-amber-200/40" title="Tabela pensamento_dia ausente. O pensamento de hoje expirará. Vá em Configurações e execute a migração 31_create_pensamento_dia.sql.">
                    ⚠️ Demo
                  </span>
                )}
              </span>
            ) : (
              <span className="italic text-slate-400 text-xs">Uma nova reflexão está sendo colhida...</span>
            )}
          </div>
        </div>

        {/* Controls for Admin Roles */}
        {profile?.role === 'admin' && (
          <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center relative">
            <button
              type="button"
              onClick={() => {
                setSelectedIaCategory('');
                setIsEditingPensamento(true);
              }}
              className="flex items-center gap-1 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 text-[10px] font-bold px-2.5 py-1 rounded-md transition-all border border-slate-200/60 shadow-none active:scale-95"
            >
              <Pencil size={10} className="text-slate-400" />
              Editar
            </button>

            <div className="relative">
              <button
                type="button"
                disabled={regeneratingPensamento}
                onClick={() => setCategorySelectorOpen(!categorySelectorOpen)}
                className="flex items-center gap-1 bg-indigo-50/40 hover:bg-indigo-50 text-indigo-600 hover:text-indigo-800 text-[10px] font-bold px-2.5 py-1 rounded-md transition-all border border-indigo-100/40 shadow-none active:scale-95 disabled:opacity-50"
              >
                {regeneratingPensamento ? (
                  <Loader2 size={10} className="animate-spin text-indigo-400" />
                ) : (
                  <Sparkles size={10} className="text-indigo-400" />
                )}
                Renovar com IA
                <ChevronDown size={8} className="text-indigo-400 ml-0.5" />
              </button>

              {categorySelectorOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setCategorySelectorOpen(false)} />
                  <div className="absolute right-0 bottom-full mb-1.5 z-50 w-56 bg-white border border-slate-200 rounded-lg shadow-xl py-1 flex flex-col text-[10px] text-slate-700 font-sans max-h-60 overflow-y-auto">
                    <div className="px-2.5 py-1 text-[8px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-100 mb-1 sticky top-0 bg-white">
                      Escolher Categoria IA
                    </div>
                    {[
                      { id: '', label: '🎲 Padrão / Geral' },
                      { id: 'religioso', label: '⛪ Religioso / Fé' },
                      { id: 'motivacional', label: '💪 Motivacional' },
                      { id: 'filosofico', label: '📜 Filosófico' },
                      { id: 'estoico', label: '🏛️ Estoico / Resiliência' },
                      { id: 'lideranca', label: '👔 Liderança / Carreira' },
                      { id: 'oriental', label: '🌸 Oriental / Zen' },
                      { id: 'criatividade', label: '💡 Criatividade' },
                      { id: 'gratidao', label: '🤝 Gratidão' },
                      { id: 'otimismo', label: '🌅 Otimismo / Esperança' },
                      { id: 'educacao', label: '📚 Educação / Sabedoria' }
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setCategorySelectorOpen(false);
                          fetchPensamento(true, cat.id);
                        }}
                        className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 flex items-center gap-1.5 font-semibold text-slate-600 transition-colors"
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
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

                {/* AI Recommendation Generator Panel */}
                <div className="p-3 bg-indigo-50/30 border border-indigo-100/35 rounded-xl space-y-2">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-950">
                    <Sparkles size={11} className="text-indigo-600" />
                    Gerador de Sugestão de IA
                  </div>
                  <p className="text-[10px] text-slate-550 select-none font-medium leading-relaxed">
                    Prefere uma inspiração elaborada por IA? Selecione uma categoria e clique para preencher o formulário:
                  </p>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                    {[
                      { id: '', label: '🎲 Geral' },
                      { id: 'religioso', label: '⛪ Religioso' },
                      { id: 'motivacional', label: '💪 Motivação' },
                      { id: 'filosofico', label: '📜 Filosofia' },
                      { id: 'estoico', label: '🏛️ Estoico' },
                      { id: 'lideranca', label: '👔 Liderança' },
                      { id: 'oriental', label: '🌸 Oriental' },
                      { id: 'criatividade', label: '💡 Criatividade' },
                      { id: 'gratidao', label: '🤝 Gratidão' },
                      { id: 'otimismo', label: '🌅 Otimismo' },
                      { id: 'educacao', label: '📚 Educação' }
                    ].map((cat: any) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedIaCategory(cat.id)}
                        className={`text-[9px] font-bold px-2 py-1 rounded-md border transition-all ${
                          selectedIaCategory === cat.id
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={generatingModalPensamento}
                    onClick={gerarPensamentoComIa}
                    className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-55 text-white font-bold text-[9px] rounded-lg transition-all shadow-sm flex items-center justify-center gap-1 border-0"
                  >
                    {generatingModalPensamento ? (
                      <Loader2 size={10} className="animate-spin text-white" />
                    ) : (
                      <Sparkles size={10} className="text-white" />
                    )}
                    Gerar Pensamento Sugerido
                  </button>
                </div>

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
          {statCards.map((card: any, i: number) => {
            const isSelected = selectedCard === card.id;
            return (
              <motion.div
                key={card.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => handleCardClick(card.id)}
                className={`p-6 rounded-xl border transition-all cursor-pointer relative overflow-hidden active:scale-[0.98] ${
                  isSelected 
                    ? 'bg-white border-slate-900 shadow-md ring-2 ring-slate-950/5' 
                    : 'bg-white border-slate-200 hover:border-slate-400 shadow-sm'
                }`}
              >
                {/* Visual selected accent pill/glow */}
                {isSelected && (
                  <div className={`absolute top-0 left-0 right-0 h-1.5 ${card.color}`} />
                )}
                
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-lg ${card.color} text-white shadow-sm`}>
                    <card.icon size={20} />
                  </div>
                  {isSelected ? (
                    <span className="text-[9px] font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider">
                      {language === 'pt' ? 'Visualizando' : 'Viewing'}
                    </span>
                  ) : (
                    <span className="text-[9px] font-extrabold text-slate-400 bg-slate-55 px-2 py-0.5 rounded uppercase tracking-wider">
                      {t.dashboard?.stable || 'Estável'}
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{card.name}</p>
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-black text-slate-800 tracking-tight">{card.value}</span>
                  <span className="text-[10px] text-indigo-600 font-bold flex items-center gap-0.5 group">
                    {language === 'pt' ? 'Detalhar' : 'Details'} 
                    <ArrowRight size={10} className="text-indigo-500 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <div ref={detailsRef} className="scroll-mt-24" />

      <AnimatePresence mode="wait">
        {selectedCard === 'exterior' && (
          <motion.div
            key="exterior"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden"
          >
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Users size={16} className="text-slate-400" />
                {t.dashboard.studentsAbroad}
              </h3>
              <span className="text-xs text-slate-550 font-bold bg-slate-100 px-3 py-1 rounded-full border border-slate-200/50">
                {alunosExterior.length} {language === 'pt' ? 'Alunos' : 'Students'}
              </span>
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
                    alunosExterior.slice(0, 15).map((aluno: any) => {
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
                                    src={
                                      aluno.tipo_aluno === 'civil'
                                        ? (aluno.genero === 'feminino' ? femaleAvatar : maleAvatar)
                                        : (aluno.genero === 'feminino' ? militaryFemaleAvatar : militaryMaleAvatar)
                                    } 
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
          </motion.div>
        )}

        {selectedCard === 'expedito' && (
          <motion.div
            key="expedito"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
          >
            <TurmasListTable 
              turmas={turmasExpeditoList} 
              title={t.dashboard.turmasExpedito} 
            />
          </motion.div>
        )}

        {selectedCard === 'carreira' && (
          <motion.div
            key="carreira"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
          >
            <TurmasListTable 
              turmas={turmasCarreiraList} 
              title={t.dashboard.turmasCarreira} 
            />
          </motion.div>
        )}

        {selectedCard === 'especial' && (
          <motion.div
            key="especial"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
          >
            <TurmasListTable 
              turmas={turmasEspeciaisList} 
              title={t.dashboard.turmasEspeciais} 
            />
          </motion.div>
        )}
      </AnimatePresence>

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

function TurmasListTable({ turmas, title }: { turmas: any[], title: string }) {
  const { t, language } = useI18n();
  const isPt = language === 'pt';
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <BookOpen size={16} className="text-slate-400" />
          {title}
        </h3>
        <span className="text-xs text-slate-550 font-bold bg-slate-100 px-3 py-1 rounded-full border border-slate-200/50">
          {turmas.length} {isPt ? 'Ativas' : 'Active'}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-[10px] font-bold text-slate-400 border-b border-slate-100 uppercase tracking-wider">
              <th className="px-6 py-4">{isPt ? 'Identificador da Turma' : 'Class Identifier'}</th>
              <th className="px-6 py-4">{isPt ? 'Curso Recomendado / Categoria' : 'Course Name / Category'}</th>
              <th className="px-6 py-4">{isPt ? 'Localização / Período' : 'Location / Period'}</th>
              <th className="px-6 py-4 text-center">{isPt ? 'Capacidade' : 'Capacity'}</th>
              <th className="px-6 py-4">{isPt ? 'Instrutor Responsável' : 'Responsible Instructor'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-sm">
            {turmas.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-slate-400 italic font-medium">
                  {isPt ? 'Nenhuma turma ativa encontrada para esta categoria.' : 'No active classes found for this category.'}
                </td>
              </tr>
            ) : (
              turmas.map((turma) => (
                <tr key={turma.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800">{turma.nome}</div>
                    <div className="text-[10px] text-slate-400 font-mono uppercase">
                      ANO: {turma.ano || '-'} {turma.grupo_responsavel ? `• GRUPO: ${turma.grupo_responsavel}` : ''}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-700 font-semibold">{turma.curso?.nome || '-'}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-black tracking-wider">
                      {turma.curso?.categoria || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-600 font-medium">{turma.localizacao || '-'}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">
                      {turma.periodo || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-block px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 rounded-lg">
                      {turma.capacidade_max || 40} {isPt ? 'vagas' : 'seats'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-650 font-medium">{turma.instrutor || '-'}</div>
                    <div className="text-[10px] text-green-600 font-bold uppercase flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      Class {turma.status || 'ativa'}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
