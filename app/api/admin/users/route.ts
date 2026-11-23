import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import { ensureAdmin } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

async function upsertProfileSafe(profilePayload: Record<string, any>) {
  let payload = { ...profilePayload };
  let { error } = await supabaseAdmin
    .from('profiles')
    .upsert(payload, { onConflict: 'id' });

  if (error && (error.message?.includes('has_changed_password') || error.code === 'PGRST100' || error.message?.includes('turma_id'))) {
    const cleaned = { ...payload };
    delete cleaned.has_changed_password;
    delete cleaned.turma_id;
    const retry = await supabaseAdmin.from('profiles').upsert(cleaned, { onConflict: 'id' });
    error = retry.error;
    payload = cleaned;
  }

  // If user_role_enum does not yet contain 'acompanhante', store 'convidado' in profiles
  // while keeping 'acompanhante' + turma_id intact in auth.user_metadata
  if (error && payload.role === 'acompanhante') {
    const fallbackPayload: Record<string, any> = { ...payload, role: 'convidado' };
    delete fallbackPayload.turma_id;
    const retry = await supabaseAdmin.from('profiles').upsert(fallbackPayload, { onConflict: 'id' });
    error = retry.error;
  }

  return error;
}

export async function GET() {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: 'Supabase Admin not configured. Please set SUPABASE_SERVICE_ROLE_KEY in Secrets.' }, { status: 500 });
  }
  try {
    const { data: { users: authUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      if (authError.message.includes('Invalid API key') || authError.message.includes('service_role')) {
        return NextResponse.json({ error: 'Chave de API do Supabase Inválida. Verifique o SUPABASE_SERVICE_ROLE_KEY nos Secrets.' }, { status: 401 });
      }
      throw authError;
    }

    const [{ data: profiles, error: profileError }, { data: turmas }] = await Promise.all([
      supabaseAdmin.from('profiles').select('*'),
      supabaseAdmin.from('turmas').select('id, nome, curso:cursos(nome)').is('deleted_at', null),
    ]);

    if (profileError) throw profileError;

    const turmaMap = new Map<string, string>();
    (turmas || []).forEach((t: any) => {
      const cursoNome = Array.isArray(t.curso) ? t.curso[0]?.nome : t.curso?.nome;
      turmaMap.set(t.id, cursoNome ? `${t.nome} (${cursoNome})` : t.nome);
    });

    const mergedUsers = authUsers.map((user: any) => {
      const profile = (profiles || []).find((p: any) => p.id === user.id);
      const resolvedRole =
        user.user_metadata?.role === 'acompanhante'
          ? 'acompanhante'
          : (profile?.role || user.user_metadata?.role || 'aluno');
      const turmaId = user.user_metadata?.turma_id || profile?.turma_id || null;

      return {
        id: user.id,
        email: user.email,
        full_name: profile?.full_name || user.user_metadata?.full_name || '',
        role: resolvedRole,
        grupo_responsavel: profile?.grupo_responsavel || user.user_metadata?.grupo_responsavel || null,
        turma_id: turmaId,
        turma_nome: turmaId ? turmaMap.get(turmaId) || null : null,
        has_changed_password: profile?.has_changed_password || false,
        created_at: user.created_at,
      };
    });

    return NextResponse.json(mergedUsers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authCheck = await ensureAdmin(request);
  if (!authCheck.allowed && authCheck.errorResponse) {
    return authCheck.errorResponse;
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: 'Supabase Admin not configured. Please set SUPABASE_SERVICE_ROLE_KEY in Secrets.' }, { status: 500 });
  }
  try {
    const { email, password, full_name, role, grupo_responsavel, turma_id } = await request.json();

    if (role === 'acompanhante' && !turma_id) {
      return NextResponse.json(
        { error: 'Selecione uma turma para vincular ao Acompanhante de Turma.' },
        { status: 400 }
      );
    }

    const effectiveTurmaId = role === 'acompanhante' ? (turma_id || null) : null;
    const effectiveGrupo = role === 'instrutor' ? (grupo_responsavel || null) : null;

    let authUser: any = null;
    let authError: any = null;

    try {
      const result = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name,
          role,
          grupo_responsavel: effectiveGrupo,
          turma_id: effectiveTurmaId,
        },
      });
      authUser = result.data;
      authError = result.error;
    } catch (err: any) {
      authError = err;
    }

    if (authError) {
      if (authError.message?.includes('Invalid API key') || authError.message?.includes('service_role')) {
        return NextResponse.json({ error: 'Erro de Configuração: Chave de API Inválida.' }, { status: 401 });
      }

      const isAlreadyRegistered =
        authError.message?.includes('already been registered') ||
        authError.message?.includes('email_exists') ||
        authError.status === 422 ||
        String(authError).includes('already been registered');

      if (isAlreadyRegistered) {
        let page = 1;
        let foundUser: any = null;
        while (true) {
          const { data: uList, error: listError } = await supabaseAdmin.auth.admin.listUsers({
            page,
            perPage: 1000,
          });
          if (listError || !uList?.users || uList.users.length === 0) {
            break;
          }
          const found = uList.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
          if (found) {
            foundUser = found;
            break;
          }
          if (uList.users.length < 1000) {
            break;
          }
          page++;
        }

        if (foundUser) {
          const updateData: any = {
            user_metadata: {
              ...(foundUser.user_metadata || {}),
              full_name,
              role,
              grupo_responsavel: effectiveGrupo,
              turma_id: effectiveTurmaId,
            },
          };
          if (password) {
            updateData.password = password;
          }
          const { data: updatedAuthUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(foundUser.id, updateData);
          if (updateError) throw updateError;
          authUser = { user: updatedAuthUser.user };
        } else {
          throw authError;
        }
      } else {
        throw authError;
      }
    }

    const profileError = await upsertProfileSafe({
      id: authUser.user.id,
      full_name: full_name || email.split('@')[0],
      role: role || 'aluno',
      grupo_responsavel: effectiveGrupo,
      turma_id: effectiveTurmaId,
    });

    if (profileError) {
      console.error('Profile creation error:', profileError);
    }

    return NextResponse.json({ user: authUser.user });
  } catch (error: any) {
    console.error('Admin API POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const authCheck = await ensureAdmin(request);
  if (!authCheck.allowed && authCheck.errorResponse) {
    return authCheck.errorResponse;
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: 'Supabase Admin not configured. Please set SUPABASE_SERVICE_ROLE_KEY in Secrets.' }, { status: 500 });
  }
  try {
    const { id, email, password, full_name, role, grupo_responsavel, turma_id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório para atualização.' }, { status: 400 });
    }

    if (role === 'acompanhante' && !turma_id) {
      return NextResponse.json(
        { error: 'Selecione uma turma para vincular ao Acompanhante de Turma.' },
        { status: 400 }
      );
    }

    const effectiveTurmaId = role === 'acompanhante' ? (turma_id || null) : null;
    const effectiveGrupo = role === 'instrutor' ? (grupo_responsavel || null) : null;

    const { data: existingAuthData } = await supabaseAdmin.auth.admin.getUserById(id);
    const existingMeta = existingAuthData?.user?.user_metadata || {};

    const updateData: any = {};
    if (email && typeof email === 'string' && email.trim()) {
      updateData.email = email.trim();
    }
    if (password && typeof password === 'string' && password.trim()) {
      updateData.password = password.trim();
    }

    updateData.user_metadata = {
      ...existingMeta,
      full_name: full_name || '',
      role: role || 'aluno',
      grupo_responsavel: effectiveGrupo,
      turma_id: effectiveTurmaId,
    };

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, updateData);
    if (authError) {
      if (authError.message.includes('Invalid API key') || authError.message.includes('service_role')) {
        return NextResponse.json({ error: 'Erro de Configuração: Chave de API Inválida.' }, { status: 401 });
      }
      throw authError;
    }

    const profileUpdateData: any = {
      id,
      full_name: full_name || '',
      role: role || 'aluno',
      grupo_responsavel: effectiveGrupo,
      turma_id: effectiveTurmaId,
    };
    if (password && typeof password === 'string' && password.trim()) {
      profileUpdateData.has_changed_password = false;
    }

    const profileError = await upsertProfileSafe(profileUpdateData);
    if (profileError) throw profileError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Admin API PUT error detailed:', error);
    return NextResponse.json({
      error: error.message || 'Erro desconhecido na atualização do usuário',
      details: error.message || String(error),
    }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const authCheck = await ensureAdmin(request);
  if (!authCheck.allowed && authCheck.errorResponse) {
    return authCheck.errorResponse;
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: 'Supabase Admin not configured. Please set SUPABASE_SERVICE_ROLE_KEY in Secrets.' }, { status: 500 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
