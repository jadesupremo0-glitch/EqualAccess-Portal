import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function resolveEnv(key: string): string | undefined {
  const viteValue =
    typeof import.meta !== 'undefined' && import.meta.env ? (import.meta.env[key] as string | undefined) : undefined
  if (viteValue) return viteValue
  if (typeof process !== 'undefined' && process.env) return process.env[key]
  return undefined
}

const supabaseUrl = resolveEnv('VITE_SUPABASE_URL')
const supabaseAnonKey = resolveEnv('VITE_SUPABASE_ANON_KEY')

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

export function isSupabaseConfigured(): boolean {
  return supabase !== null
}