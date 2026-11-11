'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/lib/auth/UserContext';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { 
  Sparkles, 
  Quote, 
  Copy, 
  Check, 
  Printer, 
  Pencil, 
  RefreshCw, 
  Calendar as CalendarIcon, 
  Share2, 
  BookOpen, 
  Compass, 
  Heart, 
  Brain, 
  Flame, 
  Sun, 
  GraduationCap, 
  ShieldCheck, 
  Lightbulb
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Toaster, toast } from 'sonner';
import Modal from '@/components/Modal';

interface Pensamento {
  id?: string;
  texto: string;
  autor: string;
  reflexao?: string;
  data_exibicao?: string;
  isDemo?: boolean;
}

const CATEGORIES = [
  { id: '', label: 'Geral & Sabedoria', icon: Compass, color: 'text-blue-500 bg-blue-50 border-blue-200' },
  { id: 'religioso', label: 'Espiritual & Fé', icon: Heart, color: 'text-amber-500 bg-amber-50 border-amber-200' },
  { id: 'motivacional', label: 'Superação & Motivação', icon: Flame, color: 'text-rose-500 bg-rose-50 border-rose-200' },
  { id: 'filosofico', label: 'Filosofia & Ética', icon: Brain, color: 'text-purple-500 bg-purple-50 border-purple-200' },
  { id: 'estoico', label: 'Estoicismo & Autodomínio', icon: ShieldCheck, color: 'text-slate-600 bg-slate-100 border-slate-300' },
  { id: 'lideranca', label: 'Liderança & Caráter', icon: Sun, color: 'text-orange-500 bg-orange-50 border-orange-200' },
  { id: 'oriental', label: 'Sabedoria Oriental & Paz', icon: Compass, color: 'text-emerald-500 bg-emerald-50 border-emerald-200' },
  { id: 'criatividade', label: 'Criatividade & Ciência', icon: Lightbulb, color: 'text-cyan-500 bg-cyan-50 border-cyan-200' },
  { id: 'gratidao', label: 'Gratidão & Generosidade', icon: Heart, color: 'text-pink-500 bg-pink-50 border-pink-200' },
  { id: 'educacao', label: 'Educação & Ensino', icon: GraduationCap, color: 'text-indigo-500 bg-indigo-50 border-indigo-200' },
];

export default function PensamentoDoDiaPage() {
  const { profile, isAdmin } = useUser();
  const { language } = useI18n();
  const isPrivileged = isAdmin || profile?.role === 'instrutor';

  const [todayThought, setTodayThought] = useState<Pensamento | null>(null);
  const [loadingToday, setLoadingToday] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Modals
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [selectedAiCategory, setSelectedAiCategory] = useState<string>('');
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);

  // Form state
  const [formTexto, setFormTexto] = useState('');
  const [formAutor, setFormAutor] = useState('');
  const [formReflexao, setFormReflexao] = useState('');
  const [savingManual, setSavingManual] = useState(false);

  // Fetch today's thought
  const fetchTodayThought = useCallback(async (force = false, category = '') => {
    try {
      if (force) setGenerating(true);
      else setLoadingToday(true);

      const params = new URLSearchParams();
      if (force) params.set('force', 'true');
      if (category) params.set('category', category);

      const url = `/api/v1/pensamento-dia?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Erro ao carregar pensamento do dia');
      const json = await res.json();
      if (json.success && json.data) {
        setTodayThought(json.data);
      }
    } catch (err: any) {
      console.error('Fetch thought error:', err);
      toast.error('Não foi possível carregar o pensamento do dia');
    } finally {
      setLoadingToday(false);
      setGenerating(false);
    }
  }, []);

  useEffect(() => {
    fetchTodayThought();
  }, [fetchTodayThought]);

  const handleCopyQuote = (thought?: Pensamento | null) => {
    const target = thought || todayThought;
    if (!target) return;
    const dateFormatted = new Date().toLocaleDateString('pt-BR', { dateStyle: 'long' });

    const shareContent = `💡 *Pensamento do Dia* (${dateFormatted})\n\n"${target.texto}"\n— *${target.autor}*\n\n📖 *Reflexão:* ${target.reflexao || 'Cultivar a serenidade e a retidão no propósito do dia a dia.'}`;

    navigator.clipboard.writeText(shareContent);
    setCopied(true);
    toast.success('Pensamento e reflexão copiados com sucesso!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleGenerateAI = async () => {
    setAiModalOpen(false);
    toast.info('Gerando novo pensamento com Inteligência Artificial...');
    await fetchTodayThought(true, selectedAiCategory);
    toast.success('Pensamento do dia atualizado com sucesso!');
  };

  const handleOpenEditModal = () => {
    if (todayThought) {
      setFormTexto(todayThought.texto);
      setFormAutor(todayThought.autor);
      setFormReflexao(todayThought.reflexao || '');
    } else {
      setFormTexto('');
      setFormAutor('');
      setFormReflexao('');
    }
    setManualModalOpen(true);
  };

  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTexto.trim() || !formAutor.trim()) {
      toast.error('Preencha ao menos o texto da citação e o autor.');
      return;
    }

    setSavingManual(true);
    try {
      const res = await fetch('/api/v1/pensamento-dia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texto: formTexto.trim(),
          autor: formAutor.trim(),
          reflexao: formReflexao.trim()
        })
      });
      if (!res.ok) throw new Error('Falha ao salvar pensamento');
      toast.success('Pensamento do dia atualizado com sucesso!');
      setManualModalOpen(false);
      await fetchTodayThought();
    } catch (err: any) {
      console.error('Save manual thought error:', err);
      toast.error(err.message || 'Erro ao salvar pensamento');
    } finally {
      setSavingManual(false);
    }
  };

  const activeDisplayDate = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      <Toaster position="top-right" richColors />

      {/* Header section with refined typography & actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-700 rounded-full text-xs font-bold uppercase tracking-wider mb-2 border border-amber-500/20">
            <Sparkles size={14} className="text-amber-600 animate-pulse" />
            <span>Semente de Sabedoria Diária</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <span>Pensamento do Dia</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1 max-w-2xl leading-relaxed">
            Inspiração ética, disciplina mental e reflexões para fortalecer o propósito, o espírito de equipe e a excelência no cotidiano.
          </p>
        </div>

        {/* Global Toolbar buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => handleCopyQuote()}
            disabled={!todayThought}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-sm transition-all hover:border-slate-300 disabled:opacity-50"
            title="Copiar citação para compartilhar"
          >
            {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} className="text-slate-500" />}
            <span>{copied ? 'Copiado!' : 'Copiar Frase'}</span>
          </button>

          <button
            onClick={() => setPrintModalOpen(true)}
            disabled={!todayThought}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-sm transition-all hover:border-slate-300 disabled:opacity-50"
            title="Imprimir quadro do pensamento"
          >
            <Printer size={16} className="text-slate-500" />
            <span>Imprimir Quadro</span>
          </button>

          {isPrivileged && (
            <>
              <button
                onClick={() => setAiModalOpen(true)}
                disabled={generating}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all hover:shadow-lg active:scale-95 disabled:opacity-60"
              >
                <Sparkles size={16} className={cn(generating && "animate-spin")} />
                <span>{generating ? 'Gerando...' : 'Gerar com IA'}</span>
              </button>

              <button
                onClick={handleOpenEditModal}
                className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95"
              >
                <Pencil size={15} />
                <span>Editar Pensamento</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* HERO CARD: Today's Thought */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 text-white rounded-3xl p-6 sm:p-10 md:p-12 shadow-2xl border border-white/10">
        {/* Subtle decorative background watermarks */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <Quote className="absolute right-8 top-8 text-white/[0.04] w-48 h-48 pointer-events-none" />

        <div className="relative z-10 space-y-8">
          {/* Badge & Date */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs uppercase font-extrabold tracking-widest text-blue-300">
                PENSAMENTO DO DIA
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-medium text-slate-300 backdrop-blur-md border border-white/10">
              <CalendarIcon size={14} className="text-amber-400" />
              <span className="capitalize">{activeDisplayDate}</span>
            </div>
          </div>

          {/* Quote content */}
          {loadingToday ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw className="animate-spin text-blue-400" size={32} />
              <p className="text-sm">Carregando pensamento do dia...</p>
            </div>
          ) : todayThought ? (
            <div className="space-y-8">
              <div className="space-y-5">
                <div className="flex items-start gap-4 md:gap-5">
                  <Quote className="text-amber-400 shrink-0 w-8 h-8 md:w-14 md:h-14 mt-1 rotate-180 opacity-90" />
                  <blockquote className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-serif italic text-white leading-relaxed tracking-normal font-medium">
                    &ldquo;{todayThought.texto}&rdquo;
                  </blockquote>
                </div>
                <div className="pl-12 md:pl-20">
                  <div className="text-base sm:text-lg md:text-xl font-bold text-amber-300 tracking-wide">
                    — {todayThought.autor}
                  </div>
                </div>
              </div>

              {/* Deep Reflection Section */}
              {todayThought.reflexao && (
                <div className="pt-6 border-t border-white/10 grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                  <div className="md:col-span-3 flex items-center gap-2 text-xs uppercase font-black tracking-wider text-blue-300">
                    <BookOpen size={16} className="text-amber-400 shrink-0" />
                    <span>Reflexão Prática</span>
                  </div>
                  <div className="md:col-span-9">
                    <p className="text-sm md:text-base text-slate-200 leading-relaxed font-sans bg-white/5 p-5 rounded-2xl border border-white/10 backdrop-blur-sm">
                      {todayThought.reflexao}
                    </p>
                  </div>
                </div>
              )}

              {/* Card Footer Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/5">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <ShieldCheck size={14} className="text-blue-400" />
                  <span>Sincronizado e exibido no mural da escola</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyQuote(todayThought)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold backdrop-blur-sm transition-colors border border-white/10"
                  >
                    <Share2 size={14} />
                    <span>Compartilhar</span>
                  </button>

                  {isPrivileged && (
                    <button
                      onClick={handleOpenEditModal}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-amber-300 rounded-xl text-xs font-semibold backdrop-blur-sm transition-colors border border-white/10"
                    >
                      <Pencil size={14} />
                      <span>Editar</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-slate-400 space-y-4">
              <p>Nenhum pensamento configurado para hoje.</p>
              {isPrivileged && (
                <button
                  onClick={() => setAiModalOpen(true)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Gerar com IA agora
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Gerar com Inteligência Artificial por Categoria */}
      <Modal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        title="Gerar Pensamento com Inteligência Artificial"
      >
        <div className="space-y-5 p-1">
          <p className="text-xs text-slate-600 leading-relaxed">
            Selecione uma vertente temática para o novo pensamento do dia. O modelo criará uma citação autêntica e uma reflexão prática para os alunos e instrutores.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedAiCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedAiCategory(cat.id)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                    isSelected
                      ? "border-blue-600 bg-blue-50/70 shadow-sm ring-2 ring-blue-500/10"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  <div className={cn("p-2 rounded-lg shrink-0", cat.color)}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-800">{cat.label}</div>
                  </div>
                  {isSelected && <Check size={16} className="text-blue-600 shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setAiModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleGenerateAI}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all active:scale-95"
            >
              <Sparkles size={14} />
              <span>Gerar Pensamento</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: Cadastrar / Editar Pensamento Manual */}
      <Modal
        isOpen={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        title="Editar Pensamento do Dia"
      >
        <form onSubmit={handleSaveManual} className="space-y-4 p-1">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Texto da Citação / Frase *
            </label>
            <textarea
              required
              rows={3}
              value={formTexto}
              onChange={(e) => setFormTexto(e.target.value)}
              placeholder="Digite o pensamento inspirador..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-500 outline-none resize-none font-serif"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Autor / Fonte *
            </label>
            <input
              type="text"
              required
              value={formAutor}
              onChange={(e) => setFormAutor(e.target.value)}
              placeholder="Ex: Marco Aurélio, Cora Coralina, Martin Luther King Jr., etc."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Reflexão Prática do Dia (Opcional)
            </label>
            <textarea
              rows={3}
              value={formReflexao}
              onChange={(e) => setFormReflexao(e.target.value)}
              placeholder="Como aplicar essa sabedoria nas atividades, na ética e no convívio diário..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-500 outline-none resize-none font-sans"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setManualModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingManual}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              {savingManual ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
              <span>Salvar Pensamento</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Imprimir Cartão do Pensamento */}
      <Modal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        title="Quadro Imprimível do Pensamento do Dia"
      >
        <div className="space-y-5 p-1">
          <p className="text-xs text-slate-600">
            Este cartão está formatado para impressão em tamanho A4 ou painel de avisos institucional.
          </p>

          {/* Printable Card Preview */}
          <div id="printable-quote-card" className="p-8 bg-white border-2 border-slate-900 rounded-2xl shadow-sm space-y-6 text-slate-900 print:border-black">
            <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
              <div className="text-[10px] uppercase font-black tracking-widest text-slate-600">
                SISTEMA DE GESTÃO ESCOLAR • MARINHA DO BRASIL
              </div>
              <h2 className="text-base font-extrabold tracking-tight uppercase">
                PENSAMENTO & REFLEXÃO DO DIA
              </h2>
              <div className="text-xs text-slate-500 font-medium capitalize">
                {activeDisplayDate}
              </div>
            </div>

            <div className="py-6 text-center space-y-3">
              <p className="text-xl md:text-2xl font-serif italic font-bold leading-relaxed px-4">
                &ldquo;{todayThought?.texto}&rdquo;
              </p>
              <div className="text-base font-extrabold text-slate-800">
                — {todayThought?.autor}
              </div>
            </div>

            {todayThought?.reflexao && (
              <div className="border-t border-slate-200 pt-4 space-y-1 bg-slate-50 p-4 rounded-xl">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  Reflexão Prática:
                </span>
                <p className="text-xs text-slate-700 leading-relaxed font-sans italic">
                  {todayThought.reflexao}
                </p>
              </div>
            )}

            <div className="text-center text-[10px] text-slate-400 pt-2 border-t border-slate-100">
              Disponibilizado para estudo, reflexão e crescimento ético profissional.
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 print:hidden">
            <button
              type="button"
              onClick={() => setPrintModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all active:scale-95"
            >
              <Printer size={14} />
              <span>Imprimir Agora</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
