const http = require('http');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  // 1. Create a dummy user as admin
  const email = `test_api_${Date.now()}@test.com`;
  const password = 'password123';
  
  const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  
  // 2. Sign in via API to get cookie
  const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password
  });
  
  const token = signInData.session.access_token;
  
  // Try calling the API route
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/pensamento-dia',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', async () => {
      console.log(`Status: ${res.statusCode}`);
      console.log(`Body: ${data}`);
      
      // Cleanup
      await supabaseAdmin.auth.admin.deleteUser(user.user.id);
    });
  });

  req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
  });

  req.write(JSON.stringify({ texto: 'Test API', autor: 'Author API' }));
  req.end();
}

check();
