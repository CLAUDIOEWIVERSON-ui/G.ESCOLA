'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  BookMarked, 
  Search, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Compass, 
  Layers, 
  FileText, 
  Users, 
  Calendar, 
  CalendarDays, 
  BookOpen, 
  Library, 
  FileCheck, 
  Link2, 
  Settings, 
  LayoutDashboard, 
  Printer, 
  Sparkles, 
  ShieldCheck, 
  GraduationCap, 
  Clock, 
  ChevronRight, 
  ChevronDown, 
  Award, 
  Shield, 
  Activity, 
  ExternalLink,
  Target,
  ArrowRight,
  UserCheck,
  Building,
  Lock,
  Workflow
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { useUser } from '@/lib/auth/UserContext';

export default function ManualGuiaPage() {
  const { language } = useI18n();
  const isPt = language === 'pt';
  const { profile } = useUser();
  const userRole = (profile?.role || 'aluno').toLowerCase();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'origem' | 'recomendacoes' | 'modulos' | 'possibilidades' | 'faq'>('origem');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'all' | 'admin' | 'instrutor' | 'aluno' | 'convidado'>('all');
  const [expandedModules, setExpandedModules] = useState<string[]>([
    'dashboard', 'turmas', 'boletim', 'frequencia', 'horario'
  ]);
  const [expandedFaqs, setExpandedFaqs] = useState<number[]>([0, 1]);

  const toggleModule = (id: string) => {
    setExpandedModules(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const expandAllModules = () => {
    setExpandedModules([
      'dashboard', 'cursos', 'turmas', 'boletim', 'horario', 
      'frequencia', 'calendario', 'avaliacao', 'relatorio-avaliacao', 
      'usuarios', 'links', 'configuracoes'
    ]);
  };

  const collapseAllModules = () => {
    setExpandedModules([]);
  };

  const toggleFaq = (index: number) => {
    setExpandedFaqs(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  // Modules Documentation Data
  const modulesList = useMemo(() => [
    {
      id: 'dashboard',
      path: '/dashboard',
      name: isPt ? 'Dashboard Principal' : 'Main Dashboard',
      icon: LayoutDashboard,
      color: 'blue',
      badge: isPt ? 'Visão Geral & Indicadores' : 'Overview & Metrics',
      targetRoles: ['admin', 'instrutor', 'aluno', 'convidado'],
      description: isPt 
        ? 'Painel de controle unificado que reúne indicadores globais, status de turmas em tempo real, letreiro de eventos, relógio militar sincronizado e atalhos rápidos de navegação.'
        : 'Unified control panel combining global indicators, real-time class statuses, event ticker marquee, synchronized military clock, and quick navigation shortcuts.',
      features: isPt ? [
        'Indicadores de turmas por categoria: Cursos de Carreira, Expedito, Especiais, EaD, Alunos no Exterior, Pré-Inscritas e Arquivadas.',
        'Relógio militar institucional sincronizado com fuso e dados oficiais.',
        'Letreiro eletrônico de eventos com notícias, prazos acadêmicos e cerimônias.',
        'Monitor de acessos simultâneos ativos em tempo real (para administradores).',
        'Visualização detalhada da ficha do aluno e atalhos diretos para os módulos.'
      ] : [
        'Class indicators by category: Career Courses, Expedito, Special, EaD, Students Abroad, Pre-enrolled, and Archived.',
        'Institutional military clock synchronized with official timing.',
        'Electronic event marquee displaying news, deadlines, and ceremonies.',
        'Real-time active concurrent accesses monitor (for administrators).',
        'Detailed student record view and quick shortcuts to all modules.'
      ],
      possibilities: isPt ? [
        'Filtragem rápida de turmas ao clicar nos cards de contagem.',
        'Exportação da relação de alunos no exterior em PDF oficial.',
        'Acompanhamento do ciclo de vida das turmas em andamento.'
      ] : [
        'Quick class filtering by clicking on count cards.',
        'Exporting list of students abroad to official PDF.',
        'Tracking lifecycle of classes currently underway.'
      ],
      recommendations: isPt 
        ? 'Utilize o Dashboard como ponto de partida diário para identificar turmas que exigem atenção, prazos próximos e o volume de alunos conectados.'
        : 'Use the Dashboard as your daily starting point to spot classes needing attention, upcoming deadlines, and active connected users.'
    },
    {
      id: 'cursos',
      path: '/cursos',
      name: isPt ? 'Catálogo de Cursos' : 'Course Catalog',
      icon: BookOpen,
      color: 'amber',
      badge: isPt ? 'Matrizes Curriculares' : 'Curricular Frameworks',
      targetRoles: ['admin', 'convidado'],
      description: isPt 
        ? 'Módulo estruturante para definição de cursos, ementas, cargas horárias normativas e matrizes de disciplinas que serão herdadas pelas turmas.'
        : 'Structural module for defining courses, syllabi, normative workloads, and subject frameworks inherited by class cohorts.',
      features: isPt ? [
        'Cadastro completo de novos cursos com código identificador e sigla oficial.',
        'Definição da carga horária em dias ou semanas letivas.',
        'Configuração da modalidade (Presencial, EaD, Especial, Expedito, Carreira).',
        'Associação de disciplinas curriculares e pesos avaliativos.',
        'Edição, consulta e gerenciamento do acervo de cursos cadastrados.'
      ] : [
        'Full registration of new courses with code identifier and official acronym.',
        'Workload definition in academic days or weeks.',
        'Modality settings (In-person, EaD, Special, Expedito, Career).',
        'Association of curricular subjects and grading weights.',
        'Editing, searching, and managing course inventory.'
      ],
      possibilities: isPt ? [
        'Padronização de disciplinas para que turmas do mesmo curso sigam critérios uniformes de aprovação e carga horária.',
        'Facilidade para reaproveitar matrizes curriculares consolidadas.'
      ] : [
        'Standardization of subjects ensuring all classes of a course follow identical passing criteria and workloads.',
        'Easy reusability of established curricular frameworks.'
      ],
      recommendations: isPt 
        ? 'Cadastre o curso e todas as suas disciplinas antes de criar a turma, garantindo que o boletim e a grade horária sejam carregados perfeitamente.'
        : 'Register the course and all its subjects before creating the class cohort, ensuring gradebooks and schedules load accurately.'
    },
    {
      id: 'turmas',
      path: '/turmas',
      name: isPt ? 'Turmas & Alunos' : 'Classes & Students',
      icon: Library,
      color: 'emerald',
      badge: isPt ? 'Gestão Acadêmica Central' : 'Core Academic Management',
      targetRoles: ['admin', 'instrutor', 'convidado'],
      description: isPt 
        ? 'Coração operacional do sistema: abertura de turmas, matrículas, designação de instrutores titulares e substitutos, fotos cadastrais e controle de status do curso.'
        : 'Operational core of the system: class cohort creation, student enrollments, assignment of lead and substitute instructors, student photos, and course status tracking.',
      features: isPt ? [
        'Criação de turmas com código único, período (data de início e fim) e instrutor responsável.',
        'Matrícula individual detalhada ou importação em lote via arquivo CSV/Excel.',
        'Gerenciamento de fotos dos alunos (suporte para fardas militares masculina/feminina e civil).',
        'Controle de status da turma: Em Andamento, Concluída, Cancelada ou Pré-Inscrita.',
        'Recurso de Postergação de Prazo e Liberação de Formulários de Avaliação pós-curso.',
        'Exportação da Ficha Completa da Turma em formato PDF para impressão oficial.'
      ] : [
        'Class cohort creation with unique code, period (start and end date), and instructor in charge.',
        'Detailed individual student enrollment or bulk import via CSV/Excel spreadsheet.',
        'Student profile photos management (supporting military male/female uniforms and civilian dress).',
        'Class status control: In Progress, Completed, Cancelled, or Pre-enrolled.',
        'Deadline postponement and release of post-course evaluation questionnaires.',
        'Export of complete class roster document to official printable PDF format.'
      ],
      possibilities: isPt ? [
        'Adição de alunos em lote com validação de dados em segundos.',
        'Postergação de data de conclusão para permitir entrega de trabalhos ou avaliações de recuperação.',
        'Liberação controlada do questionário de avaliação somente quando a turma estiver pronta para avaliação.'
      ] : [
        'Bulk student onboarding with instant spreadsheet validation in seconds.',
        'Postponing completion dates to accommodate late submissions or recovery exams.',
        'Controlled unlocking of student evaluation questionnaires once the cohort is ready.'
      ],
      recommendations: isPt 
        ? 'Ao encerrar uma turma, verifique se todas as notas e frequências foram lançadas antes de marcar como "Concluída". Para liberar a avaliação, ative a chave correspondente.'
        : 'Before closing a class, verify that all grades and attendance records are fully entered before marking as "Completed". Enable questionnaire toggle when appropriate.'
    },
    {
      id: 'boletim',
      path: '/boletim',
      name: isPt ? 'Boletim Escolar & Notas' : 'Report Cards & Grades',
      icon: FileText,
      color: 'sky',
      badge: isPt ? 'Avaliação & Registro de Notas' : 'Grading & Official Transcripts',
      targetRoles: ['admin', 'instrutor', 'aluno', 'convidado'],
      description: isPt 
        ? 'Controle minucioso de notas por disciplina e avaliação, cálculo automático de médias ponderadas, regras de recuperação, atas finais de encerramento e emissão de boletins em PDF.'
        : 'Detailed grade recording per subject and assessment, automatic weighted average calculation, recovery exam rules, final graduation records, and PDF report cards.',
      features: isPt ? [
        'Lançamento de notas por avaliação (P1, P2, Trabalhos, Exame Final, Recuperação).',
        'Cálculo automático da Média Final com base nos pesos configurados.',
        'Status acadêmico em tempo real: Aprovado, Em Recuperação, Reprovado por Nota ou Reprovado por Falta.',
        'Emissão de Boletim Individual com histórico do aluno e carimbo oficial.',
        'Geração da Ata Final Consolidada da Turma com assinaturas e brasão institucional.',
        'Visualização restrita e segura: alunos visualizam apenas seus próprios boletins.'
      ] : [
        'Grade entry per assessment component (Exams, Assignments, Final Exam, Recovery).',
        'Automatic final average computation based on configured weighting formulas.',
        'Real-time academic status: Passed, In Recovery, Failed by Grade, or Failed by Absence.',
        'Individual printable report cards with complete student history and official seal.',
        'Consolidated Final Class Minutes (Ata Final) generation with institutional crest and signature lines.',
        'Secure restricted access: students can only inspect their own personal grades.'
      ],
      possibilities: isPt ? [
        'Exportação de atas oficiais prontas para arquivamento e registro em pasta funcional militar.',
        'Recálculo dinâmico e automático ao editar qualquer avaliação.',
        'Impressão isolada de boletins sem elementos da barra de navegação do sistema.'
      ] : [
        'Official transcript and minutes export ready for military service record archiving.',
        'Dynamic instant recalculation upon modifying any assessment score.',
        'Isolated clean printing of transcripts without web navigation elements.'
      ],
      recommendations: isPt 
        ? 'Realize o fechamento das notas logo após a aplicação das provas. Certifique-se de preencher notas de recuperação caso a média inicial fique abaixo da nota de corte institucional.'
        : 'Submit grades promptly following examination periods. Ensure recovery exam scores are recorded if the initial average falls below the institutional cutoff threshold.'
    },
    {
      id: 'horario',
      path: '/horario',
      name: isPt ? 'Grade de Horários' : 'Class Schedules',
      icon: Calendar,
      color: 'cyan',
      badge: isPt ? 'Planejamento de Aulas' : 'Weekly Lesson Schedules',
      targetRoles: ['admin', 'instrutor', 'aluno', 'convidado'],
      description: isPt 
        ? 'Montagem e visualização da grade semanal e diária de aulas, alocação de disciplinas e instrutores com mecanismo inteligente de prevenção contra choques de horários.'
        : 'Building and viewing weekly and daily class timetables, subject and instructor allocations with smart collision detection against schedule conflicts.',
      features: isPt ? [
        'Quadro interativo por períodos diários e turnos (Manhã, Tarde e Noite).',
        'Detecção e alerta visual imediato contra choques de alocação de instrutores e salas.',
        'Filtro por turma, período e instrutor.',
        'Visualização limpa para alunos consultarem suas aulas da semana.',
        'Modo de impressão oficial da grade horária semanal da turma.'
      ] : [
        'Interactive timetable grid across daily periods and shifts (Morning, Afternoon, Evening).',
        'Instant collision detection and visual alerts preventing double-booking instructors or classrooms.',
        'Filtering by cohort, academic period, and assigned instructor.',
        'Clean schedule viewer for students to check their upcoming weekly classes.',
        'Official printable weekly timetable mode ready for classroom posting.'
      ],
      possibilities: isPt ? [
        'Planejamento antecipado de todo o semestre ou período de curso.',
        'Prevenção de sobrecarga ou designação simultânea do mesmo docente em turmas diferentes.'
      ] : [
        'Advance planning for full semesters or fast-track courses.',
        'Elimination of instructor double-bookings across concurrent cohorts.'
      ],
      recommendations: isPt 
        ? 'Sempre verifique se não há alertas de conflito de instrutores ao montar horários simultâneos de turmas em cursos de mesma janela letiva.'
        : 'Always check for collision warning indicators when scheduling concurrent cohorts sharing instructional staff.'
    },
    {
      id: 'frequencia',
      path: '/frequencia',
      name: isPt ? 'Controle de Frequência' : 'Attendance Tracking',
      icon: CalendarDays,
      color: 'purple',
      badge: isPt ? 'Presenças & Justificativas' : 'Attendance & Excused Absences',
      targetRoles: ['admin', 'instrutor', 'convidado'],
      description: isPt 
        ? 'Registro rigoroso da presença e ausência diária por aula/período, apuração percentual automática em relação à carga horária total e lançamento de justificativas legais.'
        : 'Rigorous daily tracking of attendance and absence per class period, automated percentage computation against total course hours, and logging excused absences.',
      features: isPt ? [
        'Chamada diária simples e rápida por data, turma e disciplina.',
        'Cálculo automático do percentual de infrequência e presenças acumuladas.',
        'Registro de justificativas médicas, ordens de serviço ou motivos de força maior.',
        'Alertas em destaque quando o aluno se aproxima do limite de faltas regulamentares (ex: 25%).',
        'Relatório consolidado de frequência por aluno e por turma para fins disciplinares.'
      ] : [
        'Simple, fast daily roll-call by date, cohort, and subject.',
        'Automated computation of absence percentages and accumulated attendance.',
        'Logging excused absences (medical certificates, official service orders, force majeure).',
        'Highlight alerts when a student approaches the regulatory absence threshold (e.g. 25%).',
        'Consolidated attendance reports per student and cohort for regulatory compliance.'
      ],
      possibilities: isPt ? [
        'Acompanhamento preventivo para evitar reprovações imprevistas por infrequência.',
        'Garantia de conformidade com normas marítimas e militares de presença mínima obrigatória.'
      ] : [
        'Preventive tracking to avoid unexpected failures due to excessive absence.',
        'Ensures strict compliance with maritime and military regulatory minimum attendance rules.'
      ],
      recommendations: isPt 
        ? 'Efetue a chamada diariamente no início ou término de cada instrução para manter os índices percentuais rigorosamente em dia.'
        : 'Conduct daily roll-calls at the start or finish of each instructional session to maintain precise, up-to-date records.'
    },
    {
      id: 'calendario',
      path: '/calendario',
      name: isPt ? 'Calendário Escolar' : 'Academic Calendar',
      icon: CalendarDays,
      color: 'rose',
      badge: isPt ? 'Cronograma & Eventos' : 'Timetable & Events',
      targetRoles: ['admin', 'instrutor', 'aluno', 'convidado'],
      description: isPt 
        ? 'Visão cronológica dos principais marcos do ano letivo: datas de início/término de turmas, feriados, recessos, cerimônias de formatura e semanas de exames.'
        : 'Chronological roadmap of key academic milestones: cohort start/end dates, holidays, recesses, graduation ceremonies, and examination periods.',
      features: isPt ? [
        'Navegação visual mensal, semanal e diária de eventos.',
        'Destaque para feriados nacionais e recessos acadêmicos.',
        'Sincronização com o letreiro (marquee) de avisos do topo do sistema.',
        'Filtro por tipo de evento e categoria institucional.'
      ] : [
        'Visual monthly, weekly, and daily event browsing.',
        'Highlighting national holidays and institutional recesses.',
        'Direct synchronization with top marquee ticker notices.',
        'Filtering by event category and institutional scope.'
      ],
      possibilities: isPt ? [
        'Planejamento de longo prazo para comando, instrutores e alunos.',
        'Comunicação visual clara sobre os compromissos acadêmicos do centro de instrução.'
      ] : [
        'Long-term operational planning for command, staff, and students.',
        'Clear visual communication regarding all instruction center commitments.'
      ],
      recommendations: isPt 
        ? 'Cadastre os feriados e datas de formaturas com antecedência para que a contagem de dias úteis e o letreiro informem a comunidade acadêmica.'
        : 'Register holidays and graduation dates well ahead so working days calculations and announcements remain accurate.'
    },
    {
      id: 'avaliacao',
      path: '/avaliacao',
      name: isPt ? 'Avaliação Pós-Curso' : 'Post-Course Evaluation',
      icon: FileCheck,
      color: 'emerald',
      badge: isPt ? 'Feedback dos Alunos' : 'Student Feedback',
      targetRoles: ['aluno', 'admin'],
      description: isPt 
        ? 'Questionário estruturado onde os alunos avaliam a qualidade da instrução, didática dos professores, infraestrutura das salas/laboratórios, material didático e coordenação.'
        : 'Structured questionnaire where students rate instructional quality, teaching methodology, classroom/lab infrastructure, didactic material, and course coordination.',
      features: isPt ? [
        'Formulário dinâmico com escala de satisfação padronizada (Ótimo, Bom, Regular, Insuficiente).',
        'Campos dissertativos para sugestões, elogios e críticas construtivas.',
        'Liberação controlada por turma (somente aberta após autorização da coordenação).',
        'Preenchimento ágil e intuitivo, totalmente compatível com celulares e computadores.'
      ] : [
        'Dynamic rating questionnaire with standardized satisfaction scale (Excellent, Good, Regular, Insufficient).',
        'Text fields for suggestions, positive feedback, and constructive critiques.',
        'Controlled unlocking per cohort (only accessible when authorized by course coordinator).',
        'Fast and intuitive form submission, fully optimized for both mobile devices and desktops.'
      ],
      possibilities: isPt ? [
        'Coleta de feedbacks autênticos para melhoria contínua da qualidade do ensino.',
        'Auditoria da experiência do aluno para aperfeiçoamento das próximas turmas.'
      ] : [
        'Gathering authentic feedback for continuous instructional quality improvement.',
        'Student experience audits to refine upcoming cohort curricula and facilities.'
      ],
      recommendations: isPt 
        ? 'Alunos devem responder a avaliação com sinceridade e detalhes nas observações, pois os dados são essenciais para o aprimoramento pedagógico.'
        : 'Students should provide honest and detailed feedback, as responses are vital for pedagogical and logistical enhancement.'
    },
    {
      id: 'relatorio-avaliacao',
      path: '/relatorio-avaliacao',
      name: isPt ? 'Análise de Avaliações' : 'Evaluation Analytics',
      icon: FileCheck,
      color: 'violet',
      badge: isPt ? 'Indicadores de Qualidade & NPS' : 'Quality Metrics & NPS',
      targetRoles: ['admin', 'instrutor', 'convidado'],
      description: isPt 
        ? 'Painel analítico executivo que consolida os resultados dos questionários de avaliação pós-curso com médias, gráficos, índices de satisfação e relatórios para auditoria.'
        : 'Executive analytics dashboard consolidating post-course survey results with weighted averages, charts, satisfaction indices, and audit-ready reports.',
      features: isPt ? [
        'Consolidação de médias gerais e por dimensão avaliada (Instrutor, Conteúdo, Instalações, Coordenação).',
        'Gráficos comparativos de satisfação e taxa de participação dos alunos.',
        'Listagem de comentários e sugestões qualitativas registradas pela turma.',
        'Exportação de relatórios gerenciais em PDF para apresentação ao comando e coordenação de ensino.'
      ] : [
        'Consolidated overall scores and dimension-specific ratings (Instructor, Content, Facilities, Coordination).',
        'Comparative satisfaction charts and student participation rate statistics.',
        'Listing of qualitative commentary and suggestions provided by the cohort.',
        'Exporting management reports to PDF for presentation to leadership and training boards.'
      ],
      possibilities: isPt ? [
        'Identificação rápida de pontos fortes e oportunidades de capacitação docente ou reformas de infraestrutura.',
        'Comprovação de padrões de qualidade para órgãos certificadores marítimos e militares.'
      ] : [
        'Quick identification of standout instructional strengths and facility enhancement opportunities.',
        'Proof of quality standards for naval, maritime, and educational accrediting authorities.'
      ],
      recommendations: isPt 
        ? 'Emita o relatório analítico logo após o fechamento da turma e utilize as notas para planejar a escala dos próximos cursos.'
        : 'Generate the analytical report right after cohort completion and utilize the metrics to optimize upcoming instructional assignments.'
    },
    {
      id: 'usuarios',
      path: '/usuarios',
      name: isPt ? 'Gestão de Usuários & Acessos' : 'Users & Access Control',
      icon: Users,
      color: 'fuchsia',
      badge: isPt ? 'Segurança & RBAC' : 'Security & RBAC',
      targetRoles: ['admin', 'convidado'],
      description: isPt 
        ? 'Administração de contas de acesso, perfis de permissão (Administrador, Instrutor, Aluno, Convidado), monitoramento de usuários online e desconexão de sessões.'
        : 'Management of user accounts, permission roles (Admin, Instructor, Student, Guest), live online user tracking, and active session termination.',
      features: isPt ? [
        'Criação, edição e redefinição de senhas de usuários.',
        'Sincronização automática de contas de alunos a partir dos cadastros de turmas.',
        'Controle baseado em funções (RBAC) com isolamento estrito de dados e telas.',
        'Indicador visual em tempo real de usuários conectados.',
        'Filtro rápido para listar apenas usuários que estão navegando no momento.'
      ] : [
        'Creation, modification, and password resets for user accounts.',
        'Automated synchronization of student accounts derived from class enrollments.',
        'Role-Based Access Control (RBAC) guaranteeing strict data and screen boundaries.',
        'Real-time visual status indicator for currently connected users.',
        'Quick filter to immediately display users actively online in the system.'
      ],
      possibilities: isPt ? [
        'Gerenciamento seguro de quem acessa cada setor da plataforma.',
        'Desconexão forçada de sessões suspeitas ou inativas através do monitor simultâneo.'
      ] : [
        'Secure governance over authorization tiers across all application areas.',
        'Forced termination of stale or suspicious sessions via the concurrent access monitor.'
      ],
      recommendations: isPt 
        ? 'Mantenha as senhas fortes e garanta que cada instrutor e aluno utilize seu próprio usuário para preservar a rastreabilidade das operações.'
        : 'Maintain strong credentials and ensure each instructor and student operates via their dedicated personal account to preserve traceability.'
    },
    {
      id: 'links',
      path: '/links',
      name: isPt ? 'Links Úteis & Documentos' : 'Useful Links & Portals',
      icon: Link2,
      color: 'teal',
      badge: isPt ? 'Repositório de Apoio' : 'Resource Directory',
      targetRoles: ['admin', 'instrutor', 'aluno', 'convidado'],
      description: isPt 
        ? 'Diretório centralizado de atalhos e links externos para normas regulamentadoras, bibliotecas virtuais, manuais técnicos e sistemas complementares da instituição.'
        : 'Centralized directory of bookmarks and external links for regulatory standards, digital libraries, technical handbooks, and institutional portals.',
      features: isPt ? [
        'Cadastro categorizado de links externos com títulos e descrições explicativas.',
        'Acesso rápido em nova aba com proteção de segurança.',
        'Organização por áreas de interesse (Regulamentos, Portais Militares, Material Didático).'
      ] : [
        'Categorized bookmarks with descriptive titles and explanatory summaries.',
        'Quick safe opening in new tabs with modern security attributes.',
        'Organized by domain (Regulations, Naval Portals, Educational Resources).'
      ],
      possibilities: isPt ? [
        'Disponibilização ágil de referências normativas e bibliográficas para todo o corpo discente e docente.'
      ] : [
        'Rapid distribution of reference documentation and bibliography to instructors and trainees.'
      ],
      recommendations: isPt 
        ? 'Utilize esta seção para disponibilizar links institucionais oficiais, como portais da Marinha, DPC, CIAGA e manuais operacionais.'
        : 'Leverage this directory to host official institutional links, such as naval portals, maritime directories, and official handbooks.'
    },
    {
      id: 'configuracoes',
      path: '/configuracoes',
      name: isPt ? 'Configurações do Sistema' : 'System Settings',
      icon: Settings,
      color: 'indigo',
      badge: isPt ? 'Parâmetros & Identidade' : 'Parameters & Identity',
      targetRoles: ['admin', 'convidado'],
      description: isPt 
        ? 'Personalização da identidade institucional (nome da escola, brasão oficial), parâmetros de notas de corte, pesos de avaliação, temas e idioma de exibição.'
        : 'Customization of institutional branding (school name, official crest), passing score parameters, grading formula weights, themes, and system language.',
      features: isPt ? [
        'Upload do brasão ou logotipo oficial exibido nos relatórios e cabeçalhos.',
        'Definição do nome oficial da Organização Militar ou Instituição de Ensino.',
        'Configuração de nota mínima para aprovação e regras de recuperação.',
        'Alternância entre Português e Inglês com persistência de preferência.',
        'Opções de tema visual (Claro / Escuro) para conforto visual do operador.'
      ] : [
        'Upload of official crest or logo rendered in reports and document headers.',
        'Customization of official institution or Military Organization name.',
        'Configuring minimum passing grade thresholds and recovery exam formulas.',
        'Language switching between Portuguese and English with persistent preference.',
        'Visual theme options (Light / Dark) for optimal operator comfort.'
      ],
      possibilities: isPt ? [
        'Adequação total da plataforma à identidade visual e às diretrizes pedagógicas de qualquer unidade de ensino.'
      ] : [
        'Complete alignment of the platform with institutional visual branding and instructional policies.'
      ],
      recommendations: isPt 
        ? 'Realize a configuração da média mínima e do brasão logo na implantação da plataforma, para que todos os boletins e atas emitidos reflitam a identidade correta.'
        : 'Configure passing thresholds and the institutional crest at initial setup so all emitted certificates and minutes display accurate branding.'
    }
  ], [isPt]);

  // Filter modules based on search and role
  const filteredModules = useMemo(() => {
    return modulesList.filter(mod => {
      const matchesSearch = searchTerm === '' || 
        mod.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mod.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mod.features.some(f => f.toLowerCase().includes(searchTerm.toLowerCase())) ||
        mod.possibilities.some(p => p.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesRole = selectedRoleFilter === 'all' || mod.targetRoles.includes(selectedRoleFilter);

      return matchesSearch && matchesRole;
    });
  }, [modulesList, searchTerm, selectedRoleFilter]);

  // Frequently Asked Questions
  const faqs = useMemo(() => [
    {
      q: isPt 
        ? 'Qual é o fluxo correto para iniciar uma nova turma no sistema?' 
        : 'What is the correct workflow to start a new class in the system?',
      a: isPt 
        ? 'O fluxo padrão recomendado consiste em 4 etapas: 1) Certifique-se de que o curso já está cadastrado no módulo "Cursos"; 2) Acesse "Turmas", crie a nova turma definindo o código, datas e instrutor; 3) Cadastre ou importe os alunos em lote na turma; 4) Configure a grade de horários semanal no módulo "Grade de Horários".'
        : 'The recommended standard workflow consists of 4 steps: 1) Verify the course is registered in the "Courses" module; 2) Go to "Classes", create the new cohort with its code, dates, and instructor; 3) Enroll or bulk import students; 4) Build the weekly schedule in the "Class Schedules" module.'
    },
    {
      q: isPt 
        ? 'Por que um aluno não consegue visualizar o formulário de Avaliação Pós-Curso?' 
        : 'Why is a student unable to see the Post-Course Evaluation form?',
      a: isPt 
        ? 'O formulário de avaliação permanece bloqueado por padrão para evitar preenchimento precoce. Para que o aluno possa responder, o Administrador ou Instrutor responsável deve acessar a turma em "Turmas" e ativar o botão "Liberar Formulários de Avaliação". Além disso, a turma não pode estar cancelada.'
        : 'The evaluation form is locked by default to prevent early submissions. For students to access it, the Administrator or Instructor must open the cohort in "Classes" and toggle the "Release Evaluation Forms" switch. Also, the class cohort must not be marked as cancelled.'
    },
    {
      q: isPt 
        ? 'Como funciona a detecção e prevenção de choque de horários de instrutores?' 
        : 'How does instructor schedule collision detection work?',
      a: isPt 
        ? 'Ao agendar uma aula no módulo "Grade de Horários", o sistema verifica em tempo real se o instrutor selecionado já possui outra aula no mesmo dia e horário em qualquer outra turma cadastrada. Caso haja conflito, um alerta em vermelho é exibido imediatamente, impedindo a sobreposição inadvertida.'
        : 'When scheduling a lesson in "Class Schedules", the system verifies in real time if the selected instructor already has an active lesson scheduled at that exact day and time slot in another cohort. If a conflict exists, a red warning is shown immediately, preventing inadvertent overlap.'
    },
    {
      q: isPt 
        ? 'Como é calculado o percentual de infrequência e quando o aluno é reprovado por falta?' 
        : 'How is the absence percentage calculated and when does a student fail due to attendance?',
      a: isPt 
        ? 'O módulo "Frequência" contabiliza a soma de faltas não justificadas e compara com a carga horária total do curso ou disciplina. A legislação e normas militares/marítimas normalmente estipulam o limite máximo de 25% de faltas. O sistema exibe um alerta preventivo em amarelo quando o aluno se aproxima da margem e em vermelho quando ultrapassa o limite regulamentar.'
        : 'The "Attendance" module tallies unexcused absences and calculates their proportion against total required course hours. Regulatory standards typically specify a maximum absence limit of 25%. The system displays a yellow warning as the student approaches this threshold, and a red alert if the regulatory limit is exceeded.'
    },
    {
      q: isPt 
        ? 'Como emitir a Ata Final da Turma e os Boletins Oficiais em formato PDF?' 
        : 'How do I generate the Final Class Minutes and Official Transcripts in PDF format?',
      a: isPt 
        ? 'No módulo "Boletim Escolar", selecione a turma desejada. Após validar todas as notas lançadas, clique no botão "Ata Final da Turma" no topo da tela para gerar o documento oficial com brasão, médias consolidadas e campos para assinatura da banca/instrutores. Para boletins individuais, utilize o botão de impressão ao lado de cada aluno.'
        : 'In the "Report Cards" module, select the desired cohort. Once all grades are entered and verified, click the "Final Class Minutes" button at the top to generate the official document with crest, consolidated averages, and signature lines. For individual transcripts, click the print icon next to the student.'
    },
    {
      q: isPt 
        ? 'O que significa o indicador de Acessos Simultâneos no topo da barra de navegação?' 
        : 'What does the Concurrent Accesses indicator in the top navbar mean?',
      a: isPt 
        ? 'Exibido para administradores, esse indicador rastreia conexões e abas ativas em tempo real no servidor. Clicando sobre ele, abre-se um painel de auditoria que lista as pessoas online, páginas navegadas, tipo de dispositivo (Desktop, Tablet, Mobile) e permite desconectar sessões individualmente se necessário.'
        : 'Visible to administrators, this indicator monitors active connections and open browser tabs in real time. Clicking it opens a live audit modal showing connected accounts, current pages, device types (Desktop, Tablet, Mobile), and allows individual session termination if needed.'
    }
  ], [isPt]);

  const handlePrintManual = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
      {/* HEADER SECTION */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden print:bg-white print:text-black print:p-2 print:shadow-none print:rounded-none">
        {/* Subtle Background Glow */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <BookMarked size={14} className="text-amber-400" />
                {isPt ? 'Módulo Fixo Normativo' : 'Fixed Normative Module'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-slate-200 border border-white/10">
                <ShieldCheck size={14} className="text-emerald-400" />
                {isPt ? 'Somente Instrução • Guia Oficial' : 'Instructional Only • Official Guide'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white print:text-slate-900">
              {isPt ? 'Manual do Sistema & Recomendações de Uso' : 'System Manual & Operational Guide'}
            </h1>

            <p className="text-sm sm:text-base text-slate-300 print:text-slate-700 leading-relaxed">
              {isPt 
                ? 'Diretrizes oficiais, propósito da plataforma, manual funcional completo de cada módulo e boas práticas recomendadas para garantir a eficiência, confiabilidade e segurança dos registros acadêmicos e militares.'
                : 'Official guidelines, institutional purpose, comprehensive functional manual for each module, and best practices to ensure efficiency, reliability, and security of academic and military records.'}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-3 shrink-0 print:hidden">
            <button
              onClick={handlePrintManual}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs shadow-md transition-all cursor-pointer active:scale-95"
              title={isPt ? 'Imprimir ou Salvar Manual em PDF' : 'Print or Save Manual as PDF'}
            >
              <Printer size={16} className="text-slate-700" />
              <span>{isPt ? 'Imprimir Manual' : 'Print Manual'}</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Banner inside Header */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10 print:hidden text-xs">
          <div className="flex items-center gap-2.5 text-slate-300">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-amber-400">
              <Building size={16} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">{isPt ? 'Finalidade' : 'Purpose'}</p>
              <p className="font-semibold text-white">{isPt ? 'Gestão Integrada' : 'Integrated Mgmt'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-slate-300">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-blue-400">
              <Layers size={16} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">{isPt ? 'Total de Módulos' : 'Total Modules'}</p>
              <p className="font-semibold text-white">{modulesList.length} {isPt ? 'Módulos' : 'Modules'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-slate-300">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-emerald-400">
              <ShieldCheck size={16} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">{isPt ? 'Perfis de Acesso' : 'Access Roles'}</p>
              <p className="font-semibold text-white">4 {isPt ? 'Níveis (RBAC)' : 'Tiers (RBAC)'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-slate-300">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-purple-400">
              <Workflow size={16} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">{isPt ? 'Conformidade' : 'Compliance'}</p>
              <p className="font-semibold text-white">{isPt ? 'Normas Militares' : 'Military Standards'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* TOP NAVIGATION TABS */}
      <div className="flex items-center gap-2 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-x-auto print:hidden">
        {[
          { id: 'origem', label: isPt ? 'Propósito & Criação' : 'Purpose & Creation', icon: Target },
          { id: 'recomendacoes', label: isPt ? 'Recomendações de Uso' : 'Usage Best Practices', icon: Sparkles },
          { id: 'modulos', label: isPt ? `Manual dos Módulos (${modulesList.length})` : `Modules Manual (${modulesList.length})`, icon: Layers },
          { id: 'possibilidades', label: isPt ? 'Possibilidades & Recursos' : 'Features & Capabilities', icon: Compass },
          { id: 'faq', label: isPt ? 'Perguntas Frequentes' : 'FAQ & Help', icon: HelpCircle },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                isActive
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              <Icon size={16} className={cn(isActive ? "text-amber-400" : "text-slate-500")} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: PROPÓSITO & PARA QUE FOI CRIADO */}
      {activeTab === 'origem' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Main Card: Why it was created */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shrink-0 shadow-xs">
                <Target size={24} />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {isPt ? 'Para Que o Sistema Foi Criado?' : 'Why Was the System Created?'}
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  {isPt 
                    ? 'Missão central, objetivos estratégicos e contexto operacional da plataforma' 
                    : 'Core mission, strategic objectives, and operational background of the platform'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm leading-relaxed text-slate-700">
              <div className="space-y-3 p-5 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                <h3 className="font-bold text-slate-900 flex items-center gap-2 text-base">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  {isPt ? 'Centralização e Fim das Planilhas Dispersas' : 'Centralization & Elimination of Dispersed Spreadsheets'}
                </h3>
                <p>
                  {isPt 
                    ? 'Historicamente, centros de instrução e organizações de ensino lidavam com registros descentralizados: planilhas avulsas para frequências, arquivos isolados para notas de avaliações, quadros físicos para horários e formulários impressos para avaliações pós-curso.'
                    : 'Historically, training centers and instructional facilities managed decentralized records: scattered spreadsheets for attendance, isolated files for exam grades, physical boards for schedules, and paper forms for post-course evaluations.'}
                </p>
                <p>
                  {isPt 
                    ? 'Este sistema foi criado com o propósito de unificar todo o ciclo de vida acadêmico em uma única base de dados relacional e segura, eliminando duplicidade de digitação, riscos de perda documental e retrabalho.'
                    : 'This system was built to unify the entire academic lifecycle into a single secure relational database, eliminating duplicate data entry, risks of document loss, and administrative friction.'}
                </p>
              </div>

              <div className="space-y-3 p-5 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                <h3 className="font-bold text-slate-900 flex items-center gap-2 text-base">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  {isPt ? 'Rigor Normativo e Documentação Oficial' : 'Regulatory Rigor & Official Document Standards'}
                </h3>
                <p>
                  {isPt 
                    ? 'O treinamento militar e marítimo exige comprovação documental estrita perante diretorias de ensino, capitanias e auditorias internacionais (como a IMO e normas da DPC). O sistema produz relatórios padronizados, boletins com validade legal e atas oficiais de conclusão com assinaturas e brasão institucional.'
                    : 'Military and maritime instruction requires strict document compliance with training directorates, coast guard authorities, and international auditing bodies (e.g. IMO and naval standards). The system produces standardized reports, official report cards, and signed graduation minutes.'}
                </p>
                <p>
                  {isPt 
                    ? 'Garante-se o cumprimento rigoroso dos limites regulamentares de frequência (teto de faltas) e o cálculo matemático automatizado e auditável das médias ponderadas.'
                    : 'It enforces strict compliance with regulatory attendance thresholds (absence caps) and produces automated, mathematically verifiable weighted averages.'}
                </p>
              </div>
            </div>

            {/* 4 Pillars Grid */}
            <div className="pt-4 border-t border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                {isPt ? 'Os 4 Pilares do Sistema' : 'The 4 Core Pillars of the System'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/50 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <ShieldCheck size={18} />
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">{isPt ? 'Integridade & Segurança' : 'Integrity & Security'}</h4>
                  <p className="text-xs text-slate-600">
                    {isPt 
                      ? 'Isolamento rigoroso por papéis de acesso (RBAC), histórico de alterações e prevenção contra fraudes em notas.'
                      : 'Strict role-based isolation (RBAC), audit trails, and prevention against unauthorized grade tampering.'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-blue-200/80 bg-blue-50/50 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                    <Activity size={18} />
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">{isPt ? 'Tempo Real & Precisão' : 'Real Time & Precision'}</h4>
                  <p className="text-xs text-slate-600">
                    {isPt 
                      ? 'Recálculo instantâneo de médias, detecção ativa de choque de horários e monitoramento ao vivo de conexões ativas.'
                      : 'Instant recalculation of averages, active schedule collision prevention, and live concurrent session monitoring.'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-purple-200/80 bg-purple-50/50 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                    <Award size={18} />
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">{isPt ? 'Qualidade Contínua' : 'Continuous Quality'}</h4>
                  <p className="text-xs text-slate-600">
                    {isPt 
                      ? 'Avaliações pós-curso estruturadas que geram relatórios analíticos para aprimoramento contínuo do corpo docente.'
                      : 'Structured post-course surveys generating executive analytics to refine faculty and instructional infrastructure.'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-amber-200/80 bg-amber-50/50 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
                    <Printer size={18} />
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">{isPt ? 'Prontidão Documental' : 'Document Readiness'}</h4>
                  <p className="text-xs text-slate-600">
                    {isPt 
                      ? 'Emissão instantânea de boletins, atas, quadros de horários e fichas cadastrais prontos para impressão física e arquivo.'
                      : 'Instant generation of transcripts, minutes, timetables, and student sheets formatted for physical print and archiving.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RECOMENDAÇÕES DE USO & BOAS PRÁTICAS */}
      {activeTab === 'recomendacoes' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Operational Lifecycle Workflow */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600 shrink-0 shadow-xs">
                <Workflow size={24} />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {isPt ? 'Ciclo de Vida Recomendado para uma Turma' : 'Recommended Cohort Operational Lifecycle'}
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  {isPt 
                    ? 'Passo a passo operacional padrão para garantir o encerramento perfeito e sem pendências' 
                    : 'Standard operating workflow ensuring seamless execution from inception to graduation'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                {
                  step: '01',
                  title: isPt ? 'Planejamento' : 'Planning',
                  module: isPt ? 'Cursos & Horários' : 'Courses & Schedules',
                  desc: isPt 
                    ? 'Verifique se o curso e as disciplinas já constam no catálogo. Monte a grade de horários preliminar prevenindo choques de salas e instrutores.'
                    : 'Ensure course and subjects exist in catalog. Build preliminary timetable checking for instructor and room collisions.'
                },
                {
                  step: '02',
                  title: isPt ? 'Abertura & Matrícula' : 'Cohort & Enrollment',
                  module: isPt ? 'Turmas & Alunos' : 'Classes & Students',
                  desc: isPt 
                    ? 'Abra a turma com datas e instrutor. Matricule os alunos (ou importe em lote via CSV) e atribua os identificadores de matrícula/NIP.'
                    : 'Open cohort with dates and instructor. Enroll students individually or via bulk spreadsheet import with unique IDs.'
                },
                {
                  step: '03',
                  title: isPt ? 'Instrução & Controle' : 'Instruction & Tracking',
                  module: isPt ? 'Frequência & Boletim' : 'Attendance & Grades',
                  desc: isPt 
                    ? 'Realize a chamada diária e registre faltas/justificativas. Lance as notas parciais (P1, P2, trabalhos) à medida que ocorrem as avaliações.'
                    : 'Conduct daily roll-calls and record absences/excuses. Enter assessment scores as examinations take place.'
                },
                {
                  step: '04',
                  title: isPt ? 'Avaliação & Conclusão' : 'Survey & Graduation',
                  module: isPt ? 'Pós-Curso & Atas' : 'Post-Course & Minutes',
                  desc: isPt 
                    ? 'Libere o formulário pós-curso para os alunos. Confira as médias finais, imprima a Ata Final da Turma e mude o status para "Concluída".'
                    : 'Unlock post-course evaluation form. Verify all final averages, print official graduation minutes, and mark cohort as "Completed".'
                }
              ].map((item, idx) => (
                <div key={idx} className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-slate-300 font-mono">{item.step}</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-slate-700 border border-slate-200">
                      {item.module}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-950 text-sm">{item.title}</h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations per Role */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Admin Guidelines */}
            <div className="bg-white border border-purple-200/80 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{isPt ? 'Recomendações para Administradores' : 'Administrator Best Practices'}</h3>
                  <p className="text-xs text-slate-500">{isPt ? 'Gestão global, integridade e segurança' : 'Global management, integrity and security'}</p>
                </div>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-purple-600 shrink-0 mt-0.5" />
                  <span>{isPt ? 'Configure o Brasão Oficial e Nome da Instituição em "Configurações" antes de emitir documentos para que o cabeçalho saia padronizado.' : 'Set Official Crest and Institution Name in Settings prior to printing official documents.'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-purple-600 shrink-0 mt-0.5" />
                  <span>{isPt ? 'Monitore os acessos simultâneos no topo do painel para auditar o tráfego e identificar eventuais conexões esquecidas abertas.' : 'Monitor concurrent accesses in the top navbar to audit traffic and disconnect forgotten idle sessions.'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-purple-600 shrink-0 mt-0.5" />
                  <span>{isPt ? 'Utilize o botão de "Sincronizar Alunos" em "Usuários" caso novos alunos cadastrados em turmas precisem de acesso individual ao portal.' : 'Use "Sync Students" in Users module whenever new students need direct portal login accounts.'}</span>
                </li>
              </ul>
            </div>

            {/* Instructor Guidelines */}
            <div className="bg-white border border-blue-200/80 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <GraduationCap size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{isPt ? 'Recomendações para Instrutores' : 'Instructor Best Practices'}</h3>
                  <p className="text-xs text-slate-500">{isPt ? 'Registro pedagógico, notas e presenças' : 'Pedagogical records, grades, and attendance'}</p>
                </div>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-blue-600 shrink-0 mt-0.5" />
                  <span>{isPt ? 'Faça a chamada pontualmente em "Frequência" em cada aula para manter o índice de infrequência sempre atualizado.' : 'Take attendance promptly in each session to maintain strictly accurate compliance records.'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-blue-600 shrink-0 mt-0.5" />
                  <span>{isPt ? 'Lance as notas parciais assim que corrigidas para que os alunos possam acompanhar o boletim com transparência.' : 'Publish scores promptly following grading so trainees can track their standing transparently.'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-blue-600 shrink-0 mt-0.5" />
                  <span>{isPt ? 'Consulte a Análise de Avaliações ao final de cada turma para identificar oportunidades de aperfeiçoamento didático.' : 'Review evaluation analytics at the end of each cohort to identify instructional enhancement areas.'}</span>
                </li>
              </ul>
            </div>

            {/* Student Guidelines */}
            <div className="bg-white border border-emerald-200/80 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <UserCheck size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{isPt ? 'Recomendações para Alunos' : 'Student Best Practices'}</h3>
                  <p className="text-xs text-slate-500">{isPt ? 'Acompanhamento acadêmico e avaliações' : 'Academic tracking and feedback'}</p>
                </div>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>{isPt ? 'Verifique regularmente seu Boletim para conferir o lançamento de notas e o percentual de presenças registradas.' : 'Check your Report Card regularly to verify grades and review your recorded attendance percentage.'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>{isPt ? 'Ao término do curso, responda ao questionário de Avaliação Pós-Curso com seriedade para contribuir com a melhoria do centro.' : 'Upon course completion, fill out the Post-Course Evaluation thoughtfully to assist center improvements.'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>{isPt ? 'Consulte a Grade de Horários para se preparar com antecedência para as matérias e professores da semana.' : 'Check Class Schedules to prepare ahead of time for upcoming weekly subjects and instructors.'}</span>
                </li>
              </ul>
            </div>

            {/* Guest Guidelines */}
            <div className="bg-white border border-amber-200/80 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Building size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{isPt ? 'Recomendações para Convidados e Auditores' : 'Guest & Auditor Best Practices'}</h3>
                  <p className="text-xs text-slate-500">{isPt ? 'Fiscalização, consulta e auditoria' : 'Inspection, verification, and audit'}</p>
                </div>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <span>{isPt ? 'Utilize o perfil de Convidado para auditar turmas, atas de encerramento e relatórios de avaliação com segurança somente-leitura.' : 'Use the Guest profile to inspect cohorts, minutes, and evaluation analytics in read-only safety.'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <span>{isPt ? 'Exporte relatórios consolidados em PDF diretamente das telas de Boletim e Análise de Avaliação.' : 'Export consolidated PDF documentation directly from Report Card and Evaluation screens.'}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MANUAL MÓDULO A MÓDULO */}
      {activeTab === 'modulos' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Controls: Search & Role Filter */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={isPt ? 'Pesquisar módulo, funcionalidade ou termo...' : 'Search module, feature, or keyword...'}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {isPt ? 'Filtrar por Perfil:' : 'Filter by Role:'}
              </span>
              {[
                { id: 'all', label: isPt ? 'Todos' : 'All' },
                { id: 'admin', label: 'Admin' },
                { id: 'instrutor', label: isPt ? 'Instrutor' : 'Instructor' },
                { id: 'aluno', label: isPt ? 'Aluno' : 'Student' },
                { id: 'convidado', label: isPt ? 'Convidado' : 'Guest' }
              ].map(rf => (
                <button
                  key={rf.id}
                  onClick={() => setSelectedRoleFilter(rf.id as any)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                    selectedRoleFilter === rf.id
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {rf.label}
                </button>
              ))}

              <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

              <button
                onClick={expandAllModules}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
              >
                {isPt ? 'Expandir Todos' : 'Expand All'}
              </button>
              <span className="text-slate-300">•</span>
              <button
                onClick={collapseAllModules}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
              >
                {isPt ? 'Recolher Todos' : 'Collapse All'}
              </button>
            </div>
          </div>

          {/* Module Cards Accordion */}
          <div className="space-y-4">
            {filteredModules.length === 0 ? (
              <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl text-slate-400">
                <Search size={36} className="mx-auto mb-2 opacity-40" />
                <p className="font-bold text-sm text-slate-600">
                  {isPt ? 'Nenhum módulo encontrado com os filtros atuais.' : 'No modules match your current filters.'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {isPt ? 'Tente buscar por termos mais genéricos ou selecione "Todos".' : 'Try searching generic terms or select "All".'}
                </p>
              </div>
            ) : (
              filteredModules.map((mod) => {
                const Icon = mod.icon;
                const isExpanded = expandedModules.includes(mod.id);

                return (
                  <div
                    key={mod.id}
                    className={cn(
                      "bg-white border rounded-2xl shadow-xs transition-all overflow-hidden",
                      isExpanded ? "border-slate-300 ring-1 ring-slate-200" : "border-slate-200/80 hover:border-slate-300"
                    )}
                  >
                    {/* Header Bar of the Module Accordion */}
                    <div
                      onClick={() => toggleModule(mod.id)}
                      className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer select-none bg-white hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className={cn(
                          "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs",
                          mod.color === 'blue' && "bg-blue-50 text-blue-600 border border-blue-200",
                          mod.color === 'amber' && "bg-amber-50 text-amber-600 border border-amber-200",
                          mod.color === 'emerald' && "bg-emerald-50 text-emerald-600 border border-emerald-200",
                          mod.color === 'sky' && "bg-sky-50 text-sky-600 border border-sky-200",
                          mod.color === 'cyan' && "bg-cyan-50 text-cyan-600 border border-cyan-200",
                          mod.color === 'purple' && "bg-purple-50 text-purple-600 border border-purple-200",
                          mod.color === 'rose' && "bg-rose-50 text-rose-600 border border-rose-200",
                          mod.color === 'violet' && "bg-violet-50 text-violet-600 border border-violet-200",
                          mod.color === 'fuchsia' && "bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-200",
                          mod.color === 'teal' && "bg-teal-50 text-teal-600 border border-teal-200",
                          mod.color === 'indigo' && "bg-indigo-50 text-indigo-600 border border-indigo-200"
                        )}>
                          <Icon size={22} />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-bold text-slate-900 tracking-tight">
                              {mod.name}
                            </h3>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {mod.badge}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {mod.path}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                            {mod.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href={mod.path}
                          onClick={(e) => e.stopPropagation()}
                          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors"
                          title={isPt ? 'Ir para este módulo agora' : 'Go to module now'}
                        >
                          <span>{isPt ? 'Acessar' : 'Open'}</span>
                          <ExternalLink size={12} />
                        </Link>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700">
                          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </div>
                      </div>
                    </div>

                    {/* Collapsible Content */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-slate-100 bg-slate-50/50 p-5 sm:p-6 space-y-5"
                        >
                          {/* Description full */}
                          <div>
                            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                              {isPt ? 'Objetivo do Módulo' : 'Module Objective'}
                            </h4>
                            <p className="text-sm text-slate-700 leading-relaxed">
                              {mod.description}
                            </p>
                          </div>

                          {/* Features list */}
                          <div>
                            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                              {isPt ? 'Funcionalidades Disponíveis' : 'Available Features'}
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {mod.features.map((feat, fIdx) => (
                                <div key={fIdx} className="flex items-start gap-2 text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200/70 shadow-2xs">
                                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                                  <span>{feat}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Possibilities & Recommendations */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-2">
                              <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                <Sparkles size={14} className="text-amber-500" />
                                {isPt ? 'Possibilidades do Módulo' : 'Module Capabilities'}
                              </h5>
                              <ul className="space-y-1.5 text-xs text-slate-600">
                                {mod.possibilities.map((pos, pIdx) => (
                                  <li key={pIdx} className="flex items-start gap-1.5">
                                    <span className="text-amber-500 font-bold">•</span>
                                    <span>{pos}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-2">
                              <h5 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                                <Info size={14} className="text-blue-600" />
                                {isPt ? 'Recomendação de Uso' : 'Usage Recommendation'}
                              </h5>
                              <p className="text-xs text-blue-950 leading-relaxed">
                                {mod.recommendations}
                              </p>
                            </div>
                          </div>

                          {/* Bottom Action */}
                          <div className="pt-2 flex justify-end">
                            <Link
                              href={mod.path}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors shadow-xs"
                            >
                              <span>{isPt ? `Acessar ${mod.name}` : `Open ${mod.name}`}</span>
                              <ArrowRight size={14} />
                            </Link>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 4: POSSIBILIDADES & RECURSOS AVANÇADOS */}
      {activeTab === 'possibilidades' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200/80 flex items-center justify-center text-purple-600 shrink-0 shadow-xs">
                <Compass size={24} />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {isPt ? 'Possibilidades & Recursos Avançados do Sistema' : 'System Capabilities & Advanced Features'}
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  {isPt 
                    ? 'Explore as ferramentas automatizadas de produtividade, geração documental e auditoria' 
                    : 'Explore automated productivity tools, document generators, and audit controls'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Feature 1: PDF Document Generator */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                  <Printer size={20} />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {isPt ? 'Emissão Oficial de Documentos' : 'Official Document Issuance'}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {isPt 
                    ? 'O sistema conta com motor de impressão isolada para emissão de Atas Finais, Boletins com carimbo oficial, Fichas de Alunos e Relatórios de Avaliação sem poluição de menus ou elementos de tela web.'
                    : 'Features an isolated printing engine for emitting Final Minutes, official report cards, student profiles, and evaluation analytics without web navigation clutter.'}
                </p>
                <div className="pt-2 text-[11px] font-bold text-sky-700">
                  {isPt ? 'Disponível em: Boletim, Turmas, Dashboard' : 'Available in: Report Cards, Classes, Dashboard'}
                </div>
              </div>

              {/* Feature 2: Schedule Conflict Detector */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold">
                  <Calendar size={20} />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {isPt ? 'Prevenção de Choque de Horários' : 'Schedule Collision Prevention'}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {isPt 
                    ? 'Validação algorítmica em tempo real que impede que um mesmo instrutor ou sala seja alocado simultaneamente em duas turmas diferentes no mesmo tempo de aula.'
                    : 'Real-time algorithmic check preventing instructors or classrooms from being inadvertently double-booked in concurrent lesson periods.'}
                </p>
                <div className="pt-2 text-[11px] font-bold text-cyan-700">
                  {isPt ? 'Disponível em: Grade de Horários' : 'Available in: Class Schedules'}
                </div>
              </div>

              {/* Feature 3: Real-Time Concurrent Sessions */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Activity size={20} />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {isPt ? 'Monitor de Acessos Simultâneos' : 'Concurrent Accesses Monitor'}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {isPt 
                    ? 'Rastreamento em tempo real com identificação de dispositivo (Desktop, Tablet, Mobile), sistema operacional, página navegada e possibilidade de encerramento remoto de sessões indevidas.'
                    : 'Live connection tracking with device detection (Desktop, Tablet, Mobile), browser, current page, and remote session termination.'}
                </p>
                <div className="pt-2 text-[11px] font-bold text-emerald-700">
                  {isPt ? 'Disponível em: Barra de Navegação (Admin) e Usuários' : 'Available in: Top Navbar (Admin) and Users'}
                </div>
              </div>

              {/* Feature 4: Bulk CSV Data Import */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Layers size={20} />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {isPt ? 'Importação em Lote via Planilha' : 'Bulk Spreadsheet CSV Import'}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {isPt 
                    ? 'Cadastre centenas de alunos de uma só vez colando dados de planilhas CSV ou Excel com auto-validação de duplicidades e formatação.'
                    : 'Onboard hundreds of students simultaneously by pasting CSV or Excel rows with automatic deduplication and format validation.'}
                </p>
                <div className="pt-2 text-[11px] font-bold text-amber-700">
                  {isPt ? 'Disponível em: Turmas & Alunos' : 'Available in: Classes & Students'}
                </div>
              </div>

              {/* Feature 5: Evaluation Intelligence & NPS */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold">
                  <FileCheck size={20} />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {isPt ? 'Indicadores de Qualidade & NPS' : 'Quality Analytics & NPS'}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {isPt 
                    ? 'Estatísticas consolidadas da avaliação pós-curso categorizadas por infraestrutura, instrutores e coordenação com relatórios executivos para o comando.'
                    : 'Consolidated post-course satisfaction metrics categorized by facilities, faculty, and coordination with command executive summaries.'}
                </p>
                <div className="pt-2 text-[11px] font-bold text-violet-700">
                  {isPt ? 'Disponível em: Análise de Avaliações' : 'Available in: Evaluation Analytics'}
                </div>
              </div>

              {/* Feature 6: Bilingual & Theme Switching */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <Settings size={20} />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {isPt ? 'Bilinguismo & Acessibilidade' : 'Bilingual Support & Themes'}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {isPt 
                    ? 'Totalmente adaptado para Português e Inglês com persistência de preferências de idioma e alternância instantânea de tema claro e escuro.'
                    : 'Fully localized in Portuguese and English with persistent language cookies and instant light/dark theme switching.'}
                </p>
                <div className="pt-2 text-[11px] font-bold text-indigo-700">
                  {isPt ? 'Disponível em: Cabeçalho e Configurações' : 'Available in: Navbar and Settings'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: FAQ & PERGUNTAS FREQUENTES */}
      {activeTab === 'faq' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shrink-0 shadow-xs">
                <HelpCircle size={24} />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {isPt ? 'Perguntas Frequentes & Resolução de Dúvidas' : 'Frequently Asked Questions & Troubleshooting'}
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  {isPt 
                    ? 'Soluções rápidas e esclarecimentos sobre os procedimentos operacionais mais comuns' 
                    : 'Quick solutions and explanations for the most common operational procedures'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, fIdx) => {
                const isExpanded = expandedFaqs.includes(fIdx);
                return (
                  <div
                    key={fIdx}
                    className="border border-slate-200 rounded-2xl overflow-hidden bg-white transition-all shadow-2xs"
                  >
                    <button
                      onClick={() => toggleFaq(fIdx)}
                      className="w-full p-4.5 text-left flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors cursor-pointer select-none"
                    >
                      <span className="text-sm font-bold text-slate-900 flex items-center gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        {faq.q}
                      </span>
                      <div className="text-slate-400 shrink-0">
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </div>
                    </button>
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-slate-100 bg-slate-50/50 p-4.5 text-xs text-slate-700 leading-relaxed"
                        >
                          {faq.a}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* FOOTER NOTICE */}
      <div className="p-4 rounded-2xl bg-slate-100/80 border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 print:hidden">
        <div className="flex items-center gap-2">
          <BookMarked size={16} className="text-amber-600" />
          <span>
            {isPt 
              ? 'Módulo normativo permanente. Não altera registros ou dados existentes do sistema.' 
              : 'Permanent normative module. Does not alter any existing system records or database state.'}
          </span>
        </div>
        <div className="text-[11px] font-mono text-slate-400">
          CIAGA / Ensino & Instrução • {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
