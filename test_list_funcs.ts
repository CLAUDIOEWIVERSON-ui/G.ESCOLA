import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const env = JSON.parse(fs.readFileSync('/app/.dev.env.json', 'utf8'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function listFuncs() {
  const { data, error } = await supabase.rpc('hello_world'); // Just to see if it complains about all functions
  console.log(error);
}
listFuncs();
