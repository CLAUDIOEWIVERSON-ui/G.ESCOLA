import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const { classId } = await req.json();

    if (!classId) {
      return NextResponse.json({ error: 'ID da turma é obrigatório.' }, { status: 400 });
    }

    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Serviço de autenticação administrativa não configurado.' }, { status: 500 });
    }

    // 1. Fetch class details
    const { data: classObj, error: classErr } = await supabaseAdmin
      .from('turmas')
      .select('id, nome, ano')
      .eq('id', classId)
      .maybeSingle();

    if (classErr || !classObj) {
      console.error('Erro ao buscar turma:', classErr);
      return NextResponse.json({ error: 'Turma não encontrada ou inexistente.' }, { status: 404 });
    }

    // 2. Fetch all students in this class
    const { data: students, error: studentsErr } = await supabaseAdmin
      .from('alunos')
      .select('id, nome, email, posto_graduacao, om')
      .eq('id_turma_delete_check', classId) // Or use a fallback column if needed, wait let's query standard turma_id
      .is('deleted_at', null);

    // Let's fallback to standard query
    const { data: studentsStandard, error: standardErr } = await supabaseAdmin
      .from('alunos')
      .select('id, nome, email, posto_graduacao, om')
      .eq('turma_id', classId)
      .is('deleted_at', null);

    const activeStudents = studentsStandard || students || [];

    if (activeStudents.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Esta turma não possui alunos cadastrados ou ativos.',
        stats: { sent: 0, skipped: 0, failed: 0, total: 0 }
      });
    }

    // 3. Fetch all access codes for this class
    const { data: accessRecords, error: accessErr } = await supabaseAdmin
      .from('student_access_codes')
      .select('student_id, access_code')
      .eq('class_id', classId);

    if (accessErr) {
      console.error('Erro ao buscar códigos de acesso da turma:', accessErr);
      return NextResponse.json({ error: 'Erro ao conectar-se com a tabela de códigos de acesso.' }, { status: 500 });
    }

    // 4. Setup SMTP
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || 'Escola Digital <noreply@escola.digital>';
    const smtpSecure = process.env.SMTP_SECURE === 'true';

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.warn('[send-class-access-codes] SMTP credentials are not configured.');
      return NextResponse.json({
        error: 'Servidor de e-mail (SMTP) não configurado na plataforma. Configure SMTP_HOST, SMTP_USER e SMTP_PASS nas configurações do sistema para ativar o envio de e-mails em massa.'
      }, { status: 512 });
    }

    // Create Transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    let sentCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const failures: Array<{ name: string; email: string; reason: string }> = [];

    // 5. Send emails
    for (const student of activeStudents) {
      if (!student.email || !student.email.includes('@')) {
        skippedCount++;
        continue;
      }

      const record = accessRecords?.find(r => r.student_id === student.id);
      if (!record?.access_code) {
        skippedCount++;
        failures.push({
          name: student.nome,
          email: student.email,
          reason: 'Código de acesso pendente de geração (matricule o aluno novamente ou recrie-o para disparar a geração).'
        });
        continue;
      }

      const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #1e293b; margin: 0;">
          <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
            <div style="text-align: center; margin-bottom: 24px;">
              <h2 style="color: #2563eb; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.025em;">Escola Digital</h2>
              <p style="color: #64748b; margin: 6px 0 0 0; font-size: 14px;">Olá, <strong>${student.nome}</strong>!</p>
            </div>
            
            <div style="border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; padding: 24px 0; margin-bottom: 24px; text-align: center;">
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569; line-height: 1.5;">Aqui está o seu Código de Acesso exclusivo para realizar login na Área do Aluno da turma <strong>${classObj.nome}</strong>:</p>
              <div style="background-color: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 24px; font-weight: 700; color: #1d4ed8; padding: 12px 24px; letter-spacing: 1px; display: inline-block;">
                ${record.access_code}
              </div>
              <p style="margin: 16px 0 0 0; font-size: 13px; color: #64748b;">Sua senha de acesso padrão/temporária é: <strong style="color: #334155;">123</strong></p>
            </div>

            <div style="margin-bottom: 24px; background-color: #f8fafc; border-radius: 8px; padding: 16px; border: 1px solid #f1f5f9;">
              <h3 style="font-size: 13px; font-weight: 700; color: #334155; margin: 0 0 8px 0; text-transform: uppercase; tracking-wider;">Como acessar seu painel:</h3>
              <ol style="margin: 0; padding-left: 18px; font-size: 13px; color: #475569; line-height: 1.6;">
                <li style="margin-bottom: 4px;">Acesse o sistema da escola online.</li>
                <li style="margin-bottom: 4px;">Selecione a aba de login <strong>"Aluno (Código)"</strong>.</li>
                <li style="margin-bottom: 4px;">Insira o Código de Acesso acima.</li>
                <li>Utilize sua senha <strong>123</strong> para fazer login.</li>
              </ol>
            </div>

            <div style="text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px;">
              <p style="font-size: 11px; color: #94a3b8; margin: 0;">Esta é uma mensagem automática gerada pela Escola Digital. Por favor de não responder diretamente a este e-mail.</p>
            </div>
          </div>
        </div>
      `;

      try {
        await transporter.sendMail({
          from: smtpFrom,
          to: student.email,
          subject: `🗝️ Seu Código de Acesso - Turma ${classObj.nome}`,
          html: htmlContent,
        });
        sentCount++;
      } catch (err: any) {
        console.error(`Erro ao enviar código para ${student.email}:`, err);
        failedCount++;
        failures.push({
          name: student.nome,
          email: student.email,
          reason: err.message || 'Erro do host SMTP ao despachar mensagem.'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Disparo de e-mails em massa processado para a turma ${classObj.nome}.`,
      stats: {
        total: activeStudents.length,
        sent: sentCount,
        skipped: skippedCount,
        failed: failedCount,
        failures: failures.length > 0 ? failures : undefined
      }
    });

  } catch (error: any) {
    console.error('Error in send-class-access-codes API:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor para disparo de e-mails.' }, { status: 500 });
  }
}
