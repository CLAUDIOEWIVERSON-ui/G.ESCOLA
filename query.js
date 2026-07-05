const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Cursos:");
  const { data: cursos } = await supabase.from('cursos').select('*');
  console.log(cursos);
  
  console.log("Turmas:");
  const { data: turmas } = await supabase.from('turmas').select('*');
  console.log(turmas);
  
  console.log("Disciplinas:");
  const { data: disciplinas } = await supabase.from('disciplinas').select('*');
  console.log(disciplinas);

  console.log("Notas:");
  const { data: notas } = await supabase.from('notas').select('*');
  console.log(notas);
}
run();
