import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const userId = formData.get('userId') as string | null;
    const email = formData.get('email') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado.' },
        { status: 400 }
      );
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'O arquivo selecionado não é uma imagem válida.' },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'A imagem deve ter no máximo 10MB.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let publicUrl = '';

    if (isSupabaseAdminConfigured()) {
      const bucketName = 'alunos-fotos';

      try {
        const { data: buckets } = await supabaseAdmin.storage.listBuckets();
        const bucketExists = (buckets || []).some((b: any) => b.id === bucketName || b.name === bucketName);
        if (!bucketExists) {
          await supabaseAdmin.storage.createBucket(bucketName, { public: true });
        } else {
          await supabaseAdmin.storage.updateBucket(bucketName, { public: true });
        }
      } catch (bucketErr) {
        console.warn('Verificação de bucket de fotos de usuário:', bucketErr);
      }

      const ext = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() || 'jpg' : 'jpg';
      const cleanFileName = `usuarios/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from(bucketName)
        .upload(cleanFileName, buffer, {
          contentType: file.type || 'image/jpeg',
          upsert: true,
          cacheControl: '3600'
        });

      if (!uploadError) {
        const { data: pubData } = supabaseAdmin.storage
          .from(bucketName)
          .getPublicUrl(cleanFileName);

        if (pubData?.publicUrl) {
          publicUrl = pubData.publicUrl;
        }
      }
    }

    if (!publicUrl) {
      const base64Data = buffer.toString('base64');
      publicUrl = `data:${file.type || 'image/jpeg'};base64,${base64Data}`;
    }

    // Update user auth metadata if userId is present
    if (userId && isSupabaseAdminConfigured()) {
      try {
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: { foto_url: publicUrl, avatar_url: publicUrl }
        });
      } catch (authErr) {
        console.warn('Could not update user metadata:', authErr);
      }

      // Also update profiles table if column exists
      try {
        await supabaseAdmin
          .from('profiles')
          .update({ foto_url: publicUrl })
          .eq('id', userId);
      } catch (profErr) {
        console.warn('Could not update profile table:', profErr);
      }
    }

    // If an email is supplied, check and update matching record in alunos
    if (email && isSupabaseAdminConfigured()) {
      try {
        await supabaseAdmin
          .from('alunos')
          .update({ foto_url: publicUrl })
          .eq('email', email);
      } catch (alunoErr) {
        console.warn('Could not update aluno record with user photo:', alunoErr);
      }
    }

    return NextResponse.json({
      success: true,
      publicUrl,
      message: 'Foto de perfil atualizada com sucesso!'
    });
  } catch (error: any) {
    console.error('Error updating user profile photo:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao processar imagem.' },
      { status: 500 }
    );
  }
}
