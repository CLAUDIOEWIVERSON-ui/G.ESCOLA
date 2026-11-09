'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  Loader2, 
  Search, 
  FileText, 
  Users,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  PenTool,
  Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { downloadElementAsPDF } from '@/lib/printDocumentUtils';
import navalMissionLogo from '@/src/assets/images/regenerated_image_1782409801823.png';
import { getCleanTurmaName } from '@/lib/utils';

interface BatchTurmaFichasModalProps {
  isOpen: boolean;
  onClose: () => void;
  turma: any;
  language?: string;
  initialBlankMode?: boolean;
}

export default function BatchTurmaFichasModal({
  isOpen,
  onClose,
  turma,
  language = 'pt',
  initialBlankMode = true
}: BatchTurmaFichasModalProps) {
  const [alunos, setAlunos] = useState<any[]>([]);
  const [accessCodes, setAccessCodes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  
  // Mode: blank for manual handwriting vs pre-filled with database records
  const [isManualBlankMode, setIsManualBlankMode] = useState<boolean>(initialBlankMode ?? true);
  const [blankCopiesCount, setBlankCopiesCount] = useState<number>(1);

  // Sync mode when modal opens or initialBlankMode changes
  useEffect(() => {
    if (isOpen) {
      setIsManualBlankMode(initialBlankMode ?? true);
    }
  }, [isOpen, initialBlankMode]);

  // Load students and access codes
  useEffect(() => {
    if (!isOpen || !turma?.id) return;

    let isMounted = true;
    const fetchStudentsAndCodes = async () => {
      setLoading(true);
      try {
        const { data: studentsData, error: studentsError } = await supabase
          .from('alunos')
          .select('*')
          .eq('turma_id', turma.id)
          .is('deleted_at', null)
          .order('nome');

        if (studentsError) throw studentsError;

        const studentsList = studentsData || [];
        if (isMounted) {
          setAlunos(studentsList);
        }

        if (studentsList.length > 0) {
          const studentIds = studentsList.map((s) => s.id);
          const { data: codesData, error: codesError } = await supabase
            .from('student_access_codes')
            .select('aluno_id, access_code')
            .in('aluno_id', studentIds);

          if (!codesError && codesData) {
            const map: Record<string, string> = {};
            codesData.forEach((item: any) => {
              if (item.aluno_id && item.access_code) {
                map[item.aluno_id] = item.access_code;
              }
            });
            if (isMounted) setAccessCodes(map);
          }
        }
      } catch (err: any) {
        console.error('Erro ao carregar alunos para impressão em lote:', err);
        toast.error(
          language === 'pt' 
            ? 'Erro ao carregar dados dos alunos para impressão.' 
            : 'Error loading student registration sheets.'
        );
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchStudentsAndCodes();

    return () => {
      isMounted = false;
    };
  }, [isOpen, turma?.id, language]);

  // Filter students based on search
  const filteredAlunos = useMemo(() => {
    if (!searchTerm.trim()) return alunos;
    const term = searchTerm.toLowerCase().trim();
    return alunos.filter((aluno) => {
      const matchNome = (aluno.nome || '').toLowerCase().includes(term);
      const matchGuerra = (aluno.nome_guerra || '').toLowerCase().includes(term);
      const matchPosto = (aluno.posto_graduacao || '').toLowerCase().includes(term);
      const matchRG = (aluno.rg || '').toLowerCase().includes(term);
      const matchNIF = (aluno.nif || '').toLowerCase().includes(term);
      return matchNome || matchGuerra || matchPosto || matchRG || matchNIF;
    });
  }, [alunos, searchTerm]);

  // Print all sheets
  const handlePrintAll = () => {
    if (!isManualBlankMode && alunos.length === 0) {
      toast.warning(
        language === 'pt' 
          ? 'Não há alunos cadastrados nesta turma para impressão preenchida.' 
          : 'No registered students in this class to print.'
      );
      return;
    }

    try {
      document.body.classList.add('printing-all-fichas');
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-all-fichas');
      }, 1500);
    } catch (err) {
      console.error('Erro ao acionar diálogo de impressão:', err);
      toast.error(
        language === 'pt' 
          ? 'Erro ao abrir diálogo de impressão do navegador.' 
          : 'Error opening browser print dialog.'
      );
    }
  };

  // Download all as PDF
  const handleDownloadAllPDF = async () => {
    if (!isManualBlankMode && alunos.length === 0) {
      toast.warning(
        language === 'pt' 
          ? 'Não há alunos cadastrados nesta turma para download.' 
          : 'No registered students in this class to download.'
      );
      return;
    }

    setIsExportingPDF(true);
    const cleanTurma = (turma?.nome || 'turma').replace(/[^a-zA-Z0-9_-]/g, '_');
    const count = isManualBlankMode ? blankCopiesCount : alunos.length;
    const label = isManualBlankMode ? 'ficha(s) em branco para preenchimento manual' : 'fichas cadastrais preenchidas';
    
    const toastId = toast.loading(
      language === 'pt'
        ? `Gerando PDF com ${count} ${label}...`
        : `Generating PDF with ${count} sheets...`
    );

    try {
      const filename = isManualBlankMode
        ? `ficha_em_branco_manual_turma_${cleanTurma}.pdf`
        : `fichas_cadastrais_turma_${cleanTurma}.pdf`;

      const success = await downloadElementAsPDF('print-all-student-fichas-container', {
        orientation: 'portrait',
        filename,
        scale: 2
      });

      toast.dismiss(toastId);
      if (success) {
        toast.success(
          language === 'pt' 
            ? 'PDF das fichas cadastrais gerado com sucesso!' 
            : 'Registration sheets PDF generated successfully!'
        );
      }
    } catch (err: any) {
      console.error('Erro ao gerar PDF em lote:', err);
      toast.dismiss(toastId);
      toast.error(
        language === 'pt' 
          ? 'Erro ao gerar arquivo PDF. Utilize a opção Imprimir.' 
          : 'Error generating PDF. Please use the Print option.'
      );
    } finally {
      setIsExportingPDF(false);
    }
  };

  if (!isOpen) return null;

  const logoSrc = typeof navalMissionLogo === 'string' ? navalMissionLogo : (navalMissionLogo as any)?.src || navalMissionLogo;
  const cursoNome = (turma?.curso?.nome || turma?.curso_nome || turma?.nome || '').trim();
  const turmaCleanName = getCleanTurmaName(turma, turma?.curso || turma?.curso_nome, language === 'pt' ? 'Turma Única' : 'Single Class');

  // Blank mode copies to render
  const blankCopiesArray = Array.from({ length: Math.max(1, Math.min(100, blankCopiesCount)) });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-950/85 backdrop-blur-md overflow-hidden animate-in fade-in duration-200">
        
        {/* Print Styles for Batch Student Fichas */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page {
              size: A4 portrait !important;
              margin: 8mm 10mm 8mm 10mm !important;
            }

            html, body {
              background: #ffffff !important;
              background-color: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              height: auto !important;
              overflow: visible !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            body.printing-all-fichas * {
              visibility: hidden !important;
            }

            body.printing-all-fichas #print-all-student-fichas-container,
            body.printing-all-fichas #print-all-student-fichas-container * {
              visibility: visible !important;
            }

            body.printing-all-fichas #print-all-student-fichas-container {
              display: block !important;
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              box-shadow: none !important;
              border: none !important;
            }

            body.printing-all-fichas .batch-ficha-page {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              box-shadow: none !important;
              border: none !important;
              margin: 0 auto !important;
              padding: 4mm 6mm 6mm 6mm !important;
              width: 100% !important;
              max-width: 190mm !important;
              min-height: 275mm !important;
              box-sizing: border-box !important;
              display: block !important;
              background: #ffffff !important;
            }

            body.printing-all-fichas .batch-ficha-page:not(:last-child) {
              page-break-after: always !important;
              break-after: page !important;
            }

            .no-print, header, nav, aside, button, input {
              display: none !important;
            }
          }
        `}} />

        {/* Top Control Bar */}
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-3 shrink-0 shadow-2xl z-20">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
              title={language === 'pt' ? 'Fechar visualização' : 'Close preview'}
            >
              <X size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="p-1.5 rounded-lg bg-black text-white border border-slate-700">
                  <Printer size={16} />
                </span>
                <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                  {language === 'pt' ? 'Ficha de Cadastro do Aluno' : 'Student Registration Form'}
                </h2>
                
                {/* Mode status badge */}
                {isManualBlankMode ? (
                  <span className="bg-amber-400/20 text-amber-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-md border border-amber-400/40 flex items-center gap-1">
                    <PenTool size={11} />
                    {language === 'pt' ? 'Em Branco (Preenchimento Manual)' : 'Blank (Manual Pen Filling)'}
                  </span>
                ) : (
                  <span className="bg-blue-600/30 text-blue-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-md border border-blue-500/30">
                    {alunos.length} {alunos.length === 1 ? (language === 'pt' ? 'Aluno Preenchido' : 'Student') : (language === 'pt' ? 'Alunos Preenchidos' : 'Students')}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-medium truncate max-w-xl mt-0.5">
                {turma?.nome} {turma?.curso?.nome ? `• ${turma.curso.nome}` : ''}
              </p>
            </div>
          </div>

          {/* Mode Switcher & Controls */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
            
            {/* Toggle: Em Branco vs Preenchido */}
            <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-black">
              <button
                type="button"
                onClick={() => setIsManualBlankMode(true)}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  isManualBlankMode 
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title={language === 'pt' ? 'Ficha sem preenchimento, sem foto e sem dados para preenchimento manual à mão' : 'Blank form for manual filling'}
              >
                <PenTool size={13} />
                <span>{language === 'pt' ? 'Em Branco (Manual)' : 'Blank Form'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsManualBlankMode(false)}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  !isManualBlankMode 
                    ? 'bg-blue-600 text-white shadow-md font-black' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title={language === 'pt' ? 'Fichas preenchidas com dados e fotos do sistema' : 'Filled with student database info'}
              >
                <Users size={13} />
                <span>{language === 'pt' ? `Preenchidas (${alunos.length})` : `Filled (${alunos.length})`}</span>
              </button>
            </div>

            {/* Copies selector for Blank Mode */}
            {isManualBlankMode && (
              <div className="flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 text-xs text-white">
                <span className="text-slate-400 text-[11px] font-bold">
                  {language === 'pt' ? 'Cópias:' : 'Copies:'}
                </span>
                <button
                  type="button"
                  onClick={() => setBlankCopiesCount(1)}
                  className={`px-2 py-0.5 rounded text-[11px] font-black cursor-pointer transition ${
                    blankCopiesCount === 1 ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  1
                </button>
                <button
                  type="button"
                  onClick={() => setBlankCopiesCount(5)}
                  className={`px-2 py-0.5 rounded text-[11px] font-black cursor-pointer transition ${
                    blankCopiesCount === 5 ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  5
                </button>
                <button
                  type="button"
                  onClick={() => setBlankCopiesCount(alunos.length > 0 ? alunos.length : 10)}
                  className={`px-2 py-0.5 rounded text-[11px] font-black cursor-pointer transition ${
                    blankCopiesCount === (alunos.length > 0 ? alunos.length : 10) ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {alunos.length > 0 ? `Turma (${alunos.length})` : '10'}
                </button>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={blankCopiesCount}
                  onChange={(e) => setBlankCopiesCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                  className="w-12 bg-slate-900 border border-slate-700 text-white text-center font-mono rounded px-1 py-0.5 text-xs ml-1"
                />
              </div>
            )}

            {/* Search filter for filled mode */}
            {!isManualBlankMode && alunos.length > 3 && (
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={language === 'pt' ? 'Buscar aluno na turma...' : 'Search student...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-40 sm:w-48"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')} 
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                  >
                    ×
                  </button>
                )}
              </div>
            )}

            {/* Print Button */}
            <button
              onClick={handlePrintAll}
              disabled={loading || (!isManualBlankMode && alunos.length === 0)}
              className="px-4 py-2 bg-black hover:bg-slate-900 text-white border border-slate-700 disabled:opacity-50 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all active:translate-y-px cursor-pointer"
              style={{ color: '#ffffff' }}
              title={
                isManualBlankMode
                  ? (language === 'pt' ? 'Imprimir ficha(s) em branco para preenchimento manual' : 'Print blank forms')
                  : (language === 'pt' ? 'Imprimir todas as fichas preenchidas da turma' : 'Print filled forms')
              }
            >
              <Printer size={16} />
              <span>
                {isManualBlankMode 
                  ? (language === 'pt' ? `Imprimir ${blankCopiesCount > 1 ? `${blankCopiesCount} Fichas em Branco` : 'Ficha em Branco'}` : 'Print Blank Form')
                  : (language === 'pt' ? 'Imprimir Fichas' : 'Print Forms')}
              </span>
            </button>

            {/* Download PDF Button */}
            <button
              onClick={handleDownloadAllPDF}
              disabled={loading || isExportingPDF || (!isManualBlankMode && alunos.length === 0)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-950 transition-all active:translate-y-px cursor-pointer"
              title={language === 'pt' ? 'Baixar em arquivo PDF' : 'Download PDF'}
            >
              {isExportingPDF ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              <span>{language === 'pt' ? 'Baixar PDF' : 'Download PDF'}</span>
            </button>
          </div>
        </div>

        {/* Preview Scrollable Area */}
        <div className="flex-1 overflow-auto bg-slate-900/95 p-4 sm:p-8 flex flex-col items-center custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center my-auto py-20 text-slate-400 gap-3">
              <Loader2 size={36} className="animate-spin text-amber-500" />
              <p className="text-sm font-bold uppercase tracking-wider">
                {language === 'pt' ? 'Carregando fichas da turma...' : 'Loading registration sheets...'}
              </p>
            </div>
          ) : isManualBlankMode ? (
            /* ========================================================================= */
            /* 1. MODO FICHA EM BRANCO (SEM PREENCHIMENTO, SEM FOTO, SEM DADOS)          */
            /* ========================================================================= */
            <div id="print-all-student-fichas-container" className="w-full flex flex-col items-center gap-8">
              
              {/* Notice in preview */}
              <div className="print:hidden w-full max-w-[210mm] bg-amber-50 border border-amber-300 rounded-xl p-3 text-amber-950 text-xs flex items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-2.5">
                  <PenTool size={18} className="text-amber-800 shrink-0" />
                  <div>
                    <span className="font-black uppercase tracking-wider block">
                      {language === 'pt' ? 'Visualização da Ficha em Branco para Preenchimento Manual' : 'Blank Registration Sheet Preview'}
                    </span>
                    <span className="text-[11px] text-amber-800 font-medium">
                      {language === 'pt' 
                        ? 'Sem foto e sem dados preenchidos, com campos sublinhados e caixas prontas para preenchimento manual à caneta.' 
                        : 'No photos, no pre-filled data, formatted with clean underline blanks for handwriting.'}
                    </span>
                  </div>
                </div>
                <div className="text-right text-[11px] font-mono font-bold text-amber-900 shrink-0">
                  {blankCopiesCount} {blankCopiesCount === 1 ? 'via' : 'vias'}
                </div>
              </div>

              {blankCopiesArray.map((_, copyIndex) => (
                <div
                  key={`blank-copy-${copyIndex}`}
                  id={`blank-ficha-copy-${copyIndex}`}
                  data-document-sheet="true"
                  className="batch-ficha-page official-document-sheet bg-white text-slate-950 px-7 py-6 font-sans text-xs w-full max-w-[210mm] shadow-2xl rounded-sm border border-slate-300 relative box-border"
                  style={{
                    fontFamily: "'Liberation Sans', Arial, Helvetica, sans-serif"
                  }}
                >
                  {/* Visual Page Indicator in preview only */}
                  <div className="absolute top-2 right-4 text-[9px] font-mono text-slate-400 font-bold print:hidden">
                    {language === 'pt' ? 'Via' : 'Copy'} {copyIndex + 1} de {blankCopiesArray.length}
                  </div>

                  {/* Cabeçalho Institucional Oficial */}
                  <div className="border-b-2 border-black pb-3 mb-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 shrink-0 flex items-center justify-center">
                        <img
                          src={logoSrc}
                          alt="Brasão Oficial"
                          className="w-20 h-20 object-contain shrink-0"
                          style={{ width: '80px', height: '80px' }}
                        />
                      </div>
                      <div>
                        <h1 className="text-[11px] font-black uppercase tracking-widest text-black leading-tight">
                          MISSÃO DE ASSESSORIA NAVAL DO BRASIL EM SÃO TOMÉ E PRÍNCIPE
                        </h1>
                        <h2 className="text-sm font-black uppercase tracking-wider text-black leading-tight mt-0.5">
                          ESCOLA DE FORMAÇÃO E APERFEIÇOAMENTO MILITAR
                        </h2>
                        <p className="text-xs font-black text-[#002776] uppercase tracking-widest mt-1">
                          FICHA INDIVIDUAL DE CADASTRO DO ALUNO (PREENCHIMENTO MANUAL)
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-[9.5px] space-y-1 shrink-0">
                      <div className="font-mono text-slate-700 text-[8.5px]">
                        Emissão: {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="inline-block px-2.5 py-0.5 rounded text-[8.5px] font-black uppercase border border-black bg-white text-black">
                        SITUAÇÃO: [ &nbsp; ] ATIVO &nbsp;&nbsp; [ &nbsp; ] NOVO
                      </div>
                    </div>
                  </div>

                  {/* Perfil do Aluno: Foto 3x4 Vazia + Identificadores Principais Vazios */}
                  <div className="flex border border-black rounded-lg p-3.5 mb-4 bg-white gap-4 items-center">
                    
                    {/* Foto 3x4 Oficial Vazia (Sem foto, apenas retângulo padrão para colar) */}
                    <div className="w-28 shrink-0 flex flex-col items-center justify-center border-r border-slate-400 pr-4">
                      <div className="w-24 h-32 border-2 border-dashed border-black rounded bg-white flex flex-col items-center justify-center p-2 text-center shadow-xs">
                        <span className="text-[10px] font-black tracking-widest text-black uppercase">
                          COLAR FOTO
                        </span>
                        <span className="text-sm font-black text-black mt-1">
                          3x4 cm
                        </span>
                        <span className="text-[7.5px] text-slate-600 font-bold uppercase mt-1">
                          (Fundo Branco)
                        </span>
                      </div>
                      <span className="text-[7.5px] font-black text-black uppercase tracking-wider mt-1.5">
                        FOTO OFICIAL 3x4
                      </span>
                    </div>

                    {/* Identificação do Aluno - Linhas limpas para preenchimento manual */}
                    <table className="w-full text-xs border-collapse">
                      <tbody>
                        <tr className="border-b border-slate-300">
                          <td colSpan={2} className="pb-2">
                            <span className="text-[8.5px] font-bold text-black uppercase block leading-none mb-1">
                              Nome Completo do Aluno:
                            </span>
                            <div className="h-6 border-b border-black w-full flex items-end">
                              <span className="text-[10px] text-slate-300 italic">preencher com letra de forma legível</span>
                            </div>
                          </td>
                        </tr>
                        <tr className="border-b border-slate-300">
                          <td className="py-2 w-1/2 pr-3">
                            <span className="text-[8.5px] font-bold text-black uppercase block leading-none mb-1">
                              Nome de Guerra / Apelido:
                            </span>
                            <div className="h-5 border-b border-black w-full"></div>
                          </td>
                          <td className="py-2 w-1/2">
                            <span className="text-[8.5px] font-bold text-black uppercase block leading-none mb-1">
                              Posto / Graduação:
                            </span>
                            <div className="h-5 border-b border-black w-full"></div>
                          </td>
                        </tr>
                        <tr className="border-b border-slate-300">
                          <td className="py-2 pr-3">
                            <span className="text-[8.5px] font-bold text-black uppercase block leading-none mb-1">
                              Categoria / Tipo:
                            </span>
                            <div className="flex items-center gap-3 pt-1 text-[11px] font-bold text-black">
                              <span>[&nbsp;&nbsp;] Oficial</span>
                              <span>[&nbsp;&nbsp;] Praça</span>
                              <span>[&nbsp;&nbsp;] Civil</span>
                              <span>[&nbsp;&nbsp;] Outro</span>
                            </div>
                          </td>
                          <td className="py-2">
                            <span className="text-[8.5px] font-bold text-black uppercase block leading-none mb-1">
                              Organização Militar (OM) / Unidade:
                            </span>
                            <div className="h-5 border-b border-black w-full"></div>
                          </td>
                        </tr>
                        <tr className="border-b border-slate-300">
                          <td colSpan={2} className="py-2">
                            <span className="text-[8.5px] font-bold text-black uppercase block leading-none mb-1">
                              {turma?.internacional ? 'Curso (Inscrição no Exterior) / Turma:' : 'Curso de Matrícula / Turma:'}
                            </span>
                            <div className="font-black text-black uppercase leading-snug text-xs flex items-center justify-between">
                              <span>
                                {cursoNome ? `${cursoNome} ${turmaCleanName ? `• ${turmaCleanName}` : ''}` : '________________________________________________'}
                              </span>
                              {turma?.localizacao && (
                                <span className="text-black font-semibold text-[10px]">📍 {turma.localizacao}</span>
                              )}
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td colSpan={2} className="pt-2">
                            <span className="text-[8.5px] font-bold text-black uppercase block leading-none mb-1">
                              Período de Realização do Curso / Missão:
                            </span>
                            <div className="font-bold text-black uppercase leading-snug font-mono text-[11px]">
                              {turma?.data_inicio && turma?.data_fim ? (
                                <>
                                  {format(new Date(turma.data_inicio), 'dd/MM/yyyy')}
                                  {' a '}
                                  {format(new Date(turma.data_fim), 'dd/MM/yyyy')}
                                </>
                              ) : (
                                <span>___ / ___ / ______ &nbsp;&nbsp; a &nbsp;&nbsp; ___ / ___ / ______</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Seção 1: Dados Pessoais e Documentação Civil (Sem preenchimento) */}
                  <div className="mb-4 print-avoid-break break-inside-avoid">
                    <h3 
                      style={{ backgroundColor: '#002776', color: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                      className="text-[10.5px] font-black uppercase tracking-wider bg-[#002776] text-white px-3.5 py-1.5 rounded-t section-blue-bar !text-white !bg-[#002776]"
                    >
                      1. DADOS PESSOAIS E DOCUMENTAÇÃO CIVIL
                    </h3>
                    <table className="w-full border-collapse border border-black text-xs">
                      <tbody>
                        <tr className="border-b border-slate-400">
                          <td className="py-2.5 px-3 font-bold bg-slate-100 w-1/4 border-r border-slate-400 text-black">Gênero:</td>
                          <td className="py-2.5 px-3 w-1/4 border-r border-slate-400 font-bold text-black">
                            [&nbsp;&nbsp;] Masculino &nbsp;&nbsp;&nbsp; [&nbsp;&nbsp;] Feminino
                          </td>
                          <td className="py-2.5 px-3 font-bold bg-slate-100 w-1/4 border-r border-slate-400 text-black">Data de Nascimento:</td>
                          <td className="py-2.5 px-3 w-1/4 font-mono font-bold text-black">
                            ____ / ____ / ________
                          </td>
                        </tr>
                        <tr className="border-b border-slate-400">
                          <td className="py-2.5 px-3 font-bold bg-slate-100 border-r border-slate-400 text-black">RG:</td>
                          <td className="py-2.5 px-3 font-mono border-r border-slate-400">
                            <div className="h-5 border-b border-slate-400 w-full"></div>
                          </td>
                          <td className="py-2.5 px-3 font-bold bg-slate-100 border-r border-slate-400 text-black">NIF (Identificação Fiscal):</td>
                          <td className="py-2.5 px-3 font-mono">
                            <div className="h-5 border-b border-slate-400 w-full"></div>
                          </td>
                        </tr>
                        <tr className="border-b border-slate-400">
                          <td className="py-2.5 px-3 font-bold bg-slate-100 border-r border-slate-400 text-black">Passaporte:</td>
                          <td className="py-2.5 px-3 font-mono border-r border-slate-400">
                            <div className="h-5 border-b border-slate-400 w-full"></div>
                          </td>
                          <td className="py-2.5 px-3 font-bold bg-slate-100 border-r border-slate-400 text-black">Título de Eleitor:</td>
                          <td className="py-2.5 px-3 font-mono">
                            <div className="h-5 border-b border-slate-400 w-full"></div>
                          </td>
                        </tr>
                        <tr className="border-b border-slate-400">
                          <td className="py-2.5 px-3 font-bold bg-slate-100 border-r border-slate-400 text-black">Tipo Sanguíneo / Fator RH:</td>
                          <td className="py-2.5 px-3 font-mono border-r border-slate-400 font-bold text-black">
                            Tipo: _____ &nbsp;&nbsp; RH: [&nbsp;&nbsp;]+ &nbsp; [&nbsp;&nbsp;]-
                          </td>
                          <td className="py-2.5 px-3 font-bold bg-slate-100 border-r border-slate-400 text-black">Altura / Peso:</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-black">
                            Alt: ______ m &nbsp;/&nbsp; Peso: ______ kg
                          </td>
                        </tr>
                        <tr className="border-b border-slate-400">
                          <td className="py-2.5 px-3 font-bold bg-slate-100 border-r border-slate-400 text-black">Nome do Pai:</td>
                          <td className="py-2.5 px-3 uppercase border-r border-slate-400" colSpan={3}>
                            <div className="h-5 border-b border-slate-400 w-full"></div>
                          </td>
                        </tr>
                        <tr className="border-b border-slate-400">
                          <td className="py-2.5 px-3 font-bold bg-slate-100 border-r border-slate-400 text-black">Nome da Mãe:</td>
                          <td className="py-2.5 px-3 uppercase border-r border-slate-400" colSpan={3}>
                            <div className="h-5 border-b border-slate-400 w-full"></div>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-bold bg-slate-100 border-r border-slate-400 text-black">Ano de Admissão:</td>
                          <td className="py-2.5 px-3 font-mono border-r border-slate-400">
                            <div className="h-5 border-b border-slate-400 w-24"></div>
                          </td>
                          <td className="py-2.5 px-3 font-bold bg-slate-100 border-r border-slate-400 text-black">Função / Cargo:</td>
                          <td className="py-2.5 px-3 uppercase">
                            <div className="h-5 border-b border-slate-400 w-full"></div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Seção 2: Contato e Comunicação (Sem preenchimento) */}
                  <div className="mb-5 print-avoid-break break-inside-avoid">
                    <h3 
                      style={{ backgroundColor: '#002776', color: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                      className="text-[10.5px] font-black uppercase tracking-wider bg-[#002776] text-white px-3.5 py-1.5 rounded-t section-blue-bar !text-white !bg-[#002776]"
                    >
                      2. CONTATO E COMUNICAÇÃO
                    </h3>
                    <table className="w-full border-collapse border border-black text-xs">
                      <tbody>
                        <tr className="border-b border-slate-400">
                          <td className="py-2.5 px-3 font-bold bg-slate-100 w-1/6 border-r border-slate-400 text-black">E-mail:</td>
                          <td className="py-2.5 px-3 font-mono w-2/6 border-r border-slate-400">
                            <div className="h-5 border-b border-slate-400 w-full"></div>
                          </td>
                          <td className="py-2.5 px-3 font-bold bg-slate-100 w-1/6 border-r border-slate-400 text-black">Telefone:</td>
                          <td className="py-2.5 px-3 font-mono w-2/6">
                            <div className="h-5 border-b border-slate-400 w-full"></div>
                          </td>
                        </tr>
                        <tr className="border-b border-slate-400">
                          <td className="py-2.5 px-3 font-bold bg-slate-100 border-r border-slate-400 text-black">WhatsApp:</td>
                          <td className="py-2.5 px-3 font-mono border-r border-slate-400">
                            <div className="h-5 border-b border-slate-400 w-full"></div>
                          </td>
                          <td className="py-2.5 px-3 font-bold bg-slate-100 border-r border-slate-400 text-black">Código de Acesso:</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-500 italic">
                            [ Reservado à Administração ]
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-bold bg-slate-100 border-r border-slate-400 text-black">Endereço Residencial:</td>
                          <td className="py-2.5 px-3 uppercase border-r border-slate-400 font-medium" colSpan={3}>
                            <div className="h-5 border-b border-slate-400 w-full"></div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Declaração de Veracidade e Responsabilidade */}
                  <div className="mt-6 mb-3 text-center print-avoid-break break-inside-avoid">
                    <p className="text-[9.5px] font-medium text-slate-800 italic">
                      Declaro sob as penas cabíveis que todas as informações acima prestadas são verdadeiras e exatas, assumindo total responsabilidade pelas mesmas.
                    </p>
                  </div>

                  {/* Termo de Assinaturas */}
                  <div className="pt-6 mt-4 grid grid-cols-2 gap-12 text-center text-xs print-avoid-break break-inside-avoid">
                    <div>
                      <div className="border-b-2 border-black w-4/5 mx-auto mb-2"></div>
                      <p className="font-black text-black uppercase text-xs">
                        ASSINATURA DO ALUNO / CANDIDATO
                      </p>
                      <p className="text-[8.5px] font-bold text-slate-600 uppercase mt-0.5">
                        Assinatura legível à caneta
                      </p>
                    </div>
                    <div>
                      <div className="border-b-2 border-black w-4/5 mx-auto mb-2"></div>
                      <p className="font-black text-black uppercase text-xs">
                        COORDENADOR DE CURSOS
                      </p>
                      <p className="text-[8.5px] font-bold text-slate-600 uppercase mt-0.5">
                        Assinatura e Carimbo Oficial
                      </p>
                    </div>
                  </div>

                  {/* Datação e Localidade Oficial */}
                  <div className="mt-5 text-center text-[10px] font-bold text-black font-mono print-avoid-break break-inside-avoid">
                    São Tomé, _____ de ____________________ de 20____.
                  </div>

                  {/* Rodapé Oficial da Ficha */}
                  <div className="border-t-2 border-black mt-6 pt-2 flex items-center justify-between text-[8px] font-bold text-black uppercase print-avoid-break break-inside-avoid">
                    <span>MISSÃO DE ASSESSORIA NAVAL DO BRASIL EM SÃO TOMÉ E PRÍNCIPE</span>
                    <span>FICHA DE REGISTRO E CONTROLE ACADÊMICO • DOCUMENTO OFICIAL</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ========================================================================= */
            /* 2. MODO FICHAS PREENCHIDAS COM DADOS DOS ALUNOS NO SISTEMA                */
            /* ========================================================================= */
            alunos.length === 0 ? (
              <div className="flex flex-col items-center justify-center my-auto py-20 text-slate-400 gap-3 text-center max-w-md">
                <Users size={48} className="text-slate-600 mb-2" />
                <h3 className="text-base font-bold text-white uppercase">
                  {language === 'pt' ? 'Nenhum aluno cadastrado nesta turma' : 'No students found in this class'}
                </h3>
                <p className="text-xs text-slate-400">
                  {language === 'pt' 
                    ? 'Você pode utilizar o modo "Em Branco (Manual)" acima para imprimir fichas vazias para preenchimento manual.' 
                    : 'You can switch to "Blank Form" above to print forms for manual filling.'}
                </p>
                <button
                  type="button"
                  onClick={() => setIsManualBlankMode(true)}
                  className="mt-3 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase cursor-pointer"
                >
                  {language === 'pt' ? 'Mudar para Ficha em Branco' : 'Switch to Blank Form'}
                </button>
              </div>
            ) : (
              <div id="print-all-student-fichas-container" className="w-full flex flex-col items-center gap-8">
                {filteredAlunos.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-sm">
                    {language === 'pt' ? 'Nenhum aluno corresponde à busca.' : 'No students matched your search.'}
                  </div>
                )}

                {filteredAlunos.map((aluno, index) => {
                  const accessCode = accessCodes[aluno.id] || aluno.access_code || '-';

                  return (
                    <div
                      key={aluno.id || index}
                      id={`student-ficha-item-${aluno.id}`}
                      data-document-sheet="true"
                      className="batch-ficha-page official-document-sheet bg-white text-slate-900 px-7 py-6 font-sans text-xs w-full max-w-[210mm] shadow-2xl rounded-sm border border-slate-300 relative box-border"
                      style={{
                        fontFamily: "'Liberation Sans', Arial, Helvetica, sans-serif"
                      }}
                    >
                      {/* Visual Page Indicator in preview only */}
                      <div className="absolute top-2 right-4 text-[9px] font-mono text-slate-400 font-bold print:hidden">
                        {language === 'pt' ? 'Ficha' : 'Page'} {index + 1} de {filteredAlunos.length}
                      </div>

                      {/* Cabeçalho Institucional Oficial */}
                      <div className="border-b-2 border-slate-900 pb-3 mb-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-20 h-20 shrink-0 flex items-center justify-center">
                            <img
                              src={logoSrc}
                              alt="Brasão Oficial"
                              className="w-20 h-20 object-contain shrink-0"
                              style={{ width: '80px', height: '80px' }}
                            />
                          </div>
                          <div>
                            <h1 className="text-[11px] font-black uppercase tracking-widest text-slate-700 leading-tight">
                              MISSÃO DE ASSESSORIA NAVAL DO BRASIL EM SÃO TOMÉ E PRÍNCIPE
                            </h1>
                            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 leading-tight mt-0.5">
                              ESCOLA DE FORMAÇÃO E APERFEIÇOAMENTO MILITAR
                            </h2>
                            <p className="text-xs font-black text-[#002776] uppercase tracking-widest mt-1">
                              FICHA INDIVIDUAL DE CADASTRO DO ALUNO
                            </p>
                          </div>
                        </div>
                        <div className="text-right text-[9.5px] space-y-1 shrink-0">
                          <div className="font-mono text-slate-600 text-[8.5px]">
                            Emissão: {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="inline-block px-2.5 py-0.5 rounded text-[8.5px] font-black uppercase border border-slate-400 bg-slate-50">
                            SITUAÇÃO: {aluno.status?.toUpperCase() || 'ATIVO'}
                          </div>
                        </div>
                      </div>

                      {/* Perfil do Aluno: Foto 3x4 + Identificadores Principais */}
                      <div className="flex border border-slate-500 rounded-lg p-3.5 mb-4 bg-slate-50/50 gap-4 items-center">
                        {/* Foto 3x4 Oficial */}
                        <div className="w-28 shrink-0 flex flex-col items-center justify-center border-r border-slate-400 pr-4">
                          <div className="w-24 h-32 border-2 border-slate-800 rounded bg-white overflow-hidden shadow-sm flex flex-col items-center justify-center">
                            {aluno.foto_url ? (
                              <img
                                src={aluno.foto_url}
                                alt={aluno.nome || 'Foto do Aluno'}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-white border border-dashed border-slate-300 p-2">
                                <span className="text-sm font-black tracking-widest text-slate-800 uppercase">
                                  FOTO
                                </span>
                                <span className="text-[8.5px] font-bold text-slate-400 uppercase mt-1">
                                  3x4 cm
                                </span>
                              </div>
                            )}
                          </div>
                          <span className="text-[7.5px] font-bold text-slate-600 uppercase tracking-wider mt-1.5">
                            FOTO OFICIAL 3x4
                          </span>
                        </div>

                        {/* Identificação do Aluno */}
                        <table className="w-full text-xs border-collapse">
                          <tbody>
                            <tr className="border-b border-slate-400">
                              <td colSpan={2} className="pb-2">
                                <span className="text-[8.5px] font-bold text-slate-500 uppercase block leading-none mb-1">
                                  Nome Completo
                                </span>
                                <span className="text-sm font-black text-slate-900 uppercase leading-snug">
                                  {aluno.nome || 'NÃO INFORMADO'}
                                </span>
                              </td>
                            </tr>
                            <tr className="border-b border-slate-400">
                              <td className="py-2 w-1/2 pr-3">
                                <span className="text-[8.5px] font-bold text-slate-500 uppercase block leading-none mb-1">
                                  Nome de Guerra / Apelido
                                </span>
                                <span className="font-bold text-slate-800 uppercase leading-snug text-xs">
                                  {aluno.nome_guerra || '-'}
                                </span>
                              </td>
                              <td className="py-2 w-1/2">
                                <span className="text-[8.5px] font-bold text-slate-500 uppercase block leading-none mb-1">
                                  Posto / Graduação
                                </span>
                                <span className="font-bold text-slate-800 uppercase leading-snug text-xs">
                                  {aluno.posto_graduacao || '-'}
                                </span>
                              </td>
                            </tr>
                            <tr className="border-b border-slate-400">
                              <td className="py-2 pr-3">
                                <span className="text-[8.5px] font-bold text-slate-500 uppercase block leading-none mb-1">
                                  Categoria / Tipo
                                </span>
                                <span className="font-bold text-slate-800 uppercase leading-snug text-xs">
                                  {aluno.tipo_aluno || 'Militar'}
                                </span>
                              </td>
                              <td className="py-2">
                                <span className="text-[8.5px] font-bold text-slate-500 uppercase block leading-none mb-1">
                                  Organização Militar (OM)
                                </span>
                                <span className="font-bold text-slate-800 uppercase leading-snug text-xs">
                                  {aluno.om || '-'}
                                </span>
                              </td>
                            </tr>
                            <tr className="border-b border-slate-400">
                              <td colSpan={2} className="py-2">
                                <span className="text-[8.5px] font-bold text-slate-500 uppercase block leading-none mb-1">
                                  {turma?.internacional ? 'Curso (Inscrição no Exterior) / Turma' : 'Curso de Matrícula'}
                                </span>
                                <span className="font-bold text-blue-900 uppercase leading-snug text-xs">
                                  {cursoNome && turmaCleanName && cursoNome.toLowerCase() !== turmaCleanName.toLowerCase() ? (
                                    <>
                                      <span className="text-blue-900 font-extrabold">{cursoNome}</span>
                                      <span className="text-slate-700 font-bold ml-1 font-mono">({turmaCleanName})</span>
                                    </>
                                  ) : (
                                    <span className="text-blue-900 font-extrabold">{cursoNome || turmaCleanName || '—'}</span>
                                  )}
                                  {turma?.localizacao && (
                                    <span className="ml-2 text-slate-600 font-semibold text-[10px]">📍 {turma.localizacao}</span>
                                  )}
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td colSpan={2} className="pt-2">
                                <span className="text-[8.5px] font-bold text-slate-500 uppercase block leading-none mb-1">
                                  Período de Realização do Curso / Missão
                                </span>
                                <span className="font-bold text-slate-800 uppercase leading-snug font-mono text-[11px]">
                                  {aluno.data_inicio_curso 
                                    ? format(new Date(aluno.data_inicio_curso), 'dd/MM/yyyy') 
                                    : (turma?.data_inicio ? format(new Date(turma.data_inicio), 'dd/MM/yyyy') : '-')}
                                  {' a '}
                                  {aluno.data_fim_curso 
                                    ? format(new Date(aluno.data_fim_curso), 'dd/MM/yyyy') 
                                    : (turma?.data_fim ? format(new Date(turma.data_fim), 'dd/MM/yyyy') : '-')}
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Seção 1: Dados Pessoais e Documentação Civil */}
                      <div className="mb-4 print-avoid-break break-inside-avoid">
                        <h3 
                          style={{ backgroundColor: '#002776', color: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                          className="text-[10.5px] font-black uppercase tracking-wider bg-[#002776] text-white px-3.5 py-1.5 rounded-t section-blue-bar !text-white !bg-[#002776]"
                        >
                          1. DADOS PESSOAIS E DOCUMENTAÇÃO CIVIL
                        </h3>
                        <table className="w-full border-collapse border border-slate-500 text-xs">
                          <tbody>
                            <tr className="border-b border-slate-400">
                              <td className="py-2.5 px-3 font-bold bg-slate-100 w-1/4 border-r border-slate-400 text-slate-700">Gênero:</td>
                              <td className="py-2.5 px-3 w-1/4 border-r border-slate-400 capitalize">{aluno.genero || '-'}</td>
                              <td className="py-2.5 px-3 font-bold bg-slate-100 w-1/4 border-r border-slate-400 text-slate-700">Data de Nascimento:</td>
                              <td className="py-2.5 px-3 w-1/4 font-mono">
                                {aluno.data_nascimento ? format(new Date(aluno.data_nascimento), 'dd/MM/yyyy') : '-'}
                              </td>
                            </tr>
                            <tr className="border-b border-slate-400">
                              <td className="py-2.5 px-3 font-bold bg-slate-100 border-r border-slate-400 text-slate-700">RG:</td>
                              <td className="py-2.5 px-3 font-mono border-r border-slate-400">{aluno.rg || '-'}</td>
                              <td className="py-2.5 px-3 font-bold bg-slate-100 border-r border-slate-400 text-slate-700">NIF (Identificação Fiscal):</td>
                              <td className="py-2.5 px-3 font-mono">{aluno.nif || '-'}</td>
                            </tr>
                            <tr className="border-b border-slate-400">
                              <td className="py-2.5 px-3 font-bold bg-slate-100 border-r border-slate-400 text-slate-700">Passaporte:</td>
                              <td className="py-2.5 px-3 font-mono border-r border-slate-400 font-bold text-slate-900">{aluno.passaporte || '-'}</td>
                              <td className="py-2.5 px-3 font-bold bg-slate-100 border-r border-slate-400 text-slate-700">Título de Eleitor:</td>
                              <td className="py-2.5 px-3 font-mono">{aluno.titulo_eleitor || '-'}</td>
                            </tr>
                            <tr className="border-b border-slate-400">
                              <td className="py-2.5 px-3 font-bold bg-slate-100 border-r border-slate-400 text-slate-700">Tipo Sanguíneo / Fator RH:</td>
                              <td className="py-2.5 px-3 font-mono border-r border-slate-400">
                                {aluno.tipo_sanguineo ? `${aluno.tipo_sanguineo}${aluno.fator_rh || ''}` : '-'}
                              </td>
                              <td className="py-2.5 px-3 font-bold bg-slate-100 border-r border-slate-400 text-slate-700">Altura / Peso:</td>
                              <td className="py-2.5 px-3 font-mono">
                                {aluno.altura ? `${aluno.altura} m` : '-'} / {aluno.peso ? `${aluno.peso} kg` : '-'}
                              </td>
                            </tr>
                            <tr className="border-b border-slate-400">
                              <td className="py-2.5 px-3 font-bold bg-slate-100 border-r border-slate-400 text-slate-700">Nome do Pai:</td>
                              <td className="py-2.5 px-3 uppercase border-r border-slate-400" colSpan={3}>{aluno.nome_pai || '-'}</td>
                            </tr>
                            <tr className="border-b border-slate-400">
                              <td className="py-2.5 px-3 font-bold bg-slate-100 border-r border-slate-400 text-slate-700">Nome da Mãe:</td>
                              <td className="py-2.5 px-3 uppercase border-r border-slate-400" colSpan={3}>{aluno.nome_mae || '-'}</td>
                            </tr>
                            <tr>
                              <td className="py-2.5 px-3 font-bold bg-slate-100 border-r border-slate-400 text-slate-700">Ano de Admissão:</td>
                              <td className="py-2.5 px-3 font-mono border-r border-slate-400">{aluno.ano_admissao || '-'}</td>
                              <td className="py-2.5 px-3 font-bold bg-slate-100 border-r border-slate-400 text-slate-700">Função / Cargo:</td>
                              <td className="py-2.5 px-3 uppercase">{aluno.funcao || '-'}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Seção 2: Contato e Comunicação */}
                      <div className="mb-5 print-avoid-break break-inside-avoid">
                        <h3 
                          style={{ backgroundColor: '#002776', color: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                          className="text-[10.5px] font-black uppercase tracking-wider bg-[#002776] text-white px-3.5 py-1.5 rounded-t section-blue-bar !text-white !bg-[#002776]"
                        >
                          2. CONTATO E COMUNICAÇÃO
                        </h3>
                        <table className="w-full border-collapse border border-slate-500 text-xs">
                          <tbody>
                            <tr className="border-b border-slate-400">
                              <td className="py-2.5 px-3 font-bold bg-slate-100 w-1/6 border-r border-slate-400 text-slate-700">E-mail:</td>
                              <td className="py-2.5 px-3 font-mono w-2/6 border-r border-slate-400">{aluno.email || '-'}</td>
                              <td className="py-2.5 px-3 font-bold bg-slate-100 w-1/6 border-r border-slate-400 text-slate-700">Telefone:</td>
                              <td className="py-2.5 px-3 font-mono w-2/6">{aluno.telefone || '-'}</td>
                            </tr>
                            <tr className="border-b border-slate-400">
                              <td className="py-2.5 px-3 font-bold bg-slate-100 border-r border-slate-400 text-slate-700">WhatsApp:</td>
                              <td className="py-2.5 px-3 font-mono border-r border-slate-400">{aluno.whatsapp || '-'}</td>
                              <td className="py-2.5 px-3 font-bold bg-slate-100 border-r border-slate-400 text-slate-700">Código de Acesso:</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-blue-900">{accessCode}</td>
                            </tr>
                            <tr>
                              <td className="py-2.5 px-3 font-bold bg-slate-100 border-r border-slate-400 text-slate-700">Endereço Residencial:</td>
                              <td className="py-2.5 px-3 uppercase border-r border-slate-400 font-medium" colSpan={3}>
                                {aluno.endereco || '-'}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Declaração de Veracidade e Responsabilidade */}
                      <div className="mt-6 mb-3 text-center print-avoid-break break-inside-avoid">
                        <p className="text-[9.5px] font-medium text-slate-600 italic">
                          Declaro sob as penas cabíveis que todas as informações acima prestadas são verdadeiras e exatas, assumindo total responsabilidade pelas mesmas.
                        </p>
                      </div>

                      {/* Termo de Assinaturas */}
                      <div className="pt-6 mt-4 grid grid-cols-2 gap-12 text-center text-xs print-avoid-break break-inside-avoid">
                        <div>
                          <div className="border-b-2 border-slate-800 w-4/5 mx-auto mb-2"></div>
                          <p className="font-black text-slate-900 uppercase text-xs">
                            {aluno.nome || 'ASSINATURA DO ALUNO / CANDIDATO'}
                          </p>
                          <p className="text-[8.5px] font-bold text-slate-500 uppercase mt-0.5">
                            Assinatura do Aluno / Candidato
                          </p>
                        </div>
                        <div>
                          <div className="border-b-2 border-slate-800 w-4/5 mx-auto mb-2"></div>
                          <p className="font-black text-slate-900 uppercase text-xs">
                            COORDENADOR DE CURSOS
                          </p>
                          <p className="text-[8.5px] font-bold text-slate-500 uppercase mt-0.5">
                            Assinatura e Carimbo Oficial
                          </p>
                        </div>
                      </div>

                      {/* Datação e Localidade Oficial */}
                      <div className="mt-5 text-center text-[10px] font-bold text-slate-800 font-mono print-avoid-break break-inside-avoid">
                        São Tomé, _____ de ____________________ de 20____.
                      </div>

                      {/* Rodapé Oficial da Ficha */}
                      <div className="border-t-2 border-slate-300 mt-6 pt-2 flex items-center justify-between text-[8px] font-bold text-slate-500 uppercase print-avoid-break break-inside-avoid">
                        <span>MISSÃO DE ASSESSORIA NAVAL DO BRASIL EM SÃO TOMÉ E PRÍNCIPE</span>
                        <span>FICHA DE REGISTRO E CONTROLE ACADÊMICO • DOCUMENTO OFICIAL</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>
    </AnimatePresence>
  );
}
