import { createClient } from '@supabase/supabase-js';

/**
 * Lazy Supabase client.
 * Only creates the client when first accessed, preventing build errors
 * when environment variables aren't configured yet (local-first dev).
 */
let _supabase: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!_supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      // Return a mock client that logs and returns errors
      _supabase = createMockClient();
    } else {
      _supabase = createClient(supabaseUrl, supabaseAnonKey);
    }
  }
  return _supabase;
}

function createMockClient(): any {
  const errorResponse = (method: string) => ({
    data: null,
    error: { message: `Supabase no configurado. ${method} no disponible. Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.` },
  });

  const mockFrom = () => ({
    select: () => ({
      eq: () => ({ single: () => Promise.resolve({ data: null, error: errorResponse('select').error }), data: null, error: errorResponse('select').error }),
      gte: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
      order: () => Promise.resolve({ data: [], error: null }),
      data: [],
      error: null,
    }),
    upsert: () => Promise.resolve({ data: null, error: errorResponse('upsert').error }),
    insert: () => Promise.resolve({ data: null, error: errorResponse('insert').error }),
    update: () => Promise.resolve({ data: null, error: errorResponse('update').error }),
    delete: () => Promise.resolve({ data: null, error: errorResponse('delete').error }),
  });

  return {
    auth: {
      signInWithPassword: () => Promise.resolve(errorResponse('signInWithPassword')),
      signUp: () => Promise.resolve(errorResponse('signUp')),
      signInWithOAuth: () => Promise.resolve(errorResponse('signInWithOAuth')),
      signOut: () => Promise.resolve(errorResponse('signOut')),
      getSession: () => Promise.resolve(errorResponse('getSession')),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: mockFrom,
  };
}

/**
 * The Supabase client instance.
 * Safe to import and use — will return a mock client with helpful errors
 * when Supabase isn't configured yet.
 */
export const supabase = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = getSupabaseClient();
      return (client as any)[prop];
    },
  }
) as ReturnType<typeof createClient>;
