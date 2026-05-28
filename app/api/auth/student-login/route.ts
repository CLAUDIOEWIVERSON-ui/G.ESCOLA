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
    let student = null;
    let studentError = null;

    try {
      const { data, error } = await supabaseAdmin
        .from('alunos')
        .select('id, nome, nif, turma_id, genero, matricula, posto_graduacao, om')
        .eq('nif', cleanedNifInput)
        .maybeSingle();
      
      student = data;
      studentError = error;
    } catch (err: any) {
      studentError = err;
    }

    // If not found and input contains formatting, try search with digits only
    if (!student && digitsOnlyNif && digitsOnlyNif !== cleanedNifInput) {
      try {
        const { data: studentByDigits } = await supabaseAdmin
          .from('alunos')
          .select('id, nome, nif, turma_id, genero, matricula, posto_graduacao, om')
          .eq('nif', digitsOnlyNif)
          .maybeSingle();
        if (studentByDigits) {
          student = studentByDigits;
        }
      } catch (err: any) {
        // ignore fallback errors
      }
    }

    if (studentError) {
      console.error('Erro ao buscar aluno por NIF:', studentError);
      const errorMsg = (studentError.message || '').toLowerCase();
      if (errorMsg.includes('relation') && (errorMsg.includes('does not exist') || errorMsg.includes('missing'))) {
        return NextResponse.json({ 
          error: 'As tabelas do banco de dados (alunos, turmas, etc) não foram encontradas no Supabase. Por favor, execute o script de migração (ex: migrations/24_garantir_tabelas_aluno_nif_turma.sql) no painel SQL do seu console Supabase.' 
        }, { status: 500 });
      }
      return NextResponse.json({ error: 'Erro de banco de dados ao buscar aluno.' }, { status: 500 });
    }

    if (!student) {
      return NextResponse.json({ error: 'Aluno não encontrado com o NIF fornecido.' }, { status: 404 });
    }

    // Validação estrita: somente alunos vinculados à turma (turma_id cadastrado) podem acessar o sistema
    if (!student.turma_id) {
      return NextResponse.json({ 
        error: 'Acesso negado: Este aluno de NIF ' + cleanedNifInput + ' não está cadastrado/matriculado em nenhuma turma no sistema.' 
      }, { status: 403 });
    }

    // Verifica se a turma correspondente realmente existe
    const { data: turma, error: turmaError } = await supabaseAdmin
      .from('turmas')
      .select('id, nome, ativa')
      .eq('id', student.turma_id)
      .maybeSingle();

    if (turmaError) {
      console.error('Erro ao verificar existência da turma do aluno:', turmaError);
      return NextResponse.json({ error: 'Erro de banco de dados ao verificar a turma do aluno.' }, { status: 500 });
    }

    if (!turma) {
      return NextResponse.json({ 
        error: 'Acesso negado: A turma vinculada a esta matrícula/NIF não existe ou foi removida do sistema.' 
      }, { status: 403 });
    }

    // Generate shadow email and deterministic password
    const email = `aluno_nif_${student.id}@aluno.escola.digital`;
    const secretSalt = process.env.SUPABASE_SERVICE_ROLE_KEY || 'student-salt';
    const hash = crypto.createHmac('sha256', secretSalt).update(student.id).digest('hex').substring(0, 16);
    const shadowPassword = `Aluno_${hash}_!1`;

    let authUserId = '';

    // Proactively check if the user already exists in auth.users before attempting creation
    try {
      let page = 1;
      let foundUser = null;
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
        authUserId = foundUser.id;
        console.log(`[student-login] Proactive check found existing auth user: ${authUserId}`);
      }
    } catch (listErr: any) {
      console.warn('[student-login] Error during proactive user list check (non-blocking):', listErr);
    }

    // Only attempt to create the user if they were not found proactively
    if (!authUserId) {
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
          throw createError;
        }
        if (authData?.user) {
          authUserId = authData.user.id;
        }
      } catch (err: any) {
        console.log('[student-login] Caught error during createUser:', err);
        const errStr = (
          err?.message || 
          err?.error_description || 
          err?.error || 
          (typeof err === 'string' ? err : '') || 
          String(err || '')
        ).toLowerCase();

        const isAlreadyRegistered = 
          errStr.includes('already registered') || 
          errStr.includes('already exists') || 
          errStr.includes('user_already_exists') || 
          errStr.includes('registered') || 
          errStr.includes('exists') || 
          err?.status === 422 || 
          err?.statusCode === 422;

        if (isAlreadyRegistered) {
          console.log(`[student-login] User with email ${email} is reported as already registered. Fetching user list...`);
          try {
            // Search again for existing user in auth.users with pagination
            let page = 1;
            let foundUser = null;
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
              authUserId = foundUser.id;
            } else {
              console.error(`[student-login] User reported already registered, but not found in listUsers format for ${email}`);
              return NextResponse.json({ 
                error: `Erro de login: A conta para o e-mail ${email} já existe, mas não pôde ser sincronizada.` 
              }, { status: 500 });
            }
          } catch (listErr: any) {
            console.error('[student-login] Error listing users fallback:', listErr);
            return NextResponse.json({ error: 'Erro ao localizar conta de estudante cadastrada.' }, { status: 500 });
          }
        } else {
          console.error('[student-login] Fatal error during student auth provision:', err);
          return NextResponse.json({ error: 'Erro ao provisionar conta de acesso do aluno.' }, { status: 500 });
        }
      }
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
