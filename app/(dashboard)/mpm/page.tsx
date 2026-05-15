'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { useUser } from '@/lib/auth/UserContext';
import { 
  Plus, 
  Search, 
  BookOpen, 
  Clock, 
  FileText, 
  Pencil, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  RefreshCcw, 
  GraduationCap, 
  Target,
  FlaskConical,
  ChevronRight,
  TrendingUp,
  Layout
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import Modal from '@/components/Modal';

function MPMContent() {
  const { t, language } = useI18n();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const courseParam = searchParams.get('curso');
  
  const { isAdmin } = useUser();
  const isReadOnly = !isAdmin;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mpmData, setMpmData] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [disciplines, setDisciplines] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(courseParam);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMpm, setCurrentMpm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchData = useCallback(async (isRefresh = false, isInitial = false) => {
    await Promise.resolve();
    if (isRefresh) setRefreshing(true);
    if (!isInitial && !isRefresh) setLoading(true);

    try {
      // Fetch Courses
      const { data: coursesData } = await supabase
        .from('cursos')
        .select('*')
        .order('nome');
      
      if (coursesData) setCourses(coursesData);
      
      // If no course selected, pick first one if none in params
      const courseId = courseParam || (coursesData && coursesData.length > 0 ? coursesData[0].id : null);

      // Fetch MPM Data
      let query = supabase
        .from('mpm_map')
        .select(`
          *,
          cursos (nome),
          disciplinas (nome, codigo)
        `)
        .order('modulo_numero')
        .order('created_at');

      if (courseId) {
        query = query.eq('curso_id', courseId);
      }

      const { data } = await query;
      if (data) setMpmData(data);

      // Fetch Disciplines for the selected course
      if (courseId) {
        const { data: discData } = await supabase
          .from('disciplinas')
          .select('*')
          .eq('curso_id', courseId)
          .order('nome');
        if (discData) setDisciplines(discData);
      }

    } catch (error) {
      console.error('Error fetching MPM:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [courseParam]);

  useEffect(() => {
    const init = async () => {
      await fetchData(false, true);
    };
    init();
  }, [fetchData]);

  const handleCourseChange = (id: string) => {
    setSelectedCourse(id);
    const params = new URLSearchParams(searchParams.toString());
    params.set('curso', id);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleOpenModal = (mpm: any = null) => {
    if (isReadOnly) return;
    setCurrentMpm(mpm || {
      curso_id: selectedCourse,
      modulo_numero: 1,
      disciplina_id: '',
      carga_horaria_teorica: 0,
      carga_horaria_pratica: 0,
      objetivos: '',
      metodologia: '',
      avaliacao: ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    setSaving(true);

    try {
      const payload = {
        curso_id: currentMpm.curso_id,
        modulo_numero: currentMpm.modulo_numero,
        disciplina_id: currentMpm.disciplina_id || null,
        carga_horaria_teorica: currentMpm.carga_horaria_teorica || 0,
        carga_horaria_pratica: currentMpm.carga_horaria_pratica || 0,
        objetivos: currentMpm.objetivos || '',
        metodologia: currentMpm.metodologia || '',
        avaliacao: currentMpm.avaliacao || '',
        updated_at: new Date().toISOString()
      };

      if (currentMpm.id) {
        await supabase
          .from('mpm_map')
          .update(payload)
          .eq('id', currentMpm.id);
      } else {
        await supabase
          .from('mpm_map')
          .insert([payload]);
      }

      await fetchData(true);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving MPM:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (isReadOnly) return;
    if (!confirm('Tem certeza que deseja excluir este planejamento?')) return;
    
    setDeleting(id);
    try {
      await supabase.from('mpm_map').delete().eq('id', id);
      await fetchData(true);
    } catch (error) {
      console.error('Error deleting MPM:', error);
    } finally {
      setDeleting(null);
    }
  };

  const totalTH = mpmData.reduce((acc, curr) => acc + (curr.carga_horaria_teorica || 0), 0);
  const totalPH = mpmData.reduce((acc, curr) => acc + (curr.carga_horaria_pratica || 0), 0);
  const totalCH = totalTH + totalPH;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layout className="text-blue-600" size={24} />
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t.mpm.title}</h1>
          </div>
          <p className="text-slate-500 text-sm italic font-medium">{t.mpm.subtitle}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <select 
            value={selectedCourse || ''}
            onChange={(e) => handleCourseChange(e.target.value)}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
          >
            <option value="">{t.courses.selectCourse}</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>

          <button 
            onClick={() => fetchData(true)}
            className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
          >
            <RefreshCcw size={20} className={refreshing ? "animate-spin" : ""} />
          </button>

          {!isReadOnly && (
            <button 
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
            >
              <Plus size={18} />
              {t.mpm.add}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {loading ? (
            <div className="py-20 flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            </div>
          ) : mpmData.length > 0 ? (
            <div className="space-y-4">
              {Array.from(new Set(mpmData.map(m => m.modulo_numero))).sort().map(modNum => (
                <div key={modNum} className="space-y-3">
                  <div className="flex items-center gap-2 px-2">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-xs font-black">
                      {modNum}
                    </div>
                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">{t.mpm.module} {modNum}</h2>
                    <div className="flex-1 h-[1px] bg-slate-200 ml-4" />
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {mpmData.filter(m => m.modulo_numero === modNum).map((mpm, i) => (
                      <motion.div
                        key={mpm.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm group hover:border-blue-200 hover:shadow-md transition-all flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-10 h-10 bg-slate-50 flex items-center justify-center rounded-xl text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                            <BookOpen size={20} />
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{mpm.disciplinas?.codigo}</p>
                            <h3 className="text-sm font-bold text-slate-800">{mpm.disciplinas?.nome}</h3>
                          </div>
                        </div>

                        <div className="flex items-center gap-8 mr-8">
                          <div className="text-center">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.mpm.theoretical}</p>
                            <p className="text-xs font-bold text-slate-700">{mpm.carga_horaria_teorica}h</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.mpm.practical}</p>
                            <p className="text-xs font-bold text-slate-700">{mpm.carga_horaria_pratica}h</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          {!isReadOnly && (
                            <>
                              <button 
                                onClick={() => handleOpenModal(mpm)}
                                className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                              >
                                <Pencil size={16} />
                              </button>
                              <button 
                                onClick={() => handleDelete(mpm.id)}
                                disabled={deleting === mpm.id}
                                className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors disabled:opacity-50"
                              >
                                {deleting === mpm.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                              </button>
                            </>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-32 flex flex-col items-center justify-center text-center bg-white rounded-[40px] border border-dashed border-slate-200">
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 text-slate-200">
                <Layout size={48} strokeWidth={1} />
              </div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">{t.common.noneFound}</h3>
              <p className="text-slate-400 text-sm max-w-xs mt-2 font-medium italic">Nenhum planejamento registrado para este curso.</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 blur-3xl -translate-y-1/2 translate-x-1/2" />
            
            <div className="relative z-10 space-y-8">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Carga Horária Total</p>
                <h4 className="text-4xl font-black">{totalCH}h</h4>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                  <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1">{t.mpm.theoretical}</p>
                  <p className="text-xl font-bold">{totalTH}h</p>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                  <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-1">{t.mpm.practical}</p>
                  <p className="text-xl font-bold">{totalPH}h</p>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <TrendingUp size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400">Proporção T/P</p>
                    <p className="text-xs font-black">{totalCH > 0 ? ((totalTH / totalCH) * 100).toFixed(0) : 0}% Teórica</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <Target size={14} className="text-blue-600" />
              Recentemente Adicionados
            </h3>
            
            <div className="space-y-4">
              {mpmData.slice(0, 3).map(m => (
                <div key={m.id} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-800">{m.disciplinas?.nome}</p>
                    <p className="text-[8px] font-medium text-slate-400 uppercase">{t.mpm.module} {m.modulo_numero}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentMpm?.id ? t.common.edit : t.mpm.add}
      >
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{t.nav.courses}</label>
              <select
                required
                value={currentMpm?.curso_id || ''}
                onChange={(e) => setCurrentMpm({ ...currentMpm, curso_id: e.target.value })}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-sm font-bold text-slate-800 appearance-none shadow-sm"
              >
                <option value="">{t.courses.selectCourse}</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{t.mpm.module}</label>
              <input
                required
                type="number"
                min="1"
                value={currentMpm?.modulo_numero || ''}
                onChange={(e) => setCurrentMpm({ ...currentMpm, modulo_numero: parseInt(e.target.value) })}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-sm font-bold text-slate-800 shadow-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Disciplina</label>
              <select
                required
                value={currentMpm?.disciplina_id || ''}
                onChange={(e) => setCurrentMpm({ ...currentMpm, disciplina_id: e.target.value })}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-sm font-bold text-slate-800 appearance-none shadow-sm"
              >
                <option value="">Selecione a Disciplina</option>
                {disciplines.map(d => (
                  <option key={d.id} value={d.id}>{d.nome} ({d.codigo})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{t.mpm.theoretical}</label>
              <input
                required
                type="number"
                min="0"
                value={currentMpm?.carga_horaria_teorica || 0}
                onChange={(e) => setCurrentMpm({ ...currentMpm, carga_horaria_teorica: parseInt(e.target.value) })}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-sm font-bold text-slate-800 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{t.mpm.practical}</label>
              <input
                required
                type="number"
                min="0"
                value={currentMpm?.carga_horaria_pratica || 0}
                onChange={(e) => setCurrentMpm({ ...currentMpm, carga_horaria_pratica: parseInt(e.target.value) })}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-sm font-bold text-slate-800 shadow-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Objetivos</label>
              <textarea
                rows={3}
                value={currentMpm?.objetivos || ''}
                onChange={(e) => setCurrentMpm({ ...currentMpm, objetivos: e.target.value })}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-sm font-bold text-slate-800 shadow-sm resize-none"
                placeholder="Descreva os principais objetivos deste módulo..."
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-5 py-4 border border-slate-200 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-3 px-5 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
              {t.common.save}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function MPMPage() {
  return (
    <Suspense fallback={
      <div className="py-24 flex flex-col items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600"></div>
          <Layout className="absolute inset-0 m-auto text-blue-600" size={24} />
        </div>
      </div>
    }>
      <MPMContent />
    </Suspense>
  );
}
