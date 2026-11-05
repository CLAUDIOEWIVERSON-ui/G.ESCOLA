import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const alunoId = formData.get('alunoId') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado.' },
        { status: 400 }
      );
    }

    // Verify it's an image
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'O arquivo selecionado não é uma imagem válida.' },
        { status: 400 }
      );
    }

    // Size limit: 10MB
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

      // 1. Ensure bucket exists and is public
      try {
        const { data: buckets } = await supabaseAdmin.storage.listBuckets();
        const bucketExists = (buckets || []).some((b: any) => b.id === bucketName || b.name === bucketName);
        if (!bucketExists) {
          await supabaseAdmin.storage.createBucket(bucketName, { public: true });
        } else {
          await supabaseAdmin.storage.updateBucket(bucketName, { public: true });
        }
      } catch (bucketErr) {
        console.warn('Verificação de bucket de fotos:', bucketErr);
      }

      // 2. Generate clean, unique file path
      const ext = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() || 'jpg' : 'jpg';
      const cleanFileName = `alunos/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;

      // 3. Upload with Service Role Key
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
      } else {
        console.warn('Erro ao subir foto no bucket alunos-fotos, tentando bucket escola:', uploadError.message);
        
        // Fallback to 'escola' bucket
        const { error: fallbackError } = await supabaseAdmin.storage
          .from('escola')
          .upload(cleanFileName, buffer, {
            contentType: file.type || 'image/jpeg',
            upsert: true
          });

        if (!fallbackError) {
          const { data: pubData2 } = supabaseAdmin.storage
            .from('escola')
            .getPublicUrl(cleanFileName);
          if (pubData2?.publicUrl) {
            publicUrl = pubData2.publicUrl;
          }
        }
      }
    }

    // 4. In case storage upload did not return a public URL, fallback to inline base64
    if (!publicUrl) {
      const base64Data = buffer.toString('base64');
      publicUrl = `data:${file.type || 'image/jpeg'};base64,${base64Data}`;
    }

    // 5. If alunoId was provided, update the student row directly
    if (alunoId && alunoId !== 'null' && alunoId !== 'undefined') {
      try {
        await supabaseAdmin
          .from('alunos')
          .update({ foto_url: publicUrl })
          .eq('id', alunoId);
      } catch (dbErr) {
        console.warn('Aviso ao atualizar foto_url na tabela alunos:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      publicUrl,
      message: 'Foto carregada com sucesso!'
    });
  } catch (error: any) {
    console.error('Erro na rota /api/alunos/foto:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao processar o upload da foto.' },
      { status: 500 }
    );
  }
}
