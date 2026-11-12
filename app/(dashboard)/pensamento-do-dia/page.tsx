'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { useUser } from '@/lib/auth/UserContext';
import { fetchWithAuth } from '@/lib/api';
import { cn } from '@/lib/utils';
import { 
  Quote, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Copy, 
  Check, 
  Heart, 
  Share2, 
  Printer, 
  RefreshCw, 
  Edit3, 
  Plus, 
  Search, 
  BookOpen, 
  Bookmark, 
  Compass, 
  Award, 
  ShieldCheck, 
  Filter, 
  SlidersHorizontal,
  Clock,
  Calendar,
  X,
  ExternalLink,
  ChevronRight,
  Lightbulb,
  Send,
  Loader2,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface ThoughtItem {
  id?: string;
  texto: string;
  autor: string;
  reflexao?: string;
  categoria?: string;
  data_exibicao?: string;
  created_at?: string;
  isDemo?: boolean;
}

const CATEGORIES = [
  { id: 'all', labelPt: 'Todos', labelEn: 'All', icon: Compass },
  { id: 'motivacional', labelPt: 'Superação & Motivação', labelEn: 'Motivation & Resilience', icon: Award },
  { id: 'estoico', labelPt: 'Estoicismo & Disciplina', labelEn: 'Stoicism & Discipline', icon: ShieldCheck },
  { id: 'filosofico', labelPt: 'Filosofia & Sabedoria', labelEn: 'Philosophy & Wisdom', icon: BookOpen },
  { id: 'religioso', labelPt: 'Fé & Espiritualidade', labelEn: 'Faith & Spirituality', icon: Lightbulb },
  { id: 'oriental', labelPt: 'Sabedoria Oriental', labelEn: 'Eastern Wisdom', icon: Sparkles },
  { id: 'lideranca', labelPt: 'Liderança & Espírito de Corpo', labelEn: 'Leadership & Comradery', icon: Compass },
  { id: 'gratidao', labelPt: 'Gratidão & Esperança', labelEn: 'Gratitude & Hope', icon: Heart },
];

export default function PensamentoDoDiaPage() {
  const { t, language } = useI18n();
  const { profile, isAdmin, isInstrutor } = useUser();
  const isPt = language === 'pt';
  const canManage = isAdmin || isInstrutor;

  // States
  const [todayThought, setTodayThought] = useState<ThoughtItem | null>(null);
  const [loadingToday, setLoadingToday] = useState(true);
  const [regeneratingToday, setRegeneratingToday] = useState(false);
  
  // Audio state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // History & Catalog states
  const [historyList, setHistoryList] = useState<ThoughtItem[]>([]);
  const [catalogList, setCatalogList] = useState<ThoughtItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // UI filter & tab
  const [activeTab, setActiveTab] = useState<'today' | 'archive' | 'ai_studio' | 'favorites'>('today');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Local favorites
  const [favorites, setFavorites] = useState<ThoughtItem[]>([]);

  // Custom modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [customTexto, setCustomTexto] = useState('');
  const [customAutor, setCustomAutor] = useState('');
  const [customReflexao, setCustomReflexao] = useState('');
  const [savingCustom, setSavingCustom] = useState(false);

  // AI Generator custom prompt
  const [aiTheme, setAiTheme] = useState('motivacional');
  const [customAiContext, setCustomAiContext] = useState('');
  const [generatingCustomAi, setGeneratingCustomAi] = useState(false);
  const [generatedAiQuote, setGeneratedAiQuote] = useState<ThoughtItem | null>(null);

  // Load favorites from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('user_favorite_thoughts');
      if (saved) {
        setFavorites(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed loading local favorites:', e);
    }
  }, []);

  const saveFavoritesToStorage = (updated: ThoughtItem[]) => {
    setFavorites(updated);
    try {
      localStorage.setItem('user_favorite_thoughts', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed saving favorites to localStorage:', e);
    }
  };

  const toggleFavorite = (item: ThoughtItem) => {
    const isFav = favorites.some(f => f.texto === item.texto);
    if (isFav) {
      const updated = favorites.filter(f => f.texto !== item.texto);
      saveFavoritesToStorage(updated);
      toast.info(isPt ? 'Removido dos favoritos' : 'Removed from favorites');
    } else {
      const updated = [item, ...favorites];
      saveFavoritesToStorage(updated);
      toast.success(isPt ? 'Adicionado aos favoritos!' : 'Saved to favorites!');
    }
  };

  // Fetch today's thought
  const fetchTodayThought = async (force: boolean = false) => {
    try {
      if (force) {
        setRegeneratingToday(true);
      } else {
        setLoadingToday(true);
      }
      const url = `/api/v1/pensamento-dia${force ? '?force=true' : ''}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json && json.data) {
        setTodayThought(json.data);
      }
    } catch (error) {
      console.error('Error fetching today thought:', error);
      toast.error(isPt ? 'Não foi possível carregar a reflexão.' : 'Could not load thought.');
    } finally {
      setLoadingToday(false);
      setRegeneratingToday(false);
    }
  };

  // Fetch history list
  const fetchHistoryAndCatalog = async () => {
    try {
      setLoadingHistory(true);
      const res = await fetch('/api/v1/pensamento-dia?history=true');
      const json = await res.json();
      if (json && json.success) {
        setHistoryList(json.data || []);
        setCatalogList(json.fallbacks || []);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchTodayThought();
    fetchHistoryAndCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Audio speech synthesis
  const toggleSpeechAudio = (thought: ThoughtItem) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      toast.error(isPt ? 'Leitura de voz não suportada neste navegador.' : 'Text-to-speech not supported on this browser.');
      return;
    }

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    window.speechSynthesis.cancel();

    const fullSpeechText = `${thought.texto}. Autor: ${thought.autor}.${thought.reflexao ? ` Reflexão prática: ${thought.reflexao}` : ''}`;
    const utterance = new SpeechSynthesisUtterance(fullSpeechText);
    utterance.lang = isPt ? 'pt-BR' : 'en-US';
    utterance.rate = 0.95; // gentle, inspiring pace
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsPlayingAudio(true);
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    speechUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // Copy to clipboard
  const handleCopy = (item: ThoughtItem, key: string) => {
    const textToCopy = `"${item.texto}"\n— ${item.autor}${item.reflexao ? `\n\nReflexão: ${item.reflexao}` : ''}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedId(key);
      toast.success(isPt ? 'Pensamento copiado!' : 'Quote copied!');
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  // Open Edit Modal for Today
  const handleOpenEditToday = () => {
    if (todayThought) {
      setCustomTexto(todayThought.texto);
      setCustomAutor(todayThought.autor);
      setCustomReflexao(todayThought.reflexao || '');
    } else {
      setCustomTexto('');
      setCustomAutor('');
      setCustomReflexao('');
    }
    setIsEditModalOpen(true);
  };

  // Save custom thought for today (Admin/Instructor)
  const handleSaveCustomToday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTexto.trim() || !customAutor.trim()) {
      toast.error(isPt ? 'Preencha o texto e o autor.' : 'Fill text and author.');
      return;
    }

    try {
      setSavingCustom(true);
      const res = await fetchWithAuth('/api/v1/pensamento-dia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texto: customTexto.trim(),
          autor: customAutor.trim(),
          reflexao: customReflexao.trim()
        })
      });

      const json = await res.json();
      if (json.success && json.data) {
        setTodayThought(json.data);
        setIsEditModalOpen(false);
        toast.success(isPt ? 'Pensamento do dia atualizado para toda a plataforma!' : 'Thought of the day updated!');
        fetchHistoryAndCatalog();
      } else {
        toast.error(json.error || (isPt ? 'Erro ao salvar pensamento.' : 'Error saving quote.'));
      }
    } catch (err: any) {
      console.error('Save custom thought error:', err);
      toast.error(err.message || 'Erro de comunicação');
    } finally {
      setSavingCustom(false);
    }
  };

  // Set any item directly as today's quote
  const handlePromoteToToday = async (item: ThoughtItem) => {
    if (!canManage) return;
    try {
      const toastId = toast.loading(isPt ? 'Definindo como pensamento de hoje...' : 'Setting as today\'s thought...');
      const res = await fetchWithAuth('/api/v1/pensamento-dia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texto: item.texto,
          autor: item.autor,
          reflexao: item.reflexao || ''
        })
      });
      toast.dismiss(toastId);
      const json = await res.json();
      if (json.success && json.data) {
        setTodayThought(json.data);
        toast.success(isPt ? 'Definido com sucesso como pensamento oficial de hoje!' : 'Set as today\'s official thought!');
        setActiveTab('today');
      } else {
        toast.error(json.error || 'Erro ao definir pensamento.');
      }
    } catch (err) {
      toast.error(isPt ? 'Erro ao comunicar com o servidor.' : 'Server connection error.');
    }
  };

  // Generate with custom category via AI Studio
  const handleGenerateAiThought = async () => {
    try {
      setGeneratingCustomAi(true);
      const queryParams = new URLSearchParams();
      queryParams.set('force', 'true');
      queryParams.set('category', aiTheme);
      
      const res = await fetch(`/api/v1/pensamento-dia?${queryParams.toString()}`);
      const json = await res.json();
      if (json && json.data) {
        setGeneratedAiQuote(json.data);
        toast.success(isPt ? 'Nova reflexão elaborada com sucesso!' : 'New reflection generated!');
      } else {
        toast.error(isPt ? 'Erro ao gerar reflexão.' : 'Generation failed.');
      }
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error(isPt ? 'Falha na conexão com IA.' : 'AI generation error.');
    } finally {
      setGeneratingCustomAi(false);
    }
  };

  // Delete a history thought (Admin only)
  const handleDeleteHistory = async (item: ThoughtItem) => {
    if (!isAdmin) return;
    if (!confirm(isPt ? 'Deseja realmente excluir este pensamento do histórico?' : 'Delete this thought from archive?')) {
      return;
    }

    try {
      const url = item.id 
        ? `/api/v1/pensamento-dia?id=${item.id}` 
        : `/api/v1/pensamento-dia?data_exibicao=${item.data_exibicao}`;
      const res = await fetchWithAuth(url, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        toast.success(isPt ? 'Registro excluído!' : 'Deleted!');
        fetchHistoryAndCatalog();
        if (todayThought?.id === item.id || todayThought?.data_exibicao === item.data_exibicao) {
          fetchTodayThought(true);
        }
      } else {
        toast.error(json.error || 'Erro ao excluir.');
      }
    } catch (err) {
      toast.error(isPt ? 'Erro ao excluir.' : 'Error deleting.');
    }
  };

  // Print card
  const handlePrintCard = () => {
    window.print();
  };

  // Filtered Archive List
  const combinedList = [...historyList, ...catalogList];
  // Deduplicate by texto
  const uniqueItems = Array.from(new Map(combinedList.map(item => [item.texto, item])).values());

  const filteredArchive = uniqueItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.categoria === selectedCategory;
    const matchesSearch = !searchQuery.trim() || 
      item.texto.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.autor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.reflexao && item.reflexao.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Current formatted date
  const formattedToday = new Intl.DateTimeFormat(isPt ? 'pt-BR' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
              <Quote size={20} className="rotate-180" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                {isPt ? 'Pensamento do Dia' : 'Thought of the Day'}
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50">
                  {isPt ? 'Inspiração Diária' : 'Daily Inspiration'}
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                {formattedToday}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {canManage && (
            <button
              onClick={handleOpenEditToday}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <Edit3 size={14} />
              <span>{isPt ? 'Editar Oficial' : 'Edit Official'}</span>
            </button>
          )}

          <button
            onClick={() => fetchTodayThought(true)}
            disabled={regeneratingToday || loadingToday}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 dark:hover:bg-amber-900/50 border border-amber-300/80 dark:border-amber-700/60 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            title={isPt ? 'Gerar nova sugestão de reflexão com IA' : 'Generate new reflection with AI'}
          >
            <RefreshCw size={14} className={cn(regeneratingToday && 'animate-spin text-amber-600')} />
            <span>{isPt ? 'Atualizar com IA' : 'Refresh with AI'}</span>
          </button>

          <button
            onClick={handlePrintCard}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs"
            title={isPt ? 'Imprimir ou exportar cartão' : 'Print or export card'}
          >
            <Printer size={14} />
            <span className="hidden sm:inline">{isPt ? 'Imprimir' : 'Print'}</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto custom-scrollbar pb-1">
        <button
          onClick={() => setActiveTab('today')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border",
            activeTab === 'today'
              ? "bg-amber-500 text-white border-amber-600 shadow-xs shadow-amber-500/20"
              : "bg-transparent text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800"
          )}
        >
          <Quote size={14} />
          <span>{isPt ? 'Reflexão de Hoje' : 'Today\'s Reflection'}</span>
        </button>

        <button
          onClick={() => setActiveTab('ai_studio')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border",
            activeTab === 'ai_studio'
              ? "bg-indigo-600 text-white border-indigo-700 shadow-xs shadow-indigo-600/20"
              : "bg-transparent text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800"
          )}
        >
          <Sparkles size={14} />
          <span>{isPt ? 'Gerador Temático IA' : 'AI Theme Explorer'}</span>
        </button>

        <button
          onClick={() => setActiveTab('archive')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border",
            activeTab === 'archive'
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs"
              : "bg-transparent text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800"
          )}
        >
          <BookOpen size={14} />
          <span>{isPt ? 'Biblioteca de Sabedoria' : 'Wisdom Archive'}</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 font-mono">
            {uniqueItems.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('favorites')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border",
            activeTab === 'favorites'
              ? "bg-rose-500 text-white border-rose-600 shadow-xs shadow-rose-500/20"
              : "bg-transparent text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800"
          )}
        >
          <Heart size={14} className={favorites.length > 0 ? "fill-white" : ""} />
          <span>{isPt ? 'Meus Favoritos' : 'My Favorites'}</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 font-mono">
            {favorites.length}
          </span>
        </button>
      </div>

      {/* TAB 1: TODAY'S THOUGHT HERO CARD */}
      {activeTab === 'today' && (
        <div className="space-y-6">
          {loadingToday ? (
            <div className="p-16 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col items-center justify-center gap-4 text-center">
              <Loader2 size={36} className="animate-spin text-amber-500" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                {isPt ? 'Carregando a reflexão do dia...' : 'Loading today\'s reflection...'}
              </p>
            </div>
          ) : todayThought ? (
            <div className="space-y-6">
              {/* Grand Hero Card */}
              <div 
                id="printable-thought-card"
                className="relative overflow-hidden rounded-3xl border border-amber-200/80 dark:border-amber-900/40 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950 p-6 sm:p-10 shadow-lg shadow-amber-500/5"
              >
                {/* Decorative watermarks and glows */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />
                
                <div className="relative z-10 flex flex-col gap-6">
                  {/* Card Header Info */}
                  <div className="flex items-center justify-between flex-wrap gap-3 border-b border-amber-200/60 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800">
                        <Sparkles size={12} className="text-amber-600 dark:text-amber-400" />
                        {isPt ? 'Pensamento Oficial de Hoje' : 'Official Thought for Today'}
                      </span>
                      {todayThought.data_exibicao && (
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Calendar size={13} />
                          {todayThought.data_exibicao}
                        </span>
                      )}
                    </div>

                    {/* Quick controls */}
                    <div className="flex items-center gap-1.5">
                      {/* Audio read-aloud button */}
                      <button
                        onClick={() => toggleSpeechAudio(todayThought)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs border",
                          isPlayingAudio 
                            ? "bg-amber-500 text-white border-amber-600 animate-pulse" 
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-slate-700"
                        )}
                        title={isPlayingAudio ? (isPt ? 'Pausar áudio' : 'Pause audio') : (isPt ? 'Ouvir reflexão' : 'Listen to reflection')}
                      >
                        {isPlayingAudio ? <VolumeX size={14} /> : <Volume2 size={14} className="text-amber-500" />}
                        <span>{isPlayingAudio ? (isPt ? 'Pausar' : 'Stop') : (isPt ? 'Ouvir' : 'Listen')}</span>
                      </button>

                      {/* Favorite Button */}
                      <button
                        onClick={() => toggleFavorite(todayThought)}
                        className={cn(
                          "p-2 rounded-xl text-xs transition-all cursor-pointer border shadow-2xs",
                          favorites.some(f => f.texto === todayThought.texto)
                            ? "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/60 dark:border-rose-900"
                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:text-rose-500"
                        )}
                        title={isPt ? 'Favoritar pensamento' : 'Save to favorites'}
                      >
                        <Heart size={14} className={favorites.some(f => f.texto === todayThought.texto) ? "fill-rose-500" : ""} />
                      </button>

                      {/* Copy Button */}
                      <button
                        onClick={() => handleCopy(todayThought, 'today-card')}
                        className="p-2 rounded-xl text-xs bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-2xs"
                        title={isPt ? 'Copiar texto' : 'Copy quote'}
                      >
                        {copiedId === 'today-card' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* The Quote Body */}
                  <div className="relative py-4 sm:py-6">
                    <Quote size={48} className="text-amber-400/20 absolute -top-4 -left-2 rotate-180 pointer-events-none" />
                    <blockquote className="text-xl sm:text-2xl md:text-3xl font-serif italic text-slate-900 dark:text-slate-50 font-normal leading-relaxed tracking-wide sm:px-6">
                      &ldquo;{todayThought.texto}&rdquo;
                    </blockquote>
                    <div className="mt-4 sm:mt-6 sm:px-6 flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-amber-700 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                          {todayThought.autor.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                            {todayThought.autor}
                          </p>
                          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                            {isPt ? 'Autor / Pensador' : 'Author / Thinker'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Practical Application / Reflection Section */}
                  {todayThought.reflexao && (
                    <div className="rounded-2xl bg-white/90 dark:bg-slate-800/80 border border-amber-200/60 dark:border-slate-700/60 p-5 sm:p-6 shadow-sm">
                      <div className="flex items-center gap-2 mb-2.5 text-amber-700 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
                        <Lightbulb size={16} className="text-amber-500" />
                        <span>{isPt ? 'Aplicação Prática & Lição para o Dia' : 'Practical Reflection for Today'}</span>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                        {todayThought.reflexao}
                      </p>
                    </div>
                  )}

                  {/* Footer metadata */}
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-amber-200/50 dark:border-slate-800">
                    <span className="flex items-center gap-1.5">
                      <Clock size={13} className="text-amber-500" />
                      {isPt ? 'Atualizado automaticamente todos os dias às 00:00' : 'Updated automatically every day at 00:00'}
                    </span>
                    {canManage && (
                      <button
                        onClick={handleOpenEditToday}
                        className="text-amber-600 dark:text-amber-400 hover:underline font-bold text-[11px] cursor-pointer"
                      >
                        {isPt ? 'Personalizar esta mensagem' : 'Customize this message'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Three Quick Pillars under the Hero */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                    <ShieldCheck size={18} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {isPt ? 'Disciplina & Foco' : 'Discipline & Focus'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                    {isPt 
                      ? 'Incorpore a mensagem de hoje no cumprimento rigoroso da rotina de estudos e deveres militares.' 
                      : 'Apply today\'s insight to maintain steadfast dedication in study routines and duties.'}
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                    <Compass size={18} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {isPt ? 'Espírito de Corpo' : 'Comradery & Trust'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                    {isPt 
                      ? 'Compartilhe o ensinamento com seus colegas de turma para fortalecer o companheirismo e a união.' 
                      : 'Share the reflection with classmates to bolster morale, teamwork, and collective resilience.'}
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <Award size={18} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {isPt ? 'Superação & Vitória' : 'Growth & Excellence'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                    {isPt 
                      ? 'Cada dia é uma oportunidade de vencer desafios acadêmicos e avançar com firmeza na carreira.' 
                      : 'Every sunrise offers an opportunity to overcome hurdles and excel in academic progression.'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <Quote size={32} className="mx-auto text-slate-300 mb-3" />
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {isPt ? 'Nenhuma reflexão disponível para hoje.' : 'No reflection available for today.'}
              </p>
              <button
                onClick={() => fetchTodayThought(true)}
                className="mt-4 px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-xl"
              >
                {isPt ? 'Gerar com IA' : 'Generate with AI'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: AI THEMATIC GENERATOR STUDIO */}
      {activeTab === 'ai_studio' && (
        <div className="space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/60 via-white to-indigo-50/30 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950 shadow-sm">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider mb-2">
              <Sparkles size={16} />
              <span>{isPt ? 'Laboratório de Inspirações com IA' : 'AI Inspiration Studio'}</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              {isPt ? 'Explore Reflexões por Tema ou Ocasião Especial' : 'Explore Reflections by Theme or Occasion'}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl mb-6">
              {isPt 
                ? 'Escolha um tema de sabedoria para gerar conselhos e pensamentos focados em momentos como início de curso, provas desafiadoras ou superação de metas.'
                : 'Select an intellectual domain to synthesize wisdom tailored for special academic milestones, demanding exams, or endurance challenges.'}
            </p>

            {/* Category selection */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
              {CATEGORIES.filter(c => c.id !== 'all').map(cat => {
                const IconComponent = cat.icon;
                const isSelected = aiTheme === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setAiTheme(cat.id)}
                    className={cn(
                      "p-3 rounded-2xl border text-left flex flex-col gap-1.5 transition-all cursor-pointer",
                      isSelected 
                        ? "bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-600/20 scale-[1.02]"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700"
                    )}
                  >
                    <IconComponent size={18} className={isSelected ? "text-amber-300" : "text-indigo-500"} />
                    <span className="text-xs font-bold leading-tight">
                      {isPt ? cat.labelPt : cat.labelEn}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleGenerateAiThought}
                disabled={generatingCustomAi}
                className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {generatingCustomAi ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-amber-300" />
                    <span>{isPt ? 'Elaborando pensamento...' : 'Composing reflection...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} className="text-amber-300" />
                    <span>{isPt ? 'Gerar Pensamento com IA' : 'Generate with AI'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Generated Result Card */}
          {generatedAiQuote && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 sm:p-8 rounded-3xl border border-indigo-200 dark:border-indigo-900 bg-white dark:bg-slate-900 shadow-md space-y-5"
            >
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {isPt ? 'Reflexão Gerada' : 'Synthesized Reflection'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleSpeechAudio(generatedAiQuote)}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
                    title={isPt ? 'Ouvir' : 'Listen'}
                  >
                    <Volume2 size={15} />
                  </button>
                  <button
                    onClick={() => handleCopy(generatedAiQuote, 'ai-generated')}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
                    title={isPt ? 'Copiar' : 'Copy'}
                  >
                    {copiedId === 'ai-generated' ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                  </button>
                  <button
                    onClick={() => toggleFavorite(generatedAiQuote)}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
                    title={isPt ? 'Favoritar' : 'Save'}
                  >
                    <Heart size={15} className={favorites.some(f => f.texto === generatedAiQuote.texto) ? "fill-rose-500 text-rose-500" : ""} />
                  </button>
                </div>
              </div>

              <blockquote className="text-xl sm:text-2xl font-serif italic text-slate-800 dark:text-slate-100">
                &ldquo;{generatedAiQuote.texto}&rdquo;
              </blockquote>

              <div className="flex items-center gap-2 font-black text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                <span>— {generatedAiQuote.autor}</span>
              </div>

              {generatedAiQuote.reflexao && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  <strong className="block text-slate-800 dark:text-slate-200 mb-1">
                    {isPt ? 'Reflexão:' : 'Reflection:'}
                  </strong>
                  {generatedAiQuote.reflexao}
                </div>
              )}

              {canManage && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    onClick={() => handlePromoteToToday(generatedAiQuote)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
                  >
                    <Award size={14} />
                    <span>{isPt ? 'Definir como Pensamento Oficial de Hoje' : 'Set as Official Thought for Today'}</span>
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </div>
      )}

      {/* TAB 3: WISDOM ARCHIVE & LIBRARY */}
      {activeTab === 'archive' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isPt ? 'Buscar por autor, citação ou palavra-chave...' : 'Search by author, quote or keyword...'}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <Filter size={14} className="text-slate-400 shrink-0" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {isPt ? cat.labelPt : cat.labelEn}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid of Archive Cards */}
          {loadingHistory ? (
            <div className="p-16 text-center">
              <Loader2 size={32} className="animate-spin text-amber-500 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-semibold">{isPt ? 'Carregando biblioteca...' : 'Loading library...'}</p>
            </div>
          ) : filteredArchive.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 text-xs font-medium">
              {isPt ? 'Nenhuma reflexão encontrada para os filtros aplicados.' : 'No quotes match your filter criteria.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredArchive.map((item, idx) => {
                const isFav = favorites.some(f => f.texto === item.texto);
                const isCurrentlyToday = todayThought?.texto === item.texto;
                const cardKey = `archive-${idx}-${item.texto.slice(0, 15)}`;

                return (
                  <div
                    key={cardKey}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-800/60 shadow-2xs transition-all flex flex-col justify-between gap-4 group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        {item.categoria ? (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {item.categoria}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
                            {isPt ? 'Sabedoria' : 'Wisdom'}
                          </span>
                        )}

                        {isCurrentlyToday && (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                            {isPt ? 'Ativo Hoje' : 'Active Today'}
                          </span>
                        )}

                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => toggleSpeechAudio(item)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                            title={isPt ? 'Ouvir' : 'Listen'}
                          >
                            <Volume2 size={14} />
                          </button>
                          <button
                            onClick={() => handleCopy(item, cardKey)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                            title={isPt ? 'Copiar' : 'Copy'}
                          >
                            {copiedId === cardKey ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                          </button>
                          <button
                            onClick={() => toggleFavorite(item)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                            title={isPt ? 'Favoritar' : 'Save'}
                          >
                            <Heart size={14} className={isFav ? "fill-rose-500 text-rose-500" : ""} />
                          </button>
                          {isAdmin && (item.id || item.data_exibicao) && (
                            <button
                              onClick={() => handleDeleteHistory(item)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 text-slate-400 hover:text-rose-600 cursor-pointer"
                              title={isPt ? 'Excluir registro' : 'Delete'}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      <blockquote className="text-sm font-serif italic text-slate-800 dark:text-slate-100 leading-relaxed">
                        &ldquo;{item.texto}&rdquo;
                      </blockquote>

                      <p className="text-xs font-bold text-slate-900 dark:text-slate-200">
                        — {item.autor}
                      </p>

                      {item.reflexao && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-normal">
                          {item.reflexao}
                        </p>
                      )}
                    </div>

                    {canManage && !isCurrentlyToday && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                        <button
                          onClick={() => handlePromoteToToday(item)}
                          className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>{isPt ? 'Definir para hoje' : 'Set as today'}</span>
                          <ChevronRight size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: FAVORITES */}
      {activeTab === 'favorites' && (
        <div className="space-y-6">
          {favorites.length === 0 ? (
            <div className="p-16 text-center rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <Heart size={36} className="mx-auto text-slate-300 dark:text-slate-700" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {isPt ? 'Você ainda não salvou nenhum favorito' : 'You haven\'t saved any favorites yet'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {isPt 
                  ? 'Clique no ícone de coração em qualquer pensamento da página para salvar suas citações mais inspiradoras aqui.' 
                  : 'Click the heart icon on any reflection to bookmark your most inspiring quotes here.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {favorites.map((fav, idx) => {
                const favKey = `fav-${idx}-${fav.texto.slice(0, 15)}`;
                return (
                  <div
                    key={favKey}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-950/60 shadow-2xs flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                          {isPt ? 'Favorito Salvo' : 'Saved Favorite'}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleSpeechAudio(fav)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                            title={isPt ? 'Ouvir' : 'Listen'}
                          >
                            <Volume2 size={14} />
                          </button>
                          <button
                            onClick={() => handleCopy(fav, favKey)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                            title={isPt ? 'Copiar' : 'Copy'}
                          >
                            {copiedId === favKey ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                          </button>
                          <button
                            onClick={() => toggleFavorite(fav)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-500 cursor-pointer"
                            title={isPt ? 'Remover dos favoritos' : 'Remove favorite'}
                          >
                            <Heart size={14} className="fill-rose-500" />
                          </button>
                        </div>
                      </div>

                      <blockquote className="text-sm font-serif italic text-slate-800 dark:text-slate-100 leading-relaxed">
                        &ldquo;{fav.texto}&rdquo;
                      </blockquote>

                      <p className="text-xs font-bold text-slate-900 dark:text-slate-200">
                        — {fav.autor}
                      </p>

                      {fav.reflexao && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {fav.reflexao}
                        </p>
                      )}
                    </div>

                    {canManage && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                        <button
                          onClick={() => handlePromoteToToday(fav)}
                          className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>{isPt ? 'Definir para hoje' : 'Set as today'}</span>
                          <ChevronRight size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: EDIT / CREATE CUSTOM THOUGHT FOR TODAY */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                    <Edit3 size={16} />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {isPt ? 'Editar Pensamento Oficial de Hoje' : 'Edit Today\'s Official Thought'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveCustomToday} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    {isPt ? 'Frase ou Citação *' : 'Quote Text *'}
                  </label>
                  <textarea
                    rows={3}
                    value={customTexto}
                    onChange={(e) => setCustomTexto(e.target.value)}
                    required
                    placeholder={isPt ? 'Insira a frase inspiradora...' : 'Enter the inspiring quote...'}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    {isPt ? 'Autor ou Pensador *' : 'Author / Thinker *'}
                  </label>
                  <input
                    type="text"
                    value={customAutor}
                    onChange={(e) => setCustomAutor(e.target.value)}
                    required
                    placeholder={isPt ? 'Ex: Sêneca, Martin Luther King, Paulo Freire' : 'E.g. Seneca, Marcus Aurelius'}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    {isPt ? 'Reflexão & Aplicação Prática (Opcional)' : 'Practical Reflection (Optional)'}
                  </label>
                  <textarea
                    rows={3}
                    value={customReflexao}
                    onChange={(e) => setCustomReflexao(e.target.value)}
                    placeholder={isPt ? 'Explique como os alunos e instrutores podem aplicar esta lição no dia a dia...' : 'Explain how to apply this lesson...'}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    {isPt ? 'Cancelar' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={savingCustom}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {savingCustom && <Loader2 size={14} className="animate-spin" />}
                    <span>{isPt ? 'Publicar para Toda a Escola' : 'Broadcast to School'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
