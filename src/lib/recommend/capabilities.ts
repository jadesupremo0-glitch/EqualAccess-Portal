import { tokenize } from './taxonomy'
import type { PWDUser, Job } from '../../data'

/** Component 2 — Capabilities vs. Job_Description duties (25%). */

const unique = (tokens: string[]) => Array.from(new Set(tokens))

/** Keyword overlap between the applicant's capabilities and a job's duties. */
function overlapCoverage(capabilityWords: Set<string>, dutyWords: string[]): number {
  const uniqueDuties = unique(dutyWords)
  if (uniqueDuties.length === 0) return 0
  const matched = uniqueDuties.filter((w) => capabilityWords.has(w)).length
  return matched / uniqueDuties.length
}

export function computeCapabilityFit(user: PWDUser, job: Job): number {
  const capabilities = (user.functionalCapabilities ?? []).join(' ')
  const functional = (job.functionalRequirements ?? []).join(' ')
  const description = job.description ?? ''

  const capWords = new Set(tokenize(capabilities))
  const functionalCoverage = overlapCoverage(capWords, tokenize(functional))
  const descriptionCoverage = overlapCoverage(capWords, tokenize(description))

  const hasDutySignal = tokenize(functional).length > 0 || tokenize(description).length > 0
  const hasCaps = capWords.size > 0

  // No data on either side ⇒ neutral score (0.5 of the 25 pts), never zero.
  if (!hasDutySignal || !hasCaps) return 12.5

  const blended = functionalCoverage * 0.6 + descriptionCoverage * 0.4
  return Math.round(25 * blended * 100) / 100
}