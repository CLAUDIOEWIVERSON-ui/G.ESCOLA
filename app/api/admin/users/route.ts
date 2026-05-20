import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/rbac';

export async function GET() {
  const { authorized, response } = await requireAdmin();
  if (!authorized) {
    return response;
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: 'Supabase Admin not configured. Please set SUPABASE_SERVICE_ROLE_KEY in Secrets.' }, { status: 500 });
  }
  try {
    // Get all users from auth
    const { data: { users: authUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      if (authError.message.includes('Invalid API key') || authError.message.includes('service_role')) {
        return NextResponse.json({ error: 'Chave de API do Supabase Inválida. Verifique o SUPABASE_SERVICE_ROLE_KEY nos Secrets.' }, { status: 401 });
      }
      throw authError;
    }

    // Get all profiles
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*');
    
    if (profileError) throw profileError;

    // Merge data
    const mergedUsers = authUsers.map(user => {
      const profile = profiles.find(p => p.id === user.id);
      return {
        id: user.id,
        email: user.email,
        full_name: profile?.full_name || user.user_metadata?.full_name || '',
        role: 'admin', // Force everyone to 'admin' visually in user list as requested
        created_at: user.created_at
      };
    });

    return NextResponse.json(mergedUsers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { authorized, response } = await requireAdmin();
  if (!authorized) {
    return response;
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: 'Supabase Admin not configured. Please set SUPABASE_SERVICE_ROLE_KEY in Secrets.' }, { status: 500 });
  }
  try {
    const { email, password, full_name, role } = await request.json();

    // 1. Create auth user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role }
    });

    if (authError) {
      if (authError.message.includes('Invalid API key') || authError.message.includes('service_role')) {
        return NextResponse.json({ error: 'Erro de Configuração: Chave de API Inválida.' }, { status: 401 });
      }
      throw authError;
    }

    // 2. Create profile
    // We use upsert to avoid conflicts if a trigger already created a profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authUser.user.id,
        full_name: full_name || email.split('@')[0],
        role: role || 'aluno'
      }, {
        onConflict: 'id'
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // We don't throw here to avoid returning error if auth user was created
    }

    return NextResponse.json({ user: authUser.user });
  } catch (error: any) {
    console.error('Admin API POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const { authorized, response } = await requireAdmin();
  if (!authorized) {
    return response;
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: 'Supabase Admin not configured. Please set SUPABASE_SERVICE_ROLE_KEY in Secrets.' }, { status: 500 });
  }
  try {
    const { id, email, password, full_name, role } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório para atualização.' }, { status: 400 });
    }

    // 1. Update auth user
    const updateData: any = {};
    if (email) updateData.email = email;
    if (password) updateData.password = password;
    
    // Merge existing metadata if possible or just set new ones
    updateData.user_metadata = { 
      full_name: full_name,
      role: role
    };
    
    // Auth updates
    if (Object.keys(updateData).length > 0) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, updateData);
      if (authError) {
        if (authError.message.includes('Invalid API key') || authError.message.includes('service_role')) {
          return NextResponse.json({ error: 'Erro de Configuração: Chave de API Inválida.' }, { status: 401 });
        }
        throw authError;
      }
    }

    // 2. Update profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        full_name, 
        role 
      })
      .eq('id', id);

    if (profileError) throw profileError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Admin API PUT error detailed:', JSON.stringify(error, null, 2));
    return NextResponse.json({ 
      error: error.message || 'Erro desconhecido na atualização do usuário',
      details: error
    }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { authorized, response } = await requireAdmin();
  if (!authorized) {
    return response;
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
