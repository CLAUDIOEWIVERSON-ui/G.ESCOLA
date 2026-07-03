import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Check if authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Check if Admin
    const useAdmin = isSupabaseAdminConfigured();
    let isAdmin = false;

    if (useAdmin) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      isAdmin = profile?.role === 'admin';
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      isAdmin = profile?.role === 'admin';
    }

    if (!isAdmin) {
      return NextResponse.json({ error: 'Não autorizado. Apenas administradores podem acessar esta configuração.' }, { status: 403 });
    }

    // SMTP variables
    const smtpHost = process.env.SMTP_HOST || '';
    const smtpPort = process.env.SMTP_PORT || '587';
    const smtpUser = process.env.SMTP_USER || '';
    const smtpPass = process.env.SMTP_PASS || '';
    const smtpFrom = process.env.SMTP_FROM || 'Coordenador de Cursos <noreply@escola.digital>';
    const smtpSecure = process.env.SMTP_SECURE === 'true';

    const isConfigured = !!(smtpHost && smtpUser && smtpPass);

    return NextResponse.json({
      smtpHost,
      smtpPort,
      smtpUser: smtpUser ? `${smtpUser.slice(0, 3)}***@${smtpUser.includes('@') ? smtpUser.split('@')[1] : '...'}` : '',
      smtpFrom,
      smtpSecure,
      isConfigured,
      hasPassword: !!smtpPass
    });

  } catch (error: any) {
    console.error('[smtp-status] Error fetching status:', error);
    return NextResponse.json({ error: error.message || 'Erro ao carregar status do SMTP' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check if authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Check if Admin
    const useAdmin = isSupabaseAdminConfigured();
    let isAdmin = false;

    if (useAdmin) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      isAdmin = profile?.role === 'admin';
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      isAdmin = profile?.role === 'admin';
    }

    if (!isAdmin) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
    }

    const { testEmail } = await req.json();

    if (!testEmail || !testEmail.includes('@')) {
      return NextResponse.json({ error: 'ID do destinatário de teste inválido.' }, { status: 400 });
    }

    // SMTP variables
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || 'Coordenador de Cursos <noreply@escola.digital>';
    const smtpSecure = process.env.SMTP_SECURE === 'true';

    if (!smtpHost || !smtpUser || !smtpPass) {
      return NextResponse.json({ 
        error: 'SMTP incompleto no ambiente. Por favor, configure as chaves SMTP_HOST, SMTP_USER e SMTP_PASS.' 
      }, { status: 400 });
    }

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

    const testHtml = `
      <div style="font-family: Arial, sans-serif; background-color: #f3f4f6; padding: 40px; color: #1f2937;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
          <h2 style="color: #10b981; margin-top: 0; display: flex; align-items: center; gap: 8px;">
            ✅ Conexão SMTP Sucedida!
          </h2>
          <p style="font-size: 14px; line-height: 1.6; color: #4b5563;">
            Este e-mail é um teste do servidor de envio automático de códigos de acesso do <strong>Coordenador de Cursos</strong>.
          </p>
          <div style="margin: 24px 0; background-color: #f9fafb; border-left: 4px solid #10b981; padding: 16px; border-radius: 4px;">
            <p style="margin: 0; font-family: monospace; font-size: 13px; color: #374151;">
              <strong>Host:</strong> ${smtpHost}<br/>
              <strong>Porta:</strong> ${smtpPort}<br/>
              <strong>Remetente:</strong> ${smtpFrom}<br/>
              <strong>Status:</strong> Ativo & Prontificado
            </p>
          </div>
          <p style="font-size: 12px; color: #9ca3af; margin-bottom: 0; border-top: 1px solid #f3f4f6; padding-top: 16px;">
            Enviado de forma autônoma pelo motor interno de testes de canais SMTP.
          </p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: smtpFrom,
      to: testEmail,
      subject: `🧪 Teste de Conexão SMTP - Coordenador de Cursos`,
      html: testHtml,
    });

    return NextResponse.json({ success: true, message: 'E-mail de teste enviado com êxito! Conexão de rede operacional.' });

  } catch (error: any) {
    console.error('[smtp-status] Send test email failure:', error);
    return NextResponse.json({ error: error.message || 'Falha de comunicação/autenticação com o host de e-mails.' }, { status: 500 });
  }
}
