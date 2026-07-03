import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

async function getUserSession() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return null;
  }
  return user;
}

async function checkAdminRole(userId: string) {
  if (!isSupabaseAdminConfigured()) return false;
  
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
    
  return profile?.role === 'admin';
}

export async function GET(req: Request) {
  try {
    const user = await getUserSession();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const isAdmin = await checkAdminRole(user.id);

    let query = supabaseAdmin
      .from('sugestoes')
      .select('*')
      .order('created_at', { ascending: false });

    // Se não for admin, filtra apenas as sugestões do próprio usuário
    if (!isAdmin) {
      query = query.eq('usuario_id', user.id);
    }

    const { data, error } = await query;

    // Se houver erro porque a tabela não existe (42P01), podemos identificar para tratamento front-end gracioso
    if (error) {
      if (error.code === '42P01' || error.message?.includes('relation "public.sugestoes" does not exist')) {
        return NextResponse.json({ error: 'Tabela sugestoes não existe no banco.', code: 'TABLE_MISSING' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getUserSession();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { tipo, titulo, modulo, descricao, prioridade, anonima } = await req.json();

    if (!tipo || !titulo || !descricao || !prioridade) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
    }

    // Buscando nome completo do perfil do usuário para anexar se não for anônimo
    let fullName = 'Usuário';
    let email = user.email || '';
    
    if (!anonima) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      if (profile?.full_name) {
        fullName = profile.full_name;
      }
    } else {
      fullName = 'Anônimo';
      email = '';
    }

    const suggestionData = {
      tipo,
      titulo,
      modulo: modulo || 'Geral',
      descricao,
      prioridade,
      usuario_id: anonima ? null : user.id,
      usuario_nome: fullName,
      usuario_email: email,
      status: 'pendente'
    };

    const { data, error } = await supabaseAdmin
      .from('sugestoes')
      .insert([suggestionData])
      .select();

    if (error) {
      if (error.code === '42P01' || error.message?.includes('relation "public.sugestoes" does not exist')) {
        return NextResponse.json({ error: 'Tabela sugestoes não existe no banco.', code: 'TABLE_MISSING' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getUserSession();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const isAdmin = await checkAdminRole(user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores do TI podem analisar sugestões' }, { status: 403 });
    }

    const { id, status, resposta_ti } = await req.json();

    if (!id || !status) {
      return NextResponse.json({ error: 'Campos obrigatórios de atualização ausentes' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('sugestoes')
      .update({ 
        status, 
        resposta_ti, 
        updated_at: new Date().toISOString() 
      })
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
