'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { useUser } from '@/lib/auth/UserContext';
import { 
  FileText, 
  Save, 
  Loader2,
  Users,
  CreditCard,
  Check
} from 'lucide-react';
import { motion } from 'motion/react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export default function NotasPage() {
  const { t, language } = useI18n();
  const { isAdmin } = useUser();
  const isReadOnly = !isAdmin;
  const [notas, setNotas] = useState<any[]>([]);
  const [alunos, setAlunos] = useState<any[]>([]);
  const [disciplinas, setDisciplinas] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [cursos, setCursos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCurso, setSelectedCurso] = useState('');
  const [selectedTurma, setSelectedTurma] = useState('');
  const [turmaAlunos, setTurmaAlunos] = useState<any[]>([]);
  const [bulkNotas, setBulkNotas] = useState<Record<string, Record<string, any>>>({});
  const [saving, setSaving] = useState(false);
  const [savingRows, setSavingRows] = useState<Record<string, boolean>>({});
  const [settings, setSettings] = useState({ media_aprovacao: 6, media_recuperacao: 4, frequencia_minima: 75 });

  // Derive effective modules
  const selectedTurmaObj = turmas.find(t => t.id === selectedTurma);
  const currentCursoId = selectedCurso || selectedTurmaObj?.curso_id;
  const selectedCursoObj = cursos.find(c => c.id === currentCursoId);
  const effectiveModules = Math.min(selectedCursoObj?.qtd_modulos || 4, 5);

  useEffect(() => {
    const fetchTurmaData = async () => {
      if (!selectedTurma && !selectedCurso) {
        setTurmaAlunos([]);
        setBulkNotas({});
        return;
      }

      setLoading(true);
      
      try {
        let studentsFetch = supabase.from('alunos').select('*').is('deleted_at', null).order('nome');
        
        if (selectedTurma) {
          studentsFetch = studentsFetch.eq('turma_id', selectedTurma);
        } else if (selectedCurso) {
          // Join with turmas to get students of this course
          const { data: turmaIds } = await supabase.from('turmas').select('id').eq('curso_id', selectedCurso).is('deleted_at', null);
          const ids = turmaIds?.map(t => t.id) || [];
          if (ids.length > 0) {
            studentsFetch = studentsFetch.in('turma_id', ids);
          } else {
            setTurmaAlunos([]);
            setLoading(false);
            return;
          }
        }
        
        const { data: students } = await studentsFetch;
        setTurmaAlunos(students || []);

        // Fetch existing grades
        let gradesFetch = supabase.from('notas').select('*');
        if (selectedTurma) {
          gradesFetch = gradesFetch.eq('turma_id', selectedTurma);
        } else if (selectedCurso) {
          const { data: turmaIds } = await supabase.from('turmas').select('id').eq('curso_id', selectedCurso).is('deleted_at', null);
          const ids = turmaIds?.map(t => t.id) || [];
          if (ids.length > 0) {
            gradesFetch = gradesFetch.in('turma_id', ids);
          }
        }

        const { data: grades } = await gradesFetch;
        
        const gradesMap: Record<string, Record<string, any>> = {};
        grades?.forEach(g => {
          if (!gradesMap[g.aluno_id]) gradesMap[g.aluno_id] = {};
          gradesMap[g.aluno_id][g.disciplina_id] = g;
        });
        setBulkNotas(gradesMap);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTurmaData();
  }, [selectedTurma, selectedCurso, turmas]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // Fetch Config
      const { data: configData } = await supabase.from('configuracoes').select('*').single();
      if (configData) setSettings(configData);

      // Fetch Alunos
      const { data: alunosData } = await supabase.from('alunos').select('id, nome, matricula, foto_url').is('deleted_at', null).order('nome');
      if (alunosData) setAlunos(alunosData);

      // Fetch Cursos
      const { data: cursosData } = await supabase.from('cursos').select('*').is('deleted_at', null).order('nome');
      if (cursosData) setCursos(cursosData);

      // Fetch Turmas
      const { data: turmasData } = await supabase.from('turmas').select('id, nome, curso_id').is('deleted_at', null).order('nome');
      if (turmasData) setTurmas(turmasData);
      
      setLoading(false);
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchDisciplinasForTurma = async () => {
      if (!currentCursoId) {
        setDisciplinas([]);
        return;
      }
      
      const { data: discData } = await supabase
        .from('disciplinas')
        .select('id, nome')
        .eq('curso_id', currentCursoId)
        .is('deleted_at', null)
        .order('nome');
      if (discData) {
        setDisciplinas(discData);
      }
    };

    fetchDisciplinasForTurma();
  }, [currentCursoId]);

  const handleBulkChange = (alunoId: string, modulo: number, value: string) => {
    if (disciplinas.length === 0) return;
    
    const numValue = value === '' ? null : parseFloat(value);
    const field = `nota${modulo}`;
    const targetDisciplinaId = disciplinas[0].id; // Use first discipline as main container
    
    const aluno = turmaAlunos.find(a => a.id === alunoId);
    if (!aluno) return;

    setBulkNotas(prev => {
      const studentGrades = prev[alunoId] || {};
      const discGrade = studentGrades[targetDisciplinaId] || { 
        aluno_id: alunoId, 
        disciplina_id: targetDisciplinaId, 
        turma_id: aluno.turma_id, // Use actual student turma
        ano_letivo: new Date().getFullYear() 
      };

      return {
        ...prev,
        [alunoId]: {
          ...studentGrades,
          [targetDisciplinaId]: {
            ...discGrade,
            [field]: numValue
          }
        }
      };
    });
  };

  const togglePago = (alunoId: string) => {
    if (disciplinas.length === 0 || isReadOnly) return;
    const targetDisciplinaId = disciplinas[0].id;
    const aluno = turmaAlunos.find(a => a.id === alunoId);
    if (!aluno) return;

    setBulkNotas(prev => {
      const studentGrades = prev[alunoId] || {};
      const discGrade = studentGrades[targetDisciplinaId] || { 
        aluno_id: alunoId, 
        disciplina_id: targetDisciplinaId, 
        turma_id: aluno.turma_id,
        ano_letivo: new Date().getFullYear(),
        pago: false
      };

      return {
        ...prev,
        [alunoId]: {
          ...studentGrades,
          [targetDisciplinaId]: {
            ...discGrade,
            pago: !discGrade.pago
          }
        }
      };
    });
  };

  const saveStudent = async (alunoId: string) => {
    if (isReadOnly) return;
    const studentGrades = bulkNotas[alunoId];
    if (!studentGrades) return;

    setSavingRows(prev => ({ ...prev, [alunoId]: true }));
    try {
      const dataToUpsert = Object.values(studentGrades).map(gradeData => {
        const cleaned = { ...gradeData };
        if (!cleaned.id) delete cleaned.id;
        return cleaned;
      });

      if (dataToUpsert.length === 0) return;

      const { error } = await supabase
        .from('notas')
        .upsert(dataToUpsert, { 
          onConflict: 'aluno_id,disciplina_id,turma_id' 
        });

      if (error) throw error;
      
      // Refresh
      const { data: newGrades } = await supabase
        .from('notas')
        .select('*')
        .eq('aluno_id', alunoId)
        .eq('turma_id', selectedTurma);
      
      if (newGrades) {
        setBulkNotas(prev => {
          const updated = { ...prev };
          const studentMap: Record<string, any> = {};
          newGrades.forEach(g => {
            studentMap[g.disciplina_id] = g;
          });
          updated[alunoId] = studentMap;
          return updated;
        });
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingRows(prev => ({ ...prev, [alunoId]: false }));
    }
  };

  const saveAll = async () => {
    if (isReadOnly) return;
    setSaving(true);
    try {
      const allGrades = Object.values(bulkNotas).flatMap(studentMap => Object.values(studentMap));
      if (allGrades.length === 0) return;

      const dataToUpsert = allGrades.map(e => {
        const cleaned = { ...e };
        if (!cleaned.id) delete cleaned.id;
        return cleaned;
      });

      const { error } = await supabase
        .from('notas')
        .upsert(dataToUpsert, { 
          onConflict: 'aluno_id,disciplina_id,turma_id' 
        });

      if (error) throw error;
      alert(t.attendance.saveSuccess);
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
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.attendance.course}</label>
            <select
              value={selectedCurso}
              onChange={(e) => {
                setSelectedCurso(e.target.value);
                setSelectedTurma('');
              }}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-sm font-medium"
            >
              <option value="">{t.courses.selectCourse}</option>
              {cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.attendance.selectClass}</label>
            <select
              value={selectedTurma}
              onChange={(e) => {
                const turmaId = e.target.value;
                setSelectedTurma(turmaId);
                if (turmaId) {
                  const turma = turmas.find(t => t.id === turmaId);
                  if (turma?.curso_id) setSelectedCurso(turma.curso_id);
                }
              }}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-sm font-medium"
            >
              <option value="">{t.grades.selectTurma}</option>
              {turmas
                .filter(t => !selectedCurso || t.curso_id === selectedCurso)
                .map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>
        </div>

        {!selectedTurma && !selectedCurso ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
            <FileText size={48} className="mb-4 opacity-20" />
            <p className="text-sm font-medium italic">{t.grades.fillFilters}</p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={32} className="animate-spin text-blue-500" />
          </div>
        ) : disciplinas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-red-400 bg-red-50/20 rounded-2xl border-2 border-dashed border-red-200">
            <p className="text-sm font-bold">{t.grades.fillFilters}</p>
            <p className="text-xs mt-2 opacity-70">O curso selecionado não possui disciplinas cadastradas. Por favor, cadastre ao menos uma disciplina.</p>
          </div>
        ) : turmaAlunos.length === 0 ? (
          <div className="text-center py-20 text-slate-400 italic">
            {t.grades.noStudentsInTurma}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="overflow-x-auto pb-6">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <th className="px-4 lg:px-6 py-4 min-w-[140px] lg:min-w-[200px] bg-slate-50/50 rounded-tl-2xl">
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-slate-400" />
                        {t.reportCard.student}
                      </div>
                    </th>
                    {Array.from({ length: effectiveModules }).map((_, i) => (
                      <th key={i} className="px-2 lg:px-4 py-4 text-center border-l border-slate-50 bg-slate-50/30">
                        {t.grades.module} {i + 1}
                      </th>
                    ))}
                    <th className="px-3 lg:px-6 py-4 text-center bg-blue-50/50 text-blue-900 border-l border-slate-100">{t.reportCard.average}</th>
                    <th className="px-3 lg:px-6 py-4 text-center border-l border-slate-100">{t.reportCard.status}</th>
                    <th className="px-3 lg:px-6 py-4 text-center border-l border-slate-100">Pgto</th>
                    <th className="px-2 lg:px-6 py-4 border-l border-slate-100 rounded-tr-2xl"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(() => {
                    const maxAvgValue = turmaAlunos.length > 0 
                      ? Math.max(...turmaAlunos.map(a => {
                          const sGrades = bulkNotas[a.id] || {};
                          const fdId = disciplinas[0]?.id;
                          const gData = sGrades[fdId] || {};
                          const scs: number[] = [];
                          for (let i = 1; i <= effectiveModules; i++) {
                            const v = gData[`nota${i}`];
                            if (v !== null && v !== undefined) scs.push(v);
                          }
                          return scs.length > 0 ? scs.reduce((x, y) => x + y, 0) / scs.length : null;
                        }).filter((a): a is number => a !== null), -1)
                      : -1;

                    return turmaAlunos.map((aluno) => {
                      const studentGrades = bulkNotas[aluno.id] || {};
                      const isSavingRow = savingRows[aluno.id];
                      const firstDiscId = disciplinas[0].id;
                      const gradeData = studentGrades[firstDiscId] || {};
                      
                      // Calculation based on modules
                      const scores: number[] = [];
                      for (let i = 1; i <= effectiveModules; i++) {
                        const val = gradeData[`nota${i}`];
                        if (val !== null && val !== undefined) {
                          scores.push(val);
                        }
                      }
                      
                      const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
                      const status = getStatus(avg);

                      return (
                        <tr 
                          key={aluno.id} 
                          className={cn(
                            "hover:bg-slate-50/30 transition-colors group relative",
                            avg !== null && avg === maxAvgValue && maxAvgValue > 0 && "bg-blue-50/50"
                          )}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-11 bg-slate-100 rounded overflow-hidden relative border border-slate-200 shrink-0 shadow-sm flex items-center justify-center">
                                {aluno.foto_url ? (
                                  <Image 
                                    src={aluno.foto_url} 
                                    alt={aluno.nome} 
                                    fill 
                                    className="object-cover" 
                                    referrerPolicy="no-referrer"
                                    sizes="32px"
                                  />
                                ) : (
                                  <Users size={12} className="text-slate-300" />
                                )}
                              </div>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <div className="font-bold text-slate-900">{aluno.nome}</div>
                                  {avg !== null && avg === maxAvgValue && maxAvgValue > 0 && (
                                    <span className="flex items-center gap-1 bg-amber-100 text-amber-700 text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-amber-200">
                                      ⭐ {language === 'pt' ? 'Melhor Média' : 'TOP AVG'}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">#{aluno.matricula || aluno.id.slice(0,8)}</div>
                              </div>
                            </div>
                          </td>
                        {Array.from({ length: effectiveModules }).map((_, i) => {
                          const m = i + 1;
                          return (
                            <td key={m} className="px-2 py-4 text-center border-l border-slate-50/50">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="10"
                                placeholder="-"
                                value={gradeData[`nota${m}`] ?? ''}
                                onChange={(e) => handleBulkChange(aluno.id, m, e.target.value)}
                                className="w-16 h-10 text-center bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-bold font-mono transition-all"
                              />
                            </td>
                          );
                        })}
                        <td className="px-6 py-4 text-center bg-blue-50/10 border-l border-slate-100">
                          <span className={cn(
                            "text-base font-black font-mono",
                            avg === null ? "text-slate-300" :
                            avg >= settings.media_aprovacao ? "text-green-600" :
                            avg >= settings.media_recuperacao ? "text-yellow-600" : "text-red-600"
                          )}>
                            {avg !== null ? avg.toFixed(1) : '-.-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center border-l border-slate-100">
                          <span className={cn(
                            "px-3 py-1.5 text-[10px] font-black uppercase rounded-full ring-1 ring-inset inline-block",
                            status.className
                          )}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center border-l border-slate-100">
                          <button
                            onClick={() => togglePago(aluno.id)}
                            disabled={isReadOnly}
                            className={cn(
                              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border",
                              gradeData.pago 
                                ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" 
                                : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-700"
                            )}
                          >
                            {gradeData.pago ? <Check size={12} /> : <CreditCard size={12} />}
                            {gradeData.pago ? t.finance?.paid : t.finance?.pending}
                          </button>
                        </td>
                        <td className="px-4 py-4 text-right border-l border-slate-100">
                          <button
                            onClick={() => saveStudent(aluno.id)}
                            disabled={isSavingRow || isReadOnly}
                            className={cn(
                              "p-2.5 rounded-xl transition-all",
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
                  })
                })()}
              </tbody>
            </table>
          </div>

            <div className="flex justify-end pt-6 border-t border-slate-100">
              {!isReadOnly && (
                <button
                  onClick={saveAll}
                  disabled={saving}
                  className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                  {t.grades.saveAll}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
