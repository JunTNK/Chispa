import { supabase } from '@/lib/db/supabase';
import { supabaseSync } from '@/lib/sync/supabase-sync';

export interface AuthError {
  message: string;
  code?: string;
}

/**
 * Sign in with email and password.
 * Returns { user, error } — error is null on success.
 * On success, pulls user data from Supabase.
 */
export async function signInWithEmail(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { user: null, error: { message: error.message, code: error.code } };

    // Pull data from Supabase in background
    supabaseSync.pull().catch(() => {});

    return { user: data.user, error: null };
  } catch (e) {
    return { user: null, error: { message: (e as Error).message } };
  }
}

/**
 * Sign up with email and password.
 */
export async function signUpWithEmail(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) return { user: null, error: { message: error.message, code: error.code } };
    return { user: data.user, error: null };
  } catch (e) {
    return { user: null, error: { message: (e as Error).message } };
  }
}

/**
 * Sign in with Google OAuth.
 */
export async function signInWithGoogle() {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) return { error: { message: error.message } };
    return { error: null };
  } catch (e) {
    return { error: { message: (e as Error).message } };
  }
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) return { error: { message: error.message } };
    return { error: null };
  } catch (e) {
    return { error: { message: (e as Error).message } };
  }
}

/**
 * Get the current session. Returns null if not authenticated.
 */
export async function getSession() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return { session: null, error: { message: error.message } };
    return { session: data.session, error: null };
  } catch (e) {
    return { session: null, error: { message: (e as Error).message } };
  }
}

/**
 * Listen to auth state changes (e.g., on mount to detect session).
 * Returns an unsubscribe function.
 * Pulls user data when session is restored.
 */
export function onAuthStateChange(callback: (event: string, session: any) => void) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
    // Pull data on login / session restore
    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
      if (session?.user) {
        supabaseSync.pull().catch(() => {});
      }
    }
  });
  return data.subscription.unsubscribe;
}
