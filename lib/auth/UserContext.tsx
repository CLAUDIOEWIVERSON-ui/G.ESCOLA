'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase, clearSupabaseCookiesAndStorage } from '@/lib/supabase/client';
import { fetchWithAuth } from '@/lib/api';

type Role = 'admin' | 'instrutor' | 'aluno' | 'convidado';

export interface UserProfile {
  id: string;
  role: Role;
  full_name: string | null;
  nome?: string | null;
  email?: string | null;
  has_changed_password?: boolean;
  isNifStudent?: boolean;
  student_id?: string;
  turma_id?: string;
  grupo_responsavel?: string | null;
  foto_url?: string | null;
  avatar_url?: string | null;
  posto_graduacao?: string | null;
  nome_guerra?: string | null;
  om?: string | null;
  nip?: string | null;
}

interface UserContextType {
  profile: UserProfile | null;
  isAdmin: boolean;
  isInstrutor: boolean;
  isAluno: boolean;
  isConvidado: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const isFetchingRef = useRef(false);

  const SUPER_ADMIN_EMAIL = 'claudiomarinha2012@gmail.com';

  const fetchProfile = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        // If there's a session error typical of a bad refresh token, clear it
        const errorMsg = sessionError.message.toLowerCase();
        if (errorMsg.includes('refresh token') || 
            errorMsg.includes('refresh_token') ||
            errorMsg.includes('invalid refresh token') ||
            errorMsg.includes('invalid_grant') ||
            errorMsg.includes('not found')) {
          console.warn('Handling invalid refresh token, signing out...');
          clearSupabaseCookiesAndStorage();
          // Use { scope: 'local' } to ensure it clears even if the server is unreachable or token is invalid
          await supabase.auth.signOut({ scope: 'local' });
          setProfile(null);
          setLoading(false);
          return;
        }
        throw sessionError;
      }

      if (!session) {
        setProfile(null);
        setLoading(false);
        return;
      }

      // Sync user profile database record in the background to ensure RLS rules are fully met
      try {
        await fetchWithAuth('/api/auth/sync', { method: 'POST' });
      } catch (syncErr) {
        console.warn('Could not sync user profile with database:', syncErr);
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      let finalProfile: UserProfile;

      if (error) {
        // Only log actual database errors, not "row not found" (PGRST116)
        if (error.code !== 'PGRST116') {
          console.error('Error fetching profile:', error);
        }
        
        // Fallback to metadata if profile doesn't exist yet
        const metadataRole = session.user.user_metadata?.role as Role || 'aluno';
        finalProfile = {
          id: session.user.id,
          role: metadataRole,
          full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User'
        };
      } else {
        finalProfile = data as UserProfile;
      }

      finalProfile.email = session.user.email || null;
      finalProfile.nome = finalProfile.full_name;

      // Hardcode perm admin check
      if (session.user.email === SUPER_ADMIN_EMAIL) {
        finalProfile.role = 'admin';
      }

      const userEmail = session.user.email || '';
      const isStudentEmail = userEmail.startsWith('aluno_nif_') && userEmail.endsWith('@aluno.escola.digital');

      if (finalProfile.role === 'aluno' || isStudentEmail || session.user.user_metadata?.isNifStudent) {
        finalProfile.role = 'aluno';
        finalProfile.isNifStudent = true;
        let sId = session.user.user_metadata?.student_id;
        if (!sId && isStudentEmail) {
          sId = userEmail.replace('aluno_nif_', '').split('@')[0];
        }

        const sNome = session.user.user_metadata?.full_name || finalProfile.full_name || '';
        const sNip = session.user.user_metadata?.nip || finalProfile.nip || '';
        const sTurmaId = session.user.user_metadata?.turma_id || finalProfile.turma_id || '';

        const params = new URLSearchParams();
        if (sId) params.set('studentId', sId);
        else if (session.user.id) params.set('studentId', session.user.id);
        if (userEmail) params.set('email', userEmail);
        if (sNome) params.set('nome', sNome);
        if (sNip) params.set('nip', sNip);
        if (sTurmaId) params.set('turmaId', sTurmaId);

        // 1. Tentar carregar diretamente pela API do servidor (bypassa RLS de forma 100% segura e confiável)
        try {
          const photoRes = await fetch(`/api/alunos/foto?${params.toString()}`);
          if (photoRes.ok) {
            const photoData = await photoRes.json();
            if (photoData && photoData.success) {
              if (photoData.id) finalProfile.student_id = photoData.id;
              if (photoData.nome) { finalProfile.full_name = photoData.nome; finalProfile.nome = photoData.nome; }
              if (photoData.turma_id) finalProfile.turma_id = photoData.turma_id;
              if (photoData.foto_url) finalProfile.foto_url = photoData.foto_url;
              if (photoData.posto_graduacao) finalProfile.posto_graduacao = photoData.posto_graduacao;
              if (photoData.nome_guerra) finalProfile.nome_guerra = photoData.nome_guerra;
              if (photoData.nip) finalProfile.nip = photoData.nip;
              if (photoData.om) finalProfile.om = photoData.om;
            }
          }
        } catch (photoApiErr) {
          console.warn('[UserContext] Server fetch of student photo warning:', photoApiErr);
        }

        // 2. Consulta direta ao Supabase client como fallback
        if (!finalProfile.foto_url) {
          try {
            let stunQuery = supabase
              .from('alunos')
              .select('id, nome, turma_id, foto_url, posto_graduacao, nome_guerra, nip, om')
              .is('deleted_at', null);

            if (sId) {
              stunQuery = stunQuery.eq('id', sId);
            } else if (session.user.email) {
              stunQuery = stunQuery.eq('email', session.user.email);
            }

            const { data: stun, error: stunErr } = await stunQuery.limit(1).maybeSingle();

            if (stun && !stunErr) {
              finalProfile.student_id = stun.id;
              finalProfile.full_name = stun.nome;
              finalProfile.nome = stun.nome;
              finalProfile.turma_id = stun.turma_id;
              // Foto estritamente puxada do cadastro oficial da turma
              if (stun.foto_url) finalProfile.foto_url = stun.foto_url;
              if (stun.posto_graduacao) finalProfile.posto_graduacao = stun.posto_graduacao;
              if (stun.nome_guerra) finalProfile.nome_guerra = stun.nome_guerra;
              if (stun.om) finalProfile.om = stun.om;
              if (stun.nip) finalProfile.nip = stun.nip;
            } else if (session.user.user_metadata?.turma_id) {
              finalProfile.turma_id = session.user.user_metadata.turma_id;
            }
          } catch (fetchErr) {
            console.error('Error fetching student details in UserContext:', fetchErr);
            if (session.user.user_metadata?.turma_id) {
              finalProfile.turma_id = session.user.user_metadata.turma_id;
            }
          }
        }
      }

      // Check metadata or profile data for foto_url (apenas para instrutores/outros; administradores não têm foto e alunos vêm de alunos.foto_url)
      if (finalProfile.role !== 'admin' && finalProfile.role !== 'aluno' && !finalProfile.foto_url) {
        finalProfile.foto_url = (data as any)?.foto_url || session.user.user_metadata?.foto_url || (data as any)?.avatar_url || session.user.user_metadata?.avatar_url || null;
      }
      if (!finalProfile.posto_graduacao) {
        finalProfile.posto_graduacao = (data as any)?.posto_graduacao || session.user.user_metadata?.posto_graduacao || null;
      }
      if (!finalProfile.nome_guerra) {
        finalProfile.nome_guerra = (data as any)?.nome_guerra || session.user.user_metadata?.nome_guerra || null;
      }
      if (!finalProfile.om) {
        finalProfile.om = (data as any)?.om || session.user.user_metadata?.om || null;
      }

      // Search in alunos by email if foto_url is still empty (matches instrutor/aluno accounts, rank for admins)
      if (session.user.email) {
        try {
          const { data: matchedAluno } = await supabase
            .from('alunos')
            .select('id, nome, turma_id, foto_url, posto_graduacao, nome_guerra, nip, om')
            .eq('email', session.user.email)
            .is('deleted_at', null)
            .limit(1)
            .maybeSingle();

          if (matchedAluno) {
            // Manter foto apenas para os demais usuários (não-administradores)
            if (finalProfile.role !== 'admin' && matchedAluno.foto_url) {
              finalProfile.foto_url = matchedAluno.foto_url;
            }
            if (!finalProfile.posto_graduacao && matchedAluno.posto_graduacao) finalProfile.posto_graduacao = matchedAluno.posto_graduacao;
            if (!finalProfile.nome_guerra && matchedAluno.nome_guerra) finalProfile.nome_guerra = matchedAluno.nome_guerra;
            if (!finalProfile.om && matchedAluno.om) finalProfile.om = matchedAluno.om;
            if (!finalProfile.nip && matchedAluno.nip) finalProfile.nip = matchedAluno.nip;
          }
        } catch (matchErr) {
          // Ignore match fallback error
        }
      }

      // Garantir remoção total de fotos para usuários administradores na área de trabalho
      if (finalProfile.role === 'admin') {
        finalProfile.foto_url = null;
        finalProfile.avatar_url = null;
      }

      setProfile(finalProfile);
    } catch (err: any) {
      console.error('Unexpected error fetching profile:', err);
      if (err?.message) {
        const errMsg = err.message.toLowerCase();
        if (errMsg.includes('refresh token') || 
            errMsg.includes('refresh_token') ||
            errMsg.includes('invalid refresh token') ||
            errMsg.includes('invalid_grant') ||
            errMsg.includes('not found')) {
          clearSupabaseCookiesAndStorage();
          supabase.auth.signOut({ scope: 'local' }).catch(() => {});
          setProfile(null);
        }
      }
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchProfile();
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      if (session) {
        setLoading(true);
        fetchProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Send heartbeat periodically when user profile is loaded
  useEffect(() => {
    if (!profile) return;

    // Helper to detect device and browser
    const getClientDeviceInfo = () => {
      if (typeof window === 'undefined') return { device: 'Desktop', browser: 'Navegador', os: 'Sistema' };
      const ua = navigator.userAgent || '';
      
      let device = 'Desktop';
      if (/iPad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk/i.test(ua)) {
        device = 'Tablet';
      } else if (/Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Android/i.test(ua)) {
        device = 'Mobile';
      }

      let browser = 'Navegador';
      if (ua.includes('Firefox')) browser = 'Firefox';
      else if (ua.includes('Edg/')) browser = 'Edge';
      else if (ua.includes('Chrome')) browser = 'Chrome';
      else if (ua.includes('Safari')) browser = 'Safari';
      else if (ua.includes('Opera') || ua.includes('OPR/')) browser = 'Opera';

      let os = 'Sistema';
      if (ua.includes('Win')) os = 'Windows';
      else if (ua.includes('Mac')) os = 'macOS';
      else if (ua.includes('Linux')) os = 'Linux';
      else if (ua.includes('Android')) os = 'Android';
      else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

      return { device, browser, os };
    };

    const getTabSessionId = () => {
      if (typeof window === 'undefined') return 'srv_tab';
      let sid = sessionStorage.getItem('applet_tab_session_id');
      if (!sid) {
        sid = `tab_${(profile.id || 'usr').substring(0, 6)}_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
        sessionStorage.setItem('applet_tab_session_id', sid);
      }
      return sid;
    };

    const sendHeartbeat = async (action?: string) => {
      try {
        const { device, browser, os } = getClientDeviceInfo();
        const sessionId = getTabSessionId();
        const currentPage = typeof window !== 'undefined' ? window.location.pathname : '/';

        await fetch('/api/auth/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            sessionId,
            name: profile.full_name || profile.nome || 'Usuário',
            role: profile.role,
            currentPage,
            device,
            browser,
            os
          }),
          keepalive: true
        });
      } catch (err) {
        // Silently capture heartbeat warnings
      }
    };

    // Send immediately on profile load
    sendHeartbeat();

    // Send every 25 seconds for precise simultaneous tracking
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        sendHeartbeat();
      }
    }, 25000);

    // Refresh instantly when user tabs back into the app
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Notify server to release session instantly when closing tab
    const handleBeforeUnload = () => {
      const sessionId = getTabSessionId();
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify({ action: 'leave', sessionId })], { type: 'application/json' });
        navigator.sendBeacon('/api/auth/heartbeat?action=leave', blob);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [profile]);

  const value = {
    profile,
    isAdmin: profile?.role === 'admin',
    isInstrutor: profile?.role === 'instrutor',
    isAluno: profile?.role === 'aluno',
    isConvidado: profile?.role === 'convidado',
    loading,
    refreshProfile: fetchProfile
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
