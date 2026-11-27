'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'motion/react';
import {
  Calendar,
  FileText,
  FileCheck,
  ArrowRight,
  Clock,
  GraduationCap,
  CheckCircle2,
  Lock,
  Bell,
  CalendarDays,
  Quote,
  Sparkles,
  AlertTriangle,
  MapPin,
  Compass,
  User,
  MessageSquare,
  StickyNote,
} from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '@/lib/auth/UserContext';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { supabase } from '@/lib/supabase/client';
import { fetchWithAuth } from '@/lib/api';
import { UserWorkspaceHeader } from '@/components/UserWorkspaceHeader';
import DashboardThoughtWidget from '@/components/DashboardThoughtWidget';
import { getStudentNotepadStorageKey, readStudentNotesFromDevice } from '@/components/StudentNotepad';
import { cn } from '@/lib/utils';

interface ScheduledExamItem {
  id: string;
  dateStr: string;
  formattedDate: string;
  weekdayLabel: string;
  daysUntil: number;
  moduleLabel: string;
  subjectName: string;
  topicName?: string;
  timeLabel?: string;
  room?: string;
  instructorName?: string;
  source: 'horario' | 'evento';
  startTimeMinutes: number;
}

interface ExtraClassActivityItem {
  id: string;
  dateStr: string;
  formattedDate: string;
  weekdayLabel: string;
  daysUntil: number;
  title: string;
  topicName?: string;
  moduleLabel?: string;
  timeLabel: string;
  location: string;
  instructorName?: string;
  startTimeMinutes: number;
}

const DAY_OFFSETS: Record<string, number> = {
  monday: 0,
  tuesday: 1,
  wednesday: 2,
  thursday: 3,
  friday: 4,
};

function normalizeSearchText(str?: string | null): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function isExamKeywordMatch(str?: string | null): boolean {
  const norm = normalizeSearchText(str);
  if (!norm) return false;
  if (
    norm.includes('questionario') ||
    norm.includes('pos-curso') ||
    norm.includes('pos curso') ||
    norm.includes('pos-escolar') ||
    norm.includes('pos escolar')
  ) {
    return false;
  }
  return /\b(provas?|exames?|testes?|avaliac(?:ao|oes)|verificac(?:ao|oes)|simulados?)\b/i.test(norm);
}

function isExtraClassCellData(cell: any, discName?: string | null): boolean {
  if (!cell || typeof cell !== 'object') return false;
  if (cell.subjectId === '__extraclasse__') return true;
  const combined = [cell.customSubject, discName, cell.modulo]
    .map(normalizeSearchText)
    .join(' ');
  return /\bextra[\s-]*classe\b/i.test(combined);
}

function extractModuleFromText(str?: string | null, isPt = true): string | null {
  if (!str) return null;
  const match = str.match(/m[oó]dulo\s*([0-9]+|[ivxlcdm]+|[a-z0-9-]+)/i);
  if (match && match[1]) {
    return isPt ? `Módulo ${match[1].toUpperCase()}` : `Module ${match[1].toUpperCase()}`;
  }
  return null;
}

function formatDatePtBr(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getWeekdayLabel(dateStr: string, isPt: boolean): string {
  const dt = new Date(`${dateStr}T12:00:00`);
  if (isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString(isPt ? 'pt-BR' : 'en-US', { weekday: 'long' });
}

function computeSlotTimeRange(slotStart: string): { label: string; startMinutes: number; endMinutes: number } {
  const [hStr, mStr] = slotStart.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (isNaN(h) || isNaN(m)) {
    return { label: slotStart, startMinutes: 0, endMinutes: 0 };
  }
  const startMinutes = h * 60 + m;
  const endMinutes = startMinutes + 50;
  const endH = String(Math.floor(endMinutes / 60)).padStart(2, '0');
  const endM = String(endMinutes % 60).padStart(2, '0');
  return {
    label: `${slotStart} - ${endH}:${endM}`,
    startMinutes,
    endMinutes,
  };
}

function formatMinutesToHHMM(totalMinutes: number): string {
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const m = String(totalMinutes % 60).padStart(2, '0');
  return `${h}:${m}`;
}

function getLocalTodayDateStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function diffDaysLocal(targetDateStr: string, baseDateStr: string): number {
  const target = new Date(`${targetDateStr}T12:00:00`);
  const base = new Date(`${baseDateStr}T12:00:00`);
  if (isNaN(target.getTime()) || isNaN(base.getTime())) return 0;
  return Math.round((target.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function resolveSlotInstructorName(
  cell: any,
  instrMap: Map<string, string>,
  fallbackTurmaInstructor?: string
): string {
  const custom = cell?.customInstructor ? String(cell.customInstructor).trim() : '';
  if (custom) return custom;

  const rawId = cell?.instructorId ? String(cell.instructorId).trim() : '';
  if (rawId) {
    const mapped = instrMap.get(rawId);
    if (mapped) return mapped;
    if (!UUID_PATTERN.test(rawId)) return rawId;
  }

  return (fallbackTurmaInstructor || '').trim();
}

export function StudentWorkspace() {
  const { profile } = useUser();
  const { language } = useI18n();
  const isPt = language === 'pt';

  const [hasSubmittedSurvey, setHasSubmittedSurvey] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [scheduledExams, setScheduledExams] = useState<ScheduledExamItem[]>([]);
  const [extraClassActivities, setExtraClassActivities] = useState<ExtraClassActivityItem[]>([]);
  const [recados, setRecados] = useState<any[]>([]);
  const [markingReadId, setMarkingReadId] = useState<string | null>(null);
  const [loadingExtras, setLoadingExtras] = useState(true);
  const [deviceNotesCount, setDeviceNotesCount] = useState<number>(0);

  useEffect(() => {
    if (!profile) return;
    const key = getStudentNotepadStorageKey(profile);
    const list = readStudentNotesFromDevice(key);
    setDeviceNotesCount(list.length);
  }, [profile]);

  useEffect(() => {
    let active = true;
    async function loadStudentStatus() {
      if (!profile?.student_id || !profile?.turma_id) {
        if (active) setLoadingExtras(false);
        return;
      }
      try {
        const localTodayStr = getLocalTodayDateStr();

        const [evalRes, horarioRes, discRes, matRes, evtPrimaryRes, instrRes, apiInstrRes, turmaRowRes, recadosRes] = await Promise.all([
          supabase
            .from('questionarios_conclusao')
            .select('id, created_at')
            .eq('aluno_id', profile.student_id)
            .eq('turma_id', profile.turma_id)
            .maybeSingle(),
          supabase
            .from('horarios')
            .select('data')
            .eq('turma_id', profile.turma_id)
            .maybeSingle(),
          supabase
            .from('disciplinas')
            .select('id, nome, modulo_index')
            .is('deleted_at', null),
          supabase
            .from('materias_modulos')
            .select('id, nome, disciplina_id, modulo_index')
            .is('deleted_at', null),
          supabase
            .from('eventos')
            .select('id, titulo, descricao, data, data_fim, tipo_data, cor, exibir_aluno, target_grupo, uniforme_dia')
            .order('data', { ascending: true })
            .limit(40),
          supabase
            .from('profiles')
            .select('id, full_name')
            .in('role', ['instrutor', 'admin']),
          fetchWithAuth('/api/v1/instrutores')
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
          supabase
            .from('turmas')
            .select('id, instrutor')
            .eq('id', profile.turma_id)
            .maybeSingle(),
          fetchWithAuth('/api/recados')
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ]);

        if (active && Array.isArray(recadosRes?.recados)) {
          setRecados(recadosRes.recados);
        }

        if (active && evalRes.data) {
          setHasSubmittedSurvey(true);
        }

        const instrMap = new Map<string, string>();
        (instrRes.data || []).forEach((p: any) => {
          if (p.id && p.full_name) instrMap.set(String(p.id), String(p.full_name).trim());
        });
        if (apiInstrRes?.profilesMap && typeof apiInstrRes.profilesMap === 'object') {
          Object.entries(apiInstrRes.profilesMap).forEach(([id, name]) => {
            if (id && typeof name === 'string' && name.trim()) {
              instrMap.set(String(id), name.trim());
            }
          });
        }
        if (Array.isArray(apiInstrRes?.instrutores)) {
          apiInstrRes.instrutores.forEach((p: any) => {
            if (p?.id && p?.full_name) {
              instrMap.set(String(p.id), String(p.full_name).trim());
            }
          });
        }

        const fallbackTurmaInstructor =
          String(
            apiInstrRes?.turmaInstructors?.[profile.turma_id] ||
              turmaRowRes?.data?.instrutor ||
              ''
          ).trim();

        // Fallback caso colunas data_fim / tipo_data / target_grupo ainda não existam no banco
        let rawEventos: any[] = evtPrimaryRes.data || [];
        if (evtPrimaryRes.error) {
          const fallbackEvtRes = await supabase
            .from('eventos')
            .select('id, titulo, descricao, data, cor, exibir_aluno, uniforme_dia')
            .order('data', { ascending: true })
            .limit(40);
          if (!fallbackEvtRes.error && fallbackEvtRes.data) {
            rawEventos = fallbackEvtRes.data;
          } else {
            const minEvtRes = await supabase
              .from('eventos')
              .select('id, titulo, descricao, data, cor')
              .order('data', { ascending: true })
              .limit(40);
            rawEventos = minEvtRes.data || [];
          }
        }

        const grp = (profile.turma_grupo || 'AMBOS').toUpperCase();
        const parsedStudentEvents = rawEventos
          .map((evt: any) => {
            let desc = evt.descricao || '';
            let parsedExibirAluno = evt.exibir_aluno !== false;
            let parsedDataFim = evt.data_fim ? String(evt.data_fim).split('T')[0] : null;

            const creatorMatch = desc.match(/\[creator:([^\]]+)\]/);
            const rawCreator = creatorMatch?.[1]?.trim() || '';
            const resolvedEventInstructor = rawCreator
              ? instrMap.get(rawCreator) || (!UUID_PATTERN.test(rawCreator) ? rawCreator : '')
              : '';

            const alunoMatch = desc.match(/\[exibir_aluno:([^\]]+)\]/);
            if (alunoMatch) {
              parsedExibirAluno = alunoMatch[1] === 'true';
            }
            const dataFimMatch = desc.match(/\[data_fim:([^\]]+)\]/);
            if (dataFimMatch) {
              parsedDataFim = dataFimMatch[1];
            }

            desc = desc
              .replace(/\[creator:[^\]]+\]/g, '')
              .replace(/\[exclusive:[^\]]+\]/g, '')
              .replace(/\[exibir_instrutor:[^\]]+\]/g, '')
              .replace(/\[exibir_aluno:[^\]]+\]/g, '')
              .replace(/\[exibir_monitor:[^\]]+\]/g, '')
              .replace(/\[target_grupo:[^\]]+\]/g, '')
              .replace(/\[data_fim:[^\]]+\]/g, '')
              .replace(/\[tipo_data:[^\]]+\]/g, '')
              .trim();

            const startDateStr = evt.data ? String(evt.data).split('T')[0] : '';
            const checkEndStr = parsedDataFim || startDateStr;

            return {
              ...evt,
              cleanDescricao: desc,
              parsedExibirAluno,
              startDateStr,
              checkEndStr,
              instructorName: resolvedEventInstructor || undefined,
            };
          })
          .filter((e: any) => {
            if (!e.parsedExibirAluno) return false;
            const target = (e.target_grupo || 'AMBOS').toUpperCase();
            if (!(target === 'AMBOS' || grp === 'AMBOS' || target === grp)) return false;
            if (!e.checkEndStr) return false;
            return e.checkEndStr >= localTodayStr;
          });

        if (active) {
          setAnnouncements(
            parsedStudentEvents.slice(0, 5).map((e: any) => ({
              ...e,
              descricao: e.cleanDescricao,
            }))
          );
        }

        // 1. Extrair provas e atividades extraclasse marcadas na grade horária (horarios.data)
        const discMap = new Map<string, any>();
        (discRes.data || []).forEach((d: any) => discMap.set(d.id, d));

        const matMap = new Map<string, any>();
        (matRes.data || []).forEach((m: any) => matMap.set(m.id, m));

        interface RawSlotExam {
          dateStr: string;
          moduleLabel: string;
          subjectName: string;
          topicName?: string;
          room?: string;
          instructorName?: string;
          startMinutes: number;
          endMinutes: number;
        }

        interface RawSlotExtraClass {
          dateStr: string;
          title: string;
          topicName?: string;
          moduleLabel?: string;
          location: string;
          instructorName?: string;
          startMinutes: number;
          endMinutes: number;
        }

        const rawSlotExams: RawSlotExam[] = [];
        const rawSlotExtraClasses: RawSlotExtraClass[] = [];
        const scheduleJson = horarioRes.data?.data as Record<string, any> | null;

        if (scheduleJson && typeof scheduleJson === 'object') {
          Object.entries(scheduleJson).forEach(([key, cell]) => {
            if (!cell || typeof cell !== 'object') return;
            // Formato esperado: YYYY-MM-DD_class-HH:MM-dayKey
            const match = key.match(/^(\d{4}-\d{2}-\d{2})_class-(\d{2}:\d{2})-(monday|tuesday|wednesday|thursday|friday)$/);
            if (!match) return;

            const [, weekKey, slotStart, dayKey] = match;
            const dayOffset = DAY_OFFSETS[dayKey];
            if (dayOffset === undefined) return;

            // Calcula data exata do dia na semana em hora local segura (12:00)
            const baseWeekDate = new Date(`${weekKey}T12:00:00`);
            if (isNaN(baseWeekDate.getTime())) return;
            baseWeekDate.setDate(baseWeekDate.getDate() + dayOffset);
            const cellYear = baseWeekDate.getFullYear();
            const cellMonth = String(baseWeekDate.getMonth() + 1).padStart(2, '0');
            const cellDay = String(baseWeekDate.getDate()).padStart(2, '0');
            const cellDateStr = `${cellYear}-${cellMonth}-${cellDay}`;

            if (cellDateStr < localTodayStr) return;

            const discObj = cell.subjectId ? discMap.get(cell.subjectId) : null;
            const topicObj = cell.topicId ? matMap.get(cell.topicId) : null;
            const { startMinutes, endMinutes } = computeSlotTimeRange(slotStart);

            const rawModulo = String(cell.modulo || '').trim();
            const rawModuloUpper = rawModulo.toUpperCase();
            const subjectText = String(cell.customSubject || discObj?.nome || '').trim();
            const topicText = String(cell.topic || topicObj?.nome || '').trim();

            // 1A. Verificar se é Atividade Extraclasse
            if (isExtraClassCellData(cell, discObj?.nome)) {
              const resolvedLocation = cell.room ? String(cell.room).trim() : '';
              const resolvedTitle =
                cell.customSubject && !/^extra[\s-]*classe$/i.test(cell.customSubject.trim())
                  ? String(cell.customSubject).trim()
                  : isPt
                    ? 'Atividade Extraclasse'
                    : 'Extra-Class Activity';
              const resolvedInstructor = resolveSlotInstructorName(
                cell,
                instrMap,
                fallbackTurmaInstructor
              );
              const modLabel = rawModulo
                ? !isNaN(Number(rawModulo))
                  ? isPt
                    ? `Módulo ${rawModulo}`
                    : `Module ${rawModulo}`
                  : rawModulo
                : undefined;

              rawSlotExtraClasses.push({
                dateStr: cellDateStr,
                title: resolvedTitle,
                topicName: topicText || undefined,
                moduleLabel: modLabel,
                location: resolvedLocation,
                instructorName: resolvedInstructor || undefined,
                startMinutes,
                endMinutes,
              });
              return;
            }

            // 1B. Verificar se é Prova
            const isExplicitExamModule =
              rawModuloUpper === 'PROVAS' ||
              rawModuloUpper === 'PROVA' ||
              rawModuloUpper === 'EXAME' ||
              rawModuloUpper === 'EXAMS';

            const hasExamKeyword =
              isExamKeywordMatch(rawModulo) ||
              isExamKeywordMatch(subjectText) ||
              isExamKeywordMatch(topicText);

            if (!isExplicitExamModule && !hasExamKeyword) return;

            let moduleLabel = '';
            const effectiveModIndex = discObj?.modulo_index || topicObj?.modulo_index;
            if (rawModulo && !isExplicitExamModule) {
              moduleLabel = !isNaN(Number(rawModulo))
                ? (isPt ? `Módulo ${rawModulo}` : `Module ${rawModulo}`)
                : rawModulo;
            } else if (effectiveModIndex) {
              moduleLabel = isPt ? `Módulo ${effectiveModIndex}` : `Module ${effectiveModIndex}`;
            } else {
              const extracted =
                extractModuleFromText(subjectText, isPt) ||
                extractModuleFromText(topicText, isPt);
              moduleLabel = extracted || (isPt ? 'Avaliação / Prova' : 'Module Exam');
            }

            const resolvedSubject =
              subjectText ||
              topicText ||
              (isPt ? 'Prova do Módulo' : 'Module Exam');

            const resolvedExamInstructor = resolveSlotInstructorName(
              cell,
              instrMap,
              fallbackTurmaInstructor
            );

            rawSlotExams.push({
              dateStr: cellDateStr,
              moduleLabel,
              subjectName: resolvedSubject,
              topicName: subjectText && topicText ? topicText : undefined,
              room: cell.room ? String(cell.room).trim() : undefined,
              instructorName: resolvedExamInstructor || undefined,
              startMinutes,
              endMinutes,
            });
          });
        }

        // Consolida horários consecutivos de provas no mesmo dia
        rawSlotExams.sort((a, b) => {
          if (a.dateStr !== b.dateStr) return a.dateStr.localeCompare(b.dateStr);
          return a.startMinutes - b.startMinutes;
        });

        const consolidatedHorarioExams: ScheduledExamItem[] = [];
        for (const item of rawSlotExams) {
          const prev = consolidatedHorarioExams[consolidatedHorarioExams.length - 1];
          const prevEndMinutes = prev && (prev as any)._endMinutes ? (prev as any)._endMinutes : 0;
          if (
            prev &&
            prev.dateStr === item.dateStr &&
            prev.moduleLabel === item.moduleLabel &&
            prev.subjectName === item.subjectName &&
            item.startMinutes - prevEndMinutes <= 25
          ) {
            (prev as any)._endMinutes = item.endMinutes;
            prev.timeLabel = `${formatMinutesToHHMM(prev.startTimeMinutes)} - ${formatMinutesToHHMM(item.endMinutes)}`;
            if (!prev.room && item.room) prev.room = item.room;
            if (!prev.topicName && item.topicName) prev.topicName = item.topicName;
            if (!prev.instructorName && item.instructorName) prev.instructorName = item.instructorName;
          } else {
            const newItem: ScheduledExamItem & { _endMinutes?: number } = {
              id: `horario-${item.dateStr}-${item.startMinutes}-${item.subjectName}`,
              dateStr: item.dateStr,
              formattedDate: formatDatePtBr(item.dateStr),
              weekdayLabel: getWeekdayLabel(item.dateStr, isPt),
              daysUntil: diffDaysLocal(item.dateStr, localTodayStr),
              moduleLabel: item.moduleLabel,
              subjectName: item.subjectName,
              topicName: item.topicName,
              timeLabel: `${formatMinutesToHHMM(item.startMinutes)} - ${formatMinutesToHHMM(item.endMinutes)}`,
              room: item.room,
              instructorName: item.instructorName,
              source: 'horario',
              startTimeMinutes: item.startMinutes,
              _endMinutes: item.endMinutes,
            };
            consolidatedHorarioExams.push(newItem);
          }
        }

        // Consolida horários consecutivos de atividades extraclasse no mesmo dia e local
        rawSlotExtraClasses.sort((a, b) => {
          if (a.dateStr !== b.dateStr) return a.dateStr.localeCompare(b.dateStr);
          return a.startMinutes - b.startMinutes;
        });

        const consolidatedExtraClasses: ExtraClassActivityItem[] = [];
        for (const item of rawSlotExtraClasses) {
          const prev = consolidatedExtraClasses[consolidatedExtraClasses.length - 1];
          const prevEndMinutes = prev && (prev as any)._endMinutes ? (prev as any)._endMinutes : 0;
          if (
            prev &&
            prev.dateStr === item.dateStr &&
            prev.location === item.location &&
            prev.title === item.title &&
            (prev.topicName || '') === (item.topicName || '') &&
            item.startMinutes - prevEndMinutes <= 25
          ) {
            (prev as any)._endMinutes = item.endMinutes;
            prev.timeLabel = `${formatMinutesToHHMM(prev.startTimeMinutes)} - ${formatMinutesToHHMM(item.endMinutes)}`;
            if (!prev.instructorName && item.instructorName) prev.instructorName = item.instructorName;
            if (!prev.moduleLabel && item.moduleLabel) prev.moduleLabel = item.moduleLabel;
          } else {
            const newItem: ExtraClassActivityItem & { _endMinutes?: number } = {
              id: `extraclasse-${item.dateStr}-${item.startMinutes}-${item.location || 'local'}`,
              dateStr: item.dateStr,
              formattedDate: formatDatePtBr(item.dateStr),
              weekdayLabel: getWeekdayLabel(item.dateStr, isPt),
              daysUntil: diffDaysLocal(item.dateStr, localTodayStr),
              title: item.title,
              topicName: item.topicName,
              moduleLabel: item.moduleLabel,
              timeLabel: `${formatMinutesToHHMM(item.startMinutes)} - ${formatMinutesToHHMM(item.endMinutes)}`,
              location: item.location,
              instructorName: item.instructorName,
              startTimeMinutes: item.startMinutes,
              _endMinutes: item.endMinutes,
            };
            consolidatedExtraClasses.push(newItem);
          }
        }

        // 2. Extrair também eventos de calendário marcados para alunos sobre provas
        const eventExams: ScheduledExamItem[] = parsedStudentEvents
          .filter((e: any) => isExamKeywordMatch(e.titulo) || isExamKeywordMatch(e.cleanDescricao))
          .map((e: any) => {
            const targetDate = e.startDateStr >= localTodayStr ? e.startDateStr : e.checkEndStr;
            const modLabel =
              extractModuleFromText(e.titulo, isPt) ||
              extractModuleFromText(e.cleanDescricao, isPt) ||
              (isPt ? 'Prova / Avaliação' : 'Exam');
            return {
              id: `evento-${e.id}`,
              dateStr: targetDate,
              formattedDate: formatDatePtBr(targetDate),
              weekdayLabel: getWeekdayLabel(targetDate, isPt),
              daysUntil: diffDaysLocal(targetDate, localTodayStr),
              moduleLabel: modLabel,
              subjectName: e.titulo,
              topicName: e.cleanDescricao || undefined,
              instructorName: e.instructorName || undefined,
              source: 'evento',
              startTimeMinutes: 0,
            };
          });

        const combinedExams = [...consolidatedHorarioExams, ...eventExams].sort((a, b) => {
          if (a.dateStr !== b.dateStr) return a.dateStr.localeCompare(b.dateStr);
          return a.startTimeMinutes - b.startTimeMinutes;
        });

        if (active) {
          setScheduledExams(combinedExams);
          setExtraClassActivities(consolidatedExtraClasses);
        }
      } catch (err) {
        console.warn('[StudentWorkspace] Aviso ao carregar complementos:', err);
      } finally {
        if (active) setLoadingExtras(false);
      }
    }

    loadStudentStatus();
    return () => {
      active = false;
    };
  }, [profile?.student_id, profile?.turma_id, profile?.turma_grupo, isPt]);

  if (!profile) return null;

  const handleMarkRecadoAsRead = async (recadoId: string) => {
    setMarkingReadId(recadoId);
    try {
      const res = await fetchWithAuth('/api/recados', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: recadoId }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Erro ao marcar como lido.');
      }
      setRecados((prev) =>
        prev.map((r) => (r.id === recadoId ? { ...r, lido: true, lido_em: json.recado?.lido_em || new Date().toISOString() } : r))
      );
      toast.success(isPt ? 'Recado marcado como lido!' : 'Message marked as read!');
    } catch (err: any) {
      toast.error(err.message || (isPt ? 'Falha ao confirmar leitura.' : 'Failed to mark as read.'));
    } finally {
      setMarkingReadId(null);
    }
  };

  const unreadRecadosCount = recados.filter((r) => !r.lido).length;

  const isSurveyReleased = profile.liberar_formularios === true;
  const todayStr = getLocalTodayDateStr();
  const effectiveEndDate = profile.data_postergacao || profile.data_fim;
  const isPostponedExpired = effectiveEndDate ? todayStr > effectiveEndDate : false;
  const isTurmaConcluida = profile.turma_status === 'concluída' || profile.turma_status === 'concluida';
  const canFillSurvey =
    isSurveyReleased &&
    (!isTurmaConcluida || !isPostponedExpired);

  const primaryModules = [
    {
      title: isPt ? 'Detalhe Semanal de Aulas' : 'Weekly Class Schedule',
      description: isPt
        ? 'Consulte a grade horária semanal da sua turma, disciplinas, horários das instruções e professores.'
        : 'Check your class weekly timetable, subjects, instruction times, and instructors.',
      href: '/horario',
      icon: Calendar,
      badgeText:
        scheduledExams.length > 0
          ? isPt
            ? `${scheduledExams.length} Prova(s) Marcada(s)`
            : `${scheduledExams.length} Exam(s) Scheduled`
          : extraClassActivities.length > 0
            ? isPt
              ? `${extraClassActivities.length} Extra Classe`
              : `${extraClassActivities.length} Extra Class`
            : isPt
              ? 'Grade Atualizada'
              : 'Updated Schedule',
      cta: isPt ? 'Ver Horário Semanal' : 'View Weekly Schedule',
      ctaClass: 'student-solid-btn bg-black hover:bg-slate-800 text-white border-2 border-black',
    },
    {
      title: isPt ? 'Boletim Individual' : 'Individual Report Card',
      description: isPt
        ? 'Acompanhe suas notas por disciplina, percentual de frequência, situação acadêmica e imprima seu histórico.'
        : 'Track your subject grades, attendance percentage, academic status, and print your transcript.',
      href: '/boletim',
      icon: FileText,
      badgeText: isPt ? 'Notas e Frequência' : 'Grades & Attendance',
      cta: isPt ? 'Abrir Meu Boletim' : 'Open Report Card',
      ctaClass: 'student-solid-btn bg-black hover:bg-slate-800 text-white border-2 border-black',
    },
    {
      title: isPt ? 'Questionário de Final de Curso' : 'End-of-Course Questionnaire',
      description: isPt
        ? 'Avalie o curso, instrutores, infraestrutura e preencha sua autoavaliação ao concluir os módulos.'
        : 'Evaluate the course, instructors, infrastructure, and submit your self-assessment.',
      href: '/avaliacao',
      icon: FileCheck,
      badgeText: hasSubmittedSurvey
        ? (isPt ? 'Enviado' : 'Submitted')
        : canFillSurvey
          ? (isPt ? 'Disponível para Preenchimento' : 'Available Now')
          : (isPt ? 'Aguardando Liberação' : 'Awaiting Release'),
      cta: hasSubmittedSurvey
        ? (isPt ? 'Ver Comprovante' : 'View Receipt')
        : (isPt ? 'Preencher Questionário' : 'Fill Questionnaire'),
      ctaClass: 'student-solid-btn bg-black hover:bg-slate-800 text-white border-2 border-black',
    },
    {
      title: isPt ? 'Bloco de Notas Individual' : 'Personal Notepad',
      description: isPt
        ? 'Crie e organize suas anotações pessoais de estudo com armazenamento independente no seu dispositivo.'
        : 'Create and organize your personal study notes with independent storage on your device.',
      href: '/bloco-de-notas',
      icon: StickyNote,
      badgeText:
        deviceNotesCount > 0
          ? isPt
            ? `${deviceNotesCount} ${deviceNotesCount === 1 ? 'Anotação Salva' : 'Anotações Salvas'}`
            : `${deviceNotesCount} ${deviceNotesCount === 1 ? 'Saved Note' : 'Saved Notes'}`
          : isPt
            ? 'Salvo no Dispositivo'
            : 'Saved on Device',
      cta: isPt ? 'Abrir Bloco de Notas' : 'Open Notepad',
      ctaClass: 'student-solid-btn bg-black hover:bg-slate-800 text-white border-2 border-black',
    },
  ];

  return (
    <div className="w-full max-w-full min-w-0 space-y-5 sm:space-y-6 bg-white text-black overflow-x-clip">
      {/* Cartão de Identificação do Aluno */}
      <UserWorkspaceHeader />

      {/* RECADOS INDIVIDUAIS DO ACOMPANHANTE DA TURMA */}
      {recados.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: -6, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.25 }}
          aria-label={isPt ? 'Recados do Monitor da Turma' : 'Messages from Class Monitor'}
          className="bg-white border-2 border-black rounded-2xl p-5 sm:p-6 shadow-[4px_4px_0px_0px_#000000] text-black space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-black pb-3.5">
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-xl border-2 border-black bg-white flex items-center justify-center shrink-0">
                <MessageSquare size={22} className="text-black" />
                {unreadRecadosCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-40" />
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-black border border-white" />
                  </span>
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 border border-black rounded bg-white text-black">
                    {isPt ? 'Recado Individual' : 'Individual Message'}
                  </span>
                  {unreadRecadosCount > 0 && (
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-black text-white">
                      {unreadRecadosCount} {unreadRecadosCount === 1 ? (isPt ? 'novo' : 'new') : (isPt ? 'novos' : 'new')}
                    </span>
                  )}
                </div>
                <h2 className="text-lg sm:text-xl font-black tracking-tight uppercase text-black mt-0.5">
                  {isPt ? 'Recados do Monitor da Turma' : 'Messages from Class Monitor'}
                </h2>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {recados.map((rec) => (
              <div
                key={rec.id}
                className={cn(
                  'rounded-xl border-2 border-black bg-white p-4 flex flex-col gap-2.5',
                  !rec.lido && 'shadow-[3px_3px_0px_0px_#000000]'
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/15 pb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-black uppercase tracking-tight text-black">
                      {rec.titulo || (isPt ? 'Recado do Monitor da Turma' : 'Class Monitor Message')}
                    </span>
                    {!rec.lido ? (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-black text-white">
                        {isPt ? 'Não lido' : 'Unread'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-black bg-white text-black">
                        <CheckCircle2 size={10} className="text-black" />
                        {isPt ? 'Lido' : 'Read'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-black">
                    <Clock size={12} className="text-black" />
                    <span>{rec.created_at ? new Date(rec.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm font-medium text-black whitespace-pre-wrap leading-relaxed">
                  {rec.mensagem}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-black">
                    <User size={11} className="text-black" />
                    {isPt ? 'Enviado por:' : 'Sent by:'} {rec.sender_name || (isPt ? 'Monitor da Turma' : 'Class Monitor')}
                  </span>

                  {!rec.lido && (
                    <button
                      type="button"
                      disabled={markingReadId === rec.id}
                      onClick={() => handleMarkRecadoAsRead(rec.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-100 text-black border-2 border-black text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      <CheckCircle2 size={12} className="text-black" />
                      <span>{markingReadId === rec.id ? (isPt ? 'Salvando...' : 'Saving...') : (isPt ? 'Marcar como lido' : 'Mark as read')}</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* DESTAQUE DE PROVAS DOS MÓDULOS (exibido somente quando houver data marcada) */}
      {scheduledExams.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: -8, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3 }}
          aria-label={isPt ? 'Datas das Provas dos Módulos' : 'Module Exam Dates'}
          className="bg-white border-2 border-black rounded-2xl p-5 sm:p-6 shadow-[4px_4px_0px_0px_#000000] text-black space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-black pb-3.5">
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-xl border-2 border-black bg-white flex items-center justify-center shrink-0">
                <AlertTriangle size={22} className="text-black" />
                <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-40" />
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-black border border-white" />
                </span>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 border border-black rounded bg-white text-black">
                    {isPt ? 'Atenção: Prova Marcada' : 'Attention: Exam Scheduled'}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-black">
                    {scheduledExams.length}{' '}
                    {scheduledExams.length === 1
                      ? isPt
                        ? 'avaliação agendada'
                        : 'scheduled exam'
                      : isPt
                        ? 'avaliações agendadas'
                        : 'scheduled exams'}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black tracking-tight uppercase text-black mt-0.5">
                  {isPt ? 'Data das Provas dos Módulos' : 'Module Exam Dates'}
                </h2>
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {scheduledExams.map((exam) => {
              const urgencyLabel =
                exam.daysUntil === 0
                  ? isPt
                    ? 'PROVA HOJE!'
                    : 'EXAM TODAY!'
                  : exam.daysUntil === 1
                    ? isPt
                      ? 'PROVA AMANHÃ!'
                      : 'EXAM TOMORROW!'
                    : isPt
                      ? `FALTAM ${exam.daysUntil} DIAS`
                      : `IN ${exam.daysUntil} DAYS`;

              return (
                <div
                  key={exam.id}
                  className={cn(
                    'rounded-xl border-2 border-black bg-white p-4 flex flex-col justify-between gap-3 transition-transform hover:-translate-y-0.5',
                    exam.daysUntil <= 1 && 'shadow-[3px_3px_0px_0px_#000000]'
                  )}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded border-2 border-black bg-white text-black">
                        {exam.moduleLabel}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-black bg-white text-black">
                        <Bell size={10} className="text-black" />
                        {urgencyLabel}
                      </span>
                    </div>

                    <div className="pt-1">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-black">
                          {exam.formattedDate}
                        </span>
                        {exam.weekdayLabel && (
                          <span className="text-[11px] font-extrabold uppercase tracking-wide text-black">
                            • {exam.weekdayLabel}
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-black uppercase tracking-tight text-black mt-1 leading-snug">
                        {exam.subjectName}
                      </p>
                      {exam.topicName && (
                        <p className="text-xs font-semibold text-black mt-0.5 line-clamp-2">
                          {exam.topicName}
                        </p>
                      )}
                    </div>
                  </div>

                  {(exam.timeLabel || exam.room || exam.instructorName) && (
                    <div className="pt-2 border-t border-black/20 space-y-1.5 text-[11px] font-bold text-black">
                      {(exam.timeLabel || exam.room) && (
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          {exam.timeLabel && (
                            <span className="inline-flex items-center gap-1 font-mono font-black">
                              <Clock size={12} className="text-black" />
                              {exam.timeLabel}
                            </span>
                          )}
                          {exam.room && (
                            <span className="inline-flex items-center gap-1 uppercase font-black">
                              <MapPin size={12} className="text-black" />
                              {exam.room}
                            </span>
                          )}
                        </div>
                      )}
                      {exam.instructorName && (
                        <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase text-black">
                          <User size={11} className="text-black shrink-0" />
                          <span className="truncate">
                            {isPt ? 'Instrutor:' : 'Instructor:'} {exam.instructorName}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.section>
      )}

      {/* CAMPO DE AVISO AO ALUNO: ATIVIDADE EXTRACLASSE (extraído do Detalhe Semanal de Aulas) */}
      {extraClassActivities.length > 0 ? (
        <motion.section
          initial={{ opacity: 0, y: -6, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3 }}
          aria-label={isPt ? 'Aviso de Atividade Extraclasse' : 'Extra-Class Activity Notice'}
          className="bg-white border-2 border-black rounded-2xl p-5 sm:p-6 shadow-[4px_4px_0px_0px_#000000] text-black space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-black pb-3.5">
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-xl border-2 border-black bg-white flex items-center justify-center shrink-0">
                <Compass size={22} className="text-black" />
                <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-40" />
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-black border border-white" />
                </span>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 border border-black rounded bg-white text-black">
                    {isPt ? 'Aviso: Atividade Extraclasse' : 'Notice: Extra-Class Activity'}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-black">
                    {extraClassActivities.length}{' '}
                    {extraClassActivities.length === 1
                      ? isPt
                        ? 'atividade programada'
                        : 'scheduled activity'
                      : isPt
                        ? 'atividades programadas'
                        : 'scheduled activities'}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black tracking-tight uppercase text-black mt-0.5">
                  {isPt ? 'Atividade Extraclasse — Local e Horário' : 'Extra-Class Activity — Location & Time'}
                </h2>
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {extraClassActivities.map((act) => {
              const urgencyLabel =
                act.daysUntil === 0
                  ? isPt
                    ? 'HOJE!'
                    : 'TODAY!'
                  : act.daysUntil === 1
                    ? isPt
                      ? 'AMANHÃ!'
                      : 'TOMORROW!'
                    : isPt
                      ? `EM ${act.daysUntil} DIAS`
                      : `IN ${act.daysUntil} DAYS`;

              return (
                <div
                  key={act.id}
                  className={cn(
                    'rounded-xl border-2 border-black bg-white p-4 flex flex-col justify-between gap-3 transition-transform hover:-translate-y-0.5',
                    act.daysUntil <= 1 && 'shadow-[3px_3px_0px_0px_#000000]'
                  )}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded border-2 border-black bg-white text-black">
                          {isPt ? 'EXTRA CLASSE' : 'EXTRA CLASS'}
                        </span>
                        {act.moduleLabel && (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-black bg-white text-black">
                            {act.moduleLabel}
                          </span>
                        )}
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-black bg-white text-black">
                        <Bell size={10} className="text-black" />
                        {urgencyLabel}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-black">
                          {act.formattedDate}
                        </span>
                        {act.weekdayLabel && (
                          <span className="text-[11px] font-extrabold uppercase tracking-wide text-black">
                            • {act.weekdayLabel}
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-black uppercase tracking-tight text-black mt-1 leading-snug">
                        {act.title}
                      </p>
                      {act.topicName && (
                        <p className="text-xs font-semibold text-black mt-0.5 line-clamp-2">
                          {act.topicName}
                        </p>
                      )}
                    </div>

                    {/* Campo de destaque do Local e Instrutor Responsável informados na grade */}
                    <div className="rounded-xl border-2 border-black bg-white px-3 py-2.5 space-y-2">
                      <div className="flex items-start gap-2.5">
                        <MapPin size={16} className="text-black shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <span className="block text-[9px] font-black uppercase tracking-widest text-black">
                            {isPt ? 'Local da Atividade' : 'Activity Location'}
                          </span>
                          <span className="block text-sm font-black uppercase tracking-tight text-black break-words">
                            {act.location || (isPt ? 'A confirmar no Detalhe Semanal' : 'To be confirmed in Schedule')}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-black/15 flex items-start gap-2.5">
                        <User size={15} className="text-black shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <span className="block text-[9px] font-black uppercase tracking-widest text-black">
                            {isPt ? 'Instrutor Responsável' : 'Responsible Instructor'}
                          </span>
                          <span className="block text-xs font-black uppercase tracking-tight text-black break-words">
                            {act.instructorName || (isPt ? 'A confirmar no Detalhe Semanal' : 'To be confirmed')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-black/20 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-black">
                    <span className="inline-flex items-center gap-1 font-mono font-black">
                      <Clock size={12} className="text-black" />
                      {act.timeLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.section>
      ) : !loadingExtras ? (
        <section
          aria-label={isPt ? 'Aviso de Atividade Extraclasse' : 'Extra-Class Activity Notice'}
          className="bg-white border border-slate-300 rounded-2xl px-5 py-3.5 text-black flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl border border-black bg-white flex items-center justify-center shrink-0">
              <Compass size={18} className="text-black" />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-black">
                {isPt ? 'Aviso de Atividade Extraclasse' : 'Extra-Class Activity Notice'}
              </h2>
              <p className="text-xs text-black mt-0.5">
                {isPt
                  ? 'Nenhuma atividade extraclasse programada no Detalhe Semanal de Aulas no momento.'
                  : 'No extra-class activity scheduled in the Weekly Class Schedule right now.'}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {/* Faixa da Carteira Digital do Aluno */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 text-black shadow-sm border border-slate-300 relative overflow-hidden"
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-black bg-white border border-slate-300 px-2.5 py-1 rounded-full">
              <GraduationCap size={13} className="text-black" />
              <span>{isPt ? 'Carteira Digital do Aluno' : 'Digital Student ID Card'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-black">
              {isPt ? 'Carteira Digital do Aluno' : 'Digital Student ID Card'}
            </h1>
            <p className="text-xs sm:text-sm text-black max-w-2xl">
              {profile.curso_nome || profile.turma_nome ? (
                <>
                  {isPt ? 'Você está conectado à turma ' : 'You are signed in to class '}
                  <strong className="text-black">{profile.turma_nome || '—'}</strong>
                  {profile.curso_nome ? (
                    <>
                      {' '}• <span className="text-black font-semibold">{profile.curso_nome}</span>
                    </>
                  ) : null}
                  .
                </>
              ) : (
                isPt
                  ? 'Acesse abaixo os seus módulos acadêmicos individuais.'
                  : 'Access your individual academic modules below.'
              )}
            </p>
          </div>

          {profile.access_code && (
            <div className="shrink-0 bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-left md:text-right">
              <span className="block text-[9px] font-bold uppercase tracking-widest text-black">
                {isPt ? 'Código Individual QR' : 'Individual QR Code'}
              </span>
              <span className="font-mono text-sm font-black tracking-wider text-black">
                {profile.access_code}
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Os Módulos Principais do Aluno */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        {primaryModules.map((mod, idx) => {
          const Icon = mod.icon;
          return (
            <motion.div
              key={mod.href}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              className="min-w-0 bg-white border border-slate-300 rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4 sm:gap-5 text-black"
            >
              <div className="space-y-4 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white border-2 border-black text-black flex items-center justify-center shadow-sm shrink-0">
                    <Icon size={22} className="text-black" />
                  </div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border border-slate-300 bg-white text-black inline-flex items-center gap-1 max-w-full break-words">
                    {mod.href === '/avaliacao' && hasSubmittedSurvey && <CheckCircle2 size={11} className="text-black shrink-0" />}
                    {mod.href === '/avaliacao' && !hasSubmittedSurvey && !canFillSurvey && <Lock size={11} className="text-black shrink-0" />}
                    {mod.href === '/avaliacao' && !hasSubmittedSurvey && canFillSurvey && <Sparkles size={11} className="text-black shrink-0" />}
                    {mod.href === '/horario' && scheduledExams.length > 0 && <AlertTriangle size={11} className="text-black shrink-0" />}
                    {mod.badgeText}
                  </span>
                </div>

                <div>
                  <h2 className="text-base sm:text-lg font-black text-black tracking-tight">
                    {mod.title}
                  </h2>
                  <p className="text-xs text-black mt-1.5 leading-relaxed">
                    {mod.description}
                  </p>
                </div>
              </div>

              <Link
                href={mod.href}
                className={cn(
                  "w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] group text-white",
                  mod.ctaClass
                )}
              >
                <span>{mod.cta}</span>
                <ArrowRight size={14} className="text-white transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Pensamento do Dia */}
      <DashboardThoughtWidget studentTheme />

      {/* Avisos da Coordenação / Próximos Eventos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white border border-slate-300 rounded-2xl p-5 shadow-sm space-y-3 text-black">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-black" />
              <h3 className="text-sm font-black text-black uppercase tracking-wider">
                {isPt ? 'Avisos e Agenda para o Aluno' : 'Student Notices & Schedule'}
              </h3>
            </div>
          </div>

          {loadingExtras ? (
            <div className="py-6 text-center text-xs text-black">
              {isPt ? 'Carregando avisos da turma...' : 'Loading class notices...'}
            </div>
          ) : announcements.length === 0 ? (
            <div className="py-6 text-center text-xs text-black bg-white rounded-xl border border-slate-300">
              {isPt ? 'Nenhum aviso ou evento futuro publicado no momento.' : 'No upcoming notices or events published right now.'}
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {announcements.map((evt) => (
                <div key={evt.id} className="py-3 flex flex-wrap sm:flex-nowrap items-start justify-between gap-2 sm:gap-3">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <p className="text-xs font-bold text-black break-words">{evt.titulo}</p>
                    {evt.descricao && <p className="text-[11px] text-black line-clamp-2 break-words">{evt.descricao}</p>}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {evt.instructorName && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-black bg-white px-2 py-0.5 rounded border border-slate-300">
                          <User size={10} className="text-black" />
                          {isPt ? 'Instrutor Responsável:' : 'Instructor:'} {evt.instructorName}
                        </span>
                      )}
                      {evt.uniforme_dia && (
                        <span className="inline-block text-[10px] font-bold text-black bg-white px-2 py-0.5 rounded border border-slate-300">
                          {isPt ? 'Uniforme:' : 'Uniform:'} {evt.uniforme_dia}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-black shrink-0 flex items-center gap-1">
                    <Clock size={12} className="text-black" />
                    {evt.data ? new Date(evt.data).toLocaleDateString('pt-BR') : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Acessos Complementares */}
        <div className="bg-white border border-slate-300 rounded-2xl p-5 shadow-sm space-y-3 text-black">
          <h3 className="text-sm font-black text-black uppercase tracking-wider">
            {isPt ? 'Outros Recursos' : 'Additional Resources'}
          </h3>
          <div className="space-y-2">
            <Link
              href="/calendario"
              className="flex items-center justify-between p-3 rounded-xl transition-all group bg-white hover:bg-slate-100 border-2 border-black text-black"
            >
              <span className="flex items-center gap-2.5 text-xs font-bold text-black">
                <CalendarDays size={15} className="text-black" />
                {isPt ? 'Calendário de Eventos' : 'Events Calendar'}
              </span>
              <ArrowRight size={13} className="text-black transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
      {/* Marca d'água ao final da área de trabalho do aluno */}
      <div
        aria-hidden="true"
        className="pt-4 pb-6 flex items-center justify-center pointer-events-none select-none"
      >
        <div className="relative w-56 h-56 sm:w-72 sm:h-72 opacity-20 mix-blend-multiply">
          <Image
            src="/assets/aistudio/imagem_01_2da3aec8.png"
            alt="Guarda Costeira de São Tomé e Príncipe"
            fill
            sizes="(max-width: 640px) 224px, 288px"
            className="object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    </div>
  );
}
