import type { SupabaseClient } from '@supabase/supabase-js'
import { loginEmail, type AccountKind } from '../../supabase/functions/_shared/account.ts'

export interface AccountToProvision {
  kind: AccountKind
  id: string
  password: string
}

/**
 * Give each PWD / admin record a Supabase Auth user (password stored hashed by Auth) and write
 * its id to the record's auth_id. Idempotent: an existing auth user for the same account gets
 * its password and metadata refreshed instead of a duplicate. Needs the service-role key.
 */
export async function provisionAuthUsers(client: SupabaseClient, accounts: AccountToProvision[]): Promise<void> {
  const existing = new Map<string, string>()
  for (let page = 1; ; page++) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(`listUsers: ${error.message}`)
    for (const u of data.users) if (u.email) existing.set(u.email.toLowerCase(), u.id)
    if (data.users.length < 1000) break
  }

  for (const a of accounts) {
    const email = loginEmail(a.kind, a.id)
    const attrs = { password: a.password, app_metadata: { kind: a.kind, account_id: a.id } }
    let authId = existing.get(email)
    if (authId) {
      const { error } = await client.auth.admin.updateUserById(authId, attrs)
      if (error) throw new Error(`${a.kind} ${a.id}: ${error.message}`)
    } else {
      const { data, error } = await client.auth.admin.createUser({ email, email_confirm: true, ...attrs })
      if (error || !data.user) throw new Error(`${a.kind} ${a.id}: ${error?.message ?? 'no user returned'}`)
      authId = data.user.id
    }
    const table = a.kind === 'pwd' ? 'pwd_users' : 'admin_users'
    const { error } = await client.from(table).update({ auth_id: authId }).eq('id', a.id)
    if (error) throw new Error(`${table} ${a.id}: ${error.message}`)
  }
}
