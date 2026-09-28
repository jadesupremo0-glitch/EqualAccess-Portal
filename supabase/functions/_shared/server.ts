// Server-side helpers shared by the Edge Functions (Deno, service role).
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'

export const admin: SupabaseClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

const manilaDateFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' })
const manilaTimeFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hour12: true })

/** YYYY-MM-DD and "09:05 AM" in Asia/Manila — the same formats the app stores. */
export const manilaToday = () => manilaDateFmt.format(new Date())
export const manilaTime = () => manilaTimeFmt.format(new Date())

/** Next `${prefix}NNNN…` id after the highest existing one in `table`. */
export async function nextSequentialId(table: string, prefix: string, width: number): Promise<string> {
  const { data, error } = await admin.from(table).select('id').like('id', `${prefix}%`)
  if (error) throw new Error(error.message)
  let max = 0
  for (const { id } of data ?? []) {
    const n = Number(String(id).slice(prefix.length))
    if (Number.isInteger(n)) max = Math.max(max, n)
  }
  return `${prefix}${String(max + 1).padStart(width, '0')}`
}

/** Collision-safe id for rows created by many clients at once (matches the app's newId). */
export const randomId = (prefix: string) =>
  `${prefix}-${Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('')}`

/** The active admin record behind the request's Authorization header, or null. */
export async function callerAdmin(req: Request): Promise<{ id: string; username: string; role: string } | null> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data, error } = await admin.auth.getUser(token)
  const meta = data.user?.app_metadata as { kind?: string; account_id?: string } | undefined
  if (error || meta?.kind !== 'admin' || !meta.account_id) return null
  const { data: row } = await admin.from('admin_users').select('id, username, role, status').eq('id', meta.account_id).maybeSingle()
  if (!row || (row.status ?? 'Active') !== 'Active') return null
  return { id: row.id, username: row.username, role: row.role }
}
