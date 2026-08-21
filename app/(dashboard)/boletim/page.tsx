'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense, Fragment } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useCursos, useTurmas, useDisciplinas, useConfiguracoes } from '@/hooks/useCachedData';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { 
  FileText, 
  Search, 
  Filter,
  Printer,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Users,
  X,
  Award,
  Shield,
  Clock,
  BookOpen,
  Calendar,
  User,
  Percent
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { cn, getCleanTurmaName } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useUser } from '@/lib/auth/UserContext';
import { fetchWithAuth } from '@/lib/api';
import navalMissionLogo from '@/src/assets/images/regenerated_image_1782409801823.png';

const reportT = {
  pt: {
    headerTitle: "MISSÃO DE ASSESSORIA NAVAL DO BRASIL EM SÃO TOMÉ E PRÍNCIPE",
    headerSubtitle: "HISTÓRICO ESCOLAR DE DESEMPENHO ACADÊMICO",
    studentInfo: "IDENTIFICAÇÃO DO ALUNO",
    academicMap: "MAPA DE RENDIMENTO ACADÊMICO",
    attendanceReg: "REGISTRO DE FREQUÊNCIA",
    footerText: "Emitido eletronicamente via Sistema de Gestão Escolar",
    observations: "OBSERVAÇÕES PEDAGÓGICAS E DISCIPLINARES",
    defaultObs: "Aluno(a) demonstra comprometimento acadêmico regular, preenchendo os requisitos regulamentares de frequência e aproveitamento didático estabelecidos pelas normas vigentes.",
    signatureCommander: "Chefe da Missão de Assessoria Naval do Brasil em São Tomé e Príncipe",
    fullName: "Nome Completo",
    rank: "Posto / Graduação",
    course: "Curso de Formação",
    class: "Turma",
    period: "Turno / Período",
    status: "Status de Matrícula",
    totalLectures: "Total de Aulas",
    attendances: "Presenças",
    absences: "Faltas",
    attendanceRate: "Aproveitamento de Frequência",
    discipline: "Disciplina / Módulo",
    finalGrade: "Nota Final",
    situation: "Situação",
    overallAverage: "Média Geral de Notas",
    overallStatus: "Situação de Curso",
    approved: "APROVADO",
    reproved: "REPROVADO",
    retake: "RECUPERAÇÃO",
    pending: "EM AVALIAÇÃO",
    inProgress: "Em Andamento (Ativo)",
    completed: "Curso Concluído",
    printReport: "Imprimir Histórico Escolar",
    close: "Fechar",
  },
  en: {
    headerTitle: "BRAZILIAN NAVAL ADVISORY MISSION IN SÃO TOMÉ AND PRÍNCIPE",
    headerSubtitle: "OFFICIAL ACADEMIC TRANSCRIPT",
    studentInfo: "STUDENT / TRAINEE IDENTIFICATION",
    academicMap: "ACADEMIC PERFORMANCE MAP",
    attendanceReg: "ATTENDANCE REGISTER",
    footerText: "Electronically issued via School Management System",
    observations: "PEDAGOGICAL & DISCIPLINARY OBSERVATIONS",
    defaultObs: "The student demonstrates regular academic commitment, complying with the regulatory requirements of attendance and training achievements established by current regulations.",
    signatureCommander: "Head of the Brazilian Naval Advisory Mission in São Tomé and Príncipe",
    fullName: "Full Name",
    rank: "Rank / Post",
    course: "Course of Instruction",
    class: "Class Section",
    period: "Session / Period",
    status: "Enrollment Status",
    totalLectures: "Total Lectures",
    attendances: "Attendances",
    absences: "Absences",
    attendanceRate: "Attendance Rate",
    discipline: "Discipline / Module",
    finalGrade: "Final Grade",
    situation: "Situation",
    overallAverage: "Overall GPA",
    overallStatus: "Overall Status",
    approved: "APPROVED",
    reproved: "FAILED",
    retake: "RETAKE",
    pending: "UNDER EVALUATION",
    inProgress: "In Progress (Active)",
    completed: "Course Completed",
    printReport: "Print Report",
    close: "Close",
  }
};

function BoletimContent() {
  const { t, language } = useI18n();
  const { profile, isAdmin, isConvidado } = useUser();
  const isNifStudent = profile?.role === 'aluno' && (profile as any).isNifStudent;

  const [loading, setLoading] = useState(false);
  const { cursos: rawCursos } = useCursos();
  const { turmas: rawTurmas } = useTurmas();
  const { disciplinas } = useDisciplinas();
  const { configuracoes } = useConfiguracoes();
  const searchParams = useSearchParams();

  const cursos = useMemo(() => {
    return (rawCursos || []).filter((c: any) => !c.internacional);
  }, [rawCursos]);

  const turmas = useMemo(() => {
    return (rawTurmas || []).filter((t: any) => !t.internacional);
  }, [rawTurmas]);

  const anos = useMemo(() => {
    return Array.from(new Set(turmas.map((t: any) => t.ano))).sort((a: any, b: any) => b - a);
  }, [turmas]);
  
  const [selectedCurso, setSelectedCurso] = useState('');
  const [selectedTurma, setSelectedTurma] = useState('');
  const [selectedAno, setSelectedAno] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCurso = sessionStorage.getItem('boletim_selected_curso');
      const savedAno = sessionStorage.getItem('boletim_selected_ano');
      const savedTurma = sessionStorage.getItem('boletim_selected_turma');

      if (!searchParams?.get('turmaId') && !searchParams?.get('cursoId')) {
        if (savedCurso) setSelectedCurso(savedCurso);
        if (savedAno) setSelectedAno(savedAno);
        if (savedTurma) setSelectedTurma(savedTurma);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (selectedCurso) sessionStorage.setItem('boletim_selected_curso', selectedCurso);
      else sessionStorage.removeItem('boletim_selected_curso');

      if (selectedAno) sessionStorage.setItem('boletim_selected_ano', selectedAno);
      else sessionStorage.removeItem('boletim_selected_ano');

      if (selectedTurma) sessionStorage.setItem('boletim_selected_turma', selectedTurma);
      else sessionStorage.removeItem('boletim_selected_turma');
    }
  }, [selectedCurso, selectedAno, selectedTurma]);

  useEffect(() => {
    if (turmas.length > 0) {
      const paramTurma = searchParams?.get('turmaId');
      const targetTurmaId = paramTurma || (typeof window !== 'undefined' ? sessionStorage.getItem('boletim_selected_turma') : null);

      if (targetTurmaId) {
        const foundTurma = turmas.find((t: any) => t.id === targetTurmaId);
        if (foundTurma) {
          if (foundTurma.curso_id) {
            setSelectedCurso(foundTurma.curso_id);
          }
          if (foundTurma.ano) {
            setSelectedAno(String(foundTurma.ano));
          }
          setSelectedTurma(targetTurmaId);
          handleSearch(targetTurmaId);
        }
      } else {
        const paramCurso = searchParams?.get('cursoId') || (typeof window !== 'undefined' ? sessionStorage.getItem('boletim_selected_curso') : null);
        if (paramCurso) {
          setSelectedCurso(paramCurso);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, turmas]);
  const [courseModules, setCourseModules] = useState(4);
  
  const [boletimData, setBoletimData] = useState<any[]>([]);
  const [classStats, setClassStats] = useState({ avg: 0, total: 0 });
  const settings = configuracoes || { media_aprovacao: 7, media_recuperacao: 5, frequencia_minima: 75, nota_maxima: 10 };

  const [selectedStudentForReport, setSelectedStudentForReport] = useState<string | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportData, setReportData] = useState<any | null>(null);

  const getReportFirstGrade = useCallback((rData: any) => {
    if (!rData || !rData.grades || rData.grades.length === 0) return null;
    
    // 1. Prioritize finding the grade row that actually contains modular grades (nota1, nota2, etc.)
    const hasNotesGrade = rData.grades.find((g: any) => {
      for (let m = 1; m <= 20; m++) {
        const val = g[`nota${m}`];
        if (val !== null && val !== undefined && val !== '') return true;
      }
      return false;
    });
    if (hasNotesGrade) return hasNotesGrade;
    
    // 2. Fallback to alphabetically first discipline of the course
    const alphabeticalDisciplines = [...(rData.disciplines || [])].sort((a: any, b: any) => 
      (a.nome || '').localeCompare(b.nome || '', 'pt-BR')
    );
    const alphaFirstDisc = alphabeticalDisciplines[0];
    
    if (alphaFirstDisc) {
      const matchingGrade = rData.grades.find((g: any) => g.disciplina_id === alphaFirstDisc.id);
      if (matchingGrade) return matchingGrade;
    }
    
    // 3. Fallback to first discipline sorted by module then name
    const firstDisc = [...(rData.disciplines || [])].sort((a: any, b: any) => {
      const mDiff = (a.modulo_index || 1) - (b.modulo_index || 1);
      if (mDiff !== 0) return mDiff;
      return (a.nome || '').localeCompare(b.nome || '', 'pt-BR');
    })[0];
    
    if (firstDisc) {
      const matchingFirstDiscGrade = rData.grades.find((g: any) => g.disciplina_id === firstDisc.id);
      if (matchingFirstDiscGrade) return matchingFirstDiscGrade;
    }
    
    return rData.grades[0] || null;
  }, []);

  const getDisciplineGradeAndFreq = useCallback((disc: any, discIdx: number, rData: any, firstGrade: any) => {
    const moduleNum = disc.modulo_index || (discIdx + 1);
    const directGrade = (rData?.grades || []).find((g: any) => g.disciplina_id === disc.id);

    let finalGradeValue: number | null = null;
    if (directGrade && directGrade.nota_final !== null && directGrade.nota_final !== undefined && directGrade.nota_final !== '') {
      finalGradeValue = Number(directGrade.nota_final);
    } else if (directGrade && directGrade[`nota${moduleNum}`] !== null && directGrade[`nota${moduleNum}`] !== undefined && directGrade[`nota${moduleNum}`] !== '') {
      finalGradeValue = Number(directGrade[`nota${moduleNum}`]);
    } else {
      const anyModularRow = (rData?.grades || []).find((g: any) => {
        const val = g[`nota${moduleNum}`];
        return val !== null && val !== undefined && val !== '';
      });
      if (anyModularRow) {
        const val = anyModularRow[`nota${moduleNum}`];
        if (val !== null && val !== undefined && val !== '') {
          finalGradeValue = Number(val);
        }
      } else if (directGrade && directGrade.nota1 !== null && directGrade.nota1 !== undefined && directGrade.nota1 !== '') {
        finalGradeValue = Number(directGrade.nota1);
      }
    }

    let freqValue: number | null = null;
    if (directGrade && directGrade.frequencia !== null && directGrade.frequencia !== undefined && directGrade.frequencia !== '') {
      freqValue = Number(directGrade.frequencia);
    } else {
      const anyFreqRow = (rData?.grades || []).find((g: any) => g.frequencia !== null && g.frequencia !== undefined && g.frequencia !== '');
      if (anyFreqRow) {
        freqValue = Number(anyFreqRow.frequencia);
      }
    }

    return { finalGradeValue, freqValue, moduleNum };
  }, []);

  const [pendingDetailsStudent, setPendingDetailsStudent] = useState<any | null>(null);
  const [scale, setScale] = useState(0.55);
  const [zoomMode, setZoomMode] = useState<'height' | 'width'>('height');
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  // Class Bulletin PDF states
  const [viewingClassBulletinPDF, setViewingClassBulletinPDF] = useState(false);
  const [classScale, setClassScale] = useState(0.55);
  const [downloadingClassPDF, setDownloadingClassPDF] = useState(false);

  // Dynamic auto-fit calculation based on viewport height or width
  useEffect(() => {
    if (!selectedStudentForReport) return;
    const calculateScale = () => {
      if (zoomMode === 'width') {
        // Fit Width - Scale A4 (794px wide) to occupy basically the full screen width
        const targetWidth = window.innerWidth - 64;
        const computedScale = Math.min(Math.max(targetWidth / 794, 0.3), 1.5);
        setScale(computedScale);
      } else {
        // Fit Height - Scale A4 (1123px high) to comfortably fit inside the full vertical space (subtracting headers/padding)
        const targetHeight = window.innerHeight - 150;
        const computedScale = Math.min(Math.max(targetHeight / 1123, 0.3), 1.05);
        setScale(computedScale);
      }
    };
    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, [selectedStudentForReport, zoomMode]);

  useEffect(() => {
    if (!viewingClassBulletinPDF) return;
    const calculateClassScale = () => {
      // Scale A4 (1123px high) to comfortably fit inside around 65% of screen height
      const targetHeight = window.innerHeight * 0.65;
      const computedScale = Math.min(Math.max(targetHeight / 1123, 0.4), 0.95);
      setClassScale(computedScale);
    };
    calculateClassScale();
    window.addEventListener('resize', calculateClassScale);
    return () => window.removeEventListener('resize', calculateClassScale);
  }, [viewingClassBulletinPDF]);

  useEffect(() => {
    if (isNifStudent && profile?.student_id) {
      setSelectedStudentForReport(profile.student_id);
    }
  }, [isNifStudent, profile]);

  const handlePrint = () => {
    try {
      const isIframe = typeof window !== 'undefined' && window.self !== window.top;
      
      if (isIframe) {
        toast.info(
          language === 'pt' 
            ? 'Atenção: Se a janela de impressão não abrir, use o botão no topo direito do visualizador para abrir o aplicativo em uma nova aba e imprimir.' 
            : 'Notice: If the print dialog does not open, please open the application in a new tab by clicking the top-right button in the preview.'
        );
      }
      
      window.print();
    } catch (error) {
      console.error('Print failed:', error);
      toast.error(
        language === 'pt'
          ? 'Não foi possível imprimir no visualizador integrado. Por favor, abra em uma nova aba.'
          : 'Failed to open print dialog in the integrated preview. Please open in a new tab.'
      );
    }
  };

  const oklabToRgbVal = (l: number, a: number, b: number): [number, number, number] => {
    const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = l - 0.0894841775 * a - 1.2914855480 * b;

    const l3 = l_ * l_ * l_;
    const m3 = m_ * m_ * m_;
    const s3 = s_ * s_ * s_;

    const x = +1.2270138511 * l3 - 0.5577999807 * m3 + 0.2812561490 * s3;
    const y = -0.0405801784 * l3 + 1.1122568696 * m3 - 0.0716766787 * s3;
    const z = -0.0763812845 * l3 - 0.4214819784 * m3 + 1.5861632204 * s3;

    let r = +3.2404542 * x - 1.5371385 * y - 0.4985314 * z;
    let g = -0.9692660 * x + 1.8760108 * y + 0.0415560 * z;
    let bVal = -0.2264055 * x + 0.0556434 * y + 1.0572252 * z;

    const fn = (cVal: number) => {
      if (cVal <= 0.0031308) {
        return 12.92 * cVal;
      } else {
        return 1.055 * Math.pow(cVal, 1 / 2.4) - 0.055;
      }
    };

    r = fn(r);
    g = fn(g);
    bVal = fn(bVal);

    const R = Math.max(0, Math.min(255, Math.round(r * 255)));
    const G = Math.max(0, Math.min(255, Math.round(g * 255)));
    const B = Math.max(0, Math.min(255, Math.round(bVal * 255)));

    return [R, G, B];
  };

  const oklchToRgbVal = (l: number, c: number, h: number): [number, number, number] => {
    const hRad = (h * Math.PI) / 180;
    const a = c * Math.cos(hRad);
    const b = c * Math.sin(hRad);
    return oklabToRgbVal(l, a, b);
  };

  const parseAndConvertOklch = (colorStr: string): string => {
    if (!colorStr || !colorStr.includes('oklch')) return colorStr;

    return colorStr.replace(/oklch\(([^)]+)\)/g, (match, content) => {
      try {
        const normalized = content.replace(/,/g, ' ').replace(/\//g, ' ').trim();
        const parts = normalized.split(/\s+/).map((p: string) => {
          if (p.endsWith('%')) {
            return parseFloat(p) / 100;
          }
          return parseFloat(p);
        });

        if (parts.length >= 3 && !parts.some(isNaN)) {
          const [l, c, h] = parts;
          const [r, g, b] = oklchToRgbVal(l, c, h);
          const alpha = parts[3] !== undefined ? parts[3] : 1;
          return alpha === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
      } catch (e) {
        console.error("Failed to parse oklch color:", match, e);
      }
      return match;
    });
  };

  const parseAndConvertOklab = (colorStr: string): string => {
    if (!colorStr || !colorStr.includes('oklab')) return colorStr;

    return colorStr.replace(/oklab\(([^)]+)\)/g, (match, content) => {
      try {
        const normalized = content.replace(/,/g, ' ').replace(/\//g, ' ').trim();
        const parts = normalized.split(/\s+/).map((p: string) => {
          if (p.endsWith('%')) {
            return parseFloat(p) / 100;
          }
          return parseFloat(p);
        });

        if (parts.length >= 3 && !parts.some(isNaN)) {
          const [l, a, b] = parts;
          const [r, g, bVal] = oklabToRgbVal(l, a, b);
          const alpha = parts[3] !== undefined ? parts[3] : 1;
          return alpha === 1 ? `rgb(${r}, ${g}, ${bVal})` : `rgba(${r}, ${g}, ${bVal}, ${alpha})`;
        }
      } catch (e) {
        console.error("Failed to parse oklab color:", match, e);
      }
      return match;
    });
  };

  const handleDownloadPDF = async () => {
    if (!reportData) return;
    setDownloadingPDF(true);
    const toastId = toast.loading(language === 'pt' ? 'Gerando arquivo PDF...' : 'Generating PDF file...');
    
    try {
      const element = document.getElementById('student-report-print-area');
      if (!element) {
        throw new Error("Print area element not found");
      }

      // Temporarily clear the scale transform for high-fidelity canvas snapshot
      const prevScale = scale;
      setScale(1.0);
      
      // Let the DOM update to full-scale resolution and expanded dimensions
      await new Promise((resolve) => setTimeout(resolve, 300));

      const html2canvas = (await import('html2canvas-pro')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(element, {
        scale: 2.2, // Extremely sharp, crystal-clear typography text
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 794,
        onclone: (clonedDoc) => {
          // Process all cloned print area elements to ensure they are fully expanded
          const clonedPrintAreas = clonedDoc.querySelectorAll('#student-report-print-area');
          clonedPrintAreas.forEach((cArea) => {
            const htmlArea = cArea as HTMLElement;
            htmlArea.style.height = 'auto';
            htmlArea.style.maxHeight = 'none';
            htmlArea.style.overflow = 'visible';
          });

          const clonedFrameBox = clonedDoc.getElementById('student-report-frame-box');
          if (clonedFrameBox) {
            clonedFrameBox.style.height = 'auto';
            clonedFrameBox.style.minHeight = 'none';
            clonedFrameBox.style.overflow = 'visible';
          }

          const clonedOuterWrapper = clonedDoc.getElementById('student-report-outer-wrapper');
          if (clonedOuterWrapper) {
            clonedOuterWrapper.style.height = 'auto';
            clonedOuterWrapper.style.overflow = 'visible';
          }

          // Process all <style> tags in the cloned document to preemptively transform oklch and oklab stylesheet rules
          clonedDoc.querySelectorAll('style').forEach((styleEl) => {
            try {
              let cssText = styleEl.innerHTML;
              if (cssText.includes('oklch') || cssText.includes('oklab')) {
                cssText = parseAndConvertOklch(cssText);
                cssText = parseAndConvertOklab(cssText);
                styleEl.innerHTML = cssText;
              }
            } catch (e) {
              console.error("Failed to process style element:", e);
            }
          });

          const elements = clonedDoc.querySelectorAll('*');
          elements.forEach((el) => {
            const htmlEl = el as HTMLElement;
            const styleProps = [
              'color', 'backgroundColor', 'borderColor', 
              'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
              'outlineColor', 'fill', 'stroke'
            ];
            
            try {
              const computed = window.getComputedStyle(htmlEl);
              styleProps.forEach((prop) => {
                const val = computed[prop as any];
                if (val && (val.includes('oklch') || val.includes('oklab'))) {
                  let converted = parseAndConvertOklch(val);
                  converted = parseAndConvertOklab(converted);
                  htmlEl.style[prop as any] = converted;
                }
              });

              const inlineStyle = htmlEl.getAttribute('style');
              if (inlineStyle && (inlineStyle.includes('oklch') || inlineStyle.includes('oklab'))) {
                let converted = parseAndConvertOklch(inlineStyle);
                converted = parseAndConvertOklab(converted);
                htmlEl.setAttribute('style', converted);
              }
            } catch (err) {
              // Silently ignore style errors on incompatible elements
            }
          });
        }
      });

      // Restore preview scale back to configured level
      setScale(prevScale);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight <= pageHeight) {
        // Fits perfectly on a single page without scaling or distortion
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      } else if (imgHeight <= 315) {
        // Very close to pageHeight, scale down proportionally to fit precisely in a single page with zero distortion
        const scaleFactor = pageHeight / imgHeight;
        const adjustedWidth = imgWidth * scaleFactor;
        const xOffset = (imgWidth - adjustedWidth) / 2;
        pdf.addImage(imgData, 'PNG', xOffset, 0, adjustedWidth, pageHeight);
      } else {
        // Multi-page layout: slice the canvas image across multiple A4 pages with exact proportional dimensions
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 2) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
      }
      
      const sanitizedName = reportData.student.nome.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const fileName = `boletim_individual_${sanitizedName}.pdf`;
      pdf.save(fileName);
      
      toast.success(language === 'pt' ? 'Histórico Escolar PDF baixado com sucesso!' : 'Academic Transcript PDF downloaded successfully!', { id: toastId });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error(language === 'pt' ? 'Por favor, tente novamente.' : 'Please try again.', { id: toastId });
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleCopyAsImage = async (e: React.MouseEvent) => {
    // Only proceed on left mouse button click (button 0)
    if (e.button !== 0) return;
    
    // Prevent copy when clicking buttons, selects, or icons
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('select') || target.closest('a')) {
      return;
    }

    const toastId = toast.loading(language === 'pt' ? 'Processando imagem para área de transferência...' : 'Processing image for clipboard...');
    
    try {
      const html2canvas = (await import('html2canvas-pro')).default;
      const element = document.getElementById('student-report-print-area');
      if (!element) throw new Error('Report element not found');

      // Temporarily expand the container's height and overflow styles to fully display all data
      const originalHeight = element.style.height;
      const originalMaxHeight = element.style.maxHeight;
      const originalOverflow = element.style.overflow;

      element.style.height = 'auto';
      element.style.maxHeight = 'none';
      element.style.overflow = 'visible';

      // Set scale temporary to higher resolution for premium quality copy
      const prevScale = scale;
      setScale(1.2);
      await new Promise(resolve => setTimeout(resolve, 300));

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          // Process all cloned print area elements to ensure they are fully expanded
          const clonedPrintAreas = clonedDoc.querySelectorAll('#student-report-print-area');
          clonedPrintAreas.forEach((cArea) => {
            const htmlArea = cArea as HTMLElement;
            htmlArea.style.height = 'auto';
            htmlArea.style.maxHeight = 'none';
            htmlArea.style.overflow = 'visible';
          });

          // Process OKLCH / OKLAB styles to avoid crash (same as pdf generator)
          clonedDoc.querySelectorAll('style').forEach((styleEl) => {
            try {
              let cssText = styleEl.innerHTML;
              if (cssText.includes('oklch') || cssText.includes('oklab')) {
                cssText = parseAndConvertOklch(cssText);
                cssText = parseAndConvertOklab(cssText);
                styleEl.innerHTML = cssText;
              }
            } catch (e) {
              console.error(e);
            }
          });

          clonedDoc.querySelectorAll('*').forEach((el) => {
            const htmlEl = el as HTMLElement;
            const styleProps = [
              'color', 'backgroundColor', 'borderColor', 
              'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
              'outlineColor', 'fill', 'stroke'
            ];
            
            try {
              const computed = window.getComputedStyle(htmlEl);
              styleProps.forEach((prop) => {
                const val = computed[prop as any];
                if (val && (val.includes('oklch') || val.includes('oklab'))) {
                  let converted = parseAndConvertOklch(val);
                  converted = parseAndConvertOklab(converted);
                  htmlEl.style[prop as any] = converted;
                }
              });

              const inlineStyle = htmlEl.getAttribute('style');
              if (inlineStyle && (inlineStyle.includes('oklch') || inlineStyle.includes('oklab'))) {
                let converted = parseAndConvertOklch(inlineStyle);
                converted = parseAndConvertOklab(converted);
                htmlEl.setAttribute('style', converted);
              }
            } catch (err) {}
          });
        }
      });

      // Restore original screen styles and preview scale back to configured level
      element.style.height = originalHeight;
      element.style.maxHeight = originalMaxHeight;
      element.style.overflow = originalOverflow;
      setScale(prevScale);

      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error(language === 'pt' ? 'Erro ao gerar o arquivo de imagem.' : 'Error generating image file.', { id: toastId });
          return;
        }
        try {
          // Copy PNG blob directly to clipboard
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/png': blob
            })
          ]);
          toast.success(language === 'pt' ? 'Histórico Escolar copiado como imagem para a área de transferência!' : 'Academic Transcript copied as image to clipboard!', { id: toastId });
        } catch (clipErr) {
          console.error("Clipboard API failed, downloading instead:", clipErr);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const nameClean = reportData?.student?.nome ? reportData.student.nome.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'aluno';
          a.download = `boletim_individual_${nameClean}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast.success(language === 'pt' ? 'Imagem gerada e baixada com sucesso!' : 'Image transcript created and downloaded successfully!', { id: toastId });
        }
      }, 'image/png');

    } catch (err) {
      console.error("Failed to copy image:", err);
      toast.error(language === 'pt' ? 'Falha ao copiar folha do histórico como imagem.' : 'Failed to copy transcript sheet as image.', { id: toastId });
    }
  };

  const handleDownloadClassBulletinPDF = async () => {
    if (downloadingClassPDF || !selectedTurma || boletimData.length === 0) return;

    setDownloadingClassPDF(true);
    // Lazy get toast
    const { toast } = await import('sonner');
    const toastId = toast.loading(language === 'pt' ? 'Gerando o Boletim de Rendimento de Turma em PDF...' : 'Generating Class Report PDF...');

    try {
      // Lazy load html2canvas and jspdf
      const html2canvas = (await import('html2canvas-pro')).default;
      const { jsPDF } = await import('jspdf');

      const printArea = document.getElementById('class-bulletin-print-area');
      if (!printArea) {
        toast.error(language === 'pt' ? 'Área de impressão não localizada.' : 'Print area not found.', { id: toastId });
        return;
      }

      // Temporarily set scale to 1.0 for perfect pixel capture
      const prevScale = classScale;
      setClassScale(1.0);
      
      // Wait for React to render at full resolution scale and expanded dimensions
      await new Promise((resolve) => setTimeout(resolve, 350));

      const convertedStyles: { element: HTMLElement; originalStyle: string }[] = [];
      const oklchElements = printArea.querySelectorAll('*');
      
      oklchElements.forEach((el) => {
        const hEl = el as HTMLElement;
        const style = hEl.getAttribute('style') || '';
        const bg = window.getComputedStyle(hEl).backgroundColor;
        const textCol = window.getComputedStyle(hEl).color;
        const borderCol = window.getComputedStyle(hEl).borderColor;

        let override = '';
        if (bg && bg.includes('oklch')) {
          override += `background-color: ${parseAndConvertOklch(bg)} !important;`;
        }
        if (bg && bg.includes('oklab')) {
          override += `background-color: ${parseAndConvertOklab(bg)} !important;`;
        }
        if (textCol && textCol.includes('oklch')) {
          override += `color: ${parseAndConvertOklch(textCol)} !important;`;
        }
        if (textCol && textCol.includes('oklab')) {
          override += `color: ${parseAndConvertOklab(textCol)} !important;`;
        }
        if (borderCol && borderCol.includes('oklch')) {
          override += `border-color: ${parseAndConvertOklch(borderCol)} !important;`;
        }
        if (borderCol && borderCol.includes('oklab')) {
          override += `border-color: ${parseAndConvertOklab(borderCol)} !important;`;
        }

        if (override) {
          convertedStyles.push({ element: hEl, originalStyle: style });
          hEl.setAttribute('style', style + (style.endsWith(';') || !style ? '' : ';') + override);
        }
      });

      const canvas = await html2canvas(printArea, {
        scale: 2.2, // Retina scale capture for crisp vectors and sharp text lines
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc) => {
          const clonePrintArea = clonedDoc.getElementById('class-bulletin-print-area');
          if (clonePrintArea) {
            clonePrintArea.style.transform = 'none';
            clonePrintArea.style.transformOrigin = 'unset';
          }
        }
      });

      // Restore style overrides
      convertedStyles.forEach(({ element, originalStyle }) => {
        if (originalStyle) {
          element.setAttribute('style', originalStyle);
        } else {
          element.removeAttribute('style');
        }
      });

      // Restore preview scale back to configured level
      setClassScale(prevScale);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight <= pageHeight) {
        // Fits perfectly on a single page without scaling or distortion
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      } else if (imgHeight <= 315) {
        // Very close to pageHeight, scale down proportionally to fit precisely in a single page with zero distortion
        const scaleFactor = pageHeight / imgHeight;
        const adjustedWidth = imgWidth * scaleFactor;
        const xOffset = (imgWidth - adjustedWidth) / 2;
        pdf.addImage(imgData, 'PNG', xOffset, 0, adjustedWidth, pageHeight);
      } else {
        // Multi-page layout: slice the canvas image across multiple A4 pages with exact proportional dimensions
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 2) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
      }
      
      const currentTurmaObj = turmas.find((t: any) => t.id === selectedTurma);
      const sanitizedTurmaName = currentTurmaObj?.nome ? currentTurmaObj.nome.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'turma';
      const fileName = `boletim_turma_${sanitizedTurmaName}.pdf`;
      pdf.save(fileName);
      
      toast.success(language === 'pt' ? 'Boletim da Turma extraído com sucesso!' : 'Class Bulletin PDF exported successfully!', { id: toastId });
    } catch (error) {
      console.error("Error generating class PDF:", error);
      toast.error(language === 'pt' ? 'Erro ao processar as folhas de notas da turma.' : 'Failed to compile class grades report pages.', { id: toastId });
    } finally {
      setDownloadingClassPDF(false);
    }
  };

  useEffect(() => {
    if (!selectedStudentForReport) {
      return;
    }

    const fetchReportData = async () => {
      setReportData(null);
      setLoadingReport(true);
      try {
        const { data: student, error: studentErr } = await supabase
          .from('alunos')
          .select('*')
          .eq('id', selectedStudentForReport)
          .single();
        if (studentErr) throw studentErr;

        const classId = student.turma_id || selectedTurma;
        let classObj: any = null;
        let courseObj: any = null;

        if (classId) {
          const { data: tData } = await supabase
            .from('turmas')
            .select('*')
            .eq('id', classId)
            .single();
          classObj = tData;

          if (tData?.curso_id) {
            const { data: cData } = await supabase
              .from('cursos')
              .select('*')
              .eq('id', tData.curso_id)
              .single();
            courseObj = cData;
          }
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
          const { data: tData } = await supabase
            .from('materias_modulos')
            .select('*')
            .in('disciplina_id', discIds)
            .is('deleted_at', null)
            .order('modulo_index', { ascending: true })
            .order('ordem', { ascending: true });
          topicsList = tData || [];
        }

        // Map disciplines and resolve modulo_index from topics (materias_modulos) if empty/falsy
        const resolvedDisciplines = (discList || []).map((disc: any) => {
          let resolvedModuloIndex = disc.modulo_index;
          if (resolvedModuloIndex === null || resolvedModuloIndex === undefined || resolvedModuloIndex === 0) {
            const discTopics = (topicsList || []).filter((t: any) => t.disciplina_id === disc.id);
            if (discTopics.length > 0) {
              const minMod = Math.min(...discTopics.map((t: any) => t.modulo_index).filter((m: any) => !isNaN(m)));
              if (minMod !== Infinity) {
                resolvedModuloIndex = minMod;
              }
            }
          }
          return {
            ...disc,
            modulo_index: resolvedModuloIndex || 1 // ultimate fallback is module 1
          };
        });

        let gradesData: any[] = [];
        try {
          const res = await fetchWithAuth(`/api/v1/notas?turmaId=${classId}&alunoId=${selectedStudentForReport}`);
          if (res.ok) {
            gradesData = await res.json();
          }
        } catch (e) {
          console.warn("API fetch fallback to direct supabase:", e);
        }

        if (!gradesData || gradesData.length === 0) {
          const { data: gradesDataRaw } = await supabase
            .from('notas')
            .select('*')
            .eq('aluno_id', selectedStudentForReport)
            .eq('turma_id', classId);
          gradesData = gradesDataRaw || [];
        }

        const { data: attendanceData } = await supabase
          .from('frequencia')
          .select('*')
          .eq('aluno_id', selectedStudentForReport)
          .eq('turma_id', classId)
          .order('data', { ascending: false });

        setReportData({
          student,
          classObj,
          courseObj,
          disciplines: resolvedDisciplines,
          grades: gradesData || [],
          attendance: attendanceData || [],
          topics: topicsList
        });
      } catch (err: any) {
        console.error("Error generating student report:", err);
        toast.error(language === 'pt' ? 'Erro ao carregar dados do histórico escolar para este aluno.' : 'Error loading transcript data for this student.');
        setSelectedStudentForReport(null);
      } finally {
        setLoadingReport(false);
      }
    };

    fetchReportData();
  }, [selectedStudentForReport, selectedTurma, language]);

  const handleSearch = async (overrideTurmaId?: string) => {
    const activeTurmaId = overrideTurmaId || selectedTurma;
    if (!activeTurmaId) {
      toast.warning(t.common.selectRequired);
      return;
    }

    setLoading(true);
    try {
      // Find course modules count
      const turma = turmas.find((t: any) => t.id === activeTurmaId);
      if (turma?.curso?.qtd_modulos) {
        setCourseModules(Math.min(turma.curso.qtd_modulos, 20));
      } else if (turma?.curso_id) {
        const curso = cursos.find((c: any) => c.id === turma.curso_id);
        if (curso) {
          setCourseModules(Math.min(curso.qtd_modulos || 4, 20));
        }
      }

      const courseId = turma?.curso_id;
      const turmaDisciplines = (disciplinas || []).filter((d: any) => d.curso_id === courseId && !d.deleted_at);
      const firstDiscId = turmaDisciplines[0]?.id;

      // 1. Fetch all students currently enrolled in this class and not deleted
      const { data: students, error: studentsError } = await supabase
        .from('alunos')
        .select('id, nome, matricula, foto_url, turma_id, status, posto_graduacao, nome_guerra')
        .eq('turma_id', activeTurmaId)
        .is('deleted_at', null)
        .order('nome');

      if (studentsError) throw studentsError;

      // 2. Fetch all grades registered for this class across all disciplines
      let grades: any[] = [];
      try {
        const queryParams = new URLSearchParams({ turmaId: activeTurmaId });
        if (selectedAno) queryParams.set('anoLetivo', selectedAno);
        const res = await fetchWithAuth(`/api/v1/notas?${queryParams.toString()}`);
        if (res.ok) {
          grades = await res.json();
        }
      } catch (e) {
        console.warn("API fetch fallback to direct supabase:", e);
      }

      if (!grades || grades.length === 0) {
        let gradesQuery = supabase
          .from('notas')
          .select('*')
          .eq('turma_id', activeTurmaId);

        if (selectedAno) {
          gradesQuery = gradesQuery.eq('ano_letivo', parseInt(selectedAno));
        }

        const { data: gradesRaw, error: gradesError } = await gradesQuery;
        if (gradesError) {
          console.warn("Direct grades query error:", gradesError);
        }
        grades = gradesRaw || [];
      }

      // Fetch all attendance records for this class to calculate frequency dynamically
      const { data: attendanceList, error: attendanceError } = await supabase
        .from('frequencia')
        .select('aluno_id, presente')
        .eq('turma_id', activeTurmaId);

      if (attendanceError) {
        console.error("Error fetching attendance list:", attendanceError);
      }

      // Fetch materials_modulos to resolve modulo_index
      let topicsList: any[] = [];
      if (turmaDisciplines.length > 0) {
        const discIds = turmaDisciplines.map((d: any) => d.id);
        const { data: tData } = await supabase
          .from('materias_modulos')
          .select('*')
          .in('disciplina_id', discIds)
          .is('deleted_at', null)
          .order('modulo_index', { ascending: true })
          .order('ordem', { ascending: true });
        topicsList = tData || [];
      }

      // Pre-calculate resolved disciplines with correct modulo_index
      const resolvedDisciplines = (turmaDisciplines || []).map((disc: any) => {
        let resolvedModuloIndex = disc.modulo_index;
        if (resolvedModuloIndex === null || resolvedModuloIndex === undefined || resolvedModuloIndex === 0) {
          const discTopics = (topicsList || []).filter((t: any) => t.disciplina_id === disc.id);
          if (discTopics.length > 0) {
            const minMod = Math.min(...discTopics.map((t: any) => t.modulo_index).filter((m: any) => !isNaN(m)));
            if (minMod !== Infinity) {
              resolvedModuloIndex = minMod;
            }
          }
        }
        return {
          ...disc,
          modulo_index: resolvedModuloIndex || 1 // ultimate fallback is module 1
        };
      });

      const localCourseModules = turma?.curso?.qtd_modulos 
        ? Math.min(turma.curso.qtd_modulos, 20) 
        : (turma?.curso_id ? Math.min(cursos.find((c: any) => c.id === turma.curso_id)?.qtd_modulos || 4, 20) : 4);

      // 3. Merged list: only include students who are actually enrolled in the class!
      // This synchronizes lists and tables, excluding non-enrolled students like "Abdul Lima Quaresma".
      const mergedData = (students || []).map((student: any) => {
        // Calculate dynamic frequency from the frequencia table
        const studentAtts = (attendanceList || []).filter((a: any) => a.aluno_id === student.id);
        const totalDays = studentAtts.length;
        const presentDays = studentAtts.filter((a: any) => a.presente).length;
        const computedFreq = totalDays > 0 ? (presentDays / totalDays) * 100 : null;

        const studentGrades = (grades || []).filter((g: any) => g.aluno_id === student.id);

        const localGetDisciplineGradeAndFreq = (disc: any, discIdx: number, studentGradesList: any[]) => {
          const moduleNum = disc.modulo_index || (discIdx + 1);
          const directGrade = studentGradesList.find((g: any) => g.disciplina_id === disc.id);

          let finalGradeValue: number | null = null;
          if (directGrade && directGrade.nota_final !== null && directGrade.nota_final !== undefined && directGrade.nota_final !== '') {
            finalGradeValue = Number(directGrade.nota_final);
          } else if (directGrade && directGrade[`nota${moduleNum}`] !== null && directGrade[`nota${moduleNum}`] !== undefined && directGrade[`nota${moduleNum}`] !== '') {
            finalGradeValue = Number(directGrade[`nota${moduleNum}`]);
          } else {
            const anyModularRow = studentGradesList.find((g: any) => {
              const val = g[`nota${moduleNum}`];
              return val !== null && val !== undefined && val !== '';
            });
            if (anyModularRow) {
              const val = anyModularRow[`nota${moduleNum}`];
              if (val !== null && val !== undefined && val !== '') {
                finalGradeValue = Number(val);
              }
            } else if (directGrade && directGrade.nota1 !== null && directGrade.nota1 !== undefined && directGrade.nota1 !== '') {
              finalGradeValue = Number(directGrade.nota1);
            }
          }

          let freqValue: number | null = null;
          if (directGrade && directGrade.frequencia !== null && directGrade.frequencia !== undefined && directGrade.frequencia !== '') {
            freqValue = Number(directGrade.frequencia);
          } else {
            const anyFreqRow = studentGradesList.find((g: any) => g.frequencia !== null && g.frequencia !== undefined && g.frequencia !== '');
            if (anyFreqRow) {
              freqValue = Number(anyFreqRow.frequencia);
            }
          }

          return { finalGradeValue, freqValue, moduleNum };
        };

        // Group resolved disciplines by module_index
        const moduleGroupsMap = new Map<number, any[]>();
        
        resolvedDisciplines.forEach((disc: any, discIdx: number) => {
          const moduleNum = disc.modulo_index || (discIdx + 1);
          if (!moduleGroupsMap.has(moduleNum)) {
            moduleGroupsMap.set(moduleNum, []);
          }
          moduleGroupsMap.get(moduleNum)!.push({ disc, discIdx });
        });

        const computedModuleGrades: { [key: string]: number | null } = {};
        const computedModuleFreqs: number[] = [];

        for (let i = 1; i <= localCourseModules; i++) {
          const groupItems = moduleGroupsMap.get(i) || [];
          if (groupItems.length > 0) {
            const evaluated = groupItems.map(({ disc, discIdx }) => {
              return localGetDisciplineGradeAndFreq(disc, discIdx, studentGrades);
            });

            const validGrades = evaluated
              .map(e => e.finalGradeValue)
              .filter((g): g is number => g !== null && g !== undefined && !isNaN(g));
            computedModuleGrades[`nota${i}`] = validGrades.length > 0 ? Math.max(...validGrades) : null;

            const validFreqs = evaluated
              .map(e => e.freqValue)
              .filter((f): f is number => f !== null && f !== undefined && !isNaN(f));
            if (validFreqs.length > 0) {
              computedModuleFreqs.push(Math.min(...validFreqs));
            }
          } else {
            // Fallback: search in studentGrades for any modular column matching nota{i}
            const anyModularRow = studentGrades.find((g: any) => {
              const val = g[`nota${i}`];
              return val !== null && val !== undefined && val !== '';
            });
            computedModuleGrades[`nota${i}`] = anyModularRow ? Number(anyModularRow[`nota${i}`]) : null;
          }
        }

        const validFinalGrades = Object.values(computedModuleGrades).filter((g): g is number => g !== null && g !== undefined && !isNaN(g));
        const computedFinal = validFinalGrades.length > 0
          ? validFinalGrades.reduce((sum, val) => sum + val, 0) / validFinalGrades.length
          : null;

        let bestFreq = computedModuleFreqs.length > 0
          ? computedModuleFreqs.reduce((sum, val) => sum + val, 0) / computedModuleFreqs.length
          : null;
        if (bestFreq === null || isNaN(bestFreq)) {
          bestFreq = computedFreq;
        }

        const baseGradeObj = studentGrades[0] || {};

        return {
          id: baseGradeObj.id || `temp-${student.id}`,
          aluno_id: student.id,
          turma_id: activeTurmaId,
          disciplina_id: baseGradeObj.disciplina_id || firstDiscId || '',
          ...computedModuleGrades,
          nota_final: computedFinal,
          frequencia: bestFreq,
          pago: baseGradeObj.pago !== undefined ? baseGradeObj.pago : true,
          ano_letivo: baseGradeObj.ano_letivo || parseInt(selectedAno) || new Date().getFullYear(),
          aluno: student
        };
      });

      // Sort mergedData by grade descending. Students without a grade (null/undefined) go to the end.
      const sortedMergedData = [...mergedData].sort((a, b) => {
        const getAverage = (row: any) => {
          if (row.nota_final !== null && row.nota_final !== undefined) {
            return Number(row.nota_final);
          }
          const scores: number[] = [];
          for (let i = 1; i <= courseModules; i++) {
            const val = row[`nota${i}`];
            if (val !== null && val !== undefined) {
              scores.push(Number(val));
            }
          }
          return scores.length > 0 ? scores.reduce((x, y) => x + y, 0) / scores.length : -1;
        };

        const avgA = getAverage(a);
        const avgB = getAverage(b);
        
        if (avgB !== avgA) {
          return avgB - avgA;
        }
        
        // If grades are identical, sort alphabetically by student name
        const nameA = a.aluno?.nome || '';
        const nameB = b.aluno?.nome || '';
        return nameA.localeCompare(nameB, 'pt-BR');
      });

      setBoletimData(sortedMergedData);
      
      const totalGrades = mergedData.reduce((acc: number, curr: any) => acc + (Number(curr.nota_final) || 0), 0);
      const avg = mergedData.length > 0 ? totalGrades / mergedData.length : 0;
      setClassStats({ avg, total: mergedData.length });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickGradeUpdate = async (row: any, moduleIndex: number | 'final', value: string) => {
    try {
      const numValue = value === '' ? null : Number(value);
      const fieldName = moduleIndex === 'final' ? 'nota_final' : `nota${moduleIndex}`;
      
      // Calculate updated row and new final average locally
      let computedFinal = row.nota_final;
      if (moduleIndex === 'final') {
        computedFinal = numValue;
      } else {
        const validScores: number[] = [];
        for (let m = 1; m <= courseModules; m++) {
          const val = m === moduleIndex ? numValue : (row as any)[`nota${m}`];
          if (val !== null && val !== undefined && val !== '' && !isNaN(Number(val))) {
            validScores.push(Number(val));
          }
        }
        if (validScores.length > 0) {
          const avg = validScores.reduce((a, b) => a + b, 0) / validScores.length;
          computedFinal = Math.round(avg * 10) / 10;
        } else {
          computedFinal = null;
        }
      }

      // Optimistic update
      setBoletimData(prev => {
        const nextData = prev.map(r => {
          if (r.aluno_id === row.aluno_id) {
            return {
              ...r,
              [fieldName]: numValue,
              nota_final: computedFinal
            };
          }
          return r;
        });

        // Recalculate class stats
        const finalGrades = nextData
          .map(r => r.nota_final)
          .filter(n => n !== null && n !== undefined && !isNaN(Number(n)))
          .map(Number);
        
        const avg = finalGrades.length > 0
          ? Number((finalGrades.reduce((a, b) => a + b, 0) / finalGrades.length).toFixed(1))
          : 0;

        setClassStats({
          avg,
          total: nextData.length
        });

        return nextData;
      });

      // Prepare payload for backend save
      const payload = {
        aluno_id: row.aluno_id,
        turma_id: row.turma_id,
        disciplina_id: row.disciplina_id || undefined,
        curso_id: selectedCurso || row.aluno?.curso_id || undefined,
        modulo_index: moduleIndex === 'final' ? undefined : moduleIndex,
        fieldName,
        fieldValue: numValue,
        nota_final: computedFinal,
        ano_letivo: row.ano_letivo,
      };

      const res = await fetchWithAuth('/api/v1/notas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Erro ao salvar nota no servidor.');
      }

      const result = await res.json();
      if (result?.data) {
        setBoletimData(prev => prev.map(r => {
          if (r.aluno_id === row.aluno_id) {
            return {
              ...r,
              id: result.data.id || r.id,
              disciplina_id: result.data.disciplina_id || r.disciplina_id,
              ...(result.data.nota_final !== undefined && result.data.nota_final !== null ? { nota_final: Number(result.data.nota_final) } : {})
            };
          }
          return r;
        }));
      }
      
      toast.success(language === 'pt' ? 'Nota salva com sucesso!' : 'Grade saved successfully!');
    } catch (err: any) {
      console.error('Error quick updating grade:', err);
      toast.error(language === 'pt' ? `Erro ao salvar a nota: ${err.message}` : `Error saving grade: ${err.message}`);
      if (selectedTurma) handleSearch(selectedTurma);
    }
  };

  const disciplinasLength = disciplinas?.length || 0;

  // Auto-search when turma or year changes
  useEffect(() => {
    if (selectedTurma) {
      handleSearch(selectedTurma);
    } else {
      setBoletimData([]);
      setClassStats({ avg: 0, total: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTurma, selectedAno, disciplinasLength]);

  const getStatus = (final: number | null, freq: number | null) => {
    const currentTurmaObj = turmas.find((t: any) => t.id === selectedTurma);
    const expirationDate = currentTurmaObj?.data_postergacao || currentTurmaObj?.data_fim;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const isExpired = expirationDate ? expirationDate < todayStr : false;

    if (isExpired && (final === null || final === undefined)) {
      return {
        label: language === 'pt' ? 'Não Concluiu' : 'Not Completed',
        className: 'bg-rose-100 text-rose-700 font-bold border border-rose-200',
        icon: XCircle
      };
    }

    if (final === null || freq === null) return { 
      label: t.grades.pending, 
      className: 'bg-slate-100 text-slate-600',
      icon: AlertCircle 
    };
    if (final >= settings.media_aprovacao && freq >= settings.frequencia_minima) return { 
      label: t.grades.approved, 
      className: 'bg-green-100 text-green-700',
      icon: CheckCircle2 
    };
    if (freq < settings.frequencia_minima) return { 
      label: t.grades.lowFrequency, 
      className: 'bg-orange-100 text-orange-700',
      icon: AlertCircle 
    };
    if (final >= settings.media_recuperacao) return {
      label: t.grades.retake,
      className: 'bg-yellow-100 text-yellow-700 font-bold',
      icon: AlertCircle
    };
    return { 
      label: t.grades.reproved, 
      className: 'bg-red-100 text-red-700',
      icon: XCircle 
    };
  };

  const getPendingItems = (row: any) => {
    const items: string[] = [];
    
    // Check modules
    for (let i = 0; i < courseModules; i++) {
      const notaValue = row[`nota${i + 1}`];
      if (notaValue === null || notaValue === undefined || notaValue === '') {
        items.push(language === 'pt' ? `Nota do Módulo ${i + 1}` : `Grade for Module ${i + 1}`);
      }
    }
    
    // Check final grade
    if (row.nota_final === null || row.nota_final === undefined) {
      items.push(language === 'pt' ? `Média Final de Disciplina` : `Final Course Average`);
    }
    
    // Check attendance
    if (row.frequencia === null || row.frequencia === undefined) {
      items.push(language === 'pt' ? `Aproveitamento de Frequência` : `Attendance Rate`);
    }
    
    return items;
  };

  const filteredTurmas = turmas.filter((t: any) => {
    const matchCurso = selectedCurso ? t.curso_id === selectedCurso : true;
    const matchAno = selectedAno ? t.ano === parseInt(selectedAno) : true;
    return matchCurso && matchAno;
  });
  const filteredDisciplinas = selectedCurso ? disciplinas.filter((d: any) => d.curso_id === selectedCurso) : disciplinas;

  const maxAvgInBoletim = boletimData.length > 0 
    ? Math.max(...boletimData.map((r: any) => Number(r.nota_final)).filter((n: any) => !isNaN(n)), -1) 
    : -1;

  if (isNifStudent) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.reportCard.title}</h1>
            <p className="text-slate-500 text-sm">
              {language === 'pt' ? 'Consulte as suas notas individuais e aproveitamento acadêmico' : 'Check your individual grades and academic performance.'}
            </p>
          </div>

        </div>

        {loadingReport || !reportData ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <Loader2 className="animate-spin text-blue-500" size={36} />
            <span className="text-xs font-bold tracking-widest uppercase">
              {language === 'pt' ? 'Carregando boletim do aluno...' : 'Loading student report...'}
            </span>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto w-full">
            <div 
              id="student-report-print-area" 
              data-document-sheet="true"
              className="official-document-sheet bg-white text-slate-900 border border-slate-200 shadow-xl p-8 rounded-lg flex flex-col gap-6 font-sans relative text-left text-xs overflow-y-auto scrollbar-thin"
              style={{ width: '100%', boxSizing: 'border-box', maxHeight: '297mm' }}
            >
               <style dangerouslySetInnerHTML={{ __html: `
                #student-report-print-area > * {
                  flex-shrink: 0 !important;
                }
                @media print {
                  /* Reset page context and force standard white/black print output */
                  html, body {
                    margin: 0 !important;
                    padding: 0 !important;
                    background: #ffffff !important;
                    color: #000000 !important;
                    width: 100% !important;
                    height: auto !important;
                    min-height: auto !important;
                    overflow: visible !important;
                  }

                  /* Hide headers, footers, mobile bottom-navs, back buttons, filters, etc. completely from DOM layout flow */
                  header, nav, aside, footer, button, .print\:hidden, [role="dialog"], [role="group"], .no-print {
                    display: none !important;
                    width: 0 !important;
                    height: 0 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    overflow: hidden !important;
                  }
                  
                  /* Collapse all container heights, min-heights, flex properties, padding, and margins on parent wrappers */
                  div, main, section, article {
                    position: static !important;
                    width: auto !important;
                    height: auto !important;
                    min-height: 0 !important;
                    max-height: none !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    box-shadow: none !important;
                    border: none !important;
                    transform: none !important;
                    overflow: visible !important;
                    background: transparent !important;
                    animation: none !important;
                    transition: none !important;
                    opacity: 1 !important;
                  }

                  body * {
                    visibility: hidden !important;
                  }

                  #student-report-print-area, #student-report-print-area * {
                    visibility: visible !important;
                  }

                  /* Collapse all elements except the printable area and its descendants */
                  *:not(#student-report-print-area):not(#student-report-print-area *) {
                    height: 0 !important;
                    min-height: 0 !important;
                    max-height: 0 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    border: none !important;
                    box-shadow: none !important;
                    overflow: visible !important;
                  }

                  #student-report-print-area {
                    visibility: visible !important;
                    position: relative !important;
                    width: 190mm !important; /* Exact A4 content width (210mm - 20mm margins) */
                    min-width: 190mm !important;
                    min-height: 277mm !important;
                    height: auto !important;
                    max-height: none !important;
                    padding: 0 !important; /* Rely purely on page margin */
                    margin: 0 auto !important;
                    border: none !important;
                    box-shadow: none !important;
                    page-break-inside: avoid !important;
                    background: #ffffff !important;
                    color: #000000 !important;
                    font-family: Arial, sans-serif !important;
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: flex-start !important;
                    gap: 6px !important; /* Elegant compact spacing */
                  }

                  /* Overwrite global generic flex/grid flattener for our specialized print contents */
                  #student-report-print-area .flex {
                    display: flex !important;
                  }
                  #student-report-print-area .flex-row {
                    flex-direction: row !important;
                  }
                  #student-report-print-area .flex-col {
                    flex-direction: column !important;
                  }
                  #student-report-print-area .items-center {
                    align-items: center !important;
                  }
                  #student-report-print-area .justify-between {
                    justify-content: space-between !important;
                  }
                  #student-report-print-area .justify-center {
                    justify-content: center !important;
                  }
                  #student-report-print-area .grid {
                    display: grid !important;
                  }
                  #student-report-print-area .grid-cols-2 {
                    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                  }
                  #student-report-print-area .grid-cols-3 {
                    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
                  }
                  #student-report-print-area .gap-4 {
                    gap: 12px !important;
                  }
                  #student-report-print-area .gap-10 {
                    gap: 24px !important;
                  }

                  /* Compact formatting for A4 vertical containment */
                  #student-report-print-area .p-5 {
                    padding: 3mm !important;
                  }
                  #student-report-print-area .p-4 {
                    padding: 3mm !important;
                  }
                  #student-report-print-area .pb-4 {
                    padding-bottom: 4px !important;
                  }
                  #student-report-print-area .pt-6 {
                    padding-top: 4mm !important;
                    margin-top: 1mm !important;
                  }
                  #student-report-print-area h1 {
                    font-size: 15px !important;
                    line-height: 1.15 !important;
                  }
                  #student-report-print-area h3 {
                    font-size: 10px !important;
                    margin-bottom: 4px !important;
                  }
                  #student-report-print-area .grid-cols-4 {
                    gap: 6px !important;
                  }
                  #student-report-print-area .p-3\.5 {
                    padding: 6px 10px !important;
                    border-radius: 6px !important;
                  }
                  #student-report-print-area .p-2 {
                    padding: 4px !important;
                  }
                  #student-report-print-area .mt-2 {
                    margin-top: 4px !important;
                  }
                  #student-report-print-area .mt-2\.5 {
                    margin-top: 4px !important;
                  }
                  #student-report-print-area .pt-1\.5 {
                    padding-top: 4px !important;
                  }
                  #student-report-print-area .w-20.h-20,
                  #student-report-print-area .w-24.h-24,
                  #class-bulletin-print-area .w-20.h-20,
                  #class-bulletin-print-area .w-24.h-24 {
                    width: 60px !important;
                    height: 60px !important;
                  }
                  #student-report-print-area img,
                  #class-bulletin-print-area img {
                    object-fit: contain !important;
                    max-width: 100% !important;
                    max-height: 100% !important;
                    width: auto !important;
                    height: auto !important;
                  }
                  
                  /* Preserve side-by-side columns on print pages */
                  #student-report-print-area .grid-cols-1.md\:grid-cols-2 {
                    display: grid !important;
                    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                    gap: 12px !important;
                    width: 100% !important;
                  }

                  table.report-table th, 
                  #student-report-print-area table th, 
                  #student-report-print-area .report-table th, 
                  #student-report-print-area th {
                    padding: 4px 8px !important;
                    font-size: 8px !important;
                  }
                  table.report-table td, 
                  #student-report-print-area table td, 
                  #student-report-print-area .report-table td, 
                  #student-report-print-area td {
                    padding: 3px 8px !important;
                    font-size: 9px !important;
                  }

                  .print-only-layout {
                    visibility: visible !important;
                  }
                  
                  .print-bg-gray {
                    background-color: #f1f5f9 !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  
                  .print-border-black {
                    border-color: #000000 !important;
                  }
                }
                
                @page {
                  size: A4 portrait;
                  margin: 10mm 10mm 10mm 10mm;
                }
              `}} />

              {/* Clean Header: Histórico Escolar and participating class(es) only */}
              <div className="flex flex-col items-center justify-center pb-6 border-b-2 border-slate-900 text-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                  {language === 'pt' ? 'Histórico Escolar' : 'Academic Transcript'}
                </h1>
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                  {language === 'pt' 
                    ? `Turma(s) ao qual participou: ${reportData.classObj?.nome || 'Não informada'}` 
                    : `Participated Class(es): ${reportData.classObj?.nome || 'Unassigned'}`}
                  {(reportData.classObj?.documento_criacao || reportData.classObj?.curso?.documento_criacao) && (
                    <span className="ml-2 font-mono text-slate-700">
                      • Doc: {reportData.classObj?.documento_criacao || reportData.classObj?.curso?.documento_criacao}
                    </span>
                  )}
                </p>
              </div>

              {/* Personal Info Grid */}
              <div className="border border-slate-200 rounded-lg p-5 bg-slate-50/50 print-bg-gray text-left">
                <h3 className="text-[11px] font-black text-slate-600 tracking-[0.15em] uppercase mb-4 pb-1 border-b border-slate-200">
                  {reportT[language as "pt" | "en"].studentInfo}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 text-sm">
                  <div className="flex flex-col gap-0.5 col-span-2 md:col-span-1">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{reportT[language as "pt" | "en"].fullName}</span>
                    <span className="font-extrabold text-slate-900 uppercase text-xs lg:text-sm">{reportData.student.nome}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{reportT[language as "pt" | "en"].rank}</span>
                    <span className="font-bold text-slate-800 uppercase">{reportData.student.posto_graduacao || (language === 'pt' ? 'Não declarado' : 'Not declared')}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{language === 'pt' ? 'Nome de Guerra' : 'War Name'}</span>
                    <span className="font-bold text-slate-800 uppercase">{reportData.student.nome_guerra || (language === 'pt' ? 'Não declarado' : 'Not declared')}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Matrícula</span>
                    <span className="font-bold font-mono text-slate-800">#{reportData.student.matricula}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{reportT[language as "pt" | "en"].course}</span>
                    <span className="font-bold text-slate-800">{reportData.courseObj?.nome || (language === 'pt' ? 'Não disponível' : 'Not available')}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{reportT[language as "pt" | "en"].class}</span>
                    <span className="font-bold text-slate-800">{reportData.classObj?.nome || (language === 'pt' ? 'Não disponível' : 'Not available')}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{reportT[language as "pt" | "en"].period}</span>
                    <span className="font-bold text-slate-800 capitalize">
                      {reportData.classObj?.periodo === 'manhã' ? t.common.morning :
                       reportData.classObj?.periodo === 'tarde' ? t.common.afternoon :
                       reportData.classObj?.periodo === 'noite' ? t.common.night : reportData.classObj?.periodo}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 col-span-2">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{reportT[language as "pt" | "en"].status}</span>
                    <span className="font-bold flex items-center gap-1.5 text-slate-800">
                      <span className={cn("w-2 h-2 rounded-full", reportData.classObj?.status === 'concluida' || reportData.classObj?.status === 'finalizada' ? 'bg-emerald-500' : 'bg-blue-500')} />
                      {reportData.classObj?.status === 'concluida' || reportData.classObj?.status === 'finalizada' 
                        ? reportT[language as "pt" | "en"].completed 
                        : reportT[language as "pt" | "en"].inProgress}
                    </span>
                  </div>
                </div>
              </div>

              {/* Academic Performance Map */}
              <div className="space-y-3 font-sans">
                <h3 className="text-[11px] font-black text-slate-600 tracking-[0.15em] uppercase pb-1 border-b border-slate-200 text-left">
                  {reportT[language as "pt" | "en"].academicMap}
                </h3>
                <div className="overflow-x-auto">
                  {(() => {
                    if (!reportData) return null;

                    const sortedDisciplines = [...(reportData.disciplines || [])].sort((a: any, b: any) => {
                        const mDiff = (a.modulo_index || 1) - (b.modulo_index || 1);
                        if (mDiff !== 0) return mDiff;
                        return a.nome.localeCompare(b.nome);
                      });

                      const firstGrade = getReportFirstGrade(reportData);

                      const moduleGroupsMap = new Map<number, any[]>();
                      sortedDisciplines.forEach((disc: any, discIdx: number) => {
                        const moduleNum = disc.modulo_index || (discIdx + 1);
                        if (!moduleGroupsMap.has(moduleNum)) {
                          moduleGroupsMap.set(moduleNum, []);
                        }
                        moduleGroupsMap.get(moduleNum)!.push({ disc, discIdx });
                      });

                      const expirationDate = reportData.classObj?.data_postergacao || reportData.classObj?.data_fim;
                      const todayStr = format(new Date(), 'yyyy-MM-dd');
                      const isClassExpired = expirationDate ? expirationDate < todayStr : false;

                      const reportRows = Array.from(moduleGroupsMap.entries()).map(([moduleNum, groupItems]) => {
                        const evaluated = groupItems.map(({ disc, discIdx }) => {
                          return getDisciplineGradeAndFreq(disc, discIdx, reportData, firstGrade);
                        });

                        const validGrades = evaluated
                          .map(e => e.finalGradeValue)
                          .filter((g): g is number => g !== null && g !== undefined && !isNaN(g));
                        const finalGradeValue = validGrades.length > 0 ? Math.max(...validGrades) : null;
                        const finalGradeFormatted = finalGradeValue !== null ? finalGradeValue.toFixed(1) : '-';

                        const validFreqs = evaluated
                          .map(e => e.freqValue)
                          .filter((f): f is number => f !== null && f !== undefined && !isNaN(f));
                        const freqValue = validFreqs.length > 0 ? Math.min(...validFreqs) : null;

                        let statusLabel = '';
                        let statusClass = 'text-slate-400';
                        if (finalGradeValue === null) {
                          if (isClassExpired) {
                            statusLabel = language === 'pt' ? 'NÃO CONCLUIU' : 'NOT COMPLETED';
                            statusClass = 'text-rose-600 font-extrabold';
                          } else {
                            statusLabel = reportT[language as "pt" | "en"].pending;
                          }
                        } else if (finalGradeValue >= settings.media_aprovacao && (freqValue === null || freqValue >= settings.frequencia_minima)) {
                          statusLabel = reportT[language as "pt" | "en"].approved;
                          statusClass = 'text-emerald-600 font-extrabold';
                        } else if (freqValue !== null && freqValue < settings.frequencia_minima) {
                          statusLabel = language === 'pt' ? 'FALTA FREQ.' : 'LOW FREQ.';
                          statusClass = 'text-orange-600 font-extrabold';
                        } else if (finalGradeValue >= settings.media_recuperacao) {
                          statusLabel = reportT[language as "pt" | "en"].retake;
                          statusClass = 'text-yellow-600 font-extrabold';
                        } else {
                          statusLabel = reportT[language as "pt" | "en"].reproved;
                          statusClass = 'text-rose-600 font-extrabold';
                        }

                        return {
                          moduleNum,
                          modulo: `Módulo ${moduleNum}`,
                          disciplines: groupItems.map(item => item.disc),
                          nota: finalGradeFormatted,
                          situacao: statusLabel,
                          statusClass,
                        };
                      });

                      return (
                        <table className="w-full text-left report-table border border-slate-200 bg-white table-auto">
                          <thead>
                            <tr className="bg-slate-100 print-bg-gray text-[10px] font-extrabold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                              <th className="px-4 py-3 border-r border-slate-200 w-[15%]">{language === 'pt' ? 'Módulo' : 'Module'}</th>
                              <th className="px-4 py-3 border-r border-slate-200 w-[45%]">{language === 'pt' ? 'Disciplina' : 'Discipline'}</th>
                              <th className="px-3 py-3 text-center border-r border-slate-200 w-[10%]">{language === 'pt' ? 'C.H.' : 'Hours'}</th>
                              <th className="px-3 py-3 text-center border-r border-slate-200 font-mono w-[15%]">{reportT[language as "pt" | "en"].finalGrade}</th>
                              <th className="px-4 py-3 text-right w-[15%]">{reportT[language as "pt" | "en"].situation}</th>
                            </tr>
                          </thead>
                          <tbody className="text-xs text-left">
                            {reportRows.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="text-center py-6 text-slate-400 font-bold bg-white">
                                  {language === 'pt' ? 'Nenhuma disciplina cadastrada.' : 'No disciplines registered.'}
                                </td>
                              </tr>
                            ) : (
                              reportRows.map((row: any, rIdx: number) => {
                                return (
                                  <tr key={`row-mod-${row.moduleNum}-${rIdx}`} className="border-b border-slate-200 hover:bg-slate-50/50 transition-colors bg-white">
                                    <td className="px-4 py-3 font-extrabold text-slate-900 border-r border-slate-200 text-left bg-white align-middle whitespace-nowrap">
                                      {row.modulo}
                                    </td>
                                    <td className="p-0 border-r border-slate-200 bg-white align-top">
                                      <div className="flex flex-col w-full h-full">
                                        {row.disciplines.map((disc: any, dIdx: number) => (
                                          <div key={`disc-name-${disc.id || dIdx}`} className={cn(
                                            "flex items-center gap-2 px-4 py-3 text-xs leading-tight break-words font-extrabold text-slate-800 flex-1",
                                            dIdx > 0 && "border-t border-slate-100/80"
                                          )}>
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                                            <span>{disc.nome}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </td>
                                    <td className="p-0 border-r border-slate-200 bg-white align-top">
                                      <div className="flex flex-col w-full h-full">
                                        {row.disciplines.map((disc: any, dIdx: number) => (
                                          <div key={`disc-ch-${disc.id || dIdx}`} className={cn(
                                            "flex items-center justify-center px-3 py-3 font-mono text-xs text-slate-500 flex-1",
                                            dIdx > 0 && "border-t border-slate-100/80"
                                          )}>
                                            {disc.carga_horaria ? `${disc.carga_horaria}h` : '-'}
                                          </div>
                                        ))}
                                      </div>
                                    </td>
                                    <td className="px-3 py-3 text-center font-black font-mono text-sm border-r border-slate-200 text-slate-900 bg-white align-middle animate-fade-in">
                                      {row.nota}
                                    </td>
                                    <td className={cn("px-4 py-3 text-right font-black bg-white align-middle break-words whitespace-normal leading-tight", row.statusClass)}>
                                      {row.situacao}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                    );
                  })()}
                </div>
              </div>

              {/* Attendance and KPI Cards Container */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Attendance Summary */}
                <div className="border border-slate-200 rounded-lg p-4 flex flex-col gap-3 text-left">
                  <h3 className="text-[11px] font-black text-slate-600 tracking-[0.1em] uppercase border-b border-slate-200 pb-1">
                    {reportT[language as "pt" | "en"].attendanceReg}
                  </h3>
                  
                  {(() => {
                    const totalAulas = reportData.attendance?.length || 0;
                    const presencas = reportData.attendance?.filter((a: any) => a.presente).length || 0;
                    const faltas = reportData.attendance?.filter((a: any) => !a.presente).length || 0;
                    
                    let percentualPresenca = 100;
                    if (totalAulas > 0) {
                      percentualPresenca = (presencas / totalAulas) * 100;
                    } else if (reportData.grades && reportData.grades.length > 0) {
                      const sortedDisciplines = [...(reportData.disciplines || [])].sort((a: any, b: any) => {
                        const mDiff = (a.modulo_index || 1) - (b.modulo_index || 1);
                        if (mDiff !== 0) return mDiff;
                        return a.nome.localeCompare(b.nome);
                      });
                      const firstGrade = getReportFirstGrade(reportData);

                      const computedDisciplines = sortedDisciplines.map((disc: any, discIdx: number) => {
                        const { finalGradeValue, freqValue } = getDisciplineGradeAndFreq(disc, discIdx, reportData, firstGrade);
                        return { finalGradeValue, freqValue };
                      });

                      const validFreqs = computedDisciplines.filter((cd: any) => cd.freqValue !== null && cd.freqValue !== undefined);
                      if (validFreqs.length > 0) {
                        percentualPresenca = validFreqs.reduce((sum: number, cd: any) => sum + cd.freqValue, 0) / validFreqs.length;
                      }
                    }

                    return (
                      <div className="flex flex-col gap-2.5 text-left">
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="p-2 bg-slate-50 print-bg-gray rounded border border-slate-100 flex flex-col gap-0.5">
                            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">{reportT[language as "pt" | "en"].totalLectures}</span>
                            <span className="text-sm font-black text-slate-800">{totalAulas || '-'}</span>
                          </div>
                          <div className="p-2 bg-slate-50 print-bg-gray rounded border border-slate-100 flex flex-col gap-0.5">
                            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">{reportT[language as "pt" | "en"].attendances}</span>
                            <span className="text-sm font-black text-emerald-600">{totalAulas ? presencas : '-'}</span>
                          </div>
                          <div className="p-2 bg-slate-50 print-bg-gray rounded border border-slate-100 flex flex-col gap-0.5">
                            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">{reportT[language as "pt" | "en"].absences}</span>
                            <span className="text-sm font-black text-rose-600">{totalAulas ? faltas : '-'}</span>
                          </div>
                        </div>

                        {/* Attendance percentage indicator */}
                        <div className="flex items-center justify-between text-xs p-1.5 mt-1 border-t border-slate-100">
                          <span className="font-extrabold text-slate-500 uppercase text-[9px] tracking-wide">{reportT[language as "pt" | "en"].attendanceRate}:</span>
                          <span className={cn(
                            "font-black text-sm",
                            percentualPresenca >= settings.frequencia_minima ? "text-emerald-600" : "text-rose-600"
                          )}>
                            {percentualPresenca.toFixed(1)}%
                          </span>
                        </div>

                        {/* Tiny timeline of latest attendance dates */}
                        {reportData.attendance && reportData.attendance.length > 0 && (
                          <div className="flex flex-col gap-1.5 mt-1 pt-1.5 border-t border-dashed border-slate-200">
                            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                              {language === 'pt' ? 'Histórico de Presenças (Últimas 10):' : 'Attendance Record (Last 10):'}
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {reportData.attendance.slice(0, 10).map((att: any, ind: number) => (
                                <span 
                                  key={`att-${att.id || ''}-${ind}`} 
                                  className={cn(
                                    "text-[9px] px-1.5 py-0.5 rounded font-bold uppercase",
                                    att.presente 
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                                      : "bg-rose-50 text-rose-700 border border-rose-100"
                                  )}
                                  title={format(new Date(att.data), 'dd/MM/yyyy')}
                                >
                                  {format(new Date(att.data), 'dd/MM')} {att.presente ? '✓' : '✗'}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Performance & Summary */}
                <div className="border border-slate-200 rounded-lg p-4 flex flex-col justify-between text-left">
                  <div className="flex flex-col gap-3">
                    <h3 className="text-[11px] font-black text-slate-600 tracking-[0.1em] uppercase border-b border-slate-200 pb-1">
                      {language === 'pt' ? 'DESEMPENHO GLOBAL' : 'GLOBAL PERFORMANCE'}
                    </h3>
                    
                    {(() => {
                      // Dynamically compute grades for each discipline using the fallback modular calculation
                      const sortedDisciplines = [...(reportData.disciplines || [])].sort((a: any, b: any) => {
                        const mDiff = (a.modulo_index || 1) - (b.modulo_index || 1);
                        if (mDiff !== 0) return mDiff;
                        return a.nome.localeCompare(b.nome);
                      });
                      const firstGrade = getReportFirstGrade(reportData);

                      const computedDisciplines = sortedDisciplines.map((disc: any, discIdx: number) => {
                        const { finalGradeValue, freqValue } = getDisciplineGradeAndFreq(disc, discIdx, reportData, firstGrade);
                        return { finalGradeValue, freqValue };
                      });

                      const validFinalGrades = computedDisciplines.filter((cd: any) => cd.finalGradeValue !== null && cd.finalGradeValue !== undefined);
                      const averageGrade = validFinalGrades.length > 0
                        ? validFinalGrades.reduce((sum, cd) => sum + (cd.finalGradeValue || 0), 0) / validFinalGrades.length
                        : null;

                      const expirationDate = reportData.classObj?.data_postergacao || reportData.classObj?.data_fim;
                      const todayStr = format(new Date(), 'yyyy-MM-dd');
                      const isClassExpired = expirationDate ? expirationDate < todayStr : false;

                      // Compute overall status
                      let overallLabel = language === 'pt' ? 'EM FILTRAGEM / AVALIAÇÃO' : 'UNDER REVIEW';
                      let overallClass = 'bg-slate-100 text-slate-700';

                      if (averageGrade === null && isClassExpired) {
                        overallLabel = language === 'pt' ? 'NÃO CONCLUIU O CURSO' : 'COURSE NOT COMPLETED';
                        overallClass = 'bg-rose-100 text-rose-700 font-extrabold border border-rose-200';
                      } else if (averageGrade !== null) {
                        const hasReprovedDiscipline = computedDisciplines.some((cd) => cd.finalGradeValue !== null && cd.finalGradeValue < settings.media_aprovacao);
                        const totalAulas = reportData.attendance?.length || 0;
                        let percentualPresenca = 100;
                        if (totalAulas > 0) {
                          const presencas = reportData.attendance.filter((a: any) => a.presente).length;
                          percentualPresenca = (presencas / totalAulas) * 100;
                        } else if (reportData.grades && reportData.grades.length > 0) {
                          const validFreqs = computedDisciplines.filter((cd: any) => cd.freqValue !== null && cd.freqValue !== undefined);
                          if (validFreqs.length > 0) {
                            percentualPresenca = validFreqs.reduce((sum: number, cd: any) => sum + cd.freqValue, 0) / validFreqs.length;
                          }
                        }

                        if (percentualPresenca < settings.frequencia_minima) {
                          overallLabel = language === 'pt' ? 'REPROVADO POR FREQUÊNCIA' : 'FAILED BY ATTENDANCE';
                          overallClass = 'bg-rose-100 text-rose-700 border border-rose-300';
                        } else if (hasReprovedDiscipline) {
                          overallLabel = language === 'pt' ? 'REPROVADO POR NOTA' : 'FAILED BY ACADEMICS';
                          overallClass = 'bg-red-100 text-red-700 border border-red-300';
                        } else if (averageGrade >= settings.media_aprovacao) {
                          overallLabel = reportT[language as "pt" | "en"].approved;
                          overallClass = 'bg-emerald-100 text-emerald-700 border border-emerald-300 font-extrabold';
                        } else if (averageGrade >= settings.media_recuperacao) {
                          overallLabel = reportT[language as "pt" | "en"].retake;
                          overallClass = 'bg-yellow-100 text-yellow-700 border border-yellow-300';
                        } else {
                          overallLabel = reportT[language as "pt" | "en"].reproved;
                          overallClass = 'bg-rose-100 text-rose-700 border border-rose-300';
                        }
                      }

                      return (
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-center text-xs p-1">
                            <span className="font-extrabold text-slate-500 uppercase text-[9px] tracking-wide">{reportT[language as "pt" | "en"].overallAverage}:</span>
                            <span className={cn(
                              "inline-flex items-center justify-center text-center min-w-[64px] font-black font-mono text-base px-2.5 py-1 rounded-md border leading-none shadow-2xs",
                              averageGrade !== null && averageGrade >= settings.media_aprovacao ? "text-blue-700 bg-blue-50 border-blue-600" : "text-rose-700 bg-rose-50 border-rose-600"
                            )}>
                              {averageGrade !== null ? averageGrade.toFixed(2) : '-'}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-xs p-1 border-t border-slate-100">
                            <span className="font-extrabold text-slate-500 uppercase text-[9px] tracking-wide">{reportT[language as "pt" | "en"].overallStatus}:</span>
                            <span className={cn(
                              "inline-flex items-center justify-center text-center min-w-[90px] text-[10px] font-black uppercase px-2.5 py-1 rounded-md border leading-none shadow-2xs",
                              overallClass
                            )}>
                              {overallLabel}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="text-[10px] text-slate-400 bg-slate-50 print-bg-gray rounded-lg p-2.5 border border-slate-100 flex items-start gap-2 mt-4">
                    <Award className="text-slate-400 shrink-0 mt-0.5" size={14} />
                    <p className="leading-normal">
                      {language === 'pt' 
                        ? `Média de aprovação configurada em ${settings.media_aprovacao.toFixed(1)} e frequência mínima em ${settings.frequencia_minima}%.`
                        : `Program passing grade configured at ${settings.media_aprovacao.toFixed(1)} and minimum attendance at ${settings.frequencia_minima}%.`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Observations section */}
              <div className="border border-slate-200 rounded-lg p-4 flex flex-col gap-2 text-left text-xs text-slate-600 italic">
                <h3 className="text-[11px] font-black text-slate-400 tracking-[0.1em] uppercase border-b border-slate-200 pb-1 font-sans">
                  {reportT[language as "pt" | "en"].observations}
                </h3>
                <p className="leading-relaxed text-justify whitespace-pre-line">
                  {reportData?.student?.observacoes?.trim() 
                    ? reportData.student.observacoes 
                    : reportT[language as "pt" | "en"].defaultObs}
                </p>
              </div>

              {/* Stamp & Verification Text */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400 font-medium uppercase tracking-wider">
                <span>{reportT[language as "pt" | "en"].footerText}</span>
                <span>
                  {language === 'pt' ? 'Data de Emissão: ' : 'Date of Issue: '}
                  {new Date().toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.reportCard.title}</h1>
          <p className="text-slate-500 text-sm">
            {t.reportCard.subtitle}
            {selectedTurma && turmas.find((t: any) => t.id === selectedTurma)?.data_inicio && (
              <span className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase tracking-widest border border-blue-100">
                {format(new Date(turmas.find((t: any) => t.id === selectedTurma).data_inicio), 'dd/MM/yyyy')} 
                {turmas.find((t: any) => t.id === selectedTurma).data_fim ? ` - ${format(new Date(turmas.find((t: any) => t.id === selectedTurma).data_fim), 'dd/MM/yyyy')}` : ''}
              </span>
            )}
          </p>
        </div>

      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">
              {t.nav.courses}
            </label>
            <select
              value={selectedCurso}
              onChange={(e) => {
                setSelectedCurso(e.target.value);
                setSelectedTurma('');
              }}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm appearance-none"
            >
              <option value="">{t.common.all} {t.nav.courses}</option>
              {cursos.map((curso: any) => (
                <option key={curso.id} value={curso.id}>
                  {curso.nome} {curso.codigo ? `(${curso.codigo})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">
              {t.nav.year}
            </label>
            <select
              value={selectedAno}
              onChange={(e) => setSelectedAno(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm appearance-none"
            >
              <option value="">{t.common.all}</option>
              {anos.map((ano: any) => (
                <option key={ano} value={ano}>{ano}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">
              {t.nav.classes}
            </label>
            <select
              value={selectedTurma}
              onChange={(e) => setSelectedTurma(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm appearance-none"
            >
              <option value="">{t.grades.selectClass}</option>
              {filteredTurmas.map((turma: any) => (
                <option key={turma.id} value={turma.id}>{turma.nome}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => handleSearch()}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100 disabled:opacity-70 h-[38px]"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            {t.common.search}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full print:hidden">
        {/* Grades Table */}
        <div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
             <div className="p-4 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
               <span className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2">{t.common.finalResult}</span>
               <div className="flex gap-2 print:hidden items-center">
                 {boletimData.length > 0 && (
                   <button
                     onClick={() => setViewingClassBulletinPDF(true)}
                        className="flex items-center gap-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-[10.5px] font-black uppercase tracking-wider transition-all border border-blue-200 cursor-pointer"
                        title={language === 'pt' ? 'Gerar PDF do Boletim da Turma' : 'Generate Class Bulletin PDF'}
                      >
                        <FileText size={13} className="text-blue-600" />
                        <span>{language === 'pt' ? 'Boletim da Turma' : 'Class Report'}</span>
                      </button>
                    )}
                 </div>
             </div>

             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="text-[10px] font-bold text-slate-400 border-b border-slate-100 uppercase tracking-wider">
                      <th className="px-4 lg:px-6 py-4 text-left w-12">#</th>
                      <th className="px-4 lg:px-6 py-4">{t.reportCard.student}</th>
                      {Array.from({ length: courseModules }).map((_, i) => (
                        <th key={i} className="px-2 py-4 text-center min-w-[80px]">MOD {i + 1}</th>
                      ))}
                      <th className="px-3 py-4 text-center min-w-[95px]">{t.reportCard.average}</th>
                      <th className="px-4 py-4 text-center">{language === 'pt' ? 'Situação' : 'Status'}</th>

                      <th className="px-4 py-4 text-right print:hidden">{language === 'pt' ? 'Ações' : 'Actions'}</th>
                   </tr>
                 </thead>
                 <tbody>
                   {boletimData.length === 0 ? (
                     <tr>
                        <td colSpan={5 + courseModules} className="py-20 text-center">
                           <div className="flex flex-col items-center text-slate-300">
                              <FileText size={48} className="mb-4 opacity-20" />
                              <p className="text-sm font-medium">{t.reportCard.noData}</p>
                           </div>
                        </td>
                     </tr>
                   ) : (
                     boletimData.map((row: any, idx: number) => {
                       const status = getStatus(row.nota_final, row.frequencia);
                       const StatusIcon = status.icon;
                       return (
                         <tr key={`boletim-row-${row.id || ''}-${idx}`} className={cn("border-b border-slate-50 hover:bg-slate-50/40 transition-colors group", row.nota_final !== null && row.nota_final !== undefined && Number(row.nota_final) === maxAvgInBoletim && maxAvgInBoletim > 0 && "bg-blue-50/50")}>
                            <td className="px-4 lg:px-6 py-4 font-mono text-xs font-bold text-slate-400 text-left">
                              {idx + 1}
                            </td>
                           <td className="px-4 lg:px-6 py-4">
                             <div className="flex items-center gap-2">
                               <div className="font-bold text-slate-800 text-xs lg:text-sm">{row.aluno?.nome}</div>
                               {row.nota_final !== null && row.nota_final !== undefined && Number(row.nota_final) === maxAvgInBoletim && maxAvgInBoletim > 0 && (
                                 <span className="flex items-center gap-1 bg-amber-100 text-amber-700 text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-amber-200">
                                   ⭐ {language === 'pt' ? 'Melhor Média' : 'Top Average'}
                                 </span>
                               )}
                             </div>
                             <div className="text-[10px] font-mono text-slate-400 tracking-tight">#{row.aluno?.matricula}</div>
                             {false && (
                               <div className="text-[9px] font-black text-red-500 uppercase tracking-widest mt-1">{language === 'pt' ? 'Pendente de Pgto.' : 'Payment Pending'}</div>
                             )}
                           </td>
                           {Array.from({ length: courseModules }).map((_, i) => {
                             const notaValue = (row as any)[`nota${i + 1}`];
                             return (
                               <td key={i} className="px-2 py-3 text-center">
                                 <input
                                   type="number"
                                   min="0"
                                    max={settings?.nota_maxima || 20}
                                   step="0.1"
                                   value={notaValue !== null && notaValue !== undefined ? Number(notaValue) : ''}
                                   onChange={(e) => {
                                     // Just optimistic local state update for typing
                                     const val = e.target.value;
                                     setBoletimData(prev => prev.map(r => 
                                       r.id === row.id ? { ...r, [`nota${i + 1}`]: val === '' ? null : Number(val) } : r
                                     ));
                                   }}
                                   onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                                    onBlur={(e) => handleQuickGradeUpdate(row, i + 1, e.target.value)}
                                   className={cn(
                                     "w-16 md:w-20 mx-auto px-2 py-1.5 text-center font-mono font-bold text-sm rounded-lg border transition-all shadow-2xs outline-none focus:ring-2 focus:bg-white no-spin grade-input",
                                     notaValue !== null && notaValue !== undefined && Number(notaValue) !== 0
                                       ? (Number(notaValue) >= settings.media_aprovacao
                                           ? "text-blue-700 bg-blue-50/70 border-blue-200 hover:border-blue-400 focus:border-blue-600 focus:ring-blue-500/20"
                                           : Number(notaValue) >= settings.media_recuperacao
                                           ? "text-amber-700 bg-amber-50/70 border-amber-200 hover:border-amber-400 focus:border-amber-600 focus:ring-amber-500/20"
                                           : "text-red-600 bg-red-50/70 border-red-200 hover:border-red-400 focus:border-red-600 focus:ring-red-500/20")
                                       : "text-slate-700 bg-slate-50/80 border-slate-200 hover:border-slate-300 hover:bg-white focus:border-blue-500 focus:ring-blue-500/20"
                                   )}
                                   placeholder="-"
                                   title={language === 'pt' ? 'Clique para alterar a nota' : 'Click to change grade'}
                                 />
                               </td>
                             );
                           })}
                           <td className="px-2 py-3 text-center">
                             <input
                               type="number"
                               min="0"
                                    max={settings?.nota_maxima || 20}
                               step="0.1"
                               value={row.nota_final !== null && row.nota_final !== undefined ? Number(row.nota_final) : ''}
                               onChange={(e) => {
                                 const val = e.target.value;
                                 setBoletimData(prev => prev.map(r => 
                                   r.id === row.id ? { ...r, nota_final: val === '' ? null : Number(val) } : r
                                 ));
                               }}
                               onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                                onBlur={(e) => handleQuickGradeUpdate(row, "final", e.target.value)}
                               className={cn(
                                 "w-20 md:w-24 mx-auto px-2 py-1.5 text-center font-mono font-black text-sm rounded-lg border-2 transition-all shadow-xs outline-none focus:ring-2 focus:bg-white no-spin grade-input",
                                 row.nota_final !== null && row.nota_final !== undefined
                                   ? (Number(row.nota_final) >= settings.media_aprovacao
                                       ? "text-blue-800 bg-blue-100/80 border-blue-400 hover:border-blue-500 focus:border-blue-600 focus:ring-blue-500/25"
                                       : Number(row.nota_final) >= settings.media_recuperacao
                                       ? "text-amber-800 bg-amber-100/80 border-amber-400 hover:border-amber-500 focus:border-amber-600 focus:ring-amber-500/25"
                                       : "text-red-800 bg-red-100/80 border-red-400 hover:border-red-500 focus:border-red-600 focus:ring-red-500/25")
                                   : "text-slate-400 bg-slate-50 border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-blue-500/20"
                               )}
                               placeholder="-"
                               title={language === 'pt' ? 'Média final (clique para alterar)' : 'Final average (click to edit)'}
                             />
                           </td>
                            <td className="px-6 py-4 text-center">
                              <span className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase inline-flex items-center gap-1 border", status.className)}>
                                <StatusIcon size={11} className="shrink-0" />
                                <span>{status.label}</span>
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right print:hidden">
                               <button onClick={() => setSelectedStudentForReport(row.aluno?.id)} className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-600 text-white hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border border-blue-600 hover:border-blue-600 shadow-sm"><FileText size={12} /><span>{language === 'pt' ? 'Histórico' : 'Transcript'}</span></button>
                            </td>
                         </tr>
                       );
                     })
                   )}
                 </tbody>
               </table>

                {/* Modal of Individual Student Report */}

                {/* Modal de Detalhes da Situação Pendente */}
                <AnimatePresence>
                  {pendingDetailsStudent && (
                    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-[110] flex items-center justify-center p-4">
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 15 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="bg-white text-slate-800 border border-slate-200 p-6 rounded-2xl shadow-2xl max-w-sm w-full relative"
                      >
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="text-amber-500 animate-pulse" size={18} />
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">
                              {language === 'pt' ? 'Requisitos Pendentes' : 'Pending Requirements'}
                            </h3>
                          </div>
                          <button
                            onClick={() => setPendingDetailsStudent(null)}
                            className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
                          >
                            <X size={16} />
                          </button>
                        </div>

                        <div className="space-y-4">
                          <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                              {language === 'pt' ? 'Aluno / Candidato' : 'Student / Candidate'}
                            </p>
                            <p className="text-sm font-extrabold text-slate-800">
                              {pendingDetailsStudent.aluno?.nome}
                            </p>
                            <p className="text-[10px] font-mono font-bold text-slate-500 mt-0.5">
                              Matrícula: #{pendingDetailsStudent.aluno?.matricula}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">
                              {language === 'pt' ? 'O que está pendente para aprovação?' : 'What is pending for approval?'}
                            </p>
                            <div className="space-y-1.5">
                              {getPendingItems(pendingDetailsStudent).map((item, index) => (
                                <div key={index} className="flex items-center gap-2 px-3 py-2 bg-amber-50/40 rounded-lg border border-amber-100 text-amber-900 text-[11px] font-semibold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />
                                  <span>{item}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
                          <button
                            onClick={() => setPendingDetailsStudent(null)}
                            className="w-full px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
                          >
                            {language === 'pt' ? 'Fechar' : 'Close'}
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
                {selectedStudentForReport && (
                  <div id="student-report-modal-backdrop" className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[100] flex items-center justify-center p-0 overflow-hidden animate-fade-in">
                    <div id="student-report-modal-content" className="bg-slate-900 text-slate-100 w-screen h-screen max-w-full max-h-screen rounded-none shadow-2xl border-none flex flex-col">
                      {/* Modal Actions Header */}
                      <div className="p-4 border-b border-slate-800 flex items-center justify-between no-print bg-slate-900 rounded-none">
                        <div className="flex items-center gap-2">
                          <FileText className="text-blue-500" size={18} />
                          <h3 className="text-xs font-black uppercase tracking-widest text-slate-200">
                            {language === 'pt' ? 'Visualizador de Histórico Escolar' : 'Academic Transcript Viewer'}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2.5">
                          {/* Print Button */}
                          <button
                            onClick={handlePrint}
                            disabled={loadingReport || !reportData}
                            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-slate-700 shadow-md cursor-pointer"
                            title={language === 'pt' ? 'Imprimir documento' : 'Print document'}
                          >
                            <Printer size={13} className="text-blue-400" />
                            <span>{language === 'pt' ? 'Imprimir' : 'Print'}</span>
                          </button>

                          {/* PDF Download Button */}
                          <button
                            onClick={handleDownloadPDF}
                            disabled={loadingReport || !reportData || downloadingPDF}
                            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
                          >
                            {downloadingPDF ? <Loader2 className="animate-spin" size={13} /> : <Download size={13} />}
                            <span>{language === 'pt' ? 'Baixar PDF' : 'Download PDF'}</span>
                          </button>

                          {/* Close Button */}
                          <button
                            onClick={() => setSelectedStudentForReport(null)}
                            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Modal Body Container with screen zoom fit and scrollability */}
                      <div className="flex-1 overflow-auto p-6 bg-slate-950 flex flex-col items-center justify-start relative scrollbar-thin">
                        {loadingReport ? (
                          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                            <Loader2 className="animate-spin text-blue-500" size={32} />
                            <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400">
                              {language === 'pt' ? 'Carregando dados...' : 'Loading report data...'}
                            </span>
                          </div>
                        ) : reportData ? (
                          <div className="w-full flex-1 flex flex-col items-center justify-start relative overflow-visible">
                            {/* Floating zoom controls */}
                            <div className="absolute top-0 right-0 z-[115] flex items-center gap-1.5 bg-slate-900/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-800/80 text-xs text-slate-300 font-bold shadow-lg no-print">
                              <button 
                                onClick={() => setScale(s => Math.max(0.3, s - 0.05))}
                                className="w-6 h-6 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:scale-95 rounded-lg transition font-mono text-xs focus:outline-none cursor-pointer"
                                title="Zoom Out"
                              >
                                -
                              </button>
                              <span className="w-12 text-center text-[10px] font-mono tracking-wider">{(scale * 100).toFixed(0)}%</span>
                              <button 
                                onClick={() => setScale(s => Math.min(1.5, s + 0.05))}
                                className="w-6 h-6 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:scale-95 rounded-lg transition font-mono text-xs focus:outline-none cursor-pointer"
                                title="Zoom In"
                              >
                                +
                              </button>
                              <button 
                                onClick={() => {
                                  setZoomMode('height');
                                  const targetHeight = window.innerHeight - 150;
                                  const computedScale = Math.min(Math.max(targetHeight / 1123, 0.3), 1.05);
                                  setScale(computedScale);
                                }}
                                className={`px-2 py-0.5 border rounded-lg text-[9px] font-black tracking-wider transition ml-1 uppercase cursor-pointer ${
                                  zoomMode === 'height' 
                                    ? 'bg-blue-600 hover:bg-blue-600 text-white hover:text-white border-blue-500 hover:border-blue-500' 
                                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                                }`}
                                title="Ajustar à altura da tela"
                              >
                                {language === 'pt' ? 'Alt. Inteira' : 'Fit Height'}
                              </button>
                              <button 
                                onClick={() => {
                                  setZoomMode('width');
                                  const targetWidth = window.innerWidth - 64;
                                  const computedScale = Math.min(Math.max(targetWidth / 794, 0.3), 1.5);
                                  setScale(computedScale);
                                }}
                                className={`px-2 py-0.5 border rounded-lg text-[9px] font-black tracking-wider transition ml-1 uppercase cursor-pointer ${
                                  zoomMode === 'width' 
                                    ? 'bg-blue-600 hover:bg-blue-600 text-white hover:text-white border-blue-500 hover:border-blue-500' 
                                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                                }`}
                                title="Ajustar à largura da tela (Fullscreen)"
                              >
                                {language === 'pt' ? 'Tela Inteira' : 'Fullscreen'}
                              </button>
                            </div>

                            {/* Outer wrapper with top-aligned start to enable natural scrolling across visual scale */}
                            <div 
                              id="student-report-outer-wrapper"
                              className="flex items-start justify-center overflow-visible mt-4 mx-auto"
                              style={{ 
                                height: downloadingPDF ? 'auto' : `${1123 * scale}px`,
                                width: `${794 * scale}px`,
                              }}
                            >
                              {/* Scaled frame box */}
                              <div 
                                id="student-report-frame-box"
                                style={{ 
                                  transform: `scale(${scale})`, 
                                  transformOrigin: 'top center',
                                  width: '210mm',
                                  height: downloadingPDF ? 'auto' : '297mm',
                                  minWidth: '210mm',
                                  minHeight: downloadingPDF ? 'none' : '297mm',
                                }}
                                className="shadow-2xl flex-shrink-0 transition-transform duration-100 ease-out bg-white rounded-lg overflow-hidden relative"
                              >
                                {/* THE INDIVIDUAL REPORT PRINT CONTAINER */}
                                <div 
                                   id="student-report-print-area"
                                   data-document-sheet="true"
                                   className="official-document-sheet w-[210mm] bg-white text-slate-900 p-8 flex flex-col justify-between font-sans relative text-left text-xs box-border border border-slate-100 overflow-y-auto scrollbar-thin cursor-pointer select-none transition-all duration-200 group/report hover:border-blue-400/40"
                                   onClick={handleCopyAsImage}
                                   title={language === 'pt' ? 'Clique com o botão esquerdo para copiar o Histórico como imagem' : 'Left click to copy Transcript as image'}
                                   style={downloadingPDF ? { height: 'auto', maxHeight: 'none', overflow: 'visible' } : { height: '297mm', maxHeight: '297mm' }}
                                 >
                                   <style dangerouslySetInnerHTML={{ __html: `
                                    #student-report-print-area > * {
                                      flex-shrink: 0 !important;
                                    }
                                    @media print {
                                      /* Reset page context and force standard white/black print output */
                                      html, body {
                                        margin: 0 !important;
                                        padding: 0 !important;
                                        background: #ffffff !important;
                                        color: #000000 !important;
                                        width: 100% !important;
                                        height: auto !important;
                                        min-height: auto !important;
                                        overflow: visible !important;
                                      }

                                      /* Hide headers, footers, mobile bottom-navs, back buttons, filters, etc. completely from DOM layout flow */
                                      header, nav, aside, footer, button, .print\:hidden, [role="dialog"], [role="group"], .no-print {
                                        display: none !important;
                                        width: 0 !important;
                                        height: 0 !important;
                                        margin: 0 !important;
                                        padding: 0 !important;
                                        overflow: hidden !important;
                                      }
                                      
                                      /* Unset absolute parents and scale transformations so printer renders natively */
                                      #student-report-modal-backdrop, html, body, main, .min-h-screen, #__next, .flex-1, [data-framer-portal-container],
                                      #student-report-modal-content,
                                      /* Disable wildcard resets to preserve inner component layout */
                                      .dummy-class-none {
                                        transform: none !important;
                                        filter: none !important;
                                        position: static !important;
                                        width: auto !important;
                                        height: auto !important;
                                        min-height: 0 !important;
                                        max-height: none !important;
                                        overflow: visible !important;
                                        background: transparent !important;
                                      }

                                      /* Override print margins and canvas constraints for exact 210mm x 297mm bounds */
                                      #student-report-print-area {
                                        visibility: visible !important;
                                        position: relative !important;
                                        page-break-inside: avoid !important;
                                        width: 210mm !important;
                                        max-width: 210mm !important;
                                        min-height: 297mm !important;
                                        height: auto !important;
                                        max-height: none !important;
                                        margin: 0 !important;
                                        padding: 10mm 12mm !important;
                                        border: none !important;
                                        box-shadow: none !important;
                                        background: #ffffff !important;
                                        color: #000000 !important;
                                        box-sizing: border-box !important;
                                        overflow: visible !important;
                                        display: flex !important;
                                        flex-direction: column !important;
                                        justify-content: flex-start !important;
                                        gap: 6px !important;
                                      }
                                      #student-report-print-area .p-5 {
                                        padding: 3mm !important;
                                      }
                                      #student-report-print-area .p-4 {
                                        padding: 3mm !important;
                                      }
                                      #student-report-print-area h1 {
                                        font-size: 15px !important;
                                        line-height: 1.15 !important;
                                      }
                                      #student-report-print-area h3 {
                                        font-size: 10px !important;
                                        margin-bottom: 4px !important;
                                      }
                                      #student-report-print-area .grid-cols-4 {
                                        gap: 6px !important;
                                      }
                                      #student-report-print-area .p-3\.5 {
                                        padding: 6px 10px !important;
                                      }
                                      #student-report-print-area .p-2 {
                                        padding: 4px !important;
                                      }
                                      #student-report-print-area .mt-2 {
                                        margin-top: 4px !important;
                                      }
                                      #student-report-print-area .mt-2\.5 {
                                        margin-top: 4px !important;
                                      }
                                      #student-report-print-area .pt-1\.5 {
                                        padding-top: 4px !important;
                                      }
                                      #student-report-print-area .pb-4 {
                                        padding-bottom: 4px !important;
                                      }
                                      #student-report-print-area table th, 
                                      #student-report-print-area .report-table th, 
                                      #student-report-print-area th {
                                        padding: 4px 8px !important;
                                        font-size: 8px !important;
                                      }
                                      #student-report-print-area table td, 
                                      #student-report-print-area .report-table td, 
                                      #student-report-print-area td {
                                        padding: 3px 8px !important;
                                        font-size: 9px !important;
                                      }
                                      #student-report-print-area .text-xs {
                                        font-size: 9px !important;
                                        line-height: 1.15 !important;
                                      }
                                      #student-report-print-area .text-sm {
                                        font-size: 10px !important;
                                        line-height: 1.15 !important;
                                      }
                                      #student-report-print-area .gap-6 {
                                        gap: 8px !important;
                                      }
                                      #student-report-print-area .grid {
                                        gap: 8px !important;
                                      }
                                      #student-report-print-area .w-20.h-20,
                                      #student-report-print-area .w-24.h-24 {
                                        width: 60px !important;
                                        height: 60px !important;
                                      }
                                      #student-report-print-area img {
                                        object-fit: contain !important;
                                        max-width: 100% !important;
                                        max-height: 100% !important;
                                        width: auto !important;
                                        height: auto !important;
                                      }
                                      #student-report-print-area .pt-6 {
                                        padding-top: 4px !important;
                                        margin-top: 2px !important;
                                      }
                                      #student-report-print-area * {
                                        visibility: visible !important;
                                      }

                                      #student-report-print-area .flex {
                                        display: flex !important;
                                      }
                                      #student-report-print-area .flex-row {
                                        flex-direction: row !important;
                                      }
                                      #student-report-print-area .flex-col {
                                        flex-direction: column !important;
                                      }
                                      #student-report-print-area .items-center {
                                        align-items: center !important;
                                      }
                                      #student-report-print-area .justify-between {
                                        justify-content: space-between !important;
                                      }
                                      #student-report-print-area .grid {
                                        display: grid !important;
                                      }
                                      #student-report-print-area .grid-cols-2 {
                                        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                                      }
                                      #student-report-print-area .grid-cols-4 {
                                        grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
                                      }
                                      #student-report-print-area .gap-3 {
                                        gap: 12px !important;
                                      }
                                      #student-report-print-area .gap-4 {
                                        gap: 16px !important;
                                      }
                                      #student-report-print-area .gap-10 {
                                        gap: 40px !important;
                                      }
                                    }
                                    @page {
                                      size: A4 portrait !important;
                                      margin: 0 !important;
                                    }
                                  `}} />

                                  {/* Copy visual badge overlay (hidden in print) */}
                                  <div className="no-print absolute top-3 right-3 bg-slate-900/90 text-white text-[9px] font-bold px-2.5 py-1.5 rounded-md opacity-0 group-hover/report:opacity-100 transition-opacity flex items-center gap-1.5 hover:bg-black pointer-events-none z-10 shadow-sm uppercase tracking-wider">
                                    <Award size={11} className="text-blue-400" />
                                    {language === 'pt' ? 'Clique para copiar imagem' : 'Click to copy image'}
                                  </div>

                                  {/* Premium Official Header Layout */}
                                  <div className="flex items-center justify-between pb-5 border-b border-slate-950 mb-4">
                                    <div className="flex items-center gap-5">
                                      <div className="relative w-36 h-36 shrink-0 flex items-center justify-center bg-white">
                                        <Image
                                          src={navalMissionLogo}
                                          alt="Logo Missão de Assessoria Naval"
                                          width={144}
                                          height={128}
                                          className="w-auto h-auto max-w-full max-h-full object-contain"
                                          style={{ objectFit: 'contain', width: 'auto', height: 'auto', maxHeight: '100%', maxWidth: '100%' }}
                                          referrerPolicy="no-referrer"
                                          priority
                                        />
                                      </div>
                                      <div className="text-left flex flex-col justify-center">
                                        <h1 className="text-base font-black tracking-widest text-slate-900 uppercase leading-snug">
                                          {reportT[language as "pt" | "en"].headerTitle}
                                        </h1>
                                        <p className="text-xs font-black tracking-widest text-slate-500 uppercase mt-1 leading-none">
                                          {reportT[language as "pt" | "en"].headerSubtitle}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="text-right flex flex-col justify-center">
                                      <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">CÓDIGO DE AUTENTICIDADE</span>
                                      <span className="font-mono text-[9px] font-extrabold text-slate-850 mt-1 leading-none tracking-wider">#{reportData.student.id.slice(0, 8).toUpperCase()}</span>
                                    </div>
                                  </div>

                                  {/* Student Information Details Panel */}
                                  <div className="grid grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-slate-900 mt-2">
                                    <div className="col-span-2 flex flex-col gap-0.5">
                                      <span className="text-[8px] font-black tracking-widest text-slate-400 uppercase leading-none">{reportT[language as "pt" | "en"].fullName}</span>
                                      <span className="text-xs font-black uppercase text-slate-900 break-words whitespace-normal tracking-wide mt-1 leading-tight">{reportData.student.nome}</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-[8px] font-black tracking-widest text-slate-400 uppercase leading-none">{reportT[language as "pt" | "en"].rank}</span>
                                      <span className="text-xs font-black uppercase text-slate-800 tracking-wide mt-1 leading-tight">{reportData.student.posto_graduacao || (language === 'pt' ? 'Membro' : 'Member')}</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-[8px] font-black tracking-widest text-slate-400 uppercase leading-none">{language === 'pt' ? 'Guerra' : 'War Name'}</span>
                                      <span className="text-xs font-black uppercase text-slate-800 tracking-wide mt-1 leading-tight">{reportData.student.nome_guerra || '—'}</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5 mt-2 pt-1.5 border-t border-slate-200/60">
                                      <span className="text-[8px] font-black tracking-widest text-slate-400 uppercase leading-none">Matrícula</span>
                                      <span className="text-xs font-mono font-black text-slate-800 mt-1 leading-tight">#{reportData.student.matricula}</span>
                                    </div>
                                    <div className="col-span-1 flex flex-col gap-0.5 mt-2 pt-1.5 border-t border-slate-200/60">
                                      <span className="text-[8px] font-black tracking-widest text-slate-400 uppercase leading-none">{reportT[language as "pt" | "en"].course}</span>
                                      <span className="text-[10px] font-extrabold text-slate-850 break-words whitespace-normal mt-1 leading-normal">{reportData.courseObj?.nome || (language === 'pt' ? 'Não disponível' : 'Not available')}</span>
                                    </div>
                                    <div className="col-span-1 flex flex-col gap-0.5 mt-2 pt-1.5 border-t border-slate-200/60">
                                      <span className="text-[8px] font-black tracking-widest text-slate-400 uppercase leading-none">{reportT[language as "pt" | "en"].class}</span>
                                      <span className="text-[10px] font-extrabold text-slate-850 break-words whitespace-normal mt-1 leading-normal">
                                        {getCleanTurmaName(reportData.classObj, reportData.courseObj?.nome, language === 'pt' ? 'Turma Única' : 'Single Class')}
                                      </span>
                                    </div>
                                    <div className="col-span-1 flex flex-col gap-0.5 mt-2 pt-1.5 border-t border-slate-200/60">
                                      <span className="text-[8px] font-black tracking-widest text-slate-400 uppercase leading-none">{reportT[language as "pt" | "en"].period}</span>
                                      <span className="text-[10px] font-extrabold text-slate-850 uppercase tracking-wide mt-1 leading-normal">
                                        {reportData.classObj?.periodo === 'manhã' ? t.common.morning :
                                         reportData.classObj?.periodo === 'tarde' ? t.common.afternoon :
                                         reportData.classObj?.periodo === 'noite' ? t.common.night : reportData.classObj?.periodo}
                                      </span>
                                    </div>
                                    <div className="col-span-4 flex flex-col gap-0.5 mt-2 pt-1.5 border-t border-slate-200/60">
                                      <span className="text-[8px] font-black tracking-widest text-slate-400 uppercase leading-none">{language === 'pt' ? 'Período de Realização' : 'Class Period'}</span>
                                      <span className="text-[10px] font-extrabold text-slate-850 uppercase tracking-wide mt-1 leading-normal font-mono">
                                        {reportData.classObj?.data_inicio ? reportData.classObj.data_inicio.split('-').reverse().join('/') : '—'} {language === 'pt' ? 'a' : 'to'} {reportData.classObj?.data_fim ? reportData.classObj.data_fim.split('-').reverse().join('/') : '—'}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Academic Performance Map Table */}
                                  <div className="flex flex-col mt-2.5">
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                      <BookOpen className="text-slate-900" size={13} />
                                      <h3 className="text-[9px] font-black text-slate-900 tracking-widest uppercase mb-0">
                                        {reportT[language as "pt" | "en"].academicMap}
                                      </h3>
                                    </div>
                                    
                                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                                      {(() => {
                                        const sortedDisciplines = [...(reportData?.disciplines || [])].sort((a: any, b: any) => {
                                          const mDiff = (a.modulo_index || 1) - (b.modulo_index || 1);
                                          if (mDiff !== 0) return mDiff;
                                          return a.nome.localeCompare(b.nome);
                                        });

                                        const firstGrade = getReportFirstGrade(reportData);

                                        const moduleGroupsMap = new Map<number, any[]>();
                                        sortedDisciplines.forEach((disc: any, discIdx: number) => {
                                          const moduleNum = disc.modulo_index || (discIdx + 1);
                                          if (!moduleGroupsMap.has(moduleNum)) {
                                            moduleGroupsMap.set(moduleNum, []);
                                          }
                                          moduleGroupsMap.get(moduleNum)!.push({ disc, discIdx });
                                        });

                                        const expirationDate = reportData.classObj?.data_postergacao || reportData.classObj?.data_fim;
                                        const todayStr = format(new Date(), 'yyyy-MM-dd');
                                        const isClassExpired = expirationDate ? expirationDate < todayStr : false;

                                        const rows = Array.from(moduleGroupsMap.entries()).map(([moduleNum, groupItems]) => {
                                          const evaluated = groupItems.map(({ disc, discIdx }) => {
                                            return getDisciplineGradeAndFreq(disc, discIdx, reportData, firstGrade);
                                          });

                                          const validGrades = evaluated
                                            .map(e => e.finalGradeValue)
                                            .filter((g): g is number => g !== null && g !== undefined && !isNaN(g));
                                          const finalGradeValue = validGrades.length > 0 ? Math.max(...validGrades) : null;
                                          const finalGradeFormatted = finalGradeValue !== null ? finalGradeValue.toFixed(1) : '-';

                                          const validFreqs = evaluated
                                            .map(e => e.freqValue)
                                            .filter((f): f is number => f !== null && f !== undefined && !isNaN(f));
                                          const freqValue = validFreqs.length > 0 ? Math.min(...validFreqs) : null;

                                          let statusLabel = '';
                                          let statusClass = '';
                                          if (finalGradeValue === null) {
                                            if (isClassExpired) {
                                              statusLabel = language === 'pt' ? 'NÃO CONCLUIU' : 'NOT COMPLETED';
                                              statusClass = 'text-rose-700 bg-rose-50 border border-rose-100 font-extrabold';
                                            } else {
                                              statusLabel = reportT[language as "pt" | "en"].pending;
                                              statusClass = 'text-slate-500 bg-slate-50 border border-slate-100';
                                            }
                                          } else if (finalGradeValue >= settings.media_aprovacao && (freqValue === null || freqValue >= settings.frequencia_minima)) {
                                            statusLabel = reportT[language as "pt" | "en"].approved;
                                            statusClass = 'text-emerald-700 bg-emerald-50 border border-emerald-100';
                                          } else if (freqValue !== null && freqValue < settings.frequencia_minima) {
                                            statusLabel = language === 'pt' ? 'FALTA FREQ.' : 'LOW FREQ.';
                                            statusClass = 'text-orange-700 bg-orange-50 border border-orange-100';
                                          } else if (finalGradeValue >= settings.media_recuperacao) {
                                            statusLabel = reportT[language as "pt" | "en"].retake;
                                            statusClass = 'text-amber-700 bg-amber-50 border border-amber-100';
                                          } else {
                                            statusLabel = reportT[language as "pt" | "en"].reproved;
                                            statusClass = 'text-rose-700 bg-rose-50 border border-rose-100';
                                          }

                                          return {
                                            moduleNum,
                                            modulo: `Módulo ${moduleNum}`,
                                            disciplines: groupItems.map(item => item.disc),
                                            nota: finalGradeFormatted,
                                            situacao: statusLabel,
                                            statusClass,
                                          };
                                        });

                                        return (
                                          <table className="w-full text-left border-collapse bg-white table-auto">
                                            <thead>
                                              <tr className="bg-slate-900 text-[8px] font-black !text-white text-white uppercase tracking-widest border-b border-slate-850">
                                                <th className="px-3.5 py-2 border-r border-slate-800 w-[15%] !text-white text-white">{language === 'pt' ? 'Módulo' : 'Module'}</th>
                                                <th className="px-3.5 py-2 border-r border-slate-800 w-[45%] !text-white text-white">{language === 'pt' ? 'Disciplina' : 'Discipline'}</th>
                                                <th className="px-3.5 py-2 border-r border-slate-800 w-[10%] text-center !text-white text-white">{language === 'pt' ? 'C.H.' : 'Hours'}</th>
                                                <th className="px-3.5 py-2 text-center border-r border-slate-800 font-mono w-[15%] !text-white text-white">{reportT[language as "pt" | "en"].finalGrade}</th>
                                                <th className="px-3.5 py-2 text-right w-[15%] !text-white text-white">{reportT[language as "pt" | "en"].situation}</th>
                                              </tr>
                                            </thead>
                                            <tbody className="text-[10px]">
                                              {rows.length === 0 ? (
                                                <tr>
                                                  <td colSpan={5} className="text-center py-4 text-slate-400 font-bold bg-white">
                                                    {language === 'pt' ? 'Nenhuma disciplina lançada.' : 'No modules submitted.'}
                                                  </td>
                                                </tr>
                                              ) : (
                                                rows.map((row: any, rIdx: number) => {
                                                  return (
                                                    <tr key={`print-row-mod-${row.moduleNum}-${rIdx}`} className="border-b border-slate-200 bg-white">
                                                      <td className="px-3.5 py-2 font-black text-slate-900 border-r border-slate-250 bg-slate-50/70 align-middle whitespace-nowrap text-center">
                                                        {row.modulo}
                                                      </td>
                                                      <td className="p-0 border-r border-slate-200 bg-white align-top">
                                                        <div className="flex flex-col w-full h-full">
                                                          {row.disciplines.map((disc: any, dIdx: number) => (
                                                            <div key={`print-disc-${disc.id || dIdx}`} className={cn(
                                                              "flex items-center gap-1.5 px-3.5 py-2 text-[10px] leading-tight break-words font-bold text-slate-800 flex-1",
                                                              dIdx > 0 && "border-t border-slate-100/80"
                                                            )}>
                                                              <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0" />
                                                              <span>{disc.nome}</span>
                                                            </div>
                                                          ))}
                                                        </div>
                                                      </td>
                                                      <td className="p-0 text-center border-r border-slate-200 bg-white align-top">
                                                        <div className="flex flex-col w-full h-full">
                                                          {row.disciplines.map((disc: any, dIdx: number) => (
                                                            <div key={`print-ch-${disc.id || dIdx}`} className={cn(
                                                              "flex items-center justify-center px-3.5 py-2 text-[9px] font-mono text-slate-500 flex-1",
                                                              dIdx > 0 && "border-t border-slate-100/80"
                                                            )}>
                                                              {disc.carga_horaria ? `${disc.carga_horaria}h` : '-'}
                                                            </div>
                                                          ))}
                                                        </div>
                                                      </td>
                                                      <td className="px-3.5 py-2 text-center font-black font-mono text-xs border-r border-slate-200 text-slate-900 bg-white align-middle">
                                                        {row.nota}
                                                      </td>
                                                      <td className={cn("px-3.5 py-2 text-right bg-white align-middle break-words whitespace-normal leading-tight font-black", row.statusClass)}>
                                                        {row.situacao}
                                                      </td>
                                                    </tr>
                                                  );
                                                })
                                              )}
                                            </tbody>
                                          </table>
                                        );
                                      })()}
                                    </div>
                                  </div>

                                  {/* Attendance and Overall KPIs Container */}
                                  <div className="grid grid-cols-2 gap-4 mt-3">
                                    {/* Attendance Summary */}
                                    <div className="border border-slate-200 p-3 rounded-xl bg-slate-50/40 flex flex-col justify-between">
                                      <div className="flex items-center gap-1.5 border-b border-slate-200/80 pb-1.5 mb-1.5">
                                        <Award className="text-slate-900" size={13} />
                                        <h3 className="text-[9px] font-black text-slate-900 tracking-wider uppercase mb-0 leading-none">
                                          {reportT[language as "pt" | "en"].attendanceReg}
                                        </h3>
                                      </div>

                                      {(() => {
                                        const totalAulas = reportData.attendance?.length || 0;
                                        const presencas = reportData.attendance?.filter((a: any) => a.presente).length || 0;
                                        const faltas = reportData.attendance?.filter((a: any) => !a.presente).length || 0;
                                        
                                        let percentualPresenca = 100;
                                        if (totalAulas > 0) {
                                          percentualPresenca = (presencas / totalAulas) * 100;
                                        } else if (reportData.grades && reportData.grades.length > 0) {
                                          const sortedDisciplines = [...(reportData.disciplines || [])].sort((a: any, b: any) => {
                                            const mDiff = (a.modulo_index || 1) - (b.modulo_index || 1);
                                            if (mDiff !== 0) return mDiff;
                                            return a.nome.localeCompare(b.nome);
                                          });
                                          const firstGrade = getReportFirstGrade(reportData);

                                          const computedDisciplines = sortedDisciplines.map((disc: any, discIdx: number) => {
                                            const { finalGradeValue, freqValue } = getDisciplineGradeAndFreq(disc, discIdx, reportData, firstGrade);
                                            return { finalGradeValue, freqValue };
                                          });

                                          const validFreqs = computedDisciplines.filter((cd: any) => cd.freqValue !== null && cd.freqValue !== undefined);
                                          if (validFreqs.length > 0) {
                                            percentualPresenca = validFreqs.reduce((sum: number, cd: any) => sum + cd.freqValue, 0) / validFreqs.length;
                                          }
                                        }

                                        return (
                                          <div className="flex flex-col gap-2">
                                            <div className="grid grid-cols-3 gap-1.5 text-center">
                                              <div className="p-1 px-1.5 bg-white rounded border border-slate-200 flex flex-col">
                                                <span className="text-[7px] font-black text-slate-400 uppercase leading-none tracking-wide">{reportT[language as "pt" | "en"].totalLectures}</span>
                                                <span className="text-[10px] font-black text-slate-800 mt-1">{totalAulas || '-'}</span>
                                              </div>
                                              <div className="p-1 px-1.5 bg-white rounded border border-slate-200 flex flex-col">
                                                <span className="text-[7px] font-black text-slate-400 uppercase leading-none tracking-wide">{reportT[language as "pt" | "en"].attendances}</span>
                                                <span className="text-[10px] font-black text-emerald-600 mt-1">{totalAulas ? presencas : '-'}</span>
                                              </div>
                                              <div className="p-1 px-1.5 bg-white rounded border border-slate-200 flex flex-col">
                                                <span className="text-[7px] font-black text-slate-400 uppercase leading-none tracking-wide">{reportT[language as "pt" | "en"].absences}</span>
                                                <span className="text-[10px] font-black text-rose-600 mt-1">{totalAulas ? faltas : '-'}</span>
                                              </div>
                                            </div>

                                            <div className="flex items-center justify-between text-xs px-1 border-t border-slate-200 pt-1.5">
                                              <span className="font-extrabold text-slate-500 uppercase text-[8px] tracking-wide">{reportT[language as "pt" | "en"].attendanceRate}:</span>
                                              <span className={cn(
                                                "font-black text-[11px]",
                                                percentualPresenca >= settings.frequencia_minima ? "text-emerald-600" : "text-rose-600"
                                              )}>
                                                {percentualPresenca.toFixed(1)}%
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      })()}
                                    </div>

                                    {/* Overall Performance Card */}
                                    <div className="border border-slate-200 p-3 rounded-xl bg-slate-50/40 flex flex-col justify-between">
                                      <div className="flex items-center gap-1.5 border-b border-slate-200/80 pb-1.5 mb-1.5">
                                        <Percent className="text-slate-900" size={13} />
                                        <h3 className="text-[9px] font-black text-slate-900 tracking-wider uppercase mb-0 leading-none">
                                          {language === 'pt' ? 'DESEMPENHO GLOBAL' : 'GLOBAL PERFORMANCE'}
                                        </h3>
                                      </div>

                                      {(() => {
                                        // Dynamically compute grades for each discipline using the fallback modular calculation
                                        const sortedDisciplines = [...(reportData.disciplines || [])].sort((a: any, b: any) => {
                                          const mDiff = (a.modulo_index || 1) - (b.modulo_index || 1);
                                          if (mDiff !== 0) return mDiff;
                                          return a.nome.localeCompare(b.nome);
                                        });
                                        const firstDisc = sortedDisciplines[0];
                                        const firstGrade = getReportFirstGrade(reportData);

                                        const computedDisciplines = sortedDisciplines.map((disc: any, discIdx: number) => {
                                          const { finalGradeValue, freqValue } = getDisciplineGradeAndFreq(disc, discIdx, reportData, firstGrade);
                                          return { finalGradeValue, freqValue };
                                        });

                                        const validFinalGrades = computedDisciplines.filter((cd: any) => cd.finalGradeValue !== null && cd.finalGradeValue !== undefined);
                                        const averageGrade = validFinalGrades.length > 0
                                          ? validFinalGrades.reduce((sum, cd) => sum + (cd.finalGradeValue || 0), 0) / validFinalGrades.length
                                          : null;

                                        const expirationDate = reportData.classObj?.data_postergacao || reportData.classObj?.data_fim;
                                         const todayStr = format(new Date(), 'yyyy-MM-dd');
                                         const isClassExpired = expirationDate ? expirationDate < todayStr : false;

                                         let overallLabel = language === 'pt' ? 'EM DESENVOLVIMENTO' : 'UNDER REVIEW';
                                         let overallClass = 'bg-slate-100 text-slate-700 border border-slate-300';

                                         if (averageGrade === null && isClassExpired) {
                                           overallLabel = language === 'pt' ? 'NÃO CONCLUIU O CURSO' : 'COURSE NOT COMPLETED';
                                           overallClass = 'bg-rose-50 text-rose-700 border border-rose-300 font-black';
                                         } else if (averageGrade !== null) {
                                          const hasReprovedDiscipline = computedDisciplines.some((cd) => cd.finalGradeValue !== null && cd.finalGradeValue < settings.media_aprovacao);
                                          const totalAulas = reportData.attendance?.length || 0;
                                          let percentualPresenca = 100;
                                          if (totalAulas > 0) {
                                            const presencas = reportData.attendance.filter((a: any) => a.presente).length;
                                            percentualPresenca = (presencas / totalAulas) * 100;
                                          } else if (reportData.grades && reportData.grades.length > 0) {
                                            const validFreqs = computedDisciplines.filter((cd: any) => cd.freqValue !== null && cd.freqValue !== undefined);
                                            if (validFreqs.length > 0) {
                                              percentualPresenca = validFreqs.reduce((sum: number, cd: any) => sum + cd.freqValue, 0) / validFreqs.length;
                                            }
                                          }

                                          if (percentualPresenca < settings.frequencia_minima) {
                                            overallLabel = language === 'pt' ? 'REP. FREQUÊNCIA' : 'FAILED FREQ.';
                                            overallClass = 'bg-rose-50 text-rose-700 border border-rose-300 font-black';
                                          } else if (hasReprovedDiscipline) {
                                            overallLabel = language === 'pt' ? 'REP. NOTA' : 'FAILED ACADEMICS';
                                            overallClass = 'bg-rose-50 text-rose-700 border border-rose-300 font-black';
                                          } else if (averageGrade >= settings.media_aprovacao) {
                                            overallLabel = reportT[language as "pt" | "en"].approved;
                                            overallClass = 'bg-emerald-50 text-emerald-700 border border-emerald-300 font-black';
                                          } else if (averageGrade >= settings.media_recuperacao) {
                                            overallLabel = reportT[language as "pt" | "en"].retake;
                                            overallClass = 'bg-amber-50 text-amber-700 border border-amber-300 font-black';
                                          } else {
                                            overallLabel = reportT[language as "pt" | "en"].reproved;
                                            overallClass = 'bg-rose-50 text-rose-700 border border-rose-300 font-black';
                                          }
                                        }

                                        return (
                                          <div className="flex flex-col gap-2">
                                            <div className="flex items-center justify-between">
                                              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide leading-none">{reportT[language as "pt" | "en"].overallAverage}:</span>
                                              <span className="inline-flex items-center justify-center text-center min-w-[56px] text-[11px] font-black font-mono px-2 py-0.5 rounded-md bg-blue-50 border border-blue-600 text-blue-700 leading-none shadow-2xs">
                                                {averageGrade !== null ? averageGrade.toFixed(2) : '-'}
                                              </span>
                                            </div>

                                            <div className="flex items-center justify-between border-t border-slate-200/60 pt-1.5">
                                              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide leading-none">{reportT[language as "pt" | "en"].overallStatus}:</span>
                                              <span className={cn(
                                                "inline-flex items-center justify-center text-center min-w-[80px] text-[8px] font-black uppercase px-2 py-0.5 rounded-md leading-none shadow-2xs",
                                                overallClass
                                              )}>
                                                {overallLabel}
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  </div>

                                  {/* Observations Box */}
                                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 mt-2.5">
                                    <span className="text-[7px] font-black tracking-widest text-slate-400 uppercase block mb-1">
                                      {reportT[language as "pt" | "en"].observations}
                                    </span>
                                    <p className="text-[9px] italic leading-relaxed text-slate-600 text-justify font-serif whitespace-pre-line">
                                      {reportData?.student?.observacoes?.trim()
                                        ? `"${reportData.student.observacoes}"`
                                        : `"${reportT[language as "pt" | "en"].defaultObs}"`}
                                    </p>
                                  </div>

                                  {/* Stamp & Issue Date Footer */}
                                  <div className="flex items-center justify-between text-[7px] tracking-wider text-slate-400 font-bold uppercase border-t border-slate-250 pt-2.5 mt-1">
                                    <div className="flex items-center font-mono">
                                      <span>CERT-{reportData.student.id.slice(0, 12).toUpperCase()}</span>
                                    </div>
                                    <span>
                                      {language === 'pt' ? 'DOCUMENTO EMITIDO EM: ' : 'ISSUED ON: '}
                                      {new Date().toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric'
                                      }).toUpperCase()}
                                    </span>
                                  </div>

                                  {/* Single Signature Panel */}
                                  <div className="flex flex-col items-center justify-center pt-5 mt-3 border-t border-dashed border-slate-300">
                                    <div className="flex flex-col items-center text-center max-w-lg w-full">
                                      <div className="w-72 border-b-2 border-slate-700 h-8 mb-2"></div>
                                      <div className="flex flex-col items-center px-4 py-1.5 border-2 border-slate-700 rounded bg-slate-50 min-w-[260px] shadow-2xs">
                                        <span className="text-[9px] font-black text-slate-900 uppercase tracking-wider leading-tight text-center font-mono">
                                          {reportT[language as "pt" | "en"].signatureCommander}
                                        </span>
                                      </div>
                                      <span className="text-[7px] font-bold text-slate-400 uppercase mt-1.5 leading-none tracking-widest">
                                        {language === 'pt' ? 'Assinatura' : 'Signature'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-20 text-slate-400">
                            {language === 'pt' ? 'Não foi possível carregar os dados.' : 'Failed to retrieve report data.'}
                          </div>
                        )}
                      </div>

                      {/* Modal Actions Footer */}
                      <div className="p-4 border-t border-slate-700/50 flex justify-end gap-3 no-print bg-slate-900 rounded-none">
                        <button
                          onClick={handlePrint}
                          disabled={loadingReport || !reportData}
                          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all border border-slate-700 cursor-pointer"
                          title={language === 'pt' ? 'Imprimir documento' : 'Print document'}
                        >
                          <Printer size={14} className="text-blue-400" />
                          <span>{language === 'pt' ? 'Imprimir' : 'Print'}</span>
                        </button>
                        <button
                          onClick={handleDownloadPDF}
                          disabled={loadingReport || !reportData || downloadingPDF}
                          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
                        >
                          {downloadingPDF ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
                          <span>{language === 'pt' ? 'Baixar PDF' : 'Download PDF'}</span>
                        </button>
                        <button
                          onClick={() => setSelectedStudentForReport(null)}
                          className="bg-slate-800 hover:bg-slate-700 px-5 py-2.5 rounded-xl text-xs font-bold text-slate-300 transition-all cursor-pointer"
                        >
                          {reportT[language as "pt" | "en"].close}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {viewingClassBulletinPDF && (
                  <div id="class-report-modal-backdrop" className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[100] flex items-center justify-center p-0 overflow-hidden animate-fade-in">
                    <div id="class-report-modal-content" className="bg-slate-900 text-slate-100 w-screen h-screen max-w-full max-h-screen rounded-none shadow-2xl border-none flex flex-col">
                      {/* Modal Actions Header */}
                      <div className="p-4 border-b border-slate-800 flex items-center justify-between no-print bg-slate-900 rounded-none">
                        <div className="flex items-center gap-2">
                          <FileText className="text-blue-500" size={18} />
                          <h3 className="text-xs font-black uppercase tracking-widest text-slate-200">
                            {language === 'pt' ? 'Visualizador de Boletim de Rendimento de Turma' : 'Class Report Card Viewer'}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2.5">
                          {/* Print Button */}
                          <button
                            onClick={handlePrint}
                            disabled={downloadingClassPDF || !selectedTurma || boletimData.length === 0}
                            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-slate-700 shadow-md cursor-pointer"
                            title={language === 'pt' ? 'Imprimir documento' : 'Print document'}
                          >
                            <Printer size={13} className="text-blue-400" />
                            <span>{language === 'pt' ? 'Imprimir' : 'Print'}</span>
                          </button>

                          {/* PDF Download Button */}
                          <button
                            onClick={handleDownloadClassBulletinPDF}
                            disabled={downloadingClassPDF || !selectedTurma || boletimData.length === 0}
                            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
                          >
                            {downloadingClassPDF ? <Loader2 className="animate-spin" size={13} /> : <Download size={13} />}
                            <span>{language === 'pt' ? 'Baixar PDF' : 'Download PDF'}</span>
                          </button>

                          {/* Close Button */}
                          <button
                            onClick={() => setViewingClassBulletinPDF(false)}
                            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Modal Body Container with screen zoom fit and scrollability */}
                      <div className="flex-1 overflow-auto p-6 bg-slate-950 flex flex-col items-center justify-start relative scrollbar-thin">
                        <div className="w-full flex-1 flex flex-col items-center justify-start relative overflow-visible">
                          {/* Floating zoom controls */}
                          <div className="absolute top-0 right-0 z-[115] flex items-center gap-1.5 bg-slate-900/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-800/80 text-xs text-slate-300 font-bold shadow-lg no-print">
                            <button 
                              onClick={() => setClassScale(s => Math.max(0.3, s - 0.05))}
                              className="w-6 h-6 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:scale-95 rounded-lg transition font-mono text-xs focus:outline-none cursor-pointer"
                              title="Zoom Out"
                            >
                              -
                            </button>
                            <span className="w-12 text-center text-[10px] font-mono tracking-wider">{(classScale * 100).toFixed(0)}%</span>
                            <button 
                              onClick={() => setClassScale(s => Math.min(1.5, s + 0.05))}
                              className="w-6 h-6 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:scale-95 rounded-lg transition font-mono text-xs focus:outline-none cursor-pointer"
                              title="Zoom In"
                            >
                              +
                            </button>
                          </div>

                          {/* Outer wrapper with top-aligned start */}
                          <div 
                            id="class-report-outer-wrapper"
                            className="flex items-start justify-center overflow-visible mt-4 mx-auto"
                            style={{ 
                              height: downloadingClassPDF ? 'auto' : `${1123 * classScale}px`,
                              width: `${794 * classScale}px`,
                            }}
                          >
                            {/* Scaled frame box */}
                            <div 
                              id="class-report-frame-box"
                              style={{ 
                                transform: `scale(${classScale})`, 
                                transformOrigin: 'top center',
                                width: '210mm',
                                height: downloadingClassPDF ? 'auto' : '297mm',
                                minWidth: '210mm',
                                minHeight: downloadingClassPDF ? 'none' : '297mm',
                              }}
                              className="shadow-2xl flex-shrink-0 transition-transform duration-100 ease-out bg-white rounded-lg overflow-hidden relative"
                            >
                              {/* THE CLASS REPORT PRINT CONTAINER */}
                              <div 
                                 id="class-bulletin-print-area"
                                 data-document-sheet="true"
                                 className="official-document-sheet w-[210mm] bg-white text-slate-900 p-8 flex flex-col justify-between font-sans relative text-left text-xs box-border border border-slate-100 overflow-y-auto scrollbar-thin cursor-pointer select-none transition-all duration-200"
                                 style={downloadingClassPDF ? { height: 'auto', maxHeight: 'none', overflow: 'visible' } : { height: '297mm', maxHeight: '297mm' }}
                               >
                                 <style dangerouslySetInnerHTML={{ __html: `
                                  #class-bulletin-print-area > * {
                                    flex-shrink: 0 !important;
                                  }
                                  @media print {
                                    html, body {
                                      margin: 0 !important;
                                      padding: 0 !important;
                                      background: #ffffff !important;
                                      color: #000000 !important;
                                      width: 100% !important;
                                      height: auto !important;
                                    }
                                    header, nav, aside, footer, button, .print\\:hidden, .no-print {
                                      display: none !important;
                                    }
                                    #class-bulletin-print-area {
                                      visibility: visible !important;
                                      position: relative !important;
                                      width: 210mm !important;
                                      max-width: 210mm !important;
                                      min-height: 297mm !important;
                                      margin: 0 !important;
                                      padding: 10mm 12mm !important;
                                      border: none !important;
                                      box-shadow: none !important;
                                      background: #ffffff !important;
                                      box-sizing: border-box !important;
                                    }
                                  }
                                 ` }} />

                                 {/* Header */}
                                 <div className="flex items-center justify-between pb-5 border-b border-slate-950 mb-4">
                                   <div className="flex items-center gap-5">
                                     <div className="relative w-36 h-36 shrink-0 flex items-center justify-center bg-white">
                                       <Image
                                         src={navalMissionLogo}
                                         alt="Logo Missão de Assessoria Naval"
                                         width={144}
                                         height={128}
                                         className="w-auto h-auto max-w-full max-h-full object-contain"
                                         style={{ objectFit: 'contain', width: 'auto', height: 'auto', maxHeight: '100%', maxWidth: '100%' }}
                                         referrerPolicy="no-referrer"
                                         priority
                                       />
                                     </div>
                                     <div className="text-left flex flex-col justify-center">
                                       <h1 className="text-base font-black tracking-widest text-slate-900 uppercase leading-snug">
                                         {reportT[language as "pt" | "en"].headerTitle}
                                       </h1>
                                       <p className="text-xs font-black tracking-widest text-slate-500 uppercase mt-1 leading-none">
                                         {reportT[language as "pt" | "en"].headerSubtitle}
                                       </p>
                                     </div>
                                   </div>
                                   <div className="text-right flex flex-col justify-center">
                                     <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">BOLETIM COLETIVO</span>
                                     <span className="font-mono text-[9px] font-extrabold text-slate-850 mt-1 leading-none tracking-wider">
                                       #{selectedTurma.slice(0, 8).toUpperCase()}
                                     </span>
                                   </div>
                                 </div>

                                 {/* Class Information Details Panel */}
                                 <div className="grid grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-slate-900 mt-2">
                                   <div className="col-span-2 flex flex-col gap-0.5">
                                     <span className="text-[8px] font-black tracking-widest text-slate-400 uppercase leading-none">{language === 'pt' ? 'CURSO' : 'COURSE'}</span>
                                     <span className="text-xs font-black uppercase text-slate-900 break-words whitespace-normal tracking-wide mt-1 leading-tight">
                                       {turmas.find((t: any) => t.id === selectedTurma)?.curso?.nome || 'C-E-BBS'}
                                     </span>
                                   </div>
                                   <div className="flex flex-col gap-0.5">
                                     <span className="text-[8px] font-black tracking-widest text-slate-400 uppercase leading-none">{language === 'pt' ? 'TURMA' : 'CLASS'}</span>
                                     <span className="text-xs font-black uppercase text-slate-800 tracking-wide mt-1 leading-tight">
                                       {(() => {
                                         const currentTurmaObj = turmas.find((t: any) => t.id === selectedTurma);
                                         const courseName = currentTurmaObj?.curso?.nome || 'C-E-BBS';
                                         return getCleanTurmaName(currentTurmaObj, courseName, language === 'pt' ? 'Turma Única' : 'Single Class');
                                       })()}
                                     </span>
                                   </div>
                                   <div className="flex flex-col gap-0.5">
                                     <span className="text-[8px] font-black tracking-widest text-slate-400 uppercase leading-none">{language === 'pt' ? 'ANO' : 'YEAR'}</span>
                                     <span className="text-xs font-mono font-black text-slate-800 mt-1 leading-tight">
                                       {selectedAno || turmas.find((t: any) => t.id === selectedTurma)?.ano || new Date().getFullYear()}
                                     </span>
                                   </div>
                                 </div>

                                 {/* Class Table */}
                                 <div className="flex flex-col mt-3 flex-1 overflow-hidden">
                                   <div className="flex items-center gap-1.5 mb-1.5">
                                     <BookOpen className="text-slate-900" size={13} />
                                     <h3 className="text-[9px] font-black text-slate-900 tracking-widest uppercase mb-0">
                                       {language === 'pt' ? 'RENDIMENTO DA TURMA' : 'CLASS ACADEMIC PERFORMANCE'}
                                     </h3>
                                   </div>

                                   <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                                     <table className="w-full text-left border-collapse bg-white table-auto">
                                       <thead>
                                         <tr className="bg-slate-900 text-[8px] font-black !text-white text-white uppercase tracking-widest border-b border-slate-850">
                                           <th className="px-3.5 py-2 border-r border-slate-800 w-[5%] text-center !text-white text-white">#</th>
                                           <th className="px-3.5 py-2 border-r border-slate-800 w-[45%] !text-white text-white">{language === 'pt' ? 'Aluno' : 'Student'}</th>
                                           {Array.from({ length: courseModules }).map((_, i) => (
                                             <th key={i} className="px-1 py-2 text-center border-r border-slate-800 w-[8%] !text-white text-white">MOD {i + 1}</th>
                                           ))}
                                           <th className="px-3.5 py-2 text-center border-r border-slate-800 w-[12%] !text-white text-white">{language === 'pt' ? 'Média' : 'Avg'}</th>
                                           <th className="px-3.5 py-2 text-right w-[14%] !text-white text-white">{language === 'pt' ? 'Situação' : 'Status'}</th>
                                         </tr>
                                       </thead>
                                       <tbody className="text-[9px]">
                                         {boletimData.length === 0 ? (
                                           <tr>
                                             <td colSpan={4 + courseModules} className="text-center py-4 text-slate-400 font-bold bg-white">
                                               {language === 'pt' ? 'Nenhum aluno lançado.' : 'No students found.'}
                                             </td>
                                           </tr>
                                         ) : (
                                           boletimData.map((row: any, idx: number) => {
                                             const status = getStatus(row.nota_final, row.frequencia);
                                             return (
                                               <tr key={`summary-row-${row.id || ''}-${idx}`} className="border-b border-slate-200 bg-white hover:bg-slate-50">
                                                 <td className="px-3.5 py-1.5 text-center font-bold border-r border-slate-200 text-slate-400 font-mono">
                                                   {idx + 1}
                                                 </td>
                                                 <td className="px-3.5 py-1.5 font-bold text-slate-800 border-r border-slate-200">
                                                   <div className="font-extrabold">{row.aluno?.nome}</div>
                                                   <div className="text-[8px] font-mono text-slate-400">#{row.aluno?.matricula}</div>
                                                 </td>
                                                 {Array.from({ length: courseModules }).map((_, i) => {
                                                   const notaValue = (row as any)[`nota${i + 1}`];
                                                   return (
                                                     <td key={i} className="px-1 py-1.5 text-center border-r border-slate-200 font-mono">
                                                       {notaValue !== null && notaValue !== undefined ? Number(notaValue).toFixed(1) : '-'}
                                                     </td>
                                                   );
                                                 })}
                                                 <td className="px-3.5 py-1.5 text-center border-r border-slate-200 font-black font-mono">
                                                   {row.nota_final !== null && row.nota_final !== undefined ? Number(row.nota_final).toFixed(1) : '-'}
                                                 </td>
                                                 <td className="px-3.5 py-1.5 text-right font-bold">
                                                   <span className={cn("px-1.5 py-0.5 rounded text-[7px] font-black uppercase inline-block border", status.className)}>
                                                     {status.label}
                                                   </span>
                                                 </td>
                                               </tr>
                                             );
                                           })
                                         )}
                                       </tbody>
                                     </table>
                                   </div>
                                 </div>

                                 {/* Summary stats */}
                                 <div className="grid grid-cols-2 gap-4 mt-3 border-t border-slate-250 pt-3">
                                   <div className="flex items-center justify-between text-[10px] font-bold text-slate-600">
                                     <span>{language === 'pt' ? 'MÉDIA GERAL DA TURMA:' : 'CLASS OVERALL AVERAGE:'}</span>
                                     <span className="inline-flex items-center justify-center text-center min-w-[50px] font-mono font-black text-blue-700 bg-blue-50 border border-blue-600 px-2 py-0.5 rounded">
                                       {classStats.avg ? classStats.avg.toFixed(2) : '-'}
                                     </span>
                                   </div>
                                   <div className="flex items-center justify-between text-[10px] font-bold text-slate-600">
                                     <span>{language === 'pt' ? 'TOTAL DE ALUNOS:' : 'TOTAL STUDENTS:'}</span>
                                     <span className="inline-flex items-center justify-center text-center min-w-[50px] font-mono font-black text-slate-800 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                                       {classStats.total || '-'}
                                     </span>
                                   </div>
                                 </div>

                                 {/* Single Signature Panel */}
                                 <div className="flex flex-col items-center justify-center pt-5 mt-3 border-t border-dashed border-slate-300">
                                   <div className="flex flex-col items-center text-center max-w-lg w-full">
                                     <div className="w-72 border-b-2 border-slate-700 h-8 mb-2"></div>
                                     <div className="flex flex-col items-center px-4 py-1.5 border-2 border-slate-700 rounded bg-slate-50 min-w-[260px] shadow-2xs">
                                       <span className="text-[9px] font-black text-slate-900 uppercase tracking-wider leading-tight text-center font-mono">
                                         {reportT[language as "pt" | "en"].signatureCommander}
                                       </span>
                                     </div>
                                     <span className="text-[7px] font-bold text-slate-400 uppercase mt-1.5 leading-none tracking-widest">
                                       {language === 'pt' ? 'Assinatura' : 'Signature'}
                                     </span>
                                   </div>
                                 </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Modal Footer */}
                      <div className="p-4 border-t border-slate-700/50 flex justify-end gap-3 no-print bg-slate-900 rounded-none">
                        <button
                          onClick={handlePrint}
                          disabled={downloadingClassPDF || !selectedTurma || boletimData.length === 0}
                          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all border border-slate-700 cursor-pointer"
                          title={language === 'pt' ? 'Imprimir documento' : 'Print document'}
                        >
                          <Printer size={14} className="text-blue-400" />
                          <span>{language === 'pt' ? 'Imprimir' : 'Print'}</span>
                        </button>
                        <button
                          onClick={handleDownloadClassBulletinPDF}
                          disabled={downloadingClassPDF || !selectedTurma || boletimData.length === 0}
                          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
                        >
                          {downloadingClassPDF ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
                          <span>{language === 'pt' ? 'Baixar PDF' : 'Download PDF'}</span>
                        </button>
                        <button
                          onClick={() => setViewingClassBulletinPDF(false)}
                          className="bg-slate-800 hover:bg-slate-700 px-5 py-2.5 rounded-xl text-xs font-bold text-slate-300 transition-all cursor-pointer"
                        >
                          {language === 'pt' ? 'Fechar' : 'Close'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BoletimPage() {
  return (
    <Suspense fallback={
      <div className="py-24 flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-slate-500 font-bold text-xs uppercase tracking-wider animate-pulse">Carregando...</p>
      </div>
    }>
      <BoletimContent />
    </Suspense>
  );
}
