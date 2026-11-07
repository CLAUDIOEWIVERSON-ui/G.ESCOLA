import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId') || '';
    const email = searchParams.get('email') || '';
    const nome = searchParams.get('nome') || '';
    const nip = searchParams.get('nip') || '';
    const matricula = searchParams.get('matricula') || '';
    const turmaId = searchParams.get('turmaId') || '';

    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Supabase admin not configured' }, { status: 500 });
    }

    let alunoData: any = null;

    // 1. Busca direta por ID na tabela alunos
    if (studentId && studentId !== 'null' && studentId !== 'undefined') {
      const { data, error } = await supabaseAdmin
        .from('alunos')
        .select('id, nome, turma_id, foto_url, posto_graduacao, nome_guerra, nip, om, matricula')
        .eq('id', studentId)
        .is('deleted_at', null)
        .maybeSingle();

      if (data && !error) alunoData = data;
    }

    // 2. Busca na tabela student_access_codes por student_id ou access_code
    if (!alunoData && studentId && studentId !== 'null') {
      try {
        const { data: codeRec } = await supabaseAdmin
          .from('student_access_codes')
          .select('student_id')
          .or(`student_id.eq.${studentId},access_code.eq.${studentId}`)
          .maybeSingle();

        if (codeRec?.student_id) {
          const { data } = await supabaseAdmin
            .from('alunos')
            .select('id, nome, turma_id, foto_url, posto_graduacao, nome_guerra, nip, om, matricula')
            .eq('id', codeRec.student_id)
            .is('deleted_at', null)
            .maybeSingle();
          if (data) alunoData = data;
        }
      } catch (codeErr) {
        // ignora
      }
    }

    // 3. Se studentId for o ID da conta de autenticação (auth.users id), buscar os metadados e profiles
    if (!alunoData && studentId && studentId !== 'null') {
      try {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(studentId);
        const sIdFromMeta = authUser?.user?.user_metadata?.student_id;
        const sEmailFromMeta = authUser?.user?.email;
        const sNipFromMeta = authUser?.user?.user_metadata?.nip;
        const sNomeFromMeta = authUser?.user?.user_metadata?.full_name;

        if (sIdFromMeta) {
          const { data } = await supabaseAdmin
            .from('alunos')
            .select('id, nome, turma_id, foto_url, posto_graduacao, nome_guerra, nip, om, matricula')
            .eq('id', sIdFromMeta)
            .is('deleted_at', null)
            .maybeSingle();
          if (data) alunoData = data;
        }

        if (!alunoData && sEmailFromMeta && sEmailFromMeta.startsWith('aluno_nif_')) {
          const extractedId = sEmailFromMeta.replace('aluno_nif_', '').split('@')[0];
          const { data } = await supabaseAdmin
            .from('alunos')
            .select('id, nome, turma_id, foto_url, posto_graduacao, nome_guerra, nip, om, matricula')
            .eq('id', extractedId)
            .is('deleted_at', null)
            .maybeSingle();
          if (data) alunoData = data;
        }

        if (!alunoData && sNipFromMeta) {
          const { data } = await supabaseAdmin
            .from('alunos')
            .select('id, nome, turma_id, foto_url, posto_graduacao, nome_guerra, nip, om, matricula')
            .eq('nip', sNipFromMeta)
            .is('deleted_at', null)
            .maybeSingle();
          if (data) alunoData = data;
        }

        if (!alunoData && sNomeFromMeta) {
          const { data } = await supabaseAdmin
            .from('alunos')
            .select('id, nome, turma_id, foto_url, posto_graduacao, nome_guerra, nip, om, matricula')
            .ilike('nome', `%${sNomeFromMeta.trim()}%`)
            .is('deleted_at', null)
            .limit(1)
            .maybeSingle();
          if (data) alunoData = data;
        }
      } catch (authErr) {
        // ignora erro de lookup
      }
    }

    // 4. Busca pelo perfil em profiles se ainda não encontrou
    if (!alunoData && studentId && studentId !== 'null') {
      try {
        const { data: prof } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', studentId)
          .maybeSingle();

        if (prof) {
          if (prof.nip) {
            const { data } = await supabaseAdmin
              .from('alunos')
              .select('id, nome, turma_id, foto_url, posto_graduacao, nome_guerra, nip, om, matricula')
              .eq('nip', prof.nip)
              .is('deleted_at', null)
              .maybeSingle();
            if (data) alunoData = data;
          }

          if (!alunoData && (prof.full_name || prof.nome)) {
            const { data } = await supabaseAdmin
              .from('alunos')
              .select('id, nome, turma_id, foto_url, posto_graduacao, nome_guerra, nip, om, matricula')
              .ilike('nome', `%${(prof.full_name || prof.nome).trim()}%`)
              .is('deleted_at', null)
              .limit(1)
              .maybeSingle();
            if (data) alunoData = data;
          }

          // Se profile já possui foto_url e nenhum aluno foi associado
          if (!alunoData && prof.foto_url) {
            alunoData = {
              id: prof.id,
              nome: prof.full_name || prof.nome || 'Aluno',
              foto_url: prof.foto_url,
              turma_id: prof.turma_id || null,
              posto_graduacao: prof.posto_graduacao || null,
              nome_guerra: prof.nome_guerra || null,
              nip: prof.nip || null,
              om: prof.om || null
            };
          }
        }
      } catch (profErr) {
        // ignora
      }
    }

    // 5. Busca por e-mail (shadow account ou e-mail pessoal)
    if (!alunoData && email) {
      let extractedId = '';
      if (email.startsWith('aluno_nif_') && email.includes('@')) {
        extractedId = email.replace('aluno_nif_', '').split('@')[0];
      }

      if (extractedId) {
        const { data, error } = await supabaseAdmin
          .from('alunos')
          .select('id, nome, turma_id, foto_url, posto_graduacao, nome_guerra, nip, om, matricula')
          .eq('id', extractedId)
          .is('deleted_at', null)
          .maybeSingle();
        if (data && !error) alunoData = data;
      }

      if (!alunoData) {
        const { data, error } = await supabaseAdmin
          .from('alunos')
          .select('id, nome, turma_id, foto_url, posto_graduacao, nome_guerra, nip, om, matricula')
          .ilike('email', email.trim())
          .is('deleted_at', null)
          .maybeSingle();
        if (data && !error) alunoData = data;
      }
    }

    // 6. Busca por NIP
    if (!alunoData && nip) {
      const { data, error } = await supabaseAdmin
        .from('alunos')
        .select('id, nome, turma_id, foto_url, posto_graduacao, nome_guerra, nip, om, matricula')
        .eq('nip', nip.trim())
        .is('deleted_at', null)
        .maybeSingle();
      if (data && !error) alunoData = data;
    }

    // 7. Busca por matrícula
    if (!alunoData && matricula) {
      const { data, error } = await supabaseAdmin
        .from('alunos')
        .select('id, nome, turma_id, foto_url, posto_graduacao, nome_guerra, nip, om, matricula')
        .eq('matricula', matricula.trim())
        .is('deleted_at', null)
        .maybeSingle();
      if (data && !error) alunoData = data;
    }

    // 8. Busca por nome e turma
    if (!alunoData && nome) {
      let q = supabaseAdmin
        .from('alunos')
        .select('id, nome, turma_id, foto_url, posto_graduacao, nome_guerra, nip, om, matricula')
        .is('deleted_at', null)
        .ilike('nome', `%${nome.trim()}%`);

      if (turmaId) {
        q = q.eq('turma_id', turmaId);
      }

      const { data: listData } = await q.limit(1);
      if (listData && listData.length > 0) {
        alunoData = listData[0];
      }
    }

    if (!alunoData) {
      return NextResponse.json({ error: 'Aluno não encontrado', foto_url: null }, { status: 404 });
    }

    // Sincronizar foto imediatamente com o perfil do usuário caso ele tenha conta de acesso
    if (alunoData.foto_url && studentId) {
      try {
        await supabaseAdmin
          .from('profiles')
          .update({ foto_url: alunoData.foto_url })
          .eq('id', studentId);
      } catch (syncErr) {
        // ignora
      }
    }

    return NextResponse.json({
      success: true,
      id: alunoData.id,
      nome: alunoData.nome,
      foto_url: alunoData.foto_url || null,
      turma_id: alunoData.turma_id,
      posto_graduacao: alunoData.posto_graduacao || null,
      nome_guerra: alunoData.nome_guerra || null,
      nip: alunoData.nip || null,
      om: alunoData.om || null
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao carregar foto do aluno' }, { status: 500 });
  }
}

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

        // Sincronizar também os metadados do usuário e a tabela profiles do aluno
        const studentShadowEmail = `aluno_nif_${alunoId}@aluno.escola.digital`;
        const { data: uList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const targetAuthUser = (uList?.users || []).find((u: any) => 
          u.email?.toLowerCase() === studentShadowEmail.toLowerCase() ||
          u.user_metadata?.student_id === alunoId
        );
        if (targetAuthUser) {
          await supabaseAdmin.auth.admin.updateUserById(targetAuthUser.id, {
            user_metadata: {
              ...(targetAuthUser.user_metadata || {}),
              foto_url: publicUrl,
              avatar_url: publicUrl
            }
          });
          await supabaseAdmin
            .from('profiles')
            .update({ foto_url: publicUrl })
            .eq('id', targetAuthUser.id);
        } else {
          // Também tentar atualizar profiles pelo próprio alunoId caso o ID coincida
          await supabaseAdmin
            .from('profiles')
            .update({ foto_url: publicUrl })
            .eq('id', alunoId);
        }
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
