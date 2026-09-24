/**
 * Exports the ACTUAL live Supabase tables that power the job recommendation engine —
 * `pwd_users` and `jobs` — as-is (raw column names, no camelCase mapping), for showing an
 * adviser/professor the real variables the app reads from the database. The `password`
 * column is always dropped from the export; everything else is included verbatim.
 *
 * Usage: npx tsx scripts/export-live-database.ts [out-dir]
 */
import 'dotenv/config'
import { writeFileSync, mkdirSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const outDir = process.argv[2] ?? 'dataset/live-db'
mkdirSync(outDir, { recursive: true })

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY
if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in environment (.env).')
  process.exit(1)
}
const supabase = createClient(url, key)

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const columns = Object.keys(rows[0])
  const esc = (v: unknown): string => {
    const s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [columns.join(',')]
  for (const r of rows) lines.push(columns.map((c) => esc(r[c])).join(','))
  return '﻿' + lines.join('\r\n') + '\r\n'
}

async function exportTable(table: string, dropColumns: string[] = []) {
  const { data, error } = await supabase.from(table).select('*')
  if (error) {
    console.error(`Failed to read "${table}":`, error.message)
    process.exit(1)
  }
  const rows = (data ?? []).map((row) => {
    const copy = { ...row }
    for (const c of dropColumns) delete (copy as Record<string, unknown>)[c]
    return copy
  })
  const file = `${outDir}/${table}.csv`
  writeFileSync(file, toCsv(rows), 'utf-8')
  console.log(`${table}: ${rows.length} rows, ${rows.length ? Object.keys(rows[0]).length : 0} columns -> ${file}`)
  if (rows.length) console.log(`  columns: ${Object.keys(rows[0]).join(', ')}`)
}

async function main() {
  await exportTable('pwd_users', ['password'])
  await exportTable('jobs')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
