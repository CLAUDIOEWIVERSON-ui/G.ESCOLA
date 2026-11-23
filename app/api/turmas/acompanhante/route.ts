import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserRole } from '@/lib/auth/serverAuth';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import {
  generateMonitorAccessCode,
  listAllMonitors,
  removeMonitorForTurma,
  saveMonitorAccessRecord,
  upsertProfileSafe,
  type TurmaMonitorRecord,
} from '@/lib/auth/acompanhanteQrStore';

export const dynamic = 'force-dynamic';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function resolveCallerGroup(user: any): Promise<string | null> {
  if (user?.user_metadata?.grupo_responsavel) {
    return String(user.user_metadata.grupo_responsavel);
  }
  const { data: prof } = await supabaseAdmin
    .from('profiles')
    .select('grupo_responsavel')
    .eq('id', user.id)
    .maybeSingle();
  return prof?.grupo_responsavel ? String(prof.grupo_responsavel) : null;
}

function canInstructorManageGroup(callerGroup: string | null, turmaGroup: string | null): boolean {
  if (!callerGroup) return false;
  if (callerGroup === 'AMBOS') {
    return !turmaGroup || turmaGroup === 'MAN' || turmaGroup === 'GAT' || turmaGroup === 'AMBOS';
  }
  return Boolean(turmaGroup && (callerGroup === turmaGroup || turmaGroup === 'AMBOS'));
}

export async function GET(req: NextRequest) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: 'Supabase Admin não configurado.' },
      { status: 500 }
    );
  }

  try {
    const { user, role } = await getAuthUserRole(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const turmaIdFilter = searchParams.get('turma_id');
    if (turmaIdFilter && !UUID_REGEX.test(turmaIdFilter)) {
      return NextResponse.json({ error: 'turma_id inválido.' }, { status: 400 });
    }

    const [monitors, { data: turmasData }] = await Promise.all([
      listAllMonitors(),
      supabaseAdmin
        .from('turmas')
        .select('id, grupo_responsavel, curso:cursos(grupo_responsavel)')
        .is('deleted_at', null),
    ]);

    const turmaGroupMap = new Map<string, string | null>();
    (turmasData || []).forEach((t: any) => {
      const cursoObj = Array.isArray(t.curso) ? t.curso[0] : t.curso;
      turmaGroupMap.set(t.id, t.grupo_responsavel || cursoObj?.grupo_responsavel || null);
    });

    const callerGroup = role === 'instrutor' ? await resolveCallerGroup(user) : null;

    const filtered = turmaIdFilter
      ? monitors.filter((m) => m.turma_id === turmaIdFilter)
      : monitors;

    const sanitized = filtered.map((m) => {
      const turmaGroup = turmaGroupMap.get(m.turma_id) || null;
      const canViewQr =
        role === 'admin' ||
        (role === 'instrutor' && canInstructorManageGroup(callerGroup, turmaGroup));

      if (canViewQr) {
        return {
          turma_id: m.turma_id,
          user_id: m.user_id,
          full_name: m.full_name,
          email: m.email || null,
          access_code: m.access_code,
          last_login: m.last_login || null,
          login_count: m.login_count || 0,
          updated_at: m.updated_at,
        };
      }

      // Non-staff roles (aluno, convidado, acompanhante) ONLY receive the monitor's name
      return {
        turma_id: m.turma_id,
        full_name: m.full_name,
      };
    });

    return NextResponse.json({ monitors: sanitized });
  } catch (error: any) {
    console.error('[api/turmas/acompanhante GET] error:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao carregar monitores das turmas.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: 'Supabase Admin não configurado.' },
      { status: 500 }
    );
  }

  try {
    const { user, role } = await getAuthUserRole(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    if (role !== 'admin' && role !== 'instrutor') {
      return NextResponse.json(
        { error: 'Acesso negado: somente administradores ou instrutores autorizados podem definir o monitor da turma.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    const turmaId = typeof body?.turma_id === 'string' ? body.turma_id.trim() : '';
    const fullName = typeof body?.full_name === 'string' ? body.full_name.trim().slice(0, 160) : '';
    const rawEmail = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const regenerateQr = body?.regenerate_qr === true;

    if (!turmaId || !UUID_REGEX.test(turmaId)) {
      return NextResponse.json({ error: 'ID da turma inválido.' }, { status: 400 });
    }

    if (!fullName) {
      return NextResponse.json({ error: 'Informe o nome do Monitor da Turma.' }, { status: 400 });
    }

    if (rawEmail && !EMAIL_REGEX.test(rawEmail)) {
      return NextResponse.json({ error: 'Informe um e-mail válido ou deixe em branco para acesso exclusivo via QR Code.' }, { status: 400 });
    }

    const { data: turmaRow, error: turmaErr } = await supabaseAdmin
      .from('turmas')
      .select('id, nome, status, deleted_at, grupo_responsavel, curso:cursos(grupo_responsavel)')
      .eq('id', turmaId)
      .maybeSingle();

    if (turmaErr || !turmaRow || turmaRow.deleted_at) {
      return NextResponse.json({ error: 'Turma não encontrada.' }, { status: 404 });
    }

    if (role === 'instrutor') {
      const callerGroup = await resolveCallerGroup(user);
      const cursoObj = Array.isArray(turmaRow.curso) ? turmaRow.curso[0] : turmaRow.curso;
      const turmaGroup = turmaRow.grupo_responsavel || cursoObj?.grupo_responsavel || null;
      if (!canInstructorManageGroup(callerGroup, turmaGroup)) {
        return NextResponse.json(
          { error: 'Você não tem permissão para alterar o monitor desta turma.' },
          { status: 403 }
        );
      }
    }

    const allMonitors = await listAllMonitors();
    const existingMonitor = allMonitors.find((m) => m.turma_id === turmaId);

    const shadowEmail = `acompanhante_turma_${turmaId}@monitor.escola.digital`;
    const targetEmail = rawEmail || existingMonitor?.email || shadowEmail;
    const accessCode = regenerateQr || !existingMonitor?.access_code
      ? generateMonitorAccessCode()
      : existingMonitor.access_code;

    let targetUser: any = null;

    if (existingMonitor?.user_id) {
      const { data: existingAuth } = await supabaseAdmin.auth.admin.getUserById(existingMonitor.user_id);
      if (existingAuth?.user) {
        targetUser = existingAuth.user;
      }
    }

    if (!targetUser) {
      let page = 1;
      while (page <= 10) {
        const { data: uList, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage: 1000,
        });
        if (listErr || !uList?.users?.length) break;
        const found = uList.users.find(
          (u: any) =>
            u.email?.toLowerCase() === targetEmail.toLowerCase() ||
            (u.user_metadata?.role === 'acompanhante' && u.user_metadata?.turma_id === turmaId)
        );
        if (found) {
          targetUser = found;
          break;
        }
        if (uList.users.length < 1000) break;
        page++;
      }
    }

    if (targetUser) {
      // Never downgrade an admin or instructor account to acompanhante
      const existingRole = targetUser.user_metadata?.role;
      if (existingRole === 'admin' || existingRole === 'instrutor') {
        return NextResponse.json(
          { error: 'Este e-mail pertence a um administrador ou instrutor e não pode ser convertido em monitor de turma.' },
          { status: 409 }
        );
      }

      const updatePayload: any = {
        email_confirm: true,
        user_metadata: {
          ...(targetUser.user_metadata || {}),
          full_name: fullName,
          role: 'acompanhante',
          grupo_responsavel: null,
          turma_id: turmaId,
          acompanhante_access_code: accessCode,
          is_turma_monitor: true,
        },
      };

      if (rawEmail && rawEmail !== targetUser.email?.toLowerCase()) {
        updatePayload.email = rawEmail;
      }

      const { data: updatedAuth, error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
        targetUser.id,
        updatePayload
      );
      if (updateErr) {
        throw updateErr;
      }
      targetUser = updatedAuth.user;
    } else {
      const randomPassword = crypto.randomBytes(24).toString('base64url');
      const { data: createdAuth, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: targetEmail,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role: 'acompanhante',
          grupo_responsavel: null,
          turma_id: turmaId,
          acompanhante_access_code: accessCode,
          is_turma_monitor: true,
        },
      });
      if (createErr) {
        throw createErr;
      }
      targetUser = createdAuth.user;
    }

    if (!targetUser?.id) {
      throw new Error('Não foi possível criar ou localizar o usuário do monitor.');
    }

    await upsertProfileSafe({
      id: targetUser.id,
      full_name: fullName,
      role: 'acompanhante',
      grupo_responsavel: null,
      turma_id: turmaId,
    });

    const nowIso = new Date().toISOString();
    const record: TurmaMonitorRecord = {
      turma_id: turmaId,
      user_id: targetUser.id,
      full_name: fullName,
      email: targetUser.email && !targetUser.email.endsWith('@monitor.escola.digital') ? targetUser.email : undefined,
      access_code: accessCode,
      access_status: 'active',
      last_login: existingMonitor?.last_login || null,
      login_count: existingMonitor?.login_count || 0,
      created_at: existingMonitor?.created_at || nowIso,
      updated_at: nowIso,
    };

    await saveMonitorAccessRecord(record);

    return NextResponse.json({
      success: true,
      monitor: {
        turma_id: record.turma_id,
        user_id: record.user_id,
        full_name: record.full_name,
        email: record.email || null,
        access_code: record.access_code,
        last_login: record.last_login || null,
        login_count: record.login_count || 0,
        updated_at: record.updated_at,
      },
    });
  } catch (error: any) {
    console.error('[api/turmas/acompanhante POST] error:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao salvar monitor da turma.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: 'Supabase Admin não configurado.' },
      { status: 500 }
    );
  }

  try {
    const { user, role } = await getAuthUserRole(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    if (role !== 'admin' && role !== 'instrutor') {
      return NextResponse.json(
        { error: 'Acesso negado.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const turmaId = (searchParams.get('turma_id') || '').trim();
    if (!turmaId || !UUID_REGEX.test(turmaId)) {
      return NextResponse.json({ error: 'turma_id inválido.' }, { status: 400 });
    }

    if (role === 'instrutor') {
      const { data: turmaRow } = await supabaseAdmin
        .from('turmas')
        .select('id, grupo_responsavel, curso:cursos(grupo_responsavel)')
        .eq('id', turmaId)
        .maybeSingle();

      const callerGroup = await resolveCallerGroup(user);
      const cursoObj = Array.isArray(turmaRow?.curso) ? turmaRow.curso[0] : turmaRow?.curso;
      const turmaGroup = turmaRow?.grupo_responsavel || cursoObj?.grupo_responsavel || null;
      if (!canInstructorManageGroup(callerGroup, turmaGroup)) {
        return NextResponse.json(
          { error: 'Você não tem permissão para remover o monitor desta turma.' },
          { status: 403 }
        );
      }
    }

    await removeMonitorForTurma(turmaId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[api/turmas/acompanhante DELETE] error:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao remover monitor da turma.' },
      { status: 500 }
    );
  }
}
