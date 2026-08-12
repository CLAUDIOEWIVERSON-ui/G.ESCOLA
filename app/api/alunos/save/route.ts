import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import { supabase as clientSupabase } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, dataToSave } = body;

    if (!dataToSave || !dataToSave.nome) {
      return NextResponse.json({ error: 'Nome do aluno é obrigatório' }, { status: 400 });
    }

    // Ensure matricula is never null or empty to satisfy NOT NULL database constraint
    if (!dataToSave.matricula || typeof dataToSave.matricula !== 'string' || dataToSave.matricula.trim().length < 2) {
      dataToSave.matricula = `MAT${new Date().getFullYear()}${Math.floor(100000 + Math.random() * 899999)}`;
    }

    const db = isSupabaseAdminConfigured() ? supabaseAdmin : clientSupabase;

    let resultError = null;
    let savedData = null;

    if (id) {
      // Try update
      let { data, error } = await db
        .from('alunos')
        .update(dataToSave)
        .eq('id', id)
        .select();

      if (error && (error.code === '42703' || (error.message && error.message.includes('curso_id')))) {
        // Fallback without curso_id if column not present yet
        const copyData = { ...dataToSave };
        delete copyData.curso_id;
        const retry = await db
          .from('alunos')
          .update(copyData)
          .eq('id', id)
          .select();
        data = retry.data;
        error = retry.error;
      }

      resultError = error;
      savedData = data && data.length > 0 ? data[0] : null;
    } else {
      // Try insert
      let { data, error } = await db
        .from('alunos')
        .insert([dataToSave])
        .select();

      if (error && (error.code === '42703' || (error.message && error.message.includes('curso_id')))) {
        // Fallback without curso_id if column not present yet
        const copyData = { ...dataToSave };
        delete copyData.curso_id;
        const retry = await db
          .from('alunos')
          .insert([copyData])
          .select();
        data = retry.data;
        error = retry.error;
      }

      resultError = error;
      savedData = data && data.length > 0 ? data[0] : null;
    }

    if (resultError) {
      return NextResponse.json({ error: resultError.message || 'Erro ao salvar aluno no banco de dados' }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: savedData });
  } catch (error: any) {
    console.error('[api/alunos/save] Exception:', error);
    return NextResponse.json({ error: error.message || 'Erro interno no servidor' }, { status: 500 });
  }
}
