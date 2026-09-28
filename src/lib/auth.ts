// Supabase Auth for the portal. People sign in with their PWD ID / staff username; the database
// resolves that to the account's Auth email (resolve_login), and the Auth session's app_metadata
// {kind, account_id} is what Row Level Security trusts.
import { supabase } from './supabase'

export type AccountKind = 'pwd' | 'admin'

export interface SignedInAccount {
  kind: AccountKind
  accountId: string
}

function accountOf(user: { app_metadata?: Record<string, unknown> } | null | undefined): SignedInAccount | null {
  const meta = user?.app_metadata ?? {}
  const kind = meta.kind
  const accountId = meta.account_id
  if ((kind === 'pwd' || kind === 'admin') && typeof accountId === 'string') return { kind, accountId }
  return null
}

/** Signs in; returns the account, or null for unknown/inactive accounts and wrong passwords. */
export async function signIn(kind: AccountKind, identifier: string, password: string): Promise<SignedInAccount | null> {
  if (!supabase) return null
  const { data: email, error } = await supabase.rpc('resolve_login', { p_kind: kind, p_identifier: identifier.trim() })
  if (error || typeof email !== 'string' || !email) return null
  const res = await supabase.auth.signInWithPassword({ email, password })
  if (res.error) return null
  const account = accountOf(res.data.user)
  if (!account || account.kind !== kind) {
    await supabase.auth.signOut()
    return null
  }
  return account
}

export async function signOut(): Promise<void> {
  if (supabase) await supabase.auth.signOut()
}

/** The account of a session kept from an earlier visit (supabase-js stores it), if any. */
export async function restoredAccount(): Promise<SignedInAccount | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return accountOf(data.session?.user)
}

/** Checks the current password, then sets the new one. Returns an error message or null. */
export async function changeOwnPassword(current: string, next: string): Promise<string | null> {
  if (!supabase) return 'Database is not configured.'
  const { data } = await supabase.auth.getUser()
  const email = data.user?.email
  if (!email) return 'Your session has expired. Please sign in again.'
  const check = await supabase.auth.signInWithPassword({ email, password: current })
  if (check.error) return 'Current password is incorrect.'
  const { error } = await supabase.auth.updateUser({ password: next })
  return error ? error.message : null
}

export interface FunctionResult {
  ok: boolean
  error?: string
  message?: string
  id?: string
}

/**
 * Calls an Edge Function and returns its JSON body — also for error statuses, whose message
 * supabase-js would otherwise replace with a generic "non-2xx status code".
 */
export async function callFunction(name: string, body: Record<string, unknown>): Promise<FunctionResult> {
  if (!supabase) return { ok: false, error: 'Database is not configured.' }
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (!error) return (data ?? { ok: false, error: 'Unexpected response from server.' }) as FunctionResult
  const context = (error as { context?: unknown }).context
  if (context instanceof Response) {
    try {
      const payload = (await context.json()) as FunctionResult
      if (payload && typeof payload === 'object') return { ...payload, ok: false }
    } catch {
      // not JSON: fall through
    }
  }
  return { ok: false, error: error.message }
}
