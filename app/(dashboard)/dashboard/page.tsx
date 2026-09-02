'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { useUser } from '@/lib/auth/UserContext';
import { useDashboardStats } from '@/hooks/useCachedData';
import { supabase } from '@/lib/supabase/client';
import { fetchWithAuth } from '@/lib/api';
import { cn, getCleanTurmaName } from '@/lib/utils';
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
  Lightbulb,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  RotateCcw,
  FileText,
  Calendar,
  FolderTree,
  LayoutGrid,
  SortAsc,
  Monitor,
  Archive,
  Download,
  SlidersHorizontal,
  Layers,
  CheckSquare,
  Square
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ExchangeRateTicker from '@/components/ExchangeRateTicker';
import StudentDetailEditModal from '@/components/StudentDetailEditModal';
import CombinedPrintModal, { CATEGORY_DEFINITIONS } from '@/components/CombinedPrintModal';
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
      turmasEad: 0,
      turmasPreInscritas: 0,
      turmasArquivadas: 0,
    }, 
    alunosExterior = [],
    turmasExpeditoList = [],
    turmasCarreiraList = [],
    turmasEspeciaisList = [],
    turmasEadList = [],
    turmasPreInscritasList = [],
    turmasArquivadasList = [],
  } = dashboardData || {};

  const [selectedCard, setSelectedCard] = useState<string>('exterior');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['exterior', 'expedito', 'carreira', 'especial', 'ead', 'pre_inscritos']);
  const [viewMode, setViewMode] = useState<'consolidated' | 'tabs'>('consolidated');
  const [isCombinedPrintModalOpen, setIsCombinedPrintModalOpen] = useState<boolean>(false);
  const [hasUserSelectedCard, setHasUserSelectedCard] = useState<boolean>(false);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedAlunoForEdit, setSelectedAlunoForEdit] = useState<any | null>(null);
  const [highlightedTurmaId, setHighlightedTurmaId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const cardParam = params.get('card');
      const catsParam = params.get('categories');
      const highlightParam = params.get('highlightTurma');
      if (highlightParam) {
        setHighlightedTurmaId(highlightParam);
      }
      if (catsParam) {
        const parsed = catsParam.split(',').filter(c => ['exterior', 'expedito', 'carreira', 'especial', 'ead', 'pre_inscritos', 'arquivadas'].includes(c));
        if (parsed.length > 0) {
          setSelectedCategories(parsed);
          setSelectedCard(parsed[0]);
          setHasUserSelectedCard(true);
        }
      } else if (cardParam && ['exterior', 'expedito', 'carreira', 'especial', 'ead', 'pre_inscritos', 'arquivadas'].includes(cardParam)) {
        setSelectedCard(cardParam);
        setSelectedCategories([cardParam]);
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
      } else if (turmasEadList?.some((t: any) => t.id === highlightedTurmaId)) {
        setSelectedCard('ead');
        setHasUserSelectedCard(true);
      } else if (turmasPreInscritasList?.some((t: any) => t.id === highlightedTurmaId)) {
        setSelectedCard('pre_inscritos');
        setHasUserSelectedCard(true);
      } else if (turmasArquivadasList?.some((t: any) => t.id === highlightedTurmaId)) {
        setSelectedCard('arquivadas');
        setHasUserSelectedCard(true);
      }
    }
  }, [highlightedTurmaId, dashboardData, turmasExpeditoList, turmasCarreiraList, turmasEspeciaisList, turmasEadList, turmasPreInscritasList, turmasArquivadasList]);

  useEffect(() => {
    if (dashboardData && stats && !hasUserSelectedCard) {
      if (selectedCategories.length === 0) {
        setSelectedCategories(['exterior', 'expedito', 'carreira', 'especial', 'ead', 'pre_inscritos']);
      }
    }
  }, [dashboardData, stats, hasUserSelectedCard, selectedCategories.length]);

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

  // Filter state for Alunos no Exterior (Grouped by Document)
  const [selectedDocumentoFilter, setSelectedDocumentoFilter] = useState<string>('all');

  // Helper to extract student document safely
  const getAlunoDocumento = useCallback((aluno: any): string => {
    const turmaData = Array.isArray(aluno.turma) ? aluno.turma[0] : aluno.turma;
    const curso = Array.isArray(turmaData?.curso) ? turmaData.curso[0] : turmaData?.curso;
    const doc = (aluno.documento_criacao || turmaData?.documento_criacao || curso?.documento_criacao || '').trim();
    return doc || (language === 'pt' ? 'Sem Documento Cadastrado' : 'No Document Specified');
  }, [language]);

  // Distinct documents among exterior students
  const availableDocumentosExterior = useMemo(() => {
    const map = new Map<string, number>();
    alunosExterior.forEach((aluno: any) => {
      const doc = getAlunoDocumento(aluno);
      map.set(doc, (map.get(doc) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([documento, count]) => ({ documento, count }))
      .sort((a, b) => a.documento.localeCompare(b.documento, 'pt-BR'));
  }, [alunosExterior, getAlunoDocumento]);

  // Grouped students abroad list by document (alphabetical inside each group)
  const groupedAlunosExteriorByDoc = useMemo(() => {
    let list = [...alunosExterior];
    if (selectedDocumentoFilter !== 'all') {
      list = list.filter((aluno: any) => getAlunoDocumento(aluno) === selectedDocumentoFilter);
    }

    // Sort alphabetically by name within each group
    list.sort((a: any, b: any) => {
      const nomeA = (a.nome || a.nome_guerra || '').trim().toLowerCase();
      const nomeB = (b.nome || b.nome_guerra || '').trim().toLowerCase();
      return nomeA.localeCompare(nomeB, 'pt-BR');
    });

    const groupsMap = new Map<string, any[]>();
    list.forEach((aluno: any) => {
      const doc = getAlunoDocumento(aluno);
      if (!groupsMap.has(doc)) {
        groupsMap.set(doc, []);
      }
      groupsMap.get(doc)!.push(aluno);
    });

    return Array.from(groupsMap.entries())
      .map(([documento, alunos]) => ({
        documento,
        alunos
      }))
      .sort((a, b) => a.documento.localeCompare(b.documento, 'pt-BR'));
  }, [alunosExterior, selectedDocumentoFilter, getAlunoDocumento]);

  const totalFilteredAlunosExterior = useMemo(() => {
    return groupedAlunosExteriorByDoc.reduce((acc, g) => acc + g.alunos.length, 0);
  }, [groupedAlunosExteriorByDoc]);

  const combinedTotals = useMemo(() => {
    let totalAlunos = 0;
    let totalTurmas = 0;

    selectedCategories.forEach((catId) => {
      switch (catId) {
        case 'exterior':
          totalAlunos += (alunosExterior || []).length;
          totalTurmas += (availableDocumentosExterior || []).length;
          break;
        case 'carreira':
          totalTurmas += (turmasCarreiraList || []).length;
          totalAlunos += (turmasCarreiraList || []).reduce((acc: number, t: any) => acc + (t.alunos?.length || t.total_alunos || 0), 0);
          break;
        case 'especial':
          totalTurmas += (turmasEspeciaisList || []).length;
          totalAlunos += (turmasEspeciaisList || []).reduce((acc: number, t: any) => acc + (t.alunos?.length || t.total_alunos || 0), 0);
          break;
        case 'expedito':
          totalTurmas += (turmasExpeditoList || []).length;
          totalAlunos += (turmasExpeditoList || []).reduce((acc: number, t: any) => acc + (t.alunos?.length || t.total_alunos || 0), 0);
          break;
        case 'ead':
          totalTurmas += (turmasEadList || []).length;
          totalAlunos += (turmasEadList || []).reduce((acc: number, t: any) => acc + (t.alunos?.length || t.total_alunos || 0), 0);
          break;
        case 'pre_inscritos':
          totalTurmas += (turmasPreInscritasList || []).length;
          totalAlunos += (turmasPreInscritasList || []).reduce((acc: number, t: any) => acc + (t.alunos?.length || t.total_alunos || 0), 0);
          break;
        case 'arquivadas':
          totalTurmas += (turmasArquivadasList || []).length;
          totalAlunos += (turmasArquivadasList || []).reduce((acc: number, t: any) => acc + (t.alunos?.length || t.total_alunos || 0), 0);
          break;
      }
    });

    return { totalAlunos, totalTurmas };
  }, [selectedCategories, alunosExterior, availableDocumentosExterior, turmasCarreiraList, turmasEspeciaisList, turmasExpeditoList, turmasEadList, turmasPreInscritasList, turmasArquivadasList]);

  const [expandedPhoto, setExpandedPhoto] = useState<{url: string, name: string} | null>(null);
  const detailsRef = useRef<HTMLDivElement>(null);

  const isCategoryVisible = useCallback((catId: string) => {
    if (!selectedCategories.includes(catId)) return false;
    if (viewMode === 'tabs' && selectedCategories.length > 1) {
      return selectedCard === catId;
    }
    return true;
  }, [selectedCategories, viewMode, selectedCard]);

  const handleToggleCategory = (catId: string) => {
    setSelectedCategories((prev) => {
      const isSelected = prev.includes(catId);
      const next = isSelected ? prev.filter((id) => id !== catId) : [...prev, catId];
      if (next.length > 0) {
        if (!next.includes(selectedCard)) {
          setSelectedCard(next[0]);
        }
      }
      return next;
    });
    setHasUserSelectedCard(true);
  };

  const handleSetCategories = (cats: string[]) => {
    setSelectedCategories(cats);
    if (cats.length > 0 && !cats.includes(selectedCard)) {
      setSelectedCard(cats[0]);
    }
    setHasUserSelectedCard(true);
  };

  const handleSelectAllCategories = () => {
    const all = ['exterior', 'carreira', 'especial', 'expedito', 'ead', 'pre_inscritos', 'arquivadas'];
    setSelectedCategories(all);
    if (!all.includes(selectedCard)) {
      setSelectedCard(all[0]);
    }
    setHasUserSelectedCard(true);
  };

  const handleClearCategories = () => {
    setSelectedCategories([]);
    setHasUserSelectedCard(true);
  };

  const handleCardClick = (cardId: string) => {
    setSelectedCard(cardId);
    setSelectedCategories([cardId]);
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
      studentsCount: stats.alunosExterior,
      unit: language === 'pt' ? 'alunos' : 'students',
      icon: GraduationCap, 
      color: 'bg-purple-600',
      shouldShow: (stats.alunosExterior || 0) > 0
    },
    { 
      id: 'expedito',
      name: t.dashboard.turmasExpedito, 
      value: stats.turmasExpedito, 
      studentsCount: stats.studentsExpedito,
      unit: language === 'pt' ? 'turmas' : 'classes',
      icon: BookOpen, 
      color: 'bg-amber-500',
      shouldShow: (stats.turmasExpedito || 0) > 0
    },
    { 
      id: 'carreira',
      name: t.dashboard.turmasCarreira, 
      value: stats.turmasCarreira, 
      studentsCount: stats.studentsCarreira,
      unit: language === 'pt' ? 'turmas' : 'classes',
      icon: BookMarked, 
      color: 'bg-emerald-600',
      shouldShow: (stats.turmasCarreira || 0) > 0
    },
    { 
      id: 'especial',
      name: t.dashboard.turmasEspeciais, 
      value: stats.turmasEspeciais, 
      studentsCount: stats.studentsEspeciais,
      unit: language === 'pt' ? 'turmas' : 'classes',
      icon: Award, 
      color: 'bg-blue-600',
      shouldShow: (stats.turmasEspeciais || 0) > 0
    },
    { 
      id: 'ead',
      name: t.dashboard.turmasEad || (isPt ? 'Turmas de Cursos EaD' : 'EaD Course Classes'), 
      value: stats.turmasEad || 0, 
      studentsCount: stats.studentsEad || 0,
      unit: language === 'pt' ? 'turmas' : 'classes',
      icon: Monitor, 
      color: 'bg-cyan-600',
      shouldShow: (stats.turmasEad || 0) > 0
    },
    { 
      id: 'pre_inscritos',
      name: isPt ? 'Turmas Pré-Inscritas' : 'Pre-registered Classes', 
      value: stats.turmasPreInscritas || 0, 
      studentsCount: stats.studentsPreInscritos || 0,
      unit: language === 'pt' ? 'turmas' : 'classes',
      icon: Users, 
      color: 'bg-red-600',
      shouldShow: (stats.turmasPreInscritas || 0) > 0
    },
    { 
      id: 'arquivadas',
      name: isPt ? 'Turmas Arquivadas' : 'Archived Classes', 
      value: stats.turmasArquivadas || 0, 
      studentsCount: stats.studentsArquivadas || 0,
      unit: language === 'pt' ? 'turmas' : 'classes',
      icon: Archive, 
      color: 'bg-slate-600',
      shouldShow: (stats.turmasArquivadas || 0) > 0
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

      {/* PAINEL DE CONTROLE DE FILTROS COMBINADOS & IMPRESSÃO */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-lg border border-indigo-900/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg border border-indigo-500/30">
                <SlidersHorizontal size={16} />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                {isPt ? 'Filtro Combinado de Cursos e Turmas' : 'Combined Course & Class Filter'}
              </h2>
              <span className="bg-indigo-500/30 text-indigo-200 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-indigo-400/30">
                {selectedCategories.length} {selectedCategories.length === 1 ? (isPt ? 'categoria' : 'category') : (isPt ? 'categorias' : 'categories')}
              </span>
            </div>
            <p className="text-xs text-slate-300">
              {isPt 
                ? 'Combine múltiplos cartões para filtrar, visualizar juntos e imprimir relatórios consolidados em PDF.'
                : 'Combine multiple cards to filter, view together and print consolidated PDF reports.'}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
            <button
              type="button"
              onClick={() => setIsCombinedPrintModalOpen(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-950/50 hover:shadow-indigo-500/20 active:scale-95 transition cursor-pointer border border-indigo-400/30"
              title={isPt ? 'Abrir modal de impressão dos filtros combinados' : 'Open combined print modal'}
            >
              <Printer size={15} className="text-blue-200" />
              <span>{isPt ? 'Imprimir Filtros Combinados' : 'Print Combined Filters'}</span>
            </button>

            {selectedCategories.length > 1 && (
              <button
                type="button"
                onClick={handleClearCategories}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-semibold rounded-xl border border-white/10 transition cursor-pointer"
                title={isPt ? 'Restaurar filtro individual' : 'Reset single filter'}
              >
                <RotateCcw size={13} />
                <span className="hidden sm:inline">{isPt ? 'Limpar Combinação' : 'Clear Combination'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Multi-Checkbox Selection Bar */}
        <div className="mt-4 pt-3.5 border-t border-white/15">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-2.5">
            <div className="flex items-center gap-2">
              <CheckSquare size={14} className="text-indigo-400" />
              <span className="text-xs font-bold text-indigo-200 uppercase tracking-wider">
                {isPt ? 'Marque as caixas de seleção que deseja filtrar/imprimir:' : 'Check the boxes you wish to filter/print:'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={handleSelectAllCategories}
                className="px-2.5 py-1 rounded-lg bg-indigo-500/25 hover:bg-indigo-500/40 text-indigo-200 hover:text-white border border-indigo-400/30 transition cursor-pointer font-bold"
              >
                {isPt ? 'Marcar Todos' : 'Select All'}
              </button>
              <button
                type="button"
                onClick={handleClearCategories}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white border border-white/15 transition cursor-pointer font-medium"
              >
                {isPt ? 'Desmarcar Todos' : 'Clear All'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {CATEGORY_DEFINITIONS.map((cat) => {
              const isChecked = selectedCategories.includes(cat.id);
              const IconComponent = cat.icon;
              return (
                <button
                  type="button"
                  key={`dash-check-${cat.id}`}
                  onClick={() => handleToggleCategory(cat.id)}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-xl border text-xs font-bold transition cursor-pointer select-none text-left",
                    isChecked
                      ? "bg-indigo-600/90 text-white border-indigo-400 shadow-sm ring-1 ring-indigo-400/40"
                      : "bg-white/10 text-slate-300 border-white/10 hover:bg-white/15 hover:text-white"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded flex items-center justify-center transition shrink-0 border",
                    isChecked 
                      ? "bg-white text-indigo-700 border-white" 
                      : "border-slate-400/50 bg-black/20"
                  )}>
                    {isChecked ? <CheckSquare size={12} className="text-indigo-700 fill-indigo-700" /> : null}
                  </div>
                  <IconComponent size={14} className={isChecked ? "text-white shrink-0" : "text-slate-400 shrink-0"} />
                  <span className="truncate">{isPt ? cat.label : cat.labelEn}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {statCards.filter((c: any) => c.shouldShow).length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {statCards.filter((c: any) => c.shouldShow).map((card: any, i: number) => {
            const isSelected = selectedCard === card.id;
            const isInCombined = selectedCategories.includes(card.id);
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
                    : isInCombined
                    ? 'bg-indigo-50/5 border-indigo-300 shadow-sm'
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

                  {/* Multi-selection toggle checkbox */}
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleCategory(card.id);
                    }}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer select-none",
                      isInCombined 
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs" 
                        : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200 hover:text-slate-800"
                    )}
                    title={isInCombined ? (isPt ? 'Desmarcar da combinação' : 'Remove from combination') : (isPt ? 'Marcar para combinar' : 'Combine category')}
                  >
                    {isInCombined ? <CheckSquare size={12} className="text-white" /> : <Square size={12} />}
                    <span>{isInCombined ? (isPt ? 'Combinado' : 'Combined') : (isPt ? 'Combinar' : 'Combine')}</span>
                  </div>
                </div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{card.name}</p>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-black text-slate-800 tracking-tight">{card.value}</span>
                  <span className="text-xs font-bold text-slate-400 uppercase">{card.unit}</span>
                  {card.id !== 'exterior' && card.studentsCount !== undefined && (
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md ml-auto border border-indigo-100/60 flex items-center gap-1">
                      <Users size={11} className="text-indigo-500" />
                      {card.studentsCount} {language === 'pt' ? 'alunos' : 'students'}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400">
                    {isInCombined ? (isPt ? '✓ Incluso no filtro' : '✓ In combined filter') : ''}
                  </span>
                  <span className={`text-[10px] font-bold flex items-center gap-1.5 group px-2 py-0.5 rounded transition-colors ${
                    isSelected ? 'text-indigo-700 bg-indigo-50 border border-indigo-100 font-extrabold' : 'text-slate-500 hover:text-indigo-600 bg-slate-50'
                  }`}>
                    <MousePointerClick size={10} className="text-indigo-500" />
                    {language === 'pt' ? 'Detalhar' : 'Detail'} 
                    <ArrowRight size={10} className="text-indigo-500 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <div ref={detailsRef} className="scroll-mt-24" />

      {/* BARRA DE DETALHES DE FILTROS COMBINADOS */}
      {selectedCategories.length > 1 && (
        <div className="bg-white border border-indigo-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 flex items-center gap-1.5">
                <Layers size={13} />
                {isPt ? 'Filtro Combinado Ativo' : 'Active Combined Filter'}
              </span>
              <span className="text-xs font-black text-slate-800">
                {combinedTotals.totalAlunos} {combinedTotals.totalAlunos === 1 ? (isPt ? 'Aluno' : 'Student') : (isPt ? 'Alunos' : 'Students')}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-semibold text-slate-600">
                {combinedTotals.totalTurmas} {isPt ? 'Turmas/Portarias' : 'Classes/Documents'}
              </span>
            </div>
            
            {/* Active category chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              {CATEGORY_DEFINITIONS.filter(c => selectedCategories.includes(c.id)).map(c => {
                const IconComponent = c.icon;
                return (
                  <span 
                    key={c.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full text-[11px] font-bold border border-slate-200"
                  >
                    <IconComponent size={12} className="text-indigo-600 shrink-0" />
                    <span>{isPt ? c.label : c.labelEn}</span>
                    {selectedCategories.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleToggleCategory(c.id)}
                        className="hover:text-red-600 p-0.5 rounded-full cursor-pointer ml-0.5"
                        title={isPt ? 'Remover' : 'Remove'}
                      >
                        <X size={10} />
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch md:self-auto justify-end flex-wrap">
            {/* View Mode Switcher */}
            <div className="bg-slate-100 p-0.5 rounded-lg flex items-center border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('consolidated')}
                className={cn(
                  "px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1.5 cursor-pointer text-xs",
                  viewMode === 'consolidated'
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <LayoutGrid size={13} />
                <span>{isPt ? 'Visão Consolidada' : 'Consolidated View'}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('tabs')}
                className={cn(
                  "px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1.5 cursor-pointer text-xs",
                  viewMode === 'tabs'
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <LayersIcon size={13} />
                <span>{isPt ? 'Abas' : 'Tabs'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsCombinedPrintModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <Printer size={14} />
              <span>{isPt ? 'Imprimir Combinação' : 'Print Combination'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Navegação por abas caso viewMode === 'tabs' e selectedCategories.length > 1 */}
      {selectedCategories.length > 1 && viewMode === 'tabs' && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200">
          {CATEGORY_DEFINITIONS.filter(c => selectedCategories.includes(c.id)).map((cat) => {
            const isTabActive = selectedCard === cat.id;
            const IconComponent = cat.icon;
            return (
              <button
                key={`tab-${cat.id}`}
                type="button"
                onClick={() => setSelectedCard(cat.id)}
                className={cn(
                  "px-4 py-2 text-xs font-bold rounded-t-xl border-t border-x transition flex items-center gap-2 cursor-pointer",
                  isTabActive
                    ? "bg-white text-indigo-600 border-slate-200 border-b-white -mb-px shadow-2xs"
                    : "bg-slate-50 text-slate-500 border-transparent hover:bg-slate-100 hover:text-slate-800"
                )}
              >
                <IconComponent size={14} className={isTabActive ? "text-indigo-600" : "text-slate-500"} />
                <span>{isPt ? cat.label : cat.labelEn}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* RENDERIZAÇÃO DOS DETALHES DAS CATEGORIAS (CONSOLIDADA OU ABA INDIVIDUAL) */}
      <div className="space-y-6">
        {selectedCategories.length === 0 && (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center my-6">
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <Filter size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">
              {isPt ? 'Nenhuma categoria selecionada' : 'No category selected'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
              {isPt 
                ? 'Marque uma ou mais caixas de seleção acima ou clique em um dos cartões para visualizar as turmas e alunos correspondentes.'
                : 'Check one or more boxes above or click on one of the cards to view corresponding classes and students.'}
            </p>
            <button
              type="button"
              onClick={handleSelectAllCategories}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <CheckSquare size={14} />
              <span>{isPt ? 'Marcar Todas as Categorias' : 'Select All Categories'}</span>
            </button>
          </div>
        )}

        {isCategoryVisible('exterior') && (
          <motion.div
            key="exterior"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden"
          >
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 print:hidden">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Users size={16} className="text-slate-400" />
                  {t.dashboard.studentsAbroad}
                </h3>
                <span className="text-xs text-slate-550 font-bold bg-slate-100 px-3 py-1 rounded-full border border-slate-200/50">
                  {totalFilteredAlunosExterior === alunosExterior.length ? (
                    `${alunosExterior.length} ${language === 'pt' ? 'Alunos' : 'Students'}`
                  ) : (
                    `${totalFilteredAlunosExterior} de ${alunosExterior.length} ${language === 'pt' ? 'Alunos' : 'Students'}`
                  )}
                </span>
                <span className="text-xs text-indigo-600 font-bold bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                  {availableDocumentosExterior.length} {availableDocumentosExterior.length === 1 ? (language === 'pt' ? 'Portaria' : 'Document') : (language === 'pt' ? 'Portarias' : 'Documents')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-bold transition-colors shadow-sm border border-blue-200 cursor-pointer"
              >
                <Printer size={14} />
                {language === 'pt' ? 'Imprimir Relação' : 'Print Roster'}
              </button>
            </div>

            {/* BARRA DE FILTRO ÚNICO: AGRUPAR / FILTRAR POR DOCUMENTO */}
            <div className="p-3.5 bg-slate-50/90 border-b border-slate-200/90 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs print:hidden">
              <div className="flex items-center gap-2.5 flex-1">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100 shadow-2xs shrink-0">
                  <FileText size={15} />
                </div>
                <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="font-bold text-slate-700 text-xs shrink-0">
                    {language === 'pt' ? 'Filtrar / Agrupar por Documento:' : 'Filter / Group by Document:'}
                  </span>
                  <select
                    value={selectedDocumentoFilter}
                    onChange={(e) => setSelectedDocumentoFilter(e.target.value)}
                    className="bg-white border border-slate-200 text-slate-800 font-semibold text-xs rounded-lg px-3 py-1.5 shadow-2xs outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition max-w-full sm:max-w-[420px]"
                  >
                    <option value="all">
                      {language === 'pt'
                        ? `📋 Todos os Documentos (${availableDocumentosExterior.length} portarias • ${alunosExterior.length} alunos)`
                        : `📋 All Documents (${availableDocumentosExterior.length} orders • ${alunosExterior.length} students)`}
                    </option>
                    {availableDocumentosExterior.map((d) => (
                      <option key={d.documento} value={d.documento}>
                        📄 {d.documento} ({d.count} {d.count === 1 ? (language === 'pt' ? 'aluno' : 'student') : (language === 'pt' ? 'alunos' : 'students')})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedDocumentoFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedDocumentoFilter('all')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:text-slate-900 bg-slate-200/70 hover:bg-slate-200 rounded-lg text-xs font-bold transition cursor-pointer self-start sm:self-auto"
                  title={language === 'pt' ? 'Mostrar todos os documentos' : 'Show all documents'}
                >
                  <RotateCcw size={12} />
                  <span>{language === 'pt' ? 'Ver Todos os Documentos' : 'View All Documents'}</span>
                </button>
              )}
            </div>

            {/* Chips Rápidos de Documentos / Portarias */}
            {availableDocumentosExterior.length > 1 && (
              <div className="px-4 py-2 bg-slate-50/40 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto text-[11px] scrollbar-none print:hidden">
                <span className="text-slate-400 font-bold uppercase text-[9px] mr-1 shrink-0">
                  {language === 'pt' ? 'Portarias:' : 'Documents:'}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDocumentoFilter('all')}
                  className={cn(
                    "px-2.5 py-0.5 rounded-full font-bold whitespace-nowrap transition cursor-pointer shrink-0 border text-[11px]",
                    selectedDocumentoFilter === 'all'
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                  )}
                >
                  {language === 'pt' ? 'Todas' : 'All'} ({availableDocumentosExterior.length})
                </button>
                {availableDocumentosExterior.map((d) => (
                  <button
                    key={`pill-doc-${d.documento}`}
                    type="button"
                    onClick={() => setSelectedDocumentoFilter(d.documento === selectedDocumentoFilter ? 'all' : d.documento)}
                    className={cn(
                      "px-2.5 py-0.5 rounded-full font-bold whitespace-nowrap transition cursor-pointer shrink-0 border text-[11px]",
                      selectedDocumentoFilter === d.documento
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    {d.documento} ({d.count})
                  </button>
                ))}
              </div>
            )}

            {/* LISTA AGRUPADA POR DOCUMENTO */}
            {groupedAlunosExteriorByDoc.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <div className="italic text-slate-400">
                  {t.common.noInternationalStudents}
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-5 bg-slate-50/40">
                {groupedAlunosExteriorByDoc.map((group) => (
                  <div 
                    key={group.documento} 
                    className="bg-white border border-slate-200/90 rounded-xl shadow-2xs overflow-hidden"
                  >
                    {/* Cabeçalho do Grupo por Documento */}
                    <div className="px-5 py-3 bg-slate-100/70 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100 shadow-2xs">
                          <FileText size={15} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                            <span>{group.documento}</span>
                          </h4>
                          <p className="text-[11px] text-slate-400 font-medium">
                            {language === 'pt' ? 'Portaria / Documento de Autorização' : 'Authorization / Creation Document'}
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-full border border-indigo-200/60 shadow-2xs">
                        {group.alunos.length} {group.alunos.length === 1 ? (language === 'pt' ? 'aluno' : 'student') : (language === 'pt' ? 'alunos' : 'students')}
                      </span>
                    </div>

                    {/* Tabela de Alunos do Documento */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="text-[10px] font-bold text-slate-400 border-b border-slate-100 uppercase tracking-wider bg-slate-50/50">
                            <th className="px-6 py-3">{t.students.name}</th>
                            <th className="px-6 py-3">{t.dashboard.courseLocation}</th>
                            <th className="px-6 py-3">{language === 'pt' ? 'Documento' : 'Document'}</th>
                            <th className="px-6 py-3 text-center">{t.dashboard.startEnd}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-sm">
                          {group.alunos.map((aluno: any) => {
                            const turmaData = Array.isArray(aluno.turma) ? aluno.turma[0] : aluno.turma;
                            const curso = Array.isArray(turmaData?.curso) ? turmaData.curso[0] : turmaData?.curso;
                            const isPreInscrito = turmaData?.status?.toLowerCase() === 'pré-inscrito';
                            return (
                              <tr 
                                key={aluno.id} 
                                className="transition-colors cursor-pointer hover:bg-slate-50"
                                onClick={() => setSelectedAlunoForEdit(aluno)}
                              >
                                <td className="px-6 py-3.5">
                                  <div className="flex items-center gap-3">
                                    {aluno.foto_url ? (
                                      <div 
                                        className="w-11 h-14 rounded-lg overflow-hidden border border-slate-200 shrink-0 shadow-xs hover:scale-105 transition-transform cursor-pointer relative bg-slate-100 group"
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
                                          sizes="44px"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                          <LayersIcon size={13} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="w-11 h-14 rounded-lg overflow-hidden border border-slate-200 shrink-0 shadow-xs relative bg-slate-100">
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
                                          sizes="44px"
                                        />
                                      </div>
                                    )}
                                    <div>
                                      <div className={cn("font-bold text-xs sm:text-sm", isPreInscrito ? "text-red-600" : "text-slate-800")}>
                                        {aluno.posto_graduacao || aluno.nome_guerra ? `${aluno.posto_graduacao || ''} ${aluno.nome_guerra || aluno.nome}`.trim() : aluno.nome}
                                      </div>
                                      <div className="text-[10px] text-slate-400 font-mono uppercase">
                                        {aluno.om || '-'}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-3.5">
                                  <div className={cn("font-medium text-xs", isPreInscrito ? "text-red-500" : "text-slate-700")}>{curso?.nome || aluno.curso_nome || '-'}</div>
                                  <div className="text-[10px] text-slate-400 uppercase font-bold">{turmaData?.localizacao || '-'}</div>
                                </td>
                                <td className="px-6 py-3.5 text-slate-600 font-mono text-xs font-semibold">
                                  {turmaData?.documento_criacao || curso?.documento_criacao || aluno.documento_criacao || '-'}
                                </td>
                                <td className="px-6 py-3.5 text-center text-slate-600 font-mono text-xs">
                                  {turmaData?.internacional ? (
                                    <div className="flex flex-col items-center justify-center leading-tight">
                                      <span className={cn("font-bold whitespace-nowrap", isPreInscrito ? "text-red-600" : "text-slate-800")}>
                                        {aluno.data_inicio_curso?.trim() ? aluno.data_inicio_curso.split('-').reverse().join('/') : (turmaData?.data_inicio?.trim() ? turmaData.data_inicio.split('-').reverse().join('/') : '—')}
                                      </span>
                                      <span className="text-[9px] text-slate-400 font-sans uppercase font-extrabold my-0.5">a</span>
                                      <span className={cn("font-bold whitespace-nowrap", isPreInscrito ? "text-red-600" : "text-slate-800")}>
                                        {aluno.data_fim_curso?.trim() ? aluno.data_fim_curso.split('-').reverse().join('/') : (turmaData?.data_fim?.trim() ? turmaData.data_fim.split('-').reverse().join('/') : '—')}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-center justify-center leading-tight">
                                      <span className={cn("font-bold whitespace-nowrap", isPreInscrito ? "text-red-600" : "text-slate-800")}>
                                        {turmaData?.data_inicio ? turmaData.data_inicio.split('-').reverse().join('/') : '—'}
                                      </span>
                                      <span className="text-[9px] text-slate-400 font-sans uppercase font-extrabold my-0.5">a</span>
                                      <span className={cn("font-bold whitespace-nowrap", isPreInscrito ? "text-red-600" : "text-slate-800")}>
                                        {turmaData?.data_fim ? turmaData.data_fim.split('-').reverse().join('/') : '—'}
                                      </span>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* RODAPÉ COM CONTAGEM DE ALUNOS NO EXTERIOR DE ACORDO COM O FILTRO SELECIONADO - FUNDO BRANCO E LETRAS PRETAS */}
            <div className="p-4 sm:p-5 bg-white dark:bg-white border-t border-slate-200 dark:border-slate-200 text-slate-900 dark:text-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0 shadow-xs print:hidden">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-100 border border-slate-200 dark:border-slate-200 flex items-center justify-center text-slate-700 dark:text-slate-700 shrink-0 shadow-xs">
                  <GraduationCap size={22} className="text-slate-700 dark:text-slate-700" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-black tracking-tight text-slate-900 dark:text-slate-900 uppercase">
                      {language === 'pt' ? 'Total de Alunos no Exterior' : 'Total Students Abroad'}
                    </span>
                    {selectedDocumentoFilter !== 'all' ? (
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-100 text-slate-700 dark:text-slate-700 border border-slate-200 dark:border-slate-200 px-2 py-0.5 rounded-full font-bold">
                        {language === 'pt' ? 'Filtro Ativo' : 'Filtered'}
                      </span>
                    ) : (
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-100 text-slate-700 dark:text-slate-700 border border-slate-200 dark:border-slate-200 px-2 py-0.5 rounded-full font-bold">
                        {language === 'pt' ? 'Todos os Documentos' : 'All Documents'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-600 font-medium mt-0.5">
                    {selectedDocumentoFilter !== 'all' 
                      ? (language === 'pt' ? `Documento Selecionado: ${selectedDocumentoFilter}` : `Selected Document: ${selectedDocumentoFilter}`)
                      : (language === 'pt' ? `Distribuídos em ${availableDocumentosExterior.length} portarias/documentos oficiais` : `Distributed across ${availableDocumentosExterior.length} official documents`)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-center bg-slate-50 dark:bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-200">
                <div className="text-right">
                  <div className="text-[10px] text-slate-500 dark:text-slate-500 font-black uppercase tracking-wider">
                    {language === 'pt' ? 'Quantidade de Alunos' : 'Student Count'}
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-900 leading-none">
                    {totalFilteredAlunosExterior}
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-600 ml-1.5">
                      {totalFilteredAlunosExterior === 1 ? (language === 'pt' ? 'aluno' : 'student') : (language === 'pt' ? 'alunos' : 'students')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
          </motion.div>
        )}


        {isCategoryVisible('expedito') && (
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
              onSelectStudent={setSelectedAlunoForEdit}
              onExpandPhoto={setExpandedPhoto}
            />
          </motion.div>
        )}

        {isCategoryVisible('carreira') && (
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
              onSelectStudent={setSelectedAlunoForEdit}
              onExpandPhoto={setExpandedPhoto}
            />
          </motion.div>
        )}

        {isCategoryVisible('especial') && (
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
              onSelectStudent={setSelectedAlunoForEdit}
              onExpandPhoto={setExpandedPhoto}
            />
          </motion.div>
        )}

        {isCategoryVisible('ead') && (
          <motion.div
            key="ead"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
          >
            <TurmasListTable 
              turmas={turmasEadList} 
              title={t.dashboard.turmasEad || (isPt ? 'Turmas de Cursos EaD' : 'EaD Course Classes')} 
              onDelete={handleDeleteTurma}
              selectedCard="ead"
              highlightedTurmaId={highlightedTurmaId}
              onSelectStudent={setSelectedAlunoForEdit}
              onExpandPhoto={setExpandedPhoto}
            />
          </motion.div>
        )}

        {isCategoryVisible('pre_inscritos') && (
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
              onSelectStudent={setSelectedAlunoForEdit}
              onExpandPhoto={setExpandedPhoto}
            />
          </motion.div>
        )}

        {isCategoryVisible('arquivadas') && (
          <motion.div
            key="arquivadas"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
          >
            <TurmasListTable 
              turmas={turmasArquivadasList} 
              title={isPt ? 'Turmas Arquivadas' : 'Archived Classes'} 
              onDelete={handleDeleteTurma}
              selectedCard="arquivadas"
              highlightedTurmaId={highlightedTurmaId}
              onSelectStudent={setSelectedAlunoForEdit}
              onExpandPhoto={setExpandedPhoto}
            />
          </motion.div>
        )}
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
            <div className="flex items-center gap-6 mb-6 border-b-2 border-black pb-4">
              <div className="w-28 h-28 shrink-0 flex items-center justify-center">
                <img
                  src={typeof navalMissionLogo === 'string' ? navalMissionLogo : (navalMissionLogo as any)?.src || navalMissionLogo}
                  alt="Logo Missão de Assessoria Naval"
                  className="w-28 h-28 object-contain"
                  style={{ width: '112px', height: '112px' }}
                />
              </div>
              <div className="flex-1 text-left">
                <h1 className="text-base sm:text-lg font-extrabold uppercase tracking-tight text-slate-900">
                  {language === 'pt' ? 'MISSÃO DE ASSESSORIA NAVAL DO BRASIL EM SÃO TOMÉ E PRÍNCIPE' : 'NAVAL ADVISORY MISSION OF BRAZIL IN SÃO TOMÉ AND PRÍNCIPE'}
                </h1>
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800 mt-1">
                  {language === 'pt' ? 'RELAÇÃO DE ALUNOS NO EXTERIOR' : 'STUDENTS ABROAD ROSTER'}
                </h2>
                {selectedDocumentoFilter !== 'all' && (
                  <div className="text-[10px] font-semibold text-slate-700 mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    <span><strong>DOCUMENTO:</strong> {selectedDocumentoFilter.toUpperCase()}</span>
                    <span><strong>TOTAL:</strong> {totalFilteredAlunosExterior} ALUNO(S)</span>
                  </div>
                )}
              </div>
            </div>
            
            {groupedAlunosExteriorByDoc.length === 0 ? (
              <div className="p-4 text-center italic border border-black mb-4 text-black text-xs">
                {t.common.noInternationalStudents}
              </div>
            ) : (
              groupedAlunosExteriorByDoc.map((group, gIdx) => (
                <div key={`print-group-${group.documento}-${gIdx}`} className="mb-6">
                  <div className="bg-gray-200 border border-black px-3 py-1.5 font-bold text-xs uppercase flex items-center justify-between">
                    <span>DOCUMENTO / PORTARIA: {group.documento}</span>
                    <span>{group.alunos.length} {group.alunos.length === 1 ? 'ALUNO' : 'ALUNOS'}</span>
                  </div>
                  <table className="w-full text-left border-collapse border-x border-b border-black mb-2 text-black">
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
                      {group.alunos.map((aluno: any, idx: number) => {
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
                                {(() => {
                                  const cleanTurma = getCleanTurmaName(turmaData, curso?.nome, '');
                                  const location = turmaData?.localizacao || '-';
                                  if (cleanTurma && cleanTurma !== 'Turma Única') {
                                    return `${cleanTurma} • ${location}`;
                                  }
                                  return location;
                                })()}
                              </div>
                            </td>
                            <td className="p-2 border-r border-black align-middle text-center font-mono font-bold">
                              {turmaData?.documento_criacao || curso?.documento_criacao || aluno.documento_criacao || '-'}
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
                      })}
                    </tbody>
                  </table>
                </div>
              ))
            )}
            <div className="flex items-center justify-between text-[10px] font-bold border-t border-black pt-2 mt-1">
              <div>
                {language === 'pt' ? 'Total de Alunos Listados:' : 'Total Students Listed:'} <span className="font-black">{totalFilteredAlunosExterior}</span> {totalFilteredAlunosExterior === 1 ? (language === 'pt' ? 'aluno' : 'student') : (language === 'pt' ? 'alunos' : 'students')}
              </div>
              <div className="text-[9px] text-right font-semibold">
                {language === 'pt' ? 'Gerado em' : 'Generated on'} {new Date().toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US')}
              </div>
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

      <CombinedPrintModal
        isOpen={isCombinedPrintModalOpen}
        onClose={() => setIsCombinedPrintModalOpen(false)}
        selectedCategories={selectedCategories}
        onToggleCategory={handleToggleCategory}
        onSetCategories={handleSetCategories}
        dashboardData={dashboardData}
        isPt={isPt}
      />
    </div>
  );
}

function TurmasListTable({ 
  turmas, 
  title, 
  onDelete, 
  selectedCard,
  highlightedTurmaId,
  onSelectStudent,
  onExpandPhoto
}: { 
  turmas: any[], 
  title: string, 
  onDelete?: (id: string) => void, 
  selectedCard?: string,
  highlightedTurmaId?: string | null,
  onSelectStudent?: (student: any) => void,
  onExpandPhoto?: (photo: { url: string; name: string }) => void
}) {
  const { t, language } = useI18n();
  const { isAdmin } = useUser();
  const router = useRouter();
  const isPt = language === 'pt';

  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [activeHighlight, setActiveHighlight] = useState<string | null>(highlightedTurmaId || null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Multi-selection states for courses and turmas
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [selectedTurmas, setSelectedTurmas] = useState<string[]>([]);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState<boolean>(false);
  const [expandedTurmaIds, setExpandedTurmaIds] = useState<Set<string>>(new Set());

  // Helper to extract course name safely from any turma object structure
  const getCursoNome = useCallback((t: any): string => {
    if (!t) return '';
    const cObj = Array.isArray(t.curso) ? t.curso[0] : (t.curso && typeof t.curso === 'object' ? t.curso : null);
    const directName = cObj?.nome || t.curso_nome || t.nome_curso || t.cursoNome;
    if (typeof directName === 'string' && directName.trim()) {
      return directName.trim();
    }
    if (typeof t.curso === 'string' && t.curso.trim() && !t.curso.includes('-')) {
      return t.curso.trim();
    }
    if (t.nome && typeof t.nome === 'string') {
      return t.nome.trim();
    }
    return '';
  }, []);

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

  // Distinct courses available in this category
  const availableCourses = useMemo(() => {
    const map = new Map<string, { nome: string; count: number; totalAlunos: number }>();
    turmas.forEach((t) => {
      const cursoNome = getCursoNome(t);
      if (cursoNome) {
        const existingKey = Array.from(map.keys()).find(k => k.toLowerCase() === cursoNome.toLowerCase()) || cursoNome;
        const current = map.get(existingKey) || { nome: cursoNome, count: 0, totalAlunos: 0 };
        current.count += 1;
        current.totalAlunos += Number(t.alunos?.length ?? t.alunos_count ?? t.total_alunos ?? 0);
        map.set(existingKey, current);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [turmas, getCursoNome]);

  // Distinct turmas available (or filtered by selected courses if any)
  const availableTurmasOptions = useMemo(() => {
    const list = selectedCourses.length > 0
      ? turmas.filter((t) => {
          const cNome = getCursoNome(t);
          return selectedCourses.some((sc) => sc.trim().toLowerCase() === cNome.trim().toLowerCase());
        })
      : turmas;

    const map = new Map<string, { id: string; nome: string; cleanNome: string; cursoNome: string; alunosCount: number }>();
    list.forEach((t) => {
      if (t.id) {
        const cNome = getCursoNome(t);
        const cleanName = getCleanTurmaName(t, cNome, t.nome || 'Turma');
        map.set(String(t.id), {
          id: String(t.id),
          nome: t.nome || cleanName,
          cleanNome: cleanName,
          cursoNome: cNome,
          alunosCount: Number(t.alunos?.length ?? t.alunos_count ?? t.total_alunos ?? 0)
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [turmas, selectedCourses, getCursoNome]);

  // Handlers for toggling multi-selection
  const toggleCourseFilter = (courseName: string) => {
    setSelectedCourses((prev) => {
      const isSelected = prev.some((c) => c.toLowerCase() === courseName.toLowerCase());
      const next = isSelected 
        ? prev.filter((c) => c.toLowerCase() !== courseName.toLowerCase()) 
        : [...prev, courseName];
      
      // Auto clean selectedTurmas that don't belong to the updated selected courses
      if (next.length > 0) {
        setSelectedTurmas((prevTurmas) =>
          prevTurmas.filter((tId) => {
            const turmaObj = turmas.find((t) => String(t.id) === String(tId));
            if (!turmaObj) return false;
            const cNome = getCursoNome(turmaObj);
            return next.some((sc) => sc.toLowerCase() === cNome.toLowerCase());
          })
        );
      }
      return next;
    });
    setCurrentPage(1);
  };

  const toggleTurmaFilter = (turmaId: string) => {
    setSelectedTurmas((prev) => {
      const targetId = String(turmaId);
      const next = prev.some((id) => String(id) === targetId) 
        ? prev.filter((id) => String(id) !== targetId) 
        : [...prev, targetId];
      return next;
    });
    setCurrentPage(1);
  };

  const clearAllMultiFilters = () => {
    setSelectedCourses([]);
    setSelectedTurmas([]);
    setSearchTerm('');
    setCurrentPage(1);
  };

  const toggleTurmaExpansion = (turmaId: string) => {
    setExpandedTurmaIds((prev) => {
      const next = new Set(prev);
      const idStr = String(turmaId);
      if (next.has(idStr)) {
        next.delete(idStr);
      } else {
        next.add(idStr);
      }
      return next;
    });
  };

  const toggleAllExpansions = () => {
    if (expandedTurmaIds.size > 0) {
      setExpandedTurmaIds(new Set());
    } else {
      const allIds = new Set<string>(filteredTurmas.map((t) => String(t.id)).filter(Boolean));
      setExpandedTurmaIds(allIds);
    }
  };

  const hasActiveMultiFilters = selectedCourses.length > 0 || selectedTurmas.length > 0 || searchTerm.trim().length > 0;

  // Filter turmas based on search term and combined multi-selection of Courses AND Turmas
  const filteredTurmas = useMemo(() => {
    let result = turmas;

    // Filter by selected courses (OR among selected courses)
    if (selectedCourses.length > 0) {
      result = result.filter((t) => {
        const cNome = getCursoNome(t);
        return selectedCourses.some((sc) => sc.trim().toLowerCase() === cNome.trim().toLowerCase());
      });
    }

    // Filter by selected turmas (OR among selected turmas)
    if (selectedTurmas.length > 0) {
      result = result.filter((t) => selectedTurmas.some((st) => String(st).trim() === String(t.id).trim()));
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter((t) => {
        const cNome = getCursoNome(t);
        const nomeTurma = (t.nome || '').toLowerCase();
        const nomeCurso = (cNome || '').toLowerCase();
        const categoria = (t.curso?.categoria || t.categoria || '').toLowerCase();
        const instrutor = (t.instrutor || '').toLowerCase();
        const localizacao = (t.localizacao || '').toLowerCase();
        const doc = (t.documento_criacao || t.curso?.documento_criacao || '').toLowerCase();
        const ano = (t.ano || '').toString().toLowerCase();
        const grupo = (t.grupo_responsavel || t.curso?.grupo_responsavel || '').toLowerCase();
        const studentsMatch = Array.isArray(t.alunos) && t.alunos.some((al: any) => {
          const sName = (al.nome || al.nome_guerra || '').toLowerCase();
          const sOm = (al.om || '').toLowerCase();
          return sName.includes(term) || sOm.includes(term);
        });

        return (
          nomeTurma.includes(term) ||
          nomeCurso.includes(term) ||
          categoria.includes(term) ||
          instrutor.includes(term) ||
          localizacao.includes(term) ||
          doc.includes(term) ||
          ano.includes(term) ||
          grupo.includes(term) ||
          studentsMatch
        );
      });
    }

    return result;
  }, [turmas, selectedCourses, selectedTurmas, searchTerm, getCursoNome]);

  // Total student count across all filtered turmas
  const totalFilteredAlunos = useMemo(() => {
    return filteredTurmas.reduce((acc, t) => {
      const count = Number(t.alunos?.length ?? t.alunos_count ?? t.total_alunos ?? 0);
      return acc + (isNaN(count) ? 0 : count);
    }, 0);
  }, [filteredTurmas]);

  const totalFilteredTurmas = filteredTurmas.length;

  // Ensure pagination is automatically on the page that contains the highlighted class
  useEffect(() => {
    if (highlightedTurmaId && filteredTurmas.length > 0) {
      setActiveHighlight(highlightedTurmaId);
      const targetIndex = filteredTurmas.findIndex(t => String(t.id) === String(highlightedTurmaId));
      if (targetIndex !== -1) {
        const targetPage = Math.floor(targetIndex / itemsPerPage) + 1;
        setCurrentPage(targetPage);
      }
    }
  }, [highlightedTurmaId, filteredTurmas, itemsPerPage]);

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

  const totalItems = filteredTurmas.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedTurmas = filteredTurmas.slice(startIndex, endIndex);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
      {/* Header com Título, Contadores e Busca */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            {selectedCard === 'arquivadas' ? (
              <Archive size={16} className="text-slate-500" />
            ) : (
              <BookOpen size={16} className="text-slate-400" />
            )}
            {title}
          </h3>
          <span className="text-xs text-slate-600 font-bold bg-slate-100 px-3 py-1 rounded-full border border-slate-200/50">
            {totalFilteredTurmas} {totalFilteredTurmas === 1 ? (isPt ? 'Turma' : 'Class') : (isPt ? 'Turmas' : 'Classes')}
          </span>
          <span className="text-xs text-indigo-700 font-bold bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 flex items-center gap-1.5 shadow-2xs">
            <Users size={13} className="text-indigo-600" />
            {totalFilteredAlunos} {totalFilteredAlunos === 1 ? (isPt ? 'Aluno' : 'Student') : (isPt ? 'Alunos' : 'Students')}
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
          {/* Botão para Expandir/Recolher todos os Alunos das Turmas */}
          <button
            type="button"
            onClick={toggleAllExpansions}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-2xs border bg-white hover:bg-slate-100 text-slate-700 border-slate-200 cursor-pointer shrink-0"
            title={expandedTurmaIds.size > 0 ? (isPt ? 'Recolher relação nominal' : 'Collapse nominal rosters') : (isPt ? 'Expandir todos os alunos na tela' : 'Expand all students on screen')}
          >
            <Users size={13} className="text-indigo-600" />
            <span>
              {expandedTurmaIds.size > 0 
                ? (isPt ? 'Recolher Alunos' : 'Collapse Rosters') 
                : (isPt ? 'Listar Alunos na Tela' : 'List Students on Screen')}
            </span>
          </button>

          {/* Botão de Expansão dos Filtros Combinados de Cursos e Turmas */}
          <button
            type="button"
            onClick={() => setIsFilterPanelOpen((prev) => !prev)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-2xs border shrink-0 cursor-pointer",
              hasActiveMultiFilters
                ? "bg-indigo-600 text-white border-indigo-700 shadow-indigo-200"
                : isFilterPanelOpen
                ? "bg-slate-200 text-slate-800 border-slate-300"
                : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
            )}
          >
            <Filter size={13} />
            <span>{isPt ? 'Filtro Combinado' : 'Combined Filters'}</span>
            {hasActiveMultiFilters && (
              <span className="w-5 h-5 rounded-full bg-white text-indigo-700 text-[10px] font-black flex items-center justify-center ml-0.5">
                {selectedCourses.length + selectedTurmas.length}
              </span>
            )}
            <ChevronDown
              size={13}
              className={cn("transition-transform duration-200", isFilterPanelOpen ? "rotate-180" : "")}
            />
          </button>

          {/* Campo de Busca Rápida na Tabela */}
          <div className="w-full sm:w-56 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={isPt ? "Buscar aluno, curso, OM..." : "Search student, class, OM..."}
              className="w-full pl-9 pr-8 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-2xs"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* PAINEL DE FILTROS COMBINADOS: MULTI-CURSOS & MULTI-TURMAS */}
      <AnimatePresence>
        {isFilterPanelOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-b border-slate-200 bg-slate-50/90 p-4 space-y-4 overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/70">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-md bg-indigo-100 text-indigo-700 text-xs font-bold">
                  <FolderTree size={14} />
                </span>
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
                  {isPt ? 'Caixa de Seleção Combinada (Cursos e Turmas simultaneamente)' : 'Combined Selection (Courses & Classes simultaneously)'}
                </span>
              </div>
              {hasActiveMultiFilters && (
                <button
                  type="button"
                  onClick={clearAllMultiFilters}
                  className="flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-md transition cursor-pointer self-start sm:self-auto"
                >
                  <RotateCcw size={11} />
                  <span>{isPt ? 'Limpar Todos os Filtros' : 'Clear All Filters'}</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* SEÇÃO DE CURSOS (MÚLTIPLA ESCOLHA) */}
              <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <BookMarked size={14} className="text-indigo-600" />
                    <span>{isPt ? 'Cursos Disponíveis' : 'Available Courses'}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({availableCourses.length})</span>
                  </div>
                  {selectedCourses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedCourses([])}
                      className="text-[10px] font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
                    >
                      {isPt ? 'Desmarcar todos' : 'Uncheck all'}
                    </button>
                  )}
                </div>

                {availableCourses.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-1">{isPt ? 'Nenhum curso disponível nesta categoria.' : 'No courses available in this category.'}</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                    {availableCourses.map((c) => {
                      const isSelected = selectedCourses.includes(c.nome);
                      return (
                        <button
                          key={`filter-curso-${c.nome}`}
                          type="button"
                          onClick={() => toggleCourseFilter(c.nome)}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border text-left",
                            isSelected
                              ? "bg-indigo-600 text-white border-indigo-700 shadow-xs"
                              : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                          )}
                        >
                          <span className={cn(
                            "w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] border transition-colors shrink-0",
                            isSelected ? "bg-white text-indigo-600 border-white" : "border-slate-300 bg-white"
                          )}>
                            {isSelected && <Check size={10} strokeWidth={3} />}
                          </span>
                          <span className="truncate max-w-[200px]">{c.nome}</span>
                          <span className={cn("text-[10px] font-bold px-1 rounded", isSelected ? "bg-indigo-700 text-indigo-100" : "bg-slate-200 text-slate-600")}>
                            {c.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SEÇÃO DE TURMAS (MÚLTIPLA ESCOLHA) */}
              <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <LayoutGrid size={14} className="text-indigo-600" />
                    <span>{isPt ? 'Turmas Correspondentes' : 'Matching Classes'}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({availableTurmasOptions.length})</span>
                  </div>
                  {selectedTurmas.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedTurmas([])}
                      className="text-[10px] font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
                    >
                      {isPt ? 'Desmarcar todas' : 'Uncheck all'}
                    </button>
                  )}
                </div>

                {availableTurmasOptions.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-1">
                    {selectedCourses.length > 0 
                      ? (isPt ? 'Nenhuma turma encontrada para os cursos selecionados.' : 'No classes found for the selected courses.')
                      : (isPt ? 'Nenhuma turma disponível nesta categoria.' : 'No classes available in this category.')}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                    {availableTurmasOptions.map((t) => {
                      const isSelected = selectedTurmas.includes(t.id);
                      return (
                        <button
                          key={`filter-turma-${t.id}`}
                          type="button"
                          onClick={() => toggleTurmaFilter(t.id)}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border text-left",
                            isSelected
                              ? "bg-indigo-600 text-white border-indigo-700 shadow-xs"
                              : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                          )}
                        >
                          <span className={cn(
                            "w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] border transition-colors shrink-0",
                            isSelected ? "bg-white text-indigo-600 border-white" : "border-slate-300 bg-white"
                          )}>
                            {isSelected && <Check size={10} strokeWidth={3} />}
                          </span>
                          <span className="truncate max-w-[220px]">{t.cleanNome}</span>
                          <span className={cn("text-[10px] font-bold px-1 rounded", isSelected ? "bg-indigo-700 text-indigo-100" : "bg-slate-200 text-slate-600")}>
                            {t.alunosCount}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* BARRA DE RESUMO DAS SELEÇÕES ATIVAS */}
            {hasActiveMultiFilters && (
              <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
                <span className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                  {isPt ? 'Filtros ativos:' : 'Active filters:'}
                </span>
                {selectedCourses.map((c) => (
                  <span
                    key={`pill-active-c-${c}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 border border-indigo-200 font-semibold text-[11px]"
                  >
                    <BookMarked size={11} className="text-indigo-600" />
                    <span className="truncate max-w-[150px]">{c}</span>
                    <button
                      type="button"
                      onClick={() => toggleCourseFilter(c)}
                      className="hover:text-indigo-950 p-0.5 rounded-full"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
                {selectedTurmas.map((tid) => {
                  const tObj = availableTurmasOptions.find((o) => o.id === tid) || turmas.find((o) => o.id === tid);
                  return (
                    <span
                      key={`pill-active-t-${tid}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200 font-semibold text-[11px]"
                    >
                      <LayoutGrid size={11} className="text-blue-600" />
                      <span className="truncate max-w-[150px]">{tObj?.cleanNome || tObj?.nome || tid}</span>
                      <button
                        type="button"
                        onClick={() => toggleTurmaFilter(tid)}
                        className="hover:text-blue-950 p-0.5 rounded-full"
                      >
                        <X size={11} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* CHIPS RÁPIDOS DE FILTRAGEM (QUANDO O PAINEL ESTÁ FECHADO MAS HÁ SELEÇÃO) */}
      {!isFilterPanelOpen && hasActiveMultiFilters && (
        <div className="px-4 py-2 bg-indigo-50/50 border-b border-indigo-100 flex items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-indigo-800 font-bold text-[11px] flex items-center gap-1">
              <Filter size={11} />
              {isPt ? 'Filtrando por:' : 'Filtered by:'}
            </span>
            {selectedCourses.map((c) => (
              <span
                key={`chip-c-${c}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-800 font-semibold text-[11px] shadow-2xs"
              >
                <span>Curso: {c}</span>
                <button
                  type="button"
                  onClick={() => toggleCourseFilter(c)}
                  className="hover:text-red-600"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
            {selectedTurmas.map((tid) => {
              const tObj = availableTurmasOptions.find((o) => o.id === tid) || turmas.find((o) => o.id === tid);
              return (
                <span
                  key={`chip-t-${tid}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-blue-200 text-blue-800 font-semibold text-[11px] shadow-2xs"
                >
                  <span>Turma: {tObj?.cleanNome || tObj?.nome || tid}</span>
                  <button
                    type="button"
                    onClick={() => toggleTurmaFilter(tid)}
                    className="hover:text-red-600"
                  >
                    <X size={10} />
                  </button>
                </span>
              );
            })}
          </div>

          <button
            type="button"
            onClick={clearAllMultiFilters}
            className="text-[11px] font-bold text-red-600 hover:text-red-700 transition cursor-pointer shrink-0"
          >
            {isPt ? 'Limpar Filtros' : 'Clear Filters'}
          </button>
        </div>
      )}

      {/* TABELA DE TURMAS E LISTA NOMINAL DE ALUNOS */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-[10px] font-bold text-slate-400 border-b border-slate-100 uppercase tracking-wider bg-slate-50/40">
              <th className="px-6 py-4">{isPt ? 'Identificador da Turma' : 'Class Identifier'}</th>
              <th className="px-6 py-4">{isPt ? 'Curso / Categoria' : 'Course Name / Category'}</th>
              <th className="px-6 py-4">{isPt ? 'Localização / Período' : 'Location / Period'}</th>
              <th className="px-6 py-4 text-center">{isPt ? 'Alunos / Capacidade' : 'Students / Capacity'}</th>
              <th className="px-6 py-4">{isPt ? 'Instrutor Responsável' : 'Responsible Instructor'}</th>
              <th className="px-6 py-4 text-right">{isPt ? 'Ações' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-sm">
            {filteredTurmas.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-slate-400 italic font-medium">
                  {searchTerm || hasActiveMultiFilters
                    ? (isPt ? 'Nenhuma turma encontrada para a combinação de filtros selecionada.' : 'No classes found for the selected filter combination.')
                    : (isPt ? 'Nenhuma turma ativa encontrada para esta categoria.' : 'No active classes found for this category.')}
                </td>
              </tr>
            ) : (
              paginatedTurmas.map((turma) => {
                const statusLower = (turma.status || 'ativa').toString().toLowerCase().trim();
                const isArquivada = Boolean(turma.arquivada) === true || statusLower === 'arquivada' || statusLower === 'arquivado';
                const isPreInscrito = !isArquivada && (statusLower === 'pré-inscrito(a)(s)' || statusLower === 'pre-inscrito' || statusLower === 'pre_inscrito' || (statusLower === 'ativa' && turma.ativa === false));
                const isHighlighted = turma.id === activeHighlight;
                const cursoNome = getCursoNome(turma);
                const cleanName = getCleanTurmaName(turma, cursoNome, turma.nome || 'Turma');
                const alunoCount = Number(turma.alunos?.length ?? turma.alunos_count ?? turma.total_alunos ?? 0);
                const capacidadeMax = Number(turma.capacidade_max || 40);
                const isExpanded = expandedTurmaIds.has(turma.id);
                const turmaAlunos: any[] = Array.isArray(turma.alunos) ? turma.alunos : [];

                return (
                  <React.Fragment key={turma.id}>
                    <tr 
                      id={`turma-row-${turma.id}`}
                      tabIndex={0}
                      className={cn(
                        "transition-all duration-300 outline-none",
                        isHighlighted
                          ? "bg-amber-50/90 ring-2 ring-amber-500 ring-offset-2 shadow-md scale-[1.003]"
                          : isExpanded
                          ? "bg-indigo-50/30"
                          : "hover:bg-slate-50 focus:bg-slate-50 focus:ring-1 focus:ring-blue-400"
                      )}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {isHighlighted && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-amber-500 text-white px-2 py-0.5 rounded-full shadow-xs animate-bounce">
                              👉 Turma Escolhida
                            </span>
                          )}
                          <div className={cn("font-bold", isArquivada ? "text-slate-600" : isPreInscrito ? "text-red-600" : "text-slate-800")}>
                            {cleanName}
                          </div>
                        </div>
                        <div className={cn("text-[10px] font-mono uppercase", isArquivada ? "text-slate-400" : isPreInscrito ? "text-red-500" : "text-slate-400")}>
                          ANO: {turma.ano || '-'} {turma.grupo_responsavel ? `• GRUPO: ${turma.grupo_responsavel}` : ''}
                        </div>
                        {turma.documento_criacao && (
                          <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                            Doc: {turma.documento_criacao}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className={cn("font-semibold", isArquivada ? "text-slate-600" : isPreInscrito ? "text-red-600" : "text-slate-700")}>
                          {cursoNome || '-'}
                        </div>
                        <div className="text-[10px] text-slate-400 uppercase font-black tracking-wider">
                          {turma.curso?.categoria || turma.categoria || '-'}
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
                        <div className="flex flex-col items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => toggleTurmaExpansion(turma.id)}
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer border shadow-2xs",
                              isExpanded
                                ? "bg-indigo-600 text-white border-indigo-700"
                                : "text-indigo-700 bg-indigo-50 border-indigo-100 hover:bg-indigo-100"
                            )}
                            title={isExpanded ? (isPt ? "Recolher alunos" : "Collapse students") : (isPt ? "Ver relação nominal de alunos" : "View student roster")}
                          >
                            <Users size={12} className={isExpanded ? "text-white" : "text-indigo-600"} />
                            <span>{alunoCount}</span>
                            <span className="font-medium">{alunoCount === 1 ? (isPt ? 'aluno' : 'student') : (isPt ? 'alunos' : 'students')}</span>
                            <ChevronDown size={11} className={cn("transition-transform duration-200", isExpanded ? "rotate-180" : "")} />
                          </button>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {capacidadeMax} {isPt ? 'vagas' : 'seats'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={cn("font-medium", isArquivada ? "text-slate-600" : isPreInscrito ? "text-red-600" : "text-slate-650")}>{turma.instrutor || '-'}</div>
                        <div className={cn(
                          "text-[10px] font-bold uppercase flex items-center gap-1 mt-0.5", 
                          isArquivada ? "text-slate-500" : isPreInscrito ? "text-red-600" : "text-green-600"
                        )}>
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full", 
                            isArquivada ? "bg-slate-400" : isPreInscrito ? "bg-red-500 animate-pulse" : "bg-green-500 animate-pulse"
                          )} />
                          {isArquivada ? (isPt ? 'Turma Arquivada' : 'Archived Class') : isPreInscrito ? (isPt ? 'Pré-inscrita' : 'Pre-registered') : `Class ${turma.status || 'ativa'}`}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              router.push(`/turmas?action=view-students&turmaId=${turma.id}&returnTo=dashboard&card=${selectedCard || 'expedito'}`);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer border border-slate-200/60"
                            title={isPt ? "Abrir Gestão da Turma" : "Manage Class"}
                          >
                            {isPt ? 'Gerenciar' : 'Manage'}
                          </button>

                          {isAdmin && onDelete && (
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
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* RELAÇÃO NOMINAL DE ALUNOS EXPANDIDA NA TELA */}
                    {isExpanded && (
                      <tr className="bg-slate-50/80 border-b-2 border-indigo-200">
                        <td colSpan={6} className="p-4 sm:p-5">
                          <div className="bg-white rounded-xl border border-indigo-100 p-4 shadow-sm space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                              <div className="flex items-center gap-2">
                                <Users size={15} className="text-indigo-600" />
                                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
                                  {isPt ? `Relação Nominal de Alunos — ${cleanName}` : `Nominal Student Roster — ${cleanName}`}
                                </span>
                                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                                  {turmaAlunos.length} {isPt ? 'matriculados' : 'enrolled'}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  router.push(`/turmas?action=view-students&turmaId=${turma.id}&returnTo=dashboard&card=${selectedCard || 'expedito'}`);
                                }}
                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                              >
                                <span>{isPt ? 'Editar / Adicionar Alunos nesta turma' : 'Edit / Add Students'}</span>
                                <ArrowRight size={12} />
                              </button>
                            </div>

                            {turmaAlunos.length === 0 ? (
                              <p className="text-xs text-slate-400 italic py-2">
                                {isPt ? 'Nenhum aluno matriculado nesta turma até o momento.' : 'No students enrolled in this class yet.'}
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                                {turmaAlunos.map((aluno: any, alIdx: number) => {
                                  const photoSrc = aluno.foto_url ||
                                    (aluno.tipo_aluno === 'civil'
                                      ? (aluno.genero === 'feminino' ? femaleAvatar : maleAvatar)
                                      : (aluno.genero === 'feminino' ? militaryFemaleAvatar : militaryMaleAvatar));
                                  const photoUrl = typeof photoSrc === 'string' ? photoSrc : (photoSrc?.src || '');
                                  const displayName = aluno.posto_graduacao || aluno.nome_guerra
                                    ? `${aluno.posto_graduacao || ''} ${aluno.nome_guerra || aluno.nome}`.trim()
                                    : aluno.nome;

                                  return (
                                    <div
                                      key={`screen-aluno-${aluno.id || alIdx}`}
                                      onClick={() => onSelectStudent && onSelectStudent(aluno)}
                                      className="p-2 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-indigo-50/60 hover:border-indigo-300 transition flex items-center gap-2.5 cursor-pointer group shadow-2xs"
                                    >
                                      <div
                                        onClick={(e) => {
                                          if (onExpandPhoto && aluno.foto_url) {
                                            e.stopPropagation();
                                            onExpandPhoto({ url: aluno.foto_url, name: displayName });
                                          }
                                        }}
                                        className="w-9 h-11 rounded-md overflow-hidden bg-slate-200 border border-slate-300 shrink-0 relative group/photo"
                                        title={isPt ? "Clique para ampliar foto" : "Click to enlarge photo"}
                                      >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={photoUrl} alt={displayName} className="w-full h-full object-cover" />
                                        {aluno.foto_url && (
                                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/photo:opacity-100 flex items-center justify-center transition">
                                            <Maximize2 size={10} className="text-white" />
                                          </div>
                                        )}
                                      </div>

                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1">
                                          <span className="font-mono text-[10px] font-bold text-slate-400">{alIdx + 1}.</span>
                                          <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-900 truncate leading-tight">
                                            {displayName}
                                          </p>
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                                          {aluno.om ? `${aluno.om}` : (aluno.tipo_aluno ? `Tipo: ${aluno.tipo_aluno}` : 'Aluno')}
                                        </p>
                                        {(aluno.data_inicio_curso || aluno.data_fim_curso) && (
                                          <p className="text-[9px] text-blue-600 font-medium truncate">
                                            {aluno.data_inicio_curso ? aluno.data_inicio_curso.split('-').reverse().join('/') : ''}
                                            {aluno.data_fim_curso ? ` a ${aluno.data_fim_curso.split('-').reverse().join('/')}` : ''}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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

      {/* RODAPÉ COM CONTAGEM TOTAL DE ALUNOS E TURMAS DE ACORDO COM O FILTRO SELECIONADO - FUNDO BRANCO E LETRAS PRETAS */}
      <div className="p-4 sm:p-5 bg-white dark:bg-white border-t border-slate-200 dark:border-slate-200 text-slate-900 dark:text-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-100 border border-slate-200 dark:border-slate-200 flex items-center justify-center text-slate-700 dark:text-slate-700 shrink-0 shadow-xs">
            <Users size={22} className="text-slate-700 dark:text-slate-700" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-black tracking-tight text-slate-900 dark:text-slate-900 uppercase">
                {isPt ? 'Contagem Total de Alunos no Filtro' : 'Total Students in Filter'}
              </span>
              <span className="text-[10px] bg-slate-100 dark:bg-slate-100 text-slate-700 dark:text-slate-700 border border-slate-200 dark:border-slate-200 px-2.5 py-0.5 rounded-full font-bold">
                {title}
              </span>
              {hasActiveMultiFilters && (
                <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-bold">
                  {isPt ? 'Filtro Combinado Ativo' : 'Combined Filter Active'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-600 font-medium mt-0.5">
              {isPt 
                ? `Total de alunos matriculados nas ${totalFilteredTurmas} turmas selecionadas` 
                : `Total enrolled students across the ${totalFilteredTurmas} selected classes`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6 self-end sm:self-center bg-slate-50 dark:bg-slate-50 px-4 sm:px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-200">
          <div className="text-right">
            <div className="text-[10px] text-slate-500 dark:text-slate-500 font-black uppercase tracking-wider">
              {isPt ? 'Turmas' : 'Classes'}
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-900 leading-none">
              {totalFilteredTurmas}
            </div>
          </div>

          <div className="h-8 w-px bg-slate-200 dark:bg-slate-200" />

          <div className="text-right">
            <div className="text-[10px] text-slate-500 dark:text-slate-500 font-black uppercase tracking-wider">
              {isPt ? 'Total de Alunos' : 'Total Students'}
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-900 leading-none flex items-center gap-1.5 justify-end">
              <span>{totalFilteredAlunos}</span>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-600">
                {totalFilteredAlunos === 1 ? (isPt ? 'aluno' : 'student') : (isPt ? 'alunos' : 'students')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
