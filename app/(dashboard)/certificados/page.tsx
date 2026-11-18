'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Award,
  Printer,
  Download,
  Save,
  Plus,
  Trash2,
  RefreshCw,
  Users,
  FileText,
  Image as ImageIcon,
  Layers,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Search,
  CheckCircle2,
  Loader2,
  Upload,
  RotateCcw,
  BookmarkCheck,
  Sparkles,
  Eye,
  CheckSquare,
  Square,
  Bold,
  Italic,
  Maximize2,
  Minimize2,
  X,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Move,
  Link2,
  Unlink,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { useCursos, useTurmas, useDisciplinas } from '@/hooks/useCachedData';
import { useUser } from '@/lib/auth/UserContext';
import { fetchWithAuth } from '@/lib/api';
import { cn, getCleanTurmaName } from '@/lib/utils';
import { getHtml2Canvas, savePDFWithDialog } from '@/lib/printDocumentUtils';
import {
  CertificateCourseScope,
  CertificateDisciplineRow,
  CertificateStudentContext,
  CertificateTemplateConfig,
  computeBackTotals,
  createPresetTemplate,
  extractModuleNumberFromRow,
  formatCertificateGradePT,
  formatCourseTitleCasePT,
  formatDateExtensoPT,
  formatNameTitleCasePT,
  formatPeriodStartEndPT,
  groupCertificateRowsByModule,
  groupCourseDisciplinesByModule,
  resolveBoletimDisciplineGrade,
} from '@/lib/certificateTypes';
import { CertificateSheet } from '@/components/CertificateSheet';

const LOCAL_TEMPLATES_KEY = 'sge_saved_certificate_templates_v1';
const LAST_WORKSPACE_KEY = 'sge_certificate_last_workspace_v1';

function getTemplateSaveSignature(t: CertificateTemplateConfig): string {
  return JSON.stringify({
    ...t,
    id: undefined,
  });
}

interface SavedTemplateRecord {
  id: string;
  turma_id?: string | null;
  curso_id?: string | null;
  template_data: CertificateTemplateConfig;
  created_at?: string;
  data_emissao?: string;
}

interface CertificateWorkspaceSnapshot {
  template: CertificateTemplateConfig;
  turmaScopeFilter: 'all' | 'expedito' | 'formacao';
  selectedTurmaId: string;
  selectedStudentId: string;
  associateTurmaId: string;
  editorTab: 'frente' | 'verso' | 'visual' | 'modelos';
  previewMode: 'both' | 'front' | 'back';
  manualZoom: number;
  customStudentRank: string;
  customStudentName: string;
  customCourseName: string;
  useTurmaStudentGrades: boolean;
  syncTurmaDatesOnAssociate: boolean;
  updatedAt: string;
}

export default function CertificadosPage() {
  const { isAdmin, isInstrutor, isConvidado } = useUser();
  const canEdit = isAdmin || isInstrutor;
  const { cursos } = useCursos();
  const { turmas, loading: loadingTurmas } = useTurmas();
  const { disciplinas } = useDisciplinas();

  // Template & Editor State
  const [template, setTemplate] = useState<CertificateTemplateConfig>(() =>
    createPresetTemplate('formacao_marinheiros')
  );
  const [editorTab, setEditorTab] = useState<'frente' | 'verso' | 'visual' | 'modelos'>('frente');
  const [previewMode, setPreviewMode] = useState<'both' | 'front' | 'back'>('both');
  const [manualZoom, setManualZoom] = useState<number>(100);
  const [dragMoveEnabled, setDragMoveEnabled] = useState<boolean>(false);
  const [fullscreenPreview, setFullscreenPreview] = useState<boolean>(false);
  const [fullscreenLayout, setFullscreenLayout] = useState<'stacked' | 'sideBySide'>('stacked');
  const [fullscreenZoom, setFullscreenZoom] = useState<number>(100);
  const [viewportSize, setViewportSize] = useState<{ w: number; h: number }>({
    w: 1440,
    h: 900,
  });
  const [autoFitWidth, setAutoFitWidth] = useState<number>(720);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Class & Student Selection State
  const [turmaScopeFilter, setTurmaScopeFilter] = useState<'all' | 'expedito' | 'formacao'>('all');
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>('');
  const [turmaStudents, setTurmaStudents] = useState<any[]>([]);
  const [turmaGradesMap, setTurmaGradesMap] = useState<Record<string, any[]>>({});
  const [turmaCourseTopics, setTurmaCourseTopics] = useState<any[]>([]);
  const [loadingTurmaData, setLoadingTurmaData] = useState(false);

  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [studentSearch, setStudentSearch] = useState('');
  const [batchSelectedIds, setBatchSelectedIds] = useState<string[]>([]);

  // Manual/standalone student override (used when no turma/student is selected, or edited directly)
  const [customStudentRank, setCustomStudentRank] = useState('1º Cabo');
  const [customStudentName, setCustomStudentName] = useState(
    'Catiana Quaresma dos Santos Espírito'
  );
  const [customCourseName, setCustomCourseName] = useState('Curso de Formação de Marinheiros');
  const [useTurmaStudentGrades, setUseTurmaStudentGrades] = useState(true);

  // Saved templates & turma association
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplateRecord[]>([]);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [associateTurmaId, setAssociateTurmaId] = useState<string>('');
  const [associatingTurma, setAssociatingTurma] = useState(false);
  const [syncTurmaDatesOnAssociate, setSyncTurmaDatesOnAssociate] = useState(false);
  const [workspaceHydrated, setWorkspaceHydrated] = useState(false);
  const [templatesHydrated, setTemplatesHydrated] = useState(false);
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<string | null>(null);
  const skipNextTurmaAutoLoadRef = useRef(false);
  const prevSelectedTurmaIdRef = useRef<string>('');
  const restoredFromWorkspaceRef = useRef<boolean>(false);
  const restoredTurmaIdRef = useRef<string | null>(null);
  const preferredStudentIdRef = useRef<string | null>(null);
  const autoAppliedLatestServerRef = useRef<boolean>(false);
  const lastSavedSignatureRef = useRef<string>('');
  const initializedAutoSaveBaselineRef = useRef<boolean>(false);
  const autoSaveInFlightRef = useRef<boolean>(false);
  const autoSaveQueuedTemplateRef = useRef<CertificateTemplateConfig | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAutoSaveErrorAtRef = useRef<number>(0);
  const turmasRef = useRef<any[]>(turmas || []);
  turmasRef.current = turmas || [];
  const savedTemplatesRef = useRef<SavedTemplateRecord[]>(savedTemplates);
  savedTemplatesRef.current = savedTemplates;
  const selectedTurmaIdRef = useRef<string>(selectedTurmaId);
  selectedTurmaIdRef.current = selectedTurmaId;

  // Export states
  const [exportingPDF, setExportingPDF] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(
    null
  );
  const [batchRenderTarget, setBatchRenderTarget] = useState<{
    student: CertificateStudentContext;
  } | null>(null);

  // Auto-fit preview scale based on container width
  useEffect(() => {
    const el = previewContainerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 200) {
          setAutoFitWidth(w - 32);
        }
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!fullscreenPreview) return;
    const updateSize = () =>
      setViewportSize({ w: window.innerWidth, h: window.innerHeight });
    updateSize();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreenPreview(false);
    };
    window.addEventListener('resize', updateSize);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [fullscreenPreview]);

  const baseScale = Math.min(1, Math.max(0.28, autoFitWidth / 1123));
  const effectiveScale = Math.min(1.15, Math.max(0.25, baseScale * (manualZoom / 100)));
  const fullscreenBaseScale =
    previewMode === 'both' && fullscreenLayout === 'sideBySide'
      ? Math.min(
          1.0,
          Math.max(0.28, Math.min((viewportSize.w - 88) / (1123 * 2 + 24), (viewportSize.h - 170) / 794))
        )
      : Math.min(
          1.25,
          Math.max(0.35, Math.min((viewportSize.w - 64) / 1123, (viewportSize.h - 155) / 794))
        );
  const fullscreenEffectiveScale = Math.min(
    1.35,
    Math.max(0.25, fullscreenBaseScale * (fullscreenZoom / 100))
  );

  // Load saved templates on mount
  const loadSavedTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    let localItems: SavedTemplateRecord[] = [];
    try {
      const raw = localStorage.getItem(LOCAL_TEMPLATES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) localItems = parsed;
      }
    } catch {
      // ignore storage errors
    }

    try {
      const res = await fetchWithAuth('/api/certificados');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.templates) && json.templates.length > 0) {
          setSavedTemplates(json.templates);
          try {
            localStorage.setItem(LOCAL_TEMPLATES_KEY, JSON.stringify(json.templates));
          } catch {
            // ignore storage quota errors
          }
          setLoadingTemplates(false);
          setTemplatesHydrated(true);
          return;
        }
      }
    } catch {
      // fallback to local items
    }

    setSavedTemplates(localItems);
    setLoadingTemplates(false);
    setTemplatesHydrated(true);
  }, []);

  // Restore last worked certificate model, selected turma, student and UI preferences on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LAST_WORKSPACE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<CertificateWorkspaceSnapshot>;
        if (parsed && parsed.template && typeof parsed.template === 'object') {
          restoredFromWorkspaceRef.current = true;
          const basePreset = createPresetTemplate(
            parsed.template.scope || 'formacao_marinheiros'
          );
          setTemplate({
            ...basePreset,
            ...parsed.template,
          });
          if (
            parsed.turmaScopeFilter === 'all' ||
            parsed.turmaScopeFilter === 'expedito' ||
            parsed.turmaScopeFilter === 'formacao'
          ) {
            setTurmaScopeFilter(parsed.turmaScopeFilter);
          }
          if (typeof parsed.selectedTurmaId === 'string') {
            setSelectedTurmaId(parsed.selectedTurmaId);
            if (parsed.selectedTurmaId) {
              restoredTurmaIdRef.current = parsed.selectedTurmaId;
            }
          }
          if (typeof parsed.selectedStudentId === 'string' && parsed.selectedStudentId) {
            preferredStudentIdRef.current = parsed.selectedStudentId;
          }
          if (typeof parsed.associateTurmaId === 'string') {
            setAssociateTurmaId(parsed.associateTurmaId);
          }
          if (
            parsed.editorTab === 'frente' ||
            parsed.editorTab === 'verso' ||
            parsed.editorTab === 'visual' ||
            parsed.editorTab === 'modelos'
          ) {
            setEditorTab(parsed.editorTab);
          }
          if (
            parsed.previewMode === 'both' ||
            parsed.previewMode === 'front' ||
            parsed.previewMode === 'back'
          ) {
            setPreviewMode(parsed.previewMode);
          }
          if (typeof parsed.manualZoom === 'number' && parsed.manualZoom >= 60) {
            setManualZoom(parsed.manualZoom);
          }
          if (typeof parsed.customStudentRank === 'string') {
            setCustomStudentRank(parsed.customStudentRank);
          }
          if (typeof parsed.customStudentName === 'string') {
            setCustomStudentName(parsed.customStudentName);
          }
          if (typeof parsed.customCourseName === 'string') {
            setCustomCourseName(parsed.customCourseName);
          }
          if (typeof parsed.useTurmaStudentGrades === 'boolean') {
            setUseTurmaStudentGrades(parsed.useTurmaStudentGrades);
          }
          if (typeof parsed.syncTurmaDatesOnAssociate === 'boolean') {
            setSyncTurmaDatesOnAssociate(parsed.syncTurmaDatesOnAssociate);
          }
        }
      }
    } catch {
      // ignore corrupted storage
    } finally {
      setWorkspaceHydrated(true);
    }
  }, []);

  useEffect(() => {
    loadSavedTemplates();
  }, [loadSavedTemplates]);

  // Continuously persist active model, selected turma, student and preferences so reopening restores exact state
  useEffect(() => {
    if (!workspaceHydrated) return;

    const snapshot: CertificateWorkspaceSnapshot = {
      template,
      turmaScopeFilter,
      selectedTurmaId,
      selectedStudentId,
      associateTurmaId,
      editorTab,
      previewMode,
      manualZoom,
      customStudentRank,
      customStudentName,
      customCourseName,
      useTurmaStudentGrades,
      syncTurmaDatesOnAssociate,
      updatedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(LAST_WORKSPACE_KEY, JSON.stringify(snapshot));
    } catch {
      // Fallback if uploaded inline data URLs exceed localStorage quota: strip oversized data URLs (>250KB)
      try {
        const shrink = (url?: string) =>
          url && url.startsWith('data:') && url.length > 250_000 ? '' : url;
        const compactTemplate: CertificateTemplateConfig = {
          ...template,
          molduraFrenteUrl: shrink(template.molduraFrenteUrl),
          logoEsquerdaUrl: shrink(template.logoEsquerdaUrl) || '',
          logoDireitaUrl: shrink(template.logoDireitaUrl) || '',
          marcaDaguaFrenteUrl: shrink(template.marcaDaguaFrenteUrl) || '',
          marcaDaguaVersoUrl: shrink(template.marcaDaguaVersoUrl) || '',
        };
        localStorage.setItem(
          LAST_WORKSPACE_KEY,
          JSON.stringify({ ...snapshot, template: compactTemplate })
        );
      } catch {
        // ignore storage quota errors
      }
    }
  }, [
    workspaceHydrated,
    template,
    turmaScopeFilter,
    selectedTurmaId,
    selectedStudentId,
    associateTurmaId,
    editorTab,
    previewMode,
    manualZoom,
    customStudentRank,
    customStudentName,
    customCourseName,
    useTurmaStudentGrades,
    syncTurmaDatesOnAssociate,
  ]);

  // Filter Turmas for Expeditos and Formação de Marinheiros / All
  const filteredTurmas = useMemo(() => {
    const nonArchived = (turmas || []).filter((t: any) => {
      const st = String(t.status || '').toLowerCase();
      return !t.arquivada && st !== 'arquivada' && st !== 'cancelada';
    });

    if (turmaScopeFilter === 'expedito') {
      return nonArchived.filter((t: any) => {
        const tCat = String(t.categoria || '').toLowerCase();
        const cCat = String(t.curso?.categoria || '').toLowerCase();
        const cName = String(t.curso?.nome || t.nome || '').toLowerCase();
        return tCat === 'expedito' || cCat === 'expedito' || cName.includes('expedito');
      });
    }

    if (turmaScopeFilter === 'formacao') {
      return nonArchived.filter((t: any) => {
        const tCat = String(t.categoria || '').toLowerCase();
        const cCat = String(t.curso?.categoria || '').toLowerCase();
        const cName = String(t.curso?.nome || t.nome || '').toLowerCase();
        return (
          cName.includes('marinheiro') ||
          cName.includes('formação') ||
          cName.includes('formacao') ||
          tCat === 'carreira' ||
          cCat === 'carreira'
        );
      });
    }

    return nonArchived;
  }, [turmas, turmaScopeFilter]);

  const allActiveTurmas = useMemo(() => {
    return (turmas || []).filter((t: any) => {
      const st = String(t.status || '').toLowerCase();
      return !t.arquivada && st !== 'arquivada' && st !== 'cancelada';
    });
  }, [turmas]);

  const getTurmaDisplayLabel = useCallback(
    (turmaId?: string | null) => {
      if (!turmaId) return '';
      const found = (turmas || []).find((t: any) => t.id === turmaId);
      if (!found) return '';
      return `${getCleanTurmaName(found.nome)}${found.curso?.nome ? ` — ${found.curso.nome}` : ''}${found.ano ? ` (${found.ano})` : ''}`;
    },
    [turmas]
  );

  const selectedTurmaObj = useMemo(
    () => (turmas || []).find((t: any) => t.id === selectedTurmaId) || null,
    [turmas, selectedTurmaId]
  );

  const selectedCourseObj = useMemo(() => {
    if (!selectedTurmaObj) return null;
    return (cursos || []).find((c: any) => c.id === selectedTurmaObj.curso_id) || selectedTurmaObj.curso || null;
  }, [cursos, selectedTurmaObj]);

  const turmaCourseDisciplines = useMemo(() => {
    if (!selectedTurmaObj?.curso_id) return [];
    return (disciplinas || [])
      .filter((d: any) => d.curso_id === selectedTurmaObj.curso_id && !d.deleted_at)
      .sort((a: any, b: any) => {
        const modDiff = (a.modulo_index || 1) - (b.modulo_index || 1);
        if (modDiff !== 0) return modDiff;
        return String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR');
      });
  }, [disciplinas, selectedTurmaObj]);

  const courseTotalModules = useMemo(() => {
    const raw = selectedCourseObj?.qtd_modulos || selectedTurmaObj?.curso?.qtd_modulos || 4;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 20) : 4;
  }, [selectedCourseObj, selectedTurmaObj]);

  // Load materias_modulos topics for the selected course to resolve modulo_index when absent on disciplinas
  useEffect(() => {
    if (turmaCourseDisciplines.length === 0) {
      setTurmaCourseTopics([]);
      return;
    }
    let cancelled = false;
    const discIds = turmaCourseDisciplines.map((d: any) => d.id).filter(Boolean);
    if (discIds.length === 0) return;

    supabase
      .from('materias_modulos')
      .select('id, disciplina_id, modulo_index, ordem')
      .in('disciplina_id', discIds)
      .is('deleted_at', null)
      .order('modulo_index', { ascending: true })
      .then(({ data }) => {
        if (!cancelled && data) {
          setTurmaCourseTopics(data);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [turmaCourseDisciplines]);

  // Build discipline/grade rows for any student in the selected turma faithfully matching Boletim Individual
  const buildStudentRowsFromGrades = useCallback(
    (studentId: string, gradesOverride?: any[]): CertificateDisciplineRow[] => {
      const studentGrades = gradesOverride ?? turmaGradesMap[studentId] ?? [];

      if (turmaCourseDisciplines.length === 0) {
        const baseRows =
          template.disciplinas && template.disciplinas.length > 0
            ? template.disciplinas
            : Array.from({ length: courseTotalModules }, (_, idx) => ({
                id: `mod-${idx + 1}`,
                modulo: idx + 1,
                nome: `MÓDULO ${idx + 1}.`,
                carga_horaria: '—',
                nota: '-',
              }));

        return baseRows.map((row, idx) => {
          const modNum = extractModuleNumberFromRow(row) ?? idx + 1;
          const gradeVal = resolveBoletimDisciplineGrade(
            null,
            modNum,
            studentGrades,
            courseTotalModules
          );
          return {
            ...row,
            modulo: modNum,
            nota: formatCertificateGradePT(gradeVal),
          };
        });
      }

      if (template.agruparPorModulos !== false) {
        return groupCourseDisciplinesByModule(
          turmaCourseDisciplines,
          studentGrades,
          turmaCourseTopics,
          courseTotalModules
        );
      }

      return turmaCourseDisciplines.map((disc: any, idx: number) => {
        let modNum = Number(disc.modulo_index);
        if (!Number.isFinite(modNum) || modNum <= 0) {
          const discTopics = (turmaCourseTopics || []).filter(
            (t: any) => t.disciplina_id === disc.id
          );
          const validMods = discTopics
            .map((t: any) => Number(t.modulo_index))
            .filter((m: number) => Number.isFinite(m) && m > 0);
          modNum = validMods.length > 0 ? Math.min(...validMods) : 1;
        }

        const gradeVal = resolveBoletimDisciplineGrade(
          disc,
          modNum,
          studentGrades,
          courseTotalModules
        );

        const ch = disc.carga_horaria ? `${disc.carga_horaria}h` : '—';
        return {
          id: disc.id || `disc-${idx}`,
          modulo: modNum,
          nome: String(disc.nome || `MÓDULO ${modNum}`).toUpperCase(),
          carga_horaria: ch,
          nota: formatCertificateGradePT(gradeVal),
        };
      });
    },
    [
      turmaCourseDisciplines,
      turmaGradesMap,
      turmaCourseTopics,
      courseTotalModules,
      template.disciplinas,
      template.agruparPorModulos,
    ]
  );

  // Load students and grades when a turma is selected
  useEffect(() => {
    if (!selectedTurmaId) {
      setTurmaStudents([]);
      setTurmaGradesMap({});
      setSelectedStudentId('');
      setBatchSelectedIds([]);
      return;
    }

    let cancelled = false;
    const loadTurmaData = async () => {
      setLoadingTurmaData(true);
      try {
        const [{ data: alunosData }, notasRes] = await Promise.all([
          supabase
            .from('alunos')
            .select('*')
            .eq('turma_id', selectedTurmaId)
            .is('deleted_at', null)
            .order('nome', { ascending: true }),
          fetchWithAuth(`/api/v1/notas?turmaId=${selectedTurmaId}`),
        ]);

        if (cancelled) return;

        const studentsList = alunosData || [];
        setTurmaStudents(studentsList);
        setBatchSelectedIds(studentsList.map((s: any) => s.id));
        const preferredId = preferredStudentIdRef.current;
        if (preferredId && studentsList.some((s: any) => s.id === preferredId)) {
          setSelectedStudentId(preferredId);
        } else if (studentsList.length > 0) {
          setSelectedStudentId(studentsList[0].id);
        } else {
          setSelectedStudentId('');
        }
        preferredStudentIdRef.current = null;

        let gradesArr: any[] = [];
        if (notasRes.ok) {
          gradesArr = await notasRes.json();
        }
        if (!gradesArr || gradesArr.length === 0) {
          const { data: rawNotas } = await supabase
            .from('notas')
            .select('*')
            .eq('turma_id', selectedTurmaId);
          gradesArr = rawNotas || [];
        }

        const grouped: Record<string, any[]> = {};
        for (const g of gradesArr || []) {
          if (!grouped[g.aluno_id]) grouped[g.aluno_id] = [];
          grouped[g.aluno_id].push(g);
        }
        setTurmaGradesMap(grouped);
      } catch (err) {
        console.error('Erro ao carregar alunos/notas da turma:', err);
        toast.error('Erro ao carregar alunos e notas da turma.');
      } finally {
        if (!cancelled) setLoadingTurmaData(false);
      }
    };

    loadTurmaData();
    return () => {
      cancelled = true;
    };
  }, [selectedTurmaId]);

  // Keep associateTurmaId pre-filled when selecting a turma at the top
  useEffect(() => {
    if (selectedTurmaId) {
      setAssociateTurmaId(selectedTurmaId);
    }
  }, [selectedTurmaId]);

  // If opening in a clean browser with no local workspace yet, auto-open the latest saved model & its turma
  useEffect(() => {
    if (
      !workspaceHydrated ||
      restoredFromWorkspaceRef.current ||
      autoAppliedLatestServerRef.current ||
      loadingTemplates ||
      loadingTurmas ||
      savedTemplates.length === 0
    ) {
      return;
    }

    autoAppliedLatestServerRef.current = true;
    const latest = savedTemplates[0];
    if (!latest?.template_data) return;

    const linkedTurmaId = latest.turma_id || latest.template_data.turmaId || null;
    const activeTargetTurma = linkedTurmaId
      ? allActiveTurmas.find((t: any) => t.id === linkedTurmaId)
      : null;

    if (activeTargetTurma) {
      restoredTurmaIdRef.current = activeTargetTurma.id;
      setSelectedTurmaId(activeTargetTurma.id);
      setAssociateTurmaId(activeTargetTurma.id);
    }

    const basePreset = createPresetTemplate(
      latest.template_data.scope || 'formacao_marinheiros'
    );
    const loadedTemplate: CertificateTemplateConfig = {
      ...basePreset,
      ...latest.template_data,
      id: latest.id,
      turmaId: activeTargetTurma ? activeTargetTurma.id : linkedTurmaId,
    };
    lastSavedSignatureRef.current = getTemplateSaveSignature(loadedTemplate);
    initializedAutoSaveBaselineRef.current = true;
    setTemplate(loadedTemplate);
  }, [
    workspaceHydrated,
    loadingTemplates,
    loadingTurmas,
    savedTemplates,
    allActiveTurmas,
  ]);

  // Clear restored selectedTurmaId only if that turma no longer exists among active turmas
  useEffect(() => {
    if (!workspaceHydrated || !selectedTurmaId || (turmas || []).length === 0) return;
    const stillActive = allActiveTurmas.some((t: any) => t.id === selectedTurmaId);
    if (!stillActive) {
      setSelectedTurmaId('');
      restoredTurmaIdRef.current = null;
    }
  }, [workspaceHydrated, selectedTurmaId, turmas, allActiveTurmas]);

  // Auto-adapt template dates & course scope when switching to another turma
  useEffect(() => {
    if (!selectedTurmaObj) {
      prevSelectedTurmaIdRef.current = '';
      return;
    }

    const courseDisplay = selectedCourseObj?.nome || getCleanTurmaName(selectedTurmaObj.nome);
    const formattedCourseTitleCase = formatCourseTitleCasePT(courseDisplay);

    // When restoring the last opened workspace or latest saved template on reopen, preserve the restored model untouched
    if (restoredTurmaIdRef.current && selectedTurmaObj.id === restoredTurmaIdRef.current) {
      restoredTurmaIdRef.current = null;
      prevSelectedTurmaIdRef.current = selectedTurmaObj.id;
      setCustomCourseName((prev) => prev || formattedCourseTitleCase);
      return;
    }

    const turmaChanged = prevSelectedTurmaIdRef.current !== selectedTurmaObj.id;
    prevSelectedTurmaIdRef.current = selectedTurmaObj.id;

    if (skipNextTurmaAutoLoadRef.current) {
      skipNextTurmaAutoLoadRef.current = false;
      setCustomCourseName(formattedCourseTitleCase);
      return;
    }

    // Avoid resetting current editor state when savedTemplates refreshes after saving for the same turma
    if (!turmaChanged && template.turmaId === selectedTurmaObj.id) {
      return;
    }

    const tCat = String(selectedTurmaObj.categoria || '').toLowerCase();
    const cCat = String(selectedCourseObj?.categoria || '').toLowerCase();
    const cName = String(selectedCourseObj?.nome || selectedTurmaObj.nome || '').toLowerCase();
    const isExpedito = tCat === 'expedito' || cCat === 'expedito' || cName.includes('expedito');
    const targetScope: CertificateCourseScope = isExpedito ? 'expedito' : 'formacao_marinheiros';

    const period = formatPeriodStartEndPT(
      selectedTurmaObj.data_inicio,
      selectedTurmaObj.data_fim
    );

    // Check if there is already a saved template specifically for this turma
    const matchingSaved = savedTemplates.find((st) => st.turma_id === selectedTurmaObj.id);
    if (matchingSaved?.template_data) {
      const loadedTurmaTemplate: CertificateTemplateConfig = {
        ...matchingSaved.template_data,
        id: matchingSaved.id,
        turmaId: selectedTurmaObj.id,
      };
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      lastSavedSignatureRef.current = getTemplateSaveSignature(loadedTurmaTemplate);
      initializedAutoSaveBaselineRef.current = true;
      setTemplate(loadedTurmaTemplate);
      setCustomCourseName(formattedCourseTitleCase);
      return;
    }

    if (!turmaChanged) return;

    setCustomCourseName(formattedCourseTitleCase);
    setTemplate((prev) => {
      const groupedOrFlat =
        turmaCourseDisciplines.length > 0
          ? prev.agruparPorModulos !== false
            ? groupCourseDisciplinesByModule(
                turmaCourseDisciplines,
                [],
                turmaCourseTopics,
                courseTotalModules
              )
            : turmaCourseDisciplines.map((d: any, idx: number) => ({
                id: d.id || `disc-${idx}`,
                modulo: d.modulo_index || 1,
                nome: String(d.nome || `MÓDULO ${d.modulo_index || 1}`).toUpperCase(),
                carga_horaria: d.carga_horaria ? `${d.carga_horaria}h` : '—',
                nota: '-',
              }))
          : prev.disciplinas;

      return {
        ...prev,
        scope: targetScope,
        turmaId: selectedTurmaObj.id,
        cursoId: selectedTurmaObj.curso_id || null,
        textoCorpoPorAluno: {},
        textoPeriodoInicio: period.inicio,
        textoPeriodoFim: period.fim,
        dataEmissaoExtenso: period.fim || formatDateExtensoPT(new Date()),
        versoTituloCurso: courseDisplay.toUpperCase(),
        disciplinas: groupedOrFlat,
      };
    });
  }, [
    selectedTurmaObj,
    selectedCourseObj,
    turmaCourseDisciplines,
    turmaCourseTopics,
    courseTotalModules,
    savedTemplates,
    template.turmaId,
  ]);

  const filteredTurmaStudents = useMemo(() => {
    if (!studentSearch.trim()) return turmaStudents;
    const q = studentSearch.trim().toLowerCase();
    return turmaStudents.filter(
      (s: any) =>
        String(s.nome || '').toLowerCase().includes(q) ||
        String(s.posto_graduacao || '').toLowerCase().includes(q) ||
        String(s.nome_guerra || '').toLowerCase().includes(q) ||
        String(s.matricula || '').toLowerCase().includes(q)
    );
  }, [turmaStudents, studentSearch]);

  const buildStudentContext = useCallback(
    (alunoObj: any | null): CertificateStudentContext => {
      if (!alunoObj) {
        const formattedRank = formatNameTitleCasePT(customStudentRank);
        const formattedName = formatNameTitleCasePT(customStudentName);
        const display = `${formattedRank} ${formattedName}`.trim();
        return {
          nomeCompleto: formattedName,
          postoGraduacao: formattedRank,
          nomeExibicao: display,
          cursoNome: formatCourseTitleCasePT(
            customCourseName || 'Curso de Formação de Marinheiros'
          ),
          turmaNome: selectedTurmaObj ? getCleanTurmaName(selectedTurmaObj.nome) : '',
          dataInicioExtenso: template.textoPeriodoInicio,
          dataFimExtenso: template.textoPeriodoFim,
          mediaFinalNumero: null,
          disciplinas: template.disciplinas,
        };
      }

      const rank = formatNameTitleCasePT(String(alunoObj.posto_graduacao || '').trim());
      const fullName = formatNameTitleCasePT(String(alunoObj.nome || '').trim());
      const display = rank ? `${rank} ${fullName}` : fullName;

      const studentRows =
        useTurmaStudentGrades && alunoObj?.id
          ? buildStudentRowsFromGrades(alunoObj.id)
          : template.disciplinas;

      const customBodyText =
        alunoObj?.id &&
        template.textoCorpoPorAluno &&
        Object.prototype.hasOwnProperty.call(template.textoCorpoPorAluno, alunoObj.id)
          ? template.textoCorpoPorAluno[alunoObj.id]
          : undefined;

      return {
        id: alunoObj.id,
        nomeCompleto: fullName,
        postoGraduacao: rank,
        nomeExibicao: display,
        cursoNome: formatCourseTitleCasePT(
          selectedCourseObj?.nome ||
            customCourseName ||
            'Curso de Formação de Marinheiros'
        ),
        turmaNome: selectedTurmaObj ? getCleanTurmaName(selectedTurmaObj.nome) : '',
        dataInicioExtenso: template.textoPeriodoInicio,
        dataFimExtenso: template.textoPeriodoFim,
        mediaFinalNumero: null,
        disciplinas: studentRows,
        textoCorpoPersonalizado: customBodyText,
      };
    },
    [
      customStudentRank,
      customStudentName,
      customCourseName,
      selectedTurmaObj,
      selectedCourseObj,
      template.textoPeriodoInicio,
      template.textoPeriodoFim,
      template.disciplinas,
      template.textoCorpoPorAluno,
      useTurmaStudentGrades,
      buildStudentRowsFromGrades,
    ]
  );

  const selectedStudentObj = useMemo(
    () => turmaStudents.find((s: any) => s.id === selectedStudentId) || null,
    [turmaStudents, selectedStudentId]
  );

  const activeStudentContext = useMemo(
    () => buildStudentContext(selectedStudentObj),
    [buildStudentContext, selectedStudentObj]
  );

  const hasCustomBodyForStudent = useCallback(
    (studentId?: string | null) =>
      Boolean(
        studentId &&
          template.textoCorpoPorAluno &&
          Object.prototype.hasOwnProperty.call(template.textoCorpoPorAluno, studentId)
      ),
    [template.textoCorpoPorAluno]
  );

  const isEditingIndividualBody = Boolean(
    selectedStudentObj?.id && hasCustomBodyForStudent(selectedStudentObj.id)
  );

  const activeBodyTextValue =
    isEditingIndividualBody && selectedStudentObj?.id
      ? (template.textoCorpoPorAluno?.[selectedStudentObj.id] ?? '')
      : template.textoCorpo;

  const customBodyStudentsCount = useMemo(() => {
    if (!template.textoCorpoPorAluno) return 0;
    if (turmaStudents.length > 0) {
      const validIds = new Set(turmaStudents.map((s: any) => s.id));
      return Object.keys(template.textoCorpoPorAluno).filter((id) => validIds.has(id)).length;
    }
    return Object.keys(template.textoCorpoPorAluno).length;
  }, [template.textoCorpoPorAluno, turmaStudents]);

  const updateActiveBodyText = useCallback(
    (updater: string | ((current: string) => string)) => {
      setTemplate((prev) => {
        const studentId = selectedStudentObj?.id;
        const hasCustom =
          Boolean(studentId) &&
          Boolean(prev.textoCorpoPorAluno) &&
          Object.prototype.hasOwnProperty.call(prev.textoCorpoPorAluno, studentId as string);

        if (hasCustom && studentId) {
          const current = prev.textoCorpoPorAluno?.[studentId] ?? '';
          const nextValue = typeof updater === 'function' ? updater(current) : updater;
          return {
            ...prev,
            textoCorpoPorAluno: {
              ...(prev.textoCorpoPorAluno || {}),
              [studentId]: nextValue,
            },
          };
        }

        const current = prev.textoCorpo || '';
        const nextValue = typeof updater === 'function' ? updater(current) : updater;
        return {
          ...prev,
          textoCorpo: nextValue,
        };
      });
    },
    [selectedStudentObj?.id]
  );

  const handleEnableIndividualBody = useCallback(() => {
    if (!selectedStudentObj?.id) return;
    const studentId = selectedStudentObj.id;
    setTemplate((prev) => {
      if (
        prev.textoCorpoPorAluno &&
        Object.prototype.hasOwnProperty.call(prev.textoCorpoPorAluno, studentId)
      ) {
        return prev;
      }
      return {
        ...prev,
        textoCorpoPorAluno: {
          ...(prev.textoCorpoPorAluno || {}),
          [studentId]: prev.textoCorpo || '',
        },
      };
    });
    requestAnimationFrame(() => {
      bodyTextareaRef.current?.focus();
    });
  }, [selectedStudentObj?.id]);

  const handleRestoreDefaultBodyForStudent = useCallback(() => {
    if (!selectedStudentObj?.id) return;
    const studentId = selectedStudentObj.id;
    setTemplate((prev) => {
      if (!prev.textoCorpoPorAluno || !Object.prototype.hasOwnProperty.call(prev.textoCorpoPorAluno, studentId)) {
        return prev;
      }
      const nextMap = { ...prev.textoCorpoPorAluno };
      delete nextMap[studentId];
      return {
        ...prev,
        textoCorpoPorAluno: nextMap,
      };
    });
    toast.success('Texto padrão da turma restaurado para este aluno.');
  }, [selectedStudentObj?.id]);

  // Sync template.disciplinas and refresh fresh Boletim grades from current student/turma
  const handleSyncDisciplinesFromTurma = async () => {
    if (!selectedTurmaObj) {
      toast.info('Selecione uma turma primeiro para sincronizar disciplinas e notas.');
      return;
    }

    let freshGrouped = turmaGradesMap;
    try {
      const notasRes = await fetchWithAuth(`/api/v1/notas?turmaId=${selectedTurmaObj.id}`);
      let gradesArr: any[] = [];
      if (notasRes.ok) {
        gradesArr = await notasRes.json();
      }
      if (!gradesArr || gradesArr.length === 0) {
        const { data: rawNotas } = await supabase
          .from('notas')
          .select('*')
          .eq('turma_id', selectedTurmaObj.id);
        gradesArr = rawNotas || [];
      }
      const grouped: Record<string, any[]> = {};
      for (const g of gradesArr || []) {
        if (!grouped[g.aluno_id]) grouped[g.aluno_id] = [];
        grouped[g.aluno_id].push(g);
      }
      freshGrouped = grouped;
      setTurmaGradesMap(grouped);
    } catch {
      // keep existing cached grades on transient network error
    }

    const freshStudentGrades = selectedStudentObj ? freshGrouped[selectedStudentObj.id] || [] : [];
    const rows = selectedStudentObj
      ? buildStudentRowsFromGrades(selectedStudentObj.id, freshStudentGrades)
      : turmaCourseDisciplines.length === 0
        ? template.disciplinas
        : template.agruparPorModulos !== false
          ? groupCourseDisciplinesByModule(
              turmaCourseDisciplines,
              [],
              turmaCourseTopics,
              courseTotalModules
            )
          : turmaCourseDisciplines.map((d: any, idx: number) => ({
              id: d.id || `disc-${idx}`,
              modulo: d.modulo_index || 1,
              nome: String(d.nome || `MÓDULO ${d.modulo_index || 1}`).toUpperCase(),
              carga_horaria: d.carga_horaria ? `${d.carga_horaria}h` : '—',
              nota: '-',
            }));

    setTemplate((prev) => ({
      ...prev,
      disciplinas: rows,
    }));
    toast.success(
      template.agruparPorModulos !== false
        ? 'Módulos, cargas horárias e notas do Boletim sincronizados!'
        : 'Disciplinas, cargas horárias e notas do Boletim sincronizadas!'
    );
  };

  // Apply preset
  const handleApplyPreset = (scope: CertificateCourseScope) => {
    const preset = createPresetTemplate(scope);
    if (selectedTurmaObj) {
      const period = formatPeriodStartEndPT(
        selectedTurmaObj.data_inicio,
        selectedTurmaObj.data_fim
      );
      const cName = selectedCourseObj?.nome || getCleanTurmaName(selectedTurmaObj.nome);
      preset.turmaId = selectedTurmaObj.id;
      preset.cursoId = selectedTurmaObj.curso_id || null;
      preset.textoPeriodoInicio = period.inicio;
      preset.textoPeriodoFim = period.fim;
      preset.dataEmissaoExtenso = period.fim || formatDateExtensoPT(new Date());
      preset.versoTituloCurso = cName.toUpperCase();
    } else {
      setCustomCourseName(
        scope === 'expedito' ? 'Curso Expedito de Operações Navais' : 'Curso de Formação de Marinheiros'
      );
    }
    setTemplate(preset);
    toast.success(
      scope === 'expedito'
        ? 'Modelo base de Cursos Expeditos carregado!'
        : 'Modelo base de Formação de Marinheiros carregado!'
    );
  };

  // Discipline row actions
  const handleAddDisciplineRow = () => {
    setTemplate((prev) => {
      const nextMod = prev.disciplinas.length + 1;
      return {
        ...prev,
        disciplinas: [
          ...prev.disciplinas,
          {
            id: `custom-${Date.now()}`,
            modulo: nextMod,
            nome: `MÓDULO ${nextMod} - NOVA DISCIPLINA.`,
            carga_horaria: '20h',
            nota: '18.0',
          },
        ],
      };
    });
  };

  const handleUpdateDisciplineRow = (
    idx: number,
    field: keyof CertificateDisciplineRow,
    val: string | number | null
  ) => {
    setTemplate((prev) => ({
      ...prev,
      disciplinas: prev.disciplinas.map((r, i) => (i === idx ? { ...r, [field]: val } : r)),
    }));
  };

  const handleConsolidateTemplateRowsByModule = () => {
    setTemplate((prev) => ({
      ...prev,
      agruparPorModulos: true,
      disciplinas: groupCertificateRowsByModule(prev.disciplinas),
    }));
    toast.success('Disciplinas consolidadas por módulo no editor!');
  };

  const handleRemoveDisciplineRow = (idx: number) => {
    setTemplate((prev) => ({
      ...prev,
      disciplinas: prev.disciplinas.filter((_, i) => i !== idx),
    }));
  };

  const handleMoveDisciplineRow = (idx: number, dir: -1 | 1) => {
    setTemplate((prev) => {
      const next = [...prev.disciplinas];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return { ...prev, disciplinas: next };
    });
  };

  // Image file upload helper
  const handleImageUpload = (
    field:
      | 'molduraFrenteUrl'
      | 'logoEsquerdaUrl'
      | 'logoDireitaUrl'
      | 'marcaDaguaFrenteUrl'
      | 'marcaDaguaVersoUrl',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = String(ev.target?.result || '');
      if (dataUrl) {
        setTemplate((prev) => ({
          ...prev,
          [field]: dataUrl,
          ...(field === 'logoDireitaUrl' ? { mostrarLegendaLogoDireita: false } : {}),
        }));
        toast.success('Imagem aplicada ao modelo do certificado!');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Persist template cleanly (used by debounced auto-save and manual save triggers)
  const persistTemplateRecord = useCallback(
    async (
      targetTemplate: CertificateTemplateConfig,
      options?: { silent?: boolean }
    ) => {
      if (!canEdit) {
        if (!options?.silent) {
          toast.error('Usuário com acesso somente leitura.');
        }
        return;
      }

      if (autoSaveInFlightRef.current) {
        autoSaveQueuedTemplateRef.current = targetTemplate;
        return;
      }

      autoSaveInFlightRef.current = true;
      setSavingTemplate(true);
      const targetSignature = getTemplateSaveSignature(targetTemplate);

      try {
        const currentTurmas = turmasRef.current;
        const currentSaved = savedTemplatesRef.current;
        const targetTurmaId = targetTemplate.turmaId ?? (selectedTurmaIdRef.current || null);
        const targetTurmaForCourse = targetTurmaId
          ? currentTurmas.find((t: any) => t.id === targetTurmaId)
          : null;

        const existingForTarget = targetTurmaId
          ? currentSaved.find((st) => st.turma_id === targetTurmaId)
          : null;
        const existingById = targetTemplate.id
          ? currentSaved.find((st) => st.id === targetTemplate.id)
          : null;
        const safeId =
          existingById && existingById.turma_id && existingById.turma_id !== targetTurmaId
            ? existingForTarget?.id
            : targetTemplate.id || existingForTarget?.id;

        const payloadToSave: CertificateTemplateConfig = {
          ...targetTemplate,
          id: safeId,
          turmaId: targetTurmaId,
          cursoId: targetTurmaForCourse?.curso_id || targetTemplate.cursoId || null,
        };

        const res = await fetchWithAuth('/api/certificados', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: safeId,
            turma_id: payloadToSave.turmaId,
            curso_id: payloadToSave.cursoId,
            template_data: payloadToSave,
          }),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || 'Erro ao salvar modelo.');
        }

        const savedId = json.data?.id || safeId || `local-${Date.now()}`;
        const finalSavedPayload: CertificateTemplateConfig = {
          ...payloadToSave,
          id: savedId,
        };
        const record: SavedTemplateRecord = {
          id: savedId,
          turma_id: payloadToSave.turmaId,
          curso_id: payloadToSave.cursoId,
          template_data: finalSavedPayload,
          created_at: json.data?.created_at || new Date().toISOString(),
        };

        lastSavedSignatureRef.current = targetSignature;

        setTemplate((prev) => {
          if (
            prev.id === savedId &&
            prev.turmaId === payloadToSave.turmaId &&
            prev.cursoId === payloadToSave.cursoId
          ) {
            return prev;
          }
          return {
            ...prev,
            id: savedId,
            turmaId: payloadToSave.turmaId,
            cursoId: payloadToSave.cursoId,
          };
        });

        setSavedTemplates((prev) => {
          const filtered = prev.filter(
            (item) =>
              item.id !== savedId &&
              (!payloadToSave.turmaId || item.turma_id !== payloadToSave.turmaId)
          );
          const updated = [record, ...filtered];
          try {
            localStorage.setItem(LOCAL_TEMPLATES_KEY, JSON.stringify(updated));
          } catch {
            // ignore storage quota errors on large images
          }
          return updated;
        });

        setLastAutoSavedAt(
          new Date().toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          })
        );

        if (!options?.silent) {
          toast.success('Modelo de certificado salvo com sucesso!');
        }
      } catch (err: any) {
        console.error('Erro ao salvar certificado:', err);
        const now = Date.now();
        if (!options?.silent || now - lastAutoSaveErrorAtRef.current > 30_000) {
          lastAutoSaveErrorAtRef.current = now;
          toast.error(err?.message || 'Erro ao salvar modelo automaticamente.');
        }
      } finally {
        autoSaveInFlightRef.current = false;
        setSavingTemplate(false);

        const queued = autoSaveQueuedTemplateRef.current;
        autoSaveQueuedTemplateRef.current = null;
        if (queued && getTemplateSaveSignature(queued) !== lastSavedSignatureRef.current) {
          void persistTemplateRecord(queued, { silent: true });
        }
      }
    },
    [canEdit]
  );

  // Automatic debounced saving whenever certificate template is edited
  useEffect(() => {
    if (!workspaceHydrated || !templatesHydrated) return;

    const currentSig = getTemplateSaveSignature(template);

    if (!initializedAutoSaveBaselineRef.current) {
      initializedAutoSaveBaselineRef.current = true;
      const currentSaved = savedTemplatesRef.current;
      const matchingById = template.id
        ? currentSaved.find((st) => st.id === template.id)
        : undefined;
      const matchingByTurma = template.turmaId
        ? currentSaved.find((st) => st.turma_id === template.turmaId)
        : undefined;
      const serverMatch = matchingById || matchingByTurma;

      if (
        (serverMatch?.template_data &&
          getTemplateSaveSignature(serverMatch.template_data) === currentSig) ||
        (!restoredFromWorkspaceRef.current && currentSaved.length === 0 && !template.id)
      ) {
        lastSavedSignatureRef.current = currentSig;
        return;
      }
    }

    if (currentSig === lastSavedSignatureRef.current) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      autoSaveTimerRef.current = null;
      if (!canEdit) return;
      void persistTemplateRecord(template, { silent: true });
    }, 900);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [template, workspaceHydrated, templatesHydrated, canEdit, persistTemplateRecord]);

  // Save Template (manual helper)
  const handleSaveTemplate = async () => {
    await persistTemplateRecord(template, { silent: false });
  };

  // Associate the current working model (or a specific saved model) with any chosen Turma
  const handleAssociateTemplateToTurma = async (
    targetTurmaIdParam?: string,
    overrideTemplate?: CertificateTemplateConfig
  ) => {
    const targetTurmaId = targetTurmaIdParam || associateTurmaId;
    if (!targetTurmaId) {
      toast.info('Selecione a turma que deseja associar a este modelo.');
      return;
    }

    const targetTurmaObj = (turmas || []).find((t: any) => t.id === targetTurmaId);
    if (!targetTurmaObj) {
      toast.error('Turma selecionada não encontrada.');
      return;
    }

    const baseTemplate = overrideTemplate || template;
    const targetCourseObj =
      (cursos || []).find((c: any) => c.id === targetTurmaObj.curso_id) ||
      targetTurmaObj.curso ||
      null;
    const tCat = String(targetTurmaObj.categoria || '').toLowerCase();
    const cCat = String(targetCourseObj?.categoria || '').toLowerCase();
    const cName = String(targetCourseObj?.nome || targetTurmaObj.nome || '').toLowerCase();
    const isExpedito = tCat === 'expedito' || cCat === 'expedito' || cName.includes('expedito');
    const targetScope: CertificateCourseScope = isExpedito ? 'expedito' : 'formacao_marinheiros';
    const courseDisplay = targetCourseObj?.nome || getCleanTurmaName(targetTurmaObj.nome);

    let associatedTemplate: CertificateTemplateConfig = {
      ...baseTemplate,
      scope: targetScope,
      turmaId: targetTurmaId,
      cursoId: targetTurmaObj.curso_id || null,
    };

    if (syncTurmaDatesOnAssociate) {
      const period = formatPeriodStartEndPT(targetTurmaObj.data_inicio, targetTurmaObj.data_fim);
      const targetDisciplines = (disciplinas || [])
        .filter((d: any) => d.curso_id === targetTurmaObj.curso_id)
        .sort((a: any, b: any) => {
          const modDiff = (a.modulo_index || 1) - (b.modulo_index || 1);
          if (modDiff !== 0) return modDiff;
          return String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR');
        });

      associatedTemplate = {
        ...associatedTemplate,
        textoPeriodoInicio: period.inicio,
        textoPeriodoFim: period.fim,
        dataEmissaoExtenso: period.fim || associatedTemplate.dataEmissaoExtenso,
        versoTituloCurso: courseDisplay.toUpperCase(),
        disciplinas:
          targetDisciplines.length > 0
            ? associatedTemplate.agruparPorModulos !== false
              ? groupCourseDisciplinesByModule(targetDisciplines, [], [])
              : targetDisciplines.map((d: any, idx: number) => ({
                  id: d.id || `disc-${idx}`,
                  modulo: d.modulo_index || idx + 1,
                  nome: String(d.nome || `MÓDULO ${d.modulo_index || idx + 1}`).toUpperCase(),
                  carga_horaria: d.carga_horaria ? `${d.carga_horaria}h` : '—',
                  nota: '-',
                }))
            : associatedTemplate.disciplinas,
      };
    }

    if (!canEdit) {
      skipNextTurmaAutoLoadRef.current = true;
      setTemplate(associatedTemplate);
      setSelectedTurmaId(targetTurmaId);
      setAssociateTurmaId(targetTurmaId);
      setCustomCourseName(formatCourseTitleCasePT(courseDisplay));
      toast.success(
        `Modelo aplicado na sessão para a turma ${getCleanTurmaName(targetTurmaObj.nome)}!`
      );
      return;
    }

    setAssociatingTurma(true);
    try {
      const existingForTarget = savedTemplates.find((st) => st.turma_id === targetTurmaId);
      const existingById = baseTemplate.id
        ? savedTemplates.find((st) => st.id === baseTemplate.id)
        : null;
      const targetRecordId =
        existingForTarget?.id ||
        (existingById && (!existingById.turma_id || existingById.turma_id === targetTurmaId)
          ? existingById.id
          : undefined);

      const payloadToSave: CertificateTemplateConfig = {
        ...associatedTemplate,
        id: targetRecordId,
      };

      const res = await fetchWithAuth('/api/certificados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: targetRecordId,
          turma_id: targetTurmaId,
          curso_id: targetTurmaObj.curso_id || null,
          template_data: payloadToSave,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Erro ao associar modelo à turma.');
      }

      const savedId = json.data?.id || targetRecordId || `local-${Date.now()}`;
      const finalTemplate: CertificateTemplateConfig = {
        ...payloadToSave,
        id: savedId,
      };
      const record: SavedTemplateRecord = {
        id: savedId,
        turma_id: targetTurmaId,
        curso_id: targetTurmaObj.curso_id || null,
        template_data: finalTemplate,
        created_at: json.data?.created_at || new Date().toISOString(),
      };

      skipNextTurmaAutoLoadRef.current = true;
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      lastSavedSignatureRef.current = getTemplateSaveSignature(finalTemplate);
      initializedAutoSaveBaselineRef.current = true;
      setTemplate(finalTemplate);
      setLastAutoSavedAt(
        new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
      setSavedTemplates((prev) => {
        const filtered = prev.filter(
          (item) => item.id !== savedId && item.turma_id !== targetTurmaId
        );
        const updated = [record, ...filtered];
        try {
          localStorage.setItem(LOCAL_TEMPLATES_KEY, JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });
      setSelectedTurmaId(targetTurmaId);
      setAssociateTurmaId(targetTurmaId);
      setCustomCourseName(formatCourseTitleCasePT(courseDisplay));

      toast.success(
        `Modelo associado e salvo para a turma "${getCleanTurmaName(targetTurmaObj.nome)}"!`
      );
    } catch (err: any) {
      console.error('Erro ao associar modelo à turma:', err);
      toast.error(err?.message || 'Erro ao associar modelo à turma.');
    } finally {
      setAssociatingTurma(false);
    }
  };

  const handleUnlinkTemplateTurma = async () => {
    const prevTurmaId = template.turmaId;
    const unlinkedTemplate: CertificateTemplateConfig = {
      ...template,
      turmaId: null,
    };

    if (canEdit && template.id && prevTurmaId) {
      try {
        const res = await fetchWithAuth('/api/certificados', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: template.id,
            turma_id: null,
            curso_id: template.cursoId || null,
            template_data: unlinkedTemplate,
          }),
        });
        if (res.ok) {
          setSavedTemplates((prev) => {
            const updated = prev.map((item) =>
              item.id === template.id
                ? { ...item, turma_id: null, template_data: unlinkedTemplate }
                : item
            );
            try {
              localStorage.setItem(LOCAL_TEMPLATES_KEY, JSON.stringify(updated));
            } catch {
              // ignore
            }
            return updated;
          });
        }
      } catch {
        // ignore network unlink error; still unlink in editor
      }
    }

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    lastSavedSignatureRef.current = getTemplateSaveSignature(unlinkedTemplate);
    initializedAutoSaveBaselineRef.current = true;
    setTemplate(unlinkedTemplate);
    toast.success('Turma desvinculada deste modelo.');
  };

  const handleDeleteSavedTemplate = async (id: string) => {
    if (!canEdit) return;
    try {
      const res = await fetchWithAuth(`/api/certificados?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Erro ao excluir.');
      }

      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }

      if (template.id === id) {
        const detached: CertificateTemplateConfig = {
          ...template,
          id: undefined,
          turmaId: null,
        };
        lastSavedSignatureRef.current = getTemplateSaveSignature(detached);
        initializedAutoSaveBaselineRef.current = true;
        setTemplate(detached);
      }

      setSavedTemplates((prev) => {
        const updated = prev.filter((item) => item.id !== id);
        try {
          localStorage.setItem(LOCAL_TEMPLATES_KEY, JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });
      toast.success('Modelo excluído.');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao excluir modelo.');
    }
  };

  // Helper to capture an export element ID into a PDF page
  const captureElementToPdfPage = async (
    pdf: any,
    elementId: string,
    html2canvas: any,
    addPageBefore: boolean
  ) => {
    const el = document.getElementById(elementId);
    if (!el) throw new Error(`Elemento ${elementId} não encontrado`);

    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
      width: 1123,
      height: 794,
      windowWidth: 1123,
      windowHeight: 794,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.96);
    if (addPageBefore) {
      pdf.addPage('a4', 'landscape');
    }
    pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210, undefined, 'FAST');
  };

  // Download Single PDF (Frente + Verso)
  const handleDownloadIndividualPDF = async () => {
    if (exportingPDF) return;
    setExportingPDF(true);
    const toastId = toast.loading('Gerando Certificado PDF (Frente e Verso)...');

    try {
      const html2canvas = await getHtml2Canvas();
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      if (previewMode === 'back') {
        await captureElementToPdfPage(pdf, 'cert-export-back', html2canvas, false);
      } else if (previewMode === 'front') {
        await captureElementToPdfPage(pdf, 'cert-export-front', html2canvas, false);
      } else {
        await captureElementToPdfPage(pdf, 'cert-export-front', html2canvas, false);
        await captureElementToPdfPage(pdf, 'cert-export-back', html2canvas, true);
      }

      const safeName = (activeStudentContext.nomeCompleto || 'certificado')
        .toLowerCase()
        .replace(/[^a-z0-9]/gi, '_');
      await savePDFWithDialog(pdf, `certificado_${safeName}.pdf`);
      toast.success('Certificado PDF gerado com sucesso!', { id: toastId });
    } catch (err: any) {
      console.error('PDF export error:', err);
      toast.error(err?.message || 'Erro ao gerar PDF do certificado.', { id: toastId });
    } finally {
      setExportingPDF(false);
    }
  };

  // Download Batch PDF for checked students
  const handleDownloadBatchPDF = async () => {
    if (exportingPDF || batchSelectedIds.length === 0) return;
    setExportingPDF(true);

    const targets = turmaStudents.filter((s) => batchSelectedIds.includes(s.id));
    if (targets.length === 0) {
      setExportingPDF(false);
      return;
    }

    const toastId = toast.loading(`Preparando lote de ${targets.length} certificado(s)...`);
    try {
      const html2canvas = await getHtml2Canvas();
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      let firstPage = true;
      for (let i = 0; i < targets.length; i++) {
        setBatchProgress({ current: i + 1, total: targets.length });
        const stCtx = buildStudentContext(targets[i]);
        setBatchRenderTarget({ student: stCtx });

        // Wait 2 animation frames for DOM to update cleanly
        await new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 80)))
        );

        await captureElementToPdfPage(pdf, 'cert-batch-front', html2canvas, !firstPage);
        firstPage = false;
        await captureElementToPdfPage(pdf, 'cert-batch-back', html2canvas, true);
      }

      const turmaSlug = selectedTurmaObj?.nome
        ? getCleanTurmaName(selectedTurmaObj.nome)
            .toLowerCase()
            .replace(/[^a-z0-9]/gi, '_')
        : 'turma';
      await savePDFWithDialog(pdf, `certificados_lote_${turmaSlug}.pdf`);
      toast.success(`Lote de ${targets.length} certificado(s) (Frente e Verso) salvo!`, {
        id: toastId,
      });
    } catch (err: any) {
      console.error('Batch PDF error:', err);
      toast.error(err?.message || 'Erro ao gerar lote de certificados.', { id: toastId });
    } finally {
      setBatchRenderTarget(null);
      setBatchProgress(null);
      setExportingPDF(false);
    }
  };

  // Print Front & Back using dedicated isolated iframe
  const handlePrintCertificate = () => {
    const frontEl = document.getElementById('cert-export-front');
    const backEl = document.getElementById('cert-export-back');
    if (!frontEl && !backEl) {
      toast.error('Pré-visualização do certificado não encontrada.');
      return;
    }

    const existing = document.getElementById('cert-print-iframe');
    if (existing) existing.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'cert-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      window.print();
      return;
    }

    const pagesHtml = [
      previewMode !== 'back' && frontEl
        ? `<div class="cert-page">${frontEl.outerHTML}</div>`
        : '',
      previewMode !== 'front' && backEl
        ? `<div class="cert-page">${backEl.outerHTML}</div>`
        : '',
    ]
      .filter(Boolean)
      .join('');

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Certificado - ${activeStudentContext.nomeCompleto}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;800&family=EB+Garamond:ital,wght@0,400..800;1,400..800&family=Great+Vibes&family=Lora:ital,wght@0,400..700;1,400..700&display=swap" />
        <style>
          @page {
            size: A4 landscape;
            margin: 0;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
          }
          .cert-page {
            width: 297mm;
            height: 210mm;
            overflow: hidden;
            page-break-after: always;
            break-after: page;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .cert-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          .cert-page > div {
            width: 1123px !important;
            height: 794px !important;
            box-shadow: none !important;
            transform: scale(1) !important;
          }
        </style>
      </head>
      <body>${pagesHtml}</body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        window.print();
      }
    }, 350);
  };

  const insertPlaceholder = (token: string) => {
    updateActiveBodyText((prevText) => `${prevText}${prevText.endsWith(' ') ? '' : ' '}${token}`);
  };

  const applyInlineBodyFormat = (marker: '**' | '*' | '***') => {
    const ta = bodyTextareaRef.current;
    const currentText = activeBodyTextValue || '';
    if (!ta) {
      updateActiveBodyText((prevText) => `${prevText} ${marker}trecho destacado${marker}`);
      return;
    }

    const start = ta.selectionStart ?? currentText.length;
    const end = ta.selectionEnd ?? currentText.length;
    const selected = currentText.slice(start, end);

    if (!selected) {
      const sample = marker === '**' ? 'trecho em negrito' : marker === '*' ? 'trecho em itálico' : 'trecho destacado';
      const insertion = `${marker}${sample}${marker}`;
      const updated = `${currentText.slice(0, start)}${insertion}${currentText.slice(end)}`;
      updateActiveBodyText(updated);
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(start + marker.length, start + marker.length + sample.length);
      });
      return;
    }

    let replacement: string;
    if (selected.startsWith(marker) && selected.endsWith(marker) && selected.length > marker.length * 2) {
      replacement = selected.slice(marker.length, -marker.length);
    } else {
      replacement = `${marker}${selected}${marker}`;
    }

    const updated = `${currentText.slice(0, start)}${replacement}${currentText.slice(end)}`;
    updateActiveBodyText(updated);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start, start + replacement.length);
    });
  };

  const currentStudentIndex = turmaStudents.findIndex((s) => s.id === selectedStudentId);
  const rawBackPreviewRows =
    activeStudentContext.disciplinas.length > 0
      ? activeStudentContext.disciplinas
      : template.disciplinas;
  const effectiveBackPreviewRows =
    template.agruparPorModulos !== false
      ? groupCertificateRowsByModule(rawBackPreviewRows)
      : rawBackPreviewRows;
  const { totalHorasLabel, mediaFinalLabel } = computeBackTotals(
    effectiveBackPreviewRows,
    template
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-900 to-indigo-700 text-white flex items-center justify-center shadow-md shrink-0">
            <Award size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Editor e Emissor de Certificados
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Personalize frente, verso, brasões, assinaturas e notas para Cursos Expeditos e Curso de Formação de Marinheiros.
            </p>
          </div>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl shrink-0">
            {savingTemplate ? (
              <>
                <Loader2 size={14} className="animate-spin text-blue-700" />
                <span>Salvando alterações...</span>
              </>
            ) : (
              <>
                <Save size={14} className="text-emerald-600" />
                <span>
                  {lastAutoSavedAt
                    ? `Salvo automaticamente às ${lastAutoSavedAt}`
                    : 'Salvamento automático ativo'}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {isConvidado && (
        <div className="px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-2">
          <Eye size={14} className="shrink-0" />
          <span>
            Modo de visualização: você pode testar pré-visualizações, baixar PDFs e imprimir, mas alterações de modelo não são salvas no servidor.
          </span>
        </div>
      )}

      {/* Turma & Alunos Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Category Scope Filter */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Tipo de Curso / Turma
            </label>
            <select
              value={turmaScopeFilter}
              onChange={(e) => {
                setTurmaScopeFilter(e.target.value as any);
                setSelectedTurmaId('');
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">Todas as Turmas</option>
              <option value="expedito">Cursos Expeditos</option>
              <option value="formacao">Formação de Marinheiros / Carreira</option>
            </select>
          </div>

          {/* Turma Selector */}
          <div className="md:col-span-5 space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Turma Selecionada
            </label>
            <select
              value={selectedTurmaId}
              onChange={(e) => setSelectedTurmaId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">-- Modo Livre / Modelo Base (Sem Turma Vinculada) --</option>
              {filteredTurmas.map((turma: any, idx: number) => (
                <option key={turma.id} value={turma.id}>
                  {idx + 1}. {getCleanTurmaName(turma.nome)} —{' '}
                  {turma.curso?.nome || 'Curso'} ({turma.ano || ''})
                </option>
              ))}
            </select>
          </div>

          {/* Quick Actions */}
          <div className="md:col-span-4 flex flex-wrap items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => {
                setFullscreenZoom(100);
                setFullscreenPreview(true);
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              title="Visualizar frente e verso em tela toda"
            >
              <Maximize2 size={14} />
              <span>Tela Toda</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadIndividualPDF}
              disabled={exportingPDF}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {exportingPDF && !batchProgress ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}
              <span>Baixar PDF (Frente e Verso)</span>
            </button>
          </div>
        </div>

        {/* Associate Working Model to Any Desired Turma */}
        <div className="pt-3 border-t border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200/80">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Link2 size={14} className="text-blue-700 shrink-0" />
              <span>Associação do Modelo Atual:</span>
            </div>
            {template.turmaId ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                <CheckCircle2 size={12} className="shrink-0" />
                <span className="truncate max-w-[320px]">
                  Vinculado à: {getTurmaDisplayLabel(template.turmaId) || 'Turma selecionada'}
                </span>
                <button
                  type="button"
                  onClick={handleUnlinkTemplateTurma}
                  className="ml-1 p-0.5 rounded hover:bg-emerald-200/70 text-emerald-900 cursor-pointer"
                  title="Desvincular turma deste modelo"
                >
                  <Unlink size={11} />
                </button>
              </div>
            ) : (
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-semibold">
                Sem turma associada (modelo livre)
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={associateTurmaId}
              onChange={(e) => setAssociateTurmaId(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 min-w-[230px] max-w-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">-- Escolha a turma para associar --</option>
              {allActiveTurmas.map((turma: any, idx: number) => (
                <option key={turma.id} value={turma.id}>
                  {idx + 1}. {getCleanTurmaName(turma.nome)} — {turma.curso?.nome || 'Curso'} (
                  {turma.ano || ''})
                </option>
              ))}
            </select>

            <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer px-2 py-1 rounded-lg bg-white border border-slate-200">
              <input
                type="checkbox"
                checked={syncTurmaDatesOnAssociate}
                onChange={(e) => setSyncTurmaDatesOnAssociate(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span>Atualizar datas/disciplinas pela turma</span>
            </label>

            <button
              type="button"
              onClick={() => handleAssociateTemplateToTurma()}
              disabled={associatingTurma || !associateTurmaId}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-800 hover:bg-blue-900 text-white shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {associatingTurma ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Link2 size={13} />
              )}
              <span>Associar Modelo à Turma</span>
            </button>
          </div>
        </div>

        {/* Selected Turma Students Strip */}
        {selectedTurmaId && (
          <div className="pt-3 border-t border-slate-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Users size={15} className="text-blue-700" />
                <span className="text-xs font-bold text-slate-800">
                  Alunos da Turma ({turmaStudents.length})
                </span>
                {customBodyStudentsCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
                    <Pencil size={10} />
                    <span>
                      {customBodyStudentsCount}{' '}
                      {customBodyStudentsCount === 1 ? 'com texto individual' : 'com texto individual'}
                    </span>
                  </span>
                )}
                <label className="inline-flex items-center gap-1.5 ml-3 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useTurmaStudentGrades}
                    onChange={(e) => setUseTurmaStudentGrades(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>Usar notas individuais do Boletim no Verso</span>
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search
                    size={13}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Filtrar aluno..."
                    className="pl-7 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg w-44 focus:outline-none"
                  />
                </div>

                {turmaStudents.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (batchSelectedIds.length === turmaStudents.length) {
                          setBatchSelectedIds([]);
                        } else {
                          setBatchSelectedIds(turmaStudents.map((s) => s.id));
                        }
                      }}
                      className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer"
                    >
                      {batchSelectedIds.length === turmaStudents.length
                        ? 'Desmarcar Todos'
                        : 'Selecionar Todos'}
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadBatchPDF}
                      disabled={exportingPDF || batchSelectedIds.length === 0}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-800 hover:bg-blue-900 text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {batchProgress ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          <span>
                            Lote {batchProgress.current}/{batchProgress.total}...
                          </span>
                        </>
                      ) : (
                        <>
                          <Download size={13} />
                          <span>Gerar Lote ({batchSelectedIds.length})</span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>

            {loadingTurmaData ? (
              <div className="py-4 flex items-center justify-center gap-2 text-xs text-slate-500">
                <Loader2 size={15} className="animate-spin" />
                <span>Carregando alunos e notas...</span>
              </div>
            ) : turmaStudents.length === 0 ? (
              <div className="py-3 px-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                Nenhum aluno matriculado nesta turma. Você ainda pode editar o modelo base normalmente.
              </div>
            ) : (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                {filteredTurmaStudents.map((st: any, idx: number) => {
                  const isActive = st.id === selectedStudentId;
                  const isBatchChecked = batchSelectedIds.includes(st.id);
                  const hasCustomText = hasCustomBodyForStudent(st.id);
                  const display = st.posto_graduacao
                    ? `${st.posto_graduacao} ${st.nome}`
                    : st.nome;
                  return (
                    <div
                      key={st.id}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs shrink-0 transition-all',
                        isActive
                          ? 'bg-blue-900 text-white border-blue-950 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      )}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setBatchSelectedIds((prev) =>
                            prev.includes(st.id)
                              ? prev.filter((id) => id !== st.id)
                              : [...prev, st.id]
                          )
                        }
                        className="cursor-pointer opacity-85 hover:opacity-100"
                        title="Incluir no lote de PDF"
                      >
                        {isBatchChecked ? <CheckSquare size={14} /> : <Square size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedStudentId(st.id)}
                        className="font-semibold cursor-pointer text-left max-w-[210px] truncate flex items-center gap-1"
                      >
                        <span className="truncate">
                          {idx + 1}. {display}
                        </span>
                        {hasCustomText && (
                          <span
                            title="Este aluno possui texto individual personalizado"
                            className={cn(
                              'inline-flex items-center justify-center p-0.5 rounded shrink-0',
                              isActive
                                ? 'bg-amber-400 text-slate-950'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            )}
                          >
                            <Pencil size={10} />
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Split: Editor Panel + Live A4 Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Editor Controls */}
        <div className="xl:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Editor Tabs */}
          <div className="grid grid-cols-4 border-b border-slate-200 bg-slate-50">
            {[
              { id: 'frente', label: 'Frente', icon: FileText },
              { id: 'verso', label: 'Verso', icon: Layers },
              { id: 'visual', label: 'Visual', icon: ImageIcon },
              { id: 'modelos', label: 'Modelos', icon: BookmarkCheck },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = editorTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setEditorTab(tab.id as any)}
                  className={cn(
                    'py-3 px-2 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer',
                    active
                      ? 'border-blue-800 text-blue-900 bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  )}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="p-5 space-y-5 max-h-[820px] overflow-y-auto custom-scrollbar">
            {/* TAB 1: FRENTE */}
            {editorTab === 'frente' && (
              <div className="space-y-4">
                {!selectedStudentObj && (
                  <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 space-y-3">
                    <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-blue-900">
                      <Sparkles size={13} />
                      <span>Dados de Exemplo / Emissão Avulsa</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Posto / Graduação
                        </label>
                        <input
                          type="text"
                          value={customStudentRank}
                          onChange={(e) => setCustomStudentRank(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Nome Completo do Aluno
                        </label>
                        <input
                          type="text"
                          value={customStudentName}
                          onChange={(e) => setCustomStudentName(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Nome do Curso ({`{{CURSO}}`})
                      </label>
                      <input
                        type="text"
                        value={customCourseName}
                        onChange={(e) => setCustomCourseName(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nome deste Modelo
                  </label>
                  <input
                    type="text"
                    value={template.nomeModelo}
                    onChange={(e) =>
                      setTemplate((prev) => ({ ...prev, nomeModelo: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      Título Principal do Certificado
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setTemplate((prev) => ({
                            ...prev,
                            tituloNegrito: !(prev.tituloNegrito ?? true),
                          }))
                        }
                        className={cn(
                          'px-1.5 py-0.5 rounded border text-[10px] font-bold cursor-pointer',
                          (template.tituloNegrito ?? true)
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-600 border-slate-200'
                        )}
                        title="Negrito no título"
                      >
                        N
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setTemplate((prev) => ({
                            ...prev,
                            tituloItalico: !(prev.tituloItalico ?? true),
                          }))
                        }
                        className={cn(
                          'px-1.5 py-0.5 rounded border text-[10px] italic font-serif cursor-pointer',
                          (template.tituloItalico ?? true)
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-600 border-slate-200'
                        )}
                        title="Itálico no título"
                      >
                        I
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={template.titulo}
                    onChange={(e) =>
                      setTemplate((prev) => ({ ...prev, titulo: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase"
                  />
                </div>

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Texto do Certificado (Frente)
                    </label>
                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        onClick={() => applyInlineBodyFormat('**')}
                        className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        title="Selecione um trecho no texto abaixo e clique para negritar (**trecho**)"
                      >
                        <Bold size={11} />
                        <span>Negritar trecho</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => applyInlineBodyFormat('*')}
                        className="px-2 py-0.5 rounded bg-indigo-700 hover:bg-indigo-800 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        title="Selecione um trecho no texto abaixo e clique para colocar em itálico (*trecho*)"
                      >
                        <Italic size={11} />
                        <span>Itálico trecho</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => applyInlineBodyFormat('***')}
                        className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-[10px] font-bold cursor-pointer"
                        title="Negrito + Itálico no trecho selecionado"
                      >
                        N+I
                      </button>
                    </div>
                  </div>

                  {selectedStudentObj && (
                    <div
                      className={cn(
                        'mb-2 p-2.5 rounded-xl border flex flex-col gap-2 transition-colors',
                        isEditingIndividualBody
                          ? 'bg-amber-50/90 border-amber-300'
                          : 'bg-slate-50 border-slate-200'
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1 rounded-lg bg-white p-0.5 border border-slate-200">
                          <button
                            type="button"
                            onClick={handleRestoreDefaultBodyForStudent}
                            className={cn(
                              'px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer',
                              !isEditingIndividualBody
                                ? 'bg-blue-900 text-white shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            )}
                          >
                            Texto Padrão da Turma
                          </button>
                          <button
                            type="button"
                            onClick={handleEnableIndividualBody}
                            className={cn(
                              'px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1',
                              isEditingIndividualBody
                                ? 'bg-amber-600 text-white shadow-2xs'
                                : 'text-slate-700 hover:text-slate-900 hover:bg-amber-50'
                            )}
                          >
                            <Pencil size={10} />
                            <span>Texto Individual deste Aluno</span>
                          </button>
                        </div>

                        {isEditingIndividualBody && (
                          <button
                            type="button"
                            onClick={handleRestoreDefaultBodyForStudent}
                            className="px-2 py-1 rounded-lg bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            title="Descartar texto individual e voltar a usar o texto padrão da turma para este aluno"
                          >
                            <RotateCcw size={10} />
                            <span>Voltar ao padrão</span>
                          </button>
                        )}
                      </div>

                      <p className="text-[10px] leading-snug text-slate-600">
                        {isEditingIndividualBody ? (
                          <>
                            Editando texto exclusivo de{' '}
                            <strong className="text-amber-950">
                              {activeStudentContext.nomeExibicao}
                            </strong>
                            . Outros alunos da turma continuam com o texto padrão.
                          </>
                        ) : (
                          <>
                            Usando o texto padrão para{' '}
                            <strong className="text-slate-800">
                              {activeStudentContext.nomeExibicao}
                            </strong>
                            . Clique em <strong>Texto Individual deste Aluno</strong> caso queira
                            personalizar só este certificado.
                          </>
                        )}
                      </p>
                    </div>
                  )}

                  <textarea
                    ref={bodyTextareaRef}
                    rows={5}
                    value={activeBodyTextValue}
                    onChange={(e) => updateActiveBodyText(e.target.value)}
                    className={cn(
                      'w-full p-3 border rounded-xl text-xs leading-relaxed transition-colors',
                      isEditingIndividualBody
                        ? 'bg-amber-50/40 border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20'
                        : 'bg-slate-50 border-slate-200'
                    )}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 mt-1.5">
                    <p className="text-[10px] text-slate-500">
                      Dica: selecione qualquer parte do texto e clique em <strong>Negritar</strong> ou <em>Itálico</em> (ou use <code className="bg-slate-100 px-1 rounded">**negrito**</code> / <code className="bg-slate-100 px-1 rounded">*itálico*</code>).
                    </p>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 text-[10px] font-bold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={template.textoCorpoItalico ?? (template.fonteCorpo !== 'sans')}
                          onChange={(e) =>
                            setTemplate((prev) => ({
                              ...prev,
                              textoCorpoItalico: e.target.checked,
                            }))
                          }
                          className="rounded border-slate-300"
                        />
                        <span>Texto em Itálico</span>
                      </label>
                      <label className="flex items-center gap-1 text-[10px] font-bold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={template.textoCorpoNegrito ?? false}
                          onChange={(e) =>
                            setTemplate((prev) => ({
                              ...prev,
                              textoCorpoNegrito: e.target.checked,
                            }))
                          }
                          className="rounded border-slate-300"
                        />
                        <span>Tudo em Negrito</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[
                      '{{ALUNO}}',
                      '{{CURSO}}',
                      '{{DATA_INICIO}}',
                      '{{DATA_FIM}}',
                      '{{CARGA_HORARIA}}',
                      '{{MEDIA_FINAL}}',
                    ].map((token) => (
                      <button
                        key={token}
                        type="button"
                        onClick={() => insertPlaceholder(token)}
                        className="px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-900 rounded border border-slate-200 cursor-pointer"
                      >
                        + {token}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Início do Período ({`{{DATA_INICIO}}`})
                    </label>
                    <input
                      type="text"
                      value={template.textoPeriodoInicio}
                      onChange={(e) =>
                        setTemplate((prev) => ({
                          ...prev,
                          textoPeriodoInicio: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Fim do Período ({`{{DATA_FIM}}`})
                    </label>
                    <input
                      type="text"
                      value={template.textoPeriodoFim}
                      onChange={(e) =>
                        setTemplate((prev) => ({
                          ...prev,
                          textoPeriodoFim: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Local de Emissão
                    </label>
                    <input
                      type="text"
                      value={template.localEmissao}
                      onChange={(e) =>
                        setTemplate((prev) => ({ ...prev, localEmissao: e.target.value }))
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Data por Extenso
                    </label>
                    <input
                      type="text"
                      value={template.dataEmissaoExtenso}
                      onChange={(e) =>
                        setTemplate((prev) => ({
                          ...prev,
                          dataEmissaoExtenso: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                </div>

                {/* Primary Signature */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Assinatura Principal
                    </h3>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setTemplate((prev) => ({
                            ...prev,
                            assinaturaNegrito: !(prev.assinaturaNegrito ?? true),
                          }))
                        }
                        className={cn(
                          'px-1.5 py-0.5 rounded border text-[10px] font-bold cursor-pointer',
                          (template.assinaturaNegrito ?? true)
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-600 border-slate-200'
                        )}
                      >
                        Negrito
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setTemplate((prev) => ({
                            ...prev,
                            assinaturaItalico: !(prev.assinaturaItalico ?? false),
                          }))
                        }
                        className={cn(
                          'px-1.5 py-0.5 rounded border text-[10px] italic font-serif cursor-pointer',
                          (template.assinaturaItalico ?? false)
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-600 border-slate-200'
                        )}
                      >
                        Itálico
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={template.assinaturaNome}
                    onChange={(e) =>
                      setTemplate((prev) => ({ ...prev, assinaturaNome: e.target.value }))
                    }
                    placeholder="Nome completo"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={template.assinaturaPosto}
                      onChange={(e) =>
                        setTemplate((prev) => ({ ...prev, assinaturaPosto: e.target.value }))
                      }
                      placeholder="Posto / Patente"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                    <input
                      type="text"
                      value={template.assinaturaCargo}
                      onChange={(e) =>
                        setTemplate((prev) => ({ ...prev, assinaturaCargo: e.target.value }))
                      }
                      placeholder="Cargo / Função"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>

                  {/* Posição Horizontal e Altura Vertical da Assinatura */}
                  <div className="pt-2 border-t border-slate-200 space-y-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Posição na Folha
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'left', label: 'Esquerda', icon: AlignLeft },
                          { id: 'center', label: 'Centralizado', icon: AlignCenter },
                          { id: 'right', label: 'Direita', icon: AlignRight },
                        ].map((pos) => {
                          const Icon = pos.icon;
                          const active = (template.assinaturaAlinhamento || 'right') === pos.id;
                          return (
                            <button
                              key={pos.id}
                              type="button"
                              onClick={() =>
                                setTemplate((prev) => ({
                                  ...prev,
                                  assinaturaAlinhamento: pos.id as 'left' | 'center' | 'right',
                                }))
                              }
                              className={cn(
                                'px-2 py-1.5 rounded-lg border text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all',
                                active
                                  ? 'bg-blue-900 text-white border-blue-950 shadow-2xs'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                              )}
                            >
                              <Icon size={12} />
                              <span>{pos.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-0.5">
                        <span>Altura da Assinatura</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-blue-900">
                            {(template.assinaturaAlturaOffset ?? 0) === 0
                              ? 'Padrão (0px)'
                              : (template.assinaturaAlturaOffset ?? 0) < 0
                                ? `${Math.abs(template.assinaturaAlturaOffset ?? 0)}px acima`
                                : `${template.assinaturaAlturaOffset}px abaixo`}
                          </span>
                          {(template.assinaturaAlturaOffset ?? 0) !== 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                setTemplate((prev) => ({ ...prev, assinaturaAlturaOffset: 0 }))
                              }
                              className="text-[10px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                            >
                              Zerar
                            </button>
                          )}
                        </div>
                      </div>
                      <input
                        type="range"
                        min={-90}
                        max={45}
                        step={2}
                        value={template.assinaturaAlturaOffset ?? 0}
                        onChange={(e) =>
                          setTemplate((prev) => ({
                            ...prev,
                            assinaturaAlturaOffset: Number(e.target.value),
                          }))
                        }
                        className="w-full accent-blue-800"
                      />
                      <div className="flex justify-between text-[9px] text-slate-400 font-semibold">
                        <span>Mais acima</span>
                        <span>Padrão</span>
                        <span>Mais abaixo</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Optional 2nd Signature */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={template.mostrarSegundaAssinatura}
                      onChange={(e) =>
                        setTemplate((prev) => ({
                          ...prev,
                          mostrarSegundaAssinatura: e.target.checked,
                        }))
                      }
                      className="rounded border-slate-300"
                    />
                    <span>Habilitar Segunda Assinatura (à esquerda)</span>
                  </label>

                  {template.mostrarSegundaAssinatura && (
                    <div className="space-y-2 pt-1">
                      <input
                        type="text"
                        value={template.segundaAssinaturaNome}
                        onChange={(e) =>
                          setTemplate((prev) => ({
                            ...prev,
                            segundaAssinaturaNome: e.target.value,
                          }))
                        }
                        placeholder="Nome completo (2ª Assinatura)"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={template.segundaAssinaturaPosto}
                          onChange={(e) =>
                            setTemplate((prev) => ({
                              ...prev,
                              segundaAssinaturaPosto: e.target.value,
                            }))
                          }
                          placeholder="Posto / Patente"
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                        <input
                          type="text"
                          value={template.segundaAssinaturaCargo}
                          onChange={(e) =>
                            setTemplate((prev) => ({
                              ...prev,
                              segundaAssinaturaCargo: e.target.value,
                            }))
                          }
                          placeholder="Cargo / Função"
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Free Positioning Controls: Left Crest, Right Crest, Title, All Text */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                        Mover Brasões, Título e Texto
                      </h3>
                      <p className="text-[10px] text-slate-500">
                        Ajuste pelos controles ou ative o arraste direto na folha.
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDragMoveEnabled((v) => !v)}
                        className={cn(
                          'px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all',
                          dragMoveEnabled
                            ? 'bg-blue-700 text-white border-blue-800'
                            : 'bg-white text-blue-800 border-blue-200 hover:bg-blue-50'
                        )}
                      >
                        <Move size={11} />
                        <span>{dragMoveEnabled ? 'Arraste Ativo' : 'Arrastar na Folha'}</span>
                      </button>
                      {((template.logoEsquerdaOffsetX ?? 0) !== 0 ||
                        (template.logoEsquerdaOffsetY ?? 0) !== 0 ||
                        (template.logoDireitaOffsetX ?? 0) !== 0 ||
                        (template.logoDireitaOffsetY ?? 0) !== 0 ||
                        (template.tituloOffsetX ?? 0) !== 0 ||
                        (template.tituloOffsetY ?? 0) !== 0 ||
                        (template.textoOffsetX ?? 0) !== 0 ||
                        (template.textoOffsetY ?? 0) !== 0) && (
                        <button
                          type="button"
                          onClick={() =>
                            setTemplate((prev) => ({
                              ...prev,
                              logoEsquerdaOffsetX: 0,
                              logoEsquerdaOffsetY: 0,
                              logoDireitaOffsetX: 0,
                              logoDireitaOffsetY: 0,
                              tituloOffsetX: 0,
                              tituloOffsetY: 0,
                              textoOffsetX: 0,
                              textoOffsetY: 0,
                            }))
                          }
                          className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-[10px] font-bold text-slate-600 cursor-pointer"
                        >
                          Zerar Tudo
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      {
                        label: 'Brasão Esquerdo',
                        xKey: 'logoEsquerdaOffsetX' as const,
                        yKey: 'logoEsquerdaOffsetY' as const,
                        minX: -90,
                        maxX: 760,
                        minY: -60,
                        maxY: 520,
                        sizeKey: 'tamanhoLogoEsquerda' as const,
                        defaultSize: 90,
                        opacityKey: 'opacidadeLogoEsquerda' as const,
                      },
                      {
                        label: 'Brasão Direito',
                        xKey: 'logoDireitaOffsetX' as const,
                        yKey: 'logoDireitaOffsetY' as const,
                        minX: -760,
                        maxX: 90,
                        minY: -60,
                        maxY: 520,
                        sizeKey: 'tamanhoLogoDireita' as const,
                        defaultSize: 74,
                        opacityKey: 'opacidadeLogoDireita' as const,
                      },
                      {
                        label: 'Título do Certificado',
                        xKey: 'tituloOffsetX' as const,
                        yKey: 'tituloOffsetY' as const,
                        minX: -350,
                        maxX: 350,
                        minY: -200,
                        maxY: 260,
                      },
                      {
                        label: 'Todo o Texto (Corpo e Data)',
                        xKey: 'textoOffsetX' as const,
                        yKey: 'textoOffsetY' as const,
                        minX: -150,
                        maxX: 150,
                        minY: -180,
                        maxY: 200,
                      },
                    ].map((ctrl) => {
                      const valX = template[ctrl.xKey] ?? 0;
                      const valY = template[ctrl.yKey] ?? 0;
                      const valSize = ctrl.sizeKey ? (template[ctrl.sizeKey] ?? ctrl.defaultSize) : undefined;
                      const valOpacity = ctrl.opacityKey ? (template[ctrl.opacityKey] ?? 1) : undefined;
                      const isModified = valX !== 0 || valY !== 0;
                      return (
                        <div
                          key={ctrl.label}
                          className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[11px] font-bold text-slate-800 truncate">
                              {ctrl.label}
                            </span>
                            {isModified && (
                              <button
                                type="button"
                                onClick={() =>
                                  setTemplate((prev) => ({
                                    ...prev,
                                    [ctrl.xKey]: 0,
                                    [ctrl.yKey]: 0,
                                  }))
                                }
                                className="text-[10px] font-semibold text-blue-700 hover:text-blue-900 underline cursor-pointer shrink-0"
                              >
                                Zerar
                              </button>
                            )}
                          </div>

                          <div>
                            <div className="flex items-center justify-between text-[10px] text-slate-600 font-semibold">
                              <span>Horizontal (Esq/Dir)</span>
                              <span className="font-mono text-slate-800">
                                {valX > 0 ? `+${valX}` : valX}px
                              </span>
                            </div>
                            <input
                              type="range"
                              min={ctrl.minX}
                              max={ctrl.maxX}
                              step={2}
                              value={valX}
                              onChange={(e) =>
                                setTemplate((prev) => ({
                                  ...prev,
                                  [ctrl.xKey]: Number(e.target.value),
                                }))
                              }
                              className="w-full accent-blue-800"
                            />
                          </div>

                          <div>
                            <div className="flex items-center justify-between text-[10px] text-slate-600 font-semibold">
                              <span>Vertical (Altura)</span>
                              <span className="font-mono text-slate-800">
                                {valY > 0 ? `+${valY}` : valY}px
                              </span>
                            </div>
                            <input
                              type="range"
                              min={ctrl.minY}
                              max={ctrl.maxY}
                              step={2}
                              value={valY}
                              onChange={(e) =>
                                setTemplate((prev) => ({
                                  ...prev,
                                  [ctrl.yKey]: Number(e.target.value),
                                }))
                              }
                              className="w-full accent-blue-800"
                            />
                          </div>

                          {ctrl.sizeKey && ctrl.opacityKey && valSize !== undefined && valOpacity !== undefined && (
                            <div className="pt-1.5 border-t border-slate-100 space-y-1.5">
                              <div>
                                <div className="flex items-center justify-between text-[10px] text-slate-600 font-semibold">
                                  <span>Tamanho do Brasão</span>
                                  <span className="font-mono text-slate-800">{valSize}px</span>
                                </div>
                                <input
                                  type="range"
                                  min={36}
                                  max={220}
                                  step={2}
                                  value={valSize}
                                  onChange={(e) =>
                                    setTemplate((prev) => ({
                                      ...prev,
                                      [ctrl.sizeKey!]: Number(e.target.value),
                                    }))
                                  }
                                  className="w-full accent-blue-800"
                                />
                              </div>
                              <div>
                                <div className="flex items-center justify-between text-[10px] text-slate-600 font-semibold">
                                  <span>Opacidade</span>
                                  <span className="font-mono text-slate-800">
                                    {Math.round(valOpacity * 100)}%
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min={0}
                                  max={1}
                                  step={0.05}
                                  value={valOpacity}
                                  onChange={(e) =>
                                    setTemplate((prev) => ({
                                      ...prev,
                                      [ctrl.opacityKey!]: Number(e.target.value),
                                    }))
                                  }
                                  className="w-full accent-blue-800"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: VERSO */}
            {editorTab === 'verso' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Quadro de Disciplinas / Módulos (Verso)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Agrupe disciplinas por módulos com nota única, carga horária do módulo, total e média final.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSyncDisciplinesFromTurma}
                    className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <RefreshCw size={13} />
                    <span>Sincronizar Turma</span>
                  </button>
                </div>

                {/* Module Grouping Toggle */}
                <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <label className="flex items-start gap-2 text-xs font-bold text-blue-950 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={template.agruparPorModulos !== false}
                        onChange={(e) =>
                          setTemplate((prev) => ({
                            ...prev,
                            agruparPorModulos: e.target.checked,
                          }))
                        }
                        className="mt-0.5 rounded border-blue-300"
                      />
                      <span>
                        Agrupar disciplinas por módulos (nota única e carga horária por módulo)
                      </span>
                    </label>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-blue-900/80 pl-5">
                    <span>
                      {template.agruparPorModulos !== false
                        ? `Exibindo ${effectiveBackPreviewRows.length} módulo(s) agrupado(s) no verso.`
                        : 'Exibindo disciplinas separadamente sem agrupamento por módulo.'}
                    </span>
                    {template.agruparPorModulos !== false &&
                      groupCertificateRowsByModule(template.disciplinas).length <
                        template.disciplinas.length && (
                        <button
                          type="button"
                          onClick={handleConsolidateTemplateRowsByModule}
                          className="px-2 py-0.5 rounded bg-white border border-blue-300 text-[10px] font-bold text-blue-800 hover:bg-blue-100 cursor-pointer"
                        >
                          Consolidar linhas abaixo
                        </button>
                      )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Título do Curso no Verso (aceita {`{{CURSO}}`})
                  </label>
                  <input
                    type="text"
                    value={template.versoTituloCurso}
                    onChange={(e) =>
                      setTemplate((prev) => ({
                        ...prev,
                        versoTituloCurso: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      Coluna 1
                    </label>
                    <input
                      type="text"
                      value={template.versoColunaDisciplina}
                      onChange={(e) =>
                        setTemplate((prev) => ({
                          ...prev,
                          versoColunaDisciplina: e.target.value,
                        }))
                      }
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      Coluna 2
                    </label>
                    <input
                      type="text"
                      value={template.versoColunaCargaHoraria}
                      onChange={(e) =>
                        setTemplate((prev) => ({
                          ...prev,
                          versoColunaCargaHoraria: e.target.value,
                        }))
                      }
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      Coluna 3
                    </label>
                    <input
                      type="text"
                      value={template.versoColunaNota}
                      onChange={(e) =>
                        setTemplate((prev) => ({
                          ...prev,
                          versoColunaNota: e.target.value,
                        }))
                      }
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {/* Editable Rows */}
                <div className="space-y-2.5">
                  {template.disciplinas.map((row, idx) => {
                    const resolvedModNum = extractModuleNumberFromRow(row);
                    return (
                      <div
                        key={row.id || idx}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-500 uppercase">
                              Linha {idx + 1}
                            </span>
                            <select
                              value={resolvedModNum ?? ''}
                              onChange={(e) =>
                                handleUpdateDisciplineRow(
                                  idx,
                                  'modulo',
                                  e.target.value ? Number(e.target.value) : null
                                )
                              }
                              className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[10px] font-bold text-blue-900 cursor-pointer"
                              title="Módulo ao qual esta linha pertence para agrupamento"
                            >
                              <option value="">Sem módulo</option>
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((m) => (
                                <option key={m} value={m}>
                                  Módulo {m}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveDisciplineRow(idx, -1)}
                              disabled={idx === 0}
                              className="p-1 rounded hover:bg-slate-200 text-slate-600 disabled:opacity-30 cursor-pointer"
                              title="Mover para cima"
                            >
                              <ArrowUp size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveDisciplineRow(idx, 1)}
                              disabled={idx === template.disciplinas.length - 1}
                              className="p-1 rounded hover:bg-slate-200 text-slate-600 disabled:opacity-30 cursor-pointer"
                              title="Mover para baixo"
                            >
                              <ArrowDown size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveDisciplineRow(idx)}
                              className="p-1 rounded hover:bg-rose-100 text-rose-600 cursor-pointer"
                              title="Remover linha"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                        <textarea
                          rows={2}
                          value={row.nome}
                          onChange={(e) =>
                            handleUpdateDisciplineRow(idx, 'nome', e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold uppercase"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                              Carga Horária
                            </label>
                            <input
                              type="text"
                              value={row.carga_horaria}
                              onChange={(e) =>
                                handleUpdateDisciplineRow(idx, 'carga_horaria', e.target.value)
                              }
                              placeholder="Ex: 24h"
                              className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <label className="block text-[10px] font-bold text-slate-500">
                                Nota Única do Módulo
                              </label>
                              {selectedStudentObj && useTurmaStudentGrades && resolvedModNum && (
                                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                                  Boletim:{' '}
                                  {effectiveBackPreviewRows.find(
                                    (r) => extractModuleNumberFromRow(r) === resolvedModNum
                                  )?.nota ?? '-'}
                                </span>
                              )}
                            </div>
                            <input
                              type="text"
                              value={row.nota}
                              onChange={(e) =>
                                handleUpdateDisciplineRow(idx, 'nota', e.target.value)
                              }
                              placeholder="Ex: 19,50"
                              className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={handleAddDisciplineRow}
                    className="w-full py-2.5 rounded-xl border border-dashed border-blue-300 bg-blue-50/50 hover:bg-blue-50 text-blue-800 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Adicionar Disciplina / Módulo</span>
                  </button>
                </div>

                {/* Totals calculation control */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={template.usarCalculoAutomaticoVerso}
                      onChange={(e) =>
                        setTemplate((prev) => ({
                          ...prev,
                          usarCalculoAutomaticoVerso: e.target.checked,
                        }))
                      }
                      className="rounded border-slate-300"
                    />
                    <span>Calcular Carga Horária Total e Média Final automaticamente</span>
                  </label>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">
                        Carga Horária Exibida
                      </span>
                      <strong className="text-slate-900 font-mono">{totalHorasLabel}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">
                        Média Final Exibida
                      </span>
                      <strong className="text-blue-900 font-mono">{mediaFinalLabel}</strong>
                    </div>
                  </div>

                  {!template.usarCalculoAutomaticoVerso && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">
                          Total Horas Manual
                        </label>
                        <input
                          type="text"
                          value={template.cargaHorariaTotalManual}
                          onChange={(e) =>
                            setTemplate((prev) => ({
                              ...prev,
                              cargaHorariaTotalManual: e.target.value,
                            }))
                          }
                          placeholder="Ex: 144h"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">
                          Média Final Manual
                        </label>
                        <input
                          type="text"
                          value={template.mediaFinalManual}
                          onChange={(e) =>
                            setTemplate((prev) => ({
                              ...prev,
                              mediaFinalManual: e.target.value,
                            }))
                          }
                          placeholder="Ex: 19.5"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: VISUAL & BRASÕES */}
            {editorTab === 'visual' && (
              <div className="space-y-4">
                {/* Tipografia Completa */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Fontes e Estilo do Certificado
                    </h4>
                    <button
                      type="button"
                      onClick={() =>
                        setTemplate((prev) => ({
                          ...prev,
                          fonteTitulo: prev.fonteCorpo,
                          fonteAssinatura: prev.fonteCorpo,
                          fonteVerso: prev.fonteCorpo,
                        }))
                      }
                      className="text-[10px] font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer"
                    >
                      Aplicar fonte do texto em tudo
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Fonte do Texto (Frente)
                      </label>
                      <select
                        value={template.fonteCorpo === 'serif-italic' ? 'garamond' : template.fonteCorpo}
                        onChange={(e) =>
                          setTemplate((prev) => ({
                            ...prev,
                            fonteCorpo: e.target.value as any,
                          }))
                        }
                        className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                      >
                        <option value="garamond">Garamond (Padrão Original)</option>
                        <option value="times">Times New Roman</option>
                        <option value="georgia">Georgia Clássica</option>
                        <option value="palatino">Palatino / Book Antiqua</option>
                        <option value="lora">Lora Editorial</option>
                        <option value="cinzel">Cinzel Romana</option>
                        <option value="script">Caligráfica Formal</option>
                        <option value="sans">Arial Limpa (Sans)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Fonte do Título (Frente)
                      </label>
                      <select
                        value={
                          (template.fonteTitulo || template.fonteCorpo) === 'serif-italic'
                            ? 'garamond'
                            : template.fonteTitulo || template.fonteCorpo
                        }
                        onChange={(e) =>
                          setTemplate((prev) => ({
                            ...prev,
                            fonteTitulo: e.target.value as any,
                          }))
                        }
                        className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                      >
                        <option value="garamond">Garamond (Padrão Original)</option>
                        <option value="times">Times New Roman</option>
                        <option value="georgia">Georgia Clássica</option>
                        <option value="palatino">Palatino / Book Antiqua</option>
                        <option value="lora">Lora Editorial</option>
                        <option value="cinzel">Cinzel Romana</option>
                        <option value="script">Caligráfica Formal</option>
                        <option value="sans">Arial Limpa (Sans)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Fonte da Assinatura
                      </label>
                      <select
                        value={
                          (template.fonteAssinatura || template.fonteCorpo) === 'serif-italic'
                            ? 'garamond'
                            : template.fonteAssinatura || template.fonteCorpo
                        }
                        onChange={(e) =>
                          setTemplate((prev) => ({
                            ...prev,
                            fonteAssinatura: e.target.value as any,
                          }))
                        }
                        className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                      >
                        <option value="garamond">Garamond (Padrão Original)</option>
                        <option value="times">Times New Roman</option>
                        <option value="georgia">Georgia Clássica</option>
                        <option value="palatino">Palatino / Book Antiqua</option>
                        <option value="lora">Lora Editorial</option>
                        <option value="cinzel">Cinzel Romana</option>
                        <option value="script">Caligráfica Formal</option>
                        <option value="sans">Arial Limpa (Sans)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Fonte do Verso
                      </label>
                      <select
                        value={template.fonteVerso || 'sans'}
                        onChange={(e) =>
                          setTemplate((prev) => ({
                            ...prev,
                            fonteVerso: e.target.value as any,
                          }))
                        }
                        className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                      >
                        <option value="sans">Padrão Original (Arial / Sans)</option>
                        <option value="garamond">Garamond</option>
                        <option value="times">Times New Roman</option>
                        <option value="georgia">Georgia Clássica</option>
                        <option value="palatino">Palatino</option>
                        <option value="lora">Lora</option>
                        <option value="cinzel">Cinzel</option>
                      </select>
                    </div>
                  </div>

                  {/* Quick Global Bold & Italic Controls */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                      <input
                        type="checkbox"
                        checked={template.textoCorpoItalico ?? (template.fonteCorpo !== 'sans')}
                        onChange={(e) =>
                          setTemplate((prev) => ({ ...prev, textoCorpoItalico: e.target.checked }))
                        }
                        className="rounded border-slate-300"
                      />
                      <span>Corpo Itálico</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                      <input
                        type="checkbox"
                        checked={template.dataItalico ?? (template.textoCorpoItalico ?? true)}
                        onChange={(e) =>
                          setTemplate((prev) => ({ ...prev, dataItalico: e.target.checked }))
                        }
                        className="rounded border-slate-300"
                      />
                      <span>Data Itálico</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                      <input
                        type="checkbox"
                        checked={template.dataNegrito ?? false}
                        onChange={(e) =>
                          setTemplate((prev) => ({ ...prev, dataNegrito: e.target.checked }))
                        }
                        className="rounded border-slate-300"
                      />
                      <span>Data Negrito</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                      <input
                        type="checkbox"
                        checked={template.versoItalico ?? false}
                        onChange={(e) =>
                          setTemplate((prev) => ({ ...prev, versoItalico: e.target.checked }))
                        }
                        className="rounded border-slate-300"
                      />
                      <span>Verso Itálico</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Alinhamento do Texto
                    </label>
                    <select
                      value={template.alinhamentoTexto}
                      onChange={(e) =>
                        setTemplate((prev) => ({
                          ...prev,
                          alinhamentoTexto: e.target.value as any,
                        }))
                      }
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    >
                      <option value="left">Esquerda (Padrão Modelo)</option>
                      <option value="justify">Justificado</option>
                      <option value="center">Centralizado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tipo de Moldura (Frente)
                    </label>
                    <select
                      value={template.usarMolduraOriginal !== false ? 'original' : 'vetorial'}
                      onChange={(e) =>
                        setTemplate((prev) => ({
                          ...prev,
                          usarMolduraOriginal: e.target.value === 'original',
                        }))
                      }
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    >
                      <option value="original">Moldura Original (Imagem Base)</option>
                      <option value="vetorial">Moldura Vetorial Colorida</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Tamanho da Fonte do Texto</span>
                    <span className="font-mono text-blue-800">{template.tamanhoFonteCorpo}px</span>
                  </label>
                  <input
                    type="range"
                    min={14}
                    max={26}
                    step={1}
                    value={template.tamanhoFonteCorpo}
                    onChange={(e) =>
                      setTemplate((prev) => ({
                        ...prev,
                        tamanhoFonteCorpo: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-blue-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {template.usarMolduraOriginal === false && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Cor Moldura Frente
                      </label>
                      <input
                        type="color"
                        value={template.corBordaFrente}
                        onChange={(e) =>
                          setTemplate((prev) => ({ ...prev, corBordaFrente: e.target.value }))
                        }
                        className="w-full h-9 rounded-lg border border-slate-200 cursor-pointer"
                      />
                    </div>
                  )}
                  <div className={template.usarMolduraOriginal !== false ? 'col-span-2' : ''}>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Cor Moldura Verso
                    </label>
                    <input
                      type="color"
                      value={template.corBordaVerso}
                      onChange={(e) =>
                        setTemplate((prev) => ({ ...prev, corBordaVerso: e.target.value }))
                      }
                      className="w-full h-9 rounded-lg border border-slate-200 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Watermark Size & Expansion Controls (Frente & Verso) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Frente Watermark */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-800">
                        Marca d&apos;Água (Frente)
                      </span>
                      <Maximize2 size={12} className="text-slate-500" />
                    </div>

                    <div>
                      <label className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-0.5">
                        <span>Tamanho Geral</span>
                        <span className="font-mono">{template.tamanhoMarcaDaguaFrente ?? 545}px</span>
                      </label>
                      <input
                        type="range"
                        min={200}
                        max={1150}
                        step={10}
                        value={template.tamanhoMarcaDaguaFrente ?? 545}
                        onChange={(e) =>
                          setTemplate((prev) => ({
                            ...prev,
                            tamanhoMarcaDaguaFrente: Number(e.target.value),
                          }))
                        }
                        className="w-full accent-blue-800"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="flex items-center justify-between text-[10px] font-bold text-slate-600">
                          <span>Largura</span>
                          <span className="font-mono">
                            {template.escalaLarguraMarcaDaguaFrente ?? 100}%
                          </span>
                        </label>
                        <input
                          type="range"
                          min={40}
                          max={200}
                          step={5}
                          value={template.escalaLarguraMarcaDaguaFrente ?? 100}
                          onChange={(e) =>
                            setTemplate((prev) => ({
                              ...prev,
                              escalaLarguraMarcaDaguaFrente: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-blue-800"
                        />
                      </div>
                      <div>
                        <label className="flex items-center justify-between text-[10px] font-bold text-slate-600">
                          <span>Altura</span>
                          <span className="font-mono">
                            {template.escalaAlturaMarcaDaguaFrente ?? 100}%
                          </span>
                        </label>
                        <input
                          type="range"
                          min={40}
                          max={200}
                          step={5}
                          value={template.escalaAlturaMarcaDaguaFrente ?? 100}
                          onChange={(e) =>
                            setTemplate((prev) => ({
                              ...prev,
                              escalaAlturaMarcaDaguaFrente: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-blue-800"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center justify-between text-[10px] font-bold text-slate-600">
                        <span>Opacidade</span>
                        <span className="font-mono">
                          {Math.round(template.opacidadeMarcaDaguaFrente * 100)}%
                        </span>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={0.6}
                        step={0.02}
                        value={template.opacidadeMarcaDaguaFrente}
                        onChange={(e) =>
                          setTemplate((prev) => ({
                            ...prev,
                            opacidadeMarcaDaguaFrente: Number(e.target.value),
                          }))
                        }
                        className="w-full accent-blue-800"
                      />
                    </div>

                    <div className="flex flex-wrap gap-1 pt-0.5">
                      <button
                        type="button"
                        onClick={() =>
                          setTemplate((prev) => ({
                            ...prev,
                            tamanhoMarcaDaguaFrente: 545,
                            escalaLarguraMarcaDaguaFrente: 100,
                            escalaAlturaMarcaDaguaFrente: 100,
                          }))
                        }
                        className="px-2 py-0.5 text-[10px] font-bold bg-white border border-slate-200 hover:bg-slate-100 rounded cursor-pointer"
                      >
                        Padrão
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setTemplate((prev) => ({
                            ...prev,
                            tamanhoMarcaDaguaFrente: 740,
                            escalaLarguraMarcaDaguaFrente: 100,
                            escalaAlturaMarcaDaguaFrente: 100,
                          }))
                        }
                        className="px-2 py-0.5 text-[10px] font-bold bg-white border border-slate-200 hover:bg-slate-100 rounded cursor-pointer"
                      >
                        Grande
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setTemplate((prev) => ({
                            ...prev,
                            tamanhoMarcaDaguaFrente: 760,
                            escalaLarguraMarcaDaguaFrente: 140,
                            escalaAlturaMarcaDaguaFrente: 100,
                          }))
                        }
                        className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 rounded cursor-pointer"
                      >
                        Expandir Folha
                      </button>
                    </div>
                  </div>

                  {/* Verso Watermark */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-800">
                        Marca d&apos;Água (Verso)
                      </span>
                      <Maximize2 size={12} className="text-slate-500" />
                    </div>

                    <div>
                      <label className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-0.5">
                        <span>Tamanho Geral</span>
                        <span className="font-mono">{template.tamanhoMarcaDaguaVerso ?? 580}px</span>
                      </label>
                      <input
                        type="range"
                        min={200}
                        max={1150}
                        step={10}
                        value={template.tamanhoMarcaDaguaVerso ?? 580}
                        onChange={(e) =>
                          setTemplate((prev) => ({
                            ...prev,
                            tamanhoMarcaDaguaVerso: Number(e.target.value),
                          }))
                        }
                        className="w-full accent-blue-800"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="flex items-center justify-between text-[10px] font-bold text-slate-600">
                          <span>Largura</span>
                          <span className="font-mono">
                            {template.escalaLarguraMarcaDaguaVerso ?? 100}%
                          </span>
                        </label>
                        <input
                          type="range"
                          min={40}
                          max={200}
                          step={5}
                          value={template.escalaLarguraMarcaDaguaVerso ?? 100}
                          onChange={(e) =>
                            setTemplate((prev) => ({
                              ...prev,
                              escalaLarguraMarcaDaguaVerso: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-blue-800"
                        />
                      </div>
                      <div>
                        <label className="flex items-center justify-between text-[10px] font-bold text-slate-600">
                          <span>Altura</span>
                          <span className="font-mono">
                            {template.escalaAlturaMarcaDaguaVerso ?? 100}%
                          </span>
                        </label>
                        <input
                          type="range"
                          min={40}
                          max={200}
                          step={5}
                          value={template.escalaAlturaMarcaDaguaVerso ?? 100}
                          onChange={(e) =>
                            setTemplate((prev) => ({
                              ...prev,
                              escalaAlturaMarcaDaguaVerso: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-blue-800"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center justify-between text-[10px] font-bold text-slate-600">
                        <span>Opacidade</span>
                        <span className="font-mono">
                          {Math.round(template.opacidadeMarcaDaguaVerso * 100)}%
                        </span>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={0.6}
                        step={0.02}
                        value={template.opacidadeMarcaDaguaVerso}
                        onChange={(e) =>
                          setTemplate((prev) => ({
                            ...prev,
                            opacidadeMarcaDaguaVerso: Number(e.target.value),
                          }))
                        }
                        className="w-full accent-blue-800"
                      />
                    </div>

                    <div className="flex flex-wrap gap-1 pt-0.5">
                      <button
                        type="button"
                        onClick={() =>
                          setTemplate((prev) => ({
                            ...prev,
                            tamanhoMarcaDaguaVerso: 580,
                            escalaLarguraMarcaDaguaVerso: 100,
                            escalaAlturaMarcaDaguaVerso: 100,
                          }))
                        }
                        className="px-2 py-0.5 text-[10px] font-bold bg-white border border-slate-200 hover:bg-slate-100 rounded cursor-pointer"
                      >
                        Original
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setTemplate((prev) => ({
                            ...prev,
                            tamanhoMarcaDaguaVerso: 760,
                            escalaLarguraMarcaDaguaVerso: 100,
                            escalaAlturaMarcaDaguaVerso: 100,
                          }))
                        }
                        className="px-2 py-0.5 text-[10px] font-bold bg-white border border-slate-200 hover:bg-slate-100 rounded cursor-pointer"
                      >
                        Grande
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setTemplate((prev) => ({
                            ...prev,
                            tamanhoMarcaDaguaVerso: 700,
                            escalaLarguraMarcaDaguaVerso: 145,
                            escalaAlturaMarcaDaguaVerso: 95,
                          }))
                        }
                        className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 rounded cursor-pointer"
                      >
                        Expandir Folha
                      </button>
                    </div>
                  </div>
                </div>

                {/* Crest Size & Opacity Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-800">
                        Brasão Esquerdo
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setTemplate((prev) => ({
                            ...prev,
                            tamanhoLogoEsquerda: 90,
                            opacidadeLogoEsquerda: 1,
                          }))
                        }
                        className="text-[10px] font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer"
                      >
                        Padrão
                      </button>
                    </div>
                    <div>
                      <label className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-0.5">
                        <span>Tamanho</span>
                        <span className="font-mono">{template.tamanhoLogoEsquerda ?? 90}px</span>
                      </label>
                      <input
                        type="range"
                        min={36}
                        max={220}
                        step={2}
                        value={template.tamanhoLogoEsquerda ?? 90}
                        onChange={(e) =>
                          setTemplate((prev) => ({
                            ...prev,
                            tamanhoLogoEsquerda: Number(e.target.value),
                          }))
                        }
                        className="w-full accent-blue-800"
                      />
                    </div>
                    <div>
                      <label className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-0.5">
                        <span>Opacidade</span>
                        <span className="font-mono">
                          {Math.round((template.opacidadeLogoEsquerda ?? 1) * 100)}%
                        </span>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={template.opacidadeLogoEsquerda ?? 1}
                        onChange={(e) =>
                          setTemplate((prev) => ({
                            ...prev,
                            opacidadeLogoEsquerda: Number(e.target.value),
                          }))
                        }
                        className="w-full accent-blue-800"
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-800">
                        Brasão Direito
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setTemplate((prev) => ({
                            ...prev,
                            tamanhoLogoDireita: 74,
                            opacidadeLogoDireita: 1,
                          }))
                        }
                        className="text-[10px] font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer"
                      >
                        Padrão
                      </button>
                    </div>
                    <div>
                      <label className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-0.5">
                        <span>Tamanho</span>
                        <span className="font-mono">{template.tamanhoLogoDireita ?? 74}px</span>
                      </label>
                      <input
                        type="range"
                        min={36}
                        max={220}
                        step={2}
                        value={template.tamanhoLogoDireita ?? 74}
                        onChange={(e) =>
                          setTemplate((prev) => ({
                            ...prev,
                            tamanhoLogoDireita: Number(e.target.value),
                          }))
                        }
                        className="w-full accent-blue-800"
                      />
                    </div>
                    <div>
                      <label className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-0.5">
                        <span>Opacidade</span>
                        <span className="font-mono">
                          {Math.round((template.opacidadeLogoDireita ?? 1) * 100)}%
                        </span>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={template.opacidadeLogoDireita ?? 1}
                        onChange={(e) =>
                          setTemplate((prev) => ({
                            ...prev,
                            opacidadeLogoDireita: Number(e.target.value),
                          }))
                        }
                        className="w-full accent-blue-800"
                      />
                    </div>
                  </div>
                </div>

                {/* Custom Logos & Watermark Uploaders */}
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Brasões e Marcas d&apos;Água Personalizados
                  </h4>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <label className="flex items-center gap-2 text-[11px] font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={
                          template.logoDireitaUrl
                            ? template.mostrarLegendaLogoDireita === true
                            : template.mostrarLegendaLogoDireita !== false
                        }
                        onChange={(e) =>
                          setTemplate((prev) => ({
                            ...prev,
                            mostrarLegendaLogoDireita: e.target.checked,
                          }))
                        }
                        className="rounded border-slate-300"
                      />
                      <span>Exibir legenda de texto abaixo do Brasão Direito</span>
                    </label>
                    <input
                      type="text"
                      value={template.logoDireitaTexto}
                      onChange={(e) =>
                        setTemplate((prev) => ({
                          ...prev,
                          logoDireitaTexto: e.target.value,
                        }))
                      }
                      placeholder="Ex: MARINHA DO BRASIL (ou deixe vazio)"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                    <p className="text-[10px] text-slate-500">
                      Desmarcada automaticamente se você enviar um brasão próprio que já contenha o texto na imagem, evitando duplicação.
                    </p>
                  </div>

                  {[
                    {
                      label: 'Moldura da Frente',
                      field: 'molduraFrenteUrl' as const,
                      defaultVal: '/assets/certificado-moldura-frente.png',
                    },
                    {
                      label: 'Brasão Esquerdo (Guarda Costeira)',
                      field: 'logoEsquerdaUrl' as const,
                      defaultVal: '/assets/aistudio/imagem_01_2da3aec8.png',
                    },
                    {
                      label: 'Brasão Direito (Marinha do Brasil)',
                      field: 'logoDireitaUrl' as const,
                      defaultVal: '',
                    },
                    {
                      label: "Marca d'Água (Frente)",
                      field: 'marcaDaguaFrenteUrl' as const,
                      defaultVal:
                        '/assets/aistudio/WhatsApp_Image_2026-02-11_at_22.02.18_8edf921e.jpeg',
                    },
                    {
                      label: "Marca d'Água (Verso)",
                      field: 'marcaDaguaVersoUrl' as const,
                      defaultVal: '/assets/aistudio/imagem_01_2da3aec8.png',
                    },
                  ].map((item) => (
                    <div
                      key={item.field}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200"
                    >
                      <span className="text-xs font-semibold text-slate-700 truncate">
                        {item.label}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <label className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-[11px] font-bold text-slate-700 cursor-pointer flex items-center gap-1">
                          <Upload size={12} />
                          <span>Trocar</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(item.field, e)}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setTemplate((prev) => ({
                              ...prev,
                              [item.field]: item.defaultVal,
                              ...(item.field === 'logoDireitaUrl'
                                ? {
                                    mostrarLegendaLogoDireita: true,
                                    logoDireitaTexto: prev.logoDireitaTexto || 'MARINHA DO BRASIL',
                                  }
                                : {}),
                            }))
                          }
                          className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                          title="Restaurar padrão"
                        >
                          <RotateCcw size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: MODELOS SALVOS */}
            {editorTab === 'modelos' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-blue-900">
                    <Link2 size={14} />
                    <span>Associar Modelo em Edição a uma Turma</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Vincule o modelo que você está editando agora a qualquer turma para que ele carregue automaticamente ao selecioná-la.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={associateTurmaId}
                      onChange={(e) => setAssociateTurmaId(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                    >
                      <option value="">-- Selecione a turma desejada --</option>
                      {allActiveTurmas.map((turma: any, idx: number) => (
                        <option key={turma.id} value={turma.id}>
                          {idx + 1}. {getCleanTurmaName(turma.nome)} —{' '}
                          {turma.curso?.nome || 'Curso'} ({turma.ano || ''})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleAssociateTemplateToTurma()}
                      disabled={associatingTurma || !associateTurmaId}
                      className="px-3 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {associatingTurma ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Link2 size={13} />
                      )}
                      <span>Associar Agora</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Modelos Salvos no Sistema
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Carregue, vincule a uma turma ou gerencie layouts salvos.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={loadSavedTemplates}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                    title="Atualizar lista"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>

                {loadingTemplates ? (
                  <div className="py-10 flex items-center justify-center gap-2 text-xs text-slate-500">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Carregando modelos...</span>
                  </div>
                ) : savedTemplates.length === 0 ? (
                  <div className="p-6 text-center rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 space-y-2">
                    <BookmarkCheck size={24} className="mx-auto text-slate-400" />
                    <p>Nenhum modelo personalizado salvo ainda.</p>
                    <p className="text-[11px]">
                      Todas as alterações feitas nos modelos são salvas automaticamente.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {savedTemplates.map((rec) => {
                      const td = rec.template_data;
                      const linkedTurmaId = rec.turma_id || td?.turmaId || null;
                      const linkedTurmaLabel = getTurmaDisplayLabel(linkedTurmaId);
                      return (
                        <div
                          key={rec.id}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">
                                {td?.nomeModelo || 'Modelo de Certificado'}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {td?.scope === 'expedito'
                                  ? 'Cursos Expeditos'
                                  : 'Formação de Marinheiros'}
                                {rec.created_at
                                  ? ` • ${new Date(rec.created_at).toLocaleDateString('pt-BR')}`
                                  : ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  const loaded: CertificateTemplateConfig = {
                                    ...td,
                                    id: rec.id,
                                    turmaId: linkedTurmaId,
                                  };
                                  if (autoSaveTimerRef.current) {
                                    clearTimeout(autoSaveTimerRef.current);
                                    autoSaveTimerRef.current = null;
                                  }
                                  lastSavedSignatureRef.current = getTemplateSaveSignature(loaded);
                                  initializedAutoSaveBaselineRef.current = true;
                                  if (linkedTurmaId) {
                                    skipNextTurmaAutoLoadRef.current = true;
                                    setSelectedTurmaId(linkedTurmaId);
                                    setAssociateTurmaId(linkedTurmaId);
                                  }
                                  setTemplate(loaded);
                                  toast.success('Modelo carregado no editor!');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-blue-900 hover:bg-blue-950 text-white text-[11px] font-bold cursor-pointer"
                              >
                                Usar
                              </button>
                              {associateTurmaId && associateTurmaId !== linkedTurmaId && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleAssociateTemplateToTurma(associateTurmaId, td)
                                  }
                                  disabled={associatingTurma}
                                  className="px-2 py-1 rounded-lg bg-white border border-blue-200 hover:bg-blue-50 text-blue-800 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                  title="Associar este modelo salvo à turma selecionada acima"
                                >
                                  <Link2 size={11} />
                                  <span>Vincular</span>
                                </button>
                              )}
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSavedTemplate(rec.id)}
                                  className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-rose-50 text-rose-600 cursor-pointer"
                                  title="Excluir modelo"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 text-[10px]">
                            <Link2 size={11} className={linkedTurmaLabel ? 'text-emerald-700' : 'text-slate-400'} />
                            <span
                              className={
                                linkedTurmaLabel
                                  ? 'font-bold text-emerald-800 truncate'
                                  : 'text-slate-500'
                              }
                            >
                              {linkedTurmaLabel
                                ? `Turma associada: ${linkedTurmaLabel}`
                                : 'Sem turma associada (modelo geral)'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Live Scaled Preview (Frente e Verso) */}
        <div
          ref={previewContainerRef}
          className="xl:col-span-7 bg-slate-100 rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4"
        >
          {/* Preview Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'both', label: 'Frente e Verso' },
                { id: 'front', label: 'Somente Frente' },
                { id: 'back', label: 'Somente Verso' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPreviewMode(m.id as any)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                    previewMode === m.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  )}
                >
                  {m.label}
                </button>
              ))}

              {previewMode !== 'back' && (
                <button
                  type="button"
                  onClick={() => setDragMoveEnabled((v) => !v)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border',
                    dragMoveEnabled
                      ? 'bg-blue-700 text-white border-blue-800 shadow-xs'
                      : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                  )}
                  title="Permite clicar e arrastar os brasões, título, texto e assinatura diretamente na folha"
                >
                  <Move size={13} />
                  <span>{dragMoveEnabled ? 'Arrastar Ativo' : 'Mover na Folha'}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {turmaStudents.length > 1 && (
                <div className="flex items-center gap-1 border border-slate-200 rounded-lg px-1.5 py-1 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => {
                      const prevIdx =
                        (currentStudentIndex - 1 + turmaStudents.length) %
                        turmaStudents.length;
                      setSelectedStudentId(turmaStudents[prevIdx].id);
                    }}
                    className="p-0.5 hover:bg-slate-200 rounded cursor-pointer"
                    title="Aluno anterior"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-[11px] font-bold text-slate-700 px-1">
                    {currentStudentIndex >= 0 ? currentStudentIndex + 1 : 1}/{turmaStudents.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const nextIdx = (currentStudentIndex + 1) % turmaStudents.length;
                      setSelectedStudentId(turmaStudents[nextIdx].id);
                    }}
                    className="p-0.5 hover:bg-slate-200 rounded cursor-pointer"
                    title="Próximo aluno"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Eye size={14} />
                <input
                  type="range"
                  min={60}
                  max={115}
                  step={5}
                  value={manualZoom}
                  onChange={(e) => setManualZoom(Number(e.target.value))}
                  className="w-20 accent-slate-800"
                />
                <span className="font-mono text-[11px] font-bold w-9">{manualZoom}%</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setFullscreenZoom(100);
                  setFullscreenPreview(true);
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                title="Abrir visualização do certificado em tela toda (Frente e Verso)"
              >
                <Maximize2 size={13} />
                <span>Tela Toda</span>
              </button>
            </div>
          </div>

          {dragMoveEnabled && previewMode !== 'back' && (
            <div className="px-3 py-2 rounded-xl bg-blue-50 border border-blue-200 text-[11px] font-semibold text-blue-900 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <Move size={13} className="shrink-0" />
                Modo Mover na Folha ativo: clique e arraste o Brasão Esquerdo, Brasão Direito, Título, Todo o Texto ou a Assinatura diretamente na folha.
              </span>
              <button
                type="button"
                onClick={() => setDragMoveEnabled(false)}
                className="px-2 py-0.5 rounded bg-white border border-blue-200 text-[10px] font-bold text-blue-800 hover:bg-blue-100 cursor-pointer shrink-0"
              >
                Concluir
              </button>
            </div>
          )}

          {/* Preview Sheets */}
          <div className="flex flex-col items-center gap-6 overflow-x-auto pb-2">
            {(previewMode === 'both' || previewMode === 'front') && (
              <div className="space-y-1.5 flex flex-col items-center">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Página 1 — Frente do Certificado (A4 Paisagem)
                </span>
                <CertificateSheet
                  template={template}
                  student={activeStudentContext}
                  side="front"
                  scale={effectiveScale}
                  interactiveDrag={dragMoveEnabled}
                  onUpdateTemplate={setTemplate}
                />
              </div>
            )}

            {(previewMode === 'both' || previewMode === 'back') && (
              <div className="space-y-1.5 flex flex-col items-center">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Página 2 — Verso do Certificado (Disciplinas e Notas)
                </span>
                <CertificateSheet
                  template={template}
                  student={activeStudentContext}
                  side="back"
                  scale={effectiveScale}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Finalization Preview Overlay (Frente e Verso em Tela Toda) */}
      {fullscreenPreview && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label="Visualização em Tela Toda do Certificado"
        >
          <div className="bg-slate-900/95 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-white shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-300 flex items-center justify-center shrink-0">
                <Award size={16} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black uppercase tracking-wider text-white truncate">
                  {activeStudentContext.nomeExibicao}
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {activeStudentContext.cursoNome}
                  {activeStudentContext.turmaNome ? ` • ${activeStudentContext.turmaNome}` : ''}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
                {[
                  { id: 'both', label: 'Frente e Verso' },
                  { id: 'front', label: 'Frente' },
                  { id: 'back', label: 'Verso' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPreviewMode(m.id as 'both' | 'front' | 'back')}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
                      previewMode === m.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700'
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {previewMode === 'both' && (
                <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setFullscreenLayout('stacked')}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
                      fullscreenLayout === 'stacked'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700'
                    )}
                  >
                    Em Pilha
                  </button>
                  <button
                    type="button"
                    onClick={() => setFullscreenLayout('sideBySide')}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
                      fullscreenLayout === 'sideBySide'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700'
                    )}
                  >
                    Lado a Lado
                  </button>
                </div>
              )}

              {turmaStudents.length > 1 && (
                <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-xl px-2 py-1">
                  <button
                    type="button"
                    onClick={() => {
                      const prevIdx =
                        (currentStudentIndex - 1 + turmaStudents.length) % turmaStudents.length;
                      setSelectedStudentId(turmaStudents[prevIdx].id);
                    }}
                    className="p-0.5 hover:bg-slate-700 rounded cursor-pointer text-slate-200"
                    title="Aluno anterior"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span className="text-[11px] font-bold text-slate-200 px-1.5">
                    {currentStudentIndex >= 0 ? currentStudentIndex + 1 : 1}/{turmaStudents.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const nextIdx = (currentStudentIndex + 1) % turmaStudents.length;
                      setSelectedStudentId(turmaStudents[nextIdx].id);
                    }}
                    className="p-0.5 hover:bg-slate-700 rounded cursor-pointer text-slate-200"
                    title="Próximo aluno"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs">
                <Eye size={13} className="text-slate-400" />
                <input
                  type="range"
                  min={60}
                  max={135}
                  step={5}
                  value={fullscreenZoom}
                  onChange={(e) => setFullscreenZoom(Number(e.target.value))}
                  className="w-24 accent-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setFullscreenZoom(100)}
                  className="font-mono text-[11px] font-bold text-slate-200 hover:text-white cursor-pointer w-10 text-right"
                  title="Ajustar à tela (100%)"
                >
                  {fullscreenZoom}%
                </button>
              </div>

              <button
                type="button"
                onClick={handleDownloadIndividualPDF}
                disabled={exportingPDF}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {exportingPDF && !batchProgress ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Download size={13} />
                )}
                <span>PDF</span>
              </button>

              <button
                type="button"
                onClick={handlePrintCertificate}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-700 hover:bg-slate-600 text-white transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Printer size={13} />
                <span>Imprimir</span>
              </button>

              <button
                type="button"
                onClick={() => setFullscreenPreview(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-all cursor-pointer flex items-center gap-1.5"
                title="Fechar visualização em tela toda (ESC)"
              >
                <Minimize2 size={13} />
                <span>Sair</span>
                <X size={13} className="opacity-80" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 sm:p-6">
            <div
              className={cn(
                'min-h-full flex items-center justify-center',
                previewMode === 'both' && fullscreenLayout === 'sideBySide'
                  ? 'flex-row flex-wrap gap-6 items-start content-center'
                  : 'flex-col gap-8'
              )}
            >
              {(previewMode === 'both' || previewMode === 'front') && (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">
                    Página 1 — Frente do Certificado
                  </span>
                  <CertificateSheet
                    template={template}
                    student={activeStudentContext}
                    side="front"
                    scale={fullscreenEffectiveScale}
                    interactiveDrag={false}
                  />
                </div>
              )}

              {(previewMode === 'both' || previewMode === 'back') && (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">
                    Página 2 — Verso do Certificado
                  </span>
                  <CertificateSheet
                    template={template}
                    student={activeStudentContext}
                    side="back"
                    scale={fullscreenEffectiveScale}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Off-screen Full-Resolution 1123x794 Export Targets (1:1 pixel accuracy for PDF & Print) */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: '-99999px',
          top: '0px',
          width: '1123px',
          pointerEvents: 'none',
          opacity: 1,
          zIndex: -9999,
        }}
      >
        <CertificateSheet
          template={template}
          student={activeStudentContext}
          side="front"
          elementId="cert-export-front"
          scale={1}
        />
        <CertificateSheet
          template={template}
          student={activeStudentContext}
          side="back"
          elementId="cert-export-back"
          scale={1}
        />
        {batchRenderTarget && (
          <>
            <CertificateSheet
              template={template}
              student={batchRenderTarget.student}
              side="front"
              elementId="cert-batch-front"
              scale={1}
            />
            <CertificateSheet
              template={template}
              student={batchRenderTarget.student}
              side="back"
              elementId="cert-batch-back"
              scale={1}
            />
          </>
        )}
      </div>
    </div>
  );
}
