import type { Job } from '../../data'

export type ComponentKey = 'skills' | 'suitability' | 'education' | 'location' | 'preference'

/** Points available per component. They add up to 100 by default; override to reweight. */
export type MatchWeights = Record<ComponentKey, number>

export interface SkillFit {
  /** Required skills the PWD has (same skill, any spelling). */
  matched: string[]
  /** Required skills the PWD does not have but has a close relative of (partial credit). */
  related: string[]
  missing: string[]
  /** 0–1 share of required skills the PWD has; a related skill counts as a fraction of one. */
  coverage: number
}

export interface EducationFit {
  fraction: number
  status: 'No requirement' | 'Met' | 'Nearly met' | 'Not met' | 'Unknown'
  note: string
}

export interface AccommodationFit {
  /** False when the PWD stated no accommodation needs. */
  applicable: boolean
  needs: string[]
  met: string[]
  unmet: string[]
  fraction: number
}

export interface LocationFit {
  fraction: number
  level: 'remote' | 'barangay' | 'municipality' | 'province' | 'far'
  note: string
}

export interface MatchReason {
  label: string
  /** positive = a reason it matches; caution = something to check before pursuing it. */
  tone: 'positive' | 'caution'
}

export type MatchBand = 'Excellent' | 'Good' | 'Fair'

export interface Recommendation {
  job: Job
  /** Whole-number match percentage, 0–100. */
  score: number
  band: MatchBand
  /** Points earned per component (may be fractional). */
  components: Record<ComponentKey, number>
  skills: SkillFit
  education: EducationFit
  accommodation: AccommodationFit
  location: LocationFit
  /** True when the employer lists this PWD's disability type as suitable. */
  disabilityListed: boolean
  reasons: MatchReason[]
}

export interface RecommendationResult {
  /** True while the PWD has not yet entered their skills and education; nothing is recommended until they do. */
  locked: boolean
  recommendations: Recommendation[]
  /** Open, non-expired listings considered. */
  considered: number
  /** Listings hidden as weak matches: under the minimum score, or sharing none of the required skills. */
  hidden: number
  /** Listings the employer explicitly restricted to other disability types. */
  restricted: number
}

export function bandForScore(score: number): MatchBand {
  if (score >= 75) return 'Excellent'
  if (score >= 60) return 'Good'
  return 'Fair'
}
