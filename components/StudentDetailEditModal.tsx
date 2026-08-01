'use client';

import React, { useState, useEffect } from 'react';
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
  Clock
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import maleAvatar from '@/src/assets/images/avatar_male_1778977230783.png';
import femaleAvatar from '@/src/assets/images/avatar_female_1778977246051.png';
import militaryMaleAvatar from '@/src/assets/images/avatar_military_male_1779964887322.png';
import militaryFemaleAvatar from '@/src/assets/images/avatar_military_female_1779964903107.png';

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
    if (isOpen && aluno) {
      setCurrentAluno({ ...aluno });
      loadAttendance(aluno.id);
      loadStudentAccess(aluno.id);
    } else if (isOpen && !aluno) {
      setCurrentAluno({
        tipo_aluno: 'militar',
        genero: 'masculino',
        status: 'Ativo'
      });
      setAttendanceStats({
        presentes: 0,
        faltas: 0,
        total: 0,
        percentPresenca: 0,
        percentFalta: 0
      });
      setStudentAccess(null);
    }
  }, [isOpen, aluno]);

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
      if (currentAluno.posto_graduacao) dataToSave.posto_graduacao = currentAluno.posto_graduacao;
      if (currentAluno.rg) dataToSave.rg = currentAluno.rg;
      if (currentAluno.titulo_eleitor) dataToSave.titulo_eleitor = currentAluno.titulo_eleitor;
      if (currentAluno.nome_pai) dataToSave.nome_pai = currentAluno.nome_pai;
      if (currentAluno.nome_mae) dataToSave.nome_mae = currentAluno.nome_mae;
      if (currentAluno.om) dataToSave.om = currentAluno.om;
      if (currentAluno.genero) dataToSave.genero = currentAluno.genero;
      if (currentAluno.telefone) dataToSave.telefone = currentAluno.telefone;
      if (currentAluno.whatsapp) dataToSave.whatsapp = currentAluno.whatsapp;
      if (currentAluno.foto_url) dataToSave.foto_url = currentAluno.foto_url;
      if (currentAluno.status) dataToSave.status = currentAluno.status;

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={currentAluno?.id ? (language === 'pt' ? 'Detalhes e Edição do Aluno' : 'Student Details & Edit') : (language === 'pt' ? 'Adicionar Novo Aluno' : 'Add New Student')}
    >
      <form onSubmit={handleSaveStudent} className="space-y-6 max-h-[82vh] overflow-y-auto px-1">
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
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors"
          >
            {language === 'pt' ? 'Cancelar / Fechar' : 'Cancel / Close'}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors disabled:opacity-50"
          >
            {saving 
              ? (language === 'pt' ? 'Salvando...' : 'Saving...') 
              : (language === 'pt' ? 'Salvar Alterações' : 'Save Changes')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
