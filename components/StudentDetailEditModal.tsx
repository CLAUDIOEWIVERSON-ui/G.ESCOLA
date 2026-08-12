'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Modal from './Modal';
import Image from 'next/image';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { 
  Camera, 
  CheckCircle, 
  AlertTriangle, 
  Calendar, 
  User, 
  Mail, 
  Phone, 
  Award, 
  FileText, 
  Layers,
  Copy,
  Check,
  Percent,
  Clock,
  Printer,
  GraduationCap,
  MapPin,
  School,
  Globe
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import maleAvatar from '@/src/assets/images/avatar_male_1778977230783.png';
import femaleAvatar from '@/src/assets/images/avatar_female_1778977246051.png';
import militaryMaleAvatar from '@/src/assets/images/avatar_military_male_1779964887322.png';
import militaryFemaleAvatar from '@/src/assets/images/avatar_military_female_1779964903107.png';
import navalMissionLogo from '@/src/assets/images/regenerated_image_1782409801823.png';
import { format } from 'date-fns';

interface StudentDetailEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  aluno: any | null;
  turmaId?: string;
  onSave?: () => Promise<void> | void;
}

export default function StudentDetailEditModal({
  isOpen,
  onClose,
  aluno,
  turmaId,
  onSave
}: StudentDetailEditModalProps) {
  const { language } = useI18n();
  const [currentAluno, setCurrentAluno] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [attendanceStats, setAttendanceStats] = useState<{
    presentes: number;
    faltas: number;
    total: number;
    percentPresenca: number;
    percentFalta: number;
  }>({
    presentes: 0,
    faltas: 0,
    total: 0,
    percentPresenca: 0,
    percentFalta: 0
  });
  const [studentAccess, setStudentAccess] = useState<any>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [turmaInfo, setTurmaInfo] = useState<any>(null);
  const [allTurmas, setAllTurmas] = useState<any[]>([]);
  const [allCursos, setAllCursos] = useState<any[]>([]);
  const [selectedCursoId, setSelectedCursoId] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadAllTurmasAndCursos = async () => {
    try {
      const [cursosRes, turmasRes] = await Promise.all([
        supabase
          .from('cursos')
          .select('id, nome, categoria, grupo_responsavel')
          .is('deleted_at', null)
          .order('nome'),
        supabase
          .from('turmas')
          .select('id, nome, codigo, curso_id, internacional, localizacao, curso:cursos(id, nome, categoria)')
          .is('deleted_at', null)
          .order('nome')
      ]);

      if (cursosRes.data) setAllCursos(cursosRes.data);
      if (turmasRes.data) setAllTurmas(turmasRes.data);
    } catch (err) {
      console.error('Error loading turmas & cursos:', err);
    }
  };

  useEffect(() => {
    // Check admin role
    const checkRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        setIsAdmin(profile?.role === 'admin' || profile?.role === 'superadmin' || session.user.user_metadata?.role === 'admin');
      }
    };
    checkRole();
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadAllTurmasAndCursos();
      if (aluno) {
        setCurrentAluno({ ...aluno });
        loadAttendance(aluno.id);
        loadStudentAccess(aluno.id);
        loadTurmaInfo(aluno.turma_id || turmaId);
      } else {
        setCurrentAluno({
          tipo_aluno: 'militar',
          genero: 'masculino',
          status: 'Ativo',
          turma_id: turmaId || null
        });
        setAttendanceStats({
          presentes: 0,
          faltas: 0,
          total: 0,
          percentPresenca: 0,
          percentFalta: 0
        });
        setStudentAccess(null);
        setSelectedCursoId('');
        loadTurmaInfo(turmaId);
      }
    }
  }, [isOpen, aluno]);

  const loadTurmaInfo = async (tId?: string) => {
    if (!tId) {
      setTurmaInfo(null);
      return;
    }
    try {
      const { data } = await supabase
        .from('turmas')
        .select('id, nome, codigo, internacional, localizacao, curso_id, curso:cursos(id, nome, categoria)')
        .eq('id', tId)
        .maybeSingle();
      if (data) {
        setTurmaInfo(data);
        if (data.curso_id || data.curso?.id) {
          setSelectedCursoId(data.curso_id || data.curso?.id);
        }
      } else {
        setTurmaInfo(null);
      }
    } catch (err) {
      console.error('Error loading turma info:', err);
    }
  };

  const loadAttendance = async (studentId?: string) => {
    if (!studentId) return;
    setLoadingAttendance(true);
    try {
      const currentYear = new Date().getFullYear();
      const startDate = `${currentYear}-01-01`;
      const endDate = `${currentYear}-12-31`;

      const { data, error } = await supabase
        .from('frequencia')
        .select('id, data, presente, observacao')
        .eq('aluno_id', studentId)
        .gte('data', startDate)
        .lte('data', endDate);

      if (error) throw error;

      const records = data || [];
      const total = records.length;
      const presentes = records.filter((r: any) => r.presente).length;
      const faltas = records.filter((r: any) => !r.presente).length;

      const percentPresenca = total > 0 ? Math.round((presentes / total) * 100) : 0;
      const percentFalta = total > 0 ? (100 - percentPresenca) : 0;

      setAttendanceStats({
        presentes,
        faltas,
        total,
        percentPresenca,
        percentFalta
      });
    } catch (err) {
      console.error('Error loading student attendance:', err);
    } finally {
      setLoadingAttendance(false);
    }
  };

  const loadStudentAccess = async (studentId?: string) => {
    if (!studentId) return;
    try {
      const { data } = await supabase
        .from('student_access_codes')
        .select('*')
        .eq('student_id', studentId)
        .maybeSingle();
      if (data) {
        setStudentAccess(data);
      } else {
        setStudentAccess(null);
      }
    } catch (err) {
      console.error('Error loading student access code:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSaving(true);
    try {
      const fileExt = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}.${fileExt}`;
      const filePath = `alunos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('alunos-fotos')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('alunos-fotos')
        .getPublicUrl(filePath);

      if (publicUrlData?.publicUrl) {
        setCurrentAluno((prev: any) => ({ ...prev, foto_url: publicUrlData.publicUrl }));
        toast.success(language === 'pt' ? 'Foto carregada com sucesso!' : 'Photo uploaded successfully!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao fazer upload da foto.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (!currentAluno.nome || currentAluno.nome.trim().length < 2) {
        throw new Error(language === 'pt' ? 'Nome é obrigatório (mínimo 2 caracteres)' : 'Name is required (min 2 characters)');
      }

      let matricula = currentAluno.matricula;
      if (!matricula || matricula.length < 2) {
        matricula = `MAT${new Date().getFullYear()}${Math.floor(100000 + Math.random() * 899999)}`;
      }

      const dataToSave: any = {
        nome: currentAluno.nome.trim(),
        matricula: matricula,
        turma_id: currentAluno.turma_id || turmaId || null,
      };

      dataToSave.email = (currentAluno.email && currentAluno.email.includes('@')) ? currentAluno.email.trim() : null;
      dataToSave.tipo_aluno = currentAluno.tipo_aluno || 'militar';
      if (currentAluno.posto_graduacao !== undefined) dataToSave.posto_graduacao = currentAluno.posto_graduacao;
      if (currentAluno.nome_guerra !== undefined) dataToSave.nome_guerra = currentAluno.nome_guerra;
      if (currentAluno.rg) dataToSave.rg = currentAluno.rg;
      if (currentAluno.titulo_eleitor) dataToSave.titulo_eleitor = currentAluno.titulo_eleitor;
      if (currentAluno.nome_pai) dataToSave.nome_pai = currentAluno.nome_pai;
      if (currentAluno.nome_mae) dataToSave.nome_mae = currentAluno.nome_mae;
      if (currentAluno.om) dataToSave.om = currentAluno.om;
      if (currentAluno.genero) dataToSave.genero = currentAluno.genero;
      if (currentAluno.telefone) dataToSave.telefone = currentAluno.telefone;
      if (currentAluno.whatsapp) dataToSave.whatsapp = currentAluno.whatsapp;
      if (currentAluno.endereco !== undefined) {
        dataToSave.endereco = currentAluno.endereco ? currentAluno.endereco.trim() : null;
      }
      if (currentAluno.foto_url) dataToSave.foto_url = currentAluno.foto_url;
      if (currentAluno.status) dataToSave.status = currentAluno.status;
      if (currentAluno.tipo_sanguineo) dataToSave.tipo_sanguineo = currentAluno.tipo_sanguineo;
      if (currentAluno.fator_rh) dataToSave.fator_rh = currentAluno.fator_rh;
      if (currentAluno.altura) dataToSave.altura = currentAluno.altura;
      if (currentAluno.peso) dataToSave.peso = currentAluno.peso;
      if (currentAluno.estado_civil) dataToSave.estado_civil = currentAluno.estado_civil;

      if (currentAluno.data_nascimento !== undefined) {
        dataToSave.data_nascimento = currentAluno.data_nascimento ? currentAluno.data_nascimento : null;
      }
      if (currentAluno.funcao !== undefined) {
        dataToSave.funcao = currentAluno.funcao ? currentAluno.funcao : null;
      }
      if (currentAluno.observacoes !== undefined) {
        dataToSave.observacoes = currentAluno.observacoes ? currentAluno.observacoes : null;
      }

      const parsedAno = currentAluno.ano_admissao ? parseInt(currentAluno.ano_admissao.toString()) : NaN;
      if (!isNaN(parsedAno)) dataToSave.ano_admissao = parsedAno;

      let saveError;
      if (currentAluno.id) {
        const { error } = await supabase
          .from('alunos')
          .update(dataToSave)
          .eq('id', currentAluno.id);
        saveError = error;
      } else {
        const { error } = await supabase
          .from('alunos')
          .insert([dataToSave]);
        saveError = error;
      }

      if (saveError) throw saveError;

      toast.success(language === 'pt' ? 'Aluno salvo com sucesso!' : 'Student saved successfully!');
      if (onSave) {
        await onSave();
      }
      onClose();
    } catch (err: any) {
      console.error('Error saving student:', err);
      toast.error(err.message || 'Erro ao salvar aluno.');
    } finally {
      setSaving(false);
    }
  };

  const getAvatarImage = () => {
    if (currentAluno?.tipo_aluno === 'civil') {
      return currentAluno?.genero === 'feminino' ? femaleAvatar : maleAvatar;
    }
    return currentAluno?.genero === 'feminino' ? militaryFemaleAvatar : militaryMaleAvatar;
  };

  const handlePrint = () => {
    document.body.classList.add('printing-student-ficha');
    requestAnimationFrame(() => {
      setTimeout(() => {
        window.print();
        setTimeout(() => {
          document.body.classList.remove('printing-student-ficha');
        }, 1500);
      }, 50);
    });
  };

  const pieData = attendanceStats.total > 0 ? [
    {
      name: language === 'pt' ? 'Presenças' : 'Present',
      value: attendanceStats.presentes,
      percent: attendanceStats.percentPresenca,
      color: '#10b981'
    },
    {
      name: language === 'pt' ? 'Faltas' : 'Absent',
      value: attendanceStats.faltas,
      percent: attendanceStats.percentFalta,
      color: '#f43f5e'
    }
  ].filter(item => item.value > 0) : [
    {
      name: language === 'pt' ? 'Sem dados' : 'No records',
      value: 1,
      percent: 0,
      color: '#e2e8f0'
    }
  ];

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={currentAluno?.id ? (language === 'pt' ? 'Detalhes e Edição do Aluno' : 'Student Details & Edit') : (language === 'pt' ? 'Adicionar Novo Aluno' : 'Add New Student')}
        className="max-w-lg lg:max-w-6xl xl:max-w-[1150px] lg:w-[94vw] lg:h-[94vh] lg:max-h-[960px] transition-all duration-200"
      >
        <form onSubmit={handleSaveStudent} className="space-y-5 max-h-[82vh] lg:max-h-none overflow-y-auto px-1 print:hidden">
          {/* BANNER INSTITUCIONAL OFICIAL (Exibido em modo PC para espelhar a Ficha Individual de Impressão) */}
          <div className="hidden lg:flex items-center justify-between p-3.5 bg-slate-900 text-white rounded-xl shadow-sm border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 shrink-0 bg-white/10 rounded-lg p-1 flex items-center justify-center">
                <img
                  src={typeof navalMissionLogo === 'string' ? navalMissionLogo : (navalMissionLogo as any)?.src || navalMissionLogo}
                  alt="Brasão"
                  className="w-8 h-8 object-contain"
                />
              </div>
              <div>
                <span className="text-[9px] font-black tracking-widest text-blue-300 uppercase block leading-none">
                  SISTEMA ESCOLAR E ACADÊMICO • FICHA INDIVIDUAL DO ALUNO
                </span>
                <h2 className="text-sm font-extrabold uppercase tracking-wide text-white mt-1">
                  {currentAluno?.nome ? `FICHA OFICIAL: ${currentAluno.nome}` : 'FICHA DE CADASTRO DO ALUNO'}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right font-mono text-xs text-slate-300 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                MATRÍCULA: <span className="font-extrabold text-blue-400">{currentAluno?.matricula || 'N/A'}</span>
              </div>
              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Printer size={14} />
                <span>{language === 'pt' ? 'Imprimir Ficha A4' : 'Print A4 Sheet'}</span>
              </button>
            </div>
          </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: Photo, Summary & Attendance Donut Chart */}
          <div className="lg:col-span-5 space-y-4">
            {/* Student Photo and Avatar Header */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center text-center shadow-sm">
              <div className="relative group cursor-pointer w-32 h-40 bg-white rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-all overflow-hidden p-2 shadow-inner mb-3">
                {currentAluno?.foto_url ? (
                  <Image
                    src={currentAluno.foto_url}
                    alt={currentAluno.nome || 'Aluno'}
                    fill
                    className="object-cover"
                    sizes="128px"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <>
                    <Image
                      src={getAvatarImage()}
                      alt="Avatar"
                      fill
                      className="object-cover opacity-20 group-hover:opacity-30 transition-opacity"
                      sizes="128px"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors pointer-events-none">
                      <Camera size={22} strokeWidth={1.5} />
                      <span className="text-[9px] font-bold uppercase mt-1">
                        {language === 'pt' ? 'Foto 3x4' : 'Photo 3x4'}
                      </span>
                    </div>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  title="Alterar foto do aluno"
                />
              </div>

              <h3 className="text-base font-bold text-slate-800 line-clamp-1">
                {currentAluno?.nome || (language === 'pt' ? 'Novo Aluno' : 'New Student')}
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {currentAluno?.matricula || 'MAT---'}
              </p>

              <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                  currentAluno?.tipo_aluno === 'civil' 
                    ? "bg-slate-200 text-slate-700" 
                    : "bg-blue-100 text-blue-700"
                )}>
                  {currentAluno?.tipo_aluno || 'militar'}
                </span>
                {currentAluno?.status && (
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    currentAluno.status === 'Ativo' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  )}>
                    {currentAluno.status}
                  </span>
                )}
              </div>
            </div>

            {/* Attendance Donut Chart (Gráfico de Rosca) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-blue-600" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {language === 'pt' ? 'Frequência do Período Letivo' : 'Current Term Attendance'}
                  </span>
                </div>
                {loadingAttendance ? (
                  <span className="text-[10px] text-slate-400 font-mono animate-pulse">
                    {language === 'pt' ? 'Carregando...' : 'Loading...'}
                  </span>
                ) : (
                  <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    {attendanceStats.total} {language === 'pt' ? 'aulas' : 'classes'}
                  </span>
                )}
              </div>

              <div className="h-48 w-full flex items-center justify-center relative my-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={attendanceStats.total > 0 ? 5 : 0}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    {attendanceStats.total > 0 && (
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          color: '#0f172a'
                        }}
                        formatter={(value: any, name: any) => [
                          `${value} dia(s) (${name === (language === 'pt' ? 'Presenças' : 'Present') ? attendanceStats.percentPresenca : attendanceStats.percentFalta}%)`,
                          name
                        ]}
                      />
                    )}
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    {language === 'pt' ? 'Presença' : 'Attendance'}
                  </span>
                  <span className={cn(
                    "text-xl font-black font-mono",
                    attendanceStats.total === 0
                      ? "text-slate-400"
                      : attendanceStats.percentPresenca >= 75
                      ? "text-emerald-600"
                      : "text-rose-600"
                  )}>
                    {attendanceStats.total > 0 ? `${attendanceStats.percentPresenca}%` : '--'}
                  </span>
                </div>
              </div>

              {/* Attendance Legend and Summary */}
              {attendanceStats.total > 0 ? (
                <div className="space-y-2 pt-1 border-t border-slate-100 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                      <span className="text-slate-600 font-medium">
                        {language === 'pt' ? 'Presenças registradas' : 'Present days'}
                      </span>
                    </div>
                    <span className="font-bold font-mono text-emerald-600">
                      {attendanceStats.presentes} ({attendanceStats.percentPresenca}%)
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                      <span className="text-slate-600 font-medium">
                        {language === 'pt' ? 'Faltas registradas' : 'Absent days'}
                      </span>
                    </div>
                    <span className="font-bold font-mono text-rose-600">
                      {attendanceStats.faltas} ({attendanceStats.percentFalta}%)
                    </span>
                  </div>

                  <div className="pt-2">
                    {attendanceStats.percentPresenca >= 75 ? (
                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-2 flex items-center gap-2">
                        <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                        <span className="text-[11px] font-bold leading-tight">
                          {language === 'pt' 
                            ? 'Frequência regular (mínimo exigido de 75% atingido)' 
                            : 'Good attendance (meets 75% requirement)'}
                        </span>
                      </div>
                    ) : (
                      <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-2 flex items-center gap-2">
                        <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                        <span className="text-[11px] font-bold leading-tight">
                          {language === 'pt'
                            ? 'Atenção: Abaixo do mínimo exigido de 75% de presença'
                            : 'Warning: Below 75% required attendance'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-2 text-xs text-slate-400 italic">
                  {language === 'pt' ? 'Nenhum registro de frequência lançado para este aluno no período.' : 'No attendance records logged for this student yet.'}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Edit Student Form */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2.5 flex items-center gap-2">
                <User size={15} className="text-blue-600" />
                {language === 'pt' ? 'Dados Cadastrais' : 'Personal Details'}
              </h4>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    {language === 'pt' ? 'Nome Completo' : 'Full Name'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={currentAluno?.nome || ''}
                    onChange={(e) => setCurrentAluno({ ...currentAluno, nome: e.target.value })}
                    placeholder={language === 'pt' ? 'Nome completo do aluno' : 'Student full name'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {language === 'pt' ? 'Posto / Graduação' : 'Rank / Grade'}
                    </label>
                    <input
                      type="text"
                      value={currentAluno?.posto_graduacao || ''}
                      onChange={(e) => setCurrentAluno({ ...currentAluno, posto_graduacao: e.target.value })}
                      placeholder={language === 'pt' ? 'Ex: 1º Ten, Sgt' : 'Rank'}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {language === 'pt' ? 'Nome de Guerra' : 'War Name'}
                    </label>
                    <input
                      type="text"
                      value={currentAluno?.nome_guerra || ''}
                      onChange={(e) => setCurrentAluno({ ...currentAluno, nome_guerra: e.target.value })}
                      placeholder={language === 'pt' ? 'Ex: Silva, Santos' : 'War Name'}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {language === 'pt' ? 'Militar / Civil' : 'Military / Civil'}
                    </label>
                    <select
                      value={currentAluno?.tipo_aluno || 'militar'}
                      onChange={(e) => setCurrentAluno({ ...currentAluno, tipo_aluno: e.target.value })}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                    >
                      <option value="militar">{language === 'pt' ? 'Militar' : 'Military'}</option>
                      <option value="civil">{language === 'pt' ? 'Civil' : 'Civilian'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {language === 'pt' ? 'Gênero' : 'Gender'}
                    </label>
                    <select
                      value={currentAluno?.genero || 'masculino'}
                      onChange={(e) => setCurrentAluno({ ...currentAluno, genero: e.target.value })}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                    >
                      <option value="masculino">{language === 'pt' ? 'Masculino' : 'Male'}</option>
                      <option value="feminino">{language === 'pt' ? 'Feminino' : 'Female'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {language === 'pt' ? 'Status' : 'Status'}
                    </label>
                    <select
                      value={currentAluno?.status || 'Ativo'}
                      onChange={(e) => setCurrentAluno({ ...currentAluno, status: e.target.value })}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                    >
                      <option value="Ativo">{language === 'pt' ? 'Ativo' : 'Active'}</option>
                      <option value="Inativo">{language === 'pt' ? 'Inativo' : 'Inactive'}</option>
                      <option value="Concluído">{language === 'pt' ? 'Concluído' : 'Completed'}</option>
                      <option value="Desistente">{language === 'pt' ? 'Desistente' : 'Dropped Out'}</option>
                      <option value="Transferido">{language === 'pt' ? 'Transferido' : 'Transferred'}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {language === 'pt' ? 'E-mail do Aluno' : 'Email Address'}
                    </label>
                    <input
                      type="email"
                      value={currentAluno?.email || ''}
                      onChange={(e) => setCurrentAluno({ ...currentAluno, email: e.target.value })}
                      placeholder="aluno@exemplo.com"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {language === 'pt' ? 'Matrícula / NIP' : 'Registration ID'}
                    </label>
                    <input
                      type="text"
                      value={currentAluno?.matricula || ''}
                      onChange={(e) => setCurrentAluno({ ...currentAluno, matricula: e.target.value })}
                      placeholder="Ex: MAT2026..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {language === 'pt' ? 'Telefone' : 'Phone'}
                    </label>
                    <input
                      type="text"
                      value={currentAluno?.telefone || ''}
                      onChange={(e) => setCurrentAluno({ ...currentAluno, telefone: e.target.value })}
                      placeholder="+55 (11) 90000-0000"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {language === 'pt' ? 'WhatsApp' : 'WhatsApp'}
                    </label>
                    <input
                      type="text"
                      value={currentAluno?.whatsapp || ''}
                      onChange={(e) => setCurrentAluno({ ...currentAluno, whatsapp: e.target.value })}
                      placeholder="+55 (11) 90000-0000"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Campo de Endereço do Aluno */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    {language === 'pt' ? 'Endereço Residencial Completo' : 'Full Residential Address'}
                  </label>
                  <input
                    type="text"
                    value={currentAluno?.endereco || ''}
                    onChange={(e) => setCurrentAluno({ ...currentAluno, endereco: e.target.value })}
                    placeholder={language === 'pt' ? 'Rua, nº, complemento, bairro, cidade - UF, CEP' : 'Street address, Apt/Suite, City, State, Zip'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                  />
                </div>

                {/* Seleção de Curso e Turma do Aluno */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <GraduationCap className="text-blue-600" size={16} />
                      <span>{language === 'pt' ? 'Curso & Turma de Matrícula' : 'Enrolled Course & Class'}</span>
                    </label>
                    {turmaInfo?.internacional && (
                      <span className="text-[9px] bg-blue-600 text-white font-black px-2 py-0.5 rounded uppercase tracking-wider">
                        🌐 {language === 'pt' ? 'Inscrição no Exterior' : 'International'}
                      </span>
                    )}
                  </div>

                  {/* 1. SELEÇÃO DIRETA DO CURSO */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      {language === 'pt' ? 'Curso ao qual está Matriculado' : 'Enrolled Course'} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedCursoId || ''}
                      onChange={(e) => {
                        const cId = e.target.value;
                        setSelectedCursoId(cId);
                        // Filter turmas for this chosen course
                        const matchingTurmas = allTurmas.filter((t: any) => t.curso_id === cId || t.curso?.id === cId);
                        if (matchingTurmas.length === 1) {
                          const tId = matchingTurmas[0].id;
                          setCurrentAluno((prev: any) => ({ ...prev, turma_id: tId }));
                          loadTurmaInfo(tId);
                        } else if (matchingTurmas.length > 1) {
                          const currentMatches = matchingTurmas.some((t: any) => t.id === currentAluno?.turma_id);
                          if (!currentMatches) {
                            const tId = matchingTurmas[0].id;
                            setCurrentAluno((prev: any) => ({ ...prev, turma_id: tId }));
                            loadTurmaInfo(tId);
                          }
                        } else {
                          // No turmas for this course or unselected
                          if (!cId) {
                            setCurrentAluno((prev: any) => ({ ...prev, turma_id: null }));
                            setTurmaInfo(null);
                          }
                        }
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 font-semibold text-slate-800 shadow-2xs"
                    >
                      <option value="">{language === 'pt' ? '-- Selecione o Curso --' : '-- Select Course --'}</option>
                      {allCursos.map((curso: any) => (
                        <option key={curso.id} value={curso.id}>
                          {curso.nome} {curso.categoria ? `(${curso.categoria})` : ''} {curso.grupo_responsavel ? `• [${curso.grupo_responsavel}]` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 2. SELEÇÃO DA TURMA */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      {language === 'pt' ? 'Turma da Matrícula' : 'Enrolled Class'}
                    </label>
                    <select
                      value={currentAluno?.turma_id || turmaId || ''}
                      onChange={(e) => {
                        const selectedTId = e.target.value;
                        setCurrentAluno((prev: any) => ({ ...prev, turma_id: selectedTId }));
                        if (selectedTId) {
                          const tObj = allTurmas.find((t: any) => t.id === selectedTId);
                          if (tObj && (tObj.curso_id || tObj.curso?.id)) {
                            setSelectedCursoId(tObj.curso_id || tObj.curso?.id);
                          }
                        }
                        loadTurmaInfo(selectedTId);
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 font-medium text-slate-800 shadow-2xs"
                    >
                      <option value="">{language === 'pt' ? '-- Selecione a Turma --' : '-- Select Class --'}</option>
                      {(selectedCursoId 
                        ? allTurmas.filter((t: any) => t.curso_id === selectedCursoId || t.curso?.id === selectedCursoId)
                        : allTurmas
                      ).map((t: any) => {
                        const cursoNome = t.curso?.nome || '';
                        return (
                          <option key={t.id} value={t.id}>
                            {t.nome} {t.codigo ? `(${t.codigo})` : ''} {!selectedCursoId && cursoNome ? `• Curso: ${cursoNome}` : ''} {t.internacional ? '🌐 [EXTERIOR]' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {(turmaInfo?.internacional || turmaInfo?.curso?.nome || selectedCursoId) && (
                    <div className="p-2.5 bg-blue-50/90 border border-blue-200 rounded-lg flex items-center justify-between text-xs text-blue-900 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="text-blue-600 shrink-0" size={18} />
                        <div>
                          <span className="font-bold text-slate-500 block text-[9px] uppercase tracking-wider">
                            {language === 'pt' ? 'Curso ao qual está inscrito:' : 'Enrolled Course:'}
                          </span>
                          <span className="font-black text-blue-900 text-xs">
                            {turmaInfo?.curso?.nome || allCursos.find(c => c.id === selectedCursoId)?.nome || (language === 'pt' ? 'Curso Geral' : 'General Course')}
                          </span>
                        </div>
                      </div>
                      {turmaInfo?.internacional && (
                        <span className="text-[10px] font-extrabold text-blue-800 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded uppercase">
                          {language === 'pt' ? 'Aluno no Exterior' : 'Abroad Student'}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {language === 'pt' ? 'Data de Nascimento' : 'Date of Birth'}
                    </label>
                    <input
                      type="date"
                      value={currentAluno?.data_nascimento || ''}
                      onChange={(e) => setCurrentAluno({ ...currentAluno, data_nascimento: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                    />
                  </div>


                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {language === 'pt' ? 'RG' : 'ID Document (RG)'}
                    </label>
                    <input
                      type="text"
                      value={currentAluno?.rg || ''}
                      onChange={(e) => setCurrentAluno({ ...currentAluno, rg: e.target.value })}
                      placeholder="RG"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {language === 'pt' ? 'Organização Militar (OM)' : 'Military Organization'}
                    </label>
                    <input
                      type="text"
                      value={currentAluno?.om || ''}
                      onChange={(e) => setCurrentAluno({ ...currentAluno, om: e.target.value })}
                      placeholder="OM"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {language === 'pt' ? 'Título de Eleitor' : 'Voter Title'}
                    </label>
                    <input
                      type="text"
                      value={currentAluno?.titulo_eleitor || ''}
                      onChange={(e) => setCurrentAluno({ ...currentAluno, titulo_eleitor: e.target.value })}
                      placeholder="Título de Eleitor"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {language === 'pt' ? 'Ano de Admissão' : 'Admission Year'}
                    </label>
                    <input
                      type="number"
                      value={currentAluno?.ano_admissao || ''}
                      onChange={(e) => setCurrentAluno({ ...currentAluno, ano_admissao: e.target.value })}
                      placeholder="Ex: 2024"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {language === 'pt' ? 'Nome do Pai' : 'Father Name'}
                    </label>
                    <input
                      type="text"
                      value={currentAluno?.nome_pai || ''}
                      onChange={(e) => setCurrentAluno({ ...currentAluno, nome_pai: e.target.value })}
                      placeholder="Nome do Pai"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {language === 'pt' ? 'Nome da Mãe' : 'Mother Name'}
                    </label>
                    <input
                      type="text"
                      value={currentAluno?.nome_mae || ''}
                      onChange={(e) => setCurrentAluno({ ...currentAluno, nome_mae: e.target.value })}
                      placeholder="Nome da Mãe"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {language === 'pt' ? 'Tipo Sanguíneo' : 'Blood Type'}
                    </label>
                    <select
                      value={currentAluno?.tipo_sanguineo || ''}
                      onChange={(e) => setCurrentAluno({ ...currentAluno, tipo_sanguineo: e.target.value })}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                    >
                      <option value="">{language === 'pt' ? 'Selecione' : 'Select'}</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="AB">AB</option>
                      <option value="O">O</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {language === 'pt' ? 'Fator RH' : 'RH Factor'}
                    </label>
                    <select
                      value={currentAluno?.fator_rh || ''}
                      onChange={(e) => setCurrentAluno({ ...currentAluno, fator_rh: e.target.value })}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                    >
                      <option value="">{language === 'pt' ? 'Selecione' : 'Select'}</option>
                      <option value="+">Positivo (+)</option>
                      <option value="-">Negativo (-)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {language === 'pt' ? 'Estado Civil' : 'Marital Status'}
                    </label>
                    <select
                      value={currentAluno?.estado_civil || ''}
                      onChange={(e) => setCurrentAluno({ ...currentAluno, estado_civil: e.target.value })}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                    >
                      <option value="">{language === 'pt' ? 'Selecione' : 'Select'}</option>
                      <option value="Solteiro(a)">{language === 'pt' ? 'Solteiro(a)' : 'Single'}</option>
                      <option value="Casado(a)">{language === 'pt' ? 'Casado(a)' : 'Married'}</option>
                      <option value="Divorciado(a)">{language === 'pt' ? 'Divorciado(a)' : 'Divorced'}</option>
                      <option value="Viúvo(a)">{language === 'pt' ? 'Viúvo(a)' : 'Widowed'}</option>
                      <option value="União Estável">{language === 'pt' ? 'União Estável' : 'Domestic Partnership'}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {language === 'pt' ? 'Altura (m)' : 'Height (m)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={currentAluno?.altura || ''}
                      onChange={(e) => setCurrentAluno({ ...currentAluno, altura: e.target.value })}
                      placeholder="Ex: 1.75"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {language === 'pt' ? 'Peso (kg)' : 'Weight (kg)'}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={currentAluno?.peso || ''}
                      onChange={(e) => setCurrentAluno({ ...currentAluno, peso: e.target.value })}
                      placeholder="Ex: 70.5"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {language === 'pt' ? 'Função / Cargo' : 'Role / Function'}
                    </label>
                    <input
                      type="text"
                      value={currentAluno?.funcao || ''}
                      onChange={(e) => setCurrentAluno({ ...currentAluno, funcao: e.target.value })}
                      placeholder={language === 'pt' ? 'Função que exerce' : 'Current function'}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    {language === 'pt' ? 'Observações Pedagógicas e Disciplinares' : 'Pedagogical & Disciplinary Notes'}
                  </label>
                  <textarea
                    value={currentAluno?.observacoes || ''}
                    onChange={(e) => setCurrentAluno({ ...currentAluno, observacoes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none resize-none focus:border-blue-500 shadow-inner"
                    placeholder={language === 'pt' ? 'Insira observações sobre o rendimento pedagógico, comportamento ou justificativas...' : 'Enter academic performance or behavioral notes...'}
                  />
                </div>
              </div>
            </div>

            {/* Access Code for Admin */}
            {currentAluno?.id && isAdmin && (
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  🔒 {language === 'pt' ? 'Acesso à Área do Aluno' : 'Student Portal Access'}
                </h4>
                
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                      {language === 'pt' ? 'Código de Acesso Individual' : 'Access Code'}
                    </span>
                    {studentAccess?.access_code ? (
                      <div className="flex items-center gap-2">
                        <code className="px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 font-mono font-bold rounded-lg text-sm">
                          {studentAccess.access_code}
                        </code>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(studentAccess.access_code);
                            setCopiedCode(true);
                            toast.success(language === 'pt' ? 'Código copiado!' : 'Code copied!');
                            setTimeout(() => setCopiedCode(false), 2000);
                          }}
                          className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-slate-700 font-medium text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                        >
                          {copiedCode ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                          {copiedCode ? (language === 'pt' ? 'Copiado' : 'Copied') : (language === 'pt' ? 'Copiar' : 'Copy')}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">
                        {language === 'pt' ? 'Nenhum código gerado para este aluno' : 'No access code generated yet'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 sticky bottom-0 bg-white pb-1">
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-900 transition-colors flex items-center gap-2 print:hidden mr-auto"
          >
            <Printer size={16} />
            {language === 'pt' ? 'Imprimir' : 'Print'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors print:hidden"
          >
            {language === 'pt' ? 'Cancelar / Fechar' : 'Cancel / Close'}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 print:hidden hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors disabled:opacity-50"
          >
            {saving 
              ? (language === 'pt' ? 'Salvando...' : 'Saving...') 
              : (language === 'pt' ? 'Salvar Alterações' : 'Save Changes')}
          </button>
        </div>
      </form>
    </Modal>

      {/* ========================================================================= */}
      {/* PRINT-ONLY OFFICIAL DOCUMENT: FICHA INDIVIDUAL DO ALUNO */}
      {/* ========================================================================= */}
      {mounted && isOpen && createPortal(
        <div className="hidden print:block student-ficha-printable-doc text-slate-900 bg-white p-2 font-sans text-xs w-full">
          {/* Cabeçalho Institucional */}
          <div className="border-b-2 border-slate-900 pb-2 mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 shrink-0 flex items-center justify-center">
                <img
                  src={typeof navalMissionLogo === 'string' ? navalMissionLogo : (navalMissionLogo as any)?.src || navalMissionLogo}
                  alt="Brasão"
                  className="w-14 h-14 object-contain shrink-0"
                />
              </div>
              <div>
                <h1 className="text-[9px] font-black uppercase tracking-widest text-slate-600 leading-tight">
                  SISTEMA DE GESTÃO ESCOLAR E ACADÊMICA
                </h1>
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 leading-tight">
                  ESCOLA DE FORMAÇÃO E APERFEIÇOAMENTO MILITAR
                </h2>
                <p className="text-[11px] font-extrabold text-blue-900 uppercase tracking-widest mt-0.5">
                  FICHA INDIVIDUAL DO ALUNO
                </p>
              </div>
            </div>
            <div className="text-right text-[9px] space-y-0.5 shrink-0">
              <div className="font-mono bg-slate-100 border border-slate-300 px-2 py-0.5 rounded font-bold text-slate-900">
                MATRÍCULA: {currentAluno?.matricula || 'N/A'}
              </div>
              <div className="font-mono text-slate-600">
                Emissão: {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase border border-slate-400 bg-slate-50">
                SITUAÇÃO: {currentAluno?.status?.toUpperCase() || 'ATIVO'}
              </div>
            </div>
          </div>

          {/* Perfil do Aluno: Foto 3x4 + Identificadores Principais */}
          <div className="flex border border-slate-400 rounded-lg p-2.5 mb-3 bg-slate-50/50 gap-3">
            {/* Foto 3x4 */}
            <div className="w-24 shrink-0 flex flex-col items-center justify-center border-r border-slate-300 pr-3">
              <div className="w-20 h-28 border-2 border-slate-800 rounded bg-white overflow-hidden shadow-sm flex items-center justify-center">
                <img
                  src={currentAluno?.foto_url || (typeof getAvatarImage() === 'string' ? getAvatarImage() : (getAvatarImage() as any)?.src)}
                  alt={currentAluno?.nome || 'Foto do Aluno'}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-[7px] font-bold text-slate-500 uppercase tracking-wider mt-1">FOTO 3x4 OFICIAL</span>
            </div>

            {/* Identificação do Aluno em Tabela para Alinhamento Perfeito na Impressão */}
            <table className="w-full text-xs border-collapse">
              <tbody>
                <tr className="border-b border-slate-200">
                  <td colSpan={2} className="pb-1">
                    <span className="text-[8px] font-bold text-slate-500 uppercase block leading-none">Nome Completo</span>
                    <span className="text-xs font-black text-slate-900 uppercase leading-tight">{currentAluno?.nome || 'NÃO INFORMADO'}</span>
                  </td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-1 w-1/2 pr-2">
                    <span className="text-[8px] font-bold text-slate-500 uppercase block leading-none">Nome de Guerra / Apelido</span>
                    <span className="font-bold text-slate-800 uppercase leading-snug">{currentAluno?.nome_guerra || '-'}</span>
                  </td>
                  <td className="py-1 w-1/2">
                    <span className="text-[8px] font-bold text-slate-500 uppercase block leading-none">Posto / Graduação</span>
                    <span className="font-bold text-slate-800 uppercase leading-snug">{currentAluno?.posto_graduacao || '-'}</span>
                  </td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-1 pr-2">
                    <span className="text-[8px] font-bold text-slate-500 uppercase block leading-none">Categoria / Tipo</span>
                    <span className="font-bold text-slate-800 uppercase leading-snug">{currentAluno?.tipo_aluno || 'Militar'}</span>
                  </td>
                  <td className="py-1">
                    <span className="text-[8px] font-bold text-slate-500 uppercase block leading-none">Organização Militar (OM)</span>
                    <span className="font-bold text-slate-800 uppercase leading-snug">{currentAluno?.om || '-'}</span>
                  </td>
                </tr>
                <tr>
                  <td colSpan={2} className="pt-1">
                    <span className="text-[8px] font-bold text-slate-500 uppercase block leading-none">
                      {turmaInfo?.internacional ? 'Curso (Inscrição no Exterior) / Turma' : 'Turma / Curso'}
                    </span>
                    <span className="font-bold text-blue-900 uppercase leading-snug">
                      {turmaInfo?.curso?.nome ? (
                        <>
                          <span className="text-blue-900 font-extrabold">CURSO: {turmaInfo.curso.nome}</span>
                          {turmaInfo?.nome && <span className="text-slate-700 font-bold ml-1 font-mono">({turmaInfo.nome})</span>}
                        </>
                      ) : (
                        turmaInfo?.nome ? `${turmaInfo.nome} ${turmaInfo.codigo ? `(${turmaInfo.codigo})` : ''}` : 'Turma Geral'
                      )}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Seção 1: Dados Pessoais e Documentação Civil */}
          <div className="mb-3">
            <h3 className="text-[9px] font-black uppercase tracking-wider bg-slate-800 text-white px-2 py-0.5 rounded-t">
              1. DADOS PESSOAIS E DOCUMENTAÇÃO CIVIL
            </h3>
            <table className="w-full border-collapse border border-slate-300 text-xs">
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="p-1 font-bold bg-slate-100 w-1/4 border-r border-slate-300">Gênero:</td>
                  <td className="p-1 w-1/4 border-r border-slate-300 capitalize">{currentAluno?.genero || '-'}</td>
                  <td className="p-1 font-bold bg-slate-100 w-1/4 border-r border-slate-300">Data de Nascimento:</td>
                  <td className="p-1 w-1/4 font-mono">{currentAluno?.data_nascimento ? format(new Date(currentAluno.data_nascimento), 'dd/MM/yyyy') : '-'}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="p-1 font-bold bg-slate-100 border-r border-slate-300">RG:</td>
                  <td className="p-1 font-mono border-r border-slate-300">{currentAluno?.rg || '-'}</td>
                  <td className="p-1 font-bold bg-slate-100 border-r border-slate-300">Título de Eleitor:</td>
                  <td className="p-1 font-mono">{currentAluno?.titulo_eleitor || '-'}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="p-1 font-bold bg-slate-100 border-r border-slate-300">Estado Civil:</td>
                  <td className="p-1 border-r border-slate-300">{currentAluno?.estado_civil || '-'}</td>
                  <td className="p-1 font-bold bg-slate-100 border-r border-slate-300">Tipo Sanguíneo/Fator RH:</td>
                  <td className="p-1 font-mono">{currentAluno?.tipo_sanguineo || '-'}{currentAluno?.fator_rh || ''}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="p-1 font-bold bg-slate-100 border-r border-slate-300">Altura:</td>
                  <td className="p-1 font-mono border-r border-slate-300">{currentAluno?.altura ? `${currentAluno.altura} m` : '-'}</td>
                  <td className="p-1 font-bold bg-slate-100 border-r border-slate-300">Peso:</td>
                  <td className="p-1 font-mono">{currentAluno?.peso ? `${currentAluno.peso} kg` : '-'}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="p-1 font-bold bg-slate-100 border-r border-slate-300">Nome do Pai:</td>
                  <td className="p-1 uppercase border-r border-slate-300" colSpan={3}>{currentAluno?.nome_pai || '-'}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="p-1 font-bold bg-slate-100 border-r border-slate-300">Nome da Mãe:</td>
                  <td className="p-1 uppercase border-r border-slate-300" colSpan={3}>{currentAluno?.nome_mae || '-'}</td>
                </tr>
                <tr>
                  <td className="p-1 font-bold bg-slate-100 border-r border-slate-300">Ano de Admissão:</td>
                  <td className="p-1 font-mono border-r border-slate-300">{currentAluno?.ano_admissao || '-'}</td>
                  <td className="p-1 font-bold bg-slate-100 border-r border-slate-300">Função / Cargo:</td>
                  <td className="p-1 uppercase">{currentAluno?.funcao || '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Seção 2: Contato e Comunicação */}
          <div className="mb-3">
            <h3 className="text-[9px] font-black uppercase tracking-wider bg-slate-800 text-white px-2 py-0.5 rounded-t">
              2. CONTATO E COMUNICAÇÃO
            </h3>
            <table className="w-full border-collapse border border-slate-300 text-xs">
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="p-1 font-bold bg-slate-100 w-1/6 border-r border-slate-300">E-mail:</td>
                  <td className="p-1 font-mono w-2/6 border-r border-slate-300">{currentAluno?.email || '-'}</td>
                  <td className="p-1 font-bold bg-slate-100 w-1/6 border-r border-slate-300">Telefone:</td>
                  <td className="p-1 font-mono w-2/6">{currentAluno?.telefone || '-'}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="p-1 font-bold bg-slate-100 border-r border-slate-300">WhatsApp:</td>
                  <td className="p-1 font-mono border-r border-slate-300">{currentAluno?.whatsapp || '-'}</td>
                  <td className="p-1 font-bold bg-slate-100 border-r border-slate-300">Código de Acesso:</td>
                  <td className="p-1 font-mono font-bold text-blue-900">{studentAccess?.access_code || '-'}</td>
                </tr>
                <tr>
                  <td className="p-1 font-bold bg-slate-100 border-r border-slate-300">Endereço Residencial:</td>
                  <td className="p-1 uppercase border-r border-slate-300 font-medium" colSpan={3}>
                    {currentAluno?.endereco || '-'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Seção 3: Registro de Frequência e Assiduidade */}
          <div className="mb-3">
            <h3 className="text-[9px] font-black uppercase tracking-wider bg-slate-800 text-white px-2 py-0.5 rounded-t">
              3. REGISTRO DE FREQUÊNCIA E ASSIDUIDADE
            </h3>
            <table className="w-full border-collapse border border-slate-300 text-xs text-center">
              <thead>
                <tr className="bg-slate-100 font-bold border-b border-slate-300">
                  <th className="p-1 border-r border-slate-300">Total de Aulas</th>
                  <th className="p-1 border-r border-slate-300">Presenças (%)</th>
                  <th className="p-1 border-r border-slate-300">Faltas (%)</th>
                  <th className="p-1">Situação da Frequência</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-1 font-mono border-r border-slate-300">{attendanceStats.total} aulas</td>
                  <td className="p-1 font-mono font-bold text-emerald-800 border-r border-slate-300">
                    {attendanceStats.presentes} ({attendanceStats.percentPresenca}%)
                  </td>
                  <td className="p-1 font-mono font-bold text-rose-800 border-r border-slate-300">
                    {attendanceStats.faltas} ({attendanceStats.percentFalta}%)
                  </td>
                  <td className="p-1 font-bold uppercase">
                    {attendanceStats.total === 0 ? (
                      <span className="text-slate-500">SEM REGISTROS</span>
                    ) : attendanceStats.percentPresenca >= 75 ? (
                      <span className="text-emerald-700">REGULAR (&ge; 75%)</span>
                    ) : (
                      <span className="text-rose-700">ABAIXO DO EXIGIDO (&lt; 75%)</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Seção 4: Observações Pedagógicas */}
          <div className="mb-4">
            <h3 className="text-[9px] font-black uppercase tracking-wider bg-slate-800 text-white px-2 py-0.5 rounded-t">
              4. OBSERVAÇÕES PEDAGÓGICAS E DISCIPLINARES
            </h3>
            <div className="border border-slate-300 p-2 text-xs font-sans min-h-[40px] bg-slate-50/30">
              {currentAluno?.observacoes ? (
                <p className="whitespace-pre-wrap leading-relaxed">{currentAluno.observacoes}</p>
              ) : (
                <p className="text-slate-400 italic">Nenhuma observação ou anotação disciplinar cadastrada até a presente data.</p>
              )}
            </div>
          </div>

          {/* Termo de Assinaturas */}
          <div className="pt-8 mt-8 grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <div className="border-b border-slate-800 w-4/5 mx-auto mb-1"></div>
              <p className="font-bold text-slate-800 uppercase">{currentAluno?.nome || 'Aluno'}</p>
              <p className="text-[8px] text-slate-500 uppercase">Assinatura do Aluno</p>
            </div>
            <div>
              <div className="border-b border-slate-800 w-4/5 mx-auto mb-1"></div>
              <p className="font-bold text-slate-800 uppercase">Coordenador de Cursos</p>
              <p className="text-[8px] text-slate-500 uppercase">Carimbo e Assinatura</p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>

  );
}
