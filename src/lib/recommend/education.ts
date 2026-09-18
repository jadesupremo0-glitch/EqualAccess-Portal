import { taxonomy, normalizePhrase } from './taxonomy'
import type { PWDUser, Job } from '../../data'
import type { QualificationFit, QualificationStatus } from './types'

/** Component 4 — Qualifications (10%). Soft, level-based; higher always satisfies lower. */

interface RequirementInfo {
  floor: number
  equivalency: boolean
  hasRequirement: boolean
}

/** Highest rank matched in a text (perfect for applicant education). */
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

/** Requirement floor = LOWEST acceptable level explicitly listed (e.g. "College level or Vocational" → 5). */
function requirementInfo(requirement: string | undefined): RequirementInfo {
  if (!requirement || !requirement.trim()) return { floor: 0, equivalency: false, hasRequirement: false }
  const t = normalizePhrase(requirement)
  let floor = Infinity
  let matched = false
  for (const def of taxonomy.educationLevels) {
    for (const kw of def.keywords) {
      if (t.includes(normalizePhrase(kw))) {
        floor = Math.min(floor, def.rank)
        matched = true
      }
    }
  }
  if (!matched) return { floor: 0, equivalency: false, hasRequirement: false }
  return { floor, equivalency: t.includes('equivalent') || t.includes('or equivalent'), hasRequirement: true }
}

function noteFor(status: QualificationStatus, requirement: string | undefined, level: number, floor: number): string {
  if (!requirement) return 'No formal education requirement.'
  if (status === 'Met') return `Your education (level ${level}) satisfies the requirement (level ${floor}).`
  if (status === 'Partly met') return `Close to the requirement (level ${floor}); field of study or an equivalent may still apply — confirm with the employer.`
  return `Requirement is level ${floor}; your listed education reaches level ${level}.`
}

export interface QualificationScore {
  component: number
  fit: QualificationFit
}

export function computeQualificationFit(user: PWDUser, job: Job): QualificationScore {
  const requirement = job.educationRequirement
  const info = requirementInfo(requirement)
  if (!info.hasRequirement) {
    return { component: 10, fit: { status: 'Met', note: 'No formal education requirement.' } }
  }

  const applicantLevel = educationRankOf(user.education ?? '')
  let status: QualificationStatus
  let component: number

  if (applicantLevel >= info.floor) {
    status = 'Met'
    component = 10
  } else if (info.equivalency && (user.workExperience ?? '').length > 0) {
    status = 'Partly met'
    component = 6
  } else if (applicantLevel >= info.floor - 1) {
    status = 'Partly met'
    component = 6
  } else {
    status = 'Not met'
    component = 3
  }

  return {
    component,
    fit: { status, note: noteFor(status, requirement, applicantLevel, info.floor) },
  }
}