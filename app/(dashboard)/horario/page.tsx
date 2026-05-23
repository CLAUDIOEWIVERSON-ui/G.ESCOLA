'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { 
  Calendar, 
  Printer, 
  Loader2, 
  MapPin, 
  Shield, 
  BookOpen,
  Edit3,
  Check,
  Coffee,
  AlertCircle,
  User,
  Book,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { format, startOfWeek, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';

// Helper to fetch Brazil holidays (Simplified for this version)
const BRAZIL_HOLIDAYS = [
  { date: '2026-01-01', name: 'Confraternização Universal' },
  { date: '2026-02-17', name: 'Carnaval' },
  { date: '2026-04-03', name: 'Sexta-feira Santa' },
  { date: '2026-04-21', name: 'Tiradentes' },
  { date: '2026-05-01', name: 'Dia do Trabalho' },
  { date: '2026-06-04', name: 'Corpus Christi' },
  { date: '2026-09-07', name: 'Independência do Brasil' },
  { date: '2026-10-12', name: 'Nossa Senhora Aparecida' },
  { date: '2026-11-02', name: 'Finados' },
  { date: '2026-11-15', name: 'Proclamação da República' },
  { date: '2026-12-25', name: 'Natal' },
];

export default function HorarioPage() {
  const { t, language } = useI18n();
  const [cursos, setCursos] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [disciplinas, setDisciplinas] = useState<any[]>([]);
  const [instrutores, setInstrutores] = useState<any[]>([]);
  const [selectedCursoId, setSelectedCursoId] = useState('');
  const [selectedTurmaId, setSelectedTurmaId] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const printRef = useRef<HTMLDivElement>(null);

  // Editable Schedule State
  const [scheduleData, setScheduleData] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  
  const selectedTurma = turmas.find(tu => tu.id === selectedTurmaId);
  const selectedCurso = cursos.find(cu => cu.id === selectedCursoId);

  // Fetch schedule data when turma changes
  const fetchSchedule = useMemo(() => async (turmaId: string) => {
    if (!turmaId) {
      setScheduleData({});
      return;
    }
    try {
      const { data } = await supabase
        .from('horarios')
        .select('data')
        .eq('turma_id', turmaId)
        .single();
      
      if (data) {
        setScheduleData(data.data || {});
      } else {
        setScheduleData({});
      }
    } catch (err) {
      console.error('Error fetching schedule:', err);
      setScheduleData({});
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      await fetchSchedule(selectedTurmaId);
    };
    run();
  }, [selectedTurmaId, fetchSchedule]);

  async function handleSave() {
    if (!selectedTurmaId) return;
    setIsSaving(true);
    try {
      // Try to upsert to 'horarios' table
      const { error } = await supabase
        .from('horarios')
        .upsert({ 
          turma_id: selectedTurmaId, 
          data: scheduleData,
          updated_at: new Date().toISOString()
        }, { onConflict: 'turma_id' });

      if (error) {
        console.error('Save error:', error);
        toast.error(language === 'pt' ? 'Erro ao salvar o horário.' : 'Error saving schedule.');
      } else {
        toast.success(language === 'pt' ? 'Horário salvo com sucesso!' : 'Schedule saved successfully!');
        setIsEditMode(false);
      }
    } catch (err) {
      console.error('Failed to save schedule:', err);
    } finally {
      setIsSaving(false);
    }
  }

  const handleToggleEdit = () => {
    if (isEditMode) {
      handleSave();
    } else {
      setIsEditMode(true);
    }
  };
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const weekEnd = useMemo(() => addDays(weekStart, 4), [weekStart]);
  const weekPeriodFormatted = useMemo(() => `${format(weekStart, "dd/MM")} a ${format(weekEnd, "dd/MM/yyyy")}`, [weekStart, weekEnd]);

  const handlePrevWeek = () => {
    setCurrentDate(prev => addDays(prev, -7));
  };
  const handleNextWeek = () => {
    setCurrentDate(prev => addDays(prev, 7));
  };
  const handleCurrentWeek = () => {
    setCurrentDate(new Date());
  };

  const weekOptions = useMemo(() => {
    const options = [];
    const baseToday = new Date();
    const baseWeekStart = startOfWeek(baseToday, { weekStartsOn: 1 });
    // Generate from 4 weeks back to 8 weeks ahead
    for (let i = -4; i <= 8; i++) {
      const s = addDays(baseWeekStart, i * 7);
      const e = addDays(s, 4);
      const label = `${format(s, "dd/MM")} a ${format(e, "dd/MM/yyyy")}`;
      options.push({
        date: s,
        label: i === 0 ? `${label} (${language === 'pt' ? 'Semana Atual' : 'Current Week'})` : label,
        isCurrent: i === 0
      });
    }
    return options;
  }, [language]);

  // Generate 50min class + 10min break slots from 08:00 to 16:00
  const slots = useMemo(() => {
    const items = [];
    let currentHour = 8;
    let currentMin = 0;

    while (currentHour < 16) {
      // Class Slot
      const start = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;
      
      // End of 50 min class
      currentMin += 50;
      if (currentMin >= 60) {
        currentHour += Math.floor(currentMin / 60);
        currentMin = currentMin % 60;
      }
      const end = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;
      
      items.push({ 
        id: `class-${start}`,
        time: `${start} - ${end}`, 
        type: 'class' as const
      });

      // 10 min Break
      if (currentHour < 16) {
        const breakStart = end;
        currentMin += 10;
        if (currentMin >= 60) {
          currentHour += Math.floor(currentMin / 60);
          currentMin = currentMin % 60;
        }
        const breakEnd = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;
        
        items.push({ 
          id: `break-${breakStart}`,
          time: `${breakStart} - ${breakEnd}`, 
          type: 'interval' as const
        });
      }
    }
    return items;
  }, []);

  const weekDays = [
    { key: 'monday', label: t.schedule.monday, date: weekStart },
    { key: 'tuesday', label: t.schedule.tuesday, date: addDays(weekStart, 1) },
    { key: 'wednesday', label: t.schedule.wednesday, date: addDays(weekStart, 2) },
    { key: 'thursday', label: t.schedule.thursday, date: addDays(weekStart, 3) },
    { key: 'friday', label: t.schedule.friday, date: addDays(weekStart, 4) },
  ];

  useEffect(() => {
    async function fetchData() {
      const { data: c } = await supabase.from('cursos').select('*').is('deleted_at', null).order('nome');
      if (c) setCursos(c);
      const { data: tu } = await supabase.from('turmas').select('*').is('deleted_at', null).order('nome');
      if (tu) setTurmas(tu);
      const { data: d } = await supabase.from('disciplinas').select('*').is('deleted_at', null).order('nome');
      if (d) setDisciplinas(d);
      const { data: i } = await supabase.from('profiles').select('*').eq('role', 'instrutor');
      if (i) setInstrutores(i);
    }
    fetchData();
  }, []);

  const handlePrint = () => {
    if (!selectedTurmaId) return;
    try {
      window.print();
    } catch (err) {
      console.error('Failed to open native print dialog:', err);
      toast.error(
        language === 'pt'
          ? 'Não foi possível abrir a janela de impressão.'
          : 'Could not open print window.'
      );
    }
  };

  const updateCell = (slotId: string, dayKey: string, field: string, value: string) => {
    const weekKey = format(weekStart, 'yyyy-MM-dd');
    setScheduleData(prev => ({
      ...prev,
      [`${weekKey}_${slotId}-${dayKey}`]: {
        ...(prev[`${weekKey}_${slotId}-${dayKey}`] || prev[`${slotId}-${dayKey}`] || {}),
        [field]: value
      }
    }));
  };

  const getCellData = (slotId: string, dayKey: string) => {
    const weekKey = format(weekStart, 'yyyy-MM-dd');
    return scheduleData[`${weekKey}_${slotId}-${dayKey}`] || 
           scheduleData[`${slotId}-${dayKey}`] || 
           { subjectId: '', instructorId: '', room: '', courseId: '' };
  };

  const filteredDisciplinas = useMemo(() => {
    if (!selectedCursoId) return disciplinas;
    return disciplinas.filter(d => d.curso_id === selectedCursoId);
  }, [disciplinas, selectedCursoId]);

  const isHoliday = (date: Date) => {
    const dStr = format(date, 'yyyy-MM-dd');
    return BRAZIL_HOLIDAYS.find(h => h.date === dStr);
  };

  return (
    <div className="space-y-6 col-print-style">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Setup page size and margin to 0 for maximum control of margins via container */
          @page { 
            size: A4 ${printOrientation}; 
            margin: 0mm !important;
          }
          
          /* Force color printing across standard browsers */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          /* Hide all surrounding page layers completely */
          aside, header, nav, button, .print\:hidden, .no-print {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
            opacity: 0 !important;
            visibility: hidden !important;
          }

          /* Reset html, body, and all structural wrappers to eliminate any offsets, margins, paddings, and transforms */
          html, body {
            background: white !important;
            width: 100% !important;
            height: auto !important;
            min-height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            position: relative !important;
          }

          /* General hide rule for all descendants to prevent duplicating any content on print */
          body * {
            visibility: hidden !important;
          }

          /* Explicitly make only the printable schedule container and its descendants visible */
          .print-container,
          .print-container * {
            visibility: visible !important;
          }

          /* Neutralize containers, motion divs and layout components to allow print-container to pin perfectly at 0,0 */
          main, 
          div, 
          section, 
          .col-print-style,
          [class*="bg-slate-950"], 
          [class*="flex-1"] {
            margin: 0 !important;
            padding: 0 !important;
            transform: none !important;
            perspective: none !important;
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }

          /* Pin the schedule directly at top-left of the page viewport using absolute positioning */
          .print-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 100% !important;
            margin: 0 !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            display: flex !important;
            flex-direction: column !important;
            background: white !important;
            box-sizing: border-box !important;
            z-index: 99999999 !important;
            height: auto !important;
            min-height: 100% !important;
            page-break-after: avoid !important;
            page-break-before: avoid !important;
            page-break-inside: avoid !important;
          }

          /* Avoid dividing rows and tables weirdly across pages */
          tr { 
            page-break-inside: avoid !important; 
            page-break-after: auto !important;
          }
          table {
            page-break-inside: avoid !important;
            width: 100% !important;
            border-collapse: collapse !important;
          }

          .print-container, .print-container * {
            border-radius: 0 !important;
          }
          .print-header {
            border-bottom: 2px solid #000000 !important;
          }

          /* Portrait or Landscape specific layout scaling */
          ${printOrientation === 'landscape' ? `
            /* LANDSCAPE PRESENTATION */
            .print-container {
              padding: 10mm 12mm !important;
              height: auto !important;
              min-height: 210mm !important;
              max-height: none !important;
              justify-content: flex-start !important;
            }
            .print-header {
              padding: 14px 20px !important;
              background-color: #ffffff !important;
              color: #000000 !important;
              border-bottom: 2px solid #e2e8f0 !important;
            }
            .print-header h2 {
              font-size: 26px !important;
              line-height: 1.1 !important;
            }
            .print-content {
              padding: 0 !important;
              background: white !important;
              margin-top: 8px !important;
              margin-bottom: 8px !important;
            }
            .print-content th {
              padding: 6px 4px !important;
              background-color: #f8fafc !important;
              border-bottom: 2px solid #cbd5e1 !important;
            }
            .print-content th span {
              font-size: 9px !important;
            }
            .print-content td {
              padding: 2px !important;
              height: auto !important;
            }
            /* First/Time column scaling */
            .print-content td:first-child {
              padding: 2px !important;
              width: 70px !important;
            }
            .print-content td:first-child div {
              font-size: 10px !important;
            }
            /* Grid schedule cards inside td elements */
            .print-content .min-h-\\[140px\\] {
              min-height: 55px !important;
              height: 55px !important;
              padding: 4px 6px !important;
              border-radius: 4px !important;
              background-color: #f8fafc !important;
              border: 1px solid #e2e8f0 !important;
            }
            .print-content .min-h-\\[140px\\] span,
            .print-content .min-h-\\[140px\\] p,
            .print-content .min-h-\\[140px\\] div {
              font-size: 8px !important;
              line-height: 1.1 !important;
            }
            .print-content .min-h-\\[140px\\] svg {
              width: 8px !important;
              height: 8px !important;
            }
            /* Interval/Lunch slot compact presentation */
            .print-content tr[class*="bg-slate-50"] td {
              padding: 3px !important;
            }
            .print-content tr[class*="bg-slate-50"] span {
              font-size: 8px !important;
              letter-spacing: 0.3em !important;
            }
          ` : `
            /* PORTRAIT PRESENTATION */
            .print-container {
              padding: 12mm 15mm !important;
              height: auto !important;
              min-height: 297mm !important;
              max-height: none !important;
              justify-content: flex-start !important;
            }
            .print-header {
              padding: 18px 24px !important;
              background-color: #ffffff !important;
              color: #000000 !important;
              border-bottom: 2px solid #e2e8f0 !important;
            }
            .print-header h2 {
              font-size: 32px !important;
              line-height: 1.1 !important;
            }
            .print-content {
              padding: 0 !important;
              background: white !important;
              margin-top: 12px !important;
              margin-bottom: 12px !important;
            }
            .print-content th {
              padding: 8px 4px !important;
              background-color: #f8fafc !important;
              border-bottom: 2px solid #cbd5e1 !important;
            }
            .print-content th span {
              font-size: 11px !important;
            }
            .print-content td {
              padding: 3px !important;
              height: auto !important;
            }
            /* First/Time column scaling */
            .print-content td:first-child {
              padding: 3px !important;
              width: 85px !important;
            }
            .print-content td:first-child div {
              font-size: 11px !important;
            }
            /* Grid schedule cards inside td elements */
            .print-content .min-h-\\[140px\\] {
              min-height: 85px !important;
              height: 85px !important;
              padding: 6px 8px !important;
              border-radius: 4px !important;
              background-color: #f8fafc !important;
              border: 1px solid #e2e8f0 !important;
            }
            .print-content .min-h-\\[140px\\] span,
            .print-content .min-h-\\[140px\\] p,
            .print-content .min-h-\\[140px\\] div {
              font-size: 9px !important;
              line-height: 1.2 !important;
            }
            .print-content .min-h-\\[140px\\] svg {
              width: 10px !important;
              height: 10px !important;
            }
            /* Interval/Lunch slot compact presentation */
            .print-content tr[class*="bg-slate-50"] td {
              padding: 4px !important;
            }
            .print-content tr[class*="bg-slate-50"] span {
              font-size: 9px !important;
              letter-spacing: 0.4em !important;
            }
          `}

          /* White header/footer block elements */
          .print-header, .print-header * {
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          .print-header span, .print-header p, .print-header h2 {
            color: #000000 !important;
          }

          /* Ensure layout fonts look crisp and color adjustments are accurate */
          .print-content .text-neutral-950,
          .print-content .text-slate-800 {
            color: #000000 !important;
            font-weight: 800 !important;
          }
          .print-content .text-neutral-500,
          .print-content .text-slate-600 {
            color: #334155 !important;
            font-weight: 600 !important;
          }
          .print-content .text-neutral-400,
          .print-content .text-slate-400 {
            color: #64748b !important;
          }
        }
      `}} />

      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Calendar className="text-blue-600" size={32} />
            {t.schedule.weeklySchedule}
          </h1>
          <p className="text-slate-500 font-medium ml-11">{t.reportCard.subtitle}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleEdit}
            disabled={isSaving || !selectedTurmaId}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-lg disabled:opacity-50",
              isEditMode 
                ? "bg-emerald-600 text-white shadow-emerald-200 hover:bg-emerald-700" 
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 shadow-slate-100"
            )}
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : (isEditMode ? <Check size={18} /> : <Edit3 size={18} />)}
            {isEditMode ? (language === 'pt' ? 'Salvar' : 'Save') : (language === 'pt' ? 'Editar' : 'Edit')}
          </button>

          {selectedTurmaId && !isEditMode && (
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
              <button
                type="button"
                onClick={() => setPrintOrientation('portrait')}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer select-none",
                  printOrientation === 'portrait' 
                    ? "bg-neutral-950 text-white shadow-sm" 
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                {language === 'pt' ? 'Retrato' : 'Portrait'}
              </button>
              <button
                type="button"
                onClick={() => setPrintOrientation('landscape')}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer select-none",
                  printOrientation === 'landscape' 
                    ? "bg-neutral-950 text-white shadow-sm" 
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                {language === 'pt' ? 'Paisagem' : 'Landscape'}
              </button>
            </div>
          )}
          
          <button 
            onClick={handlePrint}
            disabled={isEditMode || !selectedTurmaId}
            className="flex items-center gap-2 bg-[#0f172a] text-white px-5 py-2.5 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50 disabled:grayscale"
          >
            <Printer size={18} />
            {t.schedule.print}
          </button>
        </div>
      </div>

      {/* Selectors */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:hidden">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
            <BookOpen size={12} /> {t.nav.courses}
          </label>
          <select
            value={selectedCursoId}
            onChange={(e) => { setSelectedCursoId(e.target.value); setSelectedTurmaId(''); }}
            className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-sm font-bold text-slate-800 appearance-none cursor-pointer"
          >
            <option value="">{t.courses.selectCourse}</option>
            {cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
            <Calendar size={12} /> {t.nav.classes}
          </label>
          <select
            value={selectedTurmaId}
            onChange={(e) => setSelectedTurmaId(e.target.value)}
            disabled={!selectedCursoId}
            className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-sm font-bold text-slate-800 appearance-none cursor-pointer disabled:opacity-50"
          >
            <option value="">{t.attendance.selectClass}</option>
            {turmas.filter(tu => tu.curso_id === selectedCursoId || !selectedCursoId).map(tu => (
              <option key={tu.id} value={tu.id}>{tu.nome}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2 flex-wrap">
            <Clock size={12} className="text-blue-500" /> {language === 'pt' ? 'Semana' : 'Week'}
          </label>
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 rounded-2xl p-1 h-[56px]">
            {/* Prev Week */}
            <button
              type="button"
              onClick={handlePrevWeek}
              disabled={!selectedTurmaId}
              className="text-slate-405 hover:text-slate-800 hover:bg-white rounded-xl transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0 flex items-center justify-center h-11 w-11 shadow-sm border border-transparent hover:border-slate-100"
              title={language === 'pt' ? 'Semana anterior' : 'Previous week'}
            >
              <ChevronLeft size={16} />
            </button>

            {/* Select Input container */}
            <div className="relative flex-1">
              <select
                value={format(weekStart, 'yyyy-MM-dd')}
                onChange={(e) => {
                  const selectedD = new Date(e.target.value);
                  setCurrentDate(selectedD);
                }}
                disabled={!selectedTurmaId}
                className="w-full px-1 py-2.5 bg-transparent outline-none text-xs font-bold text-slate-800 appearance-none cursor-pointer disabled:opacity-30 text-center"
              >
                {weekOptions.map(opt => (
                  <option key={format(opt.date, 'yyyy-MM-dd')} value={format(opt.date, 'yyyy-MM-dd')}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Next Week */}
            <button
              type="button"
              onClick={handleNextWeek}
              disabled={!selectedTurmaId}
              className="text-slate-405 hover:text-slate-800 hover:bg-white rounded-xl transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0 flex items-center justify-center h-11 w-11 shadow-sm border border-transparent hover:border-slate-100"
              title={language === 'pt' ? 'Próxima semana' : 'Next week'}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {selectedTurmaId ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center"
          >
            {/* Elegant Schedule Container */}
            <div 
              ref={printRef}
              className="w-full max-w-[1200px] bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col font-sans mb-10 print-container"
            >
              {/* Specialized Header */}
              <div className="bg-white p-12 text-slate-800 relative overflow-hidden print-header border-b border-slate-200">
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-12">
                  <div className="col-span-2 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-900">
                        {t.nav.classes}
                      </div>
                      <span className="text-slate-400 font-bold">/</span>
                      <span className="text-slate-600 font-bold">{selectedCurso?.nome}</span>
                    </div>
                    <h2 className="text-5xl font-black tracking-tighter leading-none text-slate-900 animate-fade-in">
                      {selectedTurma?.nome}
                    </h2>
                  </div>
                  
                  <div className="flex flex-col md:items-end justify-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{t.schedule.period.toUpperCase()}</p>
                    
                    {/* Beautiful, static/read-only period badge for both Screen and Print */}
                    <div className="bg-slate-50 border border-slate-200 px-6 py-3 rounded-2xl flex flex-col md:items-end shadow-sm">
                      <span className="text-xl md:text-2xl font-black text-slate-800 tracking-tight leading-none">{weekPeriodFormatted}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 leading-none">
                        {format(weekStart, 'MMMM yyyy', { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid Table */}
              <div className="p-6 bg-slate-50 flex-1 print-content">
                <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                  <table className="w-full border-collapse table-fixed">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-200">
                        <th className="w-32 px-4 py-6 border-r border-slate-200">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.schedule.time}</span>
                        </th>
                        {weekDays.map(day => {
                          const holiday = isHoliday(day.date);
                          return (
                            <th key={day.key} className={cn(
                              "px-4 py-6 border-r border-slate-200 last:border-r-0",
                              holiday ? "bg-neutral-100/50" : ""
                            )}>
                              <div className="flex flex-col gap-1">
                                <span className={cn(
                                  "text-[10px] font-black uppercase tracking-widest",
                                  holiday ? "text-neutral-500" : "text-neutral-900"
                                )}>
                                  {day.label}
                                </span>
                                <span className="text-[11px] font-bold text-neutral-400">
                                  {format(day.date, 'dd/MM')}
                                </span>
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {slots.map((slot, index) => {
                        const isClassFilled = (slotId: string) => {
                          return weekDays.some(day => {
                            const cell = getCellData(slotId, day.key);
                            return !!cell.subjectId;
                          });
                        };

                        let printClass = "";
                        if (slot.type === 'class') {
                          const filled = isClassFilled(slot.id);
                          if (!filled) {
                            printClass = "print:hidden no-print";
                          }
                        } else if (slot.type === 'interval') {
                          const prevSlot = slots[index - 1];
                          const nextSlot = slots[index + 1];
                          const prevFilled = prevSlot ? isClassFilled(prevSlot.id) : false;
                          const nextFilled = nextSlot ? isClassFilled(nextSlot.id) : false;
                          if (!prevFilled && !nextFilled) {
                            printClass = "print:hidden no-print";
                          }
                        }

                        if (slot.type === 'interval') {
                          return (
                            <tr key={slot.id} className={cn("bg-slate-50/50 border-b border-slate-100", printClass)}>
                              <td className="px-4 py-1.5 text-center border-r border-slate-200">
                                <span className="text-[9px] font-black text-slate-300 italic">{slot.time}</span>
                              </td>
                              <td colSpan={5} className="px-4 py-1.5 text-center">
                                <div className="flex items-center justify-center gap-2 opacity-30">
                                  <Coffee size={10} className="text-slate-400" />
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.8em]">
                                    {t.schedule.interval}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={slot.id} className={cn("border-b border-slate-100 last:border-b-0 print-row", printClass)}>
                            <td className="px-4 py-8 text-center border-r border-slate-200 bg-slate-50/20">
                              <div className="text-xs font-black text-slate-800 leading-none">{slot.time}</div>
                            </td>
                            {weekDays.map(day => {
                              const cell = getCellData(slot.id, day.key);
                              const holiday = isHoliday(day.date);
                              
                              if (holiday) {
                                return (
                                  <td key={day.key} className="px-3 py-3 border-r border-slate-100 last:border-r-0 bg-neutral-50">
                                    <div className="h-full flex flex-col items-center justify-center opacity-40">
                                      <AlertCircle size={14} className="text-neutral-500 mb-1" />
                                      <span className="text-[8px] font-black text-neutral-600 uppercase tracking-widest">{holiday.name}</span>
                                    </div>
                                  </td>
                                );
                              }

                              return (
                                <td key={day.key} className="px-3 py-3 border-r border-slate-100 last:border-r-0">
                                  <div className={cn(
                                    "rounded-2xl p-4 h-full flex flex-col transition-all min-h-[140px]",
                                    isEditMode 
                                      ? "bg-white border-2 border-dashed border-neutral-300" 
                                      : cell.subjectId 
                                        ? "bg-slate-50 border border-slate-200/80 shadow-sm" 
                                        : "hover:bg-slate-50/40 border border-transparent"
                                  )}>
                                    {isEditMode ? (
                                      <div className="space-y-3">
                                        <select 
                                          value={cell.subjectId || ''}
                                          onChange={(e) => updateCell(slot.id, day.key, 'subjectId', e.target.value)}
                                          className="w-full text-[10px] font-black text-neutral-950 bg-transparent border-none focus:ring-0 p-0 cursor-pointer"
                                        >
                                          <option value="">{t.schedule.subject}</option>
                                          {filteredDisciplinas.map(d => (
                                            <option key={d.id} value={d.id}>{d.nome}</option>
                                          ))}
                                        </select>

                                        <select 
                                          value={cell.instructorId || ''}
                                          onChange={(e) => updateCell(slot.id, day.key, 'instructorId', e.target.value)}
                                          className="w-full text-[10px] font-bold text-slate-600 bg-transparent border-none focus:ring-0 p-0 cursor-pointer"
                                        >
                                          <option value="">{t.schedule.instructor}</option>
                                          {instrutores.map(i => (
                                            <option key={i.id} value={i.id}>{i.full_name}</option>
                                          ))}
                                        </select>

                                        <div className="flex items-center gap-1">
                                          <MapPin size={10} className="text-slate-300" />
                                          <input 
                                            value={cell.room || ''}
                                            onChange={(e) => updateCell(slot.id, day.key, 'room', e.target.value)}
                                            placeholder="Sala"
                                            className="w-full text-[9px] font-bold text-slate-400 bg-transparent border-none focus:ring-0 p-0 placeholder:text-slate-200 uppercase"
                                          />
                                        </div>
                                      </div>
                                    ) : (
                                      cell.subjectId ? (
                                        <div className="space-y-2 flex-1 flex flex-col">
                                          <div className="space-y-1">
                                            <div className="flex items-center gap-1.5 text-neutral-950">
                                              <BookOpen size={10} />
                                              <span className="text-[11px] font-black leading-tight uppercase tracking-tight">
                                                {disciplinas.find(d => d.id === cell.subjectId)?.nome || 'Disciplina'}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-neutral-500">
                                              <User size={10} />
                                              <span className="text-[10px] font-bold">
                                                {instrutores.find(i => i.id === cell.instructorId)?.full_name || 'Instrutor'}
                                              </span>
                                            </div>
                                          </div>
                                          
                                          <div className="mt-auto pt-2 flex flex-col gap-1 border-t border-slate-100">
                                            <div className="flex items-center gap-1 text-[9px] font-black text-neutral-400 uppercase tracking-widest">
                                              <Book size={8} />
                                              <span>{selectedCurso?.nome || 'Curso'}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-neutral-400">
                                              <MapPin size={10} />
                                              <span className="text-[9px] font-black uppercase tracking-tight">{cell.room || 'N/A'}</span>
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex-1 flex items-center justify-center opacity-10">
                                          <Shield size={16} />
                                        </div>
                                      )
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                         {/* Footer */}
              <div className="px-12 py-8 bg-white flex items-center justify-between print-header border-t border-slate-200">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center">
                    <Shield size={20} className="text-slate-700" />
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{t.schedule.footerVersion}</p>
                    <p className="text-[10px] font-bold text-slate-800">Academic Scheduler • 2026</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.schedule.footerDocGenerated}</p>
                  <p className="text-xs font-black text-slate-800">{format(new Date(), "dd/MM/yyyy • HH:mm")}</p>
                </div>
              </div>         </div>
            </div>
          </motion.div>
        ) : (
          <div className="py-32 flex flex-col items-center justify-center bg-white rounded-[4rem] border border-slate-100 shadow-sm">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-8 text-slate-200">
               <Calendar size={48} strokeWidth={1} />
            </div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">Selecione uma Turma</h3>
            <p className="text-slate-400 text-sm font-medium">Use os filtros acima para carregar o quadro de horários.</p>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
