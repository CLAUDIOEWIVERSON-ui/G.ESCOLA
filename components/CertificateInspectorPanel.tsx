'use client';

import React from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  Bold,
  Calendar,
  Download,
  FileText,
  FolderOpen,
  Frame,
  Image as ImageIcon,
  Italic,
  Layers,
  Maximize2,
  Move,
  Pencil,
  PenTool,
  Plus,
  RefreshCw,
  RotateCcw,
  Settings,
  Shield,
  Sparkles,
  Trash2,
  Type,
  Upload,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CertificateDisciplineRow,
  CertificateFontKey,
  CertificateSelectableObject,
  CertificateStudentContext,
  CertificateTemplateConfig,
  applyFormalA4LayoutToTemplate,
  extractModuleNumberFromRow,
  groupCertificateRowsByModule,
  pxToPtNumber,
} from '@/lib/certificateTypes';
import {
  CertificateAssetCategory,
  CertificateAssetTarget,
  CertificateLibraryAsset,
} from '@/lib/certificateLibrary';

interface CertificateInspectorPanelProps {
  selectedObject: CertificateSelectableObject;
  template: CertificateTemplateConfig;
  setTemplate: React.Dispatch<React.SetStateAction<CertificateTemplateConfig>>;
  onSelectObject: (obj: CertificateSelectableObject) => void;
  onClose: () => void;
  dragMoveEnabled: boolean;
  onToggleDragMove: () => void;
  selectedStudentObj: any | null;
  activeStudentContext: CertificateStudentContext;
  isEditingIndividualBody: boolean;
  activeBodyTextValue: string;
  updateActiveBodyText: (updater: string | ((current: string) => string)) => void;
  handleEnableIndividualBody: () => void;
  handleRestoreDefaultBodyForStudent: () => void;
  applyInlineBodyFormat: (marker: '**' | '*' | '***') => void;
  insertPlaceholder: (token: string) => void;
  bodyTextareaRef: React.RefObject<HTMLTextAreaElement | null>;
  customStudentRank: string;
  setCustomStudentRank: (val: string) => void;
  customStudentName: string;
  setCustomStudentName: (val: string) => void;
  customStudentGenero: 'masculino' | 'feminino';
  setCustomStudentGenero: (val: 'masculino' | 'feminino') => void;
  customCourseName: string;
  setCustomCourseName: (val: string) => void;
  handleImageUpload: (
    field:
      | 'molduraFrenteUrl'
      | 'logoEsquerdaUrl'
      | 'logoCentroUrl'
      | 'logoDireitaUrl'
      | 'marcaDaguaFrenteUrl'
      | 'marcaDaguaVersoUrl',
    e: React.ChangeEvent<HTMLInputElement>
  ) => void;
  effectiveBackPreviewRows: CertificateDisciplineRow[];
  totalHorasLabel: string;
  mediaFinalLabel: string;
  useTurmaStudentGrades: boolean;
  handleSyncDisciplinesFromTurma: () => void;
  handleConsolidateTemplateRowsByModule: () => void;
  handleAddDisciplineRow: () => void;
  handleUpdateDisciplineRow: (
    idx: number,
    field: keyof CertificateDisciplineRow,
    val: string | number | null
  ) => void;
  handleRemoveDisciplineRow: (idx: number) => void;
  handleMoveDisciplineRow: (idx: number, dir: -1 | 1) => void;
  libraryAssets?: CertificateLibraryAsset[];
  onApplyLibraryAsset?: (asset: CertificateLibraryAsset, target: CertificateAssetTarget) => void;
  onDownloadLibraryAsset?: (asset: CertificateLibraryAsset) => void;
  onDeleteLibraryAsset?: (asset: CertificateLibraryAsset) => void;
  onSaveCurrentAssetToLibrary?: (
    category: CertificateAssetCategory,
    url: string,
    suggestedName: string
  ) => void;
  onOpenLibrary?: (category: CertificateAssetCategory) => void;
}

const FONT_OPTIONS_FRONT: { value: CertificateFontKey; label: string }[] = [
  { value: 'garamond', label: 'Garamond (Padrão Original)' },
  { value: 'times', label: 'Times New Roman' },
  { value: 'georgia', label: 'Georgia Clássica' },
  { value: 'palatino', label: 'Palatino / Book Antiqua' },
  { value: 'lora', label: 'Lora Editorial' },
  { value: 'cinzel', label: 'Cinzel Romana' },
  { value: 'script', label: 'Caligráfica Formal' },
  { value: 'sans', label: 'Arial Limpa (Sans)' },
];

const FONT_OPTIONS_BACK: { value: CertificateFontKey; label: string }[] = [
  { value: 'sans', label: 'Padrão Original (Arial / Sans)' },
  { value: 'garamond', label: 'Garamond' },
  { value: 'times', label: 'Times New Roman' },
  { value: 'georgia', label: 'Georgia Clássica' },
  { value: 'palatino', label: 'Palatino' },
  { value: 'lora', label: 'Lora' },
  { value: 'cinzel', label: 'Cinzel' },
];

function getObjectMeta(obj: CertificateSelectableObject): {
  title: string;
  subtitle: string;
  sideLabel: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
} {
  switch (obj) {
    case 'brasaoEsquerdo':
      return {
        title: 'Brasão Esquerdo',
        subtitle: 'Exibir/inibir, tamanho, opacidade, imagem e posição',
        sideLabel: 'Frente / Verso',
        icon: Shield,
      };
    case 'brasaoCentro':
      return {
        title: 'Brasão Central',
        subtitle: 'Inserir imagem, legenda, tamanho, opacidade e posição',
        sideLabel: 'Frente',
        icon: Shield,
      };
    case 'brasaoDireito':
      return {
        title: 'Brasão Direito',
        subtitle: 'Exibir/inibir, legenda, imagem, tamanho, opacidade e posição',
        sideLabel: 'Frente / Verso',
        icon: Shield,
      };
    case 'titulo':
      return {
        title: 'Título Principal',
        subtitle: 'Texto, fonte, negrito/itálico e posicionamento',
        sideLabel: 'Frente',
        icon: Type,
      };
    case 'texto':
      return {
        title: 'Texto do Certificado',
        subtitle: 'Conteúdo, texto individual por aluno, placeholders e fonte',
        sideLabel: 'Frente',
        icon: FileText,
      };
    case 'data':
      return {
        title: 'Local e Data',
        subtitle: 'Local, data por extenso, alinhamento e posição independente',
        sideLabel: 'Frente',
        icon: Calendar,
      };
    case 'assinaturaPrincipal':
      return {
        title: 'Assinatura Principal',
        subtitle: 'Nome, posto, função, estilo, lado e posição independente',
        sideLabel: 'Frente',
        icon: PenTool,
      };
    case 'segundaAssinatura':
      return {
        title: '2ª Assinatura (Lado Oposto)',
        subtitle: 'Ativar/ocultar, dados do assinante e posição independente',
        sideLabel: 'Frente',
        icon: PenTool,
      };
    case 'marcaDaguaFrente':
      return {
        title: "Marca d'Água (Frente)",
        subtitle: 'Imagem, tamanho, largura, altura, opacidade e altura vertical',
        sideLabel: 'Frente',
        icon: ImageIcon,
      };
    case 'molduraFrente':
      return {
        title: 'Moldura da Frente',
        subtitle: 'Moldura original/vetorial, cor e imagem personalizada',
        sideLabel: 'Frente',
        icon: Frame,
      };
    case 'versoTitulo':
      return {
        title: 'Título do Curso (Verso)',
        subtitle: 'Título do verso, fonte e itálico',
        sideLabel: 'Verso',
        icon: Type,
      };
    case 'versoTabela':
      return {
        title: 'Disciplinas e Notas (Verso)',
        subtitle: 'Módulos, notas do Boletim, carga horária, média e totais',
        sideLabel: 'Verso',
        icon: Layers,
      };
    case 'marcaDaguaVerso':
      return {
        title: "Marca d'Água (Verso)",
        subtitle: 'Imagem, tamanho, escala, opacidade e altura vertical',
        sideLabel: 'Verso',
        icon: ImageIcon,
      };
    case 'versoMoldura':
      return {
        title: 'Moldura do Verso',
        subtitle: 'Cor da borda institucional do verso',
        sideLabel: 'Verso',
        icon: Frame,
      };
    case 'modeloGeral':
    default:
      return {
        title: 'Configurações do Modelo',
        subtitle: 'Nome do modelo, emissão avulsa, fontes globais e atalhos',
        sideLabel: 'Geral',
        icon: Settings,
      };
  }
}

export function CertificateInspectorPanel({
  selectedObject,
  template,
  setTemplate,
  onSelectObject,
  onClose,
  dragMoveEnabled,
  onToggleDragMove,
  selectedStudentObj,
  activeStudentContext,
  isEditingIndividualBody,
  activeBodyTextValue,
  updateActiveBodyText,
  handleEnableIndividualBody,
  handleRestoreDefaultBodyForStudent,
  applyInlineBodyFormat,
  insertPlaceholder,
  bodyTextareaRef,
  customStudentRank,
  setCustomStudentRank,
  customStudentName,
  setCustomStudentName,
  customStudentGenero,
  setCustomStudentGenero,
  customCourseName,
  setCustomCourseName,
  handleImageUpload,
  effectiveBackPreviewRows,
  totalHorasLabel,
  mediaFinalLabel,
  useTurmaStudentGrades,
  handleSyncDisciplinesFromTurma,
  handleConsolidateTemplateRowsByModule,
  handleAddDisciplineRow,
  handleUpdateDisciplineRow,
  handleRemoveDisciplineRow,
  handleMoveDisciplineRow,
  libraryAssets = [],
  onApplyLibraryAsset,
  onDownloadLibraryAsset,
  onDeleteLibraryAsset,
  onSaveCurrentAssetToLibrary,
  onOpenLibrary,
}: CertificateInspectorPanelProps) {
  const meta = getObjectMeta(selectedObject);
  const HeaderIcon = meta.icon;

  const normalizeFrontFont = (font?: CertificateFontKey) =>
    !font || font === 'serif-italic' ? 'garamond' : font;

  const isAssetSelectedForTarget = (
    asset: CertificateLibraryAsset,
    target: CertificateAssetTarget
  ): boolean => {
    if (target === 'brasaoEsquerdo') {
      return Boolean(template.logoEsquerdaUrl) && template.logoEsquerdaUrl === asset.url;
    }
    if (target === 'brasaoCentro') {
      return Boolean(template.logoCentroUrl) && template.logoCentroUrl === asset.url;
    }
    if (target === 'brasaoDireito') {
      if (asset.isDefaultMarinhaCrest) {
        return !template.logoDireitaUrl && template.usarBrasaoPadraoDireita !== false;
      }
      return Boolean(template.logoDireitaUrl) && template.logoDireitaUrl === asset.url;
    }
    if (target === 'marcaDaguaFrente') {
      return Boolean(template.marcaDaguaFrenteUrl) && template.marcaDaguaFrenteUrl === asset.url;
    }
    if (target === 'marcaDaguaVerso') {
      return Boolean(template.marcaDaguaVersoUrl) && template.marcaDaguaVersoUrl === asset.url;
    }
    if (target === 'molduraFrente') {
      const currentStyle =
        template.estiloMolduraFrente ??
        (template.usarMolduraOriginal !== false ? 'original' : 'vetorial');
      if (asset.frameStyle === 'vetorial' || asset.frameStyle === 'simples') {
        return currentStyle === asset.frameStyle;
      }
      return currentStyle === 'original' && template.molduraFrenteUrl === asset.url;
    }
    return false;
  };

  const renderLibrarySwapStrip = (
    category: CertificateAssetCategory,
    target: CertificateAssetTarget,
    currentUrl: string | undefined,
    suggestedName: string
  ) => {
    const items = libraryAssets.filter((a) => a.category === category);
    if (!items.length && !onOpenLibrary && !currentUrl) return null;

    const currentAsset = items.find((a) => isAssetSelectedForTarget(a, target));
    const effectiveCurrentUrl = currentUrl || currentAsset?.url;
    const alreadyInLibrary = Boolean(
      currentAsset || (effectiveCurrentUrl && items.some((a) => a.url === effectiveCurrentUrl))
    );

    return (
      <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
            Troca Rápida da Biblioteca
          </span>
          <div className="flex flex-wrap items-center gap-1">
            {effectiveCurrentUrl && onDownloadLibraryAsset && (
              <button
                type="button"
                onClick={() =>
                  onDownloadLibraryAsset(
                    currentAsset || {
                      id: `current-${target}`,
                      name: suggestedName,
                      category,
                      url: effectiveCurrentUrl,
                      source: 'custom',
                    }
                  )
                }
                className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                title="Baixar imagem atual deste elemento"
              >
                <Download size={10} />
                <span>Baixar</span>
              </button>
            )}
            {effectiveCurrentUrl && !alreadyInLibrary && onSaveCurrentAssetToLibrary && (
              <button
                type="button"
                onClick={() => onSaveCurrentAssetToLibrary(category, effectiveCurrentUrl, suggestedName)}
                className="px-2 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                title="Acrescentar imagem atual à biblioteca"
              >
                <Plus size={10} />
                <span>Salvar na Biblioteca</span>
              </button>
            )}
            {onOpenLibrary && (
              <button
                type="button"
                onClick={() => onOpenLibrary(category)}
                className="px-2 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                title="Abrir biblioteca completa para gerenciar e baixar recursos"
              >
                <FolderOpen size={10} />
                <span>Biblioteca</span>
              </button>
            )}
          </div>
        </div>

        {items.length > 0 && onApplyLibraryAsset && (
          <div className="grid grid-cols-3 gap-1.5 max-h-40 overflow-y-auto pr-0.5 custom-scrollbar">
            {items.map((asset) => {
              const selected = isAssetSelectedForTarget(asset, target);
              return (
                <div
                  key={asset.id}
                  className={cn(
                    'group relative rounded-lg border p-1.5 flex flex-col items-center gap-1 transition-all',
                    selected
                      ? 'border-blue-700 bg-blue-50/80 ring-1 ring-blue-700'
                      : 'border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-white'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onApplyLibraryAsset(asset, target)}
                    className="w-full flex flex-col items-center gap-1 cursor-pointer"
                    title={`Trocar mantendo tamanho e posição (${asset.name})`}
                  >
                    <div className="w-full h-10 flex items-center justify-center overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={asset.url}
                        alt={asset.name}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <span className="text-[9px] font-bold text-slate-700 truncate w-full text-center">
                      {asset.name}
                    </span>
                  </button>
                  {(onDownloadLibraryAsset || onDeleteLibraryAsset) && (
                    <div className="absolute top-1 right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onDownloadLibraryAsset && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDownloadLibraryAsset(asset);
                          }}
                          className="p-1 rounded bg-white/95 hover:bg-slate-100 border border-slate-200 text-slate-700 cursor-pointer"
                          title={`Baixar ${asset.name}`}
                        >
                          <Download size={9} />
                        </button>
                      )}
                      {onDeleteLibraryAsset && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteLibraryAsset(asset);
                          }}
                          className="p-1 rounded bg-white/95 hover:bg-rose-50 border border-slate-200 text-rose-600 cursor-pointer"
                          title={`Excluir "${asset.name}" da biblioteca`}
                        >
                          <Trash2 size={9} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderStandaloneStudentBox = () => {
    if (selectedStudentObj) return null;
    return (
      <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 space-y-3">
        <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-blue-900">
          <Sparkles size={13} />
          <span>Dados de Exemplo / Emissão Avulsa</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
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
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
              Gênero (Artigo)
            </label>
            <select
              value={customStudentGenero}
              onChange={(e) =>
                setCustomStudentGenero(
                  e.target.value === 'feminino' ? 'feminino' : 'masculino'
                )
              }
              className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
            >
              <option value="feminino">Feminino (a)</option>
              <option value="masculino">Masculino (ao)</option>
            </select>
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
    );
  };

  const renderMoveOnSheetButton = () => (
    <button
      type="button"
      onClick={onToggleDragMove}
      className={cn(
        'px-2.5 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all',
        dragMoveEnabled
          ? 'bg-blue-700 text-white border-blue-800'
          : 'bg-white text-blue-800 border-blue-200 hover:bg-blue-50'
      )}
    >
      <Move size={11} />
      <span>{dragMoveEnabled ? 'Arraste Ativo' : 'Mover na Folha'}</span>
    </button>
  );

  const renderCrestEditor = (side: 'left' | 'center' | 'right') => {
    const isLeft = side === 'left';
    const isCenter = side === 'center';

    const showKey = isLeft
      ? ('mostrarLogoEsquerda' as const)
      : isCenter
        ? ('mostrarLogoCentro' as const)
        : ('mostrarLogoDireita' as const);
    const defaultShown = !isCenter;
    const isShown = defaultShown ? template[showKey] !== false : template[showKey] === true;

    const uploadField = isLeft
      ? ('logoEsquerdaUrl' as const)
      : isCenter
        ? ('logoCentroUrl' as const)
        : ('logoDireitaUrl' as const);
    const defaultUrl = isLeft ? '/assets/aistudio/imagem_01_2da3aec8.png' : '';

    const xKey = isLeft
      ? ('logoEsquerdaOffsetX' as const)
      : isCenter
        ? ('logoCentroOffsetX' as const)
        : ('logoDireitaOffsetX' as const);
    const yKey = isLeft
      ? ('logoEsquerdaOffsetY' as const)
      : isCenter
        ? ('logoCentroOffsetY' as const)
        : ('logoDireitaOffsetY' as const);
    const sizeKey = isLeft
      ? ('tamanhoLogoEsquerda' as const)
      : isCenter
        ? ('tamanhoLogoCentro' as const)
        : ('tamanhoLogoDireita' as const);
    const opacityKey = isLeft
      ? ('opacidadeLogoEsquerda' as const)
      : isCenter
        ? ('opacidadeLogoCentro' as const)
        : ('opacidadeLogoDireita' as const);

    const defaultSize = isLeft ? 90 : isCenter ? 84 : 74;
    const minX = isLeft ? -90 : isCenter ? -420 : -760;
    const maxX = isLeft ? 760 : isCenter ? 420 : 90;
    const minY = isCenter ? -110 : -60;
    const maxY = isCenter ? 640 : 520;

    const valX = template[xKey] ?? 0;
    const valY = template[yKey] ?? 0;
    const valSize = template[sizeKey] ?? defaultSize;
    const valOpacity = template[opacityKey] ?? 1;
    const currentUrl = template[uploadField] || '';

    return (
      <div className="space-y-4">
        {/* Mini 3-tab switcher between crests */}
        <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
          {[
            { id: 'brasaoEsquerdo' as const, label: 'Esquerdo' },
            { id: 'brasaoCentro' as const, label: 'Central' },
            { id: 'brasaoDireito' as const, label: 'Direito' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectObject(tab.id)}
              className={cn(
                'py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer',
                selectedObject === tab.id
                  ? 'bg-white text-blue-900 shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div
          className={cn(
            'p-3.5 rounded-xl border space-y-3',
            isShown ? 'bg-slate-50 border-slate-200' : 'bg-slate-100/80 border-slate-200'
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={isShown}
                onChange={(e) =>
                  setTemplate((prev) => ({
                    ...prev,
                    [showKey]: e.target.checked,
                  }))
                }
                className="rounded border-slate-300"
              />
              <span>{isShown ? 'Exibir este Brasão' : 'Brasão Inibido (Oculto)'}</span>
            </label>
            {renderMoveOnSheetButton()}
          </div>

          <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-white border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-700 truncate">
              {currentUrl
                ? 'Imagem configurada'
                : isCenter
                  ? 'Sem imagem no brasão central'
                  : side === 'right' && template.usarBrasaoPadraoDireita === false
                    ? 'Brasão vazio (clique em Inserir)'
                    : side === 'left'
                      ? 'Brasão vazio (clique em Inserir)'
                      : 'Brasão padrão do sistema'}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <label className="px-2.5 py-1 rounded-lg bg-blue-900 hover:bg-blue-950 text-white text-[11px] font-bold cursor-pointer flex items-center gap-1">
                <Upload size={11} />
                <span>{currentUrl ? 'Trocar' : 'Inserir'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(uploadField, e)}
                  className="hidden"
                />
              </label>
              {isCenter ? (
                currentUrl && (
                  <button
                    type="button"
                    onClick={() =>
                      setTemplate((prev) => ({
                        ...prev,
                        logoCentroUrl: '',
                        mostrarLogoCentro: false,
                      }))
                    }
                    className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-rose-50 text-rose-600 cursor-pointer"
                    title="Remover imagem do brasão central"
                  >
                    <Trash2 size={12} />
                  </button>
                )
              ) : (
                <>
                  {(currentUrl ||
                    (side === 'right' && template.usarBrasaoPadraoDireita !== false)) && (
                    <button
                      type="button"
                      onClick={() =>
                        setTemplate((prev) => ({
                          ...prev,
                          [uploadField]: '',
                          ...(side === 'right'
                            ? {
                                usarBrasaoPadraoDireita: false,
                                mostrarLegendaLogoDireita: false,
                              }
                            : {}),
                        }))
                      }
                      className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-rose-50 text-rose-600 cursor-pointer"
                      title="Limpar brasão"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      setTemplate((prev) => ({
                        ...prev,
                        [uploadField]: defaultUrl,
                        ...(uploadField === 'logoDireitaUrl'
                          ? {
                              usarBrasaoPadraoDireita: true,
                              mostrarLegendaLogoDireita: true,
                              logoDireitaTexto: prev.logoDireitaTexto || 'MARINHA DO BRASIL',
                            }
                          : {}),
                      }))
                    }
                    className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                    title="Restaurar brasão padrão"
                  >
                    <RotateCcw size={12} />
                  </button>
                </>
              )}
            </div>
          </div>

          {renderLibrarySwapStrip(
            'brasao',
            isCenter ? 'brasaoCentro' : side === 'right' ? 'brasaoDireito' : 'brasaoEsquerdo',
            currentUrl || undefined,
            isCenter ? 'Brasão Central' : side === 'right' ? 'Brasão Direito' : 'Brasão Esquerdo'
          )}

          {isCenter && (
            <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-2">
              <label className="flex items-center gap-2 text-[11px] font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={template.mostrarLegendaLogoCentro === true}
                  onChange={(e) =>
                    setTemplate((prev) => ({
                      ...prev,
                      mostrarLegendaLogoCentro: e.target.checked,
                    }))
                  }
                  className="rounded border-slate-300"
                />
                <span>Exibir legenda de texto abaixo do Brasão Central</span>
              </label>
              <input
                type="text"
                value={template.logoCentroTexto || ''}
                onChange={(e) =>
                  setTemplate((prev) => ({
                    ...prev,
                    logoCentroTexto: e.target.value,
                  }))
                }
                placeholder="Legenda opcional do Brasão Central"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          )}

          {side === 'right' && (
            <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-2">
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
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          )}

          <div className="space-y-2.5 pt-1 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700">Tamanho e Opacidade</span>
              <button
                type="button"
                onClick={() =>
                  setTemplate((prev) => ({
                    ...prev,
                    [sizeKey]: defaultSize,
                    [opacityKey]: 1,
                  }))
                }
                className="text-[10px] font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer"
              >
                Restaurar tamanho
              </button>
            </div>
            <div>
              <div className="flex justify-between text-[10px] font-semibold text-slate-600">
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
                    [sizeKey]: Number(e.target.value),
                  }))
                }
                className="w-full accent-blue-800"
              />
            </div>
            <div>
              <div className="flex justify-between text-[10px] font-semibold text-slate-600">
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
                    [opacityKey]: Number(e.target.value),
                  }))
                }
                className="w-full accent-blue-800"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700">Posição na Folha</span>
              {(valX !== 0 || valY !== 0) && (
                <button
                  type="button"
                  onClick={() =>
                    setTemplate((prev) => ({
                      ...prev,
                      [xKey]: 0,
                      [yKey]: 0,
                    }))
                  }
                  className="text-[10px] font-semibold text-blue-700 hover:text-blue-900 underline cursor-pointer"
                >
                  Zerar
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                  <span>Horizontal (X)</span>
                  <span className="font-mono text-slate-800">
                    {valX > 0 ? `+${valX}` : valX}px
                  </span>
                </div>
                <input
                  type="range"
                  min={minX}
                  max={maxX}
                  step={2}
                  value={valX}
                  onChange={(e) =>
                    setTemplate((prev) => ({
                      ...prev,
                      [xKey]: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-blue-800"
                />
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                  <span>Vertical (Y)</span>
                  <span className="font-mono text-slate-800">
                    {valY > 0 ? `+${valY}` : valY}px
                  </span>
                </div>
                <input
                  type="range"
                  min={minY}
                  max={maxY}
                  step={2}
                  value={valY}
                  onChange={(e) =>
                    setTemplate((prev) => ({
                      ...prev,
                      [yKey]: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-blue-800"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col max-h-[calc(100vh-2rem)]">
      {/* Contextual Header */}
      <div className="px-4 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-900 text-white flex items-center justify-center shrink-0">
            <HeaderIcon size={15} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 truncate">
                {meta.title}
              </h2>
              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 text-[9px] font-bold uppercase shrink-0">
                {meta.sideLabel}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 truncate">{meta.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {selectedObject !== 'modeloGeral' && (
            <button
              type="button"
              onClick={() => onSelectObject('modeloGeral')}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 cursor-pointer"
              title="Configurações Gerais do Modelo"
            >
              <Settings size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
            title="Fechar controles (ESC)"
          >
            <X size={13} />
            <span>Fechar</span>
          </button>
        </div>
      </div>

      {/* Contextual Body */}
      <div className="p-4 sm:p-5 space-y-4 overflow-y-auto custom-scrollbar">
        {/* TÍTULO PRINCIPAL */}
        {selectedObject === 'titulo' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between gap-2">
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
                      'px-2 py-0.5 rounded border text-[10px] font-bold cursor-pointer',
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
                      'px-2 py-0.5 rounded border text-[10px] italic font-serif cursor-pointer',
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
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase"
              />

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Fonte do Título (Frente)
                </label>
                <select
                  value={normalizeFrontFont(template.fonteTitulo || template.fonteCorpo)}
                  onChange={(e) =>
                    setTemplate((prev) => ({
                      ...prev,
                      fonteTitulo: e.target.value as CertificateFontKey,
                    }))
                  }
                  className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                >
                  {FONT_OPTIONS_FRONT.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                    <span>Tamanho do Título</span>
                    <span className="font-mono text-blue-900">
                      {template.tamanhoFonteTitulo ?? 42}px ({pxToPtNumber(template.tamanhoFonteTitulo ?? 42)}pt)
                    </span>
                  </div>
                  <input
                    type="range"
                    min={28}
                    max={60}
                    step={1}
                    value={template.tamanhoFonteTitulo ?? 42}
                    onChange={(e) =>
                      setTemplate((prev) => ({
                        ...prev,
                        tamanhoFonteTitulo: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-blue-800"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                    <span>Espaço entre Letras</span>
                    <span className="font-mono text-blue-900">
                      {(template.espacamentoLetrasTitulo ?? 0.16).toFixed(2)}em
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.02}
                    max={0.34}
                    step={0.01}
                    value={template.espacamentoLetrasTitulo ?? 0.16}
                    onChange={(e) =>
                      setTemplate((prev) => ({
                        ...prev,
                        espacamentoLetrasTitulo: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-blue-800"
                  />
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-700">
                  Posição do Título na Folha
                </span>
                <div className="flex items-center gap-2">
                  {((template.tituloOffsetX ?? 0) !== 0 ||
                    (template.tituloOffsetY ?? 0) !== 0) && (
                    <button
                      type="button"
                      onClick={() =>
                        setTemplate((prev) => ({
                          ...prev,
                          tituloOffsetX: 0,
                          tituloOffsetY: 0,
                        }))
                      }
                      className="text-[10px] font-semibold text-blue-700 hover:text-blue-900 underline cursor-pointer"
                    >
                      Zerar
                    </button>
                  )}
                  {renderMoveOnSheetButton()}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                    <span>Horizontal (X)</span>
                    <span className="font-mono text-slate-800">
                      {template.tituloOffsetX ?? 0}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-350}
                    max={350}
                    step={2}
                    value={template.tituloOffsetX ?? 0}
                    onChange={(e) =>
                      setTemplate((prev) => ({
                        ...prev,
                        tituloOffsetX: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-blue-800"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                    <span>Vertical (Y)</span>
                    <span className="font-mono text-slate-800">
                      {template.tituloOffsetY ?? 0}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-200}
                    max={260}
                    step={2}
                    value={template.tituloOffsetY ?? 0}
                    onChange={(e) =>
                      setTemplate((prev) => ({
                        ...prev,
                        tituloOffsetY: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-blue-800"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TEXTO PRINCIPAL */}
        {selectedObject === 'texto' && (
          <div className="space-y-4">
            {renderStandaloneStudentBox()}

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
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
                    'p-2.5 rounded-xl border flex flex-col gap-2 transition-colors',
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
                        .
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

              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] text-slate-500">
                  Selecione qualquer trecho e clique em <strong>Negritar</strong> ou{' '}
                  <em>Itálico</em>.
                </p>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-[10px] font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={template.textoCorpoItalico ?? template.fonteCorpo !== 'sans'}
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

              <div className="flex flex-wrap gap-1.5">
                {[
                  '{{ARTIGO}}',
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

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Fonte do Texto
                  </label>
                  <select
                    value={normalizeFrontFont(template.fonteCorpo)}
                    onChange={(e) =>
                      setTemplate((prev) => ({
                        ...prev,
                        fonteCorpo: e.target.value as CertificateFontKey,
                      }))
                    }
                    className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                  >
                    {FONT_OPTIONS_FRONT.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Alinhamento
                  </label>
                  <select
                    value={template.alinhamentoTexto}
                    onChange={(e) =>
                      setTemplate((prev) => ({
                        ...prev,
                        alinhamentoTexto: e.target.value as 'left' | 'justify' | 'center',
                      }))
                    }
                    className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="left">Esquerda (Padrão Modelo)</option>
                    <option value="justify">Justificado</option>
                    <option value="center">Centralizado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>Tamanho da Fonte do Texto</span>
                  <span className="font-mono text-blue-800">
                    {template.tamanhoFonteCorpo}px ({pxToPtNumber(template.tamanhoFonteCorpo)}pt)
                  </span>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                    <span>Entrelinha do Texto</span>
                    <span className="font-mono text-blue-900">
                      {(template.entrelinhaCorpo ?? 1.82).toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1.15}
                    max={2.2}
                    step={0.05}
                    value={template.entrelinhaCorpo ?? 1.82}
                    onChange={(e) =>
                      setTemplate((prev) => ({
                        ...prev,
                        entrelinhaCorpo: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-blue-800"
                  />
                  <div className="flex gap-1 mt-1">
                    <button
                      type="button"
                      onClick={() => setTemplate((prev) => ({ ...prev, entrelinhaCorpo: 1.4 }))}
                      className="px-1.5 py-0.5 rounded bg-white border border-slate-200 hover:bg-blue-50 text-[10px] font-bold text-slate-700 cursor-pointer"
                    >
                      1,4 (Formal)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTemplate((prev) => ({ ...prev, entrelinhaCorpo: 1.82 }))}
                      className="px-1.5 py-0.5 rounded bg-white border border-slate-200 hover:bg-slate-100 text-[10px] font-bold text-slate-700 cursor-pointer"
                    >
                      1,82 (Padrão)
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                    <span>Largura do Bloco</span>
                    <span className="font-mono text-blue-900">
                      {template.larguraBlocoTextoPct ?? 100}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={55}
                    max={100}
                    step={1}
                    value={template.larguraBlocoTextoPct ?? 100}
                    onChange={(e) =>
                      setTemplate((prev) => ({
                        ...prev,
                        larguraBlocoTextoPct: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-blue-800"
                  />
                  <div className="flex flex-wrap gap-1 mt-1">
                    {[65, 70, 75, 100].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() =>
                          setTemplate((prev) => ({ ...prev, larguraBlocoTextoPct: pct }))
                        }
                        className={cn(
                          'px-1.5 py-0.5 rounded border text-[10px] font-bold cursor-pointer',
                          (template.larguraBlocoTextoPct ?? 100) === pct
                            ? 'bg-blue-900 text-white border-blue-900'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50'
                        )}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Margens do Texto Principal */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-700">
                    Margens do Texto Principal
                  </span>
                  {((template.margemTextoEsquerdaPx ?? 0) !== 0 ||
                    (template.margemTextoDireitaPx ?? 0) !== 0 ||
                    (template.margemTextoSuperiorPx ?? 0) !== 0 ||
                    (template.margemTextoInferiorPx ?? 0) !== 0) && (
                    <button
                      type="button"
                      onClick={() =>
                        setTemplate((prev) => ({
                          ...prev,
                          margemTextoEsquerdaPx: 0,
                          margemTextoDireitaPx: 0,
                          margemTextoSuperiorPx: 0,
                          margemTextoInferiorPx: 0,
                        }))
                      }
                      className="text-[10px] font-semibold text-blue-700 hover:text-blue-900 underline cursor-pointer"
                    >
                      Zerar margens
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                      <span>Margem Esquerda</span>
                      <span className="font-mono text-blue-900">
                        {template.margemTextoEsquerdaPx ?? 0}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={180}
                      step={2}
                      value={template.margemTextoEsquerdaPx ?? 0}
                      onChange={(e) =>
                        setTemplate((prev) => ({
                          ...prev,
                          margemTextoEsquerdaPx: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-blue-800"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                      <span>Margem Direita</span>
                      <span className="font-mono text-blue-900">
                        {template.margemTextoDireitaPx ?? 0}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={180}
                      step={2}
                      value={template.margemTextoDireitaPx ?? 0}
                      onChange={(e) =>
                        setTemplate((prev) => ({
                          ...prev,
                          margemTextoDireitaPx: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-blue-800"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                      <span>Margem Superior</span>
                      <span className="font-mono text-blue-900">
                        {template.margemTextoSuperiorPx ?? 0}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-20}
                      max={120}
                      step={2}
                      value={template.margemTextoSuperiorPx ?? 0}
                      onChange={(e) =>
                        setTemplate((prev) => ({
                          ...prev,
                          margemTextoSuperiorPx: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-blue-800"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                      <span>Margem Inferior</span>
                      <span className="font-mono text-blue-900">
                        {template.margemTextoInferiorPx ?? 0}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={140}
                      step={2}
                      value={template.margemTextoInferiorPx ?? 0}
                      onChange={(e) =>
                        setTemplate((prev) => ({
                          ...prev,
                          margemTextoInferiorPx: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-blue-800"
                    />
                  </div>
                </div>
              </div>

              {/* Destaque Central do Nome do Participante */}
              <div className="pt-2 border-t border-slate-200 space-y-2.5">
                <label className="flex items-center gap-2 text-[11px] font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(template.destacarNomeParticipante)}
                    onChange={(e) =>
                      setTemplate((prev) => ({
                        ...prev,
                        destacarNomeParticipante: e.target.checked,
                        fonteParticipante: prev.fonteParticipante || 'script',
                        tamanhoFonteParticipante:
                          prev.tamanhoFonteParticipante ??
                          Math.round((prev.tamanhoFonteCorpo || 17) * 2.2),
                      }))
                    }
                    className="rounded border-slate-300"
                  />
                  <span>Destacar Nome do Participante centralizado (2x–2,5x)</span>
                </label>

                {template.destacarNomeParticipante && (
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">
                          Fonte do Nome
                        </label>
                        <select
                          value={normalizeFrontFont(template.fonteParticipante || 'script')}
                          onChange={(e) => {
                            const nextFont = e.target.value as CertificateFontKey;
                            setTemplate((prev) => ({
                              ...prev,
                              fonteParticipante: nextFont,
                              negritoParticipante: nextFont !== 'script',
                            }));
                          }}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px]"
                        >
                          {FONT_OPTIONS_FRONT.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            setTemplate((prev) => ({
                              ...prev,
                              negritoParticipante: !(
                                prev.negritoParticipante ??
                                ((prev.fonteParticipante || 'script') !== 'script')
                              ),
                            }))
                          }
                          className={cn(
                            'px-2 py-1 rounded border text-[10px] font-bold cursor-pointer',
                            (template.negritoParticipante ??
                              ((template.fonteParticipante || 'script') !== 'script'))
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
                              italicoParticipante: !(prev.italicoParticipante ?? false),
                            }))
                          }
                          className={cn(
                            'px-2 py-1 rounded border text-[10px] italic font-serif cursor-pointer',
                            (template.italicoParticipante ?? false)
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white text-slate-600 border-slate-200'
                          )}
                        >
                          Itálico
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-0.5">
                        <span>Tamanho do Nome (aprox. 26pt–30pt)</span>
                        <span className="font-mono text-blue-900">
                          {template.tamanhoFonteParticipante ??
                            Math.round((template.tamanhoFonteCorpo || 17) * 2.15)}
                          px (
                          {pxToPtNumber(
                            template.tamanhoFonteParticipante ??
                              Math.round((template.tamanhoFonteCorpo || 17) * 2.15)
                          )}
                          pt)
                        </span>
                      </div>
                      <input
                        type="range"
                        min={24}
                        max={54}
                        step={1}
                        value={
                          template.tamanhoFonteParticipante ??
                          Math.round((template.tamanhoFonteCorpo || 17) * 2.15)
                        }
                        onChange={(e) =>
                          setTemplate((prev) => ({
                            ...prev,
                            tamanhoFonteParticipante: Number(e.target.value),
                          }))
                        }
                        className="w-full accent-blue-800"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-200 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-700">
                    Posição do Texto na Folha
                  </span>
                  <div className="flex items-center gap-2">
                    {((template.textoOffsetX ?? 0) !== 0 ||
                      (template.textoOffsetY ?? 0) !== 0) && (
                      <button
                        type="button"
                        onClick={() =>
                          setTemplate((prev) => ({
                            ...prev,
                            textoOffsetX: 0,
                            textoOffsetY: 0,
                          }))
                        }
                        className="text-[10px] font-semibold text-blue-700 hover:text-blue-900 underline cursor-pointer"
                      >
                        Zerar
                      </button>
                    )}
                    {renderMoveOnSheetButton()}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                      <span>Horizontal (X)</span>
                      <span className="font-mono text-slate-800">
                        {template.textoOffsetX ?? 0}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-150}
                      max={150}
                      step={2}
                      value={template.textoOffsetX ?? 0}
                      onChange={(e) =>
                        setTemplate((prev) => ({
                          ...prev,
                          textoOffsetX: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-blue-800"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                      <span>Vertical (Y)</span>
                      <span className="font-mono text-slate-800">
                        {template.textoOffsetY ?? 0}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-180}
                      max={200}
                      step={2}
                      value={template.textoOffsetY ?? 0}
                      onChange={(e) =>
                        setTemplate((prev) => ({
                          ...prev,
                          textoOffsetY: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-blue-800"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LOCAL E DATA */}
        {selectedObject === 'data' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-700">
                  Estilo da Data
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setTemplate((prev) => ({
                        ...prev,
                        dataNegrito: !(prev.dataNegrito ?? false),
                      }))
                    }
                    className={cn(
                      'px-2 py-0.5 rounded border text-[10px] font-bold cursor-pointer',
                      (template.dataNegrito ?? false)
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
                        dataItalico: !(prev.dataItalico ?? (prev.textoCorpoItalico ?? true)),
                      }))
                    }
                    className={cn(
                      'px-2 py-0.5 rounded border text-[10px] italic font-serif cursor-pointer',
                      (template.dataItalico ?? (template.textoCorpoItalico ?? true))
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200'
                    )}
                  >
                    Itálico
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-0.5">
                    <span>Tamanho (11pt–12pt)</span>
                    <span className="font-mono text-blue-900">
                      {template.tamanhoFonteData ??
                        Math.max(16, (template.tamanhoFonteCorpo || 19) - 1)}
                      px (
                      {pxToPtNumber(
                        template.tamanhoFonteData ??
                          Math.max(16, (template.tamanhoFonteCorpo || 19) - 1)
                      )}
                      pt)
                    </span>
                  </div>
                  <input
                    type="range"
                    min={12}
                    max={22}
                    step={1}
                    value={
                      template.tamanhoFonteData ??
                      Math.max(16, (template.tamanhoFonteCorpo || 19) - 1)
                    }
                    onChange={(e) =>
                      setTemplate((prev) => ({
                        ...prev,
                        tamanhoFonteData: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-blue-800"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-0.5">
                    <span>Distância do Parágrafo</span>
                    <span className="font-mono text-blue-900">
                      {template.espacamentoDataTextoPx ?? 24}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={4}
                    max={60}
                    step={2}
                    value={template.espacamentoDataTextoPx ?? 24}
                    onChange={(e) =>
                      setTemplate((prev) => ({
                        ...prev,
                        espacamentoDataTextoPx: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-blue-800"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-700">
                    Posição Independente da Data
                  </span>
                  <div className="flex items-center gap-2">
                    {((template.dataOffsetX ?? 0) !== 0 ||
                      (template.dataOffsetY ?? 0) !== 0 ||
                      (template.dataAlinhamento || 'center') !== 'center') && (
                      <button
                        type="button"
                        onClick={() =>
                          setTemplate((prev) => ({
                            ...prev,
                            dataAlinhamento: 'center',
                            dataOffsetX: 0,
                            dataOffsetY: 0,
                          }))
                        }
                        className="text-[10px] text-blue-700 hover:text-blue-900 underline cursor-pointer font-semibold"
                      >
                        Zerar
                      </button>
                    )}
                    {renderMoveOnSheetButton()}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'left', label: 'Esquerda', icon: AlignLeft },
                    { id: 'center', label: 'Centralizado', icon: AlignCenter },
                    { id: 'right', label: 'Direita', icon: AlignRight },
                  ].map((pos) => {
                    const Icon = pos.icon;
                    const active = (template.dataAlinhamento || 'center') === pos.id;
                    return (
                      <button
                        key={pos.id}
                        type="button"
                        onClick={() =>
                          setTemplate((prev) => ({
                            ...prev,
                            dataAlinhamento: pos.id as 'left' | 'center' | 'right',
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                      <span>Horizontal (X)</span>
                      <span className="font-mono text-blue-900">
                        {template.dataOffsetX ?? 0}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-380}
                      max={380}
                      step={2}
                      value={template.dataOffsetX ?? 0}
                      onChange={(e) =>
                        setTemplate((prev) => ({
                          ...prev,
                          dataOffsetX: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-blue-800"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                      <span>Vertical (Y)</span>
                      <span className="font-mono text-blue-900">
                        {template.dataOffsetY ?? 0}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-220}
                      max={240}
                      step={2}
                      value={template.dataOffsetY ?? 0}
                      onChange={(e) =>
                        setTemplate((prev) => ({
                          ...prev,
                          dataOffsetY: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-blue-800"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ASSINATURA PRINCIPAL (SOMENTE A CLICADA) */}
        {selectedObject === 'assinaturaPrincipal' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Dados da Assinatura Principal
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
                  placeholder="Posto / Graduação"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
                <input
                  type="text"
                  value={template.assinaturaCargo}
                  onChange={(e) =>
                    setTemplate((prev) => ({ ...prev, assinaturaCargo: e.target.value }))
                  }
                  placeholder="Função / Cargo"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Fonte da Assinatura
                </label>
                <select
                  value={normalizeFrontFont(template.fonteAssinatura || template.fonteCorpo)}
                  onChange={(e) =>
                    setTemplate((prev) => ({
                      ...prev,
                      fonteAssinatura: e.target.value as CertificateFontKey,
                    }))
                  }
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                >
                  {FONT_OPTIONS_FRONT.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 border-t border-slate-200 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-[11px] font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={template.mostrarLinhaAssinatura !== false}
                      onChange={(e) =>
                        setTemplate((prev) => ({
                          ...prev,
                          mostrarLinhaAssinatura: e.target.checked,
                        }))
                      }
                      className="rounded border-slate-300"
                    />
                    <span>Linha suave sobre as assinaturas</span>
                  </label>
                  {template.mostrarLinhaAssinatura !== false && (
                    <span className="text-[10px] font-mono text-blue-900">
                      {Math.round((template.opacidadeLinhaAssinatura ?? 0.16) * 100)}%
                    </span>
                  )}
                </div>
                {template.mostrarLinhaAssinatura !== false && (
                  <>
                    <input
                      type="range"
                      min={0.04}
                      max={0.6}
                      step={0.02}
                      value={template.opacidadeLinhaAssinatura ?? 0.16}
                      onChange={(e) =>
                        setTemplate((prev) => ({
                          ...prev,
                          opacidadeLinhaAssinatura: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-blue-800"
                      title="Intensidade da linha suave sobre as assinaturas"
                    />
                    <div className="pt-1 space-y-1">
                      <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-slate-600">
                        <span>Largura da Linha</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-blue-900">
                            {template.larguraLinhaAssinaturaCm !== undefined
                              ? `${template.larguraLinhaAssinaturaCm.toFixed(1)} cm`
                              : 'Automática (texto)'}
                          </span>
                          {template.larguraLinhaAssinaturaCm !== undefined && (
                            <button
                              type="button"
                              onClick={() =>
                                setTemplate((prev) => ({
                                  ...prev,
                                  larguraLinhaAssinaturaCm: undefined,
                                }))
                              }
                              className="text-[10px] text-blue-700 hover:text-blue-900 underline cursor-pointer"
                            >
                              Auto
                            </button>
                          )}
                        </div>
                      </div>
                      <input
                        type="range"
                        min={4.0}
                        max={8.5}
                        step={0.1}
                        value={template.larguraLinhaAssinaturaCm ?? 6.0}
                        onChange={(e) =>
                          setTemplate((prev) => ({
                            ...prev,
                            larguraLinhaAssinaturaCm: Number(e.target.value),
                          }))
                        }
                        className="w-full accent-blue-800"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="pt-2 border-t border-slate-200 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-0.5">
                      <span>Fonte do Nome (10pt)</span>
                      <span className="font-mono text-blue-900">
                        {template.tamanhoFonteAssinaturaNome ?? 14.5}px ({pxToPtNumber(template.tamanhoFonteAssinaturaNome ?? 14.5)}pt)
                      </span>
                    </div>
                    <input
                      type="range"
                      min={11}
                      max={20}
                      step={0.5}
                      value={template.tamanhoFonteAssinaturaNome ?? 14.5}
                      onChange={(e) =>
                        setTemplate((prev) => ({
                          ...prev,
                          tamanhoFonteAssinaturaNome: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-blue-800"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-0.5">
                      <span>Fonte Posto/Cargo (9pt)</span>
                      <span className="font-mono text-blue-900">
                        {template.tamanhoFonteAssinaturaCargo ?? 13.5}px ({pxToPtNumber(template.tamanhoFonteAssinaturaCargo ?? 13.5)}pt)
                      </span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={18}
                      step={0.5}
                      value={template.tamanhoFonteAssinaturaCargo ?? 13.5}
                      onChange={(e) =>
                        setTemplate((prev) => ({
                          ...prev,
                          tamanhoFonteAssinaturaCargo: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-blue-800"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={template.assinaturaCargoNegrito ?? (template.assinaturaNegrito ?? true)}
                      onChange={(e) =>
                        setTemplate((prev) => ({
                          ...prev,
                          assinaturaCargoNegrito: e.target.checked,
                        }))
                      }
                      className="rounded border-slate-300"
                    />
                    <span>Posto e Cargo em Negrito</span>
                  </label>
                  <span className="text-[10px] text-slate-500">
                    Linhas ajustam ao texto sem quebra automática
                  </span>
                </div>
                <div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 mb-0.5">
                    <span>Distância Vertical abaixo do Texto (2–3 cm)</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-blue-900">
                        {template.espacamentoAssinaturasVerticalCm !== undefined
                          ? `${template.espacamentoAssinaturasVerticalCm.toFixed(1)} cm`
                          : 'Automático'}
                      </span>
                      {template.espacamentoAssinaturasVerticalCm !== undefined && (
                        <button
                          type="button"
                          onClick={() =>
                            setTemplate((prev) => ({
                              ...prev,
                              espacamentoAssinaturasVerticalCm: undefined,
                            }))
                          }
                          className="text-[10px] text-blue-700 hover:text-blue-900 underline cursor-pointer"
                        >
                          Auto
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={4.0}
                    step={0.1}
                    value={template.espacamentoAssinaturasVerticalCm ?? 0}
                    onChange={(e) =>
                      setTemplate((prev) => ({
                        ...prev,
                        espacamentoAssinaturasVerticalCm: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-blue-800"
                  />
                </div>
              </div>

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
                    <span>Altura Geral da Assinatura</span>
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
                </div>

                <div className="pt-2 border-t border-slate-200 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-700">
                      Posição Independente (
                      {(template.assinaturaAlinhamento || 'right') === 'left'
                        ? 'Esquerda'
                        : (template.assinaturaAlinhamento || 'right') === 'center'
                          ? 'Centro'
                          : 'Direita'}
                      )
                    </span>
                    <div className="flex items-center gap-2">
                      {((template.assinaturaPrincipalOffsetX ?? 0) !== 0 ||
                        (template.assinaturaPrincipalOffsetY ?? 0) !== 0) && (
                        <button
                          type="button"
                          onClick={() =>
                            setTemplate((prev) => ({
                              ...prev,
                              assinaturaPrincipalOffsetX: 0,
                              assinaturaPrincipalOffsetY: 0,
                            }))
                          }
                          className="text-[10px] text-blue-700 hover:text-blue-900 underline cursor-pointer font-semibold"
                        >
                          Zerar
                        </button>
                      )}
                      {renderMoveOnSheetButton()}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                        <span>Horizontal (X)</span>
                        <span className="font-mono text-blue-900">
                          {template.assinaturaPrincipalOffsetX ?? 0}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-380}
                        max={380}
                        step={2}
                        value={template.assinaturaPrincipalOffsetX ?? 0}
                        onChange={(e) =>
                          setTemplate((prev) => ({
                            ...prev,
                            assinaturaPrincipalOffsetX: Number(e.target.value),
                          }))
                        }
                        className="w-full accent-blue-800"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                        <span>Vertical (Y)</span>
                        <span className="font-mono text-blue-900">
                          {template.assinaturaPrincipalOffsetY ?? 0}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-220}
                        max={60}
                        step={2}
                        value={template.assinaturaPrincipalOffsetY ?? 0}
                        onChange={(e) =>
                          setTemplate((prev) => ({
                            ...prev,
                            assinaturaPrincipalOffsetY: Number(e.target.value),
                          }))
                        }
                        className="w-full accent-blue-800"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50/70 border border-blue-200">
              <span className="text-[11px] font-semibold text-blue-950">
                {template.mostrarSegundaAssinatura
                  ? 'Deseja editar a 2ª assinatura?'
                  : 'Precisa de uma 2ª assinatura no lado oposto?'}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (!template.mostrarSegundaAssinatura) {
                    setTemplate((prev) => ({
                      ...prev,
                      mostrarSegundaAssinatura: true,
                    }));
                  }
                  onSelectObject('segundaAssinatura');
                }}
                className="px-2.5 py-1 rounded-lg bg-blue-900 hover:bg-blue-950 text-white text-[10px] font-bold cursor-pointer shrink-0"
              >
                {template.mostrarSegundaAssinatura ? 'Abrir 2ª Assinatura' : '+ Ativar 2ª Assinatura'}
              </button>
            </div>
          </div>
        )}

        {/* 2ª ASSINATURA (SOMENTE A CLICADA) */}
        {selectedObject === 'segundaAssinatura' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
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
                  <span>Exibir 2ª Assinatura (Lado Oposto)</span>
                </label>

                {template.mostrarSegundaAssinatura && (
                  <button
                    type="button"
                    onClick={() =>
                      setTemplate((prev) => ({
                        ...prev,
                        assinaturaAlinhamento:
                          prev.assinaturaAlinhamento === 'left' ? 'right' : 'left',
                      }))
                    }
                    className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:bg-blue-50 text-blue-900 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    title="Alternar em qual lado cada assinatura aparece"
                  >
                    <ArrowLeftRight size={11} />
                    <span>Inverter Lados</span>
                  </button>
                )}
              </div>

              {template.mostrarSegundaAssinatura && (
                <div className="space-y-2.5 pt-2 border-t border-slate-200">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Nome Completo
                    </label>
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
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Posto / Graduação
                      </label>
                      <input
                        type="text"
                        value={template.segundaAssinaturaPosto}
                        onChange={(e) =>
                          setTemplate((prev) => ({
                            ...prev,
                            segundaAssinaturaPosto: e.target.value,
                          }))
                        }
                        placeholder="Ex: Capitão-Tenente"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Função
                      </label>
                      <input
                        type="text"
                        value={template.segundaAssinaturaCargo}
                        onChange={(e) =>
                          setTemplate((prev) => ({
                            ...prev,
                            segundaAssinaturaCargo: e.target.value,
                          }))
                        }
                        placeholder="Ex: Comandante da Guarda Costeira"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
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

                    <select
                      value={normalizeFrontFont(template.fonteAssinatura || template.fonteCorpo)}
                      onChange={(e) =>
                        setTemplate((prev) => ({
                          ...prev,
                          fonteAssinatura: e.target.value as CertificateFontKey,
                        }))
                      }
                      className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px]"
                    >
                      {FONT_OPTIONS_FRONT.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-2 border-t border-slate-200 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2 text-[11px] font-bold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={template.mostrarLinhaAssinatura !== false}
                          onChange={(e) =>
                            setTemplate((prev) => ({
                              ...prev,
                              mostrarLinhaAssinatura: e.target.checked,
                            }))
                          }
                          className="rounded border-slate-300"
                        />
                        <span>Linha suave sobre as assinaturas</span>
                      </label>
                      {template.mostrarLinhaAssinatura !== false && (
                        <span className="text-[10px] font-mono text-blue-900">
                          {Math.round((template.opacidadeLinhaAssinatura ?? 0.16) * 100)}%
                        </span>
                      )}
                    </div>
                    {template.mostrarLinhaAssinatura !== false && (
                      <>
                        <input
                          type="range"
                          min={0.04}
                          max={0.6}
                          step={0.02}
                          value={template.opacidadeLinhaAssinatura ?? 0.16}
                          onChange={(e) =>
                            setTemplate((prev) => ({
                              ...prev,
                              opacidadeLinhaAssinatura: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-blue-800"
                          title="Intensidade da linha suave sobre as assinaturas"
                        />
                        <div className="pt-1 space-y-1">
                          <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-slate-600">
                            <span>Largura da Linha</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-blue-900">
                                {template.larguraLinhaAssinaturaCm !== undefined
                                  ? `${template.larguraLinhaAssinaturaCm.toFixed(1)} cm`
                                  : 'Automática (texto)'}
                              </span>
                              {template.larguraLinhaAssinaturaCm !== undefined && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setTemplate((prev) => ({
                                      ...prev,
                                      larguraLinhaAssinaturaCm: undefined,
                                    }))
                                  }
                                  className="text-[10px] text-blue-700 hover:text-blue-900 underline cursor-pointer"
                                >
                                  Auto
                                </button>
                              )}
                            </div>
                          </div>
                          <input
                            type="range"
                            min={4.0}
                            max={8.5}
                            step={0.1}
                            value={template.larguraLinhaAssinaturaCm ?? 6.0}
                            onChange={(e) =>
                              setTemplate((prev) => ({
                                ...prev,
                                larguraLinhaAssinaturaCm: Number(e.target.value),
                              }))
                            }
                            className="w-full accent-blue-800"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-200 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-0.5">
                          <span>Fonte do Nome (10pt)</span>
                          <span className="font-mono text-blue-900">
                            {template.tamanhoFonteAssinaturaNome ?? 14.5}px ({pxToPtNumber(template.tamanhoFonteAssinaturaNome ?? 14.5)}pt)
                          </span>
                        </div>
                        <input
                          type="range"
                          min={11}
                          max={20}
                          step={0.5}
                          value={template.tamanhoFonteAssinaturaNome ?? 14.5}
                          onChange={(e) =>
                            setTemplate((prev) => ({
                              ...prev,
                              tamanhoFonteAssinaturaNome: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-blue-800"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-0.5">
                          <span>Fonte Posto/Cargo (9pt)</span>
                          <span className="font-mono text-blue-900">
                            {template.tamanhoFonteAssinaturaCargo ?? 13.5}px ({pxToPtNumber(template.tamanhoFonteAssinaturaCargo ?? 13.5)}pt)
                          </span>
                        </div>
                        <input
                          type="range"
                          min={10}
                          max={18}
                          step={0.5}
                          value={template.tamanhoFonteAssinaturaCargo ?? 13.5}
                          onChange={(e) =>
                            setTemplate((prev) => ({
                              ...prev,
                              tamanhoFonteAssinaturaCargo: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-blue-800"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={template.assinaturaCargoNegrito ?? (template.assinaturaNegrito ?? true)}
                          onChange={(e) =>
                            setTemplate((prev) => ({
                              ...prev,
                              assinaturaCargoNegrito: e.target.checked,
                            }))
                          }
                          className="rounded border-slate-300"
                        />
                        <span>Posto e Cargo em Negrito</span>
                      </label>
                      <span className="text-[10px] text-slate-500">
                        Linhas ajustam ao texto sem quebra automática
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-slate-700">
                        Posição Independente (
                        {(template.assinaturaAlinhamento || 'right') === 'left'
                          ? 'Direita'
                          : 'Esquerda'}
                        )
                      </span>
                      <div className="flex items-center gap-2">
                        {((template.segundaAssinaturaOffsetX ?? 0) !== 0 ||
                          (template.segundaAssinaturaOffsetY ?? 0) !== 0) && (
                          <button
                            type="button"
                            onClick={() =>
                              setTemplate((prev) => ({
                                ...prev,
                                segundaAssinaturaOffsetX: 0,
                                segundaAssinaturaOffsetY: 0,
                              }))
                            }
                            className="text-[10px] text-blue-700 hover:text-blue-900 underline cursor-pointer font-semibold"
                          >
                            Zerar
                          </button>
                        )}
                        {renderMoveOnSheetButton()}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                          <span>Horizontal (X)</span>
                          <span className="font-mono text-blue-900">
                            {template.segundaAssinaturaOffsetX ?? 0}px
                          </span>
                        </div>
                        <input
                          type="range"
                          min={-380}
                          max={380}
                          step={2}
                          value={template.segundaAssinaturaOffsetX ?? 0}
                          onChange={(e) =>
                            setTemplate((prev) => ({
                              ...prev,
                              segundaAssinaturaOffsetX: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-blue-800"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                          <span>Vertical (Y)</span>
                          <span className="font-mono text-blue-900">
                            {template.segundaAssinaturaOffsetY ?? 0}px
                          </span>
                        </div>
                        <input
                          type="range"
                          min={-220}
                          max={60}
                          step={2}
                          value={template.segundaAssinaturaOffsetY ?? 0}
                          onChange={(e) =>
                            setTemplate((prev) => ({
                              ...prev,
                              segundaAssinaturaOffsetY: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-blue-800"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-700">
                Editar Assinatura Principal
              </span>
              <button
                type="button"
                onClick={() => onSelectObject('assinaturaPrincipal')}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-[10px] font-bold cursor-pointer"
              >
                Ir para Principal
              </button>
            </div>
          </div>
        )}

        {/* BRASÕES */}
        {selectedObject === 'brasaoEsquerdo' && renderCrestEditor('left')}
        {selectedObject === 'brasaoCentro' && renderCrestEditor('center')}
        {selectedObject === 'brasaoDireito' && renderCrestEditor('right')}

        {/* MARCA D'ÁGUA (FRENTE) */}
        {selectedObject === 'marcaDaguaFrente' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Marca d&apos;Água (Frente)
                </span>
                <Maximize2 size={13} className="text-slate-500" />
              </div>

              <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-700">
                  Imagem da Marca d&apos;Água
                </span>
                <div className="flex items-center gap-1.5">
                  <label className="px-2.5 py-1 rounded-lg bg-blue-900 hover:bg-blue-950 text-white text-[11px] font-bold cursor-pointer flex items-center gap-1">
                    <Upload size={11} />
                    <span>Trocar</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload('marcaDaguaFrenteUrl', e)}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setTemplate((prev) => ({
                        ...prev,
                        marcaDaguaFrenteUrl:
                          '/assets/aistudio/WhatsApp_Image_2026-02-11_at_22.02.18_8edf921e.jpeg',
                      }))
                    }
                    className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                    title="Restaurar padrão"
                  >
                    <RotateCcw size={12} />
                  </button>
                </div>
              </div>

              {renderLibrarySwapStrip(
                'marca_dagua',
                'marcaDaguaFrente',
                template.marcaDaguaFrenteUrl,
                "Marca d'Água Frente"
              )}

              <div>
                <label className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-0.5">
                  <span>Tamanho Geral</span>
                  <span className="font-mono">
                    {template.tamanhoMarcaDaguaFrente ?? 545}px
                  </span>
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

              <div>
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 mb-0.5">
                  <span>Posição Vertical (Altura)</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-slate-800">
                      {(template.marcaDaguaFrenteOffsetY ?? 0) > 0
                        ? `+${template.marcaDaguaFrenteOffsetY}`
                        : (template.marcaDaguaFrenteOffsetY ?? 0)}
                      px
                    </span>
                    {(template.marcaDaguaFrenteOffsetY ?? 0) !== 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setTemplate((prev) => ({ ...prev, marcaDaguaFrenteOffsetY: 0 }))
                        }
                        className="text-[10px] text-blue-700 hover:text-blue-900 underline cursor-pointer"
                      >
                        Zerar
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="range"
                  min={-380}
                  max={380}
                  step={4}
                  value={template.marcaDaguaFrenteOffsetY ?? 0}
                  onChange={(e) =>
                    setTemplate((prev) => ({
                      ...prev,
                      marcaDaguaFrenteOffsetY: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-blue-800"
                />
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    setTemplate((prev) => ({
                      ...prev,
                      tamanhoMarcaDaguaFrente: 545,
                      escalaLarguraMarcaDaguaFrente: 100,
                      escalaAlturaMarcaDaguaFrente: 100,
                      marcaDaguaFrenteOffsetY: 0,
                    }))
                  }
                  className="px-2.5 py-1 text-[10px] font-bold bg-white border border-slate-200 hover:bg-slate-100 rounded cursor-pointer"
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
                  className="px-2.5 py-1 text-[10px] font-bold bg-white border border-slate-200 hover:bg-slate-100 rounded cursor-pointer"
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
                  className="px-2.5 py-1 text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 rounded cursor-pointer"
                >
                  Expandir Folha
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MOLDURA DA FRENTE */}
        {selectedObject === 'molduraFrente' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              {(() => {
                const currentFrameStyle =
                  template.estiloMolduraFrente ??
                  (template.usarMolduraOriginal !== false ? 'original' : 'vetorial');
                return (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Tipo de Moldura (Frente)
                      </label>
                      <select
                        value={currentFrameStyle}
                        onChange={(e) => {
                          const nextStyle = e.target.value as
                            | 'original'
                            | 'vetorial'
                            | 'simples'
                            | 'nenhuma';
                          setTemplate((prev) => ({
                            ...prev,
                            estiloMolduraFrente: nextStyle,
                            usarMolduraOriginal: nextStyle === 'original',
                          }));
                        }}
                        className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                      >
                        <option value="simples">Moldura Simples (Linha Limpa)</option>
                        <option value="nenhuma">Sem Moldura (Folha em Branco)</option>
                        <option value="original">Moldura com Imagem (Base / Importada)</option>
                        <option value="vetorial">Moldura Vetorial Náutica</option>
                      </select>
                    </div>

                    {(currentFrameStyle === 'vetorial' || currentFrameStyle === 'simples') && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Cor da Moldura (Frente)
                        </label>
                        <input
                          type="color"
                          value={template.corBordaFrente}
                          onChange={(e) =>
                            setTemplate((prev) => ({
                              ...prev,
                              corBordaFrente: e.target.value,
                            }))
                          }
                          className="w-full h-10 rounded-lg border border-slate-200 cursor-pointer"
                        />
                      </div>
                    )}

                    <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-slate-700">
                          Imagem da Moldura (Frente)
                        </span>
                        <div className="flex items-center gap-1.5">
                          <label className="px-2.5 py-1 rounded-lg bg-blue-900 hover:bg-blue-950 text-white text-[11px] font-bold cursor-pointer flex items-center gap-1">
                            <Upload size={11} />
                            <span>{template.molduraFrenteUrl ? 'Trocar' : 'Importar'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageUpload('molduraFrenteUrl', e)}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              setTemplate((prev) => ({
                                ...prev,
                                estiloMolduraFrente: 'original',
                                usarMolduraOriginal: true,
                                molduraFrenteUrl: '/assets/certificado-moldura-frente.png',
                              }))
                            }
                            className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                            title="Restaurar moldura padrão"
                          >
                            <RotateCcw size={12} />
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-snug">
                        O centro branco das molduras importadas fica transparente automaticamente para manter a marca d&apos;água visível.
                      </p>
                      {renderLibrarySwapStrip(
                        'moldura',
                        'molduraFrente',
                        template.molduraFrenteUrl,
                        'Moldura da Frente'
                      )}
                    </div>

                    {/* Margens da Folha A4 Paisagem */}
                    <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-slate-800">
                          Margens da Folha e Moldura (A4 Paisagem)
                        </span>
                        {(template.margemExternaMolduraCm !== undefined ||
                          template.margemInternaLateralCm !== undefined ||
                          template.margemInternaVerticalCm !== undefined) && (
                          <button
                            type="button"
                            onClick={() =>
                              setTemplate((prev) => ({
                                ...prev,
                                margemExternaMolduraCm: undefined,
                                margemInternaLateralCm: undefined,
                                margemInternaVerticalCm: undefined,
                              }))
                            }
                            className="text-[10px] text-blue-700 hover:text-blue-900 underline cursor-pointer font-semibold"
                          >
                            Restaurar padrão
                          </button>
                        )}
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-0.5">
                          <span>Margem Externa (borda até moldura: 1,5–2 cm)</span>
                          <span className="font-mono text-blue-900">
                            {template.margemExternaMolduraCm !== undefined
                              ? `${template.margemExternaMolduraCm.toFixed(1)} cm`
                              : 'Padrão (0,6 cm)'}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.4}
                          max={2.5}
                          step={0.1}
                          value={template.margemExternaMolduraCm ?? 0.6}
                          onChange={(e) =>
                            setTemplate((prev) => ({
                              ...prev,
                              margemExternaMolduraCm: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-blue-800"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-0.5">
                            <span>Interna Lateral (2–3 cm)</span>
                            <span className="font-mono text-blue-900">
                              {template.margemInternaLateralCm !== undefined
                                ? `${template.margemInternaLateralCm.toFixed(1)} cm`
                                : '2,2 cm'}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={1.0}
                            max={4.0}
                            step={0.1}
                            value={template.margemInternaLateralCm ?? 2.2}
                            onChange={(e) =>
                              setTemplate((prev) => ({
                                ...prev,
                                margemInternaLateralCm: Number(e.target.value),
                              }))
                            }
                            className="w-full accent-blue-800"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-0.5">
                            <span>Interna Vertical</span>
                            <span className="font-mono text-blue-900">
                              {template.margemInternaVerticalCm !== undefined
                                ? `${template.margemInternaVerticalCm.toFixed(1)} cm`
                                : '1,5 cm'}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0.6}
                            max={3.0}
                            step={0.1}
                            value={template.margemInternaVerticalCm ?? 1.5}
                            onChange={(e) =>
                              setTemplate((prev) => ({
                                ...prev,
                                margemInternaVerticalCm: Number(e.target.value),
                              }))
                            }
                            className="w-full accent-blue-800"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* VERSO — TÍTULO DO CURSO */}
        {selectedObject === 'versoTitulo' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
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
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Fonte do Verso
                  </label>
                  <select
                    value={template.fonteVerso || 'sans'}
                    onChange={(e) =>
                      setTemplate((prev) => ({
                        ...prev,
                        fonteVerso: e.target.value as CertificateFontKey,
                      }))
                    }
                    className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                  >
                    {FONT_OPTIONS_BACK.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer bg-white px-3 py-2 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    checked={template.versoItalico ?? false}
                    onChange={(e) =>
                      setTemplate((prev) => ({ ...prev, versoItalico: e.target.checked }))
                    }
                    className="rounded border-slate-300"
                  />
                  <span>Verso em Itálico</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* VERSO — TABELA DE DISCIPLINAS / MÓDULOS */}
        {selectedObject === 'versoTabela' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Quadro de Disciplinas / Módulos
                </h3>
                <p className="text-[11px] text-slate-500">
                  Agrupe por módulos, ajuste colunas, notas e média final.
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

            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2">
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
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 rounded border border-blue-200">
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
                      placeholder="Ex: 19,50"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200 items-center">
                <select
                  value={template.fonteVerso || 'sans'}
                  onChange={(e) =>
                    setTemplate((prev) => ({
                      ...prev,
                      fonteVerso: e.target.value as CertificateFontKey,
                    }))
                  }
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                >
                  {FONT_OPTIONS_BACK.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                  <input
                    type="checkbox"
                    checked={template.versoItalico ?? false}
                    onChange={(e) =>
                      setTemplate((prev) => ({ ...prev, versoItalico: e.target.checked }))
                    }
                    className="rounded border-slate-300"
                  />
                  <span>Verso em Itálico</span>
                </label>
              </div>
            </div>

            {/* Quick shortcuts to back background / border */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => onSelectObject('marcaDaguaVerso')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold cursor-pointer flex items-center gap-1"
              >
                <ImageIcon size={12} />
                <span>Marca d&apos;Água (Verso)</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectObject('versoMoldura')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold cursor-pointer flex items-center gap-1"
              >
                <Frame size={12} />
                <span>Cor da Moldura (Verso)</span>
              </button>
            </div>
          </div>
        )}

        {/* MARCA D'ÁGUA (VERSO) */}
        {selectedObject === 'marcaDaguaVerso' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Marca d&apos;Água (Verso)
                </span>
                <Maximize2 size={13} className="text-slate-500" />
              </div>

              <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-700">
                  Imagem da Marca d&apos;Água (Verso)
                </span>
                <div className="flex items-center gap-1.5">
                  <label className="px-2.5 py-1 rounded-lg bg-blue-900 hover:bg-blue-950 text-white text-[11px] font-bold cursor-pointer flex items-center gap-1">
                    <Upload size={11} />
                    <span>Trocar</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload('marcaDaguaVersoUrl', e)}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setTemplate((prev) => ({
                        ...prev,
                        marcaDaguaVersoUrl: '/assets/aistudio/imagem_01_2da3aec8.png',
                      }))
                    }
                    className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                    title="Restaurar padrão"
                  >
                    <RotateCcw size={12} />
                  </button>
                </div>
              </div>

              {renderLibrarySwapStrip(
                'marca_dagua',
                'marcaDaguaVerso',
                template.marcaDaguaVersoUrl,
                "Marca d'Água Verso"
              )}

              <div>
                <label className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-0.5">
                  <span>Tamanho Geral</span>
                  <span className="font-mono">
                    {template.tamanhoMarcaDaguaVerso ?? 580}px
                  </span>
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

              <div>
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 mb-0.5">
                  <span>Posição Vertical (Altura)</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-slate-800">
                      {(template.marcaDaguaVersoOffsetY ?? 0) > 0
                        ? `+${template.marcaDaguaVersoOffsetY}`
                        : (template.marcaDaguaVersoOffsetY ?? 0)}
                      px
                    </span>
                    {(template.marcaDaguaVersoOffsetY ?? 0) !== 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setTemplate((prev) => ({ ...prev, marcaDaguaVersoOffsetY: 0 }))
                        }
                        className="text-[10px] text-blue-700 hover:text-blue-900 underline cursor-pointer"
                      >
                        Zerar
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="range"
                  min={-380}
                  max={380}
                  step={4}
                  value={template.marcaDaguaVersoOffsetY ?? 0}
                  onChange={(e) =>
                    setTemplate((prev) => ({
                      ...prev,
                      marcaDaguaVersoOffsetY: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-blue-800"
                />
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    setTemplate((prev) => ({
                      ...prev,
                      tamanhoMarcaDaguaVerso: 580,
                      escalaLarguraMarcaDaguaVerso: 100,
                      escalaAlturaMarcaDaguaVerso: 100,
                      marcaDaguaVersoOffsetY: 0,
                    }))
                  }
                  className="px-2.5 py-1 text-[10px] font-bold bg-white border border-slate-200 hover:bg-slate-100 rounded cursor-pointer"
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
                  className="px-2.5 py-1 text-[10px] font-bold bg-white border border-slate-200 hover:bg-slate-100 rounded cursor-pointer"
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
                  className="px-2.5 py-1 text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 rounded cursor-pointer"
                >
                  Expandir Folha
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MOLDURA DO VERSO */}
        {selectedObject === 'versoMoldura' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Cor da Moldura do Verso
                </label>
                <input
                  type="color"
                  value={template.corBordaVerso}
                  onChange={(e) =>
                    setTemplate((prev) => ({ ...prev, corBordaVerso: e.target.value }))
                  }
                  className="w-full h-10 rounded-lg border border-slate-200 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* CONFIGURAÇÕES GERAIS DO MODELO */}
        {selectedObject === 'modeloGeral' && (
          <div className="space-y-4">
            {renderStandaloneStudentBox()}

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

            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-blue-950 flex items-center gap-1.5">
                  <Sparkles size={13} />
                  <span>Layout Formal (A4 Paisagem — Respiro Visual)</span>
                </span>
              </div>
              <p className="text-[10px] text-slate-600 leading-snug">
                Aplica margens amplas (1,7 cm externa / 2,5 cm interna), bloco de texto centralizado em 70%, hierarquia tipográfica (título 34pt, nome em destaque 28pt, corpo 13pt entrelinha 1,4) e assinaturas simétricas (10pt/9pt).
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setTemplate((prev) => applyFormalA4LayoutToTemplate(prev))}
                  className="px-3 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-950 text-white text-[11px] font-bold cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles size={12} />
                  <span>Aplicar Layout Formal A4</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setTemplate((prev) => ({
                      ...prev,
                      margemExternaMolduraCm: undefined,
                      margemInternaLateralCm: undefined,
                      margemInternaVerticalCm: undefined,
                      larguraBlocoTextoPct: undefined,
                      margemTextoEsquerdaPx: 0,
                      margemTextoDireitaPx: 0,
                      margemTextoSuperiorPx: 0,
                      margemTextoInferiorPx: 0,
                      tamanhoFonteTitulo: undefined,
                      espacamentoLetrasTitulo: undefined,
                      entrelinhaCorpo: undefined,
                      destacarNomeParticipante: false,
                      tamanhoFonteData: undefined,
                      espacamentoDataTextoPx: undefined,
                      espacamentoAssinaturasVerticalCm: undefined,
                      larguraLinhaAssinaturaCm: undefined,
                      tamanhoFonteAssinaturaNome: undefined,
                      tamanhoFonteAssinaturaCargo: undefined,
                      assinaturaCargoNegrito: undefined,
                    }))
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-[11px] font-bold text-slate-700 cursor-pointer"
                >
                  Restaurar Padrão Clássico
                </button>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                  Tipografia Global
                </span>
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

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <span className="text-[11px] text-slate-600">
                  Redefinir todos os deslocamentos (X/Y) de brasões, textos, data e assinaturas:
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setTemplate((prev) => ({
                      ...prev,
                      logoEsquerdaOffsetX: 0,
                      logoEsquerdaOffsetY: 0,
                      logoCentroOffsetX: 0,
                      logoCentroOffsetY: 0,
                      logoDireitaOffsetX: 0,
                      logoDireitaOffsetY: 0,
                      tituloOffsetX: 0,
                      tituloOffsetY: 0,
                      textoOffsetX: 0,
                      textoOffsetY: 0,
                      dataOffsetX: 0,
                      dataOffsetY: 0,
                      marcaDaguaFrenteOffsetY: 0,
                      marcaDaguaVersoOffsetY: 0,
                      assinaturaPrincipalOffsetX: 0,
                      assinaturaPrincipalOffsetY: 0,
                      segundaAssinaturaOffsetX: 0,
                      segundaAssinaturaOffsetY: 0,
                    }))
                  }
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-[10px] font-bold text-slate-700 cursor-pointer"
                >
                  Zerar Tudo
                </button>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="block text-[11px] font-black uppercase tracking-wider text-slate-700">
                Acessar Elementos Rápidos / Ocultos
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'brasaoEsquerdo' as const, label: 'Brasão Esquerdo' },
                  { id: 'brasaoCentro' as const, label: 'Brasão Central' },
                  { id: 'brasaoDireito' as const, label: 'Brasão Direito' },
                  { id: 'marcaDaguaFrente' as const, label: "Marca d'Água Frente" },
                  { id: 'molduraFrente' as const, label: 'Moldura Frente' },
                  { id: 'assinaturaPrincipal' as const, label: 'Assinatura Principal' },
                  { id: 'segundaAssinatura' as const, label: '2ª Assinatura' },
                  { id: 'marcaDaguaVerso' as const, label: "Marca d'Água Verso" },
                  { id: 'versoMoldura' as const, label: 'Moldura Verso' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectObject(item.id)}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-[11px] font-bold text-slate-700 hover:text-blue-900 cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
