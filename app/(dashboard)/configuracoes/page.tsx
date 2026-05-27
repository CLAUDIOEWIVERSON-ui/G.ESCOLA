'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { useUser } from '@/lib/auth/UserContext';
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
  KeyRound
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
      const response = await fetch('/api/auth/change-password', {
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
             <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <Trophy size={20} />
             </div>
             <div>
                <h2 className="font-bold text-slate-800">{t.settings.academicAverages}</h2>
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
                   onChange={(e) => setConfig({ ...config, nota_maxima: e.target.value })}
                   className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm font-bold"
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
                     onChange={(e) => setConfig({ ...config, media_aprovacao: e.target.value })}
                     className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm font-bold"
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
                     onChange={(e) => setConfig({ ...config, media_recuperacao: e.target.value })}
                     className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm font-bold"
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
             <div>
                <h2 className="font-bold text-slate-800">{t.settings.generalParameters}</h2>
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
                   onChange={(e) => setConfig({ ...config, frequencia_minima: e.target.value })}
                   className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm font-bold"
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
                   onChange={(e) => setConfig({ ...config, ano_letivo_atual: e.target.value })}
                   className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm font-bold"
                 />
                 <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
              <p className="text-[10px] text-slate-400 mt-1 italic">{t.settings.currentYearDesc}</p>
            </div>
          </div>
        </div>
      </div>

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
