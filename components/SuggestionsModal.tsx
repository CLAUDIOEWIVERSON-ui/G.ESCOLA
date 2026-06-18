'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { useUser } from '@/lib/auth/UserContext';
import { fetchWithAuth } from '@/lib/api';
import {
  MessageSquare,
  X,
  Plus,
  Send,
  Loader2,
  CheckCircle,
  Clock,
  AlertTriangle,
  Lightbulb,
  Cpu,
  Bookmark,
  Reply,
  Shield,
  User,
  ExternalLink,
  ClipboardCheck,
  Check,
  Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Suggestion {
  id: string;
  tipo: string;
  titulo: string;
  modulo: string;
  descricao: string;
  prioridade: string;
  usuario_nome: string;
  usuario_email: string | null;
  status: 'pendente' | 'em_analise' | 'implementado' | 'recusado';
  resposta_ti: string | null;
  created_at: string;
}

interface SuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SuggestionsModal({ isOpen, onClose }: SuggestionsModalProps) {
  const { t } = useI18n();
  const { profile, isAdmin } = useUser();
  const [activeTab, setActiveTab] = useState<'nova' | 'lista'>('nova');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTableMissing, setIsTableMissing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form states
  const [tipo, setTipo] = useState('aprimoramento'); // 'nova_funcionalidade', 'aprimoramento', 'outros'
  const [titulo, setTitulo] = useState('');
  const [modulo, setModulo] = useState('Geral');
  const [descricao, setDescricao] = useState('');
  const [prioridade, setPrioridade] = useState('media'); // 'baixa', 'media', 'alta'
  const [anonima, setAnonima] = useState(false);

  // Admin Reply States
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyStatus, setReplyStatus] = useState<'pendente' | 'em_analise' | 'implementado' | 'recusado'>('em_analise');

  // Load suggestions
  const fetchSuggestions = async () => {
    setIsLoading(true);
    try {
      const res = await fetchWithAuth('/api/suggestions');
      if (res.status === 404) {
        const body = await res.json();
        if (body.code === 'TABLE_MISSING') {
          setIsTableMissing(true);
          // Fallback loader from localStorage
          const cached = localStorage.getItem('school_suggestions_cache');
          if (cached) {
            setSuggestions(JSON.parse(cached));
          }
          return;
        }
      }
      if (!res.ok) throw new Error('Erro ao buscar sugestões');
      const data = await res.json();
      setSuggestions(data);
      setIsTableMissing(false);
      localStorage.setItem('school_suggestions_cache', JSON.stringify(data));
    } catch (err: any) {
      console.warn('Erro ao carregar do servidor, fallback para cache local:', err);
      const cached = localStorage.getItem('school_suggestions_cache');
      if (cached) {
        setSuggestions(JSON.parse(cached));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSuggestions();
      setReplyingToId(null);
      setReplyText('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) {
      toast.error('O título da sugestão é obrigatório');
      return;
    }
    if (!descricao.trim()) {
      toast.error('Por favor, descreva em detalhes a sua melhoria');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isTableMissing) {
        // LocalStorage Fallback Simulation
        const newLocalSug: Suggestion = {
          id: `local-sug-${Date.now()}`,
          tipo,
          titulo,
          modulo,
          descricao,
          prioridade,
          usuario_id: anonima ? null : profile?.id || null,
          usuario_nome: anonima ? 'Anônimo' : profile?.full_name || 'Usuário',
          usuario_email: anonima ? null : profile?.email || null,
          status: 'pendente',
          resposta_ti: null,
          created_at: new Date().toISOString()
        } as any;

        const updated = [newLocalSug, ...suggestions];
        setSuggestions(updated);
        localStorage.setItem('school_suggestions_cache', JSON.stringify(updated));
        toast.success('Sugestão gravada localmente! (Aguardando criação da tabela)');
        resetForm();
        setActiveTab('lista');
        return;
      }

      const res = await fetchWithAuth('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, titulo, modulo, descricao, prioridade, anonima })
      });

      if (!res.ok) throw new Error('Ocorreu um erro ao enviar sua sugestão');
      
      toast.success('Sua sugestão foi enviada com sucesso ao TI militar! Obrigado pela colaboração.');
      resetForm();
      fetchSuggestions();
      setActiveTab('lista');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar sugestão');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminReply = async (id: string) => {
    if (!replyText.trim()) {
      toast.error('Defina uma resposta justificando a análise do TI');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isTableMissing) {
        // Local Reply simulation
        const updated = suggestions.map(s => s.id === id ? {
          ...s,
          status: replyStatus,
          resposta_ti: replyText,
          updated_at: new Date().toISOString()
        } : s);
        setSuggestions(updated);
        localStorage.setItem('school_suggestions_cache', JSON.stringify(updated));
        toast.success('Resposta atualizada localmente!');
        setReplyingToId(null);
        setReplyText('');
        return;
      }

      const res = await fetchWithAuth('/api/suggestions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: replyStatus, resposta_ti: replyText })
      });

      if (!res.ok) throw new Error('Erro ao responder sugestão');
      
      toast.success('Sugestão avaliada e atualizada com sucesso!');
      setReplyingToId(null);
      setReplyText('');
      fetchSuggestions();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao responder');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitulo('');
    setDescricao('');
    setModulo('Geral');
    setPrioridade('media');
    setTipo('aprimoramento');
    setAnonima(false);
  };

  const startReply = (sug: Suggestion) => {
    setReplyingToId(sug.id);
    setReplyText(sug.resposta_ti || '');
    setReplyStatus(sug.status);
  };

  const copySQL = () => {
    const sql = `CREATE TABLE IF NOT EXISTS public.sugestoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  modulo TEXT,
  descricao TEXT NOT NULL,
  prioridade TEXT NOT NULL,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  usuario_nome TEXT,
  usuario_email TEXT,
  status TEXT DEFAULT 'pendente',
  resposta_ti TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sugestoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Qualquer usuário autenticado pode criar sugestões" ON public.sugestoes;
DROP POLICY IF EXISTS "Usuários podem ver suas próprias sugestões" ON public.sugestoes;
DROP POLICY IF EXISTS "Admins podem gerenciar todas as sugestões" ON public.sugestoes;

CREATE POLICY "Qualquer usuário autenticado pode criar sugestões" ON public.sugestoes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Usuários podem ver suas próprias sugestões" ON public.sugestoes FOR SELECT USING (auth.uid() = usuario_id OR (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')));
CREATE POLICY "Admins podem gerenciar todas as sugestões" ON public.sugestoes FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));`;
    
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Comando de migração copiado!');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border border-slate-200">Aguardando TI</span>;
      case 'em_analise':
        return <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border border-blue-100">Em Análise</span>;
      case 'implementado':
        return <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border border-emerald-100">Implementado</span>;
      case 'recusado':
        return <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border border-rose-100">Não Viável</span>;
      default:
        return null;
    }
  };

  const getPriorityBadge = (prio: string) => {
    switch (prio) {
      case 'baixa':
        return <span className="text-slate-500 font-medium text-xs">Baixa</span>;
      case 'media':
        return <span className="text-amber-600 font-semibold text-xs">Média</span>;
      case 'alta':
        return <span className="text-rose-600 font-black text-xs">Alta</span>;
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-200"
          >
            {/* Header */}
            <div className="bg-slate-950 text-slate-300 p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                  <MessageSquare size={18} className="text-blue-400" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-white uppercase tracking-wider">
                    Caixa de Sugestões
                  </h2>
                  <p className="text-slate-400 text-xs font-semibold">
                    Seu canal direto com o TI para melhorias do sistema
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 p-2 gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('nova')}
                className={cn(
                  "flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2",
                  activeTab === 'nova' 
                    ? "bg-white text-blue-600 shadow-sm border border-slate-200" 
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                )}
              >
                <Plus size={14} className="stroke-[2.5]" />
                Nova Sugestão
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('lista')}
                className={cn(
                  "flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 relative",
                  activeTab === 'lista' 
                    ? "bg-white text-blue-600 shadow-sm border border-slate-200" 
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                )}
              >
                <Bookmark size={14} />
                {isAdmin ? 'Todas as Sugestões' : 'Minhas Sugestões'}
                {suggestions.length > 0 && (
                  <span className="absolute right-3 bg-blue-600 text-white font-mono font-black text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center animate-pulse">
                    {suggestions.length}
                  </span>
                )}
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col">
              {/* Alert if table is missing */}
              {isTableMissing && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shrink-0">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="text-amber-600 shrink-0 mt-0.5 animate-bounce" size={18} />
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-800 text-xs">
                        Banco de Dados Pendente (Modo Offline Ativo)
                      </h4>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        A tabela <code className="bg-amber-100 text-amber-800 px-1 py-0.5 rounded text-[10px] font-mono">sugestoes</code> não está criada no Supabase ainda. As sugestões enviadas por você estarão salvas no seu navegador local.
                      </p>
                      {isAdmin && (
                        <div className="mt-3 space-y-2">
                          <p className="text-slate-500 text-[10px]">Como administrador do TI, crie a tabela abaixo:</p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={copySQL}
                              className="bg-slate-900 border border-slate-700 hover:bg-slate-800 text-white text-[10px] py-1 px-3 rounded flex items-center gap-1 font-bold cursor-pointer transition-all"
                            >
                              {copied ? <ClipboardCheck size={12} className="text-green-400" /> : <Copy size={12} />}
                              {copied ? 'Copiado!' : 'Copiar Comando SQL'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'nova' ? (
                /* Form content */
                <form onSubmit={handleSubmit} className="space-y-4 flex flex-col flex-1">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                      Tipo de Melhoria:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'nova_funcionalidade', label: 'Nova Função', icon: Lightbulb, color: 'text-amber-500' },
                        { id: 'aprimoramento', label: 'Aprimorar', icon: Cpu, color: 'text-blue-500' },
                        { id: 'outros', label: 'Outro assunto', icon: MessageSquare, color: 'text-slate-500' }
                      ].map(tOpt => (
                        <button
                          key={tOpt.id}
                          type="button"
                          onClick={() => setTipo(tOpt.id)}
                          className={cn(
                            "py-2 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 justify-center transition-all cursor-pointer",
                            tipo === tOpt.id
                              ? "bg-slate-900 text-white border-slate-950 shadow-sm"
                              : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                          )}
                        >
                          <tOpt.icon size={14} className={tOpt.color} />
                          {tOpt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                        Módulo / Tela:
                      </label>
                      <select
                        value={modulo}
                        onChange={(e) => setModulo(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none text-xs text-slate-700 font-semibold"
                      >
                        <option value="Geral">Geral (Sistema)</option>
                        <option value="Dashboard">Dashboard</option>
                        <option value="Histórico Acadêmico">Histórico / Notas</option>
                        <option value="Frequência / Presença">Frequência</option>
                        <option value="Cursos / Cadastro">Cursos</option>
                        <option value="Turmas / Calendário">Turmas / Agenda</option>
                        <option value="Boletim">Boletim do Aluno</option>
                        <option value="Configurações">Configurações</option>
                        <option value="Relatórios">Moderação / Relatórios</option>
                        <option value="Outros">Outras Telas</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                        Prioridade Recomendada:
                      </label>
                      <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 h-9 shrink-0">
                        {['baixa', 'media', 'alta'].map(pOpt => (
                          <button
                            key={pOpt}
                            type="button"
                            onClick={() => setPrioridade(pOpt)}
                            className={cn(
                              "flex-1 text-[11px] font-extrabold uppercase rounded-lg transition-all cursor-pointer",
                              prioridade === pOpt
                                ? pOpt === 'baixa' ? "bg-white text-slate-600 shadow-xs border border-slate-200" :
                                  pOpt === 'media' ? "bg-white text-amber-600 shadow-xs border border-slate-200" :
                                  "bg-white text-rose-600 shadow-xs border border-slate-200"
                                : "text-slate-400 hover:text-slate-600"
                            )}
                          >
                            {pOpt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                      Título da Sugestão *
                    </label>
                    <input
                      type="text"
                      required
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      placeholder="Ex: Filtragem inteligente por turma ou exportação PDF"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none text-xs"
                    />
                  </div>

                  <div className="flex-1 flex flex-col min-h-[140px]">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                      Descreva Detalhadamente a Melhoria *
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      placeholder="Por favor, explique o que falta na tela atual ou qual processo ficaria mais ágil com esta nova funcionalidade para que o TI possa analisá-la..."
                      className="w-full flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none text-xs resize-none"
                    />
                  </div>

                  {/* Submission settings */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-slate-100 rounded-2xl bg-slate-50 shrink-0">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="anonima"
                        checked={anonima}
                        onChange={(e) => setAnonima(e.target.checked)}
                        className="w-4 h-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <label htmlFor="anonima" className="text-slate-600 font-bold text-xs cursor-pointer select-none">
                        Enviar sugestão anonimamente ao TI
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-slate-950 text-white font-extrabold uppercase tracking-wide text-xs px-5 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send size={14} />
                          Enviar ao TI Militar
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                /* Suggestions List Panel */
                <div className="space-y-4 flex-1 flex flex-col">
                  {isLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-10 gap-2">
                      <Loader2 size={32} className="text-blue-500 animate-spin" />
                      <p className="text-slate-400 text-xs font-semibold">Buscando sugestões enviadas...</p>
                    </div>
                  ) : suggestions.length > 0 ? (
                    <div className="space-y-3.5 pr-1">
                      {suggestions.map((sug) => {
                        const isReplying = replyingToId === sug.id;
                        return (
                          <div 
                            key={sug.id} 
                            className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3 relative overflow-hidden group shadow-xs hover:bg-white hover:border-blue-300 transition-all duration-200"
                          >
                            {/* Blue strip indicating item category */}
                            <div className={cn(
                              "absolute left-0 top-0 bottom-0 w-1",
                              sug.tipo === 'nova_funcionalidade' ? 'bg-amber-500' :
                              sug.tipo === 'aprimoramento' ? 'bg-blue-500' : 'bg-slate-400'
                            )} />

                            {/* Row metadata info */}
                            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 font-bold ml-1.5">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded font-black text-[9px] uppercase tracking-wide",
                                  sug.tipo === 'nova_funcionalidade' ? 'bg-amber-500/10 text-amber-700' :
                                  sug.tipo === 'aprimoramento' ? 'bg-blue-500/10 text-blue-700' : 'bg-slate-100 text-slate-600'
                                )}>
                                  {sug.tipo === 'nova_funcionalidade' ? 'NOVA FUNÇÃO' :
                                   sug.tipo === 'aprimoramento' ? 'APRIMORAMENTO' : 'OUTROS'}
                                </span>
                                <span className="bg-slate-200/50 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                                  {sug.modulo || 'Geral'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span>{new Date(sug.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            </div>

                            {/* Suggestion Title & Description */}
                            <div className="ml-1.5 space-y-1">
                              <h4 className="font-extrabold text-slate-800 text-sm">{sug.titulo}</h4>
                              <p className="text-slate-600 text-xs leading-relaxed font-normal whitespace-pre-wrap">{sug.descricao}</p>
                            </div>

                            {/* Additional info footer (Priority, reporter status and reply action) */}
                            <div className="ml-1.5 border-t border-slate-200/60 pt-2 flex items-center justify-between text-xs gap-3 flex-wrap">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1 text-[10px] uppercase font-black text-slate-400 tracking-wider">
                                  Prioridade: {getPriorityBadge(sug.prioridade)}
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                  <User size={12} className="text-slate-400" />
                                  <span className="font-bold">{sug.usuario_nome}</span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {getStatusBadge(sug.status)}
                                {isAdmin && !isReplying && (
                                  <button
                                    onClick={() => startReply(sug)}
                                    className="bg-slate-900 text-slate-400 hover:text-white group-hover:bg-blue-500 hover:border-blue-500 p-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                                    title="Deseja atualizar o status e responder ao militar?"
                                  >
                                    <Reply size={11} />
                                    Responder
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Reply Panel (If admin click replying) */}
                            {isReplying && (
                              <div className="ml-1.5 bg-white border border-blue-200/50 rounded-xl p-3.5 mt-2 space-y-3.5 shadow-sm">
                                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                                  <span className="flex items-center gap-1">
                                    <Shield size={13} className="text-blue-500" />
                                    Aparelho de Resposta do TI Militar:
                                  </span>
                                  {/* Select Priority status */}
                                  <div className="flex border border-slate-200 p-0.5 rounded-lg bg-slate-50 shrink-0">
                                    {['pendente', 'em_analise', 'implementado', 'recusado'].map(st => (
                                      <button
                                        key={st}
                                        type="button"
                                        onClick={() => setReplyStatus(st as any)}
                                        className={cn(
                                          "px-2 py-0.5 text-[9px] font-bold rounded-md uppercase tracking-wider transition-all cursor-pointer",
                                          replyStatus === st 
                                            ? "bg-slate-900 text-white" 
                                            : "text-slate-400 hover:text-slate-600"
                                        )}
                                      >
                                        {st === 'em_analise' ? 'Em análise' : st === 'pendente' ? 'Pendente' : st === 'implementado' ? 'Feito' : 'Não'}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <textarea
                                  rows={2.5}
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  placeholder="Escreva a resposta e justifique a aprovação, direcionamento técnico ou declinação ao militar..."
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-xs"
                                />

                                <div className="flex items-center justify-end gap-2 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => setReplyingToId(null)}
                                    className="px-3 py-1.5 text-[10px] font-black uppercase text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAdminReply(sug.id)}
                                    disabled={isSubmitting}
                                    className="px-3.5 py-1.5 text-[10px] font-black uppercase text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                                  >
                                    {isSubmitting ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                                    Registrar Resposta
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Reply Answer Display (if response exists for normal user to read) */}
                            {sug.resposta_ti && !isReplying && (
                              <div className="ml-1.5 bg-blue-50/50 border border-blue-105 rounded-xl p-3 text-xs flex gap-2">
                                <Reply size={13} className="text-blue-500 shrink-0 mt-0.5 transform rotate-180" />
                                <div className="space-y-0.5">
                                  <p className="font-extrabold text-slate-800 text-[10px] uppercase tracking-wide text-blue-800">Resposta do TI:</p>
                                  <p className="text-slate-600 leading-relaxed font-medium">{sug.resposta_ti}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-slate-400 border border-slate-200 border-dashed rounded-xl gap-2">
                      <Bookmark size={32} className="text-slate-300" />
                      <p className="font-bold text-slate-800 text-xs">Ainda não há sugestões</p>
                      <p className="text-[11px] max-w-sm font-semibold text-slate-400">
                        Que tal dar a primeira sugestão de aprimoramento e ajudar a construir um sistema cada vez melhor para todos nós?
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Total count footer */}
            <div className="bg-slate-50 border-t border-slate-200 p-4 text-center text-[10px] text-slate-400 font-extrabold uppercase tracking-widest shrink-0">
              Escola Digital &copy; 2026 - Central de Sugestões de Tecnologia
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
