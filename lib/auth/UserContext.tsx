'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, clearSupabaseCookiesAndStorage } from '@/lib/supabase/client';
import { fetchWithAuth } from '@/lib/api';

type Role = 'admin' | 'instrutor' | 'aluno';

interface UserProfile {
  id: string;
  role: Role;
  full_name: string | null;
  has_changed_password?: boolean;
  isNifStudent?: boolean;
  student_id?: string;
  turma_id?: string;
}

interface UserContextType {
  profile: UserProfile | null;
  isAdmin: boolean;
  isInstrutor: boolean;
  isAluno: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const SUPER_ADMIN_EMAIL = 'claudiomarinha2012@gmail.com';

  const fetchProfile = async () => {
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

      // Hardcode perm admin check
      if (session.user.email === SUPER_ADMIN_EMAIL) {
        finalProfile.role = 'admin';
      }

      if (session.user.user_metadata?.isNifStudent) {
        finalProfile.isNifStudent = true;
        finalProfile.student_id = session.user.user_metadata?.student_id;
        finalProfile.turma_id = session.user.user_metadata?.turma_id;
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
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchProfile();
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
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

  const value = {
    profile,
    isAdmin: profile?.role === 'admin',
    isInstrutor: profile?.role === 'instrutor',
    isAluno: profile?.role === 'aluno',
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
