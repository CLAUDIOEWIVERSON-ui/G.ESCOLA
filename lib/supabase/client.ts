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

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    rawUrl &&
    rawKey &&
    rawUrl !== 'https://mock.supabase.co' &&
    rawKey !== 'mock-key' &&
    !rawUrl.includes('placeholder')
  );
};

const supabaseUrl = cleanUrl(rawUrl);
const supabaseKey = rawKey?.trim() || 'mock-key';

export const supabase = createClient(supabaseUrl, supabaseKey);
