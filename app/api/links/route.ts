import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

async function checkAdminAuthorization() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return { authorized: false, error: 'Não autenticado', status: 401 };
  }

  const SUPER_ADMIN_EMAIL = 'claudiomarinha2012@gmail.com';
  const isSuperAdminEmail = user.email === SUPER_ADMIN_EMAIL;
  const isMetadataAdmin = user.user_metadata?.role === 'admin';

  if (isSuperAdminEmail || isMetadataAdmin) {
    return { authorized: true, user };
  }

  // Also query user role from database profiles as backup
  if (isSupabaseAdminConfigured()) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profile?.role === 'admin') {
      return { authorized: true, user };
    }
  }

  return { authorized: false, error: 'Apenas administradores podem gerenciar links', status: 403 };
}

export async function GET() {
  try {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Supabase Admin não está configurado.' }, { status: 500 });
    }

    const { data, error } = await supabaseAdmin
      .from('useful_links')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authResult = await checkAdminAuthorization();
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { name, url, description, category } = await req.json();

    if (!name || !url || !category) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('useful_links')
      .insert([{ name, url, description, category }])
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const authResult = await checkAdminAuthorization();
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { id, name, url, description, category } = await req.json();

    if (!id || !name || !url || !category) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('useful_links')
      .update({ name, url, description, category })
      .eq('id', id)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const authResult = await checkAdminAuthorization();
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const all = searchParams.get('all');

    if (all === 'true') {
      const { error } = await supabaseAdmin
        .from('useful_links')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Todos os links foram apagados com sucesso' });
    }

    if (!id) {
      return NextResponse.json({ error: 'ID do link é obrigatório' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('useful_links')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Link excluído com sucesso' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno do servidor' }, { status: 500 });
  }
}
