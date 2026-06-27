'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useMemo } from 'react';
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
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useUser } from '@/lib/auth/UserContext';
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
    defaultObs: "Atleta/Aluno demonstra comprometimento acadêmico regular, preenchendo os requisitos regulamentares de frequência e aproveitamento didático estabelecidos pelas normas vigentes.",
    signatureInstructor: "Assinatura do Instrutor-Chefe / Coordenador",
    signatureStudent: "Assinatura do Aluno / Treinando",
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
    signatureInstructor: "Signature of Chief Instructor / Coordinator",
    signatureStudent: "Signature of Student / Trainee",
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

export default function BoletimPage() {
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
    if (searchParams && turmas.length > 0) {
      const paramTurma = searchParams.get('turmaId');
      if (paramTurma) {
        const foundTurma = turmas.find((t: any) => t.id === paramTurma);
        if (foundTurma) {
          if (foundTurma.curso_id) {
            setSelectedCurso(foundTurma.curso_id);
          }
          if (foundTurma.ano) {
            setSelectedAno(String(foundTurma.ano));
          }
          setSelectedTurma(paramTurma);
        }
      } else {
        const paramCurso = searchParams.get('cursoId');
        if (paramCurso) {
          setSelectedCurso(paramCurso);
        }
      }
    }
  }, [searchParams, turmas]);
  const [courseModules, setCourseModules] = useState(4);
  
  const [boletimData, setBoletimData] = useState<any[]>([]);
  const [classStats, setClassStats] = useState({ avg: 0, total: 0 });
  const settings = configuracoes || { media_aprovacao: 7, media_recuperacao: 5, frequencia_minima: 75, nota_maxima: 10 };

  const [selectedStudentForReport, setSelectedStudentForReport] = useState<string | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportData, setReportData] = useState<any | null>(null);
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
      
      // Let the DOM update to full-scale resolution
      await new Promise((resolve) => setTimeout(resolve, 150));

      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(element, {
        scale: 2.2, // Extremely sharp, crystal-clear typography text
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: 794,
        height: 1123,
        windowWidth: 794,
        windowHeight: 1123,
        onclone: (clonedDoc) => {
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

      // Restore screen preview scale back to configured level
      setScale(prevScale);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
      
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
      const html2canvas = (await import('html2canvas')).default;
      const element = document.getElementById('student-report-print-area');
      if (!element) throw new Error('Report element not found');

      // Set scale temporary to higher resolution for premium quality copy
      const prevScale = scale;
      setScale(1.2);
      await new Promise(resolve => setTimeout(resolve, 80));

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
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
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const printArea = document.getElementById('class-bulletin-print-area');
      if (!printArea) {
        toast.error(language === 'pt' ? 'Área de impressão não localizada.' : 'Print area not found.', { id: toastId });
        return;
      }

      // Temporarily set scale to 1.0 for perfect pixel capture
      const prevScale = classScale;
      setClassScale(1.0);
      
      // Wait for React to render at full resolution scale
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

      setClassScale(prevScale);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
      
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

        const { data: gradesData } = await supabase
          .from('notas')
          .select('*')
          .eq('aluno_id', selectedStudentForReport)
          .eq('turma_id', classId);

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
          disciplines: discList,
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
        .select('id, nome, matricula, foto_url, turma_id, status, posto_graduacao')
        .eq('turma_id', activeTurmaId)
        .is('deleted_at', null)
        .order('nome');

      if (studentsError) throw studentsError;

      // 2. Fetch all grades registered for this class and discipline
      let gradesQuery = supabase
        .from('notas')
        .select('*')
        .eq('turma_id', activeTurmaId);

      if (firstDiscId) {
        gradesQuery = gradesQuery.eq('disciplina_id', firstDiscId);
      }

      if (selectedAno) {
        gradesQuery = gradesQuery.eq('ano_letivo', parseInt(selectedAno));
      }

      const { data: grades, error: gradesError } = await gradesQuery;
      if (gradesError) throw gradesError;

      const localCourseModules = turma?.curso?.qtd_modulos 
        ? Math.min(turma.curso.qtd_modulos, 20) 
        : (turma?.curso_id ? Math.min(cursos.find((c: any) => c.id === turma.curso_id)?.qtd_modulos || 4, 20) : 4);

      // 3. Merged list: only include students who are actually enrolled in the class!
      // This synchronizes lists and tables, excluding non-enrolled students like "Abdul Lima Quaresma".
      const mergedData = (students || []).map((student: any) => {
        const existingGrade = (grades || []).find((g: any) => g.aluno_id === student.id);
        if (existingGrade) {
          let computedFinal = existingGrade.nota_final;
          if (computedFinal === null || computedFinal === undefined || computedFinal === '') {
            const scores: number[] = [];
            for (let i = 1; i <= localCourseModules; i++) {
              const val = existingGrade[`nota${i}`];
              if (val !== null && val !== undefined && val !== '') {
                scores.push(Number(val));
              }
            }
            if (scores.length > 0) {
              computedFinal = scores.reduce((x, y) => x + y, 0) / scores.length;
            }
          }
          return {
            ...existingGrade,
            nota_final: computedFinal !== null ? Number(computedFinal) : null,
            aluno: student
          };
        } else {
          return {
            id: `temp-${student.id}`,
            aluno_id: student.id,
            turma_id: activeTurmaId,
            disciplina_id: firstDiscId || '',
            nota1: null,
            nota2: null,
            nota3: null,
            nota4: null,
            nota5: null,
            nota6: null,
            nota7: null,
            nota8: null,
            nota9: null,
            nota10: null,
            nota11: null,
            nota12: null,
            nota13: null,
            nota14: null,
            nota15: null,
            nota16: null,
            nota17: null,
            nota18: null,
            nota19: null,
            nota20: null,
            nota_final: null,
            frequencia: null,
            pago: true,
            ano_letivo: parseInt(selectedAno) || new Date().getFullYear(),
            aluno: student
          };
        }
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

  const disciplinasLength = disciplinas?.length || 0;

  // Auto-search when turma or year changes
  useEffect(() => {
    if (selectedTurma) {
      handleSearch(selectedTurma);
    } else {
      setBoletimData([]);
      setClassStats({ avg: 0, total: 0 });
    }
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
              className="bg-white text-slate-900 border border-slate-200 shadow-xl p-8 rounded-lg flex flex-col gap-6 font-sans relative text-left text-xs overflow-y-auto scrollbar-thin"
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
                  #student-report-print-area .w-24.h-24 {
                    width: 60px !important;
                    height: 60px !important;
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
                    const reportRows = (() => {
                      if (!reportData) return [];

                      const sortedDisciplines = [...(reportData.disciplines || [])].sort((a: any, b: any) => {
                        const mDiff = (a.modulo_index || 1) - (b.modulo_index || 1);
                        if (mDiff !== 0) return mDiff;
                        return a.nome.localeCompare(b.nome);
                      });

                      const firstDisc = sortedDisciplines[0];
                      const firstGrade = firstDisc ? (reportData.grades || []).find((g: any) => g.disciplina_id === firstDisc.id) : null;

                      const computedRows = sortedDisciplines.map((disc: any, discIdx: number) => {
                        const moduleNum = disc.modulo_index || (discIdx + 1);

                        let finalGradeValue = null;
                        if (firstGrade && moduleNum !== null) {
                          const modularGradeValue = firstGrade[`nota${moduleNum}`];
                          if (modularGradeValue !== null && modularGradeValue !== undefined && modularGradeValue !== '') {
                            finalGradeValue = Number(modularGradeValue);
                          }
                        }

                        if (finalGradeValue === null) {
                          const directGrade = (reportData.grades || []).find((g: any) => g.disciplina_id === disc.id);
                          finalGradeValue = directGrade ? directGrade.nota_final : null;
                        }

                        let freqValue = null;
                        if (firstGrade && firstGrade.frequencia !== null && firstGrade.frequencia !== undefined) {
                          freqValue = firstGrade.frequencia;
                        } else {
                          const directGrade = (reportData.grades || []).find((g: any) => g.disciplina_id === disc.id);
                          freqValue = directGrade ? directGrade.frequencia : null;
                        }

                        const finalGradeFormatted = finalGradeValue !== null && finalGradeValue !== undefined ? Number(finalGradeValue).toFixed(1) : '-';

                        const expirationDate = reportData.classObj?.data_postergacao || reportData.classObj?.data_fim;
                        const todayStr = format(new Date(), 'yyyy-MM-dd');
                        const isClassExpired = expirationDate ? expirationDate < todayStr : false;

                        let statusLabel = '';
                        let statusClass = 'text-slate-400';
                        if (finalGradeValue === null || finalGradeValue === undefined) {
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
                          id: disc.id,
                          modulo: `Módulo ${moduleNum}`,
                          disciplina: disc.nome,
                          nota: finalGradeFormatted,
                          situacao: statusLabel,
                          statusClass,
                        };
                      });

                      const rowsWithSpans = [];
                      for (let i = 0; i < computedRows.length; i++) {
                        const row = { ...computedRows[i], moduloSpan: 0 };
                        
                        if (i === 0 || computedRows[i].modulo !== computedRows[i - 1].modulo) {
                          let span = 1;
                          while (i + span < computedRows.length && computedRows[i + span].modulo === computedRows[i].modulo) {
                            span++;
                          }
                          row.moduloSpan = span;
                        }
                        
                        rowsWithSpans.push(row);
                      }
                      return rowsWithSpans;
                    })();

                    return (
                      <table className="w-full text-left report-table border border-slate-200 bg-white table-auto">
                        <thead>
                          <tr className="bg-slate-100 print-bg-gray text-[10px] font-extrabold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                            <th className="px-4 py-3 border-r border-slate-200 w-[20%]">{language === 'pt' ? 'Módulo' : 'Module'}</th>
                            <th className="px-4 py-3 border-r border-slate-200 w-[50%]">{language === 'pt' ? 'Disciplina' : 'Discipline'}</th>
                            <th className="px-3 py-3 text-center border-r border-slate-200 font-mono w-[15%]">{reportT[language as "pt" | "en"].finalGrade}</th>
                            <th className="px-4 py-3 text-right w-[15%]">{reportT[language as "pt" | "en"].situation}</th>
                          </tr>
                        </thead>
                        <tbody className="text-xs text-left">
                          {reportRows.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="text-center py-6 text-slate-400 font-bold bg-white">
                                {language === 'pt' ? 'Nenhuma disciplina cadastrada.' : 'No disciplines registered.'}
                              </td>
                            </tr>
                          ) : (
                            reportRows.map((row: any) => {
                              return (
                                <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors bg-white">
                                  {row.moduloSpan > 0 && (
                                    <td rowSpan={row.moduloSpan} className="px-4 py-2.5 font-bold text-slate-900 border-r border-slate-200 text-left bg-white align-middle break-words whitespace-normal leading-tight">
                                      {row.modulo}
                                    </td>
                                  )}
                                  <td className="px-4 py-2.5 font-extrabold text-slate-800 border-r border-slate-200 text-left bg-white align-middle break-words whitespace-normal leading-tight">
                                    {row.disciplina}
                                  </td>
                                  <td className="px-3 py-2.5 text-center font-black font-mono border-r border-slate-200 text-slate-900 bg-white align-middle animate-fade-in">
                                    {row.nota}
                                  </td>
                                  <td className={cn("px-4 py-2.5 text-right font-black bg-white align-middle break-words whitespace-normal leading-tight", row.statusClass)}>
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
                      const firstDisc = sortedDisciplines[0];
                      const firstGrade = firstDisc ? (reportData.grades || []).find((g: any) => g.disciplina_id === firstDisc.id) : null;

                      const computedDisciplines = sortedDisciplines.map((disc: any, discIdx: number) => {
                        const moduleNum = disc.modulo_index || (discIdx + 1);
                        let finalGradeValue = null;
                        if (firstGrade && moduleNum !== null) {
                          const modularGradeValue = firstGrade[`nota${moduleNum}`];
                          if (modularGradeValue !== null && modularGradeValue !== undefined && modularGradeValue !== '') {
                            finalGradeValue = Number(modularGradeValue);
                          }
                        }
                        if (finalGradeValue === null) {
                          const directGrade = (reportData.grades || []).find((g: any) => g.disciplina_id === disc.id);
                          finalGradeValue = directGrade ? directGrade.nota_final : null;
                        }
                        let freqValue = null;
                        if (firstGrade && firstGrade.frequencia !== null && firstGrade.frequencia !== undefined) {
                          freqValue = firstGrade.frequencia;
                        } else {
                          const directGrade = (reportData.grades || []).find((g: any) => g.disciplina_id === disc.id);
                          freqValue = directGrade ? directGrade.frequencia : null;
                        }
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
                                  key={att.id || ind} 
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
                      const firstDisc = sortedDisciplines[0];
                      const firstGrade = firstDisc ? (reportData.grades || []).find((g: any) => g.disciplina_id === firstDisc.id) : null;

                      const computedDisciplines = sortedDisciplines.map((disc: any, discIdx: number) => {
                        const moduleNum = disc.modulo_index || (discIdx + 1);
                        let finalGradeValue = null;
                        if (firstGrade && moduleNum !== null) {
                          const modularGradeValue = firstGrade[`nota${moduleNum}`];
                          if (modularGradeValue !== null && modularGradeValue !== undefined && modularGradeValue !== '') {
                            finalGradeValue = Number(modularGradeValue);
                          }
                        }
                        if (finalGradeValue === null) {
                          const directGrade = (reportData.grades || []).find((g: any) => g.disciplina_id === disc.id);
                          finalGradeValue = directGrade ? directGrade.nota_final : null;
                        }
                        let freqValue = null;
                        if (firstGrade && firstGrade.frequencia !== null && firstGrade.frequencia !== undefined) {
                          freqValue = firstGrade.frequencia;
                        } else {
                          const directGrade = (reportData.grades || []).find((g: any) => g.disciplina_id === disc.id);
                          freqValue = directGrade ? directGrade.frequencia : null;
                        }
                        return { finalGradeValue, freqValue };
                      });

                      const validFinalGrades = computedDisciplines.filter((cd: any) => cd.finalGradeValue !== null && cd.finalGradeValue !== undefined);
                      const averageGrade = validFinalGrades.length > 0
                        ? validFinalGrades.reduce((sum, cd) => sum + cd.finalGradeValue, 0) / validFinalGrades.length
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
                          overallClass = 'bg-rose-100 text-rose-700';
                        } else if (hasReprovedDiscipline) {
                          overallLabel = language === 'pt' ? 'REPROVADO POR NOTA' : 'FAILED BY ACADEMICS';
                          overallClass = 'bg-red-100 text-red-700';
                        } else if (averageGrade >= settings.media_aprovacao) {
                          overallLabel = reportT[language as "pt" | "en"].approved;
                          overallClass = 'bg-emerald-100 text-emerald-700 font-extrabold';
                        } else if (averageGrade >= settings.media_recuperacao) {
                          overallLabel = reportT[language as "pt" | "en"].retake;
                          overallClass = 'bg-yellow-100 text-yellow-700';
                        } else {
                          overallLabel = reportT[language as "pt" | "en"].reproved;
                          overallClass = 'bg-rose-100 text-rose-700';
                        }
                      }

                      return (
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-center text-xs p-1">
                            <span className="font-extrabold text-slate-500 uppercase text-[9px] tracking-wide">{reportT[language as "pt" | "en"].overallAverage}:</span>
                            <span className={cn(
                              "font-black font-mono text-base px-2 py-0.5 rounded",
                              averageGrade !== null && averageGrade >= settings.media_aprovacao ? "text-blue-600 bg-blue-50" : "text-rose-600 bg-rose-50"
                            )}>
                              {averageGrade !== null ? averageGrade.toFixed(2) : '-'}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-xs p-1 border-t border-slate-100">
                            <span className="font-extrabold text-slate-500 uppercase text-[9px] tracking-wide">{reportT[language as "pt" | "en"].overallStatus}:</span>
                            <span className={cn(
                              "text-[10px] font-black uppercase px-2.5 py-1 rounded",
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
                    {selectedTurma && boletimData.length > 0 && (isAdmin || profile?.role === 'instrutor') && (
                      <Link
                        href={`/notas?turmaId=${selectedTurma}${selectedCurso ? `&cursoId=${selectedCurso}` : ''}`}
                        className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-[10.5px] font-black uppercase tracking-wider transition-all border border-emerald-200 cursor-pointer"
                        title={language === 'pt' ? 'Ir para Lançamento de Notas' : 'Go to Grade Entry'}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
                          <path d="m9 11 3 3L22 4"/>
                          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                        </svg>
                        <span>{language === 'pt' ? 'Lançar Notas' : 'Launch Grades'}</span>
                      </Link>
                    )}
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
                        <th key={i} className="px-1 lg:px-3 py-4 text-center">MOD {i + 1}</th>
                      ))}
                      <th className="px-2 lg:px-6 py-4 text-center">{t.reportCard.average}</th>
                      <th className="px-2 lg:px-6 py-4 text-center">{language === 'pt' ? 'Situação' : 'Status'}</th>

                      <th className="px-3 lg:px-6 py-4 text-right print:hidden">{language === 'pt' ? 'Ações' : 'Actions'}</th>
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
                         <tr key={row.id} className={cn("border-b border-slate-50 hover:bg-slate-50/40 transition-colors group", row.nota_final !== null && row.nota_final !== undefined && Number(row.nota_final) === maxAvgInBoletim && maxAvgInBoletim > 0 && "bg-blue-50/50")}>
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
                               <td key={i} className="px-3 py-4 text-center font-mono text-sm text-slate-500">
                                 {notaValue !== null && notaValue !== undefined ? Number(notaValue).toFixed(1) : '-'}
                               </td>
                             );
                           })}
                           <td className="px-6 py-4 text-center">
                              <span className={cn("font-bold font-mono text-sm", (row.nota_final || 0) >= settings.media_aprovacao ? "text-blue-600" : (row.nota_final || 0) >= settings.media_recuperacao ? "text-yellow-600" : "text-red-500")}>
                                {row.nota_final?.toFixed(1) || '-'}
                              </span>
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
                              className="flex items-start justify-center overflow-visible mt-4 mx-auto"
                              style={{ 
                                height: `${1123 * scale}px`,
                                width: `${794 * scale}px`,
                              }}
                            >
                              {/* Scaled frame box */}
                              <div 
                                style={{ 
                                  transform: `scale(${scale})`, 
                                  transformOrigin: 'top center',
                                  width: '210mm',
                                  height: '297mm',
                                  minWidth: '210mm',
                                  minHeight: '297mm',
                                }}
                                className="shadow-2xl flex-shrink-0 transition-transform duration-100 ease-out bg-white rounded-lg overflow-hidden relative"
                              >
                                {/* THE INDIVIDUAL REPORT PRINT CONTAINER */}
                                <div 
                                   id="student-report-print-area"
                                   className="w-[210mm] bg-white text-slate-900 p-8 flex flex-col justify-between font-sans relative text-left text-xs box-border border border-slate-100 overflow-y-auto scrollbar-thin cursor-pointer select-none transition-all duration-200 group/report hover:border-blue-400/40"
                                   onClick={handleCopyAsImage}
                                   title={language === 'pt' ? 'Clique com o botão esquerdo para copiar o Histórico como imagem' : 'Left click to copy Transcript as image'}
                                   style={{ height: '297mm', maxHeight: '297mm' }}
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
                                        width: 190mm !important;
                                        max-width: 190mm !important;
                                        min-height: 277mm !important;
                                        height: auto !important;
                                        max-height: none !important;
                                        margin: 0 auto !important;
                                        padding: 0 !important;
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
                                      #student-report-print-area .w-24.h-24 {
                                        width: 60px !important;
                                        height: 60px !important;
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
                                  <div className="flex items-center justify-between pb-4 border-b border-slate-950">
                                    <div className="flex items-center gap-4">
                                      <div className="relative w-24 h-24 shrink-0 flex items-center justify-center overflow-hidden bg-white">
                                        <Image
                                          src={navalMissionLogo}
                                          alt="Logo Missão de Assessoria Naval"
                                          fill
                                          className="object-contain"
                                          referrerPolicy="no-referrer"
                                          sizes="96px"
                                          priority
                                        />
                                      </div>
                                      <div className="text-left flex flex-col justify-center">
                                        <h1 className="text-sm font-black tracking-widest text-slate-900 uppercase leading-none">
                                          {reportT[language as "pt" | "en"].headerTitle}
                                        </h1>
                                        <p className="text-[9px] font-black tracking-widest text-slate-500 uppercase mt-1 leading-none">
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
                                      <span className="text-[8px] font-black tracking-widest text-slate-400 uppercase leading-none">Matrícula</span>
                                      <span className="text-xs font-mono font-black text-slate-800 mt-1 leading-tight">#{reportData.student.matricula}</span>
                                    </div>
                                    <div className="col-span-2 flex flex-col gap-0.5 mt-2 pt-1.5 border-t border-slate-200/60">
                                      <span className="text-[8px] font-black tracking-widest text-slate-400 uppercase leading-none">{reportT[language as "pt" | "en"].course}</span>
                                      <span className="text-[10px] font-extrabold text-slate-850 break-words whitespace-normal mt-1 leading-normal">{reportData.courseObj?.nome || (language === 'pt' ? 'Não disponível' : 'Not available')}</span>
                                    </div>
                                    <div className="col-span-1 flex flex-col gap-0.5 mt-2 pt-1.5 border-t border-slate-200/60">
                                      <span className="text-[8px] font-black tracking-widest text-slate-400 uppercase leading-none">{reportT[language as "pt" | "en"].class}</span>
                                      <span className="text-[10px] font-extrabold text-slate-850 break-words whitespace-normal mt-1 leading-normal">{reportData.classObj?.nome || (language === 'pt' ? 'Não disponível' : 'Not available')}</span>
                                    </div>
                                    <div className="col-span-1 flex flex-col gap-0.5 mt-2 pt-1.5 border-t border-slate-200/60">
                                      <span className="text-[8px] font-black tracking-widest text-slate-400 uppercase leading-none">{reportT[language as "pt" | "en"].period}</span>
                                      <span className="text-[10px] font-extrabold text-slate-850 uppercase tracking-wide mt-1 leading-normal">
                                        {reportData.classObj?.periodo === 'manhã' ? t.common.morning :
                                         reportData.classObj?.periodo === 'tarde' ? t.common.afternoon :
                                         reportData.classObj?.periodo === 'noite' ? t.common.night : reportData.classObj?.periodo}
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

                                        const rows = sortedDisciplines.map((disc: any, discIdx: number) => {
                                          const firstDisc = sortedDisciplines[0];
                                          const firstGrade = firstDisc ? (reportData?.grades || []).find((g: any) => g.disciplina_id === firstDisc.id) : null;
                                          const moduleNum = disc.modulo_index || (discIdx + 1);

                                          let finalGradeValue = null;
                                          if (firstGrade && moduleNum !== null) {
                                            const modularGradeValue = firstGrade[`nota${moduleNum}`];
                                            if (modularGradeValue !== null && modularGradeValue !== undefined && modularGradeValue !== '') {
                                              finalGradeValue = Number(modularGradeValue);
                                            }
                                          }

                                          if (finalGradeValue === null) {
                                            const directGrade = (reportData?.grades || []).find((g: any) => g.disciplina_id === disc.id);
                                            finalGradeValue = directGrade ? directGrade.nota_final : null;
                                          }

                                          let freqValue = null;
                                          if (firstGrade && firstGrade.frequencia !== null && firstGrade.frequencia !== undefined) {
                                            freqValue = firstGrade.frequencia;
                                          } else {
                                            const directGrade = (reportData?.grades || []).find((g: any) => g.disciplina_id === disc.id);
                                            freqValue = directGrade ? directGrade.frequencia : null;
                                          }

                                          const finalGradeFormatted = finalGradeValue !== null && finalGradeValue !== undefined ? Number(finalGradeValue).toFixed(1) : '-';

                                          let statusLabel = '';
                                          let statusClass = '';
                                          
                                          if (finalGradeValue === null || finalGradeValue === undefined) {
                                            const expirationDate = reportData.classObj?.data_postergacao || reportData.classObj?.data_fim;
                                             const todayStr = format(new Date(), 'yyyy-MM-dd');
                                             const isClassExpired = expirationDate ? expirationDate < todayStr : false;

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
                                            id: disc.id,
                                            modulo: `Módulo ${disc.modulo_index || 1}`,
                                            moduloRaw: disc.modulo_index || 1,
                                            disciplina: disc.nome,
                                            nota: finalGradeFormatted,
                                            situacao: statusLabel,
                                            statusClass,
                                          };
                                        });

                                        const rowsWithSpans: any[] = [];
                                        for (let i = 0; i < rows.length; i++) {
                                          const row = { ...rows[i], moduloSpan: 0 };
                                          if (i === 0 || rows[i].modulo !== rows[i - 1].modulo) {
                                            let span = 1;
                                            while (i + span < rows.length && rows[i + span].modulo === rows[i].modulo) {
                                              span++;
                                            }
                                            row.moduloSpan = span;
                                          }
                                          rowsWithSpans.push(row);
                                        }

                                        return (
                                          <table className="w-full text-left border-collapse bg-white table-auto">
                                            <thead>
                                              <tr className="bg-slate-900 text-[8px] font-black text-white uppercase tracking-widest border-b border-slate-850">
                                                <th className="px-3.5 py-2 border-r border-slate-800 w-[15%]">{language === 'pt' ? 'Módulo' : 'Module'}</th>
                                                <th className="px-3.5 py-2 border-r border-slate-800 w-[50%]">{language === 'pt' ? 'Disciplina' : 'Discipline'}</th>
                                                <th className="px-1 py-2 text-center border-r border-slate-800 w-[5%]">{""}</th>
                                                <th className="px-3.5 py-2 text-center border-r border-slate-800 font-mono w-[15%]">{reportT[language as "pt" | "en"].finalGrade}</th>
                                                <th className="px-3.5 py-2 text-right w-[15%]">{reportT[language as "pt" | "en"].situation}</th>
                                              </tr>
                                            </thead>
                                            <tbody className="text-[10px]">
                                              {rowsWithSpans.length === 0 ? (
                                                <tr>
                                                  <td colSpan={5} className="text-center py-4 text-slate-400 font-bold bg-white">
                                                    {language === 'pt' ? 'Nenhuma disciplina lançada.' : 'No modules submitted.'}
                                                  </td>
                                                </tr>
                                              ) : (
                                                rowsWithSpans.map((row: any) => (
                                                  <tr key={row.id} className="border-b border-slate-200 bg-white">
                                                    {row.moduloSpan > 0 && (
                                                      <td rowSpan={row.moduloSpan} className="px-3.5 py-1.5 font-black text-slate-900 border-r border-slate-250 bg-slate-50/70 align-middle break-words whitespace-normal leading-tight text-center">
                                                        {row.modulo}
                                                      </td>
                                                    )}
                                                    <td className="px-3.5 py-1.5 font-bold text-slate-800 border-r border-slate-200 bg-white align-middle break-words whitespace-normal leading-tight">
                                                      {row.disciplina}
                                                    </td>
                                                    {row.moduloSpan > 0 && (
                                                      <>
                                                        <td rowSpan={row.moduloSpan} className="px-1 py-1 text-center border-r border-slate-200 bg-white align-middle" style={{ verticalAlign: 'middle' }}>
                                                          <div className="flex items-center justify-center h-full w-full">
                                                            <svg className="w-3 text-slate-400 stroke-current fill-none" viewBox="0 0 10 100" preserveAspectRatio="none" style={{ height: `${row.moduloSpan * 22}px`, minHeight: '22px' }}>
                                                              <path d="M1,2 Q6,2 6,15 T6,45 Q6,50 10,50 Q6,50 6,55 T6,85 Q6,98 1,98" strokeWidth="1.5" strokeLinecap="round" />
                                                            </svg>
                                                          </div>
                                                        </td>
                                                        <td rowSpan={row.moduloSpan} className="px-3.5 py-1.5 text-center font-black font-mono border-r border-slate-200 text-slate-900 bg-white align-middle break-words whitespace-normal leading-tight">
                                                          {row.nota}
                                                        </td>
                                                        <td rowSpan={row.moduloSpan} className="px-3.5 py-1.5 text-right bg-white align-middle break-words whitespace-normal leading-tight">
                                                          <span className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase inline-block border", row.statusClass)}>
                                                            {row.situacao}
                                                          </span>
                                                        </td>
                                                      </>
                                                    )}
                                                  </tr>
                                                ))
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
                                        const firstGrade = firstDisc ? (reportData.grades || []).find((g: any) => g.disciplina_id === firstDisc.id) : null;

                                        const computedDisciplines = sortedDisciplines.map((disc: any, discIdx: number) => {
                                          const moduleNum = disc.modulo_index || (discIdx + 1);
                                          let finalGradeValue = null;
                                          if (firstGrade && moduleNum !== null) {
                                            const modularGradeValue = firstGrade[`nota${moduleNum}`];
                                            if (modularGradeValue !== null && modularGradeValue !== undefined && modularGradeValue !== '') {
                                              finalGradeValue = Number(modularGradeValue);
                                            }
                                          }
                                          if (finalGradeValue === null) {
                                            const directGrade = (reportData.grades || []).find((g: any) => g.disciplina_id === disc.id);
                                            finalGradeValue = directGrade ? directGrade.nota_final : null;
                                          }
                                          let freqValue = null;
                                          if (firstGrade && firstGrade.frequencia !== null && firstGrade.frequencia !== undefined) {
                                            freqValue = firstGrade.frequencia;
                                          } else {
                                            const directGrade = (reportData.grades || []).find((g: any) => g.disciplina_id === disc.id);
                                            freqValue = directGrade ? directGrade.frequencia : null;
                                          }
                                          return { finalGradeValue, freqValue };
                                        });

                                        const validFinalGrades = computedDisciplines.filter((cd: any) => cd.finalGradeValue !== null && cd.finalGradeValue !== undefined);
                                        const averageGrade = validFinalGrades.length > 0
                                          ? validFinalGrades.reduce((sum, cd) => sum + cd.finalGradeValue, 0) / validFinalGrades.length
                                          : null;

                                        const expirationDate = reportData.classObj?.data_postergacao || reportData.classObj?.data_fim;
                                         const todayStr = format(new Date(), 'yyyy-MM-dd');
                                         const isClassExpired = expirationDate ? expirationDate < todayStr : false;

                                         let overallLabel = language === 'pt' ? 'EM DESENVOLVIMENTO' : 'UNDER REVIEW';
                                         let overallClass = 'bg-slate-100 text-slate-700 border border-slate-200/60';

                                         if (averageGrade === null && isClassExpired) {
                                           overallLabel = language === 'pt' ? 'NÃO CONCLUIU O CURSO' : 'COURSE NOT COMPLETED';
                                           overallClass = 'bg-rose-50 text-rose-700 border border-rose-150 font-black';
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
                                            overallClass = 'bg-rose-50 text-rose-700 border border-rose-150';
                                          } else if (hasReprovedDiscipline) {
                                            overallLabel = language === 'pt' ? 'REP. NOTA' : 'FAILED ACADEMICS';
                                            overallClass = 'bg-rose-50 text-rose-700 border border-rose-150';
                                          } else if (averageGrade >= settings.media_aprovacao) {
                                            overallLabel = reportT[language as "pt" | "en"].approved;
                                            overallClass = 'bg-emerald-50 text-emerald-700 border border-emerald-150 font-black';
                                          } else if (averageGrade >= settings.media_recuperacao) {
                                            overallLabel = reportT[language as "pt" | "en"].retake;
                                            overallClass = 'bg-amber-50 text-amber-700 border border-amber-150';
                                          } else {
                                            overallLabel = reportT[language as "pt" | "en"].reproved;
                                            overallClass = 'bg-rose-50 text-rose-700 border border-rose-150';
                                          }
                                        }

                                        return (
                                          <div className="flex flex-col gap-2">
                                            <div className="flex items-center justify-between">
                                              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide leading-none">{reportT[language as "pt" | "en"].overallAverage}:</span>
                                              <span className="text-[11px] font-black font-mono px-1.5 py-0.5 rounded bg-blue-50 border border-blue-105 text-blue-700">
                                                {averageGrade !== null ? averageGrade.toFixed(2) : '-'}
                                              </span>
                                            </div>

                                            <div className="flex items-center justify-between border-t border-slate-200/60 pt-1.5">
                                              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide leading-none">{reportT[language as "pt" | "en"].overallStatus}:</span>
                                              <span className={cn("text-[8px] font-black uppercase px-2 py-0.5 rounded", overallClass)}>
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

                                  {/* Double Signature Panel */}
                                  <div className="grid grid-cols-2 gap-10 pt-3 mt-1.5 border-t border-dashed border-slate-300">
                                    <div className="flex flex-col items-center text-center">
                                      <div className="w-44 border-b border-slate-400 h-5"></div>
                                      <span className="text-[8px] font-black text-slate-700 uppercase mt-1 tracking-wider leading-none">{reportT[language as "pt" | "en"].signatureInstructor}</span>
                                      <span className="text-[7px] font-bold text-slate-400 uppercase mt-0.5 leading-none">{language === 'pt' ? 'Assinatura Autorizada' : 'Authorized Signature'}</span>
                                    </div>
                                    <div className="flex flex-col items-center text-center">
                                      <div className="w-44 border-b border-slate-400 h-5"></div>
                                      <span className="text-[8px] font-black text-slate-700 uppercase mt-1 tracking-wider leading-none">{reportT[language as "pt" | "en"].signatureStudent}</span>
                                      <span className="text-[7px] font-bold text-slate-400 uppercase mt-0.5 leading-none">{language === 'pt' ? 'Assinatura do Aluno' : 'Student Endorsement'}</span>
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
                          onClick={() => setSelectedStudentForReport(null)}
                          className="bg-slate-800 hover:bg-slate-700 px-5 py-2.5 rounded-xl text-xs font-bold text-slate-300 transition-all cursor-pointer"
                        >
                          {reportT[language as "pt" | "en"].close}
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
