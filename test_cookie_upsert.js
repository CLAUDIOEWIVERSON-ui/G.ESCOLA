const http = require('http');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const email = `test_cookie_${Date.now()}@test.com`;
  const password = 'password123';
  
  const { data: user } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  
  const { data: signInData } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password
  });
  
  const token = signInData.session.access_token;
  
  // Format as a cookie string
  // Supabase Next.js auth typically uses multiple cookies if chunks are needed, but for simplicity, 
  // maybe we can just set the sb-xxx-auth-token cookie.
  // Actually, we can just use Authorization header in fetch, it's safer.
  console.log("Token:", token.substring(0, 10));
}

check();
