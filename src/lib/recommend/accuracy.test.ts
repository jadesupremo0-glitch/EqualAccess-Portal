import { describe, it, expect } from 'vitest'
import { jobs, pwdUsers } from '../../data'
import { getRecommendations } from './score'
import { computeSkillsFit, skillsMatch } from './skill'
import { areRelatedSkills, canonicalOf, taxonomy } from './taxonomy'
import type { Job, PWDUser } from '../../data'

const NOW = new Date('2026-09-22T04:00:00Z')

// ── Skill vocabulary ───────────────────────────────────────────────

describe('skill vocabulary', () => {
  it('no spelling belongs to two different skills', () => {
    const owner = new Map<string, string>()
    const clashes: string[] = []
    for (const [canonical, variants] of Object.entries(taxonomy.synonyms)) {
      for (const v of [canonical, ...variants]) {
        const key = v.toLowerCase().replace(/[^\p{L}\p{N}+#]+/gu, ' ').trim()
        const seen = owner.get(key)
        if (seen && seen !== canonical) clashes.push(`"${v}" → ${seen} / ${canonical}`)
        owner.set(key, canonical)
      }
    }
    expect(clashes).toEqual([])
  })

  it('every related cluster only names skills that exist', () => {
    const known = new Set(Object.keys(taxonomy.synonyms))
    for (const group of taxonomy.related) for (const skill of group) expect(known.has(skill), skill).toBe(true)
  })

  it('reads different wordings, capitalisation and punctuation as the same skill', () => {
    const same: [string, string][] = [
      ['MS Excel', 'Microsoft Office'],
      ['Advanced Microsoft Excel', 'Microsoft Office'],
      ['data-encoding', 'Data Entry'],
      ['Detail-oriented', 'Attention to Detail'],
      ['Gardening', 'Horticulture'],
      ['Plant Care', 'Horticulture'],
      ['Woodworking', 'Carpentry'],
      ['Pagluluto', 'Cooking'],
      ['Network Troubleshooting', 'IT Support'],
      ['HTML', 'Web Development'],
      ['Graphic Design', 'Design'],
      ['videography', 'Video Editing'],
    ]
    for (const [a, b] of same) expect(skillsMatch(a, b), `${a} ≟ ${b}`).toBe(true)
  })

  it('does not match a skill just because its letters appear inside another word', () => {
    expect(canonicalOf('Excellent listener')).not.toBe('microsoft office')
    expect(skillsMatch('Excellent listener', 'Microsoft Office')).toBe(false)
    expect(skillsMatch('Keyword research', 'Microsoft Office')).toBe(false)
    expect(skillsMatch('Cooking', 'Baking')).toBe(false)
    // an ambiguous fragment stays unresolved instead of guessing
    expect(canonicalOf('editing')).toBe('editing')
  })

  it('knows close relatives, but only gives partial credit for them', () => {
    expect(areRelatedSkills('Typing', 'Data Entry')).toBe(true)
    expect(areRelatedSkills('Baking', 'Cooking')).toBe(true)
    expect(areRelatedSkills('Baking', 'Welding')).toBe(false)
    expect(areRelatedSkills('Data Entry', 'Data Encoding')).toBe(false) // same skill, not "related"

    const applicant = { skills: ['Typing'] } as PWDUser
    const listing = { skills: ['Data Entry', 'Welding'] } as Job
    const fit = computeSkillsFit(applicant, listing)
    expect(fit.matched).toEqual([])
    expect(fit.related).toEqual(['Data Entry'])
    expect(fit.missing).toEqual(['Welding'])
    expect(fit.coverage).toBeCloseTo(0.2, 5) // 0.4 of one skill out of two
  })
})

// ── Labelled evaluation ────────────────────────────────────────────
// Each demo applicant is paired with the listings a PDAO officer would say obviously fit them
// ("relevant") and ones that plainly do not ("irrelevant"). The engine is scored against those
// judgements; a change to weights, thresholds or the vocabulary that hurts them fails the build.

const byId = (id: string) => pwdUsers.find((u) => u.id === id)!

const LABELLED: { who: string; id: string; relevant: string[]; irrelevant: string[] }[] = [
  { who: 'Maria — data entry, office, customer service', id: 'PWD-LB-2024-0042', relevant: ['JOB-001', 'JOB-004', 'JOB-005'], irrelevant: ['JOB-009', 'JOB-010', 'JOB-011', 'JOB-012', 'JOB-013'] },
  { who: 'Juan — administration, typing', id: 'PWD-LB-2024-0043', relevant: ['JOB-001', 'JOB-004'], irrelevant: ['JOB-008', 'JOB-009', 'JOB-010', 'JOB-011', 'JOB-012', 'JOB-013'] },
  { who: 'Ana — writing, design, social media', id: 'PWD-LB-2024-0044', relevant: ['JOB-003', 'JOB-008'], irrelevant: ['JOB-001', 'JOB-005', 'JOB-006', 'JOB-009', 'JOB-010', 'JOB-011', 'JOB-012'] },
  { who: 'Roberto — gardening, carpentry', id: 'PWD-LB-2024-0045', relevant: ['JOB-009', 'JOB-012'], irrelevant: ['JOB-001', 'JOB-002', 'JOB-003', 'JOB-004', 'JOB-005', 'JOB-006', 'JOB-007', 'JOB-008', 'JOB-010', 'JOB-011', 'JOB-013'] },
  { who: 'Liza — cooking, baking, food safety', id: 'PWD-LB-2024-0046', relevant: ['JOB-010', 'JOB-011'], irrelevant: ['JOB-001', 'JOB-002', 'JOB-003', 'JOB-004', 'JOB-005', 'JOB-006', 'JOB-007', 'JOB-008', 'JOB-009', 'JOB-012', 'JOB-013'] },
  { who: 'Felix — photography, video', id: 'PWD-LB-2024-0047', relevant: ['JOB-008', 'JOB-013'], irrelevant: ['JOB-001', 'JOB-004', 'JOB-005', 'JOB-006', 'JOB-007', 'JOB-009', 'JOB-010', 'JOB-011', 'JOB-012'] },
  { who: 'Carmelita — customer service, English', id: 'PWD-LB-2024-0048', relevant: ['JOB-005', 'JOB-006'], irrelevant: ['JOB-009', 'JOB-010', 'JOB-011', 'JOB-012', 'JOB-013'] },
]

describe('recommendation accuracy on labelled applicants', () => {
  for (const c of LABELLED) {
    it(`${c.who}: recommends every fitting job and none of the unrelated ones`, () => {
      const shown = getRecommendations(byId(c.id), jobs, { now: NOW }).recommendations.map((r) => r.job.id)
      expect(c.relevant.filter((id) => !shown.includes(id)), 'fitting jobs that were missed').toEqual([])
      expect(c.irrelevant.filter((id) => shown.includes(id)), 'unrelated jobs that were shown').toEqual([])
    })

    it(`${c.who}: fitting jobs outrank the unrelated ones, and the top pick is well covered`, () => {
      const recs = getRecommendations(byId(c.id), jobs, { now: NOW }).recommendations
      const rank = (id: string) => recs.findIndex((r) => r.job.id === id)
      for (const good of c.relevant) {
        for (const bad of c.irrelevant) {
          if (rank(bad) !== -1) expect(rank(good), `${good} should outrank ${bad}`).toBeLessThan(rank(bad))
        }
      }
      expect(recs[0].skills.coverage).toBeGreaterThanOrEqual(0.5)
    })
  }

  it('overall precision and recall stay at or above 90%', () => {
    let tp = 0
    let fp = 0
    let fn = 0
    for (const c of LABELLED) {
      const shown = getRecommendations(byId(c.id), jobs, { now: NOW }).recommendations.map((r) => r.job.id)
      for (const id of c.relevant) shown.includes(id) ? tp++ : fn++
      for (const id of c.irrelevant) if (shown.includes(id)) fp++
    }
    expect(tp / (tp + fp)).toBeGreaterThanOrEqual(0.9)
    expect(tp / (tp + fn)).toBeGreaterThanOrEqual(0.9)
  })

  it('every demo applicant gets at least one recommendation', () => {
    for (const u of pwdUsers) {
      expect(getRecommendations(u, jobs, { now: NOW }).recommendations.length, u.name).toBeGreaterThan(0)
    }
  })
})
