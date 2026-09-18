import { normalizePhrase } from './taxonomy'
import type { PWDUser, Job } from '../../data'

/** Component 5 — Experience (10%): a small boost, never a hard filter. */

function effectiveYears(user: PWDUser): number {
  const years = user.yearsOfExperience ?? 0
  const text = normalizePhrase(user.workExperience ?? '')
  const increment = text.includes('intern') || text.includes('internship') || text.includes('trainee') ? 0.5 : 0
  return years + increment
}

/** Minimum years acceptable for the posting, or null if unspecified. */
function requirementYears(job: Job): number | null {
  const req = job.experienceRequirement
  if (!req) return null
  const numbers = req.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? []
  if (numbers.length === 0) {
    const entry = /entry|fresh graduate|no formal experience|intern/i.test(req)
    return entry ? 0 : null
  }
  return Math.min(...numbers)
}

export function computeExperienceFit(user: PWDUser, job: Job): number {
  const reqYears = requirementYears(job)
  const has = effectiveYears(user)

  // No requirement stated ⇒ nothing to measure against.
  if (reqYears === null) return 10

  // Entry-level roles accept interns / "no formal experience".
  if (reqYears <= 0.5) return 10
  if (has >= reqYears) return 10
  if (has >= 0.5 && reqYears <= 1) return 8

  const ratio = Math.max(0.2, has / Math.max(1, reqYears))
  return Math.round(10 * ratio * 100) / 100
}