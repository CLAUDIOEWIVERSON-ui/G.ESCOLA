'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

const SUPER_ADMIN_EMAIL = 'claudiomarinha2012@gmail.com';

export interface UserProfile {
  id: string;
  email?: string;
  full_name?: string;
  nome?: string;
  nome_guerra?: string;
  posto_graduacao?: string;
  role: 'admin' | 'instrutor' | 'aluno' | 'convidado';
  foto_url?: string;
  avatar_url?: string;
  om?: string;
  nip?: string;
  matricula?: string;
  turma_id?: string;
  turma_nome?: string;
  turma_status?: string;
  turma_periodo?: string;
  turma_grupo?: string;
  curso_nome?: string;
  liberar_formularios?: boolean;
  data_fim?: string;
  data_postergacao?: string;
  student_id?: string;
  student_email?: string;
  access_code?: string;
  has_changed_password?: boolean;
  grupo_responsavel?: string;
  isNifStudent?: boolean;
}

interface UserContextType {
  profile: UserProfile | null;
  authLoading: boolean;
  loading: boolean;
  isAdmin: boolean;
  isInstrutor: boolean;
  isAluno: boolean;
  isConvidado: boolean;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  profile: null,
  authLoading: true,
  loading: true,
  isAdmin: false,
  isInstrutor: false,
  isAluno: false,
  isConvidado: false,
  refreshProfile: async () => {},
  logout: async () => {},
});

function buildFallbackProfileFromUser(user: any, profRow?: any): UserProfile {
  const email = user.email || '';
  const meta = user.user_metadata || {};
  const isSuperAdmin = email.toLowerCase() === SUPER_ADMIN_EMAIL;
  const isShadowStudent = email.startsWith('aluno_nif_') || email.endsWith('@aluno.escola.digital');
  const role: UserProfile['role'] = isSuperAdmin
    ? 'admin'
    : (profRow?.role || meta.role || 'aluno');

  const studentId =
    profRow?.student_id ||
    meta.student_id ||
    (email.startsWith('aluno_nif_') ? email.replace('aluno_nif_', '').split('@')[0] : undefined);

  const isNifStudent = Boolean(
    role === 'aluno' && (meta.isNifStudent || isShadowStudent || studentId)
  );

  const fullName =
    profRow?.full_name ||
    meta.full_name ||
    (isShadowStudent ? 'Aluno' : email.split('@')[0]) ||
    'Usuário';

  const fotoUrl = profRow?.foto_url || meta.foto_url || meta.avatar_url || undefined;

  return {
    id: user.id,
    email,
    full_name: fullName,
    nome: fullName,
    nome_guerra: profRow?.nome_guerra || meta.nome_guerra || undefined,
    posto_graduacao: profRow?.posto_graduacao || meta.posto_graduacao || undefined,
    role,
    foto_url: fotoUrl,
    avatar_url: fotoUrl,
    om: profRow?.om || meta.om || undefined,
    nip: profRow?.nip || meta.nip || undefined,
    turma_id: profRow?.turma_id || meta.turma_id || undefined,
    student_id: studentId,
    has_changed_password: profRow?.has_changed_password ?? true,
    grupo_responsavel: profRow?.grupo_responsavel || meta.grupo_responsavel || undefined,
    isNifStudent,
  };
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const sessionIdRef = useRef<string>('');

  const getClientSessionId = (userId: string) => {
    if (sessionIdRef.current) return sessionIdRef.current;
    if (typeof window !== 'undefined') {
      const storageKey = `presence_session_${userId}`;
      let sid = sessionStorage.getItem(storageKey);
      if (!sid) {
        sid = `${userId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
        sessionStorage.setItem(storageKey, sid);
      }
      sessionIdRef.current = sid;
      return sid;
    }
    return `user_${userId}`;
  };

  const loadProfile = useCallback(async (showSpinner = false) => {
    if (!isSupabaseConfigured()) {
      setProfile(null);
      setAuthLoading(false);
      return;
    }

    if (showSpinner) {
      setAuthLoading(true);
    }

    try {
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();

      if (sessionErr || !session?.user) {
        setProfile(null);
        setAuthLoading(false);
        return;
      }

      const authUser = session.user;
      const accessToken = session.access_token;

      // Busca dados completos no servidor (auth.users + profiles + alunos + turmas)
      try {
        const res = await fetch('/api/auth/me', {
          method: 'GET',
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
          cache: 'no-store',
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.authenticated && data?.profile) {
            setProfile(data.profile);
            setAuthLoading(false);
            return;
          }
        }
      } catch (apiErr) {
        console.warn('[UserContext] Fallback para consulta direta ao perfil:', apiErr);
      }

      // Fallback direto via Supabase client caso /api/auth/me não responda
      const { data: profRow } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      setProfile(buildFallbackProfileFromUser(authUser, profRow));
    } catch (err) {
      console.error('[UserContext] Erro ao carregar perfil:', err);
      setProfile(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile(true);

    if (!isSupabaseConfigured()) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        sessionIdRef.current = '';
        setProfile(null);
        setAuthLoading(false);
      } else if (
        event === 'SIGNED_IN' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'USER_UPDATED' ||
        event === 'INITIAL_SESSION'
      ) {
        loadProfile(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  // Heartbeat periódico para registrar sessão ativa do usuário real
  useEffect(() => {
    if (!profile?.id || typeof window === 'undefined') return;

    let active = true;
    const sendHeartbeat = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token || !active) return;

        const ua = navigator.userAgent || '';
        const device = /Mobi|Android/i.test(ua) ? (/Tablet|iPad/i.test(ua) ? 'Tablet' : 'Mobile') : 'Desktop';
        const browser = ua.includes('Edg') ? 'Edge' : ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') ? 'Safari' : 'Navegador';
        const os = ua.includes('Windows') ? 'Windows' : ua.includes('Mac') ? 'macOS' : ua.includes('Android') ? 'Android' : ua.includes('iPhone') || ua.includes('iPad') ? 'iOS' : ua.includes('Linux') ? 'Linux' : 'Sistema';

        await fetch('/api/auth/heartbeat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            sessionId: getClientSessionId(profile.id),
            name: profile.full_name || profile.nome || profile.email?.split('@')[0] || 'Usuário',
            role: profile.role,
            currentPage: window.location.pathname,
            device,
            browser,
            os,
          }),
        });
      } catch {
        // Ignora falhas transitórias de rede no heartbeat
      }
    };

    sendHeartbeat();
    const timer = setInterval(sendHeartbeat, 20000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [profile?.id, profile?.full_name, profile?.nome, profile?.email, profile?.role]);

  const refreshProfile = useCallback(async () => {
    await loadProfile(false);
  }, [loadProfile]);

  const logout = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token && profile?.id) {
        await fetch('/api/auth/heartbeat?action=leave', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ sessionId: getClientSessionId(profile.id) }),
        }).catch(() => {});
      }
      await supabase.auth.signOut();
    } catch {
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    } finally {
      sessionIdRef.current = '';
      setProfile(null);
    }
  }, [profile?.id]);

  const role = profile?.role;
  const isAdmin = role === 'admin';
  const isInstrutor = role === 'instrutor';
  const isAluno = role === 'aluno';
  const isConvidado = role === 'convidado';

  return (
    <UserContext.Provider
      value={{
        profile,
        authLoading,
        loading: authLoading,
        isAdmin,
        isInstrutor,
        isAluno,
        isConvidado,
        refreshProfile,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
