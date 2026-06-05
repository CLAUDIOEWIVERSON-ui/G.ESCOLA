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

export const isSupabaseAdminConfigured = () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return !!key && 
         key !== 'your-service-role-key' && 
         key !== '' &&
         !!rawUrl && 
         !rawUrl.includes('placeholder');
};

const isConfigured = isSupabaseAdminConfigured();

const createMockAdmin = () => {
  const mockAuth = {
    getSession: async () => ({ data: { session: null }, error: null }),
    signOut: async () => ({ error: null }),
    admin: {
      createUser: async () => ({ data: { user: null }, error: new Error('Supabase admin is not configured yet') }),
      deleteUser: async () => ({ error: new Error('Supabase admin is not configured yet') }),
      updateUserById: async () => ({ data: { user: null }, error: new Error('Supabase admin is not configured yet') }),
      listUsers: async () => ({ data: { users: [] }, error: new Error('Supabase admin is not configured yet') }),
    }
  };

  const mockQueryBuilder = () => {
    const builder: any = {
      select: () => builder,
      eq: () => builder,
      neq: () => builder,
      is: () => builder,
      order: () => builder,
      limit: () => builder,
      single: async () => ({ data: null, error: { message: 'Supabase admin is not configured yet', code: 'PGRST116' } }),
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

const supabaseUrl = cleanUrl(rawUrl);
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const effectiveKey = supabaseServiceKey && supabaseServiceKey !== 'your-service-role-key' 
  ? supabaseServiceKey 
  : 'missing-or-invalid-service-role-key';

export const supabaseAdmin = isConfigured
  ? createClient(supabaseUrl, effectiveKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : createMockAdmin();
