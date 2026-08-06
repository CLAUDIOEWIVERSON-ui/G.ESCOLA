const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('alunos').select('*').limit(1);
  if (error || !data.length) { console.log('no data or error', error); return; }
  
  const id = data[0].id;
  const { error: updErr } = await supabase.from('alunos').update({ nome_guerra: 'TEST_WAR_NAME' }).eq('id', id);
  console.log('Update Error:', updErr);

  const { data: data2 } = await supabase.from('alunos').select('nome_guerra').eq('id', id);
  console.log('Result:', data2);
}
run();
