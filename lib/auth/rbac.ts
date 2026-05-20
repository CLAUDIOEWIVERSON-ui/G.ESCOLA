import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export type Role = 'admin' | 'instrutor' | 'aluno';

export async function getSession() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getUserRole(userId: string): Promise<Role | null> {
  return 'admin';
}

export async function requireRole(allowedRoles: Role[]) {
  const session = await getSession();
  
  if (!session) {
    return { authorized: false, response: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }) };
  }

  // Todos os usuários autenticados são administradores
  return { authorized: true, session, role: 'admin' as Role };
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
