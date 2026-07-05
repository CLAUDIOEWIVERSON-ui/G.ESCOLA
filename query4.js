const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const cursoId = 'f66c9f37-61e8-4053-9950-26d79f4e9161';
  
  const { data: turmas } = await supabase.from('turmas').select('*').eq('curso_id', cursoId);
  console.log("Turmas:");
  console.table(turmas);
  
  for (const turma of turmas) {
    console.log("--- Turma:", turma.nome, turma.id);
    const { data: disciplinas } = await supabase.from('disciplinas').select('*').eq('curso_id', cursoId);
    console.log("Disciplinas:");
    console.table(disciplinas);
    
    const { data: alunos } = await supabase.from('alunos').select('id, nome, nip, posto_graduacao').eq('turma_id', turma.id);
    console.log("Alunos:");
    console.table(alunos);
    
    const { data: notas } = await supabase.from('notas').select('*').eq('turma_id', turma.id);
    console.log("Notas:");
    console.table(notas);
  }
}
run();
