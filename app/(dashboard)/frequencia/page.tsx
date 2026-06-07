'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { useUser } from '@/lib/auth/UserContext';
import { 
  CalendarDays, 
  Search, 
  UserCheck, 
  Save, 
  Loader2, 
  CheckCircle2, 
  LayoutGrid, 
  ListChecks,
  ChevronLeft,
  ChevronRight,
  Clock,
  XCircle,
  UserX,
  Target,
  BarChart3,
  CalendarDays as CalendarIcon,
  Calendar,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import maleAvatar from '@/src/assets/images/avatar_male_1778977230783.png';
import femaleAvatar from '@/src/assets/images/avatar_female_1778977246051.png';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  addMonths, 
  subMonths,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  startOfYear,
  endOfYear,
  eachMonthOfInterval,
  isSameMonth
} from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';

export default function FrequenciaPage() {
  const { t, language } = useI18n();
  const { profile, isAdmin, isInstrutor } = useUser();
  const isReadOnly = !isAdmin && !isInstrutor;
  const dateLocale = language === 'pt' ? ptBR : enUS;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<'record' | 'map'>('record');
  const [mapGranularity, setMapGranularity] = useState<'week' | 'month' | 'year'>('month');
  
  const [cursos, setCursos] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [disciplinas, setDisciplinas] = useState<any[]>([]);
  
  const [selectedCurso, setSelectedCurso] = useState('');
  const [selectedTurma, setSelectedTurma] = useState('');
  const [selectedDisciplina, setSelectedDisciplina] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [currentMapDate, setCurrentMapDate] = useState(new Date());

  const [students, setStudents] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, { presente: boolean, id?: string }>>({});
  const [mapData, setMapData] = useState<any[]>([]);

  const fetchAttendance = useCallback(async () => {
    if (!selectedTurma) {
      setStudents([]);
      setAttendanceRecords({});
      setMapData([]);
      return;
    }
    setLoading(true);
    
    try {
      // Fetch students in the class
      const { data: alunoData, error: alunoError } = await supabase
        .from('alunos')
        .select('id, nome, matricula, foto_url, genero')
        .eq('turma_id', selectedTurma)
        .is('deleted_at', null)
        .order('nome');

      if (alunoError) throw alunoError;
      setStudents(alunoData || []);

      let query = supabase
        .from('frequencia')
        .select('*')
        .eq('turma_id', selectedTurma);

      if (view === 'record') {
        query = query.eq('data', selectedDate);
        
        if (selectedDisciplina) {
          query = query.eq('disciplina_id', selectedDisciplina);
        } else {
          query = query.is('disciplina_id', null);
        }

        const { data: recData, error: recError } = await query;
        if (recError) throw recError;

        const records: Record<string, { presente: boolean, id?: string }> = {};
        alunoData?.forEach((a: any) => {
          records[a.id] = { presente: true };
        });
        recData?.forEach((r: any) => {
          records[r.aluno_id] = { presente: r.presente, id: r.id };
        });
        setAttendanceRecords(records);
      } else {
        let start: string;
        let end: string;

        if (mapGranularity === 'week') {
          start = format(startOfWeek(currentMapDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
          end = format(endOfWeek(currentMapDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        } else if (mapGranularity === 'year') {
          start = format(startOfYear(currentMapDate), 'yyyy-MM-dd');
          end = format(endOfYear(currentMapDate), 'yyyy-MM-dd');
        } else {
          start = format(startOfMonth(currentMapDate), 'yyyy-MM-dd');
          end = format(endOfMonth(currentMapDate), 'yyyy-MM-dd');
        }
        
        query = query.gte('data', start).lte('data', end);
        
        if (selectedDisciplina) {
          query = query.eq('disciplina_id', selectedDisciplina);
        } else {
          query = query.is('disciplina_id', null);
        }

        const { data: mapRecData, error: mapRecError } = await query;
        if (mapRecError) throw mapRecError;
        setMapData(mapRecData || []);
      }
    } catch (err: any) {
      console.error('Error fetching attendance:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedTurma, selectedDate, selectedDisciplina, view, currentMapDate, mapGranularity]);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      if (isMounted) await fetchAttendance();
    };
    loadData();
    return () => { isMounted = false; };
  }, [fetchAttendance]);

  const getTurmaPeriodStatus = useCallback(() => {
    if (!selectedTurma) return { isValid: true, isExpired: false, isBefore: false, data_inicio: null, data_fim: null };
    const activeTurma = turmas.find(t => t.id === selectedTurma);
    if (!activeTurma) return { isValid: true, isExpired: false, isBefore: false, data_inicio: null, data_fim: null };

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const hasStart = !!activeTurma.data_inicio;
    const hasEnd = !!activeTurma.data_fim;

    let isExpired = false;
    let isBefore = false;

    if (hasEnd) {
      if (todayStr > activeTurma.data_fim || selectedDate > activeTurma.data_fim) {
        isExpired = true;
      }
    }
    if (hasStart) {
      if (selectedDate < activeTurma.data_inicio) {
        isBefore = true;
      }
    }

    return {
      isValid: !isExpired && !isBefore,
      isExpired,
      isBefore,
      data_inicio: activeTurma.data_inicio,
      data_fim: activeTurma.data_fim
    };
  }, [selectedTurma, turmas, selectedDate]);

  const handleToggleAttendance = (alunoId: string) => {
    if (isReadOnly) return;
    if (!isAdmin) {
      const { isValid, isExpired } = getTurmaPeriodStatus();
      if (isExpired) {
        toast.error(language === 'pt' ? 'O período desta turma já expirou. Não é permitido marcar frequência.' : 'The period for this class has expired. Attendance marking is not allowed.');
        return;
      }
      if (!isValid) {
        toast.error(language === 'pt' ? 'A data selecionada está fora do período da turma.' : 'The selected date is outside the class period.');
        return;
      }
    }
    setAttendanceRecords(prev => ({
      ...prev,
      [alunoId]: { ...prev[alunoId], presente: !prev[alunoId].presente }
    }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedTurma || isReadOnly) return;
    if (!selectedDate) {
      toast.error(language === 'pt' ? 'Por favor, selecione uma data válida.' : 'Please select a valid date.');
      return;
    }
    if (!isAdmin) {
      const { isValid, isExpired } = getTurmaPeriodStatus();
      if (isExpired) {
        toast.error(language === 'pt' ? 'Impossível salvar. O período da turma já expirou.' : 'Cannot save. The class period has already expired.');
        return;
      }
      if (!isValid) {
        toast.error(language === 'pt' ? 'Impossível salvar. A data selecionada está fora do período da turma.' : 'Cannot save. Selected date is outside the class period.');
        return;
      }
    }
    setSaving(true);
    const loadingToast = toast.loading(t.common.loading || 'Salvando...');
    try {
      // First, delete existing entries to prevent duplicates and satisfy the partial index constraints smoothly
      let deleteQuery = supabase
        .from('frequencia')
        .delete()
        .eq('turma_id', selectedTurma)
        .eq('data', selectedDate);

      if (selectedDisciplina) {
        deleteQuery = deleteQuery.eq('disciplina_id', selectedDisciplina);
      } else {
        deleteQuery = deleteQuery.is('disciplina_id', null);
      }

      const { error: deleteError } = await deleteQuery;
      if (deleteError) throw deleteError;

      // Now, insert the current selected options
      const recordsToInsert = Object.entries(attendanceRecords).map(([alunoId, data]) => ({
        aluno_id: alunoId,
        turma_id: selectedTurma,
        disciplina_id: selectedDisciplina || null,
        data: selectedDate,
        presente: data.presente
      }));

      if (recordsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('frequencia')
          .insert(recordsToInsert);

        if (insertError) throw insertError;
      }

      toast.success(t.attendance.saveSuccess, { id: loadingToast });
      fetchAttendance();
    } catch (err: any) {
      toast.error(err.message, { id: loadingToast });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleMapAttendance = async (studentId: string, dayStr: string, currentRecord: any) => {
    if (isReadOnly) return;

    if (!isAdmin) {
      const activeTurma = turmas.find(t => t.id === selectedTurma);
      if (activeTurma) {
        const hasStart = !!activeTurma.data_inicio;
        const hasEnd = !!activeTurma.data_fim;
        if (hasEnd && dayStr > activeTurma.data_fim) {
          toast.error(language === 'pt' ? 'Impossível alterar. O período desta turma já expirou.' : 'Cannot modify. The class period has already expired.');
          return;
        }
        if (hasStart && dayStr < activeTurma.data_inicio) {
          toast.error(language === 'pt' ? 'Impossível alterar. A data selecionada é anterior ao período letivo.' : 'Cannot modify. The selected date is before the class period.');
          return;
        }
      }
    }

    // Toggle logic: defaults to true if no record exists
    const wasPresent = currentRecord ? currentRecord.presente : true;
    const newPresence = !wasPresent;

    const toastId = toast.loading(language === 'pt' ? 'Atualizando presença...' : 'Updating attendance...');
    try {
      // First, delete any pre-existing records for this student on this day
      let deleteQuery = supabase
        .from('frequencia')
        .delete()
        .eq('aluno_id', studentId)
        .eq('turma_id', selectedTurma)
        .eq('data', dayStr);

      if (selectedDisciplina) {
        deleteQuery = deleteQuery.eq('disciplina_id', selectedDisciplina);
      } else {
        deleteQuery = deleteQuery.is('disciplina_id', null);
      }

      const { error: deleteError } = await deleteQuery;
      if (deleteError) throw deleteError;

      // Insert new record
      const recordToInsert = {
        aluno_id: studentId,
        turma_id: selectedTurma,
        disciplina_id: selectedDisciplina || null,
        data: dayStr,
        presente: newPresence
      };

      const { data: insertedData, error: insertError } = await supabase
        .from('frequencia')
        .insert([recordToInsert])
        .select();

      if (insertError) throw insertError;

      // Snappy local state update
      setMapData(prev => {
        const filtered = prev.filter(r => {
          const rDate = typeof r.data === 'string' ? r.data.substring(0, 10) : format(new Date(r.data), 'yyyy-MM-dd');
          const rDis = r.disciplina_id || null;
          const selDis = selectedDisciplina || null;
          return !(r.aluno_id === studentId && rDate === dayStr && rDis === selDis);
        });
        if (insertedData && insertedData[0]) {
          return [...filtered, insertedData[0]];
        }
        return filtered;
      });

      toast.success(language === 'pt' ? 'Presença atualizada!' : 'Attendance updated!', { id: toastId });
    } catch (err: any) {
      console.error('Error updating map attendance:', err);
      toast.error(err.message || 'Erro ao salvar alteração.', { id: toastId });
    }
  };

  const filteredTurmas = selectedCurso ? turmas.filter((t: any) => t.curso_id === selectedCurso) : turmas;
  const filteredDisciplinas = selectedCurso ? disciplinas.filter((d: any) => d.curso_id === selectedCurso) : disciplinas;

  useEffect(() => {
    const fetchFilters = async () => {
      const { data: cursosData } = await supabase.from('cursos').select('id, nome, internacional, grupo_responsavel').is('deleted_at', null).order('nome');
      let filteredCuts = cursosData || [];
      if (profile?.role === 'instrutor' && profile?.grupo_responsavel) {
        if (profile.grupo_responsavel === 'MAN') {
          filteredCuts = filteredCuts.filter((c: any) => c.grupo_responsavel === 'MAN');
        } else if (profile.grupo_responsavel === 'GAT') {
          filteredCuts = filteredCuts.filter((c: any) => c.grupo_responsavel === 'GAT');
        } else if (profile.grupo_responsavel === 'AMBOS') {
          filteredCuts = filteredCuts.filter((c: any) => c.grupo_responsavel === 'MAN' || c.grupo_responsavel === 'GAT');
        }
      }
      if (cursosData) setCursos(filteredCuts.filter((c: any) => !c.internacional));

      const { data: turmasData } = await supabase.from('turmas').select('id, nome, curso_id, internacional, data_inicio, data_fim, grupo_responsavel').is('deleted_at', null).order('nome');
      let filteredCls = turmasData || [];
      if (profile?.role === 'instrutor' && profile?.grupo_responsavel) {
        if (profile.grupo_responsavel === 'MAN') {
          filteredCls = filteredCls.filter((t: any) => t.grupo_responsavel === 'MAN');
        } else if (profile.grupo_responsavel === 'GAT') {
          filteredCls = filteredCls.filter((t: any) => t.grupo_responsavel === 'GAT');
        } else if (profile.grupo_responsavel === 'AMBOS') {
          filteredCls = filteredCls.filter((t: any) => t.grupo_responsavel === 'MAN' || t.grupo_responsavel === 'GAT');
        }
      }
      if (turmasData) setTurmas(filteredCls.filter((t: any) => !t.internacional));

      const { data: disciplinasData } = await supabase.from('disciplinas').select('id, nome, curso_id').is('deleted_at', null).order('nome');
      if (disciplinasData) setDisciplinas(disciplinasData);
    };
    fetchFilters();
  }, [profile]);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'absent'>('all');

  const filteredStudents = students.filter((student: any) => {
    const matchesSearch = student.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         student.matricula?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeFilter === 'absent') {
      return matchesSearch && !attendanceRecords[student.id]?.presente;
    }
    
    return matchesSearch;
  });

  const totalPresent = Object.values(attendanceRecords).filter((r: any) => r.presente).length;
  const totalAbsent = Object.values(attendanceRecords).filter((r: any) => !r.presente).length;
  const presencePercentage = students.length > 0 ? Math.round((totalPresent / students.length) * 100) : 0;

  return (
    <div className="space-y-6 pb-20 max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className="hover:text-blue-600 cursor-pointer transition-colors">{t.nav.courses}</span>
          <span className="text-slate-300">›</span>
          <span className="font-medium text-slate-900">{t.attendance.title}</span>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setView('record')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
              view === 'record' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <ListChecks size={16} />
            {t.attendance.record}
          </button>
          <button
            onClick={() => setView('map')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
              view === 'map' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <LayoutGrid size={16} />
            {t.attendance.map}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === 'record' ? (
          <motion.div
            key="record"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Top Selection Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* ... existing card content ... */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
            {t.attendance.selectClass || 'TURMA E DISCIPLINA'}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative group">
              <select
                value={selectedTurma}
                onChange={(e) => setSelectedTurma(e.target.value)}
                className="w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none text-base font-semibold appearance-none transition-all cursor-pointer group-hover:bg-slate-50"
              >
                <option value="">{t.attendance.selectClass}</option>
                {turmas.map(turma => (
                  <option key={turma.id} value={turma.id}>{turma.nome}</option>
                ))}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
            <div className="relative group">
              <select
                value={selectedDisciplina}
                onChange={(e) => setSelectedDisciplina(e.target.value)}
                className="w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none text-base font-semibold appearance-none transition-all cursor-pointer group-hover:bg-slate-50"
              >
                <option value="">{t.attendance.allDisciplines || 'Disciplina'}</option>
                {disciplinas.filter(d => !selectedTurma || turmas.find(t => t.id === selectedTurma)?.curso_id === d.curso_id).map(dis => (
                  <option key={dis.id} value={dis.id}>{dis.nome}</option>
                ))}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
            {t.attendance.date || 'DATA DA CHAMADA'}
          </label>
          <div className="relative group">
            <CalendarDays size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-600" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                const newDate = e.target.value;
                setSelectedDate(newDate);
                if (newDate) {
                  const parsed = new Date(newDate + 'T12:00:00');
                  if (!isNaN(parsed.getTime())) {
                    setCurrentMapDate(parsed);
                  }
                }
              }}
              className="w-full pl-14 pr-5 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none text-base font-semibold transition-all cursor-pointer group-hover:bg-slate-50"
            />
          </div>
        </div>

        <div className="lg:col-span-4 bg-[#1d4ed8] text-white p-6 rounded-3xl shadow-xl flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[rgba(255,255,255,0.05)] rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
          <div className="relative z-10">
            <label className="block text-[11px] font-bold text-[rgba(219,234,254,0.8)] uppercase tracking-widest mb-1.5">
              {t.attendance.frequencyRate || 'PRESENÇA GERAL'}
            </label>
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-black tracking-tight">{presencePercentage}%</span>
              <span className="text-blue-100 font-bold text-sm bg-[rgba(37,99,235,0.5)] px-2 py-0.5 rounded-lg whitespace-nowrap">
                {totalPresent}/{students.length} Alunos
              </span>
            </div>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-[#2563eb] flex items-center justify-center relative z-10 border border-[rgba(59,130,246,0.5)] shadow-sm">
            <UserCheck size={28} className="text-white" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
        {/* Period status banner if selectedTurma is active */}
        {selectedTurma && (() => {
          const { isValid, isExpired, isBefore, data_inicio, data_fim } = getTurmaPeriodStatus();
          if (isExpired) {
            return (
              <div className="mx-6 mt-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-800">
                <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
                <div className="text-xs font-semibold">
                  <p className="font-bold">⚠️ Período da Turma Expirado!</p>
                  <p className="font-normal mt-0.5">
                    O período letivo definido para esta turma ({data_inicio ? data_inicio.split('-').reverse().join('/') : 'N/A'} a {data_fim ? data_fim.split('-').reverse().join('/') : 'N/A'}) já encerrou. {isAdmin ? 'Como administrador, você pode realizar alterações.' : 'As alterações de presença, falta ou atraso estão bloqueadas.'}
                  </p>
                </div>
              </div>
            );
          }
          if (isBefore) {
            return (
              <div className="mx-6 mt-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-3 text-blue-800">
                <ShieldAlert className="h-5 w-5 text-blue-600 shrink-0" />
                <div className="text-xs font-semibold">
                  <p className="font-bold">📅 Data selecionada anterior ao início das aulas!</p>
                  <p className="font-normal mt-0.5">
                    O período letivo desta turma inicia em {data_inicio ? data_inicio.split('-').reverse().join('/') : 'N/A'}. {isAdmin ? 'Como administrador, você pode realizar alterações.' : 'A gravação de frequências para esta data está bloqueada.'}
                  </p>
                </div>
              </div>
            );
          }
          if (data_inicio || data_fim) {
            return (
              <div className="mx-6 mt-6 p-3 bg-slate-50 border border-slate-150 rounded-2xl flex items-center gap-2 text-slate-600">
                <CalendarDays className="h-4 w-4 text-blue-600 shrink-0" />
                <span className="text-[11px] font-bold font-mono uppercase tracking-wider">
                  Período Vigente: {data_inicio ? data_inicio.split('-').reverse().join('/') : '—'} até {data_fim ? data_fim.split('-').reverse().join('/') : '—'}
                </span>
              </div>
            );
          }
          return null;
        })()}

        {/* List Header/Toolbar */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-md relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar aluno por nome ou ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 outline-none text-sm transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-slate-100 p-1.5 rounded-2xl">
              <button
                onClick={() => setActiveFilter('all')}
                className={cn(
                  "px-6 py-2 rounded-xl text-xs font-bold uppercase transition-all",
                  activeFilter === 'all' ? "bg-white text-blue-600 shadow-md" : "text-slate-500 hover:text-slate-700"
                )}
              >
                {t.common.all || 'TODOS'}
              </button>
              <button
                onClick={() => setActiveFilter('absent')}
                className={cn(
                  "px-6 py-2 rounded-xl text-xs font-bold uppercase transition-all",
                  activeFilter === 'absent' ? "bg-white text-blue-600 shadow-md" : "text-slate-500 hover:text-slate-700"
                )}
              >
                {t.attendance.absent || 'AUSENTES'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-200/50 shadow-sm">
                <span className="text-sm font-black">{totalPresent < 10 ? `0${totalPresent}` : totalPresent}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">{t.attendance.present}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-700 rounded-2xl border border-rose-200/50 shadow-sm">
                <span className="text-sm font-black">{totalAbsent < 10 ? `0${totalAbsent}` : totalAbsent}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">{t.attendance.absent}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 rounded-2xl border border-orange-200/50 shadow-sm">
                <span className="text-sm font-black">00</span>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">ATRASO</span>
              </div>
            </div>

            {!isReadOnly && (
              <button
                onClick={handleSaveAttendance}
                disabled={saving || !selectedTurma || (!isAdmin && (getTurmaPeriodStatus().isExpired || !getTurmaPeriodStatus().isValid))}
                className="flex items-center justify-center gap-3 bg-blue-900 text-white px-8 py-3.5 rounded-2xl text-sm font-black hover:bg-blue-800 transition-all shadow-xl shadow-blue-900/20 disabled:opacity-50 active:scale-95"
              >
                <Save size={20} className={cn(saving && "animate-spin")} />
                {t.attendance.saveCall || 'Salvar Chamada'}
              </button>
            )}
          </div>
        </div>

              {/* Table Area */}
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-left w-12">#</th>
                      <th className="px-8 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">{t.reportCard.student}</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">{t.students.registration || 'MATRÍCULA (ID)'}</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">ÚLTIMA PRESENÇA</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-center">STATUS DE PRESENÇA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="py-20 text-center">
                          <Loader2 size={32} className="animate-spin text-blue-600 mx-auto" />
                          <p className="mt-4 text-slate-400 font-medium">Carregando chamada...</p>
                        </td>
                      </tr>
                    ) : filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-20 text-center text-slate-400 italic text-sm">
                          {selectedTurma ? t.common.noneFound : t.attendance.selectClassMsg}
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((student, index) => (
                        <tr key={student.id} className="hover:bg-slate-50/70 transition-colors group">
                          <td className="px-4 py-4 font-mono text-xs font-bold text-slate-400 text-left">
                            {index + 1}
                          </td>
                          <td className="px-8 py-4">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-[52px] rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-[10px] border border-slate-200 shadow-sm overflow-hidden relative shrink-0">
                                {student.foto_url ? (
                                  <Image 
                                    src={student.foto_url} 
                                    alt={student.nome} 
                                    fill 
                                    className="object-cover" 
                                    referrerPolicy="no-referrer"
                                    sizes="40px"
                                  />
                                ) : (
                                  <Image 
                                    src={student.genero === 'feminino' ? femaleAvatar : maleAvatar} 
                                    alt={student.nome} 
                                    fill 
                                    className="object-cover opacity-50" 
                                    referrerPolicy="no-referrer"
                                    sizes="40px"
                                  />
                                )}
                              </div>
                              <span className="font-bold text-slate-700 group-hover:text-blue-700 transition-colors">{student.nome}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-500 font-mono">
                            {student.matricula}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                            {/* Derived or placeholder for "Last Presence" */}
                            {index % 3 === 0 ? 'Hoje, 08:30' : index % 3 === 1 ? 'Ontem, 14:15' : '05/05, 10:00'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => (isAdmin || getTurmaPeriodStatus().isValid) && !attendanceRecords[student.id]?.presente && handleToggleAttendance(student.id)}
                                disabled={(!isAdmin && !getTurmaPeriodStatus().isValid) || isReadOnly}
                                className={cn(
                                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm",
                                  attendanceRecords[student.id]?.presente 
                                    ? "bg-blue-100 text-blue-600 ring-2 ring-blue-500/20" 
                                    : "bg-slate-50 text-slate-400 hover:bg-slate-100",
                                  !isAdmin && !getTurmaPeriodStatus().isValid && "opacity-40 cursor-not-allowed"
                                )}
                                title={!isAdmin && !getTurmaPeriodStatus().isValid ? (language === 'pt' ? "Fora do Período" : "Outside Period") : "Presente"}
                              >
                                <CheckCircle2 size={20} />
                              </button>
                              <button
                                onClick={() => (isAdmin || getTurmaPeriodStatus().isValid) && attendanceRecords[student.id]?.presente && handleToggleAttendance(student.id)}
                                disabled={(!isAdmin && !getTurmaPeriodStatus().isValid) || isReadOnly}
                                className={cn(
                                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm",
                                  !attendanceRecords[student.id]?.presente 
                                    ? "bg-rose-100 text-rose-600 ring-2 ring-rose-500/20" 
                                    : "bg-slate-50 text-slate-400 hover:bg-slate-100",
                                  !isAdmin && !getTurmaPeriodStatus().isValid && "opacity-40 cursor-not-allowed"
                                )}
                                title={!isAdmin && !getTurmaPeriodStatus().isValid ? (language === 'pt' ? "Fora do Período" : "Outside Period") : "Falta"}
                              >
                                <XCircle size={20} />
                              </button>
                              <button
                                onClick={() => {
                                  if (!isAdmin && !getTurmaPeriodStatus().isValid) {
                                    toast.error(language === 'pt' ? 'O período desta turma já expirou ou é inválido. Não é permitido marcar atraso.' : 'The class period has expired or is invalid. Marking delay is not allowed.');
                                    return;
                                  }
                                  toast.info(language === 'pt' ? 'Registro de atraso não disponível no momento.' : 'Delay registration not available at this moment.');
                                }}
                                disabled={(!isAdmin && !getTurmaPeriodStatus().isValid)}
                                className={cn(
                                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-slate-50 text-slate-400 hover:bg-orange-50 hover:text-orange-600 hover:ring-2 hover:ring-orange-500/20 shadow-sm",
                                  !isAdmin && !getTurmaPeriodStatus().isValid && "opacity-40 cursor-not-allowed"
                                )}
                                title={!isAdmin && !getTurmaPeriodStatus().isValid ? (language === 'pt' ? "Fora do Período" : "Outside Period") : "Atraso"}
                              >
                                <Clock size={20} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer info */}
              <div className="p-6 border-t border-slate-100 flex items-center justify-between">
                <div className="text-sm font-medium text-slate-500">
                  Mostrando {filteredStudents.length} de {students.length} alunos
                </div>
                <div className="flex items-center gap-2">
                  <button className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors">
                    <ChevronLeft size={18} />
                  </button>
                  <div className="flex items-center gap-1">
                    <button className="w-9 h-9 rounded-lg bg-blue-900 text-white font-bold text-sm">1</button>
                    <button className="w-9 h-9 rounded-lg hover:bg-slate-50 text-slate-500 font-bold text-sm">2</button>
                    <button className="w-9 h-9 rounded-lg hover:bg-slate-50 text-slate-500 font-bold text-sm">3</button>
                  </div>
                  <button className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors">
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="map"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="flex flex-col xl:flex-row items-center justify-between gap-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all">
              <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                <button
                  onClick={() => {
                    if (mapGranularity === 'week') setCurrentMapDate(subWeeks(currentMapDate, 1));
                    else if (mapGranularity === 'year') setCurrentMapDate(subMonths(currentMapDate, 12));
                    else setCurrentMapDate(subMonths(currentMapDate, 1));
                  }}
                  className="p-2.5 hover:bg-white hover:text-blue-600 hover:shadow-sm rounded-xl transition-all text-slate-500"
                >
                  <ChevronLeft size={20} strokeWidth={2.5} />
                </button>
                <div className="text-center min-w-[220px]">
                  <h2 className="text-xl font-black text-slate-900 capitalize tracking-tight">
                    {mapGranularity === 'week' ? (
                      `Semana de ${format(startOfWeek(currentMapDate, { weekStartsOn: 1 }), 'dd/MM')}`
                    ) : mapGranularity === 'year' ? (
                      format(currentMapDate, 'yyyy')
                    ) : (
                      format(currentMapDate, 'MMMM yyyy', { locale: dateLocale })
                    )}
                  </h2>
                </div>
                <button
                  onClick={() => {
                    if (mapGranularity === 'week') setCurrentMapDate(addWeeks(currentMapDate, 1));
                    else if (mapGranularity === 'year') setCurrentMapDate(addMonths(currentMapDate, 12));
                    else setCurrentMapDate(addMonths(currentMapDate, 1));
                  }}
                  className="p-2.5 hover:bg-white hover:text-blue-600 hover:shadow-sm rounded-xl transition-all text-slate-500"
                >
                  <ChevronRight size={20} strokeWidth={2.5} />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
                  <button
                    onClick={() => setMapGranularity('week')}
                    className={cn(
                      "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all",
                      mapGranularity === 'week' ? "bg-white text-blue-600 shadow-md" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <Calendar size={16} />
                    SEMANA
                  </button>
                  <button
                    onClick={() => setMapGranularity('month')}
                    className={cn(
                      "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all",
                      mapGranularity === 'month' ? "bg-white text-blue-600 shadow-md" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <LayoutGrid size={16} />
                    MÊS
                  </button>
                  <button
                    onClick={() => setMapGranularity('year')}
                    className={cn(
                      "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all",
                      mapGranularity === 'year' ? "bg-white text-blue-600 shadow-md" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <BarChart3 size={16} />
                    ANO
                  </button>
                </div>

                <div className="hidden sm:flex items-center gap-2">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
                    Presente
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 text-rose-700 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-rose-100">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm" />
                    Falta
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="sticky left-0 z-20 bg-slate-50 p-6 min-w-[240px] text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] text-left">
                        ALUNO
                      </th>
                      {mapGranularity === 'year' ? (
                        eachMonthOfInterval({
                          start: startOfYear(currentMapDate),
                          end: endOfYear(currentMapDate)
                        }).map(month => (
                          <th 
                            key={month.toString()} 
                            className="p-4 min-w-[80px] text-center text-[10px] font-black text-slate-500 uppercase tracking-widest border-l border-slate-100"
                          >
                            {format(month, 'MMM', { locale: dateLocale })}
                          </th>
                        ))
                      ) : (
                        eachDayOfInterval({
                          start: mapGranularity === 'week' ? startOfWeek(currentMapDate, { weekStartsOn: 1 }) : startOfMonth(currentMapDate),
                          end: mapGranularity === 'week' ? endOfWeek(currentMapDate, { weekStartsOn: 1 }) : endOfMonth(currentMapDate)
                        }).map(day => (
                          <th 
                            key={day.toString()} 
                            className={cn(
                              "p-3 min-w-[50px] text-center transition-colors border-l border-slate-100",
                              [0, 6].includes(day.getDay()) ? "bg-slate-100/50 text-slate-400" : "text-slate-500"
                            )}
                          >
                            <div className="text-[9px] font-bold opacity-60 uppercase mb-1">{format(day, 'EEE', { locale: dateLocale })}</div>
                            <div className="text-sm font-black">{format(day, 'dd')}</div>
                          </th>
                        ))
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map(student => (
                      <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="sticky left-0 z-10 bg-white p-6 font-black text-slate-700 border-r border-slate-100 group-hover:text-blue-700 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                              {student.nome.substring(0, 2).toUpperCase()}
                            </div>
                            {student.nome}
                          </div>
                        </td>
                        {mapGranularity === 'year' ? (
                          eachMonthOfInterval({
                            start: startOfYear(currentMapDate),
                            end: endOfYear(currentMapDate)
                          }).map(month => {
                            const monthRecords = mapData.filter(r => 
                              r.aluno_id === student.id && 
                              isSameMonth(new Date(r.data), month)
                            );
                            
                            const presentCount = monthRecords.filter(r => r.presente).length;
                            const totalDays = monthRecords.length;
                            const rate = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : null;

                            return (
                              <td 
                                key={month.toString()} 
                                className="p-2 border-l border-slate-50 text-center"
                              >
                                {rate !== null ? (
                                  <div className={cn(
                                    "px-2 py-1 rounded-lg text-[11px] font-black tracking-tight mx-auto w-fit",
                                    rate >= 75 ? "bg-emerald-50 text-emerald-700" : rate >= 50 ? "bg-orange-50 text-orange-700" : "bg-rose-50 text-rose-700"
                                  )}>
                                    {rate}%
                                  </div>
                                ) : (
                                  <div className="w-1.5 h-1.5 rounded-full bg-slate-200 mx-auto" />
                                )}
                              </td>
                            );
                          })
                        ) : (
                          eachDayOfInterval({
                            start: mapGranularity === 'week' ? startOfWeek(currentMapDate, { weekStartsOn: 1 }) : startOfMonth(currentMapDate),
                            end: mapGranularity === 'week' ? endOfWeek(currentMapDate, { weekStartsOn: 1 }) : endOfMonth(currentMapDate)
                          }).map(day => {
                            const dayStr = format(day, 'yyyy-MM-dd');
                            const rec = mapData.find(r => {
                              if (!r.data) return false;
                              const dbDateStr = typeof r.data === 'string' ? r.data.substring(0, 10) : format(new Date(r.data), 'yyyy-MM-dd');
                              return r.aluno_id === student.id && dbDateStr === dayStr;
                            });
                            const isWeekend = [0, 6].includes(day.getDay());
                            
                            return (
                              <td 
                                key={day.toString()} 
                                className={cn(
                                  "p-0 border-l border-slate-50 cursor-pointer transition-all hover:bg-blue-50/50",
                                  isWeekend && "bg-slate-50/30",
                                  isReadOnly && "cursor-not-allowed opacity-80"
                                )}
                                title={isReadOnly ? (language === 'pt' ? "Apenas visualização" : "View only") : (language === 'pt' ? "Clique para alternar presença" : "Click to toggle attendance")}
                                onClick={() => {
                                  if (isReadOnly) return;
                                  handleToggleMapAttendance(student.id, dayStr, rec);
                                }}
                              >
                                <div className="w-full h-14 flex items-center justify-center">
                                  {rec ? (
                                    rec.presente ? (
                                      <motion.div 
                                        initial={{ scale: 0.5, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm"
                                      >
                                        <CheckCircle2 size={16} strokeWidth={3} />
                                      </motion.div>
                                    ) : (
                                      <motion.div 
                                        initial={{ scale: 0.5, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shadow-sm"
                                      >
                                        <XCircle size={16} strokeWidth={3} />
                                      </motion.div>
                                    )
                                  ) : (
                                    !isWeekend && <div className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-slate-300 transition-colors" />
                                  )}
                                </div>
                              </td>
                            );
                          })
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
