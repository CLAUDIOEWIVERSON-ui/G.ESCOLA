import { createClient } from '@supabase/supabase-js';

const cleanUrl = (url: string | undefined): string => {
  if (!url) return 'https://placeholder.supabase.co';
  
  let formattedUrl = url.trim();
  
  if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
    formattedUrl = `https://${formattedUrl}`;
  }
  
  formattedUrl = formattedUrl.replace(/\/+$/, '');
  formattedUrl = formattedUrl.replace(/\/rest\/v1$/, '');
  
  return formattedUrl;
};

const supabaseUrl = cleanUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Admin client that bypasses RLS and can manage users
// Use a placeholder that won't crash the constructor but will fail on requests
const effectiveKey = supabaseServiceKey && supabaseServiceKey !== 'your-service-role-key' 
  ? supabaseServiceKey 
  : 'missing-or-invalid-service-role-key';

export const supabaseAdmin = createClient(supabaseUrl, effectiveKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export const isSupabaseAdminConfigured = () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return !!key && 
         key !== 'your-service-role-key' && 
         key !== '' &&
         !!process.env.NEXT_PUBLIC_SUPABASE_URL && 
         !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
};
