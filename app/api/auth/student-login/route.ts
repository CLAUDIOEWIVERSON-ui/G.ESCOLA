import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { nif, password } = await req.json();

    if (!nif) {
      return NextResponse.json({ error: 'NIF é obrigatório.' }, { status: 400 });
    }

    if (password !== '123') {
      return NextResponse.json({ error: 'Senha incorreta. A senha padrão para alunos é 123.' }, { status: 401 });
    }

    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Serviço de autenticação administrativa não configurado.' }, { status: 500 });
    }

    // Clean nif: let's query both raw input and clean digits to be highly user-friendly
    const cleanedNifInput = nif.trim();
    const digitsOnlyNif = cleanedNifInput.replace(/\D/g, '');

    // Search for student in database
    let { data: student, error: studentError } = await supabaseAdmin
      .from('alunos')
      .select('id, nome, nif, turma_id, genero, matricula, posto_graduacao, om')
      .eq('nif', cleanedNifInput)
      .maybeSingle();

    // If not found and input contains formatting, try search with digits only
    if (!student && digitsOnlyNif && digitsOnlyNif !== cleanedNifInput) {
      const { data: studentByDigits } = await supabaseAdmin
        .from('alunos')
        .select('id, nome, nif, turma_id, genero, matricula, posto_graduacao, om')
        .eq('nif', digitsOnlyNif)
        .maybeSingle();
      if (studentByDigits) {
        student = studentByDigits;
      }
    }

    if (studentError) {
      console.error('Erro ao buscar aluno por NIF:', studentError);
      return NextResponse.json({ error: 'Erro de banco de dados ao buscar aluno.' }, { status: 500 });
    }

    if (!student) {
      return NextResponse.json({ error: 'Aluno não encontrado com o NIF fornecido.' }, { status: 404 });
    }

    // Generate shadow email and deterministic password
    const email = `aluno_nif_${student.id}@aluno.escola.digital`;
    const secretSalt = process.env.SUPABASE_SERVICE_ROLE_KEY || 'student-salt';
    const hash = crypto.createHmac('sha256', secretSalt).update(student.id).digest('hex').substring(0, 16);
    const shadowPassword = `Aluno_${hash}_!1`;

    let authUserId = '';

    // Attempt to create Auth user
    try {
      const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: shadowPassword,
        email_confirm: true,
        user_metadata: {
          role: 'aluno',
          full_name: student.nome,
          isNifStudent: true,
          student_id: student.id,
          turma_id: student.turma_id
        }
      });

      if (createError) {
        if (createError.message.includes('already exists') || createError.message.includes('already registered')) {
          // Find existing user in auth.users by listing users
          const { data: uList } = await supabaseAdmin.auth.admin.listUsers();
          const found = uList?.users?.find(u => u.email === email);
          if (found) {
            authUserId = found.id;
          }
        } else {
          throw createError;
        }
      } else if (authData?.user) {
        authUserId = authData.user.id;
      }
    } catch (err: any) {
      console.error('Error in student auth provision:', err);
      return NextResponse.json({ error: 'Erro ao provisionar conta de acesso do aluno.' }, { status: 500 });
    }

    // If we have the User ID, upsert the student profile so they can load successfully
    if (authUserId) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: authUserId,
          role: 'aluno',
          full_name: student.nome,
          has_changed_password: true,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (profileError) {
        console.error('Error upserting student profile:', profileError);
      }
    }

    return NextResponse.json({
      success: true,
      email,
      password: shadowPassword,
      student: {
        id: student.id,
        nome: student.nome,
        turma_id: student.turma_id
      }
    });

  } catch (error: any) {
    console.error('Error in student-login API:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
