'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { useUser } from '@/lib/auth/UserContext';
import { useDashboardStats } from '@/hooks/useCachedData';
import { supabase } from '@/lib/supabase/client';
import { fetchWithAuth } from '@/lib/api';
import { cn } from '@/lib/utils';
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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MousePointerClick,
  Trash2,
  Printer,
  Maximize2,
  Copy,
  Sprout,
  Lightbulb
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ExchangeRateTicker from '@/components/ExchangeRateTicker';
import StudentDetailEditModal from '@/components/StudentDetailEditModal';
import Image from 'next/image';
import navalMissionLogo from '@/src/assets/images/regenerated_image_1782409801823.png';
import { toast } from 'sonner';
import maleAvatar from '@/src/assets/images/avatar_male_1778977230783.png';
import femaleAvatar from '@/src/assets/images/avatar_female_1778977246051.png';
import militaryMaleAvatar from '@/src/assets/images/avatar_military_male_1779964887322.png';
import militaryFemaleAvatar from '@/src/assets/images/avatar_military_female_1779964903107.png';

export default function DashboardPage() {
  const { t, language } = useI18n();
  const isPt = language === 'pt';
  const { profile, isAdmin } = useUser();
  const router = useRouter();
  
  const { dashboardData, loading, mutate: refreshDashboard } = useDashboardStats();
  
  const { 
    stats = {
      alunosExterior: 0,
      turmasExpedito: 0,
      turmasCarreira: 0,
      turmasEspeciais: 0,
      turmasPreInscritas: 0,
    }, 
    alunosExterior = [],
    turmasExpeditoList = [],
    turmasCarreiraList = [],
    turmasEspeciaisList = [],
    turmasPreInscritasList = [],
  } = dashboardData || {};

  const [selectedCard, setSelectedCard] = useState<string>('exterior');
  const [hasUserSelectedCard, setHasUserSelectedCard] = useState<boolean>(false);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedAlunoForEdit, setSelectedAlunoForEdit] = useState<any | null>(null);
  const [highlightedTurmaId, setHighlightedTurmaId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const cardParam = params.get('card');
      const highlightParam = params.get('highlightTurma');
      if (highlightParam) {
        setHighlightedTurmaId(highlightParam);
      }
      if (cardParam && ['exterior', 'expedito', 'carreira', 'especial', 'pre_inscritos'].includes(cardParam)) {
        setSelectedCard(cardParam);
        setHasUserSelectedCard(true);
      }
    }
  }, []);

  // Auto-select correct category if highlightTurma is provided
  useEffect(() => {
    if (highlightedTurmaId && dashboardData) {
      if (turmasExpeditoList?.some((t: any) => t.id === highlightedTurmaId)) {
        setSelectedCard('expedito');
        setHasUserSelectedCard(true);
      } else if (turmasCarreiraList?.some((t: any) => t.id === highlightedTurmaId)) {
        setSelectedCard('carreira');
        setHasUserSelectedCard(true);
      } else if (turmasEspeciaisList?.some((t: any) => t.id === highlightedTurmaId)) {
        setSelectedCard('especial');
        setHasUserSelectedCard(true);
      } else if (turmasPreInscritasList?.some((t: any) => t.id === highlightedTurmaId)) {
        setSelectedCard('pre_inscritos');
        setHasUserSelectedCard(true);
      }
    }
  }, [highlightedTurmaId, dashboardData, turmasExpeditoList, turmasCarreiraList, turmasEspeciaisList, turmasPreInscritasList]);

  useEffect(() => {
    if (dashboardData && stats) {
      const cardDataMap: Record<string, number> = {
        'exterior': stats.alunosExterior,
        'expedito': stats.turmasExpedito,
        'carreira': stats.turmasCarreira,
        'especial': stats.turmasEspeciais,
        'pre_inscritos': stats.turmasPreInscritas
      };

      if (!hasUserSelectedCard && cardDataMap[selectedCard] === 0) {
        const firstAvailable = Object.entries(cardDataMap).find(([_, value]) => value > 0);
        if (firstAvailable) {
          setSelectedCard(firstAvailable[0]);
        }
      }
    }
  }, [dashboardData, stats, selectedCard, hasUserSelectedCard]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('items_per_page_dashboard_alunos');
      if (saved) {
        setTimeout(() => {
          setItemsPerPage(Number(saved));
        }, 0);
      }
    }
  }, []);

  const totalAlunosExterior = alunosExterior.length;
  const totalPagesAlunos = Math.ceil(totalAlunosExterior / itemsPerPage);
  const startIndexAlunos = (currentPage - 1) * itemsPerPage;
  const endIndexAlunos = Math.min(startIndexAlunos + itemsPerPage, totalAlunosExterior);
  const paginatedAlunos = alunosExterior.slice(startIndexAlunos, endIndexAlunos);

  const [expandedPhoto, setExpandedPhoto] = useState<{url: string, name: string} | null>(null);
  const detailsRef = useRef<HTMLDivElement>(null);

  const handleCardClick = (cardId: string) => {
    setSelectedCard(cardId);
    setHasUserSelectedCard(true);
    setCurrentPage(1);
    setTimeout(() => {
      detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleDeleteTurma = async (id: string) => {
    if (!isAdmin) {
      toast.error(language === 'pt' ? 'Você não tem permissão para remover esta turma.' : 'You do not have permission to remove this class.');
      return;
    }
    
    const confirmDelete = window.confirm(
      language === 'pt' 
        ? 'Aviso: Deseja realmente remover esta turma? Isso a ocultará permanentemente do painel.' 
        : 'Warning: Are you sure you want to remove this class? This will permanently hide it from the dashboard.'
    );
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from('turmas')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
        
      if (error) throw error;
      toast.success(language === 'pt' ? 'Turma removida!' : 'Class removed!');
      await refreshDashboard();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // States for Thought of the Day
  const [pensamento, setPensamento] = useState<{ texto: string; autor: string; reflexao?: string; id?: string; isDemo?: boolean } | null>(null);
  const [loadingPensamento, setLoadingPensamento] = useState(true);
  const [isEditingPensamento, setIsEditingPensamento] = useState(false);
  const [isSementeModalOpen, setIsSementeModalOpen] = useState(false);
  const [copiedSemente, setCopiedSemente] = useState(false);
  const [editTexto, setEditTexto] = useState('');
  const [editAutor, setEditAutor] = useState('');
  const [editReflexao, setEditReflexao] = useState('');
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
          setEditReflexao(parsed.reflexao || '');
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
      const res = await fetchWithAuth(url);
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const json = await res.json();
        if (json.success && json.data) {
          setPensamento(json.data);
          setEditTexto(json.data.texto);
          setEditAutor(json.data.autor);
          setEditReflexao(json.data.reflexao || '');
          
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
      const res = await fetchWithAuth(`/api/v1/pensamento-dia?force=true&category=${selectedIaCategory}`);
      const json = await res.json();
      if (json.success && json.data) {
        setEditTexto(json.data.texto);
        setEditAutor(json.data.autor);
        setEditReflexao(json.data.reflexao || '');
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
      const res = await fetchWithAuth('/api/v1/pensamento-dia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ texto: editTexto, autor: editAutor, reflexao: editReflexao })
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
      shouldShow: stats.alunosExterior > 0
    },
    { 
      id: 'expedito',
      name: t.dashboard.turmasExpedito, 
      value: stats.turmasExpedito, 
      icon: BookOpen, 
      color: 'bg-amber-500',
      shouldShow: stats.turmasExpedito > 0
    },
    { 
      id: 'carreira',
      name: t.dashboard.turmasCarreira, 
      value: stats.turmasCarreira, 
      icon: BookMarked, 
      color: 'bg-emerald-600',
      shouldShow: stats.turmasCarreira > 0
    },
    { 
      id: 'especial',
      name: t.dashboard.turmasEspeciais, 
      value: stats.turmasEspeciais, 
      icon: Award, 
      color: 'bg-blue-600',
      shouldShow: stats.turmasEspeciais > 0
    },
    { 
      id: 'pre_inscritos',
      name: isPt ? 'Turmas Pré-Inscritas' : 'Pre-registered Classes', 
      value: stats.turmasPreInscritas || 0, 
      icon: Users, 
      color: 'bg-red-600',
      shouldShow: (stats.turmasPreInscritas || 0) > 0
    }
  ];

  return (
    <div className="space-y-6">
      <ExchangeRateTicker />
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

      {/* PENSAMENTO DO DIA / SEMENTE DIÁRIA (LAYOUT DEFINIDO E EXPANSÍVEL) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => setIsSementeModalOpen(true)}
        className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-gradient-to-r from-emerald-50/70 via-slate-50/90 to-amber-50/50 border border-emerald-200/70 rounded-2xl text-slate-700 shadow-sm hover:shadow-md transition-all cursor-pointer group"
      >
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          {/* Tag Header: DEFININDO QUEM É SEMENTE E QUEM É REFLEXÃO */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 border border-emerald-300/80 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
              <Sprout size={11} className="text-emerald-700" />
              Semente Diária (Citação)
            </span>
            {pensamento?.reflexao && (
              <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 border border-amber-300/80 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
                <Lightbulb size={11} className="text-amber-700" />
                Reflexão Prática
              </span>
            )}
            {pensamento?.isDemo && profile?.role === 'admin' && (
              <span className="text-[9px] text-amber-600 font-bold px-1.5 py-0.5 rounded border border-amber-200/60 bg-amber-50" title="Tabela pensamento_dia ausente. Vá em Configurações e execute a migração 31_create_pensamento_dia.sql.">
                ⚠️ Demo
              </span>
            )}
            <span className="text-[10px] text-slate-400 group-hover:text-indigo-600 font-semibold transition-colors flex items-center gap-1 ml-auto">
              Clique para expandir
              <Maximize2 size={11} />
            </span>
          </div>

          {/* Semente Diária (Quote & Author) */}
          <div className="leading-relaxed text-slate-700 font-sans">
            {loadingPensamento ? (
              <span className="animate-pulse bg-slate-200 h-4 w-64 inline-block rounded" />
            ) : pensamento ? (
              <div>
                <span className="font-serif italic text-slate-800 font-semibold text-sm sm:text-base leading-normal">
                  &ldquo;{pensamento.texto}&rdquo;
                </span>
                <span className="text-xs font-bold text-slate-500 ml-2 not-italic select-all">
                  — {pensamento.autor}
                </span>

                {/* Reflexão Diária Preview (Lesson & Application) */}
                {pensamento.reflexao && (
                  <div className="mt-2.5 pt-2 border-t border-slate-200/70 flex items-start gap-2">
                    <span className="font-bold text-[10px] text-amber-800 uppercase tracking-wider shrink-0 mt-0.5">
                      💡 Reflexão:
                    </span>
                    <span className="text-xs text-slate-600 font-sans leading-relaxed line-clamp-2">
                      {pensamento.reflexao}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <span className="italic text-slate-400 text-xs">Uma nova semente diária está sendo colhida...</span>
            )}
          </div>
        </div>

        {/* Controls Column */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-center relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsSementeModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-sm active:scale-95 shrink-0"
            title="Expandir para ler a Semente Diária e Reflexão na tela popup com fundo distorcido"
          >
            <Maximize2 size={13} />
            Ler no Popup
          </button>

          {/* Admin controls */}
          {profile?.role === 'admin' && (
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => {
                  setSelectedIaCategory('');
                  setIsEditingPensamento(true);
                }}
                className="flex items-center gap-1 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all border border-slate-200 shadow-none active:scale-95"
              >
                <Pencil size={11} className="text-slate-400" />
                Editar
              </button>

              <div className="relative">
                <button
                  type="button"
                  disabled={regeneratingPensamento}
                  onClick={() => setCategorySelectorOpen(!categorySelectorOpen)}
                  className="flex items-center gap-1 bg-indigo-50/60 hover:bg-indigo-100/70 text-indigo-700 hover:text-indigo-900 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all border border-indigo-200/60 shadow-none active:scale-95 disabled:opacity-50"
                >
                  {regeneratingPensamento ? (
                    <Loader2 size={11} className="animate-spin text-indigo-500" />
                  ) : (
                    <Sparkles size={11} className="text-indigo-500" />
                  )}
                  Renovar IA
                  <ChevronDown size={10} className="text-indigo-500 ml-0.5" />
                </button>

                {categorySelectorOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setCategorySelectorOpen(false)} />
                    <div className="absolute right-0 bottom-full mb-1.5 z-50 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-1 flex flex-col text-[10px] text-slate-700 font-sans max-h-60 overflow-y-auto">
                      <div className="px-3 py-1.5 text-[9px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-100 mb-1 sticky top-0 bg-white">
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
                          className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-1.5 font-semibold text-slate-600 transition-colors text-xs"
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
        </div>
      </motion.div>

      {/* SEMENTE DIÁRIA POPUP MODAL COM FUNDO DISTORCIDO (BACKDROP-BLUR & SATURATE) */}
      <AnimatePresence>
        {isSementeModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-xl backdrop-saturate-200 transition-all duration-300"
            onClick={() => setIsSementeModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 24 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200/80 flex flex-col max-h-[90vh] text-slate-800"
            >
              {/* Modal Gradient Header */}
              <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-indigo-950 p-6 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                    <Sprout size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                      Semente Diária & Reflexão
                    </h3>
                    <p className="text-xs text-emerald-200/80 font-medium">
                      Meditação, inspiração e aplicação prática para a sua jornada
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSementeModalOpen(false)}
                  className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                  title="Fechar popup"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body with well-defined Semente vs. Reflexão cards */}
              <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1">
                {/* BOX 1: SEMENTE DIÁRIA (A Citação) */}
                <div className="bg-gradient-to-br from-emerald-50/90 to-teal-50/60 border-2 border-emerald-300/80 rounded-2xl p-6 sm:p-7 shadow-sm relative">
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-1.5 bg-emerald-600 text-white text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                      <Sprout size={12} />
                      1. Semente Diária (Citação)
                    </span>
                  </div>
                  <blockquote className="text-lg sm:text-2xl font-serif italic text-emerald-950 leading-relaxed font-semibold my-2">
                    &ldquo;{pensamento?.texto}&rdquo;
                  </blockquote>
                  <div className="mt-4 pt-3 border-t border-emerald-200/60 flex items-center justify-between">
                    <span className="text-sm sm:text-base font-bold text-emerald-800 tracking-wide">
                      — {pensamento?.autor}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-600/80 uppercase tracking-wider">
                      Sabedoria & Fé
                    </span>
                  </div>
                </div>

                {/* BOX 2: REFLEXÃO & APLICAÇÃO PRÁTICA (A Lição) */}
                <div className="bg-gradient-to-br from-amber-50/90 to-orange-50/60 border-2 border-amber-300/80 rounded-2xl p-6 sm:p-7 shadow-sm relative">
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-1.5 bg-amber-600 text-white text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                      <Lightbulb size={12} />
                      2. Reflexão & Aplicação Prática
                    </span>
                  </div>
                  {pensamento?.reflexao ? (
                    <p className="text-sm sm:text-lg text-slate-800 font-sans leading-relaxed font-medium my-2">
                      {pensamento.reflexao}
                    </p>
                  ) : (
                    <p className="text-sm sm:text-base text-slate-500 italic my-2">
                      Sem reflexão adicional cadastrada para esta Semente Diária. Dedique um momento para contemplar a mensagem de {pensamento?.autor || 'hoje'}.
                    </p>
                  )}
                  <div className="mt-4 pt-3 border-t border-amber-200/60 flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-800/80">
                      Como aplicar essa lição no dia a dia da turma
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  {profile?.role === 'admin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsSementeModalOpen(false);
                        setIsEditingPensamento(true);
                      }}
                      className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95"
                    >
                      <Pencil size={13} className="text-slate-500" />
                      Editar Semente
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => {
                      if (!pensamento) return;
                      const copyText = `🌱 Semente Diária (Citação):\n"${pensamento.texto}" — ${pensamento.autor}\n\n💡 Reflexão Prática:\n${pensamento.reflexao || 'Contemple esta mensagem para o seu dia.'}`;
                      navigator.clipboard.writeText(copyText);
                      setCopiedSemente(true);
                      toast.success('Semente Diária e Reflexão copiadas!');
                      setTimeout(() => setCopiedSemente(false), 2500);
                    }}
                    className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95"
                  >
                    {copiedSemente ? (
                      <>
                        <Check size={14} className="text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} className="text-slate-500" />
                        Copiar Semente
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsSementeModalOpen(false)}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm px-6 py-2.5 rounded-xl transition-all shadow-md active:scale-95"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                  <label className="text-xs font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Sprout size={13} className="text-emerald-600" />
                    1. Semente Diária (Citação / Pensamento)
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
                    👤 Autor da Semente Diária
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

                <div className="space-y-1">
                  <label className="text-xs font-black text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Lightbulb size={13} className="text-amber-600" />
                    2. Reflexão Diária (Lição Prática e Aplicação)
                  </label>
                  <textarea
                    rows={3}
                    value={editReflexao}
                    onChange={(e) => setEditReflexao(e.target.value)}
                    placeholder="Reflexão breve, lição para os alunos ou meditação diária motivacional..."
                    className="w-full text-sm px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 transition-colors placeholder:text-slate-400 text-slate-800 font-sans leading-normal"
                    maxLength={400}
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

      {/* Clickable indicator banner */}
      <div className="flex items-center gap-2.5 bg-indigo-50/60 border border-indigo-100 p-4 rounded-xl text-xs text-indigo-800 font-bold shadow-sm">
        <Sparkles size={14} className="text-indigo-500 animate-bounce shrink-0" />
        <span>
          {language === 'pt' 
            ? '💡 Dica: Clique em qualquer um dos cartões abaixo para filtrar os detalhes e turmas/alunos correspondentes.' 
            : '💡 Tip: Click on any of the cards below to filter the corresponding details and classes/students.'}
        </span>
      </div>

      {statCards.filter((c: any) => c.shouldShow).length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {statCards.filter((c: any) => c.shouldShow).map((card: any, i: number) => {
            const isSelected = selectedCard === card.id;
            return (
              <motion.div
                key={card.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => handleCardClick(card.id)}
                className={`p-6 rounded-xl border transition-all cursor-pointer relative overflow-hidden active:scale-[0.96] hover:shadow-md hover:-translate-y-0.5 duration-200 ${
                  isSelected 
                    ? 'bg-indigo-50/10 border-indigo-600 shadow-md ring-2 ring-indigo-600/10' 
                    : 'bg-white border-slate-200 hover:border-indigo-400 hover:bg-slate-50/30 shadow-sm'
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
                  {isSelected && (
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse shadow-[0_0_8px_#4f46e5]" title={language === 'pt' ? 'Ativo' : 'Active'} />
                  )}
                </div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{card.name}</p>
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-black text-slate-800 tracking-tight">{card.value}</span>
                  <span className={`text-[10px] font-bold flex items-center gap-1.5 group px-2 py-0.5 rounded transition-colors ${
                    isSelected ? 'text-indigo-700 bg-indigo-50 border border-indigo-100 font-extrabold' : 'text-slate-500 hover:text-indigo-600 bg-slate-50'
                  }`}>
                    <MousePointerClick size={10} className="text-indigo-500" />
                    {language === 'pt' ? 'Clique para Detalhar' : 'Click to Detail'} 
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
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Users size={16} className="text-slate-400" />
                  {t.dashboard.studentsAbroad}
                </h3>
                <span className="text-xs text-slate-550 font-bold bg-slate-100 px-3 py-1 rounded-full border border-slate-200/50 ml-2">
                  {alunosExterior.length} {language === 'pt' ? 'Alunos' : 'Students'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-bold transition-colors shadow-sm border border-blue-200"
              >
                <Printer size={14} />
                {language === 'pt' ? 'Imprimir' : 'Print'}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] font-bold text-slate-400 border-b border-slate-100 uppercase tracking-wider">
                    <th className="px-6 py-4">{t.students.name}</th>
                    <th className="px-6 py-4">{t.dashboard.courseLocation}</th>
                    <th className="px-6 py-4">{language === 'pt' ? 'Documento' : 'Document'}</th>
                    <th className="px-6 py-4 text-center">{t.dashboard.startEnd}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm">
                  {alunosExterior.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-slate-400 italic">
                        {t.common.noInternationalStudents}
                      </td>
                    </tr>
                  ) : (
                    paginatedAlunos.map((aluno: any) => {
                      const turmaData = Array.isArray((aluno as any).turma) ? (aluno as any).turma[0] : (aluno as any).turma;
                      const curso = Array.isArray(turmaData?.curso) ? turmaData.curso[0] : turmaData?.curso;
                      const isPreInscrito = turmaData?.status?.toLowerCase() === 'pré-inscrito';
                      return (
                        <tr 
                          key={aluno.id} 
                          className={cn(
                            "transition-colors cursor-pointer",
                            "hover:bg-slate-50"
                          )}
                          onClick={() => {
                            setSelectedAlunoForEdit(aluno);
                          }}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {aluno.foto_url ? (
                                <div 
                                  className="w-12 h-16 rounded-lg overflow-hidden border border-slate-200 shrink-0 shadow-sm hover:scale-105 transition-transform cursor-pointer relative bg-slate-100 group"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedPhoto({ url: aluno.foto_url, name: aluno.nome });
                                  }}
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
                                <div className={cn("font-bold", isPreInscrito ? "text-red-600" : "text-slate-800")}>
                                  {aluno.posto_graduacao || aluno.nome_guerra ? `${aluno.posto_graduacao || ''} ${aluno.nome_guerra || aluno.nome}`.trim() : aluno.nome}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono uppercase">
                                  {aluno.om || '-'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className={cn("", isPreInscrito ? "text-red-500" : "text-slate-600")}>{curso?.nome || '-'}</div>
                            <div className="text-[10px] text-slate-400 uppercase font-bold">{turmaData?.localizacao || '-'}</div>
                          </td>
                          <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                            {turmaData?.documento_criacao || curso?.documento_criacao || '-'}
                          </td>
                          <td className="px-6 py-4 text-center text-slate-500 font-mono text-xs">
                            {turmaData?.internacional ? (
                              <div className="flex flex-col items-center justify-center leading-normal">
                                <span className={cn("font-bold whitespace-nowrap", isPreInscrito ? "text-red-600" : "text-slate-800")}>
                                  {aluno.data_inicio_curso?.trim() ? aluno.data_inicio_curso.split('-').reverse().join('/') : (turmaData?.data_inicio?.trim() ? turmaData.data_inicio.split('-').reverse().join('/') : '—')}
                                </span>
                                <span className="text-[10px] text-slate-400 font-sans uppercase font-extrabold my-0.5">a</span>
                                <span className={cn("font-bold whitespace-nowrap", isPreInscrito ? "text-red-600" : "text-slate-800")}>
                                  {aluno.data_fim_curso?.trim() ? aluno.data_fim_curso.split('-').reverse().join('/') : (turmaData?.data_fim?.trim() ? turmaData.data_fim.split('-').reverse().join('/') : '—')}
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center leading-normal">
                                <span className={cn("font-bold whitespace-nowrap", isPreInscrito ? "text-red-600" : "text-slate-800")}>
                                  {turmaData?.data_inicio ? turmaData.data_inicio.split('-').reverse().join('/') : '—'}
                                </span>
                                <span className="text-[10px] text-slate-400 font-sans uppercase font-extrabold my-0.5">a</span>
                                <span className={cn("font-bold whitespace-nowrap", isPreInscrito ? "text-red-600" : "text-slate-800")}>
                                  {turmaData?.data_fim ? turmaData.data_fim.split('-').reverse().join('/') : '—'}
                                </span>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Painel de Paginação de Alunos */}
            {totalAlunosExterior > 0 && (
              <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-sans text-slate-500 font-semibold shrink-0">
                <div className="flex items-center gap-2">
                  <span>{language === 'pt' ? 'Exibir:' : 'Show:'}</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setItemsPerPage(val);
                      setCurrentPage(1);
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('items_per_page_dashboard_alunos', String(val));
                      }
                    }}
                    className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 font-bold cursor-pointer"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={20}>20</option>
                  </select>
                  <span>{language === 'pt' ? 'alunos por página' : 'students per page'}</span>
                </div>

                <div className="font-medium text-slate-400 font-mono">
                  {language === 'pt' 
                    ? `Exibindo ${totalAlunosExterior > 0 ? startIndexAlunos + 1 : 0}-${endIndexAlunos} de ${totalAlunosExterior} alunos`
                    : `Showing ${totalAlunosExterior > 0 ? startIndexAlunos + 1 : 0}-${endIndexAlunos} of ${totalAlunosExterior} students`}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    className="p-1 px-2 hover:bg-slate-100 disabled:opacity-45 rounded-lg border border-slate-200 text-slate-500 transition cursor-pointer flex items-center justify-center disabled:cursor-not-allowed"
                    title={language === 'pt' ? 'Anterior' : 'Previous'}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  
                  {Array.from({ length: totalPagesAlunos }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCurrentPage(p)}
                      className={`p-1 px-3 rounded-lg text-xs font-bold transition-colors select-none ${
                        currentPage === p
                          ? 'bg-indigo-600 border border-indigo-600 text-white shadow-sm'
                          : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      {p}
                    </button>
                  ))}

                  <button
                    type="button"
                    disabled={currentPage === totalPagesAlunos || totalPagesAlunos === 0}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPagesAlunos))}
                    className="p-1 px-2 hover:bg-slate-100 disabled:opacity-45 rounded-lg border border-slate-200 text-slate-500 transition cursor-pointer flex items-center justify-center disabled:cursor-not-allowed"
                    title={language === 'pt' ? 'Próximo' : 'Next'}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
            
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
              onDelete={handleDeleteTurma}
              selectedCard="expedito"
              highlightedTurmaId={highlightedTurmaId}
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
              onDelete={handleDeleteTurma}
              selectedCard="carreira"
              highlightedTurmaId={highlightedTurmaId}
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
              onDelete={handleDeleteTurma}
              selectedCard="especial"
              highlightedTurmaId={highlightedTurmaId}
            />
          </motion.div>
        )}

        {selectedCard === 'pre_inscritos' && (
          <motion.div
            key="pre_inscritos"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
          >
            <TurmasListTable 
              turmas={turmasPreInscritasList} 
              title={isPt ? 'Turmas Pré-Inscritas' : 'Pre-registered Classes'} 
              onDelete={handleDeleteTurma}
              selectedCard="pre_inscritos"
              highlightedTurmaId={highlightedTurmaId}
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
  
      {selectedCard === 'exterior' && (
        <>
          {/* PRINT LAYOUT FOR ALUNOS EXTERIOR */}
          <div id="print-exterior-sheet" className="hidden print:block text-black font-sans w-full max-w-full bg-white p-2">
            <style dangerouslySetInnerHTML={{__html: `
              @media print {
                @page {
                  size: A4 portrait;
                  margin: 10mm 12mm;
                }
                html, body {
                  background: #ffffff !important;
                  color: #000000 !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  width: 100% !important;
                  height: auto !important;
                  min-height: 0 !important;
                  overflow: visible !important;
                }
                header, nav, aside, footer, button, .print\\:hidden, .no-print {
                  display: none !important;
                  height: 0 !important;
                  width: 0 !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  overflow: hidden !important;
                }
                main, div {
                  overflow: visible !important;
                }
                body:not(.printing-student-ficha) * {
                  visibility: hidden !important;
                }
                body:not(.printing-student-ficha) #print-exterior-sheet,
                body:not(.printing-student-ficha) #print-exterior-sheet * {
                  visibility: visible !important;
                }
                body:not(.printing-student-ficha) #print-exterior-sheet {
                  display: block !important;
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  height: auto !important;
                  min-height: 0 !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  background: #ffffff !important;
                  box-shadow: none !important;
                  border: none !important;
                }
                body.printing-student-ficha #print-exterior-sheet {
                  display: none !important;
                  visibility: hidden !important;
                  height: 0 !important;
                  overflow: hidden !important;
                }
                table {
                  page-break-inside: auto !important;
                  width: 100% !important;
                  border-collapse: collapse !important;
                }
                tr {
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                }
                thead {
                  display: table-header-group !important;
                }
              }
            `}} />
            <div className="flex flex-col items-center mb-6 border-b-2 border-black pb-4 relative">
              <div className="absolute left-0 top-0">
                <Image
                  src={navalMissionLogo}
                  alt="Logo Missão de Assessoria Naval"
                  width={60}
                  height={60}
                  className="object-contain"
                  referrerPolicy="no-referrer"
                  priority
                />
              </div>
              <h1 className="text-base font-extrabold uppercase tracking-tight text-center mt-1">
                {language === 'pt' ? 'MISSÃO DE ASSESSORIA NAVAL DO BRASIL' : 'NAVAL ADVISORY MISSION OF BRAZIL'}
              </h1>
              <h2 className="text-sm font-bold uppercase tracking-wide text-center mt-0.5">
                {language === 'pt' ? 'RELAÇÃO DE ALUNOS NO EXTERIOR' : 'STUDENTS ABROAD ROSTER'}
              </h2>
            </div>
            
            <table className="w-full text-left border-collapse border border-black mb-4 text-black">
              <thead>
                <tr className="border-b border-black bg-gray-100 text-[11px]">
                  <th className="p-2 border-r border-black font-bold uppercase w-[35px] text-center">#</th>
                  <th className="p-2 border-r border-black font-bold uppercase w-[60px] text-center">{language === 'pt' ? 'Foto' : 'Photo'}</th>
                  <th className="p-2 border-r border-black font-bold uppercase">{t.students.name}</th>
                  <th className="p-2 border-r border-black font-bold uppercase">{t.dashboard.courseLocation}</th>
                  <th className="p-2 border-r border-black font-bold uppercase">{language === 'pt' ? 'Documento' : 'Document'}</th>
                  <th className="p-2 font-bold uppercase text-center">{t.dashboard.startEnd}</th>
                </tr>
              </thead>
              <tbody className="text-[11px]">
                {alunosExterior.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center italic border-b border-black">
                      {t.common.noInternationalStudents}
                    </td>
                  </tr>
                ) : (
                  alunosExterior.map((aluno: any, idx: number) => {
                    const turmaData = Array.isArray(aluno.turma) ? aluno.turma[0] : aluno.turma;
                    const curso = Array.isArray(turmaData?.curso) ? turmaData.curso[0] : turmaData?.curso;
                    
                    const photoSrc = aluno.foto_url ||
                      (aluno.tipo_aluno === 'civil'
                        ? (aluno.genero === 'feminino' ? femaleAvatar : maleAvatar)
                        : (aluno.genero === 'feminino' ? militaryFemaleAvatar : militaryMaleAvatar));
                    const fallbackSrc = aluno.tipo_aluno === 'civil'
                      ? (aluno.genero === 'feminino' ? femaleAvatar : maleAvatar)
                      : (aluno.genero === 'feminino' ? militaryFemaleAvatar : militaryMaleAvatar);

                    const photoUrlString = typeof photoSrc === 'string' ? photoSrc : (photoSrc?.src || '');
                    const fallbackUrlString = typeof fallbackSrc === 'string' ? fallbackSrc : (fallbackSrc?.src || '');
                    const isPreInscrito = turmaData?.status?.toLowerCase() === 'pré-inscrito';

                    return (
                      <tr key={`print-ext-${aluno.id || idx}`} className={cn("border-b border-black", isPreInscrito ? "text-red-700" : "")}>
                        <td className="p-1 border-r border-black text-center font-mono font-bold align-middle">
                          {idx + 1}
                        </td>
                        <td className="p-1.5 border-r border-black text-center align-middle">
                          <div className="w-[42px] h-[56px] mx-auto border border-black rounded-sm overflow-hidden bg-slate-100 flex items-center justify-center relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={photoUrlString}
                              alt={aluno.nome}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = fallbackUrlString;
                              }}
                            />
                          </div>
                        </td>
                        <td className="p-2 border-r border-black align-middle">
                          <div className="font-bold text-xs uppercase">
                            {aluno.posto_graduacao || aluno.nome_guerra ? `${aluno.posto_graduacao || ''} ${aluno.nome_guerra || aluno.nome}`.trim() : aluno.nome}
                          </div>
                          <div className={cn("text-[9px] uppercase mt-0.5 font-medium", isPreInscrito ? "text-red-600" : "text-slate-600")}>
                            {aluno.om || '-'}
                          </div>
                        </td>
                        <td className="p-2 border-r border-black align-middle">
                          <div className="font-bold text-xs uppercase">{curso?.nome || '-'}</div>
                          <div className={cn("text-[9px] uppercase mt-0.5 font-medium", isPreInscrito ? "text-red-600" : "text-slate-600")}>
                            {turmaData?.nome ? `${turmaData.nome} • ` : ''}{turmaData?.localizacao || '-'}
                          </div>
                        </td>
                        <td className="p-2 border-r border-black align-middle text-center font-mono font-bold">
                          {turmaData?.documento_criacao || curso?.documento_criacao || '-'}
                        </td>
                        <td className="p-2 text-center align-middle border-black">
                          {turmaData?.internacional ? (
                            <div>
                              <span className="font-bold whitespace-nowrap">
                                {aluno.data_inicio_curso?.trim() ? aluno.data_inicio_curso.split('-').reverse().join('/') : (turmaData?.data_inicio?.trim() ? turmaData.data_inicio.split('-').reverse().join('/') : '—')}
                              </span>
                              <span className="text-[9px] uppercase font-bold mx-1">a</span>
                              <span className="font-bold whitespace-nowrap">
                                {aluno.data_fim_curso?.trim() ? aluno.data_fim_curso.split('-').reverse().join('/') : (turmaData?.data_fim?.trim() ? turmaData.data_fim.split('-').reverse().join('/') : '—')}
                              </span>
                            </div>
                          ) : (
                            <div>
                              <span className="font-bold whitespace-nowrap">
                                {turmaData?.data_inicio ? turmaData.data_inicio.split('-').reverse().join('/') : '—'}
                              </span>
                              <span className="text-[9px] uppercase font-bold mx-1">a</span>
                              <span className="font-bold whitespace-nowrap">
                                {turmaData?.data_fim ? turmaData.data_fim.split('-').reverse().join('/') : '—'}
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            <div className="text-[9px] text-right font-semibold">
              {language === 'pt' ? 'Gerado em' : 'Generated on'} {new Date().toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US')}
            </div>
          </div>
        </>
      )}

      <StudentDetailEditModal
        isOpen={!!selectedAlunoForEdit}
        onClose={() => setSelectedAlunoForEdit(null)}
        aluno={selectedAlunoForEdit}
        onSave={async () => {
          await refreshDashboard();
          setSelectedAlunoForEdit(null);
        }}
      />
    </div>
  );
}

function TurmasListTable({ 
  turmas, 
  title, 
  onDelete, 
  selectedCard,
  highlightedTurmaId
}: { 
  turmas: any[], 
  title: string, 
  onDelete?: (id: string) => void, 
  selectedCard?: string,
  highlightedTurmaId?: string | null
}) {
  const { t, language } = useI18n();
  const { isAdmin } = useUser();
  const router = useRouter();
  const isPt = language === 'pt';

  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [activeHighlight, setActiveHighlight] = useState<string | null>(highlightedTurmaId || null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('items_per_page_dashboard_turmas');
      if (saved) {
        setTimeout(() => {
          setItemsPerPage(Number(saved));
        }, 0);
      }
    }
  }, []);

  // Ensure pagination is automatically on the page that contains the highlighted class
  useEffect(() => {
    if (highlightedTurmaId && turmas.length > 0) {
      setActiveHighlight(highlightedTurmaId);
      const targetIndex = turmas.findIndex(t => t.id === highlightedTurmaId);
      if (targetIndex !== -1) {
        const targetPage = Math.floor(targetIndex / itemsPerPage) + 1;
        setCurrentPage(targetPage);
      }
    }
  }, [highlightedTurmaId, turmas, itemsPerPage]);

  // Smoothly scroll and focus on the chosen class row when loaded
  useEffect(() => {
    if (activeHighlight) {
      const scrollTimer = setTimeout(() => {
        const rowEl = document.getElementById(`turma-row-${activeHighlight}`);
        if (rowEl) {
          rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          rowEl.focus();
        }
      }, 250);

      // Auto fade the ring after 5 seconds
      const fadeTimer = setTimeout(() => {
        setActiveHighlight(null);
      }, 5000);

      return () => {
        clearTimeout(scrollTimer);
        clearTimeout(fadeTimer);
      };
    }
  }, [activeHighlight, currentPage]);

  const totalItems = turmas.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedTurmas = turmas.slice(startIndex, endIndex);

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
              {isAdmin && onDelete && <th className="px-6 py-4 text-right">{isPt ? 'Ações' : 'Actions'}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-sm">
            {turmas.length === 0 ? (
              <tr>
                <td colSpan={isAdmin && onDelete ? 6 : 5} className="px-6 py-10 text-center text-slate-400 italic font-medium">
                  {isPt ? 'Nenhuma turma ativa encontrada para esta categoria.' : 'No active classes found for this category.'}
                </td>
              </tr>
            ) : (
              paginatedTurmas.map((turma) => {
                const isPreInscrito = turma.status?.toLowerCase() === 'pré-inscrito';
                const isHighlighted = turma.id === activeHighlight;
                return (
                <tr 
                  id={`turma-row-${turma.id}`}
                  key={turma.id} 
                  tabIndex={0}
                  className={cn(
                    "transition-all duration-500 cursor-pointer outline-none",
                    isHighlighted
                      ? "bg-amber-50/90 ring-2 ring-amber-500 ring-offset-2 shadow-md scale-[1.003]"
                      : "hover:bg-slate-50 focus:bg-slate-50 focus:ring-1 focus:ring-blue-400"
                  )}
                  onClick={() => {
                    router.push(`/turmas?action=view-students&turmaId=${turma.id}&returnTo=dashboard&card=${selectedCard || 'expedito'}`);
                  }}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {isHighlighted && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-amber-500 text-white px-2 py-0.5 rounded-full shadow-xs animate-bounce">
                          👉 Turma Escolhida
                        </span>
                      )}
                      <div className={cn("font-bold", isPreInscrito ? "text-red-600" : "text-slate-800")}>{turma.nome}</div>
                    </div>
                    <div className={cn("text-[10px] font-mono uppercase", isPreInscrito ? "text-red-500" : "text-slate-400")}>
                      ANO: {turma.ano || '-'} {turma.grupo_responsavel ? `• GRUPO: ${turma.grupo_responsavel}` : ''}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={cn("font-semibold", isPreInscrito ? "text-red-600" : "text-slate-700")}>{turma.curso?.nome || '-'}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-black tracking-wider">
                      {turma.curso?.categoria || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-650 font-medium">{turma.localizacao || '-'}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">
                       {turma.periodo || '-'}
                    </div>
                    {(turma.data_inicio || turma.data_fim) && (
                      <div className="text-[10px] text-blue-500 uppercase font-bold mt-0.5 tracking-wider">
                        {turma.data_inicio ? turma.data_inicio.split('-').reverse().join('/') : '—'} - {turma.data_fim ? turma.data_fim.split('-').reverse().join('/') : '—'}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-block px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 rounded-lg">
                      {turma.capacidade_max || 40} {isPt ? 'vagas' : 'seats'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className={cn("font-medium", isPreInscrito ? "text-red-600" : "text-slate-650")}>{turma.instrutor || '-'}</div>
                    <div className={cn("text-[10px] font-bold uppercase flex items-center gap-1 mt-0.5", isPreInscrito ? "text-red-600" : "text-green-600")}>
                      <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isPreInscrito ? "bg-red-500" : "bg-green-500")} />
                      Class {turma.status || 'ativa'}
                    </div>
                  </td>
                  {isAdmin && onDelete && (
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(turma.id);
                        }}
                        className="p-1.5 bg-slate-100 hover:bg-red-600 hover:text-white border border-slate-200/50 rounded-lg transition-colors text-slate-500 cursor-pointer inline-flex items-center justify-center font-bold"
                        title={isPt ? "Apagar Turma" : "Delete Class"}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })
            )}
          </tbody>
        </table>
      </div>

      {/* Painel de Paginação de Turmas */}
      {totalItems > 0 && (
        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-sans text-slate-500 font-semibold shrink-0">
          <div className="flex items-center gap-2">
            <span>{isPt ? 'Exibir:' : 'Show:'}</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                const val = Number(e.target.value);
                setItemsPerPage(val);
                setCurrentPage(1);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('items_per_page_dashboard_turmas', String(val));
                }
              }}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 font-bold cursor-pointer"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
            </select>
            <span>{isPt ? 'registros por página' : 'records per page'}</span>
          </div>

          <div className="font-medium text-slate-400 font-mono">
            {isPt 
              ? `Exibindo ${totalItems > 0 ? startIndex + 1 : 0}-${endIndex} de ${totalItems} registros`
              : `Showing ${totalItems > 0 ? startIndex + 1 : 0}-${endIndex} of ${totalItems} records`}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="p-1 px-2 hover:bg-slate-100 disabled:opacity-45 rounded-lg border border-slate-200 text-slate-500 transition cursor-pointer flex items-center justify-center disabled:cursor-not-allowed"
              title={isPt ? 'Anterior' : 'Previous'}
            >
              <ChevronLeft size={14} />
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setCurrentPage(p)}
                className={`p-1 px-3 rounded-lg text-xs font-bold transition-colors select-none ${
                  currentPage === p
                    ? 'bg-indigo-600 border border-indigo-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                {p}
              </button>
            ))}

            <button
              type="button"
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="p-1 px-2 hover:bg-slate-100 disabled:opacity-45 rounded-lg border border-slate-200 text-slate-500 transition cursor-pointer flex items-center justify-center disabled:cursor-not-allowed"
              title={isPt ? 'Próximo' : 'Next'}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
