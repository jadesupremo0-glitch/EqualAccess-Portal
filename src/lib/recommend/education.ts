import { EDUCATION_LEVELS } from '../catalog'
import { taxonomy, normalizePhrase } from './taxonomy'
import type { PWDUser, Job } from '../../data'
import type { EducationFit } from './types'

/** Rank of a level label from the catalog ("College Graduate" → 7); 0 when unknown. */
export function rankOfLevel(label: string | undefined): number {
  if (!label) return 0
  return EDUCATION_LEVELS.find((l) => l.label.toLowerCase() === label.trim().toLowerCase())?.rank ?? 0
}

/** Highest rank matched in free text such as "Bachelor of Science in IT" (0 = none). */
export function educationRankOf(text: string): number {
  const t = normalizePhrase(text)
  let rank = 0
  for (const def of taxonomy.educationLevels) {
    for (const kw of def.keywords) {
      if (t.includes(normalizePhrase(kw))) rank = Math.max(rank, def.rank)
    }
  }
  return rank
}

/** Label of the LOWEST level named in a free-text requirement ("College Graduate or Vocational" → Vocational). */
export function lowestEducationLabel(text: string): string {
  if (!text.trim()) return ''
  const t = normalizePhrase(text)
  let floor = Infinity
  for (const def of taxonomy.educationLevels) {
    if (def.keywords.some((kw) => t.includes(normalizePhrase(kw)))) floor = Math.min(floor, def.rank)
  }
  return EDUCATION_LEVELS.find((l) => l.rank === floor)?.label ?? ''
}

/** Applicant's education rank: the explicit level if set, otherwise inferred from free text. */
export function applicantEducationRank(user: PWDUser): number {
  return rankOfLevel(user.educationLevel) || educationRankOf(user.education ?? '')
}

/** Education fit: meeting the minimum is full marks; each level below costs points but never disqualifies. */
export function computeEducationFit(user: PWDUser, job: Job): EducationFit {
  const required = rankOfLevel(job.minEducation)
  if (!job.minEducation || required === 0) {
    return { fraction: 1, status: 'No requirement', note: 'No minimum education required.' }
  }

  const has = applicantEducationRank(user)
  if (has === 0) {
    return { fraction: 0.5, status: 'Unknown', note: `Minimum: ${job.minEducation}. Add your highest education level to your profile.` }
  }
  if (has >= required) return { fraction: 1, status: 'Met', note: `Meets the minimum: ${job.minEducation}.` }
  const gap = required - has
  return {
    fraction: gap === 1 ? 0.6 : gap === 2 ? 0.3 : 0.1,
    status: gap === 1 ? 'Nearly met' : 'Not met',
    note: `Minimum: ${job.minEducation}.`,
  }
}
