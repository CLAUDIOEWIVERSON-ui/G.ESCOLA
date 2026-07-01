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
  ShieldAlert,
  Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import maleAvatar from '@/src/assets/images/avatar_male_1778977230783.png';
import femaleAvatar from '@/src/assets/images/avatar_female_1778977246051.png';
import militaryMaleAvatar from '@/src/assets/images/avatar_military_male_1779964887322.png';
import militaryFemaleAvatar from '@/src/assets/images/avatar_military_female_1779964903107.png';
import navalMissionLogo from '@/src/assets/images/regenerated_image_1782409801823.png';
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
  isSameMonth,
  isWeekend
} from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';

// Helper to fetch Brazil holidays (Simplified for this version)
const BRAZIL_HOLIDAYS = [
  { date: "2026-01-01", name: "Confraternização Universal" },
  { date: "2026-02-17", name: "Carnaval" },
  { date: "2026-04-03", name: "Sexta-feira Santa" },
  { date: "2026-04-21", name: "Tiradentes" },
  { date: "2026-05-01", name: "Dia do Trabalho" },
  { date: "2026-06-04", name: "Corpus Christi" },
  { date: "2026-09-07", name: "Independência do Brasil" },
  { date: "2026-10-12", name: "Nossa Senhora Aparecida" },
  { date: "2026-11-02", name: "Finados" },
  { date: "2026-11-15", name: "Proclamação da República" },
  { date: "2026-12-25", name: "Natal" },
];

const isHoliday = (date: Date) => {
  const dStr = format(date, "yyyy-MM-dd");
  return BRAZIL_HOLIDAYS.find((h) => h.date === dStr);
};

export default function FrequenciaPage() {
  const { t, language } = useI18n();
  const { profile, isAdmin, isInstrutor, isConvidado } = useUser();
  const isReadOnly = isConvidado || (!isAdmin && !isInstrutor);
  const dateLocale = language === 'pt' ? ptBR : enUS;

  const [loading, setLoading] = useState(false);
  const [mapGranularity, setMapGranularity] = useState<'week' | 'month' | 'year'>('month');
  
  const [cursos, setCursos] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [disciplinas, setDisciplinas] = useState<any[]>([]);
  
  const [selectedCurso, setSelectedCurso] = useState('');
  const [selectedTurma, setSelectedTurma] = useState('');
  const selectedDisciplina = '';
  const [currentMapDate, setCurrentMapDate] = useState(new Date());

  const [students, setStudents] = useState<any[]>([]);
  const [mapData, setMapData] = useState<any[]>([]);
  const [activeCell, setActiveCell] = useState<{ studentId: string; dayStr: string } | null>(null);

  const activeTurma = turmas.find(t => t.id === selectedTurma);

  useEffect(() => {
    if (activeTurma?.data_inicio) {
      const [year, month, day] = activeTurma.data_inicio.split('-').map(Number);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentMapDate(new Date(year, month - 1, day));
    }
  }, [selectedTurma, activeTurma?.data_inicio]);

  const getFilteredDays = useCallback((days: Date[]) => {
    if (!activeTurma) return days;
    const effectiveEndDate = activeTurma.data_postergacao || activeTurma.data_fim;
    return days.filter(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      if (activeTurma.data_inicio && dayStr < activeTurma.data_inicio) {
        return false;
      }
      if (effectiveEndDate && dayStr > effectiveEndDate) {
        return false;
      }
      return true;
    });
  }, [activeTurma]);

  const getFilteredMonths = useCallback((months: Date[]) => {
    if (!activeTurma) return months;
    const effectiveEndDate = activeTurma.data_postergacao || activeTurma.data_fim;
    return months.filter(month => {
      const monthStartStr = format(startOfMonth(month), 'yyyy-MM-dd');
      const monthEndStr = format(endOfMonth(month), 'yyyy-MM-dd');
      
      if (activeTurma.data_inicio && monthEndStr < activeTurma.data_inicio) {
        return false;
      }
      if (effectiveEndDate && monthStartStr > effectiveEndDate) {
        return false;
      }
      return true;
    });
  }, [activeTurma]);

  const canNavigateLeft = useCallback(() => {
    if (!activeTurma) return true;
    if (!activeTurma.data_inicio) return true;
    
    let targetDate: Date;
    if (mapGranularity === 'week') targetDate = subWeeks(currentMapDate, 1);
    else if (mapGranularity === 'year') targetDate = subMonths(currentMapDate, 12);
    else targetDate = subMonths(currentMapDate, 1);
    
    let targetEnd: Date;
    if (mapGranularity === 'week') targetEnd = endOfWeek(targetDate, { weekStartsOn: 1 });
    else if (mapGranularity === 'year') targetEnd = endOfYear(targetDate);
    else targetEnd = endOfMonth(targetDate);
    
    const targetEndStr = format(targetEnd, 'yyyy-MM-dd');
    return targetEndStr >= activeTurma.data_inicio;
  }, [activeTurma, currentMapDate, mapGranularity]);

  const canNavigateRight = useCallback(() => {
    if (!activeTurma) return true;
    const effectiveEndDate = activeTurma.data_postergacao || activeTurma.data_fim;
    if (!effectiveEndDate) return true;
    
    let targetDate: Date;
    if (mapGranularity === 'week') targetDate = addWeeks(currentMapDate, 1);
    else if (mapGranularity === 'year') targetDate = addMonths(currentMapDate, 12);
    else targetDate = addMonths(currentMapDate, 1);
    
    let targetStart: Date;
    if (mapGranularity === 'week') targetStart = startOfWeek(targetDate, { weekStartsOn: 1 });
    else if (mapGranularity === 'year') targetStart = startOfYear(targetDate);
    else targetStart = startOfMonth(targetDate);
    
    const targetStartStr = format(targetStart, 'yyyy-MM-dd');
    return targetStartStr <= effectiveEndDate;
  }, [activeTurma, currentMapDate, mapGranularity]);

  const fetchAttendance = useCallback(async () => {
    if (!selectedTurma) {
      setStudents([]);
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
    } catch (err: any) {
      console.error('Error fetching attendance:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedTurma, selectedDisciplina, currentMapDate, mapGranularity]);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      if (isMounted) await fetchAttendance();
    };
    loadData();
    return () => { isMounted = false; };
  }, [fetchAttendance]);

  const handleToggleMapAttendance = async (studentId: string, dayStr: string, status: 'P' | 'F' | 'FJ' | 'A' | 'D' | null) => {
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

    const toastId = toast.loading(language === 'pt' ? 'Atualizando presença...' : 'Updating attendance...');
    try {
      console.log('handleToggleMapAttendance details:', {
        studentId,
        selectedTurma,
        selectedDisciplina,
        dayStr,
        status,
        isAdmin,
        isReadOnly
      });

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
      if (deleteError) {
        console.error('Delete error in handleToggleMapAttendance:', deleteError);
        throw deleteError;
      }

      let insertedData: any[] | null = null;

      if (status !== null) {
        // Insert new record
        const recordToInsert = {
          aluno_id: studentId,
          turma_id: selectedTurma,
          disciplina_id: selectedDisciplina || null,
          data: dayStr,
          presente: status === 'P' || status === 'A' || status === 'D',
          observacao: status === 'P' || status === 'F' ? null : status
        };

        console.log('Inserting frequency record:', recordToInsert);

        const { data, error: insertError } = await supabase
          .from('frequencia')
          .insert([recordToInsert])
          .select();

        if (insertError) {
          console.error('Insert error in handleToggleMapAttendance:', {
            code: insertError.code,
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint
          });
          throw new Error(insertError.message || `${insertError.code}: ${insertError.details}`);
        }
        insertedData = data;
      }

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

      toast.success(language === 'pt' ? 'Presença updated!' : 'Attendance updated!', { id: toastId });
    } catch (err: any) {
      console.error('Error updating map attendance:', err);
      const errMsg = err.message || err.details || JSON.stringify(err);
      if (errMsg.toLowerCase().includes('observacao') || errMsg.toLowerCase().includes('schema cache')) {
        toast.error(
          language === 'pt' 
            ? 'Erro de banco de dados: A coluna "observacao" está ausente na tabela "frequencia". Por favor, execute a migração "50_add_observacao_to_frequencia.sql" na guia de Configurações ou no painel do Supabase para corrigir isso.' 
            : 'Database error: The "observacao" column is missing from the "frequencia" table. Please execute the migration "50_add_observacao_to_frequencia.sql" in the Settings tab or Supabase panel to resolve this.', 
          { id: toastId, duration: 8000 }
        );
      } else {
        toast.error(`${language === 'pt' ? 'Erro ao atualizar presença: ' : 'Error updating attendance: '}${errMsg}`, { id: toastId });
      }
    }
  };

  const handleMarkAllPresent = async (dayStr: string) => {
    if (isReadOnly) return;
    if (!selectedTurma) return;
    if (students.length === 0) {
      toast.error(language === 'pt' ? 'Nenhum aluno nesta turma para marcar presença.' : 'No students in this class to mark attendance.');
      return;
    }

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

    const toastId = toast.loading(language === 'pt' ? 'Registrando presença para todos...' : 'Registering attendance for all...');
    try {
      // Delete any pre-existing records for this day for this turma
      let deleteQuery = supabase
        .from('frequencia')
        .delete()
        .eq('turma_id', selectedTurma)
        .eq('data', dayStr);

      if (selectedDisciplina) {
        deleteQuery = deleteQuery.eq('disciplina_id', selectedDisciplina);
      } else {
        deleteQuery = deleteQuery.is('disciplina_id', null);
      }

      const { error: deleteError } = await deleteQuery;
      if (deleteError) throw deleteError;

      // Prepare records for all students
      const recordsToInsert = students.map(student => ({
        aluno_id: student.id,
        turma_id: selectedTurma,
        disciplina_id: selectedDisciplina || null,
        data: dayStr,
        presente: true,
        observacao: null
      }));

      const { data: insertedData, error: insertError } = await supabase
        .from('frequencia')
        .insert(recordsToInsert)
        .select();

      if (insertError) throw insertError;

      // Update local state
      setMapData(prev => {
        const filtered = prev.filter(r => {
          const rDate = typeof r.data === 'string' ? r.data.substring(0, 10) : format(new Date(r.data), 'yyyy-MM-dd');
          const rDis = r.disciplina_id || null;
          const selDis = selectedDisciplina || null;
          return !(rDate === dayStr && rDis === selDis);
        });
        if (insertedData) {
          return [...filtered, ...insertedData];
        }
        return filtered;
      });

      toast.success(language === 'pt' ? 'Presença registrada para todos os alunos!' : 'Attendance registered for all students!', { id: toastId });
    } catch (err: any) {
      console.error('Error marking all present:', err);
      toast.error(`${language === 'pt' ? 'Erro ao registrar presença geral: ' : 'Error registering bulk attendance: '}${err.message || JSON.stringify(err)}`, { id: toastId });
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

      const { data: turmasData } = await supabase.from('turmas').select('id, nome, curso_id, internacional, data_inicio, data_fim, data_postergacao, grupo_responsavel').is('deleted_at', null).order('nome');
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

  const activeStudent = activeCell ? students.find(s => s.id === activeCell.studentId) : null;
  const activeDateFormatted = activeCell ? (() => {
    try {
      const [year, month, day] = activeCell.dayStr.split('-');
      return `${day}/${month}/${year}`;
    } catch (e) {
      return activeCell.dayStr;
    }
  })() : '';

  const presencePercentage = (() => {
    if (!students || students.length === 0 || !mapData || mapData.length === 0) return 0;
    const presentRecords = mapData.filter(r => r.presente).length;
    return Math.round((presentRecords / mapData.length) * 100);
  })();

  return (
    <div className="space-y-6 pb-20 max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className="hover:text-blue-600 cursor-pointer transition-colors">{t.nav.courses}</span>
          <span className="text-slate-300">›</span>
          <span className="font-medium text-slate-900">{t.attendance.title}</span>
        </div>
      </div>

      {/* Selection Card */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 print:hidden">
        <div className="md:col-span-12 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
            TURMA
          </label>
          <div className="relative group">
            <select
              value={selectedTurma}
              onChange={(e) => setSelectedTurma(e.target.value)}
              className="w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none text-base font-semibold appearance-none transition-all cursor-pointer group-hover:bg-slate-50 text-slate-700"
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
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key="map"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          <div className="flex flex-col xl:flex-row items-center justify-between gap-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all print:hidden">
              <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    if (!canNavigateLeft()) return;
                    if (mapGranularity === 'week') setCurrentMapDate(subWeeks(currentMapDate, 1));
                    else if (mapGranularity === 'year') setCurrentMapDate(subMonths(currentMapDate, 12));
                    else setCurrentMapDate(subMonths(currentMapDate, 1));
                  }}
                  disabled={!canNavigateLeft()}
                  className={cn(
                    "p-2.5 rounded-xl transition-all",
                    canNavigateLeft() 
                      ? "hover:bg-white hover:text-blue-600 hover:shadow-sm text-slate-500 cursor-pointer" 
                      : "text-slate-350 opacity-40 cursor-not-allowed"
                  )}
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
                  type="button"
                  onClick={() => {
                    if (!canNavigateRight()) return;
                    if (mapGranularity === 'week') setCurrentMapDate(addWeeks(currentMapDate, 1));
                    else if (mapGranularity === 'year') setCurrentMapDate(addMonths(currentMapDate, 12));
                    else setCurrentMapDate(addMonths(currentMapDate, 1));
                  }}
                  disabled={!canNavigateRight()}
                  className={cn(
                    "p-2.5 rounded-xl transition-all",
                    canNavigateRight() 
                      ? "hover:bg-white hover:text-blue-600 hover:shadow-sm text-slate-500 cursor-pointer" 
                      : "text-slate-350 opacity-40 cursor-not-allowed"
                  )}
                >
                  <ChevronRight size={20} strokeWidth={2.5} />
                </button>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-900/10 transition-all cursor-pointer select-none active:scale-95 shrink-0"
                >
                  <Printer size={16} />
                  {language === 'pt' ? 'IMPRIMIR' : 'PRINT'}
                </button>

                <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
                  <button
                    type="button"
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
                    type="button"
                    onClick={() => setMapGranularity('month')}
                    className={cn(
                      "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all",
                      mapGranularity === 'month' ? "bg-white text-blue-600 shadow-md" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <LayoutGrid size={16} />
                    MÊS
                  </button>
                </div>

                {activeTurma?.data_inicio && (
                  <div className="hidden sm:flex items-center gap-2">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-blue-100">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm" />
                      Início das Aulas
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div 
              id="frequency-print-area"
              className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 p-6 md:p-8 relative overflow-hidden"
            >
              {/* Elegant Header Block for Screen Display & Official Print Layouts */}
              <div className="mb-6 border-b border-slate-200 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {(mapGranularity === 'week' || mapGranularity === 'month') ? (
                    <div className="relative w-16 h-16 shrink-0 flex items-center justify-center overflow-hidden bg-white border border-slate-200 rounded-xl p-1 shadow-sm print:hidden">
                      <Image
                        src={navalMissionLogo}
                        alt="Logo Missão de Assessoria Naval"
                        fill
                        className="object-contain"
                        referrerPolicy="no-referrer"
                        sizes="64px"
                        priority
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100 shrink-0">
                      <span className="text-sm font-black text-blue-700">
                        {activeTurma?.nome ? activeTurma.nome.substring(0, 3).toUpperCase() : 'SG'}
                      </span>
                    </div>
                  )}
                  <div>
                    <h3 className="text-[10px] font-black text-blue-700 uppercase tracking-widest font-mono">
                      {language === 'pt' ? 'Sistema de Gestão de Frequência' : 'Attendance Management System'}
                    </h3>
                    <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight mt-0.5">
                      {mapGranularity === 'week' 
                        ? (language === 'pt' ? 'Folha de Frequência Semanal' : 'Weekly Attendance Sheet')
                        : mapGranularity === 'year'
                          ? (language === 'pt' ? 'Mapa de Frequência Anual' : 'Annual Attendance Map')
                          : (language === 'pt' ? 'Folha de Frequência Mensal' : 'Monthly Attendance Sheet')
                      }
                    </h1>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">
                      {mapGranularity === 'week' ? (
                        `Semana de ${format(startOfWeek(currentMapDate, { weekStartsOn: 1 }), 'dd/MM/yyyy')} a ${format(endOfWeek(currentMapDate, { weekStartsOn: 1 }), 'dd/MM/yyyy')}`
                      ) : mapGranularity === 'year' ? (
                        `Ano Letivo ${format(currentMapDate, 'yyyy')}`
                      ) : (
                        `Mês de ${format(currentMapDate, 'MMMM yyyy', { locale: dateLocale })}`
                      )}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-wrap items-center gap-4 text-xs">
                  <div>
                    <span className="block opacity-65 font-bold uppercase text-[9px] tracking-wider text-slate-400">{language === 'pt' ? 'CURSO' : 'COURSE'}</span>
                    <span className="font-bold text-slate-700">
                      {cursos.find(c => c.id === selectedCurso)?.nome || t.common.all || 'Todos'}
                    </span>
                  </div>
                  <div className="border-l border-slate-200 h-6 shrink-0" />
                  <div>
                    <span className="block opacity-65 font-bold uppercase text-[9px] tracking-wider text-slate-400">{language === 'pt' ? 'TURMA' : 'CLASS'}</span>
                    <span className="font-bold text-slate-700 font-mono">
                      {activeTurma?.nome || (language === 'pt' ? 'Todas' : 'All')}
                    </span>
                  </div>
                  <div className="border-l border-slate-200 h-6 shrink-0" />
                  <div>
                    <span className="block opacity-65 font-bold uppercase text-[9px] tracking-wider text-slate-400">{language === 'pt' ? 'ALUNOS' : 'STUDENTS'}</span>
                    <span className="font-bold text-slate-700 font-mono">
                      {students.length} {language === 'pt' ? 'Ativos' : 'Active'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dynamic CSS tag to style printing depending on current view constraints */}
              <style dangerouslySetInnerHTML={{ __html: `
                /* Presentation styles for screen (before printing) */
                #frequency-print-area {
                  background-color: #ffffff !important;
                  border: 1px solid #cbd5e1 !important;
                }
                
                #frequency-print-area table {
                  border-collapse: collapse !important;
                  width: 100% !important;
                  border: 1px solid #cbd5e1 !important;
                }
                
                #frequency-print-area th {
                  border: 1px solid #cbd5e1 !important;
                  background-color: #f8fafc !important;
                  color: #334155 !important;
                  font-weight: 850 !important;
                }
                
                #frequency-print-area td {
                  border: 1px solid #cbd5e1 !important;
                }
                
                /* Ensure sticky column has a highly prominent grey right border on screen */
                #frequency-print-area th.sticky, 
                #frequency-print-area td.sticky {
                  position: sticky !important;
                  left: 0 !important;
                  background-color: #ffffff !important;
                  border-right: 2px solid #94a3b8 !important;
                  z-index: 10 !important;
                }
                #frequency-print-area th.sticky {
                  background-color: #f8fafc !important;
                  z-index: 20 !important;
                }

                @media print {
                  /* Reset page context and force standard white/black print output */
                  html, body {
                    margin: 0 !important;
                    padding: 0 !important;
                    background: #ffffff !important;
                    color: #000000 !important;
                    width: 100% !important;
                    height: auto !important;
                    min-height: auto !important;
                    overflow: visible !important;
                  }

                  /* Hide headers, footers, mobile bottom-navs, back buttons, filters, etc. completely from DOM layout flow */
                  header, nav, aside, footer, button, .print\:hidden, [role="dialog"], [role="group"] {
                    display: none !important;
                    width: 0 !important;
                    height: 0 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    overflow: hidden !important;
                  }
                  
                  /* Collapse only major layout wrappers to prevent overflow, preserving nested elements */
                  html, body, main, .min-h-screen, #__next, .flex-1, [data-framer-portal-container] {
                    position: static !important;
                    width: 100% !important;
                    height: auto !important;
                    min-height: 0 !important;
                    max-height: none !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    box-shadow: none !important;
                    border: none !important;
                    transform: none !important;
                    overflow: visible !important;
                    background: transparent !important;
                    animation: none !important;
                    transition: none !important;
                    opacity: 1 !important;
                  }

                  body * {
                    visibility: hidden !important;
                  }
                  
                  #frequency-print-area, #frequency-print-area * {
                    visibility: visible !important;
                  }

                  /* Collapse all elements except the printable area and its descendants */
                  *:not(#frequency-print-area):not(#frequency-print-area *) {
                    height: 0 !important;
                    min-height: 0 !important;
                    max-height: 0 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    border: none !important;
                    box-shadow: none !important;
                    overflow: visible !important;
                  }
                  
                  /* Standard relative flow starting at 0,0 of physical page 1 */
                  #frequency-print-area {
                    visibility: visible !important;
                    position: relative !important;
                    width: ${mapGranularity === 'week' ? '190mm' : '277mm'} !important;
                    max-width: ${mapGranularity === 'week' ? '190mm' : '277mm'} !important;
                    height: auto !important;
                    min-height: auto !important;
                    overflow: visible !important;
                    padding: 0 !important;
                    margin: 0 auto !important;
                    box-shadow: none !important;
                    border: none !important;
                    background: #ffffff !important;
                    color: #000000 !important;
                    display: block !important;
                    page-break-inside: auto !important;
                    box-sizing: border-box !important;
                  }

                  #frequency-print-area table {
                    page-break-inside: auto !important;
                  }

                  #frequency-print-area tr {
                    page-break-inside: avoid !important;
                    page-break-after: auto !important;
                  }

                  #frequency-print-area thead {
                    display: table-header-group !important;
                  }

                  /* Overwrite global generic flex flattener for our specialized print contents */
                  #frequency-print-area .flex {
                    display: flex !important;
                  }
                  #frequency-print-area .flex-row {
                    flex-direction: row !important;
                  }
                  #frequency-print-area .flex-col {
                    flex-direction: column !important;
                  }
                  #frequency-print-area .items-center {
                    align-items: center !important;
                  }
                  #frequency-print-area .justify-between {
                    justify-content: space-between !important;
                  }
                  #frequency-print-area .justify-center {
                    justify-content: center !important;
                  }
                  #frequency-print-area .grid {
                    display: grid !important;
                  }
                  #frequency-print-area .grid-cols-2 {
                    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                  }
                  #frequency-print-area .gap-10 {
                    gap: 40px !important;
                  }

                  #frequency-print-area th, 
                  #frequency-print-area td {
                    border: 1px solid #1e293b !important;
                    color: #000000 !important;
                    padding: 3px 4px !important;
                    font-size: 9px !important;
                    background-color: #ffffff !important;
                    -webkit-print-color-adjust: exact !important;
                    color-adjust: exact !important;
                    height: auto !important;
                  }
                  
                  #frequency-print-area td .w-full.h-14 {
                    height: 20px !important;
                  }

                  #frequency-print-area th {
                    padding: 4px 4px !important;
                    font-size: 8px !important;
                    background-color: #f1f5f9 !important;
                  }
                  
                  #frequency-print-area .overflow-x-auto {
                    overflow: visible !important;
                  }

                  #frequency-print-area .mt-8 {
                    margin-top: 14px !important;
                  }
                  
                  #frequency-print-area .pt-6 {
                    padding-top: 10px !important;
                  }

                  #frequency-print-area .w-56 {
                    width: 150px !important;
                  }
                  
                  #frequency-print-area td.sticky, 
                  #frequency-print-area th.sticky {
                    position: static !important;
                    background-color: #ffffff !important;
                    border-right: 1px solid #1e293b !important;
                  }
                }
                
                @page {
                  size: ${mapGranularity === 'week' ? 'A4 portrait' : 'A4 landscape'};
                  margin: 10mm 10mm 10mm 10mm;
                }
              `}} />

              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="sticky left-0 z-20 bg-slate-50 p-4 min-w-[240px] text-[11px] font-black text-slate-500 uppercase tracking-wider text-left border border-slate-200">
                        ALUNO
                      </th>
                      {mapGranularity === 'year' ? (
                        getFilteredMonths(eachMonthOfInterval({
                          start: startOfYear(currentMapDate),
                          end: endOfYear(currentMapDate)
                        })).map(month => (
                          <th 
                            key={month.toString()} 
                            className="p-4 min-w-[80px] text-center text-[10px] font-black text-slate-500 uppercase tracking-widest border border-slate-200 bg-slate-50"
                          >
                            {format(month, 'MMM', { locale: dateLocale })}
                          </th>
                        ))
                      ) : (
                        getFilteredDays(eachDayOfInterval({
                          start: mapGranularity === 'week' ? startOfWeek(currentMapDate, { weekStartsOn: 1 }) : startOfMonth(currentMapDate),
                          end: mapGranularity === 'week' ? endOfWeek(currentMapDate, { weekStartsOn: 1 }) : endOfMonth(currentMapDate)
                        })).map(day => {
                          const dayStr = format(day, 'yyyy-MM-dd');
                          const isStartDay = activeTurma?.data_inicio && dayStr === activeTurma.data_inicio;
                          const holiday = isHoliday(day);
                          const isWk = isWeekend(day);
                          
                          return (
                            <th 
                              key={day.toString()} 
                              className={cn(
                                "p-2 min-w-[50px] text-center transition-colors border border-slate-200 relative",
                                isStartDay ? "bg-blue-50/70 border-b-2 border-b-blue-500 font-bold" : "",
                                holiday ? "bg-rose-100/80 text-rose-800 border-rose-300 font-black" : 
                                isWk ? "bg-slate-100/80 text-slate-500 font-semibold" : "bg-slate-50 text-slate-600"
                              )}
                              title={holiday ? (language === 'pt' ? 'Feriado: ' : 'Holiday: ') + holiday.name : undefined}
                            >
                              <div className={cn(
                                "text-[8px] font-bold opacity-75 uppercase mb-0.5",
                                holiday ? "text-rose-700 font-extrabold" : ""
                              )}>
                                {format(day, 'EEE', { locale: dateLocale })}
                              </div>
                              <div className="text-xs font-black flex flex-col items-center justify-center">
                                <span className={cn(
                                  holiday ? "text-rose-800 text-[13px]" : ""
                                )}>{format(day, 'dd')}</span>
                                {isStartDay && (
                                  <span className="mt-0.5 block mx-auto text-[6px] leading-none font-bold bg-blue-100 text-blue-800 px-0.5 py-0.2 rounded uppercase tracking-wider font-mono scale-90 whitespace-nowrap">
                                    Início
                                  </span>
                                )}
                                {holiday && (
                                  <span className="mt-0.5 block mx-auto text-[6px] leading-none font-extrabold bg-rose-200 text-rose-800 px-0.5 py-0.2 rounded uppercase tracking-wider font-mono scale-90 whitespace-nowrap">
                                    Feriado
                                  </span>
                                )}
                                {!isReadOnly && selectedTurma && students.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm(language === 'pt' ? `Deseja marcar PRESENÇA para TODOS os alunos no dia ${format(day, 'dd/MM/yyyy')}?` : `Mark PRESENCE for ALL students on ${format(day, 'dd/MM/yyyy')}?`)) {
                                        handleMarkAllPresent(dayStr);
                                      }
                                    }}
                                    className="mt-1.5 p-1 rounded-md bg-emerald-50 hover:bg-emerald-500 hover:text-white text-emerald-600 border border-emerald-100 hover:border-emerald-600 transition-all cursor-pointer shadow-xs print:hidden"
                                    title={language === 'pt' ? 'Presença Automática (Todos)' : 'Automatic Presence (All)'}
                                  >
                                    <ListChecks className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </th>
                          );
                        })
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.length === 0 ? (
                      <tr>
                        <td 
                          colSpan={
                            1 + (mapGranularity === 'year' 
                              ? getFilteredMonths(eachMonthOfInterval({ start: startOfYear(currentMapDate), end: endOfYear(currentMapDate) })).length
                              : getFilteredDays(eachDayOfInterval({
                                  start: mapGranularity === 'week' ? startOfWeek(currentMapDate, { weekStartsOn: 1 }) : startOfMonth(currentMapDate),
                                  end: mapGranularity === 'week' ? endOfWeek(currentMapDate, { weekStartsOn: 1 }) : endOfMonth(currentMapDate)
                                })).length
                            )
                          } 
                          className="py-20 text-center text-slate-400 font-bold bg-white text-base"
                        >
                          {selectedTurma 
                            ? (language === 'pt' ? 'Nenhum aluno cadastrado nesta turma.' : 'No students registered in this class.')
                            : (language === 'pt' ? 'Por favor, selecione uma turma acima para carregar o Mapa de Frequência.' : 'Please select a class above to load the Attendance Map.')
                          }
                        </td>
                      </tr>
                    ) : (
                      students.map(student => (
                      <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="sticky left-0 z-10 bg-white p-4 font-bold text-slate-700 border border-slate-200 group-hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all shrink-0 print:hidden">
                              {student.nome.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="truncate max-w-[180px] print:max-w-none print:whitespace-normal print:text-[10px]">{student.nome}</span>
                          </div>
                        </td>
                        {getFilteredDays(eachDayOfInterval({
                          start: mapGranularity === 'week' ? startOfWeek(currentMapDate, { weekStartsOn: 1 }) : startOfMonth(currentMapDate),
                          end: mapGranularity === 'week' ? endOfWeek(currentMapDate, { weekStartsOn: 1 }) : endOfMonth(currentMapDate)
                        })).map(day => {
                          const dayStr = format(day, 'yyyy-MM-dd');
                          const rec = mapData.find(r => {
                            if (!r.data) return false;
                            const dbDateStr = typeof r.data === 'string' ? r.data.substring(0, 10) : format(new Date(r.data), 'yyyy-MM-dd');
                            return r.aluno_id === student.id && dbDateStr === dayStr;
                          });
                          
                          const isWk = isWeekend(day);
                          const holiday = isHoliday(day);
                          const isStartDay = activeTurma?.data_inicio && dayStr === activeTurma.data_inicio;
                          const status = rec ? (rec.observacao || (rec.presente ? 'P' : 'F')) : null;
                          
                          return (
                            <td 
                              key={day.toString()} 
                              className={cn(
                                "p-1 border border-slate-200 cursor-pointer transition-all hover:bg-blue-50/50 relative text-center min-w-[42px] h-12 print:h-8",
                                holiday ? "bg-rose-50/30" : isWk ? "bg-slate-100/30" : "bg-white",
                                isStartDay && "bg-blue-50/20",
                                isReadOnly && "cursor-not-allowed opacity-80"
                              )}
                              title={
                                isReadOnly 
                                  ? (language === 'pt' ? "Apenas visualização" : "View only") 
                                  : holiday 
                                    ? (language === 'pt' ? 'Feriado: ' : 'Holiday: ') + holiday.name
                                    : (language === 'pt' ? "Clique para gerenciar presença" : "Click to manage attendance")
                              }
                              onClick={() => {
                                if (isReadOnly) return;
                                if (activeCell?.studentId === student.id && activeCell?.dayStr === dayStr) {
                                  setActiveCell(null);
                                } else {
                                  setActiveCell({ studentId: student.id, dayStr });
                                }
                              }}
                            >
                              <div className="w-full h-full flex items-center justify-center relative">
                                {status ? (
                                  <div className={cn(
                                    "w-7 h-7 rounded-lg flex items-center justify-center font-extrabold text-[11px] shadow-sm transition-transform",
                                    status === 'P' && "bg-emerald-500 text-white border border-emerald-600 shadow-sm",
                                    status === 'F' && "bg-rose-500 text-white border border-rose-600 shadow-sm",
                                    status === 'FJ' && "bg-amber-500 text-white border border-amber-600 shadow-sm",
                                    status === 'A' && "bg-orange-500 text-white border border-orange-600 shadow-sm",
                                    status === 'D' && "bg-sky-500 text-white border border-sky-600 shadow-sm"
                                  )}>
                                    {status}
                                  </div>
                                ) : (
                                  holiday ? (
                                    <span className="text-[10px] font-black text-rose-400 select-none">H</span>
                                  ) : isWk ? (
                                    <span className="text-[10px] font-black text-slate-300 select-none">
                                      {day.getDay() === 0 ? 'D' : 'S'}
                                    </span>
                                  ) : (
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-slate-300 transition-colors print:hidden" />
                                  )
                                )}                               </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                  </tbody>
                </table>
              </div>


            </div>
          </motion.div>

          {/* Centered screen pop-up window with horizontal options */}
          <AnimatePresence>
            {activeCell && activeStudent && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop with soft blur */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setActiveCell(null)}
                  className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
                />
                
                {/* Responsive Pop-up Card */}
                <motion.div
                  initial={{ scale: 0.95, y: 15, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ scale: 0.95, y: 15, opacity: 0 }}
                  transition={{ type: "spring", duration: 0.3 }}
                  onClick={(e) => e.stopPropagation()}
                  className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-xl border border-slate-200 z-50 overflow-hidden"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <span className="text-[10px] font-black tracking-widest text-blue-600 uppercase">
                        {language === 'pt' ? 'REGISTRAR FREQUÊNCIA' : 'REGISTER ATTENDANCE'}
                      </span>
                      <h3 className="text-lg font-extrabold text-slate-800 mt-0.5 leading-snug">
                        {activeStudent.nome}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {language === 'pt' ? `Data: ${activeDateFormatted}` : `Date: ${activeDateFormatted}`}
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveCell(null)}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      <XCircle className="w-5 h-5 text-slate-400 hover:text-slate-600" />
                    </button>
                  </div>

                  {/* Horizontal Options Row */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 sm:gap-3 py-2">
                    {/* Option P */}
                    <button
                      onClick={() => {
                        handleToggleMapAttendance(activeStudent.id, activeCell.dayStr, 'P');
                        setActiveCell(null);
                      }}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-emerald-50 border border-transparent hover:border-emerald-100 transition-all text-emerald-800 text-center cursor-pointer group"
                    >
                      <span className="w-10 h-10 flex items-center justify-center bg-emerald-500 text-white rounded-xl text-sm font-black shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">P</span>
                      <span className="text-[11px] font-black tracking-tight">{language === 'pt' ? 'Presente' : 'Present'}</span>
                    </button>

                    {/* Option F */}
                    <button
                      onClick={() => {
                        handleToggleMapAttendance(activeStudent.id, activeCell.dayStr, 'F');
                        setActiveCell(null);
                      }}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all text-rose-800 text-center cursor-pointer group"
                    >
                      <span className="w-10 h-10 flex items-center justify-center bg-rose-500 text-white rounded-xl text-sm font-black shadow-md shadow-rose-500/20 group-hover:scale-105 transition-transform">F</span>
                      <span className="text-[11px] font-black tracking-tight">{language === 'pt' ? 'Falta' : 'Absent'}</span>
                    </button>

                    {/* Option FJ */}
                    <button
                      onClick={() => {
                        handleToggleMapAttendance(activeStudent.id, activeCell.dayStr, 'FJ');
                        setActiveCell(null);
                      }}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-amber-50 border border-transparent hover:border-amber-100 transition-all text-amber-800 text-center cursor-pointer group"
                    >
                      <span className="w-10 h-10 flex items-center justify-center bg-amber-500 text-white rounded-xl text-sm font-black shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">FJ</span>
                      <span className="text-[11px] font-black tracking-tight leading-tight">{language === 'pt' ? 'Justificada' : 'Excused'}</span>
                    </button>

                    {/* Option A */}
                    <button
                      onClick={() => {
                        handleToggleMapAttendance(activeStudent.id, activeCell.dayStr, 'A');
                        setActiveCell(null);
                      }}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-orange-50 border border-transparent hover:border-orange-100 transition-all text-orange-800 text-center cursor-pointer group"
                    >
                      <span className="w-10 h-10 flex items-center justify-center bg-orange-500 text-white rounded-xl text-sm font-black shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">A</span>
                      <span className="text-[11px] font-black tracking-tight">{language === 'pt' ? 'Atraso' : 'Delay'}</span>
                    </button>

                    {/* Option D */}
                    <button
                      onClick={() => {
                        handleToggleMapAttendance(activeStudent.id, activeCell.dayStr, 'D');
                        setActiveCell(null);
                      }}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-sky-50 border border-transparent hover:border-sky-100 transition-all text-sky-800 text-center cursor-pointer group"
                    >
                      <span className="w-10 h-10 flex items-center justify-center bg-sky-500 text-white rounded-xl text-sm font-black shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">D</span>
                      <span className="text-[11px] font-black tracking-tight">{language === 'pt' ? 'Dispensado' : 'Exempt'}</span>
                    </button>

                    {/* Option Limpar */}
                    <button
                      onClick={() => {
                        handleToggleMapAttendance(activeStudent.id, activeCell.dayStr, null);
                        setActiveCell(null);
                      }}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all text-slate-500 text-center cursor-pointer group"
                    >
                      <span className="w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-600 rounded-xl text-lg font-black shadow-sm group-hover:scale-105 transition-transform">―</span>
                      <span className="text-[11px] font-black tracking-tight">{language === 'pt' ? 'Limpar' : 'Clear'}</span>
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
      </AnimatePresence>
    </div>
  );
}
