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

const isConfigured = !!rawUrl && !!rawKey && isUrlValid(rawUrl) && !rawUrl.includes('placeholder');

if (!isConfigured) {
  console.warn('Supabase credentials missing or invalid. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in the Secrets panel.');
}

const createMockSupabase = () => {
  const mockAuth = {
    getSession: async () => ({ data: { session: null }, error: null }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: (callback: any) => {
      return {
        data: {
          subscription: {
            unsubscribe: () => {}
          }
        }
      };
    },
    signInWithPassword: async () => ({ data: { user: null, session: null }, error: new Error('Supabase is not configured yet') }),
    signUp: async () => ({ data: { user: null, session: null }, error: new Error('Supabase is not configured yet') }),
  };

  const mockQueryBuilder = () => {
    const builder: any = {
      select: () => builder,
      eq: () => builder,
      neq: () => builder,
      is: () => builder,
      order: () => builder,
      limit: () => builder,
      single: async () => ({ data: null, error: { message: 'Supabase is not configured yet', code: 'PGRST116' } }),
      maybeSingle: async () => ({ data: null, error: null }),
      insert: () => builder,
      update: () => builder,
      upsert: () => builder,
      delete: () => builder,
      then: (resolve: any) => resolve({ data: [], error: null }),
    };
    return builder;
  };

  return {
    auth: mockAuth,
    from: mockQueryBuilder,
  } as any;
};

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : createMockSupabase();

// Clear all local storage, session storage, and cookies that might contain an invalid refresh token to prevent infinite loops
export const clearSupabaseCookiesAndStorage = () => {
  if (typeof window !== 'undefined') {
    // Clear localStorage
    if (window.localStorage) {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith('sb-') || k.includes('supabase.auth.token'))) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      } catch (e) {
        console.error('Error clearing localStorage:', e);
      }
    }
    // Clear sessionStorage
    if (window.sessionStorage) {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k && (k.startsWith('sb-') || k.includes('supabase.auth.token'))) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => sessionStorage.removeItem(k));
      } catch (e) {
        console.error('Error clearing sessionStorage:', e);
      }
    }
    // Clear cookies
    try {
      const cookiesList = document.cookie.split(';');
      for (let i = 0; i < cookiesList.length; i++) {
        const cookie = cookiesList[i].trim();
        const cookieName = cookie.split('=')[0];
        if (cookieName.startsWith('sb-') || cookieName.includes('supabase')) {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
        }
      }
    } catch (e) {
      console.error('Error clearing cookies:', e);
    }
  }
};

export const isSupabaseConfigured = () => {
  return !!rawUrl && 
         !!rawKey && 
         isUrlValid(rawUrl) &&
         !rawUrl.includes('placeholder');
};
