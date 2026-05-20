'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { useUser } from '@/lib/auth/UserContext';
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
  Users,
  GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function BoletimPage() {
  const { t, language } = useI18n();
  const { profile, isAdmin, isInstrutor, isAluno } = useUser();
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
  const [settings, setSettings] = useState({ media_aprovacao: 7, media_recuperacao: 5, frequencia_minima: 75, nota_maxima: 10 });
  const [studentInfo, setStudentInfo] = useState<any>(null);

  useEffect(() => {
    const fetchFilters = async () => {
      const { data: configData } = await supabase.from('configuracoes').select('*').single();
      if (configData) setSettings(configData);

      if (isAluno) {
        setLoading(true);
        try {
          // Find student by email
          const { data: alunoData } = await supabase
            .from('alunos')
            .select('*, turmas(id, nome, curso_id, ano)')
            .eq('email', profile?.email)
            .single();

          if (alunoData) {
            setStudentInfo(alunoData);
            const turma = Array.isArray(alunoData.turmas) ? alunoData.turmas[0] : alunoData.turmas;
            
            // Get all grades for this student
            const { data: gradesData } = await supabase
              .from('notas')
              .select(`
                *,
                disciplina:disciplinas(nome)
              `)
              .eq('aluno_id', alunoData.id);

            if (gradesData) {
              setBoletimData(gradesData);
            }
          }
        } catch (err) {
          console.error("Error fetching student boletim:", err);
        } finally {
          setLoading(false);
        }
        return;
      }

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
    };
    if (profile?.email) {
      fetchFilters();
    }
  }, [profile, isAluno]);

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
          aluno:alunos(id, nome, matricula, foto_url)
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

  const maxAvgInBoletim = boletimData.length > 0 
    ? Math.max(...boletimData.map(r => Number(r.nota_final)).filter(n => !isNaN(n)), -1) 
    : -1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.reportCard.title}</h1>
          <p className="text-slate-500 text-sm">
            {t.reportCard.subtitle}
            {selectedTurma && turmas.find(t => t.id === selectedTurma)?.data_inicio && (
              <span className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase tracking-widest border border-blue-100">
                {format(new Date(turmas.find(t => t.id === selectedTurma).data_inicio), 'dd/MM/yyyy')} 
                {turmas.find(t => t.id === selectedTurma).data_fim ? ` - ${format(new Date(turmas.find(t => t.id === selectedTurma).data_fim), 'dd/MM/yyyy')}` : ''}
              </span>
            )}
          </p>
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

      {/* Filters or Student Info */}
      {!isAluno ? (
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
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-8"
        >
          <div className="relative w-32 h-44 bg-slate-100 rounded-2xl overflow-hidden border-4 border-white shadow-xl rotate-[-2deg]">
            {studentInfo?.foto_url ? (
              <Image 
                src={studentInfo.foto_url} 
                alt={studentInfo.nome} 
                fill 
                className="object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                <Users size={48} />
                <span className="text-[10px] font-black uppercase mt-2">3x4</span>
              </div>
            )}
          </div>
          <div className="flex-1 space-y-4 text-center md:text-left">
            <div>
              <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">{studentInfo?.turmas?.nome || "Carregando turma..."}</p>
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">{studentInfo?.nome}</h2>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-2">
                <span className="text-xs font-bold text-slate-400 font-mono tracking-tighter">MAT: {studentInfo?.matricula}</span>
                <span className="text-xs font-bold text-slate-400 font-mono tracking-tighter">NIF: {studentInfo?.nif || '---'}</span>
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 text-[10px] font-black uppercase tracking-widest">
                  <CheckCircle2 size={12} />
                  Ativo
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ano Letivo</p>
                <p className="text-sm font-black text-slate-700">{studentInfo?.turmas?.ano || '---'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Posto/Grad</p>
                <p className="text-sm font-black text-slate-700">{studentInfo?.posto_graduacao || '---'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">OM</p>
                <p className="text-sm font-black text-slate-700">{studentInfo?.om || '---'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Freq. Min</p>
                <p className="text-sm font-black text-slate-700">{settings.frequencia_minima}%</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className={cn("grid grid-cols-1 gap-6", !isAluno ? "lg:grid-cols-4" : "")}>
        {/* Statistics - Only show for non-student or summarized for student? */}
        {!isAluno && (
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
        )}

        {/* Grades Table */}
        <div className={cn("overflow-hidden", !isAluno ? "lg:col-span-3" : "col-span-full")}>
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
             <div className="p-6 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">{isAluno ? "Histórico Escolar Detalhado" : t.common.finalResult}</h3>
                <div className="flex gap-2">
                   <button 
                     onClick={() => window.print()}
                     className="p-2 inline-flex items-center gap-2 bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-[10px] font-bold uppercase tracking-widest shadow-sm"
                   >
                      <Printer size={16} />
                      Exportar PDF
                   </button>
                </div>
             </div>

             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="text-[10px] font-black text-slate-400 border-b border-slate-100 uppercase tracking-widest bg-slate-50/50">
                      <th className="px-6 py-4">{isAluno ? "Disciplina / Matéria" : t.reportCard.student}</th>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <th key={i} className="px-3 py-4 text-center">MOD {i + 1}</th>
                      ))}
                      <th className="px-6 py-4 text-center">{t.reportCard.average}</th>
                      <th className="px-6 py-4 text-right">{t.reportCard.status}</th>
                   </tr>
                 </thead>
                 <tbody>
                   {loading ? (
                     <tr>
                        <td colSpan={8} className="py-20 text-center">
                           <div className="flex flex-col items-center">
                              <Loader2 size={48} className="animate-spin text-blue-600 opacity-20 mb-4" />
                              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Consultando Registros...</p>
                           </div>
                        </td>
                     </tr>
                   ) : boletimData.length === 0 ? (
                     <tr>
                        <td colSpan={8} className="py-20 text-center">
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
                         <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors group">
                           <td className="px-6 py-5">
                             <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                  <GraduationCap size={16} />
                               </div>
                               <div>
                                 <div className="font-black text-slate-800 text-sm">{isAluno ? row.disciplina?.nome : row.aluno?.nome}</div>
                                 {!isAluno && <div className="text-[10px] font-mono text-slate-400 tracking-tight">#{row.aluno?.matricula}</div>}
                               </div>
                             </div>
                           </td>
                           {Array.from({ length: 5 }).map((_, i) => {
                             const notaValue = (row as any)[`nota${i + 1}`];
                             return (
                               <td key={i} className="px-3 py-5 text-center font-mono text-sm font-bold text-slate-400 group-hover:text-slate-900 transition-colors">
                                 {notaValue !== null && notaValue !== undefined ? Number(notaValue).toFixed(1) : '-'}
                               </td>
                             );
                           })}
                           <td className="px-6 py-5 text-center">
                              <span className={cn("font-black font-mono text-base bg-slate-50 px-3 py-1 rounded-lg border border-slate-100", (row.nota_final || 0) >= settings.media_aprovacao ? "text-blue-600" : (row.nota_final || 0) >= settings.media_recuperacao ? "text-yellow-600" : "text-red-500")}>
                                {row.nota_final?.toFixed(1) || '-'}
                              </span>
                           </td>
                           <td className="px-6 py-5 text-right">
                              <div className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ring-1 ring-inset ring-current/10", status.className)}>
                                 <StatusIcon size={12} strokeWidth={3} />
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
