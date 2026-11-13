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
    <div className="space-y-6 bg-white text-black">
      {/* Cartão de Identificação do Aluno */}
      <UserWorkspaceHeader />

      {/* Faixa da Área de Trabalho do Aluno */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 text-black shadow-sm border border-slate-300 relative overflow-hidden"
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-black bg-white border border-slate-300 px-2.5 py-1 rounded-full">
              <GraduationCap size={13} className="text-black" />
              <span>{isPt ? 'Área de Trabalho do Aluno' : 'Student Workspace'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-black">
              {isPt ? 'Bem-vindo ao seu Portal Acadêmico' : 'Welcome to your Academic Portal'}
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
              className="bg-white border border-slate-300 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-5 text-black"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white border-2 border-black text-black flex items-center justify-center shadow-sm shrink-0">
                    <Icon size={22} className="text-black" />
                  </div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border border-slate-300 bg-white text-black inline-flex items-center gap-1">
                    {mod.href === '/avaliacao' && hasSubmittedSurvey && <CheckCircle2 size={11} className="text-black" />}
                    {mod.href === '/avaliacao' && !hasSubmittedSurvey && !canFillSurvey && <Lock size={11} className="text-black" />}
                    {mod.href === '/avaliacao' && !hasSubmittedSurvey && canFillSurvey && <Sparkles size={11} className="text-black" />}
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
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-black border-2 border-black font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] group"
              >
                <span>{mod.cta}</span>
                <ArrowRight size={14} className="text-black transition-transform group-hover:translate-x-1" />
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
            <Link href="/calendario" className="text-xs font-bold text-black hover:underline flex items-center gap-1">
              <span>{isPt ? 'Ver Calendário' : 'View Calendar'}</span>
              <ArrowRight size={12} className="text-black" />
            </Link>
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
                <div key={evt.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-black">{evt.titulo}</p>
                    {evt.descricao && <p className="text-[11px] text-black line-clamp-2">{evt.descricao}</p>}
                    {evt.uniforme_dia && (
                      <span className="inline-block text-[10px] font-bold text-black bg-white px-2 py-0.5 rounded border border-slate-300 mt-1">
                        {isPt ? 'Uniforme:' : 'Uniform:'} {evt.uniforme_dia}
                      </span>
                    )}
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
              className="flex items-center justify-between p-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 transition-colors group"
            >
              <span className="flex items-center gap-2.5 text-xs font-bold text-black">
                <CalendarDays size={15} className="text-black" />
                {isPt ? 'Calendário de Eventos' : 'Events Calendar'}
              </span>
              <ArrowRight size={13} className="text-black" />
            </Link>
            <Link
              href="/pensamento-do-dia"
              className="flex items-center justify-between p-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 transition-colors group"
            >
              <span className="flex items-center gap-2.5 text-xs font-bold text-black">
                <Quote size={15} className="text-black" />
                {isPt ? 'Pensamento do Dia' : 'Thought of the Day'}
              </span>
              <ArrowRight size={13} className="text-black" />
            </Link>
            <Link
              href="/manual"
              className="flex items-center justify-between p-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 transition-colors group"
            >
              <span className="flex items-center gap-2.5 text-xs font-bold text-black">
                <BookMarked size={15} className="text-black" />
                {isPt ? 'Manual do Usuário' : 'User Manual'}
              </span>
              <ArrowRight size={13} className="text-black" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
