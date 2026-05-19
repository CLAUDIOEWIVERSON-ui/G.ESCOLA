import { createBrowserClient } from '@supabase/ssr';

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

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured = () => {
  return !!rawUrl && 
         !!rawKey && 
         isUrlValid(rawUrl) &&
         !rawUrl.includes('placeholder');
};
