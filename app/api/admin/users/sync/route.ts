import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: 'Supabase Admin not configured.' }, { status: 500 });
  }

  try {
    // 1. Get all auth users
    const { data: { users: authUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) throw authError;

    // 2. Get all profiles
    const { data: profiles, error: profileError } = await supabaseAdmin.from('profiles').select('*');
    if (profileError) throw profileError;

    // 3. Get all alunos
    const { data: alunos, error: alunosError } = await supabaseAdmin.from('alunos').select('*');
    if (alunosError) throw alunosError;

    let syncedCount = 0;
    let createdCount = 0;

    for (const authUser of authUsers) {
      const profile = profiles.find((p: any) => p.id === authUser.id);
      const role = profile?.role || authUser.user_metadata?.role || 'aluno';
      const fullName = profile?.full_name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuário';

      if (role === 'aluno') {
        const email = authUser.email;
        if (!email) continue;

        // Try to find matching aluno by email
        let aluno = alunos.find((a: any) => a.email && a.email.toLowerCase() === email.toLowerCase());

        // If not found by email, try to find by exact name
        if (!aluno) {
          aluno = alunos.find((a: any) => a.nome && a.nome.toLowerCase() === fullName.toLowerCase());
        }

        if (aluno) {
          // Sync missing fields
          const updates: any = {};
          if (!aluno.email) updates.email = email;
          // Keep existing nome if it exists, otherwise sync
          if (!aluno.nome) updates.nome = fullName;
          
          if (Object.keys(updates).length > 0) {
            await supabaseAdmin.from('alunos').update(updates).eq('id', aluno.id);
            syncedCount++;
          }
        } else {
          // Create new aluno
          const novaMatricula = `SYNC-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
          const { error: insertError } = await supabaseAdmin.from('alunos').insert({
            nome: fullName,
            email: email,
            matricula: novaMatricula,
            status: 'ativo'
          });
          
          if (!insertError) {
            createdCount++;
          } else {
            console.error('Error creating aluno for sync:', insertError);
          }
        }
      }
    }

    // Now, sync the other way around: if an 'aluno' exists but not in auth/profiles, maybe we create them?
    // The request specifies "Sincronizar as fichas dos alunos no exterior que estão no modulo inicial com as fichas que estão no modulo de turmas"
    // Which means initial module -> turmas module.

    return NextResponse.json({ 
      success: true, 
      message: `Sincronização concluída! ${createdCount} novas fichas criadas e ${syncedCount} fichas atualizadas no módulo de turmas.`,
      syncedCount,
      createdCount
    });

  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
