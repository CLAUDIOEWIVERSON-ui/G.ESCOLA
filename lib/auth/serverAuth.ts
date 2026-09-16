import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/admin';

export type UserRole = 'admin' | 'instrutor' | 'aluno' | 'convidado';

export interface AuthCheckResult {
  allowed: boolean;
  user: any | null;
  role: UserRole | null;
  isConvidado: boolean;
  isAdmin: boolean;
  isInstrutor: boolean;
  isAluno: boolean;
  errorResponse?: NextResponse;
}

/**
 * Resolves the authenticated user and their active role from session cookies / auth headers / profiles.
 */
export async function getAuthUserRole(request?: Request): Promise<{ user: any | null; role: UserRole | null }> {
  try {
    const supabase = await createClient();
    let user: any = null;

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (!authError && authData?.user) {
      user = authData.user;
    }

    // Fallback: check Authorization header directly if user was not found via cookies
    if (!user && request) {
      const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7).trim();
        if (token && isSupabaseAdminConfigured()) {
          const { data: adminAuthData } = await supabaseAdmin.auth.getUser(token);
          if (adminAuthData?.user) {
            user = adminAuthData.user;
          }
        }
      }
    }

    if (!user) {
      return { user: null, role: null };
    }

    const SUPER_ADMIN_EMAIL = 'claudiomarinha2012@gmail.com';
    if (user.email === SUPER_ADMIN_EMAIL) {
      return { user, role: 'admin' };
    }

    // Check profiles table for the actual role
    if (isSupabaseAdminConfigured()) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.role) {
        return { user, role: profile.role as UserRole };
      }
    }

    // Fallback to user metadata
    const metaRole = (user.user_metadata?.role as UserRole) || 'aluno';
    return { user, role: metaRole };
  } catch (err) {
    console.error('Error resolving user auth in serverAuth:', err);
    return { user: null, role: null };
  }
}

/**
 * Validates that the request is NOT made by a guest ('convidado').
 * Guests have strictly read-only access and are forbidden from modifying or deleting data.
 */
export async function ensureNotGuest(request?: Request): Promise<AuthCheckResult> {
  const { user, role } = await getAuthUserRole(request);

  const isConvidado = role === 'convidado';
  const isAdmin = role === 'admin';
  const isInstrutor = role === 'instrutor';
  const isAluno = role === 'aluno';

  if (isConvidado) {
    return {
      allowed: false,
      user,
      role,
      isConvidado: true,
      isAdmin: false,
      isInstrutor: false,
      isAluno: false,
      errorResponse: NextResponse.json(
        {
          error: 'Acesso negado: Usuários com perfil de convidado possuem permissão exclusivamente de leitura. Não é permitido criar, alterar ou apagar dados.',
          code: 'FORBIDDEN_GUEST_READ_ONLY'
        },
        { status: 403 }
      )
    };
  }

  return {
    allowed: true,
    user,
    role,
    isConvidado: false,
    isAdmin,
    isInstrutor,
    isAluno
  };
}

/**
 * Validates that the request is made by an administrator.
 */
export async function ensureAdmin(request?: Request): Promise<AuthCheckResult> {
  const { user, role } = await getAuthUserRole(request);

  const isConvidado = role === 'convidado';
  const isAdmin = role === 'admin';
  const isInstrutor = role === 'instrutor';
  const isAluno = role === 'aluno';

  if (!user) {
    return {
      allowed: false,
      user: null,
      role: null,
      isConvidado: false,
      isAdmin: false,
      isInstrutor: false,
      isAluno: false,
      errorResponse: NextResponse.json(
        { error: 'Não autenticado. Faça login para continuar.', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    };
  }

  if (isConvidado) {
    return {
      allowed: false,
      user,
      role,
      isConvidado: true,
      isAdmin: false,
      isInstrutor: false,
      isAluno: false,
      errorResponse: NextResponse.json(
        {
          error: 'Acesso negado: Usuários com perfil de convidado possuem permissão exclusivamente de leitura. Não é permitido criar, alterar ou apagar dados.',
          code: 'FORBIDDEN_GUEST_READ_ONLY'
        },
        { status: 403 }
      )
    };
  }

  if (!isAdmin) {
    return {
      allowed: false,
      user,
      role,
      isConvidado: false,
      isAdmin: false,
      isInstrutor,
      isAluno,
      errorResponse: NextResponse.json(
        { error: 'Acesso restrito a administradores.', code: 'FORBIDDEN' },
        { status: 403 }
      )
    };
  }

  return {
    allowed: true,
    user,
    role,
    isConvidado: false,
    isAdmin: true,
    isInstrutor: false,
    isAluno: false
  };
}
