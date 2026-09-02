'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  Check, 
  CheckSquare,
  Square,
  GraduationCap, 
  BookMarked, 
  Award, 
  BookOpen, 
  Monitor, 
  Users, 
  Archive, 
  Sparkles,
  SlidersHorizontal,
  FileSpreadsheet,
  Image as ImageIcon,
  RotateCcw,
  Search,
  Filter,
  Layers,
  FolderTree,
  LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, getCleanTurmaName } from '@/lib/utils';
import { printElementIsolated, downloadElementAsPDF } from '@/lib/printDocumentUtils';
import navalMissionLogo from '@/src/assets/images/regenerated_image_1782409801823.png';
import maleAvatar from '@/src/assets/images/avatar_male_1778977230783.png';
import femaleAvatar from '@/src/assets/images/avatar_female_1778977246051.png';
import militaryMaleAvatar from '@/src/assets/images/avatar_military_male_1779964887322.png';
import militaryFemaleAvatar from '@/src/assets/images/avatar_military_female_1779964903107.png';

export interface CombinedPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCategories: string[];
  onToggleCategory: (catId: string) => void;
  onSetCategories: (categories: string[]) => void;
  dashboardData: any;
  isPt: boolean;
}

export const CATEGORY_DEFINITIONS = [
  { id: 'exterior', label: 'Alunos no Exterior', labelEn: 'Students Abroad', icon: GraduationCap, color: 'bg-purple-600', textBadge: 'Alunos no Exterior' },
  { id: 'carreira', label: 'Cursos de Carreira', labelEn: 'Career Courses', icon: BookMarked, color: 'bg-emerald-600', textBadge: 'Carreira' },
  { id: 'especial', label: 'Cursos Especiais', labelEn: 'Special Courses', icon: Award, color: 'bg-blue-600', textBadge: 'Especiais' },
  { id: 'expedito', label: 'Cursos Expeditos', labelEn: 'Expedited Courses', icon: BookOpen, color: 'bg-amber-500', textBadge: 'Expeditos' },
  { id: 'ead', label: 'Cursos EaD', labelEn: 'Distance Learning (EaD)', icon: Monitor, color: 'bg-cyan-600', textBadge: 'EaD' },
  { id: 'pre_inscritos', label: 'Turmas Pré-Inscritas', labelEn: 'Pre-registered Classes', icon: Users, color: 'bg-red-600', textBadge: 'Pré-Inscritos' },
  { id: 'arquivadas', label: 'Turmas Arquivadas', labelEn: 'Archived Classes', icon: Archive, color: 'bg-slate-600', textBadge: 'Arquivadas' }
];

export const getCursoNomeFromTurma = (t: any): string => {
  if (!t) return '';
  const cObj = Array.isArray(t.curso) ? t.curso[0] : (t.curso && typeof t.curso === 'object' ? t.curso : null);
  const directName = cObj?.nome || t.curso_nome || t.nome_curso || t.cursoNome || (typeof t.curso === 'string' ? t.curso : '');
  if (typeof directName === 'string' && directName.trim()) {
    return directName.trim();
  }
  if (t.nome && typeof t.nome === 'string') {
    return t.nome.trim();
  }
  return '';
};

export default function CombinedPrintModal({
  isOpen,
  onClose,
  selectedCategories,
  onToggleCategory,
  onSetCategories,
  dashboardData,
  isPt
}: CombinedPrintModalProps) {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [includePhotos, setIncludePhotos] = useState<boolean>(true);
  const [includeTurmaStudents, setIncludeTurmaStudents] = useState<boolean>(true);
  const [isExportingPDF, setIsExportingPDF] = useState<boolean>(false);

  // Granular Filter states in print modal
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [selectedTurmas, setSelectedTurmas] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isFiltersExpanded, setIsFiltersExpanded] = useState<boolean>(true);

  const {
    alunosExterior = [],
    turmasExpeditoList = [],
    turmasCarreiraList = [],
    turmasEspeciaisList = [],
    turmasEadList = [],
    turmasPreInscritasList = [],
    turmasArquivadasList = []
  } = dashboardData || {};

  // Gather all turmas belonging to the currently selected categories
  const allCategoryTurmas = useMemo(() => {
    const list: any[] = [];
    selectedCategories.forEach((catId) => {
      if (catId === 'carreira') list.push(...turmasCarreiraList);
      else if (catId === 'especial') list.push(...turmasEspeciaisList);
      else if (catId === 'expedito') list.push(...turmasExpeditoList);
      else if (catId === 'ead') list.push(...turmasEadList);
      else if (catId === 'pre_inscritos') list.push(...turmasPreInscritasList);
      else if (catId === 'arquivadas') list.push(...turmasArquivadasList);
    });
    return list;
  }, [
    selectedCategories,
    turmasCarreiraList,
    turmasEspeciaisList,
    turmasExpeditoList,
    turmasEadList,
    turmasPreInscritasList,
    turmasArquivadasList
  ]);

  // Compute available distinct courses across selected categories
  const availableCourses = useMemo(() => {
    const map = new Map<string, { nome: string; count: number; totalAlunos: number }>();
    
    // Add courses from turmas
    allCategoryTurmas.forEach((t) => {
      const cNome = getCursoNomeFromTurma(t);
      if (cNome) {
        const current = map.get(cNome) || { nome: cNome, count: 0, totalAlunos: 0 };
        current.count += 1;
        current.totalAlunos += Number(t.alunos?.length ?? t.alunos_count ?? t.total_alunos ?? 0);
        map.set(cNome, current);
      }
    });

    // If exterior is selected, also add exterior courses
    if (selectedCategories.includes('exterior')) {
      alunosExterior.forEach((aluno: any) => {
        const turmaData = Array.isArray(aluno.turma) ? aluno.turma[0] : aluno.turma;
        const curso = Array.isArray(turmaData?.curso) ? turmaData.curso[0] : turmaData?.curso;
        const cNome = (curso?.nome || aluno.curso_nome || turmaData?.curso_nome || '').trim();
        if (cNome) {
          const current = map.get(cNome) || { nome: cNome, count: 1, totalAlunos: 0 };
          current.totalAlunos += 1;
          map.set(cNome, current);
        }
      });
    }

    return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [allCategoryTurmas, selectedCategories, alunosExterior]);

  // Compute available distinct turmas across selected categories (and narrowed by selected courses if any)
  const availableTurmasOptions = useMemo(() => {
    const baseList = selectedCourses.length > 0
      ? allCategoryTurmas.filter((t) => {
          const cNome = getCursoNomeFromTurma(t);
          return selectedCourses.includes(cNome);
        })
      : allCategoryTurmas;

    const map = new Map<string, { id: string; nome: string; cleanNome: string; cursoNome: string; alunosCount: number }>();
    baseList.forEach((t) => {
      if (t.id) {
        const cNome = getCursoNomeFromTurma(t);
        const cleanName = getCleanTurmaName(t, cNome, t.nome || 'Turma');
        const alunoCount = Number(t.alunos?.length ?? t.alunos_count ?? t.total_alunos ?? 0);
        map.set(t.id, {
          id: t.id,
          nome: t.nome || cleanName,
          cleanNome: cleanName,
          cursoNome: cNome,
          alunosCount: alunoCount
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [allCategoryTurmas, selectedCourses]);

  // Filter helper for any turma
  const isTurmaMatchingFilters = useCallback((t: any): boolean => {
    const cNome = getCursoNomeFromTurma(t);

    // Course filter
    if (selectedCourses.length > 0 && !selectedCourses.includes(cNome)) {
      return false;
    }

    // Turma filter
    if (selectedTurmas.length > 0 && !selectedTurmas.includes(t.id)) {
      return false;
    }

    // Search term filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      const nomeTurma = (t.nome || '').toLowerCase();
      const nomeCurso = (cNome || '').toLowerCase();
      const categoria = (t.curso?.categoria || t.categoria || '').toLowerCase();
      const instrutor = (t.instrutor || '').toLowerCase();
      const localizacao = (t.localizacao || '').toLowerCase();
      const doc = (t.documento_criacao || t.curso?.documento_criacao || '').toLowerCase();
      const studentsMatch = Array.isArray(t.alunos) && t.alunos.some((al: any) => {
        const sName = (al.nome || al.nome_guerra || '').toLowerCase();
        const sOm = (al.om || '').toLowerCase();
        return sName.includes(term) || sOm.includes(term);
      });

      if (
        !nomeTurma.includes(term) &&
        !nomeCurso.includes(term) &&
        !categoria.includes(term) &&
        !instrutor.includes(term) &&
        !localizacao.includes(term) &&
        !doc.includes(term) &&
        !studentsMatch
      ) {
        return false;
      }
    }

    return true;
  }, [selectedCourses, selectedTurmas, searchTerm]);

  // Filtered lists for each category
  const filteredCarreiraList = useMemo(() => turmasCarreiraList.filter(isTurmaMatchingFilters), [turmasCarreiraList, isTurmaMatchingFilters]);
  const filteredEspecialList = useMemo(() => turmasEspeciaisList.filter(isTurmaMatchingFilters), [turmasEspeciaisList, isTurmaMatchingFilters]);
  const filteredExpeditoList = useMemo(() => turmasExpeditoList.filter(isTurmaMatchingFilters), [turmasExpeditoList, isTurmaMatchingFilters]);
  const filteredEadList = useMemo(() => turmasEadList.filter(isTurmaMatchingFilters), [turmasEadList, isTurmaMatchingFilters]);
  const filteredPreInscritasList = useMemo(() => turmasPreInscritasList.filter(isTurmaMatchingFilters), [turmasPreInscritasList, isTurmaMatchingFilters]);
  const filteredArquivadasList = useMemo(() => turmasArquivadasList.filter(isTurmaMatchingFilters), [turmasArquivadasList, isTurmaMatchingFilters]);

  // Filtered and grouped students abroad by document
  const groupedAlunosExterior = useMemo(() => {
    let list = [...alunosExterior];

    // Filter students abroad by selected courses, search term, etc.
    if (selectedCourses.length > 0) {
      list = list.filter((aluno: any) => {
        const turmaData = Array.isArray(aluno.turma) ? aluno.turma[0] : aluno.turma;
        const curso = Array.isArray(turmaData?.curso) ? turmaData.curso[0] : turmaData?.curso;
        const cNome = (curso?.nome || aluno.curso_nome || turmaData?.curso_nome || '').trim();
        return selectedCourses.includes(cNome);
      });
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter((aluno: any) => {
        const sName = (aluno.nome || aluno.nome_guerra || '').toLowerCase();
        const sOm = (aluno.om || '').toLowerCase();
        const sDoc = (aluno.documento_criacao || '').toLowerCase();
        const turmaData = Array.isArray(aluno.turma) ? aluno.turma[0] : aluno.turma;
        const curso = Array.isArray(turmaData?.curso) ? turmaData.curso[0] : turmaData?.curso;
        const cNome = (curso?.nome || aluno.curso_nome || '').toLowerCase();
        const tLoc = (turmaData?.localizacao || '').toLowerCase();
        return sName.includes(term) || sOm.includes(term) || sDoc.includes(term) || cNome.includes(term) || tLoc.includes(term);
      });
    }

    list.sort((a: any, b: any) => {
      const nomeA = (a.nome || a.nome_guerra || '').trim().toLowerCase();
      const nomeB = (b.nome || b.nome_guerra || '').trim().toLowerCase();
      return nomeA.localeCompare(nomeB, 'pt-BR');
    });

    const groupsMap = new Map<string, any[]>();
    list.forEach((aluno: any) => {
      const turmaData = Array.isArray(aluno.turma) ? aluno.turma[0] : aluno.turma;
      const curso = Array.isArray(turmaData?.curso) ? turmaData.curso[0] : turmaData?.curso;
      const doc = (aluno.documento_criacao || turmaData?.documento_criacao || curso?.documento_criacao || '').trim() || (isPt ? 'Sem Documento Cadastrado' : 'No Document Specified');
      
      if (!groupsMap.has(doc)) {
        groupsMap.set(doc, []);
      }
      groupsMap.get(doc)!.push(aluno);
    });

    return Array.from(groupsMap.entries())
      .map(([documento, alunos]) => ({ documento, alunos }))
      .sort((a, b) => a.documento.localeCompare(b.documento, 'pt-BR'));
  }, [alunosExterior, selectedCourses, searchTerm, isPt]);

  const totalFilteredAlunosExterior = useMemo(() => {
    return groupedAlunosExterior.reduce((acc, g) => acc + g.alunos.length, 0);
  }, [groupedAlunosExterior]);

  // Aggregate statistics for selected categories and filters
  const summaryStats = useMemo(() => {
    let totalAlunos = 0;
    let totalTurmas = 0;
    const categoryBreakdown: { id: string; name: string; turmasCount: number; alunosCount: number }[] = [];

    CATEGORY_DEFINITIONS.forEach((cat) => {
      if (!selectedCategories.includes(cat.id)) return;

      let turmasCount = 0;
      let alunosCount = 0;

      if (cat.id === 'exterior') {
        turmasCount = groupedAlunosExterior.length;
        alunosCount = totalFilteredAlunosExterior;
      } else {
        let list: any[] = [];
        if (cat.id === 'carreira') list = filteredCarreiraList;
        else if (cat.id === 'especial') list = filteredEspecialList;
        else if (cat.id === 'expedito') list = filteredExpeditoList;
        else if (cat.id === 'ead') list = filteredEadList;
        else if (cat.id === 'pre_inscritos') list = filteredPreInscritasList;
        else if (cat.id === 'arquivadas') list = filteredArquivadasList;

        turmasCount = list.length;
        alunosCount = list.reduce((acc, t) => acc + (t.alunos?.length || t.alunos_count || t.total_alunos || 0), 0);
      }

      totalAlunos += alunosCount;
      totalTurmas += (cat.id === 'exterior' ? 0 : turmasCount);

      categoryBreakdown.push({
        id: cat.id,
        name: isPt ? cat.label : cat.labelEn,
        turmasCount,
        alunosCount
      });
    });

    return { totalAlunos, totalTurmas, categoryBreakdown };
  }, [
    selectedCategories,
    groupedAlunosExterior,
    totalFilteredAlunosExterior,
    filteredCarreiraList,
    filteredEspecialList,
    filteredExpeditoList,
    filteredEadList,
    filteredPreInscritasList,
    filteredArquivadasList,
    isPt
  ]);

  // Toggle helpers
  const toggleCourseFilter = (courseName: string) => {
    setSelectedCourses((prev) => 
      prev.includes(courseName) ? prev.filter((c) => c !== courseName) : [...prev, courseName]
    );
  };

  const toggleTurmaFilter = (turmaId: string) => {
    setSelectedTurmas((prev) => 
      prev.includes(turmaId) ? prev.filter((id) => id !== turmaId) : [...prev, turmaId]
    );
  };

  const clearAllFilters = () => {
    setSelectedCourses([]);
    setSelectedTurmas([]);
    setSearchTerm('');
  };

  const hasActiveGranularFilters = selectedCourses.length > 0 || selectedTurmas.length > 0 || searchTerm.trim().length > 0;

  // Counts for all individual categories for badge preview
  const categoryDataCounts = useMemo(() => {
    const countsMap: Record<string, { turmasCount: number; alunosCount: number }> = {};
    CATEGORY_DEFINITIONS.forEach((cat) => {
      let turmasCount = 0;
      let alunosCount = 0;
      if (cat.id === 'exterior') {
        turmasCount = (alunosExterior || []).length > 0 ? 1 : 0;
        alunosCount = alunosExterior.length;
      } else {
        let list: any[] = [];
        if (cat.id === 'carreira') list = turmasCarreiraList;
        else if (cat.id === 'especial') list = turmasEspeciaisList;
        else if (cat.id === 'expedito') list = turmasExpeditoList;
        else if (cat.id === 'ead') list = turmasEadList;
        else if (cat.id === 'pre_inscritos') list = turmasPreInscritasList;
        else if (cat.id === 'arquivadas') list = turmasArquivadasList;

        turmasCount = list.length;
        alunosCount = list.reduce((acc, t) => acc + (t.alunos?.length || t.alunos_count || t.total_alunos || 0), 0);
      }
      countsMap[cat.id] = { turmasCount, alunosCount };
    });
    return countsMap;
  }, [
    alunosExterior,
    turmasCarreiraList,
    turmasEspeciaisList,
    turmasExpeditoList,
    turmasEadList,
    turmasPreInscritasList,
    turmasArquivadasList
  ]);

  // Dynamic document subtitle
  const documentSubtitle = useMemo(() => {
    if (selectedCategories.length === 0) return isPt ? 'NENHUMA CATEGORIA SELECIONADA' : 'NO CATEGORY SELECTED';
    if (selectedCategories.length === CATEGORY_DEFINITIONS.length && !hasActiveGranularFilters) {
      return isPt ? 'RELAÇÃO GERAL CONSOLIDADA (TODOS OS CURSOS E ALUNOS)' : 'CONSOLIDATED GENERAL ROSTER (ALL COURSES & STUDENTS)';
    }
    const names = selectedCategories.map((id) => {
      const def = CATEGORY_DEFINITIONS.find((c) => c.id === id);
      return def ? (isPt ? def.label : def.labelEn).toUpperCase() : id.toUpperCase();
    });
    let base = (isPt ? 'RELAÇÃO CONSOLIDADA: ' : 'CONSOLIDATED ROSTER: ') + names.join(' • ');
    if (selectedCourses.length > 0) {
      base += ` | CURSOS: ${selectedCourses.join(', ')}`;
    }
    return base;
  }, [selectedCategories, selectedCourses, hasActiveGranularFilters, isPt]);

  if (!isOpen) return null;

  const handlePrint = () => {
    printElementIsolated('print-combined-dashboard-sheet', documentSubtitle, { orientation });
  };

  const handleExportPDF = async () => {
    setIsExportingPDF(true);
    const filename = `relacao_consolidada_${selectedCategories.join('_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    await downloadElementAsPDF('print-combined-dashboard-sheet', {
      orientation,
      filename,
      scale: 2
    });
    setIsExportingPDF(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden my-auto"
        >
          {/* MODAL HEADER */}
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                <Printer size={20} />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>{isPt ? 'Imprimir Relação Consolidada' : 'Print Consolidated Roster'}</span>
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full border border-indigo-200">
                    {isPt ? 'Filtro Combinado de Cursos e Turmas' : 'Combined Filter'}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  {isPt 
                    ? 'Filtre por categorias, cursos específicos e turmas para gerar a lista nominal com alunos e impressão oficial.' 
                    : 'Filter by categories, specific courses and classes to generate nominal student lists and official printouts.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* CONFIGURATION TOOLBAR */}
          <div className="p-4 bg-slate-100/90 border-b border-slate-200 space-y-3.5 shrink-0 max-h-[40vh] overflow-y-auto custom-scrollbar">
            {/* 1. CATEGORY SELECTORS WITH CHECKBOXES */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <CheckSquare size={14} className="text-indigo-600" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                    {isPt ? '1. Categorias Selecionadas:' : '1. Selected Categories:'}
                  </span>
                  <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                    {selectedCategories.length} {isPt ? 'ativas' : 'active'}
                  </span>
                </div>

                {/* ACTION BUTTONS */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => onSetCategories(CATEGORY_DEFINITIONS.map(c => c.id))}
                    className="px-2.5 py-1 rounded-lg font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition cursor-pointer shadow-2xs text-[11px] flex items-center gap-1"
                  >
                    <CheckSquare size={12} />
                    <span>{isPt ? 'Marcar Todas' : 'Select All'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetCategories(['carreira', 'especial', 'expedito', 'ead'])}
                    className="px-2.5 py-1 rounded-lg font-bold bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 transition cursor-pointer shadow-2xs text-[11px]"
                  >
                    {isPt ? 'Apenas Cursos' : 'Courses Only'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetCategories([])}
                    className="px-2.5 py-1 rounded-lg font-medium bg-white hover:bg-slate-200 text-slate-600 border border-slate-300 transition cursor-pointer shadow-2xs text-[11px] flex items-center gap-1"
                  >
                    <Square size={12} />
                    <span>{isPt ? 'Desmarcar Todas' : 'Clear All'}</span>
                  </button>
                </div>
              </div>

              {/* CHECKBOXES GRID */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-1.5">
                {CATEGORY_DEFINITIONS.map((cat) => {
                  const isChecked = selectedCategories.includes(cat.id);
                  const Icon = cat.icon;
                  const counts = categoryDataCounts[cat.id] || { turmasCount: 0, alunosCount: 0 };
                  return (
                    <div
                      key={`modal-cat-${cat.id}`}
                      onClick={() => onToggleCategory(cat.id)}
                      className={cn(
                        "p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-2 select-none shadow-2xs",
                        isChecked
                          ? "bg-indigo-50/90 border-indigo-500 shadow-sm ring-1 ring-indigo-500/30"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700"
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded flex items-center justify-center border transition shrink-0",
                        isChecked
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-2xs"
                          : "border-slate-300 bg-white"
                      )}>
                        {isChecked ? <Check size={11} strokeWidth={3} /> : null}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className={cn(
                          "text-[11px] font-bold truncate leading-tight",
                          isChecked ? "text-indigo-950" : "text-slate-800"
                        )}>
                          {isPt ? cat.label : cat.labelEn}
                        </p>
                        <p className="text-[9px] text-slate-500 font-semibold truncate">
                          {cat.id === 'exterior' 
                            ? `${counts.alunosCount} ${isPt ? 'alunos' : 'std'}`
                            : `${counts.turmasCount} t. • ${counts.alunosCount} al.`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. GRANULAR FILTERS: CAIXAS DE SELEÇÃO DE CURSOS E TURMAS */}
            <div className="pt-2 border-t border-slate-200/90 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-800">
                  <FolderTree size={14} className="text-indigo-600" />
                  <span>{isPt ? '2. Caixa de Seleção Combinada (Cursos e Turmas):' : '2. Combined Courses & Classes Selection:'}</span>
                </div>
                {hasActiveGranularFilters && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="text-[11px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded-md transition cursor-pointer"
                  >
                    <RotateCcw size={11} />
                    <span>{isPt ? 'Limpar Filtros de Cursos e Turmas' : 'Clear Course/Class Filters'}</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* SEÇÃO DE CURSOS */}
                <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <BookMarked size={13} className="text-indigo-600" />
                      <span>{isPt ? 'Cursos Disponíveis' : 'Available Courses'}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({availableCourses.length})</span>
                    </span>
                    {selectedCourses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedCourses([])}
                        className="text-[10px] font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
                      >
                        {isPt ? 'Desmarcar todos' : 'Uncheck all'}
                      </button>
                    )}
                  </div>

                  {availableCourses.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-1">
                      {isPt ? 'Nenhum curso encontrado nas categorias selecionadas.' : 'No courses found in selected categories.'}
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                      {availableCourses.map((c) => {
                        const isSelected = selectedCourses.includes(c.nome);
                        return (
                          <button
                            key={`print-filter-curso-${c.nome}`}
                            type="button"
                            onClick={() => toggleCourseFilter(c.nome)}
                            className={cn(
                              "px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border text-left",
                              isSelected
                                ? "bg-indigo-600 text-white border-indigo-700 shadow-xs"
                                : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                            )}
                          >
                            <span className={cn(
                              "w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] border transition-colors shrink-0",
                              isSelected ? "bg-white text-indigo-600 border-white" : "border-slate-300 bg-white"
                            )}>
                              {isSelected && <Check size={10} strokeWidth={3} />}
                            </span>
                            <span className="truncate max-w-[180px]">{c.nome}</span>
                            <span className={cn("text-[10px] font-bold px-1 rounded", isSelected ? "bg-indigo-700 text-indigo-100" : "bg-slate-200 text-slate-600")}>
                              {c.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* SEÇÃO DE TURMAS */}
                <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <LayoutGrid size={13} className="text-indigo-600" />
                      <span>{isPt ? 'Turmas Correspondentes' : 'Matching Classes'}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({availableTurmasOptions.length})</span>
                    </span>
                    {selectedTurmas.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedTurmas([])}
                        className="text-[10px] font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
                      >
                        {isPt ? 'Desmarcar todas' : 'Uncheck all'}
                      </button>
                    )}
                  </div>

                  {availableTurmasOptions.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-1">
                      {selectedCourses.length > 0 
                        ? (isPt ? 'Nenhuma turma para os cursos selecionados.' : 'No classes for selected courses.')
                        : (isPt ? 'Nenhuma turma disponível nas categorias selecionadas.' : 'No classes available in selected categories.')}
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                      {availableTurmasOptions.map((t) => {
                        const isSelected = selectedTurmas.includes(t.id);
                        return (
                          <button
                            key={`print-filter-turma-${t.id}`}
                            type="button"
                            onClick={() => toggleTurmaFilter(t.id)}
                            className={cn(
                              "px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border text-left",
                              isSelected
                                ? "bg-indigo-600 text-white border-indigo-700 shadow-xs"
                                : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                            )}
                          >
                            <span className={cn(
                              "w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] border transition-colors shrink-0",
                              isSelected ? "bg-white text-indigo-600 border-white" : "border-slate-300 bg-white"
                            )}>
                              {isSelected && <Check size={10} strokeWidth={3} />}
                            </span>
                            <span className="truncate max-w-[180px]">{t.cleanNome}</span>
                            <span className={cn("text-[10px] font-bold px-1 rounded", isSelected ? "bg-indigo-700 text-indigo-100" : "bg-slate-200 text-slate-600")}>
                              {t.alunosCount}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 3. PRINT OPTIONS & SEARCH */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 border-t border-slate-200/90">
              {/* Search input */}
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={isPt ? "Buscar aluno, OM, instrutor..." : "Search student, rank, unit..."}
                  className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Orientation */}
              <div className="flex items-center justify-between gap-1 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs">
                <span className="font-bold text-slate-600 text-[11px]">{isPt ? 'Formato:' : 'Format:'}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setOrientation('portrait')}
                    className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer",
                      orientation === 'portrait' ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    {isPt ? 'Retrato' : 'Portrait'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrientation('landscape')}
                    className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer",
                      orientation === 'landscape' ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    {isPt ? 'Paisagem' : 'Landscape'}
                  </button>
                </div>
              </div>

              {/* Photos Toggle */}
              <label className="flex items-center justify-between gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs cursor-pointer select-none">
                <span className="font-bold text-slate-600 text-[11px] flex items-center gap-1">
                  <ImageIcon size={12} className="text-purple-600" />
                  {isPt ? 'Fotos dos Alunos' : 'Student Photos'}
                </span>
                <input
                  type="checkbox"
                  checked={includePhotos}
                  onChange={(e) => setIncludePhotos(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                />
              </label>

              {/* Turma Students Details Toggle */}
              <label className="flex items-center justify-between gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs cursor-pointer select-none">
                <span className="font-bold text-slate-600 text-[11px] flex items-center gap-1">
                  <FileSpreadsheet size={12} className="text-emerald-600" />
                  {isPt ? 'Lista Nominal de Alunos' : 'Student Rosters'}
                </span>
                <input
                  type="checkbox"
                  checked={includeTurmaStudents}
                  onChange={(e) => setIncludeTurmaStudents(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* PREVIEW CONTAINER */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-200/60 custom-scrollbar">
            <div className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-xl shadow-md border border-slate-300 text-black">
              {/* PRINT DOCUMENT COMPONENT */}
              <div id="print-combined-dashboard-sheet" className="w-full text-black font-sans bg-white">
                {/* OFFICIAL HEADER */}
                <div className="flex items-center gap-6 mb-6 border-b-2 border-black pb-4">
                  <div className="w-24 h-24 shrink-0 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={typeof navalMissionLogo === 'string' ? navalMissionLogo : (navalMissionLogo as any)?.src || navalMissionLogo}
                      alt="Logo Missão de Assessoria Naval"
                      className="w-24 h-24 object-contain"
                      style={{ width: '96px', height: '96px' }}
                    />
                  </div>
                  <div className="flex-1 text-left">
                    <h1 className="text-base sm:text-lg font-extrabold uppercase tracking-tight text-black">
                      {isPt ? 'MISSÃO DE ASSESSORIA NAVAL DO BRASIL EM SÃO TOMÉ E PRÍNCIPE' : 'NAVAL ADVISORY MISSION OF BRAZIL IN SÃO TOMÉ AND PRÍNCIPE'}
                    </h1>
                    <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wide text-black mt-1">
                      {documentSubtitle}
                    </h2>
                    <div className="text-[10px] font-semibold text-black mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span><strong>CATEGORIAS:</strong> {summaryStats.categoryBreakdown.length}</span>
                      {summaryStats.totalTurmas > 0 && (
                        <span><strong>TOTAL DE TURMAS:</strong> {summaryStats.totalTurmas}</span>
                      )}
                      <span><strong>TOTAL DE ALUNOS:</strong> {summaryStats.totalAlunos}</span>
                      {selectedCourses.length > 0 && (
                        <span><strong>CURSOS SELECIONADOS:</strong> {selectedCourses.length}</span>
                      )}
                      <span><strong>EMISSÃO:</strong> {new Date().toLocaleDateString(isPt ? 'pt-BR' : 'en-US')}</span>
                    </div>
                  </div>
                </div>

                {/* NO SELECTION WARNING */}
                {selectedCategories.length === 0 && (
                  <div className="p-8 text-center italic text-sm text-slate-500 border border-dashed border-slate-300 rounded-xl my-4">
                    {isPt ? 'Selecione ao menos uma categoria para gerar o relatório combinado.' : 'Select at least one category to generate the combined report.'}
                  </div>
                )}

                {/* SEÇÃO 1: ALUNOS NO EXTERIOR */}
                {selectedCategories.includes('exterior') && (
                  <div className="mb-8 page-break-avoid">
                    <div className="bg-purple-100 border border-black px-3 py-1.5 font-bold text-xs uppercase flex items-center justify-between text-black mb-2">
                      <span className="flex items-center gap-2">
                        <GraduationCap size={14} />
                        <span>1. ALUNOS NO EXTERIOR ({totalFilteredAlunosExterior} ALUNOS)</span>
                      </span>
                      <span>{groupedAlunosExterior.length} DOCUMENTOS / GRUPOS</span>
                    </div>

                    {groupedAlunosExterior.length === 0 ? (
                      <div className="p-3 text-center italic border border-black mb-4 text-xs">
                        {isPt ? 'Nenhum aluno no exterior encontrado para os filtros selecionados.' : 'No students abroad found for selected filters.'}
                      </div>
                    ) : (
                      groupedAlunosExterior.map((group, gIdx) => (
                        <div key={`ext-grp-${gIdx}`} className="mb-4">
                          <div className="bg-gray-100 border border-black px-2 py-1 font-bold text-[10px] uppercase flex items-center justify-between text-black">
                            <span>DOCUMENTO / PORTARIA: {group.documento}</span>
                            <span>{group.alunos.length} {group.alunos.length === 1 ? 'ALUNO' : 'ALUNOS'}</span>
                          </div>
                          <table className="w-full text-left border-collapse border-x border-b border-black text-black">
                            <thead>
                              <tr className="border-b border-black bg-gray-50 text-[10px]">
                                <th className="p-1.5 border-r border-black font-bold uppercase w-[30px] text-center">#</th>
                                {includePhotos && (
                                  <th className="p-1.5 border-r border-black font-bold uppercase w-[50px] text-center">{isPt ? 'Foto' : 'Photo'}</th>
                                )}
                                <th className="p-1.5 border-r border-black font-bold uppercase">{isPt ? 'Posto/Graduação - Nome' : 'Rank - Name'}</th>
                                <th className="p-1.5 border-r border-black font-bold uppercase">{isPt ? 'Curso & Localização' : 'Course & Location'}</th>
                                <th className="p-1.5 border-r border-black font-bold uppercase text-center">{isPt ? 'Documento' : 'Document'}</th>
                                <th className="p-1.5 font-bold uppercase text-center">{isPt ? 'Período' : 'Period'}</th>
                              </tr>
                            </thead>
                            <tbody className="text-[10px]">
                              {group.alunos.map((aluno: any, aIdx: number) => {
                                const turmaData = Array.isArray(aluno.turma) ? aluno.turma[0] : aluno.turma;
                                const curso = Array.isArray(turmaData?.curso) ? turmaData.curso[0] : turmaData?.curso;
                                const photoSrc = aluno.foto_url ||
                                  (aluno.tipo_aluno === 'civil'
                                    ? (aluno.genero === 'feminino' ? femaleAvatar : maleAvatar)
                                    : (aluno.genero === 'feminino' ? militaryFemaleAvatar : militaryMaleAvatar));
                                const photoUrlString = typeof photoSrc === 'string' ? photoSrc : (photoSrc?.src || '');

                                return (
                                  <tr key={`al-ext-${aluno.id || aIdx}`} className="border-b border-black">
                                    <td className="p-1 border-r border-black text-center font-mono font-bold align-middle">{aIdx + 1}</td>
                                    {includePhotos && (
                                      <td className="p-1 border-r border-black text-center align-middle">
                                        <div className="w-[36px] h-[48px] mx-auto border border-black rounded-xs overflow-hidden bg-slate-100 flex items-center justify-center">
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img src={photoUrlString} alt={aluno.nome} className="w-full h-full object-cover" />
                                        </div>
                                      </td>
                                    )}
                                    <td className="p-1.5 border-r border-black align-middle">
                                      <div className="font-bold uppercase text-[11px]">
                                        {aluno.posto_graduacao || aluno.nome_guerra ? `${aluno.posto_graduacao || ''} ${aluno.nome_guerra || aluno.nome}`.trim() : aluno.nome}
                                      </div>
                                      <div className="text-[9px] uppercase text-black font-medium">{aluno.om || '-'}</div>
                                    </td>
                                    <td className="p-1.5 border-r border-black align-middle">
                                      <div className="font-bold uppercase text-[11px]">{curso?.nome || aluno.curso_nome || '-'}</div>
                                      <div className="text-[9px] uppercase text-black font-medium">
                                        {turmaData?.localizacao ? `${turmaData.localizacao}` : '-'}
                                      </div>
                                    </td>
                                    <td className="p-1.5 border-r border-black align-middle text-center font-mono font-bold">
                                      {turmaData?.documento_criacao || curso?.documento_criacao || aluno.documento_criacao || '-'}
                                    </td>
                                    <td className="p-1.5 text-center align-middle">
                                      {aluno.data_inicio_curso?.trim() ? aluno.data_inicio_curso.split('-').reverse().join('/') : (turmaData?.data_inicio?.trim() ? turmaData.data_inicio.split('-').reverse().join('/') : '—')}
                                      <span className="mx-1 font-bold">a</span>
                                      {aluno.data_fim_curso?.trim() ? aluno.data_fim_curso.split('-').reverse().join('/') : (turmaData?.data_fim?.trim() ? turmaData.data_fim.split('-').reverse().join('/') : '—')}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* SEÇÕES DE CURSOS (CARREIRA, ESPECIAL, EXPEDITO, EAD, PRÉ-INSCRITOS, ARQUIVADAS) */}
                {[
                  { id: 'carreira', title: 'CURSOS DE CARREIRA', list: filteredCarreiraList, color: 'bg-emerald-100' },
                  { id: 'especial', title: 'CURSOS ESPECIAIS', list: filteredEspecialList, color: 'bg-blue-100' },
                  { id: 'expedito', title: 'CURSOS EXPEDITOS', list: filteredExpeditoList, color: 'bg-amber-100' },
                  { id: 'ead', title: 'CURSOS EAD', list: filteredEadList, color: 'bg-cyan-100' },
                  { id: 'pre_inscritos', title: 'TURMAS PRÉ-INSCRITAS', list: filteredPreInscritasList, color: 'bg-red-100' },
                  { id: 'arquivadas', title: 'TURMAS ARQUIVADAS', list: filteredArquivadasList, color: 'bg-slate-200' }
                ].map((sec) => {
                  if (!selectedCategories.includes(sec.id)) return null;

                  const totalCategoryAlunos = sec.list.reduce((acc: number, t: any) => acc + (t.alunos?.length || t.alunos_count || t.total_alunos || 0), 0);

                  return (
                    <div key={`section-cat-${sec.id}`} className="mb-8 page-break-avoid">
                      <div className={cn("border border-black px-3 py-1.5 font-bold text-xs uppercase flex items-center justify-between text-black mb-2", sec.color)}>
                        <span>{sec.title} ({sec.list.length} TURMAS • {totalCategoryAlunos} ALUNOS)</span>
                        <span>EM ANDAMENTO / CONCLUÍDAS</span>
                      </div>

                      {sec.list.length === 0 ? (
                        <div className="p-3 text-center italic border border-black mb-4 text-xs">
                          {isPt ? 'Nenhuma turma encontrada nesta categoria para os filtros selecionados.' : 'No classes found in this category for selected filters.'}
                        </div>
                      ) : (
                        <table className="w-full text-left border-collapse border border-black text-black mb-4">
                          <thead>
                            <tr className="border-b border-black bg-gray-100 text-[10px]">
                              <th className="p-1.5 border-r border-black font-bold uppercase w-[30px] text-center">#</th>
                              <th className="p-1.5 border-r border-black font-bold uppercase">{isPt ? 'Turma' : 'Class'}</th>
                              <th className="p-1.5 border-r border-black font-bold uppercase">{isPt ? 'Curso' : 'Course'}</th>
                              <th className="p-1.5 border-r border-black font-bold uppercase">{isPt ? 'Instrutor / Encarregado' : 'Instructor'}</th>
                              <th className="p-1.5 border-r border-black font-bold uppercase text-center">{isPt ? 'Doc. Criação' : 'Doc Creation'}</th>
                              <th className="p-1.5 border-r border-black font-bold uppercase">{isPt ? 'Localização' : 'Location'}</th>
                              <th className="p-1.5 border-r border-black font-bold uppercase text-center">{isPt ? 'Período' : 'Period'}</th>
                              <th className="p-1.5 border-r border-black font-bold uppercase text-center w-[55px]">{isPt ? 'Alunos' : 'Students'}</th>
                              <th className="p-1.5 font-bold uppercase text-center w-[75px]">{isPt ? 'Status' : 'Status'}</th>
                            </tr>
                          </thead>
                          <tbody className="text-[10px]">
                            {sec.list.map((t: any, tIdx: number) => {
                              const cursoNome = getCursoNomeFromTurma(t);
                              const cleanName = getCleanTurmaName(t, cursoNome, t.nome);
                              const alunosCount = t.alunos?.length || t.alunos_count || t.total_alunos || 0;
                              return (
                                <React.Fragment key={`row-t-${t.id || tIdx}`}>
                                  <tr className="border-b border-black">
                                    <td className="p-1.5 border-r border-black text-center font-mono font-bold align-middle">{tIdx + 1}</td>
                                    <td className="p-1.5 border-r border-black font-bold uppercase align-middle">{cleanName}</td>
                                    <td className="p-1.5 border-r border-black font-bold uppercase align-middle">{cursoNome || '-'}</td>
                                    <td className="p-1.5 border-r border-black uppercase align-middle">{t.instrutor || '-'}</td>
                                    <td className="p-1.5 border-r border-black font-mono font-bold text-center align-middle">{t.documento_criacao || t.curso?.documento_criacao || '-'}</td>
                                    <td className="p-1.5 border-r border-black uppercase align-middle">{t.localizacao || '-'}</td>
                                    <td className="p-1.5 border-r border-black text-center align-middle">
                                      {t.data_inicio ? t.data_inicio.split('-').reverse().join('/') : '-'}
                                      {t.data_fim && (
                                        <>
                                          <span className="mx-1 font-bold">a</span>
                                          {t.data_fim.split('-').reverse().join('/')}
                                        </>
                                      )}
                                    </td>
                                    <td className="p-1.5 border-r border-black text-center font-bold align-middle">{alunosCount}</td>
                                    <td className="p-1.5 text-center font-bold uppercase align-middle">{t.status || 'Ativa'}</td>
                                  </tr>

                                  {/* DETALHAMENTO NOMINAL DE ALUNOS DA TURMA SE HABILITADO */}
                                  {includeTurmaStudents && t.alunos && t.alunos.length > 0 && (
                                    <tr className="border-b-2 border-black bg-slate-50/50">
                                      <td colSpan={9} className="p-2 border-r border-black">
                                        <div className="pl-4 pr-2 py-1 space-y-1">
                                          <div className="text-[9px] font-extrabold uppercase tracking-wide text-slate-800 flex items-center gap-1.5">
                                            <span>↳ RELAÇÃO NOMINAL DE ALUNOS ({t.alunos.length} ALUNOS MATRICULADOS):</span>
                                          </div>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1.5 text-[9px] pt-1">
                                            {t.alunos.map((al: any, alIdx: number) => {
                                              const alPhotoSrc = al.foto_url ||
                                                (al.tipo_aluno === 'civil'
                                                  ? (al.genero === 'feminino' ? femaleAvatar : maleAvatar)
                                                  : (al.genero === 'feminino' ? militaryFemaleAvatar : militaryMaleAvatar));
                                              const alPhotoUrl = typeof alPhotoSrc === 'string' ? alPhotoSrc : (alPhotoSrc?.src || '');

                                              return (
                                                <div key={`sub-al-${al.id || alIdx}`} className="flex items-center gap-2 border-b border-slate-200/50 pb-0.5">
                                                  {includePhotos && (
                                                    <div className="w-5 h-6 rounded-xs overflow-hidden border border-black/50 bg-slate-100 shrink-0">
                                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                                      <img src={alPhotoUrl} alt={al.nome} className="w-full h-full object-cover" />
                                                    </div>
                                                  )}
                                                  <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-1">
                                                      <span className="font-mono font-bold text-slate-600">{alIdx + 1}.</span>
                                                      <span className="font-bold uppercase text-black truncate">
                                                        {al.posto_graduacao || al.nome_guerra ? `${al.posto_graduacao || ''} ${al.nome_guerra || al.nome}`.trim() : al.nome}
                                                      </span>
                                                    </div>
                                                    {al.om && <span className="text-slate-600 text-[8px] uppercase block truncate">{al.om}</span>}
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  );
                })}

                {/* TABELA SÍNTESE CONSOLIDADA */}
                {summaryStats.categoryBreakdown.length > 0 && (
                  <div className="mt-8 mb-6 page-break-avoid">
                    <div className="bg-gray-200 border border-black px-3 py-1 font-bold text-xs uppercase flex items-center justify-between text-black">
                      <span>QUADRO SÍNTESE CONSOLIDADO (TOTALIZAÇÃO GERAL)</span>
                      <span>{summaryStats.categoryBreakdown.length} CATEGORIAS</span>
                    </div>
                    <table className="w-full text-left border-collapse border border-black text-black">
                      <thead>
                        <tr className="border-b border-black bg-gray-100 text-[10px]">
                          <th className="p-2 border-r border-black font-bold uppercase">CATEGORIA DE CURSO / ATIVIDADE</th>
                          <th className="p-2 border-r border-black font-bold uppercase text-center w-[120px]">TOTAL DE TURMAS</th>
                          <th className="p-2 font-bold uppercase text-center w-[120px]">TOTAL DE ALUNOS</th>
                        </tr>
                      </thead>
                      <tbody className="text-[11px]">
                        {summaryStats.categoryBreakdown.map((item) => (
                          <tr key={`summary-row-${item.id}`} className="border-b border-black">
                            <td className="p-2 border-r border-black font-bold uppercase">{item.name}</td>
                            <td className="p-2 border-r border-black text-center font-bold">{item.turmasCount > 0 ? item.turmasCount : '—'}</td>
                            <td className="p-2 text-center font-black">{item.alunosCount}</td>
                          </tr>
                        ))}
                        <tr className="bg-gray-200 font-extrabold border-t-2 border-black text-[12px]">
                          <td className="p-2 border-r border-black uppercase">TOTAL GERAL CONSOLIDADO</td>
                          <td className="p-2 border-r border-black text-center">{summaryStats.totalTurmas > 0 ? summaryStats.totalTurmas : '—'}</td>
                          <td className="p-2 text-center">{summaryStats.totalAlunos}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* OFFICIAL SIGNATURE FOOTER */}
                <div className="mt-12 pt-6 text-center page-break-avoid">
                  <div className="w-72 mx-auto border-t-2 border-black pt-2">
                    <p className="font-extrabold uppercase text-xs text-black">
                      {isPt ? 'Coordenador de Cursos' : 'Course Coordinator'}
                    </p>
                    <p className="text-[10px] uppercase text-black font-semibold mt-0.5">
                      {isPt ? 'Missão de Assessoria Naval do Brasil em STP' : 'Naval Advisory Mission of Brazil in STP'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* MODAL FOOTER ACTIONS */}
          <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
              <Sparkles size={14} className="text-indigo-600" />
              <span>
                {isPt 
                  ? `Relatório pronto com ${summaryStats.totalTurmas} turma(s) e ${summaryStats.totalAlunos} aluno(s).` 
                  : `Report ready with ${summaryStats.totalTurmas} class(es) and ${summaryStats.totalAlunos} student(s).`}
              </span>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition cursor-pointer"
              >
                {isPt ? 'Fechar' : 'Close'}
              </button>
              
              <button
                type="button"
                onClick={handleExportPDF}
                disabled={isExportingPDF || selectedCategories.length === 0}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition cursor-pointer shadow-2xs disabled:opacity-50"
              >
                <Download size={14} />
                <span>{isExportingPDF ? (isPt ? 'Gerando PDF...' : 'Generating...') : (isPt ? 'Baixar PDF (A4)' : 'Download PDF')}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                disabled={selectedCategories.length === 0}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 transition cursor-pointer disabled:opacity-50"
              >
                <Printer size={14} />
                <span>{isPt ? 'Imprimir Documento' : 'Print Document'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
