import { supabase } from './supabase'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

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

type AuthStateChangeCallback = (event: AuthChangeEvent, session: Session | null) => void | Promise<void>

export function onAuthStateChange(callback: AuthStateChangeCallback) {
  if (!supabase) {
    queueMicrotask(() => { void callback('SIGNED_OUT', null) })
    return { data: { subscription: { unsubscribe: () => {} } } }
  }
  return supabase.auth.onAuthStateChange(async (event, session) => {
    await callback(event, session)
  })
}
