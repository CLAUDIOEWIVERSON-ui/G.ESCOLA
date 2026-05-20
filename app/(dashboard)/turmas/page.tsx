'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { useUser } from '@/lib/auth/UserContext';
import { Plus, Search, Layers as LayersIcon, Library, Calendar, Clock, MapPin, Pencil, Trash2, Loader2, CheckCircle2, RefreshCcw, Users, Mail, Phone, Building, Camera, MessageCircle, XCircle, FileText, X, GraduationCap, School, ChevronRight, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import Modal from '@/components/Modal';
import Image from 'next/image';
import maleAvatar from '@/src/assets/images/avatar_male_1778977230783.png';
import femaleAvatar from '@/src/assets/images/avatar_female_1778977246051.png';

import { toast } from 'sonner';

function TurmasContent() {
  const { t, language } = useI18n();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const categoryParam = searchParams.get('cat');
  
  const { isAdmin } = useUser();
  const isReadOnly = !isAdmin;
  const [turmas, setTurmas] = useState<any[]>([]);
  const [cursos, setCursos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTurma, setCurrentTurma] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [savingStudent, setSavingStudent] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [isStudentsModalOpen, setIsStudentsModalOpen] = useState(false);
  const [isStudentFormOpen, setIsStudentFormOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkData, setBulkData] = useState('');
  const [skipHeader, setSkipHeader] = useState(false);
  const [viewingTurma, setViewingTurma] = useState<any>(null);
  const [alunosInTurma, setAlunosInTurma] = useState<any[]>([]);
  const [currentAluno, setCurrentAluno] = useState<any>(null);
  const [loadingAlunos, setLoadingAlunos] = useState(false);
  const [expandedPhoto, setExpandedPhoto] = useState<{url: string, name: string} | null>(null);
  
  const activeCategory = (categoryParam && ['expedito', 'especial', 'carreira'].includes(categoryParam)) 
    ? (categoryParam as 'expedito' | 'especial' | 'carreira') 
    : 'expedito';

  const setActiveCategory = (cat: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('cat', cat);
    router.push(`${pathname}?${params.toString()}`);
  };

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const fetchCursos = useCallback(async () => {
    const { data } = await supabase
      .from('cursos')
      .select('id, nome')
      .is('deleted_at', null)
      .order('nome');
    if (data) setCursos(data);
  }, []);

  const fetchTurmas = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    else setRefreshing(true);

    const { data } = await supabase
      .from('turmas')
      .select('*, curso:cursos(nome)')
      .is('deleted_at', null)
      .order('nome');
      
    if (data) setTurmas(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchTurmas(), fetchCursos()]);
    };
    init();
  }, [fetchTurmas, fetchCursos]);

  const refreshData = () => fetchTurmas(true);

  const handleOpenModal = (turma: any = null) => {
    if (isReadOnly) return;
    setCurrentTurma(turma || { 
      nome: '', 
      curso_id: '', 
      categoria: activeCategory,
      ano: new Date().getFullYear(), 
      periodo: 'manhã', 
      capacidade_max: 40, 
      instrutor: '', 
      status: 'ativa',
      data_inicio: '',
      data_fim: '',
      internacional: false,
      localizacao: ''
    });
    setIsModalOpen(true);
  };

  const handleViewStudents = async (turma: any) => {
    setViewingTurma(turma);
    setIsStudentsModalOpen(true);
    setLoadingAlunos(true);
    
    try {
      const { data, error } = await supabase
        .from('alunos')
        .select('*')
        .eq('turma_id', turma.id)
        .is('deleted_at', null)
        .order('nome');
        
      if (error) throw error;
      setAlunosInTurma(data || []);
    } catch (err: any) {
      console.error('Error fetching students:', err.message);
    } finally {
      setLoadingAlunos(false);
    }
  };

  const handleOpenStudentModal = (aluno: any = null) => {
    if (isReadOnly) return;
    setCurrentAluno(aluno || { 
      nome: '', 
      email: '', 
      matricula: '', 
      turma_id: viewingTurma?.id || '', 
      status: 'ativo',
      genero: 'masculino',
      nif: '',
      rg: '',
      om: '',
      posto_graduacao: '',
      ano_admissao: new Date().getFullYear(),
      telefone: '',
      whatsapp: '',
      foto_url: ''
    });
    setIsStudentFormOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSavingStudent(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}.${fileExt}`;
      const filePath = `alunos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('escola')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('escola')
        .getPublicUrl(filePath);

      setCurrentAluno({ ...currentAluno, foto_url: publicUrl });
      toast.success(language === 'pt' ? 'Foto carregada!' : 'Photo uploaded!');
    } catch (err: any) {
      toast.error(t.common.uploadError + ': ' + (err.message || ''));
    } finally {
      setSavingStudent(false);
    }
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    setSavingStudent(true);

    try {
      if (!currentAluno.nome || currentAluno.nome.trim().length < 2) {
        throw new Error(language === 'pt' ? 'Nome é obrigatório (mínimo 3 caracteres)' : 'Name is required (min 3 characters)');
      }

      let matricula = currentAluno.matricula;
      if (!matricula || matricula.length < 2) {
        matricula = `MAT${new Date().getFullYear()}${Math.floor(100000 + Math.random() * 899999)}`;
      }

      const dataToSave: any = {
        nome: currentAluno.nome,
        matricula: matricula,
        turma_id: viewingTurma?.id,
      };

      dataToSave.email = (currentAluno.email && currentAluno.email.includes('@')) ? currentAluno.email : null;
      if (currentAluno.posto_graduacao) dataToSave.posto_graduacao = currentAluno.posto_graduacao;
      if (currentAluno.nif) dataToSave.nif = currentAluno.nif;
      if (currentAluno.rg) dataToSave.rg = currentAluno.rg;
      if (currentAluno.titulo_eleitor) dataToSave.titulo_eleitor = currentAluno.titulo_eleitor;
      if (currentAluno.nome_pai) dataToSave.nome_pai = currentAluno.nome_pai;
      if (currentAluno.nome_mae) dataToSave.nome_mae = currentAluno.nome_mae;
      if (currentAluno.om) dataToSave.om = currentAluno.om;
      if (currentAluno.genero) dataToSave.genero = currentAluno.genero;
      if (currentAluno.telefone) dataToSave.telefone = currentAluno.telefone;
      if (currentAluno.whatsapp) dataToSave.whatsapp = currentAluno.whatsapp;
      if (currentAluno.foto_url) dataToSave.foto_url = currentAluno.foto_url;
      
      const parsedAno = currentAluno.ano_admissao ? parseInt(currentAluno.ano_admissao.toString()) : NaN;
      if (!isNaN(parsedAno)) dataToSave.ano_admissao = parsedAno;

      let saveError;
      if (currentAluno.id) {
        const { error } = await supabase
          .from('alunos')
          .update(dataToSave)
          .eq('id', currentAluno.id);
        saveError = error;
      } else {
        const { error } = await supabase
          .from('alunos')
          .insert([dataToSave]);
        saveError = error;
      }

      if (saveError) throw saveError;

      // Refresh list
      const { data } = await supabase
        .from('alunos')
        .select('*')
        .eq('turma_id', viewingTurma?.id)
        .is('deleted_at', null)
        .order('nome');
      
      if (data) setAlunosInTurma(data);
      setIsStudentFormOpen(false);
      refreshData(); // Refresh class count
      toast.success(language === 'pt' ? 'Aluno salvo com sucesso!' : 'Student saved successfully!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingStudent(false);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (isReadOnly) return;
    setConfirmConfig({
      isOpen: true,
      title: t.common.delete,
      message: t.common.delete + '?',
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        setDeletingStudent(id);
        
        try {
          const { error } = await supabase
            .from('alunos')
            .delete()
            .eq('id', id);
            
          if (error) throw error;
          
          setAlunosInTurma(alunosInTurma.filter(a => a.id !== id));
          refreshData(); // Refresh class count
          toast.success(language === 'pt' ? 'Aluno removido!' : 'Student removed!');
        } catch (err: any) {
          toast.error(err.message);
        } finally {
          setDeletingStudent(null);
        }
      }
    });
  };

  const handleDeleteAllStudents = async () => {
    if (!viewingTurma || alunosInTurma.length === 0 || isReadOnly) return;
    
    setConfirmConfig({
      isOpen: true,
      title: t.common.deleteAll,
      message: t.common.deleteAllConfirm,
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        setDeletingAll(true);
        try {
          const { error } = await supabase
            .from('alunos')
            .delete()
            .eq('turma_id', viewingTurma.id);
            
          if (error) throw error;
          
          setAlunosInTurma([]);
          refreshData();
          toast.success(language === 'pt' ? 'Todos os alunos foram removidos!' : 'All students were removed!');
        } catch (err: any) {
          toast.error(err.message);
        } finally {
          setDeletingAll(false);
        }
      }
    });
  };

  const handleBulkSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkData.trim() || !viewingTurma || isReadOnly) return;
    setSavingStudent(true);

    try {
      const rawLines = bulkData.split(/\r?\n/).filter(line => line.trim());
      if (rawLines.length === 0) throw new Error(t.common.parseError);

      const firstLine = rawLines[0];
      let separator = ',';
      if (firstLine.includes('\t')) separator = '\t';
      else if (firstLine.includes(';')) separator = ';';

      const dataLines = skipHeader ? rawLines.slice(1) : rawLines;
      
      const studentsToInsert = dataLines.map((line, index) => {
        const lineTrimmed = line.trim();
        if (!lineTrimmed) return null;

        let nome, email, matricula, nif, rg, om, posto_graduacao, ano_admissao, telefone, whatsapp, data_nascimento;
        
        if (!line.includes(separator)) {
          nome = lineTrimmed;
        } else {
          const parts = line.split(separator).map(s => s.trim());
          [nome, email, matricula, nif, rg, om, posto_graduacao, ano_admissao, telefone, whatsapp, data_nascimento] = parts;
        }
        
        const cleanNome = (nome || '').trim().replace(/['"]/g, '');
        if (!cleanNome) return null;

        const fallbackMatricula = `MAT${new Date().getFullYear()}${Math.floor(100000 + Math.random() * 899999)}`;

        const studentData: any = {
          nome: cleanNome,
          matricula: (matricula && matricula.length > 2) ? matricula.replace(/['"]/g, '') : fallbackMatricula,
          turma_id: viewingTurma.id,
          status: 'ativo'
        };

        if (email && email.includes('@')) studentData.email = email.replace(/['"]/g, '');
        if (nif) studentData.nif = nif;
        if (rg) studentData.rg = rg;
        if (om) studentData.om = om;
        if (posto_graduacao) studentData.posto_graduacao = posto_graduacao;
        if (telefone) studentData.telefone = telefone;
        if (whatsapp) studentData.whatsapp = whatsapp;
        if (data_nascimento && data_nascimento.length >= 8) studentData.data_nascimento = data_nascimento;

        const parsedAno = parseInt(ano_admissao || '');
        if (!isNaN(parsedAno)) studentData.ano_admissao = parsedAno;

        return studentData;
      }).filter(Boolean) as any[];

      if (studentsToInsert.length === 0) throw new Error(t.common.parseError);

      const { data, error } = await supabase
        .from('alunos')
        .insert(studentsToInsert)
        .select();
      
      if (error) throw error;

      // Refresh list
      const { data: newData } = await supabase
        .from('alunos')
        .select('*')
        .eq('turma_id', viewingTurma.id)
        .is('deleted_at', null)
        .order('nome');
      
      if (newData) setAlunosInTurma(newData);
      setIsBulkModalOpen(false);
      setBulkData('');
      refreshData();
      
      const successCount = data?.length || 0;
      toast.success(t.common.processedSuccess.replace('{count}', successCount.toString()));
    } catch (err: any) {
      toast.error(t.common.importErrorMsg + ': ' + (err.message || ''));
    } finally {
      setSavingStudent(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    setSaving(true);

    try {
      if (!currentTurma.curso_id) {
        throw new Error(language === 'pt' ? 'Por favor, selecione um curso.' : 'Please select a course.');
      }

      const payload = {
        nome: currentTurma.nome || '',
        curso_id: currentTurma.curso_id,
        categoria: currentTurma.categoria || 'expedito',
        ano: currentTurma.ano || new Date().getFullYear(),
        periodo: currentTurma.periodo || 'manhã',
        capacidade_max: currentTurma.capacidade_max || 40,
        instrutor: currentTurma.instrutor || '',
        status: currentTurma.status || 'ativa',
        ativa: (currentTurma.status || 'ativa') === 'ativa',
        data_inicio: typeof currentTurma.data_inicio === 'string' ? currentTurma.data_inicio.trim() || null : null,
        data_fim: typeof currentTurma.data_fim === 'string' ? currentTurma.data_fim.trim() || null : null,
        internacional: currentTurma.internacional || false,
        localizacao: currentTurma.localizacao || ''
      };

      if (currentTurma.id) {
        const { error } = await supabase
          .from('turmas')
          .update(payload)
          .eq('id', currentTurma.id);
        if (error) throw new Error(error.message + (error.details ? ` (${error.details})` : ''));
      } else {
        const { error } = await supabase
          .from('turmas')
          .insert([payload]);
        if (error) throw new Error(error.message + (error.details ? ` (${error.details})` : ''));
      }

      await refreshData();
      setIsModalOpen(false);
      toast.success(language === 'pt' ? 'Turma salva com sucesso!' : 'Class saved successfully!');
    } catch (err: any) {
      console.error('Error saving class (full error):', err);
      // Construct a better error message showing detail, hint or message
      const errorMsg = err.message || err.details || err.hint || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      toast.error(language === 'pt' ? `Erro ao salvar: ${errorMsg}` : `Error saving: ${errorMsg}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (isReadOnly) return;
    setConfirmConfig({
      isOpen: true,
      title: t.common.delete,
      message: t.common.delete + '?',
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        setDeleting(id);
        
        try {
          const { error } = await supabase
            .from('turmas')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);
            
          if (error) throw error;
          await refreshData();
          toast.success(language === 'pt' ? 'Turma removida!' : 'Class removed!');
        } catch (err: any) {
          toast.error(err.message);
        } finally {
          setDeleting(null);
        }
      }
    });
  };

  const filteredTurmas = turmas.filter(t => (t.categoria || 'expedito') === activeCategory);

  return (
    <div className="space-y-8 pb-20">
      {/* Header with Stats Overview potentially here */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <School className="text-blue-600" size={24} />
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t.classes.title}</h1>
          </div>
          <p className="text-slate-500 text-sm italic font-medium">{t.classes.subtitle}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="flex items-center bg-white p-1 rounded-xl shadow-sm border border-slate-200 w-full sm:w-auto overflow-x-auto hide-scrollbar">
            {(['expedito', 'especial', 'carreira'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "flex-1 sm:flex-none px-3 sm:px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                  activeCategory === cat 
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-200" 
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                )}
              >
                {t.classes[`category${cat.charAt(0).toUpperCase() + cat.slice(1)}` as keyof typeof t.classes]}
              </button>
            ))}
          </div>

          <div className="h-10 w-[1px] bg-slate-200 mx-1 hidden md:block" />

          <button 
            onClick={refreshData}
            className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
            title={t.common.refresh}
          >
            <RefreshCcw size={20} className={refreshing ? "animate-spin" : ""} />
          </button>

          {!isReadOnly && (
            <button 
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
            >
              <Plus size={18} />
              {t.classes.add}
            </button>
          )}
        </div>
      </div>

      <div className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
        loading && "opacity-50 pointer-events-none"
      )}>
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white h-64 rounded-3xl border border-slate-100 animate-pulse flex flex-col p-6 space-y-4">
              <div className="flex justify-between">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl" />
                <div className="w-20 h-6 bg-slate-100 rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="w-3/4 h-6 bg-slate-100 rounded" />
                <div className="w-1/2 h-4 bg-slate-100 rounded" />
              </div>
              <div className="mt-auto h-12 bg-slate-50 rounded-2xl" />
            </div>
          ))
        ) : filteredTurmas.length > 0 ? (
          filteredTurmas.map((turma, i) => (
            <motion.div 
              key={turma.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, ease: [0.23, 1, 0.32, 1] }}
              onClick={() => handleViewStudents(turma)}
              className="bg-white rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-xl hover:border-blue-100 hover:-translate-y-1 transition-all cursor-pointer flex flex-col p-6"
            >
              {/* Category Indicator Line */}
              <div className={cn(
                "absolute top-0 left-0 w-full h-1.5",
                turma.categoria === 'expedito' ? "bg-blue-500" :
                turma.categoria === 'especial' ? "bg-purple-500" : "bg-amber-500"
              )} />

              <div className="flex justify-between items-start mb-6">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center transition-colors shadow-inner",
                  turma.categoria === 'expedito' ? "bg-blue-50 text-blue-500" :
                  turma.categoria === 'especial' ? "bg-purple-50 text-purple-500" : "bg-amber-50 text-amber-500"
                )}>
                  {turma.categoria === 'expedito' ? <LayersIcon size={28} /> :
                   turma.categoria === 'especial' ? <GraduationCap size={28} /> : <Library size={28} />}
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  <span className={cn(
                    "text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border",
                    turma.status === 'concluída' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                    turma.status === 'cancelada' ? "bg-red-50 text-red-600 border-red-100" :
                    "bg-blue-50 text-blue-600 border-blue-100"
                  )}>
                    {turma.status === 'concluída' ? t.classes.completed : 
                     turma.status === 'cancelada' ? t.classes.cancelled : t.classes.active}
                  </span>
                  {turma.internacional && (
                    <span className="flex items-center gap-1.5 text-[8px] font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-md uppercase tracking-wider border border-purple-100">
                      <MapPin size={10} />
                      {t.courses.international}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex-1 min-w-0 mb-6">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-1 truncate">{turma.curso?.nome}</p>
                <h3 className="text-xl font-black text-slate-800 tracking-tight leading-tight group-hover:text-blue-600 transition-colors">{turma.nome}</h3>
                
                <div className="mt-4 grid grid-cols-2 gap-y-3 gap-x-2">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Calendar size={14} className="text-slate-300" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{turma.ano}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <Clock size={14} className="text-slate-300" />
                    <span className="text-[10px] font-bold uppercase tracking-wider capitalize">
                      {turma.periodo === 'manhã' ? t.common.morning : 
                       turma.periodo === 'tarde' ? t.common.afternoon : 
                       turma.periodo === 'noite' ? t.common.night : turma.periodo}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 col-span-2">
                    <Users size={14} className="text-slate-300" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{turma.instrutor || "S/ Instrutor"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-slate-50 mt-auto">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewStudents(turma);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 group/btn hover:bg-blue-600 transition-all"
                >
                  <div className="flex items-center gap-2 text-slate-600 group-hover/btn:text-white transition-colors">
                    <Users size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{t.classes.manageStudents}</span>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 group-hover/btn:text-white transition-colors" />
                </button>

                <div className="space-y-2 px-1">
                  <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-400">
                    <span>{t.classes.capacity}</span>
                    <span className="text-slate-900">{turma.alunos_matriculados} / {turma.capacidade_max}</span>
                  </div>
                  <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden p-0.5 border border-slate-100 shadow-inner">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-1000 ease-out",
                        (turma.alunos_matriculados / (turma.capacidade_max || 1)) > 0.9 ? "bg-red-500" : "bg-blue-500"
                      )}
                      style={{ width: `${Math.min(100, (turma.alunos_matriculados / (turma.capacidade_max || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Hover Actions Bar */}
              {!isReadOnly && (
                <div 
                  className="absolute bottom-4 right-4 flex items-center gap-1 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none group-hover:pointer-events-auto" 
                  onClick={(e) => e.stopPropagation()}
                >
                  <button 
                    onClick={() => handleOpenModal(turma)}
                    className="p-2.5 bg-white text-blue-600 rounded-xl shadow-lg border border-blue-50 hover:bg-blue-600 hover:text-white transition-all transform hover:scale-110"
                    title={t.common.edit}
                  >
                    <Pencil size={14} strokeWidth={2.5} />
                  </button>
                  <button 
                    disabled={deleting === turma.id}
                    onClick={() => handleDelete(turma.id)}
                    className="p-2.5 bg-white text-red-600 rounded-xl shadow-lg border border-red-50 hover:bg-red-600 hover:text-white transition-all transform hover:scale-110 disabled:opacity-50"
                    title={t.common.delete}
                  >
                    {deleting === turma.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} strokeWidth={2.5} />}
                  </button>
                </div>
              )}
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-32 flex flex-col items-center justify-center text-center bg-white rounded-[40px] border border-dashed border-slate-200">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 text-slate-200">
              <LayersIcon size={48} strokeWidth={1} />
            </div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">{t.common.noneFound}</h3>
            <p className="text-slate-400 text-sm max-w-xs mt-2 font-medium italic">{t.classes.noClassesInCategory}</p>
            {!isReadOnly && (
              <button 
                onClick={() => handleOpenModal()}
                className="mt-8 flex items-center gap-2 text-blue-600 bg-blue-50 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-100 transition-all"
              >
                <Plus size={18} />
                {t.classes.add}
              </button>
            )}
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentTurma?.id ? t.common.edit : t.classes.add}
      >
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{t.classes.name}</label>
              <input
                required
                type="text"
                value={currentTurma?.nome || ''}
                onChange={(e) => setCurrentTurma({ ...currentTurma, nome: e.target.value })}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-sm font-bold text-slate-800 placeholder:text-slate-300 shadow-sm"
                placeholder="Ex: Turma Alfa 2024"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{t.classes.category}</label>
              <select
                required
                value={currentTurma?.categoria || 'expedito'}
                onChange={(e) => setCurrentTurma({ ...currentTurma, categoria: e.target.value })}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-sm font-bold text-slate-800 appearance-none cursor-pointer shadow-sm"
              >
                <option value="expedito">{t.classes.categoryExpedito}</option>
                <option value="especial">{t.classes.categoryEspecial}</option>
                <option value="carreira">{t.classes.categoryCarreira}</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{t.classes.instructor}</label>
              <input
                type="text"
                value={currentTurma?.instrutor || ''}
                onChange={(e) => setCurrentTurma({ ...currentTurma, instrutor: e.target.value })}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-sm font-bold text-slate-800 placeholder:text-slate-300 shadow-sm"
                placeholder="Ex: Cel Sobrenome"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{t.nav.courses}</label>
              <select
                required
                value={currentTurma?.curso_id || ''}
                onChange={(e) => setCurrentTurma({ ...currentTurma, curso_id: e.target.value })}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-sm font-bold text-slate-800 appearance-none cursor-pointer shadow-sm"
              >
                <option value="">{t.courses.selectCourse}</option>
                {cursos.map(curso => (
                  <option key={curso.id} value={curso.id}>{curso.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{t.classes.year}</label>
              <input
                required
                type="number"
                value={currentTurma?.ano || ''}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setCurrentTurma({ ...currentTurma, ano: isNaN(val) ? new Date().getFullYear() : val });
                }}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-sm font-bold text-slate-800 shadow-sm"
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{t.classes.period}</label>
              <select
                required
                value={currentTurma?.periodo || 'manhã'}
                onChange={(e) => setCurrentTurma({ ...currentTurma, periodo: e.target.value })}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-sm font-bold text-slate-800 appearance-none cursor-pointer shadow-sm"
              >
                <option value="manhã">{t.common.morning}</option>
                <option value="tarde">{t.common.afternoon}</option>
                <option value="noite">{t.common.night}</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{t.classes.capacity}</label>
              <input
                required
                type="number"
                value={currentTurma?.capacidade_max || ''}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setCurrentTurma({ ...currentTurma, capacidade_max: isNaN(val) ? 40 : val });
                }}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-sm font-bold text-slate-800 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{t.classes.status}</label>
              <select
                required
                value={currentTurma?.status || 'ativa'}
                onChange={(e) => setCurrentTurma({ ...currentTurma, status: e.target.value })}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-sm font-bold text-slate-800 appearance-none cursor-pointer shadow-sm"
              >
                <option value="ativa">{t.classes.active}</option>
                <option value="concluída">{t.classes.completed}</option>
                <option value="cancelada">{t.classes.cancelled}</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{t.classes.startDate}</label>
              <input
                type="date"
                value={currentTurma?.data_inicio || ''}
                onChange={(e) => setCurrentTurma({ ...currentTurma, data_inicio: e.target.value })}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-sm font-bold text-slate-800 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{t.classes.endDate}</label>
              <input
                type="date"
                value={currentTurma?.data_fim || ''}
                onChange={(e) => setCurrentTurma({ ...currentTurma, data_fim: e.target.value })}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-sm font-bold text-slate-800 shadow-sm"
              />
            </div>

            <div className="md:col-span-2 space-y-4 pt-4 border-t border-slate-100">
               <label className="flex items-center gap-4 cursor-pointer group p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all">
                <input
                  type="checkbox"
                  checked={currentTurma?.internacional || false}
                  onChange={(e) => setCurrentTurma({ ...currentTurma, internacional: e.target.checked })}
                  className="w-5 h-5 rounded-lg text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-widest group-hover:text-blue-600 transition-all">{t.courses.international}</span>
                  <p className="text-[10px] text-slate-400 font-medium">Turma vinculada a localizações externas</p>
                </div>
              </label>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{t.courses.location}</label>
                <input
                  type="text"
                  value={currentTurma?.localizacao || ''}
                  onChange={(e) => setCurrentTurma({ ...currentTurma, localizacao: e.target.value })}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-sm font-bold text-slate-800 placeholder:text-slate-300 shadow-sm"
                  placeholder="Ex: Luanda, Angola"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-8">
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

      <Modal
        isOpen={isStudentsModalOpen}
        onClose={() => setIsStudentsModalOpen(false)}
        title={`${t.nav.students} - ${viewingTurma?.nome}`}
      >
        <div className="mb-4 flex justify-between items-center">
          <p className="text-xs text-slate-500 font-medium italic">
            {alunosInTurma.length} {language === 'pt' ? 'alunos matriculados' : 'students enrolled'}
          </p>
          <div className="flex gap-2">
            {!isReadOnly && (
              <>
                <button
                  onClick={() => setIsBulkModalOpen(true)}
                  className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-all"
                >
                  <FileText size={14} />
                  {t.common.bulkAdd}
                </button>
                <button
                  onClick={() => handleOpenStudentModal()}
                  className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-all"
                >
                  <Plus size={14} />
                  {t.students.add}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar border-y border-slate-100 py-4">
          {loadingAlunos ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="animate-spin text-blue-600" />
            </div>
          ) : alunosInTurma.length > 0 ? (
            <div className="space-y-2">
              {alunosInTurma.map((aluno) => (
                <div key={aluno.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 group">
                  <div className="flex items-center gap-3">
                    <div 
                      className={cn(
                        "w-12 h-16 bg-slate-200 rounded-lg overflow-hidden relative border border-slate-200 shrink-0 shadow-sm transition-transform group",
                        aluno.foto_url ? "hover:scale-110 cursor-pointer" : ""
                      )}
                      onClick={() => aluno.foto_url && setExpandedPhoto({ url: aluno.foto_url, name: aluno.nome })}
                    >
                      {aluno.foto_url ? (
                        <>
                          <Image src={aluno.foto_url} alt={aluno.nome} fill className="object-cover" sizes="48px" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <LayersIcon size={14} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </>
                      ) : (
                        <Image 
                          src={aluno.genero === 'feminino' ? femaleAvatar : maleAvatar} 
                          alt={aluno.nome} 
                          fill 
                          className="object-cover opacity-50" 
                          sizes="48px" 
                        />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 text-sm">{aluno.nome}</div>
                      <div className="text-[10px] text-slate-500 font-medium">{aluno.posto_graduacao || ''} • {aluno.matricula}</div>
                    </div>
                  </div>
                    <div className="flex items-center gap-2">
                      {!isReadOnly && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleOpenStudentModal(aluno)}
                            className="p-1.5 hover:bg-blue-100 text-blue-600 rounded"
                          >
                            <Pencil size={12} />
                          </button>
                          <button 
                            disabled={deletingStudent === aluno.id}
                            onClick={() => handleDeleteStudent(aluno.id)}
                            className="p-1.5 hover:bg-red-100 text-red-600 rounded disabled:opacity-50"
                          >
                            {deletingStudent === aluno.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                          </button>
                        </div>
                      )}
                    </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <p className="text-sm text-slate-500">{t.classes.noStudents}</p>
            </div>
          )}
        </div>
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => setIsStudentsModalOpen(false)}
            className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
          >
            {t.common.close}
          </button>
          {!isReadOnly && alunosInTurma.length > 0 && (
            <button
              disabled={deletingAll}
              onClick={handleDeleteAllStudents}
              className="flex-1 px-4 py-2.5 bg-red-50 text-red-600 rounded-lg font-bold text-sm hover:bg-red-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {deletingAll ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              {t.common.deleteAll}
            </button>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title={`${t.common.bulkAdd} - ${viewingTurma?.nome}`}
      >
        <form onSubmit={handleBulkSave} className="space-y-4">
          <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
            {language === 'pt' 
              ? 'Cole a lista de alunos (um por linha). Se usar colunas, use vírgula, ponto e vírgula ou tab. Ordem: Nome, Email, Matrícula, NIF, RG, OM, Posto, Ano, Tel, WA, Nasc.' 
              : 'Paste student list (one per line). If using columns, use comma, semicolon or tab. Order: Name, Email, Reg, NIF, RG, Unit, Rank, Year, Tel, WA, Birth.'}
          </p>
          
          <textarea
            value={bulkData}
            onChange={(e) => setBulkData(e.target.value)}
            className="w-full h-48 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-mono"
            placeholder="Nome Completo&#10;Nome Completo, email@test.com, MAT001"
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="skipHeader"
              checked={skipHeader}
              onChange={(e) => setSkipHeader(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="skipHeader" className="text-xs font-medium text-slate-600">
              {t.common.csvPlaceholder.includes('CSV') ? 'Pular primeira linha (cabeçalho)' : 'Skip first line (header)'}
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsBulkModalOpen(false)}
              className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded font-bold text-sm hover:bg-slate-50"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={savingStudent}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded font-bold text-sm hover:bg-blue-700 disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {savingStudent ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {t.common.import}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isStudentFormOpen}
        onClose={() => setIsStudentFormOpen(false)}
        title={currentAluno?.id ? t.common.edit : t.students.add}
      >
        <form onSubmit={handleSaveStudent} className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
          <div className="flex flex-col sm:flex-row gap-4 mb-4 pb-4 border-b border-slate-100">
            <div className="flex-shrink-0 flex flex-col items-center gap-3">
              <div className="relative group w-36 h-48 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 overflow-hidden text-center p-1 shadow-inner">
                {currentAluno?.foto_url ? (
                  <>
                    <Image src={currentAluno.foto_url} alt="3x4" fill className="object-cover" sizes="144px" referrerPolicy="no-referrer" />
                    <button 
                      type="button"
                      onClick={() => setCurrentAluno({ ...currentAluno, foto_url: '' })}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-lg"
                      title={t.common.delete}
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <Camera size={24} strokeWidth={1.5} />
                    <span className="text-[10px] font-bold uppercase mt-1 leading-tight">{t.students.photo} <br/> 3x4</span>
                  </>
                )}
                {savingStudent && (
                  <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-[1px]">
                    <Loader2 size={24} className="animate-spin text-blue-600" />
                  </div>
                )}
              </div>
              
              <div className="flex flex-col w-full gap-2">
                <label className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-wider cursor-pointer transition-all border border-slate-200/50">
                  <Upload size={14} />
                  {language === 'pt' ? 'Upload Arquivo' : 'File Upload'}
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
                
                <label className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider cursor-pointer transition-all shadow-md shadow-blue-100">
                  <Camera size={14} />
                  {language === 'pt' ? 'Tirar Foto (Câmera)' : 'Take Photo (Camera)'}
                  <input type="file" accept="image/*" capture="environment" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            </div>

            <div className="flex-1 space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  {t.students.name} <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={currentAluno?.nome || ''}
                  onChange={(e) => setCurrentAluno({ ...currentAluno, nome: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500/20 outline-none text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    {t.students.registration}
                  </label>
                  <input
                    type="text"
                    value={currentAluno?.matricula || ''}
                    onChange={(e) => setCurrentAluno({ ...currentAluno, matricula: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm"
                    placeholder="Auto"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    {t.students.gender}
                  </label>
                  <select
                    value={currentAluno?.genero || 'masculino'}
                    onChange={(e) => setCurrentAluno({ ...currentAluno, genero: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm outline-none"
                  >
                    <option value="masculino">{t.students.male}</option>
                    <option value="feminino">{t.students.female}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                {t.students.nome_pai}
              </label>
              <input
                type="text"
                value={currentAluno?.nome_pai || ''}
                onChange={(e) => setCurrentAluno({ ...currentAluno, nome_pai: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                {t.students.nome_mae}
              </label>
              <input
                type="text"
                value={currentAluno?.nome_mae || ''}
                onChange={(e) => setCurrentAluno({ ...currentAluno, nome_mae: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t.students.nif}</label>
              <input
                type="text"
                value={currentAluno?.nif || ''}
                onChange={(e) => setCurrentAluno({ ...currentAluno, nif: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t.students.rg}</label>
              <input
                type="text"
                value={currentAluno?.rg || ''}
                onChange={(e) => setCurrentAluno({ ...currentAluno, rg: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                {t.students.titulo_eleitor}
              </label>
              <input
                type="text"
                value={currentAluno?.titulo_eleitor || ''}
                onChange={(e) => setCurrentAluno({ ...currentAluno, titulo_eleitor: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t.students.rank}</label>
              <input
                type="text"
                value={currentAluno?.posto_graduacao || ''}
                onChange={(e) => setCurrentAluno({ ...currentAluno, posto_graduacao: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t.students.om}</label>
              <input
                type="text"
                value={currentAluno?.om || ''}
                onChange={(e) => setCurrentAluno({ ...currentAluno, om: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t.students.email}</label>
              <input
                type="email"
                value={currentAluno?.email || ''}
                onChange={(e) => setCurrentAluno({ ...currentAluno, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t.students.forceEntryYear}</label>
              <input
                type="number"
                value={currentAluno?.ano_admissao || ''}
                onChange={(e) => setCurrentAluno({ ...currentAluno, ano_admissao: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t.students.phone}</label>
              <input
                type="text"
                value={currentAluno?.telefone || ''}
                onChange={(e) => setCurrentAluno({ ...currentAluno, telefone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t.students.whatsapp}</label>
              <input
                type="text"
                value={currentAluno?.whatsapp || ''}
                onChange={(e) => setCurrentAluno({ ...currentAluno, whatsapp: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsStudentFormOpen(false)}
              className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded font-bold text-sm hover:bg-slate-50"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={savingStudent}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded font-bold text-sm hover:bg-blue-700 disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {savingStudent ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {t.common.save}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        title={confirmConfig.title}
      >
        <div className="space-y-6">
          <p className="text-slate-600 text-sm">{confirmConfig.message}</p>
          <div className="flex gap-3">
            <button
              onClick={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-50 transition-all"
            >
              {t.common.cancel}
            </button>
            <button
              onClick={confirmConfig.onConfirm}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 transition-all shadow-md shadow-red-100"
            >
              {t.common.delete}
            </button>
          </div>
        </div>
      </Modal>

      <AnimatePresence>
        {expandedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[rgba(15,23,42,0.9)]"
            onClick={() => setExpandedPhoto(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-full max-h-full flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="absolute -top-12 right-0 p-2 text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                onClick={() => setExpandedPhoto(null)}
              >
                <X size={24} />
              </button>
              
              <div className="bg-white p-2 rounded-2xl shadow-2xl relative">
                <div className="relative w-[90vw] h-[80vh] sm:w-[500px] sm:h-[667px] rounded-xl overflow-hidden shadow-inner bg-slate-50">
                  {expandedPhoto.url ? (
                    <Image
                      src={expandedPhoto.url}
                      alt={expandedPhoto.name}
                      fill
                      className="object-contain"
                      referrerPolicy="no-referrer"
                      sizes="(max-width: 640px) 90vw, 500px"
                      priority
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-300">
                      <LayersIcon size={64} strokeWidth={1} />
                    </div>
                  )}
                </div>
                <div className="mt-4 text-center pb-2">
                  <h4 className="text-xl font-bold text-slate-800">{expandedPhoto.name}</h4>
                  <p className="text-slate-500 font-mono text-xs uppercase mt-1 tracking-widest border-t border-slate-100 pt-2 mx-4">Foto Identificação 3x4</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TurmasPage() {
  return (
    <Suspense fallback={
      <div className="py-24 flex flex-col items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600"></div>
          <School className="absolute inset-0 m-auto text-blue-600" size={24} />
        </div>
        <p className="mt-4 text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] animate-pulse">Carregando Turmas...</p>
      </div>
    }>
      <TurmasContent />
    </Suspense>
  );
}
