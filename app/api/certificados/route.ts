import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import { ensureNotGuest, getAuthUserRole } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

async function fetchCertificadosRowsSafe(): Promise<{
  rows: any[];
  fallbackLocal: boolean;
  errorSummary?: string;
}> {
  const attempts: Array<() => Promise<{ data: any[] | null; error: any }>> = [
    async () =>
      await supabaseAdmin
        .from('certificados')
        .select('id, aluno_id, turma_id, curso_id, tipo, template_data, data_emissao, created_at')
        .is('deleted_at', null)
        .order('data_emissao', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(80),
    async () =>
      await supabaseAdmin
        .from('certificados')
        .select('id, aluno_id, turma_id, curso_id, tipo, template_data, created_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(40),
    async () =>
      await supabaseAdmin
        .from('certificados')
        .select('id, aluno_id, turma_id, curso_id, tipo, template_data, created_at')
        .order('created_at', { ascending: false })
        .limit(30),
  ];

  let lastError: any = null;
  for (const runAttempt of attempts) {
    try {
      const { data, error } = await runAttempt();
      if (!error) {
        return { rows: data || [], fallbackLocal: false };
      }
      lastError = error;
      const code = String(error?.code || '');
      const msg = String(error?.message || '');
      if (code === '42P01' || (msg.includes('relation') && msg.includes('does not exist'))) {
        return { rows: [], fallbackLocal: true };
      }
    } catch (err) {
      lastError = err;
    }
  }

  const summary =
    lastError?.message ||
    (lastError && typeof lastError === 'object' ? JSON.stringify(lastError) : String(lastError || 'Erro desconhecido'));
  return { rows: [], fallbackLocal: true, errorSummary: summary };
}

export async function GET(req: NextRequest) {
  try {
    const { user, role } = await getAuthUserRole(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    if (role === 'aluno') {
      return NextResponse.json({ error: 'Acesso restrito.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const requestType = searchParams.get('type');
    const includeLibrary = searchParams.get('includeLibrary') === '1';

    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json(
        requestType === 'library'
          ? { success: true, assets: [], storageMode: 'local' }
          : {
              success: true,
              templates: [],
              ...(includeLibrary ? { assets: [] } : {}),
              storageMode: 'local',
            }
      );
    }

    const { rows, fallbackLocal, errorSummary } = await fetchCertificadosRowsSafe();

    if (fallbackLocal && errorSummary) {
      console.warn('[GET /api/certificados] Usando fallback local:', errorSummary);
    }

    const assets = rows
      .filter((row: any) => Boolean(row?.template_data?.__isAssetLibrary))
      .map((row: any) => ({
        ...row.template_data,
        id: row.id,
        createdAt: row.created_at,
      }));

    if (requestType === 'library') {
      return NextResponse.json({
        success: true,
        assets,
        storageMode: fallbackLocal ? 'local' : 'supabase',
      });
    }

    const templates = rows.filter((row: any) => !row?.template_data?.__isAssetLibrary);

    return NextResponse.json({
      success: true,
      templates,
      ...(includeLibrary ? { assets } : {}),
      storageMode: fallbackLocal ? 'local' : 'supabase',
    });
  } catch (err: any) {
    const errText =
      err?.message || (err && typeof err === 'object' ? JSON.stringify(err) : String(err || 'Erro desconhecido'));
    console.warn('[GET /api/certificados] Falha tratada com fallback local:', errText);
    return NextResponse.json({
      success: true,
      templates: [],
      assets: [],
      storageMode: 'local',
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await ensureNotGuest(req);
    if (!auth.allowed && auth.errorResponse) {
      return auth.errorResponse;
    }
    if (!auth.user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    if (!auth.isAdmin && !auth.isInstrutor) {
      return NextResponse.json(
        { error: 'Apenas administradores e instrutores podem salvar modelos de certificados.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { id, turma_id, curso_id, aluno_id, template_data, isAssetLibrary, asset_data } =
      body || {};

    if (isAssetLibrary && asset_data && typeof asset_data === 'object') {
      const libraryPayloadData = {
        ...asset_data,
        __isAssetLibrary: true,
      };
      if (!isSupabaseAdminConfigured()) {
        return NextResponse.json({
          success: true,
          storageMode: 'local',
          data: {
            id: id || `local-asset-${Date.now()}`,
            ...libraryPayloadData,
          },
        });
      }

      const payload = {
        aluno_id: null,
        turma_id: null,
        curso_id: null,
        tipo: 'certificado',
        template_data: libraryPayloadData,
        data_emissao: new Date().toISOString(),
      };

      const isExistingPersistedAssetId =
        Boolean(id) &&
        !String(id).startsWith('local-') &&
        !String(id).startsWith('builtin-') &&
        !String(id).startsWith('tpl-');

      const insertRes = isExistingPersistedAssetId
        ? await supabaseAdmin
            .from('certificados')
            .update(payload)
            .eq('id', id)
            .is('deleted_at', null)
            .select('*')
            .maybeSingle()
        : await supabaseAdmin
            .from('certificados')
            .insert([payload])
            .select('*')
            .maybeSingle();

      if (insertRes.error) {
        const code = String(insertRes.error.code || '');
        const msg = String(insertRes.error.message || '');
        if (code === '42P01' || msg.includes('does not exist') || msg.includes('schema cache')) {
          return NextResponse.json({
            success: true,
            storageMode: 'local',
            data: {
              id: id || `local-asset-${Date.now()}`,
              ...libraryPayloadData,
            },
          });
        }
        throw insertRes.error;
      }

      return NextResponse.json({
        success: true,
        storageMode: 'supabase',
        data: {
          ...libraryPayloadData,
          id: insertRes.data?.id || id || `asset-${Date.now()}`,
          createdAt: insertRes.data?.created_at,
        },
      });
    }

    if (!template_data || typeof template_data !== 'object') {
      return NextResponse.json({ error: 'Dados do modelo inválidos.' }, { status: 400 });
    }

    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({
        success: true,
        storageMode: 'local',
        data: {
          id: id || `local-${Date.now()}`,
          turma_id: turma_id || null,
          curso_id: curso_id || null,
          aluno_id: aluno_id || null,
          tipo: 'certificado',
          template_data,
          data_emissao: new Date().toISOString(),
        },
      });
    }

    const payload = {
      aluno_id: aluno_id || null,
      turma_id: turma_id || null,
      curso_id: curso_id || null,
      tipo: 'certificado',
      template_data,
      data_emissao: new Date().toISOString(),
    };

    let result;
    if (id && !String(id).startsWith('local-') && !String(id).startsWith('preset_')) {
      result = await supabaseAdmin
        .from('certificados')
        .update(payload)
        .eq('id', id)
        .is('deleted_at', null)
        .select('*')
        .maybeSingle();
    } else if (turma_id) {
      const existingByTurma = await supabaseAdmin
        .from('certificados')
        .select('id')
        .eq('turma_id', turma_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingByTurma.data?.id) {
        result = await supabaseAdmin
          .from('certificados')
          .update(payload)
          .eq('id', existingByTurma.data.id)
          .select('*')
          .maybeSingle();
      } else {
        result = await supabaseAdmin
          .from('certificados')
          .insert([payload])
          .select('*')
          .maybeSingle();
      }
    } else {
      result = await supabaseAdmin
        .from('certificados')
        .insert([payload])
        .select('*')
        .maybeSingle();
    }

    if (!result.error && !result.data) {
      result = await supabaseAdmin
        .from('certificados')
        .insert([payload])
        .select('*')
        .maybeSingle();
    }

    if (result.error) {
      const code = String(result.error.code || '');
      const msg = String(result.error.message || '');
      if (code === '42P01' || msg.includes('does not exist') || msg.includes('schema cache')) {
        return NextResponse.json({
          success: true,
          storageMode: 'local',
          data: {
            id: id || `local-${Date.now()}`,
            ...payload,
          },
        });
      }
      throw result.error;
    }

    return NextResponse.json({
      success: true,
      storageMode: 'supabase',
      data: result.data,
    });
  } catch (err: any) {
    console.error('[POST /api/certificados error]:', err);
    return NextResponse.json(
      { error: err?.message || 'Erro ao salvar modelo de certificado.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await ensureNotGuest(req);
    if (!auth.allowed && auth.errorResponse) {
      return auth.errorResponse;
    }
    if (!auth.user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    if (!auth.isAdmin && !auth.isInstrutor) {
      return NextResponse.json(
        { error: 'Apenas administradores e instrutores podem excluir modelos.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID do modelo não informado.' }, { status: 400 });
    }

    if (!isSupabaseAdminConfigured() || id.startsWith('local-')) {
      return NextResponse.json({ success: true, storageMode: 'local' });
    }

    const { error } = await supabaseAdmin
      .from('certificados')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      const code = String(error.code || '');
      const msg = String(error.message || '');
      if (code === '42P01' || msg.includes('does not exist') || msg.includes('schema cache')) {
        return NextResponse.json({ success: true, storageMode: 'local' });
      }
      throw error;
    }

    return NextResponse.json({ success: true, storageMode: 'supabase' });
  } catch (err: any) {
    console.error('[DELETE /api/certificados error]:', err);
    return NextResponse.json(
      { error: err?.message || 'Erro ao excluir modelo de certificado.' },
      { status: 500 }
    );
  }
}
