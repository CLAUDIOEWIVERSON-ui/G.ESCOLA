import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export type Role = 'admin' | 'instrutor' | 'aluno';

export async function getSession() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getUserRole(userId: string): Promise<Role | null> {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
  
  return (profile?.role as Role) || null;
}

export async function requireRole(allowedRoles: Role[]) {
  const session = await getSession();
  
  if (!session) {
    return { authorized: false, response: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }) };
  }

  // Hardcode super admin
  const SUPER_ADMIN_EMAIL = 'claudiomarinha2012@gmail.com';
  if (session.user.email === SUPER_ADMIN_EMAIL) {
    return { authorized: true, session };
  }

  const role = await getUserRole(session.user.id);
  
  if (!role || !allowedRoles.includes(role)) {
    return { authorized: false, response: NextResponse.json({ error: 'Acesso Negado' }, { status: 403 }) };
  }

  return { authorized: true, session, role };
}

export async function requireAdmin() {
  return requireRole(['admin']);
}

export async function requireInstructorOrAdmin() {
  return requireRole(['admin', 'instrutor']);
}

export async function getStudentIdByEmail(email: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('alunos')
    .select('id')
    .eq('email', email)
    .single();
  return data?.id;
}
