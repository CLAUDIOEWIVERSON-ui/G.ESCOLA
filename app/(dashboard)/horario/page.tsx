'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { useUser } from '@/lib/auth/UserContext';
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
  GraduationCap,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import html2canvas from 'html2canvas';
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
  const { profile, isAdmin, isInstrutor, isAluno } = useUser();
  const [cursos, setCursos] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [disciplinas, setDisciplinas] = useState<any[]>([]);
  const [instrutores, setInstrutores] = useState<any[]>([]);
  const [selectedCursoId, setSelectedCursoId] = useState('');
  const [selectedTurmaId, setSelectedTurmaId] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const [studentTurma, setStudentTurma] = useState<any>(null);

  // Editable Schedule State
  const [scheduleData, setScheduleData] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  
  const selectedTurma = studentTurma || turmas.find(tu => tu.id === selectedTurmaId);
  const selectedCurso = cursos.find(cu => cu.id === (selectedTurma?.curso_id || selectedCursoId));

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
      const idToFetch = isAluno ? studentTurma?.id : selectedTurmaId;
      if (idToFetch) {
        await fetchSchedule(idToFetch);
      }
    };
    run();
  }, [selectedTurmaId, studentTurma, isAluno, fetchSchedule]);

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
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 4); // Periodo somente de segunda a sexta-feira
  const weekPeriodFormatted = `${format(weekStart, "dd/MM")} a ${format(weekEnd, "dd/MM/yyyy")}`;

  const handlePreviousWeek = () => {
    setCurrentDate(prev => addDays(prev, -7));
  };

  const handleNextWeek = () => {
    setCurrentDate(prev => addDays(prev, 7));
  };

  const handleCurrentWeek = () => {
    setCurrentDate(new Date());
  };

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

      if (isAluno && profile?.email) {
        try {
          const { data: alunoData } = await supabase
            .from('alunos')
            .select('*, turmas(*)')
            .eq('email', profile.email)
            .single();
          
          if (alunoData && alunoData.turmas) {
            const tData = Array.isArray(alunoData.turmas) ? alunoData.turmas[0] : alunoData.turmas;
            setStudentTurma(tData);
            setSelectedTurmaId(tData.id);
          }
        } catch (err) {
          console.error("Error fetching alumno turma:", err);
        }
      }
    }
    if (profile?.email || !isAluno) {
      fetchData();
    }
  }, [profile, isAluno]);

  const handlePrint = () => {
    window.print();
  };

  const updateCell = (slotId: string, dayKey: string, field: string, value: string) => {
    setScheduleData(prev => ({
      ...prev,
      [`${slotId}-${dayKey}`]: {
        ...prev[`${slotId}-${dayKey}`],
        [field]: value
      }
    }));
  };

  const getCellData = (slotId: string, dayKey: string) => {
    return scheduleData[`${slotId}-${dayKey}`] || { subjectId: '', instructorId: '', room: '', courseId: '' };
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
    <div className="space-y-6">
      <style jsx global>{`
        @media print {
          /* Setup page format to Landscape to ensure a wide grid layout fits standard A4 perfectly */
          @page { 
            size: A4 landscape; 
            margin: 6mm 8mm;
          }
          
          /* Force parent and layout containers to occupy natural print sizing without clipping */
          body, html, #__next, .flex-1, main {
            background: white !important;
            color: #0f172a !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            overflow: visible !important;
            height: auto !important;
            width: auto !important;
            display: block !important;
          }

          /* Hide UI wrappers, sidebars, headers and bottom navigations */
          header, aside, nav, .print\:hidden, [class*="print:hidden"], #sidebar-nav, .no-print {
            display: none !important;
          }

          /* Reset container sizing for full page utility */
          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 8px !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
          }

          /* Scale and densify headers/footers */
          .print-header {
            padding: 8px 16px !important;
            background: #0f172a !important;
            color: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-header h2 {
            font-size: 18px !important;
            line-height: 1.2 !important;
          }
          .print-header .text-5xl {
            font-size: 18px !important;
          }
          .print-header .col-span-2 {
            display: flex !important;
            flex-direction: column !important;
            gap: 2px !important;
          }
          .print-header .space-y-4 > * {
            margin: 0 !important;
          }
          .print-header .text-[10px], .print-header .text-[8px], .print-header .text-[9px] {
            font-size: 7px !important;
          }
          .print-header .text-xl {
            font-size: 11px !important;
          }
          .print-header .px-5 {
            padding-left: 10px !important;
            padding-right: 10px !important;
          }
          .print-header .py-2\.5 {
            padding-top: 4px !important;
            padding-bottom: 4px !important;
          }
          .print-header .px-12, .print-header .py-8 {
            padding: 6px 16px !important;
          }
          .print-header .w-10, .print-header .h-10 {
            width: 24px !important;
            height: 24px !important;
          }
          .print-header .w-96, .print-header .h-96, .print-header .w-64, .print-header .h-64 {
            display: none !important;
          }

          /* Printable Main Content Wrapper */
          .print-content {
            padding: 6px !important;
            background: white !important;
          }

          .print-content > div {
            border: 1px solid #cbd5e1 !important;
            border-radius: 6px !important;
          }

          /* Compress table headers */
          .print-content table th {
            padding: 4px 2px !important;
            border-bottom: 1px solid #cbd5e1 !important;
            background-color: #f8fafc !important;
          }
          .print-content table th span.text-\[10px\] {
            font-size: 8px !important;
          }
          .print-content table th span.text-\[11px\] {
            font-size: 8px !important;
          }

          /* Set specific narrower width for Time column header */
          .print-content table th.w-32 {
            width: 70px !important;
          }

          /* Hour cell padding reduction */
          .print-content table td.py-8 {
            padding: 4px 2px !important;
            background-color: #f8fafc !important;
            font-size: 8px !important;
            width: 70px !important;
          }
          .print-content table td.py-8 .text-xs {
            font-size: 9px !important;
          }

          /* Break-rows height and padding reduction */
          .print-content table tr td.py-1\.5 {
            padding: 2px 4px !important;
            background-color: #f8fafc !important;
          }
          .print-content table tr td.py-1\.5 span {
            font-size: 7.5px !important;
          }

          /* Compress class cells/cards */
          .print-content table td {
            padding: 2px !important;
            border-bottom: 1px solid #cbd5e1 !important;
            border-right: 1px solid #cbd5e1 !important;
          }
          .print-content table td:last-child {
            border-right: none !important;
          }
          .print-content table tr:last-child td {
            border-bottom: none !important;
          }

          /* Modify day details block to make them dense */
          .print-content table td div.rounded-2xl {
            padding: 4px 6px !important;
            min-height: 48px !important;
            border-radius: 4px !important;
            border: 1px solid #cbd5e1 !important;
            background-color: #fcfcfc !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          /* Text scaling for schedule elements */
          .print-content table td div.rounded-2xl span.text-\[11px\] {
            font-size: 8px !important;
          }
          .print-content table td div.rounded-2xl span.text-\[10px\] {
            font-size: 7.5px !important;
          }
          .print-content table td div.rounded-2xl span.text-\[9px\] {
            font-size: 7px !important;
          }
          .print-content table td div.rounded-2xl .space-y-2 {
            margin: 0 !important;
          }
          .print-content table td div.rounded-2xl .space-y-1 > div {
            margin-bottom: 1px !important;
            gap: 2px !important;
          }
          .print-content table td div.rounded-2xl .mt-auto {
            margin-top: 2px !important;
            padding-top: 2px !important;
            border-top: 1px solid #e2e8f0 !important;
          }
          
          /* Downsize Icons in schedules */
          .print-content table td div.rounded-2xl svg {
            width: 8px !important;
            height: 8px !important;
          }

          .print-row {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          table { 
            page-break-inside: avoid !important;
            width: 100% !important;
            height: auto !important;
          }
          tr { 
            page-break-inside: avoid !important; 
            page-break-after: auto !important;
          }
        }
      `}</style>

      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Calendar className="text-blue-600" size={32} />
            {t.schedule.weeklySchedule}
          </h1>
          <p className="text-slate-500 font-medium ml-11">{t.reportCard.subtitle}</p>
        </div>
        
        {!isAluno && (
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
            
            <button 
              onClick={handlePrint}
              disabled={isPrinting || isEditMode || !selectedTurmaId}
              className="flex items-center gap-2 bg-[#0f172a] text-white px-5 py-2.5 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50 disabled:grayscale"
            >
              {isPrinting ? <Loader2 size={18} className="animate-spin" /> : <Printer size={18} />}
              {t.schedule.print}
            </button>
          </div>
        )}
      </div>

      {/* Selectors */}
      {!isAluno && (
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
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
        </div>
      )}

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
              <div className="bg-slate-900 p-12 text-white relative overflow-hidden print-header">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full -mr-48 -mt-48 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-600/10 rounded-full -ml-32 -mb-32 blur-3xl" />
                
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-12">
                  <div className="col-span-2 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-1 bg-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                        {t.nav.classes}
                      </div>
                      <span className="text-slate-400 font-bold">/</span>
                      <span className="text-blue-400 font-bold">{selectedCurso?.nome}</span>
                    </div>
                    <h2 className="text-5xl font-black tracking-tighter leading-none">
                      {selectedTurma?.nome}
                    </h2>
                  </div>
                  
                  <div className="flex flex-col md:items-end justify-center gap-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      {t.schedule.period.toUpperCase()} • Ref. Ano Letivo {selectedTurma?.ano || '2026'}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-3 justify-end">
                      {/* Controles de Navegação */}
                      <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl p-1 shadow-inner print:hidden">
                        <button
                          type="button"
                          onClick={handlePreviousWeek}
                          className="p-1 px-2 hover:bg-white/10 text-white rounded-xl transition-all hover:scale-105 active:scale-95"
                          title={language === 'pt' ? 'Semana Anterior' : 'Previous Week'}
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={handleCurrentWeek}
                          className="px-2.5 py-1 hover:bg-white/10 text-[9px] font-black uppercase text-white rounded-lg transition-all hover:scale-105 active:scale-95 border border-white/5 bg-white/5"
                        >
                          {language === 'pt' ? 'Hoje' : 'Today'}
                        </button>
                        <button
                          type="button"
                          onClick={handleNextWeek}
                          className="p-1 px-2 hover:bg-white/10 text-white rounded-xl transition-all hover:scale-105 active:scale-95"
                          title={language === 'pt' ? 'Próxima Semana' : 'Next Week'}
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>

                      {/* Caixa de Período */}
                      <div className="bg-white/5 border border-white/10 px-5 py-2.5 rounded-2xl flex flex-col items-end shadow-lg backdrop-blur-sm">
                        <span className="text-xl font-black text-white leading-tight">{weekPeriodFormatted}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                          {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                        </span>
                      </div>
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
                              holiday ? "bg-amber-50/30" : ""
                            )}>
                              <div className="flex flex-col gap-1">
                                <span className={cn(
                                  "text-[10px] font-black uppercase tracking-widest",
                                  holiday ? "text-amber-600" : "text-slate-900"
                                )}>
                                  {day.label}
                                </span>
                                <span className="text-[11px] font-bold text-slate-400">
                                  {format(day.date, 'dd/MM')}
                                </span>
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {slots.map((slot) => {
                        if (slot.type === 'interval') {
                          return (
                            <tr key={slot.id} className="bg-slate-50/50 border-b border-slate-100">
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
                          <tr key={slot.id} className="border-b border-slate-100 last:border-b-0 print-row">
                            <td className="px-4 py-8 text-center border-r border-slate-200 bg-slate-50/20">
                              <div className="text-xs font-black text-slate-800 leading-none">{slot.time}</div>
                            </td>
                            {weekDays.map(day => {
                              const cell = getCellData(slot.id, day.key);
                              const holiday = isHoliday(day.date);
                              
                              if (holiday) {
                                return (
                                  <td key={day.key} className="px-3 py-3 border-r border-slate-100 last:border-r-0 bg-amber-50/20">
                                    <div className="h-full flex flex-col items-center justify-center opacity-40">
                                      <AlertCircle size={14} className="text-amber-500 mb-1" />
                                      <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest">{holiday.name}</span>
                                    </div>
                                  </td>
                                );
                              }

                              return (
                                <td key={day.key} className="px-3 py-3 border-r border-slate-100 last:border-r-0">
                                  <div className={cn(
                                    "rounded-2xl p-4 h-full flex flex-col transition-all min-h-[140px]",
                                    isEditMode ? "bg-white border-2 border-dashed border-blue-200" : "hover:bg-slate-50"
                                  )}>
                                    {isEditMode ? (
                                      <div className="space-y-3">
                                        <select 
                                          value={cell.subjectId || ''}
                                          onChange={(e) => updateCell(slot.id, day.key, 'subjectId', e.target.value)}
                                          className="w-full text-[10px] font-black text-blue-900 bg-transparent border-none focus:ring-0 p-0 cursor-pointer"
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
                                            <div className="flex items-center gap-1.5 text-blue-600">
                                              <BookOpen size={10} />
                                              <span className="text-[11px] font-black leading-tight uppercase tracking-tight">
                                                {disciplinas.find(d => d.id === cell.subjectId)?.nome || 'Disciplina'}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-slate-500">
                                              <User size={10} />
                                              <span className="text-[10px] font-bold">
                                                {instrutores.find(i => i.id === cell.instructorId)?.full_name || 'Instrutor'}
                                              </span>
                                            </div>
                                          </div>
                                          
                                          <div className="mt-auto pt-2 flex flex-col gap-1 border-t border-slate-100">
                                            <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                              <Book size={8} />
                                              <span>{selectedCurso?.nome || 'Curso'}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-slate-400">
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
              </div>

              {/* Footer */}
              <div className="px-12 py-8 bg-slate-900 flex items-center justify-between print-header">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                    <Shield size={20} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{t.schedule.footerVersion}</p>
                    <p className="text-[10px] font-bold text-white">Academic Scheduler • 2026</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.schedule.footerDocGenerated}</p>
                  <p className="text-xs font-black text-white">{format(new Date(), "dd/MM/yyyy • HH:mm")}</p>
                </div>
              </div>
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
