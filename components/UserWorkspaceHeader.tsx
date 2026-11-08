'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useUser } from '@/lib/auth/UserContext';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { supabase } from '@/lib/supabase/client';
import { 
  User, 
  Camera, 
  Maximize2, 
  ShieldCheck, 
  KeyRound, 
  Settings, 
  CheckCircle2, 
  Loader2, 
  X,
  BadgeCheck,
  Building,
  IdCard,
  Sparkles,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import maleAvatar from '@/src/assets/images/avatar_male_1778977230783.png';
import femaleAvatar from '@/src/assets/images/avatar_female_1778977246051.png';
import militaryMaleAvatar from '@/src/assets/images/avatar_military_male_1779964887322.png';
import militaryFemaleAvatar from '@/src/assets/images/avatar_military_female_1779964903107.png';

interface UserWorkspaceHeaderProps {
  className?: string;
}

export function UserWorkspaceHeader({ className }: UserWorkspaceHeaderProps) {
  const { profile, refreshProfile } = useUser();
  const { language } = useI18n();
  const isPt = language === 'pt';

  const [isUploading, setIsUploading] = useState(false);
  const [expandedPhoto, setExpandedPhoto] = useState<{ url: string; name: string } | null>(null);
  const [liveStudentPhoto, setLiveStudentPhoto] = useState<string | null>(profile?.foto_url || null);
  const [photoLoadFailed, setPhotoLoadFailed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userRole = profile?.role || 'aluno';
  const isAdmin = userRole === 'admin';
  const isAluno = userRole === 'aluno';
  const canUploadPhoto = !isAdmin && !isAluno;

  // Sincroniza sempre que profile.foto_url mudar externamente
  useEffect(() => {
    if (profile?.foto_url) {
      setLiveStudentPhoto(profile.foto_url);
      setPhotoLoadFailed(false);
    }
  }, [profile?.foto_url]);

  // Para alunos: a foto é obrigatoriamente puxada do cadastro oficial da turma em alunos.foto_url
  useEffect(() => {
    if (isAluno && profile) {
      let isMounted = true;
      const fetchLatestStudentPhoto = async () => {
        try {
          const sId = profile.student_id || profile.id || '';
          const sEmail = profile.email || '';
          const sNome = profile.full_name || profile.nome || '';
          const sNip = profile.nip || '';
          const sTurmaId = profile.turma_id || '';

          const params = new URLSearchParams();
          if (sId) params.set('studentId', sId);
          if (sEmail) params.set('email', sEmail);
          if (sNome) params.set('nome', sNome);
          if (sNip) params.set('nip', sNip);
          if (sTurmaId) params.set('turmaId', sTurmaId);

          const res = await fetch(`/api/alunos/foto?${params.toString()}`);
          if (res.ok) {
            const json = await res.json();
            if (json.foto_url && isMounted) {
              setLiveStudentPhoto(json.foto_url);
              setPhotoLoadFailed(false);
              return;
            }
          }

          let q = supabase
            .from('alunos')
            .select('foto_url')
            .is('deleted_at', null);

          if (profile.student_id) {
            q = q.eq('id', profile.student_id);
          } else if (profile.nip) {
            q = q.or(`nif.eq.${profile.nip},matricula.eq.${profile.nip}`);
          } else if (profile.email) {
            q = q.eq('email', profile.email);
          } else if (profile.full_name) {
            q = q.ilike('nome', `%${profile.full_name}%`);
          } else {
            q = q.eq('id', profile.id);
          }

          const { data, error } = await q.maybeSingle();
          if (data && !error && data.foto_url && isMounted) {
            setLiveStudentPhoto(data.foto_url);
            setPhotoLoadFailed(false);
          }
        } catch (e) {
          // ignore
        }
      };
      fetchLatestStudentPhoto();
      return () => { isMounted = false; };
    }
  }, [isAluno, profile, profile?.student_id, profile?.email, profile?.id, profile?.nip, profile?.full_name, profile?.turma_id]);

  if (!profile) return null;

  const roleLabel = userRole === 'admin' 
    ? (isPt ? 'Administrador do Sistema' : 'System Administrator')
    : userRole === 'instrutor'
    ? (isPt ? 'Instrutor Militar' : 'Military Instructor')
    : userRole === 'convidado'
    ? (isPt ? 'Convidado / Visualizador' : 'Guest / Viewer')
    : (isPt ? 'Aluno / Estudante' : 'Student');

  const roleColor = userRole === 'admin'
    ? 'bg-blue-50 text-blue-700 border-blue-200'
    : userRole === 'instrutor'
    ? 'bg-purple-50 text-purple-700 border-purple-200'
    : userRole === 'convidado'
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-emerald-50 text-emerald-700 border-emerald-200';

  const displayName = profile.posto_graduacao || profile.nome_guerra
    ? `${profile.posto_graduacao || ''} ${profile.nome_guerra || profile.full_name || profile.nome}`.trim()
    : profile.full_name || profile.nome || 'Usuário';

  const userIdentifier = profile.email || profile.id.slice(0, 12).toUpperCase();

  // Fallback avatar selection (for non-admin users)
  const defaultAvatar = userRole === 'instrutor'
    ? militaryMaleAvatar
    : maleAvatar;

  // Foto individual:
  // - Administradores: sem foto (retirada conforme solicitação anterior)
  // - Alunos: estritamente puxada do cadastro oficial da turma em alunos.foto_url
  // - Demais usuários: foto individual de perfil
  const currentPhotoUrl = isAdmin 
    ? null 
    : isAluno 
    ? (liveStudentPhoto || profile.foto_url || null)
    : (profile.foto_url || profile.avatar_url);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error(isPt ? 'Por favor, selecione um arquivo de imagem válido.' : 'Please select a valid image file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error(isPt ? 'A foto deve ter no máximo 10MB.' : 'Photo size cannot exceed 10MB.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    if (profile.id) formData.append('userId', profile.id);
    if (profile.email) formData.append('email', profile.email);

    try {
      setIsUploading(true);
      toast.loading(isPt ? 'Salvando foto na sua área de trabalho...' : 'Updating workspace photo...');

      const response = await fetch('/api/auth/profile-photo', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      toast.dismiss();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Falha ao atualizar foto.');
      }

      toast.success(isPt ? 'Foto atualizada com sucesso!' : 'Photo updated successfully!');
      await refreshProfile();
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || (isPt ? 'Erro ao carregar foto.' : 'Error uploading photo.'));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <div 
        id="user-workspace-identity-card"
        className={cn(
          "bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden transition-all",
          className
        )}
      >
        {/* Barra superior de status da Área de Trabalho */}
        <div 
          data-topbar="true"
          className="workspace-header-dark-bar px-5 py-2.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2 text-xs"
          style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
        >
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-white/10 text-white" style={{ color: '#ffffff' }}>
              <IdCard size={14} className="text-white" style={{ color: '#ffffff', stroke: '#ffffff' }} />
            </span>
            <span 
              className="font-extrabold uppercase tracking-widest text-[10px] text-white"
              style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
            >
              {isPt ? 'Área de Trabalho • Identificação do Usuário' : 'Workspace • User Identity'}
            </span>
            <span className="hidden sm:inline text-slate-300 font-mono text-[10px]" style={{ color: '#ffffff', opacity: 0.8 }}>•</span>
            <span 
              className="hidden sm:inline text-[10px] text-white font-bold uppercase tracking-wider"
              style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
            >
              {isPt ? 'Visão Pessoal do Usuário' : 'Personal User View'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span 
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-white border border-emerald-500/40"
              style={{ color: '#ffffff' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span 
                className="text-white"
                style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
              >
                {isPt ? 'Sessão Ativa' : 'Active Session'}
              </span>
            </span>
          </div>
        </div>

        {/* Corpo principal do Cartão de Identificação */}
        <div className="p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 bg-gradient-to-b from-white to-slate-50/50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 flex-1 w-full">
            {/* 1. FOTO DO USUÁRIO (APENAS PARA NÃO-ADMINISTRADORES) */}
            {!isAdmin && (
              <div className="relative shrink-0 group">
                <div 
                  className={cn(
                    "w-24 h-32 sm:w-28 sm:h-36 rounded-2xl overflow-hidden border-2 border-slate-300/80 shadow-md relative bg-slate-100 flex items-center justify-center transition-transform hover:scale-[1.02]",
                    currentPhotoUrl && !photoLoadFailed ? "cursor-pointer" : ""
                  )}
                  onClick={() => {
                    if (currentPhotoUrl && !photoLoadFailed) {
                      setExpandedPhoto({ url: currentPhotoUrl, name: displayName });
                    }
                  }}
                  title={currentPhotoUrl && !photoLoadFailed ? (isPt ? "Clique para ampliar a foto (Cadastro Oficial da Turma)" : "Click to enlarge photo (Class Registration)") : undefined}
                >
                  {currentPhotoUrl && !photoLoadFailed ? (
                    <>
                      <Image
                        src={currentPhotoUrl}
                        alt={displayName}
                        fill
                        unoptimized
                        className="object-cover"
                        sizes="112px"
                        referrerPolicy="no-referrer"
                        onError={() => {
                          console.warn('Erro ao carregar imagem do aluno, aplicando fallback visual');
                          setPhotoLoadFailed(true);
                        }}
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <span className="p-1.5 rounded-full bg-black/60 text-white" title={isPt ? "Ampliar foto" : "Enlarge photo"}>
                          <Maximize2 size={13} />
                        </span>
                      </div>
                      {isAluno && (
                        <div className="absolute bottom-0 inset-x-0 bg-slate-900/80 text-[8px] font-bold text-white text-center py-0.5 uppercase tracking-tight">
                          {isPt ? 'Foto da Turma' : 'Class Photo'}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full relative flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                      <Image
                        src={defaultAvatar}
                        alt={displayName}
                        fill
                        className="object-cover opacity-60"
                        sizes="112px"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-slate-900/50 flex flex-col items-center justify-center gap-1 p-2">
                        <span className="text-[9px] font-black text-white uppercase tracking-wider text-center leading-tight drop-shadow">
                          {isPt ? 'Foto da Turma' : 'Class Photo'}
                        </span>
                        <span className="text-[8px] font-bold text-slate-200 uppercase tracking-tight text-center leading-tight drop-shadow">
                          {isPt ? 'A ser cadastrada pela coordenação' : 'Awaiting coordination'}
                        </span>
                      </div>
                    </div>
                  )}

                  {isUploading && (
                    <div className="absolute inset-0 bg-slate-900/70 flex flex-col items-center justify-center gap-1 text-white z-20">
                      <Loader2 size={18} className="animate-spin text-blue-400" />
                      <span className="text-[9px] font-bold">{isPt ? 'Enviando...' : 'Uploading...'}</span>
                    </div>
                  )}
                </div>

                {/* Botão de Trocar/Adicionar Foto (Apenas para não-alunos e não-administradores: instrutores/outros) */}
                {canUploadPhoto && (
                  <>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="absolute -bottom-2 -right-2 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-md border-2 border-white transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                      title={isPt ? "Clique para alterar ou adicionar foto" : "Click to change or add photo"}
                    >
                      <Camera size={13} />
                    </button>

                    <input 
                      ref={fileInputRef}
                      type="file" 
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden" 
                    />
                  </>
                )}
              </div>
            )}

            {/* 2. DADOS DO USUÁRIO E DO NOME */}
            <div className="space-y-3 flex-1 min-w-0">
              {/* BLOCO USUÁRIO */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {isPt ? 'USUÁRIO' : 'USER'}:
                </span>
                <span className="text-xs sm:text-sm font-bold font-mono text-slate-700 truncate max-w-[260px] sm:max-w-none">
                  {userIdentifier}
                </span>
                <span className={cn("text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-2xs", roleColor)}>
                  {roleLabel}
                </span>
                {profile.grupo_responsavel && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Grupo: {profile.grupo_responsavel}
                  </span>
                )}
              </div>

              {/* BLOCO NOME */}
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <span>{isPt ? 'NOME DO USUÁRIO' : 'USER NAME'}:</span>
                </div>
                <h2 className="text-base sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
                  <span>{displayName}</span>
                  {profile.has_changed_password && (
                    <span className="inline-flex items-center text-emerald-600" title={isPt ? "Conta verificada com senha alterada" : "Verified account"}>
                      <BadgeCheck size={18} />
                    </span>
                  )}
                </h2>
                {profile.nome_guerra && profile.full_name && profile.full_name !== profile.nome_guerra && (
                  <p className="text-xs text-slate-500 font-medium">
                    {isPt ? 'Nome Completo:' : 'Full Name:'} {profile.full_name}
                  </p>
                )}
              </div>

              {/* DETALHES ADICIONAIS (OM, NIP, STATUS) */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-xs text-slate-600 border-t border-slate-100">
                <div className="flex items-center gap-1">
                  <Building size={12} className="text-slate-400" />
                  <span className="font-semibold text-slate-500">{isPt ? 'OM:' : 'Unit:'}</span>
                  <span className="font-bold text-slate-800">{profile.om || (isPt ? 'Comando da Força' : 'Naval Force')}</span>
                </div>

                {profile.nip && (
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-slate-500">NIP:</span>
                    <span className="font-mono font-bold text-slate-800">{profile.nip}</span>
                  </div>
                )}

                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span>{isPt ? 'Acesso Pessoal Verificado' : 'Verified Access'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. AÇÕES RÁPIDAS DA ÁREA DE TRABALHO */}
          <div className="flex flex-row md:flex-col items-center md:items-end gap-2 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
            {canUploadPhoto && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-200/80 transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
                title={isPt ? "Carregar ou alterar sua foto" : "Upload or change your photo"}
              >
                <Camera size={14} />
                <span>{currentPhotoUrl ? (isPt ? 'Alterar Minha Foto' : 'Change Photo') : (isPt ? 'Inserir Minha Foto' : 'Upload Photo')}</span>
              </button>
            )}

            {isAdmin && (
              <Link
                href="/usuarios"
                className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold border border-blue-200 transition-all cursor-pointer shadow-2xs active:scale-95"
                title={isPt ? "Gerenciar Usuários e Permissões" : "Manage Users and Permissions"}
              >
                <ShieldCheck size={14} className="text-blue-600" />
                <span>{isPt ? 'Painel de Usuários' : 'Manage Users'}</span>
              </Link>
            )}

            {isAluno && (
              <Link
                href="/boletim"
                className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 transition-all cursor-pointer shadow-2xs active:scale-95"
                title={isPt ? "Acessar Meu Boletim Escolar e Desempenho" : "Access Report Card"}
              >
                <FileText size={14} className="text-emerald-700" />
                <span>{isPt ? 'Meu Boletim' : 'Report Card'}</span>
              </Link>
            )}

            <Link
              href="/configuracoes"
              className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-all cursor-pointer shadow-2xs active:scale-95"
              title={isPt ? "Gerenciar Minha Conta e Senha" : "Manage Account and Password"}
            >
              <Settings size={14} className="text-slate-400" />
              <span>{isPt ? 'Minha Conta' : 'Account'}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Modal para Ampliar Foto do Usuário */}
      {expandedPhoto && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs"
          onClick={() => setExpandedPhoto(null)}
        >
          <div 
            className="relative max-w-full max-h-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute -top-12 right-0 p-2 text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
              onClick={() => setExpandedPhoto(null)}
            >
              <X size={20} />
            </button>
            <div className="bg-white p-2 rounded-2xl shadow-2xl overflow-hidden">
              <div className="relative w-[85vw] max-w-[420px] h-[75vh] max-h-[560px] rounded-xl overflow-hidden bg-slate-900 border border-slate-200">
                <Image
                  src={expandedPhoto.url}
                  alt={expandedPhoto.name}
                  fill
                  unoptimized
                  className="object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="p-3 text-center">
                <p className="font-bold text-slate-800 text-sm">{expandedPhoto.name}</p>
                <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">{roleLabel}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
