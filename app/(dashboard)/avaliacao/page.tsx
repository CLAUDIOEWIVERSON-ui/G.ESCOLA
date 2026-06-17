'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useUser } from '@/lib/auth/UserContext';
import { motion, AnimatePresence } from 'motion/react';
import { format, startOfWeek, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  FileText, 
  CheckCircle, 
  ChevronRight, 
  ChevronLeft,
  BookOpen, 
  User, 
  MapPin, 
  AlertCircle, 
  Calendar, 
  Printer, 
  Signature, 
  ArrowRight,
  ShieldCheck,
  Star,
  Info,
  Clock,
  Users,
  ThumbsUp,
  Lightbulb,
  AlertTriangle,
  MessageSquare,
  Home
} from 'lucide-react';
import { toast } from 'sonner';

// Define the scale options
const EVALUATION_SCALE = [
  { value: 5, label: "CONCORDO PLENAMENTE", color: "bg-emerald-605 border-emerald-500 text-emerald-700 hover:bg-emerald-50" },
  { value: 3, label: "CONCORDO PARCIALMENTE", color: "bg-sky-605 border-sky-500 text-sky-700 hover:bg-sky-50" },
  { value: 1, label: "DISCORDO/ NÃO SE APLICA", color: "bg-rose-605 border-rose-500 text-rose-700 hover:bg-rose-50" }
];

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

function AvaliacaoAlunoForm() {
  const { profile, loading: userLoading } = useUser();
  const searchParams = useSearchParams();
  const qrTurmaId = searchParams ? searchParams.get('turmaId') : null;
  const qrStudentId = searchParams ? searchParams.get('studentId') : null;
  const qrAccessCode = searchParams ? searchParams.get('code') : null;

  const [loading, setLoading] = useState(true);
  const [studentDetails, setStudentDetails] = useState<any | null>(null);
  const [existingSubmission, setExistingSubmission] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1: Info, 2: Curso, 3: Instrutor, 4: Auto/Infra, 5: Comentários/Sugestões

  // Personalized class messages
  const [classMessages, setClassMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Individual Report Card / Bulletin state
  const [reportData, setReportData] = useState<any | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const fetchClassMessages = async (tId: string, group: string) => {
    try {
      setLoadingMessages(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch upcoming events for this class
      const { data, error } = await supabase
        .from('eventos')
        .select('id, titulo, descricao, data, cor, exibir_aluno, target_grupo, uniforme_dia')
        .is('exibir_aluno', true)
        .gte('data', today.toISOString())
        .order('data', { ascending: true })
        .limit(10);

      if (error) throw error;

      if (data) {
        // Filter by group (GAT, MAN, AMBOS)
        const filtered = data.filter((evt: any) => {
          const targetGrp = (evt.target_grupo || 'AMBOS').toUpperCase();
          const targetGroupInput = (group || 'AMBOS').toUpperCase();
          if (targetGrp === 'AMBOS') return true;
          if (targetGroupInput === 'AMBOS') return true;
          return targetGrp === targetGroupInput;
        });
        setClassMessages(filtered);
      }
    } catch (err) {
      console.error('Error fetching class messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const fetchStudentReportCard = async (studentId: string, classId: string) => {
    try {
      setLoadingReport(true);
      const { data: student, error: studentErr } = await supabase
        .from('alunos')
        .select('*')
        .eq('id', studentId)
        .single();
      if (studentErr) throw studentErr;

      const actualClassId = student.turma_id || classId;
      if (!actualClassId) return;

      const { data: tData } = await supabase
        .from('turmas')
        .select('*')
        .eq('id', actualClassId)
        .single();
      const classObj = tData;

      let courseObj: any = null;
      if (tData?.curso_id) {
        const { data: cData } = await supabase
          .from('cursos')
          .select('*')
          .eq('id', tData.curso_id)
          .single();
        courseObj = cData;
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
        const { data: mmData } = await supabase
          .from('materias_modulos')
          .select('*')
          .in('disciplina_id', discIds)
          .is('deleted_at', null)
          .order('modulo_index', { ascending: true })
          .order('ordem', { ascending: true });
        topicsList = mmData || [];
      }

      const { data: gradesData } = await supabase
        .from('notas')
        .select('*')
        .eq('aluno_id', studentId)
        .eq('turma_id', actualClassId);

      const { data: attendanceData } = await supabase
        .from('frequencia')
        .select('*')
        .eq('aluno_id', studentId)
        .eq('turma_id', actualClassId)
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
    } catch (err) {
      console.error('Error loading report card:', err);
    } finally {
      setLoadingReport(false);
    }
  };

  // Form states
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [comments, setComments] = useState({
    sugestoes_melhoria: '',
    criticas_construtivas: '',
    elogios: '',
    necessidades_novos_cursos: '',
    comentarios_adicionais: ''
  });
  const [signature, setSignature] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isPrintingBlank, setIsPrintingBlank] = useState(false);

  // Schedule state for students / QR Code access
  const [showWeeklySchedule, setShowWeeklySchedule] = useState(false);
  const [scheduleData, setScheduleData] = useState<Record<string, any>>({});
  const [disciplinas, setDisciplinas] = useState<any[]>([]);
  const [instrutores, setInstrutores] = useState<any[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [currentScheduleDate, setCurrentScheduleDate] = useState<Date>(new Date());

  const fetchScheduleForTurma = async (tId: string) => {
    try {
      setScheduleLoading(true);
      const { data: hData } = await supabase
        .from('horarios')
        .select('*')
        .eq('turma_id', tId)
        .maybeSingle();

      if (hData && hData.data) {
        setScheduleData(hData.data);
      } else {
        setScheduleData({});
      }

      const { data: dData } = await supabase
        .from('disciplinas')
        .select('*')
        .is('deleted_at', null);
      if (dData) setDisciplinas(dData);

      const { data: iData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'instrutor');
      
      const combinedInstructors: any[] = [];
      const seenNames = new Set<string>();
      
      if (iData) {
        iData.forEach((prof: any) => {
          const name = (prof.full_name || '').trim();
          if (name) {
            seenNames.add(name.toLowerCase());
            combinedInstructors.push({
              id: prof.id,
              full_name: prof.full_name
            });
          }
        });
      }
      setInstrutores(combinedInstructors);
    } catch (err) {
      console.error('Error fetching schedule details:', err);
    } finally {
      setScheduleLoading(false);
    }
  };

  useEffect(() => {
    if (studentDetails?.turma_id) {
      setTimeout(() => {
        fetchScheduleForTurma(studentDetails.turma_id);
      }, 0);
    }
  }, [studentDetails?.turma_id]);

  // QR-Code specific tracking
  const [studentCount, setStudentCount] = useState<number>(0);
  const [submissionCount, setSubmissionCount] = useState<number>(0);
  const [limitReached, setLimitReached] = useState<boolean>(false);

  const fetchClassAndEvaluationQR = async (tId: string) => {
    try {
      setLoading(true);

      // 1. Fetch Class with associated Course details
      const { data: classObj, error: classErr } = await supabase
        .from('turmas')
        .select(`
          id,
          nome,
          instrutor,
          data_fim,
          curso_id,
          grupo_responsavel,
          curso:cursos(
            id,
            nome,
            grupo_responsavel
          )
        `)
        .eq('id', tId)
        .maybeSingle();

      if (classErr) throw classErr;
      if (!classObj) {
        toast.error('Turma não encontrada para esta avaliação.');
        setLoading(false);
        return;
      }

      // Fetch class messages/announcements
      const grp = classObj.grupo_responsavel || classObj.curso?.grupo_responsavel || 'AMBOS';
      fetchClassMessages(tId, grp);

      // 2. Fetch Alunos (students enrolled)
      const { data: students, error: studErr } = await supabase
        .from('alunos')
        .select('id, nome, posto_graduacao, om, matricula')
        .eq('turma_id', tId)
        .is('deleted_at', null);

      if (studErr) throw studErr;
      const enrolledCount = students?.length || 0;
      setStudentCount(enrolledCount);

      // 3. Fetch Existing submissions
      const { data: existingEvals, error: evalErr } = await supabase
        .from('questionarios_conclusao')
        .select('id, aluno_id')
        .eq('turma_id', tId);

      if (evalErr) throw evalErr;
      const finishedSubmissions = existingEvals?.length || 0;
      setSubmissionCount(finishedSubmissions);

      // Check limit vs enrolled
      if (enrolledCount > 0 && finishedSubmissions >= enrolledCount) {
        setLimitReached(true);
        setLoading(false);
        return;
      }

      // Find an unsubmitted student to bypass DB unique constraints
      const unusedStudent = students?.find((st: any) => !existingEvals?.some((sub: any) => sub.aluno_id === st.id));
      if (!unusedStudent) {
        setLimitReached(true);
        setLoading(false);
        return;
      }

      setStudentDetails({
        id: unusedStudent.id,
        nome: "Aluno da Turma - Entrada via QR Code",
        posto_graduacao: "Não especificado",
        om: "Não especificada",
        matricula: "QR-Code",
        turma_id: tId,
        turma: {
          id: tId,
          nome: classObj.nome,
          instrutor: classObj.instrutor || "Não cadastrado",
          data_fim: classObj.data_fim,
          grupo_responsavel: classObj.grupo_responsavel,
          curso: {
            id: classObj.curso?.id || classObj.curso_id,
            nome: classObj.curso?.nome || "Curso Acadêmico",
            grupo_responsavel: classObj.curso?.grupo_responsavel
          }
        }
      });

    } catch (err: any) {
      console.error('Error loading QR class details:', err);
      toast.error('Erro ao processar as informações da turma.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentAndEvaluation = async (studentId: string) => {
    try {
      setLoading(true);
      // Fetch Aluno + Turma + Curso
      const { data: student, error: studentErr } = await supabase
        .from('alunos')
        .select(`
          id,
          nome,
          posto_graduacao,
          om,
          matricula,
          turma_id,
          turma:turmas(
            id,
            nome,
            instrutor,
            data_fim,
            grupo_responsavel,
            curso:cursos(
              id,
              nome,
              grupo_responsavel
            )
          )
        `)
        .eq('id', studentId)
        .maybeSingle();

      if (studentErr) throw studentErr;

      if (student) {
        setStudentDetails(student);

        // Fetch existing evaluation if any
        const { data: evaluation, error: evalErr } = await supabase
          .from('questionarios_conclusao')
          .select('*')
          .eq('aluno_id', student.id)
          .eq('turma_id', student.turma_id)
          .maybeSingle();

        if (evalErr) {
          console.warn('Evaluation table check error :', evalErr);
        }

        if (evaluation) {
          setExistingSubmission(evaluation);
        }

        // Fetch class messages/announcements and report card for student
        const grp = student.turma?.grupo_responsavel || student.turma?.curso?.grupo_responsavel || 'AMBOS';
        fetchClassMessages(student.turma_id, grp);
        fetchStudentReportCard(student.id, student.turma_id);
      }
    } catch (err: any) {
      console.error('Error loading student details:', err);
      toast.error('Não foi possível carregar as informações do estudante.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (qrAccessCode) {
      const fetchByCode = async () => {
        try {
          setLoading(true);
          const { data, error } = await supabase
            .from('student_access_codes')
            .select('student_id')
            .eq('access_code', qrAccessCode.trim().toUpperCase())
            .maybeSingle();
          
          if (data?.student_id) {
            await fetchStudentAndEvaluation(data.student_id);
          } else {
            toast.error('Código de acesso individual inválido.');
            setLoading(false);
          }
        } catch (err) {
          console.error(err);
          setLoading(false);
        }
      };
      fetchByCode();
    } else if (qrStudentId) {
      setTimeout(() => {
        fetchStudentAndEvaluation(qrStudentId);
      }, 0);
    } else if (qrTurmaId) {
      setTimeout(() => {
        setCurrentStep(2);
      }, 0);
      setTimeout(() => {
        fetchClassAndEvaluationQR(qrTurmaId);
      }, 0);
    } else if (!userLoading) {
      const studentId = profile?.student_id;
      if (studentId) {
        setTimeout(() => {
          fetchStudentAndEvaluation(studentId);
        }, 0);
      } else {
        setTimeout(() => {
          setLoading(false);
        }, 0);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrTurmaId, qrStudentId, qrAccessCode, profile?.student_id, userLoading]);

  const handleSelectAnswer = (key: string, value: number) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const handleCommentChange = (key: keyof typeof comments, value: string) => {
    setComments(prev => ({ ...prev, [key]: value }));
  };

  const validateStep = (step: number) => {
    if (step === 2) {
      // Curso
      const missing = CURSO_QUESTIONS.filter(q => !answers[q.key]);
      if (missing.length > 0) {
        toast.error(`Por favor, responda todas as ${missing.length} questões sobre o Curso.`);
        return false;
      }
    }
    if (step === 3) {
      // Instrutor
      const missing = INSTRUTOR_QUESTIONS.filter(q => !answers[q.key]);
      if (missing.length > 0) {
        toast.error(`Por favor, responda todas as ${missing.length} questões sobre o Instrutor.`);
        return false;
      }
    }
    if (step === 4) {
      // Autoavaliação e Infra
      const missingAuto = AUTO_QUESTIONS.filter(q => !answers[q.key]);
      const missingInfra = INFRA_QUESTIONS.filter(q => !answers[q.key]);
      const totalMissing = missingAuto.length + missingInfra.length;
      if (totalMissing > 0) {
        toast.error(`Ainda restam ${totalMissing} questões para responder nesta etapa (Autoavaliação/Infraestrutura).`);
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 5));
    }
  };

  const handlePrev = () => {
    if (qrTurmaId && currentStep <= 2) return;
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Double check all steps
    for (let s = 1; s <= 4; s++) {
      if (!validateStep(s)) {
        setCurrentStep(s);
        return;
      }
    }

    setSubmitting(true);

    try {
      const studentName = studentDetails?.nome || 'Aluno';
      const digitalSignatureText = `Preenchido e Confirmado por ${studentName} em ${new Date().toLocaleString('pt-BR')}`;
      
      const payload = {
        aluno_id: studentDetails.id,
        turma_id: studentDetails.turma_id,
        curso_id: studentDetails.turma.curso.id,
        instrutor_nome: studentDetails.turma.instrutor || 'Não especificado',
        
        // Course answers
        curso_q1: answers.curso_q1,
        curso_q2: answers.curso_q2,
        curso_q3: answers.curso_q3,
        curso_q4: answers.curso_q4,
        curso_q5: answers.curso_q5,
        curso_q6: answers.curso_q6,

        // Instructor answers
        instrutor_q1: answers.instrutor_q1,
        instrutor_q2: answers.instrutor_q2,
        instrutor_q3: answers.instrutor_q3,
        instrutor_q4: answers.instrutor_q4,
        instrutor_q5: answers.instrutor_q5,
        instrutor_q6: answers.instrutor_q6,
        instrutor_q7: answers.instrutor_q7,

        // Auto answers
        auto_q1: answers.auto_q1,
        auto_q2: answers.auto_q2,
        auto_q3: answers.auto_q3,
        auto_q4: answers.auto_q4,
        auto_q5: answers.auto_q5,

        // Infra answers
        infra_q1: answers.infra_q1,
        infra_q2: answers.infra_q2,
        infra_q3: answers.infra_q3,
        infra_q4: answers.infra_q4,
        infra_q5: answers.infra_q5,

        // Suggestions
        sugestoes_melhoria: comments.sugestoes_melhoria,
        criticas_construtivas: comments.criticas_construtivas,
        elogios: comments.elogios,
        necessidades_novos_cursos: comments.necessidades_novos_cursos,
        comentarios_adicionais: comments.comentarios_adicionais,

        assinatura_digital: digitalSignatureText
      };

      let data: any = null;
      let insertError: any = null;

      if (qrTurmaId) {
        let attempts = 0;
        const maxAttempts = 5;
        let success = false;
        const currentPayload = { ...payload };

        while (attempts < maxAttempts && !success) {
          attempts++;
          const result = await supabase
            .from('questionarios_conclusao')
            .insert(currentPayload)
            .select()
            .maybeSingle();

          if (!result.error) {
            data = result.data;
            success = true;
          } else {
            insertError = result.error;
            const errMsg = (result.error.message || '').toLowerCase();
            const errCode = result.error.code;
            
            // Check for unique constraint violation or duplicate key
            if (errMsg.includes('unique') || errMsg.includes('duplicate') || errMsg.includes('already exists') || errCode === '23505') {
              console.warn(`Tentativa ${attempts} falhou por duplicidade de aluno_id. Tentando realocar outro aluno...`);
              
              // Re-fetch submissions and students to find another slot
              const { data: latestEvals } = await supabase
                .from('questionarios_conclusao')
                .select('aluno_id')
                .eq('turma_id', studentDetails.turma_id);

              const { data: latestStudents } = await supabase
                .from('alunos')
                .select('id')
                .eq('turma_id', studentDetails.turma_id)
                .is('deleted_at', null);

              const nextUnused = latestStudents?.find((st: any) => !latestEvals?.some((sub: any) => sub.aluno_id === st.id));
              if (nextUnused) {
                currentPayload.aluno_id = nextUnused.id;
              } else {
                toast.error('Limite máximo de avaliações preenchidas para esta turma foi atingido.');
                throw result.error;
              }
            } else {
              // Relation doesn't exist under Supabase: notify user to run migrations
              if (errMsg.includes('relation') && (errMsg.includes('does not exist') || errMsg.includes('missing'))) {
                toast.error('Erro: A tabela "questionarios_conclusao" não existe. Por favor execute a migração SQL 25_create_questionario_conclusao.sql.');
              }
              throw result.error;
            }
          }
        }

        if (!success && insertError) {
          throw insertError;
        }
      } else {
        const { data: singleData, error } = await supabase
          .from('questionarios_conclusao')
          .insert(payload)
          .select()
          .single();

        if (error) {
          const errorMsg = (error.message || '').toLowerCase();
          if (errorMsg.includes('relation') && (errorMsg.includes('does not exist') || errorMsg.includes('missing'))) {
            toast.error('Erro: A tabela "questionarios_conclusao" não existe. Por favor execute a migração SQL 25_create_questionario_conclusao.sql para provisioná-la.');
            throw error;
          }
          throw error;
        }
        data = singleData;
      }

      toast.success('Avaliação enviada com sucesso! Obrigado pela colaboração.');
      setExistingSubmission(data);
    } catch (err: any) {
      console.error('Error submitting evaluation:', err);
      toast.error(err.message || 'Erro ao enviar a sua avaliação. Certifique-se de que não possui avaliações anteriores.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  if (userLoading || loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          <span className="text-sm text-slate-500 font-mono">Carregando formulário de avaliação...</span>
        </div>
      </div>
    );
  }

  if (limitReached) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white border border-slate-200 rounded-xl shadow-sm text-center">
        <AlertCircle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Limite de Avaliações Atingido</h2>
        <p className="text-slate-600 text-sm mb-4">
          Esta turma possui <strong>{studentCount}</strong> alunos matriculados e o sistema já recebeu as <strong>{submissionCount}</strong> respostas correspondentes.
        </p>
        <p className="text-xs text-slate-400 font-mono">
          Nenhuma resposta adicional pode ser enviada por este QR-Code para preservar a integridade das vagas da turma.
        </p>
      </div>
    );
  }

  if (!qrTurmaId && (!profile || profile.role !== 'aluno')) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white border border-slate-200 rounded-xl shadow-sm text-center">
        <ShieldCheck className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Acesso Restrito a Alunos</h2>
        <p className="text-slate-600 text-sm mb-4">
          Esta tela está disponível somente para contas acadêmicas de alunos vinculadas a uma turma, ou através de um QR Code Único de Turma válido.
        </p>
      </div>
    );
  }

  if (!studentDetails) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white border border-slate-200 rounded-xl shadow-sm text-center">
        <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2 font-mono">Estudante Não Encontrado</h2>
        <p className="text-slate-600 text-sm mb-6">
          Não conseguimos carregar seus dados acadêmicos ou você não está formalmente vinculado a nenhuma turma. Por favor, entre em contato com a administração.
        </p>
      </div>
    );
  }

  // Render Completed Questionnaire Receipt
  if (existingSubmission) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden p-6 md:p-8 space-y-6">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center space-y-4 max-w-xl mx-auto">
            <CheckCircle className="h-12 w-12 text-emerald-600 mx-auto" />
            <h2 className="text-xl font-bold text-slate-800 uppercase tracking-wide font-mono">Avaliação Enviada com Sucesso</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Obrigado! Sua avaliação foi gravada de forma anônima e desvinculada para fins estatísticos de qualidade acadêmica da turma <strong className="text-slate-900">{studentDetails?.turma?.nome || "em curso"}</strong>.
            </p>
            <span className="inline-block text-[10px] uppercase font-mono font-bold bg-slate-100 text-slate-500 px-3 py-1 rounded">
              Código de Confirmação: {existingSubmission.id?.substring(0, 8)}...
            </span>
          </div>

          {/* Show weekly schedule even after submitting for QR Code, as requested! */}
          <div className="pt-6 border-t border-slate-100 text-left">
            <h3 className="text-xs font-bold text-slate-705 font-mono flex items-center gap-1.5 mb-4">
              <Clock className="h-4 w-4 text-indigo-650" />
              DETALHE SEMANAL DE AULAS COMPLETO (SÁBADO/DOMINGO LIVRE)
            </h3>
            
            {(() => {
              const weekStart = startOfWeek(currentScheduleDate, { weekStartsOn: 1 });
              const weekEnd = addDays(weekStart, 4);
              const weekPeriodFormatted = `${format(weekStart, "dd/MM")} a ${format(weekEnd, "dd/MM/yyyy")}`;
              
              const weekDays = [
                { key: 'monday', label: 'Segunda-feira', date: weekStart },
                { key: 'tuesday', label: 'Terça-feira', date: addDays(weekStart, 1) },
                { key: 'wednesday', label: 'Quarta-feira', date: addDays(weekStart, 2) },
                { key: 'thursday', label: 'Quinta-feira', date: addDays(weekStart, 3) },
                { key: 'friday', label: 'Sexta-feira', date: addDays(weekStart, 4) },
              ];

              const slots = [
                { id: "class-08:00", time: "08:00 - 08:50" },
                { id: "class-09:00", time: "09:00 - 09:50" },
                { id: "class-10:00", time: "10:00 - 10:50" },
                { id: "class-11:00", time: "11:00 - 11:50" },
                { id: "class-12:00", text: "12:00 - 12:50", time: "12:00 - 12:50" },
                { id: "class-13:00", time: "13:00 - 13:50" },
                { id: "class-14:00", time: "14:00 - 14:50" },
                { id: "class-15:00", time: "15:00 - 15:50" }
              ];

              const getCellData = (slotId: string, dayKey: string) => {
                const weekKey = format(weekStart, 'yyyy-MM-dd');
                return scheduleData[`${weekKey}_${slotId}-${dayKey}`] || 
                       scheduleData[`${slotId}-${dayKey}`] || 
                       { subjectId: '', instructorId: '', room: '', courseId: '' };
              };

              return (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-slate-50 border border-slate-150 rounded-xl p-3 font-mono text-xs">
                    <button 
                      type="button" 
                      onClick={() => setCurrentScheduleDate(addDays(currentScheduleDate, -7))}
                      className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer"
                    >
                      ◀ Anterior
                    </button>
                    <span className="font-extrabold text-slate-800 uppercase tracking-widest">{weekPeriodFormatted}</span>
                    <button 
                      type="button"
                      onClick={() => setCurrentScheduleDate(addDays(currentScheduleDate, 7))}
                      className="bg-white hover:bg-slate-105 text-slate-800 border border-slate-200 px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer"
                    >
                      Próxima ▶
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    {weekDays.map(day => {
                      const filledSlots = slots.map(slot => {
                        const cell = getCellData(slot.id, day.key);
                        return { slot, cell };
                      }).filter(item => item.cell.subjectId || item.cell.room);

                      return (
                        <div key={day.key} className="border border-slate-150 rounded-lg p-3 bg-slate-50/50 hover:bg-slate-100/35 transition flex flex-col justify-start">
                          <span className="text-[10px] font-black font-mono text-indigo-700 uppercase tracking-wider block mb-2 pb-1 border-b border-indigo-100">
                            {day.label} <span className="text-slate-500 font-semibold">({format(day.date, 'dd/MM')})</span>
                          </span>
                          {filledSlots.length === 0 ? (
                            <p className="text-[10px] italic text-slate-400 py-2">Sem programação de aulas</p>
                          ) : (
                            <div className="space-y-2">
                              {filledSlots.map(({ slot, cell }) => {
                                const subjectName = disciplinas.find(d => d.id === cell.subjectId)?.nome || cell.subjectId;
                                const instructorName = instrutores.find(i => i.id === cell.instructorId)?.full_name || cell.instructorId || "Instrutor";
                                return (
                                  <div key={slot.id} className="bg-white border border-slate-150 rounded-lg p-2 shadow-xs text-[10px] space-y-1">
                                    <div className="flex justify-between items-center gap-1.5 border-b pb-1 mb-1.5 border-slate-100">
                                      <span className="bg-slate-150 text-slate-700 text-[8.5px] font-bold px-1 py-0.5 rounded font-mono">{slot.time}</span>
                                      {cell.room && <span className="text-[8px] bg-slate-100 text-slate-600 font-mono px-1 rounded truncate max-w-16">Sala: {cell.room}</span>}
                                    </div>
                                    <p className="font-extrabold text-slate-800 leading-tight block">{subjectName}</p>
                                    <p className="text-[8.5px] text-slate-500 font-mono">Prof.: {instructorName}</p>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    );
  }

  if (isPrintingBlank) {
    return (
      <div className="bg-white text-black p-4 md:p-8 font-sans leading-relaxed max-w-4xl mx-auto space-y-6 print:p-0 print:max-w-full">
        {/* Print controls header (hidden in print option) */}
        <div className="p-4 bg-slate-100 border rounded-lg flex justify-between items-center mb-6 print:hidden">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800 font-sans">Opção de Impressão (Ficha em Branco / Preenchimento Manual)</h3>
            <p className="text-xs text-slate-600 font-sans">Esta visualização está formatada para folhas A4 para preenchimento manual.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                window.print();
              }}
              className="bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              Imprimir Agora
            </button>
            <button
              onClick={() => setIsPrintingBlank(false)}
              className="bg-white border text-slate-700 text-xs font-bold px-4 py-2 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Voltar ao Formulário Digital
            </button>
          </div>
        </div>

        {/* The Actual printed sheet */}
        <div className="space-y-6">
          <div className="text-center border-b-2 border-slate-900 pb-4">
            <h1 className="text-xl font-bold uppercase tracking-wide font-sans">Escola Digital Mil-Acadêmica</h1>
            <h2 className="text-base font-bold uppercase tracking-wide mt-1 font-sans">Ficha de Avaliação de Conclusão de Curso (Pós-Curso)</h2>
            <p className="text-xs italic mt-1 text-slate-500 font-sans">Preenchimento Manual e Confidencial</p>
          </div>

          {/* Student details blanks info */}
          <div className="border border-slate-400 p-4 rounded-lg space-y-4 font-sans text-xs">
            <h3 className="font-bold border-b pb-1 uppercase text-slate-800 text-[11px] flex items-center gap-1.5">
              <Info size={12} className="text-slate-700" />
              1. Identificação Acadêmica
            </h3>
            <div className="grid grid-cols-2 gap-y-4 gap-x-6">
              <div>
                <span className="inline-flex items-center gap-1 font-bold text-slate-500 uppercase text-[9px]">
                  <User size={10} className="text-slate-500" />
                  Nome do Aluno:
                </span>
                <p className="text-xs font-semibold text-slate-900 mt-1 border-b border-dashed border-slate-400 pb-0.5 h-5">
                  {studentDetails?.nome || ""}
                </p>
              </div>
              <div>
                <span className="inline-flex items-center gap-1 font-bold text-slate-500 uppercase text-[9px]">
                  <Star size={10} className="text-slate-500" />
                  Posto / Graduação:
                </span>
                <p className="text-xs font-semibold text-slate-900 mt-1 border-b border-dashed border-slate-400 pb-0.5 h-5">
                  {studentDetails?.posto_graduacao || ""}
                </p>
              </div>
              <div>
                <span className="inline-flex items-center gap-1 font-bold text-slate-500 uppercase text-[9px]">
                  <Home size={10} className="text-slate-500" />
                  Organização Militar (OM):
                </span>
                <p className="text-xs font-semibold text-slate-900 mt-1 border-b border-dashed border-slate-400 pb-0.5 h-5">
                  {studentDetails?.om || ""}
                </p>
              </div>
              <div>
                <span className="inline-flex items-center gap-1 font-bold text-slate-500 uppercase text-[9px]">
                  <BookOpen size={10} className="text-slate-500" />
                  Curso Realizado:
                </span>
                <p className="text-xs font-semibold text-slate-900 mt-1 border-b border-dashed border-slate-400 pb-0.5 h-5">
                  {studentDetails?.turma?.curso?.nome || ""}
                </p>
              </div>
              <div>
                <span className="inline-flex items-center gap-1 font-bold text-slate-500 uppercase text-[9px]">
                  <Users size={10} className="text-slate-500" />
                  Turma:
                </span>
                <p className="text-xs font-semibold text-slate-900 mt-1 border-b border-dashed border-slate-400 pb-0.5 h-5">
                  {studentDetails?.turma?.nome || ""}
                </p>
              </div>
              <div>
                <span className="inline-flex items-center gap-1 font-bold text-slate-500 uppercase text-[9px]">
                  <ShieldCheck size={10} className="text-slate-500" />
                  Instrutor Coordenador:
                </span>
                <p className="text-xs font-semibold text-slate-900 mt-1 border-b border-dashed border-slate-400 pb-0.5 h-5">
                  {studentDetails?.turma?.instrutor || ""}
                </p>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-700 font-sans leading-relaxed border-l-2 border-slate-900 pl-3 my-4">
            <strong>Instruções de Preenchimento:</strong> Para cada item listado abaixo, marque com um <strong>X</strong> a coluna correspondente à sua avaliação:
            <br />
            <strong>[ CP ]</strong> Concordo Plenamente | <strong>[ CPa ]</strong> Concordo Parcialmente | <strong>[ D/NA ]</strong> Discordo / Não se aplica
          </div>

          {/* TABLE SCHEMA FOR PRINTING QUESTIONS */}
          {/* Section 1: Curso */}
          <div className="space-y-2">
            <h3 className="font-bold text-xs uppercase bg-slate-105 p-2 border border-slate-300 rounded font-sans">2. Avaliação Geral do Curso</h3>
            <table className="w-full text-xs border-collapse border border-slate-300 font-sans">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border border-slate-300 p-1.5 text-left w-1/2">Critério Acadêmico</th>
                  <th className="border border-slate-300 p-1.5 text-center w-32">Concordo Plenamente</th>
                  <th className="border border-slate-300 p-1.5 text-center w-32">Concordo Parcialmente</th>
                  <th className="border border-slate-300 p-1.5 text-center w-32">Discordo / Não se Aplica</th>
                </tr>
              </thead>
              <tbody>
                {CURSO_QUESTIONS.map((q, idx) => (
                  <tr key={q.key} className="hover:bg-slate-50/50">
                    <td className="border border-slate-300 p-1.5 font-bold text-slate-950">{idx + 1}. {q.label}</td>
                    <td className="border border-slate-300 p-1.5 text-center text-slate-300 font-mono">[  ]</td>
                    <td className="border border-slate-300 p-1.5 text-center text-slate-300 font-mono">[  ]</td>
                    <td className="border border-slate-300 p-1.5 text-center text-slate-300 font-mono">[  ]</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 2: Instrutor */}
          <div className="space-y-2">
            <h3 className="font-bold text-xs uppercase bg-slate-105 p-2 border border-slate-300 rounded font-sans mt-4">3. Condução e Atuação do Instrutor</h3>
            <table className="w-full text-xs border-collapse border border-slate-300 font-sans">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border border-slate-300 p-1.5 text-left w-1/2">Critério Acadêmico</th>
                  <th className="border border-slate-300 p-1.5 text-center w-32">Concordo Plenamente</th>
                  <th className="border border-slate-300 p-1.5 text-center w-32">Concordo Parcialmente</th>
                  <th className="border border-slate-300 p-1.5 text-center w-32">Discordo / Não se Aplica</th>
                </tr>
              </thead>
              <tbody>
                {INSTRUTOR_QUESTIONS.map((q, idx) => (
                  <tr key={q.key} className="hover:bg-slate-50/50">
                    <td className="border border-slate-300 p-1.5 font-bold text-slate-950">{idx + 1}. {q.label}</td>
                    <td className="border border-slate-300 p-1.5 text-center text-slate-300 font-mono">[  ]</td>
                    <td className="border border-slate-300 p-1.5 text-center text-slate-300 font-mono">[  ]</td>
                    <td className="border border-slate-300 p-1.5 text-center text-slate-300 font-mono">[  ]</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="print:page-break-before pt-6"></div>

          {/* Section 3: Autoavaliação */}
          <div className="space-y-2">
            <h3 className="font-bold text-xs uppercase bg-slate-105 p-2 border border-slate-300 rounded font-sans">4. Dedicação e Autoavaliação do Aluno</h3>
            <table className="w-full text-xs border-collapse border border-slate-300 font-sans">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border border-slate-300 p-1.5 text-left w-1/2">Critério Acadêmico</th>
                  <th className="border border-slate-300 p-1.5 text-center w-32">Concordo Plenamente</th>
                  <th className="border border-slate-300 p-1.5 text-center w-32">Concordo Parcialmente</th>
                  <th className="border border-slate-300 p-1.5 text-center w-32">Discordo / Não se Aplica</th>
                </tr>
              </thead>
              <tbody>
                {AUTO_QUESTIONS.map((q, idx) => (
                  <tr key={q.key} className="hover:bg-slate-50/50">
                    <td className="border border-slate-300 p-1.5 font-bold text-slate-950">{idx + 1}. {q.label}</td>
                    <td className="border border-slate-300 p-1.5 text-center text-slate-300 font-mono">[  ]</td>
                    <td className="border border-slate-300 p-1.5 text-center text-slate-300 font-mono">[  ]</td>
                    <td className="border border-slate-300 p-1.5 text-center text-slate-300 font-mono">[  ]</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 4: Infraestrutura */}
          <div className="space-y-2">
            <h3 className="font-bold text-xs uppercase bg-slate-105 p-2 border border-slate-300 rounded font-sans mt-4">5. Infraestrutura, Equipamentos e Ambiente</h3>
            <table className="w-full text-xs border-collapse border border-slate-300 font-sans">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border border-slate-300 p-1.5 text-left w-1/2">Critério Acadêmico</th>
                  <th className="border border-slate-300 p-1.5 text-center w-32">Concordo Plenamente</th>
                  <th className="border border-slate-300 p-1.5 text-center w-32">Concordo Parcialmente</th>
                  <th className="border border-slate-300 p-1.5 text-center w-32">Discordo / Não se Aplica</th>
                </tr>
              </thead>
              <tbody>
                {INFRA_QUESTIONS.map((q, idx) => (
                  <tr key={q.key} className="hover:bg-slate-50/50">
                    <td className="border border-slate-300 p-1.5 font-bold text-slate-950">{idx + 1}. {q.label}</td>
                    <td className="border border-slate-300 p-1.5 text-center text-slate-300 font-mono">[  ]</td>
                    <td className="border border-slate-300 p-1.5 text-center text-slate-300 font-mono">[  ]</td>
                    <td className="border border-slate-300 p-1.5 text-center text-slate-300 font-mono">[  ]</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 5: Comments and Remarks (Ruled boxes) */}
          <div className="space-y-4 print:page-break-before pt-6">
            <h3 className="font-bold text-xs uppercase bg-slate-105 p-2 border border-slate-300 rounded font-sans flex items-center gap-1.5">
              <MessageSquare size={13} className="text-slate-705" />
              6. Comentários, Críticas e Elogios
            </h3>
            
            <div className="space-y-4 font-sans text-xs">
              <div>
                <span className="font-bold inline-flex items-center gap-1.5 mb-1">
                  <Lightbulb size={12} className="text-amber-500" />
                  A. Sugestões de Melhorias Pedagógicas ou Administrativas:
                </span>
                <div className="border border-slate-300 h-16 w-full rounded"></div>
              </div>
              
              <div>
                <span className="font-bold inline-flex items-center gap-1.5 mb-1">
                  <AlertTriangle size={12} className="text-rose-500" />
                  B. Críticas Construtivas Importantes:
                </span>
                <div className="border border-slate-300 h-16 w-full rounded"></div>
              </div>

              <div>
                <span className="font-bold inline-flex items-center gap-1.5 mb-1">
                  <ThumbsUp size={12} className="text-emerald-500" />
                  C. Elogios em Destaque (Curso, Docência, Organização):
                </span>
                <div className="border border-slate-300 h-16 w-full rounded"></div>
              </div>

              <div>
                <span className="font-bold inline-flex items-center gap-1.5 mb-1">
                  <BookOpen size={12} className="text-blue-500" />
                  D. Temas Relevantes Sugeridos para Novos Cursos:
                </span>
                <div className="border border-slate-300 h-16 w-full rounded"></div>
              </div>

              <div>
                <span className="font-bold inline-flex items-center gap-1.5 mb-1">
                  <MessageSquare size={12} className="text-slate-500" />
                  E. Comentários Complementares Adicionais:
                </span>
                <div className="border border-slate-300 h-16 w-full rounded"></div>
              </div>
            </div>
          </div>

          {/* Paper Document Signature Fields */}
          <div className="pt-12 border-t border-slate-400 grid grid-cols-2 gap-8 font-sans text-xs">
            <div className="text-center pt-8">
              <div className="border-t border-slate-400 w-4/5 mx-auto mb-1"></div>
              <p className="font-medium text-slate-705">Assinatura do Aluno</p>
            </div>
            <div className="text-center pt-8">
              <div className="border-t border-slate-400 w-4/5 mx-auto mb-1"></div>
              <p className="font-medium text-slate-705">Local e Data</p>
            </div>
          </div>

          <p className="text-center text-[10px] text-slate-400 font-sans pt-8">
            Ficha Oficial de Avaliação pós-curso / Escola Digital Mil-Acadêmica
          </p>
        </div>
      </div>
    );
  }

  // Active Wizard flow questions
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Wizard Header Progress */}
      <div className="bg-slate-900 text-white rounded-xl shadow-sm p-6 mb-8 flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider font-mono">AVALIAÇÃO POST-CURSO</span>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Questionário pós-conclusão</h1>
          <p className="text-xs text-slate-400 mt-1">Sua resposta orienta nossos critérios de qualidade pedagógica.</p>
          {qrTurmaId && (
            <div className="bg-sky-500/20 border border-sky-400/20 text-sky-300 rounded-lg p-2.5 text-xs mt-3 max-w-md font-sans leading-relaxed">
              <span className="font-extrabold text-[10px] uppercase font-mono block text-sky-400">Acesso Livre via Código QR</span>
              Turma: <strong className="text-white">{studentDetails?.turma?.nome}</strong> &bull; Respostas recebidas: <strong className="text-white">{submissionCount} de {studentCount}</strong> matriculados.
            </div>
          )}
        </div>

        {/* Floating Steps Indicator */}
        <div className="flex items-center gap-2">
          {(qrTurmaId ? [2, 3, 4, 5] : [1, 2, 3, 4, 5]).map((step) => (
            <div 
              key={step} 
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold font-mono text-xs border transition-all duration-300 ${
                step === currentStep 
                  ? "bg-white text-slate-950 border-white scale-110 shadow-lg" 
                  : step < currentStep 
                    ? "bg-slate-800 text-teal-400 border-teal-500" 
                    : "bg-slate-950 text-slate-600 border-slate-800"
              }`}
            >
              {qrTurmaId ? step - 1 : step}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden min-h-[450px] flex flex-col">
        {/* Step 1: Identification Check */}
        {currentStep === 1 && (
          <div className="p-6 md:p-8 flex-1 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b pb-3 mb-6">
                <Info className="h-5 w-5 text-sky-500" />
                <h2 className="text-base font-bold text-slate-900 font-mono">Confirmar Identificação Acadêmica</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-slate-100 rounded-lg p-4 bg-slate-50/50">
                  <div className="flex items-center gap-2 text-slate-500">
                    <User className="h-4 w-4" />
                    <span className="text-xs font-bold font-mono uppercase tracking-wide">Nome do Aluno</span>
                  </div>
                  <p className="text-sm font-bold text-slate-800 mt-1">{studentDetails.nome}</p>
                </div>

                <div className="border border-slate-100 rounded-lg p-4 bg-slate-50/50">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Star className="h-4 w-4" />
                    <span className="text-xs font-bold font-mono uppercase tracking-wide">Posto / Graduação</span>
                  </div>
                  <p className="text-sm font-bold text-slate-800 mt-1">{studentDetails.posto_graduacao || "Soldado/Cadete"}</p>
                </div>

                <div className="border border-slate-100 rounded-lg p-4 bg-slate-50/50">
                  <div className="flex items-center gap-2 text-slate-500">
                    <BookOpen className="h-4 w-4" />
                    <span className="text-xs font-bold font-mono uppercase tracking-wide">Curso</span>
                  </div>
                  <p className="text-sm font-bold text-slate-800 mt-1">{studentDetails.turma?.curso?.nome || "Curso Digital"}</p>
                </div>

                <div className="border border-slate-100 rounded-lg p-4 bg-slate-50/50">
                  <div className="flex items-center gap-2 text-slate-500">
                    <MapPin className="h-4 w-4" />
                    <span className="text-xs font-bold font-mono uppercase tracking-wide">Turma</span>
                  </div>
                  <p className="text-sm font-bold text-slate-800 mt-1">{studentDetails.turma?.nome}</p>
                </div>

                <div className="border border-slate-100 rounded-lg p-4 bg-slate-50/50">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Calendar className="h-4 w-4" />
                    <span className="text-xs font-bold font-mono uppercase tracking-wide">Data de Conclusão</span>
                  </div>
                  <p className="text-sm font-bold text-slate-800 mt-1">
                    {studentDetails.turma?.data_fim ? new Date(studentDetails.turma.data_fim).toLocaleDateString('pt-BR') : "Em conclusão"}
                  </p>
                </div>

                <div className="border border-slate-100 rounded-lg p-4 bg-slate-50/50">
                  <div className="flex items-center gap-2 text-slate-500">
                    <User className="h-4 w-4" />
                    <span className="text-xs font-bold font-mono uppercase tracking-wide">Nome do Instrutor</span>
                  </div>
                  <p className="text-sm font-bold text-slate-800 mt-1">{studentDetails.turma?.instrutor || "A definir"}</p>
                </div>
              </div>

              {/* Mensagens / Avisos da Turma */}
              <div className="bg-slate-900 text-white rounded-xl shadow-md p-5 mt-6">
                <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3 mb-4">
                  <div className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                  <h3 className="font-mono text-xs font-bold text-slate-200 tracking-wider uppercase flex items-center gap-1.5">
                    📢 Mensagens e Comunicados da Turma
                  </h3>
                </div>
                {loadingMessages ? (
                  <p className="text-xs text-slate-400 italic animate-pulse py-2 font-mono">Carregando avisos personalizados...</p>
                ) : classMessages.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">Nenhum aviso ou comunicado cadastrado especificamente para sua turma hoje.</p>
                ) : (
                  <div className="space-y-3">
                    {classMessages.map((msg: any) => (
                      <div key={msg.id} className="border-l-4 border-indigo-500 pl-3.5 py-1 bg-slate-800/40 rounded-r-lg">
                        <h4 className="text-xs font-bold text-slate-100 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                          {msg.titulo}
                          {msg.uniforme_dia && (
                            <span className="bg-amber-100/10 text-amber-300 text-[9px] font-black font-mono px-1.5 py-0.5 rounded border border-amber-500/20 uppercase">
                               Uniforme: {msg.uniforme_dia}
                            </span>
                          )}
                        </h4>
                        {msg.descricao && <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{msg.descricao}</p>}
                        <span className="text-[9px] font-bold font-mono text-slate-400 block mt-1">
                          Data: {new Date(msg.data).toLocaleDateString('pt-BR')} 
                          {msg.target_grupo && ` • Alvo: ${msg.target_grupo}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Collapsible section for Student Weekly Class Schedule */}
              <div className="border border-slate-200 rounded-xl overflow-hidden mt-6 bg-slate-50/20 shadow-xs">
                <button
                  type="button"
                  onClick={() => setShowWeeklySchedule(!showWeeklySchedule)}
                  className="w-full flex items-center justify-between bg-slate-100/75 hover:bg-slate-100 p-4 font-mono text-xs font-bold text-slate-700 transition cursor-pointer select-none border-b border-slate-200"
                >
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-indigo-600 animate-pulse" />
                    👁️ VISUALIZAR DETALHE SEMANAL DE AULAS (SÁBADO/DOMINGO LIVRE)
                  </span>
                  <span className="text-[10px] bg-slate-250 text-slate-800 px-2 py-0.5 rounded font-black font-mono">
                    {showWeeklySchedule ? "RECOLHER ▲" : "EXPANDIR ▼"}
                  </span>
                </button>
                
                {showWeeklySchedule && (
                  <div className="p-4 bg-white space-y-4">
                    {scheduleLoading ? (
                      <p className="text-xs text-slate-500 italic animate-pulse font-mono py-4 text-center">Carregando cronograma das aulas...</p>
                    ) : Object.keys(scheduleData).length === 0 ? (
                      <p className="text-xs text-slate-500 italic font-mono py-4 text-center text-amber-600">Nenhum quadro de horários cadastrado para esta turma nesta semana.</p>
                    ) : (
                      <>
                        {/* Weekly period navigation */}
                        {(() => {
                          const weekStart = startOfWeek(currentScheduleDate, { weekStartsOn: 1 });
                          const weekEnd = addDays(weekStart, 4);
                          const weekPeriodFormatted = `${format(weekStart, "dd/MM")} a ${format(weekEnd, "dd/MM/yyyy")}`;
                          
                          const weekDays = [
                            { key: 'monday', label: 'Segunda-feira', date: weekStart },
                            { key: 'tuesday', label: 'Terça-feira', date: addDays(weekStart, 1) },
                            { key: 'wednesday', label: 'Quarta-feira', date: addDays(weekStart, 2) },
                            { key: 'thursday', label: 'Quinta-feira', date: addDays(weekStart, 3) },
                            { key: 'friday', label: 'Sexta-feira', date: addDays(weekStart, 4) },
                          ];

                          const slots = [
                            { id: "class-08:00", time: "08:00 - 08:50" },
                            { id: "class-09:00", time: "09:00 - 09:50" },
                            { id: "class-10:00", time: "10:00 - 10:50" },
                            { id: "class-11:00", time: "11:00 - 11:50" },
                            { id: "class-12:00", time: "12:00 - 12:50" },
                            { id: "class-13:00", time: "13:00 - 13:50" },
                            { id: "class-14:00", time: "14:00 - 14:50" },
                            { id: "class-15:00", time: "15:00 - 15:50" }
                          ];

                          const getCellData = (slotId: string, dayKey: string) => {
                            const weekKey = format(weekStart, 'yyyy-MM-dd');
                            return scheduleData[`${weekKey}_${slotId}-${dayKey}`] || 
                                   scheduleData[`${slotId}-${dayKey}`] || 
                                   { subjectId: '', instructorId: '', room: '', courseId: '' };
                          };

                          return (
                            <div className="space-y-4">
                              <div className="flex justify-between items-center bg-slate-50 border border-slate-150 rounded-xl p-3 font-mono text-xs">
                                <button 
                                  type="button" 
                                  onClick={() => setCurrentScheduleDate(addDays(currentScheduleDate, -7))}
                                  className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer"
                                >
                                  ◀ Anterior
                                </button>
                                <span className="font-extrabold text-slate-800 uppercase tracking-widest">{weekPeriodFormatted}</span>
                                <button 
                                  type="button"
                                  onClick={() => setCurrentScheduleDate(addDays(currentScheduleDate, 7))}
                                  className="bg-white hover:bg-slate-101 text-slate-800 border border-slate-200 px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer"
                                >
                                  Próxima ▶
                                </button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                                {weekDays.map(day => {
                                  const filledSlots = slots.map(slot => {
                                    const cell = getCellData(slot.id, day.key);
                                    return { slot, cell };
                                  }).filter(item => item.cell.subjectId || item.cell.room);

                                  return (
                                    <div key={day.key} className="border border-slate-150 rounded-lg p-3 bg-slate-50/50 hover:bg-slate-100/35 transition flex flex-col justify-start">
                                      <span className="text-[10px] font-black font-mono text-indigo-700 uppercase tracking-wider block mb-2 pb-1 border-b border-indigo-100">
                                        {day.label} <span className="text-slate-550 font-semibold">({format(day.date, 'dd/MM')})</span>
                                      </span>
                                      {filledSlots.length === 0 ? (
                                        <p className="text-[10px] italic text-slate-400 py-2">Sem programação de aulas</p>
                                      ) : (
                                        <div className="space-y-2">
                                          {filledSlots.map(({ slot, cell }) => {
                                            const subjectName = disciplinas.find(d => d.id === cell.subjectId)?.nome || cell.subjectId;
                                            const instructorName = instrutores.find(i => i.id === cell.instructorId)?.full_name || cell.instructorId || "Instrutor";
                                            return (
                                              <div key={slot.id} className="bg-white border border-slate-150 rounded-lg p-2 shadow-xs text-[10px] space-y-1">
                                                <div className="flex justify-between items-center gap-1.5 border-b pb-1 mb-1.5 border-slate-100">
                                                  <span className="bg-slate-150 text-slate-705 text-[8.5px] font-bold px-1 py-0.5 rounded font-mono">{slot.time}</span>
                                                  {cell.room && <span className="text-[8px] bg-slate-100 text-slate-600 font-mono px-1 rounded truncate max-w-16">Sala: {cell.room}</span>}
                                                </div>
                                                <p className="font-extrabold text-slate-800 leading-tight block uppercase">{subjectName}</p>
                                                <p className="text-[8.5px] text-slate-505 font-mono truncate uppercase">Prof.: {instructorName}</p>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* BOLETIM INDIVIDUAL DE NOTAS E FREQUÊNCIAS (only for individual scans) */}
              {reportData && (
                <div className="border border-slate-200 rounded-xl overflow-hidden mt-6 bg-slate-50/20 shadow-xs">
                  <div className="flex items-center gap-2 bg-slate-100/75 p-4 border-b border-slate-200">
                    <BookOpen className="h-4 w-4 text-emerald-600 animate-pulse" />
                    <span className="font-mono text-xs font-bold text-slate-705 uppercase">
                      📊 Boletim Escolar Individual (Notas e Frequências)
                    </span>
                  </div>
                  
                  <div className="p-4 bg-white space-y-4">
                    {loadingReport ? (
                      <p className="text-xs text-slate-500 italic animate-pulse text-center font-mono py-4">Carregando notas do boletim...</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs font-sans border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-150 text-slate-600 font-bold font-mono text-[9px] uppercase tracking-wider">
                              <th className="p-2.5 text-left">Disciplina</th>
                              <th className="p-2.5 text-center">Mod 1</th>
                              <th className="p-2.5 text-center">Mod 2</th>
                              <th className="p-2.5 text-center">Mod 3</th>
                              <th className="p-2.5 text-center">Mod 4</th>
                              <th className="p-2.5 text-center">Recup.</th>
                              <th className="p-2.5 text-center">Média Final</th>
                              <th className="p-2.5 text-center">Freq. (%)</th>
                              <th className="p-2.5 text-center">Situação</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {reportData.disciplines.map((disc: any) => {
                              const grade = reportData.grades.find((g: any) => g.disciplina_id === disc.id) || {};
                              
                              const mediaAprovacao = 7;
                              const isAprovado = (grade.nota_final !== null && grade.nota_final >= mediaAprovacao);

                              return (
                                <tr key={disc.id} className="hover:bg-slate-50/50">
                                  <td className="p-2.5 font-bold text-slate-800 uppercase">{disc.nome}</td>
                                  <td className="p-2.5 text-center font-mono text-slate-600">{grade.nota_u1 !== null ? Number(grade.nota_u1).toFixed(1) : '-'}</td>
                                  <td className="p-2.5 text-center font-mono text-slate-600">{grade.nota_u2 !== null ? Number(grade.nota_u2).toFixed(1) : '-'}</td>
                                  <td className="p-2.5 text-center font-mono text-slate-600">{grade.nota_u3 !== null ? Number(grade.nota_u3).toFixed(1) : '-'}</td>
                                  <td className="p-2.5 text-center font-mono text-slate-600">{grade.nota_u4 !== null ? Number(grade.nota_u4).toFixed(1) : '-'}</td>
                                  <td className="p-2.5 text-center font-mono text-slate-600">{grade.nota_recuperacao !== null ? Number(grade.nota_recuperacao).toFixed(1) : '-'}</td>
                                  <td className="p-2.5 text-center font-black font-mono text-slate-900 bg-slate-50/40">
                                    {grade.nota_final !== null ? Number(grade.nota_final).toFixed(1) : '-'}
                                  </td>
                                  <td className="p-2.5 text-center font-mono text-slate-800">
                                    {grade.frequencia !== null ? `${Number(grade.frequencia).toFixed(0)}%` : '-'}
                                  </td>
                                  <td className="p-2.5 text-center">
                                    {grade.nota_final !== null ? (
                                      <span className={`inline-block font-mono text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase ${
                                        isAprovado ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                                      }`}>
                                        {isAprovado ? 'Aprovado' : 'Reprovado'}
                                      </span>
                                    ) : (
                                      <span className="font-mono text-[9px] text-slate-400 uppercase font-bold">Pendente</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-amber-50 text-amber-900 border border-amber-200 rounded-lg p-4 text-xs leading-relaxed mt-6">
                <strong>ATENÇÃO:</strong> Ao iniciar, você responderá questões objetivas e comentadas de forma oficial e integrada. Uma vez finalizado, suas opiniões serão armazenadas em banco de dados permanente para fins de melhoria de qualidade de ensino institucional.
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-6 border-t mt-8">
              <button 
                type="button"
                onClick={() => setIsPrintingBlank(true)}
                className="flex items-center justify-center gap-2 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 text-xs font-bold px-4 py-2.5 rounded-lg transition-colors cursor-pointer w-full sm:w-auto"
              >
                <Printer className="h-4 w-4" />
                Imprimir Questionário em Branco (Manual)
              </button>
              
              <button 
                type="button"
                onClick={() => setCurrentStep(2)}
                className="flex items-center justify-center gap-2 bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold px-6 py-3 rounded-lg transition-colors cursor-pointer w-full sm:w-auto"
              >
                Iniciar Avaliação Online
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Curso Questions */}
        {currentStep === 2 && (
          <div className="p-6 md:p-8 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 border-b pb-3 mb-6">
                <BookOpen className="h-5 w-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900 font-mono">1. Avaliação do Curso</h2>
              </div>

              <div className="space-y-6">
                {CURSO_QUESTIONS.map((q, idx) => (
                  <div key={q.key} className="border-b pb-6 last:border-b-0">
                    <p className="text-sm font-extrabold text-slate-950 mb-3 block">
                      {idx + 1}. {q.label}
                    </p>
                    
                    {/* Radio Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl">
                      {EVALUATION_SCALE.map((opt) => {
                        const isSelected = answers[q.key] === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleSelectAnswer(q.key, opt.value)}
                            className={`px-2 py-2.5 rounded-lg border text-center transition-all ${
                              isSelected 
                                ? "bg-slate-950 text-white border-slate-950 font-black shadow-md scale-102"
                                : "bg-white text-slate-800 border-slate-350 hover:bg-slate-50 hover:border-slate-400 font-bold"
                            }`}
                          >
                            <span className="block text-[11px] leading-tight font-bold break-words leading-none">{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-6 border-t mt-8">
              <button 
                onClick={handlePrev}
                className="flex items-center gap-1 bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold px-5 py-2.5 rounded-lg transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                Voltar
              </button>
              <button 
                onClick={handleNext}
                className="flex items-center gap-1 bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold px-5 py-2.5 rounded-lg transition-colors cursor-pointer"
              >
                Próximo
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Instrutor Questions */}
        {currentStep === 3 && (
          <div className="p-6 md:p-8 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 border-b pb-3 mb-6">
                <User className="h-5 w-5 text-amber-600" />
                <h2 className="text-base font-bold text-slate-900 font-mono">2. Avaliação do Instrutor</h2>
              </div>

              <div className="space-y-6">
                {INSTRUTOR_QUESTIONS.map((q, idx) => (
                  <div key={q.key} className="border-b pb-6 last:border-b-0">
                    <p className="text-sm font-extrabold text-slate-950 mb-3 block">
                      {idx + 1}. {q.label}
                    </p>
                    
                    {/* Radio Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl">
                      {EVALUATION_SCALE.map((opt) => {
                        const isSelected = answers[q.key] === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleSelectAnswer(q.key, opt.value)}
                            className={`px-2 py-2.5 rounded-lg border text-center transition-all ${
                              isSelected 
                                ? "bg-slate-950 text-white border-slate-950 font-black shadow-md scale-102"
                                : "bg-white text-slate-800 border-slate-350 hover:bg-slate-50 hover:border-slate-400 font-bold"
                            }`}
                          >
                            <span className="block text-[11px] leading-tight font-bold break-words leading-none">{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-6 border-t mt-8">
              <button 
                onClick={handlePrev}
                className="flex items-center gap-1 bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold px-5 py-2.5 rounded-lg transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                Voltar
              </button>
              <button 
                onClick={handleNext}
                className="flex items-center gap-1 bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold px-5 py-2.5 rounded-lg transition-colors cursor-pointer"
              >
                Próximo
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Autoavaliação & Infraestrutura */}
        {currentStep === 4 && (
          <div className="p-6 md:p-8 flex-1 flex flex-col justify-between">
            <div className="space-y-8">
              <div>
                <div className="flex items-center gap-3 border-b pb-3 mb-6">
                  <Star className="h-5 w-5 text-emerald-600" />
                  <h2 className="text-base font-bold text-slate-900 font-mono">3. Autoavaliação do Aluno</h2>
                </div>

                <div className="space-y-6">
                  {AUTO_QUESTIONS.map((q, idx) => (
                    <div key={q.key} className="border-b pb-6 last:border-b-0">
                      <p className="text-sm font-extrabold text-slate-950 mb-3 block">
                        {idx + 1}. {q.label}
                      </p>
                      
                      {/* Radio Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl">
                        {EVALUATION_SCALE.map((opt) => {
                          const isSelected = answers[q.key] === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => handleSelectAnswer(q.key, opt.value)}
                              className={`px-2 py-2.5 rounded-lg border text-center transition-all ${
                                isSelected 
                                  ? "bg-slate-950 text-white border-slate-950 font-black shadow-md scale-102"
                                  : "bg-white text-slate-800 border-slate-350 hover:bg-slate-50 hover:border-slate-400 font-bold"
                              }`}
                            >
                              <span className="block text-[11px] leading-tight font-bold break-words leading-none">{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-3 border-b pb-3 mb-6 mt-6">
                  <MapPin className="h-5 w-5 text-rose-600" />
                  <h2 className="text-base font-bold text-slate-950 font-mono uppercase tracking-wider">4. Infraestrutura e Recursos</h2>
                </div>

                <div className="space-y-6">
                  {INFRA_QUESTIONS.map((q, idx) => (
                    <div key={q.key} className="border-b pb-6 last:border-b-0">
                      <p className="text-sm font-extrabold text-slate-950 mb-3 block">
                        {idx + 1}. {q.label}
                      </p>
                      
                      {/* Radio Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl">
                        {EVALUATION_SCALE.map((opt) => {
                          const isSelected = answers[q.key] === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => handleSelectAnswer(q.key, opt.value)}
                              className={`px-2 py-2.5 rounded-lg border text-center transition-all ${
                                isSelected 
                                  ? "bg-slate-950 text-white border-slate-950 font-black shadow-md scale-102"
                                  : "bg-white text-slate-800 border-slate-350 hover:bg-slate-50 hover:border-slate-400 font-bold"
                              }`}
                            >
                              <span className="block text-[11px] leading-tight font-bold break-words leading-none">{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-6 border-t mt-8">
              <button 
                onClick={handlePrev}
                className="flex items-center gap-1 bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold px-5 py-2.5 rounded-lg transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                Voltar
              </button>
              <button 
                onClick={handleNext}
                className="flex items-center gap-1 bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold px-5 py-2.5 rounded-lg transition-colors cursor-pointer"
              >
                Próximo
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Comments & Signature */}
        {currentStep === 5 && (
          <form onSubmit={handleSubmit} className="p-6 md:p-8 flex-1 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b pb-3 mb-6">
                <FileText className="h-5 w-5 text-gray-700" />
                <h2 className="text-base font-bold text-slate-900 font-mono">5. Comentários, Sugestões e Assinatura</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-950 uppercase tracking-wider mb-2 font-mono">Sugestões de Melhoria</label>
                  <textarea 
                    value={comments.sugestoes_melhoria}
                    onChange={(e) => handleCommentChange('sugestoes_melhoria', e.target.value)}
                    placeholder="Quais sugestões você daria para aprimorar esse curso?"
                    className="w-full border border-slate-355 rounded-lg p-3 text-xs focus:ring-2 focus:ring-slate-900/10 focus:outline-none min-h-[80px] font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-955 uppercase tracking-wider mb-2 font-mono font-bold">Críticas Construtivas</label>
                  <textarea 
                    value={comments.criticas_construtivas}
                    onChange={(e) => handleCommentChange('criticas_construtivas', e.target.value)}
                    placeholder="Quais pontos cruciais do curso deveriam ser revistos ou corrigidos?"
                    className="w-full border border-slate-355 rounded-lg p-3 text-xs focus:ring-2 focus:ring-slate-900/10 focus:outline-none min-h-[80px] font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-955 uppercase tracking-wider mb-2 font-mono font-bold">Elogios</label>
                  <textarea 
                    value={comments.elogios}
                    onChange={(e) => handleCommentChange('elogios', e.target.value)}
                    placeholder="Quais foram os principais pontos fortes deste curso?"
                    className="w-full border border-slate-355 rounded-lg p-3 text-xs focus:ring-2 focus:ring-slate-900/10 focus:outline-none min-h-[80px] font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-955 uppercase tracking-wider mb-2 font-mono font-bold">Necessidade de Novos Cursos</label>
                  <textarea 
                    value={comments.necessidades_novos_cursos}
                    onChange={(e) => handleCommentChange('necessidades_novos_cursos', e.target.value)}
                    placeholder="Indique novos temas ou disciplinas que você gostaria de realizar futuramente."
                    className="w-full border border-slate-355 rounded-lg p-3 text-xs focus:ring-2 focus:ring-slate-900/10 focus:outline-none min-h-[80px] font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-955 uppercase tracking-wider mb-2 font-mono font-mono">Comentários Adicionais</label>
                  <textarea 
                    value={comments.comentarios_adicionais}
                    onChange={(e) => handleCommentChange('comentarios_adicionais', e.target.value)}
                    placeholder="Alguma consideração final?"
                    className="w-full border border-slate-355 rounded-lg p-3 text-xs focus:ring-2 focus:ring-slate-900/10 focus:outline-none min-h-[80px] font-bold text-slate-900"
                  />
                </div>
              </div>

            </div>

            <div className="flex justify-between pt-6 border-t mt-8">
              <button 
                type="button"
                onClick={handlePrev}
                className="flex items-center gap-1 bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold px-5 py-2.5 rounded-lg transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                Voltar
              </button>
              
              <button 
                id="btn-finalizar-avaliacao"
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold uppercase px-8 py-3.5 rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.5)] border border-emerald-400 transition-all duration-250 cursor-pointer disabled:opacity-50 tracking-wider animate-pulse"
              >
                {submitting ? "Gravando respostas..." : "Finalizar e Enviar Avaliação"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Supplemental student support panel on steps >= 2 */}
      {currentStep >= 2 && (
        <div className="mt-8 space-y-6">
          <div className="bg-slate-900 text-white rounded-xl shadow-md p-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-sky-400" />
                <h3 className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wider">
                  📌 Painel de Apoio Acadêmico (Consulta Rápida)
                </h3>
              </div>
              <span className="text-[10px] font-mono bg-slate-800 text-slate-350 px-2.5 py-0.5 rounded font-bold uppercase">
                Etapa {currentStep} de 5
              </span>
            </div>

            <div className="space-y-4">
              {/* Class Messages inside Support Panel */}
              <div>
                <h4 className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  📢 Comunicados e Avisos da Turma
                </h4>
                {loadingMessages ? (
                  <p className="text-[11px] text-slate-500 italic animate-pulse font-mono">Carregando mensagens...</p>
                ) : classMessages.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic">Nenhum aviso cadastrado para esta turma hoje.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5">
                    {classMessages.map((msg: any) => (
                      <div key={msg.id} className="bg-slate-800/40 border border-slate-800 p-3 rounded-lg text-xs leading-relaxed">
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <span className="font-extrabold text-slate-200 flex items-center gap-1.5 uppercase">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                            {msg.titulo}
                          </span>
                          {msg.uniforme_dia && (
                            <span className="bg-amber-500/10 text-amber-400 text-[8.5px] font-black font-mono px-1.5 py-0.5 rounded border border-amber-500/20 uppercase">
                              Uniforme: {msg.uniforme_dia}
                            </span>
                          )}
                        </div>
                        {msg.descricao && <p className="text-slate-300 mb-1">{msg.descricao}</p>}
                        <span className="text-[9px] font-mono text-slate-500 font-bold block mt-1">
                          Data: {new Date(msg.data).toLocaleDateString('pt-BR')} 
                          {msg.target_grupo && ` • Grupo: ${msg.target_grupo}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Weekly Schedule Access */}
              <div className="border-t border-slate-800 pt-4 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                    📅 Quadro de Horários da Turma
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowWeeklySchedule(!showWeeklySchedule)}
                    className="bg-slate-850 hover:bg-slate-800 text-sky-400 hover:text-sky-300 border border-slate-700 font-mono text-[10px] font-bold px-2.5 py-1 rounded transition cursor-pointer select-none"
                  >
                    {showWeeklySchedule ? "OCULTAR CRONOGRAMA ▲" : "VISUALIZAR DETALHES ▼"}
                  </button>
                </div>

                {showWeeklySchedule && (
                  <div className="bg-white text-slate-800 rounded-lg p-3 mt-3 shadow-inner border border-slate-200">
                    {scheduleLoading ? (
                      <p className="text-xs text-slate-500 italic animate-pulse font-mono py-2 text-center">Carregando cronograma...</p>
                    ) : Object.keys(scheduleData).length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-2 text-center text-amber-600">Nenhum quadro cadastrado nesta semana.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5 mt-1.5 text-xs">
                        {(() => {
                          const weekStart = startOfWeek(currentScheduleDate, { weekStartsOn: 1 });
                          const weekDays = [
                            { key: 'monday', label: 'Segunda', date: weekStart },
                            { key: 'tuesday', label: 'Terça', date: addDays(weekStart, 1) },
                            { key: 'wednesday', label: 'Quarta', date: addDays(weekStart, 2) },
                            { key: 'thursday', label: 'Quinta', date: addDays(weekStart, 3) },
                            { key: 'friday', label: 'Sexta', date: addDays(weekStart, 4) },
                          ];
                          const slots = [
                            { id: "class-08:00", time: "08:00 - 08:50" },
                            { id: "class-09:00", time: "09:00 - 09:50" },
                            { id: "class-10:00", time: "10:00 - 10:50" },
                            { id: "class-11:00", time: "11:00 - 11:50" },
                            { id: "class-12:00", time: "12:00 - 12:50" },
                            { id: "class-13:00", time: "13:00 - 13:50" },
                            { id: "class-14:00", time: "14:00 - 14:50" },
                            { id: "class-15:00", time: "15:00 - 15:50" }
                          ];
                          const getCell = (slotId: string, dayKey: string) => {
                            const weekKey = format(weekStart, 'yyyy-MM-dd');
                            return scheduleData[`${weekKey}_${slotId}-${dayKey}`] || scheduleData[`${slotId}-${dayKey}`] || {};
                          };

                          return weekDays.map((day) => {
                            const active = slots.map(slot => ({ slot, cell: getCell(slot.id, day.key) })).filter(x => x.cell.subjectId);
                            return (
                              <div key={day.key} className="bg-slate-50 border border-slate-250 p-2 rounded-lg">
                                <span className="text-[10px] font-bold font-mono text-indigo-700 block mb-1.5 pb-0.5 border-b border-indigo-100 uppercase">
                                  {day.label} ({format(day.date, 'dd/MM')})
                                </span>
                                {active.length === 0 ? (
                                  <p className="text-[9px] text-slate-400 italic">Sem aulas</p>
                                ) : (
                                  <div className="space-y-1">
                                    {active.map(({ slot, cell }) => {
                                      const subjectName = disciplinas.find(d => d.id === cell.subjectId)?.nome || cell.subjectId;
                                      return (
                                        <div key={slot.id} className="bg-white p-1 rounded-sm border border-slate-150 text-[9px] leading-tight">
                                          <span className="font-mono bg-slate-100 text-slate-500 px-0.5 rounded text-[8px] font-bold">{slot.time}</span>
                                          <p className="font-extrabold text-slate-800 mt-0.5 uppercase truncate">{subjectName}</p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Boletim Escolar summary widget */}
              {reportData && (
                <div className="border-t border-slate-850 pt-3 mt-1 flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    🎓 Boletim Escolar ({reportData.grades.length} Notas Lançadas)
                  </span>
                  <span className="text-[9px] bg-emerald-950/60 text-emerald-300 font-mono border border-emerald-500/20 px-2 py-0.5 rounded font-black uppercase">
                    Vinculado Ativamente
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AvaliacaoAlunoPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[70vh] items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          <span className="text-sm text-slate-500 font-mono">Carregando formulário de avaliação...</span>
        </div>
      </div>
    }>
      <AvaliacaoAlunoForm />
    </Suspense>
  );
}
