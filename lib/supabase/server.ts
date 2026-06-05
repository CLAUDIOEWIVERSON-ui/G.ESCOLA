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

  const isConfigured = !!rawUrl && !!rawKey && !rawUrl.includes('placeholder');

  if (!isConfigured) {
    console.warn('Supabase credentials missing or invalid in server client. Returning mock client.');
    const mockAuth = {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({
        data: {
          subscription: {
            unsubscribe: () => {}
          }
        }
      }),
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
  }

  const url = cleanUrl(rawUrl);
  const key = rawKey.trim();

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
