'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useCursos } from '@/hooks/useCachedData';
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
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '@/components/Modal';
import { cn } from '@/lib/utils';

import { Toaster, toast } from 'sonner';

type Curso = z.infer<typeof cursoSchema> & { id: string };

export default function CursosPage() {
  const { t, language } = useI18n();
  const { isAdmin } = useUser();
  const isReadOnly = !isAdmin;
  const { cursos, loading, mutate: revalidateCursos } = useCursos();
  const [modalOpen, setModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [skipHeader, setSkipHeader] = useState(false);
  const [bulkData, setBulkData] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingCurso, setEditingCurso] = useState<Curso | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  // Discipline Management State
  const [manageDisciplinasCurso, setManageDisciplinasCurso] = useState<Curso | null>(null);
  const [disciplinas, setDisciplinas] = useState<any[]>([]);
  const [loadingDisciplinas, setLoadingDisciplinas] = useState(false);
  const [isDisciplinaModalOpen, setIsDisciplinaModalOpen] = useState(false);
  const [currentDisciplina, setCurrentDisciplina] = useState<any>(null);
  const [savingDisciplina, setSavingDisciplina] = useState(false);

  // Materias Modulos State
  const [manageMateriasDisciplina, setManageMateriasDisciplina] = useState<any | null>(null);
  const [materiasModulos, setMateriasModulos] = useState<any[]>([]);
  const [loadingMaterias, setLoadingMaterias] = useState(false);
  const [isMateriaModalOpen, setIsMateriaModalOpen] = useState(false);
  const [currentMateria, setCurrentMateria] = useState<any>(null);
  const [savingMateria, setSavingMateria] = useState(false);
  const [activeModuloIndex, setActiveModuloIndex] = useState(1);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof cursoSchema>>({
    resolver: zodResolver(cursoSchema),
    defaultValues: {
      nome: '',
      descricao: '',
      duracao: 1,
      duracao_unidade: 'ano',
      ativo: true,
      qtd_modulos: 4,
      categoria: null,
      internacional: false,
      localizacao: '',
    }
  });

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
        categoria: data.categoria,
        internacional: data.internacional || false,
        localizacao: data.localizacao || ''
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
      await revalidateCursos();
      toast.success(language === 'pt' ? 'Curso salvo com sucesso!' : 'Course saved successfully!');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const deleteCurso = async (id: string) => {
    if (isReadOnly) return;
    const { error } = await supabase
      .from('cursos')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success(language === 'pt' ? 'Curso removido!' : 'Course removed!');
      await revalidateCursos();
    }
  };

  const [deletingDisciplinaId, setDeletingDisciplinaId] = useState<string | null>(null);
  const [confirmDeleteDisciplinaId, setConfirmDeleteDisciplinaId] = useState<string | null>(null);

  const fetchDisciplinas = useCallback(async (cursoId: string) => {
    setLoadingDisciplinas(true);
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
    } else {
      setDisciplinas([]);
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

      await fetchDisciplinas(manageDisciplinasCurso.id);
      setIsDisciplinaModalOpen(false);
      toast.success(language === 'pt' ? 'Disciplina salva!' : 'Subject saved!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingDisciplina(false);
    }
  };

  const deleteDisciplina = async (id: string) => {
    if (isReadOnly || !manageDisciplinasCurso) return;
    
    setDeletingDisciplinaId(id);
    try {
      const { error } = await supabase
        .from('disciplinas')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      
      await fetchDisciplinas(manageDisciplinasCurso.id);
      setConfirmDeleteDisciplinaId(null);
      toast.success(language === 'pt' ? 'Disciplina removida!' : 'Subject removed!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeletingDisciplinaId(null);
    }
  };

  const fetchMaterias = useCallback(async (disciplinaId: string) => {
    setLoadingMaterias(true);
    const { data } = await supabase
      .from('materias_modulos')
      .select('*')
      .eq('disciplina_id', disciplinaId)
      .is('deleted_at', null)
      .order('modulo_index', { ascending: true })
      .order('ordem', { ascending: true });
    if (data) setMateriasModulos(data);
    setLoadingMaterias(false);
  }, []);

  useEffect(() => {
    if (manageMateriasDisciplina) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchMaterias(manageMateriasDisciplina.id);
    } else {
      setMateriasModulos([]);
    }
  }, [manageMateriasDisciplina, fetchMaterias]);

  const handleOpenMateriaModal = (materia: any = null) => {
    if (isReadOnly) return;
    setCurrentMateria(materia || { 
      nome: '', 
      descricao: '', 
      modulo_index: activeModuloIndex, 
      disciplina_id: manageMateriasDisciplina?.id,
      ordem: materiasModulos.filter(m => m.modulo_index === activeModuloIndex).length + 1
    });
    setIsMateriaModalOpen(true);
  };

  const handleSaveMateria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manageMateriasDisciplina || isReadOnly) return;
    setSavingMateria(true);

    try {
      const dataToSave = {
        nome: currentMateria.nome,
        descricao: currentMateria.descricao,
        modulo_index: currentMateria.modulo_index,
        disciplina_id: manageMateriasDisciplina.id,
        ordem: currentMateria.ordem
      };

      if (currentMateria.id) {
        const { error } = await supabase
          .from('materias_modulos')
          .update(dataToSave)
          .eq('id', currentMateria.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('materias_modulos')
          .insert([dataToSave]);
        if (error) throw error;
      }

      await fetchMaterias(manageMateriasDisciplina.id);
      setIsMateriaModalOpen(false);
      toast.success(language === 'pt' ? 'Tópico salvo!' : 'Topic saved!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingMateria(false);
    }
  };

  const deleteMateria = async (id: string) => {
    if (isReadOnly || !manageMateriasDisciplina) return;

    try {
      const { error } = await supabase
        .from('materias_modulos')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      
      await fetchMaterias(manageMateriasDisciplina.id);
      toast.success(language === 'pt' ? 'Tópico removido!' : 'Topic removed!');
    } catch (err: any) {
      toast.error(err.message);
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

      await revalidateCursos();
      setIsBulkModalOpen(false);
      setBulkData('');
      
      const successCount = data?.length || 0;
      toast.success(t.common.successCount.replace('{count}', successCount.toString()));
      if (results.errors.length > 0) {
        toast.error('Alguns erros ocorreram:\n' + results.errors.join('\n'));
      }
    } catch (err: any) {
      toast.error(t.common.importError + ': ' + (err.message || t.common.parseError));
    } finally {
      setSaving(false);
    }
  };

  const filteredCursos = cursos.filter(c => {
    const matchesSearch = c.nome.toLowerCase().includes(searchTerm.toLowerCase());
    if (activeCategory === 'Exterior') {
      return matchesSearch && c.internacional === true;
    }
    const matchesCategory = !activeCategory || 
      (c.categoria && c.categoria.toLowerCase() === activeCategory.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.courses.title}</h1>
          <p className="text-slate-500 text-sm">{language === 'pt' ? 'Visualize e gerencie os cursos oferecidos pela instituição.' : 'View and manage the courses offered by the institution.'}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
          {/* Cursos Category Buttons */}
          <div className="flex flex-wrap items-center bg-white p-1 rounded-xl shadow-sm border border-slate-200 gap-1">
            {([null, 'Expedito', 'Especial', 'Carreira', 'EaD', 'Exterior'] as const).map((cat) => (
              <button
                key={cat || 'todos'}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap cursor-pointer",
                  activeCategory === cat 
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-200" 
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                )}
              >
                {cat === null 
                  ? (language === 'pt' ? 'Todos' : 'All')
                  : cat === 'Expedito' 
                    ? t.courses.categoryExpedito 
                    : cat === 'Especial' 
                      ? t.courses.categoryEspecial 
                      : cat === 'Carreira'
                        ? t.courses.categoryCarreira
                        : cat === 'EaD'
                          ? t.courses.categoryEad
                          : t.courses.categoryExterior}
              </button>
            ))}
          </div>

          {!isReadOnly && (
            <div className="flex gap-2 justify-end">
              <button 
                type="button"
                onClick={() => setIsBulkModalOpen(true)}
                className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm whitespace-nowrap cursor-pointer"
              >
                <FileText size={18} />
                {t.common.bulkAdd}
              </button>
              <button 
                id="add-course-btn"
                type="button"
                onClick={() => { reset(); setEditingCurso(null); setModalOpen(true); }}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm shadow-blue-100 whitespace-nowrap cursor-pointer"
              >
                <Plus size={18} />
                {t.courses.add}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Search Bar and Info Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold" size={18} />
            <input
              type="text"
              placeholder={t.common.search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 focus:bg-white text-sm transition-all"
            />
          </div>
          <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
            {language === 'pt' 
              ? `${filteredCursos.length} ${filteredCursos.length === 1 ? 'curso encontrado' : 'cursos encontrados'}`
              : `${filteredCursos.length} ${filteredCursos.length === 1 ? 'course found' : 'courses found'}`
            }
          </div>
        </div>

        {/* Dynamic Card Grid */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3 shadow-sm">
            <Loader2 className="animate-spin text-blue-600" size={32} />
            <span className="text-sm font-medium">{t.common.loading}...</span>
          </div>
        ) : filteredCursos.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3 shadow-sm">
            <GraduationCap className="text-slate-300" size={48} />
            <span className="text-sm font-medium">{t.common.noneFound}</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCursos.map((curso) => (
              <motion.div
                key={curso.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className={cn(
                  "rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group relative overflow-hidden",
                  curso.internacional
                    ? "bg-blue-50/30 hover:bg-blue-50/60 border-blue-200/80 hover:border-blue-400/80 shadow-blue-500/5"
                    : curso.categoria === 'Expedito'
                    ? "bg-amber-50/30 hover:bg-amber-50/60 border-amber-200/80 hover:border-amber-400/80 shadow-amber-500/5"
                    : curso.categoria === 'Especial'
                    ? "bg-purple-50/30 hover:bg-purple-50/60 border-purple-200/80 hover:border-purple-400/80 shadow-purple-500/5"
                    : curso.categoria === 'EaD'
                    ? "bg-cyan-50/30 hover:bg-cyan-50/60 border-cyan-200/80 hover:border-cyan-400/80 shadow-cyan-500/5"
                    : curso.categoria === 'Carreira'
                    ? "bg-emerald-50/30 hover:bg-emerald-50/60 border-emerald-200/80 hover:border-emerald-400/80 shadow-emerald-500/5"
                    : "bg-white border-slate-200 hover:border-slate-300"
                )}
              >
                <div className={cn(
                  "absolute top-0 left-0 right-0 h-1.5",
                  curso.internacional ? 'bg-blue-600' :
                  curso.categoria === 'Expedito' ? 'bg-amber-500' :
                  curso.categoria === 'Especial' ? 'bg-purple-500' :
                  curso.categoria === 'EaD' ? 'bg-cyan-500' :
                  curso.categoria === 'Carreira' ? 'bg-emerald-500' : 'bg-slate-300'
                )} />

                <div>
                  <div className="flex items-start justify-between gap-3 mb-3 mt-1">
                    <h3 className="font-bold text-slate-900 text-base sm:text-lg tracking-tight leading-snug line-clamp-2">
                      {curso.nome}
                    </h3>
                    
                    {!isReadOnly && (
                      <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                        <button 
                          onClick={() => { setEditingCurso(curso); reset(curso); setModalOpen(true); }}
                          className="p-1.5 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors text-slate-400 cursor-pointer"
                          title={t.common.edit}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button 
                          onClick={() => deleteCurso(curso.id)}
                          className="p-1.5 bg-slate-50 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors text-slate-400 cursor-pointer"
                          title={t.common.delete}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Badge Section */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {curso.categoria && (
                      <span className={cn(
                        "px-2 py-0.5 text-[9px] font-bold uppercase rounded-md border",
                        curso.categoria === 'Expedito' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                        curso.categoria === 'Especial' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                        curso.categoria === 'EaD' ? 'bg-cyan-50 text-cyan-700 border-cyan-100' :
                        'bg-emerald-50 text-emerald-700 border-emerald-100'
                      )}>
                        {curso.categoria}
                      </span>
                    )}
                    {curso.internacional && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[9px] font-bold uppercase rounded-md border border-blue-100">
                        {language === 'pt' ? 'Exterior' : 'Abroad'}
                      </span>
                    )}
                    {curso.localizacao && (
                      <span className="px-2 py-0.5 bg-slate-50 text-slate-600 text-[9px] font-bold uppercase rounded-md border border-slate-150">
                        {curso.localizacao}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {curso.descricao ? (
                    <p className="text-slate-500 text-xs leading-relaxed mb-4 line-clamp-3">
                      {curso.descricao}
                    </p>
                  ) : (
                    <p className="text-slate-350 italic text-xs mb-4">
                      {language === 'pt' ? 'Sem descrição cadastrada' : 'No description provided'}
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 mt-auto">
                  <div className="flex items-center gap-1.5 text-slate-500 shrink-0">
                    <Clock size={14} className="text-slate-400" />
                    <div className="flex flex-col select-none">
                      <span className="text-xs font-semibold text-slate-700 leading-tight">
                        {curso.duracao} {
                          curso.duracao === 1 
                            ? (curso.duracao_unidade === 'dia' ? t.courses.day : curso.duracao_unidade === 'semana' ? t.courses.week : curso.duracao_unidade === 'mes' ? t.courses.month : t.courses.year)
                            : (curso.duracao_unidade === 'dia' ? t.courses.days : curso.duracao_unidade === 'semana' ? t.courses.weeks : curso.duracao_unidade === 'mes' ? t.courses.months : t.courses.years)
                        }
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        {curso.qtd_modulos || 4} {t.grades.module}s
                      </span>
                    </div>
                  </div>

                  {!curso.internacional && (
                    <button 
                      onClick={() => {
                        setManageDisciplinasCurso(curso);
                        setLoadingDisciplinas(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-700 border border-slate-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 shadow-sm shrink-0 cursor-pointer"
                    >
                      <BookMarked size={12} />
                      {t.nav.subjects}
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
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
                  <label className="text-sm font-semibold text-slate-700">Número de Módulos (Máx 10)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
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
                    <option value="EaD">{t.courses.categoryEad}</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 py-2">
                  <input
                    id="checkbox-internacional"
                    type="checkbox"
                    {...register('internacional')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded cursor-pointer"
                  />
                  <label htmlFor="checkbox-internacional" className="text-sm font-semibold text-slate-700 cursor-pointer">
                    {language === 'pt' ? 'Curso realizado no Exterior (Internacional)' : 'Course conducted Abroad (International)'}
                  </label>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">
                    {language === 'pt' ? 'Localização' : 'Location'}
                  </label>
                  <input
                    type="text"
                    {...register('localizacao')}
                    placeholder={language === 'pt' ? 'Ex: Luanda, Paris, EaD' : 'E.g., Luanda, Paris, Remote'}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 transition-colors"
                  />
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
                    <div className="flex gap-1 items-center">
                      <button 
                        onClick={() => setManageMateriasDisciplina(d)}
                        className="px-2 py-1.5 bg-slate-50 border border-slate-100 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg text-slate-400 transition-all shadow-sm flex items-center gap-1.5 min-w-[80px] justify-center mr-2"
                      >
                        <BookOpen size={14} />
                        <span className="text-[10px] font-bold uppercase">Tópicos</span>
                      </button>
                      {!confirmDeleteDisciplinaId || confirmDeleteDisciplinaId !== d.id ? (
                        <>
                          <button 
                            onClick={() => handleOpenDisciplinaModal(d)}
                            className="p-2 bg-slate-50 border border-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-400 transition-all shadow-sm"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => setConfirmDeleteDisciplinaId(d.id)}
                            className="p-2 bg-slate-50 border border-slate-100 hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-400 transition-all shadow-sm"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      ) : (
                        <div className="flex gap-1 animate-in fade-in zoom-in duration-200">
                          <button 
                            onClick={() => setConfirmDeleteDisciplinaId(null)}
                            disabled={deletingDisciplinaId === d.id}
                            className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold uppercase hover:bg-slate-200 transition-all"
                          >
                            {t.common.cancel}
                          </button>
                          <button 
                            onClick={() => deleteDisciplina(d.id)}
                            disabled={deletingDisciplinaId === d.id}
                            className="px-2 py-1 bg-red-600 text-white rounded-md text-[10px] font-bold uppercase hover:bg-red-700 transition-all flex items-center gap-1"
                          >
                            {deletingDisciplinaId === d.id ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                            {t.common.confirm}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
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
      
      {/* Materias Modulos Management Modal */}
      <Modal
        isOpen={!!manageMateriasDisciplina}
        onClose={() => setManageMateriasDisciplina(null)}
        title={`${t.subjects.subjectsPerModule}: ${manageMateriasDisciplina?.nome}`}
      >
        <div className="space-y-6">
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
            {Array.from({ length: manageDisciplinasCurso?.qtd_modulos || 4 }).map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveModuloIndex(i + 1)}
                className={cn(
                  "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                  activeModuloIndex === i + 1 
                    ? "bg-white text-blue-600 shadow-sm" 
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                {t.subjects.module} {i + 1}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {t.subjects.module} {activeModuloIndex}
            </div>
            {!isReadOnly && (
              <button 
                onClick={() => handleOpenMateriaModal()}
                className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 text-xs font-bold uppercase transition-colors"
              >
                <Plus size={14} />
                {t.subjects.addSubjectTopic}
              </button>
            )}
          </div>

          <div className="max-h-[350px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {loadingMaterias ? (
              <div className="flex justify-center py-8 text-slate-400">
                <Loader2 size={24} className="animate-spin" />
              </div>
            ) : materiasModulos.filter(m => m.modulo_index === activeModuloIndex).length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm italic bg-slate-50 rounded-xl border-2 border-dashed border-slate-100">
                {t.subjects.noTopics}
              </div>
            ) : (
              materiasModulos
                .filter(m => m.modulo_index === activeModuloIndex)
                .map((m) => (
                  <div key={m.id} className="p-4 bg-white border border-slate-100 rounded-xl hover:border-slate-200 transition-all group">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">{m.nome}</h4>
                        {m.descricao && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{m.descricao}</p>}
                      </div>
                      {!isReadOnly && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleOpenMateriaModal(m)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => deleteMateria(m.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
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

      {/* Single Materia Edit/Add Modal */}
      <Modal
        isOpen={isMateriaModalOpen}
        onClose={() => setIsMateriaModalOpen(false)}
        title={currentMateria?.id ? t.common.edit : t.subjects.addSubjectTopic}
      >
        <form onSubmit={handleSaveMateria} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.subjects.topicName}</label>
            <input
              required
              type="text"
              value={currentMateria?.nome || ''}
              onChange={(e) => setCurrentMateria({ ...currentMateria, nome: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 transition-colors text-sm font-medium"
              placeholder="Ex: Introdução à Lógica"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.subjects.topicDescription}</label>
            <textarea
              rows={3}
              value={currentMateria?.descricao || ''}
              onChange={(e) => setCurrentMateria({ ...currentMateria, descricao: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 transition-colors text-sm"
              placeholder="Descreva brevemente o conteúdo deste tópico..."
            />
          </div>

          <div className="flex gap-3 pt-6">
            <button
              type="button"
              onClick={() => setIsMateriaModalOpen(false)}
              className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={savingMateria}
              className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-100 flex items-center justify-center gap-2"
            >
              {savingMateria ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
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
