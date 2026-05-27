import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Get the currently authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { password } = await request.json();
    
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres.' }, { status: 400 });
    }

    let hasChangedPassword = false;
    let hasColumn = false;
    const useAdmin = isSupabaseAdminConfigured();

    if (useAdmin) {
      // 1. Fetch the user's current profile from the DB using admin credentials
      const { data: colData, error: colErr } = await supabaseAdmin
        .from('profiles')
        .select('has_changed_password')
        .eq('id', user.id)
        .single();

      if (!colErr && colData) {
        hasChangedPassword = !!colData.has_changed_password;
        hasColumn = true;
      } else {
        console.warn('has_changed_password column detection notice or error via admin:', colErr);
      }
    } else {
      // Fallback: use user's own client to check if the column is present
      const { data: colData, error: colErr } = await supabase
        .from('profiles')
        .select('has_changed_password')
        .eq('id', user.id)
        .single();

      if (!colErr && colData) {
        hasChangedPassword = !!colData.has_changed_password;
        hasColumn = true;
      } else {
        console.warn('has_changed_password column detection notice or error via user client:', colErr);
      }
    }

    // Regra: se já alterou a senha uma vez, não pode alterar de novo de forma independente (somente solicitação ao Admin)
    if (hasColumn && hasChangedPassword) {
      return NextResponse.json({ 
        error: 'Você já alterou sua senha anteriormente. Caso queira alterar novamente ou tenha esquecido, por favor solicite a alteração a um Administrador do sistema.' 
      }, { status: 403 });
    }

    // 2. Update the user's password in Auth
    let updateAuthErr: any = null;
    if (useAdmin) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password: password
      });
      updateAuthErr = error;
    } else {
      // Bypasses needing service role key - updates currently logged in user's password directly using their active session client
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      updateAuthErr = error;
    }

    if (updateAuthErr) {
      console.error('Erro ao atualizar senha no Auth:', updateAuthErr);
      return NextResponse.json({ error: `Erro ao atualizar senha: ${updateAuthErr.message}` }, { status: 500 });
    }

    // 3. Mark the user as having changed their password inside public.profiles if the column is present
    if (hasColumn) {
      if (useAdmin) {
        const { error: updateProfileErr } = await supabaseAdmin
          .from('profiles')
          .update({ has_changed_password: true })
          .eq('id', user.id);

        if (updateProfileErr) {
          console.error('Erro ao atualizar flag de alteração de senha no perfil pelo admin:', updateProfileErr);
        }
      } else {
        // Try updating using the user's own client
        const { error: updateProfileErr } = await supabase
          .from('profiles')
          .update({ has_changed_password: true })
          .eq('id', user.id);

        if (updateProfileErr) {
          console.warn('Could not update profiles using user client (expected if RLS limits updates):', updateProfileErr);
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Senha alterada com sucesso!' });
  } catch (err: any) {
    console.error('Erro inesperado na rota de alteração de senha:', err);
    return NextResponse.json({ error: err.message || 'Erro interno do servidor' }, { status: 500 });
  }
}
