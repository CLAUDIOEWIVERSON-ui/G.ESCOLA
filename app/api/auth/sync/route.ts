import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/admin';

export async function POST() {
  try {
    const supabase = await createClient();
    
    // Get the currently authenticated user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const SUPER_ADMIN_EMAIL = 'claudiomarinha2012@gmail.com';
    const isSuperAdminEmail = user.email === SUPER_ADMIN_EMAIL;
    const isMetadataAdmin = user.user_metadata?.role === 'admin';

    // If they qualify for admin privileges
    if (isSuperAdminEmail || isMetadataAdmin) {
      if (!isSupabaseAdminConfigured()) {
        console.warn('Supabase Admin client not configured. Cannot auto-create/sync profiles table.');
        return NextResponse.json({ 
          success: false, 
          message: 'Supabase Admin is not configured. Admin profile could not be synced.' 
        }, { status: 500 });
      }

      // 1. Fetch current profile from public schema using admin client to see if it exists
      const { data: profile, error: profileErr } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // 2. If profile is missing or does not have "admin" role, upsert it globally
      if (profileErr || !profile || profile.role !== 'admin') {
        const full_name = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Admin';
        
        const { error: upsertErr } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id: user.id,
            role: 'admin',
            full_name: full_name,
            created_at: profile?.created_at || new Date().toISOString()
          }, {
            onConflict: 'id'
          });

        if (upsertErr) {
          console.error('Error auto-syncing admin profile:', upsertErr);
          return NextResponse.json({ 
            success: false, 
            error: upsertErr.message 
          }, { status: 500 });
        }

        console.log(`Successfully synced admin profile for ${user.email} (${user.id})`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error in auth sync route:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
