import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import { supabase as clientSupabase } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

const getDb = () => isSupabaseAdminConfigured() ? supabaseAdmin : clientSupabase;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const alunoId = searchParams.get('alunoId');
  const turmaId = searchParams.get('turmaId');
  const anoLetivo = searchParams.get('anoLetivo');
  const disciplinaId = searchParams.get('disciplinaId');

  try {
    const db = getDb();
    let query = db.from('notas').select('*, aluno:alunos(nome, matricula, posto_graduacao, nome_guerra), disciplina:disciplinas(nome, codigo)');
    
    if (alunoId) query = query.eq('aluno_id', alunoId);
    if (turmaId) query = query.eq('turma_id', turmaId);
    if (anoLetivo) query = query.eq('ano_letivo', parseInt(anoLetivo));
    if (disciplinaId) query = query.eq('disciplina_id', disciplinaId);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Error fetching notas in GET /api/v1/notas:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const db = getDb();

    // Check if batch payload
    if (Array.isArray(body) || (body && Array.isArray(body.batch))) {
      const items = Array.isArray(body) ? body : body.batch;
      const results = [];

      for (const item of items) {
        const {
          aluno_id,
          turma_id,
          disciplina_id: requestedDiscId,
          curso_id,
          modulo_index,
          fieldName,
          fieldValue,
          nota_final: explicitNotaFinal,
          frequencia,
          ano_letivo: requestedAnoLetivo,
          ...otherFields
        } = item;

        if (!aluno_id || !turma_id) continue;

        let anoLetivo = requestedAnoLetivo ? parseInt(requestedAnoLetivo) : null;
        let resolvedCursoId = curso_id;

        if (!resolvedCursoId || !anoLetivo) {
          const { data: turmaData } = await db
            .from('turmas')
            .select('id, curso_id, ano')
            .eq('id', turma_id)
            .maybeSingle();

          if (turmaData) {
            resolvedCursoId = resolvedCursoId || turmaData.curso_id;
            anoLetivo = anoLetivo || turmaData.ano || new Date().getFullYear();
          } else {
            anoLetivo = anoLetivo || new Date().getFullYear();
          }
        }

        let finalDisciplinaId = requestedDiscId;
        if (!finalDisciplinaId && resolvedCursoId) {
          const { data: discs } = await db
            .from('disciplinas')
            .select('id, nome, modulo_index')
            .eq('curso_id', resolvedCursoId)
            .is('deleted_at', null);

          if (discs && discs.length > 0) {
            finalDisciplinaId = discs[0].id;
          }
        }

        if (!finalDisciplinaId) {
          const { data: anyDisc } = await db.from('disciplinas').select('id').limit(1).maybeSingle();
          if (anyDisc) finalDisciplinaId = anyDisc.id;
        }

        let existingQuery = db
          .from('notas')
          .select('*')
          .eq('aluno_id', aluno_id)
          .eq('turma_id', turma_id);

        if (finalDisciplinaId) {
          existingQuery = existingQuery.eq('disciplina_id', finalDisciplinaId);
        }

        const { data: existingRecords } = await existingQuery;
        let existingNota = existingRecords && existingRecords.length > 0 ? existingRecords[0] : null;

        if (!existingNota) {
          const { data: anyStudentClassNota } = await db
            .from('notas')
            .select('*')
            .eq('aluno_id', aluno_id)
            .eq('turma_id', turma_id)
            .limit(1)
            .maybeSingle();

          if (anyStudentClassNota) {
            existingNota = anyStudentClassNota;
            finalDisciplinaId = anyStudentClassNota.disciplina_id || finalDisciplinaId;
          }
        }

        const gradeUpdates: any = {
          ...otherFields,
          ano_letivo: anoLetivo
        };

        if (frequencia !== undefined) {
          gradeUpdates.frequencia = frequencia === '' || frequencia === null ? null : Number(frequencia);
        }

        if (fieldName) {
          gradeUpdates[fieldName] = fieldValue === '' || fieldValue === null ? null : Number(fieldValue);
        }

        const mergedObj = {
          ...(existingNota || {}),
          ...gradeUpdates
        };

        if (explicitNotaFinal !== undefined) {
          gradeUpdates.nota_final = explicitNotaFinal === '' || explicitNotaFinal === null ? null : Number(explicitNotaFinal);
        } else if (fieldName !== 'nota_final') {
          const validScores: number[] = [];
          for (let m = 1; m <= 20; m++) {
            const val = mergedObj[`nota${m}`];
            if (val !== null && val !== undefined && val !== '' && !isNaN(Number(val))) {
              validScores.push(Number(val));
            }
          }
          if (validScores.length > 0) {
            const avg = validScores.reduce((a, b) => a + b, 0) / validScores.length;
            gradeUpdates.nota_final = Math.round(avg * 100) / 100;
          } else {
            gradeUpdates.nota_final = null;
          }
        }

        if (existingNota) {
          const { data } = await db
            .from('notas')
            .update(gradeUpdates)
            .eq('id', existingNota.id)
            .select('*')
            .single();
          if (data) results.push(data);
        } else if (finalDisciplinaId) {
          const insertPayload = {
            aluno_id,
            turma_id,
            disciplina_id: finalDisciplinaId,
            ano_letivo: anoLetivo,
            ...gradeUpdates
          };

          const { data } = await db
            .from('notas')
            .insert([insertPayload])
            .select('*')
            .single();
          if (data) results.push(data);
        }
      }

      return NextResponse.json({ success: true, count: results.length, data: results }, { status: 200 });
    }

    const {
      aluno_id,
      turma_id,
      disciplina_id: requestedDiscId,
      curso_id,
      modulo_index,
      fieldName,
      fieldValue,
      nota_final: explicitNotaFinal,
      frequencia,
      ano_letivo: requestedAnoLetivo,
      ...otherFields
    } = body;

    if (!aluno_id || !turma_id) {
      return NextResponse.json({ error: 'aluno_id e turma_id são obrigatórios.' }, { status: 400 });
    }

    // 1. Resolve Turma and Ano Letivo
    let anoLetivo = requestedAnoLetivo ? parseInt(requestedAnoLetivo) : null;
    let resolvedCursoId = curso_id;

    if (!resolvedCursoId || !anoLetivo) {
      const { data: turmaData } = await db
        .from('turmas')
        .select('id, curso_id, ano')
        .eq('id', turma_id)
        .maybeSingle();

      if (turmaData) {
        resolvedCursoId = resolvedCursoId || turmaData.curso_id;
        anoLetivo = anoLetivo || turmaData.ano || new Date().getFullYear();
      } else {
        anoLetivo = anoLetivo || new Date().getFullYear();
      }
    }

    // 2. Resolve Disciplina ID
    let finalDisciplinaId = requestedDiscId;

    if (!finalDisciplinaId && resolvedCursoId) {
      // Find all disciplines for this course
      const { data: discs } = await db
        .from('disciplinas')
        .select('id, nome, modulo_index')
        .eq('curso_id', resolvedCursoId)
        .is('deleted_at', null);

      if (discs && discs.length > 0) {
        if (modulo_index) {
          const modNum = Number(modulo_index);
          const matchedDisc = discs.find((d: any) => d.modulo_index === modNum);
          finalDisciplinaId = matchedDisc ? matchedDisc.id : discs[0].id;
        } else {
          finalDisciplinaId = discs[0].id;
        }
      } else {
        // Automatically create a default discipline for the course if none exists
        const { data: newDisc, error: discCreateErr } = await db
          .from('disciplinas')
          .insert({
            nome: 'Disciplinas Modulares Gerais',
            codigo: 'DISC-' + resolvedCursoId.substring(0, 6).toUpperCase(),
            curso_id: resolvedCursoId,
            carga_horaria: 40
          })
          .select('id')
          .single();

        if (discCreateErr) {
          console.error('Error auto-creating default discipline:', discCreateErr);
        } else if (newDisc) {
          finalDisciplinaId = newDisc.id;
        }
      }
    }

    // If still no discipline found, look for any discipline in the system to satisfy FK
    if (!finalDisciplinaId) {
      const { data: anyDisc } = await db.from('disciplinas').select('id').limit(1).maybeSingle();
      if (anyDisc) {
        finalDisciplinaId = anyDisc.id;
      } else {
        return NextResponse.json({ error: 'Nenhuma disciplina encontrada no sistema para vincular a nota.' }, { status: 400 });
      }
    }

    // 3. Find existing note record for this student and class (and discipline if present)
    let existingQuery = db
      .from('notas')
      .select('*')
      .eq('aluno_id', aluno_id)
      .eq('turma_id', turma_id);

    if (finalDisciplinaId) {
      existingQuery = existingQuery.eq('disciplina_id', finalDisciplinaId);
    }

    const { data: existingRecords } = await existingQuery;
    let existingNota = existingRecords && existingRecords.length > 0 ? existingRecords[0] : null;

    // If not found with exact discipline, check any record for this student in this turma
    if (!existingNota) {
      const { data: anyStudentClassNota } = await db
        .from('notas')
        .select('*')
        .eq('aluno_id', aluno_id)
        .eq('turma_id', turma_id)
        .limit(1)
        .maybeSingle();

      if (anyStudentClassNota) {
        existingNota = anyStudentClassNota;
        finalDisciplinaId = anyStudentClassNota.disciplina_id || finalDisciplinaId;
      }
    }

    // 4. Prepare updated fields
    const gradeUpdates: any = {
      ...otherFields,
      ano_letivo: anoLetivo
    };

    if (frequencia !== undefined) {
      gradeUpdates.frequencia = frequencia === '' || frequencia === null ? null : Number(frequencia);
    }

    // If single field provided (e.g. fieldName: 'nota1', fieldValue: 8.5)
    if (fieldName) {
      gradeUpdates[fieldName] = fieldValue === '' || fieldValue === null ? null : Number(fieldValue);
    }

    // 5. Compute new nota_final if not explicitly forced or calculate from all available modular grades
    const mergedObj = {
      ...(existingNota || {}),
      ...gradeUpdates
    };

    if (explicitNotaFinal !== undefined) {
      gradeUpdates.nota_final = explicitNotaFinal === '' || explicitNotaFinal === null ? null : Number(explicitNotaFinal);
    } else if (fieldName !== 'nota_final') {
      const validScores: number[] = [];
      for (let m = 1; m <= 20; m++) {
        const val = mergedObj[`nota${m}`];
        if (val !== null && val !== undefined && val !== '' && !isNaN(Number(val))) {
          validScores.push(Number(val));
        }
      }
      if (validScores.length > 0) {
        const avg = validScores.reduce((a, b) => a + b, 0) / validScores.length;
        gradeUpdates.nota_final = Math.round(avg * 100) / 100;
      }
    }

    let savedData: any = null;

    if (existingNota) {
      // Update existing record
      const { data, error } = await db
        .from('notas')
        .update(gradeUpdates)
        .eq('id', existingNota.id)
        .select('*')
        .single();

      if (error) {
        console.error('Error updating existing nota:', error);
        throw error;
      }
      savedData = data;
    } else {
      // Insert new record
      const insertPayload = {
        aluno_id,
        turma_id,
        disciplina_id: finalDisciplinaId,
        ano_letivo: anoLetivo,
        ...gradeUpdates
      };

      const { data, error } = await db
        .from('notas')
        .insert([insertPayload])
        .select('*')
        .single();

      if (error) {
        console.error('Error inserting new nota:', error);
        throw error;
      }
      savedData = data;
    }

    return NextResponse.json({ success: true, data: savedData }, { status: 200 });
  } catch (error: any) {
    console.error('Error in POST /api/v1/notas:', error);
    return NextResponse.json({ error: error.message || 'Erro ao salvar a nota.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  return POST(request);
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let aluno_id = searchParams.get('aluno_id') || searchParams.get('alunoId');
    let turma_id = searchParams.get('turma_id') || searchParams.get('turmaId');
    let id = searchParams.get('id');

    if (!aluno_id && !turma_id && !id) {
      const body = await request.json().catch(() => ({}));
      aluno_id = body.aluno_id || body.alunoId;
      turma_id = body.turma_id || body.turmaId;
      id = body.id;
    }

    const db = getDb();
    const clearFields: any = {
      nota_final: null
    };
    for (let m = 1; m <= 20; m++) {
      clearFields[`nota${m}`] = null;
    }

    if (id && !id.startsWith('temp-')) {
      const { error } = await db.from('notas').update(clearFields).eq('id', id);
      if (error) throw error;
    } else if (aluno_id && turma_id) {
      const { error } = await db.from('notas').update(clearFields).eq('aluno_id', aluno_id).eq('turma_id', turma_id);
      if (error) throw error;
    } else {
      return NextResponse.json({ error: 'Parâmetros aluno_id e turma_id ou id são obrigatórios.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Notas do aluno apagadas com sucesso.' }, { status: 200 });
  } catch (error: any) {
    console.error('Error in DELETE /api/v1/notas:', error);
    return NextResponse.json({ error: error.message || 'Erro ao apagar notas.' }, { status: 500 });
  }
}
