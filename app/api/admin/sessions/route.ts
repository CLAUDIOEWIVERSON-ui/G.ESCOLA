import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSession, requireAdmin } from '@/lib/auth/rbac';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { authorized, response } = await requireAdmin();
  if (!authorized) return response!;

  try {
    // Join with profiles to get user info
    const { data, error } = await supabaseAdmin
      .from('user_sessions')
      .select(`
        *,
        profile:profiles(full_name, role)
      `)
      .order('last_activity', { ascending: false });

    if (error) {
      console.error('Error fetching sessions:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { authorized, response } = await requireAdmin();
  if (!authorized) return response!;

  try {
    const { sessionId } = await request.json();
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('user_sessions')
      .delete()
      .eq('session_id', sessionId);

    if (error) {
       return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
