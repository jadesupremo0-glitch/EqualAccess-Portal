/**
 * One-time move of existing passwords into Supabase Auth (run before 20260929010000_auth_rls.sql,
 * which drops the plaintext password columns).
 *
 * For every PWD and admin record it creates (or refreshes) an Auth user with the record's current
 * password, stores the Auth id in auth_id, then signs in as each account with the anon key to prove
 * the password works before anything is dropped.
 *
 * Usage: npm run auth:migrate   (needs VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY and
 *        SUPABASE_SERVICE_ROLE_KEY in .env)
 */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { supabase, hasServiceRole } from '../src/lib/supabase'
import { provisionAuthUsers, type AccountToProvision } from './lib/provision-auth'
import { loginEmail } from '../supabase/functions/_shared/account.ts'

async function main() {
  if (!supabase || !hasServiceRole) throw new Error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.')

  const [pwds, admins] = await Promise.all([
    supabase.from('pwd_users').select('id, password'),
    supabase.from('admin_users').select('id, password'),
  ])
  if (pwds.error) throw new Error(`pwd_users: ${pwds.error.message} (already migrated? the password column is dropped by step 2)`)
  if (admins.error) throw new Error(`admin_users: ${admins.error.message}`)

  const accounts: AccountToProvision[] = []
  const skipped: string[] = []
  for (const [kind, rows] of [['pwd', pwds.data], ['admin', admins.data]] as const) {
    for (const r of rows ?? []) {
      // Auth requires at least 6 characters; such accounts must use "Forgot password" afterwards.
      if (typeof r.password === 'string' && r.password.length >= 6) accounts.push({ kind, id: r.id, password: r.password })
      else skipped.push(`${kind} ${r.id}`)
    }
  }

  console.log(`Provisioning ${accounts.length} accounts...`)
  await provisionAuthUsers(supabase, accounts)

  const anon = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
  const failed: string[] = []
  for (const a of accounts) {
    const { error } = await anon.auth.signInWithPassword({ email: loginEmail(a.kind, a.id), password: a.password })
    if (error) failed.push(`${a.kind} ${a.id}: ${error.message}`)
    else await anon.auth.signOut()
  }

  if (skipped.length) {
    // Still give them an Auth user (random password) so step 2 can run; they reset via email.
    const random = () => crypto.randomUUID()
    await provisionAuthUsers(supabase, skipped.map((s) => { const [kind, id] = s.split(' '); return { kind: kind as 'pwd' | 'admin', id, password: random() } }))
    console.log(`Short/empty passwords, given a random one (use "Forgot password"): ${skipped.join(', ')}`)
  }
  if (failed.length) throw new Error(`Sign-in check failed for:\n  ${failed.join('\n  ')}`)
  console.log(`Done. All ${accounts.length} accounts sign in with their existing passwords.`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
