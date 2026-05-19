'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

type Role = 'admin' | 'instrutor' | 'aluno';

interface UserProfile {
  id: string;
  role: Role;
  full_name: string | null;
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
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        // If there's a session error typical of a bad refresh token, clear it
        const errorMsg = sessionError.message.toLowerCase();
        if (errorMsg.includes('refresh token not found') || 
            errorMsg.includes('refresh_token_not_found') ||
            errorMsg.includes('invalid refresh token') ||
            errorMsg.includes('invalid_grant')) {
          console.warn('Handling invalid refresh token, signing out...');
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

      setProfile(finalProfile);
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
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
