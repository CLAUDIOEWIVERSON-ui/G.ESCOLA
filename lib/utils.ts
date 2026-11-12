import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Returns a cleaned display name for a turma (class), stripping redundant course name prefixes
 * or returning a sensible fallback when the class name is missing or identical to the course.
 */
export function getCleanTurmaName(
  turma: any,
  courseName?: string,
  fallback: string = 'Turma Única'
): string {
  if (!turma) return fallback || '';

  const rawName = typeof turma === 'string'
    ? turma
    : (turma.nome || turma.name || turma.turma_nome || turma.turma || '');

  if (!rawName || typeof rawName !== 'string' || !rawName.trim()) {
    return fallback || '';
  }

  let cleaned = rawName.trim();

  // If courseName is supplied and matches or prefixes the turma name, strip the redundancy
  if (courseName && typeof courseName === 'string' && courseName.trim()) {
    const cName = courseName.trim();
    if (cleaned.toLowerCase() === cName.toLowerCase()) {
      return fallback || '';
    }

    if (cleaned.toLowerCase().startsWith(cName.toLowerCase())) {
      const remainder = cleaned.slice(cName.length).replace(/^[\s\-–—:•/|]+/, '').trim();
      if (remainder) {
        cleaned = remainder;
      }
    }
  }

  return cleaned || fallback || '';
}

/**
 * Calculates a student's attendance percentage across a course/turma date range.
 */
export function calculateStudentCoursePercentage(
  studentId: string,
  attendanceList: any[],
  effectiveStartDate?: string,
  effectiveEndDate?: string
): { pct: number | null; totalDays: number; presentCount: number; absencesCount: number } {
  if (!studentId || !attendanceList || !Array.isArray(attendanceList) || attendanceList.length === 0) {
    return { pct: null, totalDays: 0, presentCount: 0, absencesCount: 0 };
  }

  const studentRecords = attendanceList.filter(record => {
    if (!record) return false;
    const sId = record.aluno_id || record.student_id || record.alunoId;
    if (sId !== studentId) return false;

    if (record.data) {
      const dStr = typeof record.data === 'string'
        ? record.data.substring(0, 10)
        : new Date(record.data).toISOString().substring(0, 10);

      if (effectiveStartDate && dStr < effectiveStartDate) return false;
      if (effectiveEndDate && dStr > effectiveEndDate) return false;
    }
    return true;
  });

  if (studentRecords.length === 0) {
    return { pct: null, totalDays: 0, presentCount: 0, absencesCount: 0 };
  }

  const datePresentMap = new Map<string, boolean>();

  studentRecords.forEach(r => {
    const dateKey = r.data ? String(r.data).substring(0, 10) : String(Math.random());
    const isPresent = r.presente === true ||
      r.status === 'P' ||
      r.status === 'presente' ||
      r.status === 'A' ||
      r.status === 'D' ||
      r.status === 'LE';

    if (datePresentMap.has(dateKey)) {
      if (isPresent) {
        datePresentMap.set(dateKey, true);
      }
    } else {
      datePresentMap.set(dateKey, isPresent);
    }
  });

  const totalDays = datePresentMap.size;
  let presentCount = 0;
  datePresentMap.forEach(isPresent => {
    if (isPresent) presentCount++;
  });

  const absencesCount = totalDays - presentCount;
  const pct = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : null;

  return {
    pct,
    totalDays,
    presentCount,
    absencesCount
  };
}
