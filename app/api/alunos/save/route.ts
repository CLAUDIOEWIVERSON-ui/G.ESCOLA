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

    // Ensure status is valid lowercase enum value
    if (dataToSave.status) {
      const lowerStatus = dataToSave.status.toString().toLowerCase();
      if (lowerStatus === 'ativo' || lowerStatus === 'inativo' || lowerStatus === 'desistente' || lowerStatus === 'pre_inscrito' || lowerStatus === 'pré-inscrito') {
        dataToSave.status = lowerStatus === 'pré-inscrito' ? 'pre_inscrito' : lowerStatus;
      } else {
        dataToSave.status = 'ativo';
      }
    } else {
      dataToSave.status = 'ativo';
    }

    const db = isSupabaseAdminConfigured() ? supabaseAdmin : clientSupabase;

    const performSave = async (payload: any) => {
      let data, error;
      if (id) {
        const res = await db.from('alunos').update(payload).eq('id', id).select();
        data = res.data;
        error = res.error;
      } else {
        const res = await db.from('alunos').insert([payload]).select();
        data = res.data;
        error = res.error;
      }
      return { data, error };
    };

    let currentPayload = { ...dataToSave };
    let data = null;
    let error = null;

    // Retry loop to automatically strip columns not yet present in schema
    for (let attempt = 0; attempt < 5; attempt++) {
      const res = await performSave(currentPayload);
      data = res.data;
      error = res.error;

      if (!error) break;

      const msg = error.message || '';
      let stripped = false;

      // Extract column name from PostgREST/Postgres error message
      const match1 = msg.match(/Could not find the '([^']+)' column/i);
      const match2 = msg.match(/column "([^"]+)"/i);
      const missingCol = match1 ? match1[1] : (match2 ? match2[1] : null);

      if (missingCol && missingCol in currentPayload) {
        delete currentPayload[missingCol];
        stripped = true;
      }

      // Hardcoded fallback checks for common optional columns
      if (msg.includes('endereco') && 'endereco' in currentPayload) {
        delete currentPayload.endereco;
        stripped = true;
      }
      if (msg.includes('curso_id') && 'curso_id' in currentPayload) {
        delete currentPayload.curso_id;
        stripped = true;
      }

      if (!stripped) {
        break; // Cannot auto-recover
      }
    }

    if (error) {
      return NextResponse.json({ error: error.message || 'Erro ao salvar aluno no banco de dados' }, { status: 400 });
    }

    const savedData = data && data.length > 0 ? data[0] : null;
    return NextResponse.json({ success: true, data: savedData });
  } catch (error: any) {
    console.error('[api/alunos/save] Exception:', error);
    return NextResponse.json({ error: error.message || 'Erro interno no servidor' }, { status: 500 });
  }
}
