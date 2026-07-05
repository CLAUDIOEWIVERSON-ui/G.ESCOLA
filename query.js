const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: c } = await supabase.from('cursos').select('*').ilike('nome', '%busca%');
  const cursoId = c[0].id;
  const { data: t } = await supabase.from('turmas').select('*').eq('curso_id', cursoId);
  const turmaId = t[0].id;
  
  const { data: disciplinas } = await supabase.from('disciplinas').select('*').eq('curso_id', cursoId);
  const { data: alunos } = await supabase.from('alunos').select('*').eq('turma_id', turmaId);
  const { data: notas } = await supabase.from('notas').select('*').eq('turma_id', turmaId);
  
  for (const a of alunos) {
    const sGrades = notas.filter(n => n.aluno_id === a.id);
    console.log(`Aluno: ${a.nome}`);
    sGrades.forEach(g => {
       const d = disciplinas.find(d => d.id === g.disciplina_id);
       console.log(`  Disc: ${d?.nome || 'UNKNOWN'} (1: ${g.nota1}, 2: ${g.nota2}, f: ${g.nota_final})`);
    });
  }
}
run();
