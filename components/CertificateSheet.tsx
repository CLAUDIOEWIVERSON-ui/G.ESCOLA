'use client';

import React, { useRef, useState } from 'react';
import {
  CertificateStudentContext,
  CertificateTemplateConfig,
  computeBackTotals,
  resolveCertificateBodySegments,
  resolveCertificateFontCss,
  resolveSimplePlaceholders,
} from '@/lib/certificateTypes';

export type DraggableCertificateElement =
  | 'logoEsquerda'
  | 'logoDireita'
  | 'titulo'
  | 'texto'
  | 'assinatura';

interface CertificateSheetProps {
  template: CertificateTemplateConfig;
  student: CertificateStudentContext;
  side: 'front' | 'back';
  elementId?: string;
  scale?: number;
  interactiveDrag?: boolean;
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
          src={customUrl}
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

export function CertificateSheet({
  template,
  student,
  side,
  elementId,
  scale = 1,
  interactiveDrag = false,
  onUpdateTemplate,
}: CertificateSheetProps) {
  const dragRef = useRef<{
    element: DraggableCertificateElement;
    startClientX: number;
    startClientY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const [activeDrag, setActiveDrag] = useState<DraggableCertificateElement | null>(null);

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  const handleDragPointerDown = (
    element: DraggableCertificateElement,
    e: React.PointerEvent<HTMLElement>
  ) => {
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
    } else if (element === 'logoDireita') {
      origX = template.logoDireitaOffsetX ?? 0;
      origY = template.logoDireitaOffsetY ?? 0;
    } else if (element === 'titulo') {
      origX = template.tituloOffsetX ?? 0;
      origY = template.tituloOffsetY ?? 0;
    } else if (element === 'texto') {
      origX = template.textoOffsetX ?? 0;
      origY = template.textoOffsetY ?? 0;
    } else if (element === 'assinatura') {
      origX = 0;
      origY = template.assinaturaAlturaOffset ?? 0;
    }

    dragRef.current = {
      element,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origX,
      origY,
    };
    setActiveDrag(element);
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
    const nextX = dragRef.current.origX + dx;
    const nextY = dragRef.current.origY + dy;

    onUpdateTemplate((prev) => {
      if (element === 'logoEsquerda') {
        return {
          ...prev,
          logoEsquerdaOffsetX: clamp(nextX, -90, 760),
          logoEsquerdaOffsetY: clamp(nextY, -60, 520),
        };
      }
      if (element === 'logoDireita') {
        return {
          ...prev,
          logoDireitaOffsetX: clamp(nextX, -760, 90),
          logoDireitaOffsetY: clamp(nextY, -60, 520),
        };
      }
      if (element === 'titulo') {
        return {
          ...prev,
          tituloOffsetX: clamp(nextX, -350, 350),
          tituloOffsetY: clamp(nextY, -200, 260),
        };
      }
      if (element === 'texto') {
        return {
          ...prev,
          textoOffsetX: clamp(nextX, -150, 150),
          textoOffsetY: clamp(nextY, -180, 200),
        };
      }
      if (element === 'assinatura') {
        return {
          ...prev,
          assinaturaAlturaOffset: clamp(nextY, -90, 45),
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
  };

  const getDragProps = (
    element: DraggableCertificateElement,
    label: string
  ): React.HTMLAttributes<HTMLElement> & { style?: React.CSSProperties } => {
    if (!interactiveDrag || side !== 'front') return {};
    const isDragging = activeDrag === element;
    return {
      title: `Arraste para mover: ${label}`,
      onPointerDown: (e) => handleDragPointerDown(element, e),
      onPointerMove: (e) => handleDragPointerMove(element, e),
      onPointerUp: handleDragPointerEnd,
      onPointerCancel: handleDragPointerEnd,
      style: {
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        touchAction: 'none',
        outline: isDragging
          ? '2px solid #2563eb'
          : '1.5px dashed rgba(37, 99, 235, 0.5)',
        outlineOffset: '5px',
        borderRadius: '6px',
      },
    };
  };
  const effectiveDisciplines =
    student.disciplinas && student.disciplinas.length > 0
      ? student.disciplinas
      : template.disciplinas;

  const { totalHorasLabel, mediaFinalLabel } = computeBackTotals(
    effectiveDisciplines,
    template
  );

  const periodStart = student.dataInicioExtenso || template.textoPeriodoInicio;
  const periodEnd = student.dataFimExtenso || template.textoPeriodoFim;

  const replacements = {
    ALUNO: student.nomeExibicao || student.nomeCompleto || 'ALUNO',
    POSTO_GRADUACAO: student.postoGraduacao || '',
    NOME_COMPLETO: student.nomeCompleto || '',
    CURSO: student.cursoNome || 'Curso de Formação de Marinheiros',
    TURMA: student.turmaNome || '',
    DATA_INICIO: periodStart,
    DATA_FIM: periodEnd,
    CARGA_HORARIA: totalHorasLabel,
    MEDIA_FINAL: mediaFinalLabel,
  };

  const baseBodyItalic =
    template.textoCorpoItalico ?? (template.fonteCorpo !== 'sans');
  const baseBodyBold = template.textoCorpoNegrito ?? false;

  const bodySegments = resolveCertificateBodySegments(
    template.textoCorpo,
    replacements,
    {
      defaultBold: baseBodyBold,
      defaultItalic: baseBodyItalic,
    }
  );
  const backTitleResolved = resolveSimplePlaceholders(
    template.versoTituloCurso || '{{CURSO}}',
    replacements
  ).toUpperCase();

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

  // Crest sizes, opacities & right caption anti-duplication
  const leftLogoSize = template.tamanhoLogoEsquerda ?? 90;
  const leftLogoOpacity = template.opacidadeLogoEsquerda ?? 1;
  const rightLogoSize = template.tamanhoLogoDireita ?? 74;
  const rightLogoOpacity = template.opacidadeLogoDireita ?? 1;
  const hasCustomRightLogo = Boolean(template.logoDireitaUrl && template.logoDireitaUrl.trim());
  const showRightCaption = hasCustomRightLogo
    ? template.mostrarLegendaLogoDireita === true
    : template.mostrarLegendaLogoDireita !== false;
  const rightCaptionText = showRightCaption
    ? (template.logoDireitaTexto ?? 'MARINHA DO BRASIL').trim()
    : '';

  const useOriginalFrame = template.usarMolduraOriginal !== false;

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
          id={elementId}
          data-certificate-side="front"
          style={sheetBaseStyle}
          className="shadow-xl"
        >
          {/* Original Ornate Frame (or optional vector tint frame) */}
          {useOriginalFrame ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={
                !template.molduraFrenteUrl ||
                template.molduraFrenteUrl === '/assets/certificado-moldura-frente.png'
                  ? '/assets/certificado-moldura-frente.png?v=hd2'
                  : template.molduraFrenteUrl
              }
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
                zIndex: 5,
              }}
            />
          ) : (
            <NauticalOrnateFrame borderColor={template.corBordaFrente || '#52525b'} />
          )}

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
                src={template.marcaDaguaFrenteUrl}
                alt="Marca d'água"
                crossOrigin="anonymous"
                style={{
                  width: `${frontWmWidth}px`,
                  height: `${frontWmHeight}px`,
                  maxWidth: 'none',
                  maxHeight: 'none',
                  objectFit: frontWmScaleW === frontWmScaleH ? 'contain' : 'fill',
                  opacity: template.opacidadeMarcaDaguaFrente ?? 0.24,
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
            {/* Header Logos */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                padding: '0 24px',
                minHeight: '96px',
              }}
            >
              {(() => {
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
                    {template.logoEsquerdaUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={template.logoEsquerdaUrl}
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
                    )}
                  </div>
                );
              })()}

              {(() => {
                const drag = getDragProps('logoDireita', 'Brasão Direito');
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
                    <MarinhaBrasilCrest
                      customUrl={template.logoDireitaUrl}
                      label={rightCaptionText}
                      size={rightLogoSize}
                      opacity={rightLogoOpacity}
                    />
                  </div>
                );
              })()}
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
                return (
                  <h1
                    {...drag}
                    style={{
                      margin: 0,
                      position: 'relative',
                      left: `${template.tituloOffsetX ?? 0}px`,
                      top: `${template.tituloOffsetY ?? 0}px`,
                      zIndex: activeDrag === 'titulo' ? 20 : 12,
                      fontSize: '42px',
                      fontWeight: titleBold ? 700 : 400,
                      fontStyle: titleItalic ? 'italic' : 'normal',
                      letterSpacing: '0.16em',
                      color: '#0f172a',
                      fontFamily: titleFontCss,
                      textAlign: 'center',
                      textTransform: 'uppercase',
                      ...drag.style,
                    }}
                  >
                    {template.titulo || 'CERTIFICADO DE CONCLUSÃO'}
                  </h1>
                );
              })()}

              {(() => {
                const drag = getDragProps('texto', 'Todo o Texto (Corpo e Data)');
                return (
                  <div
                    {...drag}
                    style={{
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '24px',
                      position: 'relative',
                      left: `${template.textoOffsetX ?? 0}px`,
                      top: `${template.textoOffsetY ?? 0}px`,
                      zIndex: activeDrag === 'texto' ? 20 : 12,
                      ...drag.style,
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        width: '100%',
                        fontSize: `${template.tamanhoFonteCorpo || 19}px`,
                        lineHeight: 1.82,
                        fontFamily: bodyFontCss,
                        color: '#0f172a',
                        textAlign: template.alinhamentoTexto || 'left',
                      }}
                    >
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

                    <p
                      style={{
                        margin: '4px 0 0 0',
                        fontSize: `${Math.max(16, (template.tamanhoFonteCorpo || 19) - 1)}px`,
                        fontFamily: bodyFontCss,
                        fontWeight: dateBold ? 700 : 400,
                        fontStyle: dateItalic ? 'italic' : 'normal',
                        color: '#0f172a',
                        textAlign: 'center',
                      }}
                    >
                      {template.localEmissao || 'São Tomé e Príncipe'},{' '}
                      {template.dataEmissaoExtenso || formatTodayFallback()}.
                    </p>
                  </div>
                );
              })()}
            </div>

            {/* Signatures */}
            {(() => {
              const sigAlign = template.assinaturaAlinhamento || 'right';
              const sigHeightOffset = template.assinaturaAlturaOffset ?? 0;
              const sigJustify = template.mostrarSegundaAssinatura
                ? 'space-between'
                : sigAlign === 'left'
                  ? 'flex-start'
                  : sigAlign === 'center'
                    ? 'center'
                    : 'flex-end';
              const drag = getDragProps('assinatura', 'Altura da Assinatura');

              return (
                <div
                  {...drag}
                  style={{
                    position: 'relative',
                    top: `${sigHeightOffset}px`,
                    zIndex: activeDrag === 'assinatura' ? 20 : 12,
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: sigJustify,
                    padding: '0 28px 6px 28px',
                    gap: '32px',
                    ...drag.style,
                  }}
                >
                  {template.mostrarSegundaAssinatura && (
                    <div
                      style={{
                        textAlign: 'center',
                        minWidth: '300px',
                        fontFamily: signatureFontCss,
                        fontStyle: sigItalic ? 'italic' : 'normal',
                        color: '#0f172a',
                        lineHeight: 1.35,
                      }}
                    >
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: sigBold ? 700 : 400,
                          letterSpacing: '0.03em',
                        }}
                      >
                        {template.segundaAssinaturaNome || 'ASSINATURA'}
                      </div>
                      {template.segundaAssinaturaPosto && (
                        <div style={{ fontSize: '13.5px', fontWeight: sigBold ? 700 : 400 }}>
                          {template.segundaAssinaturaPosto}
                        </div>
                      )}
                      {template.segundaAssinaturaCargo && (
                        <div style={{ fontSize: '13px', fontWeight: sigBold ? 700 : 400 }}>
                          {template.segundaAssinaturaCargo}
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    style={{
                      textAlign: 'center',
                      minWidth: '390px',
                      marginLeft:
                        !template.mostrarSegundaAssinatura && sigAlign === 'left' ? '16px' : '0',
                      marginRight:
                        !template.mostrarSegundaAssinatura && sigAlign === 'right' ? '16px' : '0',
                      fontFamily: signatureFontCss,
                      fontStyle: sigItalic ? 'italic' : 'normal',
                      color: '#0f172a',
                      lineHeight: 1.35,
                    }}
                  >
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
                  </div>
                </div>
              );
            })()}
          </div>
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
        style={{
          ...sheetBaseStyle,
          padding: '20px',
        }}
        className="shadow-xl"
      >
        {/* Outer Thick Navy Frame */}
        <div
          style={{
            width: '100%',
            height: '100%',
            border: `7px solid ${navyBorder}`,
            padding: '5px',
            boxSizing: 'border-box',
            position: 'relative',
          }}
        >
          {/* Inner Hairline Navy Frame */}
          <div
            style={{
              width: '100%',
              height: '100%',
              border: `2.5px solid ${navyBorder}`,
              padding: '10px 18px 14px 18px',
              boxSizing: 'border-box',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Back Header */}
            <div
              style={{
                position: 'relative',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '6px',
                padding: '0 8px',
                gap: '16px',
              }}
            >
              <div
                style={{
                  width: '70px',
                  height: '72px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {template.logoEsquerdaUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={template.logoEsquerdaUrl}
                    alt="Brasão Guarda Costeira"
                    crossOrigin="anonymous"
                    style={{
                      width: '66px',
                      height: '70px',
                      objectFit: 'contain',
                      opacity: leftLogoOpacity,
                    }}
                  />
                )}
              </div>

              <h2
                style={{
                  margin: 0,
                  flex: 1,
                  textAlign: 'center',
                  fontSize: '30px',
                  fontWeight: 800,
                  fontStyle: versoItalic ? 'italic' : 'normal',
                  color: '#0f172a',
                  fontFamily: versoFontCss,
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                  lineHeight: 1.15,
                }}
              >
                {backTitleResolved}
              </h2>

              <MarinhaBrasilCrest
                customUrl={template.logoDireitaUrl}
                label={rightCaptionText}
                compact={true}
                opacity={rightLogoOpacity}
              />
            </div>

            {/* Disciplines Table Wrapper (Watermark distributed strictly across the table sheet area like original, expandable freely) */}
            <div
              style={{
                position: 'relative',
                zIndex: 10,
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Watermark distributed across table area from DISCIPLINAS down to MÉDIA FINAL */}
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
                    pointerEvents: 'none',
                    zIndex: 0,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={template.marcaDaguaVersoUrl}
                    alt="Marca d'água Verso"
                    crossOrigin="anonymous"
                    style={{
                      width: `${backWmWidth}px`,
                      height: `${backWmHeight}px`,
                      maxWidth: 'none',
                      maxHeight: 'none',
                      objectFit: backWmScaleW === backWmScaleH ? 'contain' : 'fill',
                      opacity: template.opacidadeMarcaDaguaVerso ?? 0.25,
                    }}
                  />
                </div>
              )}

              <table
                style={{
                  position: 'relative',
                  zIndex: 2,
                  width: '100%',
                  height: '100%',
                  borderCollapse: 'collapse',
                  fontFamily: versoFontCss,
                  fontStyle: versoItalic ? 'italic' : 'normal',
                  color: '#0f172a',
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
                  {effectiveDisciplines.map((disc, idx) => (
                    <tr key={disc.id || idx}>
                      <td
                        style={{
                          padding: '8px 10px 8px 4px',
                          fontSize: effectiveDisciplines.length > 6 ? '15px' : '19px',
                          fontWeight: 500,
                          lineHeight: 1.28,
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
                          padding: '8px 8px',
                          fontSize: effectiveDisciplines.length > 6 ? '20px' : '27px',
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
                          padding: '8px 4px 8px 8px',
                          fontSize: effectiveDisciplines.length > 6 ? '20px' : '24px',
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
                  ))}

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
