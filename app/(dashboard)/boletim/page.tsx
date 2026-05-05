'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { 
  FileText, 
  Search, 
  Filter,
  Printer,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

export default function BoletimPage() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [cursos, setCursos] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [disciplinas, setDisciplinas] = useState<any[]>([]);
  const [anos, setAnos] = useState<number[]>([]);
  
  const [selectedCurso, setSelectedCurso] = useState('');
  const [selectedTurma, setSelectedTurma] = useState('');
  const [selectedDisciplina, setSelectedDisciplina] = useState('');
  const [selectedAno, setSelectedAno] = useState<string>('');
  const [courseModules, setCourseModules] = useState(4);
  
  const [boletimData, setBoletimData] = useState<any[]>([]);
  const [classStats, setClassStats] = useState({ avg: 0, total: 0 });
  const [settings, setSettings] = useState({ media_aprovacao: 6, media_recuperacao: 4, frequencia_minima: 75 });

  useEffect(() => {
    const fetchFilters = async () => {
      const { data: cursosData } = await supabase.from('cursos').select('id, nome, qtd_modulos').is('deleted_at', null).order('nome');
      if (cursosData) setCursos(cursosData);

      const { data: turmasData } = await supabase.from('turmas').select('id, nome, curso_id, ano').is('deleted_at', null).order('nome');
      if (turmasData) {
        setTurmas(turmasData);
        const uniqueAnos = Array.from(new Set(turmasData.map(t => t.ano))).sort((a, b) => b - a);
        setAnos(uniqueAnos);
      }

      const { data: disciplinasData } = await supabase.from('disciplinas').select('id, nome, curso_id').is('deleted_at', null).order('nome');
      if (disciplinasData) setDisciplinas(disciplinasData);

      const { data: configData } = await supabase.from('configuracoes').select('*').single();
      if (configData) setSettings(configData);
    };
    fetchFilters();
  }, []);

  const handleSearch = async () => {
    if (!selectedTurma || !selectedDisciplina) {
      alert(t.common.selectRequired);
      return;
    }

    setLoading(true);
    try {
      // Find course modules count
      const turma = turmas.find(t => t.id === selectedTurma);
      const cursoId = turma?.curso_id;
      if (cursoId) {
        const curso = cursos.find(c => c.id === cursoId);
        if (curso) {
          setCourseModules(Math.min(curso.qtd_modulos || 4, 5));
        }
      }

      let query = supabase
        .from('notas')
        .select(`
          *,
          aluno:alunos(id, nome, matricula)
        `)
        .eq('turma_id', selectedTurma)
        .eq('disciplina_id', selectedDisciplina);

      if (selectedAno) {
        query = query.eq('ano_letivo', parseInt(selectedAno));
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        setBoletimData(data);
        
        const totalGrades = data.reduce((acc, curr) => acc + (Number(curr.nota_final) || 0), 0);
        const avg = data.length > 0 ? totalGrades / data.length : 0;
        setClassStats({ avg, total: data.length });
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatus = (final: number | null, freq: number | null) => {
    if (final === null || freq === null) return { 
      label: t.grades.pending, 
      className: 'bg-slate-100 text-slate-600',
      icon: AlertCircle 
    };
    if (final >= settings.media_aprovacao && freq >= settings.frequencia_minima) return { 
      label: t.grades.approved, 
      className: 'bg-green-100 text-green-700',
      icon: CheckCircle2 
    };
    if (freq < settings.frequencia_minima) return { 
      label: t.grades.lowFrequency, 
      className: 'bg-orange-100 text-orange-700',
      icon: AlertCircle 
    };
    if (final >= settings.media_recuperacao) return {
      label: t.grades.retake,
      className: 'bg-yellow-100 text-yellow-700 font-bold',
      icon: AlertCircle
    };
    return { 
      label: t.grades.reproved, 
      className: 'bg-red-100 text-red-700',
      icon: XCircle 
    };
  };

  const filteredTurmas = turmas.filter(t => {
    const matchCurso = selectedCurso ? t.curso_id === selectedCurso : true;
    const matchAno = selectedAno ? t.ano === parseInt(selectedAno) : true;
    return matchCurso && matchAno;
  });
  const filteredDisciplinas = selectedCurso ? disciplinas.filter(d => d.curso_id === selectedCurso) : disciplinas;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.reportCard.title}</h1>
          <p className="text-slate-500 text-sm">{t.reportCard.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm"
          >
            <Printer size={18} />
            {t.reportCard.print}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">
              {t.nav.courses}
            </label>
            <select
              value={selectedCurso}
              onChange={(e) => {
                setSelectedCurso(e.target.value);
                setSelectedTurma('');
                setSelectedDisciplina('');
              }}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm appearance-none"
            >
              <option value="">{t.common.all} {t.nav.courses}</option>
              {cursos.map(curso => (
                <option key={curso.id} value={curso.id}>{curso.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">
              {t.nav.year}
            </label>
            <select
              value={selectedAno}
              onChange={(e) => setSelectedAno(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm appearance-none"
            >
              <option value="">{t.common.all}</option>
              {anos.map(ano => (
                <option key={ano} value={ano}>{ano}</option>
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
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm appearance-none"
            >
              <option value="">{t.grades.selectClass}</option>
              {filteredTurmas.map(turma => (
                <option key={turma.id} value={turma.id}>{turma.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">
              {t.nav.subjects}
            </label>
            <select
              value={selectedDisciplina}
              onChange={(e) => setSelectedDisciplina(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm appearance-none"
            >
              <option value="">{t.grades.selectSubject}</option>
              {filteredDisciplinas.map(disciplina => (
                <option key={disciplina.id} value={disciplina.id}>{disciplina.nome}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100 disabled:opacity-70 h-[38px]"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            {t.common.search}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Statistics */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 text-slate-400 mb-2">
              <Users size={16} />
              <span className="text-[10px] font-bold uppercase tracking-widest">{t.nav.students}</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{classStats.total}</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm ring-1 ring-blue-500/5 bg-gradient-to-br from-white to-blue-50/30">
            <div className="flex items-center gap-3 text-blue-400 mb-2">
              <AlertCircle size={16} />
              <span className="text-[10px] font-bold uppercase tracking-widest">{t.reportCard.overallAverage}</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{classStats.avg.toFixed(2)}</div>
            <div className="mt-2 w-full h-1.5 bg-blue-100 rounded-full overflow-hidden">
               <div className="h-full bg-blue-500 transition-all" style={{ width: `${(classStats.avg / 10) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Grades Table */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
             <div className="p-4 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2">{t.common.finalResult}</span>
                <div className="flex gap-2">
                   <button className="p-1.5 hover:bg-slate-100 rounded text-slate-400 transition-colors">
                      <Download size={16} />
                   </button>
                </div>
             </div>

             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="text-[10px] font-bold text-slate-400 border-b border-slate-100 uppercase tracking-wider">
                      <th className="px-6 py-4">{t.reportCard.student}</th>
                      {Array.from({ length: courseModules }).map((_, i) => (
                        <th key={i} className="px-3 py-4 text-center">MOD {i + 1}</th>
                      ))}
                      <th className="px-6 py-4 text-center">{t.reportCard.average}</th>
                      <th className="px-6 py-4 text-right">{t.reportCard.status}</th>
                   </tr>
                 </thead>
                 <tbody>
                   {boletimData.length === 0 ? (
                     <tr>
                        <td colSpan={3 + courseModules} className="py-20 text-center">
                           <div className="flex flex-col items-center text-slate-300">
                              <FileText size={48} className="mb-4 opacity-20" />
                              <p className="text-sm font-medium">{t.reportCard.noData}</p>
                           </div>
                        </td>
                     </tr>
                   ) : (
                     boletimData.map((row) => {
                       const status = getStatus(row.nota_final, row.frequencia);
                       const StatusIcon = status.icon;
                       return (
                         <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/40 transition-colors group">
                           <td className="px-6 py-4">
                             <div className="font-bold text-slate-800">{row.aluno?.nome}</div>
                             <div className="text-[10px] font-mono text-slate-400 tracking-tight">#{row.aluno?.matricula}</div>
                           </td>
                           {Array.from({ length: courseModules }).map((_, i) => {
                             const notaValue = (row as any)[`nota${i + 1}`];
                             return (
                               <td key={i} className="px-3 py-4 text-center font-mono text-sm text-slate-500">
                                 {notaValue !== null && notaValue !== undefined ? Number(notaValue).toFixed(1) : '-'}
                               </td>
                             );
                           })}
                           <td className="px-6 py-4 text-center">
                              <span className={cn("font-bold font-mono text-sm", (row.nota_final || 0) >= settings.media_aprovacao ? "text-blue-600" : (row.nota_final || 0) >= settings.media_recuperacao ? "text-yellow-600" : "text-red-500")}>
                                {row.nota_final?.toFixed(1) || '-'}
                              </span>
                           </td>
                           <td className="px-6 py-4 text-right">
                              <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ring-1 ring-inset ring-current/20", status.className)}>
                                 <StatusIcon size={12} />
                                 {status.label}
                              </div>
                           </td>
                         </tr>
                       );
                     })
                   )}
                 </tbody>
               </table>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
