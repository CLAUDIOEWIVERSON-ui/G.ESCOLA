const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: cursos } = await supabase.from('cursos').select('*').ilike('nome', '%busca%');
  console.log("Cursos Encontrados:");
  console.log(cursos);
  
  if (cursos && cursos.length > 0) {
     const cursoId = cursos[0].id;
     const { data: turmas } = await supabase.from('turmas').select('*').eq('curso_id', cursoId);
     console.log("Turmas:", turmas);
     
     const { data: disciplinas } = await supabase.from('disciplinas').select('*').eq('curso_id', cursoId);
     console.log("Disciplinas:", disciplinas);
     
     for (const turma of turmas) {
       const { data: alunos } = await supabase.from('alunos').select('*').eq('turma_id', turma.id);
       console.log("Alunos da Turma:", alunos.map(a => ({ id: a.id, nome: a.nome })));
       
       const { data: notas } = await supabase.from('notas').select('*').eq('turma_id', turma.id);
       console.log("Notas da Turma:", notas);
     }
  }
}
run();
