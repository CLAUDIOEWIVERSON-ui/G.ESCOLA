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

export interface StudentCourseAttendanceStats {
  pct: number | null;
  presences: number;
  totalDays: number;
  delays: number;
  absences: number;
  justified: number;
  dispensed: number;
  leaves: number;
}

/**
 * Calculates a student's attendance percentage across the whole course period of the class.
 *
 * @param studentId ID of the student
 * @param allCourseAttendance List of all attendance records for the class in the course period
 * @param effectiveStart Optional course start date (YYYY-MM-DD)
 * @param effectiveEnd Optional course end date (YYYY-MM-DD)
 */
export function calculateStudentCoursePercentage(
  studentId: string,
  allCourseAttendance: any[],
  effectiveStart?: string | null,
  effectiveEnd?: string | null
): StudentCourseAttendanceStats {
  if (!allCourseAttendance || allCourseAttendance.length === 0) {
    return { pct: null, presences: 0, totalDays: 0, delays: 0, absences: 0, justified: 0, dispensed: 0, leaves: 0 };
  }

  // Filter records within course bounds
  const validRecords = allCourseAttendance.filter(r => {
    if (!r || !r.data) return false;
    const dStr = typeof r.data === 'string' 
      ? r.data.substring(0, 10) 
      : (r.data instanceof Date ? r.data.toISOString().substring(0, 10) : String(r.data).substring(0, 10));
    if (effectiveStart && dStr < effectiveStart) return false;
    if (effectiveEnd && dStr > effectiveEnd) return false;
    return true;
  });

  // Distinct dates where attendance was recorded for the class during the course period
  const distinctTurmaDays = new Set<string>();
  validRecords.forEach(r => {
    const dStr = typeof r.data === 'string' 
      ? r.data.substring(0, 10) 
      : (r.data instanceof Date ? r.data.toISOString().substring(0, 10) : String(r.data).substring(0, 10));
    if (dStr) distinctTurmaDays.add(dStr);
  });

  // Records for this specific student
  const studentRecords = validRecords.filter(r => r.aluno_id === studentId);

  let p = 0;
  let a = 0;
  let f = 0;
  let fj = 0;
  let d = 0;
  let le = 0;

  studentRecords.forEach(r => {
    const obs = ((r.observacao || '') as string).trim().toUpperCase();
    if (obs === 'P') p++;
    else if (obs === 'A') a++;
    else if (obs === 'F') f++;
    else if (obs === 'FJ') fj++;
    else if (obs === 'D') d++;
    else if (obs === 'LE') le++;
    else if (r.presente === true) p++;
    else if (r.presente === false) f++;
  });

  const studentCounted = p + a + f + fj + d + le;
  const totalDays = Math.max(distinctTurmaDays.size, studentCounted);
  const presences = p + a;

  if (totalDays === 0) {
    return { pct: null, presences: 0, totalDays: 0, delays: a, absences: f, justified: fj, dispensed: d, leaves: le };
  }

  const pct = Math.round((presences / totalDays) * 100);
  return {
    pct: Math.min(100, Math.max(0, pct)),
    presences,
    totalDays,
    delays: a,
    absences: f,
    justified: fj,
    dispensed: d,
    leaves: le
  };
}
