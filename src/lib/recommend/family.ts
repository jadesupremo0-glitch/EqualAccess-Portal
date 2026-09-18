import { taxonomy, normalizePhrase, wordsOf } from './taxonomy'
import type { PWDUser, Job } from '../../data'
import type { FamilyFit } from './types'

/** Component 3 — Preferred_Job / job-family alignment (15%). */

function familyScoreOf(text: string, categories: string[]): { family: string; score: number } | null {
  const haystack = normalizePhrase(text)
  const categoryText = normalizePhrase(categories.filter(Boolean).join(' '))
  let best: { family: string; score: number } | null = null
  for (const def of taxonomy.families) {
    let score = 0
    const defCategories = def.categories.map((c) => normalizePhrase(c))
    if (defCategories.some((c) => categoryText.includes(c))) score += 3
    for (const kw of def.keywords) {
      const k = normalizePhrase(kw)
      if (haystack.includes(k)) score += 2.5
    }
    if (score > 0 && (!best || score > best.score)) best = { family: def.family, score }
  }
  return best
}

/** Family inferred from a job title + category. */
export function jobFamily(job: Job): string | null {
  const marker = jobFamilyOfText(job.title, [job.category ?? ''])
  return marker?.family ?? null
}

/** Family inferred from any text (used for job interests). */
export function jobFamilyOfText(text: string, categories: string[] = []): { family: string; score: number } | null {
  return familyScoreOf(text, categories)
}

/** Exact-ish title match: every word of the interest appears in the job title. */
function isTitleMatch(interest: string, jobTitle: string): boolean {
  const iw = wordsOf(interest)
  const tw = wordsOf(jobTitle)
  if (iw.size === 0) return false
  for (const w of iw) if (!tw.has(w)) return false
  return true
}

export interface FamilyScore {
  component: number
  fit: FamilyFit
}

export function computeFamilyFit(user: PWDUser, job: Job): FamilyScore {
  const interests = (user.jobInterests ?? []).map((i) => normalizePhrase(i)).filter(Boolean)
  const jobFamilyName = jobFamily(job)

  if (interests.length === 0) {
    return {
      component: 7.5,
      fit: { jobFamily: jobFamilyName, preferredFamilies: [], matchLevel: 'none' },
    }
  }

  const preferredFamilies = new Set<string>()
  let bestCoefficient = 0.15
  let bestMatchLevel: FamilyFit['matchLevel'] = 'none'
  const title = normalizePhrase(job.title)

  for (const interest of interests) {
    const fam = jobFamilyOfText(interest)
    if (fam) preferredFamilies.add(fam.family)
    if (isTitleMatch(interest, title)) {
      bestCoefficient = 1
      bestMatchLevel = 'exact'
    } else if (fam && fam.family === jobFamilyName && bestCoefficient < 0.6) {
      bestCoefficient = 0.6
      bestMatchLevel = 'family'
    }
  }

  return {
    component: Math.round(15 * bestCoefficient * 100) / 100,
    fit: {
      jobFamily: jobFamilyName,
      preferredFamilies: Array.from(preferredFamilies),
      matchLevel: bestMatchLevel,
    },
  }
}