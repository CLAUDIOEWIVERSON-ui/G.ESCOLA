'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { useUser } from '@/lib/auth/UserContext';
import {
  Award,
  Printer,
  Loader2,
  BookOpen,
  Users,
  Search,
  ChevronRight,
  FileText,
  Calendar,
  Settings as SettingsIcon,
  Check,
  Building,
  MapPin,
  CalendarDays,
  User,
  Info,
  RefreshCw,
  Edit2,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import Image from 'next/image';

// Import joint mission shield logo
import shieldLogo from '@/src/assets/images/brazil_shield_logo_1780469604695.png';

interface Course {
  id: string;
  nome: string;
  codigo: string;
  categoria: string;
  internacional: boolean;
  qtd_modulos: number;
}

interface ClassObj {
  id: string;
  curso_id: string;
  nome: string;
  ano: number;
  data_inicio: string;
  data_fim: string;
}

interface Student {
  id: string;
  nome: string;
  matricula: string;
  posto_graduacao: string;
  turma_id: string;
}

interface Discipline {
  id: string;
  nome: string;
  codigo: string;
  carga_horaria: number;
  curso_id: string;
}

interface Grade {
  id: string;
  aluno_id: string;
  disciplina_id: string;
  nota_final: number;
  frequencia: number;
}

export default function HistoricoEscolarPage() {
  const { language } = useI18n();
  const { profile, isAdmin } = useUser();

  // State managers
  const [courses, setCourses] = useState<Course[]>([]);
  const [classes, setClasses] = useState<ClassObj[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter selections
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<string>('');

  // Core generated data state
  const [courseDisciplines, setCourseDisciplines] = useState<Discipline[]>([]);
  const [studentGrades, setStudentGrades] = useState<Grade[]>([]);
  const [loadingTranscript, setLoadingTranscript] = useState(false);

  // Editable configurations for customized print output (matching Sao Tome model exactly)
  const [establishment, setEstablishment] = useState('GUARDA COSTEIRA');
  const [siglaCurso, setSiglaCurso] = useState('');
  const [turmaNome, setTurmaNome] = useState('');
  const [periodText, setPeriodText] = useState('');
  const [pais, setPais] = useState('São Tomé e Príncipe');
  const [cidade, setCidade] = useState('São Tomé');
  const [dataExpedicao, setDataExpedicao] = useState('');
  const [officerName, setOfficerName] = useState('MISSÃO DE ASSESSORIA NAVAL');
  const [officerRank, setOfficerRank] = useState('Capitão-Tenente');
  const [officerTitle, setOfficerTitle] = useState('Encarregado da Missão de Assessoria Naval');
  
  // Custom grades state to allow overriding "SAT" vs numeric scores in real time
  const [customGradesOverride, setCustomGradesOverride] = useState<Record<string, string>>({});
  
  // Checkboxes for locking editing interface or collapsing settings
  const [editingConfig, setEditingConfig] = useState(false);
  const [autoTriggerPrint, setAutoTriggerPrint] = useState(false);

  // Standard defaults for Sao Tome & Principe Navy grading range
  const [config, setConfig] = useState({
    media_aprovacao: 10,
    nota_maxima: 20
  });

  // Load configs
  useEffect(() => {
    const fetchGlobalConfigs = async () => {
      try {
        const { data: configData } = await supabase.from('configuracoes').select('*').single();
        if (configData) {
          setConfig({
            media_aprovacao: configData.media_aprovacao || 10,
            nota_maxima: configData.nota_maxima || 20
          });
        }
      } catch (err) {
        console.error('Error fetching general config:', err);
      }
    };
    fetchGlobalConfigs();
  }, []);

  // Fetch National Career Courses
  // 1. FILTER: c.categoria === 'Carreira' OR 'carreira'
  // 2. FILTER: c.internacional !== true (Nacionais)
  const fetchNationalCareerCourses = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cursos')
        .select('*')
        .is('deleted_at', null)
        .order('nome');

      if (error) throw error;

      // Filter local for safety of casing/exact category match
      const filtered = (data || []).filter((c: any) => {
        const categoryMatch = c.categoria?.toLowerCase() === 'carreira';
        const isNational = !c.internacional;
        return categoryMatch && isNational;
      }) as Course[];

      setCourses(filtered);
    } catch (err: any) {
      console.error('Error fetching national career courses:', err);
      toast.error(language === 'pt' ? 'Erro ao carregar cursos de carreira nacionais.' : 'Error loading national career courses.');
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNationalCareerCourses();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchNationalCareerCourses]);

  // Fetch classes for selected course
  useEffect(() => {
    if (!selectedCourse) {
      const timer = setTimeout(() => {
        setClasses([]);
        setSelectedClass('');
      }, 0);
      return () => clearTimeout(timer);
    }

    const fetchClassesForCourse = async () => {
      try {
        const { data, error } = await supabase
          .from('turmas')
          .select('*')
          .eq('curso_id', selectedCourse)
          .is('deleted_at', null)
          .order('nome');

         if (error) throw error;
         setClasses(data || []);
      } catch (err) {
        console.error('Error fetching classes:', err);
        toast.error(language === 'pt' ? 'Erro ao carregar turmas.' : 'Error loading classes.');
      }
    };

    fetchClassesForCourse();
  }, [selectedCourse, language]);

  // Fetch students for selected class
  useEffect(() => {
    if (!selectedClass) {
      const timer = setTimeout(() => {
        setStudents([]);
        setSelectedStudent('');
      }, 0);
      return () => clearTimeout(timer);
    }

    const fetchStudentsForClass = async () => {
      try {
        const { data, error } = await supabase
          .from('alunos')
          .select('id, nome, matricula, posto_graduacao, turma_id')
          .eq('turma_id', selectedClass)
          .is('deleted_at', null)
          .order('nome');

        if (error) throw error;
        setStudents(data || []);
      } catch (err) {
        console.error('Error fetching students:', err);
        toast.error(language === 'pt' ? 'Erro ao carregar alunos.' : 'Error loading students.');
      }
    };

    fetchStudentsForClass();
  }, [selectedClass, language]);

  // Fetch Academic data once candidate student selected
  useEffect(() => {
    if (!selectedStudent) {
      const timer = setTimeout(() => {
        setCourseDisciplines([]);
        setStudentGrades([]);
      }, 0);
      return () => clearTimeout(timer);
    }

    const fetchTranscriptInformation = async () => {
      setLoadingTranscript(true);
      try {
        // Check if there are saved settings for this class in localStorage
        const savedConfigStr = typeof window !== 'undefined' ? localStorage.getItem(`historico_config_${selectedClass}`) : null;
        let hasSavedConfig = false;

        if (savedConfigStr) {
          try {
            const savedData = JSON.parse(savedConfigStr);
            if (savedData) {
              setEstablishment(savedData.establishment || 'GUARDA COSTEIRA');
              setSiglaCurso(savedData.siglaCurso || '');
              setTurmaNome(savedData.turmaNome || '');
              setPeriodText(savedData.periodText || '');
              setPais(savedData.pais || 'São Tomé e Príncipe');
              setCidade(savedData.cidade || 'São Tomé');
              setOfficerName(savedData.officerName || 'MISSÃO DE ASSESSORIA NAVAL');
              setOfficerRank(savedData.officerRank || 'Capitão-Tenente');
              setOfficerTitle(savedData.officerTitle || 'Encarregado da Missão de Assessoria Naval');
              hasSavedConfig = true;
            }
          } catch (e) {
            console.error('Error parsing saved class config:', e);
          }
        }

        if (!hasSavedConfig) {
          // Fallback to database defaults if no custom settings saved
          setEstablishment('GUARDA COSTEIRA');
          setPais('São Tomé e Príncipe');
          setCidade('São Tomé');
          setOfficerName('MISSÃO DE ASSESSORIA NAVAL');
          setOfficerRank('Capitão-Tenente');
          setOfficerTitle('Encarregado da Missão de Assessoria Naval');

          // Find course info
          const resCourse = courses.find(c => c.id === selectedCourse);
          if (resCourse) {
            setSiglaCurso(resCourse.codigo || '');
          }

          // Find class info
          const resClass = classes.find(c => c.id === selectedClass);
          if (resClass) {
            setTurmaNome(resClass.nome || '');
            
            // Construct formatted dates
            if (resClass.data_inicio && resClass.data_fim) {
              const di = new Date(resClass.data_inicio).toLocaleDateString('pt-BR');
              const df = new Date(resClass.data_fim).toLocaleDateString('pt-BR');
              setPeriodText(`${di} a ${df}`);
            } else {
              setPeriodText(`Ano Letivo de ${resClass.ano}`);
            }
          }
        }

        // Default expediting date (today)
        const today = new Date().toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        setDataExpedicao(today);

        // Fetch disciplines/modules
        const { data: dData, error: dErr } = await supabase
          .from('disciplinas')
          .select('*')
          .eq('curso_id', selectedCourse)
          .is('deleted_at', null);
        
        if (dErr) throw dErr;

        // Custom sort by code or modulo prefix to match logical progression (e.g., CFMN-01, CFMN-02, etc.)
        const sortedDisciplines = (dData || []).sort((a, b) => {
          return (a.codigo || '').localeCompare(b.codigo || '', undefined, { numeric: true, sensitivity: 'base' });
        });
        
        setCourseDisciplines(sortedDisciplines);

        // Fetch students grades
        const { data: nData, error: nErr } = await supabase
          .from('notas')
          .select('*')
          .eq('aluno_id', selectedStudent)
          .eq('turma_id', selectedClass);

        if (nErr) throw nErr;
        setStudentGrades(nData || []);

        // Pre-configure override options for specific qualitative classes (like physical education, onboard practices, order unida)
        const initialOverrides: Record<string, string> = {};
        sortedDisciplines.forEach(d => {
          const lName = d.nome.toLowerCase();
          const lCode = (d.codigo || '').toLowerCase();
          
          const gradeObj = (nData || []).find(g => g.disciplina_id === d.id);
          const hasNumericGrade = gradeObj && gradeObj.nota_final !== null && gradeObj.nota_final !== undefined;

          // Auto-classify common physical/practical classes to default to SAT ONLY IF they do not have a numeric grade launched!
          if (
            !hasNumericGrade && (
              lName.includes('físico') || 
              lName.includes('tfm') || 
              lName.includes('prática') || 
              lName.includes('bordo') || 
              lName.includes('ordem unida') || 
              lName.includes('comportamento') ||
              lCode.includes('tfm')
            )
          ) {
            initialOverrides[d.id] = 'SAT';
          } else {
            initialOverrides[d.id] = 'numeric';
          }
        });
        setCustomGradesOverride(initialOverrides);

      } catch (err) {
        console.error('Error fetching academic transcript details:', err);
        toast.error(language === 'pt' ? 'Erro ao processar dados acadêmicos do aluno.' : 'Error processing academic history.');
      } finally {
        setLoadingTranscript(false);
      }
    };

    fetchTranscriptInformation();
  }, [selectedStudent, selectedCourse, selectedClass, courses, classes, language]);

  // Selected Student Object
  const currentStudentObj = useMemo(() => {
    return students.find(s => s.id === selectedStudent);
  }, [students, selectedStudent]);

  // Selected Course Object
  const currentCourseObj = useMemo(() => {
    return courses.find(c => c.id === selectedCourse);
  }, [courses, selectedCourse]);

  // Process subject rows with grades and totals
  const processedGrades = useMemo(() => {
    let totalWorkload = 0;
    let sumNumericGrades = 0;
    let countNumericGrades = 0;
    const list: any[] = [];

    for (let i = 0; i < courseDisciplines.length; i++) {
      const d = courseDisciplines[i];
      const gradeObj = studentGrades.find(g => g.disciplina_id === d.id);
      const originalValue = gradeObj ? gradeObj.nota_final : null;
      
      const overrideVal = customGradesOverride[d.id];
      let displayGrade = '-';
      let numericVal: number | null = null;

      if (overrideVal === 'SAT') {
        const isPassed = originalValue === null || originalValue >= config.media_aprovacao;
        displayGrade = isPassed ? 'SAT' : 'INSAT';
      } else if (overrideVal === 'custom') {
        displayGrade = 'SAT';
      } else {
        if (originalValue !== null && originalValue !== undefined) {
          numericVal = Number(originalValue);
          displayGrade = numericVal.toFixed(2).replace('.', ',');
          sumNumericGrades += numericVal;
          countNumericGrades++;
        }
      }

      totalWorkload += d.carga_horaria || 0;

      list.push({
        id: d.id,
        codigo: d.codigo || '-',
        disciplina: d.nome,
        carga_horaria: d.carga_horaria || 0,
        gradeValue: originalValue,
        displayGrade,
        isQualitative: overrideVal === 'SAT' || overrideVal === 'custom',
        numericVal
      });
    }

    const calculatedAverage = countNumericGrades > 0 ? sumNumericGrades / countNumericGrades : null;

    return {
      rows: list,
      totalWorkload,
      calculatedAverage
    };
  }, [courseDisciplines, studentGrades, customGradesOverride, config]);

  // Auto-trigger printing when loading completes for autoTriggerPrint state
  useEffect(() => {
    if (autoTriggerPrint && !loadingTranscript && selectedStudent) {
      // Small timeout to ensure DOM is fully repainted before printing
      const timer = setTimeout(() => {
        try {
          window.print();
        } catch (e) {
          console.error('Auto print failed:', e);
        } finally {
          setAutoTriggerPrint(false);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoTriggerPrint, loadingTranscript, selectedStudent]);

  // Trigger print area window print
  const handlePrint = () => {
    if (!selectedStudent) {
      toast.warning(language === 'pt' ? 'Selecione um aluno primeiro.' : 'Select a student first.');
      return;
    }
    try {
      window.print();
    } catch (err) {
      console.error('Print failure:', err);
    }
  };

  // Save school history class-wide config parameters to localStorage
  const handleSaveClassConfig = () => {
    if (!selectedClass) {
      toast.warning(language === 'pt' ? 'Selecione uma turma primeiro.' : 'Select a class first.');
      return;
    }
    try {
      const configData = {
        establishment,
        siglaCurso,
        turmaNome,
        periodText,
        pais,
        cidade,
        officerName,
        officerRank,
        officerTitle,
        savedAt: new Date().toISOString()
      };
      
      localStorage.setItem(`historico_config_${selectedClass}`, JSON.stringify(configData));
      toast.success(
        language === 'pt' 
          ? 'Dados gerais da turma salvos com sucesso!' 
          : 'General class config saved successfully!'
      );
    } catch (err) {
      console.error('Error saving class config:', err);
      toast.error(
        language === 'pt' 
          ? 'Erro ao salvar a configuração da turma.' 
          : 'Error saving class configuration.'
      );
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 flex-1">
      {/* Search Header Dashboard Overlay */}
      <div className="p-6 border-b border-slate-800/60 bg-slate-900/40 backdrop-blur-xl shrink-0 no-print">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/15 rounded-2xl border border-emerald-500/20 text-emerald-400">
              <Award size={24} className="animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Histórico Escolar Militar
                <span className="text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full tracking-widest border border-emerald-500/15">Exclusivo Carreira</span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Emissão e impressão de histórico escolar exclusivo para cursos de carreira nacionais.
              </p>
            </div>
          </div>

          {selectedStudent && (
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition-all shadow-lg shadow-emerald-600/20 cursor-pointer"
            >
              <Printer size={15} />
              Imprimir Documento
            </button>
          )}
        </div>
      </div>

      {/* Main Core View Area */}
      <div className="flex-1 max-w-5xl w-full mx-auto p-6 flex flex-col lg:flex-row gap-6">
        
        {/* Left column sidebar settings (no-print) */}
        <div className="w-full lg:w-80 shrink-0 flex flex-col gap-6 no-print">
          {/* Filters card */}
          <div className="bg-slate-900/60 border border-slate-800/70 p-5 rounded-2xl flex flex-col gap-5 backdrop-blur-md">
            <h2 className="text-sm font-black text-slate-200 tracking-wider uppercase border-b border-slate-800 pb-2 flex items-center gap-2">
              <BookOpen size={14} className="text-emerald-500" />
              Seleção Acadêmica
            </h2>

            {/* 1. Select nacional career course */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                1. Curso de Carreira Nacional
              </label>
              {loading ? (
                <div className="flex items-center gap-2 text-slate-500 text-xs py-2 pl-1">
                  <Loader2 className="animate-spin text-emerald-500" size={14} />
                  <span>Buscando cursos...</span>
                </div>
              ) : courses.length === 0 ? (
                <p className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl leading-relaxed">
                  Não foi encontrado nenhum Curso de Carreira Nacional ativo. Verifique a configuração dos cursos (Categoria deve ser &apos;Carreira&apos; e Internacional falso).
                </p>
              ) : (
                <select
                  value={selectedCourse}
                  onChange={(e) => {
                    setSelectedCourse(e.target.value);
                    setSelectedClass('');
                    setSelectedStudent('');
                  }}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="">Selecione um curso...</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.nome} ({c.codigo || 'Sem sigla'})</option>
                  ))}
                </select>
              )}
            </div>

            {/* 2. Select corresponding turma */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                2. Turma Ativa
              </label>
              <select
                disabled={!selectedCourse}
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setSelectedStudent('');
                }}
                className={cn(
                  "bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all focus:border-emerald-500",
                  !selectedCourse && "opacity-40 cursor-not-allowed"
                )}
              >
                <option value="">Selecione a turma...</option>
                {classes.map(cl => (
                  <option key={cl.id} value={cl.id}>{cl.nome} (Ano {cl.ano})</option>
                ))}
              </select>
              {selectedCourse && classes.length === 0 && (
                <span className="text-[10px] text-amber-500 bg-amber-500/5 p-2 rounded-lg mt-1 block">
                  Nenhuma turma para este curso.
                </span>
              )}
            </div>

            {/* 3. Choose candidate student */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                3. Aluno
              </label>
              <select
                disabled={!selectedClass}
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className={cn(
                  "bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all focus:border-emerald-500",
                  !selectedClass && "opacity-40 cursor-not-allowed"
                )}
              >
                <option value="">Selecione o aluno...</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.nome} {s.posto_graduacao ? `(${s.posto_graduacao})` : ''}
                  </option>
                ))}
              </select>
              {selectedClass && students.length === 0 && (
                <span className="text-[10px] text-amber-500 bg-amber-500/5 p-2 rounded-lg mt-1 block">
                  Nenhum aluno matriculado nesta turma.
                </span>
              )}
            </div>
          </div>

          {/* Quick fine-tune configurations card */}
          {selectedStudent && (
            <div className="bg-slate-900/60 border border-slate-800/70 p-5 rounded-2xl flex flex-col gap-4 backdrop-blur-md">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <SettingsIcon size={14} className="text-emerald-500" />
                  Dados do Documento
                </h3>
                <button 
                  onClick={() => setEditingConfig(!editingConfig)}
                  className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 uppercase shrink-0 px-2 py-1 bg-emerald-500/10 rounded-md transition-colors"
                >
                  {editingConfig ? 'Ocultar' : 'Ajustar'}
                </button>
              </div>

              {editingConfig ? (
                <div className="flex flex-col gap-3.5 mt-1">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold uppercase text-slate-400">Estabelecimento</span>
                    <input 
                      type="text" 
                      value={establishment} 
                      onChange={e => setEstablishment(e.target.value)} 
                      className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white uppercase"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold uppercase text-slate-400">Sigla Curso</span>
                      <input 
                        type="text" 
                        value={siglaCurso} 
                        onChange={e => setSiglaCurso(e.target.value)} 
                        className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white uppercase"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold uppercase text-slate-400">Turma</span>
                      <input 
                        type="text" 
                        value={turmaNome} 
                        onChange={e => setTurmaNome(e.target.value)} 
                        className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white uppercase"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold uppercase text-slate-400">Período</span>
                    <input 
                      type="text" 
                      value={periodText} 
                      onChange={e => setPeriodText(e.target.value)} 
                      className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold uppercase text-slate-400">País</span>
                      <input 
                        type="text" 
                        value={pais} 
                        onChange={e => setPais(e.target.value)} 
                        className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold uppercase text-slate-400">Cidade</span>
                      <input 
                        type="text" 
                        value={cidade} 
                        onChange={e => setCidade(e.target.value)} 
                        className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold uppercase text-slate-400">Data Expedição</span>
                    <input 
                      type="text" 
                      value={dataExpedicao} 
                      onChange={e => setDataExpedicao(e.target.value)} 
                      className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                    />
                  </div>

                  <div className="border-t border-slate-800/80 pt-2 flex flex-col gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold uppercase text-slate-400">Assinatura Nome</span>
                      <input 
                        type="text" 
                        value={officerName} 
                        onChange={e => setOfficerName(e.target.value)} 
                        className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold uppercase text-slate-400">Assinatura Posto / Patente</span>
                      <input 
                        type="text" 
                        value={officerRank} 
                        onChange={e => setOfficerRank(e.target.value)} 
                        className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold uppercase text-slate-400">Assinatura Cargo</span>
                      <input 
                        type="text" 
                        value={officerTitle} 
                        onChange={e => setOfficerTitle(e.target.value)} 
                        className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-[10px] text-white"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 mt-1 text-[11px] text-slate-400 leading-normal bg-slate-950/40 p-3 rounded-xl border border-slate-800/50">
                  <div className="flex justify-between border-b border-slate-900 pb-1">
                    <span className="font-bold">Local:</span>
                    <span>{establishment}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1">
                    <span className="font-bold">Sigla:</span>
                    <span>{siglaCurso}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1">
                    <span className="font-bold">País:</span>
                    <span>{pais}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1">
                    <span className="font-bold">Média:</span>
                    <span className="text-emerald-400 font-extrabold">{processedGrades.calculatedAverage !== null ? processedGrades.calculatedAverage.toFixed(2) : '-'} / {config.nota_maxima}</span>
                  </div>
                  <p className="text-[9px] text-slate-500 mt-1 hover:text-slate-400 cursor-pointer text-center font-bold uppercase" onClick={() => setEditingConfig(true)}>
                    Clique em Ajustar para obter controle total das assinaturas e carimbo físico.
                  </p>
                </div>
              )}

              {/* Botão Salvar para persistir os dados gerais da turma */}
              <button
                type="button"
                onClick={handleSaveClassConfig}
                className="w-full bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 hover:border-emerald-500 font-extrabold text-[10px] uppercase tracking-wider py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-3"
              >
                <Check size={12} />
                {language === 'pt' ? 'Salvar Configuração da Turma' : 'Save Class Config'}
              </button>
            </div>
          )}

          {/* Qualitative checklist config */}
          {selectedStudent && courseDisciplines.length > 0 && (
            <div className="bg-slate-900/60 border border-slate-800/70 p-5 rounded-2xl flex flex-col gap-2.5 backdrop-blur-md">
              <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-2">
                Ajuste de Avaliação (SAT)
              </h3>
              <p className="text-[10px] text-slate-400 leading-relaxed mb-1">
                Selecione as disciplinas que utilizam avaliação qualitativa e devem exibir <strong>SAT</strong> em vez da nota numérica (elas serão excluídas da média final).
              </p>
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-2 custom-scrollbar">
                {courseDisciplines.map(d => {
                  const isChecked = customGradesOverride[d.id] === 'SAT';
                  return (
                    <label 
                      key={d.id} 
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg border text-left cursor-pointer transition-colors text-[11px]",
                        isChecked 
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300"
                      )}
                    >
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        onChange={(e) => {
                          setCustomGradesOverride(prev => ({
                            ...prev,
                            [d.id]: e.target.checked ? 'SAT' : 'numeric'
                          }));
                        }}
                        className="rounded accent-emerald-500 shrink-0 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate" title={d.nome}>{d.nome}</p>
                        <span className="text-[9px] font-mono text-slate-500 select-none uppercase">{d.codigo}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right column document view sheet */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Default Empty State / Student List */}
          {!selectedStudent ? (
            selectedClass ? (
              <div className="flex-1 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 flex flex-col gap-6 backdrop-blur-md">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Users size={18} className="text-emerald-500" />
                      Emitir Histórico Escolar por Aluno
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {students.length} {students.length === 1 ? 'aluno encontrado' : 'alunos encontrados'} nesta turma. Ao lado de cada nome já está o atalho para imprimir o arquivo preenchido para PDF.
                    </p>
                  </div>
                </div>

                {students.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
                    <div className="p-3 bg-slate-800/40 rounded-full text-slate-500 border border-slate-800">
                      <Users size={24} />
                    </div>
                    <p className="text-xs text-slate-400">Nenhum aluno cadastrado nesta turma.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          <th className="py-3 px-4">Matrícula</th>
                          <th className="py-3 px-4">Nome do Aluno</th>
                          <th className="py-3 px-4">Posto / Graduação</th>
                          <th className="py-3 px-4 text-right">Ficha em PDF</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/20">
                        {students.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-850/40 transition-all group border-b border-slate-800/40">
                            <td className="py-3 px-4 font-mono text-xs text-emerald-400 font-bold">
                              #{s.matricula}
                            </td>
                            <td className="py-3 px-4 text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                              {s.nome}
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-300">
                              <span className="bg-slate-800/60 border border-slate-700/40 px-2.5 py-0.5 rounded-md text-[10px] font-bold text-slate-300 uppercase tracking-wide">
                                {s.posto_graduacao || 'Não especificado'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setSelectedStudent(s.id)}
                                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 hover:text-white border border-slate-700/50 hover:border-slate-600 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                                >
                                  Visualizar
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedStudent(s.id);
                                    setAutoTriggerPrint(true);
                                  }}
                                  className="px-2.5 py-1.5 bg-emerald-600/15 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/20 hover:border-emerald-500 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 shadow-lg shadow-emerald-500/5 cursor-pointer"
                                >
                                  <Printer size={11} />
                                  Salvar PDF
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 bg-slate-900/30 border-2 border-dashed border-slate-800/80 rounded-3xl p-12 py-20 flex flex-col items-center justify-center text-center gap-4">
                <div className="p-4 bg-slate-900 rounded-full text-slate-600 border border-slate-800">
                  <FileText size={36} className="text-slate-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Visualização da Ficha Histórico-Escolar</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-2 leading-relaxed">
                    Utilize o painel de seleção acadêmica à esquerda para escolher o curso de carreira nacional e a turma correspondente.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  <span className="text-[9px] font-black uppercase text-slate-500 bg-slate-900/60 border border-slate-800 px-3 py-1 rounded-full">Estilo Oficial A4</span>
                  <span className="text-[9px] font-black uppercase text-slate-500 bg-slate-900/60 border border-slate-800 px-3 py-1 rounded-full">Cálculo de Média Global</span>
                  <span className="text-[9px] font-black uppercase text-slate-500 bg-slate-900/60 border border-slate-800 px-3 py-1 rounded-full">Suporte SAT / INSAT</span>
                </div>
              </div>
            )
          ) : loadingTranscript ? (
            <div className="flex-1 bg-slate-900/40 border border-slate-800 rounded-3xl py-32 flex flex-col items-center justify-center gap-3">
              <Loader2 className="animate-spin text-emerald-500" size={32} />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Calculando notas e gerando formulário...</span>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Back to List & Quick Print Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
                <button
                  onClick={() => setSelectedStudent('')}
                  className="flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  <ArrowLeft size={14} className="text-slate-500" />
                  Voltar para Lista de Aluno
                </button>
                <div className="flex items-center gap-2 justify-end">
                  <button
                    onClick={handlePrint}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-600/20 cursor-pointer"
                  >
                    <Printer size={14} />
                    Imprimir Ficha (PDF)
                  </button>
                </div>
              </div>

              {/* Printable Info Alert */}
              <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-4 rounded-2xl flex items-start gap-2.5 text-xs no-print">
                <Info size={16} className="shrink-0 mt-0.5 text-blue-400" />
                <p className="leading-relaxed text-left">
                  <strong>Pré-visualização da Folha de Impressão:</strong> As margens e o fundo branco foram estilizados exclusivamente para o papel A4. Ao clicar no botão de impressão, o navegador ocultará os controles operacionais de forma automática, garantindo uma ficha oficial impecável.
                </p>
              </div>

              {/* SHEET OF THE PAPER - EXACT PRINT REPLICA OF THE NATIONAL SPECIFICATION */}
              <div 
                id="historico-print-area"
                className="bg-white text-slate-900 border border-slate-200 shadow-2xl p-12 rounded-lg max-w-[210mm] min-h-[297mm] mx-auto flex flex-col gap-6 font-serif relative overflow-hidden"
                style={{ width: '100%', boxSizing: 'border-box' }}
              >
                
                {/* Embedded dynamic style tag to handle pure paper standard isolated margins and start exactly at top of page without white margins or trailing pages */}
                <style dangerouslySetInnerHTML={{ __html: `
                  @media print {
                    @page {
                      size: A4;
                      margin: 0 !important;
                    }
                    html, body {
                      background: white !important;
                      color: black !important;
                      margin: 0 !important;
                      padding: 0 !important;
                      width: 210mm !important;
                      height: 297mm !important;
                      max-height: 297mm !important;
                      min-height: 297mm !important;
                      overflow: hidden !important;
                      -webkit-print-color-adjust: exact !important;
                      print-color-adjust: exact !important;
                    }
                    body * {
                      visibility: hidden !important;
                    }
                    #historico-print-area, #historico-print-area * {
                      visibility: visible !important;
                    }
                    #historico-print-area {
                      display: flex !important;
                      flex-direction: column !important;
                      position: absolute !important;
                      left: 0 !important;
                      top: 0 !important;
                      width: 210mm !important;
                      height: 297mm !important;
                      max-height: 297mm !important;
                      min-height: 297mm !important;
                      box-sizing: border-box !important;
                      border: none !important;
                      border-radius: 0 !important;
                      box-shadow: none !important;
                      padding: 10mm 15mm 8mm 15mm !important;
                      margin: 0 !important;
                      background-color: #ffffff !important;
                      overflow: hidden !important;
                      page-break-inside: avoid !important;
                      gap: 2mm !important;
                    }
                    /* Ensure flex direct children never shrink to cause overlapping or stacked text */
                    #historico-print-area > div {
                      flex-shrink: 0 !important;
                    }
                    #historico-print-area table {
                      width: 100% !important;
                      border-collapse: collapse !important;
                    }
                    /* Compact padding and line-height for tables on A4 */
                    #historico-print-area th, 
                    #historico-print-area td {
                      padding: 1mm 2.5mm !important;
                      font-size: 8pt !important;
                      line-height: 1.15 !important;
                    }
                    /* Custom sizing for specific small title indicators */
                    #historico-print-area td span {
                      font-size: 7.2pt !important;
                      line-height: 1 !important;
                    }
                    /* Section title backgrounds */
                    #historico-print-area .bg-slate-100 {
                      font-size: 8.5pt !important;
                      padding: 0.6mm 2mm !important;
                      line-height: 1 !important;
                    }
                    /* Compact Main Header for space recovery */
                    #historico-print-area h1 {
                      font-size: 14pt !important;
                      margin-top: 0.5mm !important;
                      padding: 0.8mm 3mm !important;
                    }
                    #historico-print-area div.pb-4 {
                      padding-bottom: 2mm !important;
                    }
                    /* Anti-fraud paragraph margin tightening */
                    #historico-print-area p.italic {
                      font-size: 7.2pt !important;
                      margin-top: 1.5mm !important;
                    }
                    /* Compact Signature line spacing to prevent splitting to a second page */
                    .signature-section-print {
                      margin-top: 3mm !important;
                      padding-top: 2mm !important;
                    }
                    main, 
                    main div,
                    div.min-h-screen, 
                    div.flex, 
                    div.flex-1, 
                    div.max-w-5xl,
                    .flex-col,
                    [role="main"] {
                      padding: 0 !important;
                      margin: 0 !important;
                      min-height: 0 !important;
                      height: 0 !important;
                      border: none !important;
                      box-shadow: none !important;
                      background: transparent !important;
                    }
                    .no-print, header, aside, nav, footer, button, .alert {
                      display: none !important;
                      width: 0 !important;
                      height: 0 !important;
                      overflow: hidden !important;
                    }
                  }
                `}} />

                {/* Elegant decorative watermark - joint mission shield logo faint background */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04]">
                  <Image 
                    src={shieldLogo} 
                    alt="Missão Naval Escudo Watermark" 
                    className="w-[420px] h-[420px] object-contain rotate-12" 
                    placeholder="empty"
                  />
                </div>

                {/* Main Header: Joint Naval Mission Brazil & São Tomé */}
                <div className="flex flex-col items-center justify-center text-center border-b border-slate-800 pb-4 relative z-10 gap-1">
                  <span className="text-[14px] leading-tight font-bold tracking-wide uppercase text-slate-800">
                    Missão de Assessoria Naval do Brasil em São Tomé e Príncipe
                  </span>
                  <h1 className="text-[20px] font-black tracking-widest uppercase text-slate-900 mt-1 border border-double border-slate-900 px-6 py-1.5">
                    Ficha Histórico-Escolar
                  </h1>
                </div>

                {/* SECTION I IDENTIFICATION */}
                <div className="relative z-10 text-left">
                  <div className="bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-wider border border-slate-300">
                    I – Identificação do Aluno
                  </div>
                  <table className="w-full border-collapse border border-slate-300 text-xs">
                    <tbody>
                      <tr>
                        <td className="border border-slate-300 p-2 w-2/3">
                          <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest">1 – Nome do Aluno</span>
                          <span className="font-extrabold uppercase text-slate-800">{currentStudentObj?.nome || '-'}</span>
                        </td>
                        <td className="border border-slate-300 p-2 w-1/3">
                          <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest">2 – Graduação</span>
                          <span className="font-extrabold uppercase text-slate-800">{currentStudentObj?.posto_graduacao || 'Não especificada'}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* SECTION II ESTABELECIMENTO */}
                <div className="relative z-10 text-left">
                  <div className="bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-wider border border-slate-300">
                    II – Estabelecimento de Ensino
                  </div>
                  <table className="w-full border-collapse border border-slate-300 text-xs">
                    <tbody>
                      <tr>
                        <td className="border border-slate-300 p-2 col-span-3" colSpan={3}>
                          <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest">3 – Nome do Estabelecimento de Ensino</span>
                          <span className="font-bold uppercase text-slate-800">{establishment || '-'}</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-slate-300 p-2 w-1/2">
                          <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest">4 – Nome do Curso</span>
                          <span className="font-bold uppercase text-slate-800">{currentCourseObj?.nome || '-'}</span>
                        </td>
                        <td className="border border-slate-300 p-2 w-1/4">
                          <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest">5 – Sigla do Curso</span>
                          <span className="font-extrabold font-mono text-slate-800 uppercase">{siglaCurso || '-'}</span>
                        </td>
                        <td className="border border-slate-300 p-2 w-1/4">
                          <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest">6 – Turma</span>
                          <span className="font-bold text-slate-800 uppercase">{turmaNome || '-'}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* SECTION III HISTÓRICO ESCOLAR */}
                <div className="relative z-10 text-left flex-1 flex flex-col">
                  <div className="bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-wider border border-slate-300">
                    III – Histórico Escolar
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-slate-300 text-xs text-left">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] uppercase font-bold tracking-wide text-slate-700">
                          <th className="border border-slate-300 px-4 py-2 w-28">Módulo</th>
                          <th className="border border-slate-300 px-4 py-2">Disciplina</th>
                          <th className="border border-slate-300 px-4 py-2 text-center w-28">Carga Horária</th>
                          <th className="border border-slate-300 px-4 py-2 text-center w-28">Nota</th>
                        </tr>
                      </thead>
                      <tbody>
                        {processedGrades.rows.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="border border-slate-300 text-center py-8 text-slate-400 font-bold bg-white italic">
                              Nenhuma disciplina cadastrada neste curso.
                            </td>
                          </tr>
                        ) : (
                          processedGrades.rows.map(row => (
                            <tr key={row.id} className="hover:bg-slate-50/25 transition-colors">
                              <td className="border border-slate-300 px-4 py-2.5 font-bold font-mono text-slate-800 uppercase">
                                {row.codigo}
                              </td>
                              <td className="border border-slate-300 px-4 py-2.5 text-slate-800 font-medium">
                                {row.disciplina}
                              </td>
                              <td className="border border-slate-300 px-4 py-2.5 text-center font-bold text-slate-700 font-mono">
                                {row.carga_horaria}h
                              </td>
                              <td className="border border-slate-300 px-4 py-2.5 text-center font-extrabold text-slate-900 font-mono">
                                {row.displayGrade}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Anti-fraud notation */}
                  <p className="text-[10px] font-black text-slate-900 text-center leading-relaxed mt-4 italic uppercase tracking-wider select-none">
                    ESTE DOCUMENTO NÃO SERÁ VÁLIDO SE APRESENTAR EMENDAS, RASURAS OU RESSALVAS.
                  </p>
                </div>

                {/* SECTION IV EXPEDIÇÃO */}
                <div className="relative z-10 text-left mt-auto">
                  <div className="bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-wider border border-slate-300">
                    IV – Expedição do Histórico Escolar
                  </div>
                  <table className="w-full border-collapse border border-slate-300 text-xs text-center">
                    <tbody>
                      <tr className="bg-slate-50 text-[9px] uppercase font-bold text-slate-500">
                        <td className="border border-slate-300 p-1 w-1/3">Média Final</td>
                        <td className="border border-slate-300 p-1 w-1/3">Carga Horária Total</td>
                        <td className="border border-slate-300 p-1 w-1/3">Período</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-300 p-2.5 font-extrabold text-sm text-slate-900 font-mono">
                          {processedGrades.calculatedAverage !== null 
                            ? processedGrades.calculatedAverage.toFixed(2).replace('.', ',') 
                            : '-'}
                        </td>
                        <td className="border border-slate-300 p-2.5 font-extrabold text-slate-800 font-mono">
                          {processedGrades.totalWorkload}h
                        </td>
                        <td className="border border-slate-300 p-2.5 font-bold text-slate-800">
                          {periodText || '-'}
                        </td>
                      </tr>
                      <tr className="bg-slate-50 text-[9px] uppercase font-bold text-slate-500">
                        <td className="border border-slate-300 p-1">País</td>
                        <td className="border border-slate-300 p-1">Cidade</td>
                        <td className="border border-slate-300 p-1">Data da Expedição</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-300 p-2.5 font-bold text-slate-800">{pais}</td>
                        <td className="border border-slate-300 p-2.5 font-bold text-slate-800">{cidade}</td>
                        <td className="border border-slate-300 p-2.5 font-bold text-slate-800">{dataExpedicao}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* SIGNATURE AREA SECTION */}
                <div className="signature-section-print flex flex-col items-center justify-center text-center mt-8 pt-8 border-t border-dashed border-slate-300 relative z-10">
                  <div className="w-[280px]">
                    <div className="border-b border-slate-900 pb-1 flex justify-center items-center">
                      <span className="h-4 block" /> {/* Placeholder for visual spacing */}
                    </div>
                    <p className="text-[11px] font-black text-slate-900 uppercase tracking-wide mt-2">
                      {officerName}
                    </p>
                    {officerRank && (
                      <p className="text-[9.5px] font-extrabold text-slate-800 tracking-wide uppercase mt-0.5">
                        {officerRank}
                      </p>
                    )}
                    <p className="text-[9px] font-bold text-slate-500 tracking-wider uppercase mt-0.5">
                      {officerTitle}
                    </p>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
