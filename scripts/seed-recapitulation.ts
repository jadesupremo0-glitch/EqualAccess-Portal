import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

/**
 * Inserts the official PWD Recapitulation snapshot as of April 30, 2026 (published), unless a report
 * for that date already exists, then checks the totals: 6,727 / 1,207 / 7,934.
 *
 * The data itself lives in seed_recapitulation_snapshot() in
 * supabase/migrations/20260922010000_recapitulation.sql, which also refuses to finish if the totals differ.
 * Run: npm run seed:recap  (safe to run repeatedly; it never overwrites an existing report)
 */
async function main() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) {
    console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in environment.')
    console.error('Make sure .env exists in the project root (see .env.example).')
    process.exit(1)
  }
  const supabase = createClient(url, key)

  const { data, error } = await supabase.rpc('seed_recapitulation_snapshot')
  if (error) {
    console.error('Seeding failed:', error.message)
    if (/could not find the function/i.test(error.message)) console.error('Apply the migration first: supabase db push')
    process.exit(1)
  }
  console.log(`Recapitulation snapshot as of 2026-04-30 is in place (report ${data}).`)
  console.log('Expected totals: Age 0-59 = 6,727 · Age 60-above = 1,207 · Grand total = 7,934.')
}

main().catch((err) => {
  console.error('Seeding failed:', err)
  process.exit(1)
})
