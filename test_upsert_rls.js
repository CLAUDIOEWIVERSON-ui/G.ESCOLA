const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

// We need an anon key to test RLS
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkUpsert() {
  // Try upsert without auth - should fail
  const upsertPayload = {
    texto: 'Test thought RLS',
    autor: 'Test author',
    reflexao: 'Test reflexao',
    data_exibicao: new Date().toISOString().split('T')[0]
  };

  let res = await supabase
    .from('pensamento_dia')
    .upsert(upsertPayload, { onConflict: 'data_exibicao' })
    .select('*')
    .maybeSingle();

  console.log('Upsert result without auth:', res.error);
}

checkUpsert();
