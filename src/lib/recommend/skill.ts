import { canonicalOf } from './taxonomy'
import type { PWDUser, Job } from '../../data'
import type { SkillFit } from './types'

/** Component 1 — Skills fit (40%): coverage of required skills via normalized comparison. */

/** Compare two skill phrases pair-wise; same canonical term ⇔ match. */
export function skillsMatch(applicantSkill: string, requiredSkill: string): boolean {
  const a = canonicalOf(applicantSkill)
  const b = canonicalOf(requiredSkill)
  if (!a || !b) return false
  return a === b
}

export interface SkillScore {
  component: number
  fit: SkillFit
}

export function computeSkillsFit(user: PWDUser, job: Job): SkillScore {
  const applicantSkills = user.skills ?? []
  const required = job.skills ?? []
  const matched: string[] = []
  const missing: string[] = []

  for (const need of required) {
    const hit = applicantSkills.find((s) => skillsMatch(s, need))
    if (hit) {
      matched.push(need)
    } else {
      missing.push(need)
    }
  }

  const total = required.length
  const coverage = total === 0 ? 1 : matched.length / total
  const component = Math.round(40 * coverage * 100) / 100

  const fit: SkillFit = {
    matched: matched.slice(),
    missing: missing.slice(),
    coverage: Math.round(coverage * 100) / 100,
  }
  return { component, fit }
}