import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import { getRecentAccessLogs, recordAccessLog } from '@/lib/auth/accessLogs';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    let user: any = null;

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (!authError && authData?.user) {
      user = authData.user;
    }

    // Fallback: Authorization header
    if (!user) {
      const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ') && isSupabaseAdminConfigured()) {
        const token = authHeader.substring(7).trim();
        const { data: adminAuth } = await supabaseAdmin.auth.getUser(token);
        if (adminAuth?.user) {
          user = adminAuth.user;
        }
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 10, 1), 50) : 10;

    const logs = await getRecentAccessLogs(limit);

    return NextResponse.json({
      success: true,
      count: logs.length,
      limit,
      logs
    });
  } catch (error: any) {
    console.error('Error in /api/auth/access-logs GET:', error);
    return NextResponse.json({ error: error.message || 'Erro ao buscar histórico de acessos.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    let user: any = null;

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (!authError && authData?.user) {
      user = authData.user;
    }

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const userName = body.userName || body.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário';
    const role = body.role || user.user_metadata?.role || 'aluno';
    const path = body.path || body.currentPage || '/';
    const device = body.device || 'Desktop';
    const browser = body.browser || 'Navegador';
    const os = body.os || 'Sistema';
    const accessType = body.accessType || 'Acesso ao Sistema';
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || undefined;

    const log = await recordAccessLog({
      userId: user.id,
      userName,
      email: user.email || null,
      role,
      path,
      device,
      browser,
      os,
      accessType,
      ipAddress,
      userAgent: req.headers.get('user-agent') || undefined
    });

    return NextResponse.json({
      success: true,
      message: 'Acesso registrado com sucesso.',
      log
    });
  } catch (error: any) {
    console.error('Error in /api/auth/access-logs POST:', error);
    return NextResponse.json({ error: error.message || 'Erro ao registrar acesso.' }, { status: 500 });
  }
}
