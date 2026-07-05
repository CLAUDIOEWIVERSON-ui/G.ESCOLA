const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const cursoId = 'f66c9f37-61e8-4053-9950-26d79f4e9161';
  
  const { data: turmas } = await supabase.from('turmas').select('*').eq('curso_id', cursoId);
  const turmaId = turmas[0].id;
  
  const { data: disciplinas } = await supabase.from('disciplinas').select('*').eq('curso_id', cursoId);
  
  const { data: alunos } = await supabase.from('alunos').select('*').eq('turma_id', turmaId);
  
  const { data: notas } = await supabase.from('notas').select('*').eq('turma_id', turmaId);
  
  for (const aluno of alunos) {
    const studentGrades = notas.filter(n => n.aluno_id === aluno.id);
    console.log(`\nAluno: ${aluno.nome}`);
    studentGrades.forEach(g => {
      const disc = disciplinas.find(d => d.id === g.disciplina_id);
      console.log(`  Disc: ${disc.nome} (nota1: ${g.nota1}, nota2: ${g.nota2}, ..., final: ${g.nota_final})`);
    });
  }
}
run();
