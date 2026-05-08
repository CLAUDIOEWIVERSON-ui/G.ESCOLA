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
  Camera
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
  });

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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `config/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('escola')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('escola')
        .getPublicUrl(filePath);

      setTemplate({ ...template, logoUrl: publicUrl });
    } catch (err: any) {
      alert('Erro no upload do logo: ' + (err.message || ''));
    } finally {
      setLogoUploading(false);
    }
  };

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
        <div className="flex flex-col lg:flex-row gap-6 max-h-[85vh]">
          {/* Controls */}
          <div className="w-full lg:w-80 space-y-6 overflow-y-auto pr-2 custom-scrollbar lg:border-r border-slate-100">
            <div className="space-y-4">
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Type size={12} className="text-blue-500" />
                    {language === 'pt' ? 'Título' : 'Title'}
                  </label>
                  <input 
                    type="text" 
                    value={template.titleField}
                    onChange={(e) => setTemplate({...template, titleField: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/10 outline-none"
                  />
               </div>

               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <FileText size={12} className="text-blue-500" />
                    {language === 'pt' ? 'Texto do Corpo' : 'Body Text'}
                  </label>
                  <textarea 
                    rows={4}
                    value={template.bodyText}
                    onChange={(e) => setTemplate({...template, bodyText: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] focus:ring-2 focus:ring-blue-500/10 outline-none leading-relaxed"
                  />
                  <p className="text-[8px] text-slate-400 mt-1 italic font-medium">Use: {'{NOME}'}, {'{CURSO}'}, {'{DATA_INICIO}'}, {'{DATA_FIM}'}</p>
               </div>

               <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Palette size={12} className="text-blue-500" />
                      {language === 'pt' ? 'Fundo' : 'Background'}
                    </label>
                    <input 
                      type="color" 
                      value={template.backgroundColor}
                      onChange={(e) => setTemplate({...template, backgroundColor: e.target.value})}
                      className="w-full h-8 p-0 border-0 bg-transparent cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Palette size={12} className="text-blue-500" />
                      {language === 'pt' ? 'Borda' : 'Border'}
                    </label>
                    <input 
                      type="color" 
                      value={template.borderColor}
                      onChange={(e) => setTemplate({...template, borderColor: e.target.value})}
                      className="w-full h-8 p-0 border-0 bg-transparent cursor-pointer"
                    />
                  </div>
               </div>

               <div className="flex flex-col gap-2 pt-4">
                  <div className="relative">
                    <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-all shadow-lg shadow-slate-200 disabled:opacity-50">
                      {logoUploading ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
                      {language === 'pt' ? 'Mudar Logotipo' : 'Change Logo'}
                    </button>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                  <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all">
                    <Upload size={14} />
                    {language === 'pt' ? 'Subir Fundo' : 'Upload Background'}
                  </button>
               </div>
            </div>
          </div>

          {/* Preview */}
          <div className="flex-1 flex flex-col gap-6">
             <div className="bg-slate-900/5 p-8 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden min-h-[400px]">
                {/* Certificate Template */}
                <div 
                  ref={certificateRef}
                  style={{ 
                    backgroundColor: template.backgroundColor, 
                    borderColor: template.borderColor,
                    color: template.textColor
                  }}
                  className="w-[842px] h-[595px] border-[16px] shadow-2xl relative p-16 flex flex-col items-center justify-between text-center select-none"
                >
                  {/* Decorative Border */}
                  <div className="absolute inset-2 border-2 border-slate-200/50 pointer-events-none" />
                  
                  {/* Header/Logo Placeholder */}
                  <div className="flex flex-col items-center">
                    {template.logoUrl ? (
                      <div className="w-24 h-24 relative mb-4">
                        <img src={template.logoUrl} alt="Logo" className="object-contain w-full h-full" referrerPolicy="no-referrer" />
                      </div>
                    ) : (
                      <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center border-4 border-slate-50 mb-4 shadow-inner">
                        <GraduationCap size={40} className="text-slate-300" />
                      </div>
                    )}
                    <h1 className="text-3xl font-serif font-black tracking-[0.2em] mb-2">{template.titleField}</h1>
                    <div className="h-1 w-48 bg-slate-800 rounded-full" />
                  </div>

                  {/* Body */}
                  <div className="max-w-2xl space-y-8">
                     <p className="text-lg font-serif italic text-slate-500">Este documento certifica que</p>
                     <p className="text-5xl font-serif font-black tracking-widest border-b-2 border-slate-800 inline-block px-8 py-2">
                       {selectedAluno?.nome.toUpperCase()}
                     </p>
                     <p className="text-base font-serif leading-relaxed px-12 text-slate-600 line-clamp-3">
                       {selectedAluno ? getProcessedText(template.bodyText, selectedAluno) : template.bodyText}
                     </p>
                  </div>

                  {/* Signatures */}
                  <div className="grid grid-cols-2 gap-32 w-full px-24">
                     <div className="flex flex-col items-center">
                        <div className="w-full border-t border-slate-800 mb-2" />
                        <p className="text-[10px] font-bold uppercase tracking-wider">{template.signature1}</p>
                     </div>
                     <div className="flex flex-col items-center">
                        <div className="w-full border-t border-slate-800 mb-2" />
                        <p className="text-[10px] font-bold uppercase tracking-wider">{template.signature2}</p>
                     </div>
                  </div>

                  {/* Footer Decoration */}
                  <div className="absolute bottom-16 right-16">
                     <div className="w-20 h-20 border-8 border-amber-400 opacity-20 rotate-45 flex items-center justify-center">
                        <div className="w-full h-full border-2 border-amber-400" />
                     </div>
                  </div>
                </div>
             </div>

             <div className="flex gap-4">
                <button
                  type="button"
                  disabled={generating}
                  onClick={() => setIsDesignModalOpen(false)}
                  className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all active:scale-[0.98]"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="button"
                  disabled={generating}
                  onClick={downloadPDF}
                  className="flex-[2] px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {generating ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />}
                  {language === 'pt' ? 'Gerar e baixar PDF Profissional' : 'Generate & Download Professional PDF'}
                </button>
             </div>
          </div>
        </div>
      </Modal>

      <style jsx global>{`
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
      `}</style>
    </div>
  );
}
