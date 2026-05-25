'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          const msg = error.message.toLowerCase();
          if (msg.includes('refresh token') || 
              msg.includes('refresh_token') || 
              msg.includes('invalid refresh token') ||
              msg.includes('invalid_grant') ||
              msg.includes('not found')) {
            await supabase.auth.signOut({ scope: 'local' });
            router.push('/login');
            return;
          }
          throw error;
        }
        if (session) {
          router.push('/dashboard');
        } else {
          router.push('/login');
        }
      } catch (err) {
        console.error('Auth check error:', err);
        // Clear session locally on error to avoid refresh token issues
        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch (e) {
          console.error('Error signing out locally:', e);
        }
        router.push('/login');
      }
    };
    checkAuth();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
    </div>
  );
}
