'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { useUser } from '@/lib/auth/UserContext';
import { Plus, Search, Layers, Calendar, Clock, MapPin, Pencil, Trash2, Loader2, CheckCircle2, RefreshCcw, Users, Mail, Phone, Shield, Building, CreditCard, Camera, MessageCircle, XCircle, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import Modal from '@/components/Modal';
import Image from 'next/image';

export default function TurmasPage() {
  const { t, language } = useI18n();
  const { isAdmin, isGuest } = useUser();
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
    if (isGuest) return;
    setCurrentTurma(turma || { nome: '', curso_id: '', ano: new Date().getFullYear(), periodo: 'manhã', capacidade_max: 40, instrutor: '' });
    setIsModalOpen(true);
  };

  const handleViewStudents = async (turma: any) => {
    setViewingTurma(turma);
    setIsStudentsModalOpen(true);
    setLoadingAlunos(true);
    
    try {
      const { data, error } = await supabase
        .from('alunos')
        .select(`
          id, nome, matricula, email, status, posto_graduacao, 
          nif, rg, om, ano_admissao, telefone, whatsapp, foto_url
        `)
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
    if (isGuest) return;
    setCurrentAluno(aluno || { 
      nome: '', 
      email: '', 
      matricula: '', 
      turma_id: viewingTurma?.id || '', 
      status: 'ativo',
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
    } catch (err: any) {
      alert(t.common.uploadError + ': ' + (err.message || ''));
    } finally {
      setSavingStudent(false);
    }
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
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
        status: currentAluno.status || 'ativo'
      };

      if (currentAluno.email && currentAluno.email.includes('@')) dataToSave.email = currentAluno.email;
      if (currentAluno.posto_graduacao) dataToSave.posto_graduacao = currentAluno.posto_graduacao;
      if (currentAluno.nif) dataToSave.nif = currentAluno.nif;
      if (currentAluno.rg) dataToSave.rg = currentAluno.rg;
      if (currentAluno.om) dataToSave.om = currentAluno.om;
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
        .select(`
          id, nome, matricula, email, status, posto_graduacao, 
          nif, rg, om, ano_admissao, telefone, whatsapp, foto_url
        `)
        .eq('turma_id', viewingTurma?.id)
        .is('deleted_at', null)
        .order('nome');
      
      if (data) setAlunosInTurma(data);
      setIsStudentFormOpen(false);
      refreshData(); // Refresh class count
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingStudent(false);
    }
  };

  const handleDeleteStudent = async (id: string) => {
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
        } catch (err: any) {
          alert(err.message);
        } finally {
          setDeletingStudent(null);
        }
      }
    });
  };

  const handleDeleteAllStudents = async () => {
    if (!viewingTurma || alunosInTurma.length === 0) return;
    
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
        } catch (err: any) {
          alert(err.message);
        } finally {
          setDeletingAll(false);
        }
      }
    });
  };

  const handleBulkSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkData.trim() || !viewingTurma) return;
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
        .select(`
          id, nome, matricula, email, status, posto_graduacao, 
          nif, rg, om, ano_admissao, telefone, whatsapp, foto_url
        `)
        .eq('turma_id', viewingTurma.id)
        .is('deleted_at', null)
        .order('nome');
      
      if (newData) setAlunosInTurma(newData);
      setIsBulkModalOpen(false);
      setBulkData('');
      refreshData();
      
      const successCount = data?.length || 0;
      alert(t.common.processedSuccess.replace('{count}', successCount.toString()));
    } catch (err: any) {
      alert(t.common.importErrorMsg + ': ' + (err.message || ''));
    } finally {
      setSavingStudent(false);
    }
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
            capacidade_max: currentTurma.capacidade_max,
            instrutor: currentTurma.instrutor
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
              capacidade_max: currentTurma.capacidade_max,
              instrutor: currentTurma.instrutor
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
        } catch (err: any) {
          alert(err.message);
        } finally {
          setDeleting(null);
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.classes.title}</h1>
          <p className="text-slate-500 text-sm italic mt-1">{t.classes.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={refreshData}
            className="p-2 text-slate-500 hover:text-blue-600 transition-colors"
          >
            <RefreshCcw size={18} className={refreshing ? "animate-spin" : ""} />
          </button>
          {!isGuest && (
            <button 
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm shadow-blue-100"
            >
              <Plus size={18} />
              {t.classes.add}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="py-12 flex justify-center">
             <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600"></div>
          </div>
        ) : turmas.map((turma, i) => (
          <motion.div 
            key={turma.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => handleViewStudents(turma)}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md hover:border-blue-200 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors shrink-0">
                <Layers size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col">
                  <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider mb-0.5 truncate leading-none">{turma.curso?.nome}</p>
                  <h3 className="font-bold text-slate-800 text-lg truncate leading-tight">{turma.nome}</h3>
                </div>
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                  {turma.instrutor && (
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                      {t.classes.instructor}: {turma.instrutor}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar size={12} className="text-slate-300" />
                    {turma.ano}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5 capitalize">
                    <Clock size={12} className="text-slate-300" />
                    {turma.periodo === 'manhã' ? t.common.morning : 
                     turma.periodo === 'tarde' ? t.common.afternoon : 
                     turma.periodo === 'noite' ? t.common.night : turma.periodo}
                  </span>
                </div>
              </div>
            </div>

            <div className="md:w-64 shrink-0 flex flex-col gap-2">
              <div className="flex justify-between items-end text-[10px] font-bold uppercase tracking-wide">
                <span className="text-slate-400">{t.classes.capacity}</span>
                <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{turma.alunos_matriculados} / {turma.capacidade_max}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-700 ease-out" 
                  style={{ width: `${Math.min(100, (turma.alunos_matriculados / (turma.capacidade_max || 1)) * 100)}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-4" onClick={(e) => e.stopPropagation()}>
              {!isGuest && (
                <>
                  <button 
                    onClick={() => handleOpenModal(turma)}
                    className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold"
                    title={t.common.edit}
                  >
                    <div className="p-1.5 bg-blue-50 rounded group-hover:bg-blue-100 transition-colors">
                      <Pencil size={14} />
                    </div>
                    <span className="hidden xl:inline">{t.common.edit}</span>
                  </button>
                  <button 
                    disabled={deleting === turma.id}
                    onClick={() => handleDelete(turma.id)}
                    className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold disabled:opacity-50"
                    title={t.common.delete}
                  >
                    <div className="p-1.5 bg-red-50 rounded group-hover:bg-red-100 transition-colors">
                      {deleting === turma.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </div>
                    <span className="hidden xl:inline">{t.common.delete}</span>
                  </button>
                </>
              )}
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
              {t.classes.instructor}
            </label>
            <input
              type="text"
              value={currentTurma?.instrutor || ''}
              onChange={(e) => setCurrentTurma({ ...currentTurma, instrutor: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm"
              placeholder="Ex: Cel Silva"
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
                <option value="manhã">{t.common.morning}</option>
                <option value="tarde">{t.common.afternoon}</option>
                <option value="noite">{t.common.night}</option>
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
            {!isGuest && (
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
                    <div className="w-8 h-10 bg-slate-200 rounded overflow-hidden relative border border-slate-200">
                      {aluno.foto_url ? (
                        <Image src={aluno.foto_url} alt={aluno.nome} fill className="object-cover" sizes="32px" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-[8px] font-bold text-slate-400">3x4</div>
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 text-sm">{aluno.nome}</div>
                      <div className="text-[10px] text-slate-500 font-medium">{aluno.posto_graduacao || ''} • {aluno.matricula}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                      aluno.status === 'ativo' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    )}>
                      {aluno.status === 'ativo' ? t.students.active : t.students.inactive}
                    </div>
                    {!isGuest && (
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
          {!isGuest && alunosInTurma.length > 0 && (
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
            <div className="flex-shrink-0 flex flex-col items-center gap-2">
              <div className="relative group cursor-pointer w-24 h-32 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-all overflow-hidden text-center p-2">
                {currentAluno?.foto_url ? (
                  <Image src={currentAluno.foto_url} alt="3x4" fill className="object-cover" sizes="96px" referrerPolicy="no-referrer" />
                ) : (
                  <>
                    <Camera size={24} strokeWidth={1.5} />
                    <span className="text-[8px] font-bold uppercase mt-1">{t.students.photo}</span>
                  </>
                )}
                <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
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
                    {t.students.status}
                  </label>
                  <select
                    value={currentAluno?.status || 'ativo'}
                    onChange={(e) => setCurrentAluno({ ...currentAluno, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm"
                  >
                    <option value="ativo">{t.students.active}</option>
                    <option value="inativo">{t.students.inactive}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
    </div>
  );
}
