'use client';

import React from 'react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  Bold,
  Calendar,
  Check,
  ChevronsDown,
  ChevronsUp,
  Copy,
  CornerDownLeft,
  Crosshair,
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
  CertificateCustomTextBox,
  CertificateDisciplineRow,
  CertificateFontKey,
  CertificateLayerKey,
  CertificateSelectableObject,
  CertificateStudentContext,
  CertificateTemplateConfig,
  DEFAULT_CERTIFICATE_Z_INDEX,
  applyFormalA4LayoutToTemplate,
  extractModuleNumberFromRow,
  getCertificateElementZIndex,
  getCertificateSheetDimensions,
  groupCertificateRowsByModule,
  pxToPtNumber,
  updateCertificateLayerOrder,
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
      | 'molduraVersoUrl'
      | 'logoEsquerdaUrl'
      | 'logoCentroUrl'
      | 'logoDireitaUrl'
      | 'logoEsquerdaVersoUrl'
      | 'logoCentroVersoUrl'
      | 'logoDireitaVersoUrl'
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
  onRenameLibraryAsset?: (asset: CertificateLibraryAsset, newName: string) => void;
  onDeleteLibraryAsset?: (asset: CertificateLibraryAsset) => void;
  onSaveCurrentAssetToLibrary?: (
    category: CertificateAssetCategory,
    url: string,
    suggestedName: string
  ) => void;
  onOpenLibrary?: (category: CertificateAssetCategory) => void;
  onAddCustomTextBox?: (lado: 'front' | 'back') => void;
  placingTextBoxId?: string | null;
  onTogglePlaceTextBox?: (boxId: string | null) => void;
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
  { value: 'script', label: 'Caligráfica Formal' },
];

function getObjectMeta(obj: CertificateSelectableObject): {
  title: string;
  subtitle: string;
  sideLabel: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
} {
  if (obj === 'caixasTexto' || obj.startsWith('caixaTexto:')) {
    return {
      title: 'Caixas de Texto Livres',
      subtitle: 'Inserir e posicionar texto livre em qualquer ponto da Frente ou Verso',
      sideLabel: 'Livre',
      icon: Type,
    };
  }
  switch (obj) {
    case 'brasaoEsquerdo':
      return {
        title: 'Brasão Esquerdo (Frente)',
        subtitle: 'Exibir/inibir, tamanho, opacidade, imagem, posição e camada',
        sideLabel: 'Frente',
        icon: Shield,
      };
    case 'brasaoCentro':
      return {
        title: 'Brasão Central (Frente)',
        subtitle: 'Inserir imagem, legenda, tamanho, opacidade, posição e camada',
        sideLabel: 'Frente',
        icon: Shield,
      };
    case 'brasaoDireito':
      return {
        title: 'Brasão Direito (Frente)',
        subtitle: 'Exibir/inibir, legenda, imagem, tamanho, opacidade, posição e camada',
        sideLabel: 'Frente',
        icon: Shield,
      };
    case 'brasaoEsquerdoVerso':
      return {
        title: 'Brasão Esquerdo (Verso)',
        subtitle: 'Exibir/inibir, imagem, tamanho, opacidade, posição e camada no verso',
        sideLabel: 'Verso',
        icon: Shield,
      };
    case 'brasaoCentroVerso':
      return {
        title: 'Brasão Central (Verso)',
        subtitle: 'Exibir/inibir, imagem, legenda, tamanho, opacidade, posição e camada',
        sideLabel: 'Verso',
        icon: Shield,
      };
    case 'brasaoDireitoVerso':
      return {
        title: 'Brasão Direito (Verso)',
        subtitle: 'Exibir/inibir, legenda, imagem, tamanho, opacidade, posição e camada',
        sideLabel: 'Verso',
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
        title: "Marca d'Água Central (Frente)",
        subtitle: 'Trocar imagem, enviar p/ trás/frente, tamanho, opacidade e posição',
        sideLabel: 'Frente',
        icon: ImageIcon,
      };
    case 'molduraFrente':
      return {
        title: 'Moldura da Frente',
        subtitle: 'Moldura original/vetorial, cor, margens, camada e imagem',
        sideLabel: 'Frente',
        icon: Frame,
      };
    case 'versoTitulo':
      return {
        title: 'Título do Curso (Verso)',
        subtitle: 'Texto, fonte, negrito/itálico, espaçamento, posição e camada',
        sideLabel: 'Verso',
        icon: Type,
      };
    case 'versoTabela':
      return {
        title: 'Disciplinas e Notas (Verso)',
        subtitle: 'Módulos, notas, espaçamento entre linhas, fontes e tamanhos',
        sideLabel: 'Verso',
        icon: Layers,
      };
    case 'marcaDaguaVerso':
      return {
        title: "Marca d'Água Central (Verso)",
        subtitle: 'Trocar imagem, enviar p/ trás/frente, tamanho, escala e posição',
        sideLabel: 'Verso',
        icon: ImageIcon,
      };
    case 'versoMoldura':
      return {
        title: 'Moldura do Verso',
        subtitle: 'Moldura clássica/original/vetorial, cor, margens, camada e imagem',
        sideLabel: 'Verso',
        icon: Frame,
      };
    case 'modeloGeral':
    default:
      return {
        title: 'Configurações e Elementos',
        subtitle: 'Acesso rápido frente/verso, layout formal A4 e emissão avulsa',
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
  onRenameLibraryAsset,
  onDeleteLibraryAsset,
  onSaveCurrentAssetToLibrary,
  onOpenLibrary,
  onAddCustomTextBox,
  placingTextBoxId = null,
  onTogglePlaceTextBox,
}: CertificateInspectorPanelProps) {
  const [showQuickElements, setShowQuickElements] = React.useState(false);
  const [renamingStripAsset, setRenamingStripAsset] = React.useState<{
    id: string;
    value: string;
  } | null>(null);
  const customBoxTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const meta = getObjectMeta(selectedObject);
  const HeaderIcon = meta.icon;
  const {
    isPortrait,
    width: sheetWidth,
    height: sheetHeight,
  } = getCertificateSheetDimensions(template.orientacao);

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
    if (target === 'brasaoEsquerdoVerso') {
      const effectiveUrl =
        template.logoEsquerdaVersoUrl !== undefined
          ? template.logoEsquerdaVersoUrl
          : template.logoEsquerdaUrl;
      return Boolean(effectiveUrl) && effectiveUrl === asset.url;
    }
    if (target === 'brasaoCentroVerso') {
      const effectiveUrl =
        template.logoCentroVersoUrl !== undefined
          ? template.logoCentroVersoUrl
          : template.logoCentroUrl;
      return Boolean(effectiveUrl) && effectiveUrl === asset.url;
    }
    if (target === 'brasaoDireitoVerso') {
      const effectiveUrl =
        template.logoDireitaVersoUrl !== undefined
          ? template.logoDireitaVersoUrl
          : template.logoDireitaUrl;
      const allowDefault =
        template.usarBrasaoPadraoDireitaVerso !== undefined
          ? template.usarBrasaoPadraoDireitaVerso
          : template.usarBrasaoPadraoDireita !== false;
      if (asset.isDefaultMarinhaCrest) {
        return !effectiveUrl && allowDefault;
      }
      return Boolean(effectiveUrl) && effectiveUrl === asset.url;
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
    if (target === 'molduraVerso') {
      const currentStyle = template.estiloMolduraVerso ?? 'classica';
      if (asset.frameStyle === 'vetorial' || asset.frameStyle === 'simples') {
        return currentStyle === asset.frameStyle;
      }
      const effectiveUrl = template.molduraVersoUrl || template.molduraFrenteUrl;
      return currentStyle === 'original' && effectiveUrl === asset.url;
    }
    return false;
  };

  const renderQuickElementsGrid = (compact = false) => {
    const frontStyle =
      template.estiloMolduraFrente ??
      (template.usarMolduraOriginal !== false ? 'original' : 'vetorial');
    const backStyle = template.estiloMolduraVerso ?? 'classica';

    const frontItems: {
      id: CertificateSelectableObject;
      label: string;
      isHidden?: boolean;
    }[] = [
      {
        id: 'brasaoEsquerdo',
        label: 'Brasão Esq.',
        isHidden: template.mostrarLogoEsquerda === false,
      },
      {
        id: 'brasaoCentro',
        label: 'Brasão Centro',
        isHidden: template.mostrarLogoCentro !== true,
      },
      {
        id: 'brasaoDireito',
        label: 'Brasão Dir.',
        isHidden: template.mostrarLogoDireita === false,
      },
      { id: 'titulo', label: 'Título Principal' },
      { id: 'texto', label: 'Texto Principal' },
      { id: 'data', label: 'Local e Data' },
      { id: 'assinaturaPrincipal', label: 'Assinatura 1' },
      {
        id: 'segundaAssinatura',
        label: '2ª Assinatura',
        isHidden: !template.mostrarSegundaAssinatura,
      },
      {
        id: 'marcaDaguaFrente',
        label: "Marca d'Água",
        isHidden: !template.marcaDaguaFrenteUrl,
      },
      {
        id: 'molduraFrente',
        label: 'Moldura',
        isHidden: frontStyle === 'nenhuma',
      },
    ];

    const backItems: {
      id: CertificateSelectableObject;
      label: string;
      isHidden?: boolean;
    }[] = [
      {
        id: 'brasaoEsquerdoVerso',
        label: 'Brasão Esq.',
        isHidden:
          (template.mostrarLogoEsquerdaVerso ?? template.mostrarLogoEsquerda) === false,
      },
      {
        id: 'brasaoCentroVerso',
        label: 'Brasão Centro',
        isHidden: template.mostrarLogoCentroVerso !== true,
      },
      {
        id: 'brasaoDireitoVerso',
        label: 'Brasão Dir.',
        isHidden:
          (template.mostrarLogoDireitaVerso ?? template.mostrarLogoDireita) === false,
      },
      { id: 'versoTitulo', label: 'Título do Curso' },
      { id: 'versoTabela', label: 'Disciplinas / Notas' },
      {
        id: 'marcaDaguaVerso',
        label: "Marca d'Água",
        isHidden: !template.marcaDaguaVersoUrl,
      },
      {
        id: 'versoMoldura',
        label: 'Moldura',
        isHidden: backStyle === 'nenhuma',
      },
    ];

    const renderGroup = (
      heading: string,
      badgeClass: string,
      items: { id: CertificateSelectableObject; label: string; isHidden?: boolean }[]
    ) => (
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider',
              badgeClass
            )}
          >
            {heading}
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {items.map((item) => {
            const isSelected = selectedObject === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectObject(item.id);
                  setShowQuickElements(true);
                }}
                className={cn(
                  'rounded-lg border font-bold transition-all cursor-pointer flex items-center gap-1',
                  compact ? 'px-2 py-1 text-[10px]' : 'px-2.5 py-1 text-[11px]',
                  isSelected
                    ? 'bg-blue-900 text-white border-blue-950 shadow-2xs'
                    : item.isHidden
                      ? 'bg-slate-100 hover:bg-blue-50 border-dashed border-slate-300 text-slate-600 hover:text-blue-900'
                      : 'bg-white hover:bg-blue-50 border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-900'
                )}
                title={
                  item.isHidden
                    ? `${item.label} (atualmente oculto — clique para abrir os controles)`
                    : `Abrir controles de ${item.label}`
                }
              >
                <span>{item.label}</span>
                {item.isHidden && (
                  <span
                    className={cn(
                      'text-[8px] font-black uppercase px-1 rounded',
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200 text-slate-600'
                    )}
                  >
                    Oculto
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );

    const customBoxesList = template.caixasTextoExtra || [];

    return (
      <div className="space-y-2.5">
        {renderGroup('Frente (Página 1)', 'bg-blue-100 text-blue-900', frontItems)}
        {renderGroup('Verso (Página 2)', 'bg-emerald-100 text-emerald-900', backItems)}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-1.5">
            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-900">
              Caixas de Texto Livres ({customBoxesList.length})
            </span>
            {onAddCustomTextBox && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onAddCustomTextBox('front')}
                  className="px-2 py-0.5 rounded-md bg-blue-900 hover:bg-blue-950 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={10} />
                  <span>Frente</span>
                </button>
                <button
                  type="button"
                  onClick={() => onAddCustomTextBox('back')}
                  className="px-2 py-0.5 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={10} />
                  <span>Verso</span>
                </button>
              </div>
            )}
          </div>
          {customBoxesList.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {customBoxesList.map((box, idx) => {
                const key = `caixaTexto:${box.id}` as CertificateSelectableObject;
                const isSelected = selectedObject === key;
                const snippet = (box.texto || '').replace(/\s+/g, ' ').trim();
                const shortLabel = snippet
                  ? `${idx + 1}. ${snippet.slice(0, 18)}${snippet.length > 18 ? '…' : ''}`
                  : `Caixa ${idx + 1}`;
                return (
                  <button
                    key={box.id}
                    type="button"
                    onClick={() => {
                      onSelectObject(key);
                      setShowQuickElements(true);
                    }}
                    className={cn(
                      'rounded-lg border font-bold transition-all cursor-pointer flex items-center gap-1',
                      compact ? 'px-2 py-1 text-[10px]' : 'px-2.5 py-1 text-[11px]',
                      isSelected
                        ? 'bg-blue-900 text-white border-blue-950 shadow-2xs'
                        : 'bg-white hover:bg-blue-50 border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-900'
                    )}
                  >
                    <span
                      className={cn(
                        'text-[8px] font-black uppercase px-1 rounded',
                        isSelected
                          ? 'bg-white/20 text-white'
                          : box.lado === 'back'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                      )}
                    >
                      {box.lado === 'back' ? 'Verso' : 'Frente'}
                    </span>
                    <span>{shortLabel}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleInsertBodyLineBreak = () => {
    const ta = bodyTextareaRef.current;
    if (!ta) {
      updateActiveBodyText((prev) => `${prev}\n`);
      return;
    }
    const start = ta.selectionStart ?? ta.value.length;
    const end = ta.selectionEnd ?? ta.value.length;
    updateActiveBodyText((prev) => `${prev.slice(0, start)}\n${prev.slice(end)}`);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + 1, start + 1);
    });
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

        {renamingStripAsset &&
          onRenameLibraryAsset &&
          items.some((a) => a.id === renamingStripAsset.id) && (
            <div className="p-2 rounded-lg bg-blue-50/80 border border-blue-200 flex items-center gap-1.5">
              <input
                type="text"
                value={renamingStripAsset.value}
                onChange={(e) =>
                  setRenamingStripAsset((prev) =>
                    prev ? { ...prev, value: e.target.value } : null
                  )
                }
                onKeyDown={(e) => {
                  const targetAsset = items.find((a) => a.id === renamingStripAsset.id);
                  if (e.key === 'Enter' && targetAsset) {
                    e.preventDefault();
                    const trimmed = renamingStripAsset.value.trim();
                    if (trimmed && trimmed !== targetAsset.name) {
                      onRenameLibraryAsset(targetAsset, trimmed);
                    }
                    setRenamingStripAsset(null);
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setRenamingStripAsset(null);
                  }
                }}
                autoFocus
                placeholder="Novo nome do item"
                className="flex-1 min-w-0 px-2 py-1 bg-white border border-blue-300 rounded text-[11px] font-bold text-slate-900 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  const targetAsset = items.find((a) => a.id === renamingStripAsset.id);
                  const trimmed = renamingStripAsset.value.trim();
                  if (targetAsset && trimmed && trimmed !== targetAsset.name) {
                    onRenameLibraryAsset(targetAsset, trimmed);
                  }
                  setRenamingStripAsset(null);
                }}
                className="p-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer"
                title="Salvar novo nome"
              >
                <Check size={11} />
              </button>
              <button
                type="button"
                onClick={() => setRenamingStripAsset(null)}
                className="p-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 cursor-pointer"
                title="Cancelar"
              >
                <X size={11} />
              </button>
            </div>
          )}

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
                  {(onDownloadLibraryAsset || onRenameLibraryAsset || onDeleteLibraryAsset) && (
                    <div className="absolute top-1 right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onRenameLibraryAsset && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenamingStripAsset({ id: asset.id, value: asset.name });
                          }}
                          className="p-1 rounded bg-white/95 hover:bg-blue-50 border border-slate-200 text-blue-900 cursor-pointer"
                          title={`Renomear ${asset.name}`}
                        >
                          <Pencil size={9} />
                        </button>
                      )}
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

  const renderLayerOrderControls = (layerKey: CertificateLayerKey, label: string) => {
    const currentZ = getCertificateElementZIndex(template, layerKey);
    const hasCustomOrder = template.camadasZIndex?.[layerKey] !== undefined;
    const handleLayerAction = (
      action: 'front' | 'back' | 'forward' | 'backward' | 'reset'
    ) => {
      setTemplate((prev) => ({
        ...prev,
        camadasZIndex: updateCertificateLayerOrder(prev.camadasZIndex, layerKey, action),
      }));
    };

    return (
      <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
            <Layers size={12} className="text-blue-800 shrink-0" />
            <span>Ordem de Camada ({label})</span>
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
              Camada {currentZ}
            </span>
            {hasCustomOrder && (
              <button
                type="button"
                onClick={() => handleLayerAction('reset')}
                className="text-[10px] font-semibold text-blue-700 hover:text-blue-900 underline cursor-pointer"
                title={`Restaurar camada padrão (${DEFAULT_CERTIFICATE_Z_INDEX[layerKey]})`}
              >
                Padrão
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          <button
            type="button"
            onClick={() => handleLayerAction('front')}
            className="px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-slate-700 hover:text-blue-900 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
            title="Trazer este item para a frente de todos os outros"
          >
            <ChevronsUp size={12} />
            <span>P/ Frente</span>
          </button>
          <button
            type="button"
            onClick={() => handleLayerAction('forward')}
            className="px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-slate-700 hover:text-blue-900 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
            title="Avançar uma camada (+1)"
          >
            <ArrowUp size={11} />
            <span>Avançar</span>
          </button>
          <button
            type="button"
            onClick={() => handleLayerAction('backward')}
            className="px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-slate-700 hover:text-blue-900 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
            title="Recuar uma camada (-1)"
          >
            <ArrowDown size={11} />
            <span>Recuar</span>
          </button>
          <button
            type="button"
            onClick={() => handleLayerAction('back')}
            className="px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-slate-700 hover:text-blue-900 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
            title="Enviar este item para trás dos outros"
          >
            <ChevronsDown size={12} />
            <span>P/ Trás</span>
          </button>
        </div>
      </div>
    );
  };

  const renderCrestEditor = (
    side: 'left' | 'center' | 'right' | 'leftBack' | 'centerBack' | 'rightBack'
  ) => {
    const isBack = side === 'leftBack' || side === 'centerBack' || side === 'rightBack';
    const isLeft = side === 'left' || side === 'leftBack';
    const isCenter = side === 'center' || side === 'centerBack';
    const isRight = side === 'right' || side === 'rightBack';

    const defaultLeftUrl = '/assets/aistudio/imagem_01_2da3aec8.png';

    const showKey = isBack
      ? isLeft
        ? ('mostrarLogoEsquerdaVerso' as const)
        : isCenter
          ? ('mostrarLogoCentroVerso' as const)
          : ('mostrarLogoDireitaVerso' as const)
      : isLeft
        ? ('mostrarLogoEsquerda' as const)
        : isCenter
          ? ('mostrarLogoCentro' as const)
          : ('mostrarLogoDireita' as const);

    const frontIsShown = isLeft
      ? template.mostrarLogoEsquerda !== false
      : isCenter
        ? template.mostrarLogoCentro === true
        : template.mostrarLogoDireita !== false;

    const isShown = isBack
      ? isCenter
        ? template.mostrarLogoCentroVerso === true
        : template[showKey] !== undefined
          ? template[showKey] === true
          : frontIsShown
      : frontIsShown;

    const uploadField = isBack
      ? isLeft
        ? ('logoEsquerdaVersoUrl' as const)
        : isCenter
          ? ('logoCentroVersoUrl' as const)
          : ('logoDireitaVersoUrl' as const)
      : isLeft
        ? ('logoEsquerdaUrl' as const)
        : isCenter
          ? ('logoCentroUrl' as const)
          : ('logoDireitaUrl' as const);

    const xKey = isBack
      ? isLeft
        ? ('logoEsquerdaVersoOffsetX' as const)
        : isCenter
          ? ('logoCentroVersoOffsetX' as const)
          : ('logoDireitaVersoOffsetX' as const)
      : isLeft
        ? ('logoEsquerdaOffsetX' as const)
        : isCenter
          ? ('logoCentroOffsetX' as const)
          : ('logoDireitaOffsetX' as const);

    const yKey = isBack
      ? isLeft
        ? ('logoEsquerdaVersoOffsetY' as const)
        : isCenter
          ? ('logoCentroVersoOffsetY' as const)
          : ('logoDireitaVersoOffsetY' as const)
      : isLeft
        ? ('logoEsquerdaOffsetY' as const)
        : isCenter
          ? ('logoCentroOffsetY' as const)
          : ('logoDireitaOffsetY' as const);

    const sizeKey = isBack
      ? isLeft
        ? ('tamanhoLogoEsquerdaVerso' as const)
        : isCenter
          ? ('tamanhoLogoCentroVerso' as const)
          : ('tamanhoLogoDireitaVerso' as const)
      : isLeft
        ? ('tamanhoLogoEsquerda' as const)
        : isCenter
          ? ('tamanhoLogoCentro' as const)
          : ('tamanhoLogoDireita' as const);

    const backSizeKey =
      !isBack && (isLeft || isRight)
        ? isLeft
          ? ('tamanhoLogoEsquerdaVerso' as const)
          : ('tamanhoLogoDireitaVerso' as const)
        : null;

    const opacityKey = isBack
      ? isLeft
        ? ('opacidadeLogoEsquerdaVerso' as const)
        : isCenter
          ? ('opacidadeLogoCentroVerso' as const)
          : ('opacidadeLogoDireitaVerso' as const)
      : isLeft
        ? ('opacidadeLogoEsquerda' as const)
        : isCenter
          ? ('opacidadeLogoCentro' as const)
          : ('opacidadeLogoDireita' as const);

    const frontOpacity = isLeft
      ? template.opacidadeLogoEsquerda ?? 1
      : isCenter
        ? template.opacidadeLogoCentro ?? 1
        : template.opacidadeLogoDireita ?? 1;

    const defaultSize = isBack
      ? isLeft
        ? 66
        : isCenter
          ? 54
          : 54
      : isLeft
        ? 90
        : isCenter
          ? 84
          : 74;
    const backDefaultSize = isLeft ? 68 : 54;
    const minX = isLeft
      ? -120
      : isCenter
        ? isPortrait
          ? -380
          : -540
        : isPortrait
          ? -680
          : -980;
    const maxX = isLeft
      ? isPortrait
        ? 680
        : 980
      : isCenter
        ? isPortrait
          ? 380
          : 540
        : 120;
    const minY = isCenter ? -120 : -100;
    const maxY = isPortrait ? 1020 : 680;

    const valX = template[xKey] ?? 0;
    const valY = template[yKey] ?? 0;
    const valSize = template[sizeKey] ?? defaultSize;
    const valBackSize = backSizeKey ? template[backSizeKey] : undefined;
    const valOpacity = isBack ? template[opacityKey] ?? frontOpacity : template[opacityKey] ?? 1;

    const frontUrl = isLeft
      ? template.logoEsquerdaUrl || ''
      : isCenter
        ? template.logoCentroUrl || ''
        : template.logoDireitaUrl || '';

    const rawUrl = template[uploadField];
    const isInheritingBackUrl = isBack && rawUrl === undefined;
    const effectiveUrl = isBack ? (rawUrl !== undefined ? rawUrl : frontUrl) : frontUrl;

    const allowDefaultRight = isBack
      ? template.usarBrasaoPadraoDireitaVerso !== undefined
        ? template.usarBrasaoPadraoDireitaVerso
        : template.usarBrasaoPadraoDireita !== false
      : template.usarBrasaoPadraoDireita !== false;

    const libraryTarget: CertificateAssetTarget = isBack
      ? isLeft
        ? 'brasaoEsquerdoVerso'
        : isCenter
          ? 'brasaoCentroVerso'
          : 'brasaoDireitoVerso'
      : isLeft
        ? 'brasaoEsquerdo'
        : isCenter
          ? 'brasaoCentro'
          : 'brasaoDireito';

    const layerKey: CertificateLayerKey = isBack
      ? isLeft
        ? 'brasaoEsquerdoVerso'
        : isCenter
          ? 'brasaoCentroVerso'
          : 'brasaoDireitoVerso'
      : isLeft
        ? 'brasaoEsquerdo'
        : isCenter
          ? 'brasaoCentro'
          : 'brasaoDireito';

    const layerLabel = isBack
      ? isLeft
        ? 'Brasão Esquerdo (Verso)'
        : isCenter
          ? 'Brasão Central (Verso)'
          : 'Brasão Direito (Verso)'
      : isLeft
        ? 'Brasão Esquerdo'
        : isCenter
          ? 'Brasão Central'
          : 'Brasão Direito';

    const showCaptionKey = isBack
      ? isCenter
        ? ('mostrarLegendaLogoCentroVerso' as const)
        : ('mostrarLegendaLogoDireitaVerso' as const)
      : isCenter
        ? ('mostrarLegendaLogoCentro' as const)
        : ('mostrarLegendaLogoDireita' as const);

    const captionTextKey = isBack
      ? isCenter
        ? ('logoCentroVersoTexto' as const)
        : ('logoDireitaVersoTexto' as const)
      : isCenter
        ? ('logoCentroTexto' as const)
        : ('logoDireitaTexto' as const);

    const effectiveCaptionShown = isBack
      ? isCenter
        ? template.mostrarLegendaLogoCentroVerso !== undefined
          ? template.mostrarLegendaLogoCentroVerso
          : template.mostrarLegendaLogoCentro === true
        : template.mostrarLegendaLogoDireitaVerso !== undefined
          ? template.mostrarLegendaLogoDireitaVerso
          : effectiveUrl
            ? template.mostrarLegendaLogoDireita === true
            : allowDefaultRight && template.mostrarLegendaLogoDireita !== false
      : isCenter
        ? template.mostrarLegendaLogoCentro === true
        : template.logoDireitaUrl
          ? template.mostrarLegendaLogoDireita === true
          : template.mostrarLegendaLogoDireita !== false;

    const effectiveCaptionValue = isBack
      ? isCenter
        ? template.logoCentroVersoTexto ?? template.logoCentroTexto ?? ''
        : template.logoDireitaVersoTexto ?? template.logoDireitaTexto ?? ''
      : isCenter
        ? template.logoCentroTexto ?? ''
        : template.logoDireitaTexto ?? '';

    const hasCustomBackOverrides =
      isBack &&
      (template[showKey] !== undefined ||
        template[uploadField] !== undefined ||
        template[sizeKey] !== undefined ||
        template[opacityKey] !== undefined ||
        valX !== 0 ||
        valY !== 0 ||
        (isRight &&
          (template.usarBrasaoPadraoDireitaVerso !== undefined ||
            template.mostrarLegendaLogoDireitaVerso !== undefined ||
            template.logoDireitaVersoTexto !== undefined)) ||
        (isCenter &&
          (template.mostrarLegendaLogoCentroVerso !== undefined ||
            template.logoCentroVersoTexto !== undefined)));

    return (
      <div className="space-y-4">
        {/* 2-Row Switcher: Front & Back Crests */}
        <div className="space-y-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-black uppercase text-blue-900 px-1.5 w-11 shrink-0">
              Frente
            </span>
            <div className="grid grid-cols-3 gap-1 flex-1">
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
                    'py-1 px-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer',
                    selectedObject === tab.id
                      ? 'bg-white text-blue-900 shadow-2xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-black uppercase text-emerald-800 px-1.5 w-11 shrink-0">
              Verso
            </span>
            <div className="grid grid-cols-3 gap-1 flex-1">
              {[
                { id: 'brasaoEsquerdoVerso' as const, label: 'Esquerdo' },
                { id: 'brasaoCentroVerso' as const, label: 'Central' },
                { id: 'brasaoDireitoVerso' as const, label: 'Direito' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onSelectObject(tab.id)}
                  className={cn(
                    'py-1 px-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer',
                    selectedObject === tab.id
                      ? 'bg-white text-emerald-900 shadow-2xs border border-emerald-200'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div
          className={cn(
            'p-3.5 rounded-xl border space-y-3',
            isShown ? 'bg-slate-50 border-slate-200' : 'bg-slate-100/80 border-slate-200'
          )}
        >
          {isBack && (
            <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-50/80 border border-emerald-200 text-[10px]">
              <span className="font-semibold text-emerald-900">
                {hasCustomBackOverrides
                  ? 'Configuração independente ativa no Verso'
                  : isCenter
                    ? 'Opcional independente no Verso'
                    : 'Espelhando imagem e visibilidade da Frente'}
              </span>
              {hasCustomBackOverrides && (
                <button
                  type="button"
                  onClick={() =>
                    setTemplate((prev) => ({
                      ...prev,
                      [showKey]: undefined,
                      [uploadField]: undefined,
                      [sizeKey]: undefined,
                      [opacityKey]: undefined,
                      [xKey]: 0,
                      [yKey]: 0,
                      ...(isRight
                        ? {
                            usarBrasaoPadraoDireitaVerso: undefined,
                            mostrarLegendaLogoDireitaVerso: undefined,
                            logoDireitaVersoTexto: undefined,
                          }
                        : {}),
                      ...(isCenter
                        ? {
                            mostrarLegendaLogoCentroVerso: undefined,
                            logoCentroVersoTexto: undefined,
                          }
                        : {}),
                    }))
                  }
                  className="font-bold text-emerald-800 hover:text-emerald-950 underline cursor-pointer shrink-0"
                >
                  Igual à Frente
                </button>
              )}
            </div>
          )}

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
              <span>
                {isShown
                  ? isBack
                    ? 'Exibir este Brasão no Verso'
                    : 'Exibir este Brasão'
                  : 'Brasão Inibido (Oculto)'}
              </span>
            </label>
            {renderMoveOnSheetButton()}
          </div>

          <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-white border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-700 truncate">
              {effectiveUrl
                ? isInheritingBackUrl
                  ? 'Imagem herdada da Frente'
                  : 'Imagem configurada'
                : isCenter
                  ? 'Sem imagem no brasão central'
                  : isRight && !allowDefaultRight
                    ? 'Brasão vazio (clique em Inserir)'
                    : isLeft
                      ? 'Brasão vazio (clique em Inserir)'
                      : 'Brasão padrão do sistema'}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <label className="px-2.5 py-1 rounded-lg bg-blue-900 hover:bg-blue-950 text-white text-[11px] font-bold cursor-pointer flex items-center gap-1">
                <Upload size={11} />
                <span>{effectiveUrl ? 'Trocar' : 'Inserir'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(uploadField, e)}
                  className="hidden"
                />
              </label>
              {isCenter ? (
                effectiveUrl && (
                  <button
                    type="button"
                    onClick={() =>
                      setTemplate((prev) => ({
                        ...prev,
                        [uploadField]: '',
                        [showKey]: false,
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
                  {(effectiveUrl || (isRight && allowDefaultRight)) && (
                    <button
                      type="button"
                      onClick={() =>
                        setTemplate((prev) => ({
                          ...prev,
                          [uploadField]: '',
                          ...(isRight
                            ? isBack
                              ? {
                                  usarBrasaoPadraoDireitaVerso: false,
                                  mostrarLegendaLogoDireitaVerso: false,
                                }
                              : {
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
                        [uploadField]: isBack ? undefined : isLeft ? defaultLeftUrl : '',
                        ...(isRight
                          ? isBack
                            ? {
                                usarBrasaoPadraoDireitaVerso: undefined,
                                mostrarLegendaLogoDireitaVerso: undefined,
                              }
                            : {
                                usarBrasaoPadraoDireita: true,
                                mostrarLegendaLogoDireita: true,
                                logoDireitaTexto:
                                  prev.logoDireitaTexto || 'MARINHA DO BRASIL',
                              }
                          : {}),
                      }))
                    }
                    className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                    title={isBack ? 'Usar padrão da Frente' : 'Restaurar brasão padrão'}
                  >
                    <RotateCcw size={12} />
                  </button>
                </>
              )}
            </div>
          </div>

          {renderLibrarySwapStrip(
            'brasao',
            libraryTarget,
            effectiveUrl || undefined,
            layerLabel
          )}

          {(isCenter || isRight) && (
            <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-2">
              <label className="flex items-center gap-2 text-[11px] font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={effectiveCaptionShown}
                  onChange={(e) =>
                    setTemplate((prev) => ({
                      ...prev,
                      [showCaptionKey]: e.target.checked,
                    }))
                  }
                  className="rounded border-slate-300"
                />
                <span>
                  Exibir legenda abaixo do {isCenter ? 'Brasão Central' : 'Brasão Direito'}
                </span>
              </label>
              <input
                type="text"
                value={effectiveCaptionValue}
                onChange={(e) =>
                  setTemplate((prev) => ({
                    ...prev,
                    [captionTextKey]: e.target.value,
                  }))
                }
                placeholder={
                  isCenter
                    ? 'Legenda opcional do Brasão Central'
                    : 'Ex: MARINHA DO BRASIL (ou deixe vazio)'
                }
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          )}

          <div className="space-y-2.5 pt-1 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700">
                Tamanho e Opacidade
              </span>
              <button
                type="button"
                onClick={() =>
                  setTemplate((prev) => ({
                    ...prev,
                    [sizeKey]: isBack ? undefined : defaultSize,
                    ...(backSizeKey ? { [backSizeKey]: undefined } : {}),
                    [opacityKey]: isBack ? undefined : 1,
                  }))
                }
                className="text-[10px] font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer"
              >
                Restaurar tamanho
              </button>
            </div>
            <div>
              <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                <span>
                  {isBack
                    ? 'Tamanho no Verso'
                    : backSizeKey
                      ? 'Tamanho na Frente'
                      : 'Tamanho do Brasão'}
                </span>
                <span className="font-mono text-slate-800">{valSize}px</span>
              </div>
              <input
                type="range"
                min={isBack ? 28 : 36}
                max={isBack ? 150 : 220}
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
            {backSizeKey && (
              <div>
                <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                  <span>Tamanho no Verso</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-slate-800">
                      {valBackSize !== undefined
                        ? `${valBackSize}px`
                        : `Padrão (${backDefaultSize}px)`}
                    </span>
                    {valBackSize !== undefined && (
                      <button
                        type="button"
                        onClick={() =>
                          setTemplate((prev) => ({
                            ...prev,
                            [backSizeKey]: undefined,
                          }))
                        }
                        className="text-[10px] text-blue-700 hover:text-blue-900 underline cursor-pointer"
                      >
                        Padrão
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="range"
                  min={28}
                  max={150}
                  step={2}
                  value={valBackSize ?? backDefaultSize}
                  onChange={(e) =>
                    setTemplate((prev) => ({
                      ...prev,
                      [backSizeKey]: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-blue-800"
                />
              </div>
            )}
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

          {renderLayerOrderControls(layerKey, layerLabel)}
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
          <button
            type="button"
            onClick={() => setShowQuickElements((v) => !v)}
            className={cn(
              'px-2 py-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors',
              showQuickElements
                ? 'bg-blue-900 text-white border-blue-950'
                : 'bg-white hover:bg-blue-50 text-blue-900 border-slate-200'
            )}
            title="Abrir acesso rápido de todos os elementos (Frente e Verso) ao lado"
          >
            <Layers size={12} />
            <span>Elementos</span>
          </button>
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

      {showQuickElements && selectedObject !== 'modeloGeral' && (
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/90 space-y-2 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
              Elementos Rápidos / Ocultos (Frente e Verso)
            </span>
            <button
              type="button"
              onClick={() => setShowQuickElements(false)}
              className="text-[10px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Recolher
            </button>
          </div>
          {renderQuickElementsGrid(true)}
        </div>
      )}

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

              <textarea
                rows={2}
                value={template.titulo}
                onChange={(e) =>
                  setTemplate((prev) => ({ ...prev, titulo: e.target.value }))
                }
                placeholder="Ex: CERTIFICADO"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase resize-y"
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
                    min={10}
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
                    min={isPortrait ? -380 : -520}
                    max={isPortrait ? 380 : 520}
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
                    min={isPortrait ? -480 : -300}
                    max={isPortrait ? 880 : 560}
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

            {renderLayerOrderControls('titulo', 'Título Principal')}
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
                  <button
                    type="button"
                    onClick={handleInsertBodyLineBreak}
                    className="px-2 py-0.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    title="Inserir quebra de linha no cursor (ou pressione Enter no texto)"
                  >
                    <CornerDownLeft size={11} />
                    <span>Quebra de linha</span>
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
                  Selecione um trecho para <strong>Negritar</strong>/<em>Itálico</em> ou pressione{' '}
                  <strong>Enter</strong> para quebrar para a linha de baixo.
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
                  min={8}
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
                        <span>Tamanho do Nome em Destaque</span>
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
                        min={10}
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
                      min={isPortrait ? -360 : -480}
                      max={isPortrait ? 360 : 480}
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
                      min={isPortrait ? -560 : -360}
                      max={isPortrait ? 720 : 460}
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

              {renderLayerOrderControls('texto', 'Texto Principal')}
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
                <textarea
                  rows={2}
                  value={template.localEmissao}
                  onChange={(e) =>
                    setTemplate((prev) => ({ ...prev, localEmissao: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs resize-y"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Data por Extenso
                </label>
                <textarea
                  rows={2}
                  value={template.dataEmissaoExtenso}
                  onChange={(e) =>
                    setTemplate((prev) => ({
                      ...prev,
                      dataEmissaoExtenso: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs resize-y"
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
                    <span>Tamanho da Fonte</span>
                    <span className="font-mono text-blue-900">
                      {template.tamanhoFonteData ??
                        Math.max(8, (template.tamanhoFonteCorpo || 19) - 1)}
                      px (
                      {pxToPtNumber(
                        template.tamanhoFonteData ??
                          Math.max(8, (template.tamanhoFonteCorpo || 19) - 1)
                      )}
                      pt)
                    </span>
                  </div>
                  <input
                    type="range"
                    min={8}
                    max={22}
                    step={1}
                    value={
                      template.tamanhoFonteData ??
                      Math.max(8, (template.tamanhoFonteCorpo || 19) - 1)
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
                      min={isPortrait ? -380 : -520}
                      max={isPortrait ? 380 : 520}
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
                      min={isPortrait ? -820 : -540}
                      max={isPortrait ? 520 : 340}
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

              {renderLayerOrderControls('data', 'Local e Data')}
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

              <textarea
                rows={2}
                value={template.assinaturaNome}
                onChange={(e) =>
                  setTemplate((prev) => ({ ...prev, assinaturaNome: e.target.value }))
                }
                placeholder="Nome completo (pressione Enter para quebrar linha)"
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold resize-y"
              />

              <div className="grid grid-cols-2 gap-2">
                <textarea
                  rows={2}
                  value={template.assinaturaPosto}
                  onChange={(e) =>
                    setTemplate((prev) => ({ ...prev, assinaturaPosto: e.target.value }))
                  }
                  placeholder="Posto / Graduação"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs resize-y"
                />
                <textarea
                  rows={2}
                  value={template.assinaturaCargo}
                  onChange={(e) =>
                    setTemplate((prev) => ({ ...prev, assinaturaCargo: e.target.value }))
                  }
                  placeholder="Função / Cargo"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs resize-y"
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
                      <span>Fonte do Nome</span>
                      <span className="font-mono text-blue-900">
                        {template.tamanhoFonteAssinaturaNome ?? 14.5}px ({pxToPtNumber(template.tamanhoFonteAssinaturaNome ?? 14.5)}pt)
                      </span>
                    </div>
                    <input
                      type="range"
                      min={7}
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
                      <span>Fonte Posto/Cargo</span>
                      <span className="font-mono text-blue-900">
                        {template.tamanhoFonteAssinaturaCargo ?? 13.5}px ({pxToPtNumber(template.tamanhoFonteAssinaturaCargo ?? 13.5)}pt)
                      </span>
                    </div>
                    <input
                      type="range"
                      min={6}
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
                    Use Enter nos campos acima para quebrar linha
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
                    max={isPortrait ? 8.0 : 4.5}
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
                    min={isPortrait ? -450 : -220}
                    max={isPortrait ? 160 : 120}
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
                        min={isPortrait ? -380 : -520}
                        max={isPortrait ? 380 : 520}
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
                        min={isPortrait ? -960 : -640}
                        max={isPortrait ? 220 : 180}
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

              {renderLayerOrderControls('assinaturaPrincipal', 'Assinatura Principal')}
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
                    <textarea
                      rows={2}
                      value={template.segundaAssinaturaNome}
                      onChange={(e) =>
                        setTemplate((prev) => ({
                          ...prev,
                          segundaAssinaturaNome: e.target.value,
                        }))
                      }
                      placeholder="Nome completo (2ª Assinatura)"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold resize-y"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Posto / Graduação
                      </label>
                      <textarea
                        rows={2}
                        value={template.segundaAssinaturaPosto}
                        onChange={(e) =>
                          setTemplate((prev) => ({
                            ...prev,
                            segundaAssinaturaPosto: e.target.value,
                          }))
                        }
                        placeholder="Ex: Capitão-Tenente"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs resize-y"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Função
                      </label>
                      <textarea
                        rows={2}
                        value={template.segundaAssinaturaCargo}
                        onChange={(e) =>
                          setTemplate((prev) => ({
                            ...prev,
                            segundaAssinaturaCargo: e.target.value,
                          }))
                        }
                        placeholder="Ex: Comandante da Guarda Costeira"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs resize-y"
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
                          <span>Fonte do Nome</span>
                          <span className="font-mono text-blue-900">
                            {template.tamanhoFonteAssinaturaNome ?? 14.5}px ({pxToPtNumber(template.tamanhoFonteAssinaturaNome ?? 14.5)}pt)
                          </span>
                        </div>
                        <input
                          type="range"
                          min={7}
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
                          <span>Fonte Posto/Cargo</span>
                          <span className="font-mono text-blue-900">
                            {template.tamanhoFonteAssinaturaCargo ?? 13.5}px ({pxToPtNumber(template.tamanhoFonteAssinaturaCargo ?? 13.5)}pt)
                          </span>
                        </div>
                        <input
                          type="range"
                          min={6}
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
                        Use Enter nos campos acima para quebrar linha
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
                          min={isPortrait ? -380 : -520}
                          max={isPortrait ? 380 : 520}
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
                          min={isPortrait ? -960 : -640}
                          max={isPortrait ? 220 : 180}
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

                  {renderLayerOrderControls('segundaAssinatura', '2ª Assinatura')}
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

        {/* BRASÕES (FRENTE E VERSO) */}
        {selectedObject === 'brasaoEsquerdo' && renderCrestEditor('left')}
        {selectedObject === 'brasaoCentro' && renderCrestEditor('center')}
        {selectedObject === 'brasaoDireito' && renderCrestEditor('right')}
        {selectedObject === 'brasaoEsquerdoVerso' && renderCrestEditor('leftBack')}
        {selectedObject === 'brasaoCentroVerso' && renderCrestEditor('centerBack')}
        {selectedObject === 'brasaoDireitoVerso' && renderCrestEditor('rightBack')}

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
                  {template.marcaDaguaFrenteUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        setTemplate((prev) => ({
                          ...prev,
                          marcaDaguaFrenteUrl: '',
                        }))
                      }
                      className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-rose-50 text-rose-600 cursor-pointer"
                      title="Remover marca d'água da frente"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
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

              {renderLayerOrderControls('marcaDaguaFrente', "Marca d'Água Frente")}

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

              <div className="space-y-2 pt-1 border-t border-slate-200">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-slate-700">
                    Posição na Folha (Frente)
                  </span>
                  <div className="flex items-center gap-2">
                    {((template.marcaDaguaFrenteOffsetX ?? 0) !== 0 ||
                      (template.marcaDaguaFrenteOffsetY ?? 0) !== 0) && (
                      <button
                        type="button"
                        onClick={() =>
                          setTemplate((prev) => ({
                            ...prev,
                            marcaDaguaFrenteOffsetX: 0,
                            marcaDaguaFrenteOffsetY: 0,
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
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 mb-0.5">
                      <span>Horizontal (X)</span>
                      <span className="font-mono text-slate-800">
                        {(template.marcaDaguaFrenteOffsetX ?? 0) > 0
                          ? `+${template.marcaDaguaFrenteOffsetX}`
                          : (template.marcaDaguaFrenteOffsetX ?? 0)}
                        px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={isPortrait ? -420 : -580}
                      max={isPortrait ? 420 : 580}
                      step={4}
                      value={template.marcaDaguaFrenteOffsetX ?? 0}
                      onChange={(e) =>
                        setTemplate((prev) => ({
                          ...prev,
                          marcaDaguaFrenteOffsetX: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-blue-800"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 mb-0.5">
                      <span>Vertical (Y)</span>
                      <span className="font-mono text-slate-800">
                        {(template.marcaDaguaFrenteOffsetY ?? 0) > 0
                          ? `+${template.marcaDaguaFrenteOffsetY}`
                          : (template.marcaDaguaFrenteOffsetY ?? 0)}
                        px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={isPortrait ? -580 : -420}
                      max={isPortrait ? 580 : 420}
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
                </div>
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
                      marcaDaguaFrenteOffsetX: 0,
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
                          Margens da Folha e Moldura (A4 {template.orientacao === 'portrait' ? 'Retrato' : 'Paisagem'})
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

                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                        <Layers size={12} className="text-blue-800 shrink-0" />
                        <span>Plano de Fundo Fixo: todos os itens sobrepõem a moldura</span>
                      </span>
                      <span className="text-[10px] font-mono font-bold text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 shrink-0">
                        Camada 1
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => onSelectObject('marcaDaguaFrente')}
                        className="w-full py-2 px-3 rounded-lg bg-white border border-slate-200 hover:bg-blue-50 hover:border-blue-300 text-xs font-bold text-slate-700 hover:text-blue-900 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <ImageIcon size={13} />
                        <span>Editar / Trocar Marca d&apos;Água Central (Frente)</span>
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* VERSO — TÍTULO DO CURSO (ESPELHADO DA FRENTE) */}
        {selectedObject === 'versoTitulo' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-700">
                  Título do Curso no Verso (aceita {`{{CURSO}}`})
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setTemplate((prev) => ({
                        ...prev,
                        versoTituloNegrito: !(prev.versoTituloNegrito ?? true),
                      }))
                    }
                    className={cn(
                      'px-2 py-0.5 rounded border text-[10px] font-bold cursor-pointer',
                      (template.versoTituloNegrito ?? true)
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200'
                    )}
                    title="Negrito no título do verso"
                  >
                    N
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setTemplate((prev) => ({
                        ...prev,
                        versoTituloItalico: !(
                          prev.versoTituloItalico ?? prev.versoItalico ?? false
                        ),
                      }))
                    }
                    className={cn(
                      'px-2 py-0.5 rounded border text-[10px] italic font-serif cursor-pointer',
                      (template.versoTituloItalico ?? template.versoItalico ?? false)
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200'
                    )}
                    title="Itálico no título do verso"
                  >
                    I
                  </button>
                </div>
              </div>

              <textarea
                rows={2}
                value={template.versoTituloCurso}
                onChange={(e) =>
                  setTemplate((prev) => ({
                    ...prev,
                    versoTituloCurso: e.target.value,
                  }))
                }
                placeholder="Título do verso (pressione Enter para quebrar linha)"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase resize-y"
              />

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Fonte do Título (Verso)
                </label>
                <select
                  value={template.fonteVersoTitulo || template.fonteVerso || 'sans'}
                  onChange={(e) =>
                    setTemplate((prev) => ({
                      ...prev,
                      fonteVersoTitulo: e.target.value as CertificateFontKey,
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                    <span>Tamanho do Título</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-blue-900">
                        {template.versoTamanhoFonteTitulo ?? 30}px (
                        {pxToPtNumber(template.versoTamanhoFonteTitulo ?? 30)}pt)
                      </span>
                      {template.versoTamanhoFonteTitulo !== undefined && (
                        <button
                          type="button"
                          onClick={() =>
                            setTemplate((prev) => ({
                              ...prev,
                              versoTamanhoFonteTitulo: undefined,
                            }))
                          }
                          className="text-[10px] text-blue-700 hover:text-blue-900 underline cursor-pointer font-semibold"
                        >
                          Padrão
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={44}
                    step={1}
                    value={template.versoTamanhoFonteTitulo ?? 30}
                    onChange={(e) =>
                      setTemplate((prev) => ({
                        ...prev,
                        versoTamanhoFonteTitulo: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-blue-800"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                    <span>Espaço entre Letras</span>
                    <span className="font-mono text-blue-900">
                      {(template.versoTituloEspacamentoLetras ?? 0.02).toFixed(2)}em
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={0.3}
                    step={0.01}
                    value={template.versoTituloEspacamentoLetras ?? 0.02}
                    onChange={(e) =>
                      setTemplate((prev) => ({
                        ...prev,
                        versoTituloEspacamentoLetras: Number(e.target.value),
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
                  Posição do Título no Verso
                </span>
                <div className="flex items-center gap-2">
                  {((template.versoTituloOffsetX ?? 0) !== 0 ||
                    (template.versoTituloOffsetY ?? 0) !== 0) && (
                    <button
                      type="button"
                      onClick={() =>
                        setTemplate((prev) => ({
                          ...prev,
                          versoTituloOffsetX: 0,
                          versoTituloOffsetY: 0,
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
                      {template.versoTituloOffsetX ?? 0}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={isPortrait ? -380 : -520}
                    max={isPortrait ? 380 : 520}
                    step={2}
                    value={template.versoTituloOffsetX ?? 0}
                    onChange={(e) =>
                      setTemplate((prev) => ({
                        ...prev,
                        versoTituloOffsetX: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-blue-800"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                    <span>Vertical (Y)</span>
                    <span className="font-mono text-slate-800">
                      {template.versoTituloOffsetY ?? 0}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={isPortrait ? -240 : -200}
                    max={isPortrait ? 900 : 560}
                    step={2}
                    value={template.versoTituloOffsetY ?? 0}
                    onChange={(e) =>
                      setTemplate((prev) => ({
                        ...prev,
                        versoTituloOffsetY: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-blue-800"
                  />
                </div>
              </div>
            </div>

            {renderLayerOrderControls('versoTitulo', 'Título do Verso')}
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

            <label className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 cursor-pointer">
              <span>Exibir Quadro de Disciplinas e Notas no Verso</span>
              <input
                type="checkbox"
                checked={!template.ocultarTabelaVerso}
                onChange={(e) =>
                  setTemplate((prev) => ({
                    ...prev,
                    ocultarTabelaVerso: !e.target.checked,
                  }))
                }
                className="rounded border-slate-300"
              />
            </label>

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

              <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                    Espaçamento Vertical, Fontes e Tamanhos (Verso)
                  </span>
                  {(template.versoEspacamentoLinhasPx !== undefined ||
                    template.versoEntrelinha !== undefined ||
                    template.fonteVersoNumeros !== undefined ||
                    template.versoTamanhoFonteCabecalho !== undefined ||
                    template.versoTamanhoFonteDisciplinas !== undefined ||
                    template.versoTamanhoFonteNumeros !== undefined ||
                    template.versoTamanhoFonteTotaisLabel !== undefined ||
                    template.versoTamanhoFonteTotaisNumeros !== undefined) && (
                    <button
                      type="button"
                      onClick={() =>
                        setTemplate((prev) => ({
                          ...prev,
                          versoEspacamentoLinhasPx: undefined,
                          versoEntrelinha: undefined,
                          fonteVersoNumeros: undefined,
                          versoTamanhoFonteCabecalho: undefined,
                          versoTamanhoFonteDisciplinas: undefined,
                          versoTamanhoFonteNumeros: undefined,
                          versoTamanhoFonteTotaisLabel: undefined,
                          versoTamanhoFonteTotaisNumeros: undefined,
                        }))
                      }
                      className="text-[10px] font-semibold text-blue-700 hover:text-blue-900 underline cursor-pointer"
                    >
                      Restaurar padrão
                    </button>
                  )}
                </div>

                {/* Espaçamento Vertical das Linhas + Entrelinha */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 mb-0.5">
                      <span>Espaço Vertical (Linhas)</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-blue-900">
                          {template.versoEspacamentoLinhasPx !== undefined
                            ? `${template.versoEspacamentoLinhasPx}px`
                            : 'Auto'}
                        </span>
                        {template.versoEspacamentoLinhasPx !== undefined && (
                          <button
                            type="button"
                            onClick={() =>
                              setTemplate((prev) => ({
                                ...prev,
                                versoEspacamentoLinhasPx: undefined,
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
                      min={2}
                      max={44}
                      step={1}
                      value={template.versoEspacamentoLinhasPx ?? 8}
                      onChange={(e) =>
                        setTemplate((prev) => ({
                          ...prev,
                          versoEspacamentoLinhasPx: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-blue-800"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 mb-0.5">
                      <span>Entrelinha das Disciplinas</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-blue-900">
                          {template.versoEntrelinha !== undefined
                            ? template.versoEntrelinha.toFixed(2)
                            : 'Auto'}
                        </span>
                        {template.versoEntrelinha !== undefined && (
                          <button
                            type="button"
                            onClick={() =>
                              setTemplate((prev) => ({
                                ...prev,
                                versoEntrelinha: undefined,
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
                      min={1.05}
                      max={1.8}
                      step={0.05}
                      value={template.versoEntrelinha ?? 1.25}
                      onChange={(e) =>
                        setTemplate((prev) => ({
                          ...prev,
                          versoEntrelinha: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-blue-800"
                    />
                  </div>
                </div>

                {/* Fontes de Textos e Números */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      Fonte dos Textos (Tabela)
                    </label>
                    <select
                      value={template.fonteVerso || 'sans'}
                      onChange={(e) =>
                        setTemplate((prev) => ({
                          ...prev,
                          fonteVerso: e.target.value as CertificateFontKey,
                        }))
                      }
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    >
                      {FONT_OPTIONS_BACK.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      Fonte dos Números (Notas / Horas / Média)
                    </label>
                    <select
                      value={template.fonteVersoNumeros || ''}
                      onChange={(e) =>
                        setTemplate((prev) => ({
                          ...prev,
                          fonteVersoNumeros: e.target.value
                            ? (e.target.value as CertificateFontKey)
                            : undefined,
                        }))
                      }
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="">Mesma dos Textos</option>
                      {FONT_OPTIONS_BACK.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
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

                {/* Tamanhos de Fonte (Cabeçalho, Disciplinas, Números, Totais) */}
                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 mb-0.5">
                      <span>Tamanho do Cabeçalho (Colunas)</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-blue-900">
                          {template.versoTamanhoFonteCabecalho ?? 21}px ({pxToPtNumber(template.versoTamanhoFonteCabecalho ?? 21)}pt)
                        </span>
                        {template.versoTamanhoFonteCabecalho !== undefined && (
                          <button
                            type="button"
                            onClick={() =>
                              setTemplate((prev) => ({
                                ...prev,
                                versoTamanhoFonteCabecalho: undefined,
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
                      min={7}
                      max={28}
                      step={0.5}
                      value={template.versoTamanhoFonteCabecalho ?? 21}
                      onChange={(e) =>
                        setTemplate((prev) => ({
                          ...prev,
                          versoTamanhoFonteCabecalho: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-blue-800"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 mb-0.5">
                        <span>Texto (Disciplinas)</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-blue-900">
                            {template.versoTamanhoFonteDisciplinas !== undefined
                              ? `${template.versoTamanhoFonteDisciplinas}px`
                              : 'Auto'}
                          </span>
                          {template.versoTamanhoFonteDisciplinas !== undefined && (
                            <button
                              type="button"
                              onClick={() =>
                                setTemplate((prev) => ({
                                  ...prev,
                                  versoTamanhoFonteDisciplinas: undefined,
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
                        min={6}
                        max={26}
                        step={0.5}
                        value={template.versoTamanhoFonteDisciplinas ?? 17}
                        onChange={(e) =>
                          setTemplate((prev) => ({
                            ...prev,
                            versoTamanhoFonteDisciplinas: Number(e.target.value),
                          }))
                        }
                        className="w-full accent-blue-800"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 mb-0.5">
                        <span>Números (Notas / Horas)</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-blue-900">
                            {template.versoTamanhoFonteNumeros !== undefined
                              ? `${template.versoTamanhoFonteNumeros}px`
                              : 'Auto'}
                          </span>
                          {template.versoTamanhoFonteNumeros !== undefined && (
                            <button
                              type="button"
                              onClick={() =>
                                setTemplate((prev) => ({
                                  ...prev,
                                  versoTamanhoFonteNumeros: undefined,
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
                        min={6}
                        max={34}
                        step={0.5}
                        value={template.versoTamanhoFonteNumeros ?? 22}
                        onChange={(e) =>
                          setTemplate((prev) => ({
                            ...prev,
                            versoTamanhoFonteNumeros: Number(e.target.value),
                          }))
                        }
                        className="w-full accent-blue-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 mb-0.5">
                        <span>Texto Totais (Total / Média)</span>
                        <span className="font-mono text-blue-900">
                          {template.versoTamanhoFonteTotaisLabel ?? 22}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min={7}
                        max={30}
                        step={0.5}
                        value={template.versoTamanhoFonteTotaisLabel ?? 22}
                        onChange={(e) =>
                          setTemplate((prev) => ({
                            ...prev,
                            versoTamanhoFonteTotaisLabel: Number(e.target.value),
                          }))
                        }
                        className="w-full accent-blue-800"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 mb-0.5">
                        <span>Números Totais (Horas / Média)</span>
                        <span className="font-mono text-blue-900">
                          {template.versoTamanhoFonteTotaisNumeros ?? 28}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min={7}
                        max={38}
                        step={0.5}
                        value={template.versoTamanhoFonteTotaisNumeros ?? 28}
                        onChange={(e) =>
                          setTemplate((prev) => ({
                            ...prev,
                            versoTamanhoFonteTotaisNumeros: Number(e.target.value),
                          }))
                        }
                        className="w-full accent-blue-800"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {renderLayerOrderControls('versoTabela', 'Quadro do Verso')}
            </div>

            {/* Quick shortcuts to back background / border / crests */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => onSelectObject('versoTitulo')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold cursor-pointer flex items-center gap-1"
              >
                <Type size={12} />
                <span>Título (Verso)</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectObject('brasaoEsquerdoVerso')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold cursor-pointer flex items-center gap-1"
              >
                <Shield size={12} />
                <span>Brasão Esq. (Verso)</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectObject('brasaoCentroVerso')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold cursor-pointer flex items-center gap-1"
              >
                <Shield size={12} />
                <span>Brasão Centro (Verso)</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectObject('brasaoDireitoVerso')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold cursor-pointer flex items-center gap-1"
              >
                <Shield size={12} />
                <span>Brasão Dir. (Verso)</span>
              </button>
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
                <span>Moldura (Verso)</span>
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
                  {template.marcaDaguaVersoUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        setTemplate((prev) => ({
                          ...prev,
                          marcaDaguaVersoUrl: '',
                        }))
                      }
                      className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-rose-50 text-rose-600 cursor-pointer"
                      title="Remover marca d'água do verso"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
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

              {renderLayerOrderControls('marcaDaguaVerso', "Marca d'Água Verso")}

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

              <div className="space-y-2 pt-1 border-t border-slate-200">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-slate-700">
                    Posição na Folha (Verso)
                  </span>
                  <div className="flex items-center gap-2">
                    {((template.marcaDaguaVersoOffsetX ?? 0) !== 0 ||
                      (template.marcaDaguaVersoOffsetY ?? 0) !== 0) && (
                      <button
                        type="button"
                        onClick={() =>
                          setTemplate((prev) => ({
                            ...prev,
                            marcaDaguaVersoOffsetX: 0,
                            marcaDaguaVersoOffsetY: 0,
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
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 mb-0.5">
                      <span>Horizontal (X)</span>
                      <span className="font-mono text-slate-800">
                        {(template.marcaDaguaVersoOffsetX ?? 0) > 0
                          ? `+${template.marcaDaguaVersoOffsetX}`
                          : (template.marcaDaguaVersoOffsetX ?? 0)}
                        px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={isPortrait ? -420 : -580}
                      max={isPortrait ? 420 : 580}
                      step={4}
                      value={template.marcaDaguaVersoOffsetX ?? 0}
                      onChange={(e) =>
                        setTemplate((prev) => ({
                          ...prev,
                          marcaDaguaVersoOffsetX: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-blue-800"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 mb-0.5">
                      <span>Vertical (Y)</span>
                      <span className="font-mono text-slate-800">
                        {(template.marcaDaguaVersoOffsetY ?? 0) > 0
                          ? `+${template.marcaDaguaVersoOffsetY}`
                          : (template.marcaDaguaVersoOffsetY ?? 0)}
                        px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={isPortrait ? -580 : -420}
                      max={isPortrait ? 580 : 420}
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
                </div>
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
                      marcaDaguaVersoOffsetX: 0,
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

        {/* MOLDURA DO VERSO (ESPELHADA DA FRENTE) */}
        {selectedObject === 'versoMoldura' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              {(() => {
                const currentBackFrameStyle = template.estiloMolduraVerso ?? 'classica';
                const currentBackFrameUrl =
                  template.molduraVersoUrl ||
                  (currentBackFrameStyle === 'original' ? template.molduraFrenteUrl : undefined);
                return (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Tipo de Moldura (Verso)
                      </label>
                      <select
                        value={currentBackFrameStyle}
                        onChange={(e) => {
                          const nextStyle = e.target.value as
                            | 'classica'
                            | 'original'
                            | 'vetorial'
                            | 'simples'
                            | 'nenhuma';
                          setTemplate((prev) => ({
                            ...prev,
                            estiloMolduraVerso: nextStyle,
                          }));
                        }}
                        className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                      >
                        <option value="classica">Moldura Clássica (Tripla Institucional)</option>
                        <option value="simples">Moldura Simples (Linha Limpa)</option>
                        <option value="nenhuma">Sem Moldura (Folha em Branco)</option>
                        <option value="original">Moldura com Imagem (Base / Importada)</option>
                        <option value="vetorial">Moldura Vetorial Náutica</option>
                      </select>
                    </div>

                    {(currentBackFrameStyle === 'classica' ||
                      currentBackFrameStyle === 'vetorial' ||
                      currentBackFrameStyle === 'simples') && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Cor da Moldura (Verso)
                        </label>
                        <input
                          type="color"
                          value={template.corBordaVerso}
                          onChange={(e) =>
                            setTemplate((prev) => ({
                              ...prev,
                              corBordaVerso: e.target.value,
                            }))
                          }
                          className="w-full h-10 rounded-lg border border-slate-200 cursor-pointer"
                        />
                      </div>
                    )}

                    <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-slate-700">
                          Imagem da Moldura (Verso)
                        </span>
                        <div className="flex items-center gap-1.5">
                          <label className="px-2.5 py-1 rounded-lg bg-blue-900 hover:bg-blue-950 text-white text-[11px] font-bold cursor-pointer flex items-center gap-1">
                            <Upload size={11} />
                            <span>{template.molduraVersoUrl ? 'Trocar' : 'Importar'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageUpload('molduraVersoUrl', e)}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              setTemplate((prev) => ({
                                ...prev,
                                estiloMolduraVerso: 'classica',
                                molduraVersoUrl: undefined,
                              }))
                            }
                            className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                            title="Restaurar moldura clássica do verso"
                          >
                            <RotateCcw size={12} />
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-snug">
                        O centro branco das molduras importadas fica transparente automaticamente para manter a marca d&apos;água do verso visível.
                      </p>
                      {renderLibrarySwapStrip(
                        'moldura',
                        'molduraVerso',
                        currentBackFrameUrl,
                        'Moldura do Verso'
                      )}
                    </div>

                    {/* Margens da Folha A4 Paisagem (Verso) */}
                    <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-slate-800">
                          Margens da Folha e Moldura (Verso — A4 {template.orientacao === 'portrait' ? 'Retrato' : 'Paisagem'})
                        </span>
                        {(template.margemExternaMolduraVersoCm !== undefined ||
                          template.margemInternaLateralVersoCm !== undefined ||
                          template.margemInternaVerticalVersoCm !== undefined) && (
                          <button
                            type="button"
                            onClick={() =>
                              setTemplate((prev) => ({
                                ...prev,
                                margemExternaMolduraVersoCm: undefined,
                                margemInternaLateralVersoCm: undefined,
                                margemInternaVerticalVersoCm: undefined,
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
                          <span>Margem Externa (borda até moldura)</span>
                          <span className="font-mono text-blue-900">
                            {template.margemExternaMolduraVersoCm !== undefined
                              ? `${template.margemExternaMolduraVersoCm.toFixed(1)} cm`
                              : 'Padrão (0,5 cm)'}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.4}
                          max={2.5}
                          step={0.1}
                          value={template.margemExternaMolduraVersoCm ?? 0.5}
                          onChange={(e) =>
                            setTemplate((prev) => ({
                              ...prev,
                              margemExternaMolduraVersoCm: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-blue-800"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-0.5">
                            <span>Interna Lateral</span>
                            <span className="font-mono text-blue-900">
                              {template.margemInternaLateralVersoCm !== undefined
                                ? `${template.margemInternaLateralVersoCm.toFixed(1)} cm`
                                : 'Padrão'}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0.4}
                            max={4.0}
                            step={0.1}
                            value={template.margemInternaLateralVersoCm ?? 0.8}
                            onChange={(e) =>
                              setTemplate((prev) => ({
                                ...prev,
                                margemInternaLateralVersoCm: Number(e.target.value),
                              }))
                            }
                            className="w-full accent-blue-800"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-0.5">
                            <span>Interna Vertical</span>
                            <span className="font-mono text-blue-900">
                              {template.margemInternaVerticalVersoCm !== undefined
                                ? `${template.margemInternaVerticalVersoCm.toFixed(1)} cm`
                                : 'Padrão'}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0.2}
                            max={3.0}
                            step={0.1}
                            value={template.margemInternaVerticalVersoCm ?? 0.5}
                            onChange={(e) =>
                              setTemplate((prev) => ({
                                ...prev,
                                margemInternaVerticalVersoCm: Number(e.target.value),
                              }))
                            }
                            className="w-full accent-blue-800"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                        <Layers size={12} className="text-blue-800 shrink-0" />
                        <span>Plano de Fundo Fixo: todos os itens sobrepõem a moldura</span>
                      </span>
                      <span className="text-[10px] font-mono font-bold text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 shrink-0">
                        Camada 1
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => onSelectObject('marcaDaguaVerso')}
                        className="w-full py-2 px-3 rounded-lg bg-white border border-slate-200 hover:bg-blue-50 hover:border-blue-300 text-xs font-bold text-slate-700 hover:text-blue-900 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <ImageIcon size={13} />
                        <span>Editar / Trocar Marca d&apos;Água Central (Verso)</span>
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* CAIXAS DE TEXTO LIVRES (FRENTE E VERSO) */}
        {(selectedObject === 'caixasTexto' || selectedObject.startsWith('caixaTexto:')) &&
          (() => {
            const customBoxes = template.caixasTextoExtra || [];
            const activeBoxId = selectedObject.startsWith('caixaTexto:')
              ? selectedObject.slice('caixaTexto:'.length)
              : customBoxes[0]?.id ?? null;
            const activeBox = activeBoxId
              ? customBoxes.find((b) => b.id === activeBoxId) ?? null
              : null;

            const updateBox = (
              boxId: string,
              updater: (box: CertificateCustomTextBox) => CertificateCustomTextBox
            ) => {
              setTemplate((prev) => ({
                ...prev,
                caixasTextoExtra: (prev.caixasTextoExtra || []).map((b) =>
                  b.id === boxId ? updater(b) : b
                ),
              }));
            };

            const applyBoxInlineFormat = (marker: '**' | '*' | '***') => {
              if (!activeBox) return;
              const ta = customBoxTextareaRef.current;
              const current = activeBox.texto || '';
              if (!ta) {
                updateBox(activeBox.id, (b) => ({
                  ...b,
                  texto: `${current}${marker}texto${marker}`,
                }));
                return;
              }
              const start = ta.selectionStart ?? current.length;
              const end = ta.selectionEnd ?? current.length;
              const selected = current.slice(start, end) || 'texto';
              const nextVal =
                current.slice(0, start) + marker + selected + marker + current.slice(end);
              updateBox(activeBox.id, (b) => ({ ...b, texto: nextVal }));
              setTimeout(() => {
                ta.focus();
                ta.setSelectionRange(
                  start + marker.length,
                  start + marker.length + selected.length
                );
              }, 0);
            };

            const insertBoxLineBreak = () => {
              if (!activeBox) return;
              const ta = customBoxTextareaRef.current;
              const current = activeBox.texto || '';
              if (!ta) {
                updateBox(activeBox.id, (b) => ({ ...b, texto: `${current}\n` }));
                return;
              }
              const start = ta.selectionStart ?? current.length;
              const end = ta.selectionEnd ?? current.length;
              const nextVal = `${current.slice(0, start)}\n${current.slice(end)}`;
              updateBox(activeBox.id, (b) => ({ ...b, texto: nextVal }));
              setTimeout(() => {
                ta.focus();
                ta.setSelectionRange(start + 1, start + 1);
              }, 0);
            };

            const insertBoxPlaceholder = (token: string) => {
              if (!activeBox) return;
              const ta = customBoxTextareaRef.current;
              const current = activeBox.texto || '';
              if (!ta) {
                updateBox(activeBox.id, (b) => ({ ...b, texto: `${current}${token}` }));
                return;
              }
              const start = ta.selectionStart ?? current.length;
              const end = ta.selectionEnd ?? current.length;
              const nextVal = `${current.slice(0, start)}${token}${current.slice(end)}`;
              updateBox(activeBox.id, (b) => ({ ...b, texto: nextVal }));
              setTimeout(() => {
                ta.focus();
                const pos = start + token.length;
                ta.setSelectionRange(pos, pos);
              }, 0);
            };

            const handleDuplicateBox = (box: CertificateCustomTextBox) => {
              const newId = `tb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
              const copyBox: CertificateCustomTextBox = {
                ...box,
                id: newId,
                x: Math.min(sheetWidth - 60, box.x + 24),
                y: Math.min(sheetHeight - 40, box.y + 24),
              };
              setTemplate((prev) => ({
                ...prev,
                caixasTextoExtra: [...(prev.caixasTextoExtra || []), copyBox],
              }));
              onSelectObject(`caixaTexto:${newId}`);
            };

            const handleDeleteBox = (boxId: string) => {
              if (placingTextBoxId === boxId) {
                onTogglePlaceTextBox?.(null);
              }
              const remaining = customBoxes.filter((b) => b.id !== boxId);
              setTemplate((prev) => ({
                ...prev,
                caixasTextoExtra: (prev.caixasTextoExtra || []).filter((b) => b.id !== boxId),
              }));
              if (remaining.length > 0) {
                onSelectObject(`caixaTexto:${remaining[0].id}`);
              } else {
                onSelectObject('caixasTexto');
              }
            };

            const boxZ = activeBox ? Math.max(2, activeBox.camadaZIndex ?? 20) : 20;

            return (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                      Caixas de Texto no Modelo ({customBoxes.length})
                    </span>
                    {onAddCustomTextBox && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onAddCustomTextBox('front')}
                          className="px-2.5 py-1 rounded-lg bg-blue-900 hover:bg-blue-950 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Plus size={11} />
                          <span>Nova na Frente</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onAddCustomTextBox('back')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Plus size={11} />
                          <span>Novo no Verso</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {customBoxes.length === 0 ? (
                    <div className="p-3 rounded-lg bg-white border border-dashed border-slate-300 text-center space-y-1.5">
                      <p className="text-xs font-semibold text-slate-600">
                        Nenhuma caixa de texto inserida ainda.
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Adicione uma caixa na Frente ou no Verso para escrever e posicionar livremente em qualquer ponto da folha.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {customBoxes.map((b, idx) => {
                        const isCurrent = activeBox?.id === b.id;
                        const snippet = (b.texto || '').replace(/\s+/g, ' ').trim();
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => onSelectObject(`caixaTexto:${b.id}`)}
                            className={cn(
                              'px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all',
                              isCurrent
                                ? 'bg-blue-900 text-white border-blue-950 shadow-2xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50 hover:border-blue-300'
                            )}
                          >
                            <span
                              className={cn(
                                'px-1 py-0.2 rounded text-[9px] font-black uppercase',
                                isCurrent
                                  ? 'bg-white/20 text-white'
                                  : b.lado === 'back'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-blue-100 text-blue-800'
                              )}
                            >
                              {b.lado === 'back' ? 'Verso' : 'Frente'}
                            </span>
                            <span className="max-w-[140px] truncate">
                              {snippet ? `${idx + 1}. ${snippet}` : `Caixa ${idx + 1}`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {activeBox && (
                  <>
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-slate-700">Folha:</span>
                          {(['front', 'back'] as const).map((sideOpt) => (
                            <button
                              key={sideOpt}
                              type="button"
                              onClick={() =>
                                updateBox(activeBox.id, (b) => ({ ...b, lado: sideOpt }))
                              }
                              className={cn(
                                'px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer transition-all',
                                activeBox.lado === sideOpt
                                  ? 'bg-blue-900 text-white border-blue-950'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                              )}
                            >
                              {sideOpt === 'front' ? 'Frente' : 'Verso'}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDuplicateBox(activeBox)}
                            className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 flex items-center gap-1 cursor-pointer"
                            title="Duplicar caixa de texto"
                          >
                            <Copy size={11} />
                            <span>Duplicar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBox(activeBox.id)}
                            className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-[10px] font-bold text-rose-700 flex items-center gap-1 cursor-pointer"
                            title="Excluir esta caixa de texto"
                          >
                            <Trash2 size={11} />
                            <span>Excluir</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => applyBoxInlineFormat('**')}
                          className="px-2 py-1 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Bold size={11} />
                          <span>Negrito trecho</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => applyBoxInlineFormat('*')}
                          className="px-2 py-1 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Italic size={11} />
                          <span>Itálico trecho</span>
                        </button>
                        <button
                          type="button"
                          onClick={insertBoxLineBreak}
                          className="px-2 py-1 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 flex items-center gap-1 cursor-pointer"
                          title="Inserir quebra de linha (Enter)"
                        >
                          <CornerDownLeft size={11} />
                          <span>Quebra de linha</span>
                        </button>
                      </div>

                      <textarea
                        ref={customBoxTextareaRef}
                        rows={4}
                        value={activeBox.texto}
                        onChange={(e) =>
                          updateBox(activeBox.id, (b) => ({ ...b, texto: e.target.value }))
                        }
                        placeholder="Digite o texto desta caixa (Enter para quebrar linha)..."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />

                      <div className="flex flex-wrap gap-1">
                        {[
                          { label: 'Aluno', token: '{{ALUNO}}' },
                          { label: 'Curso', token: '{{CURSO}}' },
                          { label: 'Carga H.', token: '{{CARGA_HORARIA}}' },
                          { label: 'Média', token: '{{MEDIA_FINAL}}' },
                          { label: 'Início', token: '{{DATA_INICIO}}' },
                          { label: 'Término', token: '{{DATA_FIM}}' },
                        ].map((p) => (
                          <button
                            key={p.token}
                            type="button"
                            onClick={() => insertBoxPlaceholder(p.token)}
                            className="px-2 py-0.5 rounded bg-white hover:bg-blue-50 text-blue-900 text-[10px] font-bold border border-slate-200 hover:border-blue-300 cursor-pointer"
                          >
                            + {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                      <span className="block text-[11px] font-black uppercase tracking-wider text-slate-700">
                        Tipografia e Cor
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Fonte
                          </label>
                          <select
                            value={normalizeFrontFont(activeBox.fonte)}
                            onChange={(e) =>
                              updateBox(activeBox.id, (b) => ({
                                ...b,
                                fonte: e.target.value as CertificateFontKey,
                              }))
                            }
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                          >
                            {FONT_OPTIONS_FRONT.map((f) => (
                              <option key={f.value} value={f.value}>
                                {f.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Cor do Texto
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={activeBox.cor || '#0f172a'}
                              onChange={(e) =>
                                updateBox(activeBox.id, (b) => ({ ...b, cor: e.target.value }))
                              }
                              className="w-8 h-8 rounded border border-slate-200 cursor-pointer bg-white p-0.5"
                            />
                            {['#0f172a', '#071b3b', '#475569', '#92400e', '#ffffff'].map(
                              (swatch) => (
                                <button
                                  key={swatch}
                                  type="button"
                                  onClick={() =>
                                    updateBox(activeBox.id, (b) => ({ ...b, cor: swatch }))
                                  }
                                  style={{ backgroundColor: swatch }}
                                  className={cn(
                                    'w-6 h-6 rounded-md border cursor-pointer',
                                    (activeBox.cor || '#0f172a').toLowerCase() === swatch
                                      ? 'border-blue-600 ring-2 ring-blue-500/30'
                                      : 'border-slate-300'
                                  )}
                                  title={swatch}
                                />
                              )
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-1">
                            <span>Tamanho</span>
                            <span className="font-mono text-blue-900">
                              {activeBox.tamanhoFontePx}px ({pxToPtNumber(activeBox.tamanhoFontePx)}pt)
                            </span>
                          </div>
                          <input
                            type="range"
                            min={6}
                            max={64}
                            step={0.5}
                            value={activeBox.tamanhoFontePx}
                            onChange={(e) =>
                              updateBox(activeBox.id, (b) => ({
                                ...b,
                                tamanhoFontePx: Number(e.target.value),
                              }))
                            }
                            className="w-full accent-blue-800"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-1">
                            <span>Entrelinha</span>
                            <span className="font-mono text-blue-900">
                              {(activeBox.entrelinha ?? 1.35).toFixed(2)}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={1.0}
                            max={2.2}
                            step={0.05}
                            value={activeBox.entrelinha ?? 1.35}
                            onChange={(e) =>
                              updateBox(activeBox.id, (b) => ({
                                ...b,
                                entrelinha: Number(e.target.value),
                              }))
                            }
                            className="w-full accent-blue-800"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              updateBox(activeBox.id, (b) => ({ ...b, negrito: !b.negrito }))
                            }
                            className={cn(
                              'px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 cursor-pointer',
                              activeBox.negrito
                                ? 'bg-blue-900 text-white border-blue-950'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            )}
                          >
                            <Bold size={11} />
                            <span>Negrito</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateBox(activeBox.id, (b) => ({ ...b, italico: !b.italico }))
                            }
                            className={cn(
                              'px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 cursor-pointer',
                              activeBox.italico
                                ? 'bg-blue-900 text-white border-blue-950'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            )}
                          >
                            <Italic size={11} />
                            <span>Itálico</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateBox(activeBox.id, (b) => ({ ...b, maiusculo: !b.maiusculo }))
                            }
                            className={cn(
                              'px-2.5 py-1 rounded-lg border text-[11px] font-bold cursor-pointer',
                              activeBox.maiusculo
                                ? 'bg-blue-900 text-white border-blue-950'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            )}
                          >
                            AA
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          {(
                            [
                              { id: 'left', icon: AlignLeft, label: 'Esquerda' },
                              { id: 'center', icon: AlignCenter, label: 'Centro' },
                              { id: 'right', icon: AlignRight, label: 'Direita' },
                              { id: 'justify', icon: AlignJustify, label: 'Justificado' },
                            ] as const
                          ).map((al) => {
                            const Icon = al.icon;
                            const active = (activeBox.alinhamento || 'left') === al.id;
                            return (
                              <button
                                key={al.id}
                                type="button"
                                onClick={() =>
                                  updateBox(activeBox.id, (b) => ({ ...b, alinhamento: al.id }))
                                }
                                title={al.label}
                                className={cn(
                                  'p-1.5 rounded-lg border cursor-pointer',
                                  active
                                    ? 'bg-blue-900 text-white border-blue-950'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                )}
                              >
                                <Icon size={12} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                          Posição Livre e Largura
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {onTogglePlaceTextBox && (
                            <button
                              type="button"
                              onClick={() =>
                                onTogglePlaceTextBox(
                                  placingTextBoxId === activeBox.id ? null : activeBox.id
                                )
                              }
                              className={cn(
                                'px-2.5 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all',
                                placingTextBoxId === activeBox.id
                                  ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                                  : 'bg-white text-blue-900 border-blue-200 hover:bg-blue-50'
                              )}
                            >
                              <Crosshair size={11} />
                              <span>
                                {placingTextBoxId === activeBox.id
                                  ? 'Clique na folha...'
                                  : 'Clicar na folha'}
                              </span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              updateBox(activeBox.id, (b) => ({
                                ...b,
                                x: Math.round((sheetWidth - (b.larguraPx || 280)) / 2),
                              }))
                            }
                            className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 cursor-pointer"
                          >
                            Centralizar X
                          </button>
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-500 leading-snug">
                        Você também pode clicar e arrastar esta caixa diretamente sobre a folha (inclusive sobre a moldura).
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                            <span>Horizontal (X)</span>
                            <span className="font-mono text-slate-800">{activeBox.x}px</span>
                          </div>
                          <input
                            type="range"
                            min={-40}
                            max={sheetWidth - 40}
                            step={2}
                            value={activeBox.x}
                            onChange={(e) =>
                              updateBox(activeBox.id, (b) => ({
                                ...b,
                                x: Number(e.target.value),
                              }))
                            }
                            className="w-full accent-blue-800"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                            <span>Vertical (Y)</span>
                            <span className="font-mono text-slate-800">{activeBox.y}px</span>
                          </div>
                          <input
                            type="range"
                            min={-20}
                            max={sheetHeight - 20}
                            step={2}
                            value={activeBox.y}
                            onChange={(e) =>
                              updateBox(activeBox.id, (b) => ({
                                ...b,
                                y: Number(e.target.value),
                              }))
                            }
                            className="w-full accent-blue-800"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                            <span>Largura</span>
                            <span className="font-mono text-slate-800">
                              {activeBox.larguraPx || 280}px
                            </span>
                          </div>
                          <input
                            type="range"
                            min={80}
                            max={sheetWidth}
                            step={5}
                            value={activeBox.larguraPx || 280}
                            onChange={(e) =>
                              updateBox(activeBox.id, (b) => ({
                                ...b,
                                larguraPx: Number(e.target.value),
                              }))
                            }
                            className="w-full accent-blue-800"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2.5">
                      <span className="block text-[11px] font-bold text-slate-700">
                        Fundo, Borda e Camada
                      </span>
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={
                              !activeBox.corFundo || activeBox.corFundo === 'transparent'
                            }
                            onChange={(e) =>
                              updateBox(activeBox.id, (b) => ({
                                ...b,
                                corFundo: e.target.checked ? 'transparent' : '#ffffff',
                              }))
                            }
                            className="accent-blue-800"
                          />
                          <span>Fundo transparente</span>
                        </label>
                        {activeBox.corFundo && activeBox.corFundo !== 'transparent' && (
                          <input
                            type="color"
                            value={activeBox.corFundo}
                            onChange={(e) =>
                              updateBox(activeBox.id, (b) => ({ ...b, corFundo: e.target.value }))
                            }
                            className="w-7 h-7 rounded border border-slate-200 cursor-pointer bg-white p-0.5"
                          />
                        )}

                        <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(activeBox.mostrarBorda)}
                            onChange={(e) =>
                              updateBox(activeBox.id, (b) => ({
                                ...b,
                                mostrarBorda: e.target.checked,
                              }))
                            }
                            className="accent-blue-800"
                          />
                          <span>Exibir borda</span>
                        </label>
                        {activeBox.mostrarBorda && (
                          <input
                            type="color"
                            value={activeBox.corBorda || '#1e3a8a'}
                            onChange={(e) =>
                              updateBox(activeBox.id, (b) => ({ ...b, corBorda: e.target.value }))
                            }
                            className="w-7 h-7 rounded border border-slate-200 cursor-pointer bg-white p-0.5"
                          />
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                          <Layers size={12} className="text-blue-800" />
                          <span>Camada: {boxZ}</span>
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              updateBox(activeBox.id, (b) => ({
                                ...b,
                                camadaZIndex: Math.max(2, (b.camadaZIndex ?? 20) - 1),
                              }))
                            }
                            className="px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 cursor-pointer flex items-center gap-0.5"
                          >
                            <ArrowDown size={11} />
                            <span>Recuar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateBox(activeBox.id, (b) => ({
                                ...b,
                                camadaZIndex: Math.min(40, (b.camadaZIndex ?? 20) + 1),
                              }))
                            }
                            className="px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 cursor-pointer flex items-center gap-0.5"
                          >
                            <ArrowUp size={11} />
                            <span>Avançar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateBox(activeBox.id, (b) => ({
                                ...b,
                                camadaZIndex: 35,
                              }))
                            }
                            className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[10px] font-bold text-blue-900 cursor-pointer flex items-center gap-0.5"
                          >
                            <ChevronsUp size={11} />
                            <span>Frente</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })()}

        {/* CONFIGURAÇÕES GERAIS DO MODELO */}
        {selectedObject === 'modeloGeral' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div>
                <span className="block text-[11px] font-black uppercase tracking-wider text-slate-800">
                  Acessar Elementos Rápidos / Ocultos
                </span>
                <p className="text-[10px] text-slate-500">
                  Clique em qualquer item da Frente ou do Verso para abrir seus controles concentrados ao lado da folha.
                </p>
              </div>
              {renderQuickElementsGrid(false)}
            </div>

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

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Orientação da Folha A4
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    id: 'landscape' as const,
                    label: 'Paisagem (Horizontal)',
                    dims: '29,7 × 21 cm',
                  },
                  {
                    id: 'portrait' as const,
                    label: 'Retrato (Vertical)',
                    dims: '21 × 29,7 cm',
                  },
                ].map((opt) => {
                  const isActive = (template.orientacao || 'landscape') === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        setTemplate((prev) => ({
                          ...prev,
                          orientacao: opt.id,
                        }))
                      }
                      className={cn(
                        'p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5',
                        isActive
                          ? 'bg-blue-900 text-white border-blue-950 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          'shrink-0 border-2 rounded-[3px]',
                          opt.id === 'landscape' ? 'w-5 h-3.5' : 'w-3.5 h-5',
                          isActive ? 'border-white bg-white/15' : 'border-slate-500 bg-white'
                        )}
                      />
                      <span className="min-w-0">
                        <span className="block text-[11px] font-bold leading-tight">
                          {opt.label}
                        </span>
                        <span
                          className={cn(
                            'block text-[10px] leading-tight mt-0.5',
                            isActive ? 'text-blue-200' : 'text-slate-500'
                          )}
                        >
                          {opt.dims}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-blue-950 flex items-center gap-1.5">
                  <Sparkles size={13} />
                  <span>
                    Layout Formal (A4{' '}
                    {template.orientacao === 'portrait' ? 'Retrato' : 'Paisagem'} — Respiro Visual)
                  </span>
                </span>
              </div>
              <p className="text-[10px] text-slate-600 leading-snug">
                {template.orientacao === 'portrait'
                  ? 'Aplica margens proporcionais ao modo Retrato (1,5 cm externa / 1,8 cm lateral), bloco de texto centralizado em 84%, hierarquia tipográfica equilibrada e assinaturas simétricas.'
                  : 'Aplica margens amplas (1,7 cm externa / 2,5 cm interna), bloco de texto centralizado em 70%, hierarquia tipográfica (título 34pt, nome em destaque 28pt, corpo 13pt entrelinha 1,4) e assinaturas simétricas (10pt/9pt).'}
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
                  Redefinir todos os deslocamentos (X/Y) de brasões, textos, data e assinaturas (Frente e Verso):
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
                      logoEsquerdaVersoOffsetX: 0,
                      logoEsquerdaVersoOffsetY: 0,
                      logoCentroVersoOffsetX: 0,
                      logoCentroVersoOffsetY: 0,
                      logoDireitaVersoOffsetX: 0,
                      logoDireitaVersoOffsetY: 0,
                      tituloOffsetX: 0,
                      tituloOffsetY: 0,
                      versoTituloOffsetX: 0,
                      versoTituloOffsetY: 0,
                      textoOffsetX: 0,
                      textoOffsetY: 0,
                      dataOffsetX: 0,
                      dataOffsetY: 0,
                      marcaDaguaFrenteOffsetX: 0,
                      marcaDaguaFrenteOffsetY: 0,
                      marcaDaguaVersoOffsetX: 0,
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
          </div>
        )}
      </div>
    </div>
  );
}
