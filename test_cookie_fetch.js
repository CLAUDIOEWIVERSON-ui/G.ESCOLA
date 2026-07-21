const http = require('http');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const email = `test_c_${Date.now()}@test.com`;
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
  
  // Fake the cookies the same way Next.js auth helpers format it
  const cookies = [];
  // Typically there's sb-[project-id]-auth-token
  const projectId = process.env.NEXT_PUBLIC_SUPABASE_URL.match(/\/\/([^.]+)\./)[1];
  const cookieName = `sb-${projectId}-auth-token`;
  
  // The value is an array of strings serialized. In Supabase ssr, it's usually encoded
  const sessionData = {
    access_token: signInData.session.access_token,
    refresh_token: signInData.session.refresh_token,
    user: signInData.session.user
  };
  
  // Let's stringify and encode it like @supabase/ssr does
  // Actually, we can just use the Authorization header directly since createClient in server.ts extracts it.
  // Wait, the client DOES NOT SEND Authorization header, it relies on cookies.
  
  // Let's just fix the route to gracefully log what happens.
  console.log("Cookie testing might be too complex here. But wait, I can just fetch it with node-fetch if I want, or just accept that maybe the user has the 'reflexao' missing fallback bug.");
}

check();
