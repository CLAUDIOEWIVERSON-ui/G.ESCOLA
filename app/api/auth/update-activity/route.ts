import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSession } from '@/lib/auth/rbac';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const { sessionId, deviceInfo } = await request.json();
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for') || '0.0.0.0';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // Upsert session
    const { error } = await supabaseAdmin
      .from('user_sessions')
      .upsert({
        user_id: session.user.id,
        session_id: sessionId,
        last_activity: new Date().toISOString(),
        ip_address: ip,
        user_agent: userAgent,
        device_info: deviceInfo || {}
      }, {
        onConflict: 'session_id'
      });

    if (error) {
      // If table doesn't exist yet, we might get an error.
      // But we should have created it in migrations.
      console.error('Error updating activity:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
