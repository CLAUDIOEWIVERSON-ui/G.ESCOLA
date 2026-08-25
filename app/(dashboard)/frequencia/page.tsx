'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  Printer,
  X,
  FileText,
  Layers,
  Settings2,
  FileSpreadsheet,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import maleAvatar from '@/src/assets/images/avatar_male_1778977230783.png';
import femaleAvatar from '@/src/assets/images/avatar_female_1778977246051.png';
import militaryMaleAvatar from '@/src/assets/images/avatar_military_male_1779964887322.png';
import militaryFemaleAvatar from '@/src/assets/images/avatar_military_female_1779964903107.png';
import navalMissionLogo from '@/src/assets/images/regenerated_image_1782409801823.png';
import { cn, getCleanTurmaName } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  addMonths, 
  subMonths,
  addDays,
  subDays,
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

// Official São Tomé and Príncipe national holidays
export const STP_HOLIDAYS = [
  { m: 0, d: 1, name: 'Ano Novo', meaning: 'Celebração universal do início do ano novo civil.' },
  { m: 1, d: 3, name: 'Dia dos Mártires', meaning: 'Homenagem aos mártires do Massacre de Batepá (1953), símbolo histórico de resistência nacional contra a opressão colonial.' },
  { m: 4, d: 1, name: 'Dia do Trabalhador', meaning: 'Celebração internacional e nacional das conquistas e direitos da classe trabalhadora.' },
  { m: 5, d: 1, name: 'Dia da Criança', meaning: 'Dia Internacional da Criança, voltado à proteção e promoção dos direitos fundamentais da infância são-tomense.' },
  { m: 6, d: 12, name: 'Dia da Independência', meaning: 'Celebração da Proclamação da Independência Nacional de São Tomé e Príncipe em 1975.' },
  { m: 8, d: 6, name: 'Dia das Forças Armadas', meaning: 'Comemoração oficial e homenagem solene às Forças Armadas de São Tomé e Príncipe (FASTP).' },
  { m: 8, d: 30, name: 'Reforma Agrária / Nacionalizações', meaning: 'Comemoração histórica da nacionalização das roças e soberania sobre as terras nacionais em 1975.' },
  { m: 11, d: 21, name: 'Dia de São Tomé', meaning: 'Comemoração do descobrimento da Ilha de São Tomé pelos navegadores portugueses em 1470.' },
  { m: 11, d: 25, name: 'Natal', meaning: 'Celebração cristã e feriado universal da família e da paz.' }
];

const isHoliday = (date: Date) => {
  const m = date.getMonth();
  const d = date.getDate();
  const h = STP_HOLIDAYS.find((item) => item.m === m && item.d === d);
  if (h) return { name: h.name, meaning: h.meaning };
  return null;
};

// Helper to compute weeks of a given month
function getWeeksOfMonth(month: number, year: number) {
  const weeks: { weekNumber: number; label: string; start: Date; end: Date; days: { dayNum: number; month: number; year: number }[] }[] = [];
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  let current = new Date(firstDayOfMonth);
  let dayOfWeek = current.getDay();
  let diff = current.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  let weekStart = new Date(current.setDate(diff));

  let weekCount = 1;
  while (weekStart <= lastDayOfMonth || (weekStart.getMonth() === month && weekStart <= lastDayOfMonth)) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const days: { dayNum: number; month: number; year: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + d);
      days.push({
        dayNum: dayDate.getDate(),
        month: dayDate.getMonth(),
        year: dayDate.getFullYear()
      });
    }

    const startLabel = `${String(weekStart.getDate()).padStart(2, '0')}/${String(weekStart.getMonth() + 1).padStart(2, '0')}`;
    const endLabel = `${String(weekEnd.getDate()).padStart(2, '0')}/${String(weekEnd.getMonth() + 1).padStart(2, '0')}`;
    
    weeks.push({
      weekNumber: weekCount,
      label: `Semana ${weekCount} (${startLabel} a ${endLabel})`,
      start: new Date(weekStart),
      end: new Date(weekEnd),
      days
    });

    weekCount++;
    weekStart.setDate(weekStart.getDate() + 7);
    if (weekStart > lastDayOfMonth && weekStart.getMonth() !== month) {
      break;
    }
  }

  return weeks;
}

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
  const [activeBulkDay, setActiveBulkDay] = useState<{ dayStr: string; day: Date } | null>(null);

  // Print attendance sheet states
  const [isPrintAttendanceOpen, setIsPrintAttendanceOpen] = useState(false);
  const [printSheetType, setPrintSheetType] = useState<'semanal' | 'mensal'>('mensal');
  const [activeWeekIndex, setActiveWeekIndex] = useState(0);
  const [printTurmaId, setPrintTurmaId] = useState('');
  const [printProfessorName, setPrintProfessorName] = useState('');
  const [printDocumento, setPrintDocumento] = useState('');
  const [printPeriod, setPrintPeriod] = useState('');
  const [printAlunos, setPrintAlunos] = useState<any[]>([]);
  const [printFrequencia, setPrintFrequencia] = useState<any[]>([]);
  const [loadingFrequencia, setLoadingFrequencia] = useState(false);
  const [loadingPrintAlunos, setLoadingPrintAlunos] = useState(false);

  const activeTurma = useMemo(() => turmas.find(t => t.id === selectedTurma), [turmas, selectedTurma]);
  const activeCurso = useMemo(() => cursos.find(c => c.id === (selectedCurso || activeTurma?.curso_id)), [cursos, selectedCurso, activeTurma]);
  const effectiveStartDate = useMemo(() => activeTurma?.data_inicio || activeCurso?.data_inicio || null, [activeTurma, activeCurso]);
  const effectiveEndDate = useMemo(() => activeTurma?.data_postergacao || activeTurma?.data_fim || activeCurso?.data_fim || null, [activeTurma, activeCurso]);

  const activePrintTurma = useMemo(() => turmas.find(t => t.id === (printTurmaId || selectedTurma)) || activeTurma, [turmas, printTurmaId, selectedTurma, activeTurma]);
  const activePrintCurso = useMemo(() => cursos.find(c => c.id === (activePrintTurma?.curso_id || selectedCurso)), [cursos, activePrintTurma, selectedCurso]);
  const effectivePrintStartDate = useMemo(() => activePrintTurma?.data_inicio || activePrintCurso?.data_inicio || null, [activePrintTurma, activePrintCurso]);
  const effectivePrintEndDate = useMemo(() => activePrintTurma?.data_postergacao || activePrintTurma?.data_fim || activePrintCurso?.data_fim || null, [activePrintTurma, activePrintCurso]);

  // Compute active month and weeks for print
  const printMonth = useMemo(() => {
    if (!printPeriod) return new Date().getMonth();
    const parts = printPeriod.split('/');
    if (parts.length === 2) {
      return parseInt(parts[0], 10) - 1;
    }
    return new Date().getMonth();
  }, [printPeriod]);

  const printYear = useMemo(() => {
    if (!printPeriod) return new Date().getFullYear();
    const parts = printPeriod.split('/');
    if (parts.length === 2) {
      return parseInt(parts[1], 10);
    }
    return new Date().getFullYear();
  }, [printPeriod]);

  const activeWeeksList = useMemo(() => {
    return getWeeksOfMonth(printMonth, printYear);
  }, [printMonth, printYear]);

  // Days to render for print modal
  const daysToRender = useMemo(() => {
    if (printSheetType === 'semanal') {
      const selectedWeek = activeWeeksList[activeWeekIndex];
      return selectedWeek ? selectedWeek.days : [];
    } else {
      const lastDay = new Date(printYear, printMonth + 1, 0).getDate();
      const days = [];
      for (let d = 1; d <= lastDay; d++) {
        days.push({ dayNum: d, month: printMonth, year: printYear });
      }
      return days;
    }
  }, [printSheetType, activeWeekIndex, activeWeeksList, printMonth, printYear]);

  const getWeekdayName = (dayOfWeek: number) => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return days[dayOfWeek] || '';
  };

  const getDayStatus = (dayNum: number, monthNum: number, yearNum: number, studentId?: string) => {
    const dateObj = new Date(yearNum, monthNum, dayNum);
    const dayOfWeek = dateObj.getDay();
    const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6;
    const formattedDate = `${yearNum}-${String(monthNum + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

    let isValid = true;
    if (effectivePrintStartDate && formattedDate < effectivePrintStartDate) {
      isValid = false;
    }
    if (effectivePrintEndDate && formattedDate > effectivePrintEndDate) {
      isValid = false;
    }

    if (!isValid) {
      return {
        label: '—',
        bgClass: 'bg-neutral-200 text-neutral-400',
        isValid: false
      };
    }

    // Check STP national holidays
    const isHol = STP_HOLIDAYS.find(h => h.m === monthNum && h.d === dayNum);
    if (isHol) {
      return {
        label: 'FE',
        bgClass: 'bg-red-100 text-red-800 font-extrabold',
        isValid: true,
        holidayName: isHol.name,
        holidayMeaning: isHol.meaning
      };
    }

    if (isWeekendDay) {
      return {
        label: dayOfWeek === 0 ? 'D' : 'S',
        bgClass: 'bg-neutral-100 text-neutral-500 font-semibold',
        isValid: true
      };
    }

    if (studentId && printFrequencia.length > 0) {
      const record = printFrequencia.find(f => {
        if (!f.data) return false;
        const recordDate = typeof f.data === 'string' ? f.data.substring(0, 10) : format(new Date(f.data), 'yyyy-MM-dd');
        return f.aluno_id === studentId && recordDate === formattedDate;
      });

      if (record) {
        const obs = (record.observacao || '').trim().toUpperCase();
        if (obs === 'F' || obs === 'FJ' || obs === 'A' || obs === 'D' || obs === 'P') {
          return {
            label: obs,
            bgClass: obs === 'P' ? 'text-emerald-700 bg-emerald-50/60 font-black' :
                     obs === 'F' ? 'text-rose-700 bg-rose-50/60 font-black' :
                     obs === 'FJ' ? 'text-amber-700 bg-amber-50/60 font-black' :
                     obs === 'A' ? 'text-orange-700 bg-orange-50/60 font-black' :
                     obs === 'D' ? 'text-sky-700 bg-sky-50/60 font-black' : '',
            isValid: true
          };
        }
        if (record.presente === true) {
          return { label: 'P', bgClass: 'text-emerald-700 bg-emerald-50/60 font-black', isValid: true };
        }
        if (record.presente === false) {
          return { label: 'F', bgClass: 'text-rose-700 bg-rose-50/60 font-black', isValid: true };
        }
      }
    }

    return {
      label: '',
      bgClass: '',
      isValid: true
    };
  };

  const getHolidaysForDays = (days: { dayNum: number; month: number; year: number }[]) => {
    const list: { day: number; month: number; name: string; meaning: string }[] = [];
    const seen = new Set<string>();

    days.forEach(d => {
      const key = `${d.month}-${d.dayNum}`;
      if (!seen.has(key)) {
        seen.add(key);
        const hol = STP_HOLIDAYS.find(h => h.m === d.month && h.d === d.dayNum);
        if (hol) {
          list.push({
            day: d.dayNum,
            month: d.month,
            name: hol.name,
            meaning: hol.meaning
          });
        }
      }
    });

    return list;
  };

  const fetchPrintData = async (turmaId: string, month: number, year: number) => {
    if (!turmaId) return;
    try {
      setLoadingPrintAlunos(true);
      setLoadingFrequencia(true);

      // 1. Fetch Students
      const { data: alunoData, error: alunoError } = await supabase
        .from('alunos')
        .select('id, nome, matricula, foto_url, genero, posto_graduacao, nome_guerra')
        .eq('turma_id', turmaId)
        .is('deleted_at', null)
        .order('nome');

      if (alunoError) throw alunoError;
      setPrintAlunos(alunoData || []);

      // 2. Fetch Frequency with 7-day padding before/after
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      const queryStart = format(subDays(startDate, 7), 'yyyy-MM-dd');
      const queryEnd = format(addDays(endDate, 7), 'yyyy-MM-dd');

      const { data: freqData, error: freqError } = await supabase
        .from('frequencia')
        .select('*')
        .eq('turma_id', turmaId)
        .gte('data', queryStart)
        .lte('data', queryEnd);

      if (freqError) throw freqError;
      setPrintFrequencia(freqData || []);
    } catch (err: any) {
      console.error('Error fetching print data:', err);
      toast.error('Erro ao carregar dados da folha de frequência.');
    } finally {
      setLoadingPrintAlunos(false);
      setLoadingFrequencia(false);
    }
  };

  const handleOpenPrintAttendanceModal = async () => {
    if (!selectedTurma) {
      toast.error(language === 'pt' ? 'Por favor, selecione uma turma primeiro.' : 'Please select a class first.');
      return;
    }

    const currentPeriodStr = `${String(currentMapDate.getMonth() + 1).padStart(2, '0')}/${currentMapDate.getFullYear()}`;
    setPrintTurmaId(selectedTurma);
    setPrintPeriod(currentPeriodStr);
    setPrintSheetType(mapGranularity === 'week' ? 'semanal' : 'mensal');
    setActiveWeekIndex(0);

    // Look for instructor profile name or active turma instrutor
    if (activeTurma?.instrutor?.nome) {
      setPrintProfessorName(activeTurma.instrutor.nome);
    } else if (profile?.nome) {
      setPrintProfessorName(profile.nome);
    } else {
      setPrintProfessorName('');
    }

    setPrintDocumento(activeTurma?.documento_criacao || activeCurso?.documento_criacao || 'ORDEM INTERNA');

    setIsPrintAttendanceOpen(true);
    await fetchPrintData(selectedTurma, currentMapDate.getMonth(), currentMapDate.getFullYear());
  };

  // Re-fetch when printTurmaId or print period changes while modal is open
  useEffect(() => {
    if (isPrintAttendanceOpen && printTurmaId) {
      fetchPrintData(printTurmaId, printMonth, printYear);
    }
  }, [isPrintAttendanceOpen, printTurmaId, printMonth, printYear]);

  useEffect(() => {
    if (effectiveStartDate) {
      const [year, month, day] = effectiveStartDate.split('-').map(Number);
      setCurrentMapDate(new Date(year, month - 1, day));
    }
  }, [selectedTurma, selectedCurso, effectiveStartDate]);

  const getFilteredDays = useCallback((days: Date[]) => {
    if (!effectiveStartDate && !effectiveEndDate) return days;
    return days.filter(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      if (effectiveStartDate && dayStr < effectiveStartDate) {
        return false;
      }
      if (effectiveEndDate && dayStr > effectiveEndDate) {
        return false;
      }
      return true;
    });
  }, [effectiveStartDate, effectiveEndDate]);

  const getFilteredMonths = useCallback((months: Date[]) => {
    if (!effectiveStartDate && !effectiveEndDate) return months;
    return months.filter(month => {
      const monthStartStr = format(startOfMonth(month), 'yyyy-MM-dd');
      const monthEndStr = format(endOfMonth(month), 'yyyy-MM-dd');
      
      if (effectiveStartDate && monthEndStr < effectiveStartDate) {
        return false;
      }
      if (effectiveEndDate && monthStartStr > effectiveEndDate) {
        return false;
      }
      return true;
    });
  }, [effectiveStartDate, effectiveEndDate]);

  const canNavigateLeft = useCallback(() => {
    if (!effectiveStartDate) return true;
    
    let targetDate: Date;
    if (mapGranularity === 'week') targetDate = subWeeks(currentMapDate, 1);
    else if (mapGranularity === 'year') targetDate = subMonths(currentMapDate, 12);
    else targetDate = subMonths(currentMapDate, 1);
    
    let targetEnd: Date;
    if (mapGranularity === 'week') targetEnd = endOfWeek(targetDate, { weekStartsOn: 1 });
    else if (mapGranularity === 'year') targetEnd = endOfYear(targetDate);
    else targetEnd = endOfMonth(targetDate);
    
    const targetEndStr = format(targetEnd, 'yyyy-MM-dd');
    return targetEndStr >= effectiveStartDate;
  }, [effectiveStartDate, currentMapDate, mapGranularity]);

  const canNavigateRight = useCallback(() => {
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
  }, [effectiveEndDate, currentMapDate, mapGranularity]);

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
        .select('id, nome, matricula, foto_url, genero, posto_graduacao, nome_guerra')
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

    if (effectiveEndDate && dayStr > effectiveEndDate) {
      toast.error(language === 'pt' ? 'Impossível alterar. O período deste curso/turma já expirou.' : 'Cannot modify. The course/class period has already expired.');
      return;
    }
    if (effectiveStartDate && dayStr < effectiveStartDate) {
      toast.error(language === 'pt' ? 'Impossível alterar. A data selecionada é anterior ao período letivo do curso/turma.' : 'Cannot modify. The selected date is before the course/class period.');
      return;
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

  const handleMarkAllStatus = async (dayStr: string, status: 'P' | 'F' | 'FJ' | 'A' | 'D' | null) => {
    if (isReadOnly) return;
    if (!selectedTurma) return;
    if (students.length === 0) {
      toast.error(language === 'pt' ? 'Nenhum aluno nesta turma.' : 'No students in this class.');
      return;
    }

    if (effectiveEndDate && dayStr > effectiveEndDate) {
      toast.error(language === 'pt' ? 'Impossível alterar. O período deste curso/turma já expirou.' : 'Cannot modify. The course/class period has already expired.');
      return;
    }
    if (effectiveStartDate && dayStr < effectiveStartDate) {
      toast.error(language === 'pt' ? 'Impossível alterar. A data selecionada é anterior ao período letivo do curso/turma.' : 'Cannot modify. The selected date is before the course/class period.');
      return;
    }

    const toastId = toast.loading(
      language === 'pt' 
        ? 'Atualizando situação para toda a turma...' 
        : 'Updating status for the entire class...'
    );
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

      let insertedData: any[] | null = null;

      if (status !== null) {
        // Prepare records for all students
        const recordsToInsert = students.map(student => ({
          aluno_id: student.id,
          turma_id: selectedTurma,
          disciplina_id: selectedDisciplina || null,
          data: dayStr,
          presente: status === 'P' || status === 'A' || status === 'D',
          observacao: status === 'P' || status === 'F' ? null : status
        }));

        const { data, error: insertError } = await supabase
          .from('frequencia')
          .insert(recordsToInsert)
          .select();

        if (insertError) throw insertError;
        insertedData = data;
      }

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

      toast.success(
        language === 'pt' 
          ? 'Situação registrada para todos os alunos!' 
          : 'Status registered for all students!', 
        { id: toastId }
      );
    } catch (err: any) {
      console.error('Error updating bulk status:', err);
      toast.error(`${language === 'pt' ? 'Erro ao registrar situação geral: ' : 'Error registering bulk attendance: '}${err.message || JSON.stringify(err)}`, { id: toastId });
    }
  };

  const filteredTurmas = selectedCurso ? turmas.filter((t: any) => t.curso_id === selectedCurso) : turmas;
  const filteredDisciplinas = selectedCurso ? disciplinas.filter((d: any) => d.curso_id === selectedCurso) : disciplinas;

  useEffect(() => {
    const fetchFilters = async () => {
      const { data: cursosData } = await supabase.from('cursos').select('id, nome, internacional, grupo_responsavel, data_inicio, data_fim').is('deleted_at', null).order('nome');
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

  const formatIsoToBr = (isoStr?: string) => {
    if (!isoStr) return '---';
    try {
      const [y, m, d] = isoStr.split('-');
      if (y && m && d) return `${d}/${m}/${y}`;
      return isoStr;
    } catch {
      return isoStr;
    }
  };

  const formattedTurmaPeriod = (() => {
    if (!effectiveStartDate && !effectiveEndDate) return null;
    const startStr = formatIsoToBr(effectiveStartDate || undefined);
    const endStr = formatIsoToBr(effectiveEndDate || undefined);
    return `${startStr} a ${endStr}`;
  })();

  return (
    <div className="space-y-6 pb-20 max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className="hover:text-blue-600 cursor-pointer transition-colors">{t.nav.courses}</span>
          <span className="text-slate-300">›</span>
          <span className="font-medium text-slate-900">{t.attendance.title}</span>
        </div>
        {formattedTurmaPeriod && (
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-2xl text-xs font-black border border-blue-100 shadow-xs">
            <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              {language === 'pt' ? 'Período letivo: ' : 'Academic period: '}
              <strong className="font-mono text-blue-900">{formattedTurmaPeriod}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Selection Card */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 print:hidden">
        <div className="md:col-span-12 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              TURMA
            </label>
            {formattedTurmaPeriod && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-100">
                <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>
                  {language === 'pt' ? 'Período: ' : 'Period: '}
                  <strong className="font-mono text-emerald-900">{formattedTurmaPeriod}</strong>
                </span>
              </div>
            )}
          </div>
          <div className="relative group">
            <select
              value={selectedTurma}
              onChange={(e) => setSelectedTurma(e.target.value)}
              className="w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none text-base font-semibold appearance-none transition-all cursor-pointer group-hover:bg-slate-50 text-slate-700"
            >
              <option value="">{t.attendance.selectClass}</option>
              {turmas.map((turma, idx) => (
                <option key={`turma-opt-${turma.id || idx}`} value={turma.id}>{turma.nome}</option>
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
                  onClick={handleOpenPrintAttendanceModal}
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

                {effectiveStartDate && (
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
              data-document-sheet="true"
              className="official-document-sheet bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 p-6 md:p-8 relative overflow-hidden text-slate-900"
            >
              {/* Elegant Header Block for Screen Display & Official Print Layouts */}
              <div className="mb-6 border-b border-slate-200 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-5">
                  <div className="w-28 h-28 shrink-0 flex items-center justify-center overflow-hidden bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm">
                    <img
                      src={typeof navalMissionLogo === 'string' ? navalMissionLogo : (navalMissionLogo as any)?.src || navalMissionLogo}
                      alt="Logo Missão de Assessoria Naval"
                      className="w-24 h-24 object-contain"
                      style={{ width: '96px', height: '96px' }}
                    />
                  </div>
                  {formattedTurmaPeriod && (
                    <div className="hidden sm:flex items-center gap-2">
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-2xl text-xs font-black border border-blue-100 shadow-xs">
                        <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>
                          {language === 'pt' ? 'Período: ' : 'Period: '}
                          <strong className="font-mono text-blue-900">{formattedTurmaPeriod}</strong>
                        </span>
                      </div>
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
                      {activeTurma ? getCleanTurmaName(activeTurma, cursos.find(c => c.id === selectedCurso)?.nome, language === 'pt' ? 'Turma Única' : 'Single Class') : (language === 'pt' ? 'Todas' : 'All')}
                    </span>
                  </div>
                  <div className="border-l border-slate-200 h-6 shrink-0" />
                  <div>
                    <span className="block opacity-65 font-bold uppercase text-[9px] tracking-wider text-slate-400">{language === 'pt' ? 'ALUNOS' : 'STUDENTS'}</span>
                    <span className="font-bold text-slate-700 font-mono">
                      {students.length} {language === 'pt' ? 'Ativos' : 'Active'}
                    </span>
                  </div>
                  {(activeTurma?.documento_criacao || cursos.find(c => c.id === selectedCurso)?.documento_criacao) && (
                    <>
                      <div className="border-l border-slate-200 h-6 shrink-0" />
                      <div>
                        <span className="block opacity-65 font-bold uppercase text-[9px] tracking-wider text-slate-400">{language === 'pt' ? 'DOCUMENTO' : 'DOCUMENT'}</span>
                        <span className="font-bold text-slate-800 font-mono">
                          {activeTurma?.documento_criacao || cursos.find(c => c.id === selectedCurso)?.documento_criacao}
                        </span>
                      </div>
                    </>
                  )}
                  {formattedTurmaPeriod && (
                    <>
                      <div className="border-l border-slate-200 h-6 shrink-0" />
                      <div>
                        <span className="block opacity-65 font-bold uppercase text-[9px] tracking-wider text-slate-400">{language === 'pt' ? 'PERÍODO LETIVO' : 'PERIOD'}</span>
                        <span className="font-bold text-blue-700 font-mono">
                          {formattedTurmaPeriod}
                        </span>
                      </div>
                    </>
                  )}
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
                  @page {
                    size: A4 landscape !important;
                    margin: 6mm 6mm 6mm 6mm !important;
                  }

                  /* Reset page context and force standard white/black print output */
                  html, body {
                    margin: 0 !important;
                    padding: 0 !important;
                    background: #ffffff !important;
                    background-color: #ffffff !important;
                    color: #000000 !important;
                    width: 100% !important;
                    height: auto !important;
                    min-height: 0 !important;
                    max-height: none !important;
                    overflow: visible !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }

                  /* Hide headers, footers, mobile bottom-navs, back buttons, filters, etc. completely from DOM layout flow */
                  header, nav, aside, footer, button, .print\:hidden, [role="dialog"], [role="group"], .no-print {
                    display: none !important;
                    width: 0 !important;
                    height: 0 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    overflow: hidden !important;
                    visibility: hidden !important;
                  }
                  
                  /* Unset layout wrappers so printer renders natively */
                  html, body, main, .min-h-screen, #__next, .flex-1, [data-framer-portal-container], div[class*="space-y-"] {
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
                  
                  /* Standard printable area */
                  #frequency-print-area {
                    visibility: visible !important;
                    position: relative !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    height: auto !important;
                    min-height: 0 !important;
                    max-height: none !important;
                    overflow: visible !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    box-shadow: none !important;
                    border: none !important;
                    background: #ffffff !important;
                    color: #000000 !important;
                    display: block !important;
                    page-break-inside: auto !important;
                    break-inside: auto !important;
                    box-sizing: border-box !important;
                  }

                  #frequency-print-area .overflow-x-auto {
                    overflow: visible !important;
                    width: 100% !important;
                  }

                  #frequency-print-area table {
                    width: 100% !important;
                    table-layout: auto !important;
                    border-collapse: collapse !important;
                    border: 1.5px solid #1e293b !important;
                    page-break-inside: auto !important;
                    break-inside: auto !important;
                  }

                  #frequency-print-area tr {
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                    page-break-after: auto !important;
                    break-after: auto !important;
                  }

                  #frequency-print-area thead {
                    display: table-header-group !important;
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                  }

                  #frequency-print-area tbody {
                    display: table-row-group !important;
                  }

                  #frequency-print-area th, 
                  #frequency-print-area td {
                    border: 1px solid #1e293b !important;
                    color: #000000 !important;
                    padding: ${mapGranularity === 'week' ? '4px 6px' : '2px 2px'} !important;
                    font-size: ${mapGranularity === 'week' ? '9.5px' : '8px'} !important;
                    background-color: #ffffff !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    position: static !important;
                  }

                  #frequency-print-area th {
                    background-color: #f1f5f9 !important;
                    font-weight: 850 !important;
                    font-size: ${mapGranularity === 'week' ? '8.5px' : '7.5px'} !important;
                  }
                  
                  #frequency-print-area td.sticky, 
                  #frequency-print-area th.sticky {
                    position: static !important;
                    background-color: #ffffff !important;
                    border-right: 1.5px solid #1e293b !important;
                    box-shadow: none !important;
                  }

                  #frequency-print-area .print-badge {
                    width: ${mapGranularity === 'week' ? '22px' : '18px'} !important;
                    height: ${mapGranularity === 'week' ? '22px' : '18px'} !important;
                    font-size: ${mapGranularity === 'week' ? '10px' : '8px'} !important;
                    font-weight: 900 !important;
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    border-radius: 4px !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                }
              `}} />

              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="sticky left-0 z-20 bg-slate-100 p-2.5 w-[36px] min-w-[36px] text-center text-[10px] font-black text-slate-600 border border-slate-200">
                        #
                      </th>
                      <th className="sticky left-[36px] z-20 bg-slate-50 p-3 min-w-[220px] text-[10.5px] font-black text-slate-700 uppercase tracking-wider text-left border border-slate-200">
                        {language === 'pt' ? 'POSTO / GRADUAÇÃO / NOME DE GUERRA' : 'RANK / WAR NAME / STUDENT'}
                      </th>
                      {mapGranularity === 'year' ? (
                        getFilteredMonths(eachMonthOfInterval({
                          start: startOfYear(currentMapDate),
                          end: endOfYear(currentMapDate)
                        })).map(month => (
                          <th 
                            key={`th-m-${format(month, 'yyyy-MM')}`} 
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
                          const isStartDay = effectiveStartDate && dayStr === effectiveStartDate;
                          const holiday = isHoliday(day);
                          const isWk = isWeekend(day);
                          
                          return (
                            <th 
                              key={`th-d-${dayStr}`} 
                              className={cn(
                                "p-2 min-w-[44px] text-center transition-colors border border-slate-200 relative",
                                isStartDay ? "bg-blue-50/70 border-b-2 border-b-blue-500 font-bold" : "",
                                holiday ? "bg-rose-100/80 text-rose-800 border-rose-300 font-black" : 
                                isWk ? "bg-slate-100/80 text-slate-500 font-semibold" : "bg-slate-50 text-slate-600"
                              )}
                              title={holiday ? (language === 'pt' ? 'Feriado Nacional (STP): ' : 'National Holiday (STP): ') + holiday.name + ' - ' + holiday.meaning : undefined}
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
                                    FE
                                  </span>
                                )}
                                {!isReadOnly && selectedTurma && students.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if ((effectiveStartDate && dayStr < effectiveStartDate) || (effectiveEndDate && dayStr > effectiveEndDate)) {
                                        toast.error(language === 'pt' ? 'Data fora do período letivo do curso/turma.' : 'Date outside the course/class period.');
                                        return;
                                      }
                                      setActiveBulkDay({ dayStr, day });
                                    }}
                                    className="mt-1.5 p-1 rounded-md bg-emerald-50 hover:bg-emerald-500 hover:text-white text-emerald-600 border border-emerald-100 hover:border-emerald-600 transition-all cursor-pointer shadow-xs print:hidden"
                                    title={language === 'pt' ? 'Presença/Situação Geral (Turma Toda)' : 'Mass Attendance/Status (Whole Class)'}
                                  >
                                    <ListChecks className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </th>
                          );
                        })
                      )}

                      {/* Summary Columns on Header */}
                      {mapGranularity !== 'year' && (
                        <>
                          <th className="p-2 min-w-[36px] text-center text-[10px] font-black text-emerald-800 bg-emerald-50/70 border border-slate-200" title={language === 'pt' ? 'Total de Presenças' : 'Total Presents'}>
                            P
                          </th>
                          <th className="p-2 min-w-[36px] text-center text-[10px] font-black text-rose-800 bg-rose-50/70 border border-slate-200" title={language === 'pt' ? 'Total de Faltas' : 'Total Absences'}>
                            F
                          </th>
                          <th className="p-2 min-w-[36px] text-center text-[10px] font-black text-amber-800 bg-amber-50/70 border border-slate-200" title={language === 'pt' ? 'Faltas Justificadas' : 'Excused Absences'}>
                            FJ
                          </th>
                          {mapGranularity === 'month' ? (
                            <th className="p-2 min-w-[46px] text-center text-[10px] font-black text-blue-900 bg-blue-50/70 border border-slate-200" title={language === 'pt' ? 'Percentual de Frequência' : 'Attendance Percentage'}>
                              %
                            </th>
                          ) : (
                            <th className="p-2 min-w-[100px] text-center text-[10px] font-black text-slate-700 bg-slate-50 border border-slate-200">
                              {language === 'pt' ? 'Rubrica / Visto' : 'Signature'}
                            </th>
                          )}
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.length === 0 ? (
                      <tr>
                        <td 
                          colSpan={
                            2 + (mapGranularity === 'year' 
                              ? getFilteredMonths(eachMonthOfInterval({ start: startOfYear(currentMapDate), end: endOfYear(currentMapDate) })).length
                              : getFilteredDays(eachDayOfInterval({
                                  start: mapGranularity === 'week' ? startOfWeek(currentMapDate, { weekStartsOn: 1 }) : startOfMonth(currentMapDate),
                                  end: mapGranularity === 'week' ? endOfWeek(currentMapDate, { weekStartsOn: 1 }) : endOfMonth(currentMapDate)
                                })).length + 4
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
                      students.map((student, idx) => {
                        const filteredDays = getFilteredDays(eachDayOfInterval({
                          start: mapGranularity === 'week' ? startOfWeek(currentMapDate, { weekStartsOn: 1 }) : startOfMonth(currentMapDate),
                          end: mapGranularity === 'week' ? endOfWeek(currentMapDate, { weekStartsOn: 1 }) : endOfMonth(currentMapDate)
                        }));

                        let studentP = 0;
                        let studentF = 0;
                        let studentFJ = 0;
                        let studentA = 0;
                        let studentD = 0;

                        filteredDays.forEach(day => {
                          const dayStr = format(day, 'yyyy-MM-dd');
                          const rec = mapData.find(r => {
                            if (!r.data) return false;
                            const dbDateStr = typeof r.data === 'string' ? r.data.substring(0, 10) : format(new Date(r.data), 'yyyy-MM-dd');
                            return r.aluno_id === student.id && dbDateStr === dayStr;
                          });
                          const st = rec ? (rec.observacao || (rec.presente ? 'P' : 'F')) : null;
                          if (st === 'P') studentP++;
                          else if (st === 'F') studentF++;
                          else if (st === 'FJ') studentFJ++;
                          else if (st === 'A') studentA++;
                          else if (st === 'D') studentD++;
                        });

                        const totalCounted = studentP + studentF + studentFJ;
                        const pctFreq = totalCounted > 0 ? Math.round((studentP / totalCounted) * 100) : null;

                        const displayName = (student.posto_graduacao || student.nome_guerra)
                          ? `${student.posto_graduacao || ''} ${student.nome_guerra || student.nome}`.trim()
                          : student.nome;

                        return (
                          <tr key={`student-${student.id || idx}`} className="hover:bg-slate-50/50 transition-colors group">
                            {/* Sequential Index */}
                            <td className="sticky left-0 z-10 bg-slate-50 p-2 text-center font-mono font-bold text-xs text-slate-500 border border-slate-200">
                              {idx + 1}
                            </td>

                            {/* Student Rank + War Name */}
                            <td className="sticky left-[36px] z-10 bg-white p-3 font-bold text-slate-800 border border-slate-200 group-hover:bg-slate-50 transition-colors">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all shrink-0 print:hidden">
                                  {displayName.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="truncate max-w-[200px] text-xs font-black text-slate-800">{displayName}</span>
                                  {student.matricula && (
                                    <span className="text-[9px] font-mono text-slate-400">Nº {student.matricula}</span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Daily attendance cells */}
                            {filteredDays.map(day => {
                              const dayStr = format(day, 'yyyy-MM-dd');
                              const rec = mapData.find(r => {
                                if (!r.data) return false;
                                const dbDateStr = typeof r.data === 'string' ? r.data.substring(0, 10) : format(new Date(r.data), 'yyyy-MM-dd');
                                return r.aluno_id === student.id && dbDateStr === dayStr;
                              });
                              
                              const isWk = isWeekend(day);
                              const holiday = isHoliday(day);
                              const isStartDay = effectiveStartDate && dayStr === effectiveStartDate;
                              const status = rec ? (rec.observacao || (rec.presente ? 'P' : 'F')) : null;
                              
                              return (
                                <td 
                                  key={`td-${student.id || idx}-${dayStr}`} 
                                  className={cn(
                                    "p-1 border border-slate-200 cursor-pointer transition-all hover:bg-blue-50/50 relative text-center min-w-[44px] h-11",
                                    holiday ? "bg-rose-50/40" : isWk ? "bg-slate-100/40" : "bg-white",
                                    isStartDay && "bg-blue-50/20",
                                    isReadOnly && "cursor-not-allowed opacity-80"
                                  )}
                                  title={
                                    isReadOnly 
                                      ? (language === 'pt' ? "Apenas visualização" : "View only") 
                                      : holiday 
                                        ? (language === 'pt' ? 'Feriado Nacional (STP): ' : 'National Holiday (STP): ') + holiday.name
                                        : (language === 'pt' ? "Clique para gerenciar presença" : "Click to manage attendance")
                                  }
                                  onClick={() => {
                                    if (isReadOnly) return;
                                    if ((effectiveStartDate && dayStr < effectiveStartDate) || (effectiveEndDate && dayStr > effectiveEndDate)) {
                                      toast.error(language === 'pt' ? 'Data fora do período letivo do curso/turma.' : 'Date outside the course/class period.');
                                      return;
                                    }
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
                                        "w-6 h-6 rounded-md flex items-center justify-center font-black text-[11px] shadow-xs transition-transform",
                                        status === 'P' && "bg-emerald-500 text-white shadow-xs",
                                        status === 'F' && "bg-rose-500 text-white shadow-xs",
                                        status === 'FJ' && "bg-amber-500 text-white shadow-xs",
                                        status === 'A' && "bg-orange-500 text-white shadow-xs",
                                        status === 'D' && "bg-sky-500 text-white shadow-xs"
                                      )}>
                                        {status}
                                      </div>
                                    ) : (
                                      holiday ? (
                                        <span className="text-[10px] font-black text-rose-600 bg-rose-100 px-1 py-0.5 rounded select-none">FE</span>
                                      ) : isWk ? (
                                        <span className="text-[10px] font-black text-slate-400 select-none">
                                          {day.getDay() === 0 ? 'D' : 'S'}
                                        </span>
                                      ) : (
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-slate-400 transition-colors" />
                                      )
                                    )}
                                  </div>
                                </td>
                              );
                            })}

                            {/* Summary Totals */}
                            {mapGranularity !== 'year' && (
                              <>
                                <td className="border border-slate-200 p-1 text-center font-bold font-mono text-xs text-emerald-800 bg-emerald-50/30">
                                  {studentP > 0 ? studentP : '—'}
                                </td>
                                <td className="border border-slate-200 p-1 text-center font-bold font-mono text-xs text-rose-800 bg-rose-50/30">
                                  {studentF > 0 ? studentF : '—'}
                                </td>
                                <td className="border border-slate-200 p-1 text-center font-bold font-mono text-xs text-amber-800 bg-amber-50/30">
                                  {studentFJ > 0 ? studentFJ : '—'}
                                </td>
                                {mapGranularity === 'month' ? (
                                  <td className="border border-slate-200 p-1 text-center font-black font-mono text-xs text-blue-900 bg-blue-50/40">
                                    {pctFreq !== null ? `${pctFreq}%` : '—'}
                                  </td>
                                ) : (
                                  <td className="border border-slate-200 p-1 text-center text-xs text-slate-300">
                                  </td>
                                )}
                              </>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Official Legend, STP Holidays & Signature Footer */}
              <div className="mt-6 pt-4 border-t border-slate-200">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                  {/* Legenda */}
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider mb-1.5 text-slate-800">
                      {language === 'pt' ? 'LEGENDA:' : 'LEGEND:'}
                    </div>
                    <div className="flex select-none flex-wrap gap-2 text-[9px] font-bold border border-slate-200 p-2.5 rounded-xl bg-slate-50">
                      <span className="text-emerald-700 font-extrabold bg-emerald-100/70 px-1.5 py-0.5 rounded"><strong>P</strong> = {language === 'pt' ? 'Presente' : 'Present'}</span>
                      <span className="text-rose-700 font-extrabold bg-rose-100/70 px-1.5 py-0.5 rounded"><strong>F</strong> = {language === 'pt' ? 'Falta' : 'Absent'}</span>
                      <span className="text-amber-700 font-extrabold bg-amber-100/70 px-1.5 py-0.5 rounded"><strong>FJ</strong> = {language === 'pt' ? 'Justificada' : 'Excused'}</span>
                      <span className="text-orange-700 font-extrabold bg-orange-100/70 px-1.5 py-0.5 rounded"><strong>A</strong> = {language === 'pt' ? 'Atraso' : 'Delay'}</span>
                      <span className="text-sky-700 font-extrabold bg-sky-100/70 px-1.5 py-0.5 rounded"><strong>D</strong> = {language === 'pt' ? 'Dispensado' : 'Exempt'}</span>
                      <span className="text-red-700 font-extrabold bg-red-100/70 px-1.5 py-0.5 rounded border border-red-200"><strong>FE</strong> = {language === 'pt' ? 'Feriado Nacional (STP)' : 'Holiday (STP)'}</span>
                      <span className="text-slate-600 font-bold bg-slate-200/70 px-1.5 py-0.5 rounded"><strong>S/D</strong> = Sáb/Dom</span>
                    </div>
                  </div>

                  {/* Feriados Descritos (Motivo) - São Tomé e Príncipe */}
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider mb-1.5 flex justify-between items-center text-slate-800">
                      <span className="font-extrabold">{language === 'pt' ? 'FERIADOS DESCRITOS (MOTIVO):' : 'HOLIDAYS DESCRIBED (REASON):'}</span>
                      <span className="text-[8px] text-red-600 font-bold tracking-wider uppercase bg-red-50 px-2 py-0.5 rounded border border-red-100">SÃO TOMÉ E PRÍNCIPE</span>
                    </div>
                    <div className="flex flex-col gap-1 text-[8.5px] font-medium border border-dashed border-red-300 p-2.5 rounded-xl bg-red-50/40 min-h-[48px] justify-center">
                      {(() => {
                        const activeDaysList = getFilteredDays(eachDayOfInterval({
                          start: mapGranularity === 'week' ? startOfWeek(currentMapDate, { weekStartsOn: 1 }) : startOfMonth(currentMapDate),
                          end: mapGranularity === 'week' ? endOfWeek(currentMapDate, { weekStartsOn: 1 }) : endOfMonth(currentMapDate)
                        }));

                        const activeHolidays = activeDaysList.map(d => {
                          const hol = isHoliday(d);
                          return hol ? { day: d.getDate(), month: d.getMonth(), name: hol.name, meaning: hol.meaning } : null;
                        }).filter(Boolean) as { day: number; month: number; name: string; meaning: string }[];

                        return activeHolidays.length > 0 ? (
                          activeHolidays.map((holiday, hIdx) => (
                            <div key={hIdx} className="text-red-800 flex items-start gap-1.5 leading-tight">
                              <span className="bg-red-600 text-white font-mono text-[7px] px-1 py-0.5 rounded shrink-0 font-black">
                                FE {holiday.day}/{String(holiday.month + 1).padStart(2, '0')}
                              </span>
                              <span className="font-bold shrink-0">{holiday.name}:</span>
                              <span className="font-normal text-slate-700 italic line-clamp-1">{holiday.meaning}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-slate-400 italic font-mono uppercase tracking-wider text-[8px] text-center block w-full">
                            {mapGranularity === 'week'
                              ? (language === 'pt' ? 'Nenhum feriado nacional de STP nesta semana.' : 'No STP national holidays this week.')
                              : (language === 'pt' ? 'Nenhum feriado nacional de STP neste mês.' : 'No STP national holidays this month.')
                            }
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Observation Warning Block */}
                <div className="mt-3.5 border border-red-200 bg-red-50/60 p-2 rounded-xl text-center font-bold text-[8.5px] text-red-800 tracking-wide leading-relaxed">
                  {language === 'pt'
                    ? 'OBS.: ESTA FOLHA DE PRESENÇA DEVERÁ SER ENTREGUE DIARIAMENTE AO OFICIAL DE SERVIÇO / COORDENAÇÃO DO CURSO AO TÉRMINO DE CADA JORNADA DE INSTRUÇÃO.'
                    : 'NOTE: THIS ATTENDANCE SHEET MUST BE HANDED IN DAILY TO THE DUTY OFFICER / COURSE COORDINATION AT THE END OF EACH TRAINING DAY.'
                  }
                </div>

                {/* Assinaturas Oficiais */}
                <div className="grid grid-cols-2 gap-8 md:gap-16 pt-8 mt-5 border-t border-dashed border-slate-200 text-center">
                  <div className="flex flex-col items-center">
                    <div className="w-52 md:w-64 border-b border-slate-800 mb-1.5" />
                    <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider">
                      {language === 'pt' ? 'Assinatura do Instrutor / Responsável' : 'Instructor Signature'}
                    </span>
                    <span className="text-[9px] text-slate-500 font-medium">
                      {language === 'pt' ? 'Encarregado da Disciplina / Turma' : 'Course Instructor'}
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-52 md:w-64 border-b border-slate-800 mb-1.5" />
                    <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider">
                      {language === 'pt' ? 'Visto da Coordenação do Curso' : 'Course Coordination Visa'}
                    </span>
                    <span className="text-[9px] text-slate-500 font-medium">
                      {language === 'pt' ? 'Missão de Assessoria Naval' : 'Naval Advisory Mission'}
                    </span>
                  </div>
                </div>
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

          {/* Centered screen pop-up window for BULK frequency options */}
          <AnimatePresence>
            {activeBulkDay && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop with soft blur */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setActiveBulkDay(null)}
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
                      <span className="text-[10px] font-black tracking-widest text-emerald-600 uppercase">
                        {language === 'pt' ? 'REGISTRAR FREQUÊNCIA GERAL' : 'REGISTER MASS ATTENDANCE'}
                      </span>
                      <h3 className="text-lg font-extrabold text-slate-800 mt-0.5 leading-snug">
                        {language === 'pt' ? 'Toda a Turma' : 'Entire Class'}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {language === 'pt' ? `Data: ${format(activeBulkDay.day, 'dd/MM/yyyy')}` : `Date: ${format(activeBulkDay.day, 'MM/dd/yyyy')}`}
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveBulkDay(null)}
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
                        handleMarkAllStatus(activeBulkDay.dayStr, 'P');
                        setActiveBulkDay(null);
                      }}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-emerald-50 border border-transparent hover:border-emerald-100 transition-all text-emerald-800 text-center cursor-pointer group"
                    >
                      <span className="w-10 h-10 flex items-center justify-center bg-emerald-500 text-white rounded-xl text-sm font-black shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">P</span>
                      <span className="text-[11px] font-black tracking-tight">{language === 'pt' ? 'Presentes' : 'Present'}</span>
                    </button>

                    {/* Option F */}
                    <button
                      onClick={() => {
                        handleMarkAllStatus(activeBulkDay.dayStr, 'F');
                        setActiveBulkDay(null);
                      }}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all text-rose-800 text-center cursor-pointer group"
                    >
                      <span className="w-10 h-10 flex items-center justify-center bg-rose-500 text-white rounded-xl text-sm font-black shadow-md shadow-rose-500/20 group-hover:scale-105 transition-transform">F</span>
                      <span className="text-[11px] font-black tracking-tight">{language === 'pt' ? 'Faltas' : 'Absent'}</span>
                    </button>

                    {/* Option FJ */}
                    <button
                      onClick={() => {
                        handleMarkAllStatus(activeBulkDay.dayStr, 'FJ');
                        setActiveBulkDay(null);
                      }}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-amber-50 border border-transparent hover:border-amber-100 transition-all text-amber-800 text-center cursor-pointer group"
                    >
                      <span className="w-10 h-10 flex items-center justify-center bg-amber-500 text-white rounded-xl text-sm font-black shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">FJ</span>
                      <span className="text-[11px] font-black tracking-tight leading-tight">{language === 'pt' ? 'Justificadas' : 'Excused'}</span>
                    </button>

                    {/* Option A */}
                    <button
                      onClick={() => {
                        handleMarkAllStatus(activeBulkDay.dayStr, 'A');
                        setActiveBulkDay(null);
                      }}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-orange-50 border border-transparent hover:border-orange-100 transition-all text-orange-800 text-center cursor-pointer group"
                    >
                      <span className="w-10 h-10 flex items-center justify-center bg-orange-500 text-white rounded-xl text-sm font-black shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">A</span>
                      <span className="text-[11px] font-black tracking-tight">{language === 'pt' ? 'Atrasos' : 'Delay'}</span>
                    </button>

                    {/* Option D */}
                    <button
                      onClick={() => {
                        handleMarkAllStatus(activeBulkDay.dayStr, 'D');
                        setActiveBulkDay(null);
                      }}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-sky-50 border border-transparent hover:border-sky-100 transition-all text-sky-800 text-center cursor-pointer group"
                    >
                      <span className="w-10 h-10 flex items-center justify-center bg-sky-500 text-white rounded-xl text-sm font-black shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">D</span>
                      <span className="text-[11px] font-black tracking-tight">{language === 'pt' ? 'Dispensas' : 'Exempt'}</span>
                    </button>

                    {/* Option Limpar */}
                    <button
                      onClick={() => {
                        handleMarkAllStatus(activeBulkDay.dayStr, null);
                        setActiveBulkDay(null);
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

        {/* Printable Attendance Sheet Modal */}
        <AnimatePresence>
          {isPrintAttendanceOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              data-attendance-modal-root="true"
              className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[9999] flex flex-col p-2 sm:p-6 overflow-hidden"
            >
              {/* Modal Control Toolbar */}
              <div className="bg-slate-950/95 border border-white/10 p-3 sm:p-4 rounded-2xl mb-3 flex flex-col xl:flex-row items-center justify-between gap-3 shrink-0 shadow-2xl no-print">
                <div className="flex items-center gap-3 w-full xl:w-auto">
                  <button
                    onClick={() => setIsPrintAttendanceOpen(false)}
                    className="p-2 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
                    title={language === 'pt' ? 'Fechar' : 'Close'}
                  >
                    <X size={20} />
                  </button>
                  <div>
                    <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2 uppercase tracking-wide">
                      <Printer className="text-blue-500" size={18} />
                      <span>
                        {printSheetType === 'semanal' 
                          ? (language === 'pt' ? 'Folha de Frequência Semanal' : 'Weekly Attendance Sheet')
                          : (language === 'pt' ? 'Folha de Frequência Mensal' : 'Monthly Attendance Sheet')
                        }
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-blue-600/30 text-blue-400 border border-blue-500/30 font-mono">
                        {language === 'pt' ? 'Paisagem A4' : 'A4 Landscape'}
                      </span>
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      {loadingPrintAlunos || loadingFrequencia ? (
                        <span className="inline-flex items-center gap-1.5 text-blue-400">
                          <Loader2 size={12} className="animate-spin" />
                          {language === 'pt' ? 'Carregando dados...' : 'Loading data...'}
                        </span>
                      ) : (
                        `${printAlunos.length} ${language === 'pt' ? 'alunos listados nesta turma' : 'students in this class'}`
                      )}
                    </p>
                  </div>
                </div>

                {/* Toolbar Filters & Edit Controls */}
                <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto justify-start xl:justify-end">
                  {/* Select Turma */}
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-0.5">
                      {language === 'pt' ? 'Turma' : 'Class'}
                    </span>
                    <select
                      value={printTurmaId}
                      onChange={(e) => {
                        const newTurmaId = e.target.value;
                        setPrintTurmaId(newTurmaId);
                        const foundTurma = turmas.find(t => t.id === newTurmaId);
                        if (foundTurma?.instrutor?.nome) {
                          setPrintProfessorName(foundTurma.instrutor.nome);
                        }
                        if (foundTurma?.documento_criacao) {
                          setPrintDocumento(foundTurma.documento_criacao);
                        }
                      }}
                      className="px-2.5 py-1 bg-slate-900 border border-white/20 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-blue-500 min-w-[180px] max-w-[240px] cursor-pointer h-[32px]"
                    >
                      {turmas.map((t: any) => (
                        <option key={t.id} value={t.id}>
                          {t.nome} {t.curso?.nome ? `(${t.curso.nome})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select Sheet Type */}
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-0.5">
                      {language === 'pt' ? 'Tipo' : 'Type'}
                    </span>
                    <div className="flex bg-slate-900 border border-white/10 p-0.5 rounded-lg h-[32px]">
                      <button
                        onClick={() => setPrintSheetType('mensal')}
                        className={cn(
                          "px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer",
                          printSheetType === 'mensal' ? "bg-blue-600 text-white shadow-xs" : "text-slate-400 hover:text-white"
                        )}
                      >
                        {language === 'pt' ? 'Mensal' : 'Monthly'}
                      </button>
                      <button
                        onClick={() => setPrintSheetType('semanal')}
                        className={cn(
                          "px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer",
                          printSheetType === 'semanal' ? "bg-blue-600 text-white shadow-xs" : "text-slate-400 hover:text-white"
                        )}
                      >
                        {language === 'pt' ? 'Semanal' : 'Weekly'}
                      </button>
                    </div>
                  </div>

                  {/* If Weekly: Week selector */}
                  {printSheetType === 'semanal' && activeWeeksList.length > 0 && (
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-0.5">
                        {language === 'pt' ? 'Semana' : 'Week'}
                      </span>
                      <select
                        value={activeWeekIndex}
                        onChange={(e) => setActiveWeekIndex(parseInt(e.target.value, 10))}
                        className="px-2.5 py-1 bg-slate-900 border border-white/20 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-blue-500 min-w-[160px] cursor-pointer h-[32px]"
                      >
                        {activeWeeksList.map((week, idx) => (
                          <option key={idx} value={idx}>
                            Semana {idx + 1} ({week.label})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Period MM/YYYY input */}
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-0.5">
                      {language === 'pt' ? 'Mês/Ano' : 'Month/Year'}
                    </span>
                    <input
                      type="text"
                      value={printPeriod}
                      onChange={(e) => setPrintPeriod(e.target.value)}
                      placeholder="MM/AAAA"
                      className="px-2.5 py-1 bg-slate-900 border border-white/20 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-blue-500 w-[90px] text-center h-[32px]"
                    />
                  </div>

                  {/* Professor Name Edit */}
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-0.5">
                      {language === 'pt' ? 'Professor(a)' : 'Instructor'}
                    </span>
                    <input
                      type="text"
                      value={printProfessorName}
                      onChange={(e) => setPrintProfessorName(e.target.value)}
                      placeholder="Nome do Instrutor"
                      className="px-2.5 py-1 bg-slate-900 border border-white/20 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-blue-500 w-[140px] h-[32px]"
                    />
                  </div>

                  {/* Documento Edit */}
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-0.5">
                      {language === 'pt' ? 'Documento' : 'Document'}
                    </span>
                    <input
                      type="text"
                      value={printDocumento}
                      onChange={(e) => setPrintDocumento(e.target.value)}
                      placeholder="Ordem Interna"
                      className="px-2.5 py-1 bg-slate-900 border border-white/20 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-blue-500 w-[140px] h-[32px]"
                    />
                  </div>

                  {/* Print Action Button */}
                  <div className="flex items-end pt-2 xl:pt-0">
                    <button
                      onClick={() => {
                        document.body.classList.add('printing-attendance-sheet');
                        setTimeout(() => {
                          window.print();
                          setTimeout(() => {
                            document.body.classList.remove('printing-attendance-sheet');
                          }, 1500);
                        }, 100);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-600/30 transition-all cursor-pointer active:scale-95 shrink-0 h-[34px]"
                    >
                      <Printer size={16} />
                      <span>{language === 'pt' ? 'IMPRIMIR FOLHA (A4)' : 'PRINT SHEET (A4)'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Printable Canvas Container (Sheet A4 Landscape Optimized) */}
              <div className="flex-1 overflow-auto bg-slate-900/50 p-2 sm:p-6 rounded-2xl flex justify-center items-start">
                <div 
                  id="print-attendance-sheet"
                  data-print-landscape="true"
                  data-document-sheet="true"
                  className="bg-white text-black p-4 sm:p-6 shadow-2xl rounded-sm w-full max-w-[297mm] min-h-[210mm] flex flex-col justify-between"
                  style={{
                    fontFamily: "'Liberation Sans', Arial, Helvetica, sans-serif"
                  }}
                >
                  {/* Strict CSS Isolation for Print */}
                  <style dangerouslySetInnerHTML={{ __html: `
                    @media print {
                      @page {
                        size: A4 landscape !important;
                        margin: 4mm 5mm 4mm 5mm !important;
                      }
                      html, body {
                        background: #ffffff !important;
                        background-color: #ffffff !important;
                        color: #000000 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                        height: auto !important;
                        min-height: 0 !important;
                        max-height: none !important;
                        overflow: visible !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                      }
                      body.printing-attendance-sheet > *:not([data-attendance-modal-root="true"]) {
                        display: none !important;
                        visibility: hidden !important;
                        height: 0 !important;
                        max-height: 0 !important;
                        overflow: hidden !important;
                      }
                      [data-attendance-modal-root="true"] {
                        position: static !important;
                        inset: auto !important;
                        width: 100% !important;
                        height: auto !important;
                        min-height: 0 !important;
                        max-height: none !important;
                        background: #ffffff !important;
                        display: block !important;
                        overflow: visible !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                      }
                      .no-print,
                      [data-attendance-modal-root="true"] > .no-print,
                      header, nav, aside, button, input, select {
                        display: none !important;
                        visibility: hidden !important;
                        height: 0 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        border: none !important;
                      }
                      #print-attendance-sheet {
                        position: static !important;
                        width: 100% !important;
                        max-width: 297mm !important;
                        height: auto !important;
                        min-height: 0 !important;
                        max-height: none !important;
                        margin: 0 auto !important;
                        padding: 2mm 3mm !important;
                        box-shadow: none !important;
                        border: none !important;
                        background: #ffffff !important;
                        background-color: #ffffff !important;
                        color: #000000 !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        page-break-after: avoid !important;
                        break-after: avoid !important;
                        display: block !important;
                        box-sizing: border-box !important;
                      }
                      #print-attendance-sheet,
                      #print-attendance-sheet * {
                        color: #000000 !important;
                        visibility: visible !important;
                        box-sizing: border-box !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                      }
                      .print-avoid-break {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                      }
                      .print-attendance-table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        table-layout: fixed !important;
                        border: 1.5px solid #000000 !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                      }
                      .print-attendance-table tr {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                      }
                      .print-attendance-table thead {
                        display: table-header-group !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                      }
                      .print-attendance-table tbody {
                        display: table-row-group !important;
                      }
                      .print-attendance-table th, 
                      .print-attendance-table td {
                        border: 1px solid #000000 !important;
                        color: #000000 !important;
                        overflow: visible !important;
                        white-space: normal !important;
                        text-overflow: unset !important;
                        background-color: #ffffff !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                      }
                      .print-attendance-table th {
                        font-size: ${printSheetType === 'semanal' ? '8.5px' : '7px'} !important;
                        padding: ${printSheetType === 'semanal' ? '3px 2px' : '1.5px 1px'} !important;
                        background-color: #f1f5f9 !important;
                        font-weight: 900 !important;
                        color: #000000 !important;
                      }
                      .print-attendance-table td {
                        font-size: ${printSheetType === 'semanal' ? '8.5px' : '7.5px'} !important;
                        padding: ${printSheetType === 'semanal' ? '3px 2px' : '1.5px 1px'} !important;
                        color: #000000 !important;
                      }
                      #print-attendance-sheet .text-emerald-700,
                      #print-attendance-sheet .text-emerald-800 {
                        color: #047857 !important;
                      }
                      #print-attendance-sheet .text-rose-700,
                      #print-attendance-sheet .text-rose-800 {
                        color: #be123c !important;
                      }
                      #print-attendance-sheet .text-amber-700,
                      #print-attendance-sheet .text-amber-800 {
                        color: #b45309 !important;
                      }
                      #print-attendance-sheet .text-blue-900 {
                        color: #1e3a8a !important;
                      }
                      #print-attendance-sheet .text-red-600,
                      #print-attendance-sheet .text-red-700,
                      #print-attendance-sheet .text-red-800 {
                        color: #b91c1c !important;
                      }
                    }
                  `}} />

                  {/* Print Header - Matching Exact Official Layout */}
                  <div className="mb-2 text-black">
                    <div className="grid grid-cols-4 gap-4 font-bold uppercase text-[9.5px] text-black">
                      <div className="flex flex-col">
                        <span className="text-black font-extrabold text-[10px] tracking-wider uppercase">
                          {language === 'pt' ? 'PROFESSOR(A):' : 'INSTRUCTOR:'}
                        </span>
                        <div className="border-b border-black min-h-[24px] flex items-end pb-0.5 text-xs font-black px-1 text-black uppercase truncate">
                          {printProfessorName || activePrintTurma?.instrutor?.nome || profile?.nome || '—'}
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-black font-extrabold text-[10px] tracking-wider uppercase">
                          {language === 'pt' ? 'TURMA:' : 'CLASS:'}
                        </span>
                        <div className="border-b border-black min-h-[24px] flex items-end pb-0.5 text-xs font-black px-1 text-black uppercase truncate">
                          {activePrintTurma?.nome || '—'}
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-black font-extrabold text-[10px] tracking-wider uppercase">
                          {language === 'pt' ? 'DOCUMENTO:' : 'DOCUMENT:'}
                        </span>
                        <div className="border-b border-black min-h-[24px] flex items-end pb-0.5 text-xs font-black px-1 text-black font-mono uppercase truncate">
                          {printDocumento || activePrintTurma?.documento_criacao || activePrintCurso?.documento_criacao || 'ORDEM INTERNA'}
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-black font-extrabold text-[10px] tracking-wider uppercase">
                          {printSheetType === 'semanal' 
                            ? (language === 'pt' ? 'SEMANA / PERÍODO:' : 'WEEK / PERIOD:') 
                            : (language === 'pt' ? 'MÊS/ANO:' : 'MONTH/YEAR:')
                          }
                        </span>
                        <div className="border-b border-black min-h-[24px] flex items-end pb-0.5 text-xs font-mono font-black px-1 text-center justify-center text-black uppercase truncate">
                          {printSheetType === 'semanal'
                            ? (activeWeeksList[activeWeekIndex]?.label || printPeriod) 
                            : printPeriod
                          }
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Table container wrapping the exact styled attendance grid */}
                  <div className="overflow-visible mt-1.5">
                    <table className="print-attendance-table w-full border-collapse border border-black table-fixed">
                      <thead>
                        <tr className="bg-neutral-100 text-[8px] font-bold uppercase text-center h-6">
                          <th className="w-[26px] border border-black p-0.5 text-center font-black text-black">#</th>
                          <th 
                            className={cn(
                              "border border-black p-1 text-left pl-2 font-black text-black",
                              printSheetType === 'semanal' ? "w-[240px] text-[9px]" : "w-[175px] text-[8.5px]"
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
                                  "border border-black p-0.5 text-center font-mono font-black text-black",
                                  printSheetType === 'semanal' ? "w-[42px] text-[8px]" : "w-[20px] text-[7.5px]",
                                  !status.isValid ? "bg-neutral-200 text-neutral-600" :
                                  status.label === 'FE' ? "bg-red-100 text-red-800" :
                                  (status.label === 'S' || status.label === 'D') ? "bg-neutral-100 text-neutral-800" : ""
                                )}
                              >
                                <div className="flex flex-col items-center justify-center leading-tight">
                                  <span className={cn(printSheetType === 'semanal' ? "text-[8.5px]" : "text-[7.5px]", "font-black")}>{day.dayNum}</span>
                                  {printSheetType === 'semanal' ? (
                                    <span className="text-[7px] uppercase text-neutral-600 font-black">{getWeekdayName(dayOfWeek)}</span>
                                  ) : (
                                    status.isValid && (status.label === 'FE' || status.label === 'S' || status.label === 'D') && (
                                      <span className="text-[5.5px] font-black text-red-600">{status.label}</span>
                                    )
                                  )}
                                </div>
                              </th>
                            );
                          })}

                          {/* Summary Columns for Weekly and Monthly */}
                          <th className={cn("border border-black p-0.5 text-center font-black text-emerald-800 bg-emerald-50/50", printSheetType === 'semanal' ? "w-[36px] text-[8px]" : "w-[22px] text-[7px]")}>
                            P
                          </th>
                          <th className={cn("border border-black p-0.5 text-center font-black text-rose-800 bg-rose-50/50", printSheetType === 'semanal' ? "w-[36px] text-[8px]" : "w-[22px] text-[7px]")}>
                            F
                          </th>
                          <th className={cn("border border-black p-0.5 text-center font-black text-amber-800 bg-amber-50/50", printSheetType === 'semanal' ? "w-[36px] text-[8px]" : "w-[22px] text-[7px]")}>
                            FJ
                          </th>
                          {printSheetType === 'semanal' ? (
                            <th className="border border-black p-0.5 text-center font-black text-black w-[110px] text-[8px]">
                              {language === 'pt' ? 'Rubrica / Visto' : 'Signature'}
                            </th>
                          ) : (
                            <th className="border border-black p-0.5 text-center font-black text-blue-900 bg-blue-50/50 w-[28px] text-[7px]">
                              %
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {printAlunos.length > 0 ? (
                          printAlunos.map((student, index) => {
                            // Compute stats for current student
                            let studentP = 0;
                            let studentF = 0;
                            let studentFJ = 0;
                            let studentA = 0;
                            let studentD = 0;

                            daysToRender.forEach((day) => {
                              const st = getDayStatus(day.dayNum, day.month, day.year, student.id);
                              if (st.label === 'P') studentP++;
                              else if (st.label === 'F') studentF++;
                              else if (st.label === 'FJ') studentFJ++;
                              else if (st.label === 'A') studentA++;
                              else if (st.label === 'D') studentD++;
                            });

                            const totalRecorded = studentP + studentF + studentFJ;
                            const pctFreq = totalRecorded > 0 ? Math.round((studentP / totalRecorded) * 100) : null;

                            return (
                              <tr key={student.id || index} className={cn("text-[8px] font-bold uppercase", printSheetType === 'semanal' ? "h-[5.5mm]" : "h-[4.2mm]")}>
                                <td className="border border-black text-center font-mono font-bold text-[8px] text-black px-0.5">
                                  {index + 1}
                                </td>
                                <td 
                                  className={cn(
                                    "border border-black px-1.5 text-[8.5px] font-sans font-bold text-black",
                                    printSheetType === 'semanal' ? "w-[240px]" : "w-[175px]"
                                  )}
                                >
                                  <div className="flex flex-col justify-center py-0.5 leading-tight text-black">
                                    <span className="text-[8.5px] font-bold text-black truncate">
                                      {student.posto_graduacao || student.nome_guerra ? `${student.posto_graduacao || ''} ${student.nome_guerra || student.nome}`.trim() : student.nome}
                                    </span>
                                  </div>
                                </td>
                                {daysToRender.map((day) => {
                                  const status = getDayStatus(day.dayNum, day.month, day.year, student.id);
                                  return (
                                    <td 
                                      key={`${day.year}-${day.month}-${day.dayNum}`} 
                                      className={cn(
                                        "border border-black p-0 text-center font-black font-mono select-none text-black",
                                        printSheetType === 'semanal' ? "text-[8.5px]" : "text-[7px]",
                                        status.bgClass
                                      )}
                                    >
                                      {status.label}
                                    </td>
                                  );
                                })}

                                {/* Summary Totals */}
                                <td className="border border-black p-0 text-center font-bold font-mono text-emerald-800 bg-emerald-50/20 text-[8px]">
                                  {studentP > 0 ? studentP : '—'}
                                </td>
                                <td className="border border-black p-0 text-center font-bold font-mono text-rose-800 bg-rose-50/20 text-[8px]">
                                  {studentF > 0 ? studentF : '—'}
                                </td>
                                <td className="border border-black p-0 text-center font-bold font-mono text-amber-800 bg-amber-50/20 text-[8px]">
                                  {studentFJ > 0 ? studentFJ : '—'}
                                </td>
                                {printSheetType === 'semanal' ? (
                                  <td className="border border-black p-0 text-center text-[7px] text-neutral-300">
                                  </td>
                                ) : (
                                  <td className="border border-black p-0 text-center font-bold font-mono text-blue-900 bg-blue-50/20 text-[7px]">
                                    {pctFreq !== null ? `${pctFreq}%` : '—'}
                                  </td>
                                )}
                              </tr>
                            );
                          })
                        ) : (
                          <tr className="h-[4.2mm] text-[8px] font-bold uppercase">
                            <td className="border border-black text-center font-mono font-semibold text-[8px] text-black">
                              1
                            </td>
                            <td className="border border-black px-2 text-[9px] italic text-neutral-500">
                              {language === 'pt' ? 'Nenhum aluno inscrito nesta turma' : 'No students registered in this class'}
                            </td>
                            {daysToRender.map((day) => (
                              <td key={`${day.year}-${day.month}-${day.dayNum}`} className="border border-black p-0 bg-neutral-100"></td>
                            ))}
                            <td className="border border-black"></td>
                            <td className="border border-black"></td>
                            <td className="border border-black"></td>
                            <td className="border border-black"></td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Legenda & Signature Section flowing naturally directly below the sheet in the blank space */}
                  <div className="print-avoid-break break-inside-avoid">
                    <div className="mt-3.5 print:mt-1.5 grid grid-cols-2 gap-4 print:gap-3 items-start">
                      <div>
                        <div className="text-[9.5px] font-black uppercase tracking-wider mb-1 print:mb-0.5 text-black">
                          {language === 'pt' ? 'LEGENDA:' : 'LEGEND:'}
                        </div>
                        <div className="flex select-none flex-wrap gap-x-2.5 gap-y-1 text-[7.5px] font-black border border-black p-1.5 print:p-1 rounded-lg bg-neutral-50 shadow-xs">
                          <span className="text-emerald-700 font-black"><strong>P</strong> = {language === 'pt' ? 'Presente' : 'Present'}</span>
                          <span className="text-rose-700 font-black"><strong>F</strong> = {language === 'pt' ? 'Falta' : 'Absent'}</span>
                          <span className="text-amber-700 font-black"><strong>FJ</strong> = {language === 'pt' ? 'Justificada' : 'Excused'}</span>
                          <span className="text-neutral-900 font-black"><strong>A</strong> = {language === 'pt' ? 'Atraso' : 'Delay'}</span>
                          <span className="text-sky-700 font-black"><strong>D</strong> = {language === 'pt' ? 'Dispensado' : 'Exempt'}</span>
                          <span className="text-red-700 border-l border-black pl-1.5 font-black"><strong>FE</strong> = {language === 'pt' ? 'Feriado' : 'Holiday'}</span>
                          <span className="text-neutral-700 border-l border-black pl-1.5 font-black"><strong>S/D</strong> = Sáb/Dom</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[9.5px] font-black uppercase tracking-wider mb-1 print:mb-0.5 flex justify-between items-center text-black">
                          <span className="font-extrabold">{language === 'pt' ? 'FERIADOS DESCRITOS (MOTIVO):' : 'HOLIDAYS DESCRIBED (REASON):'}</span>
                          <span className="text-[7.5px] text-neutral-500 font-bold tracking-widest uppercase">SÃO TOMÉ E PRÍNCIPE</span>
                        </div>
                        <div className="flex flex-col gap-1 text-[7.5px] font-black border border-dashed border-red-500 p-1.5 print:p-1 rounded-lg bg-red-50/40 min-h-[36px] print:min-h-0 justify-center">
                          {(() => {
                            const activeHolidays = getHolidaysForDays(daysToRender);

                            return activeHolidays.length > 0 ? (
                              activeHolidays.map((holiday, hIdx) => (
                                <div key={hIdx} className="text-red-700 flex items-start gap-1 justify-start leading-tight">
                                  <span className="bg-red-600 text-white font-mono text-[6.5px] px-1 rounded shrink-0 font-extrabold">
                                    FE {holiday.day}/{String(holiday.month + 1).padStart(2, '0')}
                                  </span>
                                  <span className="font-bold shrink-0">{holiday.name}:</span>
                                  <span className="font-medium text-neutral-700 normal-case italic line-clamp-1">{holiday.meaning}</span>
                                </div>
                              ))
                            ) : (
                              <span className="text-neutral-500 italic font-mono uppercase tracking-widest text-[7px] text-center block w-full">
                                {printSheetType === 'semanal'
                                  ? (language === 'pt' ? 'NENHUM FERIADO NACIONAL NESTA SEMANA.' : 'NO NATIONAL HOLIDAYS THIS WEEK.')
                                  : (language === 'pt' ? 'NENHUM FERIADO NACIONAL NESTE MÊS.' : 'NO NATIONAL HOLIDAYS THIS MONTH.')
                                }
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Observation Warning Block */}
                    <div className="mt-2.5 print:mt-1 border border-red-500 bg-red-50/50 p-1.5 print:p-1 rounded-lg text-center font-extrabold text-[8px] print:text-[7.5px] text-red-800 tracking-wide leading-relaxed">
                      {language === 'pt' 
                        ? 'OBS.: Esta folha de presença deverá ser entregue diariamente ao Coordenador de Cursos para lançamento no controle do aluno.' 
                        : 'OBS.: This attendance sheet must be submitted daily to the Course Coordinator for entry into the student record.'
                      }
                    </div>

                    {/* Signatures Row */}
                    <div className="mt-4 print:mt-2.5 grid grid-cols-2 gap-12 text-center text-[9px] uppercase font-bold text-black print-avoid-break">
                      <div className="flex flex-col items-center">
                        <div className="w-full max-w-[260px] border-b border-black mb-1 h-5"></div>
                        <span className="text-black font-extrabold">{printProfessorName || (language === 'pt' ? 'Assinatura do Instrutor' : 'Instructor Signature')}</span>
                        <span className="text-[7px] text-slate-700 tracking-wider">{language === 'pt' ? 'Instrutor / Professor Responsável' : 'Responsible Instructor'}</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-full max-w-[260px] border-b border-black mb-1 h-5"></div>
                        <span className="text-black font-extrabold">{language === 'pt' ? 'Coordenação de Cursos' : 'Course Coordination'}</span>
                        <span className="text-[7px] text-slate-700 tracking-wider">{language === 'pt' ? 'Visto da Coordenação Pedagógica' : 'Pedagogical Coordination'}</span>
                      </div>
                    </div>

                    {/* Micro-printed controlled copy warning centered */}
                    <div className="mt-3 print:mt-1.5 text-center text-[6.5px] font-bold tracking-[0.34em] text-neutral-600 uppercase w-full">
                      {language === 'pt' ? 'Documento de uso oficial - Cópia controlada' : 'Official Document - Controlled Copy'}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
  );
}
