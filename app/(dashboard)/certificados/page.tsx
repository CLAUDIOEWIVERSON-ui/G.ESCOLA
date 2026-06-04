'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { useUser } from '@/lib/auth/UserContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Award, 
  Plus, 
  Trash2, 
  Edit3, 
  FileText, 
  Printer, 
  Download, 
  CheckCircle, 
  Settings2, 
  Users, 
  Layers, 
  FileCheck, 
  Eye, 
  Image as ImageIcon, 
  Check, 
  HelpCircle,
  TrendingUp,
  Shield,
  Search,
  CheckCircle2,
  AlertTriangle,
  Upload,
  RefreshCw,
  QrCode,
  Type,
  Maximize2,
  ChevronRight,
  MoreVertical,
  Briefcase
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// html2canvas & jsPDF types
declare const window: any;

interface CertificateTemplate {
  id: string;
  nome: string;
  tipo: 'certificado' | 'diploma';
  background_frente_url: string;
  background_verso_url: string;
  campos_frente: any[];
  campos_verso: any[];
  qrcode_config: {
    enabled: boolean;
    x: number;
    y: number;
    size: number;
    side?: 'frente' | 'verso' | 'ambos';
  };
  created_at?: string;
}

interface Signature {
  id: string;
  nome_autoridade: string;
  cargo: string;
  assinatura_url: string;
}

interface IssuedCertificate {
  id: string;
  aluno_id: string;
  turma_id: string;
  curso_id: string;
  tipo: 'certificado' | 'diploma';
  valores_mapeados: Record<string, string>;
  codigo_validacao: string;
  data_emissao: string;
  status: string;
  alunos?: {
    nome: string;
    matricula: string;
    nif: string;
  };
  turmas?: {
    nome: string;
  };
  cursos?: {
    nome: string;
  };
}

// Helper to generate unique field IDs outside React component tree to avoid hook-rules purity complaints
function generateUniqueFieldId() {
  return 'fld_' + Math.random().toString(36).substring(2, 11);
}

// Helper to safely build background style without mixing shorthand background with backgroundSize/backgroundPosition
function getBackgroundStyle(bgUrlOrColor: string | undefined): React.CSSProperties {
  if (!bgUrlOrColor) {
    return {
      backgroundColor: '#ffffff'
    };
  }
  const isColor = bgUrlOrColor.startsWith('#') || bgUrlOrColor.startsWith('rgb') || bgUrlOrColor.startsWith('hsl');
  const isGradient = bgUrlOrColor.startsWith('linear') || bgUrlOrColor.startsWith('radial');
  
  if (isColor) {
    return {
      backgroundColor: bgUrlOrColor
    };
  } else if (isGradient) {
    return {
      backgroundImage: bgUrlOrColor
    };
  } else {
    return {
      backgroundImage: `url('${bgUrlOrColor}')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    };
  }
}

export default function CertificadosPage() {
  const { language } = useI18n();
  const { profile } = useUser();
  const isAdmin = profile?.role === 'admin';
  const isSecretary = profile?.role === 'admin' || (profile as any)?.role === 'secretaria';

  // Navigation states
  const [activeTab, setActiveTab] = useState<'dashboard' | 'modelos' | 'assinaturas' | 'emitir' | 'historico'>('dashboard');

  // Loading states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Core Data
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [issuedCertificates, setIssuedCertificates] = useState<IssuedCertificate[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  // Safe state updated inside async query blocks to avoid linter conflicts
  const [recent24hCount, setRecent24hCount] = useState(0);

  // Search & Filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'todos' | 'certificado' | 'diploma'>('todos');

  // Selected entities for actions
  const [selectedTemplate, setSelectedTemplate] = useState<CertificateTemplate | null>(null);
  const [selectedSignature, setSelectedSignature] = useState<Signature | null>(null);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [isEditingSignature, setIsEditingSignature] = useState(false);

  // Template design canvas settings
  const [canvasSide, setCanvasSide] = useState<'frente' | 'verso'>('frente');
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(842); // Landscape aspect A4 ratio (1.414)
  const [canvasHeight, setCanvasHeight] = useState(595);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Mouse drag state for interactive canvas fields
  const [dragFieldId, setDragFieldId] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0, fieldX: 0, fieldY: 0 });

  // Bulk Issuance state
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedTurmaId, setSelectedTurmaId] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [issuanceTemplateId, setIssuanceTemplateId] = useState('');
  const [issuanceDirectorId, setIssuanceDirectorId] = useState('');
  const [issuanceCoordinatorId, setIssuanceCoordinatorId] = useState('');
  const [issuedResultList, setIssuedResultList] = useState<IssuedCertificate[]>([]);

  // Signature Form State
  const [sigForm, setSigForm] = useState({
    nome_autoridade: '',
    cargo: '',
    assinatura_url: '' // base64 payload
  });

  // Template Form State
  const [tplForm, setTplForm] = useState<Partial<CertificateTemplate>>({
    nome: '',
    tipo: 'certificado',
    background_frente_url: '',
    background_verso_url: '',
    campos_frente: [],
    campos_verso: [],
    qrcode_config: { enabled: true, x: 80, y: 80, size: 80, side: 'frente' }
  });

  const selectedField = useMemo(() => {
    if (!selectedFieldId) return null;
    if (selectedFieldId === 'qrcode') {
      const qr = tplForm.qrcode_config || { enabled: true, x: 80, y: 80, size: 80, side: 'frente' };
      return {
        id: 'qrcode',
        type: 'qrcode',
        key: 'qrcode',
        text: 'QR Code de Validação',
        x: qr.x ?? 80,
        y: qr.y ?? 80,
        width: qr.size ?? 80,
        height: qr.size ?? 80,
        align: 'center',
        color: '#000000',
        fontSize: 10
      };
    }
    const sideKey = canvasSide === 'frente' ? 'campos_frente' : 'campos_verso';
    return (tplForm[sideKey] || []).find((f: any) => f.id === selectedFieldId) || null;
  }, [selectedFieldId, canvasSide, tplForm]);

  // Load Initial Data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Templates
      const { data: templatesData, error: tErr } = await supabase
        .from('certificate_templates')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (templatesData) setTemplates(templatesData);

      // Signatures
      const { data: sigsData, error: sErr } = await supabase
        .from('certificate_signatures')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (sigsData) setSignatures(sigsData);

      // Issued Certificates
      const { data: certsData, error: cErr } = await supabase
        .from('certificados')
        .select('*, alunos(nome, matricula, nif), turmas(nome), cursos(nome)')
        .is('deleted_at', null)
        .order('data_emissao', { ascending: false });

      if (certsData) {
        setIssuedCertificates(certsData);
        const minTimestamp = Date.now() - 24 * 60 * 60 * 1050; // buffer 1 hour
        const count = certsData.filter(c => new Date(c.data_emissao).getTime() > minTimestamp).length;
        setRecent24hCount(count);
      }

      // Courses & Classes (needed for issuing)
      const { data: coursesData } = await supabase
        .from('cursos')
        .select('id, nome')
        .is('deleted_at', null)
        .order('nome');
      if (coursesData) setCourses(coursesData);

      const { data: classesData } = await supabase
        .from('turmas')
        .select('id, nome, curso_id')
        .is('deleted_at', null)
        .order('nome');
      if (classesData) setClasses(classesData);

    } catch (err: any) {
      console.error(err);
      toast.error(language === 'pt' ? 'Erro ao carregar banco de dados' : 'Database load failure');
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    let active = true;
    const init = async () => {
      await Promise.resolve();
      if (active) {
        loadData();
      }
    };
    init();
    return () => { active = false; };
  }, [loadData]);

  // Load students when class changes
  useEffect(() => {
    let active = true;
    const fetchStudents = async () => {
      await Promise.resolve();
      if (!active) return;
      if (!selectedTurmaId) {
        setStudents([]);
        return;
      }
      const { data } = await supabase
        .from('alunos')
        .select('id, nome, matricula, nif, rg')
        .eq('turma_id', selectedTurmaId)
        .is('deleted_at', null)
        .order('nome');
      if (active && data) {
        setStudents(data);
        setSelectedStudentIds(data.map(s => s.id)); // select all by default
      }
    };
    fetchStudents();
    return () => { active = false; };
  }, [selectedTurmaId]);

  // Handle Preset Templates Selection
  const applyPresetBackground = (presetName: string) => {
    let frontBg = '';
    let backBg = '';
    let initialFields: any[] = [];

    if (presetName === 'executive') {
      // Elegant minimal navy executive design
      frontBg = 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)';
      backBg = 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)';
      initialFields = [
        { id: '1', key: '{{instituicao}}', text: 'ACADEMIA NAVAL DE ENSINO', x: 50, y: 15, fontSize: 18, color: '#e2e8f0', fontWeight: 'bold', align: 'center', fontStyle: 'normal' },
        { id: '2', key: 'title', text: 'CERTIFICADO DE APROVEITAMENTO', x: 50, y: 28, fontSize: 28, color: '#f59e0b', fontWeight: 'bold', align: 'center', fontStyle: 'normal' },
        { id: '3', key: 'subtitle', text: 'Certificamos para os devidos fins de direito e comprovação institucional que o aluno(a):', x: 50, y: 42, fontSize: 13, color: '#cbd5e1', fontWeight: 'normal', align: 'center', fontStyle: 'italic' },
        { id: '4', key: '{{nome_aluno}}', text: 'NOME DO ALUNO COMPLETADO', x: 50, y: 52, fontSize: 24, color: '#ffffff', fontWeight: 'bold', align: 'center', fontStyle: 'normal' },
        { id: '5', key: 'desc', text: 'concluiu com êxito as obrigações curriculares do curso de {{curso}} ministrado pela corporação com carga horária de {{carga_horaria}}h.', x: 50, y: 64, fontSize: 12, color: '#cbd5e1', fontWeight: 'normal', align: 'center', fontStyle: 'normal' },
        { id: '6', key: '{{data_emissao}}', text: 'Emitido em {{data_emissao}}', x: 50, y: 78, fontSize: 11, color: '#94a3b8', fontWeight: 'normal', align: 'center', fontStyle: 'normal' },
        { id: '7', key: 'signatures_anchor', text: '_____________________\nAssinatura da Autoridade Delegada', x: 50, y: 90, fontSize: 10, color: '#94a3b8', fontWeight: 'normal', align: 'center', fontStyle: 'normal' }
      ];
    } else if (presetName === 'grotesk') {
      // Modern High-Contrast Light Tech design
      frontBg = '#ffffff';
      backBg = '#fafafa';
      initialFields = [
        { id: '1', key: 'title', text: 'DIPLOMA DE CONCLUSÃO', x: 10, y: 15, fontSize: 36, color: '#0f172a', fontWeight: 'bold', align: 'left', fontStyle: 'normal' },
        { id: '2', key: 'subtitle', text: 'Concedido a título oficial ao estudante:', x: 10, y: 30, fontSize: 12, color: '#64748b', fontWeight: 'normal', align: 'left', fontStyle: 'normal' },
        { id: '3', key: '{{nome_aluno}}', text: '{{nome_aluno}}', x: 10, y: 40, fontSize: 28, color: '#1e40af', fontWeight: 'bold', align: 'left', fontStyle: 'normal' },
        { id: '4', key: 'body', text: 'Pela conclusão do treinamento avançado no curso de {{curso}}, atendendo aos padrões de frequência oficial exigidos pela secretaria acadêmica.', x: 10, y: 55, fontSize: 13, color: '#334155', fontWeight: 'normal', align: 'left', fontStyle: 'normal' },
        { id: '5', key: 'meta', text: 'NIF: {{nif}} | Reg.: {{codigo_validacao}} | Nota Final: {{nota_final}}', x: 10, y: 70, fontSize: 11, color: '#64748b', fontWeight: 'bold', align: 'left', fontStyle: 'normal' }
      ];
    } else {
      // Classic parchment/ivory certificate
      frontBg = 'linear-gradient(180deg, #fefbf3 0%, #fcf8ec 100%)';
      backBg = '#fcf8ec';
      initialFields = [
        { id: '1', key: '{{instituicao}}', text: 'REPUBLICA DEMOCRÁTICA', x: 50, y: 14, fontSize: 20, color: '#7c2d12', fontWeight: 'bold', align: 'center', fontStyle: 'normal' },
        { id: '2', key: 'title', text: 'DIPLOMA ACADÊMICO', x: 50, y: 26, fontSize: 32, color: '#431407', fontWeight: 'bold', align: 'center', fontStyle: 'normal' },
        { id: '3', key: '{{nome_aluno}}', text: '{{nome_aluno}}', x: 50, y: 46, fontSize: 22, color: '#7c2d12', fontWeight: 'bold', align: 'center', fontStyle: 'normal' },
        { id: '4', key: 'text', text: 'Tendo completado os estudos obrigatórios e com aproveitamento pleno sob supervisão docente de {{instrutor}} na turma {{turma}}.', x: 50, y: 60, fontSize: 12, color: '#451a03', fontWeight: 'normal', align: 'center', fontStyle: 'italic' },
        { id: '5', key: 'sigs', text: 'Diretor de Ensino\n{{diretor}}', x: 30, y: 84, fontSize: 10, color: '#7c2d12', fontWeight: 'bold', align: 'center', fontStyle: 'normal' },
        { id: '6', key: 'sigs_coor', text: 'Secretaria Geral\n{{coordenador}}', x: 70, y: 84, fontSize: 10, color: '#7c2d12', fontWeight: 'bold', align: 'center', fontStyle: 'normal' }
      ];
    }

    setTplForm(prev => ({
      ...prev,
      background_frente_url: frontBg,
      background_verso_url: backBg,
      campos_frente: initialFields,
      campos_verso: [
        { id: 'b1', key: 'verso_title', text: 'HISTÓRICO ACADÊMICO & REGISTRO DE NOTAS', x: 50, y: 15, fontSize: 18, color: '#334155', fontWeight: 'bold', align: 'center', fontStyle: 'normal' },
        { id: 'b2', key: 'verso_meta', text: 'Matrícula: {{matricula}} | CPF: {{cpf}} | Código de Rastreamento Único: {{codigo_validacao}}', x: 50, y: 28, fontSize: 10, color: '#64748b', fontWeight: 'normal', align: 'center', fontStyle: 'normal' },
        { id: 'b3', key: 'verso_body', text: 'Disciplinas Cursadas e Integralizadas:\n- Grade curricular básica do curso com nota de aproveitamento: {{nota_final}} (Conceito: {{conceito}}).\n- Registo de presenças regulamentares de acordo com as planilhas oficiais de controle.', x: 50, y: 45, fontSize: 11, color: '#475569', fontWeight: 'normal', align: 'center', fontStyle: 'normal' },
        { id: 'b4', key: 'verso_legal', text: 'Registrado sob o número de protocolo institucional único sob as leis vigentes de conformidade digital.', x: 50, y: 75, fontSize: 9, color: '#94a3b8', fontWeight: 'normal', align: 'center', fontStyle: 'italic' }
      ]
    }));

    toast.success(language === 'pt' ? 'preset de design aplicado!' : 'Design preset applied!');
  };

  // Canvas field management
  const addFieldToCanvas = (tokenKey: string) => {
    const list = canvasSide === 'frente' ? [...(tplForm.campos_frente || [])] : [...(tplForm.campos_verso || [])];
    const newField = {
      id: generateUniqueFieldId(),
      key: tokenKey,
      text: tokenKey.startsWith('{{') ? tokenKey : 'Novo Bloco de Texto',
      x: 50, // default center horizontal coordinate (X%)
      y: 50, // default center vertical coordinate (Y%)
      fontSize: 14,
      color: canvasSide === 'frente' && tplForm.background_frente_url?.includes('#0f172a') ? '#ffffff' : '#0f172a',
      fontWeight: 'normal',
      align: 'center',
      fontStyle: 'normal'
    };

    list.push(newField);
    setTplForm(prev => ({
      ...prev,
      [canvasSide === 'frente' ? 'campos_frente' : 'campos_verso']: list
    }));
    setSelectedFieldId(newField.id);
  };

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (canvasSide === 'frente') {
        setTplForm(p => ({ ...p, background_frente_url: base64 }));
        toast.success(language === 'pt' ? 'Fundo da frente carregado!' : 'Front background pattern loaded!');
      } else {
        setTplForm(p => ({ ...p, background_verso_url: base64 }));
        toast.success(language === 'pt' ? 'Fundo do verso carregado!' : 'Back background pattern loaded!');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const list = canvasSide === 'frente' ? [...(tplForm.campos_frente || [])] : [...(tplForm.campos_verso || [])];
      
      const newField = {
        id: generateUniqueFieldId(),
        key: 'carimbo',
        type: 'image',
        text: file.name.split('.')[0] || 'Carimbo',
        imageUrl: base64,
        x: 45,
        y: 65,
        width: 100,
        height: 100
      };

      const sideKey = canvasSide === 'frente' ? 'campos_frente' : 'campos_verso';
      setTplForm(prev => ({ ...prev, [sideKey]: [...list, newField] }));
      setSelectedFieldId(newField.id);
      toast.success(language === 'pt' ? 'Selo/Carimbo adicionado! Arraste para mover.' : 'Seal/Stamp added! Drag to move around.');
    };
    reader.readAsDataURL(file);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!dragFieldId || !canvasRef.current) return;
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    
    const deltaX = ((e.clientX - dragStartPos.x) / rect.width) * 100;
    const deltaY = ((e.clientY - dragStartPos.y) / rect.height) * 100;
    
    const newX = Math.round(Math.max(0, Math.min(100, dragStartPos.fieldX + deltaX)));
    const newY = Math.round(Math.max(0, Math.min(100, dragStartPos.fieldY + deltaY)));
    
    if (dragFieldId === 'qrcode') {
      setTplForm(prev => ({
        ...prev,
        qrcode_config: {
          ...(prev.qrcode_config || { enabled: true, size: 80, side: 'frente' }),
          x: newX,
          y: newY
        }
      }));
      return;
    }

    const sideKey = canvasSide === 'frente' ? 'campos_frente' : 'campos_verso';
    setTplForm(prev => {
      const list = [...(prev[sideKey] || [])];
      const idx = list.findIndex(f => f.id === dragFieldId);
      if (idx !== -1) {
        list[idx] = { ...list[idx], x: newX, y: newY };
      }
      return { ...prev, [sideKey]: list };
    });
  };

  const handleCanvasMouseUp = () => {
    setDragFieldId(null);
  };

  const handleFieldMouseDown = (fieldId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedFieldId(fieldId);
    setDragFieldId(fieldId);
    
    const sideKey = canvasSide === 'frente' ? 'campos_frente' : 'campos_verso';
    const fieldObj = (tplForm[sideKey] || []).find(f => f.id === fieldId);
    if (fieldObj) {
      setDragStartPos({
        x: e.clientX,
        y: e.clientY,
        fieldX: fieldObj.x,
        fieldY: fieldObj.y
      });
    }
  };

  const handleQrCodeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedFieldId('qrcode');
    setDragFieldId('qrcode');
    
    const qr = tplForm.qrcode_config || { enabled: true, x: 80, y: 80, size: 80, side: 'frente' };
    setDragStartPos({
      x: e.clientX,
      y: e.clientY,
      fieldX: qr.x ?? 80,
      fieldY: qr.y ?? 80
    });
  };

  const updateSelectedField = (props: any) => {
    if (!selectedFieldId) return;
    if (selectedFieldId === 'qrcode') {
      setTplForm(prev => {
        const qr = prev.qrcode_config || { enabled: true, x: 80, y: 80, size: 80, side: 'frente' };
        const updatedQr = { ...qr };
        if (props.width !== undefined) updatedQr.size = props.width;
        if (props.x !== undefined) updatedQr.x = props.x;
        if (props.y !== undefined) updatedQr.y = props.y;
        if (props.enabled !== undefined) updatedQr.enabled = props.enabled;
        if (props.side !== undefined) updatedQr.side = props.side;
        return { ...prev, qrcode_config: updatedQr };
      });
      return;
    }
    const sideKey = canvasSide === 'frente' ? 'campos_frente' : 'campos_verso';
    const fields = [...(tplForm[sideKey] || [])];
    const idx = fields.findIndex(f => f.id === selectedFieldId);
    if (idx !== -1) {
      fields[idx] = { ...fields[idx], ...props };
      setTplForm(prev => ({ ...prev, [sideKey]: fields }));
    }
  };

  const deleteSelectedField = () => {
    if (!selectedFieldId) return;
    if (selectedFieldId === 'qrcode') {
      setTplForm(prev => ({
        ...prev,
        qrcode_config: { ...(prev.qrcode_config || { enabled: true, x: 80, y: 80, size: 80, side: 'frente' }), enabled: false }
      }));
      setSelectedFieldId(null);
      toast.success(language === 'pt' ? 'Módulo QR Code ocultado!' : 'QR Code module hidden!');
      return;
    }
    const sideKey = canvasSide === 'frente' ? 'campos_frente' : 'campos_verso';
    const fields = [...(tplForm[sideKey] || [])].filter(f => f.id !== selectedFieldId);
    setTplForm(prev => ({ ...prev, [sideKey]: fields }));
    setSelectedFieldId(null);
    toast.success(language === 'pt' ? 'Elemento removido!' : 'Element deleted!');
  };

  // Signatures library action
  const handleSaveSignature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sigForm.nome_autoridade || !sigForm.cargo) {
      toast.error(language === 'pt' ? 'Nome e cargo são obrigatórios' : 'Name and role are required');
      return;
    }

    try {
      setActionLoading(true);
      // Fallback signature visual base64 if empty
      let signatureUrl = sigForm.assinatura_url;
      if (!signatureUrl) {
        signatureUrl = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="150" height="50" viewBox="0 0 150 50"><text x="10" y="30" font-family="cursive" font-size="20" fill="navy">${sigForm.nome_autoridade}</text></svg>`;
      }

      const { data, error } = await supabase
        .from('certificate_signatures')
        .insert({
          nome_autoridade: sigForm.nome_autoridade,
          cargo: sigForm.cargo,
          assinatura_url: signatureUrl
        })
        .select();

      if (error) throw error;
      toast.success(language === 'pt' ? 'Assinatura digitalizada registrada!' : 'Digital signature saved!');
      setSigForm({ nome_autoridade: '', cargo: '', assinatura_url: '' });
      setIsEditingSignature(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!tplForm.nome) {
      toast.error(language === 'pt' ? 'Insira o nome do modelo' : 'Template name is required');
      return;
    }

    try {
      setActionLoading(true);
      const payload = {
        nome: tplForm.nome,
        tipo: tplForm.tipo,
        background_frente_url: tplForm.background_frente_url || '#ffffff',
        background_verso_url: tplForm.background_verso_url || '#ffffff',
        campos_frente: tplForm.campos_frente || [],
        campos_verso: tplForm.campos_verso || [],
        qrcode_config: tplForm.qrcode_config || { enabled: true, x: 80, y: 80, size: 80 }
      };

      let error;
      if (selectedTemplate?.id) {
        const { error: err } = await supabase
          .from('certificate_templates')
          .update(payload)
          .eq('id', selectedTemplate.id);
        error = err;
      } else {
        const { error: err } = await supabase
          .from('certificate_templates')
          .insert(payload);
        error = err;
      }

      if (error) throw error;
      toast.success(language === 'pt' 
        ? (selectedTemplate?.id ? 'Modelo de certificado atualizado com sucesso!' : 'Modelo de certificado cadastrado com sucesso!')
        : (selectedTemplate?.id ? 'Certificate template successfully updated!' : 'Certificate template successfully added!')
      );
      setIsEditingTemplate(false);
      setSelectedTemplate(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Perform bulk issuance
  const handleBulkIssueAction = async () => {
    if (!issuanceTemplateId) {
      toast.error(language === 'pt' ? 'Selecione o modelo do documento' : 'Select target document template');
      return;
    }
    if (selectedStudentIds.length === 0) {
      toast.error(language === 'pt' ? 'Nenhum aluno selecionado' : 'No students selected for issuance');
      return;
    }

    const template = templates.find(t => t.id === issuanceTemplateId);
    if (!template) return;

    try {
      setActionLoading(true);
      const itemsToInsert = [];

      // Selected signatures
      const dirSig = signatures.find(s => s.id === issuanceDirectorId);
      const coorSig = signatures.find(s => s.id === issuanceCoordinatorId);

      for (const sId of selectedStudentIds) {
        const student = students.find(s => s.id === sId);
        if (!student) continue;

        // Generate dynamic validation tracker
        const randomHex = Math.random().toString(36).substring(2, 10).toUpperCase();
        const code = `CERT-${randomHex}-${new Date().getFullYear()}`;

        // Load or build dictionary for variables mapping.
        // Let's resolve student grades corresponding to this course or simply mock/retrieve
        const values: Record<string, string> = {
          '{{nome_aluno}}': student.nome || '',
          '{{cpf}}': student.nif || 'Não Informado', // in Portugal/military standard NIF acts as unique taxpayer identity
          '{{rg}}': student.rg || 'Não Informado',
          '{{matricula}}': student.matricula || '',
          '{{curso}}': courses.find(c => c.id === selectedCourseId)?.nome || 'Curso Especializado',
          '{{carga_horaria}}': '120', // standard module load
          '{{data_inicio}}': student.data_inicio_curso || '01/02/2025',
          '{{data_termino}}': student.data_fim_curso || '30/11/2025',
          '{{data_emissao}}': new Date().toLocaleDateString('pt-BR'),
          '{{numero_certificado}}': code,
          '{{codigo_validacao}}': code,
          '{{instituicao}}': 'ACADEMIA NAVAL DE DIREÇÃO DE DEFESA',
          '{{diretor}}': dirSig ? dirSig.nome_autoridade : 'Diretor Administrativo',
          '{{conceito}}': 'Excelente',
          '{{nota_final}}': '9.5'
        };

        itemsToInsert.push({
          aluno_id: student.id,
          turma_id: selectedTurmaId,
          curso_id: selectedCourseId,
          tipo: template.tipo,
          template_id: template.id,
          codigo_validacao: code,
          valores_mapeados: values,
          status: 'valido'
        });
      }

      const { data, error } = await supabase
        .from('certificados')
        .insert(itemsToInsert)
        .select();

      if (error) throw error;

      toast.success(language === 'pt' ? `${itemsToInsert.length} certificados emitidos em lote!` : `${itemsToInsert.length} certificates issued in bulk!`);
      setSelectedStudentIds([]);
      loadData();
      setActiveTab('historico');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Download high-fidelity PDF from canvas side or print
  const printCertificateElement = (cert: IssuedCertificate) => {
    // Generate high fidelity print view
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error(language === 'pt' ? 'Por favor desative o bloqueador de popups para imprimir!' : 'Please bypass pop-up blockers to print!');
      return;
    }

    const tpl = templates.find(t => t.id === cert.template_id) || {
      background_frente_url: '#ffffff',
      background_verso_url: '#ffffff',
      campos_frente: [],
      campos_verso: [],
      qrcode_config: { enabled: true, x: 80, y: 80, size: 80 }
    };

    // Render Side HTML (supports text variables & image stamps)
    const renderSideHTML = (side: 'frente' | 'verso', fields: any[], bg: string) => {
      let bgStyle = `background: ${bg};`;
      if (bg.startsWith('http') || bg.startsWith('data:image')) {
        bgStyle = `background-image: url('${bg}'); background-size: cover; background-position: center;`;
      }

      return `
        <div style="width: 297mm; height: 210mm; position: relative; display: block; border: none; ${bgStyle} page-break-after: always; box-sizing: border-box; overflow: hidden; font-family: 'Inter', sans-serif;">
          ${fields.map((f: any) => {
            if (f.type === 'image') {
              return `
                <div style="position: absolute; top: ${f.y}%; left: ${f.x}%; transform: translate(-50%, -50%); width: ${f.width || 120}px; height: ${f.height || 60}px; display: flex; align-items: center; justify-content: center;">
                  <img src="${f.imageUrl}" style="width: 100%; height: 100%; object-fit: contain;" />
                </div>
              `;
            }

            let val = f.text;
            // replace variables mapping
            Object.keys(cert.valores_mapeados || {}).forEach(k => {
              val = val.replace(new RegExp(k, 'g'), cert.valores_mapeados[k]);
            });

            // Fallback default system variables if not resolved
            val = val.replace(/{{codigo_validacao}}/g, cert.codigo_validacao);

            const textAlignClass = f.align === 'center' ? 'text-align: center; transform: translateX(-50%); left: ' + f.x + '%;' : f.align === 'right' ? 'text-align: right; right: ' + (100 - f.x) + '%;' : 'text-align: left; left: ' + f.x + '%;';

            return `
              <div style="position: absolute; top: ${f.y}%; ${textAlignClass} font-size: ${f.fontSize}pt; color: ${f.color}; font-weight: ${f.fontWeight}; font-style: ${f.fontStyle || 'normal'}; line-height: 1.4; white-space: pre-line;">
                ${val}
              </div>
            `;
          }).join('')}
          
          <!-- QR Code Validation badge (rendered on selected page side if enabled) -->
          ${(((side === 'frente' && (!tpl.qrcode_config?.side || tpl.qrcode_config?.side === 'frente' || tpl.qrcode_config?.side === 'ambos')) ||
              (side === 'verso' && (tpl.qrcode_config?.side === 'verso' || tpl.qrcode_config?.side === 'ambos'))) && tpl.qrcode_config?.enabled) ? `
            <div style="position: absolute; top: ${tpl.qrcode_config?.y ?? 80}%; left: ${tpl.qrcode_config?.x ?? 80}%; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; gap: 4px; background: white; padding: 6px; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent((typeof window !== 'undefined' ? window.location.origin : 'https://ais-pre-s7c4hmf25vbtxcluo43jrl-711113335692.europe-west2.run.app') + '/validar/' + cert.codigo_validacao)}" style="width: ${tpl.qrcode_config?.size ?? 80}px; height: ${tpl.qrcode_config?.size ?? 80}px;" />
              <span style="font-size: 8px; font-weight: bold; color: #64748b; font-family: monospace;">REGISTRO: ${cert.codigo_validacao}</span>
            </div>
          ` : ''}
        </div>
      `;
    };

    const frenteHTML = renderSideHTML('frente', tpl.campos_frente || [], tpl.background_frente_url || '#ffffff');
    
    // Evaluate if template really has a back page (verso) configured to prevent generating blank pages
    const hasVerso = (tpl.campos_verso && tpl.campos_verso.length > 0) || 
                     (tpl.background_verso_url && (tpl.background_verso_url.startsWith('http') || tpl.background_verso_url.startsWith('data:image')));
    
    const versoHTML = hasVerso ? renderSideHTML('verso', tpl.campos_verso || [], tpl.background_verso_url || '#ffffff') : '';

    printWindow.document.write(`
      <html>
        <head>
          <title>${cert.codigo_validacao} - Imprimir</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Playfair+Display:ital,wght@0,600;1,400&family=Space+Grotesk:wght@500;700&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
          <style>
            @media print {
              body, html { width: 297mm; height: 210mm; margin: 0; padding: 0; background: #fff; }
              @page { size: landscape; margin: 0; }
            }
            body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f3f4f6; }
          </style>
        </head>
        <body onload="window.print()">
          ${frenteHTML}
          ${versoHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Filter history list
  const filteredCertificates = issuedCertificates.filter(c => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      (c.alunos?.nome || '').toLowerCase().includes(term) ||
      (c.codigo_validacao || '').toLowerCase().includes(term) ||
      (c.cursos?.nome || '').toLowerCase().includes(term);

    const matchesType = 
      filterType === 'todos' || 
      c.tipo === filterType;

    return matchesSearch && matchesType;
  });

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-800">
      
      {/* Banner / Header Title */}
      <div className="bg-slate-900 text-white py-10 px-8 border-b border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10 blur-2xl w-96 h-96 bg-gradient-to-tr from-amber-400 to-indigo-600 rounded-full" />
        <div className="relative max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Award size={24} />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight font-sans">
                  {language === 'pt' ? 'Certificados & Diplomas' : 'Certificates & Diplomas'}
                </h1>
                <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mt-1">
                  {language === 'pt' ? 'Módulo Acadêmico de Emissão e Registro de Atas' : 'Academic Issuance and Registry Engine'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => {
                setActiveTab('modelos');
                setIsEditingTemplate(true);
                setTplForm({
                  nome: '',
                  tipo: 'certificado',
                  background_frente_url: 'linear-gradient(135deg, #fefbf3 0%, #fcf8ec 100%)',
                  background_verso_url: '#fcf8ec',
                  campos_frente: [],
                  campos_verso: [],
                  qrcode_config: { enabled: true, x: 80, y: 80, size: 80 }
                });
                setSelectedFieldId(null);
              }}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 font-bold text-slate-950 text-xs rounded-xl flex items-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <Plus size={14} />
              {language === 'pt' ? 'Novo Modelo' : 'New Template'}
            </button>
            <button
              onClick={() => {
                setActiveTab('assinaturas');
                setIsEditingSignature(true);
              }}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/10 font-bold text-white text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer"
            >
              <Briefcase size={14} className="text-slate-400" />
              {language === 'pt' ? 'Cadastrar Assinatura' : 'Register Signature'}
            </button>
            <button
              onClick={() => {
                setActiveTab('emitir');
              }}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 font-bold text-white text-xs rounded-xl flex items-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <Users size={14} />
              {language === 'pt' ? 'Emissão em Lote' : 'Bulk Issuing'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs list bar */}
      <div className="border-b border-slate-200 bg-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 overflow-x-auto scrollbar-none flex gap-8">
          {[
            { id: 'dashboard', name: language === 'pt' ? 'Visão Geral' : 'Dashboard', icon: Layers },
            { id: 'modelos', name: language === 'pt' ? 'Modelos de Word & Imagens' : 'Word & Image Templates', icon: FileText },
            { id: 'assinaturas', name: language === 'pt' ? 'Assinaturas Registradas' : 'Authoritative Signatures', icon: Briefcase },
            { id: 'emitir', name: language === 'pt' ? 'Emitir Certificados' : 'Issue Certificates', icon: Award },
            { id: 'historico', name: language === 'pt' ? 'Histórico & Validação' : 'Log & Authenticity', icon: Shield }
          ].map(tab => {
            const IconEl = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setIsEditingTemplate(false);
                  setIsEditingSignature(false);
                }}
                className={cn(
                  "py-4.5 px-1 border-b-2 font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap",
                  active 
                    ? "border-slate-900 text-slate-900" 
                    : "border-transparent text-slate-400 hover:text-slate-600"
                )}
              >
                <IconEl size={14} />
                {tab.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Contents */}
      <div className="max-w-7xl mx-auto p-6 md:p-8">
        
        {/* TAB 1: DASHBOARD METRICS */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-fade-in">
            {/* Stats grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: language === 'pt' ? 'Total de Diplomas Emitidos' : 'Total Issued Diplomas', val: issuedCertificates.length, desc: language === 'pt' ? 'Registros autênticos ativos' : 'Active valid credentials', color: 'border-l-4 border-blue-500', icon: Award },
                { title: language === 'pt' ? 'Modelos do Word Cadastrados' : 'Word Templates Registered', val: templates.length, desc: language === 'pt' ? 'Acervo de layouts disponíveis' : 'Document layout catalog', color: 'border-l-4 border-amber-500', icon: FileText },
                { title: language === 'pt' ? 'Autoridades Responsáveis' : 'Authorized Authorities', val: signatures.length, desc: language === 'pt' ? 'Assinaturas ativas' : 'Active countersignatures', color: 'border-l-4 border-emerald-500', icon: Briefcase },
                { title: language === 'pt' ? 'Últimas 24h' : 'Last 24 Hours', val: recent24hCount, desc: language === 'pt' ? 'Emissões recentes em lote' : 'Recent credentials synced', color: 'border-l-4 border-indigo-500', icon: TrendingUp }
              ].map((stat, sIdx) => {
                const StatIcon = stat.icon;
                return (
                  <div key={sIdx} className={cn("bg-white p-6 rounded-3xl border border-slate-150 shadow-sm flex items-center justify-between", stat.color)}>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{stat.title}</span>
                      <h3 className="text-3xl font-black text-slate-900 mt-1">{stat.val}</h3>
                      <p className="text-[11px] text-slate-500 font-medium mt-1">{stat.desc}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-slate-400 md:block hidden">
                      <StatIcon size={20} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Dashboard bento grids */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Recent certificates Issued list */}
              <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">
                      {language === 'pt' ? 'Últimos Documentos Registrados' : 'Recent Academic Credentials Issued'}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">{language === 'pt' ? 'Emissões oficiais assinadas via e-Mala Direta' : 'Legit certified files signed off'}</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('historico')}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                  >
                    {language === 'pt' ? 'Ver Todos' : 'View All'} <ChevronRight size={14} />
                  </button>
                </div>

                {issuedCertificates.length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-slate-100 rounded-2xl">
                    <Award className="mx-auto text-slate-300 mb-3" size={32} />
                    <p className="text-xs text-slate-400 font-semibold">{language === 'pt' ? 'Nenhum certificado emitido até o momento.' : 'No certificates issued yet.'}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
                    {issuedCertificates.slice(0, 5).map((cert) => (
                      <div key={cert.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "p-2.5 rounded-xl shrink-0 border",
                            cert.tipo === 'diploma' 
                              ? "bg-indigo-500/5 border-indigo-500/10 text-indigo-500" 
                              : "bg-blue-500/5 border-blue-500/10 text-blue-500"
                          )}>
                            <Award size={18} />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-800">{cert.alunos?.nome || 'Estudante Sem Nome'}</h4>
                            <p className="text-xs text-slate-500 font-medium">
                              {cert.cursos?.nome || 'Curso'} • {cert.tipo === 'diploma' ? 'Diploma' : 'Certificado'}
                            </p>
                            <span className="inline-block mt-1 font-mono text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold uppercase">
                              🔒 REG: {cert.codigo_validacao}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => printCertificateElement(cert)}
                            className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors cursor-pointer"
                            title={language === 'pt' ? 'Imprimir Certificado' : 'Print Certificate'}
                          >
                            <Printer size={14} />
                          </button>
                          <span className="text-[10px] text-slate-400 font-bold ml-2">
                            {new Date(cert.data_emissao).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Security validation box */}
              <div className="bg-slate-900 text-white rounded-3xl p-6 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="p-3 bg-white/5 border border-white/10 rounded-2xl w-fit">
                    <Shield size={24} className="text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold tracking-tight">
                      {language === 'pt' ? 'Validação de Autenticidade' : 'Credential Authenticity'}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed mt-1">
                      {language === 'pt' 
                        ? 'Todo certificado emitido possui um QR Code inviolável e código único. Cole o código para verificar os dados do aluno.'
                        : 'Every issued document has a non-repudiation QR code. Paste the authenticity code below to run audit queries.'}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="CERT-XXXX-2026"
                      className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-white/20 transition-all font-mono"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setActiveTab('historico');
                      }}
                    />
                    <button 
                      onClick={() => {
                        setActiveTab('historico');
                      }}
                      className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <Search size={14} />
                      {language === 'pt' ? 'Pesquisar Registro' : 'Search Authenticity'}
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 text-[9px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5 justify-center">
                  <span className="block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {language === 'pt' ? 'Serviço de Registro Ativo e Conforme' : 'Registry service active & compliant'}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: TEMPLATES LIBRARY & VISUAL DESIGNER */}
        {activeTab === 'modelos' && (
          <div className="space-y-8 animate-fade-in">
            {!isEditingTemplate ? (
              // Default view: library of templates
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black text-slate-800">{language === 'pt' ? 'Acervo de Modelos de Diplomas' : 'Diploma Layout Catalog'}</h2>
                    <p className="text-xs text-slate-400 mt-1">{language === 'pt' ? 'Modelos de mala direta baseados em imagem ou Word (.docx)' : 'Mail merge blueprints with front & back side'}</p>
                  </div>
                </div>

                {templates.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 border-dashed">
                    <Award size={48} className="mx-auto text-slate-300 mb-4 animate-pulse" />
                    <h3 className="text-sm font-bold text-slate-700">{language === 'pt' ? 'Nenhum modelo cadastrado' : 'No layouts cataloged yet'}</h3>
                    <p className="text-xs text-slate-450 mt-1.5 leading-relaxed max-w-sm mx-auto">
                      {language === 'pt' 
                        ? 'Crie o primeiro layout de mala direta clicando em "Novo Modelo" acima'
                        : 'Register your first credential layout or style using Word template settings'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map((tpl) => (
                      <div key={tpl.id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between">
                        {/* Fake mini mockup of design */}
                        <div 
                          className="h-36 relative flex items-center justify-center overflow-hidden border-b border-slate-100"
                          style={getBackgroundStyle(tpl.background_frente_url)}
                        >
                          <div className="absolute inset-0 bg-black/20" />
                          <div className="relative text-center px-4">
                            <h4 className="text-xs font-extrabold uppercase tracking-widest text-white shadow-sm">{tpl.nome}</h4>
                            <span className="inline-block mt-2 bg-slate-900/80 px-2 py-0.5 rounded text-[8px] font-black uppercase text-white tracking-widest">
                              {tpl.tipo === 'diploma' ? 'Diploma' : 'Certificado'}
                            </span>
                          </div>
                        </div>

                        {/* Description / Actions info */}
                        <div className="p-5 space-y-3">
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                            {tpl.campos_frente?.length || 0} {language === 'pt' ? 'campos mapeados (frente)' : 'mapped fields (front)'}
                            {tpl.background_verso_url ? ` • ${tpl.campos_verso?.length || 0} (verso)` : ''}
                          </p>

                          <div className="flex items-center gap-2 pt-2">
                            <button
                              onClick={() => {
                                setTplForm(tpl);
                                setSelectedTemplate(tpl);
                                setIsEditingTemplate(true);
                              }}
                              className="flex-1 py-2 text-center bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 transition-colors border border-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Edit3 size={12} />
                              {language === 'pt' ? 'Editar Layout' : 'Modify Layout'}
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm(language === 'pt' ? 'Tem certeza que deseja remover este modelo?' : 'Remove this layout template?')) {
                                  await supabase.from('certificate_templates').update({ deleted_at: new Date().toISOString() }).eq('id', tpl.id);
                                  toast.success(language === 'pt' ? 'Modelo removido' : 'Layout removed');
                                  loadData();
                                }
                              }}
                              className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors border border-red-100 cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Active Interactive Layout Designer Canvas view
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                
                {/* Visual Editor Tools sidebar panel */}
                <div className="space-y-6 lg:col-span-1 bg-white p-5 rounded-3xl border border-slate-200">
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                      {language === 'pt' ? 'Paleta de Ferramentas' : 'Layout Toolkit'}
                    </h3>
                    <p className="text-xs text-slate-450">{language === 'pt' ? 'Adicione campos ou altere visual' : 'Add dynamic variables'}</p>
                  </div>

                  <div className="space-y-4 pt-2">
                    <label className="block text-[10px] font-black tracking-widest text-slate-400 uppercase">
                      {language === 'pt' ? 'Nome do Modelo' : 'Layout Title'}
                    </label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-150 px-3 py-2.5 text-xs rounded-xl focus:outline-none"
                      placeholder="Modelo Padrão Expedito"
                      value={tplForm.nome || ''}
                      onChange={(e) => setTplForm(p => ({ ...p, nome: e.target.value }))}
                    />

                    {/* Choose background palette presets */}
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black tracking-widest text-slate-400 uppercase">
                        {language === 'pt' ? 'Tema & Paleta de Fundo' : 'Theme & Core Palette'}
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button 
                          onClick={() => applyPresetBackground('classic')}
                          className="px-2 py-1.5 bg-amber-50/50 hover:bg-amber-100/50 border border-amber-200 text-[10px] rounded-lg font-bold text-amber-800 cursor-pointer"
                        >
                          Cremoso
                        </button>
                        <button 
                          onClick={() => applyPresetBackground('executive')}
                          className="px-2 py-1.5 bg-slate-900 border border-slate-800 text-[10px] rounded-lg font-bold text-slate-100 cursor-pointer"
                        >
                          Executivo
                        </button>
                        <button 
                          onClick={() => applyPresetBackground('grotesk')}
                          className="px-2 py-1.5 bg-white border border-slate-200 text-[10px] rounded-lg font-bold text-slate-800 cursor-pointer"
                        >
                          Minimalista
                        </button>
                      </div>
                    </div>

                    {/* Custom Background photo upload banner */}
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black tracking-widest text-slate-400 uppercase">
                        {language === 'pt' 
                          ? `Imagem de Fundo (${canvasSide === 'frente' ? 'Frente' : 'Verso'})` 
                          : `Background Image (${canvasSide === 'frente' ? 'Front' : 'Back'})`}
                      </label>
                      <div className="space-y-1.5">
                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-amber-400 p-3 rounded-xl cursor-pointer bg-slate-50 hover:bg-amber-500/5 transition-all group">
                          <Upload size={16} className="text-slate-400 group-hover:text-amber-500 transition-colors mb-1" />
                          <span className="text-[10px] font-bold text-slate-600 group-hover:text-amber-600 transition-colors">
                            {language === 'pt' ? 'Arraste ou clique para carregar' : 'Click/drag background layout'}
                          </span>
                          <span className="text-[8px] text-slate-400">PNG, JPG ou SVG (A4 Paisagem)</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleBackgroundUpload} 
                          />
                        </label>
                        <input
                          type="text"
                          placeholder={language === 'pt' ? "Ou cole URL de Imagem/Base64" : "Or paste image Link/Base64"}
                          className="w-full bg-slate-50 border border-slate-150 px-2.5 py-1.5 text-[9px] rounded-xl focus:outline-none text-slate-500"
                          value={(canvasSide === 'frente' ? tplForm.background_frente_url : tplForm.background_verso_url) || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (canvasSide === 'frente') {
                              setTplForm(p => ({ ...p, background_frente_url: val }));
                            } else {
                              setTplForm(p => ({ ...p, background_verso_url: val }));
                            }
                          }}
                        />
                      </div>
                    </div>

                    {/* QR Code Validation Control */}
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black tracking-widest text-slate-400 uppercase">
                        {language === 'pt' ? 'Módulo de Validação e Autenticidade' : 'Security QR Validation'}
                      </label>
                      <button
                        onClick={() => {
                          setTplForm(p => {
                            const newStatus = !p.qrcode_config?.enabled;
                            return {
                              ...p,
                              qrcode_config: {
                                ...(p.qrcode_config || { enabled: true, x: 80, y: 80, size: 80, side: 'frente' }),
                                enabled: newStatus
                              }
                            };
                          });
                          setSelectedFieldId(tplForm.qrcode_config?.enabled ? null : 'qrcode');
                          toast.success(
                            !tplForm.qrcode_config?.enabled
                              ? (language === 'pt' ? 'QR Code de segurança habilitado!' : 'QR Code verification badge enabled!')
                              : (language === 'pt' ? 'QR Code de segurança desabilitado!' : 'QR Code verification badge disabled!')
                          );
                        }}
                        className={cn(
                          "w-full py-2 px-3 border rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer",
                          tplForm.qrcode_config?.enabled
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-800"
                            : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <QrCode size={14} className={tplForm.qrcode_config?.enabled ? "text-emerald-600" : "text-slate-400"} />
                          <span>{language === 'pt' ? 'QR Code de Autenticidade' : 'Verification QR Code'}</span>
                        </div>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[9px] font-bold uppercase",
                          tplForm.qrcode_config?.enabled ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600"
                        )}>
                          {tplForm.qrcode_config?.enabled ? (language === 'pt' ? 'Ativo' : 'ON') : (language === 'pt' ? 'Inativo' : 'OFF')}
                        </span>
                      </button>
                    </div>

                    {/* Logos & Carimbos Upload and authorized library database selection */}
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black tracking-widest text-slate-400 uppercase">
                        {language === 'pt' ? 'Selos, Logos & Carimbos' : 'Seals, Logos & Stamps'}
                      </label>
                      <div className="space-y-1.5 bg-slate-50 border border-slate-150 p-2.5 rounded-xl">
                        <label className="flex items-center justify-center border border-dashed border-slate-200 hover:border-slate-350 p-2 rounded-xl cursor-pointer bg-white hover:bg-slate-50/50 transition-colors gap-1.5 shadow-sm group">
                          <Plus size={12} className="text-slate-400 group-hover:text-slate-600" />
                          <span className="text-[9px] font-bold text-slate-600 group-hover:text-slate-800">
                            {language === 'pt' ? 'Upload de Carimbo/Logo' : 'Upload Seal/Logo file'}
                          </span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleStampUpload} 
                          />
                        </label>
                        
                        {signatures.length > 0 && (
                          <div className="space-y-1 mt-1">
                            <span className="text-[8px] font-bold text-slate-400 uppercase block">{language === 'pt' ? 'Ou Assinatura Registrada:' : 'Or Registered Signature:'}</span>
                            <select 
                              onChange={(e) => {
                                const sigId = e.target.value;
                                if (!sigId) return;
                                const sig = signatures.find(s => s.id === sigId);
                                if (!sig) return;
                                
                                const list = canvasSide === 'frente' ? [...(tplForm.campos_frente || [])] : [...(tplForm.campos_verso || [])];
                                const newField = {
                                  id: generateUniqueFieldId(),
                                  key: 'assinatura',
                                  type: 'image',
                                  text: sig.nome_autoridade,
                                  imageUrl: sig.assinatura_url || '/placeholder-signature.png',
                                  x: 50,
                                  y: 75,
                                  width: 120,
                                  height: 60
                                };
                                const sideKey = canvasSide === 'frente' ? 'campos_frente' : 'campos_verso';
                                setTplForm(p => ({ ...p, [sideKey]: [...list, newField] }));
                                setSelectedFieldId(newField.id);
                                toast.success(language === 'pt' ? 'Assinatura inserida! Arraste para mover.' : 'Signature added! Drag to place.');
                                e.target.value = ''; 
                              }}
                              className="w-full bg-white border border-slate-150 p-1 px-1.5 text-[9px] text-slate-600 font-semibold rounded-lg focus:outline-none"
                            >
                              <option value="">{language === 'pt' ? '-- Selecionar Assinatura --' : '-- Choose Signature --'}</option>
                              {signatures.map(s => (
                                <option key={s.id} value={s.id}>{s.nome_autoridade} ({s.cargo})</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Insert tokens/variables buttons list */}
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black tracking-widest text-slate-400 uppercase">
                        {language === 'pt' ? 'Inserir Campos da Mala Direta' : 'Insert Mail Merge Tokens'}
                      </label>
                      
                      <div className="flex gap-1.5 mb-1.5">
                        <button
                          onClick={() => {
                            const list = canvasSide === 'frente' ? [...(tplForm.campos_frente || [])] : [...(tplForm.campos_verso || [])];
                            const newField = {
                              id: generateUniqueFieldId(),
                              key: '', 
                              text: language === 'pt' ? 'Digite seu texto aqui' : 'Type your text here',
                              x: 50,
                              y: 45,
                              fontSize: 14,
                              color: '#0f172a',
                              fontWeight: 'normal',
                              align: 'center',
                              fontStyle: 'normal'
                            };
                            const sideKey = canvasSide === 'frente' ? 'campos_frente' : 'campos_verso';
                            setTplForm(prev => ({ ...prev, [sideKey]: [...list, newField] }));
                            setSelectedFieldId(newField.id);
                            toast.success(language === 'pt' ? 'Texto livre adicionado!' : 'Static text block added!');
                          }}
                          className="w-full py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-[9px] font-black text-amber-800 rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Plus size={10} className="text-amber-600 shrink-0" />
                          {language === 'pt' ? 'Adicionar Bloco de Texto Customizável' : 'Add Customizable Text Block'}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                        {[
                          '{{nome_aluno}}', '{{cpf}}', '{{rg}}', '{{curso}}', '{{carga_horaria}}', 
                          '{{data_inicio}}', '{{data_termino}}', '{{data_emissao}}', '{{numero_certificado}}',
                          '{{instrutor}}', '{{diretor}}', '{{instituicao}}', '{{nota_final}}', '{{conceito}}'
                        ].map((v) => (
                          <button
                            key={v}
                            onClick={() => addFieldToCanvas(v)}
                            className="p-1 px-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[9px] font-bold text-slate-600 rounded text-left truncate flex items-center gap-1 cursor-pointer"
                            title={language === 'pt' ? 'Adicionar este campo à mala' : 'Place variable'}
                          >
                            <Plus size={10} className="text-slate-450 shrink-0" />
                            {v.replace(/{{|}}/g, '')}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Selected Field Style Editor Controls */}
                    {selectedField && (
                      <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-2xl space-y-3.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                            {language === 'pt' ? 'Estilo do Item' : 'Item Settings'}
                          </span>
                          <button
                            onClick={deleteSelectedField}
                            className="text-red-500 hover:text-red-700 p-1 bg-red-500/5 hover:bg-red-500/10 rounded-lg cursor-pointer animate-pulse"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>

                        {/* Live edit text content for customizable texts */}
                        {selectedField.type !== 'image' && !selectedField.key.startsWith('{{') && (
                          <div className="space-y-1">
                            <span className="text-[9px] font-black uppercase text-slate-450 tracking-wider">
                              {language === 'pt' ? 'Texto do Bloco' : 'Block Text'}
                            </span>
                            <textarea
                              rows={2}
                              className="w-full bg-white border border-slate-200 p-2 text-[10px] rounded-lg focus:outline-none"
                              value={selectedField.text || ''}
                              onChange={(e) => updateSelectedField({ text: e.target.value })}
                            />
                          </div>
                        )}

                        {/* Font weight and style options for customizable texts */}
                        {selectedField.type !== 'image' && (
                          <div className="flex gap-1.5 pt-1">
                            <button
                              onClick={() => updateSelectedField({ fontWeight: selectedField.fontWeight === 'bold' ? 'normal' : 'bold' })}
                              className={cn(
                                "flex-1 py-1 text-[9px] font-bold rounded-md border text-center cursor-pointer",
                                selectedField.fontWeight === 'bold' ? "bg-slate-900 border-slate-900 text-white" : "bg-white text-slate-600 border-slate-200"
                              )}
                            >
                              Negrito
                            </button>
                            <button
                              onClick={() => updateSelectedField({ fontStyle: selectedField.fontStyle === 'italic' ? 'normal' : 'italic' })}
                              className={cn(
                                "flex-1 py-1 text-[9px] font-semibold italic rounded-md border text-center cursor-pointer",
                                selectedField.fontStyle === 'italic' ? "bg-slate-900 border-slate-900 text-white" : "bg-white text-slate-600 border-slate-200"
                              )}
                            >
                              Itálico
                            </button>
                          </div>
                        )}

                        {/* Stamp image dimensions vs QR Code vs Text font size */}
                        {selectedField.type === 'image' || selectedField.type === 'qrcode' ? (
                          <div className="space-y-2.5">
                            <div className="space-y-1">
                              <span className="text-[9px] font-bold text-slate-450">
                                {selectedField.type === 'qrcode' 
                                  ? (language === 'pt' ? 'Tamanho do QR Code (px)' : 'QR Code Size (px)') 
                                  : (language === 'pt' ? 'Largura (px)' : 'Width (px)')} ({selectedField.width || 100}px)
                              </span>
                              <input 
                                type="range" 
                                min="30" 
                                max="300" 
                                className="w-full accent-slate-950" 
                                value={selectedField.width || 100}
                                onChange={(e) => updateSelectedField({ width: parseInt(e.target.value) })}
                              />
                            </div>
                            {selectedField.type === 'qrcode' ? (
                              <div className="space-y-1">
                                <span className="text-[9px] font-bold text-slate-450">{language === 'pt' ? 'Exibir no Lado:' : 'Render on Side:'}</span>
                                <div className="grid grid-cols-3 gap-1">
                                  {[
                                    { key: 'frente', label: language === 'pt' ? 'Frente' : 'Front' },
                                    { key: 'verso', label: language === 'pt' ? 'Verso' : 'Back' },
                                    { key: 'ambos', label: language === 'pt' ? 'Ambos' : 'Both' }
                                  ].map((opt) => (
                                    <button
                                      key={opt.key}
                                      onClick={() => updateSelectedField({ side: opt.key })}
                                      className={cn(
                                        "p-1 text-[9px] font-bold rounded border cursor-pointer text-center",
                                        (tplForm.qrcode_config?.side || 'frente') === opt.key
                                          ? "bg-slate-900 text-white"
                                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                      )}
                                    >
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <span className="text-[9px] font-bold text-slate-450">{language === 'pt' ? 'Altura (px)' : 'Height (px)'} ({selectedField.height || 60}px)</span>
                                <input 
                                  type="range" 
                                  min="20" 
                                  max="400" 
                                  className="w-full accent-slate-950" 
                                  value={selectedField.height || 60}
                                  onChange={(e) => updateSelectedField({ height: parseInt(e.target.value) })}
                                />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-slate-450">{language === 'pt' ? 'Tamanho da Fonte' : 'Font Size'} ({selectedField.fontSize || 14}pt)</span>
                            <input 
                              type="range" 
                              min="8" 
                              max="54" 
                              className="w-full accent-slate-950" 
                              value={selectedField.fontSize || 14}
                              onChange={(e) => updateSelectedField({ fontSize: parseInt(e.target.value) })}
                            />
                          </div>
                        )}

                        {/* Alignment buttons */}
                        {selectedField.type !== 'image' && (
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-slate-450">{language === 'pt' ? 'Alinhamento' : 'Alignment'}</span>
                            <div className="grid grid-cols-3 gap-1">
                              {['left', 'center', 'right'].map((al) => (
                                <button
                                  key={al}
                                  onClick={() => updateSelectedField({ align: al })}
                                  className={cn(
                                    "p-1 text-[9px] font-bold rounded border cursor-pointer capitalize text-center",
                                    selectedField.align === al
                                      ? "bg-slate-900 text-white"
                                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                  )}
                                >
                                  {al}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Coords positioning */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-slate-450">Posição Y (%)</span>
                            <input
                              type="number"
                              className="w-full bg-white border border-slate-200 py-1 px-1.5 text-[10px] rounded-lg"
                              value={selectedField.y || 0}
                              onChange={(e) => updateSelectedField({ y: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) })}
                            />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-slate-450">Posição X (%)</span>
                            <input
                              type="number"
                              className="w-full bg-white border border-slate-200 py-1 px-1.5 text-[10px] rounded-lg"
                              value={selectedField.x || 0}
                              onChange={(e) => updateSelectedField({ x: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) })}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="pt-2 flex gap-2">
                      <button
                        onClick={handleCreateTemplate}
                        className="flex-1 py-2.5 bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                      >
                        {language === 'pt' ? 'Salvar Modelo' : 'Save Full Template'}
                      </button>
                      <button
                        onClick={() => setIsEditingTemplate(false)}
                        className="py-2.5 px-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-xs text-slate-600 font-bold rounded-xl transition-colors cursor-pointer"
                      >
                        {language === 'pt' ? 'Cancelar' : 'Cancel'}
                      </button>
                    </div>

                  </div>
                </div>

                {/* VISUAL LAYOUT CANVAS PREVIEW (LANDSCAPE LAND) */}
                <div className="lg:col-span-3 space-y-4">
                  {/* Canvas Headers */}
                  <div className="flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-slate-150">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCanvasSide('frente')}
                        className={cn(
                          "px-3 py-1 text-[11px] font-bold rounded-lg cursor-pointer transition-colors",
                          canvasSide === 'frente' ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                        )}
                      >
                        {language === 'pt' ? 'Frente do Certificado' : 'Front Aspect'}
                      </button>
                      <button
                        onClick={() => setCanvasSide('verso')}
                        className={cn(
                          "px-3 py-1 text-[11px] font-bold rounded-lg cursor-pointer transition-colors",
                          canvasSide === 'verso' ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                        )}
                      >
                        {language === 'pt' ? 'Verso (Documentação)' : 'Back Aspect (Roster details)'}
                      </button>
                    </div>

                    <span className="text-[10px] text-amber-500 font-bold bg-amber-500/5 border border-amber-500/10 px-2 py-0.5 rounded-lg">
                      📐 {language === 'pt' ? 'Padrão A4 Paisagem (842x595)' : 'Standard Landscape A4'}
                    </span>
                  </div>

                  {/* Absolute positioning designer canvas board */}
                  <div className="relative border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex items-center justify-center p-4 bg-slate-100">
                    <div
                      ref={canvasRef}
                      onMouseMove={handleCanvasMouseMove}
                      onMouseUp={handleCanvasMouseUp}
                      onMouseLeave={handleCanvasMouseUp}
                      className="relative w-full aspect-[1.414/1] max-w-4xl shadow-lg border border-slate-200 overflow-hidden select-none bg-white"
                      style={{
                        ...getBackgroundStyle(canvasSide === 'frente' ? tplForm.background_frente_url : tplForm.background_verso_url),
                        color: '#0f172a'
                      }}
                    >
                      {/* Interactive mapped text and image/stamp fields */}
                      {(canvasSide === 'frente' ? tplForm.campos_frente : tplForm.campos_verso)?.map((field) => {
                        const isSelected = selectedFieldId === field.id;
                        
                        let alignStyle: React.CSSProperties = {};
                        if (field.align === 'center') {
                          alignStyle = { left: `${field.x}%`, transform: 'translateX(-50%)', textAlign: 'center' };
                        } else if (field.align === 'right') {
                          alignStyle = { right: `${100 - field.x}%`, textAlign: 'right' };
                        } else {
                          alignStyle = { left: `${field.x}%` };
                        }

                        if (field.type === 'image') {
                          return (
                            <div
                              key={field.id}
                              onMouseDown={(e) => handleFieldMouseDown(field.id, e)}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFieldId(field.id);
                              }}
                              className={cn(
                                "absolute cursor-move select-none p-1 rounded-lg border leading-tight transition-all",
                                isSelected 
                                  ? "border-amber-500 bg-amber-200/40 ring-2 ring-amber-500/20" 
                                  : "border-transparent hover:border-slate-300 hover:bg-black/5"
                              )}
                              style={{
                                top: `${field.y}%`,
                                left: `${field.x}%`,
                                transform: 'translate(-50%, -50%)',
                                width: field.width || 120,
                                height: field.height || 60,
                              }}
                            >
                              <img 
                                src={field.imageUrl} 
                                alt={field.text} 
                                className="w-full h-full object-contain pointer-events-none" 
                              />
                            </div>
                          );
                        }

                        return (
                          <div
                            key={field.id}
                            onMouseDown={(e) => handleFieldMouseDown(field.id, e)}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFieldId(field.id);
                            }}
                            className={cn(
                              "absolute cursor-move select-none p-1.5 rounded-lg border leading-tight transition-all",
                              isSelected 
                                ? "border-slate-900 bg-amber-200/40 font-bold underline ring-2 ring-slate-900/10" 
                                : "border-transparent hover:border-slate-300 hover:bg-black/5"
                            )}
                            style={{
                              top: `${field.y}%`,
                              fontSize: `${field.fontSize}pt`,
                              color: field.color || '#0f172a',
                              fontWeight: field.fontWeight || 'normal',
                              fontStyle: field.fontStyle || 'normal',
                              ...alignStyle
                            }}
                          >
                            {field.text}
                          </div>
                        );
                      })}

                      {/* Dynamic visual placeholder for validation and QR code badge */}
                      {tplForm.qrcode_config?.enabled && (
                        ((canvasSide === 'frente' && (!tplForm.qrcode_config?.side || tplForm.qrcode_config?.side === 'frente' || tplForm.qrcode_config?.side === 'ambos')) ||
                         (canvasSide === 'verso' && (tplForm.qrcode_config?.side === 'verso' || tplForm.qrcode_config?.side === 'ambos')))
                      ) && (
                        <div 
                          onMouseDown={handleQrCodeMouseDown}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFieldId('qrcode');
                          }}
                          className={cn(
                            "absolute cursor-move select-none p-1.5 border bg-white flex flex-col items-center justify-center gap-1.5 shadow-sm rounded-xl transition-all",
                            selectedFieldId === 'qrcode' 
                              ? "border-slate-900 bg-amber-50 ring-2 ring-slate-900/15" 
                              : "border-slate-250 hover:border-slate-350 hover:bg-slate-55/40"
                          )}
                          style={{
                            top: `${tplForm.qrcode_config?.y ?? 80}%`,
                            left: `${tplForm.qrcode_config?.x ?? 80}%`,
                            transform: 'translate(-50%, -50%)',
                            width: `${tplForm.qrcode_config?.size ?? 80}px`,
                            height: `${tplForm.qrcode_config?.size ?? 80}px`
                          }}
                        >
                          <QrCode size={(tplForm.qrcode_config?.size ?? 80) * 0.45} className="text-slate-800 shrink-0" />
                          <span className="text-[6px] text-slate-450 font-bold uppercase tracking-wider" style={{ fontSize: `${Math.max(5, (tplForm.qrcode_config?.size ?? 80) * 0.08)}px` }}>REGISTRO</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-450 text-center font-medium leading-relaxed">
                    💡 {language === 'pt' ? 'Clique em qualquer elemento no certificado acima para editar as configurações de coordenadas de drag no painel esquerdo!' : 'Click any of the credential elements above to calibrate precise position alignments and typography!'}
                  </p>
                </div>

              </div>
            )}
          </div>
        )}

        {/* TAB 3: AUTHORITATIVE SIGNATURE REPOSITORY */}
        {activeTab === 'assinaturas' && (
          <div className="space-y-8 animate-fade-in">
            {isEditingSignature ? (
              // Create signature registry form
              <div className="max-w-xl mx-auto bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">{language === 'pt' ? 'Registrar Nova Assinatura' : 'Register Digital Signature'}</h3>
                  <p className="text-xs text-slate-400 mt-1">{language === 'pt' ? 'Insira o nome, cargo oficial e o upload digitalizado' : 'Define authority roles & signatures properties'}</p>
                </div>

                <form onSubmit={handleSaveSignature} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">{language === 'pt' ? 'Nome Completo da Autoridade' : 'Full Name of Official'}</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-150 p-3 text-xs rounded-xl focus:outline-none"
                      placeholder="Ex: Alte. Carlos Augusto de Souza, Diretor de Ensino"
                      value={sigForm.nome_autoridade}
                      onChange={(e) => setSigForm(p => ({ ...p, nome_autoridade: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">{language === 'pt' ? 'Cargo ou Função' : 'Cargo / Institutional Role'}</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-150 p-3 text-xs rounded-xl focus:outline-none"
                      placeholder="Ex: Diretor de Instrução / Coordenador Pedagógico"
                      value={sigForm.cargo}
                      onChange={(e) => setSigForm(p => ({ ...p, cargo: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">{language === 'pt' ? 'Assinatura Escaneada (Base64 ou Link)' : 'Scanned Signature (URL or Base64)'}</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-150 p-3 text-xs rounded-xl focus:outline-none"
                      placeholder="Ex: url para imagem transparente ou deixar vazio para desenho eletrônico automático"
                      value={sigForm.assinatura_url}
                      onChange={(e) => setSigForm(p => ({ ...p, assinatura_url: e.target.value }))}
                    />
                  </div>

                  <div className="flex gap-3.5 pt-4">
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="flex-1 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
                    >
                      {language === 'pt' ? 'Salvar Registro' : 'Save Signature'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingSignature(false)}
                      className="px-6 py-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs text-slate-600 font-bold rounded-xl cursor-pointer"
                    >
                      {language === 'pt' ? 'Cancelar' : 'Cancel'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              // List signatures
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-black text-slate-850 uppercase tracking-widest">{language === 'pt' ? 'Coleção de Assinaturas' : 'Registered Signatures Directory'}</h3>
                  <p className="text-xs text-slate-400 mt-1">{language === 'pt' ? 'Assinaturas autorizadas para as pautas de diplomas impressos' : 'Signed records of authority entities'}</p>
                </div>

                {signatures.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 border-dashed">
                    <Briefcase size={40} className="mx-auto text-slate-300 mb-3 animate-pulse" />
                    <h4 className="text-xs font-bold text-slate-700">{language === 'pt' ? 'Nenhuma autoridade registrada' : 'No authority registered'}</h4>
                    <p className="text-xs text-slate-450 mt-1">{language === 'pt' ? 'Clique em "Cadastrar Assinatura" acima para criar.' : 'Add your first authority panel'}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {signatures.map((sig) => (
                      <div key={sig.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div>
                            <h4 className="text-sm font-bold text-slate-800">{sig.nome_autoridade}</h4>
                            <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider mt-0.5">{sig.cargo}</p>
                          </div>
                          <button
                            onClick={async () => {
                              if (confirm(language === 'pt' ? 'Excluir esta assinatura?' : 'Delete signature?')) {
                                await supabase.from('certificate_signatures').update({ deleted_at: new Date().toISOString() }).eq('id', sig.id);
                                loadData();
                              }
                            }}
                            className="p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-500/5 cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        {/* Display visual of signature */}
                        <div className="h-20 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center overflow-hidden p-2">
                          <img src={sig.assinatura_url} alt="Digital Sign" className="max-h-full object-contain" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: BULK EMISSION WIZARD */}
        {activeTab === 'emitir' && (
          <div className="space-y-8 animate-fade-in">
            {isSecretary ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Filtration & settings wizard board */}
                <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">{language === 'pt' ? 'Painel de Seleção' : 'Issuance Parameters'}</h3>
                    <p className="text-xs text-slate-450">{language === 'pt' ? 'Mala direta em lote instantânea' : 'Select class targets to synthesize'}</p>
                  </div>

                  <div className="space-y-4 pt-2">
                    {/* Course */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">{language === 'pt' ? 'Selecione o Curso Geral' : '1. Course Target'}</label>
                      <select
                        className="w-full bg-slate-50 border border-slate-150 p-3 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer text-slate-700 font-medium"
                        value={selectedCourseId}
                        onChange={(e) => {
                          setSelectedCourseId(e.target.value);
                          setSelectedTurmaId('');
                          setStudents([]);
                        }}
                      >
                        <option value="">{language === 'pt' ? 'Qual Curso?' : 'Select Course...'}</option>
                        {courses.map(c => (
                          <option key={c.id} value={c.id}>{c.nome}</option>
                        ))}
                      </select>
                    </div>

                    {/* Class Turma */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">{language === 'pt' ? 'Selecione a Turma' : '2. Class / Group'}</label>
                      <select
                        className="w-full bg-slate-50 border border-slate-150 p-3 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer text-slate-700 font-mediumCode"
                        value={selectedTurmaId}
                        onChange={(e) => setSelectedTurmaId(e.target.value)}
                        disabled={!selectedCourseId}
                      >
                        <option value="">{language === 'pt' ? 'Qual Turma?' : 'Select Class...'}</option>
                        {classes.filter(t => t.curso_id === selectedCourseId).map(t => (
                          <option key={t.id} value={t.id}>{t.nome}</option>
                        ))}
                      </select>
                    </div>

                    {/* Template layout */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">{language === 'pt' ? 'Modelo Visual de Fundo' : '3. Template Design'}</label>
                      <select
                        className="w-full bg-slate-50 border border-slate-150 p-3 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer text-slate-700 font-medium"
                        value={issuanceTemplateId}
                        onChange={(e) => setIssuanceTemplateId(e.target.value)}
                      >
                        <option value="">{language === 'pt' ? 'Qual Modelo?' : 'Select Blueprint...'}</option>
                        {templates.map(t => (
                          <option key={t.id} value={t.id}>{t.nome} ({t.tipo})</option>
                        ))}
                      </select>
                    </div>

                    {/* Signatures assigned */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">{language === 'pt' ? 'Assinatura Principal (Diretor)' : '4. Authorized Director'}</label>
                      <select
                        className="w-full bg-slate-50 border border-slate-150 p-3 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer text-slate-700 font-medium"
                        value={issuanceDirectorId}
                        onChange={(e) => setIssuanceDirectorId(e.target.value)}
                      >
                        <option value="">{language === 'pt' ? 'Quem assina?' : 'Select Director Signature...'}</option>
                        {signatures.map(s => (
                          <option key={s.id} value={s.id}>{s.nome_autoridade} ({s.cargo})</option>
                        ))}
                      </select>
                    </div>

                    <div className="pt-4">
                      <button
                        onClick={handleBulkIssueAction}
                        disabled={actionLoading || !selectedTurmaId || selectedStudentIds.length === 0}
                        className="w-full py-3.5 bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                      >
                        <CheckCircle size={14} className="text-emerald-400 animate-pulse" />
                        {language === 'pt' ? 'Emitir Agora' : 'Initiate Batch Issuance'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Enrollment Student List selector board */}
                <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">{language === 'pt' ? 'Alunos da Turma Selecionada' : 'Students Class Roster'}</h3>
                      <p className="text-xs text-slate-450 mt-0.5">{language === 'pt' ? 'Marque os alunos que receberão os diplomas' : 'Mark the students to assign diplomas'}</p>
                    </div>
                    {students.length > 0 && (
                      <span className="text-[11px] font-black text-slate-500 bg-slate-100 border px-3 py-1 rounded-xl">
                        {selectedStudentIds.length} / {students.length} {language === 'pt' ? 'Selecionados' : 'Selected'}
                      </span>
                    )}
                  </div>

                  {students.length === 0 ? (
                    <div className="p-16 text-center text-slate-400">
                      <Users size={36} className="mx-auto text-slate-200 mb-3" />
                      <p className="text-xs font-semibold leading-relaxed max-w-xs mx-auto">
                        {language === 'pt' 
                          ? 'Selecione primeiro uma turma ativa no painel esquerdo para carregar o diário' 
                          : 'Please specify an active course class to load and preview register lists'}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 overflow-y-auto max-h-[450px]">
                      {students.map((student) => {
                        const isChecked = selectedStudentIds.includes(student.id);
                        return (
                          <div 
                            key={student.id} 
                            onClick={() => {
                              if (isChecked) {
                                setSelectedStudentIds(prev => prev.filter(id => id !== student.id));
                              } else {
                                setSelectedStudentIds(prev => [...prev, student.id]);
                              }
                            }}
                            className="p-4 px-6 hover:bg-slate-50 flex items-center justify-between gap-4 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "h-5 w-5 rounded-md border flex items-center justify-center transition-all",
                                isChecked ? "bg-slate-900 border-slate-900 text-white" : "border-slate-350 bg-white"
                              )}>
                                {isChecked && <Check size={12} strokeWidth={3} />}
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-slate-800">{student.nome}</h4>
                                <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider mt-0.5">
                                  Matrícula: {student.matricula} {student.nif ? `| NIF: ${student.nif}` : ''}
                                </p>
                              </div>
                            </div>

                            <span className="text-[11px] text-emerald-600 bg-emerald-50 Border border-emerald-100 font-bold px-2.5 py-1 rounded-lg">
                              Aprovado (9.5)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Summary indicator */}
                  <div className="p-5.5 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-500 font-bold uppercase tracking-wider text-center">
                    🔒 {language === 'pt' ? 'Mecanismo de Rastreamento de Auditoria Habilitado' : 'Compliance-proof record tracking logged'}
                  </div>
                </div>

              </div>
            ) : (
              <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl">
                <AlertTriangle className="mx-auto text-amber-500 mb-3" size={32} />
                <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">Acesso Privativo</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-2 leading-relaxed">
                  {language === 'pt' 
                    ? 'Apenas usuários com perfil administrativo ou secretaria possuem autoridade concedida de emitir diplomas.' 
                    : 'Only administrative personnel and Secretariat profile hold sufficient issuance authority.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: COMPLIANCE REGISTRY & HISTORY */}
        {activeTab === 'historico' && (
          <div className="space-y-6 animate-fade-in">
            {/* Filter Toolbar bar */}
            <div className="bg-white p-5 rounded-3xl border border-slate-250 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder={language === 'pt' ? "Buscar por aluno, curso ou código..." : "Search by student, course or tracking code..."}
                  className="w-full bg-slate-50 border border-slate-150 pl-11 pr-4 py-2.5 text-xs rounded-xl focus:outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex gap-2 w-full md:w-auto">
                {['todos', 'certificado', 'diploma'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t as any)}
                    className={cn(
                      "flex-1 md:flex-initial px-4 py-2 text-xs font-bold rounded-lg cursor-pointer capitalize border transition-all",
                      filterType === t 
                        ? "bg-slate-900 border-slate-900 text-white" 
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* List block */}
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-150 bg-slate-50/50">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">{language === 'pt' ? 'Atas Registradas de Emissão' : 'Authenticated Academic Logs'}</h3>
                <p className="text-[11px] text-slate-400 font-bold mt-0.5">{language === 'pt' ? 'Chaves criptográficas e registros digitais públicos' : 'Inviolable blockchain-like signatures registered'}</p>
              </div>

              {filteredCertificates.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                  <Award size={48} className="mx-auto text-slate-200 mb-4" />
                  <h4 className="text-xs font-semibold">{language === 'pt' ? 'Nenhum registro encontrado' : 'No records match filtering'}</h4>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-450 uppercase font-black tracking-widest border-b border-slate-100 text-[9px]">
                        <th className="p-4 pl-6">Aluno / Aluno Id</th>
                        <th className="p-4">Curso / Turma</th>
                        <th className="p-4">Tipo</th>
                        <th className="p-4">Código Único</th>
                        <th className="p-4 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredCertificates.map((cert) => (
                        <tr key={cert.id} className="hover:bg-slate-50/50">
                          <td className="p-4 pl-6">
                            <div className="font-bold text-slate-800">{cert.alunos?.nome || 'Estudante'}</div>
                            <div className="text-[9px] text-slate-450 font-bold uppercase tracking-wider mt-0.5">Matrícula: {cert.alunos?.matricula}</div>
                          </td>
                          <td className="p-4">
                            <div className="font-semibold text-slate-700">{cert.cursos?.nome || 'Curso'}</div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{cert.turmas?.nome || 'Turma'}</div>
                          </td>
                          <td className="p-4">
                            <span className={cn(
                              "text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md",
                              cert.tipo === 'diploma' ? "bg-indigo-50 text-indigo-600" : "bg-blue-50 text-blue-600"
                            )}>
                              {cert.tipo}
                            </span>
                          </td>
                          <td className="p-4 font-mono font-bold text-slate-650">
                            🔒 {cert.codigo_validacao}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => printCertificateElement(cert)}
                                className="p-2 border border-slate-200 hover:bg-slate-900 hover:text-white rounded-lg transition-colors cursor-pointer text-slate-500"
                                title={language === 'pt' ? 'Imprimir / Baixar' : 'Print / Download'}
                              >
                                <Printer size={13} />
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={async () => {
                                    if (confirm(language === 'pt' ? 'Deseja revogar e remover permanentemente este diploma?' : 'Revoke this credential permanently?')) {
                                      await supabase.from('certificados').update({ deleted_at: new Date().toISOString() }).eq('id', cert.id);
                                      toast.success(language === 'pt' ? 'Certificado revogado' : 'Credential revoked');
                                      loadData();
                                    }
                                  }}
                                  className="p-2 bg-red-100/5 hover:bg-red-500 hover:text-white rounded-lg transition-colors border border-red-100 text-red-500 cursor-pointer"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
