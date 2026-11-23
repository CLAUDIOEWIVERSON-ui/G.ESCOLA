import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserRole } from '@/lib/auth/serverAuth';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const BUCKET_NAME = 'recados';
const INDEX_FILE_PATH = '_index.json';

interface RecadoRecord {
  id: string;
  turma_id: string;
  aluno_id: string;
  sender_id: string;
  sender_name: string;
  titulo: string;
  mensagem: string;
  lido: boolean;
  lido_em: string | null;
  created_at: string;
}

function isMissingTableError(err: any): boolean {
  const msg = `${err?.message || ''} ${err?.details || ''} ${err?.hint || ''}`.toLowerCase();
  return (
    err?.code === '42P01' ||
    err?.code === 'PGRST205' ||
    msg.includes('recados_alunos') ||
    msg.includes('schema cache') ||
    msg.includes('does not exist')
  );
}

function isMobileRequest(req: NextRequest): boolean {
  const clientDevice = (req.headers.get('x-client-device') || '').toLowerCase();
  const chMobile = req.headers.get('sec-ch-ua-mobile') || '';
  const touchHeader = req.headers.get('x-client-touch') || '';
  const ua = req.headers.get('user-agent') || '';
  const isMobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(ua);

  return clientDevice === 'mobile' && (isMobileUa || chMobile === '?1' || touchHeader === '1');
}

async function ensureStorageBucket() {
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    if (!buckets?.some((b) => b.name === BUCKET_NAME)) {
      await supabaseAdmin.storage.createBucket(BUCKET_NAME, { public: false });
    }
  } catch {
    // Ignore if bucket already exists
  }
}

async function readStorageRecados(): Promise<RecadoRecord[]> {
  try {
    await ensureStorageBucket();
    const { data, error } = await supabaseAdmin.storage.from(BUCKET_NAME).download(INDEX_FILE_PATH);
    if (error || !data) return [];
    const text = await data.text();
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeStorageRecados(records: RecadoRecord[]): Promise<void> {
  await ensureStorageBucket();
  const payload = JSON.stringify(records);
  const blob = new Blob([payload], { type: 'application/json' });
  const { error } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .upload(INDEX_FILE_PATH, blob, { upsert: true, contentType: 'application/json' });
  if (error) {
    throw new Error(error.message || 'Falha ao salvar recados no armazenamento.');
  }
}

async function resolveAssignedTurmaId(user: any): Promise<string | null> {
  if (user?.user_metadata?.turma_id) {
    return String(user.user_metadata.turma_id);
  }
  const { data: prof } = await supabaseAdmin
    .from('profiles')
    .select('turma_id')
    .eq('id', user.id)
    .maybeSingle();
  return prof?.turma_id ? String(prof.turma_id) : null;
}

async function resolveStudentForUser(user: any): Promise<{ studentId: string | null; turmaId: string | null }> {
  const email = user?.email || '';
  const meta = user?.user_metadata || {};

  const { data: prof } = await supabaseAdmin
    .from('profiles')
    .select('student_id, full_name, turma_id')
    .eq('id', user.id)
    .maybeSingle();

  let studentId: string | null =
    prof?.student_id ||
    meta.student_id ||
    (email.startsWith('aluno_nif_') ? email.replace('aluno_nif_', '').split('@')[0] : null);

  if (studentId) {
    const { data: aluno } = await supabaseAdmin
      .from('alunos')
      .select('id, turma_id')
      .eq('id', studentId)
      .is('deleted_at', null)
      .maybeSingle();
    if (aluno) {
      return { studentId: aluno.id, turmaId: aluno.turma_id || null };
    }
  }

  if (email && !email.startsWith('aluno_nif_') && !email.endsWith('@aluno.escola.digital')) {
    const { data: alunoByEmail } = await supabaseAdmin
      .from('alunos')
      .select('id, turma_id')
      .eq('email', email)
      .is('deleted_at', null)
      .maybeSingle();
    if (alunoByEmail) {
      return { studentId: alunoByEmail.id, turmaId: alunoByEmail.turma_id || null };
    }
  }

  const fullName = (prof?.full_name || meta.full_name || '').trim();
  if (fullName) {
    const { data: alunoByName } = await supabaseAdmin
      .from('alunos')
      .select('id, turma_id')
      .ilike('nome', fullName)
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle();
    if (alunoByName) {
      return { studentId: alunoByName.id, turmaId: alunoByName.turma_id || null };
    }
  }

  return { studentId: studentId || null, turmaId: prof?.turma_id || null };
}

async function hydrateAlunosInfo(records: RecadoRecord[]) {
  if (records.length === 0) return [];
  const alunoIds = Array.from(new Set(records.map((r) => r.aluno_id).filter(Boolean)));
  const alunoMap = new Map<string, any>();

  if (alunoIds.length > 0) {
    const { data: alunos } = await supabaseAdmin
      .from('alunos')
      .select('id, nome, nome_guerra, posto_graduacao, matricula')
      .in('id', alunoIds);
    (alunos || []).forEach((a: any) => alunoMap.set(a.id, a));
  }

  return records
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((r) => ({
      ...r,
      aluno: alunoMap.get(r.aluno_id) || null,
    }));
}

export async function GET(req: NextRequest) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: 'Serviço administrativo indisponível.' }, { status: 500 });
  }

  try {
    const { user, role } = await getAuthUserRole(req);
    if (!user || !role) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedTurmaId = searchParams.get('turmaId');
    const requestedAlunoId = searchParams.get('alunoId');

    let rows: RecadoRecord[] = [];
    let usedFallback = false;

    if (role === 'aluno') {
      const { studentId } = await resolveStudentForUser(user);
      if (!studentId) {
        return NextResponse.json({ recados: [] });
      }

      const { data, error } = await supabaseAdmin
        .from('recados_alunos')
        .select('*')
        .eq('aluno_id', studentId)
        .order('created_at', { ascending: false });

      if (error && isMissingTableError(error)) {
        usedFallback = true;
        const all = await readStorageRecados();
        rows = all.filter((r) => r.aluno_id === studentId);
      } else if (error) {
        throw error;
      } else {
        rows = (data || []) as RecadoRecord[];
      }
    } else if (role === 'acompanhante') {
      const assignedTurmaId = await resolveAssignedTurmaId(user);
      if (!assignedTurmaId) {
        return NextResponse.json({ recados: [] });
      }

      let q = supabaseAdmin
        .from('recados_alunos')
        .select('*')
        .eq('turma_id', assignedTurmaId)
        .order('created_at', { ascending: false });

      if (requestedAlunoId) {
        q = q.eq('aluno_id', requestedAlunoId);
      }

      const { data, error } = await q;
      if (error && isMissingTableError(error)) {
        usedFallback = true;
        const all = await readStorageRecados();
        rows = all.filter(
          (r) => r.turma_id === assignedTurmaId && (!requestedAlunoId || r.aluno_id === requestedAlunoId)
        );
      } else if (error) {
        throw error;
      } else {
        rows = (data || []) as RecadoRecord[];
      }
    } else {
      let q = supabaseAdmin
        .from('recados_alunos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (requestedTurmaId) q = q.eq('turma_id', requestedTurmaId);
      if (requestedAlunoId) q = q.eq('aluno_id', requestedAlunoId);

      const { data, error } = await q;
      if (error && isMissingTableError(error)) {
        usedFallback = true;
        const all = await readStorageRecados();
        rows = all.filter(
          (r) =>
            (!requestedTurmaId || r.turma_id === requestedTurmaId) &&
            (!requestedAlunoId || r.aluno_id === requestedAlunoId)
        );
      } else if (error) {
        throw error;
      } else {
        rows = (data || []) as RecadoRecord[];
      }
    }

    const hydrated = await hydrateAlunosInfo(rows);
    return NextResponse.json({ recados: hydrated, fallback: usedFallback });
  } catch (err: any) {
    console.error('[api/recados GET] Error:', err);
    return NextResponse.json({ error: err?.message || 'Erro ao buscar recados.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: 'Serviço administrativo indisponível.' }, { status: 500 });
  }

  try {
    const { user, role } = await getAuthUserRole(req);
    if (!user || !role) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    // Strict role enforcement: ONLY acompanhante (Monitor de Turma) can send individual student messages
    if (role !== 'acompanhante') {
      return NextResponse.json(
        {
          error: 'Acesso negado: Somente o Monitor de Turma pode enviar recados individuais aos alunos.',
          code: 'FORBIDDEN_ROLE',
        },
        { status: 403 }
      );
    }

    // Strict mobile-device enforcement
    if (!isMobileRequest(req)) {
      return NextResponse.json(
        {
          error: 'Ação bloqueada: O Monitor de Turma só pode enviar recados individuais através de um dispositivo móvel (celular ou tablet).',
          code: 'FORBIDDEN_DESKTOP_DEVICE',
        },
        { status: 403 }
      );
    }

    const assignedTurmaId = await resolveAssignedTurmaId(user);
    if (!assignedTurmaId) {
      return NextResponse.json(
        { error: 'Nenhuma turma vinculada ao seu perfil de monitor de turma.' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const alunoId = String(body?.aluno_id || '').trim();
    const titulo = String(body?.titulo || 'Recado do Monitor da Turma').trim().slice(0, 120);
    const mensagem = String(body?.mensagem || '').trim().slice(0, 2000);

    if (!alunoId || !mensagem) {
      return NextResponse.json(
        { error: 'Selecione o aluno e informe a mensagem do recado.' },
        { status: 400 }
      );
    }

    // Verify target student exists and belongs to the acompanhante's assigned turma
    const { data: aluno, error: alunoErr } = await supabaseAdmin
      .from('alunos')
      .select('id, nome, turma_id')
      .eq('id', alunoId)
      .is('deleted_at', null)
      .maybeSingle();

    if (alunoErr || !aluno) {
      return NextResponse.json({ error: 'Aluno não encontrado.' }, { status: 404 });
    }

    if (aluno.turma_id !== assignedTurmaId) {
      return NextResponse.json(
        { error: 'Você só pode enviar recados para alunos da sua turma vinculada.' },
        { status: 403 }
      );
    }

    const { data: profSender } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();

    const senderName =
      profSender?.full_name ||
      user.user_metadata?.full_name ||
      user.email?.split('@')[0] ||
      'Monitor de Turma';

    const newRecord: RecadoRecord = {
      id: crypto.randomUUID(),
      turma_id: assignedTurmaId,
      aluno_id: aluno.id,
      sender_id: user.id,
      sender_name: senderName,
      titulo: titulo || 'Recado do Monitor da Turma',
      mensagem,
      lido: false,
      lido_em: null,
      created_at: new Date().toISOString(),
    };

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('recados_alunos')
      .insert(newRecord)
      .select('*')
      .single();

    if (insertErr && isMissingTableError(insertErr)) {
      const existing = await readStorageRecados();
      existing.unshift(newRecord);
      await writeStorageRecados(existing);
      const [hydrated] = await hydrateAlunosInfo([newRecord]);
      return NextResponse.json({ success: true, recado: hydrated, fallback: true }, { status: 201 });
    } else if (insertErr) {
      throw insertErr;
    }

    const [hydrated] = await hydrateAlunosInfo([inserted as RecadoRecord]);
    return NextResponse.json({ success: true, recado: hydrated }, { status: 201 });
  } catch (err: any) {
    console.error('[api/recados POST] Error:', err);
    return NextResponse.json({ error: err?.message || 'Erro ao enviar recado.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: 'Serviço administrativo indisponível.' }, { status: 500 });
  }

  try {
    const { user, role } = await getAuthUserRole(req);
    if (!user || !role) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    if (role !== 'aluno') {
      return NextResponse.json({ error: 'Apenas o aluno destinatário pode confirmar leitura.' }, { status: 403 });
    }

    const body = await req.json();
    const recadoId = String(body?.id || '').trim();
    if (!recadoId) {
      return NextResponse.json({ error: 'ID do recado é obrigatório.' }, { status: 400 });
    }

    const { studentId } = await resolveStudentForUser(user);
    if (!studentId) {
      return NextResponse.json({ error: 'Cadastro do aluno não localizado.' }, { status: 404 });
    }

    const nowIso = new Date().toISOString();

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('recados_alunos')
      .update({ lido: true, lido_em: nowIso })
      .eq('id', recadoId)
      .eq('aluno_id', studentId)
      .select('*')
      .maybeSingle();

    if (updateErr && isMissingTableError(updateErr)) {
      const existing = await readStorageRecados();
      const idx = existing.findIndex((r) => r.id === recadoId && r.aluno_id === studentId);
      if (idx === -1) {
        return NextResponse.json({ error: 'Recado não encontrado.' }, { status: 404 });
      }
      existing[idx] = { ...existing[idx], lido: true, lido_em: nowIso };
      await writeStorageRecados(existing);
      return NextResponse.json({ success: true, recado: existing[idx], fallback: true });
    } else if (updateErr) {
      throw updateErr;
    }

    if (!updated) {
      return NextResponse.json({ error: 'Recado não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, recado: updated });
  } catch (err: any) {
    console.error('[api/recados PATCH] Error:', err);
    return NextResponse.json({ error: err?.message || 'Erro ao marcar recado como lido.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: 'Serviço administrativo indisponível.' }, { status: 500 });
  }

  try {
    const { user, role } = await getAuthUserRole(req);
    if (!user || !role) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    if (role !== 'acompanhante') {
      return NextResponse.json(
        { error: 'Somente o Monitor de Turma pode remover recados individuais enviados.' },
        { status: 403 }
      );
    }

    if (!isMobileRequest(req)) {
      return NextResponse.json(
        { error: 'Ação permitida apenas via dispositivo móvel.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID do recado é obrigatório.' }, { status: 400 });
    }

    const { error: delErr } = await supabaseAdmin
      .from('recados_alunos')
      .delete()
      .eq('id', id)
      .eq('sender_id', user.id);

    if (delErr && isMissingTableError(delErr)) {
      const existing = await readStorageRecados();
      const target = existing.find((r) => r.id === id && r.sender_id === user.id);
      if (!target) {
        return NextResponse.json({ error: 'Recado não encontrado.' }, { status: 404 });
      }
      await writeStorageRecados(existing.filter((r) => r.id !== id));
      return NextResponse.json({ success: true, fallback: true });
    } else if (delErr) {
      throw delErr;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[api/recados DELETE] Error:', err);
    return NextResponse.json({ error: err?.message || 'Erro ao excluir recado.' }, { status: 500 });
  }
}
