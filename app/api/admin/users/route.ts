import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
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
        role: profile?.role || user.user_metadata?.role || 'aluno',
        grupo_responsavel: profile?.grupo_responsavel || user.user_metadata?.grupo_responsavel || null,
        has_changed_password: profile?.has_changed_password || false,
        created_at: user.created_at
      };
    });

    return NextResponse.json(mergedUsers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: 'Supabase Admin not configured. Please set SUPABASE_SERVICE_ROLE_KEY in Secrets.' }, { status: 500 });
  }
  try {
    const { email, password, full_name, role, grupo_responsavel } = await request.json();

    // 1. Create auth user
    let authUser: any = null;
    let authError: any = null;

    try {
      const result = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, role, grupo_responsavel }
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
      
      // Let's check if the email has already been registered
      const isAlreadyRegistered = 
        authError.message?.includes('already been registered') || 
        authError.message?.includes('email_exists') || 
        authError.status === 422 || 
        String(authError).includes('already been registered');
        
      if (isAlreadyRegistered) {
        // Find existing user proactively
        let page = 1;
        let foundUser: any = null;
        while (true) {
          const { data: uList, error: listError } = await supabaseAdmin.auth.admin.listUsers({
            page: page,
            perPage: 1000
          });
          if (listError || !uList?.users || uList.users.length === 0) {
            break;
          }
          const found = uList.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
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
          console.log(`[admin/users] Found existing user with email ${email}, updating instead of creating.`);
          // Update the existing auth user
          const updateData: any = {
            user_metadata: { full_name, role, grupo_responsavel }
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

    // 2. Create profile
    // We use upsert to avoid conflicts if a trigger already created a profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authUser.user.id,
        full_name: full_name || email.split('@')[0],
        role: role || 'aluno',
        grupo_responsavel: grupo_responsavel || null
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
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: 'Supabase Admin not configured. Please set SUPABASE_SERVICE_ROLE_KEY in Secrets.' }, { status: 500 });
  }
  try {
    const { id, email, password, full_name, role, grupo_responsavel } = await request.json();

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
      role: role,
      grupo_responsavel: grupo_responsavel
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
    const profileUpdateData: any = { 
      full_name, 
      role,
      grupo_responsavel: grupo_responsavel || null
    };
    if (password) {
      profileUpdateData.has_changed_password = false;
    }

    let { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update(profileUpdateData)
      .eq('id', id);

    // If it failed because of has_changed_password column missing, try without it
    if (profileError && password && (profileError.message?.includes('has_changed_password') || profileError.code === 'PGRST100' || profileError.message?.includes('column'))) {
      console.warn('Retrying user profile update without has_changed_password column...');
      delete profileUpdateData.has_changed_password;
      const { error: retryError } = await supabaseAdmin
        .from('profiles')
        .update(profileUpdateData)
        .eq('id', id);
      profileError = retryError;
    }

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
