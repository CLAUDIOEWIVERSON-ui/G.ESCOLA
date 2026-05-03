import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const alunoId = searchParams.get('alunoId');
  const turmaId = searchParams.get('turmaId');

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
