import { computeSkillsFit } from './skill'
import { computeCapabilityFit } from './capabilities'
import { computeFamilyFit } from './family'
import { computeQualificationFit } from './education'
import { computeExperienceFit } from './experience'
import { computeAccessibilityFit } from './accessibility'
import { normalizePhrase } from './taxonomy'
import { bandForScore, type JobRecommendation, type RecommendationResult } from './types'
import type { PWDUser, Job } from '../../data'

const CLOSED_STATUS = new Set(['Closed', 'Inactive'])

function activeJobs(jobs: Job[]): Job[] {
  return jobs.filter((j) => (j.status ? !CLOSED_STATUS.has(j.status) : true))
}

/** Serialize a posting for duplicate detection (title + content). */
function contentKey(job: Job): string {
  return normalizePhrase(`${job.title} | ${job.description ?? ''}`)
}

function locationMatch(user: PWDUser, job: Job): boolean {
  const pref = user.preferredLocation ?? ''
  if (!pref.trim()) return false
  const prefWords = new Set(pref.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length >= 3))
  const jobWords = new Set(job.location.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length >= 3))
  for (const w of prefWords) if (jobWords.has(w)) return true
  return false
}

function jobIdRank(job: Job): number {
  const m = job.id.match(/(\d+)$/)
  return m ? parseInt(m[1], 10) : 0
}

const FAMILY_LEVEL_VALUE: Record<JobRecommendation['family']['matchLevel'], number> = {
  exact: 2,
  family: 1,
  none: 0,
}

/** Score a single job into a recommendation, or null when it conflicts with stated needs. */
export function scoreJob(user: PWDUser, job: Job): JobRecommendation | null {
  const accessibility = computeAccessibilityFit(user, job)
  if (accessibility.fit.fit === 'Not compatible') return null

  const skills = computeSkillsFit(user, job)
  const capabilities = computeCapabilityFit(user, job)
  const family = computeFamilyFit(user, job)
  const qualification = computeQualificationFit(user, job)
  const experience = computeExperienceFit(user, job)

  const raw =
    skills.component + capabilities + family.component + qualification.component + experience + accessibility.fit.adjustment
  const score = Math.max(0, Math.min(100, Math.round(raw * 10) / 10))

  return {
    job,
    duplicateJobIds: [],
    score,
    band: bandForScore(score),
    components: {
      skills: skills.component,
      capabilities,
      family: family.component,
      qualifications: qualification.component,
      experience,
      accessibilityAdjustment: accessibility.fit.adjustment,
    },
    skills: skills.fit,
    family: family.fit,
    qualification: qualification.fit,
    accessibility: accessibility.fit,
  }
}

/** Full hybrid recommendation pipeline: filter → score → dedup → rank → flag. */
export function getRecommendations(user: PWDUser, allJobs: Job[]): RecommendationResult {
  let excludedCount = 0
  const scored: JobRecommendation[] = []
  for (const job of activeJobs(allJobs)) {
    const rec = scoreJob(user, job)
    if (!rec) {
      excludedCount += 1
      continue
    }
    scored.push(rec)
  }

  // Merge duplicate postings (same title + content, different Job_ID).
  const byContent = new Map<string, JobRecommendation>()
  for (const rec of scored.sort((a, b) => b.score - a.score)) {
    const key = contentKey(rec.job)
    const existing = byContent.get(key)
    if (existing) {
      existing.duplicateJobIds = [...existing.duplicateJobIds, rec.job.id].sort()
    } else {
      byContent.set(key, rec)
    }
  }

  // Enforce unique titles — keep the highest-scoring posting per title.
  const byTitle = new Map<string, JobRecommendation>()
  for (const rec of Array.from(byContent.values()).sort((a, b) => b.score - a.score)) {
    const titleKey = normalizePhrase(rec.job.title)
    if (!byTitle.has(titleKey)) byTitle.set(titleKey, rec)
  }

  const recommendations = Array.from(byTitle.values()).sort((a, b) => compareRecommendations(user, a, b))

  const best = recommendations[0]
  const weakMatch = !best || best.score < 50

  const improvementsSet = new Set<string>()
  for (const rec of recommendations.slice(0, 5)) {
    for (const skill of rec.skills.missing) improvementsSet.add(skill)
  }

  return {
    recommendations,
    weakMatch,
    suggestedImprovements: Array.from(improvementsSet),
    excludedCount,
  }
}

function compareRecommendations(user: PWDUser, a: JobRecommendation, b: JobRecommendation): number {
  if (a.score !== b.score) return b.score - a.score
  if (a.skills.coverage !== b.skills.coverage) return b.skills.coverage - a.skills.coverage
  const famDiff = FAMILY_LEVEL_VALUE[b.family.matchLevel] - FAMILY_LEVEL_VALUE[a.family.matchLevel]
  if (famDiff !== 0) return famDiff
  const locDiff = Number(locationMatch(user, b.job)) - Number(locationMatch(user, a.job))
  if (locDiff !== 0) return locDiff
  return jobIdRank(a.job) - jobIdRank(b.job)
}