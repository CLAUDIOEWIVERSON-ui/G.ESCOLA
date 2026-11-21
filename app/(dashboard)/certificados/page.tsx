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
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  CheckCircle2,
  Loader2,
  BookmarkCheck,
  Eye,
  CheckSquare,
  Square,
  Maximize2,
  Minimize2,
  X,
  Move,
  Link2,
  Unlink,
  Pencil,
  Copy,
  MousePointerClick,
  Settings,
  FolderOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { useCursos, useTurmas, useDisciplinas } from '@/hooks/useCachedData';
import { useUser } from '@/lib/auth/UserContext';
import { fetchWithAuth } from '@/lib/api';
import { cn, getCleanTurmaName } from '@/lib/utils';
import { getHtml2Canvas, savePDFWithDialog } from '@/lib/printDocumentUtils';
import { makeFrameCenterTransparent } from '@/lib/certificateImageUtils';
import {
  CertificateCourseScope,
  CertificateDisciplineRow,
  CertificateSelectableObject,
  CertificateStudentContext,
  CertificateTemplateConfig,
  computeBackTotals,
  createBlankTemplate,
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
import {
  BUILTIN_CERTIFICATE_ASSETS,
  CertificateAssetCategory,
  CertificateAssetTarget,
  CertificateLibraryAsset,
  downloadCertificateAsset,
  extractTemplateAssetsForLibrary,
  prepareUploadedAssetDataUrl,
} from '@/lib/certificateLibrary';
import { CertificateSheet } from '@/components/CertificateSheet';
import { CertificateInspectorPanel } from '@/components/CertificateInspectorPanel';
import { CertificateLibraryPanel } from '@/components/CertificateLibraryPanel';

const LOCAL_TEMPLATES_KEY = 'sge_saved_certificate_templates_v1';
const LOCAL_LIBRARY_KEY = 'sge_certificate_asset_library_v1';
const LOCAL_LIBRARY_HIDDEN_KEY = 'sge_certificate_asset_library_hidden_v1';
const LAST_WORKSPACE_KEY = 'sge_certificate_last_workspace_v1';

function getAssetExclusionKey(
  asset: Pick<CertificateLibraryAsset, 'id' | 'category' | 'url' | 'frameStyle'>
): string {
  if (asset.frameStyle === 'vetorial' || asset.frameStyle === 'simples') {
    return asset.id;
  }
  return `${asset.category}:${asset.url}`;
}

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

type TurmaCategoryFilter =
  | 'all'
  | 'expedito'
  | 'especial'
  | 'formacao'
  | 'ead'
  | 'exterior';

interface CertificateWorkspaceSnapshot {
  template: CertificateTemplateConfig;
  turmaScopeFilter: TurmaCategoryFilter;
  selectedTurmaId: string;
  selectedStudentId: string;
  associateTurmaId: string;
  editorTab: 'frente' | 'verso' | 'visual' | 'modelos' | 'biblioteca';
  previewMode: 'both' | 'front' | 'back';
  manualZoom: number;
  customStudentRank: string;
  customStudentName: string;
  customStudentGenero?: 'masculino' | 'feminino';
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
  const [editorTab, setEditorTab] = useState<
    'frente' | 'verso' | 'visual' | 'modelos' | 'biblioteca'
  >('frente');
  const [libraryCategory, setLibraryCategory] = useState<CertificateAssetCategory>('brasao');
  const [customLibraryAssets, setCustomLibraryAssets] = useState<CertificateLibraryAsset[]>([]);
  const [hiddenLibraryAssetKeys, setHiddenLibraryAssetKeys] = useState<string[]>([]);
  const [selectedObject, setSelectedObject] = useState<CertificateSelectableObject | null>(null);
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
  const [turmaScopeFilter, setTurmaScopeFilter] = useState<TurmaCategoryFilter>('all');
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>('');
  const [turmaStudents, setTurmaStudents] = useState<any[]>([]);
  const [turmaGradesMap, setTurmaGradesMap] = useState<Record<string, any[]>>({});
  const [turmaCourseTopics, setTurmaCourseTopics] = useState<any[]>([]);
  const [loadingTurmaData, setLoadingTurmaData] = useState(false);

  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [studentSearch, setStudentSearch] = useState('');
  const [batchSelectedIds, setBatchSelectedIds] = useState<string[]>([]);
  const [showStudentsWindow, setShowStudentsWindow] = useState<boolean>(false);
  const studentsWindowRef = useRef<HTMLDivElement | null>(null);

  // Manual/standalone student override (used when no turma/student is selected, or edited directly)
  const [customStudentRank, setCustomStudentRank] = useState('1º Cabo');
  const [customStudentName, setCustomStudentName] = useState(
    'Catiana Quaresma dos Santos Espírito'
  );
  const [customStudentGenero, setCustomStudentGenero] = useState<'masculino' | 'feminino'>(
    'feminino'
  );
  const [customCourseName, setCustomCourseName] = useState('Curso de Formação de Marinheiros');
  const [useTurmaStudentGrades, setUseTurmaStudentGrades] = useState(true);

  // Saved templates & turma association
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplateRecord[]>([]);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [showNewModelForm, setShowNewModelForm] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [newModelStarter, setNewModelStarter] = useState<
    'blank' | 'formacao_marinheiros' | 'expedito'
  >('blank');
  const [creatingNewModel, setCreatingNewModel] = useState(false);
  const [showSaveAsNewModal, setShowSaveAsNewModal] = useState(false);
  const [saveAsNewName, setSaveAsNewName] = useState('');
  const [savingAsNewModel, setSavingAsNewModel] = useState(false);
  const [associateTurmaId, setAssociateTurmaId] = useState<string>('');
  const [showAssociatePanel, setShowAssociatePanel] = useState<boolean>(false);
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

  useEffect(() => {
    if (!showStudentsWindow) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (
        studentsWindowRef.current &&
        !studentsWindowRef.current.contains(e.target as Node)
      ) {
        setShowStudentsWindow(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowStudentsWindow(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showStudentsWindow]);

  // Auto-fit preview scale based on container width
  useEffect(() => {
    const el = previewContainerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 200) {
          const nextW = Math.round(w - 32);
          setAutoFitWidth((prev) => (prev === nextW ? prev : nextW));
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

  useEffect(() => {
    if (fullscreenPreview || showSaveAsNewModal) return;
    if (!selectedObject && editorTab !== 'modelos' && editorTab !== 'biblioteca') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedObject(null);
        setEditorTab('frente');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenPreview, showSaveAsNewModal, selectedObject, editorTab]);

  const handleSelectObjectOnSheet = useCallback((obj: CertificateSelectableObject) => {
    setEditorTab((prev) => (prev === 'modelos' || prev === 'biblioteca' ? 'frente' : prev));
    setSelectedObject(obj);
  }, []);

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

  // Load saved templates and library assets together in a single request on mount
  const loadSavedTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    let localTemplates: SavedTemplateRecord[] = [];
    let localLibrary: CertificateLibraryAsset[] = [];

    try {
      const raw = localStorage.getItem(LOCAL_TEMPLATES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) localTemplates = parsed;
      }
    } catch {
      // ignore storage errors
    }

    try {
      const rawLib = localStorage.getItem(LOCAL_LIBRARY_KEY);
      if (rawLib) {
        const parsedLib = JSON.parse(rawLib);
        if (Array.isArray(parsedLib)) localLibrary = parsedLib;
      }
    } catch {
      // ignore storage errors
    }

    try {
      const res = await fetchWithAuth('/api/certificados?includeLibrary=1');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          if (Array.isArray(json.templates) && json.templates.length > 0) {
            setSavedTemplates(json.templates);
            try {
              localStorage.setItem(LOCAL_TEMPLATES_KEY, JSON.stringify(json.templates));
            } catch {
              // ignore storage quota errors
            }
          } else {
            setSavedTemplates(localTemplates);
          }

          if (Array.isArray(json.assets)) {
            const mergedAssets = [...json.assets];
            const seen = new Set(mergedAssets.map((a: any) => `${a.category}:${a.url}`));
            localLibrary.forEach((loc) => {
              if (!seen.has(`${loc.category}:${loc.url}`)) {
                mergedAssets.push(loc);
              }
            });
            setCustomLibraryAssets(mergedAssets);
            try {
              localStorage.setItem(LOCAL_LIBRARY_KEY, JSON.stringify(mergedAssets));
            } catch {
              // ignore storage quota errors
            }
          } else {
            setCustomLibraryAssets(localLibrary);
          }

          setLoadingTemplates(false);
          setTemplatesHydrated(true);
          return;
        }
      }
    } catch {
      // fallback to local items
    }

    setSavedTemplates(localTemplates);
    setCustomLibraryAssets(localLibrary);
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
            parsed.turmaScopeFilter === 'especial' ||
            parsed.turmaScopeFilter === 'formacao' ||
            parsed.turmaScopeFilter === 'ead' ||
            parsed.turmaScopeFilter === 'exterior'
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
            parsed.editorTab === 'modelos' ||
            parsed.editorTab === 'biblioteca'
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
          if (
            parsed.customStudentGenero === 'masculino' ||
            parsed.customStudentGenero === 'feminino'
          ) {
            setCustomStudentGenero(parsed.customStudentGenero);
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
      try {
        const rawHidden = localStorage.getItem(LOCAL_LIBRARY_HIDDEN_KEY);
        if (rawHidden) {
          const parsedHidden = JSON.parse(rawHidden);
          if (Array.isArray(parsedHidden)) {
            setHiddenLibraryAssetKeys(parsedHidden.filter((k) => typeof k === 'string'));
          }
        }
      } catch {
        // ignore storage errors
      }
      setWorkspaceHydrated(true);
    }
  }, []);

  useEffect(() => {
    loadSavedTemplates();
  }, [loadSavedTemplates]);

  const allLibraryAssets = useMemo(() => {
    const hiddenSet = new Set(hiddenLibraryAssetKeys);
    const seenUrls = new Set<string>();
    const visibleBuiltins = BUILTIN_CERTIFICATE_ASSETS.filter(
      (a) => !hiddenSet.has(getAssetExclusionKey(a))
    );
    visibleBuiltins.forEach((a) => seenUrls.add(a.url));
    customLibraryAssets.forEach((a) => seenUrls.add(a.url));
    const templateExtracted = extractTemplateAssetsForLibrary(savedTemplates, seenUrls).filter(
      (a) => !hiddenSet.has(getAssetExclusionKey(a))
    );
    return [...visibleBuiltins, ...customLibraryAssets, ...templateExtracted];
  }, [customLibraryAssets, savedTemplates, hiddenLibraryAssetKeys]);

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
      customStudentGenero,
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
          logoCentroUrl: shrink(template.logoCentroUrl) || '',
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
    customStudentGenero,
    customCourseName,
    useTurmaStudentGrades,
    syncTurmaDatesOnAssociate,
  ]);

  const isActiveTurma = useCallback((t: any): boolean => {
    const statusLower = String(t?.status || 'ativa').toLowerCase().trim();
    const isArquivada =
      Boolean(t?.arquivada) === true ||
      statusLower === 'arquivada' ||
      statusLower === 'arquivado';
    const isConcluida =
      statusLower === 'concluida' ||
      statusLower === 'concluída' ||
      statusLower === 'concluido' ||
      statusLower === 'concluído' ||
      statusLower === 'cancelada' ||
      statusLower === 'cancelado';
    const isPreInscrito =
      statusLower.includes('pré-inscrit') || statusLower.includes('pre-inscrit');
    return !isArquivada && !isConcluida && !isPreInscrito;
  }, []);

  const allActiveTurmas = useMemo(() => {
    return (turmas || []).filter((t: any) => isActiveTurma(t));
  }, [turmas, isActiveTurma]);

  // Filter strictly Active Turmas across all categories (Expedito, Especial, Carreira/Formação, EaD, Exterior)
  const filteredTurmas = useMemo(() => {
    if (turmaScopeFilter === 'all') {
      return allActiveTurmas;
    }

    const cursoById = new Map((cursos || []).map((c: any) => [c.id, c]));

    return allActiveTurmas.filter((t: any) => {
      const courseObj = (t.curso_id ? cursoById.get(t.curso_id) : null) || t.curso;
      const tCat = String(t.categoria || '').toLowerCase().trim();
      const cCat = String(courseObj?.categoria || '').toLowerCase().trim();
      const cName = String(courseObj?.nome || t.nome || '').toLowerCase();

      if (turmaScopeFilter === 'expedito') {
        return tCat === 'expedito' || cCat === 'expedito' || cName.includes('expedito');
      }

      if (turmaScopeFilter === 'especial') {
        return (
          tCat === 'especial' ||
          tCat === 'especiais' ||
          cCat === 'especial' ||
          cCat === 'especiais'
        );
      }

      if (turmaScopeFilter === 'formacao') {
        return (
          tCat === 'carreira' ||
          tCat === 'carreiras' ||
          cCat === 'carreira' ||
          cCat === 'carreiras' ||
          cName.includes('marinheiro') ||
          cName.includes('formação') ||
          cName.includes('formacao')
        );
      }

      if (turmaScopeFilter === 'ead') {
        return (
          tCat === 'ead' ||
          cCat === 'ead' ||
          tCat.includes('distância') ||
          tCat.includes('distancia') ||
          cCat.includes('distância') ||
          cCat.includes('distancia') ||
          cName.includes('ead')
        );
      }

      if (turmaScopeFilter === 'exterior') {
        return (
          t.internacional === true ||
          courseObj?.internacional === true ||
          tCat === 'exterior' ||
          cCat === 'exterior'
        );
      }

      return true;
    });
  }, [allActiveTurmas, cursos, turmaScopeFilter]);

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

  const turmaCourseDiscKey = useMemo(
    () =>
      turmaCourseDisciplines
        .map((d: any) => d.id)
        .filter(Boolean)
        .join(','),
    [turmaCourseDisciplines]
  );

  // Load materias_modulos topics for the selected course to resolve modulo_index when absent on disciplinas
  useEffect(() => {
    if (!turmaCourseDiscKey) {
      setTurmaCourseTopics((prev) => (prev.length === 0 ? prev : []));
      return;
    }
    let cancelled = false;
    const discIds = turmaCourseDiscKey.split(',').filter(Boolean);
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
  }, [turmaCourseDiscKey]);

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
      setTurmaStudents((prev) => (prev.length === 0 ? prev : []));
      setTurmaGradesMap((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      setSelectedStudentId((prev) => (prev === '' ? prev : ''));
      setBatchSelectedIds((prev) => (prev.length === 0 ? prev : []));
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
      setCustomCourseName((prev) => (prev === formattedCourseTitleCase ? prev : formattedCourseTitleCase));
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
      if (!turmaChanged && template.id === matchingSaved.id) {
        return;
      }
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
      setCustomCourseName((prev) => (prev === formattedCourseTitleCase ? prev : formattedCourseTitleCase));
      return;
    }

    if (!turmaChanged) return;

    setCustomCourseName((prev) => (prev === formattedCourseTitleCase ? prev : formattedCourseTitleCase));
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
          genero: customStudentGenero,
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
        genero: alunoObj.genero || 'masculino',
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
      customStudentGenero,
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
      | 'logoCentroUrl'
      | 'logoDireitaUrl'
      | 'marcaDaguaFrenteUrl'
      | 'marcaDaguaVersoUrl',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = String(ev.target?.result || '');
      if (dataUrl) {
        const finalUrl =
          field === 'molduraFrenteUrl'
            ? await makeFrameCenterTransparent(dataUrl)
            : dataUrl;
        setTemplate((prev) => ({
          ...prev,
          [field]: finalUrl,
          ...(field === 'molduraFrenteUrl'
            ? { estiloMolduraFrente: 'original', usarMolduraOriginal: true }
            : {}),
          ...(field === 'logoEsquerdaUrl' ? { mostrarLogoEsquerda: true } : {}),
          ...(field === 'logoCentroUrl' ? { mostrarLogoCentro: true } : {}),
          ...(field === 'logoDireitaUrl'
            ? { mostrarLogoDireita: true, mostrarLegendaLogoDireita: false }
            : {}),
        }));
        toast.success(
          field === 'molduraFrenteUrl'
            ? 'Moldura aplicada com centro transparente para exibir a marca d\'água!'
            : 'Imagem aplicada ao modelo do certificado!'
        );
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const persistLocalLibrary = useCallback((items: CertificateLibraryAsset[]) => {
    try {
      localStorage.setItem(LOCAL_LIBRARY_KEY, JSON.stringify(items));
    } catch {
      // ignore storage quota errors
    }
  }, []);

  const persistHiddenLibraryKeys = useCallback((keys: string[]) => {
    try {
      localStorage.setItem(LOCAL_LIBRARY_HIDDEN_KEY, JSON.stringify(keys));
    } catch {
      // ignore storage quota errors
    }
  }, []);

  const handleSaveAssetRecord = useCallback(
    async (assetPayload: Omit<CertificateLibraryAsset, 'id' | 'source'>) => {
      const localRecord: CertificateLibraryAsset = {
        ...assetPayload,
        id: `local-asset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        source: 'custom',
        createdAt: new Date().toISOString(),
      };

      let savedRecord = localRecord;
      try {
        const res = await fetchWithAuth('/api/certificados', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isAssetLibrary: true,
            asset_data: {
              ...assetPayload,
              source: 'custom',
            },
          }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json?.success && json?.data) {
            savedRecord = {
              ...localRecord,
              ...json.data,
              source: 'custom',
            };
          }
        }
      } catch {
        // keep local record fallback
      }

      const exclusionKey = getAssetExclusionKey(savedRecord);
      setHiddenLibraryAssetKeys((prev) => {
        if (!prev.includes(exclusionKey)) return prev;
        const next = prev.filter((k) => k !== exclusionKey);
        persistHiddenLibraryKeys(next);
        return next;
      });

      setCustomLibraryAssets((prev) => {
        const next = [savedRecord, ...prev];
        persistLocalLibrary(next);
        return next;
      });

      return savedRecord;
    },
    [persistHiddenLibraryKeys, persistLocalLibrary]
  );

  const handleUploadToLibrary = useCallback(
    async (category: CertificateAssetCategory, files: FileList | null, customName?: string) => {
      if (!canEdit) {
        toast.error('Usuário com acesso somente leitura.');
        return;
      }
      if (!files || files.length === 0) return;

      const fileArray = Array.from(files);
      let addedCount = 0;

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        try {
          const finalUrl = await prepareUploadedAssetDataUrl(file, category);
          if (!finalUrl) continue;

          const baseFileName = file.name.replace(/\.[^/.]+$/, '');
          const resolvedName =
            customName && fileArray.length === 1
              ? customName
              : customName && fileArray.length > 1
                ? `${customName} (${i + 1})`
                : baseFileName || 'Recurso Importado';

          await handleSaveAssetRecord({
            name: resolvedName,
            category,
            url: finalUrl,
            subtitle:
              category === 'moldura'
                ? 'Moldura adicionada (centro transparente)'
                : category === 'marca_dagua'
                  ? "Marca d'água personalizada"
                  : 'Brasão personalizado',
            ...(category === 'moldura' ? { frameStyle: 'original' as const } : {}),
          });
          addedCount += 1;
        } catch {
          toast.error(`Falha ao processar o arquivo "${file.name}".`);
        }
      }

      if (addedCount > 0) {
        toast.success(
          addedCount === 1
            ? 'Recurso adicionado à biblioteca!'
            : `${addedCount} recursos adicionados à biblioteca!`
        );
      }
    },
    [canEdit, handleSaveAssetRecord]
  );

  const handleSaveCurrentAssetToLibrary = useCallback(
    async (category: CertificateAssetCategory, url: string, suggestedName: string) => {
      if (!canEdit) {
        toast.error('Usuário com acesso somente leitura.');
        return;
      }
      if (!url) return;
      if (allLibraryAssets.some((a) => a.category === category && a.url === url)) {
        toast.info('Este recurso já está salvo na biblioteca.');
        return;
      }
      await handleSaveAssetRecord({
        name: suggestedName,
        category,
        url,
        subtitle: 'Salvo a partir do modelo atual',
        ...(category === 'moldura' ? { frameStyle: 'original' as const } : {}),
      });
      toast.success('Recurso salvo na biblioteca!');
    },
    [allLibraryAssets, canEdit, handleSaveAssetRecord]
  );

  const handleDeleteLibraryAsset = useCallback(
    async (asset: CertificateLibraryAsset) => {
      if (!canEdit) {
        toast.error('Usuário com acesso somente leitura.');
        return;
      }

      if (asset.source === 'custom') {
        try {
          await fetchWithAuth(`/api/certificados?id=${encodeURIComponent(asset.id)}`, {
            method: 'DELETE',
          });
        } catch {
          // continue removing from local state
        }
        setCustomLibraryAssets((prev) => {
          const next = prev.filter((a) => a.id !== asset.id);
          persistLocalLibrary(next);
          return next;
        });
      } else {
        const key = getAssetExclusionKey(asset);
        setHiddenLibraryAssetKeys((prev) => {
          if (prev.includes(key)) return prev;
          const next = [...prev, key];
          persistHiddenLibraryKeys(next);
          return next;
        });
      }

      toast.success(`"${asset.name}" excluído da biblioteca.`);
    },
    [canEdit, persistHiddenLibraryKeys, persistLocalLibrary]
  );

  const handleRestoreDefaultLibraryAssets = useCallback(() => {
    if (!canEdit) return;
    setHiddenLibraryAssetKeys([]);
    persistHiddenLibraryKeys([]);
    toast.success('Recursos padrão e de modelos restaurados na biblioteca.');
  }, [canEdit, persistHiddenLibraryKeys]);

  const handleDownloadLibraryAsset = useCallback(async (asset: CertificateLibraryAsset) => {
    try {
      await downloadCertificateAsset(asset);
      toast.success(`Download de "${asset.name}" iniciado!`);
    } catch {
      toast.error('Não foi possível baixar o recurso selecionado.');
    }
  }, []);

  const handleApplyLibraryAssetToTarget = useCallback(
    (asset: CertificateLibraryAsset, target: CertificateAssetTarget) => {
      if (!canEdit) {
        toast.error('Usuário com acesso somente leitura.');
        return;
      }

      setTemplate((prev) => {
        if (target === 'brasaoEsquerdo') {
          return {
            ...prev,
            logoEsquerdaUrl: asset.url,
            mostrarLogoEsquerda: true,
          };
        }
        if (target === 'brasaoCentro') {
          return {
            ...prev,
            logoCentroUrl: asset.url,
            mostrarLogoCentro: true,
          };
        }
        if (target === 'brasaoDireito') {
          if (asset.isDefaultMarinhaCrest) {
            return {
              ...prev,
              logoDireitaUrl: '',
              usarBrasaoPadraoDireita: true,
              mostrarLogoDireita: true,
            };
          }
          return {
            ...prev,
            logoDireitaUrl: asset.url,
            usarBrasaoPadraoDireita: false,
            mostrarLogoDireita: true,
          };
        }
        if (target === 'marcaDaguaFrente') {
          return {
            ...prev,
            marcaDaguaFrenteUrl: asset.url,
            mostrarMarcaDaguaFrente: true,
          };
        }
        if (target === 'marcaDaguaVerso') {
          return {
            ...prev,
            marcaDaguaVersoUrl: asset.url,
            mostrarMarcaDaguaVerso: true,
          };
        }
        if (target === 'marcaDaguaAmbas') {
          return {
            ...prev,
            marcaDaguaFrenteUrl: asset.url,
            marcaDaguaVersoUrl: asset.url,
            mostrarMarcaDaguaFrente: true,
            mostrarMarcaDaguaVerso: true,
          };
        }
        if (target === 'molduraFrente') {
          if (asset.frameStyle === 'vetorial' || asset.frameStyle === 'simples') {
            return {
              ...prev,
              estiloMolduraFrente: asset.frameStyle,
              usarMolduraOriginal: false,
              corBorda: prev.corBorda || asset.defaultBorderColor || '#071b3b',
            };
          }
          return {
            ...prev,
            estiloMolduraFrente: 'original',
            usarMolduraOriginal: true,
            molduraFrenteUrl: asset.url,
          };
        }
        return prev;
      });

      toast.success(`"${asset.name}" aplicado preservando as propriedades do modelo!`);
    },
    [canEdit]
  );

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
        const targetTurmaId =
          targetTemplate.turmaId !== undefined
            ? targetTemplate.turmaId
            : selectedTurmaIdRef.current || null;
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

  // Create a brand-new standalone model from scratch inside "Modelos Salvos"
  const handleCreateNewModelFromScratch = async () => {
    const trimmedName = newModelName.trim();
    const fallbackName =
      newModelStarter === 'expedito'
        ? 'Novo Modelo — Cursos Expeditos'
        : newModelStarter === 'formacao_marinheiros'
          ? 'Novo Modelo — Formação de Marinheiros'
          : 'Novo Modelo de Certificado';
    const resolvedName = trimmedName || fallbackName;

    const newTemplate: CertificateTemplateConfig =
      newModelStarter === 'blank'
        ? createBlankTemplate(resolvedName, 'geral')
        : {
            ...createPresetTemplate(newModelStarter),
            id: undefined,
            templateKey: `custom_${Date.now()}`,
            nomeModelo: resolvedName,
            turmaId: null,
            cursoId: null,
            textoCorpoPorAluno: {},
          };

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    if (selectedTurmaIdRef.current) {
      skipNextTurmaAutoLoadRef.current = true;
    }

    lastSavedSignatureRef.current = getTemplateSaveSignature(newTemplate);
    initializedAutoSaveBaselineRef.current = true;
    setTemplate(newTemplate);

    setCreatingNewModel(true);
    try {
      if (canEdit) {
        await persistTemplateRecord(newTemplate, { silent: true });
      } else {
        const localRecord: SavedTemplateRecord = {
          id: `local-${Date.now()}`,
          turma_id: null,
          curso_id: null,
          template_data: newTemplate,
          created_at: new Date().toISOString(),
        };
        setSavedTemplates((prev) => {
          const updated = [localRecord, ...prev];
          try {
            localStorage.setItem(LOCAL_TEMPLATES_KEY, JSON.stringify(updated));
          } catch {
            // ignore storage quota errors
          }
          return updated;
        });
      }

      setShowNewModelForm(false);
      setNewModelName('');
      setNewModelStarter('blank');
      setEditorTab('frente');
      setSelectedObject(null);
      toast.success('Novo modelo criado! Clique nos campos da folha para editar.');
    } finally {
      setCreatingNewModel(false);
    }
  };

  // Clone and save the current working certificate configuration as a brand-new standalone model
  const openSaveAsNewModal = () => {
    const baseName = (template.nomeModelo || 'Modelo de Certificado').trim();
    setSaveAsNewName(`${baseName} (Novo)`);
    setShowSaveAsNewModal(true);
  };

  const handleSaveCurrentAsNewModel = async () => {
    const baseName = (template.nomeModelo || 'Modelo de Certificado').trim();
    const resolvedName = saveAsNewName.trim() || `${baseName} (Novo)`;

    const clonedTemplate: CertificateTemplateConfig = {
      ...template,
      disciplinas: (template.disciplinas || []).map((d) => ({ ...d })),
      textoCorpoPorAluno: { ...(template.textoCorpoPorAluno || {}) },
      id: undefined,
      templateKey: `custom_${Date.now()}`,
      nomeModelo: resolvedName,
      turmaId: null,
      cursoId: null,
    };

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    if (selectedTurmaIdRef.current) {
      skipNextTurmaAutoLoadRef.current = true;
    }

    lastSavedSignatureRef.current = getTemplateSaveSignature(clonedTemplate);
    initializedAutoSaveBaselineRef.current = true;
    setTemplate(clonedTemplate);

    setSavingAsNewModel(true);
    try {
      if (canEdit) {
        await persistTemplateRecord(clonedTemplate, { silent: true });
      } else {
        const localRecord: SavedTemplateRecord = {
          id: `local-${Date.now()}`,
          turma_id: null,
          curso_id: null,
          template_data: clonedTemplate,
          created_at: new Date().toISOString(),
        };
        setSavedTemplates((prev) => {
          const updated = [localRecord, ...prev];
          try {
            localStorage.setItem(LOCAL_TEMPLATES_KEY, JSON.stringify(updated));
          } catch {
            // ignore storage quota errors
          }
          return updated;
        });
      }

      setShowSaveAsNewModal(false);
      setSaveAsNewName('');
      toast.success(`Novo modelo "${resolvedName}" salvo em Modelos Salvos!`);
    } finally {
      setSavingAsNewModel(false);
    }
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
      setShowAssociatePanel(false);
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
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {canEdit && (
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
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
      </div>

      {isConvidado && (
        <div className="px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-2">
          <Eye size={14} className="shrink-0" />
          <span>
            Modo de visualização: você pode testar pré-visualizações, baixar PDFs e imprimir, mas alterações de modelo não são salvas no servidor.
          </span>
        </div>
      )}

      {/* Turma & Alunos Bar (Resumo intuitivo: Filtro + Turma + Vínculo + Emissão) */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 flex-1 min-w-0">
            {/* Filtro de Curso */}
            <div className="sm:col-span-3 space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Categoria
              </label>
              <select
                value={turmaScopeFilter}
                onChange={(e) => {
                  setTurmaScopeFilter(e.target.value as TurmaCategoryFilter);
                  setSelectedTurmaId('');
                }}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">Todas (Ativas)</option>
                <option value="expedito">Expedito</option>
                <option value="especial">Especial</option>
                <option value="formacao">Carreira / Formação</option>
                <option value="ead">EaD</option>
                <option value="exterior">Exterior</option>
              </select>
            </div>

            {/* Turma Principal */}
            <div className="sm:col-span-5 space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Turma Ativa / Alunos
              </label>
              <select
                value={selectedTurmaId}
                onChange={(e) => setSelectedTurmaId(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">
                  {filteredTurmas.length === 0
                    ? '-- Modo Livre (Nenhuma turma ativa nesta categoria) --'
                    : '-- Modo Livre (Sem turma) --'}
                </option>
                {filteredTurmas.map((turma: any, idx: number) => (
                  <option key={turma.id} value={turma.id}>
                    {idx + 1}. {getCleanTurmaName(turma.nome)} —{' '}
                    {turma.curso?.nome || 'Curso'} ({turma.ano || ''})
                  </option>
                ))}
              </select>
            </div>

            {/* Vínculo Compacto do Modelo */}
            <div className="sm:col-span-4 space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Vínculo do Modelo
              </label>
              {template.turmaId ? (
                <div className="h-[34px] px-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-1.5 text-emerald-800 text-xs font-bold">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <CheckCircle2 size={13} className="shrink-0 text-emerald-600" />
                    <span className="truncate" title={getTurmaDisplayLabel(template.turmaId) || ''}>
                      {getTurmaDisplayLabel(template.turmaId) || 'Vinculado'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowAssociatePanel((v) => !v)}
                      className="px-1.5 py-0.5 rounded-md bg-white/80 hover:bg-white border border-emerald-200 text-[10px] font-bold text-emerald-800 cursor-pointer"
                      title="Vincular este modelo a outra turma"
                    >
                      Trocar
                    </button>
                    <button
                      type="button"
                      onClick={handleUnlinkTemplateTurma}
                      className="p-1 rounded-md hover:bg-emerald-200/70 text-emerald-900 cursor-pointer"
                      title="Desvincular turma deste modelo"
                    >
                      <Unlink size={12} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-[34px] flex items-center gap-1.5">
                  {selectedTurmaId ? (
                    <button
                      type="button"
                      onClick={() => handleAssociateTemplateToTurma(selectedTurmaId)}
                      disabled={associatingTurma}
                      className="flex-1 h-full px-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-900 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 truncate"
                      title="Salvar vínculo do modelo atual com a turma selecionada"
                    >
                      {associatingTurma ? (
                        <Loader2 size={13} className="animate-spin shrink-0" />
                      ) : (
                        <Link2 size={13} className="shrink-0" />
                      )}
                      <span className="truncate">Vincular a esta turma</span>
                    </button>
                  ) : (
                    <div className="flex-1 h-full px-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-semibold flex items-center truncate">
                      Modelo livre
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowAssociatePanel((v) => !v)}
                    className={cn(
                      'h-full px-2.5 rounded-xl border text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0 transition-colors',
                      showAssociatePanel
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    )}
                    title="Escolher turma e opções de sincronização"
                  >
                    <Link2 size={12} />
                    <span>{selectedTurmaId ? 'Outra' : 'Vincular'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Painel compacto sob demanda para escolher turma de associação */}
        {showAssociatePanel && (
          <div className="pt-2.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5 bg-slate-50/90 p-2.5 rounded-xl">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1 shrink-0">
                <Link2 size={13} className="text-blue-700" />
                Associar modelo à:
              </span>
              <select
                value={associateTurmaId}
                onChange={(e) => setAssociateTurmaId(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 min-w-[210px] max-w-xs flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">-- Escolha a turma --</option>
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
                <span>Sincronizar datas e disciplinas</span>
              </label>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleAssociateTemplateToTurma()}
                disabled={associatingTurma || !associateTurmaId}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-800 hover:bg-blue-900 text-white shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {associatingTurma ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={13} />
                )}
                <span>Confirmar</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAssociatePanel(false)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-500 cursor-pointer"
                title="Fechar opções de vínculo"
              >
                <X size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Seletor Compacto + Janela Empilhada de Alunos (quando acionada) */}
        {selectedTurmaId && (
          <div className="pt-2.5 border-t border-slate-200 flex flex-wrap items-end justify-between gap-2.5">
            <div className="flex flex-wrap items-end gap-2 min-w-0">
              {/* Trigger que abre a janela vertical empilhada de alunos */}
              <div ref={studentsWindowRef} className="relative space-y-1">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Selecionar Aluno
                </span>
                <button
                  type="button"
                  onClick={() => setShowStudentsWindow((v) => !v)}
                  className={cn(
                    'h-[34px] px-3 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all',
                    showStudentsWindow
                      ? 'bg-blue-900 text-white border-blue-950 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                  )}
                  title="Abrir janela com a lista empilhada de alunos da turma"
                >
                  <Users
                    size={14}
                    className={showStudentsWindow ? 'text-blue-200 shrink-0' : 'text-blue-700 shrink-0'}
                  />
                  <span>Alunos ({turmaStudents.length})</span>
                  {selectedStudentObj && (
                    <span
                      className={cn(
                        'hidden sm:inline-block max-w-[200px] truncate font-semibold pl-2 border-l',
                        showStudentsWindow
                          ? 'border-blue-700 text-blue-100'
                          : 'border-slate-300 text-slate-600'
                      )}
                    >
                      {currentStudentIndex >= 0 ? `${currentStudentIndex + 1}. ` : ''}
                      {selectedStudentObj.posto_graduacao
                        ? `${selectedStudentObj.posto_graduacao} ${selectedStudentObj.nome}`
                        : selectedStudentObj.nome}
                    </span>
                  )}
                  <ChevronDown
                    size={14}
                    className={cn(
                      'shrink-0 transition-transform duration-150',
                      showStudentsWindow && 'rotate-180'
                    )}
                  />
                </button>

                {/* Janela empilhada verticalmente acionada ao clicar */}
                {showStudentsWindow && (
                  <div className="absolute left-0 top-full mt-2 w-[340px] sm:w-[440px] max-w-[calc(100vw-2rem)] z-40 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
                    {/* Cabeçalho da Janela */}
                    <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-blue-800" />
                        <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                          Alunos da Turma ({turmaStudents.length})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowStudentsWindow(false)}
                        className="p-1 rounded-lg hover:bg-slate-200/70 text-slate-500 cursor-pointer"
                        title="Fechar janela de alunos"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {/* Busca e Seleção em Lote */}
                    <div className="p-2.5 border-b border-slate-100 flex flex-wrap items-center gap-2 bg-white">
                      <div className="relative flex-1 min-w-[150px]">
                        <Search
                          size={13}
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          type="text"
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                          placeholder="Buscar aluno..."
                          autoFocus
                          className="w-full pl-7 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>

                      {turmaStudents.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (batchSelectedIds.length === turmaStudents.length) {
                              setBatchSelectedIds([]);
                            } else {
                              setBatchSelectedIds(turmaStudents.map((s) => s.id));
                            }
                          }}
                          className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer shrink-0"
                        >
                          {batchSelectedIds.length === turmaStudents.length
                            ? 'Desmarcar'
                            : 'Marcar todos'}
                        </button>
                      )}
                    </div>

                    {/* Lista Vertical Empilhada de Alunos */}
                    {loadingTurmaData ? (
                      <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-500">
                        <Loader2 size={14} className="animate-spin" />
                        <span>Carregando alunos e notas...</span>
                      </div>
                    ) : turmaStudents.length === 0 ? (
                      <div className="p-4 text-center text-xs text-amber-800 bg-amber-50/70">
                        Nenhum aluno matriculado nesta turma. Você ainda pode editar o modelo base normalmente.
                      </div>
                    ) : filteredTurmaStudents.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500">
                        Nenhum aluno encontrado para &ldquo;{studentSearch}&rdquo;.
                      </div>
                    ) : (
                      <div className="flex flex-col divide-y divide-slate-100 max-h-[320px] overflow-y-auto custom-scrollbar">
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
                                'flex items-center gap-2.5 px-3 py-2 text-xs transition-colors',
                                isActive
                                  ? 'bg-blue-50 text-blue-950'
                                  : 'bg-white text-slate-700 hover:bg-slate-50'
                              )}
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setBatchSelectedIds((prev) =>
                                    prev.includes(st.id)
                                      ? prev.filter((id) => id !== st.id)
                                      : [...prev, st.id]
                                  );
                                }}
                                className={cn(
                                  'cursor-pointer shrink-0 p-0.5 rounded transition-colors',
                                  isBatchChecked
                                    ? 'text-blue-700'
                                    : 'text-slate-400 hover:text-slate-600'
                                )}
                                title="Marcar/desmarcar aluno para o Lote PDF"
                              >
                                {isBatchChecked ? (
                                  <CheckSquare size={15} />
                                ) : (
                                  <Square size={15} />
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedStudentId(st.id);
                                  setShowStudentsWindow(false);
                                }}
                                className="flex-1 min-w-0 flex items-center justify-between gap-2 text-left cursor-pointer"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className={cn(
                                      'w-5 h-5 rounded-md text-[10px] font-black flex items-center justify-center shrink-0',
                                      isActive
                                        ? 'bg-blue-900 text-white'
                                        : 'bg-slate-100 text-slate-600'
                                    )}
                                  >
                                    {idx + 1}
                                  </span>
                                  <span
                                    className={cn(
                                      'truncate',
                                      isActive ? 'font-bold text-blue-950' : 'font-medium text-slate-800'
                                    )}
                                  >
                                    {display}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {hasCustomText && (
                                    <span
                                      title="Este aluno possui texto individual personalizado"
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold"
                                    >
                                      <Pencil size={9} />
                                      <span>Texto</span>
                                    </span>
                                  )}
                                  {isActive && (
                                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                                      Ativo
                                    </span>
                                  )}
                                </div>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Rodapé da Janela */}
                    {turmaStudents.length > 0 && (
                      <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-slate-600">
                          {batchSelectedIds.length} marcado(s) para lote
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setShowStudentsWindow(false);
                            void handleDownloadBatchPDF();
                          }}
                          disabled={exportingPDF || batchSelectedIds.length === 0}
                          className="px-3 py-1 rounded-lg text-[11px] font-bold bg-blue-800 hover:bg-blue-900 text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Download size={12} />
                          <span>Gerar Lote ({batchSelectedIds.length})</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Navegação Rápida Anterior / Próximo */}
              {turmaStudents.length > 1 && (
                <div className="flex items-center gap-0.5 border border-slate-200 rounded-xl px-1 py-1 bg-slate-50 h-[34px]">
                  <button
                    type="button"
                    onClick={() => {
                      const prevIdx =
                        (currentStudentIndex - 1 + turmaStudents.length) %
                        turmaStudents.length;
                      setSelectedStudentId(turmaStudents[prevIdx].id);
                    }}
                    className="p-1 hover:bg-slate-200 rounded-lg cursor-pointer text-slate-700"
                    title="Aluno anterior"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-[11px] font-bold text-slate-700 px-1.5">
                    {currentStudentIndex >= 0 ? currentStudentIndex + 1 : 1}/{turmaStudents.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const nextIdx = (currentStudentIndex + 1) % turmaStudents.length;
                      setSelectedStudentId(turmaStudents[nextIdx].id);
                    }}
                    className="p-1 hover:bg-slate-200 rounded-lg cursor-pointer text-slate-700"
                    title="Próximo aluno"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}

              {customBodyStudentsCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
                  <Pencil size={10} />
                  <span>{customBodyStudentsCount} texto individual</span>
                </span>
              )}

              <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 cursor-pointer bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl h-[34px]">
                <input
                  type="checkbox"
                  checked={useTurmaStudentGrades}
                  onChange={(e) => setUseTurmaStudentGrades(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span>Notas do Boletim no Verso</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Main Split: Contextual Inspector (only when clicking an object, Modelos or Biblioteca) + Live A4 Preview */}
      {(() => {
        const showSidePanel =
          editorTab === 'modelos' || editorTab === 'biblioteca' || selectedObject !== null;
        return (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: Appears ONLY when user clicks an object on the sheet or opens Modelos/Biblioteca */}
            {showSidePanel && (
              <div className="xl:col-span-5 xl:sticky xl:top-4 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                {editorTab === 'modelos' ? (
                  <div className="flex flex-col max-h-[calc(100vh-2rem)]">
                    <div className="px-4 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-2 shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-blue-900 text-white flex items-center justify-center shrink-0">
                          <BookmarkCheck size={15} />
                        </div>
                        <div>
                          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
                            Modelos Salvos
                          </h2>
                          <p className="text-[10px] text-slate-500">
                            Crie, carregue ou vincule modelos às turmas
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditorTab('frente')}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        title="Fechar modelos (ESC)"
                      >
                        <X size={13} />
                        <span>Fechar</span>
                      </button>
                    </div>
                    <div className="p-4 sm:p-5 space-y-4 overflow-y-auto custom-scrollbar">
                      {/* Save Current Model As Brand-New Saved Copy */}
                <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-indigo-950">
                      <Copy size={14} />
                      <span>Salvar Modelo Atual como Novo</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Cria uma cópia independente do layout atual em Modelos Salvos sem alterar o modelo original.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={openSaveAsNewModal}
                    className="px-3 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Copy size={12} />
                    <span>Salvar como Novo Modelo</span>
                  </button>
                </div>

                {/* Create Brand-New Model From Scratch */}
                <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-950">
                      <Plus size={14} />
                      <span>Inserir Novo Modelo do Zero</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowNewModelForm((prev) => !prev)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors',
                        showNewModelForm
                          ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                          : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                      )}
                    >
                      {showNewModelForm ? (
                        <>
                          <X size={12} />
                          <span>Fechar</span>
                        </>
                      ) : (
                        <>
                          <Plus size={12} />
                          <span>Novo Modelo do Zero</span>
                        </>
                      )}
                    </button>
                  </div>

                  {!showNewModelForm ? (
                    <p className="text-[11px] text-slate-600">
                      Crie um certificado totalmente novo em branco ou partindo de uma estrutura inicial, salvo separadamente em Modelos Salvos.
                    </p>
                  ) : (
                    <div className="space-y-2.5 pt-1">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                          Nome do Novo Modelo
                        </label>
                        <input
                          type="text"
                          value={newModelName}
                          onChange={(e) => setNewModelName(e.target.value)}
                          placeholder="Ex: Certificado Curso Especial 2026"
                          className="w-full px-2.5 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                          Ponto de Partida
                        </label>
                        <select
                          value={newModelStarter}
                          onChange={(e) =>
                            setNewModelStarter(
                              e.target.value as 'blank' | 'formacao_marinheiros' | 'expedito'
                            )
                          }
                          className="w-full px-2.5 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs font-semibold text-slate-800"
                        >
                          <option value="blank">Em Branco (totalmente do zero)</option>
                          <option value="formacao_marinheiros">
                            Base Formação de Marinheiros
                          </option>
                          <option value="expedito">Base Cursos Expeditos</option>
                        </select>
                      </div>
                      <p className="text-[10px] text-slate-600 leading-snug">
                        O novo modelo será adicionado como um registro independente em Modelos Salvos sem alterar os modelos já vinculados às turmas.
                      </p>
                      <div className="flex items-center gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={handleCreateNewModelFromScratch}
                          disabled={creatingNewModel}
                          className="flex-1 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {creatingNewModel ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Plus size={13} />
                          )}
                          <span>Criar Modelo e Editar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowNewModelForm(false);
                            setNewModelName('');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>

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
                  <div className="p-6 text-center rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 space-y-2.5">
                    <BookmarkCheck size={24} className="mx-auto text-slate-400" />
                    <p>Nenhum modelo personalizado salvo ainda.</p>
                    <p className="text-[11px]">
                      Todas as alterações feitas nos modelos são salvas automaticamente.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowNewModelForm(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>Inserir Novo Modelo do Zero</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {savedTemplates.map((rec, idx) => {
                      const td = rec.template_data;
                      const linkedTurmaId = rec.turma_id || td?.turmaId || null;
                      const linkedTurmaLabel = getTurmaDisplayLabel(linkedTurmaId);
                      const isActiveModel = Boolean(
                        (template.id && rec.id === template.id) ||
                          (!template.id && td?.templateKey && td.templateKey === template.templateKey)
                      );
                      return (
                        <div
                          key={rec.id}
                          className={cn(
                            'p-3 rounded-xl border space-y-2 transition-colors',
                            isActiveModel
                              ? 'bg-blue-50/70 border-blue-300'
                              : 'bg-slate-50 border-slate-200'
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={cn(
                                  'w-6 h-6 rounded-lg text-[11px] font-black flex items-center justify-center shrink-0',
                                  isActiveModel
                                    ? 'bg-blue-900 text-white'
                                    : 'bg-slate-200 text-slate-700'
                                )}
                              >
                                {idx + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate">
                                  {idx + 1}. {td?.nomeModelo || 'Modelo de Certificado'}
                                </p>
                                <p className="text-[10px] text-slate-500">
                                  {td?.scope === 'expedito'
                                    ? 'Cursos Expeditos'
                                    : td?.scope === 'geral'
                                      ? 'Modelo Personalizado'
                                      : 'Formação de Marinheiros'}
                                  {rec.created_at
                                    ? ` • ${new Date(rec.created_at).toLocaleDateString('pt-BR')}`
                                    : ''}
                                </p>
                              </div>
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
                                  } else if (selectedTurmaIdRef.current) {
                                    skipNextTurmaAutoLoadRef.current = true;
                                  }
                                  setTemplate(loaded);
                                  toast.success('Modelo carregado na visualização ao lado!');
                                }}
                                className={cn(
                                  'px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors',
                                  isActiveModel
                                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                                    : 'bg-blue-900 hover:bg-blue-950 text-white'
                                )}
                              >
                                {isActiveModel ? 'Em uso' : 'Usar'}
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
                  </div>
            ) : editorTab === 'biblioteca' ? (
              <CertificateLibraryPanel
                assets={allLibraryAssets}
                template={template}
                activeCategory={libraryCategory}
                onChangeCategory={setLibraryCategory}
                onClose={() => setEditorTab('frente')}
                onApplyAsset={handleApplyLibraryAssetToTarget}
                onUploadToLibrary={handleUploadToLibrary}
                onDownloadAsset={handleDownloadLibraryAsset}
                onDeleteAsset={handleDeleteLibraryAsset}
                hiddenAssetsCount={hiddenLibraryAssetKeys.length}
                onRestoreDefaultAssets={handleRestoreDefaultLibraryAssets}
                canEdit={canEdit}
              />
            ) : selectedObject ? (
              <CertificateInspectorPanel
                selectedObject={selectedObject}
                template={template}
                setTemplate={setTemplate}
                onSelectObject={handleSelectObjectOnSheet}
                onClose={() => setSelectedObject(null)}
                dragMoveEnabled={dragMoveEnabled}
                onToggleDragMove={() => setDragMoveEnabled((v) => !v)}
                selectedStudentObj={selectedStudentObj}
                activeStudentContext={activeStudentContext}
                isEditingIndividualBody={isEditingIndividualBody}
                activeBodyTextValue={activeBodyTextValue}
                updateActiveBodyText={updateActiveBodyText}
                handleEnableIndividualBody={handleEnableIndividualBody}
                handleRestoreDefaultBodyForStudent={handleRestoreDefaultBodyForStudent}
                applyInlineBodyFormat={applyInlineBodyFormat}
                insertPlaceholder={insertPlaceholder}
                bodyTextareaRef={bodyTextareaRef}
                customStudentRank={customStudentRank}
                setCustomStudentRank={setCustomStudentRank}
                customStudentName={customStudentName}
                setCustomStudentName={setCustomStudentName}
                customStudentGenero={customStudentGenero}
                setCustomStudentGenero={setCustomStudentGenero}
                customCourseName={customCourseName}
                setCustomCourseName={setCustomCourseName}
                handleImageUpload={handleImageUpload}
                effectiveBackPreviewRows={effectiveBackPreviewRows}
                totalHorasLabel={totalHorasLabel}
                mediaFinalLabel={mediaFinalLabel}
                useTurmaStudentGrades={useTurmaStudentGrades}
                handleSyncDisciplinesFromTurma={handleSyncDisciplinesFromTurma}
                handleConsolidateTemplateRowsByModule={handleConsolidateTemplateRowsByModule}
                handleAddDisciplineRow={handleAddDisciplineRow}
                handleUpdateDisciplineRow={handleUpdateDisciplineRow}
                handleRemoveDisciplineRow={handleRemoveDisciplineRow}
                handleMoveDisciplineRow={handleMoveDisciplineRow}
                libraryAssets={allLibraryAssets}
                onApplyLibraryAsset={handleApplyLibraryAssetToTarget}
                onDownloadLibraryAsset={handleDownloadLibraryAsset}
                onDeleteLibraryAsset={canEdit ? handleDeleteLibraryAsset : undefined}
                onSaveCurrentAssetToLibrary={handleSaveCurrentAssetToLibrary}
                onOpenLibrary={(category) => {
                  setLibraryCategory(category);
                  setSelectedObject(null);
                  setEditorTab('biblioteca');
                }}
              />
            ) : null}
          </div>
        )}

        {/* RIGHT COLUMN: Live Scaled Preview (Frente e Verso) */}
        <div
          ref={previewContainerRef}
          className={cn(
            'bg-slate-100 rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4 transition-all',
            showSidePanel ? 'xl:col-span-7' : 'xl:col-span-12'
          )}
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
                  title="Permite clicar e arrastar os brasões, título, texto principal, data e cada assinatura (esquerda e direita) de forma independente diretamente na folha"
                >
                  <Move size={13} />
                  <span>{dragMoveEnabled ? 'Arrastar Ativo' : 'Mover na Folha'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (selectedObject === 'modeloGeral' && editorTab !== 'modelos') {
                    setSelectedObject(null);
                  } else {
                    setEditorTab('frente');
                    setSelectedObject('modeloGeral');
                  }
                }}
                className={cn(
                  'px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border',
                  selectedObject === 'modeloGeral' && editorTab !== 'modelos'
                    ? 'bg-slate-800 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                )}
                title="Abrir ou fechar configurações gerais do modelo"
              >
                <Settings size={13} />
                <span>Config. Modelo</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (editorTab === 'modelos') {
                    setEditorTab('frente');
                  } else {
                    setSelectedObject(null);
                    setEditorTab('modelos');
                  }
                }}
                className={cn(
                  'px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border',
                  editorTab === 'modelos'
                    ? 'bg-blue-900 text-white border-blue-950'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                )}
                title="Abrir ou fechar Modelos Salvos"
              >
                <BookmarkCheck size={13} />
                <span>Modelos Salvos</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (editorTab === 'biblioteca') {
                    setEditorTab('frente');
                  } else {
                    setSelectedObject(null);
                    setEditorTab('biblioteca');
                  }
                }}
                className={cn(
                  'px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border',
                  editorTab === 'biblioteca'
                    ? 'bg-blue-900 text-white border-blue-950'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                )}
                title="Abrir ou fechar Biblioteca de Brasões, Marcas d'Água e Molduras"
              >
                <FolderOpen size={13} />
                <span>Biblioteca</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadIndividualPDF}
                disabled={exportingPDF}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                title="Baixar PDF do aluno selecionado (Frente e Verso)"
              >
                {exportingPDF && !batchProgress ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Download size={13} />
                )}
                <span>Baixar PDF do Aluno Selecionado</span>
              </button>

              {selectedTurmaId && turmaStudents.length > 0 && (
                <button
                  type="button"
                  onClick={handleDownloadBatchPDF}
                  disabled={exportingPDF || batchSelectedIds.length === 0}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-blue-800 hover:bg-blue-900 text-white shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  title="Baixar todos os certificados da turma selecionada em lote"
                >
                  {batchProgress ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>
                        {batchProgress.current}/{batchProgress.total}
                      </span>
                    </>
                  ) : (
                    <>
                      <Download size={13} />
                      <span>
                        Baixar Todos Certificados da Turma Selecionada ({batchSelectedIds.length})
                      </span>
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={openSaveAsNewModal}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-blue-900 hover:bg-blue-950 text-white shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                title="Salvar uma cópia do modelo atual como um novo modelo independente"
              >
                <Copy size={13} />
                <span>Salvar como Novo Modelo</span>
              </button>
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
                Modo Mover na Folha ativo: clique e arraste o Brasão Esquerdo, Brasão Central, Brasão Direito, Título, Texto Principal, Data ou cada Assinatura (Esquerda e Direita) de forma independente diretamente na folha.
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

          {/* Slim contextual helper bar when all controls are hidden */}
          {!showSidePanel && (
            <div className="px-3.5 py-2.5 rounded-xl bg-white border border-blue-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 text-xs text-slate-700">
                <MousePointerClick size={15} className="text-blue-700 shrink-0" />
                <span>
                  <strong>Edição Contextual:</strong> clique diretamente em qualquer objeto na{' '}
                  <strong>Frente</strong> ou no <strong>Verso</strong> (título, texto, data, brasão,
                  assinatura ou tabela) para abrir os controles ao lado.
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {!template.mostrarLogoCentro && (
                  <button
                    type="button"
                    onClick={() => handleSelectObjectOnSheet('brasaoCentro')}
                    className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-[11px] font-bold text-slate-700 hover:text-blue-900 cursor-pointer flex items-center gap-1"
                  >
                    <Plus size={12} />
                    <span>Brasão Central</span>
                  </button>
                )}
                {!template.mostrarSegundaAssinatura && (
                  <button
                    type="button"
                    onClick={() => handleSelectObjectOnSheet('segundaAssinatura')}
                    className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-[11px] font-bold text-slate-700 hover:text-blue-900 cursor-pointer flex items-center gap-1"
                  >
                    <Plus size={12} />
                    <span>2ª Assinatura</span>
                  </button>
                )}
              </div>
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
                  selectedObject={selectedObject}
                  onSelectObject={handleSelectObjectOnSheet}
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
                  selectedObject={selectedObject}
                  onSelectObject={handleSelectObjectOnSheet}
                />
              </div>
            )}
          </div>
        </div>
          </div>
        );
      })()}

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

      {/* Save Current Model As New Model Modal */}
      {showSaveAsNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-900 text-white flex items-center justify-center shrink-0">
                  <Copy size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Salvar Modelo Atual como Novo
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Será salvo como um novo registro independente em Modelos Salvos.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSaveAsNewModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
                title="Fechar"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Nome do Novo Modelo
              </label>
              <input
                type="text"
                autoFocus
                value={saveAsNewName}
                onChange={(e) => setSaveAsNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !savingAsNewModel) {
                    e.preventDefault();
                    void handleSaveCurrentAsNewModel();
                  }
                }}
                placeholder="Ex: Modelo Curso Especial 2026"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
              />
              <p className="text-[10px] text-slate-500 leading-snug">
                Mantém todas as configurações atuais de frente, verso, brasões, marca d&apos;água e assinaturas sem sobrescrever o modelo anterior.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowSaveAsNewModal(false)}
                className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveCurrentAsNewModel}
                disabled={savingAsNewModel}
                className="px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {savingAsNewModel ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Copy size={13} />
                )}
                <span>Salvar como Novo</span>
              </button>
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
