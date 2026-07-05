const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: cursos } = await supabase.from('cursos').select('id, nome');
  for (const c of cursos) {
     const { count } = await supabase.from('disciplinas').select('*', { count: 'exact', head: true }).eq('curso_id', c.id);
     console.log(`${c.nome} -> ${count} disciplinas`);
  }
}
run();
