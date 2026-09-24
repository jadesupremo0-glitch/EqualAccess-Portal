import { describe, it, expect } from 'vitest'
import type { PWDUser, Job } from '../../data'
import { getRecommendations, scoreJob, isOpenAndCurrent, DEFAULT_WEIGHTS, MIN_MATCH_SCORE } from './score'
import { canRecommend, profileGaps, requiredGaps } from './profile'
import { canonicalAccommodations } from './accommodations'

// ── Fixtures ───────────────────────────────────────────────────────
const NOW = new Date('2026-09-22T04:00:00Z') // 12:00 in Asia/Manila

const baseUser: PWDUser = {
  id: 'PWD-1',
  username: 'tester',
  password: 'pwd123',
  name: 'Test Applicant',
  address: 'Test St.',
  barangay: 'Brgy. Malinta',
  contact: '+63 900 000 0000',
  email: 'tester@example.com',
  disabilityType: 'Physical Disability',
  verificationStatus: 'Verified',
  dateRegistered: '2026-01-01',
  pwdIdNumber: 'LB-TST-2026-00001',
}

const baseJob: Job = {
  id: 'JOB-900',
  title: 'Generic Job',
  company: 'ACME Corp',
  description: 'A job.',
  location: 'Los Baños, Laguna',
  employmentType: 'Full-time',
  workArrangement: 'On-site',
  skills: ['Data Entry'],
  minEducation: '',
  suitableDisabilities: [],
  accommodations: [],
  slots: 1,
  deadline: '2026-12-31',
  postedDate: '2026-06-01',
  status: 'Open',
}

const user = (o: Partial<PWDUser> = {}): PWDUser => ({ ...baseUser, ...o })
const job = (o: Partial<Job> = {}): Job => ({ ...baseJob, ...o })

const maria = user({
  disabilityType: 'Visual Disability',
  skills: ['Data Entry', 'Microsoft Office', 'Computer Literacy', 'Customer Service'],
  educationLevel: 'College Graduate',
  workExperience: 'IT intern',
  preferredJobTypes: ['Full-time'],
  preferredWorkSetup: ['On-site', 'Remote'],
  accommodationRequirements: ['Screen-reader-compatible tools'],
})

describe('weights', () => {
  it('default weights are 35 / 25 / 15 / 25 and add up to 100', () => {
    expect(DEFAULT_WEIGHTS).toEqual({ skills: 35, suitability: 25, education: 15, semantic: 25 })
    expect(Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100)
  })

  it('scores stay within 0–100 and the perfect case reaches 100', () => {
    const perfect = scoreJob(
      // Same text on both sides (skills + education vs. title + skills, no description) makes the
      // semantic component's cosine similarity exactly 1, alongside full skills/suitability/education.
      user({ ...maria, disabilityType: 'Visual Disability', skills: ['Data Entry'], education: 'Data Entry', workExperience: '' }),
      job({
        title: 'Data Entry',
        skills: ['Data Entry'],
        description: '',
        suitableDisabilities: ['Visual Disability'],
        accommodations: ['Screen-reader-compatible tools'],
        minEducation: 'Vocational',
      }),
    )!
    expect(perfect.score).toBe(100)
  })

  it('can be reweighted', () => {
    const skillsOnly = { skills: 100, suitability: 0, education: 0, semantic: 0 }
    const rec = scoreJob(maria, job({ skills: ['Data Entry', 'Welding'] }), skillsOnly)!
    expect(rec.score).toBe(50)
  })
})

describe('skills match (35)', () => {
  it('is synonym-aware and reports matched vs missing skills', () => {
    const rec = scoreJob(
      user({ skills: ['MS Office', 'Data Encoding'] }),
      job({ skills: ['Microsoft Office', 'Data Entry', 'Welding'] }),
    )!
    expect(rec.skills.matched).toEqual(['Microsoft Office', 'Data Entry'])
    expect(rec.skills.missing).toEqual(['Welding'])
    expect(rec.components.skills).toBeCloseTo((35 * 2) / 3, 5)
  })
})

describe('disability suitability & accommodations (25)', () => {
  it('never hides a job because of disability type when the listing is open to all', () => {
    for (const disabilityType of ['Physical Disability', 'Visual Disability', 'Deaf or Hard of Hearing', 'Rare Disease (RA 10747)', 'Speech & Language Impairment'] as const) {
      const rec = scoreJob(user({ disabilityType, skills: ['Data Entry'] }), job())
      expect(rec).not.toBeNull()
    }
  })

  it('excludes a job only when the employer explicitly restricted the listing to other types', () => {
    const restricted = job({ suitableDisabilities: ['Visual Disability'] })
    expect(scoreJob(user({ disabilityType: 'Physical Disability' }), restricted)).toBeNull()
    expect(scoreJob(user({ disabilityType: 'Visual Disability' }), restricted)).not.toBeNull()
  })

  it('treats an explicit suitable-disability listing as a positive signal', () => {
    const openToAll = scoreJob(user({ disabilityType: 'Visual Disability' }), job())!
    const listed = scoreJob(user({ disabilityType: 'Visual Disability' }), job({ suitableDisabilities: ['Visual Disability'] }))!
    expect(listed.components.suitability).toBeGreaterThan(openToAll.components.suitability)
    expect(listed.reasons.map((r) => r.label)).toContain('Employer welcomes your disability type')
  })

  it('rewards matching accommodations and flags unmet needs without hiding the job', () => {
    const needy = user({ accommodationRequirements: ['Wheelchair-accessible workplace', 'Sign-language interpreter'] })
    const met = scoreJob(needy, job({ accommodations: ['Wheelchair-accessible workplace', 'Sign-language interpreter'] }))!
    const partial = scoreJob(needy, job({ accommodations: ['Wheelchair-accessible workplace'] }))!
    const none = scoreJob(needy, job({ accommodations: [] }))!
    expect(met.components.suitability).toBeGreaterThan(partial.components.suitability)
    expect(partial.components.suitability).toBeGreaterThan(none.components.suitability)
    expect(none).not.toBeNull()
    expect(partial.reasons.some((r) => r.tone === 'caution' && r.label.includes('Sign-language interpreter'))).toBe(true)
    expect(met.reasons.map((r) => r.label)).toContain('Wheelchair accessible')
  })

  it('does not require workplace access for a fully remote job', () => {
    const rec = scoreJob(
      user({ accommodationRequirements: ['Wheelchair-accessible workplace'] }),
      job({ workArrangement: 'Remote', accommodations: [] }),
    )!
    expect(rec.accommodation.unmet).toEqual([])
  })

  it('reads legacy free-text needs and offers', () => {
    expect(canonicalAccommodations(['Accessible entrance', 'Screen reader software', 'Flexible schedule'])).toEqual([
      'Wheelchair-accessible workplace',
      'Screen-reader-compatible tools',
      'Flexible hours',
    ])
  })
})

describe('education fit (15)', () => {
  it('meets or exceeds the minimum → full marks; each level below costs points but never excludes', () => {
    const j = job({ minEducation: 'College Graduate' })
    const grad = scoreJob(user({ educationLevel: 'College Graduate' }), j)!
    const level = scoreJob(user({ educationLevel: 'College Level' }), j)!
    const hs = scoreJob(user({ educationLevel: 'High School Graduate' }), j)!
    expect(grad.components.education).toBe(15)
    expect(level.components.education).toBeCloseTo(9, 5)
    expect(hs.components.education).toBeLessThan(level.components.education)
    expect(hs.components.education).toBeGreaterThan(0)
  })

  it('infers a level from free-text education when no explicit level is set', () => {
    const rec = scoreJob(user({ education: 'Bachelor of Science in Information Technology' }), job({ minEducation: 'College Graduate' }))!
    expect(rec.education.status).toBe('Met')
  })
})

describe('semantic fit (25)', () => {
  it('scores free-text similarity via TF-IDF + cosine similarity, higher for a matching background', () => {
    const dataEntryJob = job({ id: 'JOB-DE', title: 'Data Entry Clerk', skills: ['Data Entry'], description: 'Encoding documents and organizing office files.' })
    const landscapingJob = job({ id: 'JOB-LS', title: 'Landscaping Helper', skills: ['Horticulture'], description: 'Gardening and maintaining outdoor grounds.' })
    const applicant = user({ skills: ['Data Entry'], workExperience: 'Encoded records and organized office files' })
    const relevant = scoreJob(applicant, dataEntryJob, DEFAULT_WEIGHTS, [dataEntryJob, landscapingJob])!
    const unrelated = scoreJob(applicant, landscapingJob, DEFAULT_WEIGHTS, [dataEntryJob, landscapingJob])!
    expect(relevant.components.semantic).toBeGreaterThan(unrelated.components.semantic)
    expect(relevant.semantic.sharedTerms.length).toBeGreaterThan(0)
  })

  it('adds a "similar background" reason when the semantic similarity is strong', () => {
    const j = job({ title: 'Data Entry Clerk', skills: ['Data Entry'], description: 'Encoding documents.' })
    const rec = scoreJob(user({ skills: ['Data Entry'], workExperience: 'Encoding documents' }), j)!
    expect(rec.reasons.some((r) => r.label.startsWith('Similar background:'))).toBe(true)
  })
})

describe('location proximity (filter only — not scored)', () => {
  it('ranks same barangay > Los Baños > elsewhere in Laguna > far / remote is a full pass, for the location filter', () => {
    const u = user({ barangay: 'Brgy. Malinta' })
    const same = scoreJob(u, job({ location: 'Brgy. Malinta' }))!
    const town = scoreJob(u, job({ location: 'Los Baños, Laguna' }))!
    const otherBrgy = scoreJob(u, job({ location: 'Brgy. Anos' }))!
    const province = scoreJob(u, job({ location: 'Bay, Laguna' }))!
    const far = scoreJob(u, job({ location: 'Quezon City' }))!
    const remote = scoreJob(u, job({ location: 'Quezon City', workArrangement: 'Remote' }))!
    expect(same.location.level).toBe('barangay')
    expect(same.location.fraction).toBeGreaterThan(town.location.fraction)
    expect(town.location.level).toBe('municipality')
    expect(town.location.fraction).toBe(otherBrgy.location.fraction)
    expect(town.location.fraction).toBeGreaterThan(province.location.fraction)
    expect(province.location.fraction).toBeGreaterThan(far.location.fraction)
    expect(remote.location.level).toBe('remote')
  })

  it('never affects the match score, since it only drives the location filter', () => {
    const u = user({ barangay: 'Brgy. Malinta' })
    const near = scoreJob(u, job({ location: 'Brgy. Malinta' }))!
    const far = scoreJob(u, job({ location: 'Quezon City' }))!
    expect(near.score).toBe(far.score)
  })
})

describe('work arrangement / employment type preference (removed — not scored)', () => {
  it('preferredJobTypes and preferredWorkSetup never affect the score', () => {
    const match = scoreJob(user({ preferredJobTypes: ['Full-time'], preferredWorkSetup: ['On-site'] }), job())!
    const neutral = scoreJob(user(), job())!
    const mismatch = scoreJob(user({ preferredJobTypes: ['Freelance'], preferredWorkSetup: ['Remote'] }), job())!
    expect(match.score).toBe(neutral.score)
    expect(neutral.score).toBe(mismatch.score)
  })
})

describe('getRecommendations', () => {
  const jobs = [
    job({ id: 'JOB-A', title: 'Data Entry Clerk', skills: ['Data Entry', 'Microsoft Office'], accommodations: ['Screen-reader-compatible tools'] }),
    job({ id: 'JOB-B', title: 'Welder', skills: ['Welding', 'Metal Fabrication'], employmentType: 'Freelance', workArrangement: 'Hybrid', location: 'Quezon City', minEducation: 'Post Graduate' }),
    job({ id: 'JOB-C', title: 'Draft Job', status: 'Draft' }),
    job({ id: 'JOB-D', title: 'Closed Job', status: 'Closed' }),
    job({ id: 'JOB-E', title: 'Archived Job', status: 'Archived' }),
    job({ id: 'JOB-F', title: 'Expired Job', deadline: '2026-09-21' }),
    job({ id: 'JOB-G', title: 'Deadline Today', deadline: '2026-09-22' }),
    job({ id: 'JOB-H', title: 'Restricted Job', suitableDisabilities: ['Deaf or Hard of Hearing'] }),
  ]

  it('only considers open, non-expired listings', () => {
    const open = jobs.filter((j) => isOpenAndCurrent(j, NOW)).map((j) => j.id)
    expect(open).toEqual(['JOB-A', 'JOB-B', 'JOB-G', 'JOB-H'])
  })

  it('sorts by score, hides those under the threshold, and counts what it hid', () => {
    const res = getRecommendations(maria, jobs, { now: NOW })
    expect(res.considered).toBe(4)
    expect(res.restricted).toBe(1)
    const scores = res.recommendations.map((r) => r.score)
    expect(scores).toEqual([...scores].sort((a, b) => b - a))
    expect(res.recommendations.every((r) => r.score >= MIN_MATCH_SCORE)).toBe(true)
    expect(res.recommendations[0].job.id).toBe('JOB-A')
    expect(res.recommendations.find((r) => r.job.id === 'JOB-B')).toBeUndefined()
    expect(res.hidden).toBeGreaterThanOrEqual(1)
  })

  it('needs at least one matching required skill, so a profile with unrelated skills is not "matched" to everything', () => {
    const unrelated = getRecommendations(user({ skills: ['Piloting'], educationLevel: 'College Graduate' }), jobs, { now: NOW })
    expect(unrelated.locked).toBe(false)
    expect(unrelated.recommendations).toEqual([])
    expect(unrelated.hidden).toBeGreaterThan(0)
    // …but a listing that asks for no particular skills stays eligible for anyone.
    const anyone = getRecommendations(user({ skills: ['Piloting'], educationLevel: 'College Graduate' }), [job({ id: 'JOB-Z', skills: [] })], { now: NOW })
    expect(anyone.recommendations.map((r) => r.job.id)).toEqual(['JOB-Z'])
  })

  it('recommends nothing until skills AND education have been entered', () => {
    const none = getRecommendations(user(), jobs, { now: NOW })
    const skillsOnly = getRecommendations(user({ skills: ['Data Entry'] }), jobs, { now: NOW })
    const educationOnly = getRecommendations(user({ educationLevel: 'College Graduate' }), jobs, { now: NOW })
    for (const res of [none, skillsOnly, educationOnly]) {
      expect(res.locked).toBe(true)
      expect(res.recommendations).toEqual([])
    }
    expect(getRecommendations(user({ skills: ['Data Entry'], educationLevel: 'College Graduate' }), jobs, { now: NOW }).locked).toBe(false)
    // a course name is enough to infer the level
    expect(canRecommend(user({ skills: ['Data Entry'], education: 'Bachelor of Science in Accountancy' }))).toBe(true)
    // blank or whitespace-only skills do not count
    expect(canRecommend(user({ skills: ['  '], educationLevel: 'College Graduate' }))).toBe(false)
    expect(requiredGaps(user()).map((g) => g.field)).toEqual(['skills', 'educationLevel'])
  })

  it('recomputes when the profile changes', () => {
    const before = getRecommendations(user({ skills: [] }), jobs, { now: NOW })
    expect(before.locked).toBe(true)
    const after = getRecommendations(user({ skills: ['Data Entry', 'Microsoft Office'], educationLevel: 'College Graduate' }), jobs, { now: NOW })
    expect(after.recommendations.length).toBeGreaterThanOrEqual(before.recommendations.length)
    expect(after.recommendations[0].score).toBeGreaterThan(before.recommendations[0]?.score ?? 0)
  })

  it('gives "why this match" reasons for a strong match', () => {
    const rec = getRecommendations(maria, jobs, { now: NOW }).recommendations[0]
    const labels = rec.reasons.map((r) => r.label)
    expect(labels.some((l) => l.startsWith('Skills:'))).toBe(true)
    expect(labels).toContain('Screen-reader compatible')
  })

  it('returns an empty list, not an error, when nothing matches', () => {
    const res = getRecommendations(user({ skills: ['Welding'], educationLevel: 'College Graduate', preferredJobTypes: ['Freelance'] }), [jobs[1], jobs[0]].map((j) => ({ ...j, skills: ['Piloting'], location: 'Cebu', minEducation: 'Post Graduate' })), { now: NOW })
    expect(res.recommendations).toEqual([])
  })
})

describe('profile completeness', () => {
  it('lists the missing fields that drive matching, never accommodation needs', () => {
    const gaps = profileGaps(user()).map((g) => g.field)
    expect(gaps).toEqual(['skills', 'educationLevel', 'workExperience', 'preferredJobTypes', 'preferredWorkSetup'])
    expect(profileGaps(maria)).toEqual([])
  })
})
