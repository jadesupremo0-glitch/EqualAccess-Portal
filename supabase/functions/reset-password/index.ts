import { createClient } from 'jsr:@supabase/supabase-js@2'
import { MAX_CODE_ATTEMPTS, accountFilter, accountTable, corsHeaders, isAccountKind, json } from '../_shared/account.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

Deno.serve(async (req) => {
  const headers = corsHeaders(req)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers })

  try {
    const { kind, identifier, code, newPassword } = (await req.json()) as {
      kind?: unknown
      identifier?: unknown
      code?: unknown
      newPassword?: unknown
    }
    if (!isAccountKind(kind) || typeof identifier !== 'string' || typeof code !== 'string' || typeof newPassword !== 'string' || !identifier.trim() || !code.trim()) {
      return json({ ok: false, error: 'Missing required fields.' }, 400, headers)
    }
    if (newPassword.length < 8) return json({ ok: false, error: 'New password must be at least 8 characters.' }, 400, headers)

    const table = accountTable(kind)
    const { data: users, error: userErr } = await supabase.from(table).select('*').or(accountFilter(kind, identifier)).limit(1)
    if (userErr) throw new Error(userErr.message)
    const user = users?.[0]
    if (!user) return json({ ok: false, error: 'No account found with that email or ID.' }, 404, headers)

    const { data: resets, error: resetErr } = await supabase
      .from('password_resets')
      .select('*')
      .eq('user_kind', kind)
      .eq('user_id', user.id)
      .eq('purpose', 'password_reset')
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
    if (resetErr) throw new Error(resetErr.message)

    const reset = resets?.[0]
    if (!reset) return json({ ok: false, error: 'Invalid verification code.' }, 400, headers)
    if (reset.code !== code.trim()) {
      // Count the miss; after MAX_CODE_ATTEMPTS the code is burned, so 6 digits can't be brute-forced
      // within its 15 minutes. (`attempts` comes from 20260928000000_password_reset_attempts.sql.)
      const attempts = Number(reset.attempts ?? 0) + 1
      await supabase
        .from('password_resets')
        .update({ attempts, ...(attempts >= MAX_CODE_ATTEMPTS ? { used: true } : {}) })
        .eq('id', reset.id)
      return json(
        {
          ok: false,
          error: attempts >= MAX_CODE_ATTEMPTS
            ? 'Too many incorrect attempts. Please request a new code.'
            : 'Invalid verification code.',
        },
        400,
        headers,
      )
    }
    if (new Date(reset.expires_at).getTime() < Date.now()) {
      return json({ ok: false, error: 'This code has expired. Please request a new one.' }, 400, headers)
    }

    const { error: updErr } = await supabase
      .from(table)
      .update({ password: newPassword })
      .eq('id', user.id)
    if (updErr) throw new Error(updErr.message)

    await supabase.from('password_resets').update({ used: true }).eq('id', reset.id)

    return json({ ok: true, message: 'Password updated successfully. You can now sign in.' }, 200, headers)
  } catch (e) {
    return json(
      { ok: false, error: e instanceof Error ? e.message : 'Something went wrong resetting your password.' },
      500,
      headers,
    )
  }
})