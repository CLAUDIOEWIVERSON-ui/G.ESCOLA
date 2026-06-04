import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';

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

export async function createClient() {
  const cookieStore = await cookies();

  let token: string | undefined;
  try {
    const headersList = await headers();
    const authHeader = headersList.get('Authorization') || headersList.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  } catch (error) {
    // Ignore if headers are not available in a static generation context
  }

  const globalHeaders: Record<string, string> = {};
  if (token) {
    globalHeaders['Authorization'] = `Bearer ${token}`;
  }

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const url = cleanUrl(rawUrl);
  const key = (rawKey || 'placeholder').trim();

  if (!rawUrl || !rawKey) {
    console.warn('Supabase credentials missing or invalid in server client. Using placeholder configuration.');
  }

  return createServerClient(
    url,
    key,
    {
      global: {
        headers: token ? globalHeaders : undefined,
      },
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // The `remove` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}
