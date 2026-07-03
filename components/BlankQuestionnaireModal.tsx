'use client';

import { useState } from 'react';
import { X, Printer, Download, Eye, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface BlankQuestionnaireModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BlankQuestionnaireModal({ isOpen, onClose }: BlankQuestionnaireModalProps) {
  const [generating, setGenerating] = useState(false);

  if (!isOpen) return null;

  const handlePrint = () => {
    // We add a window.print() call. The CSS @media print is optimized to print only the printable document container
    window.print();
  };

  const handleDownloadPDF = async () => {
    try {
      setGenerating(true);
      toast.loading('Rendendo alta fidelidade do questionário PDF...');

      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const page1Element = document.getElementById('print-page-1');
      const page2Element = document.getElementById('print-page-2');

      if (!page1Element || !page2Element) {
        throw new Error('Elementos do documento não encontrados.');
      }

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Render Page 1
      const canvas1 = await html2canvas(page1Element, {
        scale: 2, // higher resolution
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const imgData1 = canvas1.toDataURL('image/png');
      const imgWidth = 210; // A4 standard width in mm
      const imgHeight = (canvas1.height * imgWidth) / canvas1.width;
      
      pdf.addImage(imgData1, 'PNG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');

      // Add Page 2
      pdf.addPage();
      const canvas2 = await html2canvas(page2Element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const imgData2 = canvas2.toDataURL('image/png');
      const imgHeight2 = (canvas2.height * imgWidth) / canvas2.width;
      
      pdf.addImage(imgData2, 'PNG', 0, 0, imgWidth, imgHeight2, undefined, 'FAST');

      pdf.save('Questionario_Avaliacao_Pos_Curso_Assessoria_Naval.pdf');
      toast.dismiss();
      toast.success('Questionário de Avaliação Pós-Curso baixado com sucesso!');
    } catch (error: any) {
      console.error('PDF Generation Error:', error);
      toast.dismiss();
      toast.error('Erro ao gerar PDF: ' + (error.message || 'Erro inesperado. Tente a opção "Imprimir via Navegador".'));
    } finally {
      setGenerating(false);
    }
  };

  const SECT_I_QUESTIONS = [
    "O conteúdo atendeu aos objetivos propostos.",
    "O conteúdo foi relevante para minha atividade profissional.",
    "A carga horária foi adequada.",
    "O material didático foi satisfatório.",
    "As atividades práticas contribuíram para a aprendizagem.",
    "O curso atendeu às minhas expectativas."
  ];

  const SECT_II_QUESTIONS = [
    "Demonstrou domínio do conteúdo.",
    "Apresentou clareza nas explicações.",
    "Demonstrou boa didática.",
    "Manteve pontualidade e assiduidade.",
    "Solucionou dúvidas adequadamente.",
    "Manteve bom relacionamento com a turma.",
    "Conduziu adequadamente as atividades práticas."
  ];

  const SECT_III_QUESTIONS = [
    "Minha participação nas aulas foi satisfatória.",
    "Demonstrei interesse pelo conteúdo ministrado.",
    "Mantive frequência adequada.",
    "Dediquei-me às atividades propostas.",
    "Aproveitei adequadamente os conhecimentos transmitidos."
  ];

  const SECT_IV_QUESTIONS = [
    "A sala de aula foi adequada para a realização do curso.",
    "Os equipamentos disponíveis atenderam às necessidades do curso.",
    "Os recursos audiovisuais foram satisfatórios.",
    "A organização administrativa do curso foi eficiente.",
    "O ambiente de ensino favoreceu a aprendizagem."
  ];

  const SECT_V_QUESTIONS = [
    "O curso contribuirá para meu desempenho profissional.",
    "Aplicarei os conhecimentos adquiridos em minhas atividades.",
    "Recomendaria este curso a outros profissionais."
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto font-sans print:p-0 print:bg-white print:absolute print:inset-0">
      {/* Container holding controls and mock sheets */}
      <div className="bg-slate-100 rounded-3xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[95vh] border border-slate-200 overflow-hidden print:shadow-none print:border-none print:bg-white print:max-h-full print:w-full print:rounded-none">
        
        {/* Controls - Hidden during browser print */}
        <div className="p-5 border-b border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-50 text-indigo-700 p-2.5 rounded-xl border border-indigo-100">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-905 uppercase tracking-wide">Modelo de Questionário em Branco</h2>
              <p className="text-[11px] text-slate-500">Imprima para preenchimento manual ou salve em PDF o documento oficial de São Tomé e Príncipe.</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition shadow-sm cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              Imprimir via Navegador
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={generating}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition shadow-sm disabled:bg-slate-400 cursor-pointer"
            >
              <Download className="h-4 w-4" />
              {generating ? 'Gerando PDF...' : 'Baixar PDF Oficial'}
            </button>

            <button
              onClick={onClose}
              className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition"
              title="Fechar Visualização"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Paper Sheet Interactive Scroller */}
        <div className="p-6 md:p-8 overflow-y-auto bg-slate-50 flex flex-col items-center gap-8 print:p-0 print:bg-white print:overflow-visible shrink">
          
          {/* ==================== PAGE 1 ==================== */}
          <div 
            id="print-page-1"
            className="w-[210mm] min-h-[297mm] bg-white text-slate-900 p-[15mm] md:p-[20mm] rounded-lg shadow-lg flex flex-col justify-between border border-slate-200 select-none print:shadow-none print:border-none print:rounded-none print:w-full print:p-0 print:my-0 print:min-h-0"
          >
            <div>
              {/* Header */}
              <div className="text-center border-b-[3px] border-indigo-700 pb-3 mb-4">
                <h1 className="text-indigo-805 text-sm md:text-base font-extrabold uppercase tracking-widest font-sans leading-tight">
                  Missão de Assessoria Naval do Brasil em São Tomé e Príncipe
                </h1>
                <h2 className="text-slate-700 text-xs md:text-sm font-bold uppercase tracking-wider mt-1.5 font-sans">
                  Questionário de Avaliação Pós-Curso
                </h2>
              </div>

              {/* Info fields */}
              <div className="grid grid-cols-3 gap-6 text-[10px] md:text-[11px] font-mono mb-4 text-slate-800">
                <div className="flex items-center gap-1 border-b border-slate-300 pb-1">
                  <span className="font-bold text-slate-500">Curso:</span>
                  <span className="flex-1"></span>
                </div>
                <div className="flex items-center gap-1 border-b border-slate-300 pb-1">
                  <span className="font-bold text-slate-500">Turma:</span>
                  <span className="flex-1"></span>
                </div>
                <div className="flex items-center gap-1 border-b border-slate-300 pb-1">
                  <span className="font-bold text-slate-500">Data:</span>
                  <span className="flex-1"></span>
                </div>
              </div>

              {/* Evaluation score criteria details box */}
              <div className="border border-indigo-100 bg-indigo-50/45 rounded-xl p-3 mb-5 font-sans text-[10px] md:text-[11px] text-slate-780">
                <p className="font-extrabold text-indigo-900 border-b border-indigo-100/60 pb-1 uppercase tracking-wider text-[10px] mb-2">
                  Escala de Avaliação / Critério de Pontuação:
                </p>
                <div className="grid grid-cols-3 gap-3 font-medium">
                  <div>
                    <span className="font-bold text-indigo-700">CP</span> = Concordo Plenamente <span className="text-slate-400 font-mono">(5 pts)</span>
                  </div>
                  <div>
                    <span className="font-bold text-indigo-700">CPa</span> = Concordo Parcialmente <span className="text-slate-400 font-mono">(3 pts)</span>
                  </div>
                  <div>
                    <span className="font-bold text-indigo-700">NC/NA</span> = Não Concordo / Não se Aplica <span className="text-slate-400 font-mono">(1 pt)</span>
                  </div>
                </div>
              </div>

              {/* Section I */}
              <div className="mb-4">
                <div className="bg-indigo-900 text-white px-3 py-1.5 rounded-lg text-[10px] md:text-[11px] font-black uppercase tracking-wider mb-2 font-mono flex justify-between items-center">
                  <span>I. Avaliação do Curso</span>
                  <span className="text-[9px] text-white/70 font-mono">Págn. 1</span>
                </div>
                <table className="w-full text-[10px] md:text-[11px] border-collapse font-sans text-slate-800">
                  <tbody>
                    {SECT_I_QUESTIONS.map((qText, index) => (
                      <tr key={index} className="border-b border-slate-100 py-1.5 flex items-center justify-between">
                        <td className="w-2/3 pr-4 font-medium text-slate-700">
                          {index + 1}. {qText}
                        </td>
                        <td className="flex gap-4 shrink-0 font-mono font-bold text-slate-400">
                          <label className="flex items-center gap-1 cursor-default">
                            <span className="border border-slate-400 rounded w-3.5 h-3.5 flex items-center justify-center text-[9px] text-indigo-600 bg-white">[ ]</span>
                            <span className="text-[9px] text-slate-500 font-sans font-bold">CP</span>
                          </label>
                          <label className="flex items-center gap-1 cursor-default">
                            <span className="border border-slate-400 rounded w-3.5 h-3.5 flex items-center justify-center text-[9px] text-indigo-600 bg-white">[ ]</span>
                            <span className="text-[9px] text-slate-500 font-sans font-bold">CPa</span>
                          </label>
                          <label className="flex items-center gap-1 cursor-default">
                            <span className="border border-slate-400 rounded w-3.5 h-3.5 flex items-center justify-center text-[9px] text-indigo-600 bg-white">[ ]</span>
                            <span className="text-[9px] text-slate-500 font-sans font-bold">NC/NA</span>
                          </label>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Section II */}
              <div className="mb-4">
                <div className="bg-indigo-900 text-white px-3 py-1.5 rounded-lg text-[10px] md:text-[11px] font-black uppercase tracking-wider mb-2 font-mono flex justify-between items-center">
                  <span>II. Avaliação do Instrutor</span>
                  <span className="text-[9px] text-white/70 font-mono">Págn. 1</span>
                </div>
                <table className="w-full text-[10px] md:text-[11px] border-collapse font-sans text-slate-800">
                  <tbody>
                    {SECT_II_QUESTIONS.map((qText, index) => (
                      <tr key={index} className="border-b border-slate-100 py-1.5 flex items-center justify-between">
                        <td className="w-2/3 pr-4 font-medium text-slate-700">
                          {index + 1}. {qText}
                        </td>
                        <td className="flex gap-4 shrink-0 font-mono font-bold text-slate-400">
                          <label className="flex items-center gap-1 cursor-default">
                            <span className="border border-slate-400 rounded w-3.5 h-3.5 flex items-center justify-center text-[9px] text-indigo-600 bg-white">[ ]</span>
                            <span className="text-[9px] text-slate-500 font-sans font-bold">CP</span>
                          </label>
                          <label className="flex items-center gap-1 cursor-default">
                            <span className="border border-slate-400 rounded w-3.5 h-3.5 flex items-center justify-center text-[9px] text-indigo-600 bg-white">[ ]</span>
                            <span className="text-[9px] text-slate-500 font-sans font-bold">CPa</span>
                          </label>
                          <label className="flex items-center gap-1 cursor-default">
                            <span className="border border-slate-400 rounded w-3.5 h-3.5 flex items-center justify-center text-[9px] text-indigo-600 bg-white">[ ]</span>
                            <span className="text-[9px] text-slate-500 font-sans font-bold">NC/NA</span>
                          </label>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Section III */}
              <div className="mb-4">
                <div className="bg-indigo-900 text-white px-3 py-1.5 rounded-lg text-[10px] md:text-[11px] font-black uppercase tracking-wider mb-2 font-mono flex justify-between items-center">
                  <span>III. Autoavaliação do Aluno</span>
                  <span className="text-[9px] text-white/70 font-mono">Págn. 1</span>
                </div>
                <table className="w-full text-[10px] md:text-[11px] border-collapse font-sans text-slate-800">
                  <tbody>
                    {SECT_III_QUESTIONS.map((qText, index) => (
                      <tr key={index} className="border-b border-slate-100 py-1.5 flex items-center justify-between">
                        <td className="w-2/3 pr-4 font-medium text-slate-700">
                          {index + 1}. {qText}
                        </td>
                        <td className="flex gap-4 shrink-0 font-mono font-bold text-slate-400">
                          <label className="flex items-center gap-1 cursor-default">
                            <span className="border border-slate-400 rounded w-3.5 h-3.5 flex items-center justify-center text-[9px] text-indigo-600 bg-white">[ ]</span>
                            <span className="text-[9px] text-slate-500 font-sans font-bold">CP</span>
                          </label>
                          <label className="flex items-center gap-1 cursor-default">
                            <span className="border border-slate-400 rounded w-3.5 h-3.5 flex items-center justify-center text-[9px] text-indigo-600 bg-white">[ ]</span>
                            <span className="text-[9px] text-slate-500 font-sans font-bold">CPa</span>
                          </label>
                          <label className="flex items-center gap-1 cursor-default">
                            <span className="border border-slate-400 rounded w-3.5 h-3.5 flex items-center justify-center text-[9px] text-indigo-600 bg-white">[ ]</span>
                            <span className="text-[9px] text-slate-500 font-sans font-bold">NC/NA</span>
                          </label>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer page identifier */}
            <div className="border-t border-slate-200 pt-3 text-right text-[8px] md:text-[9px] text-slate-400 font-mono mt-10">
              Página 1 de 2
            </div>
          </div>


          {/* ==================== PAGE 2 ==================== */}
          <div 
            id="print-page-2"
            className="w-[210mm] min-h-[297mm] bg-white text-slate-900 p-[15mm] md:p-[20mm] rounded-lg shadow-lg flex flex-col justify-between border border-slate-200 select-none print:shadow-none print:border-none print:rounded-none print:w-full print:p-0 print:my-0 print:min-h-0 print:page-break-before"
          >
            <div>
              {/* Header Title Mini */}
              <div className="border-b-[3px] border-indigo-700 pb-2 mb-4">
                <div className="flex justify-between items-end">
                  <span className="text-slate-500 font-mono text-[8px] md:text-[9px] font-black uppercase tracking-wider">Missão de Assessoria Naval do Brasil em STP</span>
                  <span className="text-indigo-805 font-bold text-[9px] md:text-[10px] uppercase">Questionário de Avaliação Pós-Curso</span>
                </div>
              </div>

              {/* Section IV */}
              <div className="mb-4">
                <div className="bg-indigo-900 text-white px-3 py-1.5 rounded-lg text-[10px] md:text-[11px] font-black uppercase tracking-wider mb-2 font-mono flex justify-between items-center">
                  <span>IV. Infraestrutura e Apoio Administrativo</span>
                  <span className="text-[9px] text-white/70 font-mono">Págn. 2</span>
                </div>
                <table className="w-full text-[10px] md:text-[11px] border-collapse font-sans text-slate-800">
                  <tbody>
                    {SECT_IV_QUESTIONS.map((qText, index) => (
                      <tr key={index} className="border-b border-slate-100 py-1.5 flex items-center justify-between">
                        <td className="w-2/3 pr-4 font-medium text-slate-700">
                          {index + 1}. {qText}
                        </td>
                        <td className="flex gap-4 shrink-0 font-mono font-bold text-slate-400">
                          <label className="flex items-center gap-1 cursor-default">
                            <span className="border border-slate-400 rounded w-3.5 h-3.5 flex items-center justify-center text-[9px] text-indigo-600 bg-white">[ ]</span>
                            <span className="text-[9px] text-slate-500 font-sans font-bold">CP</span>
                          </label>
                          <label className="flex items-center gap-1 cursor-default">
                            <span className="border border-slate-400 rounded w-3.5 h-3.5 flex items-center justify-center text-[9px] text-indigo-600 bg-white">[ ]</span>
                            <span className="text-[9px] text-slate-500 font-sans font-bold">CPa</span>
                          </label>
                          <label className="flex items-center gap-1 cursor-default">
                            <span className="border border-slate-400 rounded w-3.5 h-3.5 flex items-center justify-center text-[9px] text-indigo-600 bg-white">[ ]</span>
                            <span className="text-[9px] text-slate-500 font-sans font-bold">NC/NA</span>
                          </label>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Section V */}
              <div className="mb-4">
                <div className="bg-indigo-900 text-white px-3 py-1.5 rounded-lg text-[10px] md:text-[11px] font-black uppercase tracking-wider mb-2 font-mono flex justify-between items-center">
                  <span>V. Impacto do Curso</span>
                  <span className="text-[9px] text-white/70 font-mono">Págn. 2</span>
                </div>
                <table className="w-full text-[10px] md:text-[11px] border-collapse font-sans text-slate-800">
                  <tbody>
                    {SECT_V_QUESTIONS.map((qText, index) => (
                      <tr key={index} className="border-b border-slate-100 py-1.5 flex items-center justify-between">
                        <td className="w-2/3 pr-4 font-medium text-slate-700">
                          {index + 1}. {qText}
                        </td>
                        <td className="flex gap-4 shrink-0 font-mono font-bold text-slate-400">
                          <label className="flex items-center gap-1 cursor-default">
                            <span className="border border-slate-400 rounded w-3.5 h-3.5 flex items-center justify-center text-[9px] text-indigo-600 bg-white">[ ]</span>
                            <span className="text-[9px] text-slate-500 font-sans font-bold">CP</span>
                          </label>
                          <label className="flex items-center gap-1 cursor-default">
                            <span className="border border-slate-400 rounded w-3.5 h-3.5 flex items-center justify-center text-[9px] text-indigo-600 bg-white">[ ]</span>
                            <span className="text-[9px] text-slate-500 font-sans font-bold">CPa</span>
                          </label>
                          <label className="flex items-center gap-1 cursor-default">
                            <span className="border border-slate-400 rounded w-3.5 h-3.5 flex items-center justify-center text-[9px] text-indigo-600 bg-white">[ ]</span>
                            <span className="text-[9px] text-slate-500 font-sans font-bold">NC/NA</span>
                          </label>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Section VI */}
              <div className="mb-2">
                <div className="bg-indigo-900 text-white px-3 py-1.5 rounded-lg text-[10px] md:text-[11px] font-black uppercase tracking-wider mb-3 font-mono flex justify-between items-center">
                  <span>VI. Comentários, Elogios e Sugestões</span>
                  <span className="text-[9px] text-white/70 font-mono">Págn. 2</span>
                </div>
                
                {/* Visual Dotted Comments Block */}
                <div className="space-y-3 text-[10px] md:text-[11.5px] font-sans text-slate-700">
                  <div>
                    <span className="font-extrabold text-slate-800 block text-[9.5px] uppercase tracking-wide">Pontos fortes do curso:</span>
                    <div className="border-b border-dashed border-slate-300 h-9 mt-1"></div>
                    <div className="border-b border-dashed border-slate-300 h-9"></div>
                  </div>
                  <div>
                    <span className="font-extrabold text-slate-800 block text-[9.5px] uppercase tracking-wide">Sugestões de melhoria:</span>
                    <div className="border-b border-dashed border-slate-300 h-9 mt-1"></div>
                    <div className="border-b border-dashed border-slate-300 h-9"></div>
                  </div>
                  <div>
                    <span className="font-extrabold text-slate-800 block text-[9.5px] uppercase tracking-wide">Elogios ao instrutor ou à organização do curso:</span>
                    <div className="border-b border-dashed border-slate-300 h-9 mt-1"></div>
                    <div className="border-b border-dashed border-slate-300 h-9"></div>
                  </div>
                  <div>
                    <span className="font-extrabold text-slate-800 block text-[9.5px] uppercase tracking-wide">Outros comentários:</span>
                    <div className="border-b border-dashed border-slate-300 h-9 mt-1"></div>
                    <div className="border-b border-dashed border-slate-300 h-9"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom fields like signatures / date */}
            <div className="pt-8 mt-4 border-t border-slate-200 grid grid-cols-2 gap-10 font-sans text-[10px] text-center text-slate-500">
              <div>
                <div className="border-b border-slate-300 w-4/5 mx-auto h-7"></div>
                <p className="font-bold text-slate-700 mt-2 uppercase tracking-wide">Assinatura do Aluno</p>
              </div>
              <div>
                <div className="border-b border-slate-300 w-4/5 mx-auto h-7"></div>
                <p className="font-bold text-slate-700 mt-2 uppercase tracking-wide">Local e Data</p>
              </div>
            </div>

            {/* Footer page identifier */}
            <div className="border-t border-slate-200 pt-3 text-right text-[8px] md:text-[9px] text-slate-400 font-mono mt-8 shrink-0">
              Página 2 de 2
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
