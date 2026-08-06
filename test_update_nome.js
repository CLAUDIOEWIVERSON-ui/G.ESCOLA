const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('alunos').select('*').limit(1);
  const id = data[0].id;
  console.log('Original nome:', data[0].nome);
  const { data: updData, error: updErr } = await supabase.from('alunos').update({ nome: data[0].nome + ' A' }).eq('id', id).select('*');
  console.log('Update Error:', updErr);
  console.log('Update Data:', updData);
}
run();
