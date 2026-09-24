/**
 * Finishes mapping the 100 jobs from dataset/mldataset.xlsx (already field-mapped to
 * dataset/mldataset-jobs-mapped.json by scripts/map_mldataset_jobs.py) into the app's Job shape,
 * and writes src/mldatasetJobs.ts — a plain data file that src/data.ts appends onto its `jobs` array.
 *
 * The one step that has to happen here rather than in the Python mapper: minEducation is inferred
 * from each listing's free-text Qualifications using the app's own lowestEducationLabel() (the same
 * function the recommendation engine relies on), so the inferred level is guaranteed consistent with
 * how the engine will actually read it — not a re-implementation that could drift.
 *
 * Usage: npx tsx scripts/import-mldataset-jobs.ts
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { lowestEducationLabel } from '../src/lib/recommend/education'
import type { Job } from '../src/data'

interface MappedRow {
  id: string
  title: string
  company: string
  description: string
  location: string
  employmentType: string
  workArrangement: string
  skills: string[]
  qualificationsText: string
  slots: number
  deadline: string
  status: string
  postedDate: string
  category: string
}

const rows: MappedRow[] = JSON.parse(readFileSync('dataset/mldataset-jobs-mapped.json', 'utf-8'))

const jobs: Job[] = rows.map((r) => ({
  id: r.id,
  title: r.title,
  company: r.company,
  description: r.description,
  location: r.location,
  employmentType: r.employmentType as Job['employmentType'],
  workArrangement: r.workArrangement as Job['workArrangement'],
  skills: r.skills,
  minEducation: lowestEducationLabel(r.qualificationsText),
  // No disability/accommodation signal in the source dataset — open to all, none specifically offered
  // (a fully remote listing still gets "Remote work" credit automatically; see accommodations.ts).
  suitableDisabilities: [],
  accommodations: [],
  slots: r.slots,
  deadline: r.deadline,
  status: r.status as Job['status'],
  postedDate: r.postedDate,
  category: r.category,
}))

const header = `/**
 * The 100 jobs from dataset/mldataset.xlsx (the capstone TF-IDF dataset), mapped onto the app's Job
 * shape by scripts/map_mldataset_jobs.py + scripts/import-mldataset-jobs.ts. IDs continue from the
 * 13 curated demo jobs in data.ts (JOB-001..JOB-013) at JOB-014..JOB-113, so they never collide.
 *
 * Regenerate: python scripts/map_mldataset_jobs.py && npx tsx scripts/import-mldataset-jobs.ts
 */
import type { Job } from './data'

export const mldatasetJobs: Job[] = `

writeFileSync('src/mldatasetJobs.ts', header + JSON.stringify(jobs, null, 2) + '\n', 'utf-8')
console.log(`Wrote src/mldatasetJobs.ts (${jobs.length} jobs, IDs ${jobs[0].id}..${jobs[jobs.length - 1].id})`)

const withEducation = jobs.filter((j) => j.minEducation).length
console.log(`${withEducation} of ${jobs.length} listings had an inferable minimum education level; the rest are "no requirement".`)
