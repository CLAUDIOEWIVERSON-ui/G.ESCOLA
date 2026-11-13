'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
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
  BookMarked,
  Quote,
  Sparkles,
} from 'lucide-react';
import { useUser } from '@/lib/auth/UserContext';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { supabase } from '@/lib/supabase/client';
import { UserWorkspaceHeader } from '@/components/UserWorkspaceHeader';
import DashboardThoughtWidget from '@/components/DashboardThoughtWidget';
import { cn } from '@/lib/utils';

export function StudentWorkspace() {
  const { profile } = useUser();
  const { language } = useI18n();
  const isPt = language === 'pt';

  const [hasSubmittedSurvey, setHasSubmittedSurvey] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loadingExtras, setLoadingExtras] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadStudentStatus() {
      if (!profile?.student_id || !profile?.turma_id) {
        if (active) setLoadingExtras(false);
        return;
      }
      try {
        // Verifica se já respondeu ao questionário final
        const { data: evalRow } = await supabase
          .from('questionarios_conclusao')
          .select('id, created_at')
          .eq('aluno_id', profile.student_id)
          .eq('turma_id', profile.turma_id)
          .maybeSingle();

        if (active && evalRow) {
          setHasSubmittedSurvey(true);
        }

        // Busca avisos/eventos recentes para alunos
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { data: evtData } = await supabase
          .from('eventos')
          .select('id, titulo, descricao, data, cor, target_grupo, uniforme_dia')
          .is('exibir_aluno', true)
          .gte('data', today.toISOString())
          .order('data', { ascending: true })
          .limit(5);

        if (active && evtData) {
          const grp = (profile.turma_grupo || 'AMBOS').toUpperCase();
          const filtered = evtData.filter((e: any) => {
            const target = (e.target_grupo || 'AMBOS').toUpperCase();
            return target === 'AMBOS' || grp === 'AMBOS' || target === grp;
          });
          setAnnouncements(filtered);
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
  }, [profile?.student_id, profile?.turma_id, profile?.turma_grupo]);

  if (!profile) return null;

  const isSurveyReleased = profile.liberar_formularios === true;
  const todayStr = new Date().toISOString().split('T')[0];
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
      accent: 'from-cyan-500 to-blue-600',
      badgeBg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      badgeText: isPt ? 'Grade Atualizada' : 'Updated Schedule',
      cta: isPt ? 'Ver Horário Semanal' : 'View Weekly Schedule',
    },
    {
      title: isPt ? 'Boletim Individual' : 'Individual Report Card',
      description: isPt
        ? 'Acompanhe suas notas por disciplina, percentual de frequência, situação acadêmica e imprima seu histórico.'
        : 'Track your subject grades, attendance percentage, academic status, and print your transcript.',
      href: '/boletim',
      icon: FileText,
      accent: 'from-emerald-500 to-teal-600',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      badgeText: isPt ? 'Notas e Frequência' : 'Grades & Attendance',
      cta: isPt ? 'Abrir Meu Boletim' : 'Open Report Card',
    },
    {
      title: isPt ? 'Questionário de Final de Curso' : 'End-of-Course Questionnaire',
      description: isPt
        ? 'Avalie o curso, instrutores, infraestrutura e preencha sua autoavaliação ao concluir os módulos.'
        : 'Evaluate the course, instructors, infrastructure, and submit your self-assessment.',
      href: '/avaliacao',
      icon: FileCheck,
      accent: hasSubmittedSurvey
        ? 'from-emerald-600 to-green-700'
        : canFillSurvey
          ? 'from-amber-500 to-orange-600'
          : 'from-slate-500 to-slate-600',
      badgeBg: hasSubmittedSurvey
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : canFillSurvey
          ? 'bg-amber-50 text-amber-700 border-amber-200'
          : 'bg-slate-100 text-slate-600 border-slate-200',
      badgeText: hasSubmittedSurvey
        ? (isPt ? 'Enviado' : 'Submitted')
        : canFillSurvey
          ? (isPt ? 'Disponível para Preenchimento' : 'Available Now')
          : (isPt ? 'Aguardando Liberação' : 'Awaiting Release'),
      cta: hasSubmittedSurvey
        ? (isPt ? 'Ver Comprovante' : 'View Receipt')
        : (isPt ? 'Preencher Questionário' : 'Fill Questionnaire'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Cartão de Identificação do Aluno */}
      <UserWorkspaceHeader />

      {/* Faixa da Área de Trabalho do Aluno */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 text-white shadow-lg border border-slate-800 relative overflow-hidden"
      >
        <div className="absolute -right-10 -top-10 w-44 h-44 bg-blue-500/15 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-300 bg-blue-500/15 border border-blue-400/30 px-2.5 py-1 rounded-full">
              <GraduationCap size={13} />
              <span>{isPt ? 'Área de Trabalho do Aluno' : 'Student Workspace'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              {isPt ? 'Bem-vindo ao seu Portal Acadêmico' : 'Welcome to your Academic Portal'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              {profile.curso_nome || profile.turma_nome ? (
                <>
                  {isPt ? 'Você está conectado à turma ' : 'You are signed in to class '}
                  <strong className="text-white">{profile.turma_nome || '—'}</strong>
                  {profile.curso_nome ? (
                    <>
                      {' '}• <span className="text-blue-200">{profile.curso_nome}</span>
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
            <div className="shrink-0 bg-white/10 border border-white/15 rounded-xl px-4 py-2.5 text-left md:text-right">
              <span className="block text-[9px] font-bold uppercase tracking-widest text-blue-200">
                {isPt ? 'Código Individual QR' : 'Individual QR Code'}
              </span>
              <span className="font-mono text-sm font-black tracking-wider text-white">
                {profile.access_code}
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Os 3 Módulos Principais do Aluno */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {primaryModules.map((mod, idx) => {
          const Icon = mod.icon;
          return (
            <motion.div
              key={mod.href}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-5"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className={cn('w-12 h-12 rounded-2xl bg-gradient-to-br text-white flex items-center justify-center shadow-sm shrink-0', mod.accent)}>
                    <Icon size={22} />
                  </div>
                  <span className={cn('text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border inline-flex items-center gap-1', mod.badgeBg)}>
                    {mod.href === '/avaliacao' && hasSubmittedSurvey && <CheckCircle2 size={11} />}
                    {mod.href === '/avaliacao' && !hasSubmittedSurvey && !canFillSurvey && <Lock size={11} />}
                    {mod.href === '/avaliacao' && !hasSubmittedSurvey && canFillSurvey && <Sparkles size={11} />}
                    {mod.badgeText}
                  </span>
                </div>

                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    {mod.title}
                  </h2>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    {mod.description}
                  </p>
                </div>
              </div>

              <Link
                href={mod.href}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] group"
              >
                <span>{mod.cta}</span>
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Pensamento do Dia */}
      <DashboardThoughtWidget />

      {/* Avisos da Coordenação / Próximos Eventos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-blue-600" />
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                {isPt ? 'Avisos e Agenda para o Aluno' : 'Student Notices & Schedule'}
              </h3>
            </div>
            <Link href="/calendario" className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
              <span>{isPt ? 'Ver Calendário' : 'View Calendar'}</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          {loadingExtras ? (
            <div className="py-6 text-center text-xs text-slate-400">
              {isPt ? 'Carregando avisos da turma...' : 'Loading class notices...'}
            </div>
          ) : announcements.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-100">
              {isPt ? 'Nenhum aviso ou evento futuro publicado no momento.' : 'No upcoming notices or events published right now.'}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {announcements.map((evt) => (
                <div key={evt.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-900">{evt.titulo}</p>
                    {evt.descricao && <p className="text-[11px] text-slate-500 line-clamp-2">{evt.descricao}</p>}
                    {evt.uniforme_dia && (
                      <span className="inline-block text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 mt-1">
                        {isPt ? 'Uniforme:' : 'Uniform:'} {evt.uniforme_dia}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono font-bold text-slate-500 shrink-0 flex items-center gap-1">
                    <Clock size={12} />
                    {evt.data ? new Date(evt.data).toLocaleDateString('pt-BR') : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Acessos Complementares */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
            {isPt ? 'Outros Recursos' : 'Additional Resources'}
          </h3>
          <div className="space-y-2">
            <Link
              href="/calendario"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200/80 transition-colors group"
            >
              <span className="flex items-center gap-2.5 text-xs font-bold text-slate-700 group-hover:text-blue-700">
                <CalendarDays size={15} className="text-blue-600" />
                {isPt ? 'Calendário de Eventos' : 'Events Calendar'}
              </span>
              <ArrowRight size={13} className="text-slate-400 group-hover:text-blue-600" />
            </Link>
            <Link
              href="/pensamento-do-dia"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-purple-50 border border-slate-200/80 transition-colors group"
            >
              <span className="flex items-center gap-2.5 text-xs font-bold text-slate-700 group-hover:text-purple-700">
                <Quote size={15} className="text-purple-600" />
                {isPt ? 'Pensamento do Dia' : 'Thought of the Day'}
              </span>
              <ArrowRight size={13} className="text-slate-400 group-hover:text-purple-600" />
            </Link>
            <Link
              href="/manual"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-amber-50 border border-slate-200/80 transition-colors group"
            >
              <span className="flex items-center gap-2.5 text-xs font-bold text-slate-700 group-hover:text-amber-700">
                <BookMarked size={15} className="text-amber-600" />
                {isPt ? 'Manual do Usuário' : 'User Manual'}
              </span>
              <ArrowRight size={13} className="text-slate-400 group-hover:text-amber-600" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
