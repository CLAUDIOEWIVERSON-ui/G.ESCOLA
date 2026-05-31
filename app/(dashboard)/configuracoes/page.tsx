'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { useUser } from '@/lib/auth/UserContext';
import { fetchWithAuth } from '@/lib/api';
import { 
  Settings, 
  Save, 
  Loader2, 
  Trophy, 
  Target, 
  Calendar,
  Percent,
  Lock,
  ShieldAlert,
  KeyRound,
  Mail,
  CheckCircle,
  AlertTriangle,
  Send,
  RefreshCw,
  Database,
  Copy,
  ChevronDown,
  ChevronUp,
  Check,
  ExternalLink,
  FileText
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

import { Toaster, toast } from 'sonner';

export default function ConfiguracoesPage() {
  const { t } = useI18n();
  const { isAdmin, profile, refreshProfile } = useUser();
  const isReadOnly = !isAdmin;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Personal password change states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [config, setConfig] = useState<any>({
    media_aprovacao: 7,
    media_recuperacao: 5,
    nota_maxima: 10,
    frequencia_minima: 75,
    ano_letivo_atual: new Date().getFullYear()
  });

  // SMTP Server states
  const [smtpStatus, setSmtpStatus] = useState<any>(null);
  const [smtpLoading, setSmtpLoading] = useState(true);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  // Database migrations/integrity status
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [expandedMig, setExpandedMig] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchSmtpStatus = useCallback(async () => {
    if (!isAdmin) return;
    setSmtpLoading(true);
    try {
      const res = await fetch('/api/admin/smtp-status');
      if (res.ok) {
        const data = await res.json();
        setSmtpStatus(data);
      }
    } catch (err) {
      console.error('Error fetching SMTP status:', err);
    } finally {
      setSmtpLoading(false);
    }
  }, [isAdmin]);

  const fetchDbIntegrity = useCallback(async () => {
    if (!isAdmin) return;
    setDbLoading(true);
    try {
      const res = await fetch('/api/admin/migrations');
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data);
      }
    } catch (err) {
      console.error('Error checking DB integrity:', err);
    } finally {
      setDbLoading(false);
    }
  }, [isAdmin]);

  const handleCopySql = (sql: string, key: string) => {
    navigator.clipboard.writeText(sql);
    setCopiedKey(key);
    toast.success('SQL copiado com sucesso para a área de transferência!');
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (isAdmin && active) {
        fetchSmtpStatus();
        fetchDbIntegrity();
      }
    }, 50);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isAdmin, fetchSmtpStatus, fetchDbIntegrity]);

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail || !testEmail.includes('@')) {
      toast.error('Insira um e-mail válido para o destinatário de teste.');
      return;
    }
    setSendingTest(true);
    const toastId = toast.loading('Enviando e-mail de teste...');
    try {
      const res = await fetch('/api/admin/smtp-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao enviar e-mail de teste.');
      }
      toast.success(data.message || 'E-mail de teste enviado!', { id: toastId });
      setTestEmail('');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao rodar teste SMTP.', { id: toastId });
    } finally {
      setSendingTest(false);
    }
  };

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data, error } = await supabase
          .from('configuracoes')
          .select('*')
          .single();

        if (error) {
          // PGRST116 is "no rows returned". Other errors might mean the table doesn't exist yet.
          if (error.code !== 'PGRST116') {
            console.warn('Note: Configuration table might be missing or inaccessible. Using defaults.', error);
          }
          return;
        }

        if (data) setConfig(data);
      } catch (err: any) {
        console.error('Unexpected error in fetchConfig:', err?.message || err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async () => {
    if (isReadOnly) return;
    setSaving(true);
    const loadingToast = toast.loading(t.common.loading || 'Salvando...');
    try {
      const { error } = await supabase
        .from('configuracoes')
        .upsert({
          id: config.id,
          media_aprovacao: parseFloat(config.media_aprovacao),
          media_recuperacao: parseFloat(config.media_recuperacao),
          nota_maxima: parseFloat(config.nota_maxima),
          frequencia_minima: parseInt(config.frequencia_minima),
          ano_letivo_atual: parseInt(config.ano_letivo_atual),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      toast.success(t.settings.saveSuccess, { id: loadingToast });
    } catch (err: any) {
      toast.error(t.common.saveError || err.message, { id: loadingToast });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('As senhas digitadas não coincidem.');
      return;
    }

    setUpdatingPassword(true);
    const toastId = toast.loading('Atualizando sua senha...');
    try {
      const response = await fetchWithAuth('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Erro ao alterar senha.');
      }

      toast.success('Senha atualizada com sucesso! Esta foi a sua única alteração autônoma permitida.', { id: toastId });
      setNewPassword('');
      setConfirmPassword('');
      await refreshProfile();
    } catch (err: any) {
      toast.error(err.message, { id: toastId });
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.settings.title}</h1>
        <p className="text-slate-500 text-sm">{t.settings.subtitle}</p>
      </div>

      {profile?.role !== 'aluno' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
               <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <Trophy size={20} />
               </div>
               <div className="flex-1">
                  <div className="flex items-center justify-between">
                     <h2 className="font-bold text-slate-800">{t.settings.academicAverages}</h2>
                     {!isAdmin && (
                       <span className="text-[9px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">Somente Leitura</span>
                     )}
                  </div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">{t.settings.evaluationCriteria}</p>
               </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">{t.settings.maxGrade}</label>
                <div className="relative">
                   <input
                     type="number"
                     step="0.1"
                     value={config.nota_maxima}
                     disabled={!isAdmin}
                     onChange={(e) => setConfig({ ...config, nota_maxima: e.target.value })}
                     className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm font-bold disabled:opacity-75 disabled:cursor-not-allowed"
                   />
                   <Settings size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 italic">{t.settings.maxGradeDesc}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">{t.settings.passingGrade}</label>
                  <div className="relative">
                     <input
                       type="number"
                       step="0.1"
                       value={config.media_aprovacao}
                       disabled={!isAdmin}
                       onChange={(e) => setConfig({ ...config, media_aprovacao: e.target.value })}
                       className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm font-bold disabled:opacity-75 disabled:cursor-not-allowed"
                     />
                     <Target size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">{t.settings.recoveryGrade}</label>
                  <div className="relative">
                     <input
                       type="number"
                       step="0.1"
                       value={config.media_recuperacao}
                       disabled={!isAdmin}
                       onChange={(e) => setConfig({ ...config, media_recuperacao: e.target.value })}
                       className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm font-bold disabled:opacity-75 disabled:cursor-not-allowed"
                     />
                     <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <Loader2 size={16} />
                     </div>
                  </div>
                </div>
              </div>
              
              <p className="text-[10px] text-slate-400 mt-1 italic">
                {t.settings.passingGradeDesc} | {t.settings.recoveryGradeDesc}
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
               <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                  <Calendar size={20} />
               </div>
               <div className="flex-1">
                  <div className="flex items-center justify-between">
                     <h2 className="font-bold text-slate-800">{t.settings.generalParameters}</h2>
                     {!isAdmin && (
                       <span className="text-[9px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">Somente Leitura</span>
                     )}
                  </div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">{t.nav.year}</p>
               </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">{t.settings.minFrequency}</label>
                <div className="relative">
                   <input
                     type="number"
                     value={config.frequencia_minima}
                     disabled={!isAdmin}
                     onChange={(e) => setConfig({ ...config, frequencia_minima: e.target.value })}
                     className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm font-bold disabled:opacity-75 disabled:cursor-not-allowed"
                   />
                   <Percent size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 italic">{t.settings.minFrequencyDesc}</p>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">{t.settings.currentYear}</label>
                <div className="relative">
                   <input
                     type="number"
                     value={config.ano_letivo_atual}
                     disabled={!isAdmin}
                     onChange={(e) => setConfig({ ...config, ano_letivo_atual: e.target.value })}
                     className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm font-bold disabled:opacity-75 disabled:cursor-not-allowed"
                   />
                   <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 italic">{t.settings.currentYearDesc}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Change Policy Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
           <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Lock size={20} />
           </div>
           <div>
              <h2 className="font-bold text-slate-800">Segurança da Conta & Alteração de Senha</h2>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Política de troca única de senha</p>
           </div>
        </div>

        {profile?.has_changed_password ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex gap-4">
            <div className="text-amber-600 shrink-0 mt-0.5 animate-pulse">
              <ShieldAlert size={24} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-amber-800">Alteração Não Permitida</h4>
              <p className="text-xs text-amber-700 leading-relaxed font-semibold">
                Você já alterou sua senha de primeiro acesso uma vez. Conforme as regras de segurança estabelecidas, caso tenha esquecido ou queira realizar uma nova alteração, você deve **solicitar diretamente a um Administrador** do sistema para redefini-la.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-xl">
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-xs text-blue-800 leading-relaxed font-medium mb-2">
              ⚠️ **Atenção:** Você poderá trocar sua senha de primeiro acesso **apenas uma vez**. Após essa alteração autônoma, qualquer futura alteração de senha só poderá ser solicitada a um Administrador do sistema.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Nova Senha</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder="Mínimo de 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-sm font-bold"
                  />
                  <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Confirmar Nova Senha</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder="Repita a senha digitada"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-sm font-bold"
                  />
                  <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={updatingPassword}
                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer"
              >
                {updatingPassword ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Alterar Minha Senha
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Servidor de E-mails Card */}
      {isAdmin && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Mail size={20} />
               </div>
               <div>
                  <h2 className="font-bold text-slate-800">Servidor de Envio de E-mails (SMTP)</h2>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Distribuição de Códigos aos Alunos</p>
               </div>
            </div>
            <button
              onClick={fetchSmtpStatus}
              disabled={smtpLoading}
              className="p-2 hover:bg-slate-50 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-700 transition cursor-pointer"
              title="Atualizar status"
            >
              <RefreshCw size={14} className={smtpLoading ? "animate-spin" : ""} />
            </button>
          </div>

          {smtpLoading ? (
            <div className="py-6 flex justify-center items-center gap-2 text-slate-500 text-xs font-mono">
              <Loader2 size={16} className="animate-spin text-emerald-600" />
              Carregando status do canal de e-mails...
            </div>
          ) : smtpStatus ? (
            <div className="space-y-4">
              {/* Status Header */}
              <div className={cn(
                "p-4 rounded-xl border flex items-start gap-3",
                smtpStatus.isConfigured 
                  ? "bg-emerald-50/50 border-emerald-100 text-emerald-800"
                  : "bg-amber-50/50 border-amber-100 text-amber-800"
              )}>
                {smtpStatus.isConfigured ? (
                  <CheckCircle size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    {smtpStatus.isConfigured ? "Servidor de Emails Ativo & Configurado" : "Servidor de Emails Não Configurado / Pendente"}
                  </h4>
                  <p className="text-[11px] opacity-90 leading-relaxed mt-1 font-sans">
                    {smtpStatus.isConfigured 
                      ? "As credenciais do servidor SMTP foram detectadas corretas no ambiente. Os códigos de acesso de novos ou atuais alunos serão despachados a eles de maneira automatizada e segura."
                      : "As credenciais SMTP_HOST, SMTP_USER ou SMTP_PASS estão vazias nos Secrets. O recurso de disparo autônomo está temporariamente desativado até a inclusão das variáveis de ambiente correspondentes."}
                  </p>
                </div>
              </div>

              {/* Server info list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs font-mono">
                <div>
                  <span className="block text-[10px] uppercase text-slate-400 font-bold mb-0.5">Host de Envio (SMTP)</span>
                  <span className="font-semibold text-slate-700">{smtpStatus.smtpHost || 'Não especificado (-)'}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-slate-400 font-bold mb-0.5">Porta</span>
                  <span className="font-semibold text-slate-700">{smtpStatus.smtpPort || '587'} {smtpStatus.smtpSecure ? '(SSL/TLS Seguro)' : '(Standard)'}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-slate-400 font-bold mb-0.5">Usuário autenticado</span>
                  <span className="font-semibold text-slate-600">{smtpStatus.smtpUser || 'Não configurado'}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-slate-400 font-bold mb-0.5">Remetente Oficial (From)</span>
                  <span className="font-semibold text-slate-700">{smtpStatus.smtpFrom}</span>
                </div>
              </div>

              {/* Send test form if configured */}
              {smtpStatus.isConfigured && (
                <form onSubmit={handleSendTestEmail} className="pt-2 space-y-3">
                  <div className="h-[1px] bg-slate-100" />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700">Testar Disparo de E-mail</label>
                    <p className="text-[10px] text-slate-400">Insira um endereço válido para que o sistema envie uma mensagem SMTP de validação imediata.</p>
                  </div>
                  <div className="flex gap-2 max-w-md">
                    <input
                      type="email"
                      required
                      placeholder="seu-email@teste.com"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    />
                    <button
                      type="submit"
                      disabled={sendingTest}
                      className="bg-emerald-600 text-white font-bold text-xs px-4 py-2 rounded-lg hover:bg-emerald-700 transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm shadow-emerald-50"
                    >
                      {sendingTest ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                      Testar
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-xs italic text-slate-400 font-mono">
              Não foi possível sincronizar informações do servidor SMTP.
            </div>
          )}
        </div>
      )}

      {/* Integridade do Banco de Dados Card */}
      {isAdmin && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-50 pb-4 gap-4">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Database size={20} />
               </div>
               <div>
                  <h2 className="font-bold text-slate-800 font-sans">Integridade de Tabelas Supabase</h2>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold font-sans">Verificação do esquema do banco de dados e migrações SQL</p>
               </div>
            </div>
            <button
              onClick={fetchDbIntegrity}
              disabled={dbLoading}
              className="p-2 hover:bg-slate-50 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-700 transition cursor-pointer flex items-center gap-1 text-xs font-bold"
              title="Atualizar verificação"
            >
              <RefreshCw size={14} className={dbLoading ? "animate-spin" : ""} />
              {dbLoading ? "Verificando..." : "Atualizar Verificação"}
            </button>
          </div>

          {dbLoading && !dbStatus ? (
            <div className="py-8 flex flex-col justify-center items-center gap-2 text-slate-500 text-xs font-mono">
              <Loader2 size={16} className="animate-spin text-indigo-600" />
              Sondando relações de tabelas e integridade do Supabase...
            </div>
          ) : dbStatus?.results ? (
            <div className="space-y-6">
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 text-xs text-slate-600 leading-relaxed font-sans">
                ℹ️ **Gestor de Migrações:** Esta seção monitora de forma inteligente o banco de dados do Supabase. Se algum recurso estiver desativado ou exibir **Ausente**, copie e execute a migração correspondente no console do Supabase para restabelecer o pleno funcionamento do sistema.
              </div>

              <div className="divide-y divide-slate-100">
                {dbStatus.results.map((item: any) => (
                  <div key={item.key} className="py-4 first:pt-0 last:pb-0 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-black text-slate-800">{item.tableName}{item.isColumn && `.${item.columnName}`}</span>
                          <span className="text-[9px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono">{item.fileName}</span>
                        </div>
                        <p className="text-xs text-slate-500 max-w-2xl font-medium">{item.description}</p>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center">
                        {item.status === 'valid' ? (
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-full text-[10px] font-black uppercase tracking-wider">
                            <CheckCircle size={12} className="text-emerald-600" />
                            Integridade OK
                          </div>
                        ) : item.status === 'missing' ? (
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-800 border border-rose-100 rounded-full text-[10px] font-black uppercase tracking-wider animate-pulse">
                            <AlertTriangle size={12} className="text-rose-600" />
                            {item.isColumn ? 'Coluna Ausente' : 'Tabela Ausente'}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-100 rounded-full text-[10px] font-black uppercase tracking-wider">
                            <AlertTriangle size={12} className="text-amber-600" />
                            Erro de Validação
                          </div>
                        )}

                        <button
                          onClick={() => setExpandedMig(expandedMig === item.key ? null : item.key)}
                          className="p-1 px-2 hover:bg-slate-100 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 flex items-center gap-1 text-[10px] font-bold transition cursor-pointer"
                        >
                          SQL
                          {expandedMig === item.key ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                        </button>
                      </div>
                    </div>

                    {item.errorMessage && (
                      <div className="p-3 bg-red-50 border border-red-100 rounded-xl font-mono text-[10px] text-red-600 leading-relaxed overflow-x-auto">
                        ⚠️ **Log Técnico:** {item.errorMessage}
                      </div>
                    )}

                    {expandedMig === item.key && (
                      <div className="bg-slate-900 rounded-xl p-4 space-y-4 shadow-inner text-slate-200 border border-slate-800 font-sans">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-mono flex items-center gap-1">
                            <FileText size={10} />
                            Migração SQL — {item.fileName}
                          </span>
                          <button
                            onClick={() => handleCopySql(item.sql, item.key)}
                            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer border border-slate-700"
                          >
                            {copiedKey === item.key ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                            {copiedKey === item.key ? 'Copiado!' : 'Copiar SQL'}
                          </button>
                        </div>
                        
                        <pre className="relative font-mono text-[11px] leading-relaxed bg-slate-950 p-3 rounded-lg overflow-x-auto max-h-60 border border-slate-800 text-emerald-400 whitespace-pre">
                          <code>{item.sql}</code>
                        </pre>

                        <div className="text-[10px] text-slate-400 bg-slate-800/30 p-3 rounded-lg space-y-1">
                          <p className="font-bold text-slate-300">💡 Como executar esta migração no Supabase:</p>
                          <ol className="list-decimal pl-4 space-y-1.5 mt-1 font-sans">
                            <li>Clique no botão **Copiar SQL** acima.</li>
                            <li>Acesse seu **Supabase Dashboard** do projeto (onde o banco de dados está sincronizado).</li>
                            <li>No painel lateral esquerdo, selecione a aba **SQL Editor** (representada pelo ícone de terminal <code className="bg-slate-800 px-1 rounded">&gt;_</code>).</li>
                            <li>Clique em **+ New Query** no topo esquerdo da página.</li>
                            <li>Cole o código SQL na área de texto e clique no botão verde **Run** (ou pressione <code className="bg-slate-800 px-1 rounded">Ctrl + Enter</code>).</li>
                            <li>Após ver a mensagem de sucesso, retorne a esta página e clique no botão **Atualizar Verificação** no topo para renovar as tabelas!</li>
                          </ol>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-xs italic text-slate-400 font-mono">
              Nenhuma informação de integridade do banco de dados recebida do servidor.
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end pt-4">
        {!isReadOnly && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-xl font-bold shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-70 group"
          >
            {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} className="group-hover:translate-x-0.5 transition-transform" />}
            {t.settings.saveChanges}
          </button>
        )}
      </div>
    </div>
  );
}
