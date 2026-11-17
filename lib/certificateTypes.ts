export type CertificateCourseScope = 'formacao_marinheiros' | 'expedito' | 'geral';

export interface CertificateDisciplineRow {
  id: string;
  nome: string;
  carga_horaria: string;
  nota: string;
}

export type CertificateFontKey =
  | 'garamond'
  | 'serif-italic'
  | 'times'
  | 'georgia'
  | 'palatino'
  | 'lora'
  | 'cinzel'
  | 'script'
  | 'sans';

export interface CertificateTemplateConfig {
  id?: string;
  templateKey: string;
  nomeModelo: string;
  scope: CertificateCourseScope;
  turmaId?: string | null;
  cursoId?: string | null;

  // Front (Frente)
  titulo: string;
  textoCorpo: string;
  textoPeriodoInicio: string;
  textoPeriodoFim: string;
  localEmissao: string;
  dataEmissaoExtenso: string;
  assinaturaNome: string;
  assinaturaPosto: string;
  assinaturaCargo: string;
  mostrarSegundaAssinatura: boolean;
  segundaAssinaturaNome: string;
  segundaAssinaturaPosto: string;
  segundaAssinaturaCargo: string;
  assinaturaAlinhamento?: 'left' | 'center' | 'right';
  assinaturaAlturaOffset?: number;
  logoEsquerdaOffsetX?: number;
  logoEsquerdaOffsetY?: number;
  logoDireitaOffsetX?: number;
  logoDireitaOffsetY?: number;
  tituloOffsetX?: number;
  tituloOffsetY?: number;
  textoOffsetX?: number;
  textoOffsetY?: number;

  // Back (Verso)
  versoTituloCurso: string;
  versoColunaDisciplina: string;
  versoColunaCargaHoraria: string;
  versoColunaNota: string;
  versoLabelCargaTotal: string;
  versoLabelMediaFinal: string;
  disciplinas: CertificateDisciplineRow[];
  cargaHorariaTotalManual: string;
  mediaFinalManual: string;
  usarCalculoAutomaticoVerso: boolean;

  // Visuals & Logos
  usarMolduraOriginal?: boolean;
  molduraFrenteUrl?: string;
  logoEsquerdaUrl: string;
  logoDireitaUrl: string; // '' uses built-in Marinha do Brasil crest
  logoDireitaTexto: string;
  mostrarLegendaLogoDireita?: boolean;
  tamanhoLogoEsquerda?: number;
  opacidadeLogoEsquerda?: number;
  tamanhoLogoDireita?: number;
  opacidadeLogoDireita?: number;
  marcaDaguaFrenteUrl: string;
  marcaDaguaVersoUrl: string;
  opacidadeMarcaDaguaFrente: number;
  opacidadeMarcaDaguaVerso: number;
  tamanhoMarcaDaguaFrente?: number;
  escalaLarguraMarcaDaguaFrente?: number;
  escalaAlturaMarcaDaguaFrente?: number;
  tamanhoMarcaDaguaVerso?: number;
  escalaLarguraMarcaDaguaVerso?: number;
  escalaAlturaMarcaDaguaVerso?: number;
  corBordaFrente: string;
  corBordaVerso: string;

  // Typography & Inline Styles
  fonteCorpo: CertificateFontKey;
  fonteTitulo?: CertificateFontKey;
  fonteAssinatura?: CertificateFontKey;
  fonteVerso?: CertificateFontKey;
  textoCorpoItalico?: boolean;
  textoCorpoNegrito?: boolean;
  tituloItalico?: boolean;
  tituloNegrito?: boolean;
  dataItalico?: boolean;
  dataNegrito?: boolean;
  assinaturaItalico?: boolean;
  assinaturaNegrito?: boolean;
  versoItalico?: boolean;
  tamanhoFonteCorpo: number;
  alinhamentoTexto: 'left' | 'justify' | 'center';
}

export interface CertificateStudentContext {
  id?: string;
  nomeCompleto: string;
  postoGraduacao: string;
  nomeExibicao: string;
  cursoNome: string;
  turmaNome: string;
  dataInicioExtenso: string;
  dataFimExtenso: string;
  mediaFinalNumero: number | null;
  disciplinas: CertificateDisciplineRow[];
}

const MONTHS_PT = [
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

export function formatDateExtensoPT(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  let date: Date;
  if (dateInput instanceof Date) {
    date = dateInput;
  } else {
    const trimmed = String(dateInput).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      date = new Date(`${trimmed.slice(0, 10)}T12:00:00`);
    } else {
      date = new Date(trimmed);
    }
  }
  if (Number.isNaN(date.getTime())) return String(dateInput || '');

  const day = String(date.getDate()).padStart(2, '0');
  const month = MONTHS_PT[date.getMonth()] || '';
  const year = date.getFullYear();
  return `${day} de ${month} de ${year}`;
}

export function formatPeriodStartEndPT(
  startInput?: string | null,
  endInput?: string | null
): { inicio: string; fim: string } {
  const startStr = formatDateExtensoPT(startInput);
  const endStr = formatDateExtensoPT(endInput);
  if (startStr && endStr) {
    const startYear = startStr.slice(-4);
    const endYear = endStr.slice(-4);
    if (startYear === endYear && startStr.includes(' de ')) {
      // "08 de outubro a 10 de dezembro de 2026"
      const idx = startStr.lastIndexOf(' de ');
      if (idx > 0) {
        return {
          inicio: startStr.slice(0, idx),
          fim: endStr,
        };
      }
    }
  }
  return {
    inicio: startStr || '08 de outubro',
    fim: endStr || formatDateExtensoPT(new Date()),
  };
}

export const DEFAULT_MARINHEIROS_DISCIPLINES: CertificateDisciplineRow[] = [
  {
    id: 'mod-1',
    nome: 'MÓDULO 1 - CONTROLE DE AVARIAS / O NAVIO.',
    carga_horaria: '24h',
    nota: '19.5',
  },
  {
    id: 'mod-2',
    nome: 'MÓDULO 2 - ARTE MARINHEIRA / EMBARCAÇÕES MIÚDAS / MASSAME E POLEAME / SOBREVIVÊNCIA NO MAR.',
    carga_horaria: '58h',
    nota: '19.5',
  },
  {
    id: 'mod-3',
    nome: 'MÓDULO 3 - COMUNICAÇÕES / GOVERNO DO NAVIO / NOÇÕES DE VIGILÂNCIA.',
    carga_horaria: '42h',
    nota: '19.5',
  },
  {
    id: 'mod-4',
    nome: 'MÓDULO 4 - PRIMEIROS SOCORROS.',
    carga_horaria: '20h',
    nota: '19.5',
  },
];

export const DEFAULT_EXPEDITO_DISCIPLINES: CertificateDisciplineRow[] = [
  {
    id: 'exp-1',
    nome: 'MÓDULO 1 - FUNDAMENTOS TÉCNICOS E OPERACIONAIS.',
    carga_horaria: '20h',
    nota: '18.0',
  },
  {
    id: 'exp-2',
    nome: 'MÓDULO 2 - PRÁTICAS PROFISSIONAIS E SEGURANÇA MARÍTIMA.',
    carga_horaria: '20h',
    nota: '18.5',
  },
];

export function createPresetTemplate(
  scope: CertificateCourseScope = 'formacao_marinheiros'
): CertificateTemplateConfig {
  const isExpedito = scope === 'expedito';
  return {
    templateKey: isExpedito ? 'preset_expedito' : 'preset_formacao_marinheiros',
    nomeModelo: isExpedito
      ? 'Modelo Padrão — Cursos Expeditos'
      : 'Modelo Padrão — Curso de Formação de Marinheiros',
    scope,
    turmaId: null,
    cursoId: null,
    titulo: 'CERTIFICADO DE CONCLUSÃO',
    textoCorpo: isExpedito
      ? 'É outorgado o presente certificado ao {{ALUNO}}, por haver concluído com aproveitamento o {{CURSO}} (Curso Expedito), realizado no âmbito da cooperação entre a Guarda Costeira de São Tomé e Príncipe e a Missão de Assessoria Naval do Brasil, no período de {{DATA_INICIO}} a {{DATA_FIM}}.'
      : 'É outorgado o presente certificado ao {{ALUNO}}, por haver concluído o {{CURSO}}, realizado no âmbito da cooperação entre a Guarda Costeira de São Tomé e Príncipe e a Missão de Assessoria Naval do Brasil, no período de {{DATA_INICIO}} a {{DATA_FIM}}.',
    textoPeriodoInicio: '08 de outubro',
    textoPeriodoFim: '10 de dezembro de 2026',
    localEmissao: 'São Tomé e Príncipe',
    dataEmissaoExtenso: '10 de dezembro de 2026',
    assinaturaNome: 'HEITOR MARCO DE SOUZA MUNARETTO',
    assinaturaPosto: 'Capitão de Fragata',
    assinaturaCargo: 'Chefe da Missão de Assessoria Naval do Brasil em São Tomé e Príncipe',
    mostrarSegundaAssinatura: false,
    segundaAssinaturaNome: '',
    segundaAssinaturaPosto: 'Comandante da Guarda Costeira',
    segundaAssinaturaCargo: 'Guarda Costeira de São Tomé e Príncipe',
    assinaturaAlinhamento: 'right',
    assinaturaAlturaOffset: 0,
    logoEsquerdaOffsetX: 0,
    logoEsquerdaOffsetY: 0,
    logoDireitaOffsetX: 0,
    logoDireitaOffsetY: 0,
    tituloOffsetX: 0,
    tituloOffsetY: 0,
    textoOffsetX: 0,
    textoOffsetY: 0,
    versoTituloCurso: isExpedito ? '{{CURSO}}' : 'CURSO DE FORMAÇÃO DE MARINHEIROS',
    versoColunaDisciplina: 'DISCIPLINAS',
    versoColunaCargaHoraria: 'CARGA HORÁRIA',
    versoColunaNota: 'NOTA',
    versoLabelCargaTotal: 'CARGA HORÁRIA TOTAL',
    versoLabelMediaFinal: 'MÉDIA FINAL',
    disciplinas: isExpedito
      ? DEFAULT_EXPEDITO_DISCIPLINES.map((d) => ({ ...d }))
      : DEFAULT_MARINHEIROS_DISCIPLINES.map((d) => ({ ...d })),
    cargaHorariaTotalManual: '',
    mediaFinalManual: '',
    usarCalculoAutomaticoVerso: true,
    usarMolduraOriginal: true,
    molduraFrenteUrl: '/assets/certificado-moldura-frente.png',
    logoEsquerdaUrl: '/assets/aistudio/imagem_01_2da3aec8.png',
    logoDireitaUrl: '',
    logoDireitaTexto: 'MARINHA DO BRASIL',
    mostrarLegendaLogoDireita: true,
    tamanhoLogoEsquerda: 90,
    opacidadeLogoEsquerda: 1,
    tamanhoLogoDireita: 74,
    opacidadeLogoDireita: 1,
    marcaDaguaFrenteUrl: '/assets/aistudio/WhatsApp_Image_2026-02-11_at_22.02.18_8edf921e.jpeg',
    marcaDaguaVersoUrl: '/assets/aistudio/imagem_01_2da3aec8.png',
    opacidadeMarcaDaguaFrente: 0.24,
    opacidadeMarcaDaguaVerso: 0.25,
    tamanhoMarcaDaguaFrente: 545,
    escalaLarguraMarcaDaguaFrente: 100,
    escalaAlturaMarcaDaguaFrente: 100,
    tamanhoMarcaDaguaVerso: 580,
    escalaLarguraMarcaDaguaVerso: 100,
    escalaAlturaMarcaDaguaVerso: 100,
    corBordaFrente: '#52525b',
    corBordaVerso: '#071b3b',
    fonteCorpo: 'garamond',
    fonteTitulo: 'garamond',
    fonteAssinatura: 'garamond',
    fonteVerso: 'sans',
    textoCorpoItalico: true,
    textoCorpoNegrito: false,
    tituloItalico: true,
    tituloNegrito: true,
    dataItalico: true,
    dataNegrito: false,
    assinaturaItalico: false,
    assinaturaNegrito: true,
    versoItalico: false,
    tamanhoFonteCorpo: 19,
    alinhamentoTexto: 'left',
  };
}

export function parseHoursValue(raw: string | number | null | undefined): number {
  if (raw === null || raw === undefined) return 0;
  const str = String(raw).replace(',', '.');
  const match = str.match(/(\d+(?:\.\d+)?)/);
  if (!match) return 0;
  const num = Number(match[1]);
  return Number.isNaN(num) ? 0 : num;
}

export function parseGradeValue(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const str = String(raw).trim().replace(',', '.');
  if (!str) return null;
  const num = Number(str);
  return Number.isNaN(num) ? null : num;
}

export function computeBackTotals(
  rows: CertificateDisciplineRow[],
  template: CertificateTemplateConfig
): { totalHorasLabel: string; mediaFinalLabel: string } {
  const sumHours = rows.reduce((acc, r) => acc + parseHoursValue(r.carga_horaria), 0);
  const validGrades = rows
    .map((r) => parseGradeValue(r.nota))
    .filter((v): v is number => v !== null);

  const avgGrade =
    validGrades.length > 0
      ? validGrades.reduce((acc, v) => acc + v, 0) / validGrades.length
      : null;

  const autoHoursLabel = sumHours > 0 ? `${Math.round(sumHours * 10) / 10}h` : '0h';
  const autoAvgLabel = avgGrade !== null ? (Math.round(avgGrade * 10) / 10).toFixed(1) : '-';

  if (!template.usarCalculoAutomaticoVerso) {
    return {
      totalHorasLabel: template.cargaHorariaTotalManual.trim() || autoHoursLabel,
      mediaFinalLabel: template.mediaFinalManual.trim() || autoAvgLabel,
    };
  }

  return {
    totalHorasLabel: autoHoursLabel,
    mediaFinalLabel: autoAvgLabel,
  };
}

export function resolveCertificateFontCss(key?: CertificateFontKey | string): string {
  switch (key) {
    case 'times':
      return '"Times New Roman", Times, serif';
    case 'georgia':
      return 'Georgia, "Times New Roman", serif';
    case 'palatino':
      return '"Palatino Linotype", "Book Antiqua", Palatino, serif';
    case 'lora':
      return 'var(--font-lora), "Lora", Georgia, serif';
    case 'cinzel':
      return 'var(--font-cinzel), "Cinzel", Georgia, serif';
    case 'script':
      return 'var(--font-script), "Great Vibes", "Brush Script MT", cursive';
    case 'sans':
      return 'Arial, Helvetica, sans-serif';
    case 'garamond':
    case 'serif-italic':
    default:
      return 'var(--font-garamond), "EB Garamond", Garamond, "Times New Roman", serif';
  }
}

export interface TextSegment {
  text: string;
  bold: boolean;
  italic: boolean;
}

/**
 * Resolves placeholders ({{ALUNO}}, {{CURSO}}, etc.) AND inline rich formatting markers:
 *   ***texto*** -> bold + italic
 *   **texto**   -> bold
 *   *texto*     -> italic
 */
export function resolveCertificateBodySegments(
  templateText: string,
  replacements: {
    ALUNO: string;
    POSTO_GRADUACAO: string;
    NOME_COMPLETO: string;
    CURSO: string;
    TURMA: string;
    DATA_INICIO: string;
    DATA_FIM: string;
    CARGA_HORARIA: string;
    MEDIA_FINAL: string;
  },
  defaults?: { defaultBold?: boolean; defaultItalic?: boolean }
): TextSegment[] {
  const defaultBold = defaults?.defaultBold ?? false;
  const defaultItalic = defaults?.defaultItalic ?? true;
  const boldTokens = new Set(['{{ALUNO}}', '{{POSTO_GRADUACAO}}', '{{NOME_COMPLETO}}', '{{CURSO}}']);

  // First match inline formatting markers or placeholder tokens
  const markerRegex =
    /(\*\*\*[^*]+?\*\*\*|\*\*[^*]+?\*\*|\*[^*]+?\*|\{\{(?:ALUNO|POSTO_GRADUACAO|NOME_COMPLETO|CURSO|TURMA|DATA_INICIO|DATA_FIM|CARGA_HORARIA|MEDIA_FINAL)\}\})/g;

  const tokenRegex =
    /(\{\{(?:ALUNO|POSTO_GRADUACAO|NOME_COMPLETO|CURSO|TURMA|DATA_INICIO|DATA_FIM|CARGA_HORARIA|MEDIA_FINAL)\}\})/g;

  const expandPlaceholders = (
    raw: string,
    forcedBold: boolean,
    forcedItalic: boolean
  ): TextSegment[] => {
    const out: TextSegment[] = [];
    const subParts = raw.split(tokenRegex);
    for (const sp of subParts) {
      if (!sp) continue;
      if (sp.startsWith('{{') && sp.endsWith('}}')) {
        const key = sp.slice(2, -2) as keyof typeof replacements;
        const val = replacements[key] ?? sp;
        out.push({
          text: val,
          bold: forcedBold || boldTokens.has(sp),
          italic: forcedItalic,
        });
      } else {
        out.push({
          text: sp,
          bold: forcedBold,
          italic: forcedItalic,
        });
      }
    }
    return out;
  };

  const parts = (templateText || '').split(markerRegex);
  const segments: TextSegment[] = [];

  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith('***') && part.endsWith('***') && part.length > 6) {
      segments.push(...expandPlaceholders(part.slice(3, -3), true, true));
    } else if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      segments.push(...expandPlaceholders(part.slice(2, -2), true, defaultItalic));
    } else if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      segments.push(...expandPlaceholders(part.slice(1, -1), defaultBold, true));
    } else if (part.startsWith('{{') && part.endsWith('}}')) {
      segments.push(...expandPlaceholders(part, defaultBold, defaultItalic));
    } else {
      segments.push({
        text: part,
        bold: defaultBold,
        italic: defaultItalic,
      });
    }
  }

  return segments;
}

export function resolveSimplePlaceholders(
  raw: string,
  replacements: Record<string, string>
): string {
  let out = raw || '';
  for (const [key, val] of Object.entries(replacements)) {
    out = out.replaceAll(`{{${key}}}`, val);
  }
  return out;
}
