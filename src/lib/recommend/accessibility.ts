import { taxonomy, normalizePhrase } from './taxonomy'
import type { PWDUser, Job } from '../../data'
import type { AccessibilityFit, AccessibilityFitResult } from './types'

/**
 * Accessibility-fit layer.
 *
 * Only assessed when the applicant has volunteered accessibility/accommodation
 * details. Never guesses a disability from other profile data, never prints a
 * disability label, and defaults to "Needs confirmation" (not "Not compatible")
 * when the job posting is simply silent on a relevant point.
 */

/** Does the applicant provide enough volunteered info to assess fit? */
export function hasAccessibilityProfile(user: PWDUser): boolean {
  const needs = user.accessibilityNeeds ?? []
  const accommodations = user.accommodationRequirements ?? []
  const wantsRemote = (user.preferredWorkSetup ?? []).some((s) => s.toLowerCase().includes('remote'))
  return needs.length > 0 || accommodations.length > 0 || wantsRemote
}

function supportText(job: Job): string {
  const parts = [
    job.accessibilityFeatures ?? [],
    job.accommodationSupport ? [job.accommodationSupport] : [],
    job.workplaceConditions ?? [],
    job.communicationRequirements ?? [],
  ]
    .flat()
    .join(' ')
  const remoteText = job.workSetup === 'Remote' || /remote/i.test((job.workplaceConditions ?? []).join(' ')) ? ' remote work from home' : ''
  return parts + remoteText
}

function constraintText(job: Job): string {
  return [
    job.physicalRequirements ?? [],
    job.communicationRequirements ?? [],
    job.functionalRequirements ?? [],
    (job as Job & { screenOrVisualDemands?: string[] }).screenOrVisualDemands ?? [],
    job.description ? [job.description] : [],
  ]
    .flat()
    .join(' ')
}

function jobHasAccessibilityInfo(job: Job): boolean {
  const features = job.accessibilityFeatures ?? []
  const support = job.accommodationSupport ?? ''
  return features.length > 0 || (support.trim().length > 0 && !/not available|none/i.test(support))
}

export interface AccessibilityScore {
  fit: AccessibilityFitResult
}

export function computeAccessibilityFit(user: PWDUser, job: Job): AccessibilityScore {
  const result: AccessibilityFitResult = {
    fit: 'Not assessed',
    adjustment: 0,
    note: 'Not assessed — you can add accessibility and accommodation details in your profile for tailored job recommendations.',
    questionsToConfirm: [],
    needsAssessed: false,
  }
  if (!hasAccessibilityProfile(user)) return { fit: result }

  const needs = [...(user.accessibilityNeeds ?? []), ...(user.accommodationRequirements ?? [])].map(normalizePhrase).filter(Boolean)
  const wantsRemote = (user.preferredWorkSetup ?? []).some((s) => s.toLowerCase().includes('remote'))
  const remoteSatisfied = wantsRemote && /remote|work from home|\bwfh\b/i.test(supportText(job))

  const domains = taxonomy.accessibilityDomains
  const support = supportText(job).toLowerCase()
  const constraints = constraintText(job).toLowerCase()

  const satisfiedDomains = new Set<string>()
  const conflictDomains = new Set<string>()
  const silentNeeds: string[] = []
  const evaluatedDomains = new Set<string>()

  for (const need of needs) {
    const matchedDomains = Object.entries(domains).filter(([, d]) => d.need.some((k) => need.includes(k))).map(([name]) => name)
    if (matchedDomains.length === 0) continue

    for (const domainName of matchedDomains) {
      evaluatedDomains.add(domainName)
      const d = domains[domainName]
      const satisfied = d.support.some((k) => support.includes(k))
      const conflicts = d.demand.some((k) => constraints.includes(k))
      if (satisfied) {
        satisfiedDomains.add(domainName)
      } else if (conflicts) {
        conflictDomains.add(domainName)
      } else {
        silentNeeds.push(need)
      }
    }
  }

  const explicitMatch = remoteSatisfied || satisfiedDomains.size > 0

  // 1) Direct conflict, no accommodation offered → exclude.
  if (conflictDomains.size > 0 && !explicitMatch) {
    result.fit = 'Not compatible'
    result.adjustment = 0
    result.needsAssessed = true
    result.note = 'This role lists requirements that appear to conflict with your stated needs and does not list a matching accommodation.'
    result.questionsToConfirm = [`Does this role offer an accommodation for: ${Array.from(conflictDomains).join(', ')}?`]
    return { fit: result }
  }

  // 2) Nothing relevant or silent — default to confirmation, never "Not compatible".
  if (evaluatedDomains.size === 0 && !remoteSatisfied) {
    if (jobHasAccessibilityInfo(job)) {
      result.fit = 'Compatible with accommodation'
      result.adjustment = -3
    } else {
      result.fit = 'Needs confirmation'
      result.adjustment = -8
    }
    result.needsAssessed = true
    result.questionsToConfirm = needs.map((n) => `Does this role provide ${n}?`)
    result.note =
      'This posting does not specify details related to your needs. Confirm the details with the employer before applying.'
    return { fit: result }
  }

  // 3) All evaluated needs are covered by explicit offerings.
  const allCovered = evaluatedDomains.size > 0 && Array.from(evaluatedDomains).every((d) => satisfiedDomains.has(d))
  if (allCovered || remoteSatisfied) {
    result.fit = 'Compatible'
    result.adjustment = explicitMatch ? 5 : 0
    result.needsAssessed = true
    result.note = remoteSatisfied
      ? 'The role offers the remote/work arrangement you prefer.'
      : 'The role explicitly offers support that matches your stated needs.'
    if (silentNeeds.length > 0) result.questionsToConfirm = silentNeeds.map((n) => `Does this role provide ${n}?`)
    return { fit: result }
  }

  // 4) Needs relevant, partly covered, and the job advertises accessibility → likely fit with an accommodation.
  if (jobHasAccessibilityInfo(job)) {
    result.fit = 'Compatible with accommodation'
    result.adjustment = -3
    result.needsAssessed = true
    result.note =
      silentNeeds.length > 0
        ? `Likely to fit with an accommodation — confirm ${silentNeeds.slice(0, 2).join(' and ')} with the employer.`
        : 'Likely fit with an accommodation offered by the employer, subject to confirmation.'
    result.questionsToConfirm = silentNeeds.map((n) => `Does this role provide ${n}?`)
    return { fit: result }
  }

  // 5) Job data silent on accessibility entirely.
  result.fit = 'Needs confirmation'
  result.adjustment = -8
  result.needsAssessed = true
  result.questionsToConfirm = silentNeeds.concat(needs.filter((n) => silentNeeds.indexOf(n) === -1)).map((n) => `Does this role provide ${n}?`)
  result.note = 'This posting does not list support for your needs. Confirm details with the employer before applying.'
  return { fit: result }
}

export const ACCESSIBILITY_FIT_LABEL: Record<AccessibilityFit, string> = {
  'Not assessed': 'Not assessed',
  Compatible: 'Compatible',
  'Compatible with accommodation': 'Compatible with accommodation',
  'Needs confirmation': 'Needs confirmation',
  'Not compatible': 'Not compatible',
}