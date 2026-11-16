import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import { ensureNotGuest, getAuthUserRole } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { user, role } = await getAuthUserRole(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    if (role === 'aluno') {
      return NextResponse.json({ error: 'Acesso restrito.' }, { status: 403 });
    }

    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ success: true, templates: [], storageMode: 'local' });
    }

    const { data, error } = await supabaseAdmin
      .from('certificados')
      .select('id, aluno_id, turma_id, curso_id, tipo, template_data, data_emissao, created_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      const code = String(error.code || '');
      const msg = String(error.message || '');
      if (code === '42P01' || msg.includes('does not exist') || msg.includes('schema cache')) {
        return NextResponse.json({ success: true, templates: [], storageMode: 'local' });
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      templates: data || [],
      storageMode: 'supabase',
    });
  } catch (err: any) {
    console.error('[GET /api/certificados error]:', err);
    return NextResponse.json(
      { error: err?.message || 'Erro ao carregar modelos de certificado.' },
      { status: 500 }
    );
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
    const { id, turma_id, curso_id, aluno_id, template_data } = body || {};

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
        .select('*')
        .maybeSingle();
    } else {
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
