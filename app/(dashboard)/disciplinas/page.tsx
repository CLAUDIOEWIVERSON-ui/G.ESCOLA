'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { useUser } from '@/lib/auth/UserContext';
import { Plus, GraduationCap, Clock, Code, Pencil, Trash2, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import Modal from '@/components/Modal';

export default function DisciplinasPage() {
  const { t } = useI18n();
  const { isAdmin, isGuest } = useUser();
  const [disciplinas, setDisciplinas] = useState<any[]>([]);
  const [cursos, setCursos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentDisciplina, setCurrentDisciplina] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // Fetch Disciplinas
      const { data: disciplinasData } = await supabase
        .from('disciplinas')
        .select('*, curso:cursos(nome)')
        .is('deleted_at', null)
        .order('nome');
        
      if (disciplinasData) setDisciplinas(disciplinasData);

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
    const { data: disciplinasData } = await supabase
      .from('disciplinas')
      .select('*, curso:cursos(nome)')
      .is('deleted_at', null)
      .order('nome');
      
    if (disciplinasData) setDisciplinas(disciplinasData);
  };

  const handleOpenModal = (disciplina: any = null) => {
    if (isGuest) return;
    setCurrentDisciplina(disciplina || { nome: '', codigo: '', carga_horaria: 60, curso_id: '' });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (currentDisciplina.id) {
        const { error } = await supabase
          .from('disciplinas')
          .update({
            nome: currentDisciplina.nome,
            codigo: currentDisciplina.codigo,
            carga_horaria: currentDisciplina.carga_horaria,
            curso_id: currentDisciplina.curso_id
          })
          .eq('id', currentDisciplina.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('disciplinas')
          .insert([
            {
              nome: currentDisciplina.nome,
              codigo: currentDisciplina.codigo,
              carga_horaria: currentDisciplina.carga_horaria,
              curso_id: currentDisciplina.curso_id
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
    if (isGuest) return;
    if (!confirm(t.common.delete + '?')) return;
    setDeleting(id);
    
    try {
      const { error } = await supabase
        .from('disciplinas')
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.subjects.title}</h1>
          <p className="text-slate-500 text-sm italic mt-1">{t.subjects.subtitle}</p>
        </div>
        {!isGuest && (
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm shadow-blue-100"
          >
            <Plus size={18} />
            {t.subjects.add}
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left font-sans">
          <thead>
            <tr className="text-xs font-semibold text-slate-500 border-b border-slate-100 uppercase tracking-wider bg-slate-50/30">
              <th className="px-6 py-4 font-semibold italic">{t.subjects.title}</th>
              <th className="px-6 py-4 font-semibold italic">{t.subjects.course}</th>
              <th className="px-6 py-4 font-semibold italic">{t.subjects.hours}</th>
              <th className="px-6 py-4 font-semibold italic text-right">{t.common.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={4} className="text-center py-12 text-slate-400 text-sm">{t.common.loading}</td></tr>
            ) : disciplinas.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-12 text-slate-400 text-sm">{t.subjects.noSubjects}</td></tr>
            ) : disciplinas.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                      <GraduationCap size={16} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{d.nome}</p>
                      <p className="text-[10px] font-mono text-slate-400 uppercase tracking-tight">{t.subjects.code}: {d.codigo}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600 font-medium">{d.curso?.nome}</td>
                <td className="px-6 py-4">
                   <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold">
                     <Clock size={14} className="text-slate-300" />
                     {d.carga_horaria}H
                   </div>
                </td>
                <td className="px-6 py-4 text-right">
                  {!isGuest && (
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleOpenModal(d)}
                        className="p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-400 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button 
                        disabled={deleting === d.id}
                        onClick={() => handleDelete(d.id)}
                        className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-400 transition-colors disabled:opacity-50"
                      >
                        {deleting === d.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentDisciplina?.id ? t.common.edit : t.subjects.add}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              {t.subjects.name}
            </label>
            <input
              required
              type="text"
              value={currentDisciplina?.nome || ''}
              onChange={(e) => setCurrentDisciplina({ ...currentDisciplina, nome: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm"
              placeholder={t.subjects.name}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {t.subjects.code}
              </label>
              <input
                required
                type="text"
                value={currentDisciplina?.codigo || ''}
                onChange={(e) => setCurrentDisciplina({ ...currentDisciplina, codigo: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm"
                placeholder="PROG101"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {t.subjects.hours}
              </label>
              <input
                required
                type="number"
                value={currentDisciplina?.carga_horaria || ''}
                onChange={(e) => setCurrentDisciplina({ ...currentDisciplina, carga_horaria: parseInt(e.target.value) })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              {t.nav.courses}
            </label>
            <select
              required
              value={currentDisciplina?.curso_id || ''}
              onChange={(e) => setCurrentDisciplina({ ...currentDisciplina, curso_id: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm appearance-none"
            >
              <option value="">{t.courses.selectCourse}</option>
              {cursos.map(curso => (
                <option key={curso.id} value={curso.id}>{curso.nome}</option>
              ))}
            </select>
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
