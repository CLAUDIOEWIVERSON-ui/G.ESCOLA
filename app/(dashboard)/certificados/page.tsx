'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { useUser } from '@/lib/auth/UserContext';
import { 
  GraduationCap, 
  Search, 
  FileDown, 
  Printer, 
  Settings, 
  Plus, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  Upload,
  Image as ImageIcon,
  Type,
  Layout,
  Palette,
  FileText,
  FileCheck,
  Camera,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Settings2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import Modal from '@/components/Modal';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function CertificadosPage() {
  const { t, language } = useI18n();
  const { isAdmin, isAluno } = useUser();
  const isGuest = isAluno;
  
  const [loading, setLoading] = useState(true);
  const [cursos, setCursos] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [alunos, setAlunos] = useState<any[]>([]);
  const [certificados, setCertificados] = useState<any[]>([]);
  
  const [selectedCurso, setSelectedCurso] = useState('');
  const [selectedTurma, setSelectedTurma] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isDesignModalOpen, setIsDesignModalOpen] = useState(false);
  const [selectedAluno, setSelectedAluno] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  
  const certificateRef = useRef<HTMLDivElement>(null);
  
  const [template, setTemplate] = useState({
    titleField: 'CERTIFICADO DE CONCLUSÃO',
    bodyText: 'Certificamos que o(a) aluno(a) {NOME} concluiu com aproveitamento o curso de {CURSO}, realizado no período de {DATA_INICIO} a {DATA_FIM}.',
    signature1: 'Diretor Geral',
    signature2: 'Coordenador Pedagógico',
    backgroundColor: '#ffffff',
    borderColor: '#b4975a', // Golden border
    textColor: '#1e293b',
    logoUrl: '',
    bgImageUrl: '',
    watermarkUrl: '',
    stampUrl: '',
    frameUrl: '',
    fontFamily: 'font-serif',
    titleFontSize: '48px',
    bodyFontSize: '16px',
    textAlign: 'center',
    borderWidth: '16px',
    showRulers: true,
    isBold: false,
    isItalic: false,
  });

  const fonts = [
    { name: 'Cinzel (Clássico)', value: 'font-cinzel' },
    { name: 'Playfair (Elegante)', value: 'font-playfair' },
    { name: 'Montserrat (Moderno)', value: 'font-montserrat' },
    { name: 'Script (Caligrafia)', value: 'font-script' },
    { name: 'Serif (Padrão)', value: 'font-serif' },
  ];

  const fontSizes = ['12px', '14px', '16px', '18px', '20px', '24px', '32px', '48px', '64px'];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [cursosRes, turmasRes, certificadosRes] = await Promise.all([
          supabase.from('cursos').select('*').is('deleted_at', null).order('nome'),
          supabase.from('turmas').select('*, curso:cursos(nome)').is('deleted_at', null).order('nome'),
          supabase.from('certificados').select('*, aluno:alunos(nome), curso:cursos(nome)').is('deleted_at', null).order('created_at', { ascending: false })
        ]);

        if (cursosRes.data) setCursos(cursosRes.data);
        if (turmasRes.data) setTurmas(turmasRes.data);
        if (certificadosRes.data) setCertificados(certificadosRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchAlunos = async () => {
      if (!selectedTurma) {
        setAlunos([]);
        return;
      }
      const { data } = await supabase
        .from('alunos')
        .select('*')
        .eq('turma_id', selectedTurma)
        .is('deleted_at', null)
        .order('nome');
      if (data) setAlunos(data);
    };
    fetchAlunos();
  }, [selectedTurma]);

  const handleAssetUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'bg' | 'watermark' | 'stamp' | 'frame') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const loaders = {
      logo: setLogoUploading,
      bg: (v: boolean) => setLogoUploading(v), // Reusing logo loading state for simplicity or could add more
      watermark: (v: boolean) => setLogoUploading(v),
      stamp: (v: boolean) => setLogoUploading(v),
      frame: (v: boolean) => setLogoUploading(v),
    };

    loaders[type](true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}-${Date.now()}.${fileExt}`;
      const filePath = `certificates/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('escola')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('escola')
        .getPublicUrl(filePath);

      const fieldMap = {
        logo: 'logoUrl',
        bg: 'bgImageUrl',
        watermark: 'watermarkUrl',
        stamp: 'stampUrl',
        frame: 'frameUrl',
      };

      setTemplate({ ...template, [fieldMap[type]]: publicUrl });
    } catch (err: any) {
      alert(`Erro no upload: ${err.message || ''}`);
    } finally {
      loaders[type](false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => handleAssetUpload(e, 'logo');

  const handleOpenDesigner = (aluno: any) => {
    setSelectedAluno(aluno);
    setIsDesignModalOpen(true);
  };

  const getProcessedText = (text: string, aluno: any) => {
    const turma = turmas.find(t => t.id === aluno.turma_id);
    const curso = cursos.find(c => c.id === turma?.curso_id);
    
    return text
      .replace(/{NOME}/g, aluno.nome.toUpperCase())
      .replace(/{CURSO}/g, curso?.nome || '')
      .replace(/{DATA_INICIO}/g, curso?.data_inicio ? new Date(curso.data_inicio).toLocaleDateString() : '')
      .replace(/{DATA_FIM}/g, curso?.data_fim ? new Date(curso.data_fim).toLocaleDateString() : '')
      .replace(/{MATRICULA}/g, aluno.matricula || '')
      .replace(/{NIF}/g, aluno.nif || '');
  };

  const downloadPDF = async () => {
    if (!certificateRef.current) return;
    setGenerating(true);
    
    try {
      const canvas = await html2canvas(certificateRef.current, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: null
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      const width = pdf.internal.pageSize.getWidth();
      const height = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(imgData, 'PNG', 0, 0, width, height);
      pdf.save(`Certificado_${selectedAluno.nome.replace(/\s+/g, '_')}.pdf`);
      
      // Save to database
      await supabase.from('certificados').insert([{
        aluno_id: selectedAluno.id,
        turma_id: selectedAluno.turma_id,
        curso_id: turmas.find(t => t.id === selectedAluno.turma_id)?.curso_id,
        tipo: 'certificado',
        template_data: template,
        data_emissao: new Date().toISOString()
      }]);
      
      // Refresh list
      const { data } = await supabase.from('certificados').select('*, aluno:alunos(nome), curso:cursos(nome)').is('deleted_at', null).order('created_at', { ascending: false });
      if (data) setCertificados(data);
      
      setIsDesignModalOpen(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Erro ao gerar certificado');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
            {language === 'pt' ? 'Certificados e Diplomas' : 'Certificates & Diplomas'}
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            {language === 'pt' 
              ? 'Emissão profissional de certificados totalmente editáveis.' 
              : 'Professional issuance of fully editable certificates.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          {/* Filters */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wider">
              <Settings size={16} className="text-slate-400" />
              {t.common.filters}
            </h3>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.nav.courses}</label>
                <select
                  value={selectedCurso}
                  onChange={(e) => {
                    setSelectedCurso(e.target.value);
                    setSelectedTurma('');
                  }}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 outline-none text-sm font-medium"
                >
                  <option value="">{t.courses.selectCourse}</option>
                  {cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.attendance.selectClass}</label>
                <select
                  disabled={!selectedCurso}
                  value={selectedTurma}
                  onChange={(e) => setSelectedTurma(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 outline-none text-sm font-medium disabled:opacity-50"
                >
                  <option value="">{t.grades.selectTurma}</option>
                  {turmas.filter(t => t.curso_id === selectedCurso).map(t => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Student List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col max-h-[500px]">
             <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">{t.nav.students}</h3>
                <span className="text-[10px] font-mono bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{alunos.length}</span>
             </div>
             <div className="p-3 border-b border-slate-100">
               <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                 <input 
                   type="text" 
                   placeholder={t.common.search}
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="w-full pl-9 pr-4 py-2 border border-slate-100 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/10 outline-none"
                 />
               </div>
             </div>
             <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-50">
               {alunos.length === 0 ? (
                 <div className="py-20 text-center px-4">
                   <Layout size={32} className="mx-auto text-slate-200 mb-2" />
                   <p className="text-[10px] font-medium text-slate-400 italic">
                     {selectedTurma ? 'Nenhum aluno encontrado' : 'Selecione uma turma para ver os alunos'}
                   </p>
                 </div>
               ) : (
                 alunos.filter(a => a.nome.toLowerCase().includes(searchTerm.toLowerCase())).map(aluno => (
                   <div key={aluno.id} className="p-3 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[10px]">
                          {aluno.nome.charAt(0)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800">{aluno.nome}</div>
                          <div className="text-[9px] text-slate-400 font-medium">#{aluno.matricula}</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleOpenDesigner(aluno)}
                        className="p-1.5 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                      >
                        <Plus size={14} />
                      </button>
                   </div>
                 ))
               )}
             </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
           {/* Issued Certificates List */}
           <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <FileCheck size={18} className="text-blue-500" />
                  {language === 'pt' ? 'Certificados Emitidos' : 'Issued Certificates'}
                </h3>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/30 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                      <th className="px-6 py-4">{t.reportCard.student}</th>
                      <th className="px-6 py-4">{t.nav.courses}</th>
                      <th className="px-6 py-4 text-center">{language === 'pt' ? 'Emissão' : 'Issued'}</th>
                      <th className="px-6 py-4 text-right">{t.common.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="py-20 text-center">
                          <Loader2 className="animate-spin mx-auto text-blue-600" />
                        </td>
                      </tr>
                    ) : certificados.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-20 text-center">
                           <FileText size={48} className="mx-auto text-slate-200 mb-2 opacity-50" />
                           <p className="text-xs font-medium text-slate-400 italic">Nenhum certificado emitido ainda</p>
                        </td>
                      </tr>
                    ) : (
                      certificados.map(cert => (
                        <tr key={cert.id} className="hover:bg-slate-50/50 transition-colors group">
                           <td className="px-6 py-4">
                             <div className="text-sm font-bold text-slate-800">{cert.aluno?.nome}</div>
                           </td>
                           <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                             {cert.curso?.nome}
                           </td>
                           <td className="px-6 py-4 text-center text-[10px] font-mono text-slate-400">
                             {new Date(cert.data_emissao).toLocaleDateString()}
                           </td>
                           <td className="px-6 py-4 text-right">
                             <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg">
                                 <Printer size={16} />
                               </button>
                               <button className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg">
                                 <FileDown size={16} />
                               </button>
                             </div>
                           </td>
                        </tr>
                      ))
                    )}
                  </tbody>
               </table>
             </div>
           </div>
        </div>
      </div>

      {/* Certificate Designer Modal */}
      <Modal 
        isOpen={isDesignModalOpen} 
        onClose={() => setIsDesignModalOpen(false)}
        title={language === 'pt' ? 'Editor Profissional de Certificado' : 'Professional Certificate Editor'}
      >
        <div className="flex flex-col xl:flex-row gap-6 max-h-[90vh]">
          {/* Advanced Toolbox */}
          <div className="w-full xl:w-96 space-y-6 overflow-y-auto pr-2 custom-scrollbar xl:border-r border-slate-100 p-1">
            <div className="space-y-6">
               {/* Text Formatting Section */}
               <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Type size={14} className="text-blue-600" />
                    <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Tipografia & Texto</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Fonte</label>
                      <select 
                        value={template.fontFamily}
                        onChange={(e) => setTemplate({...template, fontFamily: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold outline-none focus:ring-2 focus:ring-blue-500/10"
                      >
                        {fonts.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tam. Título</label>
                      <select 
                        value={template.titleFontSize}
                        onChange={(e) => setTemplate({...template, titleFontSize: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold outline-none focus:ring-2 focus:ring-blue-500/10"
                      >
                        {fontSizes.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tam. Corpo</label>
                      <select 
                        value={template.bodyFontSize}
                        onChange={(e) => setTemplate({...template, bodyFontSize: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold outline-none focus:ring-2 focus:ring-blue-500/10"
                      >
                        {fontSizes.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button 
                        onClick={() => setTemplate({...template, textAlign: 'left'})}
                        className={cn("p-1.5 rounded transition-all", template.textAlign === 'left' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}
                      >
                        <AlignLeft size={14} />
                      </button>
                      <button 
                        onClick={() => setTemplate({...template, textAlign: 'center'})}
                        className={cn("p-1.5 rounded transition-all", template.textAlign === 'center' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}
                      >
                        <AlignCenter size={14} />
                      </button>
                      <button 
                        onClick={() => setTemplate({...template, textAlign: 'right'})}
                        className={cn("p-1.5 rounded transition-all", template.textAlign === 'right' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}
                      >
                        <AlignRight size={14} />
                      </button>
                    </div>
                    <div className="w-px h-4 bg-slate-200 mx-1" />
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button 
                        onClick={() => setTemplate({...template, isBold: !template.isBold})}
                        className={cn("p-1.5 rounded transition-all", template.isBold ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}
                      >
                        <Bold size={14} />
                      </button>
                      <button 
                        onClick={() => setTemplate({...template, isItalic: !template.isItalic})}
                        className={cn("p-1.5 rounded transition-all", template.isItalic ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}
                      >
                        <Italic size={14} />
                      </button>
                    </div>
                  </div>

                  <div>
                     <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Título do Documento</label>
                     <input 
                       type="text" 
                       value={template.titleField}
                       onChange={(e) => setTemplate({...template, titleField: e.target.value})}
                       className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500/10 outline-none"
                     />
                  </div>

                  <div>
                     <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Corpo do Texto</label>
                     <textarea 
                       rows={4}
                       value={template.bodyText}
                       onChange={(e) => setTemplate({...template, bodyText: e.target.value})}
                       className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-medium focus:ring-2 focus:ring-blue-500/10 outline-none leading-relaxed min-h-[100px]"
                     />
                     <div className="flex flex-wrap gap-1.5 mt-1.5">
                       {['{NOME}', '{CURSO}', '{DATA_INICIO}', '{DATA_FIM}'].map(tag => (
                         <button 
                           key={tag}
                           onClick={() => setTemplate({...template, bodyText: template.bodyText + ' ' + tag})}
                           className="px-1.5 py-0.5 bg-slate-100 text-[8px] font-bold text-slate-500 rounded border border-slate-200 hover:bg-white hover:text-blue-600 transition-colors"
                         >
                           {tag}
                         </button>
                       ))}
                     </div>
                  </div>
               </div>

               {/* Design Section */}
               <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2 text-amber-600">
                    <Palette size={14} />
                    <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Estética & Layout</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Fundo</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={template.backgroundColor} onChange={(e) => setTemplate({...template, backgroundColor: e.target.value})} className="h-8 w-full rounded cursor-pointer border-0 p-0" />
                        <span className="text-[10px] font-mono text-slate-400 uppercase">{template.backgroundColor}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Borda</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={template.borderColor} onChange={(e) => setTemplate({...template, borderColor: e.target.value})} className="h-8 w-full rounded cursor-pointer border-0 p-0" />
                        <span className="text-[10px] font-mono text-slate-400 uppercase">{template.borderColor}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative group">
                      <button className="w-full flex flex-col items-center justify-center gap-2 p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl hover:bg-white hover:border-blue-400 hover:text-blue-600 transition-all text-slate-500 group">
                        {logoUploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                        <span className="text-[9px] font-black uppercase tracking-widest">Carimbo</span>
                      </button>
                      <input type="file" accept="image/*" onChange={(e) => handleAssetUpload(e, 'stamp')} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>
                    <div className="relative group">
                      <button className="w-full flex flex-col items-center justify-center gap-2 p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl hover:bg-white hover:border-blue-400 hover:text-blue-600 transition-all text-slate-500">
                        {logoUploading ? <Loader2 size={16} className="animate-spin" /> : <FileCheck size={16} />}
                        <span className="text-[9px] font-black uppercase tracking-widest">M. D&apos;água</span>
                      </button>
                      <input type="file" accept="image/*" onChange={(e) => handleAssetUpload(e, 'watermark')} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>
                    <div className="relative group">
                      <button className="w-full flex flex-col items-center justify-center gap-2 p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl hover:bg-white hover:border-blue-400 hover:text-blue-600 transition-all text-slate-500 group">
                        {logoUploading ? <Loader2 size={16} className="animate-spin" /> : <Settings2 size={16} />}
                        <span className="text-[9px] font-black uppercase tracking-widest">Moldura</span>
                      </button>
                      <input type="file" accept="image/*" onChange={(e) => handleAssetUpload(e, 'frame')} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="relative group">
                      <button className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95">
                        <Upload size={16} />
                        UPLOAD TEMPLATE PP (PPTX)
                      </button>
                      <input type="file" accept="image/*" onChange={(e) => handleAssetUpload(e, 'bg')} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>
                    <p className="text-[8px] text-slate-400 text-center italic font-medium px-4">Ideal para certificados prontos exportados do Power Point.</p>
                  </div>
               </div>

               <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layout size={14} className="text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Réguas & Guias</span>
                  </div>
                  <button 
                    onClick={() => setTemplate({...template, showRulers: !template.showRulers})}
                    className={cn(
                      "w-10 h-5 rounded-full transition-all relative",
                      template.showRulers ? "bg-blue-600" : "bg-slate-300"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                      template.showRulers ? "right-1" : "left-1"
                    )} />
                  </button>
               </div>
            </div>
          </div>

          {/* Canvas Wrapper */}
          <div className="flex-1 flex flex-col gap-6">
             <div className="bg-slate-900/5 p-4 sm:p-12 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex items-center justify-center overflow-auto min-h-[500px] relative scrollbar-hide">
                {/* Certificate Stage */}
                <div 
                  ref={certificateRef}
                  style={{ 
                    backgroundColor: template.backgroundColor, 
                    borderColor: template.borderColor,
                    color: template.textColor,
                    borderWidth: template.bgImageUrl ? '0' : template.borderWidth,
                    backgroundImage: template.bgImageUrl ? `url(${template.bgImageUrl})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                  className={cn(
                    "w-[1123px] h-[794px] min-w-[1123px] min-h-[794px] border-solid shadow-2xl relative p-20 flex flex-col items-center justify-between text-center transition-all duration-500 overflow-hidden",
                    template.fontFamily
                  )}
                >
                  {/* Grid Rulers */}
                  <AnimatePresence>
                    {template.showRulers && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 pointer-events-none z-50 opacity-10"
                        style={{
                          backgroundImage: 'linear-gradient(to right, #ccc 1px, transparent 1px), linear-gradient(to bottom, #ccc 1px, transparent 1px)',
                          backgroundSize: '20px 20px'
                        }}
                      />
                    )}
                  </AnimatePresence>

                  {/* Frame/Moldura */}
                  {template.frameUrl && (
                    <div className="absolute inset-0 pointer-events-none z-40">
                      <img src={template.frameUrl} alt="Frame" className="w-full h-full object-fill" referrerPolicy="no-referrer" />
                    </div>
                  )}

                  {/* Watermark */}
                  {template.watermarkUrl && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none z-0">
                      <img src={template.watermarkUrl} alt="Watermark" className="w-[60%] h-[60%] object-contain grayscale" referrerPolicy="no-referrer" />
                    </div>
                  )}

                  {/* Stamp (Floating Image) */}
                  {template.stampUrl && (
                    <div className="absolute bottom-20 right-20 z-10 animate-bounce cursor-move">
                      <img src={template.stampUrl} alt="Stamp" className="w-32 h-32 object-contain rotate-12 drop-shadow-lg" referrerPolicy="no-referrer" />
                    </div>
                  )}
                  
                  {/* Header Content */}
                  <div className="relative z-10 w-full flex flex-col items-center gap-6">
                    {template.logoUrl ? (
                      <div className="w-32 h-32 relative mb-2">
                        <img src={template.logoUrl} alt="Logo" className="object-contain w-full h-full drop-shadow-sm" referrerPolicy="no-referrer" />
                      </div>
                    ) : (
                      <div className="w-28 h-28 bg-white/80 rounded-full flex items-center justify-center border-4 border-slate-50 mb-2 shadow-inner">
                        <GraduationCap size={48} className="text-blue-500" />
                      </div>
                    )}
                    
                    <div className="space-y-4">
                      <h1 
                        className="font-black tracking-[0.25em] leading-tight"
                        style={{ fontSize: template.titleFontSize }}
                      >
                        {template.titleField}
                      </h1>
                      <div className="h-1.5 w-64 bg-slate-900 mx-auto rounded-full" />
                    </div>
                  </div>

                  {/* Main Body */}
                  <div className="relative z-10 max-w-4xl space-y-12">
                     <div className="space-y-4">
                        <p className="text-xl font-medium italic opacity-60">Certificamos solenemente que para os devidos fins que</p>
                        <h2 className="text-6xl font-black tracking-tight border-b-4 border-slate-900 inline-block px-12 py-3 mx-auto">
                          {selectedAluno?.nome.toUpperCase() || 'NOME DO ALUNO'}
                        </h2>
                     </div>
                     <p 
                       className="leading-[1.8] px-20 opacity-80"
                       style={{ 
                         fontSize: template.bodyFontSize,
                         textAlign: template.textAlign as any,
                         fontWeight: template.isBold ? 'bold' : 'normal',
                         fontStyle: template.isItalic ? 'italic' : 'normal'
                       }}
                     >
                       {selectedAluno ? getProcessedText(template.bodyText, selectedAluno) : template.bodyText}
                     </p>
                  </div>

                  {/* Signatures */}
                  <div className="relative z-10 grid grid-cols-2 gap-40 w-full px-32 mb-10">
                     <div className="flex flex-col items-center gap-3">
                        <div className="w-full border-t-2 border-slate-900" />
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] opacity-60">
                          {template.signature1}
                        </span>
                     </div>
                     <div className="flex flex-col items-center gap-3">
                        <div className="w-full border-t-2 border-slate-900" />
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] opacity-60">
                          {template.signature2}
                        </span>
                     </div>
                  </div>
                </div>
             </div>

             <div className="flex flex-col sm:flex-row gap-4 p-2">
                <button
                  type="button"
                  disabled={generating}
                  onClick={() => setIsDesignModalOpen(false)}
                  className="flex-1 px-8 py-4 border border-slate-200 text-slate-500 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-slate-50 hover:text-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  DESDESCARTAR ALTERAÇÕES
                </button>
                <div className="flex-1 flex gap-2">
                  <button
                    type="button"
                    disabled={generating}
                    onClick={() => {
                        setTemplate({
                            ...template,
                            logoUrl: '',
                            bgImageUrl: '',
                            watermarkUrl: '',
                            stampUrl: '',
                            frameUrl: '',
                        })
                    }}
                    className="p-4 bg-slate-100 text-slate-600 rounded-[2rem] hover:bg-slate-200 transition-all font-black text-[10px]"
                    title="Resetar Layout"
                  >
                    RESET
                  </button>
                  <button
                    type="button"
                    disabled={generating}
                    onClick={downloadPDF}
                    className="flex-[4] px-8 py-4 bg-blue-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-blue-800 transition-all shadow-xl shadow-blue-900/20 active:scale-95 flex items-center justify-center gap-3"
                  >
                    {generating ? <Loader2 size={20} className="animate-spin" /> : <FileDown size={20} />}
                    EMITIR & BAIXAR CERTIFICADO PDF
                  </button>
                </div>
             </div>
          </div>
        </div>
      </Modal>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Montserrat:wght@300;400;700;900&family=Petit+Formal+Script&family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&display=swap');

        .font-script { font-family: 'Petit Formal Script', cursive; }
        .font-cinzel { font-family: 'Cinzel', serif; }
        .font-montserrat { font-family: 'Montserrat', sans-serif; }
        .font-playfair { font-family: 'Playfair Display', serif; }

        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
