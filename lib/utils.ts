import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats and normalizes the Turma display text to strictly avoid duplicating
 * the Course name or repeating identical words across printed forms.
 *
 * @param turma - Turma object or string name
 * @param curso - Curso object or string name
 * @param defaultFallback - fallback when no distinct turma is found
 * @returns Clean Turma name without course name duplication
 */
export function getCleanTurmaName(
  turma: any,
  curso?: any,
  defaultFallback = 'Turma Única'
): string {
  const turmaName = (typeof turma === 'string' ? turma : (turma?.nome || turma?.turma_nome || turma?.turma || '')).trim();
  const cursoName = (typeof curso === 'string' ? curso : (curso?.nome || curso?.curso_nome || (typeof turma === 'object' ? (turma?.curso?.nome || turma?.curso_nome) : '') || '')).trim();
  const turmaObj = typeof turma === 'object' ? turma : null;

  if (!turmaName) {
    if (turmaObj?.codigo) return turmaObj.codigo;
    if (turmaObj?.ano) return `Turma ${turmaObj.ano}${turmaObj.periodo ? ` (${turmaObj.periodo})` : ''}`;
    return defaultFallback;
  }

  if (!cursoName) {
    return turmaName;
  }

  const tNorm = turmaName.toLowerCase();
  const cNorm = cursoName.toLowerCase();

  // 1. Exact match or identical normalized name
  if (tNorm === cNorm) {
    if (turmaObj?.codigo && turmaObj.codigo.toLowerCase() !== cNorm) return turmaObj.codigo;
    if (turmaObj?.ano) return `Turma ${turmaObj.ano}${turmaObj.periodo ? ` (${turmaObj.periodo})` : ''}`;
    return defaultFallback;
  }

  // 2. Turma starts with Curso (e.g. "Curso de Mergulho - Turma A" or "Curso de Mergulho / 2025")
  const escapedCurso = cursoName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const prefixRegex = new RegExp('^' + escapedCurso + '[\\s\\-—:•/]*', 'i');
  if (prefixRegex.test(turmaName)) {
    const stripped = turmaName.replace(prefixRegex, '').trim();
    if (stripped) {
      return stripped;
    }
    if (turmaObj?.codigo && turmaObj.codigo.toLowerCase() !== cNorm) return turmaObj.codigo;
    if (turmaObj?.ano) return `Turma ${turmaObj.ano}${turmaObj.periodo ? ` (${turmaObj.periodo})` : ''}`;
    return defaultFallback;
  }

  // 3. Turma ends with Curso (e.g. "Turma A - Curso de Mergulho")
  const suffixRegex = new RegExp('[\\s\\-—:•/]*' + escapedCurso + '$', 'i');
  if (suffixRegex.test(turmaName)) {
    const stripped = turmaName.replace(suffixRegex, '').trim();
    if (stripped) {
      return stripped;
    }
    if (turmaObj?.codigo && turmaObj.codigo.toLowerCase() !== cNorm) return turmaObj.codigo;
    if (turmaObj?.ano) return `Turma ${turmaObj.ano}${turmaObj.periodo ? ` (${turmaObj.periodo})` : ''}`;
    return defaultFallback;
  }

  // 4. If Turma string is a subset of Curso name (e.g. "Marinharia" when course is "Curso de Marinharia")
  if (cNorm.includes(tNorm) && tNorm.length > 3) {
    if (turmaObj?.codigo && turmaObj.codigo.toLowerCase() !== cNorm) return turmaObj.codigo;
    if (turmaObj?.ano) return `Turma ${turmaObj.ano}${turmaObj.periodo ? ` (${turmaObj.periodo})` : ''}`;
    return defaultFallback;
  }

  return turmaName;
}

