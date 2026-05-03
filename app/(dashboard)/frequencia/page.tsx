'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { 
  CalendarDays, 
  Search, 
  UserCheck, 
  UserX, 
  Save, 
  Loader2, 
  CheckCircle2, 
  LayoutGrid, 
  ListChecks,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';

export default function FrequenciaPage() {
  const { t, language } = useI18n();
  const dateLocale = language === 'pt' ? ptBR : enUS;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<'record' | 'map'>('record');
  
  const [cursos, setCursos] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [disciplinas, setDisciplinas] = useState<any[]>([]);
  
  const [selectedCurso, setSelectedCurso] = useState('');
  const [selectedTurma, setSelectedTurma] = useState('');
  const [selectedDisciplina, setSelectedDisciplina] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [students, setStudents] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, { presente: boolean, id?: string }>>({});
  const [mapData, setMapData] = useState<any[]>([]);

  useEffect(() => {
    const fetchFilters = async () => {
      const { data: cursosData } = await supabase.from('cursos').select('id, nome').is('deleted_at', null).order('nome');
      if (cursosData) setCursos(cursosData);

      const { data: turmasData } = await supabase.from('turmas').select('id, nome, curso_id').is('deleted_at', null).order('nome');
      if (turmasData) setTurmas(turmasData);

      const { data: disciplinasData } = await supabase.from('disciplinas').select('id, nome, curso_id').is('deleted_at', null).order('nome');
      if (disciplinasData) setDisciplinas(disciplinasData);
    };
    fetchFilters();
  }, []);

  const fetchAttendance = useCallback(async () => {
    if (!selectedTurma) return;
    setLoading(true);
    
    try {
      // Fetch students in the class
      const { data: alunoData, error: alunoError } = await supabase
        .from('alunos')
        .select('id, nome, matricula')
        .eq('turma_id', selectedTurma)
        .is('deleted_at', null)
        .order('nome');

      if (alunoError) throw alunoError;
      setStudents(alunoData || []);

      if (view === 'record') {
        const { data: recData, error: recError } = await supabase
          .from('frequencia')
          .select('*')
          .eq('turma_id', selectedTurma)
          .eq('data', selectedDate);

        if (recError) throw recError;

        const records: Record<string, { presente: boolean, id?: string }> = {};
        // Initialize with "present" for everyone if no records exist
        alunoData?.forEach(a => {
          records[a.id] = { presente: true };
        });
        // Override with database records
        recData?.forEach(r => {
          records[r.aluno_id] = { presente: r.presente, id: r.id };
        });
        setAttendanceRecords(records);
      } else {
        // Map View: Fetch all records for the month
        const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
        const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
        
        const { data: mapRecData, error: mapRecError } = await supabase
          .from('frequencia')
          .select('*')
          .eq('turma_id', selectedTurma)
          .gte('data', start)
          .lte('data', end);

        if (mapRecError) throw mapRecError;
        setMapData(mapRecData || []);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedTurma, selectedDate, view, currentMonth]);

  useEffect(() => {
    let active = true;
    if (selectedTurma && active) {
      setTimeout(() => {
        if (active) fetchAttendance();
      }, 0);
    }
    return () => { active = false; };
  }, [selectedTurma, fetchAttendance]);

  const handleToggleAttendance = (alunoId: string) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [alunoId]: { ...prev[alunoId], presente: !prev[alunoId].presente }
    }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedTurma) return;
    setSaving(true);
    try {
      const recordsToUpsert = Object.entries(attendanceRecords).map(([alunoId, data]) => ({
        id: data.id,
        aluno_id: alunoId,
        turma_id: selectedTurma,
        disciplina_id: selectedDisciplina || null,
        data: selectedDate,
        presente: data.presente
      }));

      const { error } = await supabase
        .from('frequencia')
        .upsert(recordsToUpsert, { onConflict: 'aluno_id, turma_id, data' });

      if (error) throw error;
      alert(t.attendance.saveSuccess);
      fetchAttendance();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const filteredTurmas = selectedCurso ? turmas.filter(t => t.curso_id === selectedCurso) : turmas;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.attendance.title}</h1>
          <p className="text-slate-500 text-sm">{t.attendance.subtitle}</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setView('record')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
              view === 'record' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <ListChecks size={18} />
            {t.attendance.record}
          </button>
          <button
            onClick={() => setView('map')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
              view === 'map' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <LayoutGrid size={18} />
            {t.attendance.map}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">
              {t.nav.courses}
            </label>
            <select
              value={selectedCurso}
              onChange={(e) => {
                setSelectedCurso(e.target.value);
                setSelectedTurma('');
              }}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm appearance-none"
            >
              <option value="">Todos os Cursos</option>
              {cursos.map(curso => (
                <option key={curso.id} value={curso.id}>{curso.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">
              {t.nav.classes}
            </label>
            <select
              value={selectedTurma}
              onChange={(e) => setSelectedTurma(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm appearance-none"
            >
              <option value="">Selecione a Turma</option>
              {filteredTurmas.map(turma => (
                <option key={turma.id} value={turma.id}>{turma.nome}</option>
              ))}
            </select>
          </div>
          {view === 'record' ? (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">
                Data
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm"
              />
            </div>
          ) : (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">
                Mês / Ano
              </label>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5">
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-white rounded transition-colors text-slate-500">
                  <ChevronLeft size={16} />
                </button>
                <span className="flex-1 text-center text-sm font-bold text-slate-700 capitalize">
                  {format(currentMonth, 'MMMM yyyy', { locale: dateLocale })}
                </span>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-white rounded transition-colors text-slate-500">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
          <button
            onClick={fetchAttendance}
            disabled={loading || !selectedTurma}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100 disabled:opacity-50 h-[38px]"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            Atualizar
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
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="p-4 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                {students.length} {t.nav.students}
              </span>
              <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest">
                <span className="flex items-center gap-1.5 text-green-600">
                   <div className="w-2 h-2 rounded-full bg-green-500" />
                   {Object.values(attendanceRecords).filter(r => r.presente).length} {t.attendance.present}
                </span>
                <span className="flex items-center gap-1.5 text-red-500">
                   <div className="w-2 h-2 rounded-full bg-red-500" />
                   {Object.values(attendanceRecords).filter(r => !r.presente).length} {t.attendance.absent}
                </span>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {students.length === 0 ? (
                <div className="py-20 text-center text-slate-400 italic text-sm">
                  Selecione uma turma para registrar a frequência.
                </div>
              ) : (
                students.map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors group">
                    <div>
                      <div className="font-bold text-slate-800">{student.nome}</div>
                      <div className="text-[10px] font-mono text-slate-400">#{student.matricula}</div>
                    </div>
                    <button
                      onClick={() => handleToggleAttendance(student.id)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all active:scale-95",
                        attendanceRecords[student.id]?.presente 
                          ? "bg-green-100 text-green-700 ring-1 ring-green-500/20" 
                          : "bg-red-50 text-red-500 ring-1 ring-red-500/20"
                      )}
                    >
                      {attendanceRecords[student.id]?.presente ? <UserCheck size={16} /> : <UserX size={16} />}
                      {attendanceRecords[student.id]?.presente ? t.attendance.present : t.attendance.absent}
                    </button>
                  </div>
                ))
              )}
            </div>

            {students.length > 0 && (
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                  onClick={handleSaveAttendance}
                  disabled={saving}
                  className="flex items-center gap-2 bg-blue-600 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-70"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  Salvar Chamada
                </button>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="map"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-4 py-4 sticky left-0 bg-white z-10 min-w-[200px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.reportCard.student}</span>
                    </th>
                    {daysInMonth.map(day => (
                      <th key={day.toString()} className="px-2 py-4 text-center min-w-[40px] border-l border-slate-50">
                        <div className="flex flex-col items-center">
                          <span className="text-[8px] font-bold text-slate-400 uppercase">{format(day, 'eee', { locale: dateLocale })}</span>
                          <span className="text-xs font-bold text-slate-700">{format(day, 'dd')}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={daysInMonth.length + 1} className="py-20 text-center text-slate-400 text-sm">
                        Selecione uma turma para visualizar o mapa.
                      </td>
                    </tr>
                  ) : (
                    students.map(student => (
                      <tr key={student.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                          <div className="text-xs font-bold text-slate-800 line-clamp-1">{student.nome}</div>
                        </td>
                        {daysInMonth.map(day => {
                          const record = mapData.find(r => r.aluno_id === student.id && isSameDay(new Date(r.data + 'T12:00:00'), day));
                          return (
                            <td key={day.toString()} className="px-1 py-3 text-center border-l border-slate-50">
                              {record ? (
                                record.presente ? (
                                  <div className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto ring-1 ring-green-500/20">
                                    <CheckCircle2 size={12} />
                                  </div>
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto ring-1 ring-red-500/20">
                                    <XCircle size={12} strokeWidth={3} />
                                  </div>
                                )
                              ) : (
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-200 mx-auto" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function XCircle({ size, strokeWidth = 2, className }: { size: number, strokeWidth?: number, className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth={strokeWidth} 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </svg>
  );
}
