// Staff-account changes that touch Supabase Auth: create, set password, delete.
// The caller must be signed in as an active staff member (checked from their Auth token).
import { corsHeaders, json, loginEmail } from '../_shared/account.ts'
import { admin, callerAdmin, manilaToday, nextSequentialId } from '../_shared/server.ts'

const ROLES = ['Administrator', 'Benefits Officer', 'Social Worker', 'Records Officer']
const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

Deno.serve(async (req) => {
  const headers = corsHeaders(req)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers })

  try {
    const caller = await callerAdmin(req)
    if (!caller) return json({ ok: false, error: 'Please sign in again as an active PDAO staff member.' }, 401, headers)

    const body = (await req.json()) as Record<string, unknown>
    const action = body.action

    if (action === 'create') {
      const username = str(body.username, 60)
      const role = str(body.role, 40)
      const password = typeof body.password === 'string' ? body.password : ''
      const name = str(body.name)
      if (!name || !username || !ROLES.includes(role)) return json({ ok: false, error: 'Name, username and a valid role are required.' }, 400, headers)
      if (password.length < 8) return json({ ok: false, error: 'Password must be at least 8 characters.' }, 400, headers)

      const { data: all, error } = await admin.from('admin_users').select('username')
      if (error) throw new Error(error.message)
      if ((all ?? []).some((a) => String(a.username).toLowerCase() === username.toLowerCase())) {
        return json({ ok: false, error: 'That username is already taken.' }, 409, headers)
      }

      const id = await nextSequentialId('admin_users', 'ADM-', 3)
      const { error: insErr } = await admin.from('admin_users').insert({
        id,
        name,
        position: str(body.position) || role,
        username,
        contact: str(body.contact, 40) || null,
        email: str(body.email, 120) || null,
        role,
        status: 'Active',
        last_login: 'Never',
        date_created: manilaToday(),
      })
      if (insErr) throw new Error(insErr.message)
      const { data: created, error: authErr } = await admin.auth.admin.createUser({
        email: loginEmail('admin', id),
        password,
        email_confirm: true,
        app_metadata: { kind: 'admin', account_id: id },
      })
      if (authErr || !created.user) {
        await admin.from('admin_users').delete().eq('id', id)
        return json({ ok: false, error: authErr?.message ?? 'Could not create the account.' }, 400, headers)
      }
      await admin.from('admin_users').update({ auth_id: created.user.id }).eq('id', id)
      return json({ ok: true, id }, 200, headers)
    }

    const id = str(body.id, 40)
    const { data: target } = await admin.from('admin_users').select('id, username, role, status, auth_id').eq('id', id).maybeSingle()
    if (!target) return json({ ok: false, error: 'Account not found.' }, 404, headers)

    if (action === 'set-password') {
      const password = typeof body.password === 'string' ? body.password : ''
      if (password.length < 8) return json({ ok: false, error: 'Password must be at least 8 characters.' }, 400, headers)
      if (!target.auth_id) return json({ ok: false, error: 'This account has no sign-in yet.' }, 400, headers)
      const { error } = await admin.auth.admin.updateUserById(target.auth_id, { password })
      if (error) throw new Error(error.message)
      return json({ ok: true }, 200, headers)
    }

    if (action === 'delete') {
      if (target.id === caller.id) return json({ ok: false, error: 'You cannot delete your own account.' }, 400, headers)
      if (target.role === 'Administrator' && (target.status ?? 'Active') === 'Active') {
        const { count } = await admin.from('admin_users').select('id', { count: 'exact', head: true })
          .eq('role', 'Administrator').eq('status', 'Active').neq('id', target.id)
        if (!count) return json({ ok: false, error: 'The last active Administrator account cannot be removed.' }, 400, headers)
      }
      const { error } = await admin.from('admin_users').delete().eq('id', target.id)
      if (error) throw new Error(error.message)
      if (target.auth_id) await admin.auth.admin.deleteUser(target.auth_id)
      return json({ ok: true }, 200, headers)
    }

    return json({ ok: false, error: 'Unknown action.' }, 400, headers)
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : 'Request failed.' }, 500, headers)
  }
})
