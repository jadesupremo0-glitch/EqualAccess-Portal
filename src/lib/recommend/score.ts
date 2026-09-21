import { manilaDate, normalizeDisability } from '../catalog'
import { computeSkillsFit } from './skill'
import { computeEducationFit } from './education'
import { computeAccommodationFit } from './accommodations'
import { computeLocationFit } from './location'
import { canRecommend } from './profile'
import {
  bandForScore,
  type ComponentKey,
  type MatchReason,
  type MatchWeights,
  type Recommendation,
  type RecommendationResult,
} from './types'
import type { PWDUser, Job } from '../../data'

/** Points per component (sum = 100). Change here to reweight the whole engine. */
export const DEFAULT_WEIGHTS: MatchWeights = {
  skills: 35,
  suitability: 25,
  education: 15,
  location: 15,
  preference: 10,
}

/** Listings scoring below this are hidden from the recommended list. */
export const MIN_MATCH_SCORE = 40

/**
 * A listing must be covered by at least this share of the applicant's skills (a related skill counts as
 * 0.4). Without it, the 65 points for accommodations, education, location and preferences let a job the
 * applicant can barely do outrank one they are qualified for.
 */
export const MIN_SKILL_COVERAGE = 0.4

// Suitability = disability suitability + accommodations fit. Disability type is used only
// as a positive signal: listing it earns full credit, "open to all" earns most of it.
const OPEN_TO_ALL_CREDIT = 0.7
const DISABILITY_SHARE_WITH_NEEDS = 0.3

const norm = (v: string) => v.trim().toLowerCase()
// Legacy spellings (e.g. "Speech and Language Impairment") count as the current label.
const sameDisability = (a: string, b: string) => norm(normalizeDisability(a)) === norm(normalizeDisability(b))

/** True when the employer explicitly restricted the listing and this PWD is not on the list. */
export function isRestrictedAgainst(user: PWDUser, job: Job): boolean {
  const list = job.suitableDisabilities ?? []
  if (list.length === 0) return false
  return !list.some((d) => sameDisability(d, user.disabilityType))
}

/** A job is recommendable while it is Open and its deadline has not passed (Asia/Manila). */
export function isOpenAndCurrent(job: Job, now: Date = new Date()): boolean {
  if (job.status !== 'Open') return false
  return !job.deadline || job.deadline >= manilaDate(now)
}

function preferenceFraction(preferred: string[] | undefined, actual: string): number {
  if (!preferred || preferred.length === 0) return 0.5 // nothing stated → neutral
  return preferred.some((p) => norm(p) === norm(actual)) ? 1 : 0
}

const shortAccommodation: Record<string, string> = {
  'Wheelchair-accessible workplace': 'Wheelchair accessible',
  'Screen-reader-compatible tools': 'Screen-reader compatible',
  'Remote work': 'Remote work available',
}

/**
 * Score one listing for one PWD (0–100), or return null when the employer explicitly
 * restricted the listing to other disability types.
 */
export function scoreJob(user: PWDUser, job: Job, weights: MatchWeights = DEFAULT_WEIGHTS): Recommendation | null {
  if (isRestrictedAgainst(user, job)) return null

  const skills = computeSkillsFit(user, job)
  const education = computeEducationFit(user, job)
  const accommodation = computeAccommodationFit(user, job)
  const location = computeLocationFit(user, job)

  const disabilityListed = (job.suitableDisabilities ?? []).some((d) => sameDisability(d, user.disabilityType))
  const disabilityFraction = disabilityListed ? 1 : OPEN_TO_ALL_CREDIT
  const suitabilityFraction = accommodation.applicable
    ? DISABILITY_SHARE_WITH_NEEDS * disabilityFraction + (1 - DISABILITY_SHARE_WITH_NEEDS) * accommodation.fraction
    : disabilityFraction

  const typeFraction = preferenceFraction(user.preferredJobTypes, job.employmentType)
  const arrangementFraction = preferenceFraction(user.preferredWorkSetup, job.workArrangement)

  const components: Record<ComponentKey, number> = {
    skills: weights.skills * skills.coverage,
    suitability: weights.suitability * suitabilityFraction,
    education: weights.education * education.fraction,
    location: weights.location * location.fraction,
    preference: weights.preference * ((typeFraction + arrangementFraction) / 2),
  }
  const total = Object.values(components).reduce((a, b) => a + b, 0)
  const weightSum = Object.values(weights).reduce((a, b) => a + b, 0) || 100
  const score = Math.max(0, Math.min(100, Math.round((total / weightSum) * 100)))

  const reasons: MatchReason[] = []
  if (skills.matched.length > 0) {
    const shown = skills.matched.slice(0, 3).map((s) => s.toLowerCase()).join(', ')
    reasons.push({ label: `Skills: ${shown}${skills.matched.length > 3 ? ` +${skills.matched.length - 3}` : ''}`, tone: 'positive' })
  }
  if (skills.related.length > 0) {
    reasons.push({ label: `Related skills: ${skills.related.slice(0, 2).map((s) => s.toLowerCase()).join(', ')}`, tone: 'positive' })
  }
  for (const m of accommodation.met.slice(0, 2)) {
    reasons.push({ label: shortAccommodation[m] ?? m, tone: 'positive' })
  }
  if (disabilityListed) reasons.push({ label: 'Employer welcomes your disability type', tone: 'positive' })
  if (location.level === 'barangay') reasons.push({ label: 'In your barangay', tone: 'positive' })
  else if (location.level === 'municipality') reasons.push({ label: 'Near you, in Los Baños', tone: 'positive' })
  else if (location.level === 'remote') reasons.push({ label: 'Work from home', tone: 'positive' })
  if (education.status === 'Met') reasons.push({ label: 'Education requirement met', tone: 'positive' })
  if (typeFraction === 1 && (user.preferredJobTypes?.length ?? 0) > 0) reasons.push({ label: `${job.employmentType}, as you prefer`, tone: 'positive' })
  if (arrangementFraction === 1 && (user.preferredWorkSetup?.length ?? 0) > 0) reasons.push({ label: `${job.workArrangement}, as you prefer`, tone: 'positive' })

  if (skills.missing.length > 0) reasons.push({ label: `Missing: ${skills.missing.slice(0, 2).join(', ')}`, tone: 'caution' })
  if (accommodation.unmet.length > 0) reasons.push({ label: `Confirm: ${accommodation.unmet[0]}`, tone: 'caution' })
  if (education.status === 'Nearly met' || education.status === 'Not met') reasons.push({ label: `Requires ${job.minEducation}`, tone: 'caution' })

  return {
    job,
    score,
    band: bandForScore(score),
    components,
    skills,
    education,
    accommodation,
    location,
    disabilityListed,
    reasons,
  }
}

export interface RecommendOptions {
  now?: Date
  weights?: MatchWeights
  minScore?: number
}

/** A listing is only relevant if the PWD's skills cover enough of what it asks for (a listing that asks for none is open to anyone). */
export function hasEnoughSkills(rec: Recommendation): boolean {
  return rec.job.skills.length === 0 || rec.skills.coverage >= MIN_SKILL_COVERAGE
}

/**
 * Locked (empty) until skills and education are entered. Then score every open, non-expired listing;
 * keep those at/above the threshold whose required skills the PWD sufficiently covers, best first.
 * Neutral defaults (nothing stated → half credit) would otherwise "match" everything, so skills
 * are what make a listing worth recommending.
 */
export function getRecommendations(user: PWDUser, jobs: Job[], options: RecommendOptions = {}): RecommendationResult {
  const { now = new Date(), weights = DEFAULT_WEIGHTS, minScore = MIN_MATCH_SCORE } = options
  // Nothing is recommended until the PWD has said what they can do and how far they studied.
  if (!canRecommend(user)) return { locked: true, recommendations: [], considered: 0, hidden: 0, restricted: 0 }

  const current = jobs.filter((j) => isOpenAndCurrent(j, now))

  let restricted = 0
  const scored: Recommendation[] = []
  for (const job of current) {
    const rec = scoreJob(user, job, weights)
    if (rec) scored.push(rec)
    else restricted += 1
  }

  const recommendations = scored
    .filter((r) => r.score >= minScore && hasEnoughSkills(r))
    .sort((a, b) => b.score - a.score || b.skills.coverage - a.skills.coverage || a.job.title.localeCompare(b.job.title))

  return {
    locked: false,
    recommendations,
    considered: current.length,
    hidden: scored.length - recommendations.length,
    restricted,
  }
}
