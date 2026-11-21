'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  getCachedTransparentFrameSrc,
  makeFrameCenterTransparent,
} from '@/lib/certificateImageUtils';
import {
  CertificateSelectableObject,
  CertificateStudentContext,
  CertificateTemplateConfig,
  adaptPortugueseStudentArticle,
  computeBackTotals,
  formatCourseTitleCasePT,
  formatNameTitleCasePT,
  groupCertificateRowsByModule,
  isFemaleStudentGenero,
  resolveCertificateBodySegments,
  resolveCertificateFontCss,
  resolveSimplePlaceholders,
} from '@/lib/certificateTypes';

export type DraggableCertificateElement =
  | 'logoEsquerda'
  | 'logoCentro'
  | 'logoDireita'
  | 'titulo'
  | 'texto'
  | 'data'
  | 'assinaturaPrincipal'
  | 'segundaAssinatura';

interface SheetBox {
  element: DraggableCertificateElement;
  label: string;
  left: number;
  right: number;
  centerX: number;
  top: number;
  bottom: number;
  centerY: number;
}

interface HorizontalAlignmentGuide {
  id: string;
  y: number;
  x1: number;
  x2: number;
  variant: 'aligned' | 'reference' | 'current';
  label?: string;
}

interface VerticalAlignmentGuide {
  id: string;
  x: number;
  y1: number;
  y2: number;
  label?: string;
}

interface CertificateSheetProps {
  template: CertificateTemplateConfig;
  student: CertificateStudentContext;
  side: 'front' | 'back';
  elementId?: string;
  scale?: number;
  interactiveDrag?: boolean;
  selectedObject?: CertificateSelectableObject | null;
  onSelectObject?: (obj: CertificateSelectableObject) => void;
  onUpdateTemplate?: (
    updater: (prev: CertificateTemplateConfig) => CertificateTemplateConfig
  ) => void;
}

function MarinhaBrasilCrest({
  customUrl,
  label = 'MARINHA DO BRASIL',
  compact = false,
  size,
  opacity = 1,
}: {
  customUrl?: string;
  label?: string;
  compact?: boolean;
  size?: number;
  opacity?: number;
}) {
  const resolvedSize = size ?? (compact ? 54 : 74);
  const labelFontSize = compact
    ? '9px'
    : `${Math.max(9, Math.min(16, Math.round(resolvedSize * 0.148)))}px`;
  const maxLabelWidth = compact ? '95px' : `${Math.max(110, Math.round(resolvedSize * 1.48))}px`;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: compact ? '3px' : '5px',
        opacity,
      }}
    >
      {customUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolveAssetCacheSrc(customUrl)}
          alt={label || 'Brasão Marinha do Brasil'}
          crossOrigin="anonymous"
          draggable={false}
          style={{
            width: `${resolvedSize}px`,
            height: `${resolvedSize}px`,
            objectFit: 'contain',
          }}
        />
      ) : (
        <svg
          width={resolvedSize}
          height={resolvedSize}
          viewBox="0 0 120 120"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Brasão Marinha do Brasil"
        >
          {/* Outer silver/gold naval rim */}
          <circle cx="60" cy="60" r="56" fill="#07224d" stroke="#d4af37" strokeWidth="4" />
          {/* Inner green & yellow national ring accent */}
          <circle cx="60" cy="60" r="46" fill="none" stroke="#16a34a" strokeWidth="5" />
          <circle cx="60" cy="60" r="40" fill="#082454" stroke="#facc15" strokeWidth="2.5" />
          {/* Rope inner ring */}
          <circle
            cx="60"
            cy="60"
            r="35"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="1.2"
            strokeDasharray="3 2"
          />
          {/* Anchor */}
          <circle cx="60" cy="30" r="5.5" fill="none" stroke="#ffffff" strokeWidth="3" />
          <line x1="60" y1="35.5" x2="60" y2="85" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
          <line x1="45" y1="45" x2="75" y2="45" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
          <path
            d="M36 68 C36 86 60 92 60 92 C60 92 84 86 84 68"
            fill="none"
            stroke="#ffffff"
            strokeWidth="5"
            strokeLinecap="round"
          />
          {/* Anchor flukes */}
          <polygon points="32,69 40,62 42,72" fill="#ffffff" />
          <polygon points="88,69 80,62 78,72" fill="#ffffff" />
          {/* Crossed laurel/stars */}
          <circle cx="38" cy="40" r="1.8" fill="#facc15" />
          <circle cx="82" cy="40" r="1.8" fill="#facc15" />
          <circle cx="60" cy="20" r="2" fill="#facc15" />
        </svg>
      )}
      {label && (
        <div
          style={{
            fontSize: labelFontSize,
            fontWeight: 500,
            letterSpacing: '0.04em',
            color: '#162d4c',
            fontFamily: '"Segoe UI", system-ui, -apple-system, Arial, sans-serif',
            textAlign: 'center',
            lineHeight: 1.2,
            maxWidth: maxLabelWidth,
          }}
        >
          {label.split(' ').length > 2 ? (
            <>
              <div>{label.split(' ')[0]}</div>
              <div>{label.split(' ').slice(1).join(' ')}</div>
            </>
          ) : (
            label
          )}
        </div>
      )}
    </div>
  );
}

function NauticalOrnateFrame({ borderColor = '#52525b' }: { borderColor?: string }) {
  return (
    <svg
      viewBox="0 0 1123 794"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      <defs>
        <pattern
          id="nautical-rope-h"
          width="24"
          height="14"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M0 7 Q6 1 12 7 T24 7"
            fill="none"
            stroke={borderColor}
            strokeWidth="2.6"
          />
          <path
            d="M0 7 Q6 13 12 7 T24 7"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1.6"
          />
        </pattern>
        <pattern
          id="nautical-rope-v"
          width="14"
          height="24"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M7 0 Q1 6 7 12 T7 24"
            fill="none"
            stroke={borderColor}
            strokeWidth="2.6"
          />
          <path
            d="M7 0 Q13 6 7 12 T7 24"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1.6"
          />
        </pattern>
        <g id="corner-ornament">
          <path
            d="M14 14 L120 14 L120 26 L44 26 L26 44 L26 120 L14 120 Z"
            fill="#e2e8f0"
            stroke={borderColor}
            strokeWidth="2"
          />
          <path
            d="M24 24 C45 24, 52 38, 72 34 C86 31, 96 20, 110 24 M24 24 C24 45, 38 52, 34 72 C31 86, 20 96, 24 110"
            fill="none"
            stroke={borderColor}
            strokeWidth="2.2"
          />
          <circle cx="38" cy="38" r="10" fill="#f8fafc" stroke={borderColor} strokeWidth="2" />
          <circle cx="38" cy="38" r="4" fill={borderColor} />
          <path
            d="M52 28 Q64 40 52 52 Q40 40 52 28 Z"
            fill="#cbd5e1"
            stroke={borderColor}
            strokeWidth="1.4"
          />
          <path
            d="M28 52 Q40 64 52 52 Q40 40 28 52 Z"
            fill="#cbd5e1"
            stroke={borderColor}
            strokeWidth="1.4"
          />
        </g>
      </defs>

      {/* Outer classic frame */}
      <rect
        x="14"
        y="14"
        width="1095"
        height="766"
        fill="none"
        stroke={borderColor}
        strokeWidth="4"
      />
      <rect
        x="22"
        y="22"
        width="1079"
        height="750"
        fill="none"
        stroke="#94a3b8"
        strokeWidth="1.5"
      />

      {/* Braided rope bands */}
      <rect x="40" y="28" width="1043" height="14" fill="url(#nautical-rope-h)" />
      <rect x="40" y="752" width="1043" height="14" fill="url(#nautical-rope-h)" />
      <rect x="28" y="40" width="14" height="714" fill="url(#nautical-rope-v)" />
      <rect x="1081" y="40" width="14" height="714" fill="url(#nautical-rope-v)" />

      {/* Inner hairline border */}
      <rect
        x="48"
        y="48"
        width="1027"
        height="698"
        fill="none"
        stroke={borderColor}
        strokeWidth="2"
      />
      <rect
        x="54"
        y="54"
        width="1015"
        height="686"
        fill="none"
        stroke="#cbd5e1"
        strokeWidth="1"
      />

      {/* Four ornate corners */}
      <use href="#corner-ornament" x="0" y="0" />
      <use href="#corner-ornament" x="0" y="0" transform="translate(1123, 0) scale(-1, 1)" />
      <use href="#corner-ornament" x="0" y="0" transform="translate(0, 794) scale(1, -1)" />
      <use href="#corner-ornament" x="0" y="0" transform="translate(1123, 794) scale(-1, -1)" />

      {/* Classic Bottom Center Nautical Knot */}
      <g transform="translate(561.5, 756)">
        <ellipse cx="0" cy="0" rx="52" ry="20" fill="#f8fafc" stroke={borderColor} strokeWidth="2.5" />
        <path
          d="M-38 0 C-26 -16, -6 -16, 0 0 C6 16, 26 16, 38 0 C26 -16, 6 -16, 0 0 C-6 16, -26 16, -38 0 Z"
          fill="#e2e8f0"
          stroke={borderColor}
          strokeWidth="3.2"
          strokeLinejoin="round"
        />
        <path
          d="M-22 -8 Q0 12 22 -8 M-22 8 Q0 -12 22 8"
          fill="none"
          stroke="#64748b"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

function resolveAssetCacheSrc(url: string | undefined): string {
  if (!url) return '';
  if (url === '/assets/certificado-moldura-frente.png') {
    return '/assets/certificado-moldura-frente.png?v=hd3';
  }
  if (url === '/assets/aistudio/imagem_01_2da3aec8.png') {
    return '/assets/aistudio/imagem_01_2da3aec8.png?v=clean2';
  }
  if (url === '/assets/aistudio/WhatsApp_Image_2026-02-11_at_22.02.18_8edf921e.jpeg') {
    return '/assets/aistudio/WhatsApp_Image_2026-02-11_at_22.02.18_8edf921e.jpeg?v=clean2';
  }
  return url;
}

export function CertificateSheet({
  template,
  student,
  side,
  elementId,
  scale = 1,
  interactiveDrag = false,
  selectedObject = null,
  onSelectObject,
  onUpdateTemplate,
}: CertificateSheetProps) {
  const frontSheetRef = useRef<HTMLDivElement | null>(null);
  const elementRefs = useRef<Partial<Record<DraggableCertificateElement, HTMLElement | null>>>({});
  const sliderGuideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevOffsetsOnlySigRef = useRef<string | null>(null);

  const dragRef = useRef<{
    element: DraggableCertificateElement;
    startClientX: number;
    startClientY: number;
    origX: number;
    origY: number;
    origBox: SheetBox | null;
    siblingBoxes: SheetBox[];
  } | null>(null);
  const [activeDrag, setActiveDrag] = useState<DraggableCertificateElement | null>(null);
  const [hoveredObject, setHoveredObject] = useState<CertificateSelectableObject | null>(null);
  const [transparentFrameMap, setTransparentFrameMap] = useState<Record<string, string>>({});
  const [alignmentGuides, setAlignmentGuides] = useState<{
    horizontal: HorizontalAlignmentGuide[];
    vertical: VerticalAlignmentGuide[];
  }>({ horizontal: [], vertical: [] });

  const rawFrontFrameSrc = resolveAssetCacheSrc(
    template.molduraFrenteUrl || '/assets/certificado-moldura-frente.png'
  );
  const resolvedFrontFrameStyle =
    template.estiloMolduraFrente ??
    (template.usarMolduraOriginal !== false ? 'original' : 'vetorial');
  const shouldProcessFrontFrame = side === 'front' && resolvedFrontFrameStyle === 'original';

  useEffect(() => {
    if (!shouldProcessFrontFrame || !rawFrontFrameSrc) return;
    if (getCachedTransparentFrameSrc(rawFrontFrameSrc)) return;
    let active = true;
    void makeFrameCenterTransparent(rawFrontFrameSrc).then((processed) => {
      if (!active || !processed || processed === rawFrontFrameSrc) return;
      setTransparentFrameMap((prev) =>
        prev[rawFrontFrameSrc] === processed ? prev : { ...prev, [rawFrontFrameSrc]: processed }
      );
    });
    return () => {
      active = false;
    };
  }, [shouldProcessFrontFrame, rawFrontFrameSrc]);

  const effectiveFrontFrameSrc =
    getCachedTransparentFrameSrc(rawFrontFrameSrc) ||
    transparentFrameMap[rawFrontFrameSrc] ||
    rawFrontFrameSrc;

  const dragToSelectMap: Record<DraggableCertificateElement, CertificateSelectableObject> = {
    logoEsquerda: 'brasaoEsquerdo',
    logoCentro: 'brasaoCentro',
    logoDireita: 'brasaoDireito',
    titulo: 'titulo',
    texto: 'texto',
    data: 'data',
    assinaturaPrincipal: 'assinaturaPrincipal',
    segundaAssinatura: 'segundaAssinatura',
  };

  const selectToDragMap: Partial<Record<CertificateSelectableObject, DraggableCertificateElement>> = {
    brasaoEsquerdo: 'logoEsquerda',
    brasaoCentro: 'logoCentro',
    brasaoDireito: 'logoDireita',
    titulo: 'titulo',
    texto: 'texto',
    data: 'data',
    assinaturaPrincipal: 'assinaturaPrincipal',
    segundaAssinatura: 'segundaAssinatura',
  };

  const elementLabels: Record<DraggableCertificateElement, string> = {
    logoEsquerda: 'Brasão Esquerdo',
    logoCentro: 'Brasão Central',
    logoDireita: 'Brasão Direito',
    titulo: 'Título',
    texto: 'Texto',
    data: 'Data',
    assinaturaPrincipal: 'Assinatura Principal',
    segundaAssinatura: '2ª Assinatura',
  };

  const elementBounds: Record<
    DraggableCertificateElement,
    { minX: number; maxX: number; minY: number; maxY: number }
  > = {
    logoEsquerda: { minX: -90, maxX: 760, minY: -60, maxY: 520 },
    logoCentro: { minX: -420, maxX: 420, minY: -110, maxY: 640 },
    logoDireita: { minX: -760, maxX: 90, minY: -60, maxY: 520 },
    titulo: { minX: -350, maxX: 350, minY: -200, maxY: 260 },
    texto: { minX: -150, maxX: 150, minY: -180, maxY: 200 },
    data: { minX: -380, maxX: 380, minY: -220, maxY: 240 },
    assinaturaPrincipal: { minX: -380, maxX: 380, minY: -220, maxY: 60 },
    segundaAssinatura: { minX: -380, maxX: 380, minY: -220, maxY: 60 },
  };

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  const measureSheetBoxes = (): Partial<Record<DraggableCertificateElement, SheetBox>> => {
    const sheetEl = frontSheetRef.current;
    if (!sheetEl) return {};
    const sheetRect = sheetEl.getBoundingClientRect();
    const actualScale = sheetRect.width > 0 ? sheetRect.width / 1123 : scale || 1;
    const out: Partial<Record<DraggableCertificateElement, SheetBox>> = {};
    (Object.keys(elementLabels) as DraggableCertificateElement[]).forEach((key) => {
      const el = elementRefs.current[key];
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      const left = (r.left - sheetRect.left) / actualScale;
      const right = (r.right - sheetRect.left) / actualScale;
      const top = (r.top - sheetRect.top) / actualScale;
      const bottom = (r.bottom - sheetRect.top) / actualScale;
      out[key] = {
        element: key,
        label: elementLabels[key],
        left,
        right,
        centerX: (left + right) / 2,
        top,
        bottom,
        centerY: (top + bottom) / 2,
      };
    });
    return out;
  };

  const computeGuidesForBox = (
    activeBox: SheetBox,
    siblings: SheetBox[]
  ): { horizontal: HorizontalAlignmentGuide[]; vertical: VerticalAlignmentGuide[] } => {
    const horizontal: HorizontalAlignmentGuide[] = [];
    const vertical: VerticalAlignmentGuide[] = [];
    const ALIGN_TOL = 2.0;

    let hasAnyAlignedHoriz = false;

    for (const sib of siblings) {
      const isBesideHoriz = sib.right < activeBox.left + 12 || sib.left > activeBox.right - 12;
      const dyCenter = Math.abs(activeBox.centerY - sib.centerY);
      const dyTop = Math.abs(activeBox.top - sib.top);
      const dyBottom = Math.abs(activeBox.bottom - sib.bottom);

      let matchedAxisY: number | null = null;
      let axisLabel = '';
      if (dyCenter <= ALIGN_TOL) {
        matchedAxisY = sib.centerY;
        axisLabel = 'Mesma altura (Centro)';
      } else if (dyTop <= ALIGN_TOL) {
        matchedAxisY = sib.top;
        axisLabel = 'Alinhado pelo topo';
      } else if (dyBottom <= ALIGN_TOL) {
        matchedAxisY = sib.bottom;
        axisLabel = 'Alinhado pela base';
      }

      const spanX1 = Math.max(20, Math.min(activeBox.left, sib.left) - 20);
      const spanX2 = Math.min(1103, Math.max(activeBox.right, sib.right) + 20);

      if (matchedAxisY !== null) {
        hasAnyAlignedHoriz = true;
        horizontal.push({
          id: `aligned-${sib.element}`,
          y: matchedAxisY,
          x1: spanX1,
          x2: spanX2,
          variant: 'aligned',
          label: `${axisLabel} ✓`,
        });
      } else if (isBesideHoriz && dyCenter <= 220) {
        const diffPx = Math.round(Math.abs(activeBox.centerY - sib.centerY));
        const dirArrow = activeBox.centerY < sib.centerY ? '↓' : '↑';
        horizontal.push({
          id: `ref-${sib.element}`,
          y: sib.centerY,
          x1: spanX1,
          x2: spanX2,
          variant: 'reference',
          label: `Altura ${sib.label}`,
        });
        horizontal.push({
          id: `curr-${sib.element}`,
          y: activeBox.centerY,
          x1: Math.max(20, activeBox.left - 14),
          x2: Math.min(1103, activeBox.right + 14),
          variant: 'current',
          label: `Desalinhado ${dirArrow} ${diffPx}px`,
        });
      }

      // Vertical alignment against siblings (centerX, left, right)
      const dxCenter = Math.abs(activeBox.centerX - sib.centerX);
      const dxLeft = Math.abs(activeBox.left - sib.left);
      const dxRight = Math.abs(activeBox.right - sib.right);
      const spanY1 = Math.max(20, Math.min(activeBox.top, sib.top) - 16);
      const spanY2 = Math.min(774, Math.max(activeBox.bottom, sib.bottom) + 16);

      if (dxCenter <= ALIGN_TOL) {
        vertical.push({
          id: `vcenter-${sib.element}`,
          x: sib.centerX,
          y1: spanY1,
          y2: spanY2,
          label: 'Centro alinhado',
        });
      } else if (!isBesideHoriz && dxLeft <= ALIGN_TOL) {
        vertical.push({
          id: `vleft-${sib.element}`,
          x: sib.left,
          y1: spanY1,
          y2: spanY2,
        });
      } else if (!isBesideHoriz && dxRight <= ALIGN_TOL) {
        vertical.push({
          id: `vright-${sib.element}`,
          x: sib.right,
          y1: spanY1,
          y2: spanY2,
        });
      }
    }

    // Sheet horizontal center guide
    if (Math.abs(activeBox.centerX - 561.5) <= ALIGN_TOL) {
      vertical.push({
        id: 'v-sheet-center',
        x: 561.5,
        y1: 24,
        y2: 770,
        label: 'Centro da folha',
      });
    }

    // Deduplicate overlapping current guides if multiple neighbors exist
    const dedupedHoriz: HorizontalAlignmentGuide[] = [];
    let addedCurrent = false;
    for (const g of horizontal) {
      if (g.variant === 'current') {
        if (hasAnyAlignedHoriz || addedCurrent) continue;
        addedCurrent = true;
      }
      dedupedHoriz.push(g);
    }

    return { horizontal: dedupedHoriz, vertical };
  };

  const offsetsOnlySig = `${template.logoEsquerdaOffsetX ?? 0},${template.logoEsquerdaOffsetY ?? 0}|${template.logoCentroOffsetX ?? 0},${template.logoCentroOffsetY ?? 0}|${template.logoDireitaOffsetX ?? 0},${template.logoDireitaOffsetY ?? 0}|${template.tituloOffsetX ?? 0},${template.tituloOffsetY ?? 0}|${template.textoOffsetX ?? 0},${template.textoOffsetY ?? 0}|${template.dataOffsetX ?? 0},${template.dataOffsetY ?? 0}|${template.assinaturaPrincipalOffsetX ?? 0},${template.assinaturaPrincipalOffsetY ?? 0}|${template.segundaAssinaturaOffsetX ?? 0},${template.segundaAssinaturaOffsetY ?? 0}|${template.assinaturaAlturaOffset ?? 0}`;
  const isInteractiveSheet = side === 'front' && Boolean(onSelectObject);

  useEffect(() => {
    if (!isInteractiveSheet) {
      prevOffsetsOnlySigRef.current = offsetsOnlySig;
      return;
    }
    if (prevOffsetsOnlySigRef.current === null) {
      prevOffsetsOnlySigRef.current = offsetsOnlySig;
      return;
    }
    if (prevOffsetsOnlySigRef.current === offsetsOnlySig) {
      return;
    }
    prevOffsetsOnlySigRef.current = offsetsOnlySig;

    if (activeDrag) return;
    const activeEl = selectedObject ? selectToDragMap[selectedObject] : undefined;
    if (!activeEl) return;

    const boxes = measureSheetBoxes();
    const activeBox = boxes[activeEl];
    if (!activeBox) return;
    const siblings = (Object.values(boxes) as SheetBox[]).filter((b) => b.element !== activeEl);
    const guides = computeGuidesForBox(activeBox, siblings);
    setAlignmentGuides(guides);

    if (sliderGuideTimerRef.current) {
      clearTimeout(sliderGuideTimerRef.current);
    }
    sliderGuideTimerRef.current = setTimeout(() => {
      setAlignmentGuides({ horizontal: [], vertical: [] });
      sliderGuideTimerRef.current = null;
    }, 1600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offsetsOnlySig, isInteractiveSheet, activeDrag, selectedObject]);

  useEffect(() => {
    return () => {
      if (sliderGuideTimerRef.current) {
        clearTimeout(sliderGuideTimerRef.current);
      }
    };
  }, []);

  const handleDragPointerDown = (
    element: DraggableCertificateElement,
    e: React.PointerEvent<HTMLElement>
  ) => {
    onSelectObject?.(dragToSelectMap[element]);
    if (!interactiveDrag || !onUpdateTemplate || side !== 'front') return;
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore if capture unavailable
    }

    let origX = 0;
    let origY = 0;
    if (element === 'logoEsquerda') {
      origX = template.logoEsquerdaOffsetX ?? 0;
      origY = template.logoEsquerdaOffsetY ?? 0;
    } else if (element === 'logoCentro') {
      origX = template.logoCentroOffsetX ?? 0;
      origY = template.logoCentroOffsetY ?? 0;
    } else if (element === 'logoDireita') {
      origX = template.logoDireitaOffsetX ?? 0;
      origY = template.logoDireitaOffsetY ?? 0;
    } else if (element === 'titulo') {
      origX = template.tituloOffsetX ?? 0;
      origY = template.tituloOffsetY ?? 0;
    } else if (element === 'texto') {
      origX = template.textoOffsetX ?? 0;
      origY = template.textoOffsetY ?? 0;
    } else if (element === 'data') {
      origX = template.dataOffsetX ?? 0;
      origY = template.dataOffsetY ?? 0;
    } else if (element === 'assinaturaPrincipal') {
      origX = template.assinaturaPrincipalOffsetX ?? 0;
      origY = template.assinaturaPrincipalOffsetY ?? 0;
    } else if (element === 'segundaAssinatura') {
      origX = template.segundaAssinaturaOffsetX ?? 0;
      origY = template.segundaAssinaturaOffsetY ?? 0;
    }

    const boxes = measureSheetBoxes();
    const origBox = boxes[element] ?? null;
    const siblingBoxes = (Object.values(boxes) as SheetBox[]).filter(
      (b) => b.element !== element
    );

    if (sliderGuideTimerRef.current) {
      clearTimeout(sliderGuideTimerRef.current);
      sliderGuideTimerRef.current = null;
    }

    dragRef.current = {
      element,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origX,
      origY,
      origBox,
      siblingBoxes,
    };
    setActiveDrag(element);
    if (origBox) {
      setAlignmentGuides(computeGuidesForBox(origBox, siblingBoxes));
    }
  };

  const handleDragPointerMove = (
    element: DraggableCertificateElement,
    e: React.PointerEvent<HTMLElement>
  ) => {
    if (!interactiveDrag || !onUpdateTemplate || !dragRef.current) return;
    if (dragRef.current.element !== element) return;

    const effectiveScale = scale > 0 ? scale : 1;
    const dx = Math.round((e.clientX - dragRef.current.startClientX) / effectiveScale);
    const dy = Math.round((e.clientY - dragRef.current.startClientY) / effectiveScale);
    const b = elementBounds[element];
    let nextX = clamp(dragRef.current.origX + dx, b.minX, b.maxX);
    let nextY = clamp(dragRef.current.origY + dy, b.minY, b.maxY);

    const { origBox, siblingBoxes, origX, origY } = dragRef.current;
    if (origBox) {
      const shiftX = nextX - origX;
      const shiftY = nextY - origY;
      const predTop = origBox.top + shiftY;
      const predCenterY = origBox.centerY + shiftY;
      const predBottom = origBox.bottom + shiftY;
      const predLeft = origBox.left + shiftX;
      const predCenterX = origBox.centerX + shiftX;
      const predRight = origBox.right + shiftX;

      const SNAP_DIST = 4;
      let bestDeltaY: number | null = null;
      let bestAbsY = SNAP_DIST + 0.01;

      let bestDeltaX: number | null = null;
      let bestAbsX = SNAP_DIST + 0.01;

      for (const sib of siblingBoxes) {
        const yCandidates = [
          sib.centerY - predCenterY,
          sib.top - predTop,
          sib.bottom - predBottom,
        ];
        for (const dY of yCandidates) {
          if (Math.abs(dY) < bestAbsY) {
            bestAbsY = Math.abs(dY);
            bestDeltaY = dY;
          }
        }

        const isBesideHoriz = sib.right < predLeft + 12 || sib.left > predRight - 12;
        const xCandidates = isBesideHoriz
          ? [sib.centerX - predCenterX]
          : [sib.centerX - predCenterX, sib.left - predLeft, sib.right - predRight];
        for (const dX of xCandidates) {
          if (Math.abs(dX) < bestAbsX) {
            bestAbsX = Math.abs(dX);
            bestDeltaX = dX;
          }
        }
      }

      const sheetCenterDx = 561.5 - predCenterX;
      if (Math.abs(sheetCenterDx) < bestAbsX) {
        bestAbsX = Math.abs(sheetCenterDx);
        bestDeltaX = sheetCenterDx;
      }

      if (bestDeltaY !== null) {
        nextY = clamp(Math.round(nextY + bestDeltaY), b.minY, b.maxY);
      }
      if (bestDeltaX !== null) {
        nextX = clamp(Math.round(nextX + bestDeltaX), b.minX, b.maxX);
      }

      const finalShiftX = nextX - origX;
      const finalShiftY = nextY - origY;
      const currentBox: SheetBox = {
        ...origBox,
        left: origBox.left + finalShiftX,
        right: origBox.right + finalShiftX,
        centerX: origBox.centerX + finalShiftX,
        top: origBox.top + finalShiftY,
        bottom: origBox.bottom + finalShiftY,
        centerY: origBox.centerY + finalShiftY,
      };
      setAlignmentGuides(computeGuidesForBox(currentBox, siblingBoxes));
    }

    onUpdateTemplate((prev) => {
      if (element === 'logoEsquerda') {
        return {
          ...prev,
          logoEsquerdaOffsetX: nextX,
          logoEsquerdaOffsetY: nextY,
        };
      }
      if (element === 'logoCentro') {
        return {
          ...prev,
          logoCentroOffsetX: nextX,
          logoCentroOffsetY: nextY,
        };
      }
      if (element === 'logoDireita') {
        return {
          ...prev,
          logoDireitaOffsetX: nextX,
          logoDireitaOffsetY: nextY,
        };
      }
      if (element === 'titulo') {
        return {
          ...prev,
          tituloOffsetX: nextX,
          tituloOffsetY: nextY,
        };
      }
      if (element === 'texto') {
        return {
          ...prev,
          textoOffsetX: nextX,
          textoOffsetY: nextY,
        };
      }
      if (element === 'data') {
        return {
          ...prev,
          dataOffsetX: nextX,
          dataOffsetY: nextY,
        };
      }
      if (element === 'assinaturaPrincipal') {
        return {
          ...prev,
          assinaturaPrincipalOffsetX: nextX,
          assinaturaPrincipalOffsetY: nextY,
        };
      }
      if (element === 'segundaAssinatura') {
        return {
          ...prev,
          segundaAssinaturaOffsetX: nextX,
          segundaAssinaturaOffsetY: nextY,
        };
      }
      return prev;
    });
  };

  const handleDragPointerEnd = (e: React.PointerEvent<HTMLElement>) => {
    if (!dragRef.current) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    dragRef.current = null;
    setActiveDrag(null);
    setAlignmentGuides({ horizontal: [], vertical: [] });
  };

  const getDragProps = (
    element: DraggableCertificateElement,
    label: string
  ): React.HTMLAttributes<HTMLElement> & {
    style?: React.CSSProperties;
    ref?: (el: HTMLElement | null) => void;
  } => {
    const selectKey = dragToSelectMap[element];
    const canDrag = interactiveDrag && side === 'front';
    const canSelect = Boolean(onSelectObject);
    const refProp =
      side === 'front' && canSelect
        ? {
            ref: (el: HTMLElement | null) => {
              elementRefs.current[element] = el;
            },
          }
        : {};
    if (!canDrag && !canSelect) return {};
    const isDragging = canDrag && activeDrag === element;
    const isSelected = canSelect && selectedObject === selectKey;
    const isHovered = canSelect && hoveredObject === selectKey;
    return {
      ...refProp,
      title: canDrag
        ? `Clique para editar ou arraste: ${label}`
        : `Clique para editar: ${label}`,
      onClick: canSelect
        ? (e) => {
            e.stopPropagation();
            onSelectObject?.(selectKey);
          }
        : undefined,
      onMouseEnter: canSelect
        ? (e) => {
            e.stopPropagation();
            setHoveredObject(selectKey);
          }
        : undefined,
      onMouseLeave: canSelect
        ? () => {
            setHoveredObject((prev) => (prev === selectKey ? null : prev));
          }
        : undefined,
      ...(canDrag
        ? {
            onPointerDown: (e: React.PointerEvent<HTMLElement>) =>
              handleDragPointerDown(element, e),
            onPointerMove: (e: React.PointerEvent<HTMLElement>) =>
              handleDragPointerMove(element, e),
            onPointerUp: handleDragPointerEnd,
            onPointerCancel: handleDragPointerEnd,
          }
        : {}),
      style: {
        cursor: canDrag ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
        ...(canDrag ? { userSelect: 'none', touchAction: 'none' } : {}),
        outline: isDragging
          ? '2.5px solid #1d4ed8'
          : isSelected
            ? '2.5px solid #2563eb'
            : isHovered
              ? '1.5px dashed rgba(37, 99, 235, 0.72)'
              : canDrag
                ? '1.5px dashed rgba(37, 99, 235, 0.42)'
                : undefined,
        outlineOffset: '5px',
        borderRadius: '6px',
      },
    };
  };

  const getSelectProps = (
    selectKey: CertificateSelectableObject,
    label: string
  ): React.HTMLAttributes<HTMLElement> & { style?: React.CSSProperties } => {
    if (!onSelectObject) return {};
    const isSelected = selectedObject === selectKey;
    const isHovered = hoveredObject === selectKey;
    return {
      title: `Clique para editar: ${label}`,
      onClick: (e) => {
        e.stopPropagation();
        onSelectObject(selectKey);
      },
      onMouseEnter: (e) => {
        e.stopPropagation();
        setHoveredObject(selectKey);
      },
      onMouseLeave: () => {
        setHoveredObject((prev) => (prev === selectKey ? null : prev));
      },
      style: {
        cursor: 'pointer',
        outline: isSelected
          ? '2.5px solid #2563eb'
          : isHovered
            ? '1.5px dashed rgba(37, 99, 235, 0.72)'
            : undefined,
        outlineOffset: '4px',
        borderRadius: '6px',
      },
    };
  };
  const rawEffectiveDisciplines =
    student.disciplinas && student.disciplinas.length > 0
      ? student.disciplinas
      : template.disciplinas;

  const shouldGroupByModule = template.agruparPorModulos !== false;
  const effectiveDisciplines = shouldGroupByModule
    ? groupCertificateRowsByModule(rawEffectiveDisciplines)
    : rawEffectiveDisciplines;

  const { totalHorasLabel, mediaFinalLabel } = computeBackTotals(
    effectiveDisciplines,
    template
  );

  const periodStart = student.dataInicioExtenso || template.textoPeriodoInicio;
  const periodEnd = student.dataFimExtenso || template.textoPeriodoFim;

  const rawCourseName = (student.cursoNome || 'Curso de Formação de Marinheiros').trim();
  const formattedBodyCourse = formatCourseTitleCasePT(rawCourseName);

  const rawStudentRank = (student.postoGraduacao || '').trim();
  const formattedStudentRank = rawStudentRank ? formatNameTitleCasePT(rawStudentRank) : '';
  const rawStudentFullName = (student.nomeCompleto || '').trim();
  const formattedStudentFullName = rawStudentFullName
    ? formatNameTitleCasePT(rawStudentFullName)
    : '';
  const rawStudentDisplay = (
    student.nomeExibicao ||
    (formattedStudentRank
      ? `${formattedStudentRank} ${formattedStudentFullName}`.trim()
      : formattedStudentFullName) ||
    'Aluno'
  ).trim();
  const formattedStudentDisplay =
    formattedStudentRank && formattedStudentFullName
      ? `${formattedStudentRank} ${formattedStudentFullName}`
      : formatNameTitleCasePT(rawStudentDisplay);

  const isFemaleStudent = isFemaleStudentGenero(student.genero);
  const articleBeforeRank = isFemaleStudent ? 'a' : 'ao';

  const replacements = {
    ALUNO: formattedStudentDisplay,
    POSTO_GRADUACAO: formattedStudentRank,
    NOME_COMPLETO: formattedStudentFullName,
    ARTIGO: articleBeforeRank,
    CURSO: formattedBodyCourse,
    TURMA: student.turmaNome || '',
    DATA_INICIO: periodStart,
    DATA_FIM: periodEnd,
    CARGA_HORARIA: totalHorasLabel,
    MEDIA_FINAL: mediaFinalLabel,
  };

  // Ensure literal all-caps copies of the course or student name in body text also use Title Case
  let normalizedBodyTemplate =
    (student.textoCorpoPersonalizado !== undefined
      ? student.textoCorpoPersonalizado
      : template.textoCorpo) || '';
  const upperCourseLiteral = rawCourseName.toLocaleUpperCase('pt-BR');
  if (
    upperCourseLiteral.length >= 6 &&
    upperCourseLiteral !== formattedBodyCourse &&
    normalizedBodyTemplate.includes(upperCourseLiteral)
  ) {
    normalizedBodyTemplate = normalizedBodyTemplate.replaceAll(
      upperCourseLiteral,
      formattedBodyCourse
    );
  }
  const upperDisplayLiteral = rawStudentDisplay.toLocaleUpperCase('pt-BR');
  if (
    upperDisplayLiteral.length >= 5 &&
    upperDisplayLiteral !== formattedStudentDisplay &&
    normalizedBodyTemplate.includes(upperDisplayLiteral)
  ) {
    normalizedBodyTemplate = normalizedBodyTemplate.replaceAll(
      upperDisplayLiteral,
      formattedStudentDisplay
    );
  }
  const upperFullNameLiteral = rawStudentFullName.toLocaleUpperCase('pt-BR');
  if (
    upperFullNameLiteral.length >= 5 &&
    upperFullNameLiteral !== formattedStudentFullName &&
    normalizedBodyTemplate.includes(upperFullNameLiteral)
  ) {
    normalizedBodyTemplate = normalizedBodyTemplate.replaceAll(
      upperFullNameLiteral,
      formattedStudentFullName
    );
  }

  normalizedBodyTemplate = adaptPortugueseStudentArticle(
    normalizedBodyTemplate,
    isFemaleStudent,
    formattedStudentRank
  );

  const baseBodyItalic =
    template.textoCorpoItalico ?? (template.fonteCorpo !== 'sans');
  const baseBodyBold = template.textoCorpoNegrito ?? false;

  const bodySegments = resolveCertificateBodySegments(
    normalizedBodyTemplate,
    replacements,
    {
      defaultBold: baseBodyBold,
      defaultItalic: baseBodyItalic,
    }
  );
  const isInteractiveEditor = Boolean(onSelectObject);
  const backTitleResolved = template.versoTituloCurso?.trim()
    ? resolveSimplePlaceholders(template.versoTituloCurso, {
        ...replacements,
        CURSO: rawCourseName.toLocaleUpperCase('pt-BR'),
      }).toLocaleUpperCase('pt-BR')
    : '';

  const bodyFontCss = resolveCertificateFontCss(template.fonteCorpo || 'garamond');
  const titleFontCss = resolveCertificateFontCss(
    template.fonteTitulo || template.fonteCorpo || 'garamond'
  );
  const signatureFontCss = resolveCertificateFontCss(
    template.fonteAssinatura || template.fonteCorpo || 'garamond'
  );
  const versoFontCss = resolveCertificateFontCss(template.fonteVerso || 'sans');

  const titleBold = template.tituloNegrito ?? true;
  const titleItalic = template.tituloItalico ?? true;
  const dateBold = template.dataNegrito ?? false;
  const dateItalic = template.dataItalico ?? baseBodyItalic;
  const sigBold = template.assinaturaNegrito ?? true;
  const sigItalic = template.assinaturaItalico ?? false;
  const showSignatureLine = template.mostrarLinhaAssinatura !== false;
  const sigLineOpacity = Math.max(
    0.04,
    Math.min(0.85, template.opacidadeLinhaAssinatura ?? 0.16)
  );
  const versoItalic = template.versoItalico ?? false;

  // Watermark sizes & expansion
  const frontWmBase = template.tamanhoMarcaDaguaFrente ?? 545;
  const frontWmScaleW = template.escalaLarguraMarcaDaguaFrente ?? 100;
  const frontWmScaleH = template.escalaAlturaMarcaDaguaFrente ?? 100;
  const frontWmWidth = Math.round(frontWmBase * (frontWmScaleW / 100));
  const frontWmHeight = Math.round(frontWmBase * (frontWmScaleH / 100));

  const backWmBase = template.tamanhoMarcaDaguaVerso ?? 580;
  const backWmScaleW = template.escalaLarguraMarcaDaguaVerso ?? 100;
  const backWmScaleH = template.escalaAlturaMarcaDaguaVerso ?? 100;
  const backWmWidth = Math.round(backWmBase * (backWmScaleW / 100));
  const backWmHeight = Math.round(backWmBase * (backWmScaleH / 100));

  // Crest visibility, sizes, opacities & captions
  const showLeftLogo = template.mostrarLogoEsquerda !== false;
  const showCenterLogo = template.mostrarLogoCentro === true;
  const showRightLogo = template.mostrarLogoDireita !== false;
  const allowDefaultMarinhaCrest = template.usarBrasaoPadraoDireita !== false;

  const leftLogoSize = template.tamanhoLogoEsquerda ?? 90;
  const leftLogoOpacity = template.opacidadeLogoEsquerda ?? 1;
  const centerLogoSize = template.tamanhoLogoCentro ?? 84;
  const centerLogoOpacity = template.opacidadeLogoCentro ?? 1;
  const centerCaptionText =
    template.mostrarLegendaLogoCentro && template.logoCentroTexto
      ? template.logoCentroTexto.trim()
      : '';
  const rightLogoSize = template.tamanhoLogoDireita ?? 74;
  const rightLogoOpacity = template.opacidadeLogoDireita ?? 1;
  const hasCustomRightLogo = Boolean(template.logoDireitaUrl && template.logoDireitaUrl.trim());
  const showRightCaption = hasCustomRightLogo
    ? template.mostrarLegendaLogoDireita === true
    : allowDefaultMarinhaCrest && template.mostrarLegendaLogoDireita !== false;
  const rightCaptionText = showRightCaption
    ? (template.logoDireitaTexto ?? 'MARINHA DO BRASIL').trim()
    : '';

  const useOriginalFrame = template.usarMolduraOriginal !== false;
  const frontFrameStyle =
    template.estiloMolduraFrente ?? (useOriginalFrame ? 'original' : 'vetorial');

  const outerWrapperStyle: React.CSSProperties =
    scale !== 1
      ? {
          width: `${Math.round(1123 * scale)}px`,
          height: `${Math.round(794 * scale)}px`,
          overflow: 'hidden',
          position: 'relative',
          flexShrink: 0,
        }
      : {
          width: '1123px',
          height: '794px',
          position: 'relative',
          flexShrink: 0,
        };

  const sheetBaseStyle: React.CSSProperties = {
    width: '1123px',
    height: '794px',
    backgroundColor: '#ffffff',
    color: '#0f172a',
    position: 'relative',
    overflow: 'hidden',
    boxSizing: 'border-box',
    transform: scale !== 1 ? `scale(${scale})` : undefined,
    transformOrigin: 'top left',
  };

  if (side === 'front') {
    const isCircularDefaultFrontWm =
      template.marcaDaguaFrenteUrl.includes('WhatsApp_Image_2026-02-11') &&
      frontWmScaleW === 100 &&
      frontWmScaleH === 100;

    return (
      <div style={outerWrapperStyle}>
        <div
          ref={frontSheetRef}
          id={elementId}
          data-certificate-side="front"
          onClick={(e) => {
            if (!onSelectObject) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = (e.clientX - rect.left) / (scale || 1);
            const relY = (e.clientY - rect.top) / (scale || 1);
            if (relX < 62 || relX > 1061 || relY < 62 || relY > 732) {
              onSelectObject('molduraFrente');
            } else {
              onSelectObject('marcaDaguaFrente');
            }
          }}
          style={{
            ...sheetBaseStyle,
            outline:
              onSelectObject &&
              (selectedObject === 'molduraFrente' || selectedObject === 'marcaDaguaFrente')
                ? '3px solid #2563eb'
                : undefined,
            outlineOffset: '2px',
          }}
          className="shadow-xl"
        >
          {/* Front Frame (original ornate PNG, nautical SVG, clean simple line, or none) */}
          {frontFrameStyle === 'original' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={effectiveFrontFrameSrc}
              alt=""
              crossOrigin="anonymous"
              style={{
                position: 'absolute',
                top: '18px',
                left: '16px',
                width: '1091px',
                height: '758px',
                objectFit: 'fill',
                pointerEvents: 'none',
                mixBlendMode: 'multiply',
                zIndex: 5,
              }}
            />
          ) : frontFrameStyle === 'vetorial' ? (
            <NauticalOrnateFrame borderColor={template.corBordaFrente || '#52525b'} />
          ) : frontFrameStyle === 'simples' ? (
            <div
              style={{
                position: 'absolute',
                inset: '22px',
                border: `2px solid ${template.corBordaFrente || '#cbd5e1'}`,
                padding: '4px',
                pointerEvents: 'none',
                zIndex: 5,
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  border: `1px solid ${template.corBordaFrente || '#cbd5e1'}`,
                  boxSizing: 'border-box',
                }}
              />
            </div>
          ) : null}

          {/* Center Watermark (expandable up to full sheet) */}
          {template.marcaDaguaFrenteUrl && (
            <div
              style={{
                position: 'absolute',
                top: '20px',
                bottom: '20px',
                left: '20px',
                right: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                pointerEvents: 'none',
                zIndex: 1,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolveAssetCacheSrc(template.marcaDaguaFrenteUrl)}
                alt="Marca d'água"
                crossOrigin="anonymous"
                style={{
                  position: 'relative',
                  top: `${template.marcaDaguaFrenteOffsetY ?? 0}px`,
                  width: `${frontWmWidth}px`,
                  height: `${frontWmHeight}px`,
                  maxWidth: 'none',
                  maxHeight: 'none',
                  objectFit: frontWmScaleW === frontWmScaleH ? 'contain' : 'fill',
                  opacity: template.opacidadeMarcaDaguaFrente ?? 0.24,
                  mixBlendMode: 'multiply',
                  borderRadius: isCircularDefaultFrontWm ? '9999px' : '0px',
                }}
              />
            </div>
          )}

          {/* Front Content */}
          <div
            style={{
              position: 'relative',
              zIndex: 10,
              width: '100%',
              height: '100%',
              padding: '84px 104px 86px 104px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxSizing: 'border-box',
            }}
          >
            {/* Header Logos (Left | Center | Right — each independently showable/hideable) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                padding: '0 24px',
                minHeight: showLeftLogo || showCenterLogo || showRightLogo ? '96px' : '28px',
                gap: '16px',
              }}
            >
              {/* Left Crest Slot */}
              <div
                style={{
                  flex: '1 1 0%',
                  display: 'flex',
                  justifyContent: 'flex-start',
                  alignItems: 'flex-start',
                }}
              >
                {showLeftLogo &&
                  (template.logoEsquerdaUrl || isInteractiveEditor) &&
                  (() => {
                    const drag = getDragProps('logoEsquerda', 'Brasão Esquerdo');
                    return (
                      <div
                        {...drag}
                        style={{
                          position: 'relative',
                          left: `${template.logoEsquerdaOffsetX ?? 0}px`,
                          top: `${template.logoEsquerdaOffsetY ?? 0}px`,
                          zIndex: activeDrag === 'logoEsquerda' ? 20 : 12,
                          minWidth: '48px',
                          minHeight: '48px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          ...drag.style,
                        }}
                      >
                        {template.logoEsquerdaUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={resolveAssetCacheSrc(template.logoEsquerdaUrl)}
                            alt="Brasão Guarda Costeira"
                            crossOrigin="anonymous"
                            draggable={false}
                            style={{
                              width: `${leftLogoSize}px`,
                              height: `${leftLogoSize}px`,
                              objectFit: 'contain',
                              opacity: leftLogoOpacity,
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '104px',
                              height: '72px',
                              border: '1.5px dashed #94a3b8',
                              borderRadius: '8px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '4px 6px',
                              textAlign: 'center',
                              color: '#64748b',
                              fontSize: '10px',
                              fontWeight: 600,
                              lineHeight: 1.2,
                              backgroundColor: 'rgba(248, 250, 252, 0.7)',
                            }}
                          >
                            <span>Brasão Esquerdo</span>
                            <span style={{ fontSize: '9px', fontWeight: 400 }}>
                              Clique p/ inserir
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
              </div>

              {/* Center Crest Slot */}
              <div
                style={{
                  flex: '0 0 auto',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                }}
              >
                {showCenterLogo &&
                  (template.logoCentroUrl || centerCaptionText || isInteractiveEditor) &&
                  (() => {
                    const drag = getDragProps('logoCentro', 'Brasão Central');
                    const hasCenterContent = Boolean(template.logoCentroUrl || centerCaptionText);
                    return (
                      <div
                        {...drag}
                        style={{
                          position: 'relative',
                          left: `${template.logoCentroOffsetX ?? 0}px`,
                          top: `${template.logoCentroOffsetY ?? 0}px`,
                          zIndex: activeDrag === 'logoCentro' ? 20 : 12,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          ...drag.style,
                        }}
                      >
                        {!hasCenterContent && isInteractiveEditor ? (
                          <div
                            style={{
                              width: '104px',
                              height: '72px',
                              border: '1.5px dashed #94a3b8',
                              borderRadius: '8px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '4px 6px',
                              textAlign: 'center',
                              color: '#64748b',
                              fontSize: '10px',
                              fontWeight: 600,
                              lineHeight: 1.2,
                              backgroundColor: 'rgba(248, 250, 252, 0.7)',
                            }}
                          >
                            <span>Brasão Central</span>
                            <span style={{ fontSize: '9px', fontWeight: 400 }}>
                              Clique p/ inserir
                            </span>
                          </div>
                        ) : null}
                        {template.logoCentroUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={resolveAssetCacheSrc(template.logoCentroUrl)}
                            alt={centerCaptionText || 'Brasão Central'}
                            crossOrigin="anonymous"
                            draggable={false}
                            style={{
                              width: `${centerLogoSize}px`,
                              height: `${centerLogoSize}px`,
                              objectFit: 'contain',
                              opacity: centerLogoOpacity,
                            }}
                          />
                        )}
                        {centerCaptionText && (
                          <div
                            style={{
                              fontSize: `${Math.max(
                                9,
                                Math.min(16, Math.round(centerLogoSize * 0.148))
                              )}px`,
                              fontWeight: 500,
                              letterSpacing: '0.04em',
                              color: '#162d4c',
                              fontFamily:
                                '"Segoe UI", system-ui, -apple-system, Arial, sans-serif',
                              textAlign: 'center',
                              lineHeight: 1.2,
                              maxWidth: `${Math.max(120, Math.round(centerLogoSize * 1.65))}px`,
                              opacity: centerLogoOpacity,
                            }}
                          >
                            {centerCaptionText}
                          </div>
                        )}
                      </div>
                    );
                  })()}
              </div>

              {/* Right Crest Slot */}
              <div
                style={{
                  flex: '1 1 0%',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'flex-start',
                }}
              >
                {showRightLogo &&
                  (template.logoDireitaUrl || allowDefaultMarinhaCrest || isInteractiveEditor) &&
                  (() => {
                    const drag = getDragProps('logoDireita', 'Brasão Direito');
                    const showCrestGraphic = Boolean(
                      template.logoDireitaUrl || allowDefaultMarinhaCrest
                    );
                    return (
                      <div
                        {...drag}
                        style={{
                          position: 'relative',
                          left: `${template.logoDireitaOffsetX ?? 0}px`,
                          top: `${template.logoDireitaOffsetY ?? 0}px`,
                          zIndex: activeDrag === 'logoDireita' ? 20 : 12,
                          ...drag.style,
                        }}
                      >
                        {showCrestGraphic ? (
                          <MarinhaBrasilCrest
                            customUrl={template.logoDireitaUrl}
                            label={rightCaptionText}
                            size={rightLogoSize}
                            opacity={rightLogoOpacity}
                          />
                        ) : (
                          <div
                            style={{
                              width: '104px',
                              height: '72px',
                              border: '1.5px dashed #94a3b8',
                              borderRadius: '8px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '4px 6px',
                              textAlign: 'center',
                              color: '#64748b',
                              fontSize: '10px',
                              fontWeight: 600,
                              lineHeight: 1.2,
                              backgroundColor: 'rgba(248, 250, 252, 0.7)',
                            }}
                          >
                            <span>Brasão Direito</span>
                            <span style={{ fontSize: '9px', fontWeight: 400 }}>
                              Clique p/ inserir
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
              </div>
            </div>

            {/* Title + Body + Date */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '24px',
                marginTop: '-10px',
              }}
            >
              {(() => {
                const drag = getDragProps('titulo', 'Título do Certificado');
                const hasTitle = Boolean(template.titulo?.trim());
                return (
                  <h1
                    {...drag}
                    style={{
                      margin: 0,
                      position: 'relative',
                      left: `${template.tituloOffsetX ?? 0}px`,
                      top: `${template.tituloOffsetY ?? 0}px`,
                      zIndex: activeDrag === 'titulo' ? 20 : 12,
                      fontSize: hasTitle ? '42px' : '16px',
                      fontWeight: hasTitle ? (titleBold ? 700 : 400) : 600,
                      fontStyle: hasTitle && titleItalic ? 'italic' : 'normal',
                      letterSpacing: hasTitle ? '0.16em' : '0.04em',
                      color: hasTitle ? '#0f172a' : '#64748b',
                      fontFamily: hasTitle ? titleFontCss : '"Segoe UI", system-ui, sans-serif',
                      textAlign: 'center',
                      textTransform: hasTitle ? 'uppercase' : 'none',
                      backgroundColor: !hasTitle && isInteractiveEditor ? 'rgba(248,250,252,0.75)' : 'transparent',
                      border: !hasTitle && isInteractiveEditor ? '1.5px dashed #94a3b8' : undefined,
                      padding: !hasTitle && isInteractiveEditor ? '12px 32px' : undefined,
                      minHeight: !hasTitle && !isInteractiveEditor ? '48px' : undefined,
                      textShadow: 'none',
                      boxShadow: 'none',
                      ...drag.style,
                    }}
                  >
                    {hasTitle
                      ? template.titulo
                      : isInteractiveEditor
                        ? 'Título do Certificado — clique para editar'
                        : ''}
                  </h1>
                );
              })()}

              {(() => {
                const drag = getDragProps('texto', 'Texto Principal');
                const hasBodyText = Boolean(normalizedBodyTemplate.trim());
                return (
                  <p
                    {...drag}
                    style={{
                      margin: 0,
                      width: '100%',
                      position: 'relative',
                      left: `${template.textoOffsetX ?? 0}px`,
                      top: `${template.textoOffsetY ?? 0}px`,
                      zIndex: activeDrag === 'texto' ? 20 : 12,
                      fontSize: hasBodyText ? `${template.tamanhoFonteCorpo || 19}px` : '13px',
                      lineHeight: hasBodyText ? 1.82 : 1.5,
                      fontFamily: hasBodyText ? bodyFontCss : '"Segoe UI", system-ui, sans-serif',
                      color: hasBodyText ? '#0f172a' : '#64748b',
                      textAlign: hasBodyText ? template.alinhamentoTexto || 'left' : 'center',
                      backgroundColor:
                        !hasBodyText && isInteractiveEditor
                          ? 'rgba(248, 250, 252, 0.75)'
                          : 'transparent',
                      border:
                        !hasBodyText && isInteractiveEditor ? '1.5px dashed #94a3b8' : undefined,
                      padding: !hasBodyText && isInteractiveEditor ? '26px 24px' : undefined,
                      minHeight: !hasBodyText ? '110px' : undefined,
                      display: !hasBodyText && isInteractiveEditor ? 'flex' : undefined,
                      alignItems: !hasBodyText && isInteractiveEditor ? 'center' : undefined,
                      justifyContent: !hasBodyText && isInteractiveEditor ? 'center' : undefined,
                      textShadow: 'none',
                      ...drag.style,
                    }}
                  >
                    {hasBodyText ? (
                      bodySegments.map((seg, i) => (
                        <span
                          key={i}
                          style={{
                            fontWeight: seg.bold ? 700 : 400,
                            fontStyle: seg.italic ? 'italic' : 'normal',
                          }}
                        >
                          {seg.text}
                        </span>
                      ))
                    ) : isInteractiveEditor ? (
                      <span>
                        Texto Principal do Certificado — clique aqui para escrever ou inserir
                        variáveis (&#123;&#123;ALUNO&#125;&#125;, &#123;&#123;CURSO&#125;&#125;,
                        etc.)
                      </span>
                    ) : null}
                  </p>
                );
              })()}

              {(() => {
                const dateAlign = template.dataAlinhamento || 'center';
                const dateJustify =
                  dateAlign === 'left'
                    ? 'flex-start'
                    : dateAlign === 'right'
                      ? 'flex-end'
                      : 'center';
                const dateDrag = getDragProps('data', 'Data de Emissão');
                const localTrim = (template.localEmissao || '').trim();
                const dataTrim = (template.dataEmissaoExtenso || '').trim();
                const hasDateContent = Boolean(localTrim || dataTrim);
                const dateDisplay = localTrim && dataTrim
                  ? `${localTrim}, ${dataTrim}.`
                  : localTrim
                    ? `${localTrim}, ${formatTodayFallback()}.`
                    : dataTrim
                      ? `${dataTrim}.`
                      : '';
                return (
                  <div
                    style={{
                      width: '100%',
                      display: 'flex',
                      justifyContent: dateJustify,
                    }}
                  >
                    <p
                      {...dateDrag}
                      style={{
                        margin: '4px 0 0 0',
                        position: 'relative',
                        left: `${template.dataOffsetX ?? 0}px`,
                        top: `${template.dataOffsetY ?? 0}px`,
                        zIndex: activeDrag === 'data' ? 20 : 12,
                        fontSize: hasDateContent
                          ? `${Math.max(16, (template.tamanhoFonteCorpo || 19) - 1)}px`
                          : '12px',
                        fontFamily: hasDateContent
                          ? bodyFontCss
                          : '"Segoe UI", system-ui, sans-serif',
                        fontWeight: hasDateContent ? (dateBold ? 700 : 400) : 600,
                        fontStyle: hasDateContent && dateItalic ? 'italic' : 'normal',
                        color: hasDateContent ? '#0f172a' : '#64748b',
                        textAlign: dateAlign,
                        border:
                          !hasDateContent && isInteractiveEditor
                            ? '1.5px dashed #94a3b8'
                            : undefined,
                        backgroundColor:
                          !hasDateContent && isInteractiveEditor
                            ? 'rgba(248, 250, 252, 0.75)'
                            : 'transparent',
                        padding: !hasDateContent && isInteractiveEditor ? '6px 18px' : undefined,
                        minHeight: !hasDateContent && !isInteractiveEditor ? '24px' : undefined,
                        ...dateDrag.style,
                      }}
                    >
                      {hasDateContent
                        ? dateDisplay
                        : isInteractiveEditor
                          ? 'Local e Data de Emissão — clique para editar'
                          : ''}
                    </p>
                  </div>
                );
              })()}
            </div>

            {/* Signatures */}
            {(() => {
              const sigAlign = template.assinaturaAlinhamento || 'right';
              const sigHeightOffset = template.assinaturaAlturaOffset ?? 0;
              const hasSecondSig = Boolean(template.mostrarSegundaAssinatura);
              const isPrimaryLeft = sigAlign === 'left';
              const sigJustify = hasSecondSig
                ? 'space-between'
                : sigAlign === 'left'
                  ? 'flex-start'
                  : sigAlign === 'center'
                    ? 'center'
                    : 'flex-end';
              const primaryDrag = getDragProps('assinaturaPrincipal', 'Assinatura Principal');
              const secondaryDrag = getDragProps('segundaAssinatura', '2ª Assinatura');
              const hasPrimarySigContent = Boolean(
                template.assinaturaNome?.trim() ||
                  template.assinaturaPosto?.trim() ||
                  template.assinaturaCargo?.trim()
              );
              const hasSecondarySigContent = Boolean(
                template.segundaAssinaturaNome?.trim() ||
                  template.segundaAssinaturaPosto?.trim() ||
                  template.segundaAssinaturaCargo?.trim()
              );

              const primaryBlock = (
                <div
                  key="primary-signature"
                  {...primaryDrag}
                  style={{
                    position: 'relative',
                    left: `${template.assinaturaPrincipalOffsetX ?? 0}px`,
                    top: `${template.assinaturaPrincipalOffsetY ?? 0}px`,
                    zIndex: activeDrag === 'assinaturaPrincipal' ? 20 : 12,
                    textAlign: 'center',
                    flex: hasSecondSig ? '0 1 420px' : undefined,
                    minWidth: hasSecondSig ? '310px' : '390px',
                    maxWidth: hasSecondSig ? '425px' : undefined,
                    marginLeft: !hasSecondSig && sigAlign === 'left' ? '16px' : '0',
                    marginRight: !hasSecondSig && sigAlign === 'right' ? '16px' : '0',
                    fontFamily: hasPrimarySigContent
                      ? signatureFontCss
                      : '"Segoe UI", system-ui, sans-serif',
                    fontStyle: hasPrimarySigContent && sigItalic ? 'italic' : 'normal',
                    color: '#0f172a',
                    lineHeight: 1.35,
                    ...primaryDrag.style,
                  }}
                >
                  {hasPrimarySigContent ? (
                    <>
                      {showSignatureLine && (
                        <div
                          aria-hidden="true"
                          style={{
                            width: hasSecondSig ? '76%' : '70%',
                            maxWidth: '285px',
                            minWidth: '200px',
                            height: '1px',
                            margin: '0 auto 6px auto',
                            background: `linear-gradient(90deg, rgba(15, 23, 42, 0) 0%, rgba(15, 23, 42, ${sigLineOpacity}) 16%, rgba(15, 23, 42, ${sigLineOpacity}) 84%, rgba(15, 23, 42, 0) 100%)`,
                          }}
                        />
                      )}
                      <div
                        style={{
                          fontSize: '14.5px',
                          fontWeight: sigBold ? 700 : 400,
                          letterSpacing: '0.03em',
                        }}
                      >
                        {template.assinaturaNome}
                      </div>
                      {template.assinaturaPosto && (
                        <div style={{ fontSize: '14px', fontWeight: sigBold ? 700 : 400 }}>
                          {template.assinaturaPosto}
                        </div>
                      )}
                      {template.assinaturaCargo && (
                        <div style={{ fontSize: '13.5px', fontWeight: sigBold ? 700 : 400 }}>
                          {template.assinaturaCargo}
                        </div>
                      )}
                    </>
                  ) : isInteractiveEditor ? (
                    <div
                      style={{
                        border: '1.5px dashed #94a3b8',
                        borderRadius: '8px',
                        padding: '10px 16px',
                        backgroundColor: 'rgba(248, 250, 252, 0.75)',
                        color: '#64748b',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    >
                      Assinatura Principal — clique para editar
                    </div>
                  ) : (
                    <div style={{ minHeight: '42px' }} />
                  )}
                </div>
              );

              const secondaryBlock = hasSecondSig ? (
                <div
                  key="secondary-signature"
                  {...secondaryDrag}
                  style={{
                    position: 'relative',
                    left: `${template.segundaAssinaturaOffsetX ?? 0}px`,
                    top: `${template.segundaAssinaturaOffsetY ?? 0}px`,
                    zIndex: activeDrag === 'segundaAssinatura' ? 20 : 12,
                    textAlign: 'center',
                    flex: '0 1 420px',
                    minWidth: '310px',
                    maxWidth: '425px',
                    fontFamily: hasSecondarySigContent
                      ? signatureFontCss
                      : '"Segoe UI", system-ui, sans-serif',
                    fontStyle: hasSecondarySigContent && sigItalic ? 'italic' : 'normal',
                    color: '#0f172a',
                    lineHeight: 1.35,
                    ...secondaryDrag.style,
                  }}
                >
                  {hasSecondarySigContent ? (
                    <>
                      {showSignatureLine && (
                        <div
                          aria-hidden="true"
                          style={{
                            width: '76%',
                            maxWidth: '285px',
                            minWidth: '200px',
                            height: '1px',
                            margin: '0 auto 6px auto',
                            background: `linear-gradient(90deg, rgba(15, 23, 42, 0) 0%, rgba(15, 23, 42, ${sigLineOpacity}) 16%, rgba(15, 23, 42, ${sigLineOpacity}) 84%, rgba(15, 23, 42, 0) 100%)`,
                          }}
                        />
                      )}
                      <div
                        style={{
                          fontSize: '14.5px',
                          fontWeight: sigBold ? 700 : 400,
                          letterSpacing: '0.03em',
                        }}
                      >
                        {template.segundaAssinaturaNome || 'ASSINATURA'}
                      </div>
                      {template.segundaAssinaturaPosto && (
                        <div style={{ fontSize: '14px', fontWeight: sigBold ? 700 : 400 }}>
                          {template.segundaAssinaturaPosto}
                        </div>
                      )}
                      {template.segundaAssinaturaCargo && (
                        <div style={{ fontSize: '13.5px', fontWeight: sigBold ? 700 : 400 }}>
                          {template.segundaAssinaturaCargo}
                        </div>
                      )}
                    </>
                  ) : isInteractiveEditor ? (
                    <div
                      style={{
                        border: '1.5px dashed #94a3b8',
                        borderRadius: '8px',
                        padding: '10px 16px',
                        backgroundColor: 'rgba(248, 250, 252, 0.75)',
                        color: '#64748b',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    >
                      2ª Assinatura — clique para editar
                    </div>
                  ) : (
                    <div style={{ minHeight: '42px' }} />
                  )}
                </div>
              ) : null;

              return (
                <div
                  style={{
                    position: 'relative',
                    top: `${sigHeightOffset}px`,
                    zIndex:
                      activeDrag === 'assinaturaPrincipal' || activeDrag === 'segundaAssinatura'
                        ? 20
                        : 12,
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: sigJustify,
                    padding: hasSecondSig ? '0 14px 6px 14px' : '0 28px 6px 28px',
                    gap: '32px',
                  }}
                >
                  {hasSecondSig ? (
                    isPrimaryLeft ? (
                      <>
                        {primaryBlock}
                        {secondaryBlock}
                      </>
                    ) : (
                      <>
                        {secondaryBlock}
                        {primaryBlock}
                      </>
                    )
                  ) : (
                    primaryBlock
                  )}
                </div>
              );
            })()}
          </div>

          {/* Live Horizontal / Vertical Alignment Guide Overlay */}
          {isInteractiveEditor &&
            (alignmentGuides.horizontal.length > 0 || alignmentGuides.vertical.length > 0) && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  zIndex: 40,
                }}
              >
                {alignmentGuides.horizontal.map((g) => {
                  const isAligned = g.variant === 'aligned';
                  const isRef = g.variant === 'reference';
                  const lineColor = isAligned
                    ? '#10b981'
                    : isRef
                      ? '#f59e0b'
                      : '#0284c7';
                  const labelTop = g.y > 42 ? g.y - 22 : g.y + 6;
                  const labelLeft = Math.min(890, Math.max(24, (g.x1 + g.x2) / 2 - 75));
                  return (
                    <React.Fragment key={g.id}>
                      <div
                        style={{
                          position: 'absolute',
                          top: `${g.y}px`,
                          left: `${g.x1}px`,
                          width: `${Math.max(20, g.x2 - g.x1)}px`,
                          height: '0px',
                          borderTop: isAligned
                            ? `2px solid ${lineColor}`
                            : `1.5px dashed ${lineColor}`,
                          boxShadow: isAligned
                            ? '0 0 8px rgba(16, 185, 129, 0.45)'
                            : undefined,
                        }}
                      />
                      {/* Small end-cap ticks */}
                      <div
                        style={{
                          position: 'absolute',
                          top: `${g.y - 5}px`,
                          left: `${g.x1}px`,
                          width: '2px',
                          height: '10px',
                          backgroundColor: lineColor,
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: `${g.y - 5}px`,
                          left: `${g.x2}px`,
                          width: '2px',
                          height: '10px',
                          backgroundColor: lineColor,
                        }}
                      />
                      {g.label && (
                        <div
                          style={{
                            position: 'absolute',
                            top: `${labelTop}px`,
                            left: `${labelLeft}px`,
                            backgroundColor: lineColor,
                            color: '#ffffff',
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: '9999px',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.18)',
                            fontFamily: '"Segoe UI", system-ui, sans-serif',
                          }}
                        >
                          {g.label}
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}

                {alignmentGuides.vertical.map((g) => (
                  <React.Fragment key={g.id}>
                    <div
                      style={{
                        position: 'absolute',
                        left: `${g.x}px`,
                        top: `${g.y1}px`,
                        width: '0px',
                        height: `${Math.max(20, g.y2 - g.y1)}px`,
                        borderLeft: '1.5px dashed #2563eb',
                      }}
                    />
                    {g.label && (
                      <div
                        style={{
                          position: 'absolute',
                          top: `${Math.max(16, g.y1)}px`,
                          left: `${Math.min(950, g.x + 6)}px`,
                          backgroundColor: '#2563eb',
                          color: '#ffffff',
                          fontSize: '9.5px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '9999px',
                          whiteSpace: 'nowrap',
                          fontFamily: '"Segoe UI", system-ui, sans-serif',
                        }}
                      >
                        {g.label}
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}
        </div>
      </div>
    );
  }

  // BACK (VERSO)
  const navyBorder = template.corBordaVerso || '#071b3b';
  const gridLine = '1px solid #1e293b';

  return (
    <div style={outerWrapperStyle}>
      <div
        id={elementId}
        data-certificate-side="back"
        onClick={(e) => {
          if (!onSelectObject) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const relX = (e.clientX - rect.left) / (scale || 1);
          const relY = (e.clientY - rect.top) / (scale || 1);
          if (relX < 42 || relX > 1081 || relY < 42 || relY > 752) {
            onSelectObject('versoMoldura');
          } else {
            onSelectObject('marcaDaguaVerso');
          }
        }}
        style={{
          ...sheetBaseStyle,
          padding: '18px',
          outline:
            onSelectObject &&
            (selectedObject === 'versoMoldura' || selectedObject === 'marcaDaguaVerso')
              ? '3px solid #2563eb'
              : undefined,
          outlineOffset: '2px',
        }}
        className="shadow-xl"
      >
        {/* Line 1: Outer Thick Navy Frame */}
        <div
          style={{
            width: '100%',
            height: '100%',
            border: `6px solid ${navyBorder}`,
            padding: '4px',
            boxSizing: 'border-box',
            position: 'relative',
          }}
        >
          {/* Line 2: Middle Navy Frame */}
          <div
            style={{
              width: '100%',
              height: '100%',
              border: `2.5px solid ${navyBorder}`,
              padding: '4px',
              boxSizing: 'border-box',
              position: 'relative',
            }}
          >
            {/* Line 3: Inner Fine Navy Frame */}
            <div
              style={{
                width: '100%',
                height: '100%',
                border: `1.5px solid ${navyBorder}`,
                padding: '9px 16px 12px 16px',
                boxSizing: 'border-box',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#ffffff',
              }}
            >
            {/* Back Header (transparent background so entire watermark remains visible without shadows) */}
            <div
              style={{
                position: 'relative',
                zIndex: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '6px',
                padding: '2px 8px 4px 8px',
                gap: '16px',
                backgroundColor: 'transparent',
              }}
            >
              {(() => {
                const leftBackSelect = getSelectProps('brasaoEsquerdo', 'Brasão Esquerdo');
                return (
                  <div
                    {...leftBackSelect}
                    style={{
                      width: '70px',
                      height: '72px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      backgroundColor: 'transparent',
                      ...leftBackSelect.style,
                    }}
                  >
                    {template.logoEsquerdaUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resolveAssetCacheSrc(template.logoEsquerdaUrl)}
                        alt="Brasão Guarda Costeira"
                        crossOrigin="anonymous"
                        style={{
                          width: '66px',
                          height: '70px',
                          objectFit: 'contain',
                          opacity: leftLogoOpacity,
                        }}
                      />
                    ) : isInteractiveEditor ? (
                      <div
                        style={{
                          width: '66px',
                          height: '58px',
                          border: '1.5px dashed #94a3b8',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '9px',
                          fontWeight: 600,
                          color: '#64748b',
                          textAlign: 'center',
                        }}
                      >
                        Brasão
                      </div>
                    ) : null}
                  </div>
                );
              })()}

              {(() => {
                const backTitleSelect = getSelectProps('versoTitulo', 'Título do Verso');
                const hasBackTitle = Boolean(backTitleResolved.trim());
                return (
                  <h2
                    {...backTitleSelect}
                    style={{
                      margin: 0,
                      flex: 1,
                      textAlign: 'center',
                      fontSize: hasBackTitle ? '30px' : '14px',
                      fontWeight: hasBackTitle ? 800 : 600,
                      fontStyle: hasBackTitle && versoItalic ? 'italic' : 'normal',
                      color: hasBackTitle ? '#0f172a' : '#64748b',
                      fontFamily: hasBackTitle
                        ? versoFontCss
                        : '"Segoe UI", system-ui, sans-serif',
                      letterSpacing: '0.02em',
                      textTransform: hasBackTitle ? 'uppercase' : 'none',
                      lineHeight: 1.15,
                      backgroundColor:
                        !hasBackTitle && isInteractiveEditor
                          ? 'rgba(248, 250, 252, 0.75)'
                          : 'transparent',
                      border:
                        !hasBackTitle && isInteractiveEditor ? '1.5px dashed #94a3b8' : undefined,
                      textShadow: 'none',
                      boxShadow: 'none',
                      padding: hasBackTitle ? '2px 10px' : '12px 14px',
                      ...backTitleSelect.style,
                    }}
                  >
                    {hasBackTitle
                      ? backTitleResolved
                      : isInteractiveEditor
                        ? 'Título do Verso — clique para editar'
                        : ''}
                  </h2>
                );
              })()}

              {(() => {
                const rightBackSelect = getSelectProps('brasaoDireito', 'Brasão Direito');
                const showRightCrestBack = Boolean(
                  template.logoDireitaUrl || allowDefaultMarinhaCrest
                );
                return (
                  <div
                    {...rightBackSelect}
                    style={{
                      backgroundColor: 'transparent',
                      flexShrink: 0,
                      minWidth: '70px',
                      minHeight: '72px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      ...rightBackSelect.style,
                    }}
                  >
                    {showRightCrestBack ? (
                      <MarinhaBrasilCrest
                        customUrl={template.logoDireitaUrl}
                        label={rightCaptionText}
                        compact={true}
                        opacity={rightLogoOpacity}
                      />
                    ) : isInteractiveEditor ? (
                      <div
                        style={{
                          width: '66px',
                          height: '58px',
                          border: '1.5px dashed #94a3b8',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '9px',
                          fontWeight: 600,
                          color: '#64748b',
                          textAlign: 'center',
                        }}
                      >
                        Brasão
                      </div>
                    ) : null}
                  </div>
                );
              })()}
            </div>

            {/* Disciplines Table Wrapper (watermark allowed to extend behind transparent header/title cleanly) */}
            <div
              style={{
                position: 'relative',
                zIndex: 10,
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'visible',
                backgroundColor: 'transparent',
              }}
            >
              {/* Watermark distributed across table area and visible behind transparent title */}
              {template.marcaDaguaVersoUrl && (
                <div
                  style={{
                    position: 'absolute',
                    top: '4px',
                    bottom: '4px',
                    left: 0,
                    right: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'visible',
                    pointerEvents: 'none',
                    zIndex: 0,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveAssetCacheSrc(template.marcaDaguaVersoUrl)}
                    alt="Marca d'água Verso"
                    crossOrigin="anonymous"
                    style={{
                      position: 'relative',
                      top: `${template.marcaDaguaVersoOffsetY ?? 0}px`,
                      width: `${backWmWidth}px`,
                      height: `${backWmHeight}px`,
                      maxWidth: 'none',
                      maxHeight: 'none',
                      objectFit: backWmScaleW === backWmScaleH ? 'contain' : 'fill',
                      opacity: template.opacidadeMarcaDaguaVerso ?? 0.25,
                      mixBlendMode: 'multiply',
                    }}
                  />
                </div>
              )}

              {(() => {
                const backTableSelect = getSelectProps(
                  'versoTabela',
                  'Quadro de Disciplinas e Notas (Verso)'
                );
                return (
                  <table
                    {...backTableSelect}
                    style={{
                      position: 'relative',
                      zIndex: 2,
                      width: '100%',
                      height: '100%',
                      borderCollapse: 'collapse',
                      fontFamily: versoFontCss,
                      fontStyle: versoItalic ? 'italic' : 'normal',
                      color: '#0f172a',
                      textShadow: 'none',
                      ...backTableSelect.style,
                    }}
                  >
                <thead>
                  <tr>
                    <th
                      style={{
                        width: '70.5%',
                        textAlign: 'left',
                        fontSize: '21px',
                        fontWeight: 500,
                        padding: '4px 10px 5px 4px',
                        borderBottom: gridLine,
                        borderRight: gridLine,
                      }}
                    >
                      {template.versoColunaDisciplina || 'DISCIPLINAS'}
                    </th>
                    <th
                      style={{
                        width: '18.5%',
                        textAlign: 'center',
                        fontSize: '21px',
                        fontWeight: 500,
                        padding: '4px 8px 5px 8px',
                        borderBottom: gridLine,
                        borderRight: gridLine,
                      }}
                    >
                      {template.versoColunaCargaHoraria || 'CARGA HORÁRIA'}
                    </th>
                    <th
                      style={{
                        width: '11%',
                        textAlign: 'center',
                        fontSize: '21px',
                        fontWeight: 500,
                        padding: '4px 4px 5px 8px',
                        borderBottom: gridLine,
                      }}
                    >
                      {template.versoColunaNota || 'NOTA'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {effectiveDisciplines.length === 0 && isInteractiveEditor ? (
                    <tr>
                      <td
                        colSpan={3}
                        style={{
                          padding: '44px 16px',
                          textAlign: 'center',
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#64748b',
                          borderBottom: gridLine,
                          fontFamily: '"Segoe UI", system-ui, sans-serif',
                        }}
                      >
                        Quadro de Disciplinas vazio — clique na tabela para adicionar linhas ou
                        sincronizar com a turma
                      </td>
                    </tr>
                  ) : (
                    effectiveDisciplines.map((disc, idx) => (
                      <tr key={disc.id || idx}>
                        <td
                          style={{
                            padding:
                              effectiveDisciplines.length > 10
                                ? '4px 10px 4px 4px'
                                : '8px 10px 8px 4px',
                            fontSize:
                              effectiveDisciplines.length > 10
                                ? '12.5px'
                                : effectiveDisciplines.length > 6
                                  ? '15px'
                                  : '19px',
                            fontWeight: 500,
                            lineHeight: effectiveDisciplines.length > 10 ? 1.2 : 1.28,
                            borderBottom: gridLine,
                            borderRight: gridLine,
                            verticalAlign: 'middle',
                            textTransform: 'uppercase',
                          }}
                        >
                          {disc.nome}
                        </td>
                        <td
                          style={{
                            padding: effectiveDisciplines.length > 10 ? '4px 8px' : '8px 8px',
                            fontSize:
                              effectiveDisciplines.length > 10
                                ? '15px'
                                : effectiveDisciplines.length > 6
                                  ? '20px'
                                  : '27px',
                            fontWeight: 500,
                            textAlign: 'center',
                            borderBottom: gridLine,
                            borderRight: gridLine,
                            verticalAlign: 'middle',
                          }}
                        >
                          {disc.carga_horaria}
                        </td>
                        <td
                          style={{
                            padding:
                              effectiveDisciplines.length > 10
                                ? '4px 4px 4px 8px'
                                : '8px 4px 8px 8px',
                            fontSize:
                              effectiveDisciplines.length > 10
                                ? '15px'
                                : effectiveDisciplines.length > 6
                                  ? '20px'
                                  : '24px',
                            fontWeight: 700,
                            textAlign: 'center',
                            color: navyBorder,
                            borderBottom: gridLine,
                            verticalAlign: 'middle',
                          }}
                        >
                          {disc.nota || '-'}
                        </td>
                      </tr>
                    ))
                  )}

                  {/* Total Hours Row (exact original: divider between Carga Horária and Nota stops above this row) */}
                  <tr>
                    <td
                      style={{
                        padding: '8px 10px 8px 4px',
                        fontSize: '22px',
                        fontWeight: 500,
                        borderBottom: gridLine,
                        borderRight: gridLine,
                        verticalAlign: 'middle',
                        textTransform: 'uppercase',
                      }}
                    >
                      {template.versoLabelCargaTotal || 'CARGA HORÁRIA TOTAL'}
                    </td>
                    <td
                      style={{
                        padding: '8px 8px',
                        fontSize: '28px',
                        fontWeight: 500,
                        textAlign: 'center',
                        borderBottom: gridLine,
                        verticalAlign: 'middle',
                      }}
                    >
                      {totalHorasLabel}
                    </td>
                    <td
                      style={{
                        borderBottom: gridLine,
                      }}
                    />
                  </tr>

                  {/* Final Average Row (exact original: no bottom border, Média Final value centered across col 2+3) */}
                  <tr>
                    <td
                      style={{
                        padding: '10px 10px 6px 4px',
                        fontSize: '22px',
                        fontWeight: 500,
                        borderRight: gridLine,
                        verticalAlign: 'middle',
                        textTransform: 'uppercase',
                      }}
                    >
                      {template.versoLabelMediaFinal || 'MÉDIA FINAL'}
                    </td>
                    <td
                      colSpan={2}
                      style={{
                        padding: '10px 8px 6px 8px',
                        fontSize: '28px',
                        fontWeight: 700,
                        textAlign: 'center',
                        color: navyBorder,
                        verticalAlign: 'middle',
                      }}
                    >
                      {mediaFinalLabel}
                    </td>
                  </tr>
                </tbody>
              </table>
                );
              })()}
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTodayFallback() {
  const now = new Date();
  const months = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
  ];
  return `${String(now.getDate()).padStart(2, '0')} de ${months[now.getMonth()]} de ${now.getFullYear()}`;
}
