const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('alunos').select('*').limit(1);
  if (!data) return console.log(error);
  const id = data[0].id;
  
  // Use service role key if available to bypass RLS, or test with admin user if not.
  // Actually, I can just fetch the policies for `alunos`.
  
  const { data: policies, error: pErr } = await supabase.rpc('get_policies', { table_name: 'alunos' });
  console.log('Policies RPC:', pErr ? 'failed' : policies);
}
run();
