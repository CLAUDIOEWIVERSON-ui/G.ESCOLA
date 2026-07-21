const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql_statement: "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'pensamento_dia';" });
  console.log(data, error);
}

check();
