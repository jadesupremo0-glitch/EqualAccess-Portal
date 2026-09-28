// Public PWD sign-up. Guests cannot write any table directly, so this creates the PWD record,
// its Supabase Auth user, the welcome notification and the activity-log entry server-side.
import { corsHeaders, json, loginEmail } from '../_shared/account.ts'
import { admin, manilaTime, manilaToday, nextSequentialId, randomId } from '../_shared/server.ts'

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

Deno.serve(async (req) => {
  const headers = corsHeaders(req)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers })

  try {
    const body = (await req.json()) as Record<string, unknown>
    const input = {
      fullName: str(body.fullName),
      age: Number(body.age),
      address: str(body.address, 300),
      barangay: str(body.barangay, 80),
      contact: str(body.contact, 40),
      email: str(body.email, 120),
      disabilityType: str(body.disabilityType, 80),
      pwdIdNumber: str(body.pwdIdNumber, 60),
      password: typeof body.password === 'string' ? body.password : '',
    }
    if (!input.fullName || !input.address || !input.barangay || !input.contact || !input.disabilityType || !input.pwdIdNumber) {
      return json({ ok: false, error: 'Please complete all required fields.' }, 400, headers)
    }
    if (!Number.isInteger(input.age) || input.age < 1 || input.age > 130) return json({ ok: false, error: 'Please enter a valid age.' }, 400, headers)
    if (input.password.length < 8) return json({ ok: false, error: 'Password must be at least 8 characters.' }, 400, headers)

    const { data: existing, error: dupErr } = await admin.from('pwd_users').select('pwd_id_number')
    if (dupErr) throw new Error(dupErr.message)
    if ((existing ?? []).some((r) => String(r.pwd_id_number ?? '').toLowerCase() === input.pwdIdNumber.toLowerCase())) {
      return json({ ok: false, error: 'That PWD ID No. is already registered. Please check your ID number.' }, 409, headers)
    }

    const today = manilaToday()
    const id = await nextSequentialId('pwd_users', `PWD-LB-${today.slice(0, 4)}-`, 4)
    const { error: insErr } = await admin.from('pwd_users').insert({
      id,
      username: input.pwdIdNumber,
      name: input.fullName,
      age: input.age,
      address: input.address,
      barangay: input.barangay,
      contact: input.contact,
      email: input.email,
      disability_type: input.disabilityType,
      verification_status: 'Pending',
      date_registered: today,
      pwd_id_number: input.pwdIdNumber,
      skills: [],
    })
    if (insErr) throw new Error(insErr.message)

    const { data: created, error: authErr } = await admin.auth.admin.createUser({
      email: loginEmail('pwd', id),
      password: input.password,
      email_confirm: true,
      app_metadata: { kind: 'pwd', account_id: id },
    })
    if (authErr || !created.user) {
      await admin.from('pwd_users').delete().eq('id', id)
      return json({ ok: false, error: authErr?.message ?? 'Could not create the account.' }, 400, headers)
    }
    await admin.from('pwd_users').update({ auth_id: created.user.id }).eq('id', id)

    await admin.from('notifications').insert({
      id: randomId('NOT'),
      type: 'info',
      title: 'Welcome to EqualAccess Portal',
      message: `Your registration has been received. PDAO will verify your account within 3–5 business days. Your reference ID is ${id}.`,
      date: today,
      read: false,
      user_id: id,
    })
    await admin.from('activity_log').insert({
      user: input.pwdIdNumber,
      action: 'Registered',
      date: today,
      time: manilaTime(),
      activity: `New PWD registration submitted for ${input.fullName} (${id})`,
    })

    return json({ ok: true, id }, 200, headers)
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : 'Registration failed.' }, 500, headers)
  }
})
