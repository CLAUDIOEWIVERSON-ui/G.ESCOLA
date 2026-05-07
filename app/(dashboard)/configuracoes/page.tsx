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
  Percent
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export default function ConfiguracoesPage() {
  const { t } = useI18n();
  const { isAdmin, isAluno } = useUser();
  const isGuest = isAluno; // For backward compatibility in logic
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<any>({
    media_aprovacao: 7,
    media_recuperacao: 5,
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
            console.warn('Note: Configuration table might be missing or inaccessible. Please run migrations. error code:', error.code, error.message);
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
    if (isGuest) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('configuracoes')
        .upsert({
          id: config.id,
          media_aprovacao: parseFloat(config.media_aprovacao),
          media_recuperacao: parseFloat(config.media_recuperacao),
          frequencia_minima: parseInt(config.frequencia_minima),
          ano_letivo_atual: parseInt(config.ano_letivo_atual),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      alert(t.settings.saveSuccess);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
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
              <p className="text-[10px] text-slate-400 mt-1 italic">{t.settings.passingGradeDesc}</p>
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
              <p className="text-[10px] text-slate-400 mt-1 italic">{t.settings.recoveryGradeDesc}</p>
            </div>
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

      <div className="flex justify-end pt-4">
        {!isGuest && (
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
