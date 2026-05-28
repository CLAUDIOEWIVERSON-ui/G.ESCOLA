'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useUser } from '@/lib/auth/UserContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart3, 
  Users, 
  BookOpen, 
  Award, 
  MapPin, 
  Calendar, 
  FileText, 
  Printer, 
  Target, 
  Search, 
  SlidersHorizontal, 
  Download, 
  FilterX, 
  GraduationCap, 
  Building, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Star,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

// Scaling text helper
const getScaleLabel = (val: number) => {
  if (val >= 4.5) return "Excelente";
  if (val >= 3.5) return "Muito Bom";
  if (val >= 2.5) return "Bom";
  if (val >= 1.5) return "Regular";
  return "Insatisfatório";
};

// Colors based on score
const getScoreBgColor = (val: number) => {
  if (val >= 4.0) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (val >= 3.0) return "bg-teal-50 text-teal-700 border-teal-200";
  if (val >= 2.5) return "bg-sky-50 text-sky-700 border-sky-200";
  if (val >= 1.5) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-rose-50 text-rose-700 border-rose-200";
};

const CURSO_QUESTIONS = [
  { key: "curso_q1", label: "O conteúdo do curso atendeu às expectativas?" },
  { key: "curso_q2", label: "O material didático foi adequado?" },
  { key: "curso_q3", label: "A carga horária foi suficiente?" },
  { key: "curso_q4", label: "Os exercícios práticos contribuíram para o aprendizado?" },
  { key: "curso_q5", label: "A organização do curso foi satisfatória?" },
  { key: "curso_q6", label: "O curso possui aplicabilidade prática na atividade profissional?" }
];

const INSTRUTOR_QUESTIONS = [
  { key: "instrutor_q1", label: "Domínio do conteúdo" },
  { key: "instrutor_q2", label: "Clareza na explicação" },
  { key: "instrutor_q3", label: "Pontualidade" },
  { key: "instrutor_q4", label: "Didática" },
  { key: "instrutor_q5", label: "Relacionamento com a turma" },
  { key: "instrutor_q6", label: "Capacidade de solucionar dúvidas" },
  { key: "instrutor_q7", label: "Condução das atividades práticas" }
];

const AUTO_QUESTIONS = [
  { key: "auto_q1", label: "Participação nas aulas" },
  { key: "auto_q2", label: "Interesse demonstrado" },
  { key: "auto_q3", label: "Frequência" },
  { key: "auto_q4", label: "Aproveitamento do conteúdo" },
  { key: "auto_q5", label: "Dedicação aos exercícios e avaliações" }
];

const INFRA_QUESTIONS = [
  { key: "infra_q1", label: "Sala de aula" },
  { key: "infra_q2", label: "Equipamentos" },
  { key: "infra_q3", label: "Recursos audiovisuais" },
  { key: "infra_q4", label: "Organização administrativa" },
  { key: "infra_q5", label: "Ambiente de ensino" }
];

export default function RelatorioAvaliacaoAdminPage() {
  const { profile, isAdmin, loading: userLoading } = useUser();
  const [loading, setLoading] = useState(true);

  // Raw DB data
  const [submissions, setSubmissions] = useState<any[]>([]);
  
  // Filter lists
  const [cursos, setCursos] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [instructorsList, setInstructorsList] = useState<string[]>([]);
  
  // Active Filter states
  const [selectedCurso, setSelectedCurso] = useState('ALL');
  const [selectedTurma, setSelectedTurma] = useState('ALL');
  const [selectedInstructor, setSelectedInstructor] = useState('ALL');
  const [selectedPeriod, setSelectedPeriod] = useState('ALL');
  const [selectedStudent, setSelectedStudent] = useState('ALL');

  // Interactive View states
  const [activeTab, setActiveTab] = useState<'geral' | 'curso' | 'instrutor' | 'aluno'>('geral');
  const [focusedInstructor, setFocusedInstructor] = useState<string>('');
  const [focusedStudent, setFocusedStudent] = useState<string>('');
  const [migratingMessage, setMigratingMessage] = useState(false);

  const loadAllData = async () => {
    try {
      setLoading(true);
      
      // Fetch Cursos
      const { data: cursosData } = await supabase.from('cursos').select('id, nome').is('deleted_at', null);
      if (cursosData) setCursos(cursosData);

      // Fetch Turmas
      const { data: turmasData } = await supabase.from('turmas').select('id, nome, curso_id, periodo').is('deleted_at', null);
      if (turmasData) setTurmas(turmasData);

      // Fetch Questionarios joined with relation metrics
      const { data: qData, error: qErr } = await supabase
        .from('questionarios_conclusao')
        .select(`
          *,
          aluno:alunos(
            id,
            nome,
            posto_graduacao,
            om,
            matricula
          ),
          turma:turmas(
            id,
            nome,
            instrutor,
            periodo,
            curso:cursos(
              id,
              nome
            )
          )
        `);

      if (qErr) {
        if ((qErr.message || '').includes('relation') && (qErr.message || '').includes('does not exist')) {
          setMigratingMessage(true);
          toast.warning('A tabela questionarios_conclusao não está criada no banco de dados ainda.');
        } else {
          throw qErr;
        }
      }

      const activeSubmissions = qData || [];
      setSubmissions(activeSubmissions);

      // Extract unique instructors mentioned in submissions
      const uniqueInstructorsSet = new Set<string>();
      activeSubmissions.forEach(sub => {
        if (sub.instrutor_nome && sub.instrutor_nome.trim()) {
          uniqueInstructorsSet.add(sub.instrutor_nome.trim());
        } else if (sub.turma?.instrutor && sub.turma.instrutor.trim()) {
          uniqueInstructorsSet.add(sub.turma.instrutor.trim());
        }
      });
      const instructors = Array.from(uniqueInstructorsSet);
      setInstructorsList(instructors);

      // Focus default elements
      if (instructors.length > 0) {
        setFocusedInstructor(instructors[0]);
      }
      if (activeSubmissions.length > 0 && activeSubmissions[0].aluno_id) {
        setFocusedStudent(activeSubmissions[0].aluno_id);
      }

    } catch (err: any) {
      console.error('Error loading admin reports data:', err);
      toast.error('Erro de sincronização: Não foi possível ler as respostas do banco.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userLoading) {
      if (isAdmin) {
        setTimeout(() => {
          loadAllData();
        }, 0);
      } else {
        setTimeout(() => {
          setLoading(false);
        }, 0);
      }
    }
  }, [userLoading, isAdmin]);

  // Re-apply filters using a pure memo (no effect side-effects)
  const filteredSubmissions = useMemo(() => {
    let result = [...submissions];

    if (selectedCurso !== 'ALL') {
      result = result.filter(sub => (sub.curso_id === selectedCurso || sub.turma?.curso?.id === selectedCurso));
    }
    if (selectedTurma !== 'ALL') {
      result = result.filter(sub => sub.turma_id === selectedTurma);
    }
    if (selectedInstructor !== 'ALL') {
      result = result.filter(sub => (sub.instrutor_nome === selectedInstructor || sub.turma?.instrutor === selectedInstructor));
    }
    if (selectedPeriod !== 'ALL') {
      result = result.filter(sub => sub.turma?.periodo === selectedPeriod);
    }
    if (selectedStudent !== 'ALL') {
      result = result.filter(sub => sub.aluno_id === selectedStudent);
    }

    return result;
  }, [selectedCurso, selectedTurma, selectedInstructor, selectedPeriod, selectedStudent, submissions]);

  // Auto set defaults for focused elements when data loads
  useEffect(() => {
    if (filteredSubmissions.length > 0) {
      const activeIds = filteredSubmissions.map(x => x.aluno_id);
      if (!activeIds.includes(focusedStudent)) {
        setTimeout(() => {
          setFocusedStudent(activeIds[0]);
        }, 0);
      }
    }
  }, [filteredSubmissions, focusedStudent]);

  const clearAllFilters = () => {
    setSelectedCurso('ALL');
    setSelectedTurma('ALL');
    setSelectedInstructor('ALL');
    setSelectedPeriod('ALL');
    setSelectedStudent('ALL');
    toast.success('Filtros redefinidos');
  };

  // Metric Computations based on filtered datasets
  const calculateAverage = (list: any[], keys: string[]) => {
    if (list.length === 0 || keys.length === 0) return 0;
    let sum = 0;
    let count = 0;
    list.forEach(sub => {
      keys.forEach(k => {
        if (sub[k] !== undefined && sub[k] !== null) {
          sum += Number(sub[k]);
          count++;
        }
      });
    });
    return count > 0 ? sum / count : 0;
  };

  const calculateQuestionAverage = (list: any[], key: string) => {
    if (list.length === 0) return 0;
    let sum = 0;
    let count = 0;
    list.forEach(sub => {
      if (sub[key] !== undefined && sub[key] !== null) {
        sum += Number(sub[key]);
        count++;
      }
    });
    return count > 0 ? sum / count : 0;
  };

  const getQuestionScoreByPercentage = (list: any[], key: string, score: number) => {
    if (list.length === 0) return 0;
    const matches = list.filter(sub => Number(sub[key]) === score);
    return (matches.length / list.length) * 100;
  };

  const courseAvgKeys = ["curso_q1", "curso_q2", "curso_q3", "curso_q4", "curso_q5", "curso_q6"];
  const instAvgKeys = ["instrutor_q1", "instrutor_q2", "instrutor_q3", "instrutor_q4", "instrutor_q5", "instrutor_q6", "instrutor_q7"];
  const autoAvgKeys = ["auto_q1", "auto_q2", "auto_q3", "auto_q4", "auto_q5"];
  const infraAvgKeys = ["infra_q1", "infra_q2", "infra_q3", "infra_q4", "infra_q5"];
  const allKeys = [...courseAvgKeys, ...instAvgKeys, ...autoAvgKeys, ...infraAvgKeys];

  const overallAverage = calculateAverage(filteredSubmissions, allKeys);
  const courseSatisfactionIndex = calculateAverage(filteredSubmissions, courseAvgKeys);
  const instructorIndex = calculateAverage(filteredSubmissions, instAvgKeys);
  const infraIndex = calculateAverage(filteredSubmissions, infraAvgKeys);
  const studentSelfIndex = calculateAverage(filteredSubmissions, autoAvgKeys);
  
  // High satisfaction percentage (scores 4 and 5)
  const getAggregatedSatisfactionPct = () => {
    if (filteredSubmissions.length === 0) return 0;
    let satisfiedAnswers = 0;
    let totalAnswers = 0;
    filteredSubmissions.forEach(sub => {
      allKeys.forEach(k => {
        if (sub[k] !== undefined && sub[k] !== null) {
          totalAnswers++;
          if (Number(sub[k]) >= 4) {
            satisfiedAnswers++;
          }
        }
      });
    });
    return totalAnswers > 0 ? (satisfiedAnswers / totalAnswers) * 100 : 0;
  };

  const satisfactionPercentage = getAggregatedSatisfactionPct();

  const handlePrint = () => {
    window.print();
  };

  // Mock initial setup database query if table is missing
  const executeBootstrapMigration = async () => {
    // Standard informational warning on how to run migration
    toast.info('Para criar a tabela questionarios_conclusao, copie o script da migração 25 no painel SQL do seu Supabase.');
  };

  if (userLoading || loading) {
    return (
      <div className="flex h-[75vh] items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          <span className="text-sm text-slate-500 font-mono">Processando estatísticas gerenciais...</span>
        </div>
      </div>
    );
  }

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white border border-slate-200 rounded-xl shadow-sm text-center">
        <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2 font-mono">Acesso Restrito ao Administrador</h2>
        <p className="text-slate-600 text-sm mb-4">
          Esta tela de análise de indicadores acadêmicos é restrita à equipe de gerência e coordenação de ensino.
        </p>
      </div>
    );
  }

  if (migratingMessage) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white border border-rose-100 rounded-xl shadow-sm">
        <div className="flex items-center gap-3 text-rose-600 mb-4 border-b pb-3">
          <AlertTriangle className="h-6 w-6" />
          <h2 className="text-lg font-bold font-mono">Tabela &quot;questionarios_conclusao&quot; ausente</h2>
        </div>
        <p className="text-slate-600 text-xs leading-relaxed mb-6">
          A base de dados do projeto ainda não possui a tabela de questionários pós-conclusão. 
          Criamos o arquivo de migração <code className="bg-slate-105 px-1 py-0.5 rounded font-mono text-rose-600">migrations/25_create_questionario_conclusao.sql</code> para você.
        </p>
        <div className="bg-slate-50 p-4 border rounded-lg mb-6">
          <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 font-mono">Como proceder:</p>
          <ol className="list-decimal list-inside text-xs text-slate-650 space-y-1.5">
            <li>Abra o seu painel do Supabase</li>
            <li>Vá até a aba <strong className="text-slate-900">SQL Editor</strong></li>
            <li>Abra o arquivo <code className="font-mono">migrations/25_create_questionario_conclusao.sql</code> e copie todo o seu conteúdo</li>
            <li>Cole no editor do Supabase e clique em <strong className="text-slate-900">Run</strong></li>
            <li>Após executar, retorne a esta página e recarregue.</li>
          </ol>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadAllData}
            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 rounded-lg font-semibold transition"
          >
            Tentar Sincronizar Novamente
          </button>
        </div>
      </div>
    );
  }

  // Define active filtering lists computed from current state
  const availableStudentsInFilteredRange = filteredSubmissions.map(sub => sub.aluno).filter(Boolean);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Page Title & Utility buttons */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4 mt-2 print:hidden">
        <div>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">COORDENAÇÃO E GESTÃO ACADÊMICA</span>
          <h1 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-slate-800" />
            Análise e Relatórios de Questionários
          </h1>
          <p className="text-xs text-slate-600 mt-1">Estatísticas, índices de qualidade acadêmica, rankings de instrutores e autoavaliação.</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 text-xs font-bold px-4 py-2.5 rounded-lg transition shadow-sm cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            Imprimir Relatório (A4)
          </button>
        </div>
      </div>

      {/* FILTER BOX */}
      <div className="bg-slate-900 text-white border border-slate-850 rounded-xl shadow-sm p-6 print:hidden">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-2.5">
          <SlidersHorizontal className="h-4 w-4 text-slate-400" />
          <h2 className="text-xs font-black uppercase tracking-wider font-mono">Filtros de Pesquisa e Segmentação</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Curso Selection */}
          <div>
            <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5 font-mono">Curso</label>
            <select
              value={selectedCurso}
              onChange={(e) => setSelectedCurso(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-300"
            >
              <option value="ALL">Todos os Cursos</option>
              {cursos.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

          {/* Turma Selection */}
          <div>
            <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5 font-mono">Turma</label>
            <select
              value={selectedTurma}
              onChange={(e) => setSelectedTurma(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-300"
            >
              <option value="ALL">Todas as Turmas</option>
              {turmas
                .filter(t => selectedCurso === 'ALL' || t.curso_id === selectedCurso)
                .map(t => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
            </select>
          </div>

          {/* Instrutor Selection */}
          <div>
            <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5 font-mono font-mono">Instrutor</label>
            <select
              value={selectedInstructor}
              onChange={(e) => setSelectedInstructor(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-300"
            >
              <option value="ALL">Todos os Instrutores</option>
              {instructorsList.map(inst => (
                <option key={inst} value={inst}>{inst}</option>
              ))}
            </select>
          </div>

          {/* Period selection */}
          <div>
            <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5 font-mono">Período</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-300"
            >
              <option value="ALL">Todos os Períodos</option>
              <option value="manhã">Manhã</option>
              <option value="tarde">Tarde</option>
              <option value="noite">Noite</option>
            </select>
          </div>

          {/* Student selection filter */}
          <div>
            <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5 font-mono font-mono font-mono">Aluno Específico</label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-300"
            >
              <option value="ALL">Todos os Alunos ({filteredSubmissions.length} avaliados)</option>
              {filteredSubmissions.map(sub => (
                <option key={sub.id} value={sub.aluno_id}>{sub.aluno?.nome || sub.aluno_id}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Filters Clear Row */}
        <div className="flex justify-between items-center mt-4 border-t border-slate-800 pt-3 text-[11px]">
          <span className="text-slate-400 font-mono">
            Registros encontrados para o filtro selecionado: <strong className="text-white">{filteredSubmissions.length} avaliações</strong>
          </span>
          <button
            onClick={clearAllFilters}
            className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 transition font-bold"
          >
            <FilterX className="h-3.5 w-3.5" />
            Limpar Filtros
          </button>
        </div>
      </div>

      {/* DASHBOARD TABS AND CONTENT CONTROLLERS */}
      <div className="border-b border-slate-200 flex flex-wrap gap-2 print:hidden">
        <button
          onClick={() => setActiveTab('geral')}
          className={`px-5 py-3 text-xs font-bold transition border-b-2 font-mono ${
            activeTab === 'geral' 
              ? "border-slate-900 text-slate-900" 
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Visão Geral & Estatísticas
        </button>
        <button
          onClick={() => setActiveTab('curso')}
          className={`px-5 py-3 text-xs font-bold transition border-b-2 font-mono ${
            activeTab === 'curso' 
              ? "border-slate-900 text-slate-900" 
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Relatório do Curso
        </button>
        <button
          onClick={() => setActiveTab('instrutor')}
          className={`px-5 py-3 text-xs font-bold transition border-b-2 font-mono ${
            activeTab === 'instrutor' 
              ? "border-slate-900 text-slate-900" 
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Relatório do Instrutor
        </button>
        <button
          onClick={() => setActiveTab('aluno')}
          className={`px-5 py-3 text-xs font-bold transition border-b-2 font-mono ${
            activeTab === 'aluno' 
              ? "border-slate-900 text-slate-900" 
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Relatório Individual Aluno
        </button>
      </div>

      {filteredSubmissions.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
          <FilterX className="h-12 w-12 text-slate-350 mx-auto mb-4" />
          <h3 className="text-base font-bold text-slate-800 mb-1">Nenhum registro localizado</h3>
          <p className="text-slate-500 text-xs">Ajuste seus filtros de busca para visualizar as respostas cadastradas.</p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* TAB 1: GERAL & ESTATÍSTICAS */}
          {activeTab === 'geral' && (
            <div className="space-y-8">
              {/* Bento Grid High Level Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Score average overall */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Média Geral Escola</span>
                    <p className="text-3xl font-black text-slate-900 tracking-tight">{overallAverage.toFixed(2)}/5.00</p>
                    <span className="text-[10px] text-slate-500 block font-medium font-mono">{getScaleLabel(overallAverage)}</span>
                  </div>
                  <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center border">
                    <Award className="h-6 w-6 text-slate-700" />
                  </div>
                </div>

                {/* Rating courses */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Índice do Curso</span>
                    <p className="text-3xl font-black text-emerald-700 tracking-tight">{courseSatisfactionIndex.toFixed(2)}/5</p>
                    <span className="text-[10px] text-slate-500 block font-medium font-mono">Conteúdo e Organização</span>
                  </div>
                  <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center border border-emerald-100">
                    <BookOpen className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>

                {/* Ratings Instructor */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5 block font-mono">Índice do Instrutor</span>
                    <p className="text-3xl font-black text-indigo-700 tracking-tight">{instructorIndex.toFixed(2)}/5</p>
                    <span className="text-[10px] text-slate-500 block font-medium font-mono">Didática e Condução</span>
                  </div>
                  <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center border border-indigo-100">
                    <Users className="h-6 w-6 text-indigo-600" />
                  </div>
                </div>

                {/* General satisfaction ring */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5 block font-mono">Meta de Qualidade</span>
                    <p className="text-3xl font-black text-slate-900 tracking-tight">{satisfactionPercentage.toFixed(1)}%</p>
                    <span className="text-[10px] text-slate-500 block font-medium font-mono">Votos Excelente/Muito Bom</span>
                  </div>
                  <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center border">
                    <TrendingUp className="h-6 w-6 text-slate-700" />
                  </div>
                </div>
              </div>

              {/* Graphical Analysis & Comparison panel */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left side: Pure CSS Bar comparison metrics */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm col-span-2 space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b pb-2 mb-4 font-mono flex items-center gap-2">
                      <Target className="h-4 w-4 text-slate-650" />
                      Índices Consolidados por Segmento Acadêmico
                    </h3>

                    {/* Progress Segment list */}
                    <div className="space-y-5">
                      {/* 1. CURSO */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-700 font-mono">I. Avaliação do Curso Geral (Expectativas, Organização)</span>
                          <span className="font-bold text-slate-900">{courseSatisfactionIndex.toFixed(2)} / 5.0 ({(courseSatisfactionIndex * 20).toFixed(0)}%)</span>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                            style={{ width: `${(courseSatisfactionIndex / 5) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* 2. INSTRUTOR */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-700 font-mono">II. Qualidade do Instrutor (Conhecimento, Clareza, Atividades)</span>
                          <span className="font-bold text-slate-900">{instructorIndex.toFixed(2)} / 5.0 ({(instructorIndex * 20).toFixed(0)}%)</span>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-500 transition-all duration-500 rounded-full"
                            style={{ width: `${(instructorIndex / 5) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* 3. AUTOAVALIAÇÃO */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-700 font-mono">III. Dedicação e Autoavaliação do Aluno (Interesse, Aproveitamento)</span>
                          <span className="font-bold text-slate-900">{studentSelfIndex.toFixed(2)} / 5.0 ({(studentSelfIndex * 20).toFixed(0)}%)</span>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-sky-500 transition-all duration-500 rounded-full"
                            style={{ width: `${(studentSelfIndex / 5) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* 4. INFRAESTRUTURA */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-700 font-mono">IV. Infraestrutura e Equipamentos (Sala de Aula, Ambientação)</span>
                          <span className="font-bold text-slate-900">{infraIndex.toFixed(2)} / 5.0 ({(infraIndex * 20).toFixed(0)}%)</span>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-amber-500 transition-all duration-500 rounded-full"
                            style={{ width: `${(infraIndex / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200/55 text-xs text-slate-600 flex gap-2">
                    <Info className="h-4 w-4 text-sky-500 mt-0.5 shrink-0" />
                    <p>A escala varia de 1 a 5 pontos (onde 1 é Insatisfatório e 5 é Excelente). Um índice geral superior a 4.0 indica ótimo desempenho pedagógico e atende aos mais rígidos padrões de auditoria.</p>
                  </div>
                </div>

                {/* Right side: Satisfaction ranking or comparative table */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b pb-2 mb-4 font-mono">
                      Subdivisão de Votações (%)
                    </h3>

                    <div className="space-y-4">
                      {/* Percent boxes */}
                      {[5, 4, 3, 2, 1].map((score) => {
                        // Calculate percentage of this specific score in the entire dataset
                        let totalElements = 0;
                        let matchedElements = 0;
                        filteredSubmissions.forEach(sub => {
                          allKeys.forEach(k => {
                            if (sub[k] !== undefined && sub[k] !== null) {
                              totalElements++;
                              if (Number(sub[k]) === score) matchedElements++;
                            }
                          });
                        });
                        const percentage = totalElements > 0 ? (matchedElements / totalElements) * 100 : 0;
                        
                        return (
                          <div key={score} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-medium text-slate-700">{score === 5 ? "Excelentes Votos (5)" : score === 4 ? "Muito Bons (4)" : score === 3 ? "Bons Votos (3)" : score === 2 ? "Regulares (2)" : "Insatisfatórios (1)"}</span>
                              <span className="font-bold text-slate-900">{percentage.toFixed(1)}%</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-300 rounded-full ${
                                  score === 5 ? "bg-emerald-500" : score === 4 ? "bg-teal-500" : score === 3 ? "bg-sky-500" : score === 2 ? "bg-amber-500" : "bg-rose-500"
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t text-[10px] text-slate-500 font-mono text-center">
                    Cômputo baseado em {filteredSubmissions.length} formulários
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RELATÓRIO DO CURSO */}
          {activeTab === 'curso' && (
            <div className="space-y-8">
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b pb-2 mb-4 font-mono">
                    Estatísticas Detalhadas do Conteúdo e Organização do Curso
                  </h3>
                  
                  {/* Courses Detailed Question Map */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {CURSO_QUESTIONS.map((q, idx) => {
                      const avg = calculateQuestionAverage(filteredSubmissions, q.key);
                      return (
                        <div key={q.key} className="border border-slate-100 rounded-lg p-5 hover:bg-slate-50/40 transition">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Questão {idx + 1}</p>
                          <p className="text-sm font-semibold text-slate-800 mt-1 mb-3">{q.label}</p>
                          
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-slate-500 font-mono">Média desta Questão</span>
                            <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${getScoreBgColor(avg)}`}>
                              {avg.toFixed(2)} - {getScaleLabel(avg)}
                            </span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-slate-900 rounded-full"
                              style={{ width: `${(avg / 5) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Suggestions and Comments sections consolidated */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-emerald-800 uppercase tracking-wider border-b pb-2 mb-4 font-mono flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    Resumo de Elogios e Pontos Fortes
                  </h3>
                  <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {filteredSubmissions.filter(sub => sub.elogios && sub.elogios.trim()).length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Nenhum elogio em destaque no filtro de busca selecionado.</p>
                    ) : (
                      filteredSubmissions
                        .filter(sub => sub.elogios && sub.elogios.trim())
                        .map(sub => (
                          <div key={sub.id} className="bg-emerald-50/40 p-3 rounded-lg border border-emerald-100/50 text-xs">
                            <p className="text-slate-800">{sub.elogios}</p>
                            <span className="text-[10px] text-emerald-700 block mt-1.5 font-bold font-mono">
                              — {sub.aluno?.nome || "Aluno"} ({sub.aluno?.posto_graduacao || "Graduação"})
                            </span>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-rose-800 uppercase tracking-wider border-b pb-2 mb-4 font-mono flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                    Críticas e Pontos Críticos do Curso
                  </h3>
                  <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {filteredSubmissions.filter(sub => sub.criticas_construtivas && sub.criticas_construtivas.trim()).length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Nenhuma crítica registrada no filtro de busca selecionado.</p>
                    ) : (
                      filteredSubmissions
                        .filter(sub => sub.criticas_construtivas && sub.criticas_construtivas.trim())
                        .map(sub => (
                          <div key={sub.id} className="bg-rose-50/40 p-3 rounded-lg border border-rose-100/55 text-xs">
                            <p className="text-slate-800">{sub.criticas_construtivas}</p>
                            <span className="text-[10px] text-rose-700 block mt-1.5 font-bold font-mono">
                              — {sub.aluno?.nome || "Aluno"} ({sub.aluno?.posto_graduacao || "Graduação"})
                            </span>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RELATÓRIO DO INSTRUTOR */}
          {activeTab === 'instrutor' && (
            <div className="space-y-8">
              {/* Selector instructor focused */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm print:hidden">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 font-mono uppercase">Selecionar Foco de Instrutor</h3>
                    <p className="text-xs text-slate-500">Mapeie as médias e considerações individualizadas de cada conselho docente.</p>
                  </div>
                  <select
                    value={focusedInstructor}
                    onChange={(e) => setFocusedInstructor(e.target.value)}
                    className="bg-slate-100 border text-xs px-3 py-2 rounded-lg font-semibold focus:outline-none focus:ring-1 text-slate-800 w-full md:w-64"
                  >
                    {instructorsList.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {focusedInstructor ? (
                (() => {
                  // Filter submissions specifically for this instructor
                  const instSubmissions = submissions.filter(sub => 
                    (sub.instrutor_nome === focusedInstructor || sub.turma?.instrutor === focusedInstructor)
                  );

                  const instAverageScore = calculateAverage(instSubmissions, instAvgKeys);
                  
                  // Compute scores questions
                  const qScores = INSTRUTOR_QUESTIONS.map(q => ({
                    ...q,
                    score: calculateQuestionAverage(instSubmissions, q.key)
                  }));

                  // Compute Strengths >= 4.0, improvement < 3.5
                  const strengths = qScores.filter(s => s.score >= 4.0);
                  const improvement = qScores.filter(s => s.score < 3.5);

                  return (
                    <div className="space-y-8">
                      {/* Performance Header summary */}
                      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-xl font-mono">
                            {focusedInstructor.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h2 className="text-lg font-black text-slate-900">{focusedInstructor}</h2>
                            <p className="text-xs text-slate-500">Avaliador docente com base em {instSubmissions.length} questionários da turma.</p>
                          </div>
                        </div>

                        <div className="text-left md:text-right">
                          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider font-mono">MÉDIA DOCENTE GERAL</span>
                          <p className="text-3xl font-black text-slate-900 mt-1">{instAverageScore.toFixed(2)}/5.00</p>
                          <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold border ${getScoreBgColor(instAverageScore)}`}>
                            {getScaleLabel(instAverageScore)}
                          </span>
                        </div>
                      </div>

                      {/* Detailed list of instructor questions */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-2 font-mono">
                            Médias Claras por Questionário Objetivos
                          </h3>
                          <div className="space-y-4">
                            {qScores.map((q, idx) => (
                              <div key={q.key} className="space-y-2">
                                <div className="flex justify-between text-xs">
                                  <span className="font-semibold text-slate-700">{idx+1}. {q.label}</span>
                                  <span className="font-bold text-slate-900">{q.score.toFixed(2)} / 5.0</span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-slate-900 rounded-full"
                                    style={{ width: `${(q.score / 5) * 100}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Analysis of docent strengths and weaknesses */}
                        <div className="space-y-6">
                          {/* Strengths card */}
                          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                            <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider border-b pb-2 mb-3.5 font-mono flex items-center gap-1.5">
                              <CheckCircle className="h-4 w-4 text-emerald-600" />
                              Pontos Fortes (Média ≥ 4.0)
                            </h3>
                            {strengths.length === 0 ? (
                              <p className="text-xs text-slate-400 italic">Nenhum critério atingiu média ótima até o momento.</p>
                            ) : (
                              <ul className="text-xs text-slate-650 space-y-2">
                                {strengths.map(s => (
                                  <li key={s.key} className="flex items-center gap-2 bg-emerald-50/40 p-2.5 rounded-lg border border-emerald-100/30">
                                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                                    <span>{s.label} ({s.score.toFixed(1)})</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          {/* Points to improve */}
                          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                            <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider border-b pb-2 mb-3.5 font-mono flex items-center gap-1.5">
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                              Pontos a Melhorar (Média &lt; 3.5)
                            </h3>
                            {improvement.length === 0 ? (
                              <p className="text-xs text-slate-400 italic">Desempenho plenamente adequado em todos os itens de ensino.</p>
                            ) : (
                              <ul className="text-xs text-slate-650 space-y-2">
                                {improvement.map(s => (
                                  <li key={s.key} className="flex items-center gap-2 bg-amber-50/40 p-2.5 rounded-lg border border-amber-100/30">
                                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                                    <span>{s.label} ({s.score.toFixed(1)})</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                  <span className="text-xs text-slate-400">Selecione um instrutor para focar as médias estatísticas.</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: RELATÓRIO INDIVIDUAL DE ALUNO */}
          {activeTab === 'aluno' && (
            <div className="space-y-8">
              {/* Selector students list */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm print:hidden">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 font-mono uppercase">Selecionar Estudante para Avaliar</h3>
                    <p className="text-xs text-slate-500">Veja o boletim de autoavaliação, notas de infraestrutura e comentários assinados.</p>
                  </div>
                  <select
                    value={focusedStudent}
                    onChange={(e) => setFocusedStudent(e.target.value)}
                    className="bg-slate-100 border text-xs px-3 py-2 rounded-lg font-semibold focus:outline-none focus:ring-1 text-slate-800 w-full md:w-64"
                  >
                    {filteredSubmissions.map(sub => (
                      <option key={sub.id} value={sub.aluno_id}>{sub.aluno?.nome || sub.aluno_id}</option>
                    ))}
                  </select>
                </div>
              </div>

              {focusedStudent ? (
                (() => {
                  const studentSub = submissions.find(sub => sub.aluno_id === focusedStudent);
                  if (!studentSub) return null;

                  const studentAllScores = [...courseAvgKeys, ...instAvgKeys, ...autoAvgKeys, ...infraAvgKeys];
                  const studentAvg = calculateAverage([studentSub], studentAllScores);
                  
                  return (
                    <div className="space-y-8">
                      {/* Identity profile card */}
                      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-4">
                          <div className="flex items-center gap-3">
                            <Building className="h-5 w-5 text-slate-500" />
                            <h3 className="text-base font-bold text-slate-900">{studentSub.aluno?.nome}</h3>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                            <div>
                              <span className="text-slate-400 block font-bold">POSTO / GRADUAÇÃO:</span>
                              <span className="text-slate-800 font-semibold">{studentSub.aluno?.posto_graduacao || "Soldado"}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block font-bold">ORGANIZAÇÃO MILITAR (OM):</span>
                              <span className="text-slate-800 font-semibold">{studentSub.aluno?.om || "Não especificado"}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block font-bold">TURMA EM CURSO:</span>
                              <span className="text-slate-800 font-semibold">{studentSub.turma?.nome}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block font-bold">CURSO REALIZADO:</span>
                              <span className="text-slate-800 font-semibold">{studentSub.turma?.curso?.nome}</span>
                            </div>
                          </div>
                        </div>

                        <div className="border-l pl-6 flex flex-col justify-center max-md:border-l-0 max-md:pl-0">
                          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider font-mono">Sinalização de Média Individual</span>
                          <p className="text-3xl font-black text-slate-900 mt-1">{studentAvg.toFixed(2)}/5.0</p>
                          <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold border inline-block mt-1 ${getScoreBgColor(studentAvg)}`}>
                            {getScaleLabel(studentAvg)}
                          </span>
                        </div>
                      </div>

                      {/* Display breakdown of elements */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Course evaluation details */}
                        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono border-b pb-2">
                            Média por Categoria (Comparado com Média da Turma)
                          </h4>
                          
                          <div className="space-y-4">
                            {/* 1. Curso */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="font-semibold text-slate-700">I. Expectativas sobre o Curso</span>
                                <span className="font-bold text-slate-900">{calculateAverage([studentSub], courseAvgKeys).toFixed(1)} / 5</span>
                              </div>
                              <div className="h-1.5 bg-slate-100 rounded-full">
                                <div className="h-full bg-slate-800 rounded-full" style={{ width: `${(calculateAverage([studentSub], courseAvgKeys) / 5) * 100}%` }} />
                              </div>
                            </div>

                            {/* 2. Instrutor */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="font-semibold text-slate-700">II. Grau de Satisfação com Instrutor</span>
                                <span className="font-bold text-slate-900">{calculateAverage([studentSub], instAvgKeys).toFixed(1)} / 5</span>
                              </div>
                              <div className="h-1.5 bg-slate-100 rounded-full">
                                <div className="h-full bg-slate-800 rounded-full" style={{ width: `${(calculateAverage([studentSub], instAvgKeys) / 5) * 100}%` }} />
                              </div>
                            </div>

                            {/* 3. Autoavaliação */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="font-semibold text-slate-700 font-mono font-mono">III. Nota de Autoavaliação do Aluno</span>
                                <span className="font-bold text-slate-900">{calculateAverage([studentSub], autoAvgKeys).toFixed(1)} / 5</span>
                              </div>
                              <div className="h-1.5 bg-slate-100 rounded-full">
                                <div className="h-full bg-slate-800 rounded-full" style={{ width: `${(calculateAverage([studentSub], autoAvgKeys) / 5) * 100}%` }} />
                              </div>
                            </div>

                            {/* 4. Infra */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="font-semibold text-slate-700">IV. Avaliação da Infraestrutura</span>
                                <span className="font-bold text-slate-900">{calculateAverage([studentSub], infraAvgKeys).toFixed(1)} / 5</span>
                              </div>
                              <div className="h-1.5 bg-slate-100 rounded-full">
                                <div className="h-full bg-slate-800 rounded-full" style={{ width: `${(calculateAverage([studentSub], infraAvgKeys) / 5) * 100}%` }} />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Qualitative observations card */}
                        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono border-b pb-2">
                            Comentários Escritos pelo Aluno
                          </h4>
                          
                          <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar text-xs">
                            {studentSub.sugestoes_melhoria && (
                              <div>
                                <span className="font-bold text-slate-650 block">Sugestões de Melhorias:</span>
                                <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg mt-0.5">{studentSub.sugestoes_melhoria}</p>
                              </div>
                            )}
                            {studentSub.criticas_construtivas && (
                              <div>
                                <span className="font-bold text-slate-650 block">Críticas Construtivas:</span>
                                <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg mt-0.5">{studentSub.criticas_construtivas}</p>
                              </div>
                            )}
                            {studentSub.elogios && (
                              <div>
                                <span className="font-bold text-slate-650 block">Elogios Registrados:</span>
                                <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg mt-0.5">{studentSub.elogios}</p>
                              </div>
                            )}
                            {!studentSub.sugestoes_melhoria && !studentSub.criticas_construtivas && !studentSub.elogios && (
                              <p className="text-slate-400 italic">O aluno enviou a avaliação sem observações abertas por escrito.</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Audit verification tag */}
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs font-mono flex items-center justify-between">
                        <div>
                          <strong className="text-slate-850">ASSINATURA DIGITAL DO INSTRUMENTO DE QUALIDADE</strong>
                          <p className="text-slate-500 mt-1">{studentSub.assinatura_digital}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-slate-100 border px-2 py-1 rounded">AUDITADO</span>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-400">
                  Nenhum estudante selecionado no subfiltro.
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* FOOTER METADATA MARKERS */}
      <div className="text-center font-mono text-[10px] text-slate-400 border-t pt-4 space-y-1 print:block">
        <p>© Escola de Qualidade Pedagógica Integrada — Relatórios de Feedback Gerencial</p>
        <p>Sistema permanentemente auditado em conformidade com as diretrizes acadêmicas vigentes.</p>
      </div>

    </div>
  );
}
