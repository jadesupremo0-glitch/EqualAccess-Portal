// Shared by send-reset-code and reset-password.

export type AccountKind = 'pwd' | 'admin'

export const isAccountKind = (v: unknown): v is AccountKind => v === 'pwd' || v === 'admin'

export const accountTable = (kind: AccountKind) => (kind === 'pwd' ? 'pwd_users' : 'admin_users')

/**
 * PostgREST `or` filter that finds an account by any of its identifiers. The value is
 * double-quoted (with `"` and `\` escaped) so commas, dots or parentheses typed into the form
 * are matched literally instead of adding conditions to the filter.
 */
export function accountFilter(kind: AccountKind, identifier: string): string {
  const value = `"${identifier.trim().replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
  const columns = kind === 'pwd' ? ['email', 'pwd_id_number', 'username', 'id'] : ['email', 'username']
  return columns.map((c) => `${c}.eq.${value}`).join(',')
}

/** A wrong code this many times invalidates it; the user has to request a new one. */
export const MAX_CODE_ATTEMPTS = 5

export const corsHeaders = (req: Request): Record<string, string> => ({
  'Access-Control-Allow-Origin': req.headers.get('origin') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
})

export const json = (payload: unknown, status: number, headers: Record<string, string>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
