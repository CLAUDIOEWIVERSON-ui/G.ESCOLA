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
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import html2canvas from 'html2canvas';

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
  const [selectedCursoId, setSelectedCursoId] = useState('');
  const [selectedTurmaId, setSelectedTurmaId] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Editable Schedule State
  const [scheduleData, setScheduleData] = useState<Record<string, any>>({});
  
  const selectedTurma = turmas.find(tu => tu.id === selectedTurmaId);
  const selectedCurso = cursos.find(cu => cu.id === selectedCursoId);

  // Calculate current week period
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const weekPeriodFormatted = `${format(weekStart, "dd/MM")} a ${format(weekEnd, "dd/MM/yyyy")}`;

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
    }
    fetchData();
  }, []);

  const handlePrint = async () => {
    if (!printRef.current) return;
    setIsPrinting(true);
    try {
      const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const win = window.open('', '_blank');
      if (!win) return;
      win.document.write(`<html><head><title>Horário</title><style>@page { size: portrait; margin: 10mm; } body { margin: 0; display: flex; justify-content: center; } img { width: 100%; height: auto; }</style></head><body><img src="${imgData}" onload="window.print(); window.close();" /></body></html>`);
      win.document.close();
    } finally {
      setIsPrinting(false);
    }
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
    return scheduleData[`${slotId}-${dayKey}`] || { subject: '', room: '' };
  };

  const isHoliday = (date: Date) => {
    const dStr = format(date, 'yyyy-MM-dd');
    return BRAZIL_HOLIDAYS.find(h => h.date === dStr);
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Calendar className="text-blue-600" size={32} />
            {t.schedule.weeklySchedule}
          </h1>
          <p className="text-slate-500 font-medium ml-11">{t.reportCard.subtitle}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-lg",
              isEditMode 
                ? "bg-emerald-500 text-white shadow-emerald-100 hover:bg-emerald-600" 
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            )}
          >
            {isEditMode ? <Check size={18} /> : <Edit3 size={18} />}
            {isEditMode ? (language === 'pt' ? 'Salvar' : 'Save') : (language === 'pt' ? 'Editar' : 'Edit')}
          </button>
          
          <button 
            onClick={handlePrint}
            disabled={isPrinting || !selectedTurmaId}
            className="flex items-center gap-2 bg-[#0f172a] text-white px-5 py-2.5 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50 disabled:grayscale"
          >
            {isPrinting ? <Loader2 size={18} className="animate-spin" /> : <Printer size={18} />}
            {t.schedule.print}
          </button>
        </div>
      </div>

      {/* Selectors */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
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
              className="w-full max-w-[1200px] bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col font-sans mb-10"
            >
              {/* Specialized Header */}
              <div className="bg-slate-900 p-12 text-white relative overflow-hidden">
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
                  
                  <div className="flex flex-col md:items-end justify-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{t.schedule.period.toUpperCase()}</p>
                    <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl inline-flex flex-col items-end">
                      <span className="text-2xl font-black text-white">{weekPeriodFormatted}</span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{format(today, 'MMMM yyyy', { locale: ptBR })}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid Table */}
              <div className="p-6 bg-slate-50 flex-1">
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
                          <tr key={slot.id} className="border-b border-slate-100 last:border-b-0">
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
                                    "rounded-2xl p-4 h-full flex flex-col transition-all",
                                    isEditMode ? "bg-white border-2 border-dashed border-blue-200" : "hover:bg-slate-50"
                                  )}>
                                    {isEditMode ? (
                                      <div className="space-y-3">
                                        <input 
                                          value={cell.subject || ''}
                                          onChange={(e) => updateCell(slot.id, day.key, 'subject', e.target.value)}
                                          placeholder="Disciplina"
                                          className="w-full text-[11px] font-black text-blue-900 bg-transparent border-none focus:ring-0 p-0 placeholder:text-slate-300"
                                        />
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
                                      cell.subject ? (
                                        <>
                                          <div className="text-[11px] font-black text-slate-800 leading-tight mb-auto">
                                            {cell.subject}
                                          </div>
                                          <div className="flex items-center gap-1.5 text-slate-400 mt-4">
                                            <MapPin size={10} />
                                            <span className="text-[9px] font-black uppercase tracking-tight">{cell.room}</span>
                                          </div>
                                        </>
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
              <div className="px-12 py-8 bg-slate-900 flex items-center justify-between">
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
