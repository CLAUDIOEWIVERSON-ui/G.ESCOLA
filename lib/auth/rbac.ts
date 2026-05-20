import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export type Role = 'admin' | 'instrutor' | 'aluno';

export async function getSession() {
  const supabase = await createClient();
  
  // 1. Tenta obter a sessão de forma padrão (via cookies)
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) return session;
  } catch (err) {
    // getSession falhou ou deu erro de cookies, continua para os fallbacks
  }

  // 2. Tenta obter o token diretamente do header Authorization (Bearer token)
  try {
    const headersList = await headers();
    const authHeader = headersList.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (token) {
        // Tenta buscar o usuário diretamente pelo token JWT
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (user && !error) {
          return { user } as any;
        }
      }
    }
  } catch (err) {
    // headers() pode não estar disponível no contexto de build estático
  }
  
  // 3. Como fallback final, tenta obter o usuário sem token (pode estar nos cookies)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      return { user } as any;
    }
  } catch (err) {
    // ignora falhas de obtenção silenciosas
  }
  
  return null;
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
