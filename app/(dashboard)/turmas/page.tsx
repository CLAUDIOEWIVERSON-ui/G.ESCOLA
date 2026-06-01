'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useTurmas, useCursos } from '@/hooks/useCachedData';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { useUser } from '@/lib/auth/UserContext';
import { Plus, Search, Layers as LayersIcon, Library, Calendar, Clock, MapPin, Pencil, Trash2, Loader2, CheckCircle2, RefreshCcw, Users, Mail, Phone, Building, Camera, MessageCircle, XCircle, FileText, X, GraduationCap, School, ChevronRight, Printer, Monitor, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import Modal from '@/components/Modal';
import { getCardStyleForItem, getCardColorSettings, CardColorSettings } from '@/lib/cardColors';
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
  const { turmas, loading: loadingTurmas, mutate: revalidateTurmas } = useTurmas();
  const { cursos, loading: loadingCursos } = useCursos();
  const loading = loadingTurmas || loadingCursos;

  const [colorSettings, setColorSettings] = useState<CardColorSettings>(() => getCardColorSettings());
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
  const [studentAccess, setStudentAccess] = useState<any>(null);
  
  const isCiabaOrCiaga = viewingTurma?.nome ? (viewingTurma.nome.toUpperCase().includes('CIABA') || viewingTurma.nome.toUpperCase().includes('CIAGA') || viewingTurma.internacional) : false;
  
  // States for Folha de Frequência (Mensal & Semanal)
  const [isPrintAttendanceOpen, setIsPrintAttendanceOpen] = useState(false);
  const [printProfessorName, setPrintProfessorName] = useState('');
  const [printPeriod, setPrintPeriod] = useState('');
  const [printClassName, setPrintClassName] = useState('');
  const [printSheetType, setPrintSheetType] = useState<'mensal' | 'semanal'>('mensal');
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number | null>(null);

  const handleOpenPrintAttendance = (turma: any) => {
    setPrintProfessorName(turma.instrutor || '');
    setPrintClassName(turma.nome || '');
    const currentMonthYear = `${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`;
    setPrintPeriod(currentMonthYear);
    setSelectedWeekIndex(null);
    setIsPrintAttendanceOpen(true);
  };

  const handleDirectPrintAttendance = async (turma: any, type: 'mensal' | 'semanal' = 'mensal') => {
    setViewingTurma(turma);
    setPrintSheetType(type);
    setSelectedWeekIndex(null);
    setLoadingAlunos(true);
    try {
      const { data, error } = await supabase
        .from('alunos')
        .select('*')
        .eq('turma_id', { targetId: turma.id }.targetId)
        .is('deleted_at', null)
        .order('nome');
        
      if (error) throw error;
      setAlunosInTurma(data || []);
      
      // Auto open print modal
      setPrintProfessorName(turma.instrutor || '');
      setPrintClassName(turma.nome || '');
      const currentMonthYear = `${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`;
      setPrintPeriod(currentMonthYear);
      setIsPrintAttendanceOpen(true);
    } catch (err: any) {
      console.error('Error fetching students for print:', err.message);
    } finally {
      setLoadingAlunos(false);
    }
  };

  interface PrintDay {
    dayNum: number;
    month: number;
    year: number;
    isCurrentMonth: boolean;
  }

  const getDaysInMonth = () => {
    if (!printPeriod) return 31;
    const parts = printPeriod.split('/');
    if (parts.length < 2) return 31;
    const month = parseInt(parts[0], 10) - 1; // 0-based month
    const year = parseInt(parts[1], 10);
    if (isNaN(month) || isNaN(year)) return 31;
    return new Date(year, month + 1, 0).getDate();
  };

  const getWeeksOfMonth = (month: number, year: number): { days: PrintDay[] }[] => {
    const firstDayOfMonth = new Date(year, month, 1);
    const dayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday, 1 = Monday, ...
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const firstMonday = new Date(year, month, 1 + diff);

    const lastDayOfMonth = new Date(year, month + 1, 0);

    const weeks: { days: PrintDay[] }[] = [];
    const currentMonday = new Date(firstMonday);

    while (currentMonday <= lastDayOfMonth) {
      const weekDays: PrintDay[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(currentMonday);
        d.setDate(currentMonday.getDate() + i);
        weekDays.push({
          dayNum: d.getDate(),
          month: d.getMonth(),
          year: d.getFullYear(),
          isCurrentMonth: d.getMonth() === month,
        });
      }
      weeks.push({ days: weekDays });
      currentMonday.setDate(currentMonday.getDate() + 7);
    }
    return weeks;
  };

  const getWeeksList = () => {
    if (!printPeriod) return [];
    const parts = printPeriod.split('/');
    if (parts.length < 2) return [];
    const month = parseInt(parts[0], 10) - 1; // 0-based month
    const year = parseInt(parts[1], 10);
    if (isNaN(month) || isNaN(year)) return [];

    const weeks = getWeeksOfMonth(month, year);
    return weeks.map((w, idx) => {
      const firstDay = w.days[0];
      const lastDay = w.days[w.days.length - 1];
      const formatDay = (d: number) => String(d).padStart(2, '0');
      const formatMonth = (m: number) => String(m + 1).padStart(2, '0');
      return {
        label: `${language === 'pt' ? 'Semana' : 'Week'} ${idx + 1} (${formatDay(firstDay.dayNum)}/${formatMonth(firstDay.month)} a ${formatDay(lastDay.dayNum)}/${formatMonth(lastDay.month)})`,
        days: w.days,
        index: idx
      };
    });
  };

  const getWeekdayName = (dayOfWeek: number) => {
    const weekdaysPt = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const weekdaysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return language === 'pt' ? weekdaysPt[dayOfWeek] : weekdaysEn[dayOfWeek];
  };

  const getDayStatus = (dayNum: number, targetMonth?: number, targetYear?: number) => {
    if (!printPeriod) return { label: '', bgClass: '', isValid: true };
    const parts = printPeriod.split('/');
    if (parts.length < 2) return { label: '', bgClass: '', isValid: true };
    const defaultMonth = parseInt(parts[0], 10) - 1; // 0-based month
    const defaultYear = parseInt(parts[1], 10);
    
    const month = targetMonth !== undefined ? targetMonth : defaultMonth;
    const year = targetYear !== undefined ? targetYear : defaultYear;
    
    if (isNaN(month) || isNaN(year)) return { label: '', bgClass: '', isValid: true };

    const maxDays = new Date(year, month + 1, 0).getDate();
    if (dayNum > maxDays || dayNum < 1) {
      return { label: '-', bgClass: 'bg-neutral-100 text-neutral-400 font-bold', isValid: false };
    }

    const date = new Date(year, month, dayNum);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    const isSunday = dayOfWeek === 0;
    const isSaturday = dayOfWeek === 6;

    // São Tomé and Príncipe national holidays
    const holidays = [
      { m: 0, d: 1, name: 'Ano Novo' },
      { m: 1, d: 3, name: 'Dia dos Mártires' },
      { m: 4, d: 1, name: 'Dia do Trabalhador' },
      { m: 5, d: 1, name: 'Dia da Criança' },
      { m: 6, d: 12, name: 'Dia da Independência' },
      { m: 8, d: 6, name: 'Dia das Forças Armadas' },
      { m: 8, d: 30, name: 'Reforma Agrária / Nacionalizações' },
      { m: 11, d: 21, name: 'Dia de São Tomé' },
      { m: 11, d: 25, name: 'Natal' }
    ];

    const isHoliday = holidays.some(h => h.m === month && h.d === dayNum);

    if (isHoliday) {
      return { label: 'FE', bgClass: 'bg-red-50 text-red-700 font-black', isValid: true };
    }
    if (isSaturday) {
      return { label: 'S', bgClass: 'bg-neutral-100 text-neutral-500 font-bold', isValid: true };
    }
    if (isSunday) {
      return { label: 'D', bgClass: 'bg-neutral-100 text-neutral-500 font-bold', isValid: true };
    }

    return { label: '', bgClass: '', isValid: true };
  };

  const getMonthHolidays = () => {
    if (!printPeriod) return [];
    const parts = printPeriod.split('/');
    if (parts.length < 2) return [];
    const month = parseInt(parts[0], 10) - 1; // 0-based month
    const year = parseInt(parts[1], 10);
    if (isNaN(month) || isNaN(year)) return [];

    const holidays = [
      { 
        m: 0, 
        d: 1, 
        name: 'Ano Novo', 
        meaning: 'Celebração universal do início do ano novo civil.' 
      },
      { 
        m: 1, 
        d: 3, 
        name: 'Dia dos Mártires', 
        meaning: 'Homenagem aos mártires do Massacre de Batepá (1953), símbolo histórico de resistência nacional contra a opressão colonial.' 
      },
      { 
        m: 4, 
        d: 1, 
        name: 'Dia do Trabalhador', 
        meaning: 'Celebração internacional da classe trabalhadora, seus direitos e conquistas sociais laborais.' 
      },
      { 
        m: 5, 
        d: 1, 
        name: 'Dia da Criança', 
        meaning: 'Data comemorativa visando à sensibilização pública para a proteção contínua dos direitos básicos das crianças santomenses.' 
      },
      { 
        m: 6, 
        d: 12, 
        name: 'Dia da Independência', 
        meaning: 'Aniversário da Proclamação da Independência Nacional de São Tomé e Príncipe em 12 de julho de 1975.' 
      },
      { 
        m: 8, 
        d: 6, 
        name: 'Dia das Forças Armadas', 
        meaning: 'Reconhecimento oficial e de agradecimento às Forças Armadas de São Tomé e Príncipe (FASTP).' 
      },
      { 
        m: 8, 
        d: 30, 
        name: 'Reforma Agrária / Nacionalizações', 
        meaning: 'Celebração da nacionalização histórica das grandes plantações agrícolas (roças) pós-independência em 1975.' 
      },
      { 
        m: 11, 
        d: 21, 
        name: 'Dia de São Tomé', 
        meaning: 'Dia em honra do padroeiro nacional do país e do descobrimento histórico da ilha de São Tomé no ano de 1470.' 
      },
      { 
        m: 11, 
        d: 25, 
        name: 'Natal', 
        meaning: 'Celebração cristã solene do nascimento de Jesus Cristo, também festejada como o Dia da Família.' 
      }
    ];

    return holidays
      .filter(h => h.m === month)
      .map(h => ({
        day: h.d,
        name: h.name,
        meaning: h.meaning
      }));
  };

  const getHolidaysForDays = (days: { dayNum: number; month: number; year: number }[]) => {
    const holidaysMeaning = [
      { m: 0, d: 1, name: 'Ano Novo', meaning: 'Celebração universal do início do ano novo civil.' },
      { m: 1, d: 3, name: 'Dia dos Mártires', meaning: 'Homenagem aos mártires do Massacre de Batepá (1953), símbolo histórico de resistência nacional contra a opressão colonial.' },
      { m: 4, d: 1, name: 'Dia do Trabalhador', meaning: 'Celebração internacional da classe trabalhadora, seus direitos e conquistas sociais laborais.' },
      { m: 5, d: 1, name: 'Dia da Criança', meaning: 'Data comemorativa visando à sensibilização pública para a proteção contínua dos direitos básicos das crianças santomenses.' },
      { m: 6, d: 12, name: 'Dia da Independência', meaning: 'Aniversário da Proclamação da Independência Nacional de São Tomé e Príncipe em 12 de julho de 1975.' },
      { m: 8, d: 6, name: 'Dia das Forças Armadas', meaning: 'Reconhecimento oficial e de agradecimento às Forças Armadas de São Tomé e Príncipe (FASTP).' },
      { m: 8, d: 30, name: 'Reforma Agrária / Nacionalizações', meaning: 'Celebração da nacionalização histórica das grandes plantações agrícolas (roças) pós-independência em 1975.' },
      { m: 11, d: 21, name: 'Dia de São Tomé', meaning: 'Dia em honra do padroeiro nacional do país e do descobrimento histórico da ilha de São Tomé no ano de 1470.' },
      { m: 11, d: 25, name: 'Natal', meaning: 'Celebração cristã solene do nascimento de Jesus Cristo, também festejada como o Dia da Família.' }
    ];

    const result: { day: number; name: string; meaning: string; month: number }[] = [];
    days.forEach((day) => {
      const h = holidaysMeaning.find((hm) => hm.m === day.month && hm.d === day.dayNum);
      if (h) {
        if (!result.some(r => r.day === day.dayNum && r.month === day.month)) {
          result.push({
            day: day.dayNum,
            name: h.name,
            meaning: h.meaning,
            month: day.month
          });
        }
      }
    });
    return result;
  };
  
  const activeCategory = (categoryParam && ['all', 'expedito', 'especial', 'carreira', 'ead', 'exterior'].includes(categoryParam)) 
    ? (categoryParam as 'all' | 'expedito' | 'especial' | 'carreira' | 'ead' | 'exterior') 
    : 'all';

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

  const refreshData = () => {
    setRefreshing(true);
    revalidateTurmas().finally(() => {
      setRefreshing(false);
    });
  };

  const handleOpenModal = (turma: any = null) => {
    if (isReadOnly) return;
    setCurrentTurma(turma || { 
      nome: '', 
      curso_id: '', 
      categoria: activeCategory === 'all' ? 'expedito' : (activeCategory === 'exterior' ? 'expedito' : activeCategory),
      ano: new Date().getFullYear(), 
      periodo: 'manhã', 
      capacidade_max: 40, 
      instrutor: '', 
      status: 'ativa',
      data_inicio: '',
      data_fim: '',
      internacional: activeCategory === 'exterior',
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
    setStudentAccess(null);
    const mockOrRealAluno = aluno || { 
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
      foto_url: '',
      data_inicio_curso: '',
      data_fim_curso: '',
      data_nascimento: '',
      funcao: ''
    };
    setCurrentAluno(mockOrRealAluno);
    setIsStudentFormOpen(true);

    if (aluno && aluno.id && isAdmin) {
      supabase
        .from('student_access_codes')
        .select('*')
        .eq('student_id', aluno.id)
        .maybeSingle()
        .then(({ data, error }) => {
          if (!error && data) {
            setStudentAccess(data);
          }
        });
    }
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
      if (currentAluno.rg) dataToSave.rg = currentAluno.rg;
      if (currentAluno.titulo_eleitor) dataToSave.titulo_eleitor = currentAluno.titulo_eleitor;
      if (currentAluno.nome_pai) dataToSave.nome_pai = currentAluno.nome_pai;
      if (currentAluno.nome_mae) dataToSave.nome_mae = currentAluno.nome_mae;
      if (currentAluno.om) dataToSave.om = currentAluno.om;
      if (currentAluno.genero) dataToSave.genero = currentAluno.genero;
      if (currentAluno.telefone) dataToSave.telefone = currentAluno.telefone;
      if (currentAluno.whatsapp) dataToSave.whatsapp = currentAluno.whatsapp;
      if (currentAluno.foto_url) dataToSave.foto_url = currentAluno.foto_url;
      
      if (currentAluno.data_nascimento !== undefined) {
        dataToSave.data_nascimento = currentAluno.data_nascimento ? currentAluno.data_nascimento : null;
      }
      if (currentAluno.funcao !== undefined) {
        dataToSave.funcao = currentAluno.funcao ? currentAluno.funcao : null;
      }
      
      if (isCiabaOrCiaga) {
        if (currentAluno.data_inicio_curso !== undefined) {
          dataToSave.data_inicio_curso = currentAluno.data_inicio_curso ? currentAluno.data_inicio_curso : null;
        }
        if (currentAluno.data_fim_curso !== undefined) {
          dataToSave.data_fim_curso = currentAluno.data_fim_curso ? currentAluno.data_fim_curso : null;
        }
      } else {
        dataToSave.data_inicio_curso = null;
        dataToSave.data_fim_curso = null;
      }
      
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
        data_inicio: currentTurma.internacional ? null : (typeof currentTurma.data_inicio === 'string' ? currentTurma.data_inicio.trim() || null : null),
        data_fim: currentTurma.internacional ? null : (typeof currentTurma.data_fim === 'string' ? currentTurma.data_fim.trim() || null : null),
        internacional: currentTurma.internacional || false,
        localizacao: currentTurma.localizacao || '',
        grupo_responsavel: currentTurma.grupo_responsavel || null
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

  const activeWeeksList = getWeeksList();
  
  // Find which week contains today's date
  const getTodayWeekIndex = (): number => {
    const today = new Date();
    const todayDay = today.getDate();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();

    const idx = activeWeeksList.findIndex(w => 
      w.days.some(d => d.dayNum === todayDay && d.month === todayMonth && d.year === todayYear)
    );
    return idx !== -1 ? idx : 0;
  };

  const activeWeekIndex = selectedWeekIndex !== null 
    ? (selectedWeekIndex >= activeWeeksList.length ? 0 : selectedWeekIndex)
    : getTodayWeekIndex();

  const activeWeekObj = activeWeeksList[activeWeekIndex];
  
  const getDaysOfCurrentMonth = (): PrintDay[] => {
    if (!printPeriod) return [];
    const parts = printPeriod.split('/');
    if (parts.length < 2) return [];
    const month = parseInt(parts[0], 10) - 1;
    const year = parseInt(parts[1], 10);
    if (isNaN(month) || isNaN(year)) return [];

    const daysCount = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: daysCount }).map((_, i) => ({
      dayNum: i + 1,
      month: month,
      year: year,
      isCurrentMonth: true
    }));
  };

  const daysToRender = printSheetType === 'semanal' 
    ? (activeWeekObj?.days || []) 
    : getDaysOfCurrentMonth();

  const q = searchParams ? (searchParams.get('q')?.toLowerCase() || '') : '';

  const filteredTurmas = turmas.filter(t => {
    if (q) {
      const nomeMatch = t.nome?.toLowerCase().includes(q);
      const cursoMatch = t.curso?.nome?.toLowerCase().includes(q);
      const instrutorMatch = t.instrutor?.toLowerCase().includes(q);
      if (!nomeMatch && !cursoMatch && !instrutorMatch) {
        return false;
      }
    }
    if (activeCategory === 'all') {
      return true;
    }
    if (activeCategory === 'exterior') {
      return t.internacional === true;
    }
    return (t.categoria || 'expedito') === activeCategory;
  });

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
          <div className="grid grid-cols-6 gap-1 bg-white p-1 rounded-xl shadow-sm border border-slate-200 w-full sm:w-[620px]">
            {(['all', 'expedito', 'especial', 'carreira', 'ead', 'exterior'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer text-center flex items-center justify-center",
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
          filteredTurmas.map((turma, i) => {
            const cardStyle = getCardStyleForItem({
              categoria: turma.categoria,
              internacional: turma.internacional,
              grupo_responsavel: turma.grupo_responsavel
            }, colorSettings);

            return (
              <motion.div 
                key={turma.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, ease: [0.23, 1, 0.32, 1] }}
                onClick={() => handleViewStudents(turma)}
                className={cn(
                  "rounded-3xl border shadow-sm relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer flex flex-col p-6",
                  cardStyle.bg,
                  cardStyle.hoverBg,
                  cardStyle.border,
                  cardStyle.hoverBorder,
                  "shadow-slate-500/5 hover:shadow-slate-500/10"
                )}
              >
                {/* Category Indicator Line */}
                <div className={cn(
                  "absolute top-0 left-0 w-full h-1.5",
                  cardStyle.line
                )} />

                <div className="flex justify-between items-start mb-6">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center transition-colors shadow-inner",
                    cardStyle.avatarBg
                  )}>
                    {turma.internacional ? <Globe size={28} /> :
                     turma.categoria === 'expedito' ? <LayersIcon size={28} /> :
                     turma.categoria === 'especial' ? <GraduationCap size={28} /> :
                     turma.categoria === 'carreira' ? <Library size={28} /> :
                     turma.categoria === 'ead' ? <Monitor size={28} /> : <Library size={28} />}
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
                      <span className={cn(
                        "flex items-center gap-1.5 text-[8px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider border",
                        getCardStyleForItem({ internacional: true }, colorSettings).badge
                      )}>
                        <MapPin size={10} />
                        {t.courses.international}
                      </span>
                    )}
                    {turma.grupo_responsavel && (
                      <span className={cn(
                        "flex items-center gap-1.5 text-[8px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider border",
                        cardStyle.badge
                      )}>
                        Grupo: {turma.grupo_responsavel}
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
                  {(turma.data_inicio || turma.data_fim) && (
                    <div className="flex items-center gap-2 text-slate-500 col-span-2">
                      <Calendar size={14} className="text-blue-500" />
                      <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                        {turma.data_inicio ? turma.data_inicio.split('-').reverse().join('/') : '—'} - {turma.data_fim ? turma.data_fim.split('-').reverse().join('/') : '—'}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-slate-500 col-span-2">
                    <Users size={14} className="text-slate-300" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{turma.instrutor || "S/ Instrutor"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-5 border-t border-slate-50 mt-auto">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewStudents(turma);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 group/btn hover:bg-blue-600 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-slate-600 group-hover/btn:text-white transition-colors">
                    <Users size={15} />
                    <span className="text-[9px] font-black uppercase tracking-widest">{t.classes.manageStudents}</span>
                  </div>
                  <ChevronRight size={13} className="text-slate-300 group-hover/btn:text-white transition-colors" />
                </button>

                {!turma.internacional && (
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDirectPrintAttendance(turma, 'mensal');
                      }}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white group/print transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 text-emerald-700 group-hover/print:text-white transition-colors">
                        <Printer size={13} />
                        <span className="text-[8.5px] font-black uppercase tracking-wider">
                          {language === 'pt' ? 'Folha Mensal' : 'Monthly Sheet'}
                        </span>
                      </div>
                    </button>

                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDirectPrintAttendance(turma, 'semanal');
                      }}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-teal-50 text-teal-700 hover:bg-teal-600 hover:text-white group/print-week transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 text-teal-700 group-hover/print-week:text-white transition-colors">
                        <Calendar size={13} />
                        <span className="text-[8.5px] font-black uppercase tracking-wider">
                          {language === 'pt' ? 'Folha Semanal' : 'Weekly Sheet'}
                        </span>
                      </div>
                    </button>
                  </div>
                )}

                <div className="space-y-1.5 px-1 pt-1">
                  <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-slate-400">
                    <span>{t.classes.capacity}</span>
                    <span className="text-slate-900">{turma.alunos_matriculados} / {turma.capacidade_max}</span>
                  </div>
                  <div className="h-1 bg-slate-50 rounded-full overflow-hidden p-0.5 border border-slate-100 shadow-inner">
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
          )})
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
        className="max-w-2xl"
      >
        <form onSubmit={handleSave} className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
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
                <option value="ead">{t.classes.categoryEad}</option>
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
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                {language === 'pt' ? 'Grupo Responsável' : 'Responsible Group'}
              </label>
              <select
                value={currentTurma?.grupo_responsavel || ''}
                onChange={(e) => setCurrentTurma({ ...currentTurma, grupo_responsavel: e.target.value || null })}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-sm font-bold text-slate-800 appearance-none cursor-pointer shadow-sm"
              >
                <option value="">{language === 'pt' ? 'Selecione um Grupo (Opcional)' : 'Select Group (Optional)'}</option>
                <option value="MAN">MAN</option>
                <option value="GAT">GAT</option>
              </select>
            </div>

            {!currentTurma?.internacional && (
              <>
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
              </>
            )}

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
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
          <div>
            <p className="text-xs text-slate-500 font-medium italic">
              {alunosInTurma.length} {language === 'pt' ? 'alunos matriculados' : 'students enrolled'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!viewingTurma?.internacional && (
              <button
                onClick={() => handleOpenPrintAttendance(viewingTurma)}
                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1.5 rounded-lg hover:bg-emerald-100 hover:text-emerald-800 transition-all cursor-pointer shadow-sm shadow-emerald-100"
              >
                <Printer size={13} strokeWidth={2.5} />
                {language === 'pt' ? 'Folha de Frequência' : 'Attendance Sheet'}
              </button>
            )}
            {!isReadOnly && (
              <>
                <button
                  onClick={async () => {
                    if (!viewingTurma?.id) return;
                    
                    toast.promise(
                      (async () => {
                        const res = await fetch('/api/auth/send-class-access-codes', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ classId: viewingTurma.id })
                        });
                        const data = await res.json();
                        if (!res.ok) {
                          throw new Error(data.error || 'Erro no disparo de e-mails.');
                        }
                        return data;
                      })(),
                      {
                        loading: 'Disparando e-mails para todos os alunos...',
                        success: (data: any) => {
                          const stats = data.stats || {};
                          return `Processado! Sucesso: ${stats.sent || 0}, Ignorados/Sem Email: ${stats.skipped || 0}, Erros: ${stats.failed || 0}.`;
                        },
                        error: (err: any) => `${err.message || 'Erro ao enviar.'}`
                      }
                    );
                  }}
                  className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-all cursor-pointer shadow-sm shadow-amber-50"
                  title="Enviar código de acesso a todos os alunos desta turma via SMTP"
                >
                  📩 Disparar E-mails (Lote)
                </button>
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
              {alunosInTurma.map((aluno, index) => (
                <div key={aluno.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 group">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-slate-400 min-w-[1.5rem] text-right shrink-0">
                      {index + 1}
                    </span>
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
                      
                      {(aluno.data_nascimento || aluno.funcao) && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {aluno.data_nascimento && (
                            <span className="text-[9px] text-slate-600 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 whitespace-nowrap">
                              🎂 {aluno.data_nascimento.split('-').reverse().join('/')}
                            </span>
                          )}
                          {aluno.funcao && (
                            <span className="text-[9px] text-slate-600 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 whitespace-nowrap italic">
                              💼 {aluno.funcao}
                            </span>
                          )}
                        </div>
                      )}

                      {isCiabaOrCiaga && (aluno.data_inicio_curso || aluno.data_fim_curso) && (
                        <div className="text-[9px] font-black text-blue-700 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5 mt-1 inline-block">
                          {language === 'pt' ? 'Curso: ' : 'Course: '}
                          <span className="font-mono text-blue-900">
                            {aluno.data_inicio_curso ? aluno.data_inicio_curso.split('-').reverse().join('/') : '—'}
                          </span>
                          {' a '}
                          <span className="font-mono text-blue-900">
                            {aluno.data_fim_curso ? aluno.data_fim_curso.split('-').reverse().join('/') : '—'}
                          </span>
                        </div>
                      )}
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
              ? 'Cole a lista de alunos (um por linha). Se usar colunas, use vírgula, ponto e vírgula ou tab. Ordem: Nome, Email, Matrícula, [Pular NIF], RG, OM, Posto, Ano, Tel, WA, Nasc. O Código de Acesso do Aluno é gerado automaticamente pelo sistema.' 
              : 'Paste student list (one per line). If using columns, use comma, semicolon or tab. Order: Name, Email, Reg, [Skip NIF], RG, Unit, Rank, Year, Tel, WA, Birth. Student Access Code is automatically generated by the system.'}
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
              <div className="relative group cursor-pointer w-36 h-48 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-all overflow-hidden text-center p-2 shadow-inner">
                {currentAluno?.foto_url ? (
                  <Image src={currentAluno.foto_url} alt="3x4" fill className="object-cover" sizes="144px" referrerPolicy="no-referrer" />
                ) : (
                  <>
                    <Image 
                      src={currentAluno?.genero === 'feminino' ? femaleAvatar : maleAvatar} 
                      alt="Avatar" 
                      fill 
                      className="object-cover opacity-20 group-hover:opacity-30 transition-opacity" 
                      sizes="144px" 
                      referrerPolicy="no-referrer" 
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors pointer-events-none">
                      <Camera size={24} strokeWidth={1.5} />
                      <span className="text-[8px] font-bold uppercase mt-1">{t.students.photo}</span>
                    </div>
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

          <div className="grid grid-cols-2 gap-3">
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                {t.students.data_nascimento}
              </label>
              <input
                type="date"
                value={currentAluno?.data_nascimento || ''}
                onChange={(e) => setCurrentAluno({ ...currentAluno, data_nascimento: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                {t.students.funcao}
              </label>
              <input
                type="text"
                value={currentAluno?.funcao || ''}
                onChange={(e) => setCurrentAluno({ ...currentAluno, funcao: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm outline-none"
                placeholder={language === 'pt' ? 'Função que exerce' : 'Current function'}
              />
            </div>
          </div>

          {currentAluno?.id && isAdmin && (
            <div className="p-4 bg-slate-100 rounded-xl border border-slate-200 space-y-3 mt-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                🔒 Acesso ao Sistema (Área do Aluno)
              </h4>
              
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                    Código de Acesso
                  </span>
                  {studentAccess?.access_code ? (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <code className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 font-mono font-bold rounded text-sm">
                        {studentAccess.access_code}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(studentAccess.access_code);
                          toast.success('Código copiado!');
                        }}
                        className="p-1 px-1.5 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded transition-colors text-xs border border-slate-300 bg-white"
                        title="Copiar"
                      >
                        Copiar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const w = window.open('', '_blank');
                          if (w) {
                            w.document.write(`
                              <html>
                                <head>
                                  <title>Código de Acesso - ${currentAluno.nome}</title>
                                  <style>
                                    body { font-family: sans-serif; padding: 40px; color: #334155; }
                                    .card { border: 2px dashed #1e3a8a; padding: 30px; border-radius: 12px; max-width: 450px; margin: 0 auto; text-align: center; }
                                    h2 { margin: 0 0 10px 0; color: #1e3a8a; font-size: 20px; }
                                    .code { font-family: monospace; font-size: 26px; font-weight: bold; background: #f1f5f9; padding: 12px 24px; display: inline-block; border-radius: 8px; border: 1px solid #e2e8f0; margin: 20px 0; letter-spacing: 1px; color: #1d4ed8; }
                                    .footer { font-size: 11px; color: #64748b; margin-top: 30px; border-top: 1px solid #f1f5f9; pt-10; }
                                    p { line-height: 1.5; margin: 8px 0; }
                                  </style>
                                </head>
                                <body onload="window.print()">
                                  <div class="card">
                                    <h2>CÓDIGO DE ACESSO EXCLUSIVO</h2>
                                    <p><strong>Nome do Aluno:</strong> ${currentAluno.nome}</p>
                                    <p><strong>Turma Vinculada:</strong> ${viewingTurma?.nome || 'Não especificada'}</p>
                                    <div class="code">${studentAccess.access_code}</div>
                                    <p style="font-size: 13px;">Use este Código de Acesso e a sua senha padrão (<strong>123</strong>) para realizar login na Área do Aluno.</p>
                                    <div class="footer">Escola Digital © ${new Date().getFullYear()}</div>
                                  </div>
                                </body>
                              </html>
                            `);
                            w.document.close();
                          }
                        }}
                        className="p-1 px-1.5 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded transition-colors text-xs border border-slate-300 bg-white"
                        title="Imprimir"
                      >
                        Imprimir
                      </button>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">Será gerado na matrícula</span>
                  )}
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                    Status da Turma
                  </span>
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 mt-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    viewingTurma?.status === 'ativa'
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  )}>
                    ● {viewingTurma?.status === 'ativa' ? 'ATIVA (Acesso Normal)' : 'CONCLUÍDA (Acesso Bloqueado)'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-200">
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                    Último Login
                  </span>
                  <span className="font-semibold text-slate-600 font-sans">
                    {studentAccess?.last_login
                      ? new Date(studentAccess.last_login).toLocaleString('pt-BR')
                      : 'Nunca logado'}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                    Quantidade de acessos
                  </span>
                  <span className="px-2 py-0.5 bg-white border border-slate-200 rounded font-bold font-mono text-slate-700">
                    {studentAccess?.login_count || 0}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex gap-2">
                <button
                  id="resend-student-code-btn"
                  type="button"
                  onClick={async () => {
                    if (!currentAluno?.id) return;
                    
                    toast.promise(
                      (async () => {
                        const res = await fetch('/api/auth/send-access-code', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ studentId: currentAluno.id })
                        });
                        const data = await res.json();
                        if (!res.ok) {
                          throw new Error(data.error || 'Erro ao enviar e-mail.');
                        }
                        return data;
                      })(),
                      {
                        loading: 'Enviando código de acesso por e-mail...',
                        success: () => `Código enviado com sucesso para ${currentAluno.email || 'e-mail do aluno'}!`,
                        error: (err: any) => `${err.message || 'Erro ao enviar.'}`
                      }
                    );
                  }}
                  className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded text-[11px] transition-colors shadow-sm outline-none cursor-pointer flex items-center gap-1.5"
                >
                  ✉️ Reenviar código ao aluno
                </button>
              </div>
            </div>
          )}

          {isCiabaOrCiaga && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50/40 rounded-xl border border-blue-100">
              <div>
                <label className="block text-[10px] font-extrabold text-blue-700 uppercase tracking-wider mb-1">
                  {language === 'pt' ? 'Início do Curso' : 'Course Start Date'}
                </label>
                <input
                  type="date"
                  value={currentAluno?.data_inicio_curso || ''}
                  onChange={(e) => setCurrentAluno({ ...currentAluno, data_inicio_curso: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-blue-200 text-blue-900 rounded text-sm focus:ring-2 focus:ring-blue-500/20 outline-none font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-blue-700 uppercase tracking-wider mb-1">
                  {language === 'pt' ? 'Término do Curso' : 'Course End Date'}
                </label>
                <input
                  type="date"
                  value={currentAluno?.data_fim_curso || ''}
                  onChange={(e) => setCurrentAluno({ ...currentAluno, data_fim_curso: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-blue-200 text-blue-900 rounded text-sm focus:ring-2 focus:ring-blue-500/20 outline-none font-bold"
                />
              </div>
            </div>
          )}

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

      {/* Folha de Frequência Mensal Print Preview & Controls */}
      <AnimatePresence>
        {isPrintAttendanceOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-slate-900/90 overflow-y-auto custom-scrollbar flex flex-col no-print"
          >
            {/* Top Workspace Bar */}
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4 p-4 border-b border-white/10 bg-slate-950 sticky top-0 z-50 text-white shadow-xl">
              <div className="flex items-center gap-3 w-full lg:w-auto">
                <button
                  onClick={() => setIsPrintAttendanceOpen(false)}
                  className="p-2 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all"
                  title="Fechar"
                >
                  <X size={20} />
                </button>
                <div>
                  <h2 className="text-base font-black uppercase tracking-wider text-white">
                    {printSheetType === 'semanal' 
                      ? (language === 'pt' ? 'Folha de Frequência Semanal' : 'Weekly Attendance Sheet')
                      : (language === 'pt' ? 'Folha de Frequência Mensal' : 'Monthly Attendance Sheet')
                    }
                  </h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                    {alunosInTurma.length} {language === 'pt' ? 'alunos listados' : 'students listed'}
                  </p>
                </div>
              </div>

              {/* Editable Fields in Controls Bar */}
              <div className="flex flex-wrap items-center gap-3 bg-white/[0.03] p-2 rounded-2xl border border-white/5 w-full lg:w-auto">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest pl-1 mb-1">Tipo</span>
                  <select
                    value={printSheetType}
                    onChange={(e) => {
                      setPrintSheetType(e.target.value as 'mensal' | 'semanal');
                      setSelectedWeekIndex(null);
                    }}
                    className="px-2.5 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-blue-500 cursor-pointer h-[34px]"
                  >
                    <option value="mensal">{language === 'pt' ? 'Mensal' : 'Monthly'}</option>
                    <option value="semanal">{language === 'pt' ? 'Semanal' : 'Weekly'}</option>
                  </select>
                </div>

                {printSheetType === 'semanal' && (
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest pl-1 mb-1">Semana Selecionada</span>
                    <select
                      value={activeWeekIndex}
                      onChange={(e) => setSelectedWeekIndex(parseInt(e.target.value, 10))}
                      className="px-2.5 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-blue-500 min-w-[200px] cursor-pointer h-[34px]"
                    >
                      {activeWeeksList.map((w) => (
                        <option key={w.index} value={w.index}>
                          {w.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex flex-col flex-1 sm:flex-initial">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest pl-1 mb-1">Professor(a)</span>
                  <input
                    type="text"
                    value={printProfessorName}
                    onChange={(e) => setPrintProfessorName(e.target.value)}
                    className="px-3 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-xs font-bold font-sans text-white focus:outline-none focus:border-blue-500 w-full sm:w-44 h-[34px]"
                    placeholder="Nome do Professor"
                  />
                </div>
                <div className="flex flex-col flex-1 sm:flex-initial">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest pl-1 mb-1">Turma</span>
                  <input
                    type="text"
                    value={printClassName}
                    onChange={(e) => setPrintClassName(e.target.value)}
                    className="px-3 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-xs font-bold font-sans text-white focus:outline-none focus:border-blue-500 w-full sm:w-44 h-[34px]"
                    placeholder="Nome da Turma"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest pl-1 mb-1">Mês/Ano</span>
                  <input
                    type="text"
                    value={printPeriod}
                    onChange={(e) => {
                      setPrintPeriod(e.target.value);
                      setSelectedWeekIndex(null);
                    }}
                    className="px-3 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-xs font-bold font-mono text-white focus:outline-none focus:border-blue-500 w-24 text-center h-[34px]"
                    placeholder="MM/AAAA"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <button
                  onClick={() => setIsPrintAttendanceOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs uppercase tracking-widest transition"
                >
                  {t.common.cancel}
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-950 transition-all active:translate-y-px"
                >
                  <Printer size={16} />
                  {language === 'pt' ? 'Imprimir Frequência' : 'Print Sheet'}
                </button>
              </div>
            </div>

            {/* Printable canvas container centerer with Zoom styling */}
            <div className="flex-1 flex justify-center items-start p-6 bg-slate-900 overflow-auto custom-scrollbar">
              <div 
                id="print-attendance-sheet"
                className="bg-white text-black p-[10mm] shadow-2xl relative rounded border border-slate-700 w-[297mm] h-[210mm] shrink-0 font-sans"
              >
                {/* Print Styles */}
                <style dangerouslySetInnerHTML={{ __html: `
                  #print-attendance-sheet {
                    color-adjust: exact;
                    -webkit-print-color-adjust: exact;
                  }
                  .print-attendance-table td, .print-attendance-table th {
                    border: 1px solid #111111 !important;
                  }
                  @media print {
                    /* Only print the sheet */
                    body * {
                      visibility: hidden !important;
                    }
                    #print-attendance-sheet, #print-attendance-sheet * {
                      visibility: visible !important;
                    }
                    #print-attendance-sheet {
                      position: absolute !important;
                      left: 0 !important;
                      top: 0 !important;
                      width: 297mm !important;
                      height: 210mm !important;
                      margin: 0 !important;
                      padding: 10mm !important;
                      background: white !important;
                      box-shadow: none !important;
                      border: none !important;
                      page-break-inside: avoid !important;
                    }
                    @page {
                      size: A4 landscape !important;
                      margin: 0 !important;
                    }
                  }
                `}} />

                {/* Print Header */}
                <div className="mb-4">
                  <h1 className="text-xl font-extrabold text-center border-b-2 border-black pb-2 mb-4 uppercase tracking-normal">
                    {printSheetType === 'semanal' 
                      ? (language === 'pt' ? 'FOLHA DE FREQUÊNCIA SEMANAL' : 'WEEKLY ATTENDANCE SHEET')
                      : (language === 'pt' ? 'FOLHA DE FREQUÊNCIA MENSAL' : 'MONTHLY ATTENDANCE SHEET')
                    }
                  </h1>
                  <div className="grid grid-cols-3 gap-6 font-semibold uppercase text-[10px]">
                    <div className="flex flex-col">
                      <span>{language === 'pt' ? 'Professor(a):' : 'Instructor:'}</span>
                      <div className="border-b border-black h-8 flex items-end pb-1 text-xs font-bold px-1 whitespace-nowrap overflow-hidden">
                        {printProfessorName}
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span>{language === 'pt' ? 'Turma:' : 'Class/Group:'}</span>
                      <div className="border-b border-black h-8 flex items-end pb-1 text-xs font-bold px-1 whitespace-nowrap overflow-hidden">
                        {printClassName}
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span>
                        {printSheetType === 'semanal' 
                          ? (language === 'pt' ? 'Semana / Período:' : 'Week / Period:') 
                          : (language === 'pt' ? 'Mês/Ano:' : 'Month/Year:')
                        }
                      </span>
                      <div className="border-b border-black h-8 flex items-end pb-1 text-xs font-mono font-bold px-1 text-center justify-center font-bold">
                        {printSheetType === 'semanal'
                          ? (activeWeeksList[activeWeekIndex]?.label || printPeriod) 
                          : printPeriod
                        }
                      </div>
                    </div>
                  </div>
                </div>

                {/* Table container wrapping the exact styled attendance grid */}
                <div className="overflow-hidden mt-3">
                  <table className="print-attendance-table w-full border-collapse border border-black table-fixed">
                    <thead>
                      <tr className="bg-neutral-100 text-[8px] font-bold uppercase text-center h-5">
                        <th className="w-[32px] border border-black p-0.5 text-center">#</th>
                        <th 
                          className={cn(
                            "border border-black p-0.5 text-left pl-2 text-[9px] overflow-hidden truncate whitespace-nowrap",
                            printSheetType === 'semanal' ? "w-[350px]" : "w-[210px]"
                          )}
                        >
                          {language === 'pt' ? 'Nome do Aluno' : 'Student Name'}
                        </th>
                        {daysToRender.map((day) => {
                          const status = getDayStatus(day.dayNum, day.month, day.year);
                          const dateObj = new Date(day.year, day.month, day.dayNum);
                          const dayOfWeek = dateObj.getDay();
                          return (
                            <th 
                              key={`${day.year}-${day.month}-${day.dayNum}`} 
                              className={cn(
                                "border border-black p-0 text-center font-mono font-bold text-[8px]",
                                printSheetType === 'semanal' ? "w-[40px]" : "w-[18px]",
                                !status.isValid ? "bg-neutral-200 text-neutral-400" :
                                status.label === 'FE' ? "bg-red-100 text-red-800" :
                                (status.label === 'S' || status.label === 'D') ? "bg-neutral-200 text-neutral-700" : ""
                              )}
                            >
                              <div className="flex flex-col items-center justify-center leading-tight">
                                <span className={cn(printSheetType === 'semanal' ? "text-[9px]" : "text-[8px]")}>{day.dayNum}</span>
                                {printSheetType === 'semanal' ? (
                                  <span className="text-[6.5px] uppercase text-neutral-500 font-extrabold">{getWeekdayName(dayOfWeek)}</span>
                                ) : (
                                  status.isValid && (status.label === 'FE' || status.label === 'S' || status.label === 'D') && (
                                    <span className="text-[5.5px] opacity-75 font-black text-red-600">{status.label}</span>
                                  )
                                )}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {alunosInTurma.length > 0 ? (
                        alunosInTurma.map((student, index) => (
                          <tr key={student.id || index} className={cn("text-[8px] font-bold uppercase", printSheetType === 'semanal' ? "h-[5.5mm]" : "h-[3.9mm]")}>
                            <td className="border border-black text-center font-mono font-semibold text-[8px]">
                              {index + 1}
                            </td>
                            <td 
                              className={cn(
                                "border border-black px-2 text-[9px] font-sans",
                                isCiabaOrCiaga ? "" : "truncate whitespace-nowrap",
                                printSheetType === 'semanal' ? "max-w-[350px]" : "max-w-[210px]"
                              )}
                            >
                              <div className="flex flex-col justify-center py-0.5 leading-tight">
                                <span className={cn(isCiabaOrCiaga ? "text-[8px] truncate block" : "")}>
                                  {student.posto_graduacao ? `${student.posto_graduacao} ${student.nome}` : student.nome}
                                </span>
                                {isCiabaOrCiaga && (student.data_inicio_curso || student.data_fim_curso) && (
                                  <span className="text-[6px] text-neutral-500 font-extrabold normal-case mt-0.5 whitespace-nowrap overflow-hidden block">
                                    {language === 'pt' ? 'período: ' : 'period: '}
                                    <span className="font-mono text-black">
                                      {student.data_inicio_curso ? student.data_inicio_curso.split('-').reverse().join('/') : '—'}
                                    </span>
                                    {' a '}
                                    <span className="font-mono text-black">
                                      {student.data_fim_curso ? student.data_fim_curso.split('-').reverse().join('/') : '—'}
                                    </span>
                                  </span>
                                )}
                              </div>
                            </td>
                            {daysToRender.map((day) => {
                              const status = getDayStatus(day.dayNum, day.month, day.year);
                              return (
                                <td 
                                  key={`${day.year}-${day.month}-${day.dayNum}`} 
                                  className={cn(
                                    "border border-black p-0 text-center font-bold font-mono select-none",
                                    printSheetType === 'semanal' ? "text-[9px]" : "text-[7px]",
                                    status.bgClass
                                  )}
                                >
                                  {status.label}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      ) : (
                        <tr className="h-[3.9mm] text-[8px] font-bold uppercase">
                          <td className="border border-black text-center font-mono font-semibold text-[8px]">
                            1
                          </td>
                          <td className="border border-black px-2 text-[9px] italic text-neutral-400">
                            {language === 'pt' ? 'Nenhum aluno inscrito nesta turma' : 'No students registered in this class'}
                          </td>
                          {daysToRender.map((day) => (
                            <td key={`${day.year}-${day.month}-${day.dayNum}`} className="border border-black p-0 bg-neutral-100"></td>
                          ))}
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Legenda & Signature Section flowing naturally directly below the sheet in the blank space */}
                <div className="mt-5 grid grid-cols-2 gap-8 items-start">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider mb-1.5">
                      {language === 'pt' ? 'Legenda:' : 'Legend:'}
                    </div>
                    <div className="flex select-none flex-wrap gap-x-3 gap-y-1 text-[8px] font-black border-2 border-black p-2 rounded-lg bg-neutral-50 shadow-sm">
                      <span><strong>P</strong> = {language === 'pt' ? 'Presente' : 'Present'}</span>
                      <span><strong>F</strong> = {language === 'pt' ? 'Falta' : 'Absent'}</span>
                      <span><strong>H</strong> = {language === 'pt' ? 'Hospital' : 'Hospitalizado'}</span>
                      <span><strong>N</strong> = {language === 'pt' ? 'Não houve aula' : 'No Class'}</span>
                      <span><strong>D</strong> = {language === 'pt' ? 'Desligado' : 'Withdrawn'}</span>
                      <span className="text-red-700 border-l border-black pl-2"><strong>FE</strong> = {language === 'pt' ? 'Feriado' : 'Holiday'}</span>
                      <span className="text-neutral-600 border-l border-black pl-2"><strong>S/D</strong> = Sáb/Dom</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider mb-1.5 flex justify-between items-center">
                      <span>{language === 'pt' ? 'Feriados Descritos (Motivo):' : 'Holidays Described (Reason):'}</span>
                      <span className="text-[7px] text-neutral-400 font-bold tracking-widest uppercase">São Tomé e Príncipe</span>
                    </div>
                    <div className="flex flex-col gap-1 text-[7.5px] font-black border-2 border-dashed border-red-500 p-2 rounded-lg bg-red-50/50 min-h-[46px] justify-center">
                      {(() => {
                        const activeHolidays = getHolidaysForDays(daysToRender);

                        return activeHolidays.length > 0 ? (
                          activeHolidays.map((holiday, hIdx) => (
                            <div key={hIdx} className="text-red-700 flex items-start gap-1 justify-start leading-tight">
                              <span className="bg-red-600 text-white font-mono text-[6.5px] px-1 rounded shrink-0 font-extrabold">
                                FE {holiday.day}/{String(holiday.month + 1).padStart(2, '0')}
                              </span>
                              <span className="font-bold shrink-0">{holiday.name}:</span>
                              <span className="font-medium text-neutral-700 normal-case italic line-clamp-2">{holiday.meaning}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-neutral-500 italic font-mono uppercase tracking-widest text-[7px] text-center block w-full">
                            {printSheetType === 'semanal'
                              ? (language === 'pt' ? 'Nenhum feriado nacional nesta semana.' : 'No national holidays this week.')
                              : (language === 'pt' ? 'Nenhum feriado nacional neste mês.' : 'No national holidays this month.')
                            }
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Observation Warning Block */}
                <div className="mt-4 border-2 border-red-500 bg-red-50/50 p-2.5 rounded-lg text-center font-extrabold text-[8.5px] text-red-800 tracking-wide leading-relaxed">
                  {language === 'pt' 
                    ? 'OBS.: Esta folha de presença deverá ser entregue diariamente ao Coordenador de Cursos para lançamento no controle do aluno.' 
                    : 'OBS.: This attendance sheet must be submitted daily to the Course Coordinator for entry into the student record.'
                  }
                </div>

                {/* Micro-printed controlled copy warning centered */}
                <div className="absolute bottom-[10mm] left-0 right-0 text-center text-[7px] font-bold tracking-[0.34em] text-neutral-400 uppercase">
                  {language === 'pt' ? 'Documento de uso oficial - Cópia controlada' : 'Official Document - Controlled Copy'}
                </div>
              </div>
            </div>
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
