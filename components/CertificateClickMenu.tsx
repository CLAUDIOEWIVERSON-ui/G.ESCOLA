'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bold,
  Check,
  Copy,
  CornerDownLeft,
  EyeOff,
  FolderOpen,
  GripHorizontal,
  Image as ImageIcon,
  Italic,
  Layers,
  Minus,
  Move,
  Pencil,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Type,
  Upload,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CertificateCustomImageBox,
  CertificateCustomTextBox,
  CertificateFontKey,
  CertificateLayerKey,
  CertificateSelectableObject,
  CertificateTemplateConfig,
  getCertificateElementZIndex,
  getCertificateSheetDimensions,
  pxToPtNumber,
  updateCertificateLayerOrder,
} from '@/lib/certificateTypes';
import {
  CertificateAssetCategory,
  CertificateAssetTarget,
  CertificateLibraryAsset,
  prepareUploadedAssetDataUrl,
} from '@/lib/certificateLibrary';
import { CertificateSheetClickContext } from '@/components/CertificateSheet';

const FONT_OPTIONS_FRONT: { value: CertificateFontKey; label: string }[] = [
  { value: 'garamond', label: 'Garamond' },
  { value: 'times', label: 'Times New Roman' },
  { value: 'georgia', label: 'Georgia Clássica' },
  { value: 'palatino', label: 'Palatino' },
  { value: 'lora', label: 'Lora Editorial' },
  { value: 'cinzel', label: 'Cinzel Romana' },
  { value: 'script', label: 'Caligráfica Formal' },
  { value: 'sans', label: 'Arial Limpa (Sans)' },
];

const FONT_OPTIONS_BACK: { value: CertificateFontKey; label: string }[] = [
  { value: 'sans', label: 'Arial / Sans' },
  { value: 'garamond', label: 'Garamond' },
  { value: 'times', label: 'Times New Roman' },
  { value: 'georgia', label: 'Georgia Clássica' },
  { value: 'palatino', label: 'Palatino' },
  { value: 'lora', label: 'Lora' },
  { value: 'cinzel', label: 'Cinzel' },
  { value: 'script', label: 'Caligráfica Formal' },
];

const DEFAULT_FRONT_WM =
  '/assets/aistudio/WhatsApp_Image_2026-02-11_at_22.02.18_8edf921e.jpeg';
const DEFAULT_BACK_WM = '/assets/aistudio/imagem_01_2da3aec8.png';
const DEFAULT_FRAME_URL = '/assets/certificado-moldura-frente.png';

interface CertificateClickMenuProps {
  clickContext: CertificateSheetClickContext;
  template: CertificateTemplateConfig;
  setTemplate: React.Dispatch<React.SetStateAction<CertificateTemplateConfig>>;
  onClose: () => void;
  onSelectObject: (obj: CertificateSelectableObject) => void;
  onInsertCustomTextBoxAt: (
    side: 'front' | 'back',
    relX: number,
    relY: number,
    preset?: Partial<CertificateCustomTextBox>
  ) => string;
  onInsertCustomImageBoxAt?: (
    side: 'front' | 'back',
    relX: number,
    relY: number,
    preset?: Partial<CertificateCustomImageBox>
  ) => string;
  activeBodyTextValue: string;
  updateActiveBodyText: (updater: string | ((current: string) => string)) => void;
  isEditingIndividualBody: boolean;
  libraryAssets?: CertificateLibraryAsset[];
  onApplyLibraryAsset?: (
    asset: CertificateLibraryAsset,
    target: CertificateAssetTarget
  ) => void;
}

const FONT_PT_PRESETS = [12, 14, 16, 18, 20, 22, 24, 26, 28, 32, 36, 40, 44, 48, 56, 64, 72];

function getTargetLabel(
  obj: CertificateSelectableObject,
  side: 'front' | 'back',
  clickedEmptyArea?: boolean
): string {
  if (clickedEmptyArea) {
    return side === 'front' ? 'Folha da Frente' : 'Folha do Verso';
  }
  if (obj.startsWith('caixaTexto:')) return 'Caixa de Texto Livre';
  if (obj.startsWith('imagemExtra:')) return 'Imagem / Brasão Extra';
  switch (obj) {
    case 'brasaoEsquerdo':
      return 'Brasão Esquerdo (Frente)';
    case 'brasaoCentro':
      return 'Brasão Central (Frente)';
    case 'brasaoDireito':
      return 'Brasão Direito (Frente)';
    case 'brasaoEsquerdoVerso':
      return 'Brasão Esquerdo (Verso)';
    case 'brasaoCentroVerso':
      return 'Brasão Central (Verso)';
    case 'brasaoDireitoVerso':
      return 'Brasão Direito (Verso)';
    case 'titulo':
      return 'Título Principal';
    case 'texto':
      return 'Texto do Certificado';
    case 'data':
      return 'Local e Data';
    case 'assinaturaPrincipal':
      return 'Assinatura Principal';
    case 'segundaAssinatura':
      return '2ª Assinatura';
    case 'marcaDaguaFrente':
      return "Marca d'Água (Frente)";
    case 'molduraFrente':
      return 'Moldura (Frente)';
    case 'versoTitulo':
      return 'Título do Curso (Verso)';
    case 'versoTabela':
      return 'Quadro de Disciplinas';
    case 'marcaDaguaVerso':
      return "Marca d'Água (Verso)";
    case 'versoMoldura':
      return 'Moldura (Verso)';
    default:
      return side === 'front' ? 'Frente do Certificado' : 'Verso do Certificado';
  }
}

export function CertificateClickMenu({
  clickContext,
  template,
  setTemplate,
  onClose,
  onSelectObject,
  onInsertCustomTextBoxAt,
  onInsertCustomImageBoxAt,
  activeBodyTextValue,
  updateActiveBodyText,
  isEditingIndividualBody,
  libraryAssets = [],
  onApplyLibraryAsset,
}: CertificateClickMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const customBoxRef = useRef<HTMLTextAreaElement | null>(null);

  const [activeTarget, setActiveTarget] = useState<CertificateSelectableObject>(
    clickContext.targetObject
  );
  const [menuTab, setMenuTab] = useState<'props' | 'items'>(
    clickContext.clickedEmptyArea ? 'items' : 'props'
  );
  const [showInlineLibrary, setShowInlineLibrary] = useState(false);
  const [coords, setCoords] = useState<{ left: number; top: number }>({
    left: clickContext.clientX,
    top: clickContext.clientY,
  });
  const [isDraggingWindow, setIsDraggingWindow] = useState(false);
  const hasUserDraggedRef = useRef(false);
  const windowDragRef = useRef<{
    startClientX: number;
    startClientY: number;
    origLeft: number;
    origTop: number;
  } | null>(null);

  useEffect(() => {
    setActiveTarget(clickContext.targetObject);
    setMenuTab(clickContext.clickedEmptyArea ? 'items' : 'props');
    setShowInlineLibrary(false);
  }, [clickContext]);

  useEffect(() => {
    setShowInlineLibrary(false);
  }, [activeTarget]);

  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el || typeof window === 'undefined') return;
    const rect = el.getBoundingClientRect();
    const menuW = rect.width || 356;
    const menuH = rect.height || 420;
    const pad = 12;

    if (hasUserDraggedRef.current) {
      setCoords((prev) => ({
        left: Math.max(8, Math.min(Math.max(8, window.innerWidth - menuW - 8), prev.left)),
        top: Math.max(8, Math.min(Math.max(8, window.innerHeight - 60), prev.top)),
      }));
      return;
    }

    let left = clickContext.clientX + 10;
    let top = clickContext.clientY + 10;

    if (left + menuW > window.innerWidth - pad) {
      left = Math.max(pad, clickContext.clientX - menuW - 10);
    }
    if (top + menuH > window.innerHeight - pad) {
      top = Math.max(pad, window.innerHeight - menuH - pad);
    }
    left = Math.max(pad, Math.min(window.innerWidth - menuW - pad, left));
    top = Math.max(pad, Math.min(window.innerHeight - menuH - pad, top));
    setCoords({ left, top });
  }, [clickContext, menuTab, activeTarget, showInlineLibrary]);

  useEffect(() => {
    if (!isDraggingWindow) return;

    const handleWindowPointerMove = (e: PointerEvent) => {
      if (!windowDragRef.current) return;
      const el = menuRef.current;
      const menuW = el?.getBoundingClientRect().width || 356;
      const dx = e.clientX - windowDragRef.current.startClientX;
      const dy = e.clientY - windowDragRef.current.startClientY;
      const nextLeft = Math.max(
        8,
        Math.min(
          Math.max(8, window.innerWidth - menuW - 8),
          Math.round(windowDragRef.current.origLeft + dx)
        )
      );
      const nextTop = Math.max(
        8,
        Math.min(
          Math.max(8, window.innerHeight - 60),
          Math.round(windowDragRef.current.origTop + dy)
        )
      );
      setCoords({ left: nextLeft, top: nextTop });
    };

    const handleWindowPointerEnd = () => {
      windowDragRef.current = null;
      setIsDraggingWindow(false);
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerEnd);
    window.addEventListener('pointercancel', handleWindowPointerEnd);
    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerEnd);
      window.removeEventListener('pointercancel', handleWindowPointerEnd);
    };
  }, [isDraggingWindow]);

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      const targetEl = e.target as HTMLElement | null;
      if (menuRef.current && !menuRef.current.contains(targetEl)) {
        if (targetEl?.closest('[data-certificate-side]')) {
          return;
        }
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [onClose]);

  const { width: sheetWidth, height: sheetHeight } = getCertificateSheetDimensions(
    template.orientacao
  );
  const side = clickContext.side;
  const normalizeFrontFont = (font?: CertificateFontKey) =>
    !font || font === 'serif-italic' ? 'garamond' : font;

  const customBoxes = template.caixasTextoExtra || [];
  const activeCustomBox = activeTarget.startsWith('caixaTexto:')
    ? customBoxes.find((b) => b.id === activeTarget.slice('caixaTexto:'.length)) ?? null
    : null;

  const updateCustomBox = (
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

  const customImages = template.imagensExtra || [];
  const activeCustomImage = activeTarget.startsWith('imagemExtra:')
    ? customImages.find((img) => img.id === activeTarget.slice('imagemExtra:'.length)) ?? null
    : null;

  const updateCustomImage = (
    imgId: string,
    updater: (img: CertificateCustomImageBox) => CertificateCustomImageBox
  ) => {
    setTemplate((prev) => ({
      ...prev,
      imagensExtra: (prev.imagensExtra || []).map((img) =>
        img.id === imgId ? updater(img) : img
      ),
    }));
  };

  const insertImageAtClick = (preset?: Partial<CertificateCustomImageBox>): string => {
    if (onInsertCustomImageBoxAt) {
      return onInsertCustomImageBoxAt(side, clickContext.relX, clickContext.relY, preset);
    }
    const imgId = `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const tamanhoPx = preset?.tamanhoPx ?? 90;
    const nextX = Math.max(-40, Math.min(sheetWidth - 40, Math.round(clickContext.relX - tamanhoPx / 2)));
    const nextY = Math.max(-40, Math.min(sheetHeight - 40, Math.round(clickContext.relY - tamanhoPx / 2)));
    setTemplate((prev) => {
      const existing = prev.imagensExtra || [];
      const newImg: CertificateCustomImageBox = {
        id: imgId,
        lado: side,
        titulo: 'Imagem Extra',
        url: '/assets/aistudio/imagem_01_2da3aec8.png',
        x: nextX,
        y: nextY,
        tamanhoPx,
        larguraPct: 100,
        alturaPct: 100,
        opacidade: 1,
        camadaZIndex: 18 + existing.length,
        legenda: '',
        mostrarLegenda: false,
        ...preset,
      };
      return { ...prev, imagensExtra: [...existing, newImg] };
    });
    return imgId;
  };

  const insertAtTextareaCursor = (
    ta: HTMLTextAreaElement | null,
    currentVal: string,
    snippet: string,
    onCommit: (nextVal: string) => void
  ) => {
    if (!ta) {
      onCommit(`${currentVal}${snippet}`);
      return;
    }
    const start = ta.selectionStart ?? currentVal.length;
    const end = ta.selectionEnd ?? currentVal.length;
    const nextVal = `${currentVal.slice(0, start)}${snippet}${currentVal.slice(end)}`;
    onCommit(nextVal);
    setTimeout(() => {
      ta.focus();
      const pos = start + snippet.length;
      ta.setSelectionRange(pos, pos);
    }, 0);
  };

  const wrapTextareaSelection = (
    ta: HTMLTextAreaElement | null,
    currentVal: string,
    marker: '**' | '*',
    onCommit: (nextVal: string) => void
  ) => {
    if (!ta) {
      onCommit(`${currentVal}${marker}texto${marker}`);
      return;
    }
    const start = ta.selectionStart ?? currentVal.length;
    const end = ta.selectionEnd ?? currentVal.length;
    const selected = currentVal.slice(start, end) || 'texto';
    const nextVal = `${currentVal.slice(0, start)}${marker}${selected}${marker}${currentVal.slice(
      end
    )}`;
    onCommit(nextVal);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + marker.length, start + marker.length + selected.length);
    }, 0);
  };

  const renderLayerStepper = (layerKey: CertificateLayerKey) => {
    const z = getCertificateElementZIndex(template, layerKey);
    return (
      <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-100">
        <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
          <Layers size={11} className="text-blue-800" />
          <span>Camada: {z}</span>
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() =>
              setTemplate((prev) => ({
                ...prev,
                camadasZIndex: updateCertificateLayerOrder(
                  prev.camadasZIndex,
                  layerKey,
                  'backward'
                ),
              }))
            }
            className="px-2 py-0.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 cursor-pointer flex items-center gap-0.5"
          >
            <ArrowDown size={10} />
            <span>Recuar</span>
          </button>
          <button
            type="button"
            onClick={() =>
              setTemplate((prev) => ({
                ...prev,
                camadasZIndex: updateCertificateLayerOrder(
                  prev.camadasZIndex,
                  layerKey,
                  'forward'
                ),
              }))
            }
            className="px-2 py-0.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 cursor-pointer flex items-center gap-0.5"
          >
            <ArrowUp size={10} />
            <span>Avançar</span>
          </button>
        </div>
      </div>
    );
  };

  const frontFrameStyle =
    template.estiloMolduraFrente ??
    (template.usarMolduraOriginal !== false ? 'original' : 'vetorial');
  const backFrameStyle = template.estiloMolduraVerso ?? 'classica';

  const sideToggleItems: {
    id: CertificateSelectableObject;
    label: string;
    isVisible: boolean;
    onInsert: () => void;
    onInsertNew?: () => void;
    onRemove: () => void;
  }[] =
    side === 'front'
      ? [
          {
            id: 'brasaoEsquerdo',
            label: 'Brasão Esquerdo',
            isVisible: template.mostrarLogoEsquerda !== false,
            onInsert: () =>
              setTemplate((prev) => ({ ...prev, mostrarLogoEsquerda: true })),
            onInsertNew: () => {
              const newId = insertImageAtClick({
                titulo: 'Brasão Extra',
                url: template.logoEsquerdaUrl || '/assets/aistudio/imagem_01_2da3aec8.png',
                tamanhoPx: template.tamanhoLogoEsquerda ?? 90,
                opacidade: template.opacidadeLogoEsquerda ?? 1,
              });
              const newKey = `imagemExtra:${newId}` as CertificateSelectableObject;
              setActiveTarget(newKey);
              onSelectObject(newKey);
              setMenuTab('props');
            },
            onRemove: () =>
              setTemplate((prev) => ({ ...prev, mostrarLogoEsquerda: false })),
          },
          {
            id: 'brasaoCentro',
            label: 'Brasão Central',
            isVisible: template.mostrarLogoCentro === true,
            onInsert: () =>
              setTemplate((prev) => ({ ...prev, mostrarLogoCentro: true })),
            onInsertNew: () => {
              const newId = insertImageAtClick({
                titulo: 'Brasão Central Extra',
                url: template.logoCentroUrl || '/assets/aistudio/imagem_01_2da3aec8.png',
                tamanhoPx: template.tamanhoLogoCentro ?? 84,
                opacidade: template.opacidadeLogoCentro ?? 1,
                legenda: template.logoCentroTexto || '',
                mostrarLegenda: Boolean(template.mostrarLegendaLogoCentro),
              });
              const newKey = `imagemExtra:${newId}` as CertificateSelectableObject;
              setActiveTarget(newKey);
              onSelectObject(newKey);
              setMenuTab('props');
            },
            onRemove: () =>
              setTemplate((prev) => ({ ...prev, mostrarLogoCentro: false })),
          },
          {
            id: 'brasaoDireito',
            label: 'Brasão Direito',
            isVisible: template.mostrarLogoDireita !== false,
            onInsert: () =>
              setTemplate((prev) => ({
                ...prev,
                mostrarLogoDireita: true,
                usarBrasaoPadraoDireita:
                  prev.logoDireitaUrl?.trim() ? prev.usarBrasaoPadraoDireita : true,
              })),
            onInsertNew: () => {
              const newId = insertImageAtClick({
                titulo: 'Brasão Direito Extra',
                url: template.logoDireitaUrl?.trim()
                  ? template.logoDireitaUrl
                  : '__DEFAULT_MARINHA_CREST__',
                tamanhoPx: template.tamanhoLogoDireita ?? 74,
                opacidade: template.opacidadeLogoDireita ?? 1,
                legenda: template.logoDireitaTexto || 'MARINHA DO BRASIL',
                mostrarLegenda: template.mostrarLegendaLogoDireita !== false,
              });
              const newKey = `imagemExtra:${newId}` as CertificateSelectableObject;
              setActiveTarget(newKey);
              onSelectObject(newKey);
              setMenuTab('props');
            },
            onRemove: () =>
              setTemplate((prev) => ({ ...prev, mostrarLogoDireita: false })),
          },
          {
            id: 'titulo',
            label: 'Título Principal',
            isVisible: Boolean(template.titulo?.trim()),
            onInsert: () =>
              setTemplate((prev) => ({
                ...prev,
                titulo: prev.titulo?.trim() ? prev.titulo : 'CERTIFICADO',
              })),
            onInsertNew: () => {
              const newId = onInsertCustomTextBoxAt('front', clickContext.relX, clickContext.relY, {
                texto: 'NOVO TÍTULO',
                larguraPx: Math.min(540, Math.round(sheetWidth * 0.56)),
                fonte: normalizeFrontFont(template.fonteTitulo || template.fonteCorpo),
                tamanhoFontePx: Math.min(96, Math.max(16, template.tamanhoFonteTitulo ?? 36)),
                negrito: true,
                alinhamento: 'center',
              });
              const newKey = `caixaTexto:${newId}` as CertificateSelectableObject;
              setActiveTarget(newKey);
              onSelectObject(newKey);
              setMenuTab('props');
            },
            onRemove: () => setTemplate((prev) => ({ ...prev, titulo: '' })),
          },
          {
            id: 'texto',
            label: 'Texto Principal',
            isVisible: Boolean(activeBodyTextValue?.trim()),
            onInsert: () => {
              if (!activeBodyTextValue?.trim()) {
                updateActiveBodyText(
                  'Certificamos que {{ALUNO}} concluiu com aproveitamento o curso {{CURSO}}.'
                );
              }
            },
            onInsertNew: () => {
              const newId = onInsertCustomTextBoxAt('front', clickContext.relX, clickContext.relY, {
                texto: 'Novo texto do certificado',
                larguraPx: Math.min(460, Math.round(sheetWidth * 0.45)),
                fonte: normalizeFrontFont(template.fonteCorpo),
                tamanhoFontePx: Math.min(96, Math.max(12, template.tamanhoFonteCorpo || 19)),
                italico: template.textoCorpoItalico ?? false,
                alinhamento: 'left',
              });
              const newKey = `caixaTexto:${newId}` as CertificateSelectableObject;
              setActiveTarget(newKey);
              onSelectObject(newKey);
              setMenuTab('props');
            },
            onRemove: () => updateActiveBodyText(''),
          },
          {
            id: 'data',
            label: 'Local e Data',
            isVisible: Boolean(
              template.localEmissao?.trim() || template.dataEmissaoExtenso?.trim()
            ),
            onInsert: () =>
              setTemplate((prev) => ({
                ...prev,
                localEmissao: prev.localEmissao?.trim() || 'São Tomé e Príncipe',
                dataEmissaoExtenso:
                  prev.dataEmissaoExtenso?.trim() || 'Em 26 de novembro de 2026',
              })),
            onInsertNew: () => {
              const newId = onInsertCustomTextBoxAt('front', clickContext.relX, clickContext.relY, {
                texto: `${template.localEmissao || 'São Tomé e Príncipe'}, ${template.dataEmissaoExtenso || '26 de novembro de 2026'}`,
                larguraPx: 320,
                fonte: normalizeFrontFont(template.fonteCorpo),
                tamanhoFontePx: Math.min(96, Math.max(12, template.tamanhoFonteData ?? 16)),
                italico: true,
                alinhamento: 'center',
              });
              const newKey = `caixaTexto:${newId}` as CertificateSelectableObject;
              setActiveTarget(newKey);
              onSelectObject(newKey);
              setMenuTab('props');
            },
            onRemove: () =>
              setTemplate((prev) => ({
                ...prev,
                localEmissao: '',
                dataEmissaoExtenso: '',
              })),
          },
          {
            id: 'assinaturaPrincipal',
            label: 'Assinatura Principal',
            isVisible: Boolean(
              template.assinaturaNome?.trim() ||
                template.assinaturaPosto?.trim() ||
                template.assinaturaCargo?.trim()
            ),
            onInsert: () =>
              setTemplate((prev) => ({
                ...prev,
                assinaturaNome: prev.assinaturaNome?.trim() || 'Nome do Responsável',
                assinaturaCargo: prev.assinaturaCargo?.trim() || 'Diretor / Comandante',
              })),
            onInsertNew: () => {
              const newId = onInsertCustomTextBoxAt('front', clickContext.relX, clickContext.relY, {
                texto: '______________________________\n**Nome do Responsável**\nCargo / Função',
                larguraPx: 300,
                fonte: normalizeFrontFont(template.fonteAssinatura || template.fonteCorpo),
                tamanhoFontePx: Math.min(96, Math.max(12, template.tamanhoFonteAssinaturaNome ?? 14)),
                alinhamento: 'center',
              });
              const newKey = `caixaTexto:${newId}` as CertificateSelectableObject;
              setActiveTarget(newKey);
              onSelectObject(newKey);
              setMenuTab('props');
            },
            onRemove: () =>
              setTemplate((prev) => ({
                ...prev,
                assinaturaNome: '',
                assinaturaPosto: '',
                assinaturaCargo: '',
              })),
          },
          {
            id: 'segundaAssinatura',
            label: '2ª Assinatura',
            isVisible: Boolean(template.mostrarSegundaAssinatura),
            onInsert: () =>
              setTemplate((prev) => ({
                ...prev,
                mostrarSegundaAssinatura: true,
                segundaAssinaturaNome:
                  prev.segundaAssinaturaNome?.trim() || 'Nome do 2º Assinante',
              })),
            onInsertNew: () => {
              const newId = onInsertCustomTextBoxAt('front', clickContext.relX, clickContext.relY, {
                texto: '______________________________\n**Nome do Assinante**\nCargo / Função',
                larguraPx: 300,
                fonte: normalizeFrontFont(template.fonteAssinatura || template.fonteCorpo),
                tamanhoFontePx: Math.min(96, Math.max(12, template.tamanhoFonteAssinaturaNome ?? 14)),
                alinhamento: 'center',
              });
              const newKey = `caixaTexto:${newId}` as CertificateSelectableObject;
              setActiveTarget(newKey);
              onSelectObject(newKey);
              setMenuTab('props');
            },
            onRemove: () =>
              setTemplate((prev) => ({ ...prev, mostrarSegundaAssinatura: false })),
          },
          {
            id: 'marcaDaguaFrente',
            label: "Marca d'Água",
            isVisible: Boolean(template.marcaDaguaFrenteUrl),
            onInsert: () =>
              setTemplate((prev) => ({
                ...prev,
                marcaDaguaFrenteUrl: prev.marcaDaguaFrenteUrl || DEFAULT_FRONT_WM,
              })),
            onInsertNew: () => {
              const newId = insertImageAtClick({
                titulo: "Marca d'Água Extra",
                url: template.marcaDaguaFrenteUrl || DEFAULT_FRONT_WM,
                tamanhoPx: 220,
                opacidade: template.opacidadeMarcaDaguaFrente ?? 0.24,
                camadaZIndex: 5,
              });
              const newKey = `imagemExtra:${newId}` as CertificateSelectableObject;
              setActiveTarget(newKey);
              onSelectObject(newKey);
              setMenuTab('props');
            },
            onRemove: () =>
              setTemplate((prev) => ({ ...prev, marcaDaguaFrenteUrl: '' })),
          },
          {
            id: 'molduraFrente',
            label: 'Moldura',
            isVisible: frontFrameStyle !== 'nenhuma',
            onInsert: () =>
              setTemplate((prev) => ({
                ...prev,
                usarMolduraOriginal: true,
                estiloMolduraFrente: 'original',
                molduraFrenteUrl: prev.molduraFrenteUrl || DEFAULT_FRAME_URL,
              })),
            onRemove: () =>
              setTemplate((prev) => ({
                ...prev,
                usarMolduraOriginal: false,
                estiloMolduraFrente: 'nenhuma',
              })),
          },
        ]
      : [
          {
            id: 'brasaoEsquerdoVerso',
            label: 'Brasão Esq. (Verso)',
            isVisible:
              (template.mostrarLogoEsquerdaVerso ?? template.mostrarLogoEsquerda) !== false,
            onInsert: () =>
              setTemplate((prev) => ({ ...prev, mostrarLogoEsquerdaVerso: true })),
            onInsertNew: () => {
              const newId = insertImageAtClick({
                titulo: 'Brasão Extra (Verso)',
                url:
                  template.logoEsquerdaVersoUrl ||
                  template.logoEsquerdaUrl ||
                  '/assets/aistudio/imagem_01_2da3aec8.png',
                tamanhoPx: template.tamanhoLogoEsquerdaVerso ?? template.tamanhoLogoEsquerda ?? 90,
                opacidade: template.opacidadeLogoEsquerdaVerso ?? template.opacidadeLogoEsquerda ?? 1,
              });
              const newKey = `imagemExtra:${newId}` as CertificateSelectableObject;
              setActiveTarget(newKey);
              onSelectObject(newKey);
              setMenuTab('props');
            },
            onRemove: () =>
              setTemplate((prev) => ({ ...prev, mostrarLogoEsquerdaVerso: false })),
          },
          {
            id: 'brasaoCentroVerso',
            label: 'Brasão Centro (Verso)',
            isVisible: template.mostrarLogoCentroVerso === true,
            onInsert: () =>
              setTemplate((prev) => ({ ...prev, mostrarLogoCentroVerso: true })),
            onInsertNew: () => {
              const newId = insertImageAtClick({
                titulo: 'Brasão Centro Extra (Verso)',
                url:
                  template.logoCentroVersoUrl ||
                  template.logoCentroUrl ||
                  '/assets/aistudio/imagem_01_2da3aec8.png',
                tamanhoPx: template.tamanhoLogoCentroVerso ?? 54,
                opacidade: template.opacidadeLogoCentroVerso ?? template.opacidadeLogoCentro ?? 1,
              });
              const newKey = `imagemExtra:${newId}` as CertificateSelectableObject;
              setActiveTarget(newKey);
              onSelectObject(newKey);
              setMenuTab('props');
            },
            onRemove: () =>
              setTemplate((prev) => ({ ...prev, mostrarLogoCentroVerso: false })),
          },
          {
            id: 'brasaoDireitoVerso',
            label: 'Brasão Dir. (Verso)',
            isVisible:
              (template.mostrarLogoDireitaVerso ?? template.mostrarLogoDireita) !== false,
            onInsert: () =>
              setTemplate((prev) => ({ ...prev, mostrarLogoDireitaVerso: true })),
            onInsertNew: () => {
              const customRightUrl =
                template.logoDireitaVersoUrl?.trim() || template.logoDireitaUrl?.trim();
              const newId = insertImageAtClick({
                titulo: 'Brasão Dir. Extra (Verso)',
                url: customRightUrl || '__DEFAULT_MARINHA_CREST__',
                tamanhoPx: template.tamanhoLogoDireitaVerso ?? template.tamanhoLogoDireita ?? 74,
                opacidade: template.opacidadeLogoDireitaVerso ?? template.opacidadeLogoDireita ?? 1,
                legenda: template.logoDireitaVersoTexto ?? template.logoDireitaTexto ?? 'MARINHA DO BRASIL',
                mostrarLegenda: true,
              });
              const newKey = `imagemExtra:${newId}` as CertificateSelectableObject;
              setActiveTarget(newKey);
              onSelectObject(newKey);
              setMenuTab('props');
            },
            onRemove: () =>
              setTemplate((prev) => ({ ...prev, mostrarLogoDireitaVerso: false })),
          },
          {
            id: 'versoTitulo',
            label: 'Título do Curso (Verso)',
            isVisible: Boolean(template.versoTituloCurso?.trim()),
            onInsert: () =>
              setTemplate((prev) => ({
                ...prev,
                versoTituloCurso: prev.versoTituloCurso?.trim() || '{{CURSO}}',
              })),
            onInsertNew: () => {
              const newId = onInsertCustomTextBoxAt('back', clickContext.relX, clickContext.relY, {
                texto: 'NOVO TÍTULO (VERSO)',
                larguraPx: Math.min(520, Math.round(sheetWidth * 0.52)),
                fonte: template.fonteVersoTitulo || template.fonteVerso || 'sans',
                tamanhoFontePx: Math.min(96, Math.max(16, template.versoTamanhoFonteTitulo ?? 24)),
                negrito: true,
                maiusculo: true,
                alinhamento: 'center',
              });
              const newKey = `caixaTexto:${newId}` as CertificateSelectableObject;
              setActiveTarget(newKey);
              onSelectObject(newKey);
              setMenuTab('props');
            },
            onRemove: () =>
              setTemplate((prev) => ({ ...prev, versoTituloCurso: '' })),
          },
          {
            id: 'versoTabela',
            label: 'Quadro de Disciplinas',
            isVisible: !template.ocultarTabelaVerso,
            onInsert: () =>
              setTemplate((prev) => ({ ...prev, ocultarTabelaVerso: false })),
            onRemove: () =>
              setTemplate((prev) => ({ ...prev, ocultarTabelaVerso: true })),
          },
          {
            id: 'marcaDaguaVerso',
            label: "Marca d'Água (Verso)",
            isVisible: Boolean(template.marcaDaguaVersoUrl),
            onInsert: () =>
              setTemplate((prev) => ({
                ...prev,
                marcaDaguaVersoUrl: prev.marcaDaguaVersoUrl || DEFAULT_BACK_WM,
              })),
            onInsertNew: () => {
              const newId = insertImageAtClick({
                titulo: "Marca d'Água Extra (Verso)",
                url: template.marcaDaguaVersoUrl || DEFAULT_BACK_WM,
                tamanhoPx: 220,
                opacidade: template.opacidadeMarcaDaguaVerso ?? 0.25,
                camadaZIndex: 5,
              });
              const newKey = `imagemExtra:${newId}` as CertificateSelectableObject;
              setActiveTarget(newKey);
              onSelectObject(newKey);
              setMenuTab('props');
            },
            onRemove: () =>
              setTemplate((prev) => ({ ...prev, marcaDaguaVersoUrl: '' })),
          },
          {
            id: 'versoMoldura',
            label: 'Moldura (Verso)',
            isVisible: backFrameStyle !== 'nenhuma',
            onInsert: () =>
              setTemplate((prev) => ({
                ...prev,
                estiloMolduraVerso: 'classica',
              })),
            onRemove: () =>
              setTemplate((prev) => ({
                ...prev,
                estiloMolduraVerso: 'nenhuma',
              })),
          },
        ];

  const sideCustomBoxes = customBoxes.filter((b) => b.lado === side);
  const sideCustomImages = customImages.filter((img) => img.lado === side);

  const handleDeleteCustomBox = (boxId: string) => {
    setTemplate((prev) => ({
      ...prev,
      caixasTextoExtra: (prev.caixasTextoExtra || []).filter((b) => b.id !== boxId),
    }));
    if (activeTarget === `caixaTexto:${boxId}`) {
      setMenuTab('items');
      setActiveTarget(side === 'front' ? 'molduraFrente' : 'versoMoldura');
    }
  };

  const handleDeleteCustomImage = (imgId: string) => {
    setTemplate((prev) => ({
      ...prev,
      imagensExtra: (prev.imagensExtra || []).filter((img) => img.id !== imgId),
    }));
    if (activeTarget === `imagemExtra:${imgId}`) {
      setMenuTab('items');
      setActiveTarget(side === 'front' ? 'molduraFrente' : 'versoMoldura');
    }
  };

  const renderMoveControls = (opts: {
    x: number;
    y: number;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    onChange: (nx: number, ny: number) => void;
    onReset: () => void;
    resetLabel?: string;
  }) => {
    const clampX = (v: number) => Math.max(opts.minX, Math.min(opts.maxX, Math.round(v)));
    const clampY = (v: number) => Math.max(opts.minY, Math.min(opts.maxY, Math.round(v)));
    const step = 8;

    return (
      <div className="p-2 rounded-xl bg-white border border-slate-200 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1">
            <Move size={11} className="text-blue-800" />
            <span>Mover Posição</span>
          </span>
          <button
            type="button"
            onClick={opts.onReset}
            className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[9px] font-bold text-slate-700 flex items-center gap-1 cursor-pointer"
            title={opts.resetLabel || 'Centralizar / Zerar posição'}
          >
            <RotateCcw size={9} />
            <span>{opts.resetLabel || 'Zerar'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Compact directional pad */}
          <div className="grid grid-cols-3 gap-0.5 shrink-0">
            <div />
            <button
              type="button"
              onClick={() => opts.onChange(opts.x, clampY(opts.y - step))}
              className="w-6 h-6 rounded bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-900 flex items-center justify-center cursor-pointer"
              title="Mover para cima"
            >
              <ArrowUp size={11} />
            </button>
            <div />
            <button
              type="button"
              onClick={() => opts.onChange(clampX(opts.x - step), opts.y)}
              className="w-6 h-6 rounded bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-900 flex items-center justify-center cursor-pointer"
              title="Mover para esquerda"
            >
              <ArrowLeft size={11} />
            </button>
            <div className="w-6 h-6 rounded bg-slate-50 border border-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-400">
              XY
            </div>
            <button
              type="button"
              onClick={() => opts.onChange(clampX(opts.x + step), opts.y)}
              className="w-6 h-6 rounded bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-900 flex items-center justify-center cursor-pointer"
              title="Mover para direita"
            >
              <ArrowRight size={11} />
            </button>
            <div />
            <button
              type="button"
              onClick={() => opts.onChange(opts.x, clampY(opts.y + step))}
              className="w-6 h-6 rounded bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-900 flex items-center justify-center cursor-pointer"
              title="Mover para baixo"
            >
              <ArrowDown size={11} />
            </button>
            <div />
          </div>

          {/* Sliders for X & Y */}
          <div className="flex-1 space-y-1 min-w-0">
            <div>
              <div className="flex justify-between text-[9px] font-bold text-slate-600">
                <span>Horizontal (X)</span>
                <span className="font-mono text-blue-900">{opts.x}px</span>
              </div>
              <input
                type="range"
                min={opts.minX}
                max={opts.maxX}
                step={1}
                value={opts.x}
                onChange={(e) => opts.onChange(Number(e.target.value), opts.y)}
                className="w-full accent-blue-800 h-1.5"
              />
            </div>
            <div>
              <div className="flex justify-between text-[9px] font-bold text-slate-600">
                <span>Vertical (Y)</span>
                <span className="font-mono text-blue-900">{opts.y}px</span>
              </div>
              <input
                type="range"
                min={opts.minY}
                max={opts.maxY}
                step={1}
                value={opts.y}
                onChange={(e) => opts.onChange(opts.x, Number(e.target.value))}
                className="w-full accent-blue-800 h-1.5"
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFontSizeStepper = (
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    onChange: (next: number) => void,
    isFontSize = false
  ) => {
    const currentPt = pxToPtNumber(value);
    const closestPreset = FONT_PT_PRESETS.reduce((best, p) =>
      Math.abs(p - currentPt) < Math.abs(best - currentPt) ? p : best
    );

    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-slate-700">
          <span>{label}</span>
          <div className="flex items-center gap-1.5">
            {isFontSize && (
              <select
                value={FONT_PT_PRESETS.includes(Math.round(currentPt)) ? Math.round(currentPt) : closestPreset}
                onChange={(e) => {
                  const pt = Number(e.target.value);
                  const pxVal = Math.max(min, Math.min(max, Math.round(pt * 1.3333333 * 2) / 2));
                  onChange(pxVal);
                }}
                title="Selecionar tamanho da fonte (12 a 72 pt)"
                className="px-1.5 py-0.5 rounded border border-slate-300 bg-white text-[10px] font-bold text-blue-900 cursor-pointer"
              >
                {FONT_PT_PRESETS.map((pt) => (
                  <option key={pt} value={pt}>
                    {pt} pt
                  </option>
                ))}
              </select>
            )}
            <span className="font-mono text-blue-900">
              {value}px ({currentPt}pt)
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onChange(Math.max(min, Math.round((value - step) * 10) / 10))}
            className="w-6 h-6 rounded bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 cursor-pointer shrink-0"
            title="Diminuir"
          >
            <Minus size={11} />
          </button>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={Math.max(min, Math.min(max, value))}
            onChange={(e) => onChange(Number(e.target.value))}
            className="flex-1 accent-blue-800"
          />
          <button
            type="button"
            onClick={() => onChange(Math.min(max, Math.round((value + step) * 10) / 10))}
            className="w-6 h-6 rounded bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 cursor-pointer shrink-0"
            title="Aumentar"
          >
            <Plus size={11} />
          </button>
        </div>
      </div>
    );
  };

  const renderPropertiesBody = () => {
    // 0. Custom Extra Image Box
    if (activeCustomImage) {
      const handleUploadExtraImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        const dataUrl = await prepareUploadedAssetDataUrl(file, 'brasao');
        if (!dataUrl) return;
        updateCustomImage(activeCustomImage.id, (img) => ({ ...img, url: dataUrl }));
      };

      const matchingBrasaoAssets = libraryAssets.filter(
        (a) => a.category === 'brasao' || a.category === 'marca_dagua'
      );

      return (
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-1.5">
            {onApplyLibraryAsset && (
              <button
                type="button"
                onClick={() => setShowInlineLibrary((v) => !v)}
                className={cn(
                  'py-1.5 px-2 rounded-lg border text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors',
                  showInlineLibrary
                    ? 'bg-blue-900 text-white border-blue-950'
                    : 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-900'
                )}
              >
                <FolderOpen size={11} />
                <span>{showInlineLibrary ? 'Fechar Biblioteca' : 'Biblioteca'}</span>
              </button>
            )}
            <label
              className={cn(
                'py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer',
                !onApplyLibraryAsset && 'col-span-2'
              )}
            >
              <Upload size={11} />
              <span>Enviar Imagem</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleUploadExtraImageFile}
                className="hidden"
              />
            </label>
          </div>

          {showInlineLibrary && (
            <div className="p-2 rounded-xl bg-white border border-blue-200 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold text-blue-950">
                <span>Escolher Imagem ({matchingBrasaoAssets.length})</span>
                <button
                  type="button"
                  onClick={() =>
                    updateCustomImage(activeCustomImage.id, (img) => ({
                      ...img,
                      url: '__DEFAULT_MARINHA_CREST__',
                    }))
                  }
                  className="text-blue-700 hover:text-blue-900 underline cursor-pointer"
                >
                  Brasão Marinha
                </button>
              </div>
              {matchingBrasaoAssets.length > 0 && (
                <div className="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-0.5">
                  {matchingBrasaoAssets.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => {
                        if (asset.url) {
                          updateCustomImage(activeCustomImage.id, (img) => ({
                            ...img,
                            url: asset.url,
                            titulo: asset.name || img.titulo,
                          }));
                        }
                      }}
                      className="p-1.5 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 bg-slate-50 flex flex-col items-center gap-1 cursor-pointer"
                    >
                      {asset.url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={asset.url}
                          alt={asset.name}
                          className="w-9 h-9 object-contain rounded"
                        />
                      )}
                      <span className="text-[9px] font-semibold text-slate-700 truncate w-full">
                        {asset.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {renderFontSizeStepper(
            'Tamanho da Imagem',
            activeCustomImage.tamanhoPx || 90,
            24,
            640,
            4,
            (next) => updateCustomImage(activeCustomImage.id, (img) => ({ ...img, tamanhoPx: next }))
          )}

          <div>
            <div className="flex justify-between text-[10px] font-bold text-slate-700 mb-0.5">
              <span>Opacidade</span>
              <span className="font-mono">
                {Math.round((activeCustomImage.opacidade ?? 1) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.05}
              value={activeCustomImage.opacidade ?? 1}
              onChange={(e) =>
                updateCustomImage(activeCustomImage.id, (img) => ({
                  ...img,
                  opacidade: Number(e.target.value),
                }))
              }
              className="w-full accent-blue-800"
            />
          </div>

          <div className="space-y-1.5 pt-1 border-t border-slate-100">
            <label className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(activeCustomImage.mostrarLegenda)}
                onChange={(e) =>
                  updateCustomImage(activeCustomImage.id, (img) => ({
                    ...img,
                    mostrarLegenda: e.target.checked,
                  }))
                }
                className="rounded border-slate-300"
              />
              <span>Exibir legenda abaixo</span>
            </label>
            {activeCustomImage.mostrarLegenda && (
              <input
                type="text"
                value={activeCustomImage.legenda || ''}
                onChange={(e) =>
                  updateCustomImage(activeCustomImage.id, (img) => ({
                    ...img,
                    legenda: e.target.value,
                  }))
                }
                placeholder="Legenda opcional"
                className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px]"
              />
            )}
          </div>

          {renderMoveControls({
            x: activeCustomImage.x,
            y: activeCustomImage.y,
            minX: -60,
            maxX: sheetWidth - 30,
            minY: -60,
            maxY: sheetHeight - 30,
            onChange: (nx, ny) =>
              updateCustomImage(activeCustomImage.id, (img) => ({ ...img, x: nx, y: ny })),
            resetLabel: 'Centralizar',
            onReset: () =>
              updateCustomImage(activeCustomImage.id, (img) => ({
                ...img,
                x: Math.round((sheetWidth - (img.tamanhoPx || 90)) / 2),
                y: Math.round((sheetHeight - (img.tamanhoPx || 90)) / 2),
              })),
          })}

          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-600">
              Camada: {Math.max(2, activeCustomImage.camadaZIndex ?? 18)}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  updateCustomImage(activeCustomImage.id, (img) => ({
                    ...img,
                    camadaZIndex: Math.max(2, (img.camadaZIndex ?? 18) - 1),
                  }))
                }
                className="px-2 py-0.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 cursor-pointer"
              >
                Recuar
              </button>
              <button
                type="button"
                onClick={() =>
                  updateCustomImage(activeCustomImage.id, (img) => ({
                    ...img,
                    camadaZIndex: Math.min(40, (img.camadaZIndex ?? 18) + 1),
                  }))
                }
                className="px-2 py-0.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 cursor-pointer"
              >
                Avançar
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleDeleteCustomImage(activeCustomImage.id)}
            className="w-full py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Trash2 size={12} />
            <span>Apagar esta Imagem</span>
          </button>
        </div>
      );
    }

    // 1. Custom Free Text Box
    if (activeCustomBox) {
      return (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  wrapTextareaSelection(
                    customBoxRef.current,
                    activeCustomBox.texto || '',
                    '**',
                    (nextVal) =>
                      updateCustomBox(activeCustomBox.id, (b) => ({ ...b, texto: nextVal }))
                  )
                }
                className="px-2 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 flex items-center gap-1 cursor-pointer"
              >
                <Bold size={10} />
                <span>Negrito</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  wrapTextareaSelection(
                    customBoxRef.current,
                    activeCustomBox.texto || '',
                    '*',
                    (nextVal) =>
                      updateCustomBox(activeCustomBox.id, (b) => ({ ...b, texto: nextVal }))
                  )
                }
                className="px-2 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 flex items-center gap-1 cursor-pointer"
              >
                <Italic size={10} />
                <span>Itálico</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  insertAtTextareaCursor(
                    customBoxRef.current,
                    activeCustomBox.texto || '',
                    '\n',
                    (nextVal) =>
                      updateCustomBox(activeCustomBox.id, (b) => ({ ...b, texto: nextVal }))
                  )
                }
                className="px-2 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 flex items-center gap-1 cursor-pointer"
                title="Quebra de linha"
              >
                <CornerDownLeft size={10} />
                <span>Linha</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                const newId = `tb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
                const copyBox: CertificateCustomTextBox = {
                  ...activeCustomBox,
                  id: newId,
                  x: Math.min(sheetWidth - 60, activeCustomBox.x + 20),
                  y: Math.min(sheetHeight - 40, activeCustomBox.y + 20),
                };
                setTemplate((prev) => ({
                  ...prev,
                  caixasTextoExtra: [...(prev.caixasTextoExtra || []), copyBox],
                }));
                const key = `caixaTexto:${newId}` as CertificateSelectableObject;
                setActiveTarget(key);
                onSelectObject(key);
              }}
              className="p-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 cursor-pointer"
              title="Duplicar caixa"
            >
              <Copy size={11} />
            </button>
          </div>

          <textarea
            ref={customBoxRef}
            rows={3}
            value={activeCustomBox.texto}
            onChange={(e) =>
              updateCustomBox(activeCustomBox.id, (b) => ({ ...b, texto: e.target.value }))
            }
            placeholder="Digite o texto desta caixa..."
            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />

          <div className="flex flex-wrap gap-1">
            {[
              { label: 'Aluno', token: '{{ALUNO}}' },
              { label: 'Curso', token: '{{CURSO}}' },
              { label: 'Carga H.', token: '{{CARGA_HORARIA}}' },
              { label: 'Média', token: '{{MEDIA_FINAL}}' },
            ].map((p) => (
              <button
                key={p.token}
                type="button"
                onClick={() =>
                  insertAtTextareaCursor(
                    customBoxRef.current,
                    activeCustomBox.texto || '',
                    p.token,
                    (nextVal) =>
                      updateCustomBox(activeCustomBox.id, (b) => ({ ...b, texto: nextVal }))
                  )
                }
                className="px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-900 text-[9px] font-bold border border-blue-200 cursor-pointer"
              >
                + {p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                Fonte
              </label>
              <select
                value={normalizeFrontFont(activeCustomBox.fonte)}
                onChange={(e) =>
                  updateCustomBox(activeCustomBox.id, (b) => ({
                    ...b,
                    fonte: e.target.value as CertificateFontKey,
                  }))
                }
                className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-medium"
              >
                {FONT_OPTIONS_FRONT.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                Cor
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="color"
                  value={activeCustomBox.cor || '#0f172a'}
                  onChange={(e) =>
                    updateCustomBox(activeCustomBox.id, (b) => ({ ...b, cor: e.target.value }))
                  }
                  className="w-7 h-7 rounded border border-slate-200 cursor-pointer bg-white p-0.5"
                />
                {['#0f172a', '#071b3b', '#475569', '#92400e'].map((sw) => (
                  <button
                    key={sw}
                    type="button"
                    onClick={() =>
                      updateCustomBox(activeCustomBox.id, (b) => ({ ...b, cor: sw }))
                    }
                    style={{ backgroundColor: sw }}
                    className="w-5 h-5 rounded border border-slate-300 cursor-pointer"
                  />
                ))}
              </div>
            </div>
          </div>

          {renderFontSizeStepper(
            'Tamanho da Fonte',
            activeCustomBox.tamanhoFontePx,
            12,
            96,
            0.5,
            (next) =>
              updateCustomBox(activeCustomBox.id, (b) => ({ ...b, tamanhoFontePx: next })),
            true
          )}

          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  updateCustomBox(activeCustomBox.id, (b) => ({ ...b, negrito: !b.negrito }))
                }
                className={cn(
                  'px-2 py-1 rounded border text-[10px] font-bold cursor-pointer',
                  activeCustomBox.negrito
                    ? 'bg-blue-900 text-white border-blue-950'
                    : 'bg-white text-slate-700 border-slate-200'
                )}
              >
                B
              </button>
              <button
                type="button"
                onClick={() =>
                  updateCustomBox(activeCustomBox.id, (b) => ({ ...b, italico: !b.italico }))
                }
                className={cn(
                  'px-2 py-1 rounded border text-[10px] italic font-bold cursor-pointer',
                  activeCustomBox.italico
                    ? 'bg-blue-900 text-white border-blue-950'
                    : 'bg-white text-slate-700 border-slate-200'
                )}
              >
                I
              </button>
              <button
                type="button"
                onClick={() =>
                  updateCustomBox(activeCustomBox.id, (b) => ({ ...b, maiusculo: !b.maiusculo }))
                }
                className={cn(
                  'px-2 py-1 rounded border text-[10px] font-bold cursor-pointer',
                  activeCustomBox.maiusculo
                    ? 'bg-blue-900 text-white border-blue-950'
                    : 'bg-white text-slate-700 border-slate-200'
                )}
              >
                AA
              </button>
            </div>
            <div className="flex items-center gap-1">
              {(
                [
                  { id: 'left', icon: AlignLeft },
                  { id: 'center', icon: AlignCenter },
                  { id: 'right', icon: AlignRight },
                  { id: 'justify', icon: AlignJustify },
                ] as const
              ).map((al) => {
                const Icon = al.icon;
                return (
                  <button
                    key={al.id}
                    type="button"
                    onClick={() =>
                      updateCustomBox(activeCustomBox.id, (b) => ({ ...b, alinhamento: al.id }))
                    }
                    className={cn(
                      'p-1 rounded border cursor-pointer',
                      (activeCustomBox.alinhamento || 'left') === al.id
                        ? 'bg-blue-900 text-white border-blue-950'
                        : 'bg-white text-slate-600 border-slate-200'
                    )}
                  >
                    <Icon size={11} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                <span>Entrelinha</span>
                <span className="font-mono">{(activeCustomBox.entrelinha ?? 1.35).toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={1.0}
                max={2.2}
                step={0.05}
                value={activeCustomBox.entrelinha ?? 1.35}
                onChange={(e) =>
                  updateCustomBox(activeCustomBox.id, (b) => ({
                    ...b,
                    entrelinha: Number(e.target.value),
                  }))
                }
                className="w-full accent-blue-800"
              />
            </div>
            <div>
              <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                <span>Largura</span>
                <span className="font-mono">{activeCustomBox.larguraPx || 280}px</span>
              </div>
              <input
                type="range"
                min={80}
                max={sheetWidth}
                step={5}
                value={activeCustomBox.larguraPx || 280}
                onChange={(e) =>
                  updateCustomBox(activeCustomBox.id, (b) => ({
                    ...b,
                    larguraPx: Number(e.target.value),
                  }))
                }
                className="w-full accent-blue-800"
              />
            </div>
          </div>

          {renderMoveControls({
            x: activeCustomBox.x,
            y: activeCustomBox.y,
            minX: -40,
            maxX: sheetWidth - 40,
            minY: -20,
            maxY: sheetHeight - 20,
            onChange: (nx, ny) =>
              updateCustomBox(activeCustomBox.id, (b) => ({ ...b, x: nx, y: ny })),
            resetLabel: 'Centralizar',
            onReset: () =>
              updateCustomBox(activeCustomBox.id, (b) => ({
                ...b,
                x: Math.round((sheetWidth - (b.larguraPx || 280)) / 2),
                y: Math.round(sheetHeight * 0.42),
              })),
          })}

          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-600">
              Camada: {Math.max(2, activeCustomBox.camadaZIndex ?? 20)}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  updateCustomBox(activeCustomBox.id, (b) => ({
                    ...b,
                    camadaZIndex: Math.max(2, (b.camadaZIndex ?? 20) - 1),
                  }))
                }
                className="px-2 py-0.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 cursor-pointer"
              >
                Recuar
              </button>
              <button
                type="button"
                onClick={() =>
                  updateCustomBox(activeCustomBox.id, (b) => ({
                    ...b,
                    camadaZIndex: Math.min(40, (b.camadaZIndex ?? 20) + 1),
                  }))
                }
                className="px-2 py-0.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 cursor-pointer"
              >
                Avançar
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleDeleteCustomBox(activeCustomBox.id)}
            className="w-full py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Trash2 size={12} />
            <span>Apagar esta Caixa de Texto</span>
          </button>
        </div>
      );
    }

    // 2. Front Title
    if (activeTarget === 'titulo') {
      return (
        <div className="space-y-2.5">
          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
              Texto do Título (Enter para quebrar linha)
            </label>
            <textarea
              rows={2}
              value={template.titulo}
              onChange={(e) => setTemplate((prev) => ({ ...prev, titulo: e.target.value }))}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Fonte</label>
              <select
                value={normalizeFrontFont(template.fonteTitulo || template.fonteCorpo)}
                onChange={(e) =>
                  setTemplate((prev) => ({
                    ...prev,
                    fonteTitulo: e.target.value as CertificateFontKey,
                  }))
                }
                className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-medium"
              >
                {FONT_OPTIONS_FRONT.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-1 pb-0.5">
              <button
                type="button"
                onClick={() =>
                  setTemplate((prev) => ({
                    ...prev,
                    tituloNegrito: !(prev.tituloNegrito ?? true),
                  }))
                }
                className={cn(
                  'flex-1 py-1.5 rounded border text-[11px] font-bold cursor-pointer',
                  (template.tituloNegrito ?? true)
                    ? 'bg-blue-900 text-white border-blue-950'
                    : 'bg-white text-slate-700 border-slate-200'
                )}
              >
                Negrito
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
                  'flex-1 py-1.5 rounded border text-[11px] italic font-bold cursor-pointer',
                  (template.tituloItalico ?? true)
                    ? 'bg-blue-900 text-white border-blue-950'
                    : 'bg-white text-slate-700 border-slate-200'
                )}
              >
                Itálico
              </button>
            </div>
          </div>

          {renderFontSizeStepper(
            'Tamanho do Título',
            template.tamanhoFonteTitulo ?? 42,
            12,
            96,
            1,
            (next) => setTemplate((prev) => ({ ...prev, tamanhoFonteTitulo: next })),
            true
          )}

          <div>
            <div className="flex justify-between text-[10px] font-semibold text-slate-600">
              <span>Espaço entre Letras</span>
              <span className="font-mono">
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

          {renderMoveControls({
            x: template.tituloOffsetX ?? 0,
            y: template.tituloOffsetY ?? 0,
            minX: -420,
            maxX: 420,
            minY: -260,
            maxY: 420,
            onChange: (nx, ny) =>
              setTemplate((prev) => ({ ...prev, tituloOffsetX: nx, tituloOffsetY: ny })),
            onReset: () =>
              setTemplate((prev) => ({ ...prev, tituloOffsetX: 0, tituloOffsetY: 0 })),
          })}

          {renderLayerStepper('titulo')}

          <button
            type="button"
            onClick={() => setTemplate((prev) => ({ ...prev, titulo: '' }))}
            className="w-full py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Trash2 size={12} />
            <span>Apagar Título</span>
          </button>
        </div>
      );
    }

    // 3. Body Text
    if (activeTarget === 'texto') {
      const bodyItalic = template.textoCorpoItalico ?? template.fonteCorpo !== 'sans';
      const bodyBold = template.textoCorpoNegrito ?? false;
      return (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-bold text-slate-600">
              {isEditingIndividualBody ? 'Texto Individual do Aluno' : 'Texto Padrão'}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  wrapTextareaSelection(bodyRef.current, activeBodyTextValue, '**', (nextVal) =>
                    updateActiveBodyText(nextVal)
                  )
                }
                className="px-1.5 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 cursor-pointer"
                title="Negrito no trecho"
              >
                **B**
              </button>
              <button
                type="button"
                onClick={() =>
                  wrapTextareaSelection(bodyRef.current, activeBodyTextValue, '*', (nextVal) =>
                    updateActiveBodyText(nextVal)
                  )
                }
                className="px-1.5 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-[10px] italic font-bold text-slate-700 cursor-pointer"
                title="Itálico no trecho"
              >
                *I*
              </button>
              <button
                type="button"
                onClick={() =>
                  insertAtTextareaCursor(bodyRef.current, activeBodyTextValue, '\n', (nextVal) =>
                    updateActiveBodyText(nextVal)
                  )
                }
                className="px-1.5 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 cursor-pointer flex items-center gap-0.5"
                title="Quebra de linha"
              >
                <CornerDownLeft size={10} />
                <span>Linha</span>
              </button>
            </div>
          </div>

          <textarea
            ref={bodyRef}
            rows={4}
            value={activeBodyTextValue}
            onChange={(e) => updateActiveBodyText(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
          />

          <div className="flex flex-wrap gap-1">
            {[
              { label: 'Aluno', token: '{{ALUNO}}' },
              { label: 'Curso', token: '{{CURSO}}' },
              { label: 'Início', token: '{{DATA_INICIO}}' },
              { label: 'Fim', token: '{{DATA_FIM}}' },
            ].map((p) => (
              <button
                key={p.token}
                type="button"
                onClick={() =>
                  insertAtTextareaCursor(
                    bodyRef.current,
                    activeBodyTextValue,
                    p.token,
                    (nextVal) => updateActiveBodyText(nextVal)
                  )
                }
                className="px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-900 text-[9px] font-bold border border-blue-200 cursor-pointer"
              >
                + {p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Fonte</label>
              <select
                value={normalizeFrontFont(template.fonteCorpo)}
                onChange={(e) =>
                  setTemplate((prev) => ({
                    ...prev,
                    fonteCorpo: e.target.value as CertificateFontKey,
                  }))
                }
                className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-medium"
              >
                {FONT_OPTIONS_FRONT.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                Estilo &amp; Alinhamento
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setTemplate((prev) => ({ ...prev, textoCorpoNegrito: !bodyBold }))
                  }
                  className={cn(
                    'px-2 py-1 rounded border text-[10px] font-bold cursor-pointer',
                    bodyBold
                      ? 'bg-blue-900 text-white border-blue-950'
                      : 'bg-white text-slate-700 border-slate-200'
                  )}
                >
                  B
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setTemplate((prev) => ({ ...prev, textoCorpoItalico: !bodyItalic }))
                  }
                  className={cn(
                    'px-2 py-1 rounded border text-[10px] italic font-bold cursor-pointer',
                    bodyItalic
                      ? 'bg-blue-900 text-white border-blue-950'
                      : 'bg-white text-slate-700 border-slate-200'
                  )}
                >
                  I
                </button>
                {(
                  [
                    { id: 'left', icon: AlignLeft },
                    { id: 'center', icon: AlignCenter },
                    { id: 'justify', icon: AlignJustify },
                  ] as const
                ).map((al) => {
                  const Icon = al.icon;
                  return (
                    <button
                      key={al.id}
                      type="button"
                      onClick={() =>
                        setTemplate((prev) => ({ ...prev, alinhamentoTexto: al.id }))
                      }
                      className={cn(
                        'p-1 rounded border cursor-pointer',
                        (template.alinhamentoTexto || 'left') === al.id
                          ? 'bg-blue-900 text-white border-blue-950'
                          : 'bg-white text-slate-600 border-slate-200'
                      )}
                    >
                      <Icon size={11} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {renderFontSizeStepper(
            'Tamanho do Texto',
            template.tamanhoFonteCorpo || 19,
            12,
            96,
            0.5,
            (next) => setTemplate((prev) => ({ ...prev, tamanhoFonteCorpo: next })),
            true
          )}

          {template.destacarNomeParticipante &&
            renderFontSizeStepper(
              'Tamanho Nome do Aluno',
              template.tamanhoFonteParticipante ??
                Math.round((template.tamanhoFonteCorpo || 19) * 2.15),
              12,
              96,
              1,
              (next) => setTemplate((prev) => ({ ...prev, tamanhoFonteParticipante: next })),
              true
            )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                <span>Entrelinha</span>
                <span className="font-mono">{(template.entrelinhaCorpo ?? 1.82).toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={1.0}
                max={2.4}
                step={0.05}
                value={template.entrelinhaCorpo ?? 1.82}
                onChange={(e) =>
                  setTemplate((prev) => ({ ...prev, entrelinhaCorpo: Number(e.target.value) }))
                }
                className="w-full accent-blue-800"
              />
            </div>
            <div>
              <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                <span>Largura do Bloco</span>
                <span className="font-mono">{template.larguraBlocoTextoPct ?? 100}%</span>
              </div>
              <input
                type="range"
                min={45}
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
            </div>
          </div>

          {renderMoveControls({
            x: template.textoOffsetX ?? 0,
            y: template.textoOffsetY ?? 0,
            minX: -420,
            maxX: 420,
            minY: -260,
            maxY: 360,
            onChange: (nx, ny) =>
              setTemplate((prev) => ({ ...prev, textoOffsetX: nx, textoOffsetY: ny })),
            onReset: () =>
              setTemplate((prev) => ({ ...prev, textoOffsetX: 0, textoOffsetY: 0 })),
          })}

          {renderLayerStepper('texto')}

          <button
            type="button"
            onClick={() => updateActiveBodyText('')}
            className="w-full py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Trash2 size={12} />
            <span>Apagar Texto</span>
          </button>
        </div>
      );
    }

    // 4. Date & Location
    if (activeTarget === 'data') {
      const dateBold = template.dataNegrito ?? false;
      const dateItalic =
        template.dataItalico ??
        (template.textoCorpoItalico ?? template.fonteCorpo !== 'sans');
      return (
        <div className="space-y-2.5">
          <div className="grid grid-cols-1 gap-1.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Local</label>
              <textarea
                rows={2}
                value={template.localEmissao}
                onChange={(e) =>
                  setTemplate((prev) => ({ ...prev, localEmissao: e.target.value }))
                }
                className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                Data por Extenso
              </label>
              <textarea
                rows={2}
                value={template.dataEmissaoExtenso}
                onChange={(e) =>
                  setTemplate((prev) => ({ ...prev, dataEmissaoExtenso: e.target.value }))
                }
                className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setTemplate((prev) => ({ ...prev, dataNegrito: !dateBold }))}
                className={cn(
                  'px-2.5 py-1 rounded border text-[10px] font-bold cursor-pointer',
                  dateBold
                    ? 'bg-blue-900 text-white border-blue-950'
                    : 'bg-white text-slate-700 border-slate-200'
                )}
              >
                Negrito
              </button>
              <button
                type="button"
                onClick={() => setTemplate((prev) => ({ ...prev, dataItalico: !dateItalic }))}
                className={cn(
                  'px-2.5 py-1 rounded border text-[10px] italic font-bold cursor-pointer',
                  dateItalic
                    ? 'bg-blue-900 text-white border-blue-950'
                    : 'bg-white text-slate-700 border-slate-200'
                )}
              >
                Itálico
              </button>
            </div>
            <div className="flex items-center gap-1">
              {(
                [
                  { id: 'left', icon: AlignLeft },
                  { id: 'center', icon: AlignCenter },
                  { id: 'right', icon: AlignRight },
                ] as const
              ).map((al) => {
                const Icon = al.icon;
                return (
                  <button
                    key={al.id}
                    type="button"
                    onClick={() => setTemplate((prev) => ({ ...prev, dataAlinhamento: al.id }))}
                    className={cn(
                      'p-1 rounded border cursor-pointer',
                      (template.dataAlinhamento || 'left') === al.id
                        ? 'bg-blue-900 text-white border-blue-950'
                        : 'bg-white text-slate-600 border-slate-200'
                    )}
                  >
                    <Icon size={11} />
                  </button>
                );
              })}
            </div>
          </div>

          {renderFontSizeStepper(
            'Tamanho da Data',
            template.tamanhoFonteData ?? Math.max(12, (template.tamanhoFonteCorpo || 19) - 2),
            12,
            96,
            0.5,
            (next) => setTemplate((prev) => ({ ...prev, tamanhoFonteData: next })),
            true
          )}

          {renderMoveControls({
            x: template.dataOffsetX ?? 0,
            y: template.dataOffsetY ?? 0,
            minX: -420,
            maxX: 420,
            minY: -360,
            maxY: 260,
            onChange: (nx, ny) =>
              setTemplate((prev) => ({ ...prev, dataOffsetX: nx, dataOffsetY: ny })),
            onReset: () =>
              setTemplate((prev) => ({ ...prev, dataOffsetX: 0, dataOffsetY: 0 })),
          })}

          {renderLayerStepper('data')}

          <button
            type="button"
            onClick={() =>
              setTemplate((prev) => ({ ...prev, localEmissao: '', dataEmissaoExtenso: '' }))
            }
            className="w-full py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Trash2 size={12} />
            <span>Apagar Local e Data</span>
          </button>
        </div>
      );
    }

    // 5. Signatures
    if (activeTarget === 'assinaturaPrincipal' || activeTarget === 'segundaAssinatura') {
      const isSecond = activeTarget === 'segundaAssinatura';
      const sigBold = template.assinaturaNegrito ?? true;
      const sigItalic = template.assinaturaItalico ?? false;
      const cargoBold = template.assinaturaCargoNegrito ?? false;

      return (
        <div className="space-y-2.5">
          <div className="grid grid-cols-1 gap-1.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Nome</label>
              <textarea
                rows={2}
                value={isSecond ? template.segundaAssinaturaNome : template.assinaturaNome}
                onChange={(e) =>
                  setTemplate((prev) =>
                    isSecond
                      ? { ...prev, segundaAssinaturaNome: e.target.value }
                      : { ...prev, assinaturaNome: e.target.value }
                  )
                }
                className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Posto</label>
                <textarea
                  rows={2}
                  value={isSecond ? template.segundaAssinaturaPosto : template.assinaturaPosto}
                  onChange={(e) =>
                    setTemplate((prev) =>
                      isSecond
                        ? { ...prev, segundaAssinaturaPosto: e.target.value }
                        : { ...prev, assinaturaPosto: e.target.value }
                    )
                  }
                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Função</label>
                <textarea
                  rows={2}
                  value={isSecond ? template.segundaAssinaturaCargo : template.assinaturaCargo}
                  onChange={(e) =>
                    setTemplate((prev) =>
                      isSecond
                        ? { ...prev, segundaAssinaturaCargo: e.target.value }
                        : { ...prev, assinaturaCargo: e.target.value }
                    )
                  }
                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Fonte</label>
              <select
                value={normalizeFrontFont(template.fonteAssinatura || template.fonteCorpo)}
                onChange={(e) =>
                  setTemplate((prev) => ({
                    ...prev,
                    fonteAssinatura: e.target.value as CertificateFontKey,
                  }))
                }
                className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-medium"
              >
                {FONT_OPTIONS_FRONT.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-1 pb-0.5">
              <button
                type="button"
                onClick={() =>
                  setTemplate((prev) => ({ ...prev, assinaturaNegrito: !sigBold }))
                }
                className={cn(
                  'px-2 py-1 rounded border text-[10px] font-bold cursor-pointer',
                  sigBold
                    ? 'bg-blue-900 text-white border-blue-950'
                    : 'bg-white text-slate-700 border-slate-200'
                )}
              >
                B Nome
              </button>
              <button
                type="button"
                onClick={() =>
                  setTemplate((prev) => ({ ...prev, assinaturaCargoNegrito: !cargoBold }))
                }
                className={cn(
                  'px-2 py-1 rounded border text-[10px] font-bold cursor-pointer',
                  cargoBold
                    ? 'bg-blue-900 text-white border-blue-950'
                    : 'bg-white text-slate-700 border-slate-200'
                )}
              >
                B Cargo
              </button>
              <button
                type="button"
                onClick={() =>
                  setTemplate((prev) => ({ ...prev, assinaturaItalico: !sigItalic }))
                }
                className={cn(
                  'px-2 py-1 rounded border text-[10px] italic font-bold cursor-pointer',
                  sigItalic
                    ? 'bg-blue-900 text-white border-blue-950'
                    : 'bg-white text-slate-700 border-slate-200'
                )}
              >
                I
              </button>
            </div>
          </div>

          {renderFontSizeStepper(
            'Tamanho Nome/Posto',
            template.tamanhoFonteAssinaturaNome ?? 13.5,
            12,
            96,
            0.5,
            (next) => setTemplate((prev) => ({ ...prev, tamanhoFonteAssinaturaNome: next })),
            true
          )}
          {renderFontSizeStepper(
            'Tamanho Cargo/Função',
            template.tamanhoFonteAssinaturaCargo ?? 12.5,
            12,
            96,
            0.5,
            (next) => setTemplate((prev) => ({ ...prev, tamanhoFonteAssinaturaCargo: next })),
            true
          )}

          {renderMoveControls({
            x: isSecond
              ? template.segundaAssinaturaOffsetX ?? 0
              : template.assinaturaPrincipalOffsetX ?? 0,
            y: isSecond
              ? template.segundaAssinaturaOffsetY ?? 0
              : template.assinaturaPrincipalOffsetY ?? 0,
            minX: -520,
            maxX: 520,
            minY: -640,
            maxY: 220,
            onChange: (nx, ny) =>
              setTemplate((prev) =>
                isSecond
                  ? { ...prev, segundaAssinaturaOffsetX: nx, segundaAssinaturaOffsetY: ny }
                  : { ...prev, assinaturaPrincipalOffsetX: nx, assinaturaPrincipalOffsetY: ny }
              ),
            onReset: () =>
              setTemplate((prev) =>
                isSecond
                  ? { ...prev, segundaAssinaturaOffsetX: 0, segundaAssinaturaOffsetY: 0 }
                  : { ...prev, assinaturaPrincipalOffsetX: 0, assinaturaPrincipalOffsetY: 0 }
              ),
          })}

          {renderLayerStepper(isSecond ? 'segundaAssinatura' : 'assinaturaPrincipal')}

          <button
            type="button"
            onClick={() => {
              if (isSecond) {
                setTemplate((prev) => ({ ...prev, mostrarSegundaAssinatura: false }));
                setMenuTab('items');
              } else {
                setTemplate((prev) => ({
                  ...prev,
                  assinaturaNome: '',
                  assinaturaPosto: '',
                  assinaturaCargo: '',
                }));
              }
            }}
            className="w-full py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Trash2 size={12} />
            <span>{isSecond ? 'Remover 2ª Assinatura' : 'Apagar Dados da Assinatura'}</span>
          </button>
        </div>
      );
    }

    // 6. Back Course Title
    if (activeTarget === 'versoTitulo') {
      return (
        <div className="space-y-2.5">
          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
              Título do Curso (Verso)
            </label>
            <textarea
              rows={2}
              value={template.versoTituloCurso}
              onChange={(e) =>
                setTemplate((prev) => ({ ...prev, versoTituloCurso: e.target.value }))
              }
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Fonte</label>
              <select
                value={template.fonteVersoTitulo || template.fonteVerso || 'sans'}
                onChange={(e) =>
                  setTemplate((prev) => ({
                    ...prev,
                    fonteVersoTitulo: e.target.value as CertificateFontKey,
                  }))
                }
                className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-medium"
              >
                {FONT_OPTIONS_BACK.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-1 pb-0.5">
              <button
                type="button"
                onClick={() =>
                  setTemplate((prev) => ({
                    ...prev,
                    versoTituloNegrito: !(prev.versoTituloNegrito ?? true),
                  }))
                }
                className={cn(
                  'flex-1 py-1.5 rounded border text-[11px] font-bold cursor-pointer',
                  (template.versoTituloNegrito ?? true)
                    ? 'bg-blue-900 text-white border-blue-950'
                    : 'bg-white text-slate-700 border-slate-200'
                )}
              >
                Negrito
              </button>
              <button
                type="button"
                onClick={() =>
                  setTemplate((prev) => ({
                    ...prev,
                    versoTituloItalico: !(prev.versoTituloItalico ?? prev.versoItalico ?? false),
                  }))
                }
                className={cn(
                  'flex-1 py-1.5 rounded border text-[11px] italic font-bold cursor-pointer',
                  (template.versoTituloItalico ?? template.versoItalico ?? false)
                    ? 'bg-blue-900 text-white border-blue-950'
                    : 'bg-white text-slate-700 border-slate-200'
                )}
              >
                Itálico
              </button>
            </div>
          </div>

          {renderFontSizeStepper(
            'Tamanho do Título',
            template.versoTamanhoFonteTitulo ?? 30,
            12,
            96,
            0.5,
            (next) => setTemplate((prev) => ({ ...prev, versoTamanhoFonteTitulo: next })),
            true
          )}

          {renderMoveControls({
            x: template.versoTituloOffsetX ?? 0,
            y: template.versoTituloOffsetY ?? 0,
            minX: -480,
            maxX: 480,
            minY: -220,
            maxY: 640,
            onChange: (nx, ny) =>
              setTemplate((prev) => ({
                ...prev,
                versoTituloOffsetX: nx,
                versoTituloOffsetY: ny,
              })),
            onReset: () =>
              setTemplate((prev) => ({ ...prev, versoTituloOffsetX: 0, versoTituloOffsetY: 0 })),
          })}

          {renderLayerStepper('versoTitulo')}

          <button
            type="button"
            onClick={() => setTemplate((prev) => ({ ...prev, versoTituloCurso: '' }))}
            className="w-full py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Trash2 size={12} />
            <span>Apagar Título do Verso</span>
          </button>
        </div>
      );
    }

    // 7. Back Disciplines Table
    if (activeTarget === 'versoTabela') {
      return (
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                Fonte Disciplinas
              </label>
              <select
                value={template.fonteVerso || 'sans'}
                onChange={(e) =>
                  setTemplate((prev) => ({
                    ...prev,
                    fonteVerso: e.target.value as CertificateFontKey,
                  }))
                }
                className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-medium"
              >
                {FONT_OPTIONS_BACK.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                Fonte Números
              </label>
              <select
                value={template.fonteVersoNumeros || template.fonteVerso || 'sans'}
                onChange={(e) =>
                  setTemplate((prev) => ({
                    ...prev,
                    fonteVersoNumeros: e.target.value as CertificateFontKey,
                  }))
                }
                className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-medium"
              >
                {FONT_OPTIONS_BACK.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {renderFontSizeStepper(
            'Tamanho Cabeçalho',
            template.versoTamanhoFonteCabecalho ?? 21,
            12,
            96,
            0.5,
            (next) => setTemplate((prev) => ({ ...prev, versoTamanhoFonteCabecalho: next })),
            true
          )}
          {renderFontSizeStepper(
            'Tamanho Disciplinas',
            template.versoTamanhoFonteDisciplinas ?? 17,
            12,
            96,
            0.5,
            (next) => setTemplate((prev) => ({ ...prev, versoTamanhoFonteDisciplinas: next })),
            true
          )}
          {renderFontSizeStepper(
            'Tamanho Notas / Horas',
            template.versoTamanhoFonteNumeros ?? 22,
            12,
            96,
            0.5,
            (next) => setTemplate((prev) => ({ ...prev, versoTamanhoFonteNumeros: next })),
            true
          )}
          {renderFontSizeStepper(
            'Tamanho Rótulo Totais',
            template.versoTamanhoFonteTotaisLabel ?? 22,
            12,
            96,
            0.5,
            (next) => setTemplate((prev) => ({ ...prev, versoTamanhoFonteTotaisLabel: next })),
            true
          )}
          {renderFontSizeStepper(
            'Tamanho Números Totais',
            template.versoTamanhoFonteTotaisNumeros ?? 28,
            12,
            96,
            0.5,
            (next) => setTemplate((prev) => ({ ...prev, versoTamanhoFonteTotaisNumeros: next })),
            true
          )}

          {renderMoveControls({
            x: template.versoTabelaOffsetX ?? 0,
            y: template.versoTabelaOffsetY ?? 0,
            minX: sheetWidth < sheetHeight ? -240 : -340,
            maxX: sheetWidth < sheetHeight ? 240 : 340,
            minY: sheetWidth < sheetHeight ? -240 : -180,
            maxY: sheetWidth < sheetHeight ? 320 : 240,
            onChange: (nx, ny) =>
              setTemplate((prev) => ({
                ...prev,
                versoTabelaOffsetX: nx,
                versoTabelaOffsetY: ny,
              })),
            onReset: () =>
              setTemplate((prev) => ({
                ...prev,
                versoTabelaOffsetX: 0,
                versoTabelaOffsetY: 0,
              })),
          })}

          <button
            type="button"
            onClick={() => {
              setTemplate((prev) => ({ ...prev, ocultarTabelaVerso: true }));
              setMenuTab('items');
            }}
            className="w-full py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <EyeOff size={12} />
            <span>Remover / Ocultar Quadro</span>
          </button>
        </div>
      );
    }

    // 8. Crests / Watermarks / Frames complete properties & remove
    const matchedToggle = sideToggleItems.find((i) => i.id === activeTarget);
    const isLibraryAsset =
      activeTarget.startsWith('brasao') ||
      activeTarget.startsWith('marcaDagua') ||
      activeTarget === 'molduraFrente' ||
      activeTarget === 'versoMoldura';

    const handleUploadImageForActiveTarget = async (
      e: React.ChangeEvent<HTMLInputElement>
    ) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      const category: CertificateAssetCategory = activeTarget.startsWith('brasao')
        ? 'brasao'
        : activeTarget.startsWith('marcaDagua')
          ? 'marca_dagua'
          : 'moldura';
      const dataUrl = await prepareUploadedAssetDataUrl(file, category);
      if (!dataUrl) return;
      setTemplate((prev) => {
        switch (activeTarget) {
          case 'brasaoEsquerdo':
            return { ...prev, mostrarLogoEsquerda: true, logoEsquerdaUrl: dataUrl };
          case 'brasaoCentro':
            return { ...prev, mostrarLogoCentro: true, logoCentroUrl: dataUrl };
          case 'brasaoDireito':
            return {
              ...prev,
              mostrarLogoDireita: true,
              usarBrasaoPadraoDireita: false,
              logoDireitaUrl: dataUrl,
            };
          case 'brasaoEsquerdoVerso':
            return { ...prev, mostrarLogoEsquerdaVerso: true, logoEsquerdaVersoUrl: dataUrl };
          case 'brasaoCentroVerso':
            return { ...prev, mostrarLogoCentroVerso: true, logoCentroVersoUrl: dataUrl };
          case 'brasaoDireitoVerso':
            return {
              ...prev,
              mostrarLogoDireitaVerso: true,
              usarBrasaoPadraoDireitaVerso: false,
              logoDireitaVersoUrl: dataUrl,
            };
          case 'marcaDaguaFrente':
            return { ...prev, marcaDaguaFrenteUrl: dataUrl };
          case 'marcaDaguaVerso':
            return { ...prev, marcaDaguaVersoUrl: dataUrl };
          case 'molduraFrente':
            return {
              ...prev,
              usarMolduraOriginal: true,
              estiloMolduraFrente: 'original',
              molduraFrenteUrl: dataUrl,
            };
          case 'versoMoldura':
            return {
              ...prev,
              estiloMolduraVerso: 'original',
              molduraVersoUrl: dataUrl,
            };
          default:
            return prev;
        }
      });
    };

    const renderCrestControls = () => {
      const crestConfig = (() => {
        switch (activeTarget) {
          case 'brasaoEsquerdo':
            return {
              size: template.tamanhoLogoEsquerda ?? 90,
              opacity: template.opacidadeLogoEsquerda ?? 1,
              offsetX: template.logoEsquerdaOffsetX ?? 0,
              offsetY: template.logoEsquerdaOffsetY ?? 0,
              setOffset: (nx: number, ny: number) =>
                setTemplate((prev) => ({
                  ...prev,
                  logoEsquerdaOffsetX: nx,
                  logoEsquerdaOffsetY: ny,
                })),
              layer: 'brasaoEsquerdo' as CertificateLayerKey,
              hasLegend: false,
              legendText: '',
              showLegend: false,
              setSize: (v: number) =>
                setTemplate((prev) => ({ ...prev, tamanhoLogoEsquerda: v })),
              setOpacity: (v: number) =>
                setTemplate((prev) => ({ ...prev, opacidadeLogoEsquerda: v })),
            };
          case 'brasaoCentro':
            return {
              size: template.tamanhoLogoCentro ?? 84,
              opacity: template.opacidadeLogoCentro ?? 1,
              offsetX: template.logoCentroOffsetX ?? 0,
              offsetY: template.logoCentroOffsetY ?? 0,
              setOffset: (nx: number, ny: number) =>
                setTemplate((prev) => ({
                  ...prev,
                  logoCentroOffsetX: nx,
                  logoCentroOffsetY: ny,
                })),
              layer: 'brasaoCentro' as CertificateLayerKey,
              hasLegend: true,
              legendText: template.logoCentroTexto ?? '',
              showLegend: template.mostrarLegendaLogoCentro === true,
              setSize: (v: number) =>
                setTemplate((prev) => ({ ...prev, tamanhoLogoCentro: v })),
              setOpacity: (v: number) =>
                setTemplate((prev) => ({ ...prev, opacidadeLogoCentro: v })),
              setLegendText: (v: string) =>
                setTemplate((prev) => ({ ...prev, logoCentroTexto: v })),
              setShowLegend: (v: boolean) =>
                setTemplate((prev) => ({ ...prev, mostrarLegendaLogoCentro: v })),
            };
          case 'brasaoDireito':
            return {
              size: template.tamanhoLogoDireita ?? 74,
              opacity: template.opacidadeLogoDireita ?? 1,
              offsetX: template.logoDireitaOffsetX ?? 0,
              offsetY: template.logoDireitaOffsetY ?? 0,
              setOffset: (nx: number, ny: number) =>
                setTemplate((prev) => ({
                  ...prev,
                  logoDireitaOffsetX: nx,
                  logoDireitaOffsetY: ny,
                })),
              layer: 'brasaoDireito' as CertificateLayerKey,
              hasLegend: true,
              legendText: template.logoDireitaTexto ?? 'MARINHA DO BRASIL',
              showLegend: template.mostrarLegendaLogoDireita !== false,
              setSize: (v: number) =>
                setTemplate((prev) => ({ ...prev, tamanhoLogoDireita: v })),
              setOpacity: (v: number) =>
                setTemplate((prev) => ({ ...prev, opacidadeLogoDireita: v })),
              setLegendText: (v: string) =>
                setTemplate((prev) => ({ ...prev, logoDireitaTexto: v })),
              setShowLegend: (v: boolean) =>
                setTemplate((prev) => ({ ...prev, mostrarLegendaLogoDireita: v })),
            };
          case 'brasaoEsquerdoVerso':
            return {
              size: template.tamanhoLogoEsquerdaVerso ?? template.tamanhoLogoEsquerda ?? 90,
              opacity: template.opacidadeLogoEsquerdaVerso ?? template.opacidadeLogoEsquerda ?? 1,
              offsetX: template.logoEsquerdaVersoOffsetX ?? 0,
              offsetY: template.logoEsquerdaVersoOffsetY ?? 0,
              setOffset: (nx: number, ny: number) =>
                setTemplate((prev) => ({
                  ...prev,
                  logoEsquerdaVersoOffsetX: nx,
                  logoEsquerdaVersoOffsetY: ny,
                })),
              layer: 'brasaoEsquerdoVerso' as CertificateLayerKey,
              hasLegend: false,
              legendText: '',
              showLegend: false,
              setSize: (v: number) =>
                setTemplate((prev) => ({ ...prev, tamanhoLogoEsquerdaVerso: v })),
              setOpacity: (v: number) =>
                setTemplate((prev) => ({ ...prev, opacidadeLogoEsquerdaVerso: v })),
            };
          case 'brasaoCentroVerso':
            return {
              size: template.tamanhoLogoCentroVerso ?? 54,
              opacity: template.opacidadeLogoCentroVerso ?? template.opacidadeLogoCentro ?? 1,
              offsetX: template.logoCentroVersoOffsetX ?? 0,
              offsetY: template.logoCentroVersoOffsetY ?? 0,
              setOffset: (nx: number, ny: number) =>
                setTemplate((prev) => ({
                  ...prev,
                  logoCentroVersoOffsetX: nx,
                  logoCentroVersoOffsetY: ny,
                })),
              layer: 'brasaoCentroVerso' as CertificateLayerKey,
              hasLegend: true,
              legendText: template.logoCentroVersoTexto ?? template.logoCentroTexto ?? '',
              showLegend:
                (template.mostrarLegendaLogoCentroVerso ?? template.mostrarLegendaLogoCentro) ===
                true,
              setSize: (v: number) =>
                setTemplate((prev) => ({ ...prev, tamanhoLogoCentroVerso: v })),
              setOpacity: (v: number) =>
                setTemplate((prev) => ({ ...prev, opacidadeLogoCentroVerso: v })),
              setLegendText: (v: string) =>
                setTemplate((prev) => ({ ...prev, logoCentroVersoTexto: v })),
              setShowLegend: (v: boolean) =>
                setTemplate((prev) => ({ ...prev, mostrarLegendaLogoCentroVerso: v })),
            };
          case 'brasaoDireitoVerso':
            return {
              size: template.tamanhoLogoDireitaVerso ?? template.tamanhoLogoDireita ?? 74,
              opacity: template.opacidadeLogoDireitaVerso ?? template.opacidadeLogoDireita ?? 1,
              offsetX: template.logoDireitaVersoOffsetX ?? 0,
              offsetY: template.logoDireitaVersoOffsetY ?? 0,
              setOffset: (nx: number, ny: number) =>
                setTemplate((prev) => ({
                  ...prev,
                  logoDireitaVersoOffsetX: nx,
                  logoDireitaVersoOffsetY: ny,
                })),
              layer: 'brasaoDireitoVerso' as CertificateLayerKey,
              hasLegend: true,
              legendText:
                template.logoDireitaVersoTexto ?? template.logoDireitaTexto ?? 'MARINHA DO BRASIL',
              showLegend:
                (template.mostrarLegendaLogoDireitaVerso ?? template.mostrarLegendaLogoDireita) !==
                false,
              setSize: (v: number) =>
                setTemplate((prev) => ({ ...prev, tamanhoLogoDireitaVerso: v })),
              setOpacity: (v: number) =>
                setTemplate((prev) => ({ ...prev, opacidadeLogoDireitaVerso: v })),
              setLegendText: (v: string) =>
                setTemplate((prev) => ({ ...prev, logoDireitaVersoTexto: v })),
              setShowLegend: (v: boolean) =>
                setTemplate((prev) => ({ ...prev, mostrarLegendaLogoDireitaVerso: v })),
            };
          default:
            return null;
        }
      })();

      if (!crestConfig) return null;

      return (
        <div className="space-y-2.5">
          {renderFontSizeStepper(
            'Tamanho do Brasão',
            crestConfig.size,
            24,
            240,
            2,
            crestConfig.setSize
          )}

          <div>
            <div className="flex justify-between text-[10px] font-bold text-slate-700 mb-0.5">
              <span>Opacidade</span>
              <span className="font-mono">{Math.round(crestConfig.opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={crestConfig.opacity}
              onChange={(e) => crestConfig.setOpacity(Number(e.target.value))}
              className="w-full accent-blue-800"
            />
          </div>

          {crestConfig.hasLegend && crestConfig.setShowLegend && crestConfig.setLegendText && (
            <div className="space-y-1.5 pt-1 border-t border-slate-100">
              <label className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={crestConfig.showLegend}
                  onChange={(e) => crestConfig.setShowLegend?.(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span>Exibir legenda abaixo do brasão</span>
              </label>
              {crestConfig.showLegend && (
                <input
                  type="text"
                  value={crestConfig.legendText}
                  onChange={(e) => crestConfig.setLegendText?.(e.target.value)}
                  placeholder="Ex: MARINHA DO BRASIL"
                  className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px]"
                />
              )}
            </div>
          )}

          {renderMoveControls({
            x: crestConfig.offsetX,
            y: crestConfig.offsetY,
            minX: -520,
            maxX: 520,
            minY: -220,
            maxY: 640,
            onChange: (nx, ny) => crestConfig.setOffset(nx, ny),
            onReset: () => crestConfig.setOffset(0, 0),
          })}

          {renderLayerStepper(crestConfig.layer)}
        </div>
      );
    };

    return (
      <div className="space-y-2.5">
        {activeTarget.startsWith('brasao') && renderCrestControls()}

        {(activeTarget === 'molduraFrente' || activeTarget === 'versoMoldura') && (
          <div className="space-y-2.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">
                Estilo da Moldura
              </label>
              <div className="grid grid-cols-2 gap-1">
                {(activeTarget === 'molduraFrente'
                  ? ([
                      { id: 'original', label: 'Original PNG' },
                      { id: 'vetorial', label: 'Vetorial Náutica' },
                      { id: 'simples', label: 'Linha Simples' },
                      { id: 'nenhuma', label: 'Sem Moldura' },
                    ] as const)
                  : ([
                      { id: 'classica', label: 'Clássica Tripla' },
                      { id: 'original', label: 'Original PNG' },
                      { id: 'vetorial', label: 'Vetorial Náutica' },
                      { id: 'simples', label: 'Linha Simples' },
                      { id: 'nenhuma', label: 'Sem Moldura' },
                    ] as const)
                ).map((opt) => {
                  const isActive =
                    activeTarget === 'molduraFrente'
                      ? frontFrameStyle === opt.id
                      : backFrameStyle === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        setTemplate((prev) =>
                          activeTarget === 'molduraFrente'
                            ? {
                                ...prev,
                                usarMolduraOriginal: opt.id === 'original',
                                estiloMolduraFrente: opt.id,
                                molduraFrenteUrl:
                                  opt.id === 'original'
                                    ? prev.molduraFrenteUrl || DEFAULT_FRAME_URL
                                    : prev.molduraFrenteUrl,
                              }
                            : {
                                ...prev,
                                estiloMolduraVerso: opt.id,
                              }
                        )
                      }
                      className={cn(
                        'px-2 py-1 rounded-lg border text-[10px] font-bold cursor-pointer text-left transition-colors',
                        isActive
                          ? 'bg-blue-900 text-white border-blue-950'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <label className="text-[10px] font-bold text-slate-600">
                Cor da Moldura / Borda
              </label>
              <input
                type="color"
                value={
                  activeTarget === 'molduraFrente'
                    ? template.corBordaFrente || '#52525b'
                    : template.corBordaVerso || '#071b3b'
                }
                onChange={(e) =>
                  setTemplate((prev) =>
                    activeTarget === 'molduraFrente'
                      ? { ...prev, corBordaFrente: e.target.value }
                      : { ...prev, corBordaVerso: e.target.value }
                  )
                }
                className="w-8 h-7 rounded border border-slate-200 cursor-pointer bg-white p-0.5"
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                <span>Margem Externa (cm)</span>
                <span className="font-mono">
                  {(activeTarget === 'molduraFrente'
                    ? template.margemExternaMolduraCm ?? 0.6
                    : template.margemExternaMolduraVersoCm ?? 0.6
                  ).toFixed(1)}
                  cm
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={2.5}
                step={0.1}
                value={
                  activeTarget === 'molduraFrente'
                    ? template.margemExternaMolduraCm ?? 0.6
                    : template.margemExternaMolduraVersoCm ?? 0.6
                }
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setTemplate((prev) =>
                    activeTarget === 'molduraFrente'
                      ? { ...prev, margemExternaMolduraCm: val }
                      : { ...prev, margemExternaMolduraVersoCm: val }
                  );
                }}
                className="w-full accent-blue-800"
              />
            </div>
          </div>
        )}

        {(activeTarget === 'marcaDaguaFrente' || activeTarget === 'marcaDaguaVerso') && (
          <div className="space-y-2">
            {renderFontSizeStepper(
              "Tamanho Marca d'Água",
              activeTarget === 'marcaDaguaFrente'
                ? template.tamanhoMarcaDaguaFrente ?? 545
                : template.tamanhoMarcaDaguaVerso ?? 580,
              180,
              900,
              10,
              (next) =>
                setTemplate((prev) =>
                  activeTarget === 'marcaDaguaFrente'
                    ? { ...prev, tamanhoMarcaDaguaFrente: next }
                    : { ...prev, tamanhoMarcaDaguaVerso: next }
                )
            )}
            <div>
              <div className="flex justify-between text-[10px] font-bold text-slate-700 mb-0.5">
                <span>Opacidade</span>
                <span className="font-mono">
                  {Math.round(
                    ((activeTarget === 'marcaDaguaFrente'
                      ? template.opacidadeMarcaDaguaFrente
                      : template.opacidadeMarcaDaguaVerso) ?? 0.24) * 100
                  )}
                  %
                </span>
              </div>
              <input
                type="range"
                min={0.05}
                max={0.85}
                step={0.01}
                value={
                  (activeTarget === 'marcaDaguaFrente'
                    ? template.opacidadeMarcaDaguaFrente
                    : template.opacidadeMarcaDaguaVerso) ?? 0.24
                }
                onChange={(e) =>
                  setTemplate((prev) =>
                    activeTarget === 'marcaDaguaFrente'
                      ? { ...prev, opacidadeMarcaDaguaFrente: Number(e.target.value) }
                      : { ...prev, opacidadeMarcaDaguaVerso: Number(e.target.value) }
                  )
                }
                className="w-full accent-blue-800"
              />
            </div>
            {renderMoveControls({
              x:
                (activeTarget === 'marcaDaguaFrente'
                  ? template.marcaDaguaFrenteOffsetX
                  : template.marcaDaguaVersoOffsetX) ?? 0,
              y:
                (activeTarget === 'marcaDaguaFrente'
                  ? template.marcaDaguaFrenteOffsetY
                  : template.marcaDaguaVersoOffsetY) ?? 0,
              minX: -580,
              maxX: 580,
              minY: -580,
              maxY: 580,
              onChange: (nx, ny) =>
                setTemplate((prev) =>
                  activeTarget === 'marcaDaguaFrente'
                    ? { ...prev, marcaDaguaFrenteOffsetX: nx, marcaDaguaFrenteOffsetY: ny }
                    : { ...prev, marcaDaguaVersoOffsetX: nx, marcaDaguaVersoOffsetY: ny }
                ),
              onReset: () =>
                setTemplate((prev) =>
                  activeTarget === 'marcaDaguaFrente'
                    ? { ...prev, marcaDaguaFrenteOffsetX: 0, marcaDaguaFrenteOffsetY: 0 }
                    : { ...prev, marcaDaguaVersoOffsetX: 0, marcaDaguaVersoOffsetY: 0 }
                ),
            })}

            {renderLayerStepper(
              activeTarget === 'marcaDaguaFrente' ? 'marcaDaguaFrente' : 'marcaDaguaVerso'
            )}
          </div>
        )}

        {isLibraryAsset && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-1.5">
              {onApplyLibraryAsset && (
                <button
                  type="button"
                  onClick={() => setShowInlineLibrary((v) => !v)}
                  className={cn(
                    'py-1.5 px-2 rounded-lg border text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors',
                    showInlineLibrary
                      ? 'bg-blue-900 text-white border-blue-950'
                      : 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-900'
                  )}
                >
                  <FolderOpen size={11} />
                  <span>{showInlineLibrary ? 'Fechar Biblioteca' : 'Biblioteca'}</span>
                </button>
              )}
              <label
                className={cn(
                  'py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer',
                  !onApplyLibraryAsset && 'col-span-2'
                )}
              >
                <Upload size={11} />
                <span>Enviar Imagem</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadImageForActiveTarget}
                  className="hidden"
                />
              </label>
            </div>

            {showInlineLibrary && onApplyLibraryAsset && (() => {
              const cat: CertificateAssetCategory = activeTarget.startsWith('brasao')
                ? 'brasao'
                : activeTarget.startsWith('marcaDagua')
                  ? 'marca_dagua'
                  : 'moldura';
              const matchingAssets = libraryAssets.filter((a) => a.category === cat);
              const mappedTarget: CertificateAssetTarget =
                activeTarget === 'versoMoldura'
                  ? 'molduraVerso'
                  : (activeTarget as CertificateAssetTarget);

              return (
                <div className="p-2 rounded-xl bg-white border border-blue-200 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-blue-950">
                    <span>Escolher da Biblioteca ({matchingAssets.length})</span>
                    <button
                      type="button"
                      onClick={() => setShowInlineLibrary(false)}
                      className="text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Ocultar
                    </button>
                  </div>
                  {matchingAssets.length === 0 ? (
                    <p className="text-[10px] text-slate-500 py-2 text-center">
                      Nenhum item nesta categoria. Use &ldquo;Enviar Imagem&rdquo; acima.
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-0.5">
                      {matchingAssets.map((asset) => (
                        <button
                          key={asset.id}
                          type="button"
                          onClick={() => onApplyLibraryAsset(asset, mappedTarget)}
                          title={asset.name}
                          className="p-1.5 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 bg-slate-50 flex flex-col items-center gap-1 cursor-pointer transition-colors text-center"
                        >
                          {asset.url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={asset.url}
                              alt={asset.name}
                              className="w-10 h-10 object-contain rounded"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-white border border-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-600 px-1">
                              {asset.frameStyle === 'vetorial' ? 'Vetorial' : 'Simples'}
                            </div>
                          )}
                          <span className="text-[9px] font-semibold text-slate-700 truncate w-full">
                            {asset.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {matchedToggle && (
          <button
            type="button"
            onClick={() => {
              if (matchedToggle.isVisible) {
                matchedToggle.onRemove();
              } else {
                matchedToggle.onInsert();
              }
            }}
            className={cn(
              'w-full py-1.5 rounded-lg border text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer',
              matchedToggle.isVisible
                ? 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700'
                : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800'
            )}
          >
            {matchedToggle.isVisible ? <Trash2 size={12} /> : <Plus size={12} />}
            <span>
              {matchedToggle.isVisible
                ? `Remover ${matchedToggle.label}`
                : `Inserir ${matchedToggle.label}`}
            </span>
          </button>
        )}
      </div>
    );
  };

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: `${coords.left}px`,
        top: `${coords.top}px`,
        width: '356px',
        maxWidth: 'calc(100vw - 24px)',
        maxHeight: 'min(560px, 86vh)',
        zIndex: 9999,
      }}
      className="print:hidden rounded-2xl bg-white border border-slate-300 shadow-[0_20px_50px_rgba(15,23,42,0.28)] flex flex-col overflow-hidden"
    >
      {/* Draggable Header */}
      <div
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          if ((e.target as HTMLElement)?.closest('[data-no-drag]')) return;
          e.preventDefault();
          e.stopPropagation();
          hasUserDraggedRef.current = true;
          windowDragRef.current = {
            startClientX: e.clientX,
            startClientY: e.clientY,
            origLeft: coords.left,
            origTop: coords.top,
          };
          setIsDraggingWindow(true);
        }}
        title="Clique e arraste para posicionar esta janela onde quiser na tela"
        className={cn(
          'px-3.5 py-2.5 bg-slate-900 text-white flex items-center justify-between gap-2 shrink-0 select-none',
          isDraggingWindow ? 'cursor-grabbing' : 'cursor-grab'
        )}
      >
        <div className="min-w-0 flex items-center gap-2">
          <GripHorizontal size={14} className="text-slate-400 shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.2 rounded bg-blue-600 text-[9px] font-black uppercase tracking-wider shrink-0">
                {side === 'front' ? 'Frente' : 'Verso'}
              </span>
              <h4 className="text-xs font-bold truncate">
                {getTargetLabel(
                  activeTarget,
                  side,
                  clickContext.clickedEmptyArea && activeTarget === clickContext.targetObject
                )}
              </h4>
            </div>
            <p className="text-[9px] text-slate-400 truncate mt-0.5">
              Arraste aqui para mover • Esq.: editar • Dir.: selecionar
            </p>
          </div>
        </div>
        <button
          type="button"
          data-no-drag="true"
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer shrink-0"
          title="Fechar (ESC)"
        >
          <X size={14} />
        </button>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-1 p-1.5 bg-slate-100 border-b border-slate-200 shrink-0">
        <button
          type="button"
          onClick={() => setMenuTab('props')}
          className={cn(
            'py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all',
            menuTab === 'props'
              ? 'bg-white text-blue-900 shadow-2xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          <SlidersHorizontal size={12} />
          <span>Propriedades</span>
        </button>
        <button
          type="button"
          onClick={() => setMenuTab('items')}
          className={cn(
            'py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all',
            menuTab === 'items'
              ? 'bg-white text-blue-900 shadow-2xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          <Sparkles size={12} />
          <span>Inserir / Remover</span>
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="p-3 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/70">
        {menuTab === 'props' ? (
          renderPropertiesBody()
        ) : (
          <div className="space-y-3">
            {/* Primary Actions: Insert Free Text Box OR Extra Image Right Here */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const newId = onInsertCustomTextBoxAt(
                    side,
                    clickContext.relX,
                    clickContext.relY
                  );
                  const newKey = `caixaTexto:${newId}` as CertificateSelectableObject;
                  setActiveTarget(newKey);
                  onSelectObject(newKey);
                  setMenuTab('props');
                }}
                className="py-2 px-2 rounded-xl bg-blue-900 hover:bg-blue-950 text-white text-[11px] font-bold flex items-center justify-center gap-1 shadow-xs cursor-pointer transition-colors"
              >
                <Type size={12} />
                <span>+ Texto Livre</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const newId = insertImageAtClick();
                  const newKey = `imagemExtra:${newId}` as CertificateSelectableObject;
                  setActiveTarget(newKey);
                  onSelectObject(newKey);
                  setMenuTab('props');
                }}
                className="py-2 px-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold flex items-center justify-center gap-1 shadow-xs cursor-pointer transition-colors"
              >
                <ImageIcon size={12} />
                <span>+ Imagem / Brasão</span>
              </button>
            </div>

            {/* Standard Elements Insert / Remove */}
            <div className="space-y-1.5">
              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                Inserir Itens na {side === 'front' ? 'Frente' : 'Verso'}
              </span>
              <div className="space-y-1">
                {sideToggleItems.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      'flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border bg-white transition-colors',
                      activeTarget === item.id ? 'border-blue-400 bg-blue-50/40' : 'border-slate-200'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (!item.isVisible) {
                          item.onInsert();
                          setActiveTarget(item.id);
                          onSelectObject(item.id);
                          setMenuTab('props');
                        } else if (item.onInsertNew) {
                          item.onInsertNew();
                        } else {
                          setActiveTarget(item.id);
                          onSelectObject(item.id);
                          setMenuTab('props');
                        }
                      }}
                      title={
                        item.isVisible && item.onInsertNew
                          ? `Inserir um novo ${item.label} neste ponto sem alterar o existente`
                          : `Inserir ${item.label}`
                      }
                      className="flex-1 text-left text-[11px] font-bold text-slate-800 hover:text-blue-900 flex items-center gap-1.5 cursor-pointer min-w-0"
                    >
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full shrink-0',
                          item.isVisible ? 'bg-emerald-500' : 'bg-slate-300'
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      {item.isVisible ? (
                        <>
                          {item.onInsertNew && (
                            <button
                              type="button"
                              onClick={item.onInsertNew}
                              className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                              title={`Inserir novo ${item.label} sem alterar o existente`}
                            >
                              <Plus size={10} />
                              <span>Novo</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTarget(item.id);
                              onSelectObject(item.id);
                              setMenuTab('props');
                            }}
                            className="p-1 rounded bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-900 cursor-pointer"
                            title={`Editar ${item.label} existente`}
                          >
                            <Pencil size={10} />
                          </button>
                          <button
                            type="button"
                            onClick={item.onRemove}
                            className="p-1 rounded bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 cursor-pointer"
                            title={`Remover ${item.label} existente`}
                          >
                            <Trash2 size={10} />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            item.onInsert();
                            setActiveTarget(item.id);
                            onSelectObject(item.id);
                            setMenuTab('props');
                          }}
                          className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                        >
                          <Plus size={10} />
                          <span>Inserir</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Existing Extra Images on this side */}
            {sideCustomImages.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-slate-200">
                <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Imagens / Brasões Extras ({sideCustomImages.length})
                </span>
                <div className="space-y-1">
                  {sideCustomImages.map((img, idx) => {
                    const key = `imagemExtra:${img.id}` as CertificateSelectableObject;
                    return (
                      <div
                        key={img.id}
                        className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTarget(key);
                            onSelectObject(key);
                            setMenuTab('props');
                          }}
                          className="flex-1 text-left text-[11px] font-bold text-slate-800 hover:text-blue-900 truncate cursor-pointer"
                        >
                          {img.titulo ? `${idx + 1}. ${img.titulo}` : `Imagem Extra ${idx + 1}`}
                        </button>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTarget(key);
                              onSelectObject(key);
                              setMenuTab('props');
                            }}
                            className="p-1 rounded bg-slate-100 hover:bg-blue-100 text-slate-700 cursor-pointer"
                            title="Editar imagem"
                          >
                            <Pencil size={10} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomImage(img.id)}
                            className="p-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer"
                            title="Apagar imagem"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Existing Free Text Boxes on this side */}
            {sideCustomBoxes.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-slate-200">
                <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Caixas de Texto ({sideCustomBoxes.length})
                </span>
                <div className="space-y-1">
                  {sideCustomBoxes.map((b, idx) => {
                    const key = `caixaTexto:${b.id}` as CertificateSelectableObject;
                    const snippet = (b.texto || '').replace(/\s+/g, ' ').trim();
                    return (
                      <div
                        key={b.id}
                        className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTarget(key);
                            onSelectObject(key);
                            setMenuTab('props');
                          }}
                          className="flex-1 text-left text-[11px] font-bold text-slate-800 hover:text-blue-900 truncate cursor-pointer"
                        >
                          {snippet ? `${idx + 1}. ${snippet}` : `Caixa ${idx + 1}`}
                        </button>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTarget(key);
                              onSelectObject(key);
                              setMenuTab('props');
                            }}
                            className="p-1 rounded bg-slate-100 hover:bg-blue-100 text-slate-700 cursor-pointer"
                            title="Editar caixa"
                          >
                            <Pencil size={10} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomBox(b.id)}
                            className="p-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer"
                            title="Apagar caixa"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer quick status */}
      <div className="px-3 py-1.5 bg-white border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 shrink-0">
        <span>
          Posição: X {clickContext.relX}px • Y {clickContext.relY}px
        </span>
        <button
          type="button"
          onClick={() => {
            onSelectObject(activeTarget);
            onClose();
          }}
          className="font-bold text-blue-800 hover:text-blue-950 flex items-center gap-1 cursor-pointer"
        >
          <Check size={11} />
          <span>Concluir</span>
        </button>
      </div>
    </div>
  );
}
