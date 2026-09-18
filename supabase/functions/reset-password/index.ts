import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const json = (payload: unknown, status = 200, headers: Record<string, string>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') ?? '*'
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers })

  try {
    const { kind, identifier, code, newPassword } = (await req.json()) as {
      kind?: 'pwd' | 'admin'
      identifier?: string
      code?: string
      newPassword?: string
    }
    if (!kind || !identifier || !code || !newPassword) return json({ ok: false, error: 'Missing required fields.' }, 400, headers)
    if (String(newPassword).length < 8) return json({ ok: false, error: 'New password must be at least 8 characters.' }, 400, headers)

    const table = kind === 'pwd' ? 'pwd_users' : 'admin_users'
    const search =
      kind === 'pwd'
        ? `email.eq.${identifier},pwd_id_number.eq.${identifier},username.eq.${identifier},id.eq.${identifier}`
        : `email.eq.${identifier},username.eq.${identifier}`

    const { data: users } = await supabase.from(table).select('*').or(search).limit(1)
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
    if (!reset || reset.code !== code) return json({ ok: false, error: 'Invalid verification code.' }, 400, headers)
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