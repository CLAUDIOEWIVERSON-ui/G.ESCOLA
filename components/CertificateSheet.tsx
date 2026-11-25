'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  getCachedTransparentFrameSrc,
  makeFrameCenterTransparent,
} from '@/lib/certificateImageUtils';
import {
  CertificateLayerKey,
  CertificateSelectableObject,
  CertificateStudentContext,
  CertificateTemplateConfig,
  adaptPortugueseStudentArticle,
  computeBackTotals,
  cmToPx,
  formatCourseTitleCasePT,
  formatNameTitleCasePT,
  getCertificateElementZIndex,
  getCertificateSheetDimensions,
  groupCertificateRowsByModule,
  isFemaleStudentGenero,
  resolveCertificateBodySegments,
  resolveCertificateFontCss,
  resolveSimplePlaceholders,
  splitBodyAroundParticipantToken,
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
    ? size !== undefined
      ? `${Math.max(8, Math.min(13, Math.round(resolvedSize * 0.145)))}px`
      : '9px'
    : `${Math.max(9, Math.min(16, Math.round(resolvedSize * 0.148)))}px`;
  const maxLabelWidth = compact
    ? size !== undefined
      ? `${Math.max(90, Math.round(resolvedSize * 1.55))}px`
      : '95px'
    : `${Math.max(110, Math.round(resolvedSize * 1.48))}px`;

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

function NauticalOrnateFrame({
  borderColor = '#52525b',
  zIndex = 5,
  sheetWidth = 1123,
  sheetHeight = 794,
}: {
  borderColor?: string;
  zIndex?: number;
  sheetWidth?: number;
  sheetHeight?: number;
}) {
  return (
    <svg
      viewBox={`0 0 ${sheetWidth} ${sheetHeight}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex,
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
        width={sheetWidth - 28}
        height={sheetHeight - 28}
        fill="none"
        stroke={borderColor}
        strokeWidth="4"
      />
      <rect
        x="22"
        y="22"
        width={sheetWidth - 44}
        height={sheetHeight - 44}
        fill="none"
        stroke="#94a3b8"
        strokeWidth="1.5"
      />

      {/* Braided rope bands */}
      <rect x="40" y="28" width={sheetWidth - 80} height="14" fill="url(#nautical-rope-h)" />
      <rect x="40" y={sheetHeight - 42} width={sheetWidth - 80} height="14" fill="url(#nautical-rope-h)" />
      <rect x="28" y="40" width="14" height={sheetHeight - 80} fill="url(#nautical-rope-v)" />
      <rect x={sheetWidth - 42} y="40" width="14" height={sheetHeight - 80} fill="url(#nautical-rope-v)" />

      {/* Inner hairline border */}
      <rect
        x="48"
        y="48"
        width={sheetWidth - 96}
        height={sheetHeight - 96}
        fill="none"
        stroke={borderColor}
        strokeWidth="2"
      />
      <rect
        x="54"
        y="54"
        width={sheetWidth - 108}
        height={sheetHeight - 108}
        fill="none"
        stroke="#cbd5e1"
        strokeWidth="1"
      />

      {/* Four ornate corners */}
      <use href="#corner-ornament" x="0" y="0" />
      <use href="#corner-ornament" x="0" y="0" transform={`translate(${sheetWidth}, 0) scale(-1, 1)`} />
      <use href="#corner-ornament" x="0" y="0" transform={`translate(0, ${sheetHeight}) scale(1, -1)`} />
      <use href="#corner-ornament" x="0" y="0" transform={`translate(${sheetWidth}, ${sheetHeight}) scale(-1, -1)`} />

      {/* Classic Bottom Center Nautical Knot */}
      <g transform={`translate(${sheetWidth / 2}, ${sheetHeight - 38})`}>
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

  const {
    isPortrait,
    width: sheetWidth,
    height: sheetHeight,
    centerX: sheetCenterX,
  } = getCertificateSheetDimensions(template.orientacao);

  const rawFrontFrameSrc = resolveAssetCacheSrc(
    template.molduraFrenteUrl || '/assets/certificado-moldura-frente.png'
  );
  const resolvedFrontFrameStyle =
    template.estiloMolduraFrente ??
    (template.usarMolduraOriginal !== false ? 'original' : 'vetorial');
  const shouldProcessFrontFrame = side === 'front' && resolvedFrontFrameStyle === 'original';

  const rawBackFrameSrc = resolveAssetCacheSrc(
    template.molduraVersoUrl || template.molduraFrenteUrl || '/assets/certificado-moldura-frente.png'
  );
  const resolvedBackFrameStyle = template.estiloMolduraVerso ?? 'classica';
  const shouldProcessBackFrame = side === 'back' && resolvedBackFrameStyle === 'original';

  useEffect(() => {
    const srcToProcess = shouldProcessFrontFrame
      ? rawFrontFrameSrc
      : shouldProcessBackFrame
        ? rawBackFrameSrc
        : '';
    if (!srcToProcess) return;
    if (getCachedTransparentFrameSrc(srcToProcess)) return;
    let active = true;
    void makeFrameCenterTransparent(srcToProcess).then((processed) => {
      if (!active || !processed || processed === srcToProcess) return;
      setTransparentFrameMap((prev) =>
        prev[srcToProcess] === processed ? prev : { ...prev, [srcToProcess]: processed }
      );
    });
    return () => {
      active = false;
    };
  }, [shouldProcessFrontFrame, rawFrontFrameSrc, shouldProcessBackFrame, rawBackFrameSrc]);

  const effectiveFrontFrameSrc =
    getCachedTransparentFrameSrc(rawFrontFrameSrc) ||
    transparentFrameMap[rawFrontFrameSrc] ||
    rawFrontFrameSrc;
  const effectiveBackFrameSrc =
    getCachedTransparentFrameSrc(rawBackFrameSrc) ||
    transparentFrameMap[rawBackFrameSrc] ||
    rawBackFrameSrc;

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
    logoEsquerda: {
      minX: -90,
      maxX: isPortrait ? 520 : 760,
      minY: -60,
      maxY: isPortrait ? 820 : 520,
    },
    logoCentro: {
      minX: isPortrait ? -280 : -420,
      maxX: isPortrait ? 280 : 420,
      minY: -110,
      maxY: isPortrait ? 920 : 640,
    },
    logoDireita: {
      minX: isPortrait ? -520 : -760,
      maxX: 90,
      minY: -60,
      maxY: isPortrait ? 820 : 520,
    },
    titulo: {
      minX: isPortrait ? -240 : -350,
      maxX: isPortrait ? 240 : 350,
      minY: -200,
      maxY: isPortrait ? 380 : 260,
    },
    texto: {
      minX: isPortrait ? -120 : -150,
      maxX: isPortrait ? 120 : 150,
      minY: -220,
      maxY: isPortrait ? 320 : 200,
    },
    data: {
      minX: isPortrait ? -260 : -380,
      maxX: isPortrait ? 260 : 380,
      minY: -260,
      maxY: isPortrait ? 320 : 240,
    },
    assinaturaPrincipal: {
      minX: isPortrait ? -260 : -380,
      maxX: isPortrait ? 260 : 380,
      minY: -320,
      maxY: 120,
    },
    segundaAssinatura: {
      minX: isPortrait ? -260 : -380,
      maxX: isPortrait ? 260 : 380,
      minY: -320,
      maxY: 120,
    },
  };

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  const measureSheetBoxes = (): Partial<Record<DraggableCertificateElement, SheetBox>> => {
    const sheetEl = frontSheetRef.current;
    if (!sheetEl) return {};
    const sheetRect = sheetEl.getBoundingClientRect();
    const actualScale = sheetRect.width > 0 ? sheetRect.width / sheetWidth : scale || 1;
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
      const spanX2 = Math.min(sheetWidth - 20, Math.max(activeBox.right, sib.right) + 20);

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
          x2: Math.min(sheetWidth - 20, activeBox.right + 14),
          variant: 'current',
          label: `Desalinhado ${dirArrow} ${diffPx}px`,
        });
      }

      // Vertical alignment against siblings (centerX, left, right)
      const dxCenter = Math.abs(activeBox.centerX - sib.centerX);
      const dxLeft = Math.abs(activeBox.left - sib.left);
      const dxRight = Math.abs(activeBox.right - sib.right);
      const spanY1 = Math.max(20, Math.min(activeBox.top, sib.top) - 16);
      const spanY2 = Math.min(sheetHeight - 20, Math.max(activeBox.bottom, sib.bottom) + 16);

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
    if (Math.abs(activeBox.centerX - sheetCenterX) <= ALIGN_TOL) {
      vertical.push({
        id: 'v-sheet-center',
        x: sheetCenterX,
        y1: 24,
        y2: sheetHeight - 24,
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

      const sheetCenterDx = sheetCenterX - predCenterX;
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
  const backTitleFontCss = resolveCertificateFontCss(
    template.fonteVersoTitulo || template.fonteVerso || 'sans'
  );
  const versoFontCss = resolveCertificateFontCss(template.fonteVerso || 'sans');
  const backNumbersFontCss = resolveCertificateFontCss(
    template.fonteVersoNumeros || template.fonteVerso || 'sans'
  );

  const getLayerZ = (
    key: CertificateLayerKey,
    dragKey?: DraggableCertificateElement
  ): number => {
    const baseZ = getCertificateElementZIndex(template, key);
    if (dragKey && activeDrag === dragKey) {
      return Math.max(30, baseZ + 20);
    }
    return baseZ;
  };

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
          width: `${Math.round(sheetWidth * scale)}px`,
          height: `${Math.round(sheetHeight * scale)}px`,
          overflow: 'hidden',
          position: 'relative',
          flexShrink: 0,
        }
      : {
          width: `${sheetWidth}px`,
          height: `${sheetHeight}px`,
          position: 'relative',
          flexShrink: 0,
        };

  const sheetBaseStyle: React.CSSProperties = {
    width: `${sheetWidth}px`,
    height: `${sheetHeight}px`,
    backgroundColor: '#ffffff',
    color: '#0f172a',
    position: 'relative',
    isolation: 'isolate',
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

    const hasFormalOuterMargin = template.margemExternaMolduraCm !== undefined;
    const hasFormalInnerMargin = template.margemInternaLateralCm !== undefined;
    const hasFormalVertMargin = template.margemInternaVerticalCm !== undefined;
    const outerFrameMarginPx = hasFormalOuterMargin
      ? cmToPx(template.margemExternaMolduraCm!)
      : 22;
    const contentPadHorizPx =
      hasFormalOuterMargin || hasFormalInnerMargin
        ? (hasFormalOuterMargin
            ? outerFrameMarginPx
            : frontFrameStyle === 'nenhuma'
              ? 0
              : 22) +
          (hasFormalInnerMargin
            ? cmToPx(template.margemInternaLateralCm!)
            : isPortrait
              ? 52
              : 82)
        : isPortrait
          ? 70
          : 104;
    const contentPadTopPx =
      hasFormalOuterMargin || hasFormalVertMargin
        ? (hasFormalOuterMargin
            ? outerFrameMarginPx
            : frontFrameStyle === 'nenhuma'
              ? 0
              : 22) +
          (hasFormalVertMargin ? cmToPx(template.margemInternaVerticalCm!) : isPortrait ? 72 : 56)
        : isPortrait
          ? 92
          : 84;
    const contentPadBottomPx =
      hasFormalOuterMargin || hasFormalVertMargin
        ? (hasFormalOuterMargin
            ? outerFrameMarginPx
            : frontFrameStyle === 'nenhuma'
              ? 0
              : 22) +
          (hasFormalVertMargin ? cmToPx(template.margemInternaVerticalCm!) : isPortrait ? 72 : 56)
        : isPortrait
          ? 92
          : 86;
    const frameHitThreshold = Math.max(62, outerFrameMarginPx + 18);
    const vetorialInsetPx = hasFormalOuterMargin
      ? Math.max(0, outerFrameMarginPx - 14)
      : 0;
    const maxFrontImageZ = Math.max(
      getLayerZ('marcaDaguaFrente'),
      getLayerZ('molduraFrente'),
      getLayerZ('brasaoEsquerdo', 'logoEsquerda'),
      getLayerZ('brasaoCentro', 'logoCentro'),
      getLayerZ('brasaoDireito', 'logoDireita')
    );

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
            if (
              relX < frameHitThreshold ||
              relX > sheetWidth - frameHitThreshold ||
              relY < frameHitThreshold ||
              relY > sheetHeight - frameHitThreshold
            ) {
              onSelectObject('molduraFrente');
            } else {
              onSelectObject('marcaDaguaFrente');
            }
          }}
          style={{
            ...sheetBaseStyle,
            outline:
              onSelectObject &&
              (selectedObject === 'molduraFrente' ||
                (!template.marcaDaguaFrenteUrl && selectedObject === 'marcaDaguaFrente'))
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
                top: hasFormalOuterMargin ? `${outerFrameMarginPx}px` : '18px',
                left: hasFormalOuterMargin ? `${outerFrameMarginPx}px` : '16px',
                width: hasFormalOuterMargin
                  ? `${sheetWidth - outerFrameMarginPx * 2}px`
                  : `${sheetWidth - 32}px`,
                height: hasFormalOuterMargin
                  ? `${sheetHeight - outerFrameMarginPx * 2}px`
                  : `${sheetHeight - 36}px`,
                objectFit: 'fill',
                pointerEvents: 'none',
                mixBlendMode: 'multiply',
                zIndex: getLayerZ('molduraFrente'),
              }}
            />
          ) : frontFrameStyle === 'vetorial' ? (
            hasFormalOuterMargin ? (
              <div
                style={{
                  position: 'absolute',
                  top: `${vetorialInsetPx}px`,
                  left: `${vetorialInsetPx}px`,
                  width: `${sheetWidth - vetorialInsetPx * 2}px`,
                  height: `${sheetHeight - vetorialInsetPx * 2}px`,
                  pointerEvents: 'none',
                  zIndex: getLayerZ('molduraFrente'),
                }}
              >
                <NauticalOrnateFrame
                  borderColor={template.corBordaFrente || '#52525b'}
                  zIndex={getLayerZ('molduraFrente')}
                  sheetWidth={sheetWidth}
                  sheetHeight={sheetHeight}
                />
              </div>
            ) : (
              <NauticalOrnateFrame
                borderColor={template.corBordaFrente || '#52525b'}
                zIndex={getLayerZ('molduraFrente')}
                sheetWidth={sheetWidth}
                sheetHeight={sheetHeight}
              />
            )
          ) : frontFrameStyle === 'simples' ? (
            <div
              style={{
                position: 'absolute',
                inset: `${outerFrameMarginPx}px`,
                border: `2px solid ${template.corBordaFrente || '#cbd5e1'}`,
                padding: '4px',
                pointerEvents: 'none',
                zIndex: getLayerZ('molduraFrente'),
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

          {/* Center Watermark (expandable up to full sheet, directly clickable & layer-orderable) */}
          {template.marcaDaguaFrenteUrl ? (
            (() => {
              const frontWmSelect = getSelectProps(
                'marcaDaguaFrente',
                "Marca d'Água Central (Frente) — clique para trocar ou enviar p/ frente/trás"
              );
              const frontWmZ = getLayerZ('marcaDaguaFrente');
              const frontMinImageZ = Math.min(
                getLayerZ('molduraFrente'),
                getLayerZ('brasaoEsquerdo', 'logoEsquerda'),
                getLayerZ('brasaoCentro', 'logoCentro'),
                getLayerZ('brasaoDireito', 'logoDireita')
              );
              const isFrontWmAboveContent = frontWmZ > frontMinImageZ;
              const frontWmShapeRadius = isCircularDefaultFrontWm
                ? '9999px'
                : (frontWmSelect.style?.borderRadius ?? '6px');

              return (
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
                    zIndex: frontWmZ,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    {...frontWmSelect}
                    src={resolveAssetCacheSrc(template.marcaDaguaFrenteUrl)}
                    alt="Marca d'água"
                    crossOrigin="anonymous"
                    draggable={false}
                    style={{
                      position: 'relative',
                      left: `${template.marcaDaguaFrenteOffsetX ?? 0}px`,
                      top: `${template.marcaDaguaFrenteOffsetY ?? 0}px`,
                      width: `${frontWmWidth}px`,
                      height: `${frontWmHeight}px`,
                      maxWidth: 'none',
                      maxHeight: 'none',
                      objectFit: frontWmScaleW === frontWmScaleH ? 'contain' : 'fill',
                      opacity: template.opacidadeMarcaDaguaFrente ?? 0.24,
                      mixBlendMode: isFrontWmAboveContent ? 'normal' : 'multiply',
                      pointerEvents: isInteractiveEditor ? 'auto' : 'none',
                      ...frontWmSelect.style,
                      borderRadius: frontWmShapeRadius,
                    }}
                  />
                </div>
              );
            })()
          ) : isInteractiveEditor && selectedObject === 'marcaDaguaFrente' ? (
            (() => {
              const frontWmSelect = getSelectProps(
                'marcaDaguaFrente',
                "Marca d'Água Central (Frente) — clique para escolher ou trocar"
              );
              return (
                <div
                  style={{
                    position: 'absolute',
                    inset: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                    zIndex: getLayerZ('marcaDaguaFrente'),
                  }}
                >
                  <div
                    {...frontWmSelect}
                    style={{
                      padding: '18px 28px',
                      border: '2px dashed #2563eb',
                      backgroundColor: 'rgba(239, 246, 255, 0.75)',
                      color: '#1e3a8a',
                      fontSize: '12px',
                      fontWeight: 700,
                      textAlign: 'center',
                      pointerEvents: 'auto',
                      ...frontWmSelect.style,
                    }}
                  >
                    Marca d&apos;Água Central removida — escolha outra imagem no painel ao lado
                  </div>
                </div>
              );
            })()
          ) : null}

          {/* Front Content */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              padding: `${contentPadTopPx}px ${contentPadHorizPx}px ${contentPadBottomPx}px ${contentPadHorizPx}px`,
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
                padding: hasFormalInnerMargin ? '0px' : '0 24px',
                minHeight:
                  showLeftLogo || showCenterLogo || showRightLogo
                    ? hasFormalVertMargin
                      ? '74px'
                      : '96px'
                    : hasFormalVertMargin
                      ? '8px'
                      : '28px',
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
                          zIndex: getLayerZ('brasaoEsquerdo', 'logoEsquerda'),
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
                          zIndex: getLayerZ('brasaoCentro', 'logoCentro'),
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
                          zIndex: getLayerZ('brasaoDireito', 'logoDireita'),
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
                gap: template.espacamentoDataTextoPx !== undefined ? '18px' : '24px',
                marginTop: hasFormalOuterMargin || hasFormalInnerMargin ? '0px' : '-10px',
              }}
            >
              {(() => {
                const drag = getDragProps('titulo', 'Título do Certificado');
                const hasTitle = Boolean(template.titulo?.trim());
                const titleSizePx = template.tamanhoFonteTitulo ?? 42;
                const titleTrackingEm = template.espacamentoLetrasTitulo ?? 0.16;
                return (
                  <h1
                    {...drag}
                    style={{
                      margin: 0,
                      position: 'relative',
                      left: `${template.tituloOffsetX ?? 0}px`,
                      top: `${template.tituloOffsetY ?? 0}px`,
                      zIndex: Math.max(
                        getLayerZ('titulo', 'titulo'),
                        maxFrontImageZ + 2
                      ),
                      fontSize: hasTitle ? `${titleSizePx}px` : '16px',
                      fontWeight: hasTitle ? (titleBold ? 700 : 400) : 600,
                      fontStyle: hasTitle && titleItalic ? 'italic' : 'normal',
                      letterSpacing: hasTitle ? `${titleTrackingEm}em` : '0.04em',
                      lineHeight: 1.15,
                      color: hasTitle ? '#0f172a' : '#64748b',
                      fontFamily: hasTitle ? titleFontCss : '"Segoe UI", system-ui, sans-serif',
                      textAlign: 'center',
                      textTransform: hasTitle ? 'uppercase' : 'none',
                      backgroundColor:
                        !hasTitle && isInteractiveEditor ? 'rgba(248,250,252,0.75)' : 'transparent',
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

              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap:
                    template.espacamentoDataTextoPx !== undefined
                      ? `${template.espacamentoDataTextoPx}px`
                      : '24px',
                }}
              >
                {(() => {
                  const drag = getDragProps('texto', 'Texto Principal');
                  const hasBodyText = Boolean(normalizedBodyTemplate.trim());
                  const bodySizePx = template.tamanhoFonteCorpo || 19;
                  const bodyLineHeight = template.entrelinhaCorpo ?? 1.82;
                  const textBlockWidthPct = template.larguraBlocoTextoPct ?? 100;
                  const textBlockMaxWidthPx =
                    textBlockWidthPct < 100
                      ? `${Math.round(sheetWidth * (textBlockWidthPct / 100))}px`
                      : undefined;
                  const textMarginLeft = Math.max(0, template.margemTextoEsquerdaPx ?? 0);
                  const textMarginRight = Math.max(0, template.margemTextoDireitaPx ?? 0);
                  const textMarginTop = template.margemTextoSuperiorPx ?? 0;
                  const textMarginBottom = template.margemTextoInferiorPx ?? 0;
                  const highlightParticipant = Boolean(template.destacarNomeParticipante);
                  const participantFontKey = template.fonteParticipante || 'script';
                  const participantFontCss = resolveCertificateFontCss(participantFontKey);
                  const participantSizePx =
                    template.tamanhoFonteParticipante ?? Math.round(bodySizePx * 2.15);
                  const participantBold =
                    template.negritoParticipante ?? participantFontKey !== 'script';
                  const participantItalic = template.italicoParticipante ?? false;

                  const participantSplit = highlightParticipant
                    ? splitBodyAroundParticipantToken(normalizedBodyTemplate)
                    : { found: false, beforeText: '', tokenText: '', afterText: normalizedBodyTemplate };

                  const highlightedNameText = participantSplit.found
                    ? resolveSimplePlaceholders(participantSplit.tokenText, replacements)
                    : formattedStudentDisplay;

                  const beforeSegments =
                    participantSplit.found && participantSplit.beforeText.trim()
                      ? resolveCertificateBodySegments(
                          participantSplit.beforeText,
                          replacements,
                          {
                            defaultBold: baseBodyBold,
                            defaultItalic: baseBodyItalic,
                          }
                        )
                      : [];
                  const afterSegments =
                    participantSplit.found && participantSplit.afterText.trim()
                      ? resolveCertificateBodySegments(
                          participantSplit.afterText,
                          replacements,
                          {
                            defaultBold: baseBodyBold,
                            defaultItalic: baseBodyItalic,
                          }
                        )
                      : [];

                  return (
                    <div
                      {...drag}
                      style={{
                        margin: `${textMarginTop}px auto ${textMarginBottom}px auto`,
                        width: '100%',
                        maxWidth: textBlockMaxWidthPx,
                        boxSizing: 'border-box',
                        position: 'relative',
                        left: `${template.textoOffsetX ?? 0}px`,
                        top: `${template.textoOffsetY ?? 0}px`,
                        zIndex: Math.max(
                          getLayerZ('texto', 'texto'),
                          maxFrontImageZ + 4
                        ),
                        fontSize: hasBodyText ? `${bodySizePx}px` : '13px',
                        lineHeight: hasBodyText ? bodyLineHeight : 1.5,
                        fontFamily: hasBodyText
                          ? bodyFontCss
                          : '"Segoe UI", system-ui, sans-serif',
                        color: hasBodyText ? '#0f172a' : '#64748b',
                        textAlign: hasBodyText ? template.alinhamentoTexto || 'left' : 'center',
                        backgroundColor:
                          !hasBodyText && isInteractiveEditor
                            ? 'rgba(248, 250, 252, 0.75)'
                            : 'transparent',
                        border:
                          !hasBodyText && isInteractiveEditor
                            ? '1.5px dashed #94a3b8'
                            : undefined,
                        paddingLeft:
                          !hasBodyText && isInteractiveEditor
                            ? '24px'
                            : textMarginLeft > 0
                              ? `${textMarginLeft}px`
                              : undefined,
                        paddingRight:
                          !hasBodyText && isInteractiveEditor
                            ? '24px'
                            : textMarginRight > 0
                              ? `${textMarginRight}px`
                              : undefined,
                        paddingTop: !hasBodyText && isInteractiveEditor ? '26px' : undefined,
                        paddingBottom: !hasBodyText && isInteractiveEditor ? '26px' : undefined,
                        minHeight: !hasBodyText ? '110px' : undefined,
                        display: !hasBodyText && isInteractiveEditor ? 'flex' : undefined,
                        alignItems: !hasBodyText && isInteractiveEditor ? 'center' : undefined,
                        justifyContent: !hasBodyText && isInteractiveEditor ? 'center' : undefined,
                        textShadow: 'none',
                        ...drag.style,
                      }}
                    >
                      {hasBodyText ? (
                        highlightParticipant ? (
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                            }}
                          >
                            {participantSplit.found ? (
                              <>
                                {beforeSegments.length > 0 && (
                                  <p style={{ margin: 0 }}>
                                    {beforeSegments.map((seg, i) => (
                                      <span
                                        key={i}
                                        style={{
                                          fontWeight: seg.bold ? 700 : 400,
                                          fontStyle: seg.italic ? 'italic' : 'normal',
                                        }}
                                      >
                                        {seg.text}
                                      </span>
                                    ))}
                                  </p>
                                )}
                                <div
                                  style={{
                                    fontFamily: participantFontCss,
                                    fontSize: `${participantSizePx}px`,
                                    fontWeight: participantBold ? 700 : 400,
                                    fontStyle: participantItalic ? 'italic' : 'normal',
                                    lineHeight: 1.2,
                                    textAlign: 'center',
                                    color: '#0f172a',
                                    margin: '4px 0 6px 0',
                                  }}
                                >
                                  {highlightedNameText}
                                </div>
                                {afterSegments.length > 0 && (
                                  <p style={{ margin: 0 }}>
                                    {afterSegments.map((seg, i) => (
                                      <span
                                        key={i}
                                        style={{
                                          fontWeight: seg.bold ? 700 : 400,
                                          fontStyle: seg.italic ? 'italic' : 'normal',
                                        }}
                                      >
                                        {seg.text}
                                      </span>
                                    ))}
                                  </p>
                                )}
                              </>
                            ) : (
                              <>
                                <div
                                  style={{
                                    fontFamily: participantFontCss,
                                    fontSize: `${participantSizePx}px`,
                                    fontWeight: participantBold ? 700 : 400,
                                    fontStyle: participantItalic ? 'italic' : 'normal',
                                    lineHeight: 1.2,
                                    textAlign: 'center',
                                    color: '#0f172a',
                                    margin: '2px 0 8px 0',
                                  }}
                                >
                                  {highlightedNameText}
                                </div>
                                <p style={{ margin: 0 }}>
                                  {bodySegments.map((seg, i) => (
                                    <span
                                      key={i}
                                      style={{
                                        fontWeight: seg.bold ? 700 : 400,
                                        fontStyle: seg.italic ? 'italic' : 'normal',
                                      }}
                                    >
                                      {seg.text}
                                    </span>
                                  ))}
                                </p>
                              </>
                            )}
                          </div>
                        ) : (
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
                        )
                      ) : isInteractiveEditor ? (
                        <span>
                          Texto Principal do Certificado — clique aqui para escrever ou inserir
                          variáveis (&#123;&#123;ALUNO&#125;&#125;, &#123;&#123;CURSO&#125;&#125;,
                          etc.)
                        </span>
                      ) : null}
                    </div>
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
                  const dateSizePx =
                    template.tamanhoFonteData ??
                    Math.max(16, (template.tamanhoFonteCorpo || 19) - 1);
                  const dateDisplay =
                    localTrim && dataTrim
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
                          margin:
                            template.espacamentoDataTextoPx !== undefined
                              ? 0
                              : '4px 0 0 0',
                          position: 'relative',
                          left: `${template.dataOffsetX ?? 0}px`,
                          top: `${template.dataOffsetY ?? 0}px`,
                          zIndex: Math.max(
                            getLayerZ('data', 'data'),
                            maxFrontImageZ + 2
                          ),
                          fontSize: hasDateContent ? `${dateSizePx}px` : '12px',
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
            </div>

            {/* Signatures */}
            {(() => {
              const sigAlign = template.assinaturaAlinhamento || 'right';
              const sigHeightOffset = template.assinaturaAlturaOffset ?? 0;
              const sigTopMarginPx =
                template.espacamentoAssinaturasVerticalCm !== undefined
                  ? cmToPx(template.espacamentoAssinaturasVerticalCm)
                  : 0;
              const customLineWidthPx =
                template.larguraLinhaAssinaturaCm !== undefined
                  ? cmToPx(template.larguraLinhaAssinaturaCm)
                  : null;
              const sigNameFontPx = template.tamanhoFonteAssinaturaNome ?? 14.5;
              const sigPostoFontPx = template.tamanhoFonteAssinaturaCargo ?? 14;
              const sigCargoFontPx = template.tamanhoFonteAssinaturaCargo ?? 13.5;
              const sigCargoBold = template.assinaturaCargoNegrito ?? sigBold;
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

              const primaryLineStyle: React.CSSProperties = customLineWidthPx
                ? {
                    width: `${customLineWidthPx}px`,
                    maxWidth: isPortrait ? '100%' : undefined,
                    height: '1px',
                    margin: '0 auto 6px auto',
                    background: `linear-gradient(90deg, rgba(15, 23, 42, 0) 0%, rgba(15, 23, 42, ${sigLineOpacity}) 16%, rgba(15, 23, 42, ${sigLineOpacity}) 84%, rgba(15, 23, 42, 0) 100%)`,
                  }
                : {
                    width: '92%',
                    minWidth: isPortrait && hasSecondSig ? '160px' : '200px',
                    maxWidth: isPortrait ? '100%' : undefined,
                    height: '1px',
                    margin: '0 auto 6px auto',
                    background: `linear-gradient(90deg, rgba(15, 23, 42, 0) 0%, rgba(15, 23, 42, ${sigLineOpacity}) 16%, rgba(15, 23, 42, ${sigLineOpacity}) 84%, rgba(15, 23, 42, 0) 100%)`,
                  };

              const secondaryLineStyle: React.CSSProperties = customLineWidthPx
                ? {
                    width: `${customLineWidthPx}px`,
                    maxWidth: isPortrait ? '100%' : undefined,
                    height: '1px',
                    margin: '0 auto 6px auto',
                    background: `linear-gradient(90deg, rgba(15, 23, 42, 0) 0%, rgba(15, 23, 42, ${sigLineOpacity}) 16%, rgba(15, 23, 42, ${sigLineOpacity}) 84%, rgba(15, 23, 42, 0) 100%)`,
                  }
                : {
                    width: '92%',
                    minWidth: isPortrait && hasSecondSig ? '160px' : '200px',
                    maxWidth: isPortrait ? '100%' : undefined,
                    height: '1px',
                    margin: '0 auto 6px auto',
                    background: `linear-gradient(90deg, rgba(15, 23, 42, 0) 0%, rgba(15, 23, 42, ${sigLineOpacity}) 16%, rgba(15, 23, 42, ${sigLineOpacity}) 84%, rgba(15, 23, 42, 0) 100%)`,
                  };

              const primaryBlock = (
                <div
                  key="primary-signature"
                  {...primaryDrag}
                  style={{
                    position: 'relative',
                    left: `${template.assinaturaPrincipalOffsetX ?? 0}px`,
                    top: `${template.assinaturaPrincipalOffsetY ?? 0}px`,
                    zIndex: Math.max(
                      getLayerZ('assinaturaPrincipal', 'assinaturaPrincipal'),
                      maxFrontImageZ + 2
                    ),
                    textAlign: 'center',
                    flex: isPortrait && hasSecondSig ? '1 1 0' : '0 0 auto',
                    width: isPortrait && hasSecondSig ? undefined : 'max-content',
                    minWidth:
                      isPortrait && hasSecondSig
                        ? '180px'
                        : hasSecondSig
                          ? '220px'
                          : '240px',
                    maxWidth: isPortrait ? (hasSecondSig ? '48%' : '100%') : 'none',
                    whiteSpace: isPortrait ? 'normal' : 'nowrap',
                    marginLeft:
                      !hasSecondSig && sigAlign === 'left' && !hasFormalInnerMargin
                        ? '16px'
                        : '0',
                    marginRight:
                      !hasSecondSig && sigAlign === 'right' && !hasFormalInnerMargin
                        ? '16px'
                        : '0',
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
                      {showSignatureLine && <div aria-hidden="true" style={primaryLineStyle} />}
                      <div
                        style={{
                          fontSize: `${sigNameFontPx}px`,
                          fontWeight: sigBold ? 700 : 400,
                          letterSpacing: '0.03em',
                          whiteSpace: isPortrait ? 'normal' : 'nowrap',
                        }}
                      >
                        {template.assinaturaNome}
                      </div>
                      {template.assinaturaPosto && (
                        <div
                          style={{
                            fontSize: `${sigPostoFontPx}px`,
                            fontWeight: sigCargoBold ? 700 : 400,
                            whiteSpace: isPortrait ? 'normal' : 'nowrap',
                          }}
                        >
                          {template.assinaturaPosto}
                        </div>
                      )}
                      {template.assinaturaCargo && (
                        <div
                          style={{
                            fontSize: `${sigCargoFontPx}px`,
                            fontWeight: sigCargoBold ? 700 : 400,
                            whiteSpace: isPortrait ? 'normal' : 'nowrap',
                          }}
                        >
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
                    zIndex: Math.max(
                      getLayerZ('segundaAssinatura', 'segundaAssinatura'),
                      maxFrontImageZ + 2
                    ),
                    textAlign: 'center',
                    flex: isPortrait ? '1 1 0' : '0 0 auto',
                    width: isPortrait ? undefined : 'max-content',
                    minWidth: isPortrait ? '180px' : '220px',
                    maxWidth: isPortrait ? '48%' : 'none',
                    whiteSpace: isPortrait ? 'normal' : 'nowrap',
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
                      {showSignatureLine && <div aria-hidden="true" style={secondaryLineStyle} />}
                      <div
                        style={{
                          fontSize: `${sigNameFontPx}px`,
                          fontWeight: sigBold ? 700 : 400,
                          letterSpacing: '0.03em',
                          whiteSpace: isPortrait ? 'normal' : 'nowrap',
                        }}
                      >
                        {template.segundaAssinaturaNome || 'ASSINATURA'}
                      </div>
                      {template.segundaAssinaturaPosto && (
                        <div
                          style={{
                            fontSize: `${sigPostoFontPx}px`,
                            fontWeight: sigCargoBold ? 700 : 400,
                            whiteSpace: isPortrait ? 'normal' : 'nowrap',
                          }}
                        >
                          {template.segundaAssinaturaPosto}
                        </div>
                      )}
                      {template.segundaAssinaturaCargo && (
                        <div
                          style={{
                            fontSize: `${sigCargoFontPx}px`,
                            fontWeight: sigCargoBold ? 700 : 400,
                            whiteSpace: isPortrait ? 'normal' : 'nowrap',
                          }}
                        >
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
                    marginTop: sigTopMarginPx > 0 ? `${sigTopMarginPx}px` : undefined,
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: sigJustify,
                    flexWrap: 'nowrap',
                    padding: hasFormalInnerMargin
                      ? '0 0 4px 0'
                      : hasSecondSig
                        ? '0 14px 6px 14px'
                        : '0 20px 6px 20px',
                    gap: isPortrait && hasSecondSig ? '16px' : '24px',
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
                  zIndex: Math.max(40, maxFrontImageZ + 20),
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
                  const labelLeft = Math.min(sheetWidth - 233, Math.max(24, (g.x1 + g.x2) / 2 - 75));
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
                          left: `${Math.min(sheetWidth - 173, g.x + 6)}px`,
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
  const backFrameStyle = template.estiloMolduraVerso ?? 'classica';
  const hasBackOuterMargin = template.margemExternaMolduraVersoCm !== undefined;
  const hasBackInnerLat = template.margemInternaLateralVersoCm !== undefined;
  const hasBackInnerVert = template.margemInternaVerticalVersoCm !== undefined;
  const backOuterMarginPx = hasBackOuterMargin
    ? cmToPx(template.margemExternaMolduraVersoCm!)
    : 18;
  const backFrameThickness =
    backFrameStyle === 'classica' ? 18 : backFrameStyle === 'simples' ? 8 : 0;
  const backPadLeftRight =
    backOuterMarginPx +
    backFrameThickness +
    (hasBackInnerLat
      ? cmToPx(template.margemInternaLateralVersoCm!)
      : backFrameStyle === 'classica'
        ? 16
        : backFrameStyle === 'nenhuma'
          ? 28
          : isPortrait
            ? 30
            : 44);
  const backPadTop =
    backOuterMarginPx +
    backFrameThickness +
    (hasBackInnerVert
      ? cmToPx(template.margemInternaVerticalVersoCm!)
      : backFrameStyle === 'classica'
        ? 9
        : backFrameStyle === 'nenhuma'
          ? 24
          : 40);
  const backPadBottom =
    backOuterMarginPx +
    backFrameThickness +
    (hasBackInnerVert
      ? cmToPx(template.margemInternaVerticalVersoCm!)
      : backFrameStyle === 'classica'
        ? 12
        : backFrameStyle === 'nenhuma'
          ? 24
          : 40);
  const backFrameHitThreshold = Math.max(42, backOuterMarginPx + 20);
  const backVetorialInsetPx = hasBackOuterMargin
    ? Math.max(0, backOuterMarginPx - 14)
    : 0;

  // Back Crests (inherit Front defaults when Verso override is undefined)
  const showLeftLogoBack =
    template.mostrarLogoEsquerdaVerso !== undefined
      ? template.mostrarLogoEsquerdaVerso
      : showLeftLogo;
  const leftLogoBackUrl =
    template.logoEsquerdaVersoUrl !== undefined
      ? template.logoEsquerdaVersoUrl
      : template.logoEsquerdaUrl;
  const leftLogoBackOpacity = template.opacidadeLogoEsquerdaVerso ?? leftLogoOpacity;

  const showCenterLogoBack = template.mostrarLogoCentroVerso === true;
  const centerLogoBackUrl =
    template.logoCentroVersoUrl !== undefined
      ? template.logoCentroVersoUrl
      : template.logoCentroUrl;
  const centerLogoBackSize = template.tamanhoLogoCentroVerso ?? 54;
  const centerLogoBackOpacity = template.opacidadeLogoCentroVerso ?? centerLogoOpacity;
  const showCenterCaptionBack =
    template.mostrarLegendaLogoCentroVerso !== undefined
      ? template.mostrarLegendaLogoCentroVerso
      : template.mostrarLegendaLogoCentro === true;
  const centerCaptionBackText =
    showCenterCaptionBack && (template.logoCentroVersoTexto ?? template.logoCentroTexto)
      ? (template.logoCentroVersoTexto ?? template.logoCentroTexto)!.trim()
      : '';

  const showRightLogoBack =
    template.mostrarLogoDireitaVerso !== undefined
      ? template.mostrarLogoDireitaVerso
      : showRightLogo;
  const rightLogoBackUrl =
    template.logoDireitaVersoUrl !== undefined
      ? template.logoDireitaVersoUrl
      : template.logoDireitaUrl;
  const allowDefaultMarinhaBack =
    template.usarBrasaoPadraoDireitaVerso !== undefined
      ? template.usarBrasaoPadraoDireitaVerso
      : allowDefaultMarinhaCrest;
  const rightLogoBackOpacity = template.opacidadeLogoDireitaVerso ?? rightLogoOpacity;
  const hasCustomRightLogoBack = Boolean(rightLogoBackUrl && rightLogoBackUrl.trim());
  const showRightCaptionBack =
    template.mostrarLegendaLogoDireitaVerso !== undefined
      ? template.mostrarLegendaLogoDireitaVerso
      : hasCustomRightLogoBack
        ? template.mostrarLegendaLogoDireita === true
        : allowDefaultMarinhaBack && template.mostrarLegendaLogoDireita !== false;
  const rightCaptionBackText = showRightCaptionBack
    ? (template.logoDireitaVersoTexto ?? template.logoDireitaTexto ?? 'MARINHA DO BRASIL').trim()
    : '';

  const backTitleBold = template.versoTituloNegrito ?? true;
  const backTitleItalic = template.versoTituloItalico ?? versoItalic;
  const backTitleTrackingEm = template.versoTituloEspacamentoLetras ?? 0.02;
  const maxBackImageZ = Math.max(
    getLayerZ('marcaDaguaVerso'),
    getLayerZ('versoMoldura'),
    getLayerZ('brasaoEsquerdoVerso'),
    getLayerZ('brasaoCentroVerso'),
    getLayerZ('brasaoDireitoVerso')
  );

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
          if (
            relX < backFrameHitThreshold ||
            relX > sheetWidth - backFrameHitThreshold ||
            relY < backFrameHitThreshold ||
            relY > sheetHeight - backFrameHitThreshold
          ) {
            onSelectObject('versoMoldura');
          } else {
            onSelectObject('marcaDaguaVerso');
          }
        }}
        style={{
          ...sheetBaseStyle,
          outline:
            onSelectObject &&
            (selectedObject === 'versoMoldura' ||
              (!template.marcaDaguaVersoUrl && selectedObject === 'marcaDaguaVerso'))
              ? '3px solid #2563eb'
              : undefined,
          outlineOffset: '2px',
        }}
        className="shadow-xl"
      >
        {/* Back Frame Overlay (classica triple navy, original PNG, vetorial, simples, or none) */}
        {backFrameStyle === 'classica' ? (
          <div
            style={{
              position: 'absolute',
              inset: `${backOuterMarginPx}px`,
              border: `6px solid ${navyBorder}`,
              padding: '4px',
              boxSizing: 'border-box',
              pointerEvents: 'none',
              zIndex: getLayerZ('versoMoldura'),
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                border: `2.5px solid ${navyBorder}`,
                padding: '4px',
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  border: `1.5px solid ${navyBorder}`,
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
        ) : backFrameStyle === 'original' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={effectiveBackFrameSrc}
            alt=""
            crossOrigin="anonymous"
            style={{
              position: 'absolute',
              top: `${backOuterMarginPx}px`,
              left: `${backOuterMarginPx}px`,
              width: `${sheetWidth - backOuterMarginPx * 2}px`,
              height: `${sheetHeight - backOuterMarginPx * 2}px`,
              objectFit: 'fill',
              pointerEvents: 'none',
              mixBlendMode: 'multiply',
              zIndex: getLayerZ('versoMoldura'),
            }}
          />
        ) : backFrameStyle === 'vetorial' ? (
          hasBackOuterMargin ? (
            <div
              style={{
                position: 'absolute',
                top: `${backVetorialInsetPx}px`,
                left: `${backVetorialInsetPx}px`,
                width: `${sheetWidth - backVetorialInsetPx * 2}px`,
                height: `${sheetHeight - backVetorialInsetPx * 2}px`,
                pointerEvents: 'none',
                zIndex: getLayerZ('versoMoldura'),
              }}
            >
              <NauticalOrnateFrame
                borderColor={navyBorder}
                zIndex={getLayerZ('versoMoldura')}
                sheetWidth={sheetWidth}
                sheetHeight={sheetHeight}
              />
            </div>
          ) : (
            <NauticalOrnateFrame
              borderColor={navyBorder}
              zIndex={getLayerZ('versoMoldura')}
              sheetWidth={sheetWidth}
              sheetHeight={sheetHeight}
            />
          )
        ) : backFrameStyle === 'simples' ? (
          <div
            style={{
              position: 'absolute',
              inset: `${backOuterMarginPx}px`,
              border: `2px solid ${navyBorder}`,
              padding: '4px',
              pointerEvents: 'none',
              zIndex: getLayerZ('versoMoldura'),
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                border: `1px solid ${navyBorder}`,
                boxSizing: 'border-box',
              }}
            />
          </div>
        ) : null}

        {/* Back Content Wrapper */}
        <div
          style={{
            width: '100%',
            height: '100%',
            padding: `${backPadTop}px ${backPadLeftRight}px ${backPadBottom}px ${backPadLeftRight}px`,
            boxSizing: 'border-box',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'transparent',
          }}
        >
            {/* Back Header (transparent background so entire watermark remains visible without shadows) */}
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '6px',
                padding: '2px 8px 4px 8px',
                gap: '16px',
                backgroundColor: 'transparent',
              }}
            >
              {showLeftLogoBack && (leftLogoBackUrl || isInteractiveEditor) ? (
                (() => {
                  const leftBackSelect = getSelectProps(
                    'brasaoEsquerdoVerso',
                    'Brasão Esquerdo (Verso)'
                  );
                  const backLeftSize = template.tamanhoLogoEsquerdaVerso;
                  return (
                    <div
                      {...leftBackSelect}
                      style={{
                        position: 'relative',
                        left: `${template.logoEsquerdaVersoOffsetX ?? 0}px`,
                        top: `${template.logoEsquerdaVersoOffsetY ?? 0}px`,
                        zIndex: getLayerZ('brasaoEsquerdoVerso'),
                        width: backLeftSize === undefined ? '70px' : undefined,
                        height: backLeftSize === undefined ? '72px' : undefined,
                        minWidth:
                          backLeftSize !== undefined
                            ? `${Math.max(54, backLeftSize + 4)}px`
                            : undefined,
                        minHeight:
                          backLeftSize !== undefined
                            ? `${Math.max(54, backLeftSize + 4)}px`
                            : undefined,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        backgroundColor: 'transparent',
                        ...leftBackSelect.style,
                      }}
                    >
                      {leftLogoBackUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={resolveAssetCacheSrc(leftLogoBackUrl)}
                          alt="Brasão Guarda Costeira"
                          crossOrigin="anonymous"
                          style={{
                            width: backLeftSize !== undefined ? `${backLeftSize}px` : '66px',
                            height: backLeftSize !== undefined ? `${backLeftSize}px` : '70px',
                            objectFit: 'contain',
                            opacity: leftLogoBackOpacity,
                          }}
                        />
                      ) : (
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
                      )}
                    </div>
                  );
                })()
              ) : null}

              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                }}
              >
                {showCenterLogoBack &&
                  (centerLogoBackUrl || centerCaptionBackText || isInteractiveEditor) &&
                  (() => {
                    const centerBackSelect = getSelectProps(
                      'brasaoCentroVerso',
                      'Brasão Central (Verso)'
                    );
                    const hasCenterBackContent = Boolean(
                      centerLogoBackUrl || centerCaptionBackText
                    );
                    return (
                      <div
                        {...centerBackSelect}
                        style={{
                          position: 'relative',
                          left: `${template.logoCentroVersoOffsetX ?? 0}px`,
                          top: `${template.logoCentroVersoOffsetY ?? 0}px`,
                          zIndex: getLayerZ('brasaoCentroVerso'),
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '3px',
                          backgroundColor: 'transparent',
                          ...centerBackSelect.style,
                        }}
                      >
                        {!hasCenterBackContent && isInteractiveEditor ? (
                          <div
                            style={{
                              width: '88px',
                              height: '44px',
                              border: '1.5px dashed #94a3b8',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '9px',
                              fontWeight: 600,
                              color: '#64748b',
                              textAlign: 'center',
                              backgroundColor: 'rgba(248, 250, 252, 0.7)',
                            }}
                          >
                            Brasão Central
                          </div>
                        ) : null}
                        {centerLogoBackUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={resolveAssetCacheSrc(centerLogoBackUrl)}
                            alt={centerCaptionBackText || 'Brasão Central (Verso)'}
                            crossOrigin="anonymous"
                            style={{
                              width: `${centerLogoBackSize}px`,
                              height: `${centerLogoBackSize}px`,
                              objectFit: 'contain',
                              opacity: centerLogoBackOpacity,
                            }}
                          />
                        )}
                        {centerCaptionBackText && (
                          <div
                            style={{
                              fontSize: `${Math.max(
                                8,
                                Math.min(13, Math.round(centerLogoBackSize * 0.15))
                              )}px`,
                              fontWeight: 500,
                              letterSpacing: '0.04em',
                              color: '#162d4c',
                              fontFamily:
                                '"Segoe UI", system-ui, -apple-system, Arial, sans-serif',
                              textAlign: 'center',
                              lineHeight: 1.15,
                              maxWidth: `${Math.max(110, Math.round(centerLogoBackSize * 1.8))}px`,
                              opacity: centerLogoBackOpacity,
                            }}
                          >
                            {centerCaptionBackText}
                          </div>
                        )}
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
                        position: 'relative',
                        left: `${template.versoTituloOffsetX ?? 0}px`,
                        top: `${template.versoTituloOffsetY ?? 0}px`,
                        zIndex: Math.max(
                          getLayerZ('versoTitulo'),
                          maxBackImageZ + 4
                        ),
                        width: '100%',
                        textAlign: 'center',
                        fontSize: hasBackTitle ? `${template.versoTamanhoFonteTitulo ?? 30}px` : '14px',
                        fontWeight: hasBackTitle ? (backTitleBold ? 800 : 400) : 600,
                        fontStyle: hasBackTitle && backTitleItalic ? 'italic' : 'normal',
                        color: hasBackTitle ? '#0f172a' : '#64748b',
                        fontFamily: hasBackTitle
                          ? backTitleFontCss
                          : '"Segoe UI", system-ui, sans-serif',
                        letterSpacing: `${backTitleTrackingEm}em`,
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
              </div>

              {showRightLogoBack &&
              (rightLogoBackUrl || allowDefaultMarinhaBack || isInteractiveEditor) ? (
                (() => {
                  const rightBackSelect = getSelectProps(
                    'brasaoDireitoVerso',
                    'Brasão Direito (Verso)'
                  );
                  const showRightCrestBack = Boolean(
                    rightLogoBackUrl || allowDefaultMarinhaBack
                  );
                  const backRightSize = template.tamanhoLogoDireitaVerso;
                  return (
                    <div
                      {...rightBackSelect}
                      style={{
                        position: 'relative',
                        left: `${template.logoDireitaVersoOffsetX ?? 0}px`,
                        top: `${template.logoDireitaVersoOffsetY ?? 0}px`,
                        zIndex: getLayerZ('brasaoDireitoVerso'),
                        backgroundColor: 'transparent',
                        flexShrink: 0,
                        minWidth:
                          backRightSize !== undefined
                            ? `${Math.max(54, backRightSize + 12)}px`
                            : '70px',
                        minHeight:
                          backRightSize !== undefined
                            ? `${Math.max(54, backRightSize + 12)}px`
                            : '72px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        ...rightBackSelect.style,
                      }}
                    >
                      {showRightCrestBack ? (
                        <MarinhaBrasilCrest
                          customUrl={rightLogoBackUrl}
                          label={rightCaptionBackText}
                          compact={true}
                          size={backRightSize}
                          opacity={rightLogoBackOpacity}
                        />
                      ) : (
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
                      )}
                    </div>
                  );
                })()
              ) : null}
            </div>

            {/* Disciplines Table Wrapper (watermark allowed to extend behind transparent header/title cleanly) */}
            <div
              style={{
                position: 'relative',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'visible',
                backgroundColor: 'transparent',
              }}
            >
              {/* Watermark distributed across table area, directly clickable & layer-orderable */}
              {template.marcaDaguaVersoUrl ? (
                (() => {
                  const backWmSelect = getSelectProps(
                    'marcaDaguaVerso',
                    "Marca d'Água Central (Verso) — clique para trocar ou enviar p/ frente/trás"
                  );
                  const backWmZ = getLayerZ('marcaDaguaVerso');
                  const backMinImageZ = Math.min(
                    getLayerZ('versoMoldura'),
                    getLayerZ('brasaoEsquerdoVerso'),
                    getLayerZ('brasaoCentroVerso'),
                    getLayerZ('brasaoDireitoVerso')
                  );
                  const isBackWmAboveContent = backWmZ > backMinImageZ;

                  return (
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
                        zIndex: backWmZ,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        {...backWmSelect}
                        src={resolveAssetCacheSrc(template.marcaDaguaVersoUrl)}
                        alt="Marca d'água Verso"
                        crossOrigin="anonymous"
                        draggable={false}
                        style={{
                          position: 'relative',
                          left: `${template.marcaDaguaVersoOffsetX ?? 0}px`,
                          top: `${template.marcaDaguaVersoOffsetY ?? 0}px`,
                          width: `${backWmWidth}px`,
                          height: `${backWmHeight}px`,
                          maxWidth: 'none',
                          maxHeight: 'none',
                          objectFit: backWmScaleW === backWmScaleH ? 'contain' : 'fill',
                          opacity: template.opacidadeMarcaDaguaVerso ?? 0.25,
                          mixBlendMode: isBackWmAboveContent ? 'normal' : 'multiply',
                          pointerEvents: isInteractiveEditor ? 'auto' : 'none',
                          ...backWmSelect.style,
                        }}
                      />
                    </div>
                  );
                })()
              ) : isInteractiveEditor && selectedObject === 'marcaDaguaVerso' ? (
                (() => {
                  const backWmSelect = getSelectProps(
                    'marcaDaguaVerso',
                    "Marca d'Água Central (Verso) — clique para escolher ou trocar"
                  );
                  return (
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
                        pointerEvents: 'none',
                        zIndex: getLayerZ('marcaDaguaVerso'),
                      }}
                    >
                      <div
                        {...backWmSelect}
                        style={{
                          padding: '18px 28px',
                          border: '2px dashed #2563eb',
                          backgroundColor: 'rgba(239, 246, 255, 0.78)',
                          color: '#1e3a8a',
                          fontSize: '12px',
                          fontWeight: 700,
                          textAlign: 'center',
                          pointerEvents: 'auto',
                          ...backWmSelect.style,
                        }}
                      >
                        Marca d&apos;Água do Verso removida — escolha outra imagem no painel ao lado
                      </div>
                    </div>
                  );
                })()
              ) : null}

              {(() => {
                const backTableSelect = getSelectProps(
                  'versoTabela',
                  'Quadro de Disciplinas e Notas (Verso)'
                );
                const customRowPadY = template.versoEspacamentoLinhasPx;
                const hasCustomRowSpacing = customRowPadY !== undefined;
                const headerPadYTop = hasCustomRowSpacing
                  ? Math.max(4, Math.min(18, Math.round(customRowPadY! * 0.7)))
                  : 4;
                const headerPadYBottom = hasCustomRowSpacing
                  ? Math.max(4, Math.min(18, Math.round(customRowPadY! * 0.7)))
                  : 5;
                const headerFontPx = template.versoTamanhoFonteCabecalho ?? 21;
                const discRowPadY = hasCustomRowSpacing
                  ? customRowPadY!
                  : effectiveDisciplines.length > 10
                    ? 4
                    : 8;
                const discLineHeight =
                  template.versoEntrelinha ?? (effectiveDisciplines.length > 10 ? 1.2 : 1.28);
                const discFontPx =
                  template.versoTamanhoFonteDisciplinas !== undefined
                    ? template.versoTamanhoFonteDisciplinas
                    : effectiveDisciplines.length > 10
                      ? 12.5
                      : effectiveDisciplines.length > 6
                        ? 15
                        : 19;
                const chFontPx =
                  template.versoTamanhoFonteNumeros !== undefined
                    ? template.versoTamanhoFonteNumeros
                    : effectiveDisciplines.length > 10
                      ? 15
                      : effectiveDisciplines.length > 6
                        ? 20
                        : 27;
                const notaFontPx =
                  template.versoTamanhoFonteNumeros !== undefined
                    ? template.versoTamanhoFonteNumeros
                    : effectiveDisciplines.length > 10
                      ? 15
                      : effectiveDisciplines.length > 6
                        ? 20
                        : 24;
                const totalRowPadY = hasCustomRowSpacing ? customRowPadY! : 8;
                const finalRowPadTop = hasCustomRowSpacing ? customRowPadY! : 10;
                const finalRowPadBottom = hasCustomRowSpacing
                  ? Math.max(6, Math.round(customRowPadY! * 0.8))
                  : 6;
                const totalLabelFontPx = template.versoTamanhoFonteTotaisLabel ?? 22;
                const totalNumbersFontPx = template.versoTamanhoFonteTotaisNumeros ?? 28;

                return (
                  <table
                    {...backTableSelect}
                    style={{
                      position: 'relative',
                      zIndex: Math.max(
                        getLayerZ('versoTabela'),
                        maxBackImageZ + 2
                      ),
                      width: '100%',
                      height: hasCustomRowSpacing ? 'auto' : '100%',
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
                        fontSize: `${headerFontPx}px`,
                        fontWeight: 500,
                        padding: `${headerPadYTop}px 10px ${headerPadYBottom}px 4px`,
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
                        fontSize: `${headerFontPx}px`,
                        fontWeight: 500,
                        padding: `${headerPadYTop}px 8px ${headerPadYBottom}px 8px`,
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
                        fontSize: `${headerFontPx}px`,
                        fontWeight: 500,
                        padding: `${headerPadYTop}px 4px ${headerPadYBottom}px 8px`,
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
                            padding: `${discRowPadY}px 10px ${discRowPadY}px 4px`,
                            fontSize: `${discFontPx}px`,
                            fontWeight: 500,
                            lineHeight: discLineHeight,
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
                            padding: `${discRowPadY}px 8px`,
                            fontFamily: backNumbersFontCss,
                            fontSize: `${chFontPx}px`,
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
                            padding: `${discRowPadY}px 4px ${discRowPadY}px 8px`,
                            fontFamily: backNumbersFontCss,
                            fontSize: `${notaFontPx}px`,
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
                        padding: `${totalRowPadY}px 10px ${totalRowPadY}px 4px`,
                        fontSize: `${totalLabelFontPx}px`,
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
                        padding: `${totalRowPadY}px 8px`,
                        fontFamily: backNumbersFontCss,
                        fontSize: `${totalNumbersFontPx}px`,
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
                        padding: `${finalRowPadTop}px 10px ${finalRowPadBottom}px 4px`,
                        fontSize: `${totalLabelFontPx}px`,
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
                        padding: `${finalRowPadTop}px 8px ${finalRowPadBottom}px 8px`,
                        fontFamily: backNumbersFontCss,
                        fontSize: `${totalNumbersFontPx}px`,
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
