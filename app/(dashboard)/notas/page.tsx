'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { 
  FileText, 
  Search, 
  Save, 
  RefreshCcw,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import Modal from '@/components/Modal';

export default function NotasPage() {
  const { t } = useI18n();
  const [notas, setNotas] = useState<any[]>([]);
  const [alunos, setAlunos] = useState<any[]>([]);
  const [disciplinas, setDisciplinas] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentNota, setCurrentNota] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [settings, setSettings] = useState({ media_aprovacao: 6, media_recuperacao: 4, frequencia_minima: 75 });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // Fetch Config
      const { data: configData } = await supabase.from('configuracoes').select('*').single();
      if (configData) setSettings(configData);

      // Fetch Notas
      const { data: notasData } = await supabase
        .from('notas')
        .select(`
          *,
          aluno:alunos(nome, matricula),
          disciplina:disciplinas(nome, codigo),
          turma:turmas(nome)
        `)
        .order('created_at', { ascending: false });
        
      if (notasData) setNotas(notasData);

      // Fetch Alunos
      const { data: alunosData } = await supabase.from('alunos').select('id, nome').is('deleted_at', null).order('nome');
      if (alunosData) setAlunos(alunosData);

      // Fetch Disciplinas
      const { data: disciplinasData } = await supabase.from('disciplinas').select('id, nome').is('deleted_at', null).order('nome');
      if (disciplinasData) setDisciplinas(disciplinasData);

      // Fetch Turmas
      const { data: turmasData } = await supabase.from('turmas').select('id, nome').is('deleted_at', null).order('nome');
      if (turmasData) setTurmas(turmasData);
      
      setLoading(false);
    };

    fetchData();
  }, []);

  const refreshData = async () => {
    const { data: notasData } = await supabase
      .from('notas')
      .select(`
        *,
        aluno:alunos(nome, matricula),
        disciplina:disciplinas(nome, codigo),
        turma:turmas(nome)
      `)
      .order('created_at', { ascending: false });
      
    if (notasData) setNotas(notasData);
  };

  const getStatus = (final: number | null, freq: number | null) => {
    if (final === null || freq === null) return { label: t.grades.pending, className: 'bg-slate-100 text-slate-700 ring-slate-600/20' };
    if (final >= settings.media_aprovacao && freq >= settings.frequencia_minima) return { 
      label: t.grades.approved, 
      className: 'bg-green-100 text-green-700 ring-green-600/20' 
    };
    if (freq < settings.frequencia_minima) return { 
      label: t.grades.lowFrequency, 
      className: 'bg-orange-100 text-orange-700 ring-orange-600/20' 
    };
    if (final >= settings.media_recuperacao) return {
      label: t.grades.retake,
      className: 'bg-yellow-100 text-yellow-700 ring-yellow-600/20 font-bold'
    };
    return { 
      label: t.grades.reproved, 
      className: 'bg-red-100 text-red-700 ring-red-600/20' 
    };
  };

  const handleOpenModal = (nota: any = null) => {
    setCurrentNota(nota || { 
      aluno_id: '', 
      disciplina_id: '', 
      turma_id: '', 
      nota1: 0, 
      nota2: 0, 
      frequencia: 100, 
      ano_letivo: new Date().getFullYear() 
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const dataToSave = {
        aluno_id: currentNota.aluno_id,
        disciplina_id: currentNota.disciplina_id,
        turma_id: currentNota.turma_id,
        nota1: parseFloat(currentNota.nota1),
        nota2: parseFloat(currentNota.nota2),
        frequencia: parseFloat(currentNota.frequencia),
        ano_letivo: parseInt(currentNota.ano_letivo)
      };

      if (currentNota.id) {
        const { error } = await supabase
          .from('notas')
          .update(dataToSave)
          .eq('id', currentNota.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('notas')
          .insert([dataToSave]);
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
        .from('notas')
        .delete()
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.grades.title}</h1>
          <p className="text-slate-500 text-sm">{t.grades.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm shadow-blue-100"
          >
            <Plus size={18} />
            {t.grades.postGrades}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="relative w-64">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
             <input type="text" placeholder={t.grades.filterByStudent} className="w-full pl-9 pr-4 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none" />
          </div>
          <button 
            onClick={() => refreshData()}
            className="text-slate-500 hover:text-slate-900 p-2 transition-colors"
          >
            <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="overflow-x-auto font-sans">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs font-semibold text-slate-500 border-b border-slate-100 uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold italic">Estudante</th>
                <th className="px-6 py-4 font-semibold italic">Disciplina</th>
                <th className="px-6 py-4 font-semibold italic text-center w-20">N1</th>
                <th className="px-6 py-4 font-semibold italic text-center w-20">N2</th>
                <th className="px-6 py-4 font-semibold italic text-center w-20">Média</th>
                <th className="px-6 py-4 font-semibold italic text-center w-24">Freq. %</th>
                <th className="px-6 py-4 font-semibold italic w-32">Status</th>
                <th className="px-6 py-4 font-semibold italic text-right w-24">{t.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8">{t.common.loading}</td></tr>
              ) : notas.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-slate-400 italic">{t.grades.noGrades}</td></tr>
              ) : notas.map((nota) => {
                const status = getStatus(nota.nota_final, nota.frequencia);
                return (
                  <tr key={nota.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors group">
                    <td className="px-6 py-4 text-sm">
                      <div className="font-bold text-slate-900">{nota.aluno?.nome}</div>
                      <div className="text-[10px] text-slate-400 font-mono">#{nota.aluno?.matricula}</div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="font-semibold text-slate-700">{nota.disciplina?.nome}</div>
                      <div className="text-[10px] text-slate-400 font-mono truncate max-w-[100px]">{nota.disciplina?.codigo} • {nota.turma?.nome}</div>
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-sm">{nota.nota1?.toFixed(1) || '-'}</td>
                    <td className="px-6 py-4 text-center font-mono text-sm">{nota.nota2?.toFixed(1) || '-'}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn("font-bold font-mono text-sm", (nota.nota_final || 0) >= settings.media_aprovacao ? "text-blue-600" : (nota.nota_final || 0) >= settings.media_recuperacao ? "text-yellow-600" : "text-red-600")}>
                        {nota.nota_final?.toFixed(1) || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-sm">{nota.frequencia}%</td>
                    <td className="px-6 py-4">
                      <span className={cn("px-2.5 py-1 text-[10px] font-bold uppercase rounded ring-1 ring-inset", status.className)}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleOpenModal(nota)}
                          className="p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-400 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button 
                          disabled={deleting === nota.id}
                          onClick={() => handleDelete(nota.id)}
                          className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-400 transition-colors disabled:opacity-50"
                        >
                          {deleting === nota.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentNota?.id ? t.common.edit : t.grades.postGrades}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              {t.nav.students}
            </label>
            <select
              required
              value={currentNota?.aluno_id || ''}
              onChange={(e) => setCurrentNota({ ...currentNota, aluno_id: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm appearance-none"
            >
              <option value="">{t.grades.selectStudent}</option>
              {alunos.map(aluno => (
                <option key={aluno.id} value={aluno.id}>{aluno.nome}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {t.nav.subjects}
              </label>
              <select
                required
                value={currentNota?.disciplina_id || ''}
                onChange={(e) => setCurrentNota({ ...currentNota, disciplina_id: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm appearance-none"
              >
                <option value="">{t.grades.selectSubject}</option>
                {disciplinas.map(disciplina => (
                  <option key={disciplina.id} value={disciplina.id}>{disciplina.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {t.nav.classes}
              </label>
              <select
                required
                value={currentNota?.turma_id || ''}
                onChange={(e) => setCurrentNota({ ...currentNota, turma_id: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm appearance-none"
              >
                <option value="">{t.grades.selectClass}</option>
                {turmas.map(turma => (
                  <option key={turma.id} value={turma.id}>{turma.nome}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {t.grades.grade1}
              </label>
              <input
                required
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={currentNota?.nota1 ?? 0}
                onChange={(e) => setCurrentNota({ ...currentNota, nota1: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {t.grades.grade2}
              </label>
              <input
                required
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={currentNota?.nota2 ?? 0}
                onChange={(e) => setCurrentNota({ ...currentNota, nota2: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {t.grades.frequency} %
              </label>
              <input
                required
                type="number"
                step="1"
                min="0"
                max="100"
                value={currentNota?.frequencia ?? 100}
                onChange={(e) => setCurrentNota({ ...currentNota, frequencia: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm"
              />
            </div>
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
