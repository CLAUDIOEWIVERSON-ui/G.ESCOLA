import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const SUPER_ADMIN_EMAIL = 'claudiomarinha2012@gmail.com';

export async function GET(request: NextRequest) {
  try {
    let user: any = null;

    // 1. Prioriza token Bearer enviado pelo cliente (funciona mesmo se cookies estiverem bloqueados em iframe)
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      if (token && isSupabaseAdminConfigured()) {
        const { data: adminAuthData, error: tokenErr } = await supabaseAdmin.auth.getUser(token);
        if (!tokenErr && adminAuthData?.user) {
          user = adminAuthData.user;
        }
      }
    }

    // 2. Fallback para sessão via cookies SSR
    if (!user) {
      const supabase = await createClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (!authError && authData?.user) {
        user = authData.user;
      }
    }

    if (!user) {
      return NextResponse.json({ authenticated: false, profile: null }, { status: 401 });
    }

    const userEmail = user.email || '';
    const isSuperAdminEmail = userEmail.toLowerCase() === SUPER_ADMIN_EMAIL;
    const meta = user.user_metadata || {};

    let profileRow: any = null;
    if (isSupabaseAdminConfigured()) {
      const { data } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      profileRow = data;

      // Sincroniza registro em profiles se ainda não existir ou se for super admin
      if (!profileRow || (isSuperAdminEmail && profileRow.role !== 'admin')) {
        const targetRole = isSuperAdminEmail ? 'admin' : (profileRow?.role || meta.role || 'aluno');
        const targetName = profileRow?.full_name || meta.full_name || userEmail.split('@')[0] || 'Usuário';

        const upsertPayload: any = {
          id: user.id,
          role: targetRole,
          full_name: targetName,
          created_at: profileRow?.created_at || new Date().toISOString(),
        };
        if (meta.grupo_responsavel && !profileRow?.grupo_responsavel) {
          upsertPayload.grupo_responsavel = meta.grupo_responsavel;
        }

        const { data: synced } = await supabaseAdmin
          .from('profiles')
          .upsert(upsertPayload, { onConflict: 'id' })
          .select('*')
          .maybeSingle();

        if (synced) {
          profileRow = synced;
        }
      }
    }

    const resolvedRole = isSuperAdminEmail
      ? 'admin'
      : (profileRow?.role || meta.role || 'aluno');

    const isShadowStudentEmail = userEmail.startsWith('aluno_nif_') || userEmail.endsWith('@aluno.escola.digital');
    const isNifStudent = Boolean(
      resolvedRole === 'aluno' &&
      (meta.isNifStudent || isShadowStudentEmail || profileRow?.student_id)
    );

    let studentId =
      profileRow?.student_id ||
      meta.student_id ||
      (userEmail.startsWith('aluno_nif_') ? userEmail.replace('aluno_nif_', '').split('@')[0] : undefined);

    let alunoRow: any = null;
    let turmaRow: any = null;
    let accessCodeRow: any = null;

    if (resolvedRole === 'aluno' && isSupabaseAdminConfigured()) {
      if (studentId) {
        const { data } = await supabaseAdmin
          .from('alunos')
          .select('*')
          .eq('id', studentId)
          .is('deleted_at', null)
          .maybeSingle();
        alunoRow = data;
      }

      if (!alunoRow && userEmail && !isShadowStudentEmail) {
        const { data } = await supabaseAdmin
          .from('alunos')
          .select('*')
          .eq('email', userEmail)
          .is('deleted_at', null)
          .maybeSingle();
        alunoRow = data;
      }

      if (!alunoRow && (profileRow?.full_name || meta.full_name)) {
        const nameSearch = (profileRow?.full_name || meta.full_name).trim();
        const { data } = await supabaseAdmin
          .from('alunos')
          .select('*')
          .ilike('nome', nameSearch)
          .is('deleted_at', null)
          .limit(1)
          .maybeSingle();
        alunoRow = data;
      }

      if (alunoRow) {
        studentId = alunoRow.id;
        if (alunoRow.turma_id) {
          const { data: tData } = await supabaseAdmin
            .from('turmas')
            .select('id, nome, status, periodo, data_inicio, data_fim, data_postergacao, liberar_formularios, localizacao, grupo_responsavel, curso:cursos(id, nome, codigo, sigla, grupo_responsavel)')
            .eq('id', alunoRow.turma_id)
            .maybeSingle();
          turmaRow = tData;
        }

        const { data: codeData } = await supabaseAdmin
          .from('student_access_codes')
          .select('access_code')
          .eq('student_id', alunoRow.id)
          .maybeSingle();
        accessCodeRow = codeData;
      }
    }

    const fullName =
      alunoRow?.nome ||
      profileRow?.full_name ||
      meta.full_name ||
      (isShadowStudentEmail ? 'Aluno' : userEmail.split('@')[0]) ||
      'Usuário';

    const fotoUrl =
      alunoRow?.foto_url ||
      profileRow?.foto_url ||
      meta.foto_url ||
      meta.avatar_url ||
      undefined;

    const resolvedProfile = {
      id: user.id,
      email: userEmail,
      full_name: fullName,
      nome: alunoRow?.nome || fullName,
      nome_guerra: alunoRow?.nome_guerra || profileRow?.nome_guerra || meta.nome_guerra || undefined,
      posto_graduacao: alunoRow?.posto_graduacao || profileRow?.posto_graduacao || meta.posto_graduacao || undefined,
      role: resolvedRole,
      foto_url: fotoUrl,
      avatar_url: fotoUrl,
      om: alunoRow?.om || profileRow?.om || meta.om || undefined,
      nip: alunoRow?.nip || alunoRow?.nif || profileRow?.nip || meta.nip || undefined,
      matricula: alunoRow?.matricula || undefined,
      turma_id: alunoRow?.turma_id || profileRow?.turma_id || meta.turma_id || undefined,
      turma_nome: turmaRow?.nome || undefined,
      turma_status: turmaRow?.status || undefined,
      turma_periodo: turmaRow?.periodo || undefined,
      turma_grupo: turmaRow?.grupo_responsavel || turmaRow?.curso?.grupo_responsavel || undefined,
      curso_nome: turmaRow?.curso?.nome || undefined,
      liberar_formularios: turmaRow?.liberar_formularios ?? false,
      data_fim: turmaRow?.data_fim || undefined,
      data_postergacao: turmaRow?.data_postergacao || undefined,
      student_id: studentId || undefined,
      student_email: alunoRow?.email || undefined,
      access_code: accessCodeRow?.access_code || undefined,
      has_changed_password: profileRow?.has_changed_password ?? true,
      grupo_responsavel: profileRow?.grupo_responsavel || meta.grupo_responsavel || undefined,
      isNifStudent,
    };

    return NextResponse.json({
      authenticated: true,
      profile: resolvedProfile,
    });
  } catch (error: any) {
    console.error('[api/auth/me] Error resolving user profile:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao carregar dados do usuário autenticado.' },
      { status: 500 }
    );
  }
}
