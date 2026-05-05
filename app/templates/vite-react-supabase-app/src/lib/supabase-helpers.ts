import { supabase } from './supabase'

export function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY.')
  }
  return supabase
}

export async function getCurrentUserId(): Promise<string> {
  const client = requireSupabase()
  const { data, error } = await client.auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('You must be signed in to continue.')
  return data.user.id
}

export async function insertUserOwnedRow(tableName: string, values: Record<string, unknown>) {
  const userId = await getCurrentUserId()
  const client = requireSupabase() as any
  return client.from(tableName).insert({ ...values, user_id: userId }).select().single()
}

export async function updateUserOwnedRow(tableName: string, id: string, values: Record<string, unknown>) {
  const userId = await getCurrentUserId()
  const client = requireSupabase() as any
  return client.from(tableName).update(values).eq('id', id).eq('user_id', userId).select().single()
}
