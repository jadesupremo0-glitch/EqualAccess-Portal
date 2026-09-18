import { createClient } from 'jsr:@supabase/supabase-js@2'
import nodemailer from 'npm:nodemailer@6.9.16'

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
  if (req.method === 'OPTIONS') return new Response('ok', { status: 204, headers })

  try {
    const { kind, identifier } = (await req.json()) as { kind?: 'pwd' | 'admin'; identifier?: string }
    if (!kind || !identifier) return json({ ok: false, error: 'Missing email or ID.' }, 400, headers)

    const table = kind === 'pwd' ? 'pwd_users' : 'admin_users'
    const search =
      kind === 'pwd'
        ? `email.eq.${identifier},pwd_id_number.eq.${identifier},username.eq.${identifier},id.eq.${identifier}`
        : `email.eq.${identifier},username.eq.${identifier}`

    const { data: users, error: userErr } = await supabase.from(table).select('*').or(search).limit(1)
    if (userErr) throw new Error(userErr.message)
    const user = users?.[0]
    if (!user) return json({ ok: false, error: 'No account found with that email or ID.' }, 404, headers)

    const to = user.email
    if (!to) return json({ ok: false, error: 'This account has no email address on file.' }, 400, headers)

    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

    await supabase
      .from('password_resets')
      .update({ used: true })
      .eq('user_kind', kind)
      .eq('user_id', user.id)
      .eq('purpose', 'password_reset')

    const { error: insertErr } = await supabase.from('password_resets').insert({
      user_kind: kind,
      user_id: user.id,
      purpose: 'password_reset',
      code,
      expires_at: expiresAt.toISOString(),
      used: false,
    })
    if (insertErr) throw new Error(insertErr.message)

    const smtpHost = Deno.env.get('SMTP_HOST') ?? 'smtp.gmail.com'
    const smtpPort = Number(Deno.env.get('SMTP_PORT') ?? 587)
    const smtpUser = Deno.env.get('SMTP_USER') ?? ''
    const smtpPass = (Deno.env.get('SMTP_PASS') ?? '').replace(/\s+/g, '')

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    })

    await transporter.sendMail({
      from: `"EqualAccess Portal" <${smtpUser}>`,
      to,
      subject: 'EqualAccess Portal — Password Reset Code',
      text: `Your password reset code is ${code}. It expires in 15 minutes. If you did not request a password reset, you can safely ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #f8fafc; border-radius: 16px;">
          <div style="background: linear-gradient(135deg, #0d9488, #0369a1); padding: 20px; border-radius: 12px 12px 0 0; color: #fff;">
            <h2 style="margin: 0; font-size: 18px;">EqualAccess Portal</h2>
            <p style="margin: 4px 0 0; opacity: 0.85; font-size: 12px;">PDAO — Los Baños, Laguna</p>
          </div>
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
            <p style="color: #334155; font-size: 14px;">Hello,</p>
            <p style="color: #334155; font-size: 14px;">Use the code below to reset your password. It expires in <strong>15 minutes</strong>.</p>
            <div style="margin: 20px 0; text-align: center;">
              <span style="font-size: 28px; font-weight: 700; letter-spacing: 8px; color: #0d9488; background: #f0fdfa; padding: 10px 20px; border-radius: 10px; border: 1px dashed #5eead4;">${code}</span>
            </div>
            <p style="color: #64748b; font-size: 12px;">If you did not request a password reset, you can safely ignore this email.</p>
          </div>
        </div>
      `,
    })

    return json(
      { ok: true, message: 'A verification code has been sent to your email. It expires in 15 minutes.' },
      200,
      headers,
    )
  } catch (e) {
    return json(
      { ok: false, error: e instanceof Error ? e.message : 'Something went wrong sending the code.' },
      500,
      headers,
    )
  }
})