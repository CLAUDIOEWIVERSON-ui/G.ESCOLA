'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { Plus, Search, Layers, Calendar, Clock, MapPin, Pencil, Trash2, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import Modal from '@/components/Modal';

export default function TurmasPage() {
  const { t } = useI18n();
  const [turmas, setTurmas] = useState<any[]>([]);
  const [cursos, setCursos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTurma, setCurrentTurma] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // Fetch Turmas
      const { data: turmasData } = await supabase
        .from('turmas')
        .select('*, curso:cursos(nome)')
        .is('deleted_at', null)
        .order('nome');
        
      if (turmasData) setTurmas(turmasData);

      // Fetch Cursos
      const { data: cursosData } = await supabase
        .from('cursos')
        .select('id, nome')
        .is('deleted_at', null)
        .order('nome');
        
      if (cursosData) setCursos(cursosData);
      
      setLoading(false);
    };

    fetchData();
  }, []);

  const refreshData = async () => {
    const { data: turmasData } = await supabase
      .from('turmas')
      .select('*, curso:cursos(nome)')
      .is('deleted_at', null)
      .order('nome');
      
    if (turmasData) setTurmas(turmasData);
  };

  const handleOpenModal = (turma: any = null) => {
    setCurrentTurma(turma || { nome: '', curso_id: '', ano: new Date().getFullYear(), periodo: 'manhã', capacidade_max: 40 });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (currentTurma.id) {
        const { error } = await supabase
          .from('turmas')
          .update({
            nome: currentTurma.nome,
            curso_id: currentTurma.curso_id,
            ano: currentTurma.ano,
            periodo: currentTurma.periodo,
            capacidade_max: currentTurma.capacidade_max
          })
          .eq('id', currentTurma.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('turmas')
          .insert([
            {
              nome: currentTurma.nome,
              curso_id: currentTurma.curso_id,
              ano: currentTurma.ano,
              periodo: currentTurma.periodo,
              capacidade_max: currentTurma.capacidade_max
            }
          ]);
        if (error) throw error;
      }

      await refreshData();
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.common.delete + '?')) return;
    setDeleting(id);
    
    try {
      const { error } = await supabase
        .from('turmas')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
        
      if (error) throw error;
      await refreshData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.classes.title}</h1>
          <p className="text-slate-500 text-sm italic mt-1">{t.classes.subtitle}</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm shadow-blue-100"
        >
          <Plus size={18} />
          {t.classes.add}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 flex justify-center">
             <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600"></div>
          </div>
        ) : turmas.map((turma, i) => (
          <motion.div 
            key={turma.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group shadow-sm hover:shadow-md transition-all"
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-slate-50 rotate-45 translate-x-8 -translate-y-8 group-hover:bg-blue-50 transition-colors"></div>
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                  <Layers size={20} />
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => handleOpenModal(turma)}
                    className="p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-400 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button 
                    disabled={deleting === turma.id}
                    onClick={() => handleDelete(turma.id)}
                    className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-400 transition-colors disabled:opacity-50"
                  >
                    {deleting === turma.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
              
              <h3 className="font-bold text-slate-800 text-lg mb-0.5 truncate">{turma.nome}</h3>
              <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider mb-4 truncate">{turma.curso?.nome}</p>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                  <div className="flex items-center gap-1">
                    <Calendar size={14} className="text-slate-300" />
                    <span>{turma.ano}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={14} className="text-slate-300" />
                    <span className="capitalize">
                      {turma.periodo === 'manhã' ? t.classes.morning : 
                       turma.periodo === 'tarde' ? t.classes.afternoon : 
                       turma.periodo === 'noite' ? t.classes.night : turma.periodo}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    <span>{t.classes.capacity}</span>
                    <span className="text-slate-600">{turma.alunos_matriculados} / {turma.capacidade_max}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-700 ease-out" 
                      style={{ width: `${(turma.alunos_matriculados / turma.capacidade_max) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
              <button className="text-xs font-bold text-slate-800 hover:text-blue-600 transition-colors">{t.nav.students}</button>
              <button className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">{t.common.edit}</button>
            </div>
          </motion.div>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentTurma?.id ? t.common.edit : t.classes.add}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              {t.classes.name}
            </label>
            <input
              required
              type="text"
              value={currentTurma?.nome || ''}
              onChange={(e) => setCurrentTurma({ ...currentTurma, nome: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm"
              placeholder="Ex: Turma A"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              {t.nav.courses}
            </label>
            <select
              required
              value={currentTurma?.curso_id || ''}
              onChange={(e) => setCurrentTurma({ ...currentTurma, curso_id: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm appearance-none"
            >
              <option value="">{t.courses.selectCourse}</option>
              {cursos.map(curso => (
                <option key={curso.id} value={curso.id}>{curso.nome}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {t.classes.year}
              </label>
              <input
                required
                type="number"
                value={currentTurma?.ano || ''}
                onChange={(e) => setCurrentTurma({ ...currentTurma, ano: parseInt(e.target.value) })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {t.classes.period}
              </label>
              <select
                required
                value={currentTurma?.periodo || 'manhã'}
                onChange={(e) => setCurrentTurma({ ...currentTurma, periodo: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm appearance-none"
              >
                <option value="manhã">{t.classes.morning}</option>
                <option value="tarde">{t.classes.afternoon}</option>
                <option value="noite">{t.classes.night}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              {t.classes.capacity}
            </label>
            <input
              required
              type="number"
              value={currentTurma?.capacidade_max || ''}
              onChange={(e) => setCurrentTurma({ ...currentTurma, capacidade_max: parseInt(e.target.value) })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-50 transition-all"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-all shadow-md shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-70"
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
