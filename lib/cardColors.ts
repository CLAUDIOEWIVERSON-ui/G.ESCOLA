export interface CardColorStyle {
  bg: string;
  hoverBg: string;
  border: string;
  hoverBorder: string;
  line: string;
  badge: string;
  text: string;
  avatarBg: string;
}

export const PRESET_THEMES: Record<string, CardColorStyle> = {
  blue: {
    bg: 'bg-blue-50/30',
    hoverBg: 'hover:bg-blue-50/60',
    border: 'border-blue-200/85',
    hoverBorder: 'hover:border-blue-400',
    line: 'bg-blue-600',
    badge: 'bg-blue-50 text-blue-700 border-blue-100',
    text: 'text-blue-600',
    avatarBg: 'bg-blue-100 text-blue-600'
  },
  amber: {
    bg: 'bg-amber-50/30',
    hoverBg: 'hover:bg-amber-50/60',
    border: 'border-amber-200/85',
    hoverBorder: 'hover:border-amber-400',
    line: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    text: 'text-amber-600',
    avatarBg: 'bg-amber-100 text-amber-600'
  },
  purple: {
    bg: 'bg-purple-50/30',
    hoverBg: 'hover:bg-purple-50/60',
    border: 'border-purple-200/85',
    hoverBorder: 'hover:border-purple-400',
    line: 'bg-purple-500',
    badge: 'bg-purple-50 text-purple-700 border-purple-100',
    text: 'text-purple-600',
    avatarBg: 'bg-purple-100 text-purple-600'
  },
  cyan: {
    bg: 'bg-cyan-50/30',
    hoverBg: 'hover:bg-cyan-50/60',
    border: 'border-cyan-200/85',
    hoverBorder: 'hover:border-cyan-400',
    line: 'bg-cyan-500',
    badge: 'bg-cyan-50 text-cyan-700 border-cyan-100',
    text: 'text-cyan-600',
    avatarBg: 'bg-cyan-100 text-cyan-600'
  },
  emerald: {
    bg: 'bg-emerald-50/30',
    hoverBg: 'hover:bg-emerald-50/60',
    border: 'border-emerald-200/85',
    hoverBorder: 'hover:border-emerald-400',
    line: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    text: 'text-emerald-600',
    avatarBg: 'bg-emerald-100 text-emerald-600'
  },
  rose: {
    bg: 'bg-rose-50/30',
    hoverBg: 'hover:bg-rose-50/60',
    border: 'border-rose-200/85',
    hoverBorder: 'hover:border-rose-400',
    line: 'bg-rose-500',
    badge: 'bg-rose-50 text-rose-700 border-rose-100',
    text: 'text-rose-600',
    avatarBg: 'bg-rose-100 text-rose-600'
  },
  orange: {
    bg: 'bg-orange-50/30',
    hoverBg: 'hover:bg-orange-50/60',
    border: 'border-orange-200/85',
    hoverBorder: 'hover:border-orange-400',
    line: 'bg-orange-500',
    badge: 'bg-orange-50 text-orange-700 border-orange-100',
    text: 'text-orange-600',
    avatarBg: 'bg-orange-100 text-orange-600'
  },
  lime: {
    bg: 'bg-lime-50/30',
    hoverBg: 'hover:bg-lime-50/60',
    border: 'border-lime-200/85',
    hoverBorder: 'hover:border-lime-400',
    line: 'bg-lime-500',
    badge: 'bg-lime-50 text-lime-700 border-lime-100',
    text: 'text-lime-600',
    avatarBg: 'bg-lime-100 text-lime-600'
  },
  fuchsia: {
    bg: 'bg-fuchsia-50/30',
    hoverBg: 'hover:bg-fuchsia-50/60',
    border: 'border-fuchsia-200/85',
    hoverBorder: 'hover:border-fuchsia-400',
    line: 'bg-fuchsia-500',
    badge: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100',
    text: 'text-fuchsia-600',
    avatarBg: 'bg-fuchsia-100 text-fuchsia-600'
  },
  sky: {
    bg: 'bg-sky-50/30',
    hoverBg: 'hover:bg-sky-50/60',
    border: 'border-sky-200/85',
    hoverBorder: 'hover:border-sky-400',
    line: 'bg-sky-500',
    badge: 'bg-sky-50 text-sky-700 border-sky-100',
    text: 'text-sky-600',
    avatarBg: 'bg-sky-100 text-sky-600'
  },
  slate: {
    bg: 'bg-slate-50/30',
    hoverBg: 'hover:bg-slate-50/60',
    border: 'border-slate-200/85',
    hoverBorder: 'hover:border-slate-400',
    line: 'bg-slate-500',
    badge: 'bg-slate-50 text-slate-700 border-slate-100',
    text: 'text-slate-600',
    avatarBg: 'bg-slate-100 text-slate-600'
  },
  indigo: {
    bg: 'bg-indigo-50/30',
    hoverBg: 'hover:bg-indigo-50/60',
    border: 'border-indigo-200/85',
    hoverBorder: 'hover:border-indigo-400',
    line: 'bg-indigo-500',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    text: 'text-indigo-600',
    avatarBg: 'bg-indigo-100 text-indigo-600'
  }
};

export const COLOR_LABELS: Record<string, string> = {
  blue: 'Azul',
  amber: 'Amarelo',
  purple: 'Roxo',
  cyan: 'Ciano',
  emerald: 'Verde',
  rose: 'Vermelho',
  orange: 'Laranja',
  lime: 'Verde Limão',
  fuchsia: 'Fúcsia',
  sky: 'Azul Céu',
  slate: 'Cinza',
  indigo: 'Índigo'
};

export const COLOR_BG_PRESETS: Record<string, string> = {
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
  purple: 'bg-purple-500',
  cyan: 'bg-cyan-500',
  emerald: 'bg-emerald-500',
  rose: 'bg-rose-500',
  orange: 'bg-orange-500',
  lime: 'bg-lime-500',
  fuchsia: 'bg-fuchsia-500',
  sky: 'bg-sky-500',
  slate: 'bg-slate-500',
  indigo: 'bg-indigo-500'
};

export type ColorSelection = 'blue' | 'amber' | 'purple' | 'cyan' | 'emerald' | 'rose' | 'orange' | 'lime' | 'fuchsia' | 'sky' | 'slate' | 'indigo';

export interface CardColorSettings {
  categories: Record<string, string>; // e.g. { expedito: 'amber', especial: 'purple', ... }
  groups: Record<string, string>;     // e.g. { 'CIABA': 'rose', ... }
}

export const DEFAULT_COLOR_SETTINGS: CardColorSettings = {
  categories: {
    expedito: 'amber',
    especial: 'purple',
    ead: 'cyan',
    carreira: 'emerald',
    exterior: 'blue'
  },
  groups: {}
};

export function getCardColorSettings(): CardColorSettings {
  if (typeof window === 'undefined') return DEFAULT_COLOR_SETTINGS;
  try {
    const saved = localStorage.getItem('school_card_color_settings');
    if (!saved) return DEFAULT_COLOR_SETTINGS;
    const parsed = JSON.parse(saved);
    return {
      categories: { ...DEFAULT_COLOR_SETTINGS.categories, ...parsed.categories },
      groups: { ...DEFAULT_COLOR_SETTINGS.groups, ...parsed.groups }
    };
  } catch {
    return DEFAULT_COLOR_SETTINGS;
  }
}

export function saveCardColorSettings(settings: CardColorSettings) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('school_card_color_settings', JSON.stringify(settings));
}

export function getCardStyleForItem(
  item: { categoria?: string | null; internacional?: boolean; grupo_responsavel?: string | null },
  settings: CardColorSettings = getCardColorSettings()
): CardColorStyle {
  // 1. Check if group_responsavel is defined and has a custom color
  if (item.grupo_responsavel) {
    const groupKey = item.grupo_responsavel.trim();
    if (settings.groups[groupKey]) {
      const themeKey = settings.groups[groupKey];
      if (PRESET_THEMES[themeKey]) {
        return PRESET_THEMES[themeKey];
      }
    }
  }

  // 2. Check if international/exterior
  if (item.internacional) {
    const themeKey = settings.categories.exterior;
    if (PRESET_THEMES[themeKey]) return PRESET_THEMES[themeKey];
  }

  // 3. Check category
  if (item.categoria) {
    const catLower = item.categoria.toLowerCase();
    const themeKey = settings.categories[catLower];
    if (PRESET_THEMES[themeKey]) return PRESET_THEMES[themeKey];
  }

  // Double check fallbacks
  return PRESET_THEMES.slate;
}
