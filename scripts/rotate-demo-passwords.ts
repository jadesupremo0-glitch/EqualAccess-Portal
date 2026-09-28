/**
 * Moves every account that still signs in with a publicly known demo password (pwd123 /
 * admin123, which are in the repository and were shown on the login page) to the passwords in
 * .env: DEMO_PWD_PASSWORD for PWD accounts, DEMO_ADMIN_PASSWORD for staff. Accounts with their
 * own password are not touched. Safe to run again.
 *
 * Usage: npm run demo:passwords
 */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { supabase, hasServiceRole } from '../src/lib/supabase'
import { loginEmail, type AccountKind } from '../supabase/functions/_shared/account.ts'

const KNOWN: Record<AccountKind, string[]> = { pwd: ['pwd123'], admin: ['admin123'] }

async function main() {
  const next = { pwd: process.env.DEMO_PWD_PASSWORD, admin: process.env.DEMO_ADMIN_PASSWORD }
  if (!supabase || !hasServiceRole) throw new Error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.')
  if (!next.pwd || next.pwd.length < 12 || !next.admin || next.admin.length < 12) {
    throw new Error('Set DEMO_PWD_PASSWORD and DEMO_ADMIN_PASSWORD (12+ characters) in .env.')
  }

  const anon = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
  const summary: string[] = []
  for (const [kind, table] of [['pwd', 'pwd_users'], ['admin', 'admin_users']] as const) {
    const { data, error } = await supabase.from(table).select('id, auth_id')
    if (error) throw new Error(`${table}: ${error.message}`)
    let changed = 0
    for (const row of data ?? []) {
      if (!row.auth_id) continue
      let usesDemo = false
      for (const pw of KNOWN[kind]) {
        const res = await anon.auth.signInWithPassword({ email: loginEmail(kind, row.id), password: pw })
        if (!res.error) { usesDemo = true; await anon.auth.signOut(); break }
      }
      if (!usesDemo) continue
      const { error: updErr } = await supabase.auth.admin.updateUserById(row.auth_id, { password: next[kind]! })
      if (updErr) throw new Error(`${kind} ${row.id}: ${updErr.message}`)
      changed++
    }
    summary.push(`${changed}/${data?.length ?? 0} ${kind} accounts`)
  }
  console.log(`Moved off the old demo passwords: ${summary.join(', ')}.`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
