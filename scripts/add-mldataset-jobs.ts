import 'dotenv/config'
import { mldatasetJobs } from '../src/mldatasetJobs'
import { supabase } from '../src/lib/supabase'
import type { Job } from '../src/data'

// Surgical insert: upserts ONLY the 100 mldataset.xlsx jobs (JOB-014..JOB-113) by id.
// Touches no other row and no other table — safe to run against the live database
// without the full wipe-and-reseed that `npm run seed` performs.

const JOB_MAP: Record<keyof Job, string> = {
  id: 'id',
  title: 'title',
  company: 'company',
  description: 'description',
  location: 'location',
  employmentType: 'employment_type',
  workArrangement: 'work_arrangement',
  skills: 'skills',
  minEducation: 'min_education',
  suitableDisabilities: 'suitable_disabilities',
  accommodations: 'accommodations',
  slots: 'slots',
  deadline: 'deadline',
  status: 'status',
  postedDate: 'posted_date',
  salary: 'salary',
  category: 'category',
  accessibilityInfo: 'accessibility_info',
}

function toRow(job: Job): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  for (const [key, column] of Object.entries(JOB_MAP)) {
    row[column] = job[key as keyof Job]
  }
  return row
}

async function main() {
  if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
    console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in environment.')
    console.error('Make sure .env exists in the project root (see .env.example).')
    process.exit(1)
  }
  if (!supabase) {
    console.error('Supabase client did not initialize.')
    process.exit(1)
  }

  console.log(`Upserting ${mldatasetJobs.length} jobs from mldataset.xlsx (ids ${mldatasetJobs[0].id}..${mldatasetJobs[mldatasetJobs.length - 1].id})...`)
  const rows = mldatasetJobs.map(toRow)
  const { error, count } = await supabase.from('jobs').upsert(rows, { onConflict: 'id', count: 'exact' })
  if (error) {
    console.error('Upsert failed:', error.message)
    process.exit(1)
  }
  console.log(`Done. ${count ?? rows.length} rows upserted. No other table or row was touched.`)
}

main().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
