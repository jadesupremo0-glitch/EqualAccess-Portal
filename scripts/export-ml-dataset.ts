/**
 * Builds the training table for the Decision Tree classifier (ml/train_model.py).
 *
 * One row per (PWD applicant, job listing) pair that the rule-based recommendation
 * engine is able to score (i.e. not disability-restricted, applicant has entered
 * skills + education). Features are the same five 0-1 fractions the rule engine
 * weights (skills 35 / suitability 25 / education 15 / location 15 / preference 10);
 * the label is the engine's own recommend/hide decision (score >= 40 and enough
 * skill coverage). The Decision Tree is trained to reproduce that decision so its
 * splits and feature importances show, in ML terms, which variables actually drive
 * a recommendation.
 *
 * Usage: npx tsx scripts/export-ml-dataset.ts [out.csv]
 */
import { writeFileSync } from 'node:fs'
import { pwdUsers, jobs } from '../src/data'
import { scoreJob, isRestrictedAgainst, DEFAULT_WEIGHTS, hasEnoughSkills, MIN_MATCH_SCORE } from '../src/lib/recommend/score'
import { canRecommend } from '../src/lib/recommend/profile'

const outFile = process.argv[2] ?? 'ml/dataset.csv'

const rows: string[] = [
  'pwd_id,job_id,skill_coverage,suitability_fraction,education_fraction,location_fraction,preference_fraction,disability_listed,label,label_gated,score',
]

for (const u of pwdUsers) {
  if (!canRecommend(u)) continue
  for (const j of jobs) {
    if (isRestrictedAgainst(u, j)) continue
    const rec = scoreJob(u, j, DEFAULT_WEIGHTS)!

    const suitabilityFraction = rec.components.suitability / DEFAULT_WEIGHTS.suitability
    const educationFraction = rec.education.fraction
    const locationFraction = rec.location.fraction
    const preferenceFraction = rec.components.preference / DEFAULT_WEIGHTS.preference

    // label: the weighted-score decision alone (what the five ML features should predict).
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
        locationFraction.toFixed(4),
        preferenceFraction.toFixed(4),
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
