import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import { recordAccessLog } from '@/lib/auth/accessLogs';
import * as crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const reqBody = await req.json();
    const { accessCode, password, isQrCode } = reqBody;

    if (!accessCode) {
      return NextResponse.json({ error: 'Código de Acesso é obrigatório.' }, { status: 400 });
    }

    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Serviço de autenticação administrativa não configurado.' }, { status: 500 });
    }

    // Limpeza e normalização do código (extrai de URL completa caso enviado pelo scanner)
    let rawCode = String(accessCode || '').trim();
    // Remove aspas caso venha como JSON string
    rawCode = rawCode.replace(/^["']|["']$/g, '');
    if (rawCode.includes('?')) {
      const urlPart = rawCode.split('?')[1] || '';
      const params = new URLSearchParams(urlPart.split('#')[0]);
      rawCode = params.get('code') || params.get('accessCode') || params.get('codigo') || rawCode;
    } else if (rawCode.toUpperCase().includes('CODE=')) {
      const match = rawCode.match(/CODE=([^&#\s]+)/i);
      if (match && match[1]) rawCode = match[1];
    }
    const cleanedAccessCode = decodeURIComponent(rawCode).trim().toUpperCase();
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanedAccessCode);

    // 1. Busca do registro de código de acesso no banco
    let accessRecord: any = null;
    let accessErr: any = null;

    // A) Busca por código exato ou ilike em student_access_codes
    const res1 = await supabaseAdmin
      .from('student_access_codes')
      .select('*')
      .ilike('access_code', cleanedAccessCode)
      .maybeSingle();

    if (res1.data) {
      accessRecord = res1.data;
    } else if (res1.error) {
      accessErr = res1.error;
    }

    // B) Busca por student_id em student_access_codes (somente se cleanedAccessCode for um UUID válido)
    if (!accessRecord && isUUID) {
      const res2 = await supabaseAdmin
        .from('student_access_codes')
        .select('*')
        .eq('student_id', cleanedAccessCode)
        .maybeSingle();
      if (res2.data) accessRecord = res2.data;
    }

    // C) Busca de fallback na tabela alunos (por ID se UUID, ou por matrícula / NIF)
    if (!accessRecord) {
      let alunoQuery = supabaseAdmin
        .from('alunos')
        .select('*')
        .is('deleted_at', null);

      if (isUUID) {
        alunoQuery = alunoQuery.eq('id', cleanedAccessCode);
      } else {
        alunoQuery = alunoQuery.or(`matricula.eq.${cleanedAccessCode},nif.eq.${cleanedAccessCode}`);
      }

      const { data: matchedAluno } = await alunoQuery.maybeSingle();

      if (matchedAluno) {
        const { data: existingCode } = await supabaseAdmin
          .from('student_access_codes')
          .select('*')
          .eq('student_id', matchedAluno.id)
          .maybeSingle();

        if (existingCode) {
          accessRecord = existingCode;
        } else {
          const defaultPassHash = 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3';
          const newCode = `STU-${Date.now().toString().slice(-4)}-${matchedAluno.id.substring(0, 4).toUpperCase()}`;
          const { data: newRec } = await supabaseAdmin
            .from('student_access_codes')
            .upsert({
              student_id: matchedAluno.id,
              class_id: matchedAluno.turma_id,
              access_code: newCode,
              password_hash: defaultPassHash,
              access_status: 'active'
            }, { onConflict: 'student_id' })
            .select()
            .maybeSingle();
          if (newRec) accessRecord = newRec;
        }
      }
    }

    if (accessErr && !accessRecord) {
      console.error('Erro ao verificar Código de Acesso:', accessErr);
      const errorMsg = (accessErr.message || '').toLowerCase();
      if (errorMsg.includes('relation') && (errorMsg.includes('does not exist') || errorMsg.includes('missing'))) {
        return NextResponse.json({ 
          error: 'As tabelas do banco de dados (student_access_codes, etc) não foram encontradas no Supabase. Por favor, execute o script de migração no painel SQL do seu console Supabase.' 
        }, { status: 500 });
      }
      return NextResponse.json({ error: 'Erro de banco de dados ao verificar login.' }, { status: 500 });
    }

    if (!accessRecord) {
      return NextResponse.json({ error: 'Código de acesso incorreto ou não cadastrado.' }, { status: 404 });
    }

    // Validação de senha: se o aluno escaneou o QR Code oficial (isQrCode === true), autoriza a entrada direta
    const isQrLogin = isQrCode === true || isQrCode === 'true';
    const providedPass = (password || '123').trim();
    const inputHash = crypto.createHash('sha256').update(providedPass).digest('hex');
    const defaultPassHash = 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3';

    if (!isQrLogin) {
      if (inputHash !== accessRecord.password_hash && inputHash !== defaultPassHash) {
        return NextResponse.json({ error: 'Senha incorreta. A senha padrão para novos alunos é 123.' }, { status: 401 });
      }
    }

    // Search for student in database (usa select(*) para compatibilidade total de colunas)
    let student: any = null;
    let studentError: any = null;

    const resStudent = await supabaseAdmin
      .from('alunos')
      .select('*')
      .eq('id', accessRecord.student_id)
      .maybeSingle();

    if (resStudent.data) {
      student = resStudent.data;
    } else {
      studentError = resStudent.error;
    }

    // Fallback: se o student_id gravado no access code não coincidiu, busca por matrícula ou NIF
    if (!student) {
      const { data: altStudent } = await supabaseAdmin
        .from('alunos')
        .select('*')
        .or(`matricula.eq.${accessRecord.access_code},matricula.eq.${cleanedAccessCode},nif.eq.${cleanedAccessCode}`)
        .maybeSingle();
      if (altStudent) {
        student = altStudent;
        studentError = null;
      }
    }

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

    // Verifica se a turma correspondente realmente existe
    const { data: turma, error: turmaError } = await supabaseAdmin
      .from('turmas')
      .select('id, nome, status, data_fim, data_postergacao, liberar_formularios')
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

    // Generate shadow email and deterministic password
    const email = `aluno_nif_${student.id}@aluno.escola.digital`;
    const studentHash = crypto.createHash('sha256').update('escola_naval_salt_' + student.id).digest('hex').substring(0, 16);
    const shadowPassword = `Aluno_${studentHash}_!1`;

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
            turma_id: student.turma_id,
            foto_url: student.foto_url || null,
            avatar_url: student.foto_url || null,
            posto_graduacao: student.posto_graduacao || null,
            nome_guerra: student.nome_guerra || null,
            om: student.om || null,
            nip: student.nip || null
          }
        });

        if (createError) {
          throw createError;
        }
        if (authData?.user) {
          authUserId = authData.user.id;
        }
      } catch (err: any) {
        try {
          let page = 1;
          while (!authUserId && page <= 5) {
            const { data: uList } = await supabaseAdmin.auth.admin.listUsers({
              page: page,
              perPage: 1000
            });
            if (!uList?.users || uList.users.length === 0) break;
            const found = uList.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
            if (found) {
              authUserId = found.id;
              break;
            }
            if (uList.users.length < 1000) break;
            page++;
          }
        } catch (listErr: any) {
          console.error('[student-login] Error listing users fallback:', listErr);
        }
      }
    }

    // SEMPRE sincroniza a senha no Supabase auth.users e atualiza os metadados com a foto mais recente
    if (authUserId) {
      try {
        await supabaseAdmin.auth.admin.updateUserById(authUserId, {
          password: shadowPassword,
          email_confirm: true,
          user_metadata: {
            role: 'aluno',
            full_name: student.nome,
            isNifStudent: true,
            student_id: student.id,
            turma_id: student.turma_id,
            foto_url: student.foto_url || null,
            avatar_url: student.foto_url || null,
            posto_graduacao: student.posto_graduacao || null,
            nome_guerra: student.nome_guerra || null,
            om: student.om || null,
            nip: student.nip || null
          }
        });
      } catch (metaErr) {
        console.warn('Erro ao sincronizar senha e user_metadata do aluno no login:', metaErr);
      }

      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: authUserId,
          role: 'aluno',
          full_name: student.nome,
          foto_url: student.foto_url || null,
          has_changed_password: true,
          student_id: student.id,
          turma_id: student.turma_id,
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

    // Record into the central access logs history
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || undefined;
    const ua = req.headers.get('user-agent') || undefined;
    recordAccessLog({
      userId: authUserId,
      userName: student.nome,
      email,
      role: 'aluno',
      path: '/dashboard',
      accessType: 'Login Aluno (Código NIF)',
      ipAddress: ip,
      userAgent: ua
    }).catch(err => console.warn('[student-login] Access log record error:', err));

    return NextResponse.json({
      success: true,
      email,
      password: shadowPassword,
      student: {
        id: student.id,
        nome: student.nome,
        turma_id: student.turma_id,
        foto_url: student.foto_url || null
      }
    });

  } catch (error: any) {
    console.error('Error in student-login API:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
