import { supabase } from './supabase'

const setupError = new Error('Supabase client not available. Check VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY.')

export async function signInWithEmail(email: string, password: string) {
  if (!supabase) return { data: null, error: setupError }
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signUpWithEmail(email: string, password: string) {
  if (!supabase) return { data: null, error: setupError }
  return supabase.auth.signUp({ email, password })
}

export async function signOut() {
  if (!supabase) return { error: null }
  return supabase.auth.signOut()
}

export function onAuthStateChange(callback: (event: string, session: unknown) => void) {
  if (!supabase) {
    queueMicrotask(() => callback('SUPABASE_NOT_CONFIGURED', null))
    return { data: { subscription: { unsubscribe: () => {} } } }
  }
  return supabase.auth.onAuthStateChange(callback)
}
