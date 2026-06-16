'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
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
  Info,
  Edit3,
  Signature
} from 'lucide-react';
import { toast } from 'sonner';
import { generateQuestionnairePDF } from '@/lib/generateQuestionnairePDF';

// Scaling text helper matches CP: 5, CPa: 3, D/NA: 1
const getScaleLabel = (val: number) => {
  if (val >= 4.2) return "Concordância Plena (CP)";
  if (val >= 2.6) return "Concordância Parcial (CPa)";
  return "Discordo / Não se Aplica (D/NA)";
};

// Colors based on score
const getScoreBgColor = (val: number) => {
  if (val >= 4.0) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (val >= 2.6) return "bg-sky-50 text-sky-700 border-sky-200";
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

function RelatorioAvaliacaoAdminContent() {
  const { profile, isAdmin, loading: userLoading } = useUser();
  const [loading, setLoading] = useState(true);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const qStr = searchParams ? (searchParams.get('q') || '') : '';

  // Raw DB data
  const [submissions, setSubmissions] = useState<any[]>([]);
  
  // Filter lists
  const [cursos, setCursos] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [instructorsList, setInstructorsList] = useState<string[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  
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

  // Admin questionnaire prefill states
  const [isAdminFilling, setIsAdminFilling] = useState(false);
  const [adminAnswers, setAdminAnswers] = useState<Record<string, number>>({});
  const [adminComments, setAdminComments] = useState({
    sugestoes_melhoria: '',
    criticas_construtivas: '',
    elogios: '',
    necessidades_novos_cursos: '',
    comentarios_adicionais: ''
  });
  const [adminSignature, setAdminSignature] = useState('');
  const [adminSubmitting, setAdminSubmitting] = useState(false);

  // Exit form if tab changes
  const changeTab = (tab: 'aluno' | 'curso' | 'instrutor' | 'geral') => {
    setActiveTab(tab);
    if (tab !== 'aluno') {
      setIsAdminFilling(false);
    }
  };

  // Synchronize and auto-load existing questionnaire answers/comments when editing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAdminFilling && focusedStudent) {
        const existingSub = submissions.find(sub => sub.aluno_id === focusedStudent);
        if (existingSub) {
          const answers: Record<string, number> = {};
          const allQuestions = [
            ...CURSO_QUESTIONS,
            ...INSTRUTOR_QUESTIONS,
            ...AUTO_QUESTIONS,
            ...INFRA_QUESTIONS
          ];
          allQuestions.forEach(q => {
            if (existingSub[q.key] !== undefined && existingSub[q.key] !== null) {
              answers[q.key] = Number(existingSub[q.key]);
            }
          });

          setAdminAnswers(answers);
          setAdminComments({
            sugestoes_melhoria: existingSub.sugestoes_melhoria || '',
            criticas_construtivas: existingSub.criticas_construtivas || '',
            elogios: existingSub.elogios || '',
            necessidades_novos_cursos: existingSub.necessidades_novos_cursos || '',
            comentarios_adicionais: existingSub.comentarios_adicionais || ''
          });

          let namePart = '';
          if (existingSub.assinatura_digital && existingSub.assinatura_digital.includes('Administrador')) {
            const match = existingSub.assinatura_digital.match(/Administrador\s+(.*?)\s+em/);
            if (match && match[1]) {
              namePart = match[1].trim();
            }
          }
          setAdminSignature(namePart || 'Administrador');
        } else {
          setAdminAnswers({});
          setAdminComments({
            sugestoes_melhoria: '',
            criticas_construtivas: '',
            elogios: '',
            necessidades_novos_cursos: '',
            comentarios_adicionais: ''
          });
          setAdminSignature('');
        }
      } else if (!isAdminFilling) {
        setAdminAnswers({});
        setAdminComments({
          sugestoes_melhoria: '',
          criticas_construtivas: '',
          elogios: '',
          necessidades_novos_cursos: '',
          comentarios_adicionais: ''
        });
        setAdminSignature('');
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [isAdminFilling, focusedStudent, submissions]);

  const handleQuickPrefill = (score: number) => {
    const prefill: Record<string, number> = {};
    const allQuestions = [
      ...CURSO_QUESTIONS,
      ...INSTRUTOR_QUESTIONS,
      ...AUTO_QUESTIONS,
      ...INFRA_QUESTIONS
    ];
    allQuestions.forEach(q => {
      prefill[q.key] = score;
    });
    setAdminAnswers(prefill);
    toast.success(`Todas as questões foram preenchidas com a nota ${score}!`);
  };

  const handleAdminSubmit = async (e: React.FormEvent, studentDetails: any) => {
    e.preventDefault();
    if (!adminSignature.trim()) {
      toast.error('Por favor, digite seu nome no campo de assinatura digital do administrador.');
      return;
    }

    const allQuestions = [
      ...CURSO_QUESTIONS,
      ...INSTRUTOR_QUESTIONS,
      ...AUTO_QUESTIONS,
      ...INFRA_QUESTIONS
    ];

    const missing = allQuestions.filter(q => !adminAnswers[q.key]);
    if (missing.length > 0) {
      toast.error(`Ainda restam ${missing.length} questões sem resposta.`);
      return;
    }

    setAdminSubmitting(true);

    try {
      const turma = turmas.find(t => t.id === studentDetails.turma_id);
      const adminSignatureText = `Preenchido e Assinado pelo Administrador ${adminSignature.trim()} em ${new Date().toLocaleString('pt-BR')}`;
      
      const payload = {
        aluno_id: studentDetails.id,
        turma_id: studentDetails.turma_id,
        curso_id: turma?.curso_id || null,
        instrutor_nome: turma?.instrutor || 'Não especificado',
        
        // Answers
        ...adminAnswers,
        
        // Comments
        sugestoes_melhoria: adminComments.sugestoes_melhoria,
        criticas_construtivas: adminComments.criticas_construtivas,
        elogios: adminComments.elogios,
        necessidades_novos_cursos: adminComments.necessidades_novos_cursos,
        comentarios_adicionais: adminComments.comentarios_adicionais,

        assinatura_digital: adminSignatureText
      };

      const existingSub = submissions.find(sub => sub.aluno_id === studentDetails.id);
      
      let query;
      if (existingSub) {
        query = supabase
          .from('questionarios_conclusao')
          .update(payload)
          .eq('id', existingSub.id);
      } else {
        query = supabase
          .from('questionarios_conclusao')
          .insert(payload);
      }

      const { data, error } = await query
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (existingSub) {
        toast.success('Avaliação atualizada e retificada pelo Administrador com sucesso!');
      } else {
        toast.success('Avaliação preenchida e enviada com sucesso pelo Administrador!');
      }
      setIsAdminFilling(false);
      await loadAllData();
    } catch (err: any) {
      console.error('Error submitting administrative evaluation:', err);
      toast.error('Ocorreu um erro ao salvar a avaliação: ' + (err.message || 'Erro desconhecido.'));
    } finally {
      setAdminSubmitting(false);
    }
  };

  const loadAllData = async () => {
    try {
      setLoading(true);
      
      // Fetch Cursos
      const { data: cursosData } = await supabase.from('cursos').select('id, nome').is('deleted_at', null);
      if (cursosData) setCursos(cursosData);

      // Fetch Turmas with registered instructor field
      const { data: turmasData } = await supabase.from('turmas').select('id, nome, curso_id, periodo, instrutor, internacional').is('deleted_at', null);
      
      // Filter out international/exterior classes from the evaluation module
      const nonInternationalTurmas = (turmasData || []).filter((t: any) => !t.internacional);
      setTurmas(nonInternationalTurmas);

      // Fetch Alunos
      const { data: alunosData } = await supabase
        .from('alunos')
        .select('id, nome, turma_id, posto_graduacao, om, matricula, email')
        .is('deleted_at', null);

      // Filter out students belonging to international/exterior classes
      const nonInternationalAlunos = (alunosData || []).filter((al: any) => {
        const matchingTurma = (turmasData || []).find((t: any) => t.id === al.turma_id);
        return matchingTurma ? !matchingTurma.internacional : true;
      });
      setAllStudents(nonInternationalAlunos);

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
            matricula,
            email
          ),
          turma:turmas(
            id,
            nome,
            instrutor,
            periodo,
            internacional,
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

      // Filter out submissions belonging to international/exterior classes
      const activeSubmissions = (qData || []).filter((sub: any) => !sub.turma?.internacional);
      setSubmissions(activeSubmissions);

      // Extract unique instructors registered in classes (turmas) and mentioned in submissions
      const uniqueInstructorsSet = new Set<string>();
      
      // 1. From classes (turmas)
      nonInternationalTurmas.forEach((t: any) => {
        if (t.instrutor && t.instrutor.trim()) {
          uniqueInstructorsSet.add(t.instrutor.trim());
        }
      });

      // 2. From submissions
      activeSubmissions.forEach((sub: any) => {
        if (sub.instrutor_nome && sub.instrutor_nome.trim()) {
          uniqueInstructorsSet.add(sub.instrutor_nome.trim());
        } else if (sub.turma?.instrutor && sub.turma.instrutor.trim()) {
          uniqueInstructorsSet.add(sub.turma.instrutor.trim());
        }
      });
      const instructors = Array.from(uniqueInstructorsSet).filter(Boolean);
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

    // Keyword search filters linked with query or path state
    if (qStr && qStr.trim() !== '') {
      const searchLower = qStr.toLowerCase().trim();
      result = result.filter(sub => {
        const studentName = (sub.aluno?.nome || '').toLowerCase();
        const studentPosto = (sub.aluno?.posto_graduacao || '').toLowerCase();
        const studentOM = (sub.aluno?.om || '').toLowerCase();
        const studentMatricula = (sub.aluno?.matricula || '').toLowerCase();
        const instructorNameStr = (sub.instrutor_nome || sub.turma?.instrutor || '').toLowerCase();
        const courseName = (sub.turma?.curso?.nome || '').toLowerCase();
        const turmaName = (sub.turma?.nome || '').toLowerCase();
        const remarks_sugestoes = (sub.sugestoes_melhoria || '').toLowerCase();
        const remarks_criticas = (sub.criticas_construtivas || '').toLowerCase();
        const remarks_elogios = (sub.elogios || '').toLowerCase();

        return studentName.includes(searchLower) ||
               studentPosto.includes(searchLower) ||
               studentOM.includes(searchLower) ||
               studentMatricula.includes(searchLower) ||
               instructorNameStr.includes(searchLower) ||
               courseName.includes(searchLower) ||
               turmaName.includes(searchLower) ||
               remarks_sugestoes.includes(searchLower) ||
               remarks_criticas.includes(searchLower) ||
               remarks_elogios.includes(searchLower);
      });
    }

    return result;
  }, [selectedCurso, selectedTurma, selectedInstructor, selectedPeriod, selectedStudent, submissions, qStr]);

  // Filter specific students based on selected turma
  const studentsFilteredByTurma = useMemo(() => {
    if (selectedTurma === 'ALL') {
      return [];
    }
    
    const studentsMap = new Map<string, any>();
    
    // 1. Add all students belonging to this class
    allStudents.forEach(stud => {
      if (stud.turma_id === selectedTurma) {
        studentsMap.set(stud.id, {
          id: stud.id,
          nome: stud.nome,
          posto_graduacao: stud.posto_graduacao,
          om: stud.om,
          matricula: stud.matricula,
          turma_id: stud.turma_id,
          email: stud.email,
          responded: false
        });
      }
    });
    
    // 2. Mark who has responded based on conclusion feedback submissions
    submissions.forEach(sub => {
      if (sub.aluno && sub.turma_id === selectedTurma) {
        const existing = studentsMap.get(sub.aluno_id);
        if (existing) {
          existing.responded = true;
          existing.email = sub.aluno.email || existing.email;
        } else {
          studentsMap.set(sub.aluno_id, {
            id: sub.aluno_id,
            nome: sub.aluno.nome,
            posto_graduacao: sub.aluno.posto_graduacao,
            om: sub.aluno.om,
            matricula: sub.aluno.matricula,
            turma_id: sub.turma_id,
            email: sub.aluno.email,
            responded: true
          });
        }
      }
    });
    
    return Array.from(studentsMap.values()).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  }, [allStudents, submissions, selectedTurma]);

  // Compute pending students based on raw DB data, current class selection, and keyword search
  const filteredPendingStudents = useMemo(() => {
    const respondedIds = new Set(submissions.map(sub => sub.aluno_id));
    
    let result = allStudents.filter(stud => !respondedIds.has(stud.id));
    
    if (selectedTurma !== 'ALL') {
      result = result.filter(stud => stud.turma_id === selectedTurma);
    }
    
    if (qStr && qStr.trim() !== '') {
      const searchLower = qStr.toLowerCase().trim();
      result = result.filter(stud => {
        const studentName = (stud.nome || '').toLowerCase();
        const studentPosto = (stud.posto_graduacao || '').toLowerCase();
        const studentOM = (stud.om || '').toLowerCase();
        const studentMatricula = (stud.matricula || '').toLowerCase();
        return studentName.includes(searchLower) ||
               studentPosto.includes(searchLower) ||
               studentOM.includes(searchLower) ||
               studentMatricula.includes(searchLower);
      });
    }
    
    return result.map(stud => {
      const parentTurma = turmas.find(t => t.id === stud.turma_id);
      return {
        ...stud,
        turma_nome: parentTurma ? parentTurma.nome : 'Sem Turma'
      };
    }).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  }, [allStudents, submissions, selectedTurma, qStr, turmas]);

  // Compute responded students based on raw DB data, current class selection, and keyword search
  const filteredRespondedStudents = useMemo(() => {
    const respondedIds = new Set(submissions.map(sub => sub.aluno_id));
    
    let result = allStudents.filter(stud => respondedIds.has(stud.id));
    
    if (selectedTurma !== 'ALL') {
      result = result.filter(stud => stud.turma_id === selectedTurma);
    }
    
    if (qStr && qStr.trim() !== '') {
      const searchLower = qStr.toLowerCase().trim();
      result = result.filter(stud => {
        const studentName = (stud.nome || '').toLowerCase();
        const studentPosto = (stud.posto_graduacao || '').toLowerCase();
        const studentOM = (stud.om || '').toLowerCase();
        const studentMatricula = (stud.matricula || '').toLowerCase();
        return studentName.includes(searchLower) ||
               studentPosto.includes(searchLower) ||
               studentOM.includes(searchLower) ||
               studentMatricula.includes(searchLower);
      });
    }
    
    return result.map(stud => {
      const parentTurma = turmas.find(t => t.id === stud.turma_id);
      return {
        ...stud,
        turma_nome: parentTurma ? parentTurma.nome : 'Sem Turma'
      };
    }).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  }, [allStudents, submissions, selectedTurma, qStr, turmas]);

  // Compute all students with their responded and turma metadata
  const filteredAllStudentsForOperation = useMemo(() => {
    const respondedIds = new Set(submissions.map(sub => sub.aluno_id));
    
    let result = allStudents;
    
    if (selectedTurma !== 'ALL') {
      result = result.filter(stud => stud.turma_id === selectedTurma);
    }
    
    if (qStr && qStr.trim() !== '') {
      const searchLower = qStr.toLowerCase().trim();
      result = result.filter(stud => {
        const studentName = (stud.nome || '').toLowerCase();
        const studentPosto = (stud.posto_graduacao || '').toLowerCase();
        const studentOM = (stud.om || '').toLowerCase();
        const studentMatricula = (stud.matricula || '').toLowerCase();
        return studentName.includes(searchLower) ||
               studentPosto.includes(searchLower) ||
               studentOM.includes(searchLower) ||
               studentMatricula.includes(searchLower);
      });
    }
    
    return result.map(stud => {
      const parentTurma = turmas.find(t => t.id === stud.turma_id);
      return {
        ...stud,
        turma_nome: parentTurma ? parentTurma.nome : 'Sem Turma',
        responded: respondedIds.has(stud.id)
      };
    }).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  }, [allStudents, submissions, selectedTurma, qStr, turmas]);

  // Handle direct selection and edit action for any students (whether pending or responded)
  const handleSelectAndEditAction = (studentId: string, turmaId: string) => {
    setSelectedTurma(turmaId);
    setFocusedStudent(studentId);
    setActiveTab('aluno');
    setIsAdminFilling(true);
    
    const existing = submissions.some(sub => sub.aluno_id === studentId);
    if (existing) {
      toast.info('Carregando questionário respondido para edição e retificação...', { duration: 2500 });
    } else {
      toast.info('Carregando formulário para preenchimento administrativo...', { duration: 2500 });
    }
  };

  // Handle direct selection and pre-fill of a pending questionnaire under Admin privileges
  const handleSelectAndFillPending = (studentId: string, turmaId: string) => {
    handleSelectAndEditAction(studentId, turmaId);
  };

  const handlePrintQRCode = (studentName: string, accessCode: string, turmaNome: string) => {
    const w = window.open('', '_blank');
    if (w) {
      const hStart = '<' + 'html' + '>';
      const hEnd = '</' + 'html' + '>';
      const hdStart = '<' + 'head' + '>';
      const hdEnd = '</' + 'head' + '>';
      const bdStart = '<' + 'body onload="window.print()"' + '>';
      const bdEnd = '</' + 'body' + '>';

      w.document.write(`
        ${hStart}
          ${hdStart}
            <title>QR Code de Acesso - ${studentName}</title>
            <style>
              body { font-family: sans-serif; padding: 40px; color: #334155; text-align: center; background: #f8fafc; }
              .card { border: 2.5px dashed #1e3a8a; padding: 30px; border-radius: 16px; max-width: 380px; margin: 40px auto; text-align: center; background: white; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
              h2 { margin: 0 0 5px 0; color: #1e3a8a; font-size: 22px; }
              p { line-height: 1.5; margin: 6px 0; font-size: 14px; color: #475569; }
              .qr-container { margin: 20px 0; }
              .code { font-family: monospace; font-size: 20px; font-weight: bold; background: #f1f5f9; padding: 8px 16px; display: inline-block; border-radius: 6px; border: 1px solid #cbd5e1; color: #1d4ed8; letter-spacing: 1px; }
              .footer { font-size: 11px; color: #64748b; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px; }
              @media print {
                body { background: white; padding: 0; }
                .card { margin: 0 auto; box-shadow: none; border-color: #334155; }
              }
            </style>
          ${hdEnd}
          ${bdStart}
            <div class="card">
              <h2>CARTEIRINHA ESCOLAR</h2>
              <p style="text-transform: uppercase; font-size: 10px; font-weight: bold; letter-spacing: 1px; color: #475569; margin-bottom: 20px;">Área do Aluno • Login por QR Code</p>
              <p><strong>Aluno:</strong> ${studentName}</p>
              <p><strong>Turma:</strong> ${turmaNome}</p>
              <div class="qr-container">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${window.location.origin}/login?code=${accessCode}`)}" alt="QR Code" style="width: 140px; height: 140px; border: 1px solid #e2e8f0; padding: 6px; border-radius: 8px; background: white;" />
              </div>
              <div class="code">${accessCode}</div>
              <p style="font-size: 11px; color: #64748b; margin-top: 15px;">Aponte o leitor de QR Code para esta imagem para entrar.</p>
              <div class="footer">Escola Digital © ${new Date().getFullYear()}</div>
            </div>
          ${bdEnd}
        ${hEnd}
      `);
      w.document.close();
    }
  };

  const hasActiveFilter = selectedTurma !== 'ALL' || 
                         selectedInstructor !== 'ALL' || 
                         selectedStudent !== 'ALL' || 
                         (!!qStr && qStr.trim() !== '');

  // Auto set defaults for focused elements when data loads
  useEffect(() => {
    if (studentsFilteredByTurma.length > 0) {
      const ids = studentsFilteredByTurma.map(x => x.id);
      if (!ids.includes(focusedStudent)) {
        setTimeout(() => {
          setFocusedStudent(ids[0]);
        }, 0);
      }
    } else {
      if (focusedStudent !== '') {
        setTimeout(() => {
          setFocusedStudent('');
        }, 0);
      }
    }
  }, [studentsFilteredByTurma, focusedStudent]);

  const clearAllFilters = () => {
    setSelectedCurso('ALL');
    setSelectedTurma('ALL');
    setSelectedInstructor('ALL');
    setSelectedPeriod('ALL');
    setSelectedStudent('ALL');
    setFocusedInstructor('');
    setFocusedStudent('');
    
    // Reset/Clear search query parameter
    const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
    params.delete('q');
    router.push(`${pathname}?${params.toString()}`);

    toast.success('Filtros e pesquisa limpos');
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
  
  // Percentage of "Concordo Plenamente" (score 5) on the new scale
  const getAggregatedSatisfactionPct = () => {
    if (filteredSubmissions.length === 0) return 0;
    let satisfiedAnswers = 0;
    let totalAnswers = 0;
    filteredSubmissions.forEach(sub => {
      allKeys.forEach(k => {
        if (sub[k] !== undefined && sub[k] !== null) {
          totalAnswers++;
          if (Number(sub[k]) === 5) {
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

        <div className="flex flex-wrap gap-2 print:hidden">
          <button
            onClick={() => {
              try {
                generateQuestionnairePDF();
                toast.success("Modelo em branco do Questionário de Avaliação Pós-Curso baixado com sucesso!");
              } catch (error) {
                console.error("Erro ao gerar PDF:", error);
                toast.error("Ocorreu um erro ao gerar o PDF do questionário.");
              }
            }}
            className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition shadow-sm cursor-pointer border border-sky-500"
            title="Download do modelo PDF oficial do Questionário de Avaliação Pós-Curso"
          >
            <Download className="h-3.5 w-3.5" />
            Baixar Modelo PDF (A4)
          </button>

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Turma Selection */}
          <div>
            <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5 font-mono">Turma</label>
            <select
              value={selectedTurma}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedTurma(val);
                // Preencher automaticamente conforme a turma escolhida
                if (val === 'ALL') {
                  setSelectedInstructor('ALL');
                } else {
                  const foundTurma = turmas.find(t => t.id === val);
                  if (foundTurma && foundTurma.instrutor) {
                    setSelectedInstructor(foundTurma.instrutor.trim());
                  } else {
                    setSelectedInstructor('ALL');
                  }
                }
                // Reset student filter on class change
                setSelectedStudent('ALL');
              }}
              className="w-full bg-slate-950 border border-slate-800 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-300"
            >
              <option value="ALL">Todas as Turmas</option>
              {turmas.map(t => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </div>

          {/* Instrutor Selection */}
          <div>
            <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5 font-mono">Instrutor</label>
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

      {/* SEÇÃO QR CODE ÚNICO DA TURMA (SE SELECIONADO TURMA) */}
      {selectedTurma !== 'ALL' && (
        (() => {
          const selectedTurmaObj = turmas.find(t => t.id === selectedTurma);
          if (!selectedTurmaObj) return null;
          const selectedTurmaStudents = allStudents.filter(s => s.turma_id === selectedTurma);
          const selectedTurmaSubmissions = submissions.filter(sub => sub.turma_id === selectedTurma);
          
          return (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row items-center gap-6 print:hidden"
            >
              <div className="flex-shrink-0 flex flex-col items-center bg-white p-3 border border-slate-200 rounded-xl shadow-xs">
                {selectedTurma && typeof window !== 'undefined' && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                      `${window.location.protocol}//${window.location.host}/avaliacao?turmaId=${selectedTurma}`
                    )}`}
                    alt="QR Code de Avaliação"
                    className="w-36 h-36"
                  />
                )}
                <span className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider mt-2">QR Code Único</span>
              </div>

              <div className="flex-1 space-y-4 text-center md:text-left w-full">
                <div>
                  <span className="text-[10px] bg-slate-900 text-white font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider">Acesso Livre - Sem Login</span>
                  <h3 className="text-base font-bold text-slate-900 mt-2 font-mono">
                    Avaliação da Turma: {selectedTurmaObj.nome}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xl">
                    Os alunos podem acessar e preencher a avaliação digital de forma direta escaneando este QR CODE único, sem necessidade de usuário, matrícula ou senha.
                  </p>
                </div>

                {/* PROGRESSO DE VAGAS */}
                <div className="bg-white border rounded-lg p-3 max-w-xl text-slate-900">
                  <div className="flex justify-between items-center text-xs mb-1.5 font-mono">
                    <span className="text-slate-500">Respostas da Turma:</span>
                    <span className="font-bold">
                      {selectedTurmaSubmissions.length} de {selectedTurmaStudents.length} matriculados
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-slate-900 h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${selectedTurmaStudents.length > 0 
                          ? Math.min(100, (selectedTurmaSubmissions.length / selectedTurmaStudents.length) * 100) 
                          : 0}%` 
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-450 font-mono mt-1.5 leading-tight">
                    * Qualquer pessoa com o link pode responder de forma livre. O sistema limita as respostas automaticamente à quantidade de alunos matriculados na turma ({selectedTurmaStudents.length}).
                  </p>
                </div>

                {/* BOTÕES DE OPERAÇÃO */}
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  <button
                    onClick={() => {
                      if (typeof navigator !== 'undefined') {
                        navigator.clipboard.writeText(`${window.location.protocol}//${window.location.host}/avaliacao?turmaId=${selectedTurma}`);
                        toast.success("Link exclusivo da turma copiado para a área de transferência!");
                      }
                    }}
                    className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
                  >
                    Copiar Link da Turma
                  </button>
                  <a
                    href={`/avaliacao?turmaId=${selectedTurma}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-lg transition"
                  >
                    Abrir Questionário da Turma
                  </a>
                </div>
              </div>
            </motion.div>
          );
        })()
      )}

      {!hasActiveFilter ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm max-w-xl mx-auto my-8 space-y-4">
          <div className="w-16 h-16 bg-slate-50 border rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <SlidersHorizontal className="h-6 w-6 text-slate-700 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">Pesquisa e Relatórios Ocultos</h3>
            <p className="text-slate-500 text-xs mt-1.5 max-w-sm mx-auto leading-relaxed">
              Os dados e gráficos das avaliações pedagógicas não estão ativos. Ative qualquer um dos filtros acima para carregar o dashboard embaixo.
            </p>
          </div>
        </div>
      ) : (
        <>
          {filteredSubmissions.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 md:p-12 text-center shadow-sm space-y-4 max-w-3xl mx-auto my-4">
              <FilterX className="h-12 w-12 text-slate-400 mx-auto" />
              <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-wider font-mono">Nenhum registro localizado</h3>
              <p className="text-slate-500 text-xs max-w-md mx-auto leading-relaxed">
                Não há avaliações acadêmicas gravadas no banco para o filtro de turma/instrutor selecionado. Divulgue o QR Code da turma acima para coletar respostas de forma anônima.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              
              {/* TAB 1: GERAL & ESTATÍSTICAS */}
              {activeTab === 'geral' && (
                <div className="space-y-8">
              {/* Bento Grid High Level Metrics */}
              {(() => {
                const enrolledStudents = selectedTurma === 'ALL' ? allStudents : allStudents.filter(s => s.turma_id === selectedTurma);
                const numInscritos = enrolledStudents.length;
                const numPreenchidos = selectedTurma === 'ALL' ? submissions.length : submissions.filter(sub => enrolledStudents.some(s => s.id === sub.aluno_id)).length;
                const numFalta = Math.max(0, numInscritos - numPreenchidos);
                const fillingPercent = numInscritos > 0 ? (numPreenchidos / numInscritos) * 100 : 0;

                return (
                  <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Metric 1: Enrolled */}
                      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between">
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Inscritos na Turma</span>
                          <p className="text-3xl font-black text-slate-900 tracking-tight">{numInscritos}</p>
                          <span className="text-[10px] text-slate-500 block font-medium font-mono">Total de Alunos Matriculados</span>
                        </div>
                        <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center border">
                          <Users className="h-6 w-6 text-slate-700" />
                        </div>
                      </div>

                      {/* Metric 2: Filled */}
                      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between">
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono text-emerald-800">Questionários Preenchidos</span>
                          <p className="text-3xl font-black text-emerald-700 tracking-tight">{numPreenchidos}</p>
                          <span className="text-[10px] text-emerald-600 block font-medium font-mono">Respostas Recebidas ({fillingPercent.toFixed(1)}%)</span>
                        </div>
                        <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center border border-emerald-100">
                          <CheckCircle className="h-6 w-6 text-emerald-600" />
                        </div>
                      </div>

                      {/* Metric 3: Lack of filling */}
                      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between">
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider font-mono text-rose-800">Falta Preencher</span>
                          <p className="text-3xl font-black text-rose-700 tracking-tight">{numFalta}</p>
                          <span className="text-[10px] text-rose-500 block font-medium font-mono">Questionários Pendentes</span>
                        </div>
                        <div className="w-12 h-12 bg-rose-50 rounded-lg flex items-center justify-center border border-rose-150">
                          <AlertTriangle className="h-6 w-6 text-rose-600" />
                        </div>
                      </div>
                    </div>

                    {/* Simple completion bar indicator */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                      <div className="flex justify-between items-center text-xs mb-2 font-mono">
                        <span className="font-bold text-slate-700">Progresso de Preenchimento da Turma</span>
                        <span className="font-black text-slate-900">{numPreenchidos} / {numInscritos} ({fillingPercent.toFixed(1)}%)</span>
                      </div>
                      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                          style={{ width: `${fillingPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Card download of physical blank forms */}
              <div className="bg-sky-50 border border-sky-100 rounded-xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-sky-850 font-bold uppercase tracking-wider font-mono">
                    <FileText className="h-4 w-4 text-sky-600" />
                    Modelo Físico de Avaliação (Papel / Off-line)
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide font-sans">Questionário de Avaliação Pós-Curso Oficial (A4)</h4>
                  <p className="text-xs text-slate-605 max-w-3xl">
                    Precisa aplicar o questionário acadêmico de forma física por escrito? Baixe o modelo oficial em formato PDF de duas páginas, com a escala de pontuação (CP, CPa, NC/NA) e campos para comentários, conforme o padrão oficial da Missão de Assessoria Naval do Brasil.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      generateQuestionnairePDF();
                      toast.success("Modelo em branco do Questionário de Avaliação Pós-Curso baixado com sucesso!");
                    } catch (error) {
                      console.error("Erro ao gerar PDF:", error);
                      toast.error("Ocorreu um erro ao gerar o PDF do questionário.");
                    }
                  }}
                  className="w-full md:w-auto bg-sky-650 hover:bg-sky-700 text-white font-extrabold text-[11px] px-5 py-3 rounded-lg transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer shrink-0 border border-sky-600 font-mono tracking-wider"
                >
                  <Download className="h-4 w-4" />
                  BAIXAR FORMULÁRIO (PDF)
                </button>
              </div>

              {/* Card List of Pending Questionnaires on the General Tab */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-3 gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-mono flex items-center gap-2">
                      <Signature className="h-4 w-4 text-indigo-600" />
                      Formulários Pendentes nesta Seleção ({filteredPendingStudents.length})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Estes estudantes ainda não responderam à avaliação acadêmica de conclusão. Clique em preencher para atuar como Administrador.
                    </p>
                  </div>
                  <span className="text-[10px] bg-indigo-50 text-indigo-750 font-bold px-2.5 py-1 rounded-lg font-mono uppercase tracking-wider">
                    Pendentes de Envio
                  </span>
                </div>

                {filteredPendingStudents.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 italic text-xs font-mono">
                    🎉 Excelente! Todos os alunos deste escopo responderam à avaliação pedagógica.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredPendingStudents.map((stud) => (
                      <div key={stud.id} className="border border-slate-150 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-100/40 transition flex flex-col justify-between space-y-3">
                        <div className="space-y-1">
                          <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 font-mono">
                            {stud.posto_graduacao ? (
                              <span className="bg-slate-200/85 text-slate-600 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase font-mono">
                                {stud.posto_graduacao}
                              </span>
                            ) : null}
                            {stud.nome}
                          </div>
                          <p className="text-[10px] text-slate-500 font-mono">
                            OM: <strong className="text-slate-700">{stud.om || 'Não especificada'}</strong>
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            Turma: <strong className="text-indigo-600">{stud.turma_nome}</strong>
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              if (!stud.id) return;
                              toast.promise(
                                (async () => {
                                  const { data, error } = await supabase
                                    .from('student_access_codes')
                                    .select('access_code')
                                    .eq('student_id', stud.id)
                                    .single();
                                  if (error) throw error;
                                  if (!data?.access_code) throw new Error('Código de acesso não encontrado.');
                                  handlePrintQRCode(stud.nome, data.access_code, stud.turma_nome);
                                  return data;
                                })(),
                                {
                                  loading: 'Gerando QR Code da carteirinha...',
                                  success: 'Carteirinha gerada!',
                                  error: (err: any) => `${err.message || 'Erro ao gerar.'}`
                                }
                              );
                            }}
                            className="w-1/2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold text-[9px] py-2 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer font-mono tracking-wider shadow-sm border border-blue-200"
                            title="Imprimir Carteirinha com código de acesso QR do Aluno"
                          >
                            🖨️ CARTEIRINHA QR
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSelectAndFillPending(stud.id, stud.turma_id)}
                            className="w-1/2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[9px] py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer font-mono tracking-wider shadow-sm border border-indigo-500"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            PREENCHER
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card List of Responded/Submitted Questionnaires on the General Tab */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-3 gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-mono flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                      Formulários Respondidos nesta Seleção ({filteredRespondedStudents.length})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Estes estudantes já enviaram suas avaliações. Como Administrador, você pode retificar ou editar as notas e observações deles.
                    </p>
                  </div>
                  <span className="text-[10px] bg-emerald-50 text-emerald-750 font-bold px-2.5 py-1 rounded-lg font-mono uppercase tracking-wider">
                    Concluídos / Respondidos
                  </span>
                </div>

                {filteredRespondedStudents.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 italic text-xs font-mono">
                    📭 Nenhuma avaliação enviada para o escopo selecionado ainda.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredRespondedStudents.map((stud) => (
                      <div key={stud.id} className="border border-slate-150 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-100/40 transition flex flex-col justify-between space-y-3">
                        <div className="space-y-1">
                          <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 font-mono">
                            {stud.posto_graduacao ? (
                              <span className="bg-slate-200/85 text-slate-600 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase font-mono">
                                {stud.posto_graduacao}
                              </span>
                            ) : null}
                            {stud.nome}
                          </div>
                          <p className="text-[10px] text-slate-500 font-mono">
                            OM: <strong className="text-slate-700">{stud.om || 'Não especificada'}</strong>
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            Turma: <strong className="text-indigo-600">{stud.turma_nome}</strong>
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTurma(stud.turma_id);
                            setFocusedStudent(stud.id);
                            setIsAdminFilling(false);
                            setActiveTab('aluno');
                          }}
                          className="w-full bg-sky-50 hover:bg-sky-100 text-sky-700 font-extrabold text-[10px] py-2 rounded-lg border border-sky-200 transition flex items-center justify-center gap-1.5 cursor-pointer font-mono tracking-wider shadow-sm"
                        >
                          👁️ VISUALIZAR RESPOSTAS
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
                  {selectedTurma === 'ALL' ? (
                    <span className="text-xs text-rose-600 font-semibold bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-lg font-mono">
                      ⚠️ Selecione uma turma nos filtros do topo primeiro
                    </span>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
                      <button
                        onClick={async () => {
                          if (!selectedTurma) return;
                          
                          toast.promise(
                            (async () => {
                              const currentTurmaObj = turmas.find(t => t.id === selectedTurma);
                              const turmaNome = currentTurmaObj ? currentTurmaObj.nome : 'Turma';

                              const { data, error } = await supabase
                                .from('student_access_codes')
                                .select('access_code, student_id')
                                .in('student_id', studentsFilteredByTurma.map(s => s.id));
                                
                              if (error) throw error;
                              if (!data || data.length === 0) {
                                throw new Error('Nenhum código de acesso gerado para esta turma.');
                              }

                              const printWindow = window.open('', '_blank');
                              if (printWindow) {
                                const cardsHtml = data.map((codeObj: any) => {
                                  const student = studentsFilteredByTurma.find((a: any) => a.id === codeObj.student_id);
                                  const studentName = student ? student.nome : 'Estudante';
                                  return `
                                    <div class="card">
                                      <h3>CARTEIRINHA DE ACESSO</h3>
                                      <p class="label">Aluno</p>
                                      <p class="value">${studentName}</p>
                                      <p class="label">Turma</p>
                                      <p class="value">${turmaNome}</p>
                                      <div style="margin: 12px 0;">
                                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`${window.location.origin}/login?code=${codeObj.access_code}`)}" alt="QR Code" style="width: 110px; height: 110px; border: 1px solid #cbd5e1; padding: 4px; border-radius: 6px; background: white;" />
                                      </div>
                                      <code class="code">${codeObj.access_code}</code>
                                    </div>
                                  `;
                                }).join('');

                                const hStart = '<' + 'html' + '>';
                                const hEnd = '</' + 'html' + '>';
                                const hdStart = '<' + 'head' + '>';
                                const hdEnd = '</' + 'head' + '>';
                                const bdStart = '<' + 'body onload="window.print()"' + '>';
                                const bdEnd = '</' + 'body' + '>';

                                printWindow.document.write(`
                                  ${hStart}
                                    ${hdStart}
                                      <title>Carteirinhas de Acesso QR - ${turmaNome}</title>
                                      <style>
                                        body { font-family: sans-serif; padding: 20px; background: #f8fafc; color: #1e293b; }
                                        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px; }
                                        .card { border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; background: white; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05); page-break-inside: avoid; }
                                        h3 { margin: 0 0 8px 0; color: #1e3a8a; font-size: 13px; letter-spacing: 0.5px; border-bottom: 2px solid #ef4444; padding-bottom: 6px; text-transform: uppercase; }
                                        .label { font-size: 9px; text-transform: uppercase; color: #64748b; margin: 6px 0 2px 0; font-weight: bold; }
                                        .value { font-size: 12px; font-weight: bold; margin: 0; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                                        .code { font-family: monospace; font-size: 13px; font-weight: bold; background: #f1f5f9; padding: 3px 8px; display: inline-block; border-radius: 4px; border: 1px solid #cbd5e1; margin-top: 5px; color: #1d4ed8; }
                                        @media print {
                                          body { background: white; padding: 0; }
                                          .grid { gap: 15px; }
                                          .card { border: 1.5px dashed #475569; box-shadow: none; }
                                        }
                                      </style>
                                    ${hdEnd}
                                    ${bdStart}
                                      <div style="margin-bottom: 20px; border-bottom: 1px solid #cbd5e1; padding-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                                        <div>
                                          <h2 style="margin: 0; font-size: 18px; color: #1e3a8a;">Impressão de Carteirinhas QR da Turma</h2>
                                          <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748b;">Turma: ${turmaNome} (${data.length} carteirinhas)</p>
                                        </div>
                                      </div>
                                      <div class="grid">${cardsHtml}</div>
                                    ${bdEnd}
                                  ${hEnd}
                                `);
                                printWindow.document.close();
                              }
                              return true;
                            })(),
                            {
                              loading: 'Gerando carteirinhas QR para impressão...',
                              success: 'Carteirinhas geradas!',
                              error: (err: any) => `${err.message || 'Erro ao gerar carteirinhas.'}`
                            }
                          );
                        }}
                        className="flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3.5 py-2 rounded-lg transition-all cursor-pointer shadow-sm shadow-blue-50"
                        title="Imprimir carteirinhas com código QR para todos os alunos desta turma"
                      >
                        🖨️ Carteirinhas QR (Lote)
                      </button>

                      <select
                        value={focusedStudent}
                        onChange={(e) => setFocusedStudent(e.target.value)}
                        className="bg-slate-100 border text-xs px-3 py-2 rounded-lg font-semibold focus:outline-none focus:ring-1 text-slate-800 w-full md:w-64"
                      >
                        <option value="">Selecione um aluno...</option>
                        {studentsFilteredByTurma.map(stud => (
                          <option key={stud.id} value={stud.id}>
                            {stud.responded ? "✅" : "⚠️ (Pendente)"} {stud.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {focusedStudent ? (
                (() => {
                  const studentSub = submissions.find(sub => sub.aluno_id === focusedStudent);
                  const studentDetails = allStudents.find(stud => stud.id === focusedStudent);
                  
                  if (isAdminFilling) {
                    return (
                      <div className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 shadow-sm space-y-6 max-w-4xl mx-auto">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-4">
                          <div>
                            <span className="text-[10px] uppercase tracking-wider font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold">
                              Painel de Administração
                            </span>
                            <h3 className="text-base font-bold text-slate-900 uppercase font-mono mt-1">
                              {studentSub ? "Editar Questionário:" : "Preencher Questionário:"} {studentDetails?.nome || "Selecionado"}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                              {studentSub 
                                ? "Altere as notas ou observações conforme necessário. Ao salvar, as alterações atualizarão os relatórios." 
                                : "Insira as notas para cada pergunta. Estas respostas farão parte dos relatórios agregados."}
                            </p>
                          </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => handleQuickPrefill(5)}
                                className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-850 text-[11px] px-2.5 py-1.5 rounded-lg font-mono font-semibold transition cursor-pointer"
                              >
                                🟢 Concordo Plenamente (Tudo 5)
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickPrefill(3)}
                                className="bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-850 text-[11px] px-2.5 py-1.5 rounded-lg font-mono font-semibold transition cursor-pointer"
                              >
                                🟡 Concordo Parcialmente (Tudo 3)
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickPrefill(1)}
                                className="bg-rose-50 hover:bg-rose-100 border border-rose-250 text-rose-850 text-[11px] px-2.5 py-1.5 rounded-lg font-mono font-semibold transition cursor-pointer"
                              >
                                🔴 Discordo/Não se aplica (Tudo 1)
                              </button>
                            </div>
                          </div>

                          <form onSubmit={(e) => handleAdminSubmit(e, studentDetails)} className="space-y-8">
                            {/* Section 1: Curso */}
                            <div className="space-y-4">
                              <h4 className="text-xs font-black uppercase tracking-widest text-slate-600 border-b pb-1.5 font-mono">
                                I. Avaliação sobre o Curso
                              </h4>
                              <div className="divide-y divide-slate-100 space-y-3.5 pt-1">
                                {CURSO_QUESTIONS.map((q, idx) => (
                                  <div key={q.key} className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 first:pt-0">
                                    <span className="text-xs font-bold text-slate-700">
                                      {idx + 1}. {q.label}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      {[
                                        { val: 5, label: "CP", title: "Concordo Plenamente", bgSel: "bg-emerald-600 border-emerald-600 text-white" },
                                        { val: 3, label: "CPa", title: "Concordo Parcialmente", bgSel: "bg-sky-600 border-sky-600 text-white" },
                                        { val: 1, label: "D/NA", title: "Discordo / Não se Aplica", bgSel: "bg-rose-600 border-rose-600 text-white" }
                                      ].map(({ val, label, title, bgSel }) => {
                                        const isSelected = adminAnswers[q.key] === val;
                                        return (
                                          <button
                                            key={val}
                                            type="button"
                                            title={title}
                                            onClick={() => setAdminAnswers(prev => ({ ...prev, [q.key]: val }))}
                                            className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-mono font-bold flex items-center justify-center transition-all cursor-pointer ${
                                              isSelected
                                                ? `${bgSel} font-black scale-105 shadow-md`
                                                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                                            }`}
                                          >
                                            {label}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Section 2: Instrutor */}
                            <div className="space-y-4">
                              <h4 className="text-xs font-black uppercase tracking-widest text-slate-600 border-b pb-1.5 font-mono">
                                II. Desempenho do Instrutor
                              </h4>
                              <div className="divide-y divide-slate-100 space-y-3.5 pt-1">
                                {INSTRUTOR_QUESTIONS.map((q, idx) => (
                                  <div key={q.key} className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 first:pt-0">
                                    <span className="text-xs font-bold text-slate-700">
                                      {idx + 1}. {q.label}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      {[
                                        { val: 5, label: "CP", title: "Concordo Plenamente", bgSel: "bg-emerald-600 border-emerald-600 text-white" },
                                        { val: 3, label: "CPa", title: "Concordo Parcialmente", bgSel: "bg-sky-600 border-sky-600 text-white" },
                                        { val: 1, label: "D/NA", title: "Discordo / Não se Aplica", bgSel: "bg-rose-600 border-rose-600 text-white" }
                                      ].map(({ val, label, title, bgSel }) => {
                                        const isSelected = adminAnswers[q.key] === val;
                                        return (
                                          <button
                                            key={val}
                                            type="button"
                                            title={title}
                                            onClick={() => setAdminAnswers(prev => ({ ...prev, [q.key]: val }))}
                                            className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-mono font-bold flex items-center justify-center transition-all cursor-pointer ${
                                              isSelected
                                                ? `${bgSel} font-black scale-105 shadow-md`
                                                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                                            }`}
                                          >
                                            {label}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Section 3: Auto & Infra */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2">
                              {/* Autoavaliação */}
                              <div className="space-y-4">
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-600 border-b pb-1.5 font-mono">
                                  III. Autoavaliação do Aluno
                                </h4>
                                <div className="space-y-3 pt-1">
                                  {AUTO_QUESTIONS.map((q, idx) => (
                                    <div key={q.key} className="flex flex-col gap-1.5">
                                      <span className="text-xs font-bold text-slate-700">
                                        {idx + 1}. {q.label}
                                      </span>
                                      <div className="flex items-center gap-1.5">
                                        {[
                                          { val: 5, label: "CP", title: "Concordo Plenamente", bgSel: "bg-emerald-600 border-emerald-600 text-white" },
                                          { val: 3, label: "CPa", title: "Concordo Parcialmente", bgSel: "bg-sky-600 border-sky-600 text-white" },
                                          { val: 1, label: "D/NA", title: "Discordo / Não se Aplica", bgSel: "bg-rose-600 border-rose-600 text-white" }
                                        ].map(({ val, label, title, bgSel }) => {
                                          const isSelected = adminAnswers[q.key] === val;
                                          return (
                                            <button
                                              key={val}
                                              type="button"
                                              title={title}
                                              onClick={() => setAdminAnswers(prev => ({ ...prev, [q.key]: val }))}
                                              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-mono font-bold flex items-center justify-center transition-all cursor-pointer ${
                                                isSelected
                                                  ? `${bgSel} font-black scale-105 shadow-md`
                                                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                                              }`}
                                            >
                                              {label}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Infraestrutura */}
                              <div className="space-y-4">
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-600 border-b pb-1.5 font-mono">
                                  IV. Infraestrutura de Ensino
                                </h4>
                                <div className="space-y-3 pt-1">
                                  {INFRA_QUESTIONS.map((q, idx) => (
                                    <div key={q.key} className="flex flex-col gap-1.5">
                                      <span className="text-xs font-bold text-slate-700">
                                        {idx + 1}. {q.label}
                                      </span>
                                      <div className="flex items-center gap-1.5">
                                        {[
                                          { val: 5, label: "CP", title: "Concordo Plenamente", bgSel: "bg-emerald-600 border-emerald-600 text-white" },
                                          { val: 3, label: "CPa", title: "Concordo Parcialmente", bgSel: "bg-sky-600 border-sky-600 text-white" },
                                          { val: 1, label: "D/NA", title: "Discordo / Não se Aplica", bgSel: "bg-rose-600 border-rose-600 text-white" }
                                        ].map(({ val, label, title, bgSel }) => {
                                          const isSelected = adminAnswers[q.key] === val;
                                          return (
                                            <button
                                              key={val}
                                              type="button"
                                              title={title}
                                              onClick={() => setAdminAnswers(prev => ({ ...prev, [q.key]: val }))}
                                              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-mono font-bold flex items-center justify-center transition-all cursor-pointer ${
                                                isSelected
                                                  ? `${bgSel} font-black scale-105 shadow-md`
                                                  : "bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100"
                                              }`}
                                            >
                                              {label}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Section 4: Comentários */}
                            <div className="space-y-4 pt-2">
                              <h4 className="text-xs font-black uppercase tracking-widest text-slate-600 border-b pb-1.5 font-mono">
                                V. Comentários, Elogios e Críticas (Opcional)
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">Sugestões de Melhoria</label>
                                  <textarea
                                    value={adminComments.sugestoes_melhoria}
                                    onChange={(e) => setAdminComments(prev => ({ ...prev, sugestoes_melhoria: e.target.value }))}
                                    rows={3}
                                    className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:bg-white focus:ring-1 focus:ring-slate-800 focus:outline-none"
                                    placeholder="O que pode ser aprimorado..."
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">Críticas Construtivas</label>
                                  <textarea
                                    value={adminComments.criticas_construtivas}
                                    onChange={(e) => setAdminComments(prev => ({ ...prev, criticas_construtivas: e.target.value }))}
                                    rows={3}
                                    className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:bg-white focus:ring-1 focus:ring-slate-800 focus:outline-none"
                                    placeholder="Obstáculos ou falhas apontadas..."
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">Elogios ao Curso/Instrutor</label>
                                  <textarea
                                    value={adminComments.elogios}
                                    onChange={(e) => setAdminComments(prev => ({ ...prev, elogios: e.target.value }))}
                                    rows={3}
                                    className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:bg-white focus:ring-1 focus:ring-slate-800 focus:outline-none"
                                    placeholder="Pontos de excelência observados..."
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">Outros Comentários Gerais</label>
                                  <textarea
                                    value={adminComments.comentarios_adicionais}
                                    onChange={(e) => setAdminComments(prev => ({ ...prev, comentarios_adicionais: e.target.value }))}
                                    rows={3}
                                    className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:bg-white focus:ring-1 focus:ring-slate-800 focus:outline-none"
                                    placeholder="Análise complementar..."
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Assinatura */}
                            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-3">
                              <h4 className="text-xs font-bold text-slate-900 uppercase font-mono flex items-center gap-1.5">
                                <Signature className="h-4 w-4 text-slate-600" />
                                Assinatura de Validade Administrativa
                              </h4>
                              <p className="text-xs text-slate-500 leading-relaxed font-sans">
                                Este questionário está sendo preenchido administrativamente. Ao prescrever sua assinatura abaixo, você certifica e concede que as informações aqui coletadas correspondem aos fatos observados para fins estatísticos oficiais acadêmicos.
                              </p>
                              <div>
                                <input
                                  type="text"
                                  value={adminSignature}
                                  onChange={(e) => setAdminSignature(e.target.value)}
                                  className="w-full bg-white border border-slate-200 text-xs rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-slate-800 focus:outline-none font-bold uppercase placeholder-slate-400 text-slate-800"
                                  placeholder="DIGITE SEU NOME PARA ATUAR COMO ASSINATURA"
                                />
                              </div>
                            </div>

                            <div className="flex justify-end gap-3 border-t pt-5">
                              <button
                                type="button"
                                onClick={() => setIsAdminFilling(false)}
                                className="bg-white border text-xs px-5 py-2.5 rounded-lg text-slate-600 font-semibold hover:bg-slate-50 transition cursor-pointer"
                              >
                                Cancelar
                              </button>
                            <button
                              type="submit"
                              disabled={adminSubmitting}
                              className="bg-slate-900 text-white text-xs px-6 py-2.5 rounded-lg font-bold hover:bg-slate-800 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                            >
                              {adminSubmitting ? "Salvando..." : (studentSub ? "Salvar Alterações" : "Enviar Questionário pelo Admin")}
                            </button>
                          </div>
                        </form>
                      </div>
                    );
                  }

                  if (!studentSub) {
                    return (
                      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center max-w-xl mx-auto shadow-sm space-y-5">
                        <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                          <AlertTriangle className="h-6 w-6 text-amber-600 animate-pulse" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest font-mono">Avaliação Pendente</h3>
                          <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
                            O aluno <strong className="text-slate-900">{studentDetails?.nome || "Selecionado"}</strong> ({studentDetails?.posto_graduacao || "Posto/Graduação"}) ainda não enviou as respostas do questionário de conclusão.
                          </p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3.5 border text-xs text-slate-600 font-mono text-left space-y-1 max-w-xs mx-auto">
                          <p><strong>Matrícula:</strong> {studentDetails?.matricula || "Não disponível"}</p>
                          <p><strong>OM:</strong> {studentDetails?.om || "Não disponível"}</p>
                          <p><strong>Frequência:</strong> Dependente de envio</p>
                        </div>
                        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row justify-center gap-3">
                          <button
                            type="button"
                            onClick={async () => {
                              if (!studentDetails?.id) return;
                              toast.promise(
                                (async () => {
                                  const { data, error } = await supabase
                                    .from('student_access_codes')
                                    .select('access_code')
                                    .eq('student_id', studentDetails.id)
                                    .single();
                                  if (error) throw error;
                                  if (!data?.access_code) throw new Error('Código de acesso não encontrado.');
                                  
                                  const currentTurmaObj = turmas.find(t => t.id === studentDetails.turma_id);
                                  const turmaNome = currentTurmaObj ? currentTurmaObj.nome : 'Turma';
                                  
                                  handlePrintQRCode(studentDetails.nome, data.access_code, turmaNome);
                                  return data;
                                })(),
                                {
                                  loading: 'Gerando QR Code da carteirinha...',
                                  success: 'Carteirinha gerada!',
                                  error: (err: any) => `${err.message || 'Erro ao gerar.'}`
                                }
                              );
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow-sm transition flex items-center justify-center gap-2 cursor-pointer border border-blue-500"
                          >
                            🖨️ CARTEIRINHA QR
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => setIsAdminFilling(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow-sm transition flex items-center justify-center gap-2 cursor-pointer border border-indigo-500"
                          >
                            <Edit3 className="h-4 w-4" />
                            Preencher Questionário como Admin
                          </button>
                        </div>
                      </div>
                    );
                  }

                  const studentAllScores = [...courseAvgKeys, ...instAvgKeys, ...autoAvgKeys, ...infraAvgKeys];
                  const studentAvg = calculateAverage([studentSub], studentAllScores);
                  
                  return (
                    <div className="space-y-8">
                      {/* Identity profile card */}
                      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <Building className="h-5 w-5 text-slate-500" />
                              <h3 className="text-base font-bold text-slate-900">{studentSub.aluno?.nome}</h3>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!studentSub.aluno_id) return;
                                  toast.promise(
                                    (async () => {
                                      const { data, error } = await supabase
                                        .from('student_access_codes')
                                        .select('access_code')
                                        .eq('student_id', studentSub.aluno_id)
                                        .single();
                                      if (error) throw error;
                                      if (!data?.access_code) throw new Error('Código de acesso não encontrado.');
                                      
                                      const currentTurmaObj = turmas.find(t => t.id === studentSub.turma_id);
                                      const turmaNome = currentTurmaObj ? currentTurmaObj.nome : 'Turma';
                                      
                                      handlePrintQRCode(studentSub.aluno?.nome || 'Estudante', data.access_code, turmaNome);
                                      return data;
                                    })(),
                                    {
                                      loading: 'Gerando QR Code da carteirinha...',
                                      success: 'Carteirinha gerada!',
                                      error: (err: any) => `${err.message || 'Erro ao gerar.'}`
                                    }
                                  );
                                }}
                                className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs px-3 py-2 rounded-lg font-bold border border-blue-200 transition flex items-center gap-1 cursor-pointer font-sans"
                              >
                                🖨️ CARTEIRINHA QR
                              </button>

                              {/* EDITAR COMO ADMIN removido para retirar o acesso à alteração de questionários preenchidos */}
                            </div>
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
        </>
      )}

      {/* FOOTER METADATA MARKERS */}
      <div className="text-center font-mono text-[10px] text-slate-400 border-t pt-4 space-y-1 print:block">
        <p>© Escola de Qualidade Pedagógica Integrada — Relatórios de Feedback Gerencial</p>
        <p>Sistema permanentemente auditado em conformidade com as diretrizes acadêmicas vigentes.</p>
      </div>

    </div>
  );
}

export default function RelatorioAvaliacaoAdminPage() {
  return (
    <Suspense fallback={
      <div className="py-24 flex flex-col items-center justify-center bg-slate-50 min-h-[75vh]">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-slate-900"></div>
          <BarChart3 className="absolute inset-0 m-auto text-slate-900" size={24} />
        </div>
        <p className="mt-4 text-slate-500 font-mono text-[10px] uppercase tracking-wider animate-pulse">Carregando Relatórios...</p>
      </div>
    }>
      <RelatorioAvaliacaoAdminContent />
    </Suspense>
  );
}
