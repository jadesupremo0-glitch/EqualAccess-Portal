import type { Job } from '../../data'

export type ScoreBand = 'Excellent' | 'Good' | 'Fair' | 'Weak'

export type QualificationStatus = 'Met' | 'Partly met' | 'Not met'

export type AccessibilityFit =
  | 'Not assessed'
  | 'Compatible'
  | 'Compatible with accommodation'
  | 'Needs confirmation'
  | 'Not compatible'

export interface ScoreBreakdown {
  skills: number
  capabilities: number
  family: number
  qualifications: number
  experience: number
  accessibilityAdjustment: number
}

export interface SkillFit {
  matched: string[]
  missing: string[]
  coverage: number
}

export interface FamilyFit {
  jobFamily: string | null
  preferredFamilies: string[]
  matchLevel: 'exact' | 'family' | 'none'
}

export interface QualificationFit {
  status: QualificationStatus
  note: string
}

export interface AccessibilityFitResult {
  fit: AccessibilityFit
  adjustment: number
  note: string
  questionsToConfirm: string[]
  needsAssessed: boolean
}

/** Public record produced for each recommended job. */
export interface JobRecommendation {
  job: Job
  /** Other postings merged into this one (duplicate title + content). */
  duplicateJobIds: string[]
  score: number
  band: ScoreBand
  components: ScoreBreakdown
  skills: SkillFit
  family: FamilyFit
  qualification: QualificationFit
  accessibility: AccessibilityFitResult
}

export interface RecommendationResult {
  recommendations: JobRecommendation[]
  /** True when the best available score is below 50 — no strong match exists. */
  weakMatch: boolean
  /** Skills missing across the top recommendations (only populated when weakMatch). */
  suggestedImprovements: string[]
  /** Count of postings excluded because they directly conflict with stated needs. */
  excludedCount: number
}

export function bandForScore(score: number): ScoreBand {
  if (score >= 85) return 'Excellent'
  if (score >= 70) return 'Good'
  if (score >= 50) return 'Fair'
  return 'Weak'
}

