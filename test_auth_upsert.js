const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const supabaseAnon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  // 1. Create a dummy user as admin
  const email = `test_${Date.now()}@test.com`;
  const password = 'password123';
  
  const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  
  if (createError) {
    console.log('Create error:', createError.message);
    return;
  }
  
  console.log('User created');

  // 2. Sign in as anon
  const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
    email,
    password
  });
  
  if (signInError) {
    console.log('Sign in error:', signInError.message);
    return;
  }
  
  console.log('Signed in successfully');

  // 3. Try to upsert
  const upsertPayload = {
    texto: 'Test thought auth',
    autor: 'Test author',
    reflexao: 'Test reflexao auth',
    data_exibicao: new Date().toISOString().split('T')[0]
  };

  let res = await supabaseAnon
    .from('pensamento_dia')
    .upsert(upsertPayload, { onConflict: 'data_exibicao' })
    .select('*')
    .maybeSingle();

  console.log('Upsert result with auth:', res.error || res.data);
  
  // Cleanup
  await supabaseAdmin.auth.admin.deleteUser(user.user.id);
}

check();
