import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/admin';

// Declare a type-safe global object for TypeScript
interface OnlineUser {
  id: string;
  name: string;
  role: string;
  email: string | null;
  lastSeen: number;
}

declare global {
  var _onlineUsers: Record<string, OnlineUser> | undefined;
}

const CLEANUP_THRESHOLD_MS = 60 * 1000; // 60 seconds of inactivity = offline

function getOnlineUsersMap(): Record<string, OnlineUser> {
  if (!global._onlineUsers) {
    global._onlineUsers = {};
  }
  return global._onlineUsers;
}

// POST: Register user presence (Heartbeat)
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const { name, role } = body;
    const usersMap = getOnlineUsersMap();
    const now = Date.now();

    // Store user presence
    usersMap[user.id] = {
      id: user.id,
      name: name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
      role: role || user.user_metadata?.role || 'aluno',
      email: user.email || null,
      lastSeen: now
    };

    // Clean up expired sessions (not seen in 60 seconds)
    for (const id in usersMap) {
      if (now - usersMap[id].lastSeen > CLEANUP_THRESHOLD_MS) {
        delete usersMap[id];
      }
    }

    return NextResponse.json({ success: true, count: Object.keys(usersMap).length });
  } catch (error: any) {
    console.error('Error handling heartbeat POST:', error);
    return NextResponse.json({ error: error.message || 'Error processing heartbeat' }, { status: 500 });
  }
}

// GET: Retrieve list of online users (Only for Admin)
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify admin role
    const SUPER_ADMIN_EMAIL = 'claudiomarinha2012@gmail.com';
    let isAdmin = user.email === SUPER_ADMIN_EMAIL;

    if (!isAdmin) {
      const useAdmin = isSupabaseAdminConfigured();
      const clientToUse = useAdmin ? supabaseAdmin : supabase;
      const { data: profile } = await clientToUse
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      isAdmin = profile?.role === 'admin';
    }

    if (!isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const usersMap = getOnlineUsersMap();
    const now = Date.now();

    // Clean up expired sessions first
    for (const id in usersMap) {
      if (now - usersMap[id].lastSeen > CLEANUP_THRESHOLD_MS) {
        delete usersMap[id];
      }
    }

    const onlineList = Object.values(usersMap).map(u => ({
      id: u.id,
      name: u.name,
      role: u.role,
      email: u.email,
      lastSeen: u.lastSeen
    }));

    return NextResponse.json({
      success: true,
      count: onlineList.length,
      users: onlineList
    });
  } catch (error: any) {
    console.error('Error handling heartbeat GET:', error);
    return NextResponse.json({ error: error.message || 'Error fetching online users' }, { status: 500 });
  }
}
