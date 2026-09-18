import { supabase } from './supabase'

export interface ResetResponse {
  ok: boolean
  message?: string
  error?: string
}

export async function requestResetCode(kind: 'pwd' | 'admin', identifier: string): Promise<ResetResponse> {
  if (!supabase) return { ok: false, error: 'Database is not configured.' }
  const { data, error } = await supabase.functions.invoke('send-reset-code', {
    body: { kind, identifier },
  })
  if (error) return { ok: false, error: error.message }
  return (data ?? { ok: false, error: 'Unexpected response from server.' }) as ResetResponse
}

export async function completePasswordReset(
  kind: 'pwd' | 'admin',
  identifier: string,
  code: string,
  newPassword: string,
): Promise<ResetResponse> {
  if (!supabase) return { ok: false, error: 'Database is not configured.' }
  const { data, error } = await supabase.functions.invoke('reset-password', {
    body: { kind, identifier, code, newPassword },
  })
  if (error) return { ok: false, error: error.message }
  return (data ?? { ok: false, error: 'Unexpected response from server.' }) as ResetResponse
}