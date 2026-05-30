import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const { studentId } = await req.json();

    if (!studentId) {
      return NextResponse.json({ error: 'ID do aluno é obrigatório.' }, { status: 400 });
    }

    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Serviço de autenticação administrativa não configurado.' }, { status: 500 });
    }

    // 1. Fetch student info
    const { data: student, error: studentError } = await supabaseAdmin
      .from('alunos')
      .select('id, nome, email, turma_id')
      .eq('id', studentId)
      .maybeSingle();

    if (studentError || !student) {
      console.error('Erro ao buscar aluno:', studentError);
      return NextResponse.json({ error: 'Aluno não encontrado ou inexistente.' }, { status: 404 });
    }

    if (!student.email || !student.email.includes('@')) {
      return NextResponse.json({ 
        error: 'O aluno não possui um e-mail válido cadastrado para envio.' 
      }, { status: 400 });
    }

    // 2. Fetch the access code
    const { data: accessRecord, error: accessError } = await supabaseAdmin
      .from('student_access_codes')
      .select('access_code')
      .eq('student_id', student.id)
      .maybeSingle();

    if (accessError) {
      console.error('Erro ao buscar código de acesso:', accessError);
      return NextResponse.json({ error: 'Erro ao buscar o código de acesso no banco de dados.' }, { status: 500 });
    }

    if (!accessRecord?.access_code) {
      return NextResponse.json({ 
        error: 'Este aluno ainda não possui um código de acesso gerado. Certifique-se de que ele está matriculado em uma turma ativa.' 
      }, { status: 400 });
    }

    // 3. Setup SMTP configurations from environment
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || 'Coordenador de Cursos <noreply@escola.digital>';
    const smtpSecure = process.env.SMTP_SECURE === 'true'; // true for 465, false for other ports

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.warn('[send-access-code] SMTP credentials are not configured in environment variables.');
      return NextResponse.json({
        error: 'Servidor de e-mail (SMTP) não configurado na plataforma. Por favor, configure as variáveis de ambiente SMTP_HOST, SMTP_USER e SMTP_PASS nas configurações do sistema para ativar o envio de e-mails de acesso.'
      }, { status: 512 });
    }

    // 4. Create Nodemailer Transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        rejectUnauthorized: false // Dev/prod resiliency
      }
    });

    // 5. Generate Email Body
    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #1e293b; margin: 0;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #2563eb; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.025em;">Coordenador de Cursos</h2>
            <p style="color: #64748b; margin: 6px 0 0 0; font-size: 14px;">Olá, <strong>${student.nome}</strong>!</p>
          </div>
          
          <div style="border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; padding: 24px 0; margin-bottom: 24px; text-align: center;">
            <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569; line-height: 1.5;">Aqui está o seu Código de Acesso exclusivo para realizar login na Área do Aluno:</p>
            <div style="background-color: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 24px; font-weight: 700; color: #1d4ed8; padding: 12px 24px; letter-spacing: 1px; display: inline-block;">
              ${accessRecord.access_code}
            </div>
            <p style="margin: 16px 0 0 0; font-size: 13px; color: #64748b;">Sua senha de primeiro acesso/padrão é: <strong style="color: #334155;">123</strong></p>
          </div>

          <div style="margin-bottom: 24px; background-color: #f8fafc; border-radius: 8px; padding: 16px; border: 1px solid #f1f5f9;">
            <h3 style="font-size: 13px; font-weight: 700; color: #334155; margin: 0 0 8px 0; uppercase; tracking-wider;">COMO ACESSAR:</h3>
            <ol style="margin: 0; padding-left: 18px; font-size: 13px; color: #475569; line-height: 1.6;">
              <li style="margin-bottom: 4px;">Acesse a página de login do sistema.</li>
              <li style="margin-bottom: 4px;">Selecione a aba <strong>"Aluno (Código)"</strong>.</li>
              <li style="margin-bottom: 4px;">Insira o Código de Acesso acima.</li>
              <li>Use a senha temporária <strong>123</strong> para entrar.</li>
            </ol>
          </div>

          <div style="text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px;">
            <p style="font-size: 11px; color: #94a3b8; margin: 0;">Esta é uma mensagem automática gerada pelo Coordenador de Cursos. Por favor, não responda diretamente a este e-mail.</p>
          </div>
        </div>
      </div>
    `;

    // 6. Send Email
    await transporter.sendMail({
      from: smtpFrom,
      to: student.email,
      subject: `🗝️ Seu Código de Acesso - Coordenador de Cursos`,
      html: htmlContent,
    });

    return NextResponse.json({ success: true, message: 'Código de acesso enviado com sucesso para a caixa de e-mail do aluno.' });

  } catch (error: any) {
    console.error('Error in send-access-code API:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor ao enviar e-mail.' }, { status: 500 });
  }
}
