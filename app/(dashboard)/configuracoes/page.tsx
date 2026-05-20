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
  User,
  Shield,
  Key,
  Mail,
  Camera
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

import { Toaster, toast } from 'sonner';

export default function ConfiguracoesPage() {
  const { t, language } = useI18n();
  const { profile, isAdmin, isInstrutor, isAluno } = useUser();
  const isReadOnly = !isAdmin;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<any>({
    media_aprovacao: 7,
    media_recuperacao: 5,
    nota_maxima: 10,
    frequencia_minima: 75,
    ano_letivo_atual: new Date().getFullYear()
  });

  const [studentInfo, setStudentInfo] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data, error } = await supabase
          .from('configuracoes')
          .select('*')
          .single();

        if (data) setConfig(data);

        if (isAluno && profile?.email) {
          const { data: alunoData } = await supabase
            .from('alunos')
            .select('*, turmas(nome)')
            .eq('email', profile.email)
            .single();
          if (alunoData) setStudentInfo(alunoData);
        }
      } catch (err: any) {
        console.error('Unexpected error in fetchData:', err?.message || err);
      } finally {
        setLoading(false);
      }
    };
    if (profile?.email || !isAluno) {
      fetchData();
    }
  }, [profile, isAluno]);

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

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">{isAluno ? "Meu Perfil" : t.settings.title}</h1>
        <p className="text-slate-500 font-medium">{isAluno ? "Informações da sua conta e dados acadêmicos" : t.settings.subtitle}</p>
      </motion.div>

      {/* Profile Card - Visible to all but prioritized for Aluno */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col md:flex-row items-center gap-10">
        <div className="relative group">
          <div className="relative w-40 h-40 rounded-3xl overflow-hidden border-8 border-slate-50 shadow-inner bg-slate-100">
             {isAluno && studentInfo?.foto_url ? (
               <Image 
                 src={studentInfo.foto_url} 
                 alt="Profile" 
                 fill 
                 className="object-cover"
                 referrerPolicy="no-referrer"
               />
             ) : (
               <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <User size={64} strokeWidth={1.5} />
               </div>
             )}
          </div>
          {isAluno && (
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg border-2 border-white cursor-pointer hover:bg-blue-700 transition-colors">
              <Camera size={18} />
            </div>
          )}
        </div>

        <div className="flex-1 space-y-6 text-center md:text-left w-full">
           <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-2">
                 <Shield size={12} />
                 {profile?.role || "Usuário"}
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
                {isAluno ? studentInfo?.nome : profile?.full_name || "Usuário"}
              </h2>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-slate-400">
                <span className="flex items-center gap-1.5 text-xs font-bold font-mono">
                  <Mail size={12} />
                  {profile?.email}
                </span>
                {isAluno && (
                  <span className="flex items-center gap-1.5 text-xs font-bold font-mono">
                    <Key size={12} />
                    MAT: {studentInfo?.matricula}
                  </span>
                )}
              </div>
           </div>

           {isAluno && studentInfo && (
             <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Turma Atual</p>
                   <p className="text-sm font-black text-slate-700">{studentInfo.turmas?.nome || '---'}</p>
                </div>
                <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Posto/Grad</p>
                   <p className="text-sm font-black text-slate-700">{studentInfo.posto_graduacao || '---'}</p>
                </div>
                <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">NIF</p>
                   <p className="text-sm font-black text-slate-700">{studentInfo.nif || '---'}</p>
                </div>
             </div>
           )}
        </div>
      </div>

      {!isAluno && (
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
                     readOnly={isReadOnly}
                     type="number"
                     step="0.1"
                     value={config.nota_maxima}
                     onChange={(e) => setConfig({ ...config, nota_maxima: e.target.value })}
                     className={cn(
                       "w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm font-bold",
                       isReadOnly && "opacity-50 cursor-not-allowed"
                     )}
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
                       readOnly={isReadOnly}
                       type="number"
                       step="0.1"
                       value={config.media_aprovacao}
                       onChange={(e) => setConfig({ ...config, media_aprovacao: e.target.value })}
                       className={cn(
                         "w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm font-bold",
                         isReadOnly && "opacity-50 cursor-not-allowed"
                       )}
                     />
                     <Target size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">{t.settings.recoveryGrade}</label>
                  <div className="relative">
                     <input
                       readOnly={isReadOnly}
                       type="number"
                       step="0.1"
                       value={config.media_recuperacao}
                       onChange={(e) => setConfig({ ...config, media_recuperacao: e.target.value })}
                       className={cn(
                         "w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm font-bold",
                         isReadOnly && "opacity-50 cursor-not-allowed"
                       )}
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
                     readOnly={isReadOnly}
                     type="number"
                     value={config.frequencia_minima}
                     onChange={(e) => setConfig({ ...config, frequencia_minima: e.target.value })}
                     className={cn(
                       "w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm font-bold",
                       isReadOnly && "opacity-50 cursor-not-allowed"
                     )}
                   />
                   <Percent size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 italic">{t.settings.minFrequencyDesc}</p>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">{t.settings.currentYear}</label>
                <div className="relative">
                   <input
                     readOnly={isReadOnly}
                     type="number"
                     value={config.ano_letivo_atual}
                     onChange={(e) => setConfig({ ...config, ano_letivo_atual: e.target.value })}
                     className={cn(
                       "w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm font-bold",
                       isReadOnly && "opacity-50 cursor-not-allowed"
                     )}
                   />
                   <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 italic">{t.settings.currentYearDesc}</p>
              </div>
            </div>
          </div>
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
