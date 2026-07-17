import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = JSON.parse(fs.readFileSync('/app/.dev.env.json', 'utf8'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabase.from('turmas').insert([{
    nome: 'Test Turma Pré-Inscrita',
    curso_id: '56e9c60e-8fb8-4cd7-9576-905c7423e8e2', // Needs to be a valid curso_id or maybe null? Wait, NOT NULL.
    ano: 2026,
    periodo: 'manhã',
    status: 'pré-inscrito(a)(s)',
    ativa: false
  }]);
  console.log("Error:", error);
}
test();
