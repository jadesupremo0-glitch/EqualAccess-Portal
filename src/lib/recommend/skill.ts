import { areRelatedSkills, canonicalOf } from './taxonomy'
import type { PWDUser, Job } from '../../data'
import type { SkillFit } from './types'

/** A related (not identical) skill counts for this share of an exact match. */
export const RELATED_SKILL_CREDIT = 0.4

/** Compare two skill phrases pair-wise; same canonical term ⇔ match. */
export function skillsMatch(applicantSkill: string, requiredSkill: string): boolean {
  const a = canonicalOf(applicantSkill)
  const b = canonicalOf(requiredSkill)
  if (!a || !b) return false
  return a === b
}

/** Coverage of the job's required skills by the applicant's skills (synonym-aware, related skills earn partial credit). */
export function computeSkillsFit(user: PWDUser, job: Job): SkillFit {
  const applicantSkills = user.skills ?? []
  const required = job.skills ?? []
  const matched: string[] = []
  const related: string[] = []
  const missing: string[] = []

  for (const need of required) {
    if (applicantSkills.some((s) => skillsMatch(s, need))) matched.push(need)
    else if (applicantSkills.some((s) => areRelatedSkills(s, need))) related.push(need)
    else missing.push(need)
  }

  // A listing with no required skills is open to anyone; treat coverage as a soft pass.
  const coverage = required.length === 0 ? 0.6 : (matched.length + RELATED_SKILL_CREDIT * related.length) / required.length
  return { matched, related, missing, coverage }
}
