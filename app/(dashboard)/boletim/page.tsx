'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useCursos, useTurmas, useDisciplinas, useConfiguracoes } from '@/hooks/useCachedData';
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
  Users,
  X,
  Award,
  Shield,
  Clock,
  BookOpen,
  Calendar,
  User,
  Percent
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useUser } from '@/lib/auth/UserContext';

const reportT = {
  pt: {
    headerTitle: "SISTEMA DE ENSINO E INSTRUÇÃO",
    headerSubtitle: "RELATÓRIO INDIVIDUAL DE DESEMPENHO ACADÊMICO",
    studentInfo: "IDENTIFICAÇÃO DO ALUNO",
    academicMap: "MAPA DE RENDIMENTO ACADÊMICO",
    attendanceReg: "REGISTRO DE FREQUÊNCIA",
    footerText: "Emitido eletronicamente via Sistema de Gestão Escolar",
    observations: "OBSERVAÇÕES PEDAGÓGICAS E DISCIPLINARES",
    defaultObs: "Atleta/Aluno demonstra comprometimento acadêmico regular, preenchendo os requisitos regulamentares de frequência e aproveitamento didático estabelecidos pelas normas vigentes.",
    signatureInstructor: "Assinatura do Instrutor-Chefe / Coordenador",
    signatureStudent: "Assinatura do Aluno / Treinando",
    fullName: "Nome Completo",
    rank: "Posto / Graduação",
    course: "Curso de Formação",
    class: "Turma",
    period: "Turno / Período",
    status: "Status de Matrícula",
    totalLectures: "Total de Aulas",
    attendances: "Presenças",
    absences: "Faltas",
    attendanceRate: "Aproveitamento de Frequência",
    discipline: "Disciplina / Módulo",
    finalGrade: "Nota Final",
    situation: "Situação",
    overallAverage: "Média Geral de Notas",
    overallStatus: "Situação de Curso",
    approved: "APROVADO",
    reproved: "REPROVADO",
    retake: "RECUPERAÇÃO",
    pending: "EM AVALIAÇÃO",
    inProgress: "Em Andamento (Ativo)",
    completed: "Curso Concluído",
    printReport: "Imprimir Relatório",
    close: "Fechar",
  },
  en: {
    headerTitle: "EDUCATION AND TRAINING SYSTEM",
    headerSubtitle: "INDIVIDUAL ACADEMIC PERFORMANCE REPORT",
    studentInfo: "STUDENT / TRAINEE IDENTIFICATION",
    academicMap: "ACADEMIC PERFORMANCE MAP",
    attendanceReg: "ATTENDANCE REGISTER",
    footerText: "Electronically issued via School Management System",
    observations: "PEDAGOGICAL & DISCIPLINARY OBSERVATIONS",
    defaultObs: "The student demonstrates regular academic commitment, complying with the regulatory requirements of attendance and training achievements established by current regulations.",
    signatureInstructor: "Signature of Chief Instructor / Coordinator",
    signatureStudent: "Signature of Student / Trainee",
    fullName: "Full Name",
    rank: "Rank / Post",
    course: "Course of Instruction",
    class: "Class Section",
    period: "Session / Period",
    status: "Enrollment Status",
    totalLectures: "Total Lectures",
    attendances: "Attendances",
    absences: "Absences",
    attendanceRate: "Attendance Rate",
    discipline: "Discipline / Module",
    finalGrade: "Final Grade",
    situation: "Situation",
    overallAverage: "Overall GPA",
    overallStatus: "Overall Status",
    approved: "APPROVED",
    reproved: "FAILED",
    retake: "RETAKE",
    pending: "UNDER EVALUATION",
    inProgress: "In Progress (Active)",
    completed: "Course Completed",
    printReport: "Print Report",
    close: "Close",
  }
};

export default function BoletimPage() {
  const { t, language } = useI18n();
  const { profile } = useUser();
  const isNifStudent = profile?.role === 'aluno' && (profile as any).isNifStudent;

  const [loading, setLoading] = useState(false);
  const { cursos: rawCursos } = useCursos();
  const { turmas: rawTurmas } = useTurmas();
  const { disciplinas } = useDisciplinas();
  const { configuracoes } = useConfiguracoes();

  const cursos = useMemo(() => {
    return (rawCursos || []).filter((c: any) => !c.internacional);
  }, [rawCursos]);

  const turmas = useMemo(() => {
    return (rawTurmas || []).filter((t: any) => !t.internacional);
  }, [rawTurmas]);

  const anos = useMemo(() => {
    return Array.from(new Set(turmas.map((t: any) => t.ano))).sort((a: any, b: any) => b - a);
  }, [turmas]);
  
  const [selectedCurso, setSelectedCurso] = useState('');
  const [selectedTurma, setSelectedTurma] = useState('');
  const [selectedAno, setSelectedAno] = useState<string>('');
  const [courseModules, setCourseModules] = useState(4);
  
  const [boletimData, setBoletimData] = useState<any[]>([]);
  const [classStats, setClassStats] = useState({ avg: 0, total: 0 });
  const settings = configuracoes || { media_aprovacao: 7, media_recuperacao: 5, frequencia_minima: 75, nota_maxima: 10 };

  const [selectedStudentForReport, setSelectedStudentForReport] = useState<string | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportData, setReportData] = useState<any | null>(null);
  const [pendingDetailsStudent, setPendingDetailsStudent] = useState<any | null>(null);

  useEffect(() => {
    if (isNifStudent && profile?.student_id) {
      setSelectedStudentForReport(profile.student_id);
    }
  }, [isNifStudent, profile]);

  const handlePrint = () => {
    try {
      const isIframe = typeof window !== 'undefined' && window.self !== window.top;
      
      if (isIframe) {
        toast.info(
          language === 'pt' 
            ? 'Atenção: Se a janela de impressão não abrir, use o botão no topo direito do visualizador para abrir o aplicativo em uma nova aba e imprimir.' 
            : 'Notice: If the print dialog does not open, please open the application in a new tab by clicking the top-right button in the preview.'
        );
      }
      
      window.print();
    } catch (error) {
      console.error('Print failed:', error);
      toast.error(
        language === 'pt'
          ? 'Não foi possível imprimir no visualizador integrado. Por favor, abra em uma nova aba.'
          : 'Failed to open print dialog in the integrated preview. Please open in a new tab.'
      );
    }
  };

  useEffect(() => {
    if (!selectedStudentForReport) {
      return;
    }

    const fetchReportData = async () => {
      setReportData(null);
      setLoadingReport(true);
      try {
        const { data: student, error: studentErr } = await supabase
          .from('alunos')
          .select('*')
          .eq('id', selectedStudentForReport)
          .single();
        if (studentErr) throw studentErr;

        const classId = student.turma_id || selectedTurma;
        let classObj: any = null;
        let courseObj: any = null;

        if (classId) {
          const { data: tData } = await supabase
            .from('turmas')
            .select('*')
            .eq('id', classId)
            .single();
          classObj = tData;

          if (tData?.curso_id) {
            const { data: cData } = await supabase
              .from('cursos')
              .select('*')
              .eq('id', tData.curso_id)
              .single();
            courseObj = cData;
          }
        }

        let discList: any[] = [];
        if (courseObj?.id) {
          const { data: dData } = await supabase
            .from('disciplinas')
            .select('*')
            .eq('curso_id', courseObj.id)
            .is('deleted_at', null);
          discList = dData || [];
        }

        let topicsList: any[] = [];
        if (discList.length > 0) {
          const discIds = discList.map((d: any) => d.id);
          const { data: tData } = await supabase
            .from('materias_modulos')
            .select('*')
            .in('disciplina_id', discIds)
            .is('deleted_at', null)
            .order('modulo_index', { ascending: true })
            .order('ordem', { ascending: true });
          topicsList = tData || [];
        }

        const { data: gradesData } = await supabase
          .from('notas')
          .select('*')
          .eq('aluno_id', selectedStudentForReport)
          .eq('turma_id', classId);

        const { data: attendanceData } = await supabase
          .from('frequencia')
          .select('*')
          .eq('aluno_id', selectedStudentForReport)
          .eq('turma_id', classId)
          .order('data', { ascending: false });

        setReportData({
          student,
          classObj,
          courseObj,
          disciplines: discList,
          grades: gradesData || [],
          attendance: attendanceData || [],
          topics: topicsList
        });
      } catch (err: any) {
        console.error("Error generating student report:", err);
        toast.error(language === 'pt' ? 'Erro ao carregar dados do relatório para este aluno.' : 'Error loading report data for this student.');
        setSelectedStudentForReport(null);
      } finally {
        setLoadingReport(false);
      }
    };

    fetchReportData();
  }, [selectedStudentForReport, selectedTurma, language]);

  const handleSearch = async (overrideTurmaId?: string) => {
    const activeTurmaId = overrideTurmaId || selectedTurma;
    if (!activeTurmaId) {
      toast.warning(t.common.selectRequired);
      return;
    }

    setLoading(true);
    try {
      // Find course modules count
      const turma = turmas.find((t: any) => t.id === activeTurmaId);
      if (turma?.curso?.qtd_modulos) {
        setCourseModules(Math.min(turma.curso.qtd_modulos, 20));
      } else if (turma?.curso_id) {
        const curso = cursos.find((c: any) => c.id === turma.curso_id);
        if (curso) {
          setCourseModules(Math.min(curso.qtd_modulos || 4, 20));
        }
      }

      const courseId = turma?.curso_id;
      const turmaDisciplines = (disciplinas || []).filter((d: any) => d.curso_id === courseId && !d.deleted_at);
      const firstDiscId = turmaDisciplines[0]?.id;

      // 1. Fetch all students currently enrolled in this class and not deleted
      const { data: students, error: studentsError } = await supabase
        .from('alunos')
        .select('id, nome, matricula, foto_url, turma_id, status, posto_graduacao')
        .eq('turma_id', activeTurmaId)
        .is('deleted_at', null)
        .order('nome');

      if (studentsError) throw studentsError;

      // 2. Fetch all grades registered for this class and discipline
      let gradesQuery = supabase
        .from('notas')
        .select('*')
        .eq('turma_id', activeTurmaId);

      if (firstDiscId) {
        gradesQuery = gradesQuery.eq('disciplina_id', firstDiscId);
      }

      if (selectedAno) {
        gradesQuery = gradesQuery.eq('ano_letivo', parseInt(selectedAno));
      }

      const { data: grades, error: gradesError } = await gradesQuery;
      if (gradesError) throw gradesError;

      // 3. Merged list: only include students who are actually enrolled in the class!
      // This synchronizes lists and tables, excluding non-enrolled students like "Abdul Lima Quaresma".
      const mergedData = (students || []).map((student: any) => {
        const existingGrade = (grades || []).find((g: any) => g.aluno_id === student.id);
        if (existingGrade) {
          return {
            ...existingGrade,
            aluno: student
          };
        } else {
          return {
            id: `temp-${student.id}`,
            aluno_id: student.id,
            turma_id: activeTurmaId,
            disciplina_id: firstDiscId || '',
            nota1: null,
            nota2: null,
            nota3: null,
            nota4: null,
            nota5: null,
            nota6: null,
            nota7: null,
            nota8: null,
            nota9: null,
            nota10: null,
            nota11: null,
            nota12: null,
            nota13: null,
            nota14: null,
            nota15: null,
            nota16: null,
            nota17: null,
            nota18: null,
            nota19: null,
            nota20: null,
            nota_final: null,
            frequencia: null,
            pago: true,
            ano_letivo: parseInt(selectedAno) || new Date().getFullYear(),
            aluno: student
          };
        }
      });

      // Sort mergedData by grade descending. Students without a grade (null/undefined) go to the end.
      const sortedMergedData = [...mergedData].sort((a, b) => {
        const gradeA = a.nota_final !== null && a.nota_final !== undefined ? Number(a.nota_final) : -1;
        const gradeB = b.nota_final !== null && b.nota_final !== undefined ? Number(b.nota_final) : -1;
        
        if (gradeB !== gradeA) {
          return gradeB - gradeA;
        }
        
        // If grades are identical, sort alphabetically by student name
        const nameA = a.aluno?.nome || '';
        const nameB = b.aluno?.nome || '';
        return nameA.localeCompare(nameB, 'pt-BR');
      });

      setBoletimData(sortedMergedData);
      
      const totalGrades = mergedData.reduce((acc: number, curr: any) => acc + (Number(curr.nota_final) || 0), 0);
      const avg = mergedData.length > 0 ? totalGrades / mergedData.length : 0;
      setClassStats({ avg, total: mergedData.length });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-search when turma or year changes
  useEffect(() => {
    if (selectedTurma) {
      handleSearch(selectedTurma);
    } else {
      setBoletimData([]);
      setClassStats({ avg: 0, total: 0 });
    }
  }, [selectedTurma, selectedAno, disciplinas]);

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

  const getPendingItems = (row: any) => {
    const items: string[] = [];
    
    // Check modules
    for (let i = 0; i < courseModules; i++) {
      const notaValue = row[`nota${i + 1}`];
      if (notaValue === null || notaValue === undefined || notaValue === '') {
        items.push(language === 'pt' ? `Nota do Módulo ${i + 1}` : `Grade for Module ${i + 1}`);
      }
    }
    
    // Check final grade
    if (row.nota_final === null || row.nota_final === undefined) {
      items.push(language === 'pt' ? `Média Final de Disciplina` : `Final Course Average`);
    }
    
    // Check attendance
    if (row.frequencia === null || row.frequencia === undefined) {
      items.push(language === 'pt' ? `Aproveitamento de Frequência` : `Attendance Rate`);
    }
    
    return items;
  };

  const filteredTurmas = turmas.filter((t: any) => {
    const matchCurso = selectedCurso ? t.curso_id === selectedCurso : true;
    const matchAno = selectedAno ? t.ano === parseInt(selectedAno) : true;
    return matchCurso && matchAno;
  });
  const filteredDisciplinas = selectedCurso ? disciplinas.filter((d: any) => d.curso_id === selectedCurso) : disciplinas;

  const maxAvgInBoletim = boletimData.length > 0 
    ? Math.max(...boletimData.map((r: any) => Number(r.nota_final)).filter((n: any) => !isNaN(n)), -1) 
    : -1;

  if (isNifStudent) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.reportCard.title}</h1>
            <p className="text-slate-500 text-sm">
              {language === 'pt' ? 'Consulte as suas notas individuais e aproveitamento acadêmico' : 'Check your individual grades and academic performance.'}
            </p>
          </div>
          {profile?.role !== 'aluno' && (
            <div className="flex gap-2 print:hidden">
              <button 
                onClick={handlePrint}
                className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
              >
                <Printer size={18} />
                {t.reportCard.print}
              </button>
            </div>
          )}
        </div>

        {loadingReport || !reportData ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <Loader2 className="animate-spin text-blue-500" size={36} />
            <span className="text-xs font-bold tracking-widest uppercase">
              {language === 'pt' ? 'Carregando boletim do aluno...' : 'Loading student report...'}
            </span>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto w-full">
            <div 
              id="student-report-print-area" 
              className="bg-white text-slate-900 border border-slate-200 shadow-xl p-8 rounded-lg flex flex-col gap-6 font-sans relative text-left text-xs"
              style={{ width: '100%', boxSizing: 'border-box' }}
            >
              <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                  body * {
                    visibility: hidden !important;
                  }
                  #student-report-print-area, #student-report-print-area * {
                    visibility: visible !important;
                  }
                  #student-report-print-area {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 210mm !important;
                    min-height: 297mm !important;
                    padding: 15mm !important;
                    margin: 0 !important;
                    border: none !important;
                    box-shadow: none !important;
                    background: #ffffff !important;
                    color: #000000 !important;
                    font-family: Arial, sans-serif !important;
                  }
                  .print-only-layout {
                    visibility: visible !important;
                  }
                  .print-bg-gray {
                    background-color: #f8fafc !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  .print-border-black {
                    border-color: #000000 !important;
                  }
                }
                @page {
                  size: A4;
                  margin: 10mm;
                }
              `}} />

              {/* Clean Header: Student Individual Report and participating class(es) only */}
              <div className="flex flex-col items-center justify-center pb-6 border-b-2 border-slate-900 text-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                  {language === 'pt' ? 'Relatório Individual do Aluno' : 'Student Individual Report'}
                </h1>
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                  {language === 'pt' 
                    ? `Turma(s) ao qual participou: ${reportData.classObj?.nome || 'Não informada'}` 
                    : `Participated Class(es): ${reportData.classObj?.nome || 'Unassigned'}`}
                </p>
              </div>

              {/* Personal Info Grid */}
              <div className="border border-slate-200 rounded-lg p-5 bg-slate-50/50 print-bg-gray text-left">
                <h3 className="text-[11px] font-black text-slate-600 tracking-[0.15em] uppercase mb-4 pb-1 border-b border-slate-200">
                  {reportT[language as "pt" | "en"].studentInfo}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 text-sm">
                  <div className="flex flex-col gap-0.5 col-span-2 md:col-span-1">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{reportT[language as "pt" | "en"].fullName}</span>
                    <span className="font-extrabold text-slate-900 uppercase text-xs lg:text-sm">{reportData.student.nome}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{reportT[language as "pt" | "en"].rank}</span>
                    <span className="font-bold text-slate-800 uppercase">{reportData.student.posto_graduacao || (language === 'pt' ? 'Não declarado' : 'Not declared')}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Matrícula</span>
                    <span className="font-bold font-mono text-slate-800">#{reportData.student.matricula}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{reportT[language as "pt" | "en"].course}</span>
                    <span className="font-bold text-slate-800">{reportData.courseObj?.nome || (language === 'pt' ? 'Não disponível' : 'Not available')}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{reportT[language as "pt" | "en"].class}</span>
                    <span className="font-bold text-slate-800">{reportData.classObj?.nome || (language === 'pt' ? 'Não disponível' : 'Not available')}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{reportT[language as "pt" | "en"].period}</span>
                    <span className="font-bold text-slate-800 capitalize">
                      {reportData.classObj?.periodo === 'manhã' ? t.common.morning :
                       reportData.classObj?.periodo === 'tarde' ? t.common.afternoon :
                       reportData.classObj?.periodo === 'noite' ? t.common.night : reportData.classObj?.periodo}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 col-span-2">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{reportT[language as "pt" | "en"].status}</span>
                    <span className="font-bold flex items-center gap-1.5 text-slate-800">
                      <span className={cn("w-2 h-2 rounded-full", reportData.classObj?.status === 'concluida' || reportData.classObj?.status === 'finalizada' ? 'bg-emerald-500' : 'bg-blue-500')} />
                      {reportData.classObj?.status === 'concluida' || reportData.classObj?.status === 'finalizada' 
                        ? reportT[language as "pt" | "en"].completed 
                        : reportT[language as "pt" | "en"].inProgress}
                    </span>
                  </div>
                </div>
              </div>

              {/* Academic Performance Map */}
              <div className="space-y-3 font-sans">
                <h3 className="text-[11px] font-black text-slate-600 tracking-[0.15em] uppercase pb-1 border-b border-slate-200 text-left">
                  {reportT[language as "pt" | "en"].academicMap}
                </h3>
                <div className="overflow-x-auto">
                  {(() => {
                    const reportRows = (() => {
                      const rows: any[] = [];
                      if (!reportData || !reportData.disciplines) return [];
                      
                      const sortedDisciplines = [...reportData.disciplines].sort((a: any, b: any) => {
                        const mDiff = (a.modulo_index || 1) - (b.modulo_index || 1);
                        if (mDiff !== 0) return mDiff;
                        return a.nome.localeCompare(b.nome);
                      });

                      sortedDisciplines.forEach((disc: any, discIdx: number) => {
                        const discTopics = (reportData.topics || []).filter((t: any) => t.disciplina_id === disc.id);
                        
                        // Check if modular unified grades are entered under the first discipline
                        const firstDisc = sortedDisciplines[0];
                        const firstGrade = firstDisc ? reportData.grades.find((g: any) => g.disciplina_id === firstDisc.id) : null;
                        const moduleNum = disc.modulo_index || (discIdx + 1);

                        let finalGradeValue = null;
                        if (firstGrade && moduleNum !== null) {
                          const modularGradeValue = firstGrade[`nota${moduleNum}`];
                          if (modularGradeValue !== null && modularGradeValue !== undefined && modularGradeValue !== '') {
                            finalGradeValue = Number(modularGradeValue);
                          }
                        }

                        // Fallback to direct discipline final grade
                        if (finalGradeValue === null) {
                          const directGrade = reportData.grades.find((g: any) => g.disciplina_id === disc.id);
                          finalGradeValue = directGrade ? directGrade.nota_final : null;
                        }

                        // Determine frequency value, falling back to firstGrade if needed
                        let freqValue = null;
                        if (firstGrade && firstGrade.frequencia !== null && firstGrade.frequencia !== undefined) {
                          freqValue = firstGrade.frequencia;
                        } else {
                          const directGrade = reportData.grades.find((g: any) => g.disciplina_id === disc.id);
                          freqValue = directGrade ? directGrade.frequencia : null;
                        }

                        const finalGradeFormatted = finalGradeValue !== null && finalGradeValue !== undefined ? Number(finalGradeValue).toFixed(1) : '-';

                        let statusLabel = '';
                        let statusClass = 'text-slate-400';
                        if (finalGradeValue === null || finalGradeValue === undefined) {
                          statusLabel = reportT[language as "pt" | "en"].pending;
                        } else if (finalGradeValue >= settings.media_aprovacao && (freqValue === null || freqValue >= settings.frequencia_minima)) {
                          statusLabel = reportT[language as "pt" | "en"].approved;
                          statusClass = 'text-emerald-600 font-extrabold';
                        } else if (freqValue !== null && freqValue < settings.frequencia_minima) {
                          statusLabel = language === 'pt' ? 'FALTA FREQ.' : 'LOW FREQ.';
                          statusClass = 'text-orange-600 font-extrabold';
                        } else if (finalGradeValue >= settings.media_recuperacao) {
                          statusLabel = reportT[language as "pt" | "en"].retake;
                          statusClass = 'text-yellow-600 font-extrabold';
                        } else {
                          statusLabel = reportT[language as "pt" | "en"].reproved;
                          statusClass = 'text-rose-600 font-extrabold';
                        }

                        if (discTopics.length === 0) {
                          rows.push({
                            id: `${disc.id}-empty`,
                            modulo: `Módulo ${disc.modulo_index || 1}`,
                            disciplina: disc.nome,
                            topico: '-',
                            nota: finalGradeFormatted,
                            situacao: statusLabel,
                            statusClass,
                          });
                        } else {
                          discTopics.forEach((topic: any, tIdx: number) => {
                            rows.push({
                              id: topic.id,
                              modulo: `Módulo ${disc.modulo_index || 1}`,
                              disciplina: disc.nome,
                              topico: topic.nome,
                              nota: finalGradeFormatted,
                              situacao: statusLabel,
                              statusClass,
                            });
                          });
                        }
                      });

                      const rowsWithSpans: any[] = [];
                      for (let i = 0; i < rows.length; i++) {
                        const row = { ...rows[i], moduloSpan: 0, disciplinaSpan: 0 };
                        
                        if (i === 0 || rows[i].modulo !== rows[i - 1].modulo) {
                          let span = 1;
                          while (i + span < rows.length && rows[i + span].modulo === rows[i].modulo) {
                            span++;
                          }
                          row.moduloSpan = span;
                        }
                        
                        if (i === 0 || rows[i].disciplina !== rows[i - 1].disciplina) {
                          let span = 1;
                          while (i + span < rows.length && rows[i + span].disciplina === rows[i].disciplina) {
                            span++;
                          }
                          row.disciplinaSpan = span;
                        }
                        
                        rowsWithSpans.push(row);
                      }
                      return rowsWithSpans;
                    })();

                    return (
                      <table className="w-full text-left report-table border border-slate-200 bg-white">
                        <thead>
                          <tr className="bg-slate-100 print-bg-gray text-[10px] font-extrabold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                            <th className="px-4 py-3 border-r border-slate-200">{language === 'pt' ? 'Módulo' : 'Module'}</th>
                            <th className="px-4 py-3 border-r border-slate-200">{language === 'pt' ? 'Disciplina' : 'Discipline'}</th>
                            <th className="px-4 py-3 border-r border-slate-200">{language === 'pt' ? 'Tópico' : 'Topic'}</th>
                            <th className="px-3 py-3 text-center border-r border-slate-200 font-mono w-28">{reportT[language as "pt" | "en"].finalGrade}</th>
                            <th className="px-4 py-3 text-right w-36">{reportT[language as "pt" | "en"].situation}</th>
                          </tr>
                        </thead>
                        <tbody className="text-xs text-left">
                          {reportData.disciplines.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="text-center py-6 text-slate-400 font-bold bg-white">
                                {language === 'pt' ? 'Nenhuma disciplina cadastrada.' : 'No disciplines registered.'}
                              </td>
                            </tr>
                          ) : (
                            reportRows.map((row: any) => {
                              return (
                                <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors bg-white">
                                  {row.moduloSpan > 0 && (
                                    <td rowSpan={row.moduloSpan} className="px-4 py-2.5 font-bold text-slate-900 border-r border-slate-200 text-left bg-white align-middle">
                                      {row.modulo}
                                    </td>
                                  )}
                                  {row.disciplinaSpan > 0 && (
                                    <td rowSpan={row.disciplinaSpan} className="px-4 py-2.5 font-extrabold text-slate-800 border-r border-slate-200 text-left bg-white align-middle">
                                      {row.disciplina}
                                    </td>
                                  )}
                                  <td className="px-4 py-2.5 text-slate-600 border-r border-slate-200 text-left bg-white font-medium">
                                    {row.topico}
                                  </td>
                                  {row.disciplinaSpan > 0 && (
                                    <td rowSpan={row.disciplinaSpan} className="px-3 py-2.5 text-center font-black font-mono border-r border-slate-200 text-slate-900 bg-white align-middle animate-fade-in">
                                      {row.nota}
                                    </td>
                                  )}
                                  {row.disciplinaSpan > 0 && (
                                    <td rowSpan={row.disciplinaSpan} className={cn("px-4 py-2.5 text-right font-black bg-white align-middle", row.statusClass)}>
                                      {row.situacao}
                                    </td>
                                  )}
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              </div>

              {/* Attendance and KPI Cards Container */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Attendance Summary */}
                <div className="border border-slate-200 rounded-lg p-4 flex flex-col gap-3 text-left">
                  <h3 className="text-[11px] font-black text-slate-600 tracking-[0.1em] uppercase border-b border-slate-200 pb-1">
                    {reportT[language as "pt" | "en"].attendanceReg}
                  </h3>
                  
                  {(() => {
                    const totalAulas = reportData.attendance?.length || 0;
                    const presencas = reportData.attendance?.filter((a: any) => a.presente).length || 0;
                    const faltas = reportData.attendance?.filter((a: any) => !a.presente).length || 0;
                    
                    let percentualPresenca = 100;
                    if (totalAulas > 0) {
                      percentualPresenca = (presencas / totalAulas) * 100;
                    } else if (reportData.grades && reportData.grades.length > 0) {
                      const validFreqs = reportData.grades.filter((g: any) => g.frequencia !== null && g.frequencia !== undefined);
                      if (validFreqs.length > 0) {
                        percentualPresenca = validFreqs.reduce((sum: number, g: any) => sum + g.frequencia, 0) / validFreqs.length;
                      }
                    }

                    return (
                      <div className="flex flex-col gap-2.5 text-left">
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="p-2 bg-slate-50 print-bg-gray rounded border border-slate-100 flex flex-col gap-0.5">
                            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">{reportT[language as "pt" | "en"].totalLectures}</span>
                            <span className="text-sm font-black text-slate-800">{totalAulas || '-'}</span>
                          </div>
                          <div className="p-2 bg-slate-50 print-bg-gray rounded border border-slate-100 flex flex-col gap-0.5">
                            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">{reportT[language as "pt" | "en"].attendances}</span>
                            <span className="text-sm font-black text-emerald-600">{totalAulas ? presencas : '-'}</span>
                          </div>
                          <div className="p-2 bg-slate-50 print-bg-gray rounded border border-slate-100 flex flex-col gap-0.5">
                            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">{reportT[language as "pt" | "en"].absences}</span>
                            <span className="text-sm font-black text-rose-600">{totalAulas ? faltas : '-'}</span>
                          </div>
                        </div>

                        {/* Attendance percentage indicator */}
                        <div className="flex items-center justify-between text-xs p-1.5 mt-1 border-t border-slate-100">
                          <span className="font-extrabold text-slate-500 uppercase text-[9px] tracking-wide">{reportT[language as "pt" | "en"].attendanceRate}:</span>
                          <span className={cn(
                            "font-black text-sm",
                            percentualPresenca >= settings.frequencia_minima ? "text-emerald-600" : "text-rose-600"
                          )}>
                            {percentualPresenca.toFixed(1)}%
                          </span>
                        </div>

                        {/* Tiny timeline of latest attendance dates */}
                        {reportData.attendance && reportData.attendance.length > 0 && (
                          <div className="flex flex-col gap-1.5 mt-1 pt-1.5 border-t border-dashed border-slate-200">
                            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                              {language === 'pt' ? 'Histórico de Presenças (Últimas 10):' : 'Attendance Record (Last 10):'}
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {reportData.attendance.slice(0, 10).map((att: any, ind: number) => (
                                <span 
                                  key={att.id || ind} 
                                  className={cn(
                                    "text-[9px] px-1.5 py-0.5 rounded font-bold uppercase",
                                    att.presente 
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                                      : "bg-rose-50 text-rose-700 border border-rose-100"
                                  )}
                                  title={format(new Date(att.data), 'dd/MM/yyyy')}
                                >
                                  {format(new Date(att.data), 'dd/MM')} {att.presente ? '✓' : '✗'}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Performance & Summary */}
                <div className="border border-slate-200 rounded-lg p-4 flex flex-col justify-between text-left">
                  <div className="flex flex-col gap-3">
                    <h3 className="text-[11px] font-black text-slate-600 tracking-[0.1em] uppercase border-b border-slate-200 pb-1">
                      {language === 'pt' ? 'DESEMPENHO GLOBAL' : 'GLOBAL PERFORMANCE'}
                    </h3>
                    
                    {(() => {
                      const validFinalGrades = reportData.grades
                        ? reportData.grades.filter((g: any) => g.nota_final !== null && g.nota_final !== undefined) 
                        : [];
                      const averageGrade = validFinalGrades.length > 0
                        ? validFinalGrades.reduce((sum: number, g: any) => sum + Number(g.nota_final), 0) / validFinalGrades.length
                        : null;

                      // Compute overall status
                      let overallLabel = language === 'pt' ? 'EM FILTRAGEM / AVALIAÇÃO' : 'UNDER REVIEW';
                      let overallClass = 'bg-slate-100 text-slate-700';

                      if (averageGrade !== null) {
                        const hasReprovedDiscipline = reportData.grades.some((g: any) => g.nota_final !== null && g.nota_final < settings.media_aprovacao);
                        const totalAulas = reportData.attendance?.length || 0;
                        let percentualPresenca = 100;
                        if (totalAulas > 0) {
                          const presencas = reportData.attendance.filter((a: any) => a.presente).length;
                          percentualPresenca = (presencas / totalAulas) * 100;
                        } else if (reportData.grades && reportData.grades.length > 0) {
                          const validFreqs = reportData.grades.filter((g: any) => g.frequencia !== null && g.frequencia !== undefined);
                          if (validFreqs.length > 0) {
                            percentualPresenca = validFreqs.reduce((sum: number, g: any) => sum + g.frequencia, 0) / validFreqs.length;
                          }
                        }

                        if (percentualPresenca < settings.frequencia_minima) {
                          overallLabel = language === 'pt' ? 'REPROVADO POR FREQUÊNCIA' : 'FAILED BY ATTENDANCE';
                          overallClass = 'bg-rose-100 text-rose-700';
                        } else if (hasReprovedDiscipline) {
                          overallLabel = language === 'pt' ? 'REPROVADO POR NOTA' : 'FAILED BY ACADEMICS';
                          overallClass = 'bg-red-100 text-red-700';
                        } else if (averageGrade >= settings.media_aprovacao) {
                          overallLabel = reportT[language as "pt" | "en"].approved;
                          overallClass = 'bg-emerald-100 text-emerald-700 font-extrabold';
                        } else if (averageGrade >= settings.media_recuperacao) {
                          overallLabel = reportT[language as "pt" | "en"].retake;
                          overallClass = 'bg-yellow-100 text-yellow-700';
                        } else {
                          overallLabel = reportT[language as "pt" | "en"].reproved;
                          overallClass = 'bg-rose-100 text-rose-700';
                        }
                      }

                      return (
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-center text-xs p-1">
                            <span className="font-extrabold text-slate-500 uppercase text-[9px] tracking-wide">{reportT[language as "pt" | "en"].overallAverage}:</span>
                            <span className={cn(
                              "font-black font-mono text-base px-2 py-0.5 rounded",
                              averageGrade !== null && averageGrade >= settings.media_aprovacao ? "text-blue-600 bg-blue-50" : "text-rose-600 bg-rose-50"
                            )}>
                              {averageGrade !== null ? averageGrade.toFixed(2) : '-'}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-xs p-1 border-t border-slate-100">
                            <span className="font-extrabold text-slate-500 uppercase text-[9px] tracking-wide">{reportT[language as "pt" | "en"].overallStatus}:</span>
                            <span className={cn(
                              "text-[10px] font-black uppercase px-2.5 py-1 rounded",
                              overallClass
                            )}>
                              {overallLabel}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="text-[10px] text-slate-400 bg-slate-50 print-bg-gray rounded-lg p-2.5 border border-slate-100 flex items-start gap-2 mt-4">
                    <Award className="text-slate-400 shrink-0 mt-0.5" size={14} />
                    <p className="leading-normal">
                      {language === 'pt' 
                        ? `Média de aprovação configurada em ${settings.media_aprovacao.toFixed(1)} e frequência mínima em ${settings.frequencia_minima}%.`
                        : `Program passing grade configured at ${settings.media_aprovacao.toFixed(1)} and minimum attendance at ${settings.frequencia_minima}%.`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Observations section */}
              <div className="border border-slate-200 rounded-lg p-4 flex flex-col gap-2 text-left text-xs text-slate-600 italic">
                <h3 className="text-[11px] font-black text-slate-400 tracking-[0.1em] uppercase border-b border-slate-200 pb-1">
                  {reportT[language as "pt" | "en"].observations}
                </h3>
                <p className="leading-relaxed text-justify">
                  {reportT[language as "pt" | "en"].defaultObs}
                </p>
              </div>

              {/* Stamp & Verification Text */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400 font-medium uppercase tracking-wider">
                <span>{reportT[language as "pt" | "en"].footerText}</span>
                <span>
                  {language === 'pt' ? 'Data de Emissão: ' : 'Date of Issue: '}
                  {new Date().toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.reportCard.title}</h1>
          <p className="text-slate-500 text-sm">
            {t.reportCard.subtitle}
            {selectedTurma && turmas.find((t: any) => t.id === selectedTurma)?.data_inicio && (
              <span className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase tracking-widest border border-blue-100">
                {format(new Date(turmas.find((t: any) => t.id === selectedTurma).data_inicio), 'dd/MM/yyyy')} 
                {turmas.find((t: any) => t.id === selectedTurma).data_fim ? ` - ${format(new Date(turmas.find((t: any) => t.id === selectedTurma).data_fim), 'dd/MM/yyyy')}` : ''}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
          >
            <Printer size={18} />
            {t.reportCard.print}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:hidden">
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
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm appearance-none"
            >
              <option value="">{t.common.all} {t.nav.courses}</option>
              {cursos.map((curso: any) => (
                <option key={curso.id} value={curso.id}>
                  {curso.nome} {curso.codigo ? `(${curso.codigo})` : ''}
                </option>
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
              {anos.map((ano: any) => (
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
              {filteredTurmas.map((turma: any) => (
                <option key={turma.id} value={turma.id}>{turma.nome}</option>
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

      <div className="max-w-4xl mx-auto w-full">
        {/* Grades Table */}
        <div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
             <div className="p-4 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2">{t.common.finalResult}</span>
                <div className="flex gap-2 print:hidden">
                   <button className="p-1.5 hover:bg-slate-100 rounded text-slate-400 transition-colors">
                      <Download size={16} />
                   </button>
                </div>
             </div>

             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="text-[10px] font-bold text-slate-400 border-b border-slate-100 uppercase tracking-wider">
                      <th className="px-4 lg:px-6 py-4 text-left w-12">#</th>
                      <th className="px-4 lg:px-6 py-4">{t.reportCard.student}</th>
                      {Array.from({ length: courseModules }).map((_, i) => (
                        <th key={i} className="px-1 lg:px-3 py-4 text-center">MOD {i + 1}</th>
                      ))}
                      <th className="px-2 lg:px-6 py-4 text-center">{t.reportCard.average}</th>
                      <th className="px-3 lg:px-6 py-4 text-right">{t.reportCard.status}</th>
                      <th className="px-3 lg:px-6 py-4 text-right print:hidden">{language === 'pt' ? 'Ações' : 'Actions'}</th>
                   </tr>
                 </thead>
                 <tbody>
                   {boletimData.length === 0 ? (
                     <tr>
                        <td colSpan={5 + courseModules} className="py-20 text-center">
                           <div className="flex flex-col items-center text-slate-300">
                              <FileText size={48} className="mb-4 opacity-20" />
                              <p className="text-sm font-medium">{t.reportCard.noData}</p>
                           </div>
                        </td>
                     </tr>
                   ) : (
                     boletimData.map((row: any, idx: number) => {
                       const status = getStatus(row.nota_final, row.frequencia);
                       const StatusIcon = status.icon;
                       return (
                         <tr key={row.id} className={cn("border-b border-slate-50 hover:bg-slate-50/40 transition-colors group", row.nota_final !== null && row.nota_final !== undefined && Number(row.nota_final) === maxAvgInBoletim && maxAvgInBoletim > 0 && "bg-blue-50/50")}>
                            <td className="px-4 lg:px-6 py-4 font-mono text-xs font-bold text-slate-400 text-left">
                              {idx + 1}
                            </td>
                           <td className="px-4 lg:px-6 py-4">
                             <div className="flex items-center gap-2">
                               <div className="font-bold text-slate-800 text-xs lg:text-sm">{row.aluno?.nome}</div>
                               {row.nota_final !== null && row.nota_final !== undefined && Number(row.nota_final) === maxAvgInBoletim && maxAvgInBoletim > 0 && (
                                 <span className="flex items-center gap-1 bg-amber-100 text-amber-700 text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-amber-200">
                                   ⭐ {language === 'pt' ? 'Melhor Média' : 'Top Average'}
                                 </span>
                               )}
                             </div>
                             <div className="text-[10px] font-mono text-slate-400 tracking-tight">#{row.aluno?.matricula}</div>
                             {false && (
                               <div className="text-[9px] font-black text-red-500 uppercase tracking-widest mt-1">{language === 'pt' ? 'Pendente de Pgto.' : 'Payment Pending'}</div>
                             )}
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
                              <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ring-1 ring-inset ring-current/20", status.className, (row.nota_final === null || row.frequencia === null) && "cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 shadow-xs")} onClick={() => { if (row.nota_final === null || row.frequencia === null) { setPendingDetailsStudent(row); } }} title={(row.nota_final === null || row.frequencia === null) ? (language === 'pt' ? 'Clique para ver o que está pendente' : 'Click to see what is pending') : undefined}>
                                 <StatusIcon size={12} />
                                 {status.label}</div></td><td className="px-6 py-4 text-right print:hidden"><button onClick={() => setSelectedStudentForReport(row.aluno?.id)} className="inline-flex items-center gap-1.5 bg-slate-50 hover:bg-blue-600 hover:text-white text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border border-slate-200 hover:border-blue-600 shadow-sm"><FileText size={12} /><span>{language === 'pt' ? 'Relatório' : 'Report'}</span></button></td><td className="hidden border-none" style={{ display: 'none' }}><div>
                              </div>
                           </td>
                         </tr>
                       );
                     })
                   )}
                 </tbody>
               </table>

                {/* Modal of Individual Student Report */}

                {/* Modal de Detalhes da Situação Pendente */}
                <AnimatePresence>
                  {pendingDetailsStudent && (
                    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-[110] flex items-center justify-center p-4">
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 15 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="bg-white text-slate-800 border border-slate-200 p-6 rounded-2xl shadow-2xl max-w-sm w-full relative"
                      >
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="text-amber-500 animate-pulse" size={18} />
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">
                              {language === 'pt' ? 'Requisitos Pendentes' : 'Pending Requirements'}
                            </h3>
                          </div>
                          <button
                            onClick={() => setPendingDetailsStudent(null)}
                            className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
                          >
                            <X size={16} />
                          </button>
                        </div>

                        <div className="space-y-4">
                          <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                              {language === 'pt' ? 'Aluno / Candidato' : 'Student / Candidate'}
                            </p>
                            <p className="text-sm font-extrabold text-slate-800">
                              {pendingDetailsStudent.aluno?.nome}
                            </p>
                            <p className="text-[10px] font-mono font-bold text-slate-500 mt-0.5">
                              Matrícula: #{pendingDetailsStudent.aluno?.matricula}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">
                              {language === 'pt' ? 'O que está pendente para aprovação?' : 'What is pending for approval?'}
                            </p>
                            <div className="space-y-1.5">
                              {getPendingItems(pendingDetailsStudent).map((item, index) => (
                                <div key={index} className="flex items-center gap-2 px-3 py-2 bg-amber-50/40 rounded-lg border border-amber-100 text-amber-900 text-[11px] font-semibold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />
                                  <span>{item}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
                          <button
                            onClick={() => setPendingDetailsStudent(null)}
                            className="w-full px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
                          >
                            {language === 'pt' ? 'Fechar' : 'Close'}
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
                {selectedStudentForReport && (
                  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-slate-950 text-slate-100 max-w-4xl w-full rounded-2xl shadow-2xl border border-slate-800/80 flex flex-col max-h-[90vh]">
                      {/* Modal Actions Header */}
                      <div className="p-4 border-b border-slate-800/40 flex items-center justify-between no-print bg-slate-900 rounded-t-2xl">
                        <div className="flex items-center gap-2">
                          <FileText className="text-blue-500" size={20} />
                          <h3 className="text-sm font-black uppercase tracking-widest text-slate-200">
                            {language === 'pt' ? 'Visualização do Relatório' : 'Report Preview'}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2">
                          {profile?.role !== 'aluno' && (
                            <button
                              onClick={() => {
                                try {
                                  window.print();
                                } catch (err) {
                                  console.error("Window print error", err);
                                }
                              }}
                              disabled={loadingReport || !reportData}
                              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-blue-500/10 cursor-pointer"
                            >
                              <Printer size={14} />
                              <span>{language === 'pt' ? 'Imprimir' : 'Print'}</span>
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedStudentForReport(null)}
                            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </div>

                      {/* Modal Scrollable Body */}
                      <div className="flex-1 overflow-y-auto p-6 bg-slate-950">
                        {loadingReport ? (
                          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                            <Loader2 className="animate-spin text-blue-500" size={36} />
                            <span className="text-xs font-bold tracking-widest uppercase">
                              {language === 'pt' ? 'Carregando dados...' : 'Loading report data...'}
                            </span>
                          </div>
                        ) : reportData ? (
                          <div className="flex flex-col gap-6">
                            <p className="text-xs text-slate-400 text-center mb-2 leading-relaxed">
                              {language === 'pt' 
                                ? 'Esta é uma pré-visualização. Clique no botão de impressão para obter o documento formatado em folha A4 com fundo branco.' 
                                : 'This is a print preview. Click the print button to generate the formatted document on an A4 sheet with clean background.'}
                            </p>
                            
                            {/* The actual A4 Printable Area */}
                            <div 
                              id="student-report-print-area" 
                              className="bg-white text-slate-900 border border-slate-200 shadow-xl p-8 rounded-lg max-w-[210mm] min-h-[297mm] mx-auto flex flex-col gap-6 font-sans relative text-left text-xs"
                              style={{ width: '100%', boxSizing: 'border-box' }}
                            >
                              {/* STYLE TAG FOR DIRECTED CUSTOM CSS FOR PRINT MEDIA */}
                              <style dangerouslySetInnerHTML={{ __html: `
                                @media print {
                                  body * {
                                    visibility: hidden !important;
                                  }
                                  #student-report-print-area, #student-report-print-area * {
                                    visibility: visible !important;
                                  }
                                  #student-report-print-area {
                                    position: absolute !important;
                                    left: 0 !important;
                                    top: 0 !important;
                                    width: 210mm !important;
                                    min-height: 297mm !important;
                                    padding: 15mm !important;
                                    margin: 0 !important;
                                    border: none !important;
                                    box-shadow: none !important;
                                    background: #ffffff !important;
                                    color: #000000 !important;
                                    font-family: Arial, sans-serif !important;
                                  }
                                  .print-only-layout {
                                    visibility: visible !important;
                                  }
                                  .print-bg-gray {
                                    background-color: #f8fafc !important;
                                    -webkit-print-color-adjust: exact !important;
                                    print-color-adjust: exact !important;
                                  }
                                  .print-border-black {
                                    border-color: #000000 !important;
                                  }
                                }
                                @page {
                                  size: A4;
                                  margin: 10mm;
                                }
                              `}} />

                              {/* Clean Header: Student Individual Report and participating class(es) only */}
                              <div className="flex flex-col items-center justify-center pb-6 border-b-2 border-slate-900 text-center gap-2">
                                <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                                  {language === 'pt' ? 'Relatório Individual do Aluno' : 'Student Individual Report'}
                                </h1>
                                <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                                  {language === 'pt' 
                                    ? `Turma(s) ao qual participou: ${reportData.classObj?.nome || 'Não informada'}` 
                                    : `Participated Class(es): ${reportData.classObj?.nome || 'Unassigned'}`}
                                </p>
                              </div>

                              {/* Personal Info Grid */}
                              <div className="border border-slate-200 rounded-lg p-5 bg-slate-50/50 print-bg-gray text-left">
                                <h3 className="text-[11px] font-black text-slate-600 tracking-[0.15em] uppercase mb-4 pb-1 border-b border-slate-200">
                                  {reportT[language as "pt" | "en"].studentInfo}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 text-sm">
                                  <div className="flex flex-col gap-0.5 col-span-2 md:col-span-1">
                                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{reportT[language as "pt" | "en"].fullName}</span>
                                    <span className="font-extrabold text-slate-900 uppercase text-xs lg:text-sm">{reportData.student.nome}</span>
                                  </div>
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{reportT[language as "pt" | "en"].rank}</span>
                                    <span className="font-bold text-slate-800 uppercase">{reportData.student.posto_graduacao || (language === 'pt' ? 'Não declarado' : 'Not declared')}</span>
                                  </div>
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Matrícula</span>
                                    <span className="font-bold font-mono text-slate-800">#{reportData.student.matricula}</span>
                                  </div>
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{reportT[language as "pt" | "en"].course}</span>
                                    <span className="font-bold text-slate-800">{reportData.courseObj?.nome || (language === 'pt' ? 'Não disponível' : 'Not available')}</span>
                                  </div>
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{reportT[language as "pt" | "en"].class}</span>
                                    <span className="font-bold text-slate-800">{reportData.classObj?.nome || (language === 'pt' ? 'Não disponível' : 'Not available')}</span>
                                  </div>
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{reportT[language as "pt" | "en"].period}</span>
                                    <span className="font-bold text-slate-800 capitalize">
                                      {reportData.classObj?.periodo === 'manhã' ? t.common.morning :
                                       reportData.classObj?.periodo === 'tarde' ? t.common.afternoon :
                                       reportData.classObj?.periodo === 'noite' ? t.common.night : reportData.classObj?.periodo}
                                    </span>
                                  </div>
                                  <div className="flex flex-col gap-0.5 col-span-2">
                                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{reportT[language as "pt" | "en"].status}</span>
                                    <span className="font-bold flex items-center gap-1.5 text-slate-800">
                                      <span className={cn("w-2 h-2 rounded-full", reportData.classObj?.status === 'concluida' || reportData.classObj?.status === 'finalizada' ? 'bg-emerald-500' : 'bg-blue-500')} />
                                      {reportData.classObj?.status === 'concluida' || reportData.classObj?.status === 'finalizada' 
                                        ? reportT[language as "pt" | "en"].completed 
                                        : reportT[language as "pt" | "en"].inProgress}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Academic Performance Map */}
                              <div className="space-y-3 font-sans">
                                <h3 className="text-[11px] font-black text-slate-600 tracking-[0.15em] uppercase pb-1 border-b border-slate-200 text-left">
                                  {reportT[language as "pt" | "en"].academicMap}
                                </h3>
                                 <div className="overflow-x-auto">
                                  {(() => {
                                    const reportRows = (() => {
                                      const rows: any[] = [];
                                                                         const sortedDisciplines = [...reportData.disciplines].sort((a: any, b: any) => {
                                        const mDiff = (a.modulo_index || 1) - (b.modulo_index || 1);
                                        if (mDiff !== 0) return mDiff;
                                        return a.nome.localeCompare(b.nome);
                                      });
 
                                      sortedDisciplines.forEach((disc: any, discIdx: number) => {
                                        const discTopics = (reportData.topics || []).filter((t: any) => t.disciplina_id === disc.id);
                                        
                                        // Check if modular unified grades are entered under the first discipline
                                        const firstDisc = sortedDisciplines[0];
                                        const firstGrade = firstDisc ? reportData.grades.find((g: any) => g.disciplina_id === firstDisc.id) : null;
                                        const moduleNum = disc.modulo_index || (discIdx + 1);

                                        let finalGradeValue = null;
                                        if (firstGrade && moduleNum !== null) {
                                          const modularGradeValue = firstGrade[`nota${moduleNum}`];
                                          if (modularGradeValue !== null && modularGradeValue !== undefined && modularGradeValue !== '') {
                                            finalGradeValue = Number(modularGradeValue);
                                          }
                                        }

                                        // Fallback to direct discipline final grade
                                        if (finalGradeValue === null) {
                                          const directGrade = reportData.grades.find((g: any) => g.disciplina_id === disc.id);
                                          finalGradeValue = directGrade ? directGrade.nota_final : null;
                                        }

                                        // Determine frequency value, falling back to firstGrade if needed
                                        let freqValue = null;
                                        if (firstGrade && firstGrade.frequencia !== null && firstGrade.frequencia !== undefined) {
                                          freqValue = firstGrade.frequencia;
                                        } else {
                                          const directGrade = reportData.grades.find((g: any) => g.disciplina_id === disc.id);
                                          freqValue = directGrade ? directGrade.frequencia : null;
                                        }

                                        const finalGradeFormatted = finalGradeValue !== null && finalGradeValue !== undefined ? Number(finalGradeValue).toFixed(1) : '-';

                                        let statusLabel = '';
                                        let statusClass = 'text-slate-400';
                                        if (finalGradeValue === null || finalGradeValue === undefined) {
                                          statusLabel = reportT[language as "pt" | "en"].pending;
                                        } else if (finalGradeValue >= settings.media_aprovacao && (freqValue === null || freqValue >= settings.frequencia_minima)) {
                                          statusLabel = reportT[language as "pt" | "en"].approved;
                                          statusClass = 'text-emerald-600 font-extrabold';
                                        } else if (freqValue !== null && freqValue < settings.frequencia_minima) {
                                          statusLabel = language === 'pt' ? 'FALTA FREQ.' : 'LOW FREQ.';
                                          statusClass = 'text-orange-600 font-extrabold';
                                        } else if (finalGradeValue >= settings.media_recuperacao) {
                                          statusLabel = reportT[language as "pt" | "en"].retake;
                                          statusClass = 'text-yellow-600 font-extrabold';
                                        } else {
                                          statusLabel = reportT[language as "pt" | "en"].reproved;
                                          statusClass = 'text-rose-600 font-extrabold';
                                        }

                                        if (discTopics.length === 0) {
                                          rows.push({
                                            id: `${disc.id}-empty`,
                                            modulo: `Módulo ${disc.modulo_index || 1}`,
                                            disciplina: disc.nome,
                                            topico: '-',
                                            nota: finalGradeFormatted,
                                            situacao: statusLabel,
                                            statusClass,
                                          });
                                        } else {
                                          discTopics.forEach((topic: any, tIdx: number) => {
                                            rows.push({
                                              id: topic.id,
                                              modulo: `Módulo ${disc.modulo_index || 1}`,
                                              disciplina: disc.nome,
                                              topico: topic.nome,
                                              nota: finalGradeFormatted,
                                              situacao: statusLabel,
                                              statusClass,
                                            });
                                          });
                                        }
                                      });

                                      const rowsWithSpans: any[] = [];
                                      for (let i = 0; i < rows.length; i++) {
                                        const row = { ...rows[i], moduloSpan: 0, disciplinaSpan: 0 };
                                        
                                        if (i === 0 || rows[i].modulo !== rows[i - 1].modulo) {
                                          let span = 1;
                                          while (i + span < rows.length && rows[i + span].modulo === rows[i].modulo) {
                                            span++;
                                          }
                                          row.moduloSpan = span;
                                        }
                                        
                                        if (i === 0 || rows[i].disciplina !== rows[i - 1].disciplina) {
                                          let span = 1;
                                          while (i + span < rows.length && rows[i + span].disciplina === rows[i].disciplina) {
                                            span++;
                                          }
                                          row.disciplinaSpan = span;
                                        }
                                        
                                        rowsWithSpans.push(row);
                                      }
                                      return rowsWithSpans;
                                    })();

                                    return (
                                      <table className="w-full text-left report-table border border-slate-200 bg-white">
                                        <thead>
                                          <tr className="bg-slate-100 print-bg-gray text-[10px] font-extrabold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                                            <th className="px-4 py-3 border-r border-slate-200">{language === 'pt' ? 'Módulo' : 'Module'}</th>
                                            <th className="px-4 py-3 border-r border-slate-200">{language === 'pt' ? 'Disciplina' : 'Discipline'}</th>
                                            <th className="px-4 py-3 border-r border-slate-200">{language === 'pt' ? 'Tópico' : 'Topic'}</th>
                                            <th className="px-3 py-3 text-center border-r border-slate-200 font-mono w-28">{reportT[language as "pt" | "en"].finalGrade}</th>
                                            <th className="px-4 py-3 text-right w-36">{reportT[language as "pt" | "en"].situation}</th>
                                          </tr>
                                        </thead>
                                        <tbody className="text-xs text-left">
                                          {reportData.disciplines.length === 0 ? (
                                            <tr>
                                              <td colSpan={5} className="text-center py-6 text-slate-400 font-bold bg-white">
                                                {language === 'pt' ? 'Nenhuma disciplina cadastrada.' : 'No disciplines registered.'}
                                              </td>
                                            </tr>
                                          ) : (
                                            reportRows.map((row: any) => {
                                              return (
                                                <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors bg-white">
                                                  {row.moduloSpan > 0 && (
                                                    <td rowSpan={row.moduloSpan} className="px-4 py-2.5 font-bold text-slate-900 border-r border-slate-200 text-left bg-white align-middle">
                                                      {row.modulo}
                                                    </td>
                                                  )}
                                                  {row.disciplinaSpan > 0 && (
                                                    <td rowSpan={row.disciplinaSpan} className="px-4 py-2.5 font-extrabold text-slate-800 border-r border-slate-200 text-left bg-white align-middle">
                                                      {row.disciplina}
                                                    </td>
                                                  )}
                                                  <td className="px-4 py-2.5 text-slate-600 border-r border-slate-200 text-left bg-white font-medium">
                                                    {row.topico}
                                                  </td>
                                                  {row.disciplinaSpan > 0 && (
                                                    <td rowSpan={row.disciplinaSpan} className="px-3 py-2.5 text-center font-black font-mono border-r border-slate-200 text-slate-900 bg-white align-middle">
                                                      {row.nota}
                                                    </td>
                                                  )}
                                                  {row.disciplinaSpan > 0 && (
                                                    <td rowSpan={row.disciplinaSpan} className={cn("px-4 py-2.5 text-right font-black bg-white align-middle", row.statusClass)}>
                                                      {row.situacao}
                                                    </td>
                                                  )}
                                                </tr>
                                              );
                                            })
                                          )}
                                        </tbody>
                                      </table>
                                    );
                                  })()}
                                </div>
                              </div>

                              {/* Attendance and KPI Cards Container */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                {/* Attendance Summary */}
                                <div className="border border-slate-200 rounded-lg p-4 flex flex-col gap-3 text-left">
                                  <h3 className="text-[11px] font-black text-slate-600 tracking-[0.1em] uppercase border-b border-slate-200 pb-1">
                                    {reportT[language as "pt" | "en"].attendanceReg}
                                  </h3>
                                  
                                  {/* Attendance Stats Calculation */}
                                  {(() => {
                                    const totalAulas = reportData.attendance?.length || 0;
                                    const presencas = reportData.attendance?.filter((a: any) => a.presente).length || 0;
                                    const faltas = reportData.attendance?.filter((a: any) => !a.presente).length || 0;
                                    
                                    let percentualPresenca = 100;
                                    if (totalAulas > 0) {
                                      percentualPresenca = (presencas / totalAulas) * 100;
                                    } else if (reportData.grades && reportData.grades.length > 0) {
                                      const validFreqs = reportData.grades.filter((g: any) => g.frequencia !== null && g.frequencia !== undefined);
                                      if (validFreqs.length > 0) {
                                        percentualPresenca = validFreqs.reduce((sum: number, g: any) => sum + g.frequencia, 0) / validFreqs.length;
                                      }
                                    }

                                    return (
                                      <div className="flex flex-col gap-2.5 text-left">
                                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                          <div className="p-2 bg-slate-50 print-bg-gray rounded border border-slate-100 flex flex-col gap-0.5">
                                            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">{reportT[language as "pt" | "en"].totalLectures}</span>
                                            <span className="text-sm font-black text-slate-800">{totalAulas || '-'}</span>
                                          </div>
                                          <div className="p-2 bg-slate-50 print-bg-gray rounded border border-slate-100 flex flex-col gap-0.5">
                                            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">{reportT[language as "pt" | "en"].attendances}</span>
                                            <span className="text-sm font-black text-emerald-600">{totalAulas ? presencas : '-'}</span>
                                          </div>
                                          <div className="p-2 bg-slate-50 print-bg-gray rounded border border-slate-100 flex flex-col gap-0.5">
                                            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">{reportT[language as "pt" | "en"].absences}</span>
                                            <span className="text-sm font-black text-rose-600">{totalAulas ? faltas : '-'}</span>
                                          </div>
                                        </div>

                                        {/* Attendance percentage indicator */}
                                        <div className="flex items-center justify-between text-xs p-1.5 mt-1 border-t border-slate-100">
                                          <span className="font-extrabold text-slate-500 uppercase text-[9px] tracking-wide">{reportT[language as "pt" | "en"].attendanceRate}:</span>
                                          <span className={cn(
                                            "font-black text-sm",
                                            percentualPresenca >= settings.frequencia_minima ? "text-emerald-600" : "text-rose-600"
                                          )}>
                                            {percentualPresenca.toFixed(1)}%
                                          </span>
                                        </div>

                                        {/* Tiny timeline of latest attendance dates */}
                                        {reportData.attendance && reportData.attendance.length > 0 && (
                                          <div className="flex flex-col gap-1.5 mt-1 pt-1.5 border-t border-dashed border-slate-200">
                                            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                                              {language === 'pt' ? 'Histórico de Presenças (Últimas 10):' : 'Attendance Record (Last 10):'}
                                            </span>
                                            <div className="flex flex-wrap gap-1">
                                              {reportData.attendance.slice(0, 10).map((att: any, ind: number) => (
                                                <span 
                                                  key={att.id || ind} 
                                                  className={cn(
                                                    "text-[9px] px-1.5 py-0.5 rounded font-bold uppercase",
                                                    att.presente 
                                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                                                      : "bg-rose-50 text-rose-700 border border-rose-100"
                                                  )}
                                                  title={format(new Date(att.data), 'dd/MM/yyyy')}
                                                >
                                                  {format(new Date(att.data), 'dd/MM')} {att.presente ? '✓' : '✗'}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>

                                {/* Performance & Summary */}
                                <div className="border border-slate-200 rounded-lg p-4 flex flex-col gap-3 text-left">
                                  <h3 className="text-[11px] font-black text-slate-600 tracking-[0.1em] uppercase border-b border-slate-200 pb-1">
                                    {language === 'pt' ? 'DESEMPENHO GLOBAL' : 'GLOBAL PERFORMANCE'}
                                  </h3>
                                  
                                  {(() => {
                                    const validFinalGrades = reportData.grades
                                      ? reportData.grades.filter((g: any) => g.nota_final !== null && g.nota_final !== undefined) 
                                      : [];
                                    const averageGrade = validFinalGrades.length > 0
                                      ? validFinalGrades.reduce((sum: number, g: any) => sum + Number(g.nota_final), 0) / validFinalGrades.length
                                      : null;

                                    // Compute overall status
                                    let overallLabel = language === 'pt' ? 'EM FILTRAGEM / AVALIAÇÃO' : 'UNDER REVIEW';
                                    let overallClass = 'bg-slate-100 text-slate-700';

                                    if (averageGrade !== null) {
                                      // Let's check for any failure or low attendance
                                      const hasReprovedDiscipline = reportData.grades.some((g: any) => g.nota_final !== null && g.nota_final < settings.media_aprovacao);
                                      const totalAulas = reportData.attendance?.length || 0;
                                      let percentualPresenca = 100;
                                      if (totalAulas > 0) {
                                        const presencas = reportData.attendance.filter((a: any) => a.presente).length;
                                        percentualPresenca = (presencas / totalAulas) * 100;
                                      } else if (reportData.grades && reportData.grades.length > 0) {
                                        const validFreqs = reportData.grades.filter((g: any) => g.frequencia !== null && g.frequencia !== undefined);
                                        if (validFreqs.length > 0) {
                                          percentualPresenca = validFreqs.reduce((sum: number, g: any) => sum + g.frequencia, 0) / validFreqs.length;
                                        }
                                      }

                                      if (percentualPresenca < settings.frequencia_minima) {
                                        overallLabel = language === 'pt' ? 'REPROVADO POR FREQUÊNCIA' : 'FAILED BY ATTENDANCE';
                                        overallClass = 'bg-rose-100 text-rose-700';
                                      } else if (hasReprovedDiscipline) {
                                        overallLabel = language === 'pt' ? 'REPROVADO POR NOTA' : 'FAILED BY ACADEMICS';
                                        overallClass = 'bg-red-100 text-red-700';
                                      } else if (averageGrade >= settings.media_aprovacao) {
                                        overallLabel = reportT[language as "pt" | "en"].approved;
                                        overallClass = 'bg-emerald-100 text-emerald-700 font-extrabold';
                                      } else if (averageGrade >= settings.media_recuperacao) {
                                        overallLabel = reportT[language as "pt" | "en"].retake;
                                        overallClass = 'bg-yellow-100 text-yellow-700';
                                      } else {
                                        overallLabel = reportT[language as "pt" | "en"].reproved;
                                        overallClass = 'bg-rose-100 text-rose-700';
                                      }
                                    }

                                    return (
                                      <div className="flex-1 flex flex-col justify-between gap-3 text-left">
                                        <div className="flex flex-col gap-2">
                                          <div className="flex justify-between items-center text-xs p-1">
                                            <span className="font-extrabold text-slate-500 uppercase text-[9px] tracking-wide">{reportT[language as "pt" | "en"].overallAverage}:</span>
                                            <span className={cn(
                                              "font-black font-mono text-base px-2 py-0.5 rounded",
                                              averageGrade !== null && averageGrade >= settings.media_aprovacao ? "text-blue-600 bg-blue-50" : "text-rose-600 bg-rose-50"
                                            )}>
                                              {averageGrade !== null ? averageGrade.toFixed(2) : '-'}
                                            </span>
                                          </div>

                                          <div className="flex justify-between items-center text-xs p-1 border-t border-slate-100">
                                            <span className="font-extrabold text-slate-500 uppercase text-[9px] tracking-wide">{reportT[language as "pt" | "en"].overallStatus}:</span>
                                            <span className={cn(
                                              "text-[10px] font-black uppercase px-2.5 py-1 rounded",
                                              overallClass
                                            )}>
                                              {overallLabel}
                                            </span>
                                          </div>
                                        </div>

                                        {/* Visual feedback or badge */}
                                        <div className="text-[10px] text-slate-400 bg-slate-50 print-bg-gray rounded-lg p-2.5 border border-slate-100 flex items-start gap-2">
                                          <Award className="text-slate-400 shrink-0 mt-0.5" size={14} />
                                          <p className="leading-normal">
                                            {language === 'pt' 
                                              ? `Média de aprovação configurada em ${settings.media_aprovacao.toFixed(1)} e frequência mínima em ${settings.frequencia_minima}%.`
                                              : `Program passing grade configured at ${settings.media_aprovacao.toFixed(1)} and minimum attendance at ${settings.frequencia_minima}%.`}
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>

                              {/* Observations section */}
                              <div className="border border-slate-200 rounded-lg p-4 flex flex-col gap-2 text-left text-xs text-slate-600 italic">
                                <h3 className="text-[11px] font-black text-slate-400 tracking-[0.1em] uppercase border-b border-slate-200 pb-1">
                                  {reportT[language as "pt" | "en"].observations}
                                </h3>
                                <p className="leading-relaxed text-justify">
                                  {reportT[language as "pt" | "en"].defaultObs}
                                </p>
                              </div>


                              {/* Stamp & Verification Text */}
                              <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400 font-medium uppercase tracking-wider bg-white">
                                <span>{reportT[language as "pt" | "en"].footerText}</span>
                                <span>
                                  {language === 'pt' ? 'Data de Emissão: ' : 'Date of Issue: '}
                                  {new Date().toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', {
                                    day: '2-digit',
                                    month: 'long',
                                    year: 'numeric'
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-20 text-slate-400">
                            {language === 'pt' ? 'Não foi possível carregar os dados.' : 'Failed to retrieve report data.'}
                          </div>
                        )}
                      </div>

                      {/* Modal Actions Footer */}
                      <div className="p-4 border-t border-slate-700/50 flex justify-end gap-3 no-print bg-slate-900 rounded-b-2xl">
                        <button
                          onClick={() => setSelectedStudentForReport(null)}
                          className="bg-slate-800 hover:bg-slate-700 px-5 py-2.5 rounded-xl text-xs font-bold text-slate-300 transition-all cursor-pointer"
                        >
                          {reportT[language as "pt" | "en"].close}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
