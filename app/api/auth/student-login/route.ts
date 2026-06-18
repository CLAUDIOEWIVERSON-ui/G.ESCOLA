import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { accessCode, password } = await req.json();

    if (!accessCode) {
      return NextResponse.json({ error: 'Código de Acesso é obrigatório.' }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ error: 'Senha é obrigatória.' }, { status: 400 });
    }

    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Serviço de autenticação administrativa não configurado.' }, { status: 500 });
    }

    const cleanedAccessCode = accessCode.trim().toUpperCase();

    // Query access code record in database
    const { data: accessRecord, error: accessErr } = await supabaseAdmin
      .from('student_access_codes')
      .select('*')
      .eq('access_code', cleanedAccessCode)
      .maybeSingle();

    if (accessErr) {
      console.error('Erro ao verificar Código de Acesso:', accessErr);
      const errorMsg = (accessErr.message || '').toLowerCase();
      if (errorMsg.includes('relation') && (errorMsg.includes('does not exist') || errorMsg.includes('missing'))) {
        return NextResponse.json({ 
          error: 'As tabelas do banco de dados (student_access_codes, etc) não foram encontradas no Supabase. Por favor, execute o script de migração (ex: migrations/28_student_access_codes.sql) no painel SQL do seu console Supabase.' 
        }, { status: 500 });
      }
      return NextResponse.json({ error: 'Erro de banco de dados ao verificar login.' }, { status: 500 });
    }

    if (!accessRecord) {
      return NextResponse.json({ error: 'Código de acesso incorreto ou não cadastrado.' }, { status: 404 });
    }

    // Hash input password and compare with stored hash
    const inputHash = crypto.createHash('sha256').update(password.trim()).digest('hex');
    if (inputHash !== accessRecord.password_hash) {
      return NextResponse.json({ error: 'Senha incorreta. A senha padrão para novos alunos é 123.' }, { status: 401 });
    }

    // Search for student in database
    const { data: student, error: studentError } = await supabaseAdmin
      .from('alunos')
      .select('id, nome, turma_id, genero, matricula, posto_graduacao, om')
      .eq('id', accessRecord.student_id)
      .maybeSingle();

    if (studentError || !student) {
      console.error('Erro ao carregar o estudante correspondente:', studentError);
      return NextResponse.json({ error: 'Estudante correspondente não pôde ser carregado ou não existe.' }, { status: 404 });
    }

    // Validação estrita: somente alunos vinculados à turma (turma_id cadastrado) podem acessar o sistema
    if (!student.turma_id) {
      return NextResponse.json({ 
        error: 'Acesso negado: Este aluno não está matriculado em nenhuma turma cadastrada.' 
      }, { status: 403 });
    }

    // Verifica se a turma correspondente realmente existe e se está "ATIVA"
    const { data: turma, error: turmaError } = await supabaseAdmin
      .from('turmas')
      .select('id, nome, status, data_fim, data_postergacao')
      .eq('id', student.turma_id)
      .maybeSingle();

    if (turmaError) {
      console.error('Erro ao verificar existência da turma do aluno:', turmaError);
      return NextResponse.json({ error: 'Erro de banco de dados ao verificar a turma do aluno.' }, { status: 500 });
    }

    if (!turma) {
      return NextResponse.json({ 
        error: 'Acesso negado: A turma vinculada a este aluno não existe ou foi removida do sistema.' 
      }, { status: 403 });
    }

    if (turma.status === 'cancelada') {
      return NextResponse.json({ 
        error: 'Seu acesso foi encerrado porque sua turma foi cancelada. Em caso de dúvidas, procure a administração.' 
      }, { status: 403 });
    }

    // BLOQUEIO EXCLUSIVO PELO STATUS DA TURMA (considerando a data de postergação/fim)
    if (turma.status === 'concluída') {
      const effectiveEndDate = turma.data_postergacao || turma.data_fim;
      if (effectiveEndDate) {
        const todayStr = new Date().toISOString().split('T')[0];
        if (todayStr > effectiveEndDate) {
          return NextResponse.json({ 
            error: 'Seu acesso foi encerrado porque o período regular e de postergação desta turma já se encerrou.' 
          }, { status: 403 });
        }
      } else {
        return NextResponse.json({ 
          error: 'Seu acesso foi encerrado porque sua turma foi concluída. Em caso de dúvidas, procure a administração.' 
        }, { status: 403 });
      }
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
        const found = uList.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
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
              const found = uList.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
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

    // Log successful login access info
    await supabaseAdmin
      .from('student_access_codes')
      .update({
        last_login: new Date().toISOString(),
        login_count: (accessRecord.login_count || 0) + 1
      })
      .eq('id', accessRecord.id);

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
