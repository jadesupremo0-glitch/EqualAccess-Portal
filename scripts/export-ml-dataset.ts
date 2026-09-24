/**
 * Builds the training table for the Decision Tree classifier (ml/train_model.py).
 *
 * One row per (PWD applicant, job listing) pair that the hybrid recommendation engine is able to
 * score (i.e. not disability-restricted, applicant has entered skills + education). Features are
 * the four 0-1 fractions the engine weights — skills 35 / suitability 25 / education 15 / semantic
 * 25 (semantic = TF-IDF + Cosine Similarity, src/lib/recommend/semantic.ts, run for real here, not
 * simulated — location and work-type/arrangement preference are not scored, only used by the Jobs
 * page's location filter); the label is the engine's own recommend/hide decision (score >= 40 and
 * enough skill coverage). The Decision Tree is trained to reproduce that decision so its splits and
 * feature importances show, in ML terms, which variables actually drive a recommendation.
 *
 * Usage: npx tsx scripts/export-ml-dataset.ts [out.csv]
 */
import { writeFileSync } from 'node:fs'
import { pwdUsers, jobs } from '../src/data'
import { scoreJob, isRestrictedAgainst, DEFAULT_WEIGHTS, hasEnoughSkills, MIN_MATCH_SCORE } from '../src/lib/recommend/score'
import { canRecommend } from '../src/lib/recommend/profile'

const outFile = process.argv[2] ?? 'ml/dataset.csv'

const rows: string[] = [
  'pwd_id,job_id,skill_coverage,suitability_fraction,education_fraction,semantic_similarity,disability_listed,label,label_gated,score',
]

for (const u of pwdUsers) {
  if (!canRecommend(u)) continue
  // Same corpus getRecommendations would use: every job this applicant isn't restricted from,
  // so the semantic component's TF-IDF space (and its within-applicant normalization) matches
  // exactly what the live app would compute.
  const candidateJobs = jobs.filter((j) => !isRestrictedAgainst(u, j))
  for (const j of jobs) {
    if (isRestrictedAgainst(u, j)) continue
    const rec = scoreJob(u, j, DEFAULT_WEIGHTS, candidateJobs)!

    const suitabilityFraction = rec.components.suitability / DEFAULT_WEIGHTS.suitability
    const educationFraction = rec.education.fraction

    // label: the weighted-score decision alone (what the four ML features should predict).
    // label_gated: the engine's actual recommend/hide decision, which also applies the hard
    // 40% skill-coverage gate (MIN_SKILL_COVERAGE) — a fixed business rule, not something to learn.
    const label = rec.score >= MIN_MATCH_SCORE ? 1 : 0
    const labelGated = rec.score >= MIN_MATCH_SCORE && hasEnoughSkills(rec) ? 1 : 0

    rows.push(
      [
        u.id,
        j.id,
        rec.skills.coverage.toFixed(4),
        suitabilityFraction.toFixed(4),
        educationFraction.toFixed(4),
        rec.semantic.similarity.toFixed(4),
        rec.disabilityListed ? 1 : 0,
        label,
        labelGated,
        rec.score,
      ].join(','),
    )
  }
}

writeFileSync(outFile, rows.join('\n') + '\n', 'utf-8')
console.log(`Wrote ${outFile} (${rows.length - 1} rows)`)
