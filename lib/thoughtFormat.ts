export interface ThoughtCopyItem {
  texto: string;
  autor: string;
  reflexao?: string;
  categoria?: string;
  data_exibicao?: string;
}

const CATEGORY_LABELS: Record<string, { pt: string; en: string }> = {
  motivacional: { pt: 'Superação & Motivação', en: 'Motivation & Resilience' },
  estoico: { pt: 'Estoicismo & Disciplina', en: 'Stoicism & Discipline' },
  filosofico: { pt: 'Filosofia & Sabedoria', en: 'Philosophy & Wisdom' },
  religioso: { pt: 'Fé & Espiritualidade', en: 'Faith & Spirituality' },
  oriental: { pt: 'Sabedoria Oriental', en: 'Eastern Wisdom' },
  lideranca: { pt: 'Liderança & Espírito de Corpo', en: 'Leadership & Comradery' },
  gratidao: { pt: 'Gratidão & Esperança', en: 'Gratitude & Hope' },
};

function formatThoughtDate(dateStr: string | undefined, isPt: boolean): string {
  let targetDate = new Date();
  if (dateStr && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const parsed = new Date(`${dateStr.slice(0, 10)}T12:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      targetDate = parsed;
    }
  }

  const locale = isPt ? 'pt-BR' : 'en-US';
  const shortDate = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(targetDate);

  const longDate = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(targetDate);

  return `${shortDate} (${longDate})`;
}

export function formatThoughtForCopy(
  item: ThoughtCopyItem,
  options: { isPt?: boolean; includePillars?: boolean } = {}
): string {
  const isPt = options.isPt ?? true;
  const includePillars = options.includePillars ?? true;

  const formattedDate = formatThoughtDate(item.data_exibicao, isPt);
  const categoryKey = item.categoria ? String(item.categoria).toLowerCase() : '';
  const categoryLabel = categoryKey
    ? CATEGORY_LABELS[categoryKey]?.[isPt ? 'pt' : 'en'] || item.categoria
    : '';

  const lines: string[] = [];

  lines.push('========================================');
  lines.push(isPt ? 'PENSAMENTO DO DIA' : 'THOUGHT OF THE DAY');
  lines.push(`${isPt ? 'Data' : 'Date'}: ${formattedDate}`);
  if (categoryLabel) {
    lines.push(`${isPt ? 'Tema / Categoria' : 'Theme / Category'}: ${categoryLabel}`);
  }
  lines.push('========================================');
  lines.push('');

  lines.push(isPt ? 'Citação:' : 'Quote:');
  lines.push(`"${item.texto}"`);
  lines.push('');
  lines.push(`${isPt ? 'Autor / Pensador' : 'Author / Thinker'}: ${item.autor}`);

  if (item.reflexao && item.reflexao.trim()) {
    lines.push('');
    lines.push(
      isPt
        ? 'Reflexão & Aplicação Prática (Lição para o Dia):'
        : 'Practical Reflection & Lesson for Today:'
    );
    lines.push(item.reflexao.trim());
  }

  if (includePillars) {
    lines.push('');
    lines.push(isPt ? 'Demais Explicações e Orientações Práticas:' : 'Additional Guidance & Pillars:');
    if (isPt) {
      lines.push(
        '• Disciplina & Foco: Incorpore a mensagem de hoje no cumprimento rigoroso da rotina de estudos e deveres militares.'
      );
      lines.push(
        '• Espírito de Corpo: Compartilhe o ensinamento com seus colegas de turma para fortalecer o companheirismo e a união.'
      );
      lines.push(
        '• Superação & Vitória: Cada dia é uma oportunidade de vencer desafios acadêmicos e avançar com firmeza na carreira.'
      );
    } else {
      lines.push(
        "• Discipline & Focus: Apply today's insight to maintain steadfast dedication in study routines and duties."
      );
      lines.push(
        '• Comradery & Trust: Share the reflection with classmates to bolster morale, teamwork, and collective resilience.'
      );
      lines.push(
        '• Growth & Excellence: Every sunrise offers an opportunity to overcome hurdles and excel in academic progression.'
      );
    }
  }

  lines.push('');
  lines.push(
    isPt
      ? '— Sistema de Gestão Escolar • Inspiração Diária'
      : '— School Management System • Daily Inspiration'
  );

  return lines.join('\n');
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall back to execCommand below
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
