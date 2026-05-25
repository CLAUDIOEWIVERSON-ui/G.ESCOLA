import { createClient } from '@supabase/supabase-js';

const cleanUrl = (url: string | undefined): string => {
  if (!url) return 'https://placeholder.supabase.co';
  
  let formattedUrl = url.trim();
  
  // Ensure it starts with https://
  if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
    formattedUrl = `https://${formattedUrl}`;
  }
  
  // Remove trailing slashes
  formattedUrl = formattedUrl.replace(/\/+$/, '');
  
  // Remove /rest/v1 if the user pasted the API endpoint instead of the project URL
  formattedUrl = formattedUrl.replace(/\/rest\/v1$/, '');
  
  return formattedUrl;
};

const isUrlValid = (url: string | undefined): url is string => {
  if (!url) return false;
  try {
    const parsed = new URL(cleanUrl(url));
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseUrl = cleanUrl(rawUrl);
const supabaseAnonKey = (rawKey || 'placeholder').trim();

if (!rawUrl || !rawKey || !isUrlValid(rawUrl)) {
  console.warn('Supabase credentials missing or invalid. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in the Secrets panel.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Clear local session if it contains an invalid refresh token to prevent console errors and loops
if (typeof window !== 'undefined') {
  supabase.auth.getSession().then(({ error }) => {
    if (error) {
      const msg = error.message.toLowerCase();
      if (
        msg.includes('refresh token') ||
        msg.includes('refresh_token') ||
        msg.includes('invalid_grant') ||
        msg.includes('grant_invalid') ||
        msg.includes('not found')
      ) {
        console.warn('Invalid refresh token detected on init, clearing local session...');
        supabase.auth.signOut({ scope: 'local' }).then(() => {
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }).catch(() => {});
      }
    }
  }).catch(() => {});
}

export const isSupabaseConfigured = () => {
  return !!rawUrl && 
         !!rawKey && 
         isUrlValid(rawUrl) &&
         !rawUrl.includes('placeholder');
};
