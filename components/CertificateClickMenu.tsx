'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Bold,
  Check,
  Copy,
  CornerDownLeft,
  EyeOff,
  FolderOpen,
  Italic,
  Layers,
  Minus,
  Pencil,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Type,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
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
import { CertificateAssetCategory } from '@/lib/certificateLibrary';
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
  onInsertCustomTextBoxAt: (side: 'front' | 'back', relX: number, relY: number) => string;
  activeBodyTextValue: string;
  updateActiveBodyText: (updater: string | ((current: string) => string)) => void;
  isEditingIndividualBody: boolean;
  onOpenLibrary?: (category: CertificateAssetCategory) => void;
}

function getTargetLabel(
  obj: CertificateSelectableObject,
  side: 'front' | 'back',
  clickedEmptyArea?: boolean
): string {
  if (clickedEmptyArea) {
    return side === 'front' ? 'Folha da Frente' : 'Folha do Verso';
  }
  if (obj.startsWith('caixaTexto:')) return 'Caixa de Texto Livre';
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
  activeBodyTextValue,
  updateActiveBodyText,
  isEditingIndividualBody,
  onOpenLibrary,
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
  const [coords, setCoords] = useState<{ left: number; top: number }>({
    left: clickContext.clientX,
    top: clickContext.clientY,
  });

  useEffect(() => {
    setActiveTarget(clickContext.targetObject);
    setMenuTab(clickContext.clickedEmptyArea ? 'items' : 'props');
  }, [clickContext]);

  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el || typeof window === 'undefined') return;
    const rect = el.getBoundingClientRect();
    const menuW = rect.width || 356;
    const menuH = rect.height || 420;
    const pad = 12;

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
  }, [clickContext, menuTab, activeTarget]);

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
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
            onRemove: () =>
              setTemplate((prev) => ({ ...prev, mostrarLogoEsquerda: false })),
          },
          {
            id: 'brasaoCentro',
            label: 'Brasão Central',
            isVisible: template.mostrarLogoCentro === true,
            onInsert: () =>
              setTemplate((prev) => ({ ...prev, mostrarLogoCentro: true })),
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
                localEmissao: prev.localEmissao?.trim() || 'Rio de Janeiro - RJ',
                dataEmissaoExtenso:
                  prev.dataEmissaoExtenso?.trim() || 'Em 26 de novembro de 2026',
              })),
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
            onRemove: () =>
              setTemplate((prev) => ({ ...prev, mostrarLogoEsquerdaVerso: false })),
          },
          {
            id: 'brasaoCentroVerso',
            label: 'Brasão Centro (Verso)',
            isVisible: template.mostrarLogoCentroVerso === true,
            onInsert: () =>
              setTemplate((prev) => ({ ...prev, mostrarLogoCentroVerso: true })),
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

  const renderFontSizeStepper = (
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    onChange: (next: number) => void
  ) => (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] font-bold text-slate-700">
        <span>{label}</span>
        <span className="font-mono text-blue-900">
          {value}px ({pxToPtNumber(value)}pt)
        </span>
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
          value={value}
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

  const renderPropertiesBody = () => {
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
            6,
            64,
            0.5,
            (next) =>
              updateCustomBox(activeCustomBox.id, (b) => ({ ...b, tamanhoFontePx: next }))
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
            10,
            60,
            1,
            (next) => setTemplate((prev) => ({ ...prev, tamanhoFonteTitulo: next }))
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
            8,
            32,
            0.5,
            (next) => setTemplate((prev) => ({ ...prev, tamanhoFonteCorpo: next }))
          )}

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
            template.tamanhoFonteData ?? Math.max(8, (template.tamanhoFonteCorpo || 19) - 2),
            8,
            28,
            0.5,
            (next) => setTemplate((prev) => ({ ...prev, tamanhoFonteData: next }))
          )}

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
            7,
            24,
            0.5,
            (next) => setTemplate((prev) => ({ ...prev, tamanhoFonteAssinaturaNome: next }))
          )}
          {renderFontSizeStepper(
            'Tamanho Cargo/Função',
            template.tamanhoFonteAssinaturaCargo ?? 12.5,
            6,
            20,
            0.5,
            (next) => setTemplate((prev) => ({ ...prev, tamanhoFonteAssinaturaCargo: next }))
          )}

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
            template.versoTamanhoFonteTitulo ?? 18,
            10,
            36,
            0.5,
            (next) => setTemplate((prev) => ({ ...prev, versoTamanhoFonteTitulo: next }))
          )}

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
            'Tamanho Disciplinas',
            template.versoTamanhoFonteDisciplinas ?? 11.5,
            7,
            18,
            0.5,
            (next) => setTemplate((prev) => ({ ...prev, versoTamanhoFonteDisciplinas: next }))
          )}
          {renderFontSizeStepper(
            'Tamanho Notas / Horas',
            template.versoTamanhoFonteNumeros ?? 11.5,
            7,
            18,
            0.5,
            (next) => setTemplate((prev) => ({ ...prev, versoTamanhoFonteNumeros: next }))
          )}

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

    // 8. Crests / Watermarks / Frames quick remove & properties
    const matchedToggle = sideToggleItems.find((i) => i.id === activeTarget);
    const isLibraryAsset =
      activeTarget.startsWith('brasao') ||
      activeTarget.startsWith('marcaDagua') ||
      activeTarget === 'molduraFrente' ||
      activeTarget === 'versoMoldura';

    return (
      <div className="space-y-2.5">
        {(activeTarget === 'molduraFrente' || activeTarget === 'versoMoldura') && (
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-slate-600">
              Cor da Moldura / Borda
            </label>
            <div className="flex items-center gap-2">
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
                className="w-8 h-8 rounded border border-slate-200 cursor-pointer bg-white p-0.5"
              />
              <span className="text-[11px] font-semibold text-slate-600">
                Ajuste completo disponível no painel lateral.
              </span>
            </div>
          </div>
        )}

        {(activeTarget === 'marcaDaguaFrente' || activeTarget === 'marcaDaguaVerso') && (
          <div className="space-y-2">
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
            {renderLayerStepper(
              activeTarget === 'marcaDaguaFrente' ? 'marcaDaguaFrente' : 'marcaDaguaVerso'
            )}
          </div>
        )}

        {isLibraryAsset && onOpenLibrary && (
          <button
            type="button"
            onClick={() => {
              const cat: CertificateAssetCategory = activeTarget.startsWith('brasao')
                ? 'brasao'
                : activeTarget.startsWith('marcaDagua')
                  ? 'marca_dagua'
                  : 'moldura';
              onOpenLibrary(cat);
              onClose();
            }}
            className="w-full py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-900 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <FolderOpen size={12} />
            <span>Trocar Imagem na Biblioteca</span>
          </button>
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
        maxHeight: 'min(540px, 84vh)',
        zIndex: 9999,
      }}
      className="print:hidden rounded-2xl bg-white border border-slate-300 shadow-[0_20px_50px_rgba(15,23,42,0.28)] flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="px-3.5 py-2.5 bg-slate-900 text-white flex items-center justify-between gap-2 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.2 rounded bg-blue-600 text-[9px] font-black uppercase tracking-wider shrink-0">
              {side === 'front' ? 'Frente' : 'Verso'}
            </span>
            <h4 className="text-xs font-bold truncate">
              {getTargetLabel(activeTarget, side, clickContext.clickedEmptyArea && activeTarget === clickContext.targetObject)}
            </h4>
          </div>
          <p className="text-[9px] text-slate-400 truncate mt-0.5">
            Clique esq.: inserir/editar • Clique dir.: selecionar
          </p>
        </div>
        <button
          type="button"
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
            {/* Primary Action: Insert Free Text Box Right Here */}
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
              className="w-full py-2 px-3 rounded-xl bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-colors"
            >
              <Type size={13} />
              <span>+ Inserir Caixa de Texto aqui</span>
            </button>

            {/* Standard Elements Insert / Remove */}
            <div className="space-y-1.5">
              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                Itens da {side === 'front' ? 'Frente' : 'Verso'}
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
                        }
                        setActiveTarget(item.id);
                        onSelectObject(item.id);
                        setMenuTab('props');
                      }}
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
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTarget(item.id);
                              onSelectObject(item.id);
                              setMenuTab('props');
                            }}
                            className="p-1 rounded bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-900 cursor-pointer"
                            title="Editar propriedades"
                          >
                            <Pencil size={10} />
                          </button>
                          <button
                            type="button"
                            onClick={item.onRemove}
                            className="px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                            title={`Remover ${item.label}`}
                          >
                            <Trash2 size={10} />
                            <span>Apagar</span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            item.onInsert();
                            setActiveTarget(item.id);
                            onSelectObject(item.id);
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
