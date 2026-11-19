export type CertificateCourseScope = 'formacao_marinheiros' | 'expedito' | 'geral';

export interface CertificateDisciplineRow {
  id: string;
  nome: string;
  carga_horaria: string;
  nota: string;
  modulo?: number | null;
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
  textoCorpoPorAluno?: Record<string, string>;
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
  assinaturaPrincipalOffsetX?: number;
  assinaturaPrincipalOffsetY?: number;
  segundaAssinaturaOffsetX?: number;
  segundaAssinaturaOffsetY?: number;
  logoEsquerdaOffsetX?: number;
  logoEsquerdaOffsetY?: number;
  logoCentroOffsetX?: number;
  logoCentroOffsetY?: number;
  logoDireitaOffsetX?: number;
  logoDireitaOffsetY?: number;
  tituloOffsetX?: number;
  tituloOffsetY?: number;
  textoOffsetX?: number;
  textoOffsetY?: number;
  dataAlinhamento?: 'left' | 'center' | 'right';
  dataOffsetX?: number;
  dataOffsetY?: number;

  // Back (Verso)
  versoTituloCurso: string;
  versoColunaDisciplina: string;
  versoColunaCargaHoraria: string;
  versoColunaNota: string;
  versoLabelCargaTotal: string;
  versoLabelMediaFinal: string;
  disciplinas: CertificateDisciplineRow[];
  agruparPorModulos?: boolean;
  cargaHorariaTotalManual: string;
  mediaFinalManual: string;
  usarCalculoAutomaticoVerso: boolean;

  // Visuals & Logos
  usarMolduraOriginal?: boolean;
  molduraFrenteUrl?: string;
  mostrarLogoEsquerda?: boolean;
  mostrarLogoCentro?: boolean;
  mostrarLogoDireita?: boolean;
  logoEsquerdaUrl: string;
  logoCentroUrl?: string;
  logoCentroTexto?: string;
  mostrarLegendaLogoCentro?: boolean;
  logoDireitaUrl: string; // '' uses built-in Marinha do Brasil crest
  logoDireitaTexto: string;
  mostrarLegendaLogoDireita?: boolean;
  tamanhoLogoEsquerda?: number;
  opacidadeLogoEsquerda?: number;
  tamanhoLogoCentro?: number;
  opacidadeLogoCentro?: number;
  tamanhoLogoDireita?: number;
  opacidadeLogoDireita?: number;
  marcaDaguaFrenteUrl: string;
  marcaDaguaVersoUrl: string;
  opacidadeMarcaDaguaFrente: number;
  opacidadeMarcaDaguaVerso: number;
  tamanhoMarcaDaguaFrente?: number;
  escalaLarguraMarcaDaguaFrente?: number;
  escalaAlturaMarcaDaguaFrente?: number;
  marcaDaguaFrenteOffsetY?: number;
  tamanhoMarcaDaguaVerso?: number;
  escalaLarguraMarcaDaguaVerso?: number;
  escalaAlturaMarcaDaguaVerso?: number;
  marcaDaguaVersoOffsetY?: number;
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
  textoCorpoPersonalizado?: string;
  genero?: string | null;
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
    modulo: 1,
    nome: 'MÓDULO 1 - CONTROLE DE AVARIAS / O NAVIO.',
    carga_horaria: '24h',
    nota: '19,50',
  },
  {
    id: 'mod-2',
    modulo: 2,
    nome: 'MÓDULO 2 - ARTE MARINHEIRA / EMBARCAÇÕES MIÚDAS / MASSAME E POLEAME / SOBREVIVÊNCIA NO MAR.',
    carga_horaria: '58h',
    nota: '19,50',
  },
  {
    id: 'mod-3',
    modulo: 3,
    nome: 'MÓDULO 3 - COMUNICAÇÕES / GOVERNO DO NAVIO / NOÇÕES DE VIGILÂNCIA.',
    carga_horaria: '42h',
    nota: '19,50',
  },
  {
    id: 'mod-4',
    modulo: 4,
    nome: 'MÓDULO 4 - PRIMEIROS SOCORROS.',
    carga_horaria: '20h',
    nota: '19,50',
  },
];

export const DEFAULT_EXPEDITO_DISCIPLINES: CertificateDisciplineRow[] = [
  {
    id: 'exp-1',
    modulo: 1,
    nome: 'MÓDULO 1 - FUNDAMENTOS TÉCNICOS E OPERACIONAIS.',
    carga_horaria: '20h',
    nota: '18,00',
  },
  {
    id: 'exp-2',
    modulo: 2,
    nome: 'MÓDULO 2 - PRÁTICAS PROFISSIONAIS E SEGURANÇA MARÍTIMA.',
    carga_horaria: '20h',
    nota: '18,50',
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
    textoCorpoPorAluno: {},
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
    assinaturaPrincipalOffsetX: 0,
    assinaturaPrincipalOffsetY: 0,
    segundaAssinaturaOffsetX: 0,
    segundaAssinaturaOffsetY: 0,
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
    dataAlinhamento: 'center',
    dataOffsetX: 0,
    dataOffsetY: 0,
    versoTituloCurso: isExpedito ? '{{CURSO}}' : 'CURSO DE FORMAÇÃO DE MARINHEIROS',
    versoColunaDisciplina: 'DISCIPLINAS',
    versoColunaCargaHoraria: 'CARGA HORÁRIA',
    versoColunaNota: 'NOTA',
    versoLabelCargaTotal: 'CARGA HORÁRIA TOTAL',
    versoLabelMediaFinal: 'MÉDIA FINAL',
    disciplinas: isExpedito
      ? DEFAULT_EXPEDITO_DISCIPLINES.map((d) => ({ ...d }))
      : DEFAULT_MARINHEIROS_DISCIPLINES.map((d) => ({ ...d })),
    agruparPorModulos: true,
    cargaHorariaTotalManual: '',
    mediaFinalManual: '',
    usarCalculoAutomaticoVerso: true,
    usarMolduraOriginal: true,
    molduraFrenteUrl: '/assets/certificado-moldura-frente.png',
    mostrarLogoEsquerda: true,
    mostrarLogoCentro: false,
    mostrarLogoDireita: true,
    logoEsquerdaUrl: '/assets/aistudio/imagem_01_2da3aec8.png',
    logoCentroUrl: '',
    logoCentroTexto: '',
    mostrarLegendaLogoCentro: false,
    logoDireitaUrl: '',
    logoDireitaTexto: 'MARINHA DO BRASIL',
    mostrarLegendaLogoDireita: true,
    tamanhoLogoEsquerda: 90,
    opacidadeLogoEsquerda: 1,
    tamanhoLogoCentro: 84,
    opacidadeLogoCentro: 1,
    tamanhoLogoDireita: 74,
    opacidadeLogoDireita: 1,
    marcaDaguaFrenteUrl: '/assets/aistudio/WhatsApp_Image_2026-02-11_at_22.02.18_8edf921e.jpeg',
    marcaDaguaVersoUrl: '/assets/aistudio/imagem_01_2da3aec8.png',
    opacidadeMarcaDaguaFrente: 0.24,
    opacidadeMarcaDaguaVerso: 0.25,
    tamanhoMarcaDaguaFrente: 545,
    escalaLarguraMarcaDaguaFrente: 100,
    escalaAlturaMarcaDaguaFrente: 100,
    marcaDaguaFrenteOffsetY: 0,
    tamanhoMarcaDaguaVerso: 580,
    escalaLarguraMarcaDaguaVerso: 100,
    escalaAlturaMarcaDaguaVerso: 100,
    marcaDaguaVersoOffsetY: 0,
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

export function createBlankTemplate(
  nomeModelo = 'Novo Modelo de Certificado',
  scope: CertificateCourseScope = 'geral'
): CertificateTemplateConfig {
  const base = createPresetTemplate(
    scope === 'expedito' ? 'expedito' : 'formacao_marinheiros'
  );
  return {
    ...base,
    id: undefined,
    templateKey: `custom_${Date.now()}`,
    nomeModelo: nomeModelo.trim() || 'Novo Modelo de Certificado',
    scope,
    turmaId: null,
    cursoId: null,
    titulo: 'CERTIFICADO',
    textoCorpo: '',
    textoCorpoPorAluno: {},
    textoPeriodoInicio: '',
    textoPeriodoFim: '',
    versoTituloCurso: '',
    disciplinas: [],
    cargaHorariaTotalManual: '',
    mediaFinalManual: '',
  };
}

export function isFemaleStudentGenero(genero?: string | null): boolean {
  const g = String(genero || '').trim().toLowerCase();
  return (
    g === 'feminino' ||
    g === 'feminina' ||
    g === 'mulher' ||
    g === 'f' ||
    g === 'female'
  );
}

/**
 * Adapts the Portuguese article immediately before the student's rank/name
 * ("a" when female, "ao" when male) for {{ARTIGO}}, {{ALUNO}}, {{POSTO_GRADUACAO}},
 * or literal rank phrases (e.g. "certificado ao 1º Cabo" -> "certificado a 1º Cabo").
 */
export function adaptPortugueseStudentArticle(
  text: string,
  isFemale: boolean,
  studentRank?: string
): string {
  if (!text) return text;
  const targetLower = isFemale ? 'a' : 'ao';
  const targetUpper = isFemale ? 'A' : 'AO';
  const targetCap = isFemale ? 'A' : 'Ao';

  const formatMatchedArticle = (art: string) => {
    if (art === art.toUpperCase() && art.length >= 1 && art === 'AO') return targetUpper;
    if (art === 'A') return targetUpper;
    if (art === 'Ao') return targetCap;
    return targetLower;
  };

  let result = text.replace(
    /\b(ao|à|a)(\s+\*{0,3}\{\{(?:ALUNO|POSTO_GRADUACAO)\}\})/gi,
    (full, art, rest, offset, whole) => {
      const before = whole.slice(0, offset);
      if (/\b(?:para|por|de|da|do|com|sem|sobre|entre|até|em)\s+$/i.test(before)) {
        return full;
      }
      return `${formatMatchedArticle(art)}${rest}`;
    }
  );

  const rankTrimmed = String(studentRank || '').trim();
  if (rankTrimmed) {
    const escapedRank = rankTrimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const literalRankRegex = new RegExp(
      `(\\b(?:certificado|outorgado|conferido|concedido|entregue|diploma)\\s+)(ao|à|a)(\\s+\\*{0,3}${escapedRank}\\b)`,
      'gi'
    );
    result = result.replace(
      literalRankRegex,
      (_full, prefix, art, suffix) => `${prefix}${formatMatchedArticle(art)}${suffix}`
    );
  }

  return result;
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

export function formatCertificateGradePT(
  val: number | string | null | undefined,
  fallback = '-'
): string {
  if (val === null || val === undefined || val === '') return fallback;
  const num = typeof val === 'number' ? val : Number(String(val).trim().replace(',', '.'));
  if (Number.isNaN(num)) return fallback;
  return (Math.round(num * 100) / 100).toFixed(2).replace('.', ',');
}

/**
 * Resolves a discipline/module grade using the exact same rules as Boletim Individual:
 * 1. Check direct discipline grade row's `nota{modNum}` / `nota_u{modNum}`.
 * 2. Check any student grade row for `nota{modNum}` / `nota_u{modNum}`.
 * 3. Only when `totalModules <= 1 && modNum === 1`, fall back to `nota_final` or `nota1`.
 */
export function resolveBoletimDisciplineGrade(
  disc: any | null,
  modNum: number,
  studentGrades: any[] = [],
  totalModules: number = 4
): number | null {
  if (!studentGrades || studentGrades.length === 0) return null;

  const isValidNum = (v: any) =>
    v !== null && v !== undefined && v !== '' && !Number.isNaN(Number(String(v).replace(',', '.')));
  const toNum = (v: any) => Number(String(v).replace(',', '.'));

  const directRows = disc?.id
    ? studentGrades.filter((g: any) => g.disciplina_id === disc.id)
    : [];

  const directWithModular = directRows.find((g: any) =>
    isValidNum(g[`nota${modNum}`] ?? g[`nota_u${modNum}`])
  );
  if (directWithModular) {
    return toNum(directWithModular[`nota${modNum}`] ?? directWithModular[`nota_u${modNum}`]);
  }

  const anyModularRow = studentGrades.find((g: any) =>
    isValidNum(g[`nota${modNum}`] ?? g[`nota_u${modNum}`])
  );
  if (anyModularRow) {
    return toNum(anyModularRow[`nota${modNum}`] ?? anyModularRow[`nota_u${modNum}`]);
  }

  if (totalModules <= 1 && modNum === 1) {
    const directGrade = directRows[0] || studentGrades[0];
    if (directGrade && isValidNum(directGrade.nota_final)) {
      return toNum(directGrade.nota_final);
    }
    if (directGrade && isValidNum(directGrade.nota1)) {
      return toNum(directGrade.nota1);
    }
  }

  return null;
}

export function extractModuleNumberFromText(text?: string | null): number | null {
  if (!text) return null;
  const match = String(text).match(/^\s*M[ÓO]DULO\s*(\d+)\b/i);
  if (!match) return null;
  const num = Number(match[1]);
  return Number.isFinite(num) && num > 0 ? num : null;
}

export function extractModuleNumberFromRow(row: CertificateDisciplineRow): number | null {
  if (row.modulo !== null && row.modulo !== undefined) {
    const num = Number(row.modulo);
    if (Number.isFinite(num) && num > 0) return num;
  }
  const fromName = extractModuleNumberFromText(row.nome);
  if (fromName) return fromName;
  if (row.id) {
    const idMatch = String(row.id).match(/^mod-(\d+)$/i);
    if (idMatch) {
      const num = Number(idMatch[1]);
      if (Number.isFinite(num) && num > 0) return num;
    }
  }
  return null;
}

export function stripModulePrefix(rawName: string): string {
  return String(rawName || '')
    .trim()
    .replace(/^\s*M[ÓO]DULO\s*\d+\s*[-–:.]?\s*/i, '')
    .replace(/\.+$/, '')
    .trim();
}

export function formatHoursLabel(totalHours: number, hasAnyNumeric: boolean): string {
  if (!hasAnyNumeric && totalHours <= 0) return '—';
  const rounded = Math.round(totalHours * 10) / 10;
  return `${rounded}h`;
}

/**
 * Groups editable CertificateDisciplineRow items that share the same module number
 * into a single row per module with combined discipline names, summed module workload,
 * and a single module grade. Rows without a module number remain standalone.
 */
export function groupCertificateRowsByModule(
  rows: CertificateDisciplineRow[]
): CertificateDisciplineRow[] {
  if (!rows || rows.length === 0) return [];

  const buckets = new Map<
    string,
    { modNum: number | null; items: CertificateDisciplineRow[] }
  >();
  const order: string[] = [];

  rows.forEach((row, idx) => {
    const modNum = extractModuleNumberFromRow(row);
    const key = modNum !== null ? `mod-${modNum}` : `single-${row.id || idx}`;
    if (!buckets.has(key)) {
      buckets.set(key, { modNum, items: [] });
      order.push(key);
    }
    buckets.get(key)!.items.push(row);
  });

  // Sort module buckets numerically while preserving relative order for ungrouped rows
  const moduleEntries = order
    .filter((k) => buckets.get(k)!.modNum !== null)
    .sort((a, b) => (buckets.get(a)!.modNum || 0) - (buckets.get(b)!.modNum || 0));
  const standaloneEntries = order.filter((k) => buckets.get(k)!.modNum === null);
  const finalOrder = [...moduleEntries, ...standaloneEntries];

  return finalOrder.map((key) => {
    const { modNum, items } = buckets.get(key)!;
    if (modNum === null) {
      return items[0];
    }

    const parts: string[] = [];
    const seenUpper = new Set<string>();
    let totalHours = 0;
    let hasNumericHours = false;
    const validGrades: number[] = [];

    for (const item of items) {
      const cleaned = stripModulePrefix(item.nome);
      if (cleaned) {
        const subParts = cleaned
          .split(/\s*\/\s*/)
          .map((s) => s.trim())
          .filter(Boolean);
        for (const sp of subParts) {
          const upper = sp.toUpperCase();
          if (!seenUpper.has(upper)) {
            seenUpper.add(upper);
            parts.push(upper);
          }
        }
      }

      const hStr = String(item.carga_horaria || '').trim();
      if (/\d/.test(hStr)) {
        hasNumericHours = true;
        totalHours += parseHoursValue(hStr);
      }

      const g = parseGradeValue(item.nota);
      if (g !== null) {
        validGrades.push(g);
      }
    }

    const moduleTitle =
      parts.length > 0
        ? `MÓDULO ${modNum} - ${parts.join(' / ')}.`
        : `MÓDULO ${modNum}.`;

    const avgGrade =
      validGrades.length > 0
        ? validGrades.reduce((acc, v) => acc + v, 0) / validGrades.length
        : null;

    return {
      id: `mod-${modNum}`,
      modulo: modNum,
      nome: moduleTitle,
      carga_horaria: formatHoursLabel(totalHours, hasNumericHours),
      nota: formatCertificateGradePT(avgGrade),
    };
  });
}

/**
 * Groups course database disciplines by modulo_index (falling back to materias_modulos
 * or module 1, matching Boletim Individual) and resolves a single grade per module
 * faithfully from Boletim grades (`nota{modNum}` / `nota_u{modNum}`).
 */
export function groupCourseDisciplinesByModule(
  courseDisciplines: any[],
  studentGrades: any[] = [],
  courseTopics: any[] = [],
  totalModules?: number
): CertificateDisciplineRow[] {
  if (!courseDisciplines || courseDisciplines.length === 0) return [];

  const resolved = courseDisciplines.map((disc: any) => {
    let modIdx = Number(disc.modulo_index);
    if (!Number.isFinite(modIdx) || modIdx <= 0) {
      const discTopics = (courseTopics || []).filter(
        (t: any) => t.disciplina_id === disc.id
      );
      if (discTopics.length > 0) {
        const validMods = discTopics
          .map((t: any) => Number(t.modulo_index))
          .filter((m: number) => Number.isFinite(m) && m > 0);
        if (validMods.length > 0) {
          modIdx = Math.min(...validMods);
        }
      }
    }
    if (!Number.isFinite(modIdx) || modIdx <= 0) {
      modIdx = 1;
    }
    return { ...disc, resolvedModuloIndex: modIdx };
  });

  const groups = new Map<number, any[]>();
  for (const disc of resolved) {
    const modNum = disc.resolvedModuloIndex;
    if (!groups.has(modNum)) {
      groups.set(modNum, []);
    }
    groups.get(modNum)!.push(disc);
  }

  const sortedModNumbers = Array.from(groups.keys()).sort((a, b) => a - b);
  const effectiveTotalModules =
    totalModules && totalModules > 0
      ? totalModules
      : Math.max(sortedModNumbers[sortedModNumbers.length - 1] || 1, 1);

  return sortedModNumbers.map((modNum) => {
    const discsInMod = [...(groups.get(modNum) || [])].sort((a: any, b: any) =>
      String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR')
    );

    // Collect cleaned discipline names in this module
    const names: string[] = [];
    const seenNames = new Set<string>();
    let modTotalHours = 0;
    let hasNumericHours = false;

    for (const d of discsInMod) {
      const cleaned = stripModulePrefix(String(d.nome || ''));
      if (cleaned) {
        const upper = cleaned.toUpperCase();
        if (!seenNames.has(upper)) {
          seenNames.add(upper);
          names.push(upper);
        }
      }
      if (d.carga_horaria !== null && d.carga_horaria !== undefined && d.carga_horaria !== '') {
        const h = parseHoursValue(d.carga_horaria);
        if (h > 0 || /\d/.test(String(d.carga_horaria))) {
          hasNumericHours = true;
          modTotalHours += h;
        }
      }
    }

    // Resolve single grade for this module identically to Boletim Individual
    const validGrades = discsInMod
      .map((d: any) =>
        resolveBoletimDisciplineGrade(d, modNum, studentGrades, effectiveTotalModules)
      )
      .filter((v): v is number => v !== null && !Number.isNaN(v));

    const moduleGrade: number | null =
      validGrades.length > 0 ? Math.max(...validGrades) : null;

    return {
      id: `mod-${modNum}`,
      modulo: modNum,
      nome:
        names.length > 0
          ? `MÓDULO ${modNum} - ${names.join(' / ')}.`
          : `MÓDULO ${modNum}.`,
      carga_horaria: formatHoursLabel(modTotalHours, hasNumericHours),
      nota: formatCertificateGradePT(moduleGrade),
    };
  });
}

export function computeBackTotals(
  rows: CertificateDisciplineRow[],
  template: CertificateTemplateConfig
): { totalHorasLabel: string; mediaFinalLabel: string } {
  const effectiveRows =
    template.agruparPorModulos !== false ? groupCertificateRowsByModule(rows) : rows;

  const sumHours = effectiveRows.reduce((acc, r) => acc + parseHoursValue(r.carga_horaria), 0);
  const validGrades = effectiveRows
    .map((r) => parseGradeValue(r.nota))
    .filter((v): v is number => v !== null);

  const avgGrade =
    validGrades.length > 0
      ? validGrades.reduce((acc, v) => acc + v, 0) / validGrades.length
      : null;

  const autoHoursLabel = sumHours > 0 ? `${Math.round(sumHours * 10) / 10}h` : '0h';
  const autoAvgLabel = formatCertificateGradePT(avgGrade);

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
    ARTIGO?: string;
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
    /(\*\*\*[^*]+?\*\*\*|\*\*[^*]+?\*\*|\*[^*]+?\*|\{\{(?:ALUNO|POSTO_GRADUACAO|NOME_COMPLETO|ARTIGO|CURSO|TURMA|DATA_INICIO|DATA_FIM|CARGA_HORARIA|MEDIA_FINAL)\}\})/g;

  const tokenRegex =
    /(\{\{(?:ALUNO|POSTO_GRADUACAO|NOME_COMPLETO|ARTIGO|CURSO|TURMA|DATA_INICIO|DATA_FIM|CARGA_HORARIA|MEDIA_FINAL)\}\})/g;

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

const PT_LOWERCASE_CONNECTORS = new Set([
  'de',
  'da',
  'do',
  'das',
  'dos',
  'e',
  'em',
  'no',
  'na',
  'nos',
  'nas',
  'a',
  'o',
  'as',
  'os',
  'ao',
  'aos',
  'à',
  'às',
  'para',
  'por',
  'com',
  'sem',
  'sob',
  'sobre',
  'entre',
  'até',
]);

/**
 * Formats a course or person name in Portuguese Title Case
 * (e.g. "Curso de Formação de Marinheiros", "1º Cabo Catiana Quaresma dos Santos Espírito"):
 * capitalizes initials while keeping prepositions/articles lowercase (except first word)
 * and preserving Roman numerals (II, III, IV, etc.).
 */
export function formatCourseTitleCasePT(raw?: string | null): string {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';

  const tokens = trimmed.split(/(\s+)/);
  let wordIdx = 0;

  return tokens
    .map((token) => {
      if (/^\s+$/.test(token)) return token;
      const currentWordIdx = wordIdx++;

      const match = token.match(
        /^([^A-Za-zÀ-ÖØ-öø-ÿ0-9]*)(.*?)([^A-Za-zÀ-ÖØ-öø-ÿ0-9]*)$/
      );
      if (!match) return token;
      const [, lead, core, trail] = match;
      if (!core) return token;

      const formattedCore = core
        .split('-')
        .map((part, partIdx) => {
          if (!part) return part;
          const lower = part.toLocaleLowerCase('pt-BR');
          if (/^(ii|iii|iv|v|vi|vii|viii|ix|x)$/i.test(lower)) {
            return lower.toUpperCase();
          }
          if ((currentWordIdx > 0 || partIdx > 0) && PT_LOWERCASE_CONNECTORS.has(lower)) {
            return lower;
          }
          if (lower.includes("'")) {
            return lower
              .split("'")
              .map((sub) =>
                sub ? sub.charAt(0).toLocaleUpperCase('pt-BR') + sub.slice(1) : sub
              )
              .join("'");
          }
          return lower.charAt(0).toLocaleUpperCase('pt-BR') + lower.slice(1);
        })
        .join('-');

      return `${lead}${formattedCore}${trail}`;
    })
    .join('');
}

export const formatNameTitleCasePT = formatCourseTitleCasePT;


