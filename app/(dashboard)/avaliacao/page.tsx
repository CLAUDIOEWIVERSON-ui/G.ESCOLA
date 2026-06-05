'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useUser } from '@/lib/auth/UserContext';
import { motion, AnimatePresence } from 'motion/react';
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
  Info
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

  const [loading, setLoading] = useState(true);
  const [studentDetails, setStudentDetails] = useState<any | null>(null);
  const [existingSubmission, setExistingSubmission] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1: Info, 2: Curso, 3: Instrutor, 4: Auto/Infra, 5: Comentários/Sugestões

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
          curso:cursos(
            id,
            nome
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
      const unusedStudent = students?.find(st => !existingEvals?.some(sub => sub.aluno_id === st.id));
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
          curso: {
            id: classObj.curso?.id || classObj.curso_id,
            nome: classObj.curso?.nome || "Curso Acadêmico"
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
            curso:cursos(
              id,
              nome
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
      }
    } catch (err: any) {
      console.error('Error loading student details:', err);
      toast.error('Não foi possível carregar as informações do estudante.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (qrTurmaId) {
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
  }, [qrTurmaId, profile?.student_id, userLoading]);

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
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) {
      toast.error('Você precisa aceitar a declaração de veracidade das respostas.');
      return;
    }
    if (!signature.trim()) {
      toast.error('Por favor, digite seu nome completo no campo de Signature Digital.');
      return;
    }

    // Double check all steps
    for (let s = 1; s <= 4; s++) {
      if (!validateStep(s)) {
        setCurrentStep(s);
        return;
      }
    }

    setSubmitting(true);

    try {
      const digitalSignatureText = `Assinado Digitalmente por ${signature.trim()} por IP do Aluno em ${new Date().toLocaleString('pt-BR')}`;
      
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

              const nextUnused = latestStudents?.find(st => !latestEvals?.some(sub => sub.aluno_id === st.id));
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
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden print:border-none print:shadow-none">
          {/* Receipt Header */}
          <div className="bg-slate-900 text-white p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:bg-white print:text-black print:border-b print:p-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-xs font-semibold mb-2 print:border print:border-green-500 print:text-green-800">
                <CheckCircle className="h-3 w-3" />
                Avaliação Enviada com Sucesso
              </div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">Comprovante de Avaliação Pós-Curso</h1>
              <p className="text-xs text-slate-400 mt-1 print:text-slate-600">ID da Avaliação: {existingSubmission.id}</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 print:hidden">
              <button
                onClick={handlePrintReceipt}
                className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-4 py-2.5 rounded-lg border border-white/10 transition-colors cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                Imprimir Comprovante (A4)
              </button>
              <button
                onClick={() => setIsPrintingBlank(true)}
                className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-4 py-2.5 rounded-lg border border-slate-700 transition-colors cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                Imprimir Ficha em Branco (Manual)
              </button>
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-8">
            {/* Header Data Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-lg border border-slate-200/60 print:grid-cols-2 print:bg-white print:border-slate-300">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Nome Completo</span>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{studentDetails.nome}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono font-mono">Graduação / Posto</span>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{studentDetails.posto_graduacao || "Não Especificado"}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Organização Militar (OM)</span>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{studentDetails.om || "Não Especificada"}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Turma</span>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{studentDetails.turma?.nome}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Curso Realizado</span>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{studentDetails.turma?.curso?.nome}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Instrutor</span>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{studentDetails.turma?.instrutor || "Não Cadastrado"}</p>
              </div>
            </div>

            {/* Submissions Stats Snapshot */}
            <div>
              <h2 className="text-base font-bold text-slate-900 border-b pb-2 mb-4 font-mono">1. Médias Atribuídas pelo Aluno</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                  <span className="text-xs text-slate-500 font-medium">Sobre o Curso</span>
                  <p className="text-2xl font-black text-slate-800 mt-1">
                    {((existingSubmission.curso_q1 + existingSubmission.curso_q2 + existingSubmission.curso_q3 + existingSubmission.curso_q4 + existingSubmission.curso_q5 + existingSubmission.curso_q6) / 6).toFixed(1)} / 5
                  </p>
                </div>
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                  <span className="text-xs text-slate-500 font-medium font-mono">Do Instrutor</span>
                  <p className="text-2xl font-black text-slate-800 mt-1">
                    {((existingSubmission.instrutor_q1 + existingSubmission.instrutor_q2 + existingSubmission.instrutor_q3 + existingSubmission.instrutor_q4 + existingSubmission.instrutor_q5 + existingSubmission.instrutor_q6 + existingSubmission.instrutor_q7) / 7).toFixed(1)} / 5
                  </p>
                </div>
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                  <span className="text-xs text-slate-500 font-medium font-mono font-mono">Autoavaliação</span>
                  <p className="text-2xl font-black text-slate-800 mt-1">
                    {((existingSubmission.auto_q1 + existingSubmission.auto_q2 + existingSubmission.auto_q3 + existingSubmission.auto_q4 + existingSubmission.auto_q5) / 5).toFixed(1)} / 5
                  </p>
                </div>
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                  <span className="text-xs text-slate-500 font-medium">Infraestrutura</span>
                  <p className="text-2xl font-black text-slate-800 mt-1">
                    {((existingSubmission.infra_q1 + existingSubmission.infra_q2 + existingSubmission.infra_q3 + existingSubmission.infra_q4 + existingSubmission.infra_q5) / 5).toFixed(1)} / 5
                  </p>
                </div>
              </div>
            </div>

            {/* Suggestions, Feedback summary and remarks */}
            {(existingSubmission.sugestoes_melhoria || existingSubmission.criticas_construtivas || existingSubmission.elogios || existingSubmission.necessidades_novos_cursos || existingSubmission.comentarios_adicionais) && (
              <div>
                <h2 className="text-base font-bold text-slate-900 border-b pb-2 mb-4 font-mono">2. Considerações e Sugestões do Aluno</h2>
                <div className="space-y-4">
                  {existingSubmission.sugestoes_melhoria && (
                    <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg">
                      <span className="text-xs font-bold text-slate-600 block mb-1">Critério: Sugestões de Melhorias</span>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{existingSubmission.sugestoes_melhoria}</p>
                    </div>
                  )}
                  {existingSubmission.criticas_construtivas && (
                    <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg">
                      <span className="text-xs font-bold text-slate-600 block mb-1">Critério: Críticas Construtivas</span>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{existingSubmission.criticas_construtivas}</p>
                    </div>
                  )}
                  {existingSubmission.elogios && (
                    <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg">
                      <span className="text-xs font-bold text-slate-600 block mb-1">Critério: Elogios</span>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{existingSubmission.elogios}</p>
                    </div>
                  )}
                  {existingSubmission.necessidades_novos_cursos && (
                    <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg">
                      <span className="text-xs font-bold text-slate-600 block mb-1">Critério: Necessidades de Novos Cursos</span>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{existingSubmission.necessidades_novos_cursos}</p>
                    </div>
                  )}
                  {existingSubmission.comentarios_adicionais && (
                    <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg">
                      <span className="text-xs font-bold text-slate-600 block mb-1">Comentários Adicionais</span>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{existingSubmission.comentarios_adicionais}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Signature Validation Footer */}
            <div className="border-t pt-8 mt-12 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50 p-4 rounded-lg print:bg-white print:border-slate-300">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-10 w-10 text-emerald-600" />
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Assinatura Eletrônica Confirmada</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Enviado e gravado no histórico acadêmico permanente.</p>
                </div>
              </div>
              <div className="border-l pl-4 font-mono text-center md:text-right print:border-l-0">
                <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Chave da Assinatura</span>
                <p className="text-xs font-semibold text-slate-700 mt-1">{existingSubmission.assinatura_digital || "Não disponível"}</p>
                <p className="text-[10px] text-slate-400 mt-1">Data: {new Date(existingSubmission.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>

            <div className="text-center text-slate-400 text-xs mt-12 hidden print:block">
              <p>Escola Digital Mil-Acadêmica - Impresso via portal acadêmico do aluno</p>
            </div>
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
            <h3 className="font-bold border-b pb-1 uppercase text-slate-800 text-[11px]">1. Identificação Acadêmica</h3>
            <div className="grid grid-cols-2 gap-y-4 gap-x-6">
              <div>
                <span className="block font-bold text-slate-500 uppercase text-[9px]">Nome do Aluno:</span>
                <p className="text-xs font-semibold text-slate-900 mt-1 border-b border-dashed border-slate-400 pb-0.5 h-5">
                  {studentDetails?.nome || ""}
                </p>
              </div>
              <div>
                <span className="block font-bold text-slate-500 uppercase text-[9px]">Posto / Graduação:</span>
                <p className="text-xs font-semibold text-slate-900 mt-1 border-b border-dashed border-slate-400 pb-0.5 h-5">
                  {studentDetails?.posto_graduacao || ""}
                </p>
              </div>
              <div>
                <span className="block font-bold text-slate-500 uppercase text-[9px]">Organização Militar (OM):</span>
                <p className="text-xs font-semibold text-slate-900 mt-1 border-b border-dashed border-slate-400 pb-0.5 h-5">
                  {studentDetails?.om || ""}
                </p>
              </div>
              <div>
                <span className="block font-bold text-slate-500 uppercase text-[9px]">Curso Realizado:</span>
                <p className="text-xs font-semibold text-slate-900 mt-1 border-b border-dashed border-slate-400 pb-0.5 h-5">
                  {studentDetails?.turma?.curso?.nome || ""}
                </p>
              </div>
              <div>
                <span className="block font-bold text-slate-500 uppercase text-[9px]">Turma:</span>
                <p className="text-xs font-semibold text-slate-900 mt-1 border-b border-dashed border-slate-400 pb-0.5 h-5">
                  {studentDetails?.turma?.nome || ""}
                </p>
              </div>
              <div>
                <span className="block font-bold text-slate-500 uppercase text-[9px]">Instrutor Coordenador:</span>
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
                    <td className="border border-slate-300 p-1.5">{idx + 1}. {q.label}</td>
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
                    <td className="border border-slate-300 p-1.5">{idx + 1}. {q.label}</td>
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
                    <td className="border border-slate-300 p-1.5">{idx + 1}. {q.label}</td>
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
                    <td className="border border-slate-300 p-1.5">{idx + 1}. {q.label}</td>
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
            <h3 className="font-bold text-xs uppercase bg-slate-105 p-2 border border-slate-300 rounded font-sans">6. Comentários, Críticas e Elogios</h3>
            
            <div className="space-y-4 font-sans text-xs">
              <div>
                <span className="font-bold block mb-1">A. Sugestões de Melhorias Pedagógicas ou Administrativas:</span>
                <div className="border border-slate-300 h-16 w-full rounded"></div>
              </div>
              
              <div>
                <span className="font-bold block mb-1">B. Críticas Construtivas Importantes:</span>
                <div className="border border-slate-300 h-16 w-full rounded"></div>
              </div>

              <div>
                <span className="font-bold block mb-1">C. Elogios em Destaque (Curso, Docência, Organização):</span>
                <div className="border border-slate-300 h-16 w-full rounded"></div>
              </div>

              <div>
                <span className="font-bold block mb-1">D. Temas Relevantes Sugeridos para Novos Cursos:</span>
                <div className="border border-slate-300 h-16 w-full rounded"></div>
              </div>

              <div>
                <span className="font-bold block mb-1">E. Comentários Complementares Adicionais:</span>
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
          {[1, 2, 3, 4, 5].map((step) => (
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
              {step}
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
                    <p className="text-sm font-bold text-slate-800 mb-3 font-medium">
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
                                ? "bg-slate-900 text-white border-slate-900 font-semibold shadow-md scale-102"
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <span className="block text-[11px] leading-tight font-medium break-words leading-none">{opt.label}</span>
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
                    <p className="text-sm font-bold text-slate-800 mb-3">
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
                                ? "bg-slate-900 text-white border-slate-900 font-semibold shadow-md scale-102"
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <span className="block text-[11px] leading-tight font-medium break-words leading-none">{opt.label}</span>
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
                      <p className="text-sm font-bold text-slate-800 mb-3">
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
                                  ? "bg-slate-900 text-white border-slate-900 font-semibold shadow-md scale-102"
                                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              <span className="block text-[11px] leading-tight font-medium break-words leading-none">{opt.label}</span>
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
                  <h2 className="text-base font-bold text-slate-900 font-mono">4. Infraestrutura e Recursos</h2>
                </div>

                <div className="space-y-6">
                  {INFRA_QUESTIONS.map((q, idx) => (
                    <div key={q.key} className="border-b pb-6 last:border-b-0">
                      <p className="text-sm font-bold text-slate-800 mb-3">
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
                                  ? "bg-slate-900 text-white border-slate-900 font-semibold shadow-md scale-102"
                                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              <span className="block text-[11px] leading-tight font-medium break-words leading-none">{opt.label}</span>
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
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 font-mono">Sugestões de Melhoria</label>
                  <textarea 
                    value={comments.sugestoes_melhoria}
                    onChange={(e) => handleCommentChange('sugestoes_melhoria', e.target.value)}
                    placeholder="Quais sugestões você daria para aprimorar esse curso?"
                    className="w-full border border-slate-200 rounded-lg p-3 text-xs focus:ring-2 focus:ring-slate-900/10 focus:outline-none min-h-[80px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 font-mono">Críticas Construtivas</label>
                  <textarea 
                    value={comments.criticas_construtivas}
                    onChange={(e) => handleCommentChange('criticas_construtivas', e.target.value)}
                    placeholder="Quais pontos cruciais do curso deveriam ser revistos ou corrigidos?"
                    className="w-full border border-slate-200 rounded-lg p-3 text-xs focus:ring-2 focus:ring-slate-900/10 focus:outline-none min-h-[80px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 font-mono font-mono">Elogios</label>
                  <textarea 
                    value={comments.elogios}
                    onChange={(e) => handleCommentChange('elogios', e.target.value)}
                    placeholder="Quais foram os principais pontos fortes deste curso?"
                    className="w-full border border-slate-200 rounded-lg p-3 text-xs focus:ring-2 focus:ring-slate-900/10 focus:outline-none min-h-[80px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 font-mono">Necessidade de Novos Cursos</label>
                  <textarea 
                    value={comments.necessidades_novos_cursos}
                    onChange={(e) => handleCommentChange('necessidades_novos_cursos', e.target.value)}
                    placeholder="Indique novos temas ou disciplinas que você gostaria de realizar futuramente."
                    className="w-full border border-slate-200 rounded-lg p-3 text-xs focus:ring-2 focus:ring-slate-900/10 focus:outline-none min-h-[80px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 font-mono">Comentários Adicionais</label>
                  <textarea 
                    value={comments.comentarios_adicionais}
                    onChange={(e) => handleCommentChange('comentarios_adicionais', e.target.value)}
                    placeholder="Alguma consideração final?"
                    className="w-full border border-slate-200 rounded-lg p-3 text-xs focus:ring-2 focus:ring-slate-900/10 focus:outline-none min-h-[80px]"
                  />
                </div>
              </div>

              {/* Signature Field */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 mt-8 space-y-4">
                <div className="flex items-center gap-2 text-slate-800 font-bold mb-2">
                  <Signature className="h-5 w-5 text-slate-800" />
                  <span className="font-mono text-sm uppercase font-semibold">Assinatura Eletrônica</span>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  Para assinar digitalmente e confirmar o preenchimento desta avaliação, por favor, insira abaixo seu nome completo exatamente conforme cadastrado. Seu voto é rastreável e auditável pelas instâncias gerenciais.
                </p>

                <div className="space-y-3">
                  <input
                    type="text"
                    required
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    placeholder="Digite seu nome completo para assinar..."
                    className="w-full border border-slate-350 rounded-lg p-3 text-xs bg-white focus:ring-2 focus:ring-slate-900/20 font-bold uppercase"
                  />
                  
                  <label className="flex items-start gap-2 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-0.5 rounded border-slate-350 text-slate-900 focus:ring-slate-900"
                    />
                    <span className="text-[11px] text-slate-600 leading-tight">
                      Declaro sob responsabilidade acadêmica e estatutos regulamentares que respondi honestamente a este questionário pós-conclusão de curso para fins pedagógicos.
                    </span>
                  </label>
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
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 bg-slate-910 hover:bg-slate-950 text-white text-xs font-bold px-6 py-3 rounded-lg shadow-sm transition-all duration-300 transform font-semibold hover:shadow cursor-pointer disabled:opacity-50"
              >
                {submitting ? "Gravando respostas..." : "Assinar e Enviar Questionário"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        )}
      </div>
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
