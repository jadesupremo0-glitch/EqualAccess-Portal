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
// Node scripts (seed, exports) run with the service-role key so Row Level Security does not
// hide rows from them. It has no VITE_ prefix, so Vite never puts it in the browser bundle.
const isNode = typeof window === 'undefined'
const serviceRoleKey = isNode ? resolveEnv('SUPABASE_SERVICE_ROLE_KEY') : undefined

export const supabase: SupabaseClient | null =
  supabaseUrl && (serviceRoleKey || supabaseAnonKey)
    ? createClient(supabaseUrl, (serviceRoleKey || supabaseAnonKey)!, isNode ? { auth: { persistSession: false, autoRefreshToken: false } } : undefined)
    : null

export function isSupabaseConfigured(): boolean {
  return supabase !== null
}

/** True for scripts running with the service-role key (bypasses Row Level Security). */
export const hasServiceRole = Boolean(serviceRoleKey)
