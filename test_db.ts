import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
const envFile = fs.readFileSync('.env.example', 'utf-8');
// It might be in .env instead of .env.example, let's read .env
const envFileReal = fs.readFileSync('.env', 'utf-8');
const parseEnv = (content: string) => {
  const result: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) result[key.trim()] = values.join('=').trim();
  }
  return result;
}
const envs = parseEnv(envFileReal);
const supabaseUrl = envs['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envs['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: cursos } = await supabase.from('cursos').select('*');
  console.log('Cursos:', cursos);
}
run();
