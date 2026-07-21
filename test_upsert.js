const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkUpsert() {
  const upsertPayload = {
    texto: 'Test thought',
    autor: 'Test author',
    reflexao: 'Test reflexao',
    data_exibicao: new Date().toISOString().split('T')[0]
  };

  let res = await supabase
    .from('pensamento_dia')
    .upsert(upsertPayload, { onConflict: 'data_exibicao' })
    .select('*')
    .maybeSingle();

  console.log('Upsert result:', res);
}

checkUpsert();
