import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = JSON.parse(fs.readFileSync('/app/.dev.env.json', 'utf8'));

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addEnumValue() {
  const { data, error } = await supabase.rpc('execute_sql', { sql_query: "ALTER TYPE turma_status_enum ADD VALUE IF NOT EXISTS 'pré-inscrito(a)(s)';" });
  if (error) {
    console.error("RPC Error:", error);
  } else {
    console.log("Success:", data);
  }
}
addEnumValue();
