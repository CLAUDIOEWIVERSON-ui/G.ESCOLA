'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  Users,
  Calendar,
  CalendarDays,
  GraduationCap,
  ClipboardCheck,
  Compass,
  AlertTriangle,
  MessageSquare,
  Send,
  Smartphone,
  Lock,
  Trash2,
  Clock,
  MapPin,
  User,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Award,
  BookOpen,
} from 'lucide-react';
import { useUser } from '@/lib/auth/UserContext';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { supabase } from '@/lib/supabase/client';
import { fetchWithAuth } from '@/lib/api';
import { UserWorkspaceHeader } from '@/components/UserWorkspaceHeader';
import DashboardThoughtWidget from '@/components/DashboardThoughtWidget';
import { cn, getCleanTurmaName, calculateStudentCoursePercentage } from '@/lib/utils';
import { toast } from 'sonner';

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

interface GraduationDateItem {
  id: string;
  title: string;
  description?: string;
  dateStr: string;
  endDateStr?: string | null;
  formattedDate: string;
  weekdayLabel: string;
  daysUntil: number;
  source: 'evento' | 'turma';
  uniforme?: string;
}

interface RecadoItem {
  id: string;
  turma_id: string;
  aluno_id: string;
  sender_id: string;
  sender_name: string;
  titulo: string;
  mensagem: string;
  lido: boolean;
  lido_em: string | null;
  created_at: string;
  aluno?: {
    id: string;
    nome?: string;
    nome_guerra?: string;
    posto_graduacao?: string;
    matricula?: string;
  } | null;
}

const DAY_OFFSETS: Record<string, number> = {
  monday: 0,
  tuesday: 1,
  wednesday: 2,
  thursday: 3,
  friday: 4,
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

function isGraduationKeywordMatch(str?: string | null): boolean {
  const norm = normalizeSearchText(str);
  if (!norm) return false;
  return /\b(formaturas?|cerimonias?|diplomac(?:ao|oes)|colac(?:ao|oes)|encerramentos?|conclus(?:ao|oes)|solenidade)\b/i.test(norm);
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
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getWeekdayLabel(dateStr: string, isPt: boolean): string {
  const clean = dateStr.split('T')[0];
  const dt = new Date(`${clean}T12:00:00`);
  if (isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString(isPt ? 'pt-BR' : 'en-US', { weekday: 'long' });
}

function getLocalTodayDateStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function diffDaysLocal(targetDateStr: string, baseDateStr: string): number {
  const target = new Date(`${targetDateStr.split('T')[0]}T12:00:00`);
  const base = new Date(`${baseDateStr.split('T')[0]}T12:00:00`);
  if (isNaN(target.getTime()) || isNaN(base.getTime())) return 0;
  return Math.round((target.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
}

function computeSlotTimeRange(slotStart: string): { startMinutes: number; endMinutes: number } {
  const [hStr, mStr] = slotStart.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (isNaN(h) || isNaN(m)) return { startMinutes: 0, endMinutes: 0 };
  const startMinutes = h * 60 + m;
  return { startMinutes, endMinutes: startMinutes + 50 };
}

function formatMinutesToHHMM(totalMinutes: number): string {
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const m = String(totalMinutes % 60).padStart(2, '0');
  return `${h}:${m}`;
}

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

export function AcompanhanteWorkspace() {
  const { profile, isAcompanhante } = useUser();
  const { language } = useI18n();
  const isPt = language === 'pt';

  const [loadingData, setLoadingData] = useState(true);
  const [turmaDetails, setTurmaDetails] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<any[]>([]);
  const [scheduledExams, setScheduledExams] = useState<ScheduledExamItem[]>([]);
  const [extraClassActivities, setExtraClassActivities] = useState<ExtraClassActivityItem[]>([]);
  const [graduationDates, setGraduationDates] = useState<GraduationDateItem[]>([]);

  const [recados, setRecados] = useState<RecadoItem[]>([]);
  const [loadingRecados, setLoadingRecados] = useState(true);
  const [selectedAlunoId, setSelectedAlunoId] = useState('');
  const [recadoTitulo, setRecadoTitulo] = useState('');
  const [recadoMensagem, setRecadoMensagem] = useState('');
  const [sendingRecado, setSendingRecado] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingRecadoId, setDeletingRecadoId] = useState<string | null>(null);

  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [hasTouchCapability, setHasTouchCapability] = useState(false);

  useEffect(() => {
    const detectMobile = () => {
      if (typeof window === 'undefined') return;
      const ua = navigator.userAgent || '';
      const mobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(ua);
      const chMobile = Boolean((navigator as any).userAgentData?.mobile);
      const touchCapable = (navigator.maxTouchPoints || 0) > 0 || window.matchMedia('(pointer: coarse)').matches;
      const compactViewport = window.innerWidth <= 1024;
      setHasTouchCapability(touchCapable);
      setIsMobileDevice(Boolean(mobileUa || chMobile || (touchCapable && compactViewport)));
    };

    detectMobile();
    window.addEventListener('resize', detectMobile);
    return () => window.removeEventListener('resize', detectMobile);
  }, []);

  const fetchRecados = useCallback(async () => {
    if (!profile?.turma_id) {
      setRecados([]);
      setLoadingRecados(false);
      return;
    }
    setLoadingRecados(true);
    try {
      const res = await fetchWithAuth('/api/recados');
      if (res.ok) {
        const json = await res.json();
        setRecados(Array.isArray(json.recados) ? json.recados : []);
      }
    } catch (err) {
      console.warn('Erro ao carregar recados:', err);
    } finally {
      setLoadingRecados(false);
    }
  }, [profile?.turma_id]);

  useEffect(() => {
    let active = true;

    async function loadTurmaData() {
      if (!profile?.turma_id) {
        if (active) setLoadingData(false);
        return;
      }

      setLoadingData(true);
      try {
        const localTodayStr = getLocalTodayDateStr();
        const turmaId = profile.turma_id;

        const [
          turmaRes,
          alunosRes,
          freqRes,
          horarioRes,
          discRes,
          matRes,
          evtPrimaryRes,
          instrRes,
          apiInstrRes,
        ] = await Promise.all([
          supabase
            .from('turmas')
            .select('id, nome, curso_id, instrutor, coordenador, localizacao, periodo, data_inicio, data_fim, data_postergacao, grupo_responsavel, status, curso:cursos(id, nome, codigo)')
            .eq('id', turmaId)
            .maybeSingle(),
          supabase
            .from('alunos')
            .select('id, nome, matricula, posto_graduacao, nome_guerra, foto_url, genero, email')
            .eq('turma_id', turmaId)
            .is('deleted_at', null)
            .order('nome'),
          supabase
            .from('frequencia')
            .select('*')
            .eq('turma_id', turmaId),
          supabase
            .from('horarios')
            .select('data')
            .eq('turma_id', turmaId)
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
            .select('id, titulo, descricao, data, data_fim, tipo_data, cor, exibir_aluno, exibir_monitor, target_grupo, uniforme_dia')
            .order('data', { ascending: true })
            .limit(80),
          supabase
            .from('profiles')
            .select('id, full_name')
            .in('role', ['instrutor', 'admin']),
          fetchWithAuth('/api/v1/instrutores')
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ]);

        if (!active) return;

        const turmaRow = turmaRes.data || null;
        setTurmaDetails(turmaRow);
        setStudents(alunosRes.data || []);
        setAttendanceRows(freqRes.data || []);

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

        const fallbackTurmaInstructor = String(
          apiInstrRes?.turmaInstructors?.[turmaId] || turmaRow?.instrutor || ''
        ).trim();

        let rawEventos: any[] = evtPrimaryRes.data || [];
        if (evtPrimaryRes.error) {
          const secondaryEvtRes = await supabase
            .from('eventos')
            .select('id, titulo, descricao, data, data_fim, tipo_data, cor, exibir_aluno, target_grupo, uniforme_dia')
            .order('data', { ascending: true })
            .limit(80);
          if (!secondaryEvtRes.error && secondaryEvtRes.data) {
            rawEventos = secondaryEvtRes.data;
          } else {
            const fallbackEvtRes = await supabase
              .from('eventos')
              .select('id, titulo, descricao, data, cor, exibir_aluno, uniforme_dia')
              .order('data', { ascending: true })
              .limit(80);
            rawEventos = fallbackEvtRes.data || [];
          }
        }

        const turmaGrp = (turmaRow?.grupo_responsavel || profile.turma_grupo || 'AMBOS').toUpperCase();
        const parsedEvents = rawEventos
          .map((evt: any) => {
            let desc = evt.descricao || '';
            let parsedDataFim = evt.data_fim ? String(evt.data_fim).split('T')[0] : null;
            let parsedTargetGrupo = evt.target_grupo || 'AMBOS';
            let parsedExibirMonitor = evt.exibir_monitor !== false;
            let isExclusive = false;

            const creatorMatch = desc.match(/\[creator:([^\]]+)\]/);
            const rawCreator = creatorMatch?.[1]?.trim() || '';
            const resolvedEventInstructor = rawCreator
              ? instrMap.get(rawCreator) || (!UUID_PATTERN.test(rawCreator) ? rawCreator : '')
              : '';

            const exclusiveMatch = desc.match(/\[exclusive:([^\]]+)\]/);
            if (exclusiveMatch) {
              isExclusive = exclusiveMatch[1] === 'true';
            }
            const monitorMatch = desc.match(/\[exibir_monitor:([^\]]+)\]/);
            if (monitorMatch) {
              parsedExibirMonitor = monitorMatch[1] === 'true';
            }
            const targetMatch = desc.match(/\[target_grupo:([^\]]+)\]/);
            if (targetMatch) {
              parsedTargetGrupo = targetMatch[1];
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
              parsedExibirMonitor,
              targetGrupo: parsedTargetGrupo.toUpperCase(),
              isExclusive,
              startDateStr,
              parsedDataFim,
              checkEndStr,
              instructorName: resolvedEventInstructor || undefined,
            };
          })
          .filter((e: any) => {
            if (e.isExclusive || !e.parsedExibirMonitor) return false;
            if (e.targetGrupo !== 'AMBOS' && turmaGrp !== 'AMBOS' && e.targetGrupo !== turmaGrp) {
              return false;
            }
            return Boolean(e.checkEndStr);
          });

        const discMap = new Map<string, any>();
        (discRes.data || []).forEach((d: any) => discMap.set(d.id, d));

        const matMap = new Map<string, any>();
        (matRes.data || []).forEach((m: any) => matMap.set(m.id, m));

        const rawSlotExams: any[] = [];
        const rawSlotExtraClasses: any[] = [];
        const scheduleJson = horarioRes.data?.data as Record<string, any> | null;

        if (scheduleJson && typeof scheduleJson === 'object') {
          Object.entries(scheduleJson).forEach(([key, cell]) => {
            if (!cell || typeof cell !== 'object') return;
            const match = key.match(/^(\d{4}-\d{2}-\d{2})_class-(\d{2}:\d{2})-(monday|tuesday|wednesday|thursday|friday)$/);
            if (!match) return;

            const [, weekKey, slotStart, dayKey] = match;
            const dayOffset = DAY_OFFSETS[dayKey];
            if (dayOffset === undefined) return;

            const baseWeekDate = new Date(`${weekKey}T12:00:00`);
            if (isNaN(baseWeekDate.getTime())) return;
            baseWeekDate.setDate(baseWeekDate.getDate() + dayOffset);
            const cellDateStr = `${baseWeekDate.getFullYear()}-${String(baseWeekDate.getMonth() + 1).padStart(2, '0')}-${String(baseWeekDate.getDate()).padStart(2, '0')}`;

            if (cellDateStr < localTodayStr) return;

            const discObj = cell.subjectId ? discMap.get(cell.subjectId) : null;
            const topicObj = cell.topicId ? matMap.get(cell.topicId) : null;
            const { startMinutes, endMinutes } = computeSlotTimeRange(slotStart);

            const rawModulo = String(cell.modulo || '').trim();
            const rawModuloUpper = rawModulo.toUpperCase();
            const subjectText = String(cell.customSubject || discObj?.nome || '').trim();
            const topicText = String(cell.topic || topicObj?.nome || '').trim();

            if (isExtraClassCellData(cell, discObj?.nome)) {
              const resolvedTitle =
                cell.customSubject && !/^extra[\s-]*classe$/i.test(cell.customSubject.trim())
                  ? String(cell.customSubject).trim()
                  : isPt
                    ? 'Atividade Extraclasse'
                    : 'Extra-Class Activity';
              const resolvedInstructor = resolveSlotInstructorName(cell, instrMap, fallbackTurmaInstructor);
              const modLabel = rawModulo
                ? !isNaN(Number(rawModulo))
                  ? isPt ? `Módulo ${rawModulo}` : `Module ${rawModulo}`
                  : rawModulo
                : undefined;

              rawSlotExtraClasses.push({
                dateStr: cellDateStr,
                title: resolvedTitle,
                topicName: topicText || undefined,
                moduleLabel: modLabel,
                location: cell.room ? String(cell.room).trim() : '',
                instructorName: resolvedInstructor || undefined,
                startMinutes,
                endMinutes,
              });
              return;
            }

            const isExplicitExamModule = ['PROVAS', 'PROVA', 'EXAME', 'EXAMS'].includes(rawModuloUpper);
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
              moduleLabel =
                extractModuleFromText(subjectText, isPt) ||
                extractModuleFromText(topicText, isPt) ||
                (isPt ? 'Avaliação / Prova' : 'Exam');
            }

            rawSlotExams.push({
              dateStr: cellDateStr,
              moduleLabel,
              subjectName: subjectText || topicText || (isPt ? 'Prova do Módulo' : 'Module Exam'),
              topicName: subjectText && topicText ? topicText : undefined,
              room: cell.room ? String(cell.room).trim() : undefined,
              instructorName: resolveSlotInstructorName(cell, instrMap, fallbackTurmaInstructor) || undefined,
              startMinutes,
              endMinutes,
            });
          });
        }

        rawSlotExams.sort((a, b) => (a.dateStr !== b.dateStr ? a.dateStr.localeCompare(b.dateStr) : a.startMinutes - b.startMinutes));
        const consolidatedExams: ScheduledExamItem[] = [];
        for (const item of rawSlotExams) {
          const prev = consolidatedExams[consolidatedExams.length - 1] as any;
          if (
            prev &&
            prev.dateStr === item.dateStr &&
            prev.moduleLabel === item.moduleLabel &&
            prev.subjectName === item.subjectName &&
            item.startMinutes - (prev._endMinutes || 0) <= 25
          ) {
            prev._endMinutes = item.endMinutes;
            prev.timeLabel = `${formatMinutesToHHMM(prev.startTimeMinutes)} - ${formatMinutesToHHMM(item.endMinutes)}`;
            if (!prev.room && item.room) prev.room = item.room;
            if (!prev.instructorName && item.instructorName) prev.instructorName = item.instructorName;
          } else {
            consolidatedExams.push({
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
              ...( { _endMinutes: item.endMinutes } as any ),
            });
          }
        }

        const eventExams: ScheduledExamItem[] = parsedEvents
          .filter((e: any) => e.checkEndStr >= localTodayStr && (isExamKeywordMatch(e.titulo) || isExamKeywordMatch(e.cleanDescricao)))
          .map((e: any) => {
            const targetDate = e.startDateStr >= localTodayStr ? e.startDateStr : e.checkEndStr;
            return {
              id: `evento-exam-${e.id}`,
              dateStr: targetDate,
              formattedDate: formatDatePtBr(targetDate),
              weekdayLabel: getWeekdayLabel(targetDate, isPt),
              daysUntil: diffDaysLocal(targetDate, localTodayStr),
              moduleLabel:
                extractModuleFromText(e.titulo, isPt) ||
                extractModuleFromText(e.cleanDescricao, isPt) ||
                (isPt ? 'Prova / Avaliação' : 'Exam'),
              subjectName: e.titulo,
              topicName: e.cleanDescricao || undefined,
              instructorName: e.instructorName || undefined,
              source: 'evento',
              startTimeMinutes: 0,
            };
          });

        setScheduledExams(
          [...consolidatedExams, ...eventExams].sort((a, b) =>
            a.dateStr !== b.dateStr ? a.dateStr.localeCompare(b.dateStr) : a.startTimeMinutes - b.startTimeMinutes
          )
        );

        rawSlotExtraClasses.sort((a, b) => (a.dateStr !== b.dateStr ? a.dateStr.localeCompare(b.dateStr) : a.startMinutes - b.startMinutes));
        const consolidatedExtra: ExtraClassActivityItem[] = [];
        for (const item of rawSlotExtraClasses) {
          const prev = consolidatedExtra[consolidatedExtra.length - 1] as any;
          if (
            prev &&
            prev.dateStr === item.dateStr &&
            prev.location === item.location &&
            prev.title === item.title &&
            (prev.topicName || '') === (item.topicName || '') &&
            item.startMinutes - (prev._endMinutes || 0) <= 25
          ) {
            prev._endMinutes = item.endMinutes;
            prev.timeLabel = `${formatMinutesToHHMM(prev.startTimeMinutes)} - ${formatMinutesToHHMM(item.endMinutes)}`;
            if (!prev.instructorName && item.instructorName) prev.instructorName = item.instructorName;
          } else {
            consolidatedExtra.push({
              id: `extra-${item.dateStr}-${item.startMinutes}-${item.location}`,
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
              ...( { _endMinutes: item.endMinutes } as any ),
            });
          }
        }
        setExtraClassActivities(consolidatedExtra);

        const gradEvents: GraduationDateItem[] = parsedEvents
          .filter((e: any) => isGraduationKeywordMatch(e.titulo) || isGraduationKeywordMatch(e.cleanDescricao))
          .map((e: any) => ({
            id: `grad-evt-${e.id}`,
            title: e.titulo,
            description: e.cleanDescricao || undefined,
            dateStr: e.startDateStr,
            endDateStr: e.parsedDataFim,
            formattedDate: formatDatePtBr(e.startDateStr),
            weekdayLabel: getWeekdayLabel(e.startDateStr, isPt),
            daysUntil: diffDaysLocal(e.startDateStr, localTodayStr),
            source: 'evento',
            uniforme: e.uniforme_dia || undefined,
          }));

        const turmaEnd = turmaRow?.data_postergacao || turmaRow?.data_fim || profile.data_postergacao || profile.data_fim;
        if (turmaEnd) {
          const cleanEnd = String(turmaEnd).split('T')[0];
          gradEvents.push({
            id: 'grad-turma-end',
            title: turmaRow?.data_postergacao
              ? (isPt ? 'Término Previsto do Curso (Data Postergada / Formatura)' : 'Expected Course Conclusion (Postponed / Graduation)')
              : (isPt ? 'Data Prevista de Encerramento / Formatura da Turma' : 'Expected Class Closing / Graduation Date'),
            description: turmaRow?.data_fim && turmaRow?.data_postergacao
              ? (isPt ? `Data original prevista: ${formatDatePtBr(turmaRow.data_fim)}` : `Original date: ${formatDatePtBr(turmaRow.data_fim)}`)
              : undefined,
            dateStr: cleanEnd,
            formattedDate: formatDatePtBr(cleanEnd),
            weekdayLabel: getWeekdayLabel(cleanEnd, isPt),
            daysUntil: diffDaysLocal(cleanEnd, localTodayStr),
            source: 'turma',
          });
        }

        gradEvents.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
        setGraduationDates(gradEvents);
      } catch (err) {
        console.error('[AcompanhanteWorkspace] Erro ao carregar dados da turma:', err);
      } finally {
        if (active) setLoadingData(false);
      }
    }

    loadTurmaData();
    fetchRecados();

    return () => {
      active = false;
    };
  }, [profile?.turma_id, profile?.turma_grupo, profile?.data_fim, profile?.data_postergacao, isPt, fetchRecados]);

  const effectiveStartDate = turmaDetails?.data_inicio || profile?.data_inicio || null;
  const effectiveEndDate = turmaDetails?.data_postergacao || turmaDetails?.data_fim || profile?.data_postergacao || profile?.data_fim || null;

  const studentAttendanceList = useMemo(() => {
    return students.map((aluno) => {
      const stats = calculateStudentCoursePercentage(aluno.id, attendanceRows, effectiveStartDate, effectiveEndDate);
      return {
        ...aluno,
        attendanceStats: stats,
      };
    });
  }, [students, attendanceRows, effectiveStartDate, effectiveEndDate]);

  const averageAttendancePct = useMemo(() => {
    const valid = studentAttendanceList.filter((s) => s.attendanceStats.pct !== null);
    if (valid.length === 0) return null;
    const sum = valid.reduce((acc, s) => acc + (s.attendanceStats.pct || 0), 0);
    return Math.round(sum / valid.length);
  }, [studentAttendanceList]);

  const turmaDisplayName = useMemo(() => {
    if (turmaDetails) {
      return getCleanTurmaName(
        turmaDetails,
        turmaDetails?.curso?.nome || profile?.curso_nome,
        isPt ? 'Turma Única' : 'Single Class'
      );
    }
    return profile?.turma_nome || (isPt ? 'Turma Vinculada' : 'Assigned Class');
  }, [turmaDetails, profile?.curso_nome, profile?.turma_nome, isPt]);

  const handleSendRecado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAcompanhante) {
      toast.error(isPt ? 'Apenas monitores de turma podem enviar recados individuais.' : 'Only class monitors can send individual messages.');
      return;
    }
    if (!isMobileDevice) {
      toast.error(isPt ? 'O envio de recados individuais só é permitido em dispositivo móvel (celular ou tablet).' : 'Sending individual messages is restricted to mobile devices.');
      return;
    }
    if (!selectedAlunoId) {
      toast.error(isPt ? 'Selecione o aluno destinatário do recado.' : 'Select a student recipient.');
      return;
    }
    if (!recadoMensagem.trim()) {
      toast.error(isPt ? 'Escreva a mensagem do recado.' : 'Enter the message text.');
      return;
    }

    setSendingRecado(true);
    try {
      const res = await fetchWithAuth('/api/recados', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-device': isMobileDevice ? 'mobile' : 'desktop',
          'x-client-touch': hasTouchCapability ? '1' : '0',
        },
        body: JSON.stringify({
          aluno_id: selectedAlunoId,
          titulo: recadoTitulo.trim() || (isPt ? 'Recado do Monitor da Turma' : 'Message from Class Monitor'),
          mensagem: recadoMensagem.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Erro ao enviar recado.');
      }

      toast.success(isPt ? 'Recado individual enviado ao aluno!' : 'Individual message sent!');
      setRecadoTitulo('');
      setRecadoMensagem('');
      setSelectedAlunoId('');
      await fetchRecados();
    } catch (err: any) {
      toast.error(err.message || (isPt ? 'Falha ao enviar recado.' : 'Failed to send message.'));
    } finally {
      setSendingRecado(false);
    }
  };

  const handleDeleteRecado = async (id: string) => {
    if (!isAcompanhante || !isMobileDevice) {
      toast.error(isPt ? 'Exclusão disponível apenas para monitores de turma em dispositivo móvel.' : 'Deletion restricted to class monitors on mobile.');
      return;
    }
    setDeletingRecadoId(id);
    try {
      const res = await fetchWithAuth(`/api/recados?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          'x-client-device': isMobileDevice ? 'mobile' : 'desktop',
          'x-client-touch': hasTouchCapability ? '1' : '0',
        },
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Erro ao excluir recado.');
      }
      setRecados((prev) => prev.filter((r) => r.id !== id));
      setConfirmDeleteId(null);
      toast.success(isPt ? 'Recado excluído.' : 'Message deleted.');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir recado.');
    } finally {
      setDeletingRecadoId(null);
    }
  };

  if (!profile) return null;

  if (!profile.turma_id) {
    return (
      <div className="space-y-6">
        <UserWorkspaceHeader />
        <div className="bg-white border border-amber-200 rounded-2xl p-8 text-center space-y-3 shadow-sm">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <AlertTriangle size={26} />
          </div>
          <h2 className="text-lg font-black text-slate-900">
            {isPt ? 'Nenhuma Turma Vinculada ao Seu Acesso' : 'No Class Linked to Your Account'}
          </h2>
          <p className="text-sm text-slate-600 max-w-lg mx-auto">
            {isPt
              ? 'Solicite à coordenação ou ao administrador do sistema que vincule a sua turma no painel de Usuários para liberar o acompanhamento acadêmico.'
              : 'Ask an administrator to link your assigned class in User Management to enable class tracking.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <UserWorkspaceHeader />
      <DashboardThoughtWidget />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-black uppercase tracking-widest">
              <Users size={13} className="text-teal-600" />
              <span>{isPt ? 'Painel do Monitor de Turma' : 'Class Monitor Workspace'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {turmaDisplayName}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 font-semibold">
              {(turmaDetails?.curso?.nome || profile.curso_nome) && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800">
                  <BookOpen size={13} className="text-blue-600" />
                  {turmaDetails?.curso?.nome || profile.curso_nome}
                </span>
              )}
              {effectiveStartDate && effectiveEndDate && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-mono">
                  <Calendar size={13} className="text-teal-600" />
                  {formatDatePtBr(effectiveStartDate)} a {formatDatePtBr(effectiveEndDate)}
                </span>
              )}
              {turmaDetails?.localizacao && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700">
                  <MapPin size={13} className="text-rose-500" />
                  {turmaDetails.localizacao}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-center">
              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                {isPt ? 'Alunos' : 'Students'}
              </span>
              <span className="text-xl font-black text-slate-900 font-mono">{students.length}</span>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-center">
              <span className="block text-[10px] font-black uppercase tracking-wider text-purple-600">
                {isPt ? 'Freq. Média' : 'Avg Attend.'}
              </span>
              <span className="text-xl font-black text-purple-900 font-mono">
                {averageAttendancePct !== null ? `${averageAttendancePct}%` : '—'}
              </span>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-center">
              <span className="block text-[10px] font-black uppercase tracking-wider text-rose-600">
                {isPt ? 'Provas' : 'Exams'}
              </span>
              <span className="text-xl font-black text-rose-900 font-mono">{scheduledExams.length}</span>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-center">
              <span className="block text-[10px] font-black uppercase tracking-wider text-amber-700">
                {isPt ? 'Extra Classe' : 'Extra Class'}
              </span>
              <span className="text-xl font-black text-amber-900 font-mono">{extraClassActivities.length}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-5 border-t border-slate-100">
          <Link
            href="/frequencia"
            className="flex items-center justify-between p-3.5 rounded-xl bg-purple-50/70 hover:bg-purple-100/80 border border-purple-200 text-purple-950 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0">
                <ClipboardCheck size={18} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wide">{isPt ? 'Frequência da Turma' : 'Class Attendance'}</p>
                <p className="text-[11px] text-purple-700 font-medium">{isPt ? 'Visualizar mapa completo' : 'View full attendance grid'}</p>
              </div>
            </div>
            <ArrowRight size={16} className="text-purple-600 transition-transform group-hover:translate-x-1" />
          </Link>

          <Link
            href="/horario"
            className="flex items-center justify-between p-3.5 rounded-xl bg-cyan-50/70 hover:bg-cyan-100/80 border border-cyan-200 text-cyan-950 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-cyan-600 text-white flex items-center justify-center shrink-0">
                <Calendar size={18} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wide">{isPt ? 'Detalhe Semanal' : 'Weekly Schedule'}</p>
                <p className="text-[11px] text-cyan-700 font-medium">{isPt ? 'Aulas, horários e instrutores' : 'Classes, hours & instructors'}</p>
              </div>
            </div>
            <ArrowRight size={16} className="text-cyan-600 transition-transform group-hover:translate-x-1" />
          </Link>

          <Link
            href="/calendario"
            className="flex items-center justify-between p-3.5 rounded-xl bg-rose-50/70 hover:bg-rose-100/80 border border-rose-200 text-rose-950 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
                <CalendarDays size={18} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wide">{isPt ? 'Calendário e Formatura' : 'Calendar & Graduation'}</p>
                <p className="text-[11px] text-rose-700 font-medium">{isPt ? 'Eventos e cerimônias' : 'Events and ceremonies'}</p>
              </div>
            </div>
            <ArrowRight size={16} className="text-rose-600 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center">
                <GraduationCap size={18} />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                  {isPt ? 'Datas de Formatura' : 'Graduation Dates'}
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">
                  {isPt ? 'Cerimônias e previsão de conclusão' : 'Ceremonies and closing date'}
                </p>
              </div>
            </div>
            <span className="text-xs font-black font-mono px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              {graduationDates.length}
            </span>
          </div>

          {loadingData ? (
            <div className="py-10 flex justify-center"><Loader2 size={22} className="animate-spin text-indigo-600" /></div>
          ) : graduationDates.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
              {isPt ? 'Nenhuma data de formatura cadastrada no momento.' : 'No graduation date registered yet.'}
            </div>
          ) : (
            <div className="space-y-3">
              {graduationDates.map((item) => (
                <div key={item.id} className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/30 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-base font-black font-mono text-indigo-950">{item.formattedDate}</span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white border border-indigo-200 text-indigo-700">
                      {item.daysUntil === 0
                        ? (isPt ? 'Hoje' : 'Today')
                        : item.daysUntil > 0
                          ? (isPt ? `Em ${item.daysUntil}d` : `In ${item.daysUntil}d`)
                          : (isPt ? `Há ${Math.abs(item.daysUntil)}d` : `${Math.abs(item.daysUntil)}d ago`)}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-800">{item.title}</p>
                  {item.weekdayLabel && (
                    <p className="text-[11px] text-slate-500 capitalize font-medium">{item.weekdayLabel}</p>
                  )}
                  {item.description && (
                    <p className="text-[11px] text-slate-600">{item.description}</p>
                  )}
                  {item.uniforme && (
                    <span className="inline-block text-[10px] font-bold bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-700">
                      {isPt ? 'Uniforme:' : 'Uniform:'} {item.uniforme}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center">
                <Award size={18} />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                  {isPt ? 'Provas e Avaliações' : 'Scheduled Exams'}
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">
                  {isPt ? 'Extraído do detalhe semanal e agenda' : 'From weekly schedule & events'}
                </p>
              </div>
            </div>
            <span className="text-xs font-black font-mono px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              {scheduledExams.length}
            </span>
          </div>

          {loadingData ? (
            <div className="py-10 flex justify-center"><Loader2 size={22} className="animate-spin text-rose-600" /></div>
          ) : scheduledExams.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
              {isPt ? 'Nenhuma prova futura marcada para esta turma.' : 'No upcoming exams scheduled for this class.'}
            </div>
          ) : (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {scheduledExams.map((exam) => (
                <div key={exam.id} className="p-3.5 rounded-xl border border-rose-100 bg-rose-50/30 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-rose-600 text-white">
                      {exam.moduleLabel}
                    </span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white border border-rose-200 text-rose-700">
                      {exam.daysUntil === 0 ? (isPt ? 'Hoje!' : 'Today!') : exam.daysUntil === 1 ? (isPt ? 'Amanhã!' : 'Tomorrow!') : (isPt ? `Faltam ${exam.daysUntil}d` : `In ${exam.daysUntil}d`)}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-black font-mono text-slate-900">{exam.formattedDate}</span>
                    {exam.weekdayLabel && <span className="text-[11px] text-slate-500 capitalize font-semibold">• {exam.weekdayLabel}</span>}
                  </div>
                  <p className="text-xs font-bold text-slate-900">{exam.subjectName}</p>
                  {exam.topicName && <p className="text-[11px] text-slate-600">{exam.topicName}</p>}
                  {(exam.timeLabel || exam.room || exam.instructorName) && (
                    <div className="pt-1.5 border-t border-rose-100 flex flex-wrap gap-2 text-[10px] font-bold text-slate-600">
                      {exam.timeLabel && <span className="inline-flex items-center gap-1 font-mono"><Clock size={11} /> {exam.timeLabel}</span>}
                      {exam.room && <span className="inline-flex items-center gap-1"><MapPin size={11} /> {exam.room}</span>}
                      {exam.instructorName && <span className="inline-flex items-center gap-1"><User size={11} /> {exam.instructorName}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
                <Compass size={18} />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                  {isPt ? 'Atividades Extra Classe' : 'Extra-Class Activities'}
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">
                  {isPt ? 'Programadas no detalhe semanal' : 'Scheduled in weekly grid'}
                </p>
              </div>
            </div>
            <span className="text-xs font-black font-mono px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              {extraClassActivities.length}
            </span>
          </div>

          {loadingData ? (
            <div className="py-10 flex justify-center"><Loader2 size={22} className="animate-spin text-amber-600" /></div>
          ) : extraClassActivities.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
              {isPt ? 'Nenhuma atividade extraclasse programada no momento.' : 'No extra-class activities scheduled right now.'}
            </div>
          ) : (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {extraClassActivities.map((act) => (
                <div key={act.id} className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/35 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500 text-white">
                      {isPt ? 'Extra Classe' : 'Extra Class'}
                    </span>
                    <span className="text-[10px] font-black font-mono text-amber-900 bg-white px-2 py-0.5 rounded border border-amber-200">
                      {act.formattedDate} • {act.timeLabel}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-900">{act.title}</p>
                  {act.topicName && <p className="text-[11px] text-slate-600">{act.topicName}</p>}
                  <div className="pt-1.5 border-t border-amber-200/70 space-y-1 text-[11px] font-semibold text-slate-700">
                    <p className="flex items-center gap-1.5">
                      <MapPin size={12} className="text-amber-700 shrink-0" />
                      <span>{act.location || (isPt ? 'Local a confirmar' : 'Location TBD')}</span>
                    </p>
                    {act.instructorName && (
                      <p className="flex items-center gap-1.5">
                        <User size={12} className="text-amber-700 shrink-0" />
                        <span>{act.instructorName}</span>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-200 text-purple-700 flex items-center justify-center shrink-0">
              <ClipboardCheck size={20} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight">
                {isPt ? 'Resumo de Frequência da Turma' : 'Class Attendance Overview'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {isPt
                  ? 'Visualização consolidada por aluno no período letivo da turma'
                  : 'Consolidated per-student attendance for the class period'}
              </p>
            </div>
          </div>
          <Link
            href="/frequencia"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors shrink-0"
          >
            <span>{isPt ? 'Abrir Mapa Diário Completo' : 'Open Full Attendance Grid'}</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 w-12 text-center">Nº</th>
                <th className="px-5 py-3">{isPt ? 'Aluno' : 'Student'}</th>
                <th className="px-4 py-3 text-center">{isPt ? 'Matrícula / NIF' : 'Registration'}</th>
                <th className="px-4 py-3 text-center">{isPt ? 'Presenças' : 'Present'}</th>
                <th className="px-4 py-3 text-center">{isPt ? 'Faltas' : 'Absent'}</th>
                <th className="px-5 py-3 text-right">{isPt ? '% Frequência' : 'Attendance %'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loadingData ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center">
                    <Loader2 className="animate-spin text-purple-600 mx-auto" size={24} />
                  </td>
                </tr>
              ) : studentAttendanceList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-xs text-slate-400 italic">
                    {isPt ? 'Nenhum aluno matriculado nesta turma.' : 'No students enrolled in this class.'}
                  </td>
                </tr>
              ) : (
                studentAttendanceList.map((aluno, idx) => {
                  const pct = aluno.attendanceStats?.pct;
                  const pctColor =
                    pct === null
                      ? 'bg-slate-100 text-slate-600 border-slate-200'
                      : pct >= 75
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200';
                  return (
                    <tr key={aluno.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 text-center font-mono text-xs font-bold text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-bold text-slate-800 text-xs sm:text-sm">
                          {aluno.posto_graduacao || aluno.nome_guerra
                            ? `${aluno.posto_graduacao || ''} ${aluno.nome_guerra || aluno.nome}`.trim()
                            : aluno.nome}
                        </div>
                        {aluno.nome_guerra && aluno.nome !== aluno.nome_guerra && (
                          <div className="text-[10px] text-slate-400">{aluno.nome}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-xs text-slate-600">
                        {aluno.matricula || '—'}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-xs font-bold text-emerald-700">
                        {aluno.attendanceStats?.presencas ?? 0}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-xs font-bold text-rose-600">
                        {aluno.attendanceStats?.faltas ?? 0}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black font-mono border', pctColor)}>
                          {pct !== null ? `${pct}%` : '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-teal-50/80 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <MessageSquare size={20} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 flex-wrap">
                <span>{isPt ? 'Recados Individuais aos Alunos' : 'Individual Student Messages'}</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                  <Smartphone size={11} />
                  {isPt ? 'Exclusivo Mobile' : 'Mobile Only'}
                </span>
              </h2>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                {isPt
                  ? 'Envie orientações e comunicados individuais diretamente para a área de trabalho de cada aluno da sua turma.'
                  : 'Send individual notices directly to each student workspace in your class.'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            {isAcompanhante && isMobileDevice ? (
              <form onSubmit={handleSendRecado} className="space-y-4 bg-slate-50/80 border border-teal-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-xs font-black text-teal-800 uppercase tracking-wider">
                  <Smartphone size={14} className="text-teal-600" />
                  <span>{isPt ? 'Novo Recado Individual (Mobile Ativo)' : 'New Individual Message (Mobile Active)'}</span>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    {isPt ? 'Aluno Destinatário *' : 'Recipient Student *'}
                  </label>
                  <select
                    required
                    value={selectedAlunoId}
                    onChange={(e) => setSelectedAlunoId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    <option value="">{isPt ? 'Selecione um aluno da turma...' : 'Select a class student...'}</option>
                    {students.map((al) => (
                      <option key={al.id} value={al.id}>
                        {al.posto_graduacao || al.nome_guerra
                          ? `${al.posto_graduacao || ''} ${al.nome_guerra || al.nome} (${al.nome})`.trim()
                          : al.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    {isPt ? 'Assunto / Título' : 'Subject / Title'}
                  </label>
                  <input
                    type="text"
                    maxLength={120}
                    placeholder={isPt ? 'Ex: Convocação para orientação, documento pendente...' : 'Subject...'}
                    value={recadoTitulo}
                    onChange={(e) => setRecadoTitulo(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    {isPt ? 'Mensagem Individual *' : 'Message *'}
                  </label>
                  <textarea
                    required
                    rows={4}
                    maxLength={2000}
                    placeholder={isPt ? 'Escreva o recado individual para este aluno...' : 'Write your individual message...'}
                    value={recadoMensagem}
                    onChange={(e) => setRecadoMensagem(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-y"
                  />
                </div>

                <button
                  type="submit"
                  disabled={sendingRecado || !selectedAlunoId || !recadoMensagem.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-teal-500/20 disabled:opacity-50 cursor-pointer active:scale-[0.99]"
                >
                  {sendingRecado ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  <span>{isPt ? 'Enviar Recado Individual' : 'Send Individual Message'}</span>
                </button>
              </form>
            ) : (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 space-y-3 h-full flex flex-col justify-center">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center shrink-0">
                    <Lock size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-amber-950 uppercase tracking-wide">
                      {isPt ? 'Envio Bloqueado neste Dispositivo' : 'Sending Locked on This Device'}
                    </h3>
                    <p className="text-[11px] text-amber-800 font-bold">
                      {isPt ? 'Acesso exclusivo via dispositivo móvel' : 'Mobile device required'}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-amber-900 leading-relaxed font-medium">
                  {isPt
                    ? 'Por determinação de segurança do sistema, somente o Monitor de Turma acessando por um dispositivo móvel (smartphone ou tablet) pode enviar ou excluir recados individuais para os alunos. No computador, você pode consultar o histórico de recados já enviados ao lado.'
                    : 'Only Class Monitors using a mobile device (smartphone or tablet) are permitted to send or delete individual student messages.'}
                </p>
              </div>
            )}
          </div>

          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                {isPt ? `Recados Enviados na Turma (${recados.length})` : `Sent Class Messages (${recados.length})`}
              </h3>
            </div>

            {loadingRecados ? (
              <div className="py-12 flex justify-center">
                <Loader2 size={22} className="animate-spin text-teal-600" />
              </div>
            ) : recados.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-400">
                {isPt ? 'Nenhum recado individual enviado ainda para os alunos desta turma.' : 'No individual messages sent yet.'}
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {recados.map((rec) => {
                  const alunoName = rec.aluno
                    ? `${rec.aluno.posto_graduacao || ''} ${rec.aluno.nome_guerra || rec.aluno.nome || ''}`.trim()
                    : isPt ? 'Aluno' : 'Student';

                  return (
                    <div key={rec.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 shadow-2xs">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                              <User size={10} />
                              {isPt ? 'Para:' : 'To:'} {alunoName}
                            </span>
                            {rec.lido ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 size={10} />
                                {isPt ? 'Lido pelo aluno' : 'Read'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock size={10} />
                                {isPt ? 'Aguardando leitura' : 'Unread'}
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs sm:text-sm font-black text-slate-900 pt-1">{rec.titulo}</h4>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-mono text-slate-400">
                            {rec.created_at ? new Date(rec.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                          </span>
                          {isAcompanhante && isMobileDevice && rec.sender_id === profile.id && (
                            confirmDeleteId === rec.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={deletingRecadoId === rec.id}
                                  onClick={() => handleDeleteRecado(rec.id)}
                                  className="px-2 py-1 text-[10px] font-black bg-rose-600 text-white rounded-lg hover:bg-rose-700 cursor-pointer"
                                >
                                  {deletingRecadoId === rec.id ? '...' : (isPt ? 'Confirmar' : 'Confirm')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2 py-1 text-[10px] font-bold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 cursor-pointer"
                                >
                                  {isPt ? 'Não' : 'No'}
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(rec.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title={isPt ? 'Excluir recado' : 'Delete message'}
                              >
                                <Trash2 size={14} />
                              </button>
                            )
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {rec.mensagem}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
