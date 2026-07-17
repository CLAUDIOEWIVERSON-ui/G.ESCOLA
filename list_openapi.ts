import fs from 'fs';
const env = JSON.parse(fs.readFileSync('/app/.dev.env.json', 'utf8'));

async function fetchOpenAPI() {
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/?apikey=${env.SUPABASE_SERVICE_ROLE_KEY}`);
  const data = await res.json();
  const paths = Object.keys(data.paths).filter(p => p.startsWith('/rpc/'));
  console.log(paths);
}
fetchOpenAPI();
