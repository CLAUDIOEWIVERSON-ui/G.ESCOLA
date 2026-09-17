import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import { recordAccessLog, getRecentAccessLogs } from '@/lib/auth/accessLogs';

export const dynamic = 'force-dynamic';

export interface ActiveSession {
  sessionId: string;
  userId: string;
  name: string;
  role: 'admin' | 'instrutor' | 'aluno' | 'convidado' | string;
  email: string | null;
  currentPage: string;
  device: string; // 'Desktop' | 'Mobile' | 'Tablet'
  browser: string; // 'Chrome' | 'Safari' | 'Firefox' | 'Edge' | 'Navegador'
  os: string; // 'Windows' | 'macOS' | 'Linux' | 'iOS' | 'Android'
  firstSeen: number;
  lastSeen: number;
  ip?: string;
}

declare global {
  var _activeSessionsMap: Record<string, ActiveSession> | undefined;
  var _peakSimultaneousCount: number | undefined;
}

const CLEANUP_THRESHOLD_MS = 50 * 1000; // 50 seconds without heartbeat = offline
const IDLE_THRESHOLD_MS = 25 * 1000; // > 25s without heartbeat = idle

function getSessionsMap(): Record<string, ActiveSession> {
  if (!global._activeSessionsMap) {
    global._activeSessionsMap = {};
  }
  return global._activeSessionsMap;
}

function getPeakCount(): number {
  if (global._peakSimultaneousCount === undefined) {
    global._peakSimultaneousCount = 0;
  }
  return global._peakSimultaneousCount;
}

function setPeakCount(val: number) {
  global._peakSimultaneousCount = Math.max(global._peakSimultaneousCount || 0, val);
}

function cleanupExpiredSessions(now: number) {
  const map = getSessionsMap();
  for (const sid in map) {
    if (now - map[sid].lastSeen > CLEANUP_THRESHOLD_MS) {
      delete map[sid];
    }
  }
}

// POST: Register or update session presence (Heartbeat) or Leave
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const actionParam = searchParams.get('action');

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const now = Date.now();
    const sessionsMap = getSessionsMap();
    const action = actionParam || body.action;
    const sessionId = body.sessionId || `user_${user.id}`;

    // Handle instant leave (e.g. on window unload / logout)
    if (action === 'leave') {
      if (sessionsMap[sessionId]) {
        delete sessionsMap[sessionId];
      }
      return NextResponse.json({ success: true, message: 'Session closed' });
    }

    const name = body.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário';
    const role = body.role || user.user_metadata?.role || 'aluno';
    const currentPage = body.currentPage || '/';
    const device = body.device || 'Desktop';
    const browser = body.browser || 'Navegador';
    const os = body.os || 'Sistema';

    const existing = sessionsMap[sessionId];
    const isNewSession = !existing;
    const firstSeen = existing?.firstSeen || now;

    sessionsMap[sessionId] = {
      sessionId,
      userId: user.id,
      name,
      role,
      email: user.email || null,
      currentPage,
      device,
      browser,
      os,
      firstSeen,
      lastSeen: now
    };

    // Log the access event if it is a new session
    if (isNewSession) {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || undefined;
      const ua = req.headers.get('user-agent') || undefined;
      recordAccessLog({
        userId: user.id,
        userName: name,
        email: user.email || null,
        role,
        path: currentPage,
        device,
        browser,
        os,
        accessType: 'Acesso ao Sistema',
        ipAddress: ip,
        userAgent: ua
      }).catch(err => console.warn('[heartbeat] Non-blocking access log record warning:', err));
    }

    cleanupExpiredSessions(now);

    const activeCount = Object.keys(sessionsMap).length;
    setPeakCount(activeCount);

    return NextResponse.json({
      success: true,
      count: activeCount,
      totalSessions: activeCount
    });
  } catch (error: any) {
    console.error('Error handling heartbeat POST:', error);
    return NextResponse.json({ error: error.message || 'Error processing heartbeat' }, { status: 500 });
  }
}

// GET: Retrieve list of online users & simultaneous accesses (Only for Admin)
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
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if user is admin
    const SUPER_ADMIN_EMAIL = 'claudiomarinha2012@gmail.com';
    let isAdmin = user.email === SUPER_ADMIN_EMAIL;

    if (!isAdmin) {
      if (isSupabaseAdminConfigured()) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        isAdmin = profile?.role === 'admin';
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        isAdmin = profile?.role === 'admin';
      }
    }

    if (!isAdmin) {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const now = Date.now();
    cleanupExpiredSessions(now);

    const sessionsMap = getSessionsMap();
    const sessionList = Object.values(sessionsMap).map(s => {
      const idleTimeMs = now - s.lastSeen;
      const durationMs = now - s.firstSeen;
      return {
        ...s,
        idleTimeMs,
        durationMs,
        isIdle: idleTimeMs > IDLE_THRESHOLD_MS
      };
    });

    // Sort by lastSeen descending
    sessionList.sort((a, b) => b.lastSeen - a.lastSeen);

    const totalSessions = sessionList.length;
    setPeakCount(totalSessions);

    // Group by unique user
    const usersGroupMap: Record<string, {
      userId: string;
      name: string;
      role: string;
      email: string | null;
      sessionsCount: number;
      sessions: typeof sessionList;
      lastSeen: number;
      devices: string[];
    }> = {};

    const byRole = {
      admin: 0,
      instrutor: 0,
      aluno: 0,
      convidado: 0,
      outros: 0
    };

    sessionList.forEach(session => {
      // Role tally
      const r = (session.role || 'aluno').toLowerCase();
      if (r === 'admin') byRole.admin++;
      else if (r === 'instrutor') byRole.instrutor++;
      else if (r === 'aluno') byRole.aluno++;
      else if (r === 'convidado') byRole.convidado++;
      else byRole.outros++;

      // User aggregation
      if (!usersGroupMap[session.userId]) {
        usersGroupMap[session.userId] = {
          userId: session.userId,
          name: session.name,
          role: session.role,
          email: session.email,
          sessionsCount: 0,
          sessions: [],
          lastSeen: session.lastSeen,
          devices: []
        };
      }

      usersGroupMap[session.userId].sessionsCount++;
      usersGroupMap[session.userId].sessions.push(session);
      if (session.device && !usersGroupMap[session.userId].devices.includes(session.device)) {
        usersGroupMap[session.userId].devices.push(session.device);
      }
      if (session.lastSeen > usersGroupMap[session.userId].lastSeen) {
        usersGroupMap[session.userId].lastSeen = session.lastSeen;
      }
    });

    const uniqueUsersList = Object.values(usersGroupMap).sort((a, b) => b.lastSeen - a.lastSeen);
    const recentAccesses = await getRecentAccessLogs(10);

    return NextResponse.json({
      success: true,
      count: totalSessions,
      totalSessions,
      uniqueUsers: uniqueUsersList.length,
      peakSimultaneous: getPeakCount(),
      byRole,
      sessions: sessionList,
      users: uniqueUsersList,
      recentAccesses,
      timestamp: now
    });
  } catch (error: any) {
    console.error('Error handling heartbeat GET:', error);
    return NextResponse.json({ error: error.message || 'Error fetching online users' }, { status: 500 });
  }
}

// DELETE: Force disconnect a session or clear orphaned sessions (Admin only)
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const SUPER_ADMIN_EMAIL = 'claudiomarinha2012@gmail.com';
    let isAdmin = user.email === SUPER_ADMIN_EMAIL;
    if (!isAdmin) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      isAdmin = profile?.role === 'admin';
    }

    if (!isAdmin) {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const userId = searchParams.get('userId');
    const clearAll = searchParams.get('clearAll') === 'true';

    const sessionsMap = getSessionsMap();

    if (clearAll) {
      // Keep only current user's session
      for (const sid in sessionsMap) {
        if (sessionsMap[sid].userId !== user.id) {
          delete sessionsMap[sid];
        }
      }
      return NextResponse.json({ success: true, message: 'Todas as outras sessões foram desconectadas.' });
    }

    if (sessionId && sessionsMap[sessionId]) {
      delete sessionsMap[sessionId];
      return NextResponse.json({ success: true, message: 'Sessão desconectada com sucesso.' });
    }

    if (userId) {
      for (const sid in sessionsMap) {
        if (sessionsMap[sid].userId === userId) {
          delete sessionsMap[sid];
        }
      }
      return NextResponse.json({ success: true, message: `Todas as sessões do usuário foram desconectadas.` });
    }

    return NextResponse.json({ error: 'Parâmetro sessionId ou userId não informado.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao desconectar sessão.' }, { status: 500 });
  }
}
