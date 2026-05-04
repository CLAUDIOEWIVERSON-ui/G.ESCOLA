'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { useUser } from '@/lib/auth/UserContext';
import { 
  FileText, 
  Save, 
  Loader2
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export default function NotasPage() {
  const { t, language } = useI18n();
  const { isAdmin, isAluno } = useUser();
  const isGuest = isAluno;
  const [notas, setNotas] = useState<any[]>([]);
  const [alunos, setAlunos] = useState<any[]>([]);
  const [disciplinas, setDisciplinas] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTurma, setSelectedTurma] = useState('');
  const [selectedDisciplina, setSelectedDisciplina] = useState('');
  const [turmaAlunos, setTurmaAlunos] = useState<any[]>([]);
  const [bulkNotas, setBulkNotas] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [savingRows, setSavingRows] = useState<Record<string, boolean>>({});
  const [settings, setSettings] = useState({ media_aprovacao: 6, media_recuperacao: 4, frequencia_minima: 75 });

  useEffect(() => {
    const fetchTurmaData = async () => {
      if (!selectedTurma) {
        setTurmaAlunos([]);
        setBulkNotas({});
        return;
      }

      setLoading(true);
      // Fetch students in this turma
      const { data: students } = await supabase
        .from('alunos')
        .select('*')
        .eq('turma_id', selectedTurma)
        .is('deleted_at', null)
        .order('nome');
      
      setTurmaAlunos(students || []);

      if (selectedDisciplina) {
        // Fetch existing grades
        const { data: grades } = await supabase
          .from('notas')
          .select('*')
          .eq('turma_id', selectedTurma)
          .eq('disciplina_id', selectedDisciplina);
        
        const gradesMap: Record<string, any> = {};
        grades?.forEach(g => {
          gradesMap[g.aluno_id] = g;
        });
        setBulkNotas(gradesMap);
      } else {
        setBulkNotas({});
      }
      setLoading(false);
    };

    fetchTurmaData();
  }, [selectedTurma, selectedDisciplina]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // Fetch Config
      const { data: configData } = await supabase.from('configuracoes').select('*').single();
      if (configData) setSettings(configData);

      // Fetch Alunos
      const { data: alunosData } = await supabase.from('alunos').select('id, nome').is('deleted_at', null).order('nome');
      if (alunosData) setAlunos(alunosData);

      // Fetch Turmas
      const { data: turmasData } = await supabase.from('turmas').select('id, nome, curso_id').is('deleted_at', null).order('nome');
      if (turmasData) setTurmas(turmasData);
      
      setLoading(false);
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchDisciplinasForTurma = async () => {
      if (!selectedTurma) {
        setDisciplinas([]);
        setSelectedDisciplina('');
        return;
      }
      
      const turma = turmas.find(t => t.id === selectedTurma);
      if (turma?.curso_id) {
        const { data: discData } = await supabase
          .from('disciplinas')
          .select('id, nome')
          .eq('curso_id', turma.curso_id)
          .is('deleted_at', null)
          .order('nome');
        if (discData && discData.length > 0) {
          setDisciplinas(discData);
          // Auto-select first if none selected or if previously selected is not in this new list
          if (!selectedDisciplina || !discData.find(d => d.id === selectedDisciplina)) {
            setSelectedDisciplina(discData[0].id);
          }
        }
      }
    };

    fetchDisciplinasForTurma();
  }, [selectedTurma, turmas, selectedDisciplina]);

  const handleBulkChange = (alunoId: string, field: string, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    setBulkNotas(prev => ({
      ...prev,
      [alunoId]: {
        ...(prev[alunoId] || { aluno_id: alunoId, disciplina_id: selectedDisciplina, turma_id: selectedTurma, ano_letivo: new Date().getFullYear() }),
        [field]: numValue
      }
    }));
  };

  const saveIndividual = async (alunoId: string) => {
    if (isGuest) return;
    const gradeData = bulkNotas[alunoId];
    if (!gradeData) return;

    setSavingRows(prev => ({ ...prev, [alunoId]: true }));
    try {
      const cleaned: any = {
        ...gradeData,
        aluno_id: alunoId, // Ensure it's correct
        disciplina_id: selectedDisciplina,
        turma_id: selectedTurma,
        ano_letivo: gradeData.ano_letivo || new Date().getFullYear()
      };
      
      // Safety check: skip if no grades at all
      const hasGrades = [1, 2, 3, 4, 5].some(m => cleaned[`nota${m}`] !== null && cleaned[`nota${m}`] !== undefined);
      if (!hasGrades) {
        // Just delete if previously existed? No, let's just save whatever is there.
      }

      if (!cleaned.id) delete cleaned.id;
      
      const { error } = await supabase
        .from('notas')
        .upsert([cleaned], { 
          onConflict: 'aluno_id,disciplina_id,turma_id' 
        });

      if (error) throw error;
      
      // Refresh to get the ID if it was a new record
      const { data: newGrade } = await supabase
        .from('notas')
        .select('*')
        .eq('aluno_id', alunoId)
        .eq('disciplina_id', selectedDisciplina)
        .eq('turma_id', selectedTurma)
        .single();
      
      if (newGrade) {
        setBulkNotas(prev => ({ ...prev, [alunoId]: newGrade }));
      }

    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingRows(prev => ({ ...prev, [alunoId]: false }));
    }
  };

  const saveAll = async () => {
    if (isGuest) return;
    setSaving(true);
    try {
      const entries = Object.values(bulkNotas);
      if (entries.length === 0) return;

      const dataToUpsert = entries
        .filter(e => {
          // Only save if at least one grade field has something
          return [1, 2, 3, 4, 5].some(m => e[`nota${m}`] !== null && e[`nota${m}`] !== undefined);
        })
        .map(e => {
          const cleaned: any = {
            ...e,
            disciplina_id: selectedDisciplina,
            turma_id: selectedTurma,
            ano_letivo: e.ano_letivo || new Date().getFullYear()
          };
          // Remove null/undefined ID to avoid constraint violations on new records
          if (!cleaned.id) delete cleaned.id;
          return cleaned;
        });

      if (dataToUpsert.length === 0) {
        alert(t.grades.fillFilters); // Generic message or "nothing to save"
        return;
      }

      const { error } = await supabase
        .from('notas')
        .upsert(dataToUpsert, { 
          onConflict: 'aluno_id,disciplina_id,turma_id' 
        });

      if (error) throw error;
      alert(t.attendance.saveSuccess); // Reusing translation
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const getStatus = (final: number | null) => {
    if (final === null) return { label: t.grades.pending, className: 'bg-slate-100 text-slate-700 ring-slate-600/20' };
    if (final >= settings.media_aprovacao) return { 
      label: t.grades.approved, 
      className: 'bg-green-100 text-green-700 ring-green-600/20' 
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.grades.title}</h1>
          <p className="text-slate-500 text-sm">{t.grades.subtitle}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.attendance.selectClass}</label>
            <select
              value={selectedTurma}
              onChange={(e) => setSelectedTurma(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-sm font-medium"
            >
              <option value="">{t.grades.selectTurma}</option>
              {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>
          {selectedDisciplina && disciplinas.length > 0 && (
            <div className="space-y-2 px-4 py-3 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center justify-between">
              <div>
                <label className="block text-[10px] font-bold text-blue-400 uppercase tracking-widest">{t.nav.subjects}</label>
                <span className="text-sm font-bold text-blue-900">
                  {disciplinas.find(d => d.id === selectedDisciplina)?.nome}
                </span>
              </div>
              {disciplinas.length > 1 && (
                 <select
                    value={selectedDisciplina}
                    onChange={(e) => setSelectedDisciplina(e.target.value)}
                    className="text-[10px] font-bold bg-white border border-blue-200 rounded-md px-2 py-1 outline-none text-blue-600"
                 >
                    {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                 </select>
              )}
            </div>
          )}
        </div>

        {!selectedTurma ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
            <FileText size={48} className="mb-4 opacity-20" />
            <p className="text-sm font-medium italic">{t.grades.fillFilters}</p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={32} className="animate-spin text-blue-500" />
          </div>
        ) : turmaAlunos.length === 0 ? (
          <div className="text-center py-20 text-slate-400 italic">
            {t.grades.noStudentsInTurma}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <th className="px-4 py-3 min-w-[200px]">{t.reportCard.student}</th>
                    <th className="px-2 py-3 text-center">{t.grades.module} 1</th>
                    <th className="px-2 py-3 text-center">{t.grades.module} 2</th>
                    <th className="px-2 py-3 text-center">{t.grades.module} 3</th>
                    <th className="px-2 py-3 text-center">{t.grades.module} 4</th>
                    <th className="px-2 py-3 text-center">{t.grades.module} 5</th>
                    <th className="px-4 py-3 text-center bg-slate-50/50 rounded-t-xl">{t.reportCard.average}</th>
                    <th className="px-4 py-3 text-center">{t.reportCard.status}</th>
                    <th className="px-4 py-3 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {turmaAlunos.map((aluno) => {
                    const gradeData = bulkNotas[aluno.id] || {};
                    const isSavingRow = savingRows[aluno.id];
                    const scores = [
                      gradeData.nota1,
                      gradeData.nota2,
                      gradeData.nota3,
                      gradeData.nota4,
                      gradeData.nota5
                    ].filter(v => v !== null && v !== undefined);
                    
                    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
                    const status = getStatus(avg);

                    return (
                      <tr key={aluno.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-4 py-4 text-sm">
                          <div className="font-bold text-slate-700">{aluno.nome}</div>
                          <div className="text-[10px] text-slate-400 font-mono">#{aluno.matricula || aluno.id.slice(0,8)}</div>
                        </td>
                        {[1, 2, 3, 4, 5].map(m => (
                          <td key={m} className="px-1 py-4">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="10"
                              placeholder="-"
                              value={gradeData[`nota${m}`] ?? ''}
                              onChange={(e) => handleBulkChange(aluno.id, `nota${m}`, e.target.value)}
                              className="w-16 h-10 text-center bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-bold font-mono transition-all"
                            />
                          </td>
                        ))}
                        <td className="px-4 py-4 text-center bg-slate-50/30">
                          <span className={cn(
                            "text-base font-black font-mono",
                            avg === null ? "text-slate-300" :
                            avg >= settings.media_aprovacao ? "text-green-600" :
                            avg >= settings.media_recuperacao ? "text-yellow-600" : "text-red-600"
                          )}>
                            {avg !== null ? avg.toFixed(1) : '-.-'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={cn(
                            "px-2 py-1 text-[10px] font-black uppercase rounded-md ring-1 ring-inset",
                            status.className
                          )}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={() => saveIndividual(aluno.id)}
                            disabled={isSavingRow || isGuest}
                            className={cn(
                              "p-2 rounded-lg transition-all",
                              isSavingRow ? "bg-slate-100 text-slate-400" :
                              "bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white"
                            )}
                            title={t.common.save}
                          >
                            {isSavingRow ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-6 border-t border-slate-100">
              <button
                onClick={saveAll}
                disabled={saving || isGuest}
                className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
              >
                {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                {t.grades.saveAll}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
