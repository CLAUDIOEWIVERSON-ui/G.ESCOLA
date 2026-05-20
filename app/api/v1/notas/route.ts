import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { getSession, getUserRole, getStudentIdByEmail, requireRole } from '@/lib/auth/rbac';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const role = await getUserRole(session.user.id);
  const { searchParams } = new URL(request.url);
  let alunoId = searchParams.get('alunoId');
  const turmaId = searchParams.get('turmaId');

  // RBAC for Students: Force filtering by their own ID
  if (role === 'aluno') {
    const myStudentId = await getStudentIdByEmail(session.user.email!);
    if (!myStudentId) {
      return NextResponse.json({ error: 'Perfil de aluno não encontrado' }, { status: 404 });
    }
    alunoId = myStudentId;
  }

  try {
    let query = supabase.from('notas').select('*, aluno:alunos(nome), disciplina:disciplinas(nome)');
    
    if (alunoId) query = query.eq('aluno_id', alunoId);
    if (turmaId) query = query.eq('turma_id', turmaId);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { authorized, response } = await requireRole(['admin', 'instrutor']);
  if (!authorized) return response!;

  try {
    const body = await request.json();
    // Rule: Approval calculation happens via DB Trigger
    const { data, error } = await supabase
      .from('notas')
      .insert([body])
      .select();
    
    if (error) throw error;
    return NextResponse.json(data[0], { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
