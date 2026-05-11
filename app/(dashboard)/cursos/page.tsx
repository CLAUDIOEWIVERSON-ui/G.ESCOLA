'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { useUser } from '@/lib/auth/UserContext';
import { cursoSchema } from '@/lib/validations/schemas';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit2, 
  Trash2, 
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
  Loader2,
  GraduationCap,
  Clock,
  BookMarked,
  Users,
  User,
  UserPlus,
  Calendar,
  Layers,
  Search as SearchIcon,
  Mail,
  Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '@/components/Modal';

type Curso = z.infer<typeof cursoSchema> & { id: string };

export default function CursosPage() {
  const { t, language } = useI18n();
  const { isAdmin } = useUser();
  const isReadOnly = !isAdmin;
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [skipHeader, setSkipHeader] = useState(false);
  const [bulkData, setBulkData] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingCurso, setEditingCurso] = useState<Curso | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Discipline Management State
  const [manageDisciplinasCurso, setManageDisciplinasCurso] = useState<Curso | null>(null);
  const [disciplinas, setDisciplinas] = useState<any[]>([]);
  const [loadingDisciplinas, setLoadingDisciplinas] = useState(false);
  const [isDisciplinaModalOpen, setIsDisciplinaModalOpen] = useState(false);
  const [currentDisciplina, setCurrentDisciplina] = useState<any>(null);
  const [savingDisciplina, setSavingDisciplina] = useState(false);

  // Classes (Turmas) Management State
  const [manageTurmasCurso, setManageTurmasCurso] = useState<Curso | null>(null);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [loadingTurmas, setLoadingTurmas] = useState(false);
  const [isTurmaModalOpen, setIsTurmaModalOpen] = useState(false);
  const [currentTurma, setCurrentTurma] = useState<any>(null);
  const [savingTurma, setSavingTurma] = useState(false);

  // Students Management State (Unified into Turmas)
  const [viewingTurmaAlunos, setViewingTurmaAlunos] = useState<any | null>(null);
  const [turmaStudents, setTurmaStudents] = useState<any[]>([]);
  const [loadingTurmaStudents, setLoadingTurmaStudents] = useState(false);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<any>(null);
  const [savingStudent, setSavingStudent] = useState(false);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof cursoSchema>>({
    resolver: zodResolver(cursoSchema),
    defaultValues: {
      nome: '',
      descricao: '',
      duracao: 1,
      duracao_unidade: 'ano',
      ativo: true,
      qtd_modulos: 4,
      categoria: 'Especial',
    }
  });

  const fetchCursos = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const { data, error } = await supabase
      .from('cursos')
      .select('*')
      .is('deleted_at', null)
      .not('categoria', 'eq', 'Expedito')
      .not('categoria', 'eq', 'Carreira')
      .order('nome');
    if (data) {
      // Map database field to our logic field
      const units = ['dia', 'semana', 'mes', 'ano'];
      const mappedData = data.map(item => {
        const dbVal = item.ano_inicio || 13; // default 1 year (1 * 10 + 3)
        const val = Math.floor(dbVal / 10);
        const unitIdx = dbVal % 10;
        
        return {
          ...item,
          duracao: val || 1,
          duracao_unidade: (units[unitIdx] || 'ano') as any,
          qtd_modulos: item.qtd_modulos || 4
        };
      });
      setCursos(mappedData);
    }
    if (showLoading) setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      await fetchCursos(false);
      setLoading(false);
    };
    init();
  }, []);

  const onSubmit = async (data: z.infer<typeof cursoSchema>) => {
    if (isReadOnly) return;
    try {
      const units = ['dia', 'semana', 'mes', 'ano'];
      const unitIdx = units.indexOf(data.duracao_unidade);
      const encodedDuration = (data.duracao * 10) + (unitIdx === -1 ? 3 : unitIdx);

      // Map our logic field back to database field
      const cleanedData = {
        nome: data.nome,
        descricao: data.descricao,
        ano_inicio: encodedDuration, // stores both value and unit encoded
        ativo: data.ativo,
        qtd_modulos: data.qtd_modulos,
        categoria: data.categoria
      };

      if (editingCurso) {
        const { error } = await supabase
          .from('cursos')
          .update(cleanedData)
          .eq('id', editingCurso.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cursos')
          .insert([cleanedData]);
        if (error) throw error;
      }
      reset();
      setModalOpen(false);
      setEditingCurso(null);
      fetchCursos();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const deleteCurso = async (id: string) => {
    if (isReadOnly) return;
    if (confirm(t.common.deleteConfirm)) {
      const { error } = await supabase
        .from('cursos')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) alert(error.message);
      else fetchCursos();
    }
  };

  const fetchDisciplinas = useCallback(async (cursoId: string) => {
    const { data } = await supabase
      .from('disciplinas')
      .select('*')
      .eq('curso_id', cursoId)
      .is('deleted_at', null)
      .order('nome');
    if (data) setDisciplinas(data);
    setLoadingDisciplinas(false);
  }, []);

  useEffect(() => {
    if (manageDisciplinasCurso) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchDisciplinas(manageDisciplinasCurso.id);
    }
  }, [manageDisciplinasCurso, fetchDisciplinas]);

  const handleOpenDisciplinaModal = (disciplina: any = null) => {
    if (isReadOnly) return;
    setCurrentDisciplina(disciplina || { nome: '', codigo: '', carga_horaria: 60, curso_id: manageDisciplinasCurso?.id });
    setIsDisciplinaModalOpen(true);
  };

  const handleSaveDisciplina = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manageDisciplinasCurso || isReadOnly) return;
    setSavingDisciplina(true);

    try {
      const dataToSave = {
        nome: currentDisciplina.nome,
        codigo: currentDisciplina.codigo,
        carga_horaria: currentDisciplina.carga_horaria,
        curso_id: manageDisciplinasCurso.id
      };

      if (currentDisciplina.id) {
        const { error } = await supabase
          .from('disciplinas')
          .update(dataToSave)
          .eq('id', currentDisciplina.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('disciplinas')
          .insert([dataToSave]);
        if (error) throw error;
      }

      setLoadingDisciplinas(true);
      await fetchDisciplinas(manageDisciplinasCurso.id);
      setIsDisciplinaModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingDisciplina(false);
    }
  };

  const deleteDisciplina = async (id: string) => {
    if (isReadOnly || !manageDisciplinasCurso) return;
    if (confirm(t.common.deleteConfirm)) {
      setLoadingDisciplinas(true);
      const { error } = await supabase
        .from('disciplinas')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) {
        alert(error.message);
        setLoadingDisciplinas(false);
      } else {
        await fetchDisciplinas(manageDisciplinasCurso.id);
      }
    }
  };

  // Turmas Logic
  const fetchTurmas = useCallback(async (cursoId: string) => {
    const { data } = await supabase
      .from('turmas')
      .select('*')
      .eq('curso_id', cursoId)
      .is('deleted_at', null)
      .order('nome');
    if (data) setTurmas(data);
    setLoadingTurmas(false);
  }, []);

  useEffect(() => {
    if (manageTurmasCurso) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchTurmas(manageTurmasCurso.id);
    }
  }, [manageTurmasCurso, fetchTurmas]);

  const handleOpenTurmaModal = (turma: any = null) => {
    if (isReadOnly) return;
    setCurrentTurma(turma || { 
      nome: '', 
      curso_id: manageTurmasCurso?.id, 
      ano: new Date().getFullYear(),
      periodo: 'manhã',
      status: 'ativa',
      capacidade_max: 40,
      instrutor: '',
      localizacao: ''
    });
    setIsTurmaModalOpen(true);
  };

  const handleSaveTurma = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manageTurmasCurso || isReadOnly) return;
    setSavingTurma(true);

    try {
      const dataToSave = {
        nome: currentTurma.nome,
        curso_id: manageTurmasCurso.id,
        ano: currentTurma.ano,
        periodo: currentTurma.periodo,
        status: currentTurma.status,
        capacidade_max: currentTurma.capacidade_max,
        instrutor: currentTurma.instrutor,
        localizacao: currentTurma.localizacao,
        ativa: currentTurma.status === 'ativa'
      };

      if (currentTurma.id) {
        const { error } = await supabase
          .from('turmas')
          .update(dataToSave)
          .eq('id', currentTurma.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('turmas')
          .insert([dataToSave]);
        if (error) throw error;
      }

      setLoadingTurmas(true);
      await fetchTurmas(manageTurmasCurso.id);
      setIsTurmaModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingTurma(false);
    }
  };

  const deleteTurma = async (id: string) => {
    if (isReadOnly || !manageTurmasCurso) return;
    if (confirm(t.common.deleteConfirm)) {
      setLoadingTurmas(true);
      const { error } = await supabase
        .from('turmas')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) {
        alert(error.message);
        setLoadingTurmas(false);
      } else {
        await fetchTurmas(manageTurmasCurso.id);
      }
    }
  };

  // Students Logic (Unified)
  const fetchTurmaStudents = useCallback(async (turmaId: string) => {
    setLoadingTurmaStudents(true);
    try {
      const { data, error } = await supabase
        .from('alunos')
        .select('*')
        .eq('turma_id', turmaId)
        .is('deleted_at', null)
        .order('nome');
      
      if (error) throw error;
      if (data) setTurmaStudents(data);
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoadingTurmaStudents(false);
    }
  }, []);

  useEffect(() => {
    if (viewingTurmaAlunos) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchTurmaStudents(viewingTurmaAlunos.id);
    }
  }, [viewingTurmaAlunos, fetchTurmaStudents]);

  const handleOpenAddStudentModal = (student: any = null) => {
    if (isReadOnly) return;
    setCurrentStudent(student || { 
      nome: '', 
      email: '', 
      matricula: '', 
      turma_id: viewingTurmaAlunos?.id || '',
      status: 'ativo'
    });
    setIsAddStudentModalOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingTurmaAlunos || isReadOnly) return;
    setSavingStudent(true);

    try {
      const dataToSave = {
        nome: currentStudent.nome,
        email: currentStudent.email,
        matricula: currentStudent.matricula,
        turma_id: viewingTurmaAlunos.id,
        status: currentStudent.status
      };

      if (currentStudent.id) {
        const { error } = await supabase
          .from('alunos')
          .update(dataToSave)
          .eq('id', currentStudent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('alunos')
          .insert([dataToSave]);
        if (error) throw error;
      }

      await fetchTurmaStudents(viewingTurmaAlunos.id);
      setIsAddStudentModalOpen(false);
      // Also refresh the turmas list to update the student count if needed
      if (manageTurmasCurso) fetchTurmas(manageTurmasCurso.id);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingStudent(false);
    }
  };

  const deleteStudent = async (id: string) => {
    if (isReadOnly || !viewingTurmaAlunos) return;
    if (confirm(t.common.deleteConfirm)) {
      setLoadingTurmaStudents(true);
      const { error } = await supabase
        .from('alunos')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) {
        alert(error.message);
        setLoadingTurmaStudents(false);
      } else {
        await fetchTurmaStudents(viewingTurmaAlunos.id);
        if (manageTurmasCurso) fetchTurmas(manageTurmasCurso.id);
      }
    }
  };

  const handleBulkSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    setSaving(true);

    try {
      // Robust multi-format parsing
      const rawLines = bulkData.split(/\r?\n/).filter(line => line.trim());
      if (rawLines.length === 0) throw new Error(t.common.parseError);

      const firstLine = rawLines[0];
      const separator = firstLine.includes(';') ? ';' : ',';

      const dataLines = skipHeader ? rawLines.slice(1) : rawLines;
      const results: { success: any[], errors: string[] } = { success: [], errors: [] };

      const coursesToInsert = dataLines.map((line, index) => {
        const parts = line.split(separator).map(s => s.trim());
        const [nome, codigo, descricao] = parts;
        
        if (!nome) {
          results.errors.push(`Linha ${index + (skipHeader ? 2 : 1)}: Nome não encontrado.`);
          return null;
        }

        return {
          nome,
          descricao: descricao || '',
          ano_inicio: 13, // default duration (1 * 10 + 3 = 1 year)
          ativo: true
        };
      }).filter(Boolean) as any[];

      if (coursesToInsert.length === 0) {
        throw new Error(results.errors.length > 0 ? results.errors.join('\n') : t.common.parseError);
      }

      const { data, error } = await supabase.from('cursos').upsert(coursesToInsert, {
        onConflict: 'nome',
        ignoreDuplicates: false
      }).select();
      
      if (error) throw error;

      await fetchCursos();
      setIsBulkModalOpen(false);
      setBulkData('');
      
      const successCount = data?.length || 0;
      alert(t.common.successCount.replace('{count}', successCount.toString()) + (results.errors.length > 0 ? '\n\nErros:\n' + results.errors.join('\n') : ''));
    } catch (err: any) {
      alert(t.common.importError + ': ' + (err.message || t.common.parseError));
    } finally {
      setSaving(false);
    }
  };

  const filteredCursos = cursos.filter(c => 
    c.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.courses.title}</h1>
          <p className="text-slate-500 text-sm">{language === 'pt' ? 'Visualize e gerencie os cursos oferecidos pela instituição.' : 'View and manage the courses offered by the institution.'}</p>
        </div>
        {!isReadOnly && (
          <div className="flex gap-2">
            <button 
              onClick={() => setIsBulkModalOpen(true)}
              className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm"
            >
              <FileText size={18} />
              {t.common.bulkAdd}
            </button>
            <button 
              id="add-course-btn"
              onClick={() => { reset(); setEditingCurso(null); setModalOpen(true); }}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm shadow-blue-100"
            >
              <Plus size={18} />
              {t.courses.add}
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold" size={18} />
            <input
              type="text"
              placeholder={t.common.search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table id="courses-table" className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs font-semibold text-slate-500 border-b border-slate-100 uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">{t.courses.name}</th>
                <th className="px-6 py-4 font-semibold text-center">{t.nav.subjects}</th>
                <th className="px-6 py-4 font-semibold text-center">{t.nav.classes}</th>
                <th className="px-6 py-4 font-semibold">{t.courses.duration}</th>
                <th className="px-6 py-4 font-semibold text-right">{t.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">{t.common.loading}</td>
                </tr>
              ) : filteredCursos.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">{t.common.noneFound}</td>
                </tr>
              ) : filteredCursos.map((curso) => (
                <tr key={curso.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <div className="font-semibold text-slate-900">{curso.nome}</div>
                      {curso.categoria && (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold uppercase rounded-md border border-blue-100">
                          {curso.categoria}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 truncate max-w-[200px]">
                       {curso.descricao}
                    </div>
                  </td>
                   <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => {
                        setManageDisciplinasCurso(curso);
                        setLoadingDisciplinas(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold uppercase hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm"
                    >
                      <BookMarked size={12} />
                      {t.nav.subjects}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => {
                        setManageTurmasCurso(curso);
                        setLoadingTurmas(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold uppercase hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all shadow-sm"
                    >
                      <Users size={12} />
                      {t.nav.classes}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <div className="flex flex-col">
                      <span>
                        {curso.duracao} {
                          curso.duracao === 1 
                            ? (curso.duracao_unidade === 'dia' ? t.courses.day : curso.duracao_unidade === 'semana' ? t.courses.week : curso.duracao_unidade === 'mes' ? t.courses.month : t.courses.year)
                            : (curso.duracao_unidade === 'dia' ? t.courses.days : curso.duracao_unidade === 'semana' ? t.courses.weeks : curso.duracao_unidade === 'mes' ? t.courses.months : t.courses.years)
                        }
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {curso.qtd_modulos || 4} {t.grades.module}s
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {!isReadOnly && (
                        <>
                          <button 
                            onClick={() => { setEditingCurso(curso); reset(curso); setModalOpen(true); }}
                            className="p-2 bg-white border border-slate-100 shadow-sm rounded-lg text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => deleteCurso(curso.id)}
                            className="p-2 bg-white border border-slate-100 shadow-sm rounded-lg text-slate-400 hover:text-red-600 hover:border-red-100 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-8 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-slate-900">
                  {editingCurso ? t.common.edit : t.courses.add}
                </h3>
                <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>

              <form id="course-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">{t.courses.name}</label>
                  <input
                    {...register('nome')}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 transition-colors"
                    placeholder="Engenharia de Software"
                  />
                  {errors.nome && <p className="text-xs text-red-500 mt-1">{errors.nome.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">{t.courses.description}</label>
            <textarea
              {...register('descricao')}
              rows={2}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 transition-colors"
              placeholder={language === 'pt' ? "Descrição breve do curso..." : "Brief description of the course..."}
            />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">{t.courses.durationValue}</label>
                    <input
                      type="number"
                      {...register('duracao', { valueAsNumber: true })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 transition-colors"
                    />
                    {errors.duracao && <p className="text-xs text-red-500 mt-1">{errors.duracao.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">{t.courses.durationUnit}</label>
                    <select
                      {...register('duracao_unidade')}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 transition-colors"
                    >
                      <option value="dia">{t.courses.days}</option>
                      <option value="semana">{t.courses.weeks}</option>
                      <option value="mes">{t.courses.months}</option>
                      <option value="ano">{t.courses.years}</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Número de Módulos (Máx 5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    {...register('qtd_modulos', { valueAsNumber: true })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 transition-colors"
                  />
                  {errors.qtd_modulos && <p className="text-xs text-red-500 mt-1">{errors.qtd_modulos.message}</p>}
                </div>

                <div className="hidden">
                  <input type="checkbox" {...register('ativo')} />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">{t.courses.category}</label>
                  <select
                    {...register('categoria')}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 transition-colors"
                  >
                    <option value="">Selecione uma categoria</option>
                    <option value="Expedito">{t.courses.categoryExpedito}</option>
                    <option value="Especial">{t.courses.categoryEspecial}</option>
                    <option value="Carreira">{t.courses.categoryCarreira}</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-6">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors"
                  >
                    {t.common.cancel}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-100"
                  >
                    {t.common.save}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Modal
        isOpen={!!manageDisciplinasCurso}
        onClose={() => setManageDisciplinasCurso(null)}
        title={`${t.nav.subjects}: ${manageDisciplinasCurso?.nome}`}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.subjects.list}</div>
            {!isReadOnly && (
              <button 
                onClick={() => handleOpenDisciplinaModal()}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-xs font-bold uppercase transition-colors"
              >
                <Plus size={14} />
                {t.subjects.add}
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {loadingDisciplinas ? (
              <div className="flex justify-center py-8 text-slate-400">
                <Loader2 size={24} className="animate-spin" />
              </div>
            ) : disciplinas.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm italic bg-slate-50 rounded-xl border-2 border-dashed border-slate-100">
                {t.subjects.noSubjects}
              </div>
            ) : (
              disciplinas.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:border-slate-200 hover:shadow-sm transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                      <GraduationCap size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{d.nome}</h4>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">{d.codigo}</span>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                          <Clock size={12} className="opacity-50" />
                          {d.carga_horaria}H
                        </div>
                      </div>
                    </div>
                  </div>
                  {!isReadOnly && (
                    <div className="flex gap-1">
                      <button 
                        onClick={() => handleOpenDisciplinaModal(d)}
                        className="p-2 bg-slate-50 border border-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-400 transition-all shadow-sm"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => deleteDisciplina(d.id)}
                        className="p-2 bg-slate-50 border border-slate-100 hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-400 transition-all shadow-sm"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!manageTurmasCurso}
        onClose={() => setManageTurmasCurso(null)}
        title={`${t.nav.classes}: ${manageTurmasCurso?.nome}`}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.classes.list}</div>
            {!isReadOnly && (
              <button 
                onClick={() => handleOpenTurmaModal()}
                className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 text-xs font-bold uppercase transition-colors"
              >
                <Plus size={14} />
                {t.classes.add}
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {loadingTurmas ? (
              <div className="flex justify-center py-8 text-slate-400">
                <Loader2 size={24} className="animate-spin" />
              </div>
            ) : turmas.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm italic bg-slate-50 rounded-xl border-2 border-dashed border-slate-100">
                Sem turmas cadastradas para este curso.
              </div>
            ) : (
              turmas.map((turma) => (
                <div key={turma.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:border-slate-200 hover:shadow-sm transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors">
                      <Layers size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{turma.nome}</h4>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                          <Calendar size={12} className="opacity-50" />
                          {turma.ano}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                          <Clock size={12} className="opacity-50" />
                          {turma.periodo}
                        </div>
                        {turma.instrutor && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                            <Users size={12} className="opacity-50" />
                            {turma.instrutor}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button 
                       onClick={() => setViewingTurmaAlunos(turma)}
                       className="p-2 bg-slate-50 border border-slate-100 hover:bg-amber-50 hover:text-amber-600 rounded-lg text-slate-400 transition-all shadow-sm"
                       title={t.nav.students}
                    >
                       <User size={14} />
                    </button>
                    {!isReadOnly && (
                      <div className="flex gap-1">
                        <button 
                          onClick={() => handleOpenTurmaModal(turma)}
                          className="p-2 bg-slate-50 border border-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-400 transition-all shadow-sm"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => deleteTurma(turma.id)}
                          className="p-2 bg-slate-50 border border-slate-100 hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-400 transition-all shadow-sm"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isTurmaModalOpen}
        onClose={() => setIsTurmaModalOpen(false)}
        title={currentTurma?.id ? t.common.edit : t.classes.add}
      >
        <form onSubmit={handleSaveTurma} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.classes.name}</label>
            <input
              required
              type="text"
              value={currentTurma?.nome || ''}
              onChange={(e) => setCurrentTurma({ ...currentTurma, nome: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 transition-colors text-sm font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.classes.year}</label>
              <input
                required
                type="number"
                value={currentTurma?.ano || ''}
                onChange={(e) => setCurrentTurma({ ...currentTurma, ano: parseInt(e.target.value) })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 transition-colors text-sm font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.classes.period}</label>
              <select
                required
                value={currentTurma?.periodo || 'manhã'}
                onChange={(e) => setCurrentTurma({ ...currentTurma, periodo: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 transition-colors text-sm font-bold"
              >
                <option value="manhã">{t.common.morning}</option>
                <option value="tarde">{t.common.afternoon}</option>
                <option value="noite">{t.common.night}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.classes.instructor}</label>
              <input
                type="text"
                value={currentTurma?.instrutor || ''}
                onChange={(e) => setCurrentTurma({ ...currentTurma, instrutor: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 transition-colors text-sm font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.classes.status}</label>
              <select
                required
                value={currentTurma?.status || 'ativa'}
                onChange={(e) => setCurrentTurma({ ...currentTurma, status: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 transition-colors text-sm font-bold"
              >
                <option value="ativa">{t.classes.active}</option>
                <option value="concluída">{t.classes.completed}</option>
                <option value="cancelada">{t.classes.cancelled}</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.courses.location}</label>
            <input
              type="text"
              value={currentTurma?.localizacao || ''}
              onChange={(e) => setCurrentTurma({ ...currentTurma, localizacao: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 transition-colors text-sm font-medium"
            />
          </div>

          <div className="flex gap-3 pt-6">
            <button
              type="button"
              onClick={() => setIsTurmaModalOpen(false)}
              className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={savingTurma}
              className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-100 flex items-center justify-center gap-2"
            >
              {savingTurma ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {t.common.save}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!viewingTurmaAlunos}
        onClose={() => setViewingTurmaAlunos(null)}
        title={`${t.nav.students}: ${viewingTurmaAlunos?.nome}`}
        size="lg"
      >
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder={t.common.search}
                value={studentSearchTerm}
                onChange={(e) => setStudentSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 text-xs transition-all"
              />
            </div>
            {!isReadOnly && (
              <button 
                onClick={() => handleOpenAddStudentModal()}
                className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all hover:bg-amber-700 shadow-sm shadow-amber-100"
              >
                <UserPlus size={14} />
                {t.students.add}
              </button>
            )}
          </div>

          <div className="max-h-[500px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {loadingTurmaStudents ? (
              <div className="flex justify-center py-12 text-slate-400">
                <Loader2 size={32} className="animate-spin text-amber-500" />
              </div>
            ) : turmaStudents.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-sm italic bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100">
                {t.classes.noStudents}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {turmaStudents
                  .filter(s => s.nome.toLowerCase().includes(studentSearchTerm.toLowerCase()) || s.matricula.toLowerCase().includes(studentSearchTerm.toLowerCase()))
                  .map((aluno) => (
                    <div key={aluno.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-amber-200 hover:shadow-md hover:shadow-slate-100 transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-amber-50 group-hover:text-amber-500 transition-colors">
                          <User size={20} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-800 text-sm truncate">{aluno.nome}</h4>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 rounded uppercase">{aluno.matricula}</span>
                          </div>
                        </div>
                      </div>
                      {!isReadOnly && (
                        <div className="flex gap-1">
                          <button 
                            onClick={() => handleOpenAddStudentModal(aluno)}
                            className="p-2 bg-slate-50 text-slate-400 hover:bg-amber-50 hover:text-amber-600 rounded-xl transition-all"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => deleteStudent(aluno.id)}
                            className="p-2 bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isAddStudentModalOpen}
        onClose={() => setIsAddStudentModalOpen(false)}
        title={currentStudent?.id ? t.common.edit : t.students.add}
      >
        <form onSubmit={handleSaveStudent} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t.students.name}</label>
            <input
              required
              type="text"
              value={currentStudent?.nome || ''}
              onChange={(e) => setCurrentStudent({ ...currentStudent, nome: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 transition-all text-sm font-medium"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t.students.registration}</label>
              <input
                required
                type="text"
                value={currentStudent?.matricula || ''}
                onChange={(e) => setCurrentStudent({ ...currentStudent, matricula: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 transition-all font-mono text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t.nav.classes}</label>
              <select
                required
                value={currentStudent?.turma_id || ''}
                onChange={(e) => setCurrentStudent({ ...currentStudent, turma_id: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 transition-all text-sm font-bold"
              >
                <option value="">Selecione uma turma</option>
                {turmas.map(t => (
                  <option key={t.id} value={t.id}>{t.nome} ({t.ano})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t.students.email}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="email"
                value={currentStudent?.email || ''}
                onChange={(e) => setCurrentStudent({ ...currentStudent, email: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 transition-all text-sm"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-6">
            <button
              type="button"
              onClick={() => setIsAddStudentModalOpen(false)}
              className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={savingStudent}
              className="flex-1 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-bold hover:bg-amber-700 transition-colors shadow-sm shadow-amber-100 flex items-center justify-center gap-2"
            >
              {savingStudent ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {t.common.save}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isDisciplinaModalOpen}
        onClose={() => setIsDisciplinaModalOpen(false)}
        title={currentDisciplina?.id ? t.common.edit : t.subjects.add}
      >
        <form onSubmit={handleSaveDisciplina} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.subjects.name}</label>
            <input
              required
              type="text"
              value={currentDisciplina?.nome || ''}
              onChange={(e) => setCurrentDisciplina({ ...currentDisciplina, nome: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 transition-colors text-sm font-medium"
              placeholder={t.subjects.name}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.subjects.code}</label>
              <input
                required
                type="text"
                value={currentDisciplina?.codigo || ''}
                onChange={(e) => setCurrentDisciplina({ ...currentDisciplina, codigo: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 transition-colors text-sm font-mono"
                placeholder="PROG101"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.subjects.hours}</label>
              <input
                required
                type="number"
                value={currentDisciplina?.carga_horaria || ''}
                onChange={(e) => setCurrentDisciplina({ ...currentDisciplina, carga_horaria: parseInt(e.target.value) })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 transition-colors text-sm font-bold"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-6">
            <button
              type="button"
              onClick={() => setIsDisciplinaModalOpen(false)}
              className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={savingDisciplina}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-100 flex items-center justify-center gap-2"
            >
              {savingDisciplina ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {t.common.save}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title={t.common.bulkAdd}
      >
        <form onSubmit={handleBulkSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              {t.common.bulkAdd} (CSV: {t.courses.name}, {t.subjects.code}, {t.courses.description})
            </label>
            <textarea
              required
              rows={8}
              value={bulkData}
              onChange={(e) => setBulkData(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm font-mono"
              placeholder="Ex: Engenharia, ENG101, Curso de base&#10;Administração, ADM, Gestão&#10;Direito"
            />
            
            <div className="mt-3 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={skipHeader}
                  onChange={(e) => setSkipHeader(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-blue-600 transition-colors">
                  {t.common.skipHeader}
                </span>
              </label>
              
              <button
                type="button"
                onClick={() => setBulkData('')}
                className="text-[10px] font-bold text-slate-400 uppercase hover:text-red-500 transition-colors"
              >
                {t.common.clearField}
              </button>
            </div>

            <p className="mt-4 text-[10px] text-slate-400 italic">
              * {language === 'pt' ? 'Suporta separadores por vírgula (,) ou ponto-e-vírgula (;).' : 'Supports comma (,) or semicolon (;) separators.'}<br/>
              * {language === 'pt' ? 'Somente o Nome é obrigatório. Se o código for omitido, será gerado automaticamente.' : 'Only Name is required. If the code is omitted, it will be automatically generated.'}
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsBulkModalOpen(false)}
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
              {t.common.import}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
