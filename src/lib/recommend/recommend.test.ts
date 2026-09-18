import { describe, it, expect } from 'vitest'
import type { PWDUser, Job } from '../../data'
import { getRecommendations, scoreJob } from './score'
import { bandForScore } from './types'

// ── Fixtures ───────────────────────────────────────────────────────
const baseUser: PWDUser = {
  id: 'USR-001',
  username: 'tester',
  password: 'pwd123',
  name: 'Test Applicant',
  address: 'Test St.',
  barangay: 'Brgy. San Isidro',
  contact: '+63 900 000 0000',
  email: 'tester@example.com',
  disabilityType: 'Other',
  verificationStatus: 'Verified',
  dateRegistered: '2026-01-01',
  pwdIdNumber: 'LB-TST-2026-00001',
}

const baseJob: Job = {
  id: 'JOB-900',
  title: 'Generic Job',
  company: 'ACME Corp',
  location: 'Los Baños, Laguna',
  type: 'Full-time',
  accessibilityInfo: 'PWD-friendly workplace.',
  skills: ['Data Entry'],
  postedDate: '2026-01-01',
  deadline: '2026-12-31',
  status: 'Active',
}

const user = (o: Partial<PWDUser>): PWDUser => ({ ...baseUser, ...o })
const job = (o: Partial<Job>): Job => ({ ...baseJob, ...o })

// Designer profile with strong Office/Admin-fit credentials.
const maria = user({
  skills: ['Data Entry', 'Microsoft Office', 'Computer Literacy', 'Communication', 'Customer Service'],
  education: 'Bachelor of Science in Information Technology',
  workExperience: 'Computer Technician Intern at a local IT services shop',
  yearsOfExperience: 1,
  jobInterests: ['Data Entry', 'IT Support', 'Administrative Assistant'],
  preferredWorkSetup: ['Office', 'Remote'],
  preferredLocation: 'Los Baños, Laguna',
  functionalCapabilities: [
    'Computer-based tasks',
    'Seated work',
    'Verbal communication',
    'Use standard computer applications',
    'Read with assistive technology',
  ],
  accessibilityNeeds: ['Accessible entrance', 'Screen reader compatible software'],
  accommodationRequirements: ['Screen reader software', 'High contrast display settings'],
})

const jobOfficeAdmin = job({
  id: 'JOB-004',
  title: 'Office Administrative Assistant',
  company: 'IRRI Human Resources',
  location: 'Los Baños, Laguna',
  category: 'Administrative',
  workSetup: 'Hybrid',
  description:
    'Provides administrative support including scheduling, document preparation, records management, and staff coordination for the HR office.',
  skills: ['Administration', 'Microsoft Office', 'Computer Literacy', 'Customer Service'],
  educationRequirement: 'College Graduate',
  experienceRequirement: '1 year',
  functionalRequirements: ['Computer-based tasks', 'Seated work', 'Verbal communication'],
  accessibilityFeatures: ['Wheelchair accessible entrance', 'Accessible restroom', 'Elevator access', 'Accessible workstations'],
  accommodationSupport: 'Yes',
})

describe('skill normalization & synonym-aware coverage', () => {
  it('matches a clear, direct fit into the Good/Excellent band', () => {
    const rec = scoreJob(maria, jobOfficeAdmin)!
    expect(rec).not.toBeNull()
    expect(rec.score).toBeGreaterThanOrEqual(70)
    expect(rec.skills.matched).toContain('Microsoft Office')
    expect(rec.skills.matched).toContain('Customer Service')
    expect(rec.skills.missing).toContain('Administration')
  })

  it('merges synonyms: MS Office / Basic Computer Skills / Customer Support = same skills', () => {
    const rec = scoreJob(
      user({
        skills: ['MS Office', 'Basic Computer Skills', 'Customer Support', 'Data Encoding'],
        education: 'Senior High School Graduate',
        jobInterests: ['Office Clerk'],
        functionalCapabilities: ['Computer-based tasks', 'Seated work', 'Data encoding'],
      }),
      job({
        id: 'JOB-001',
        title: 'Data Entry Assistant',
        category: 'Administrative',
        description: 'Assists the municipal records section with encoding, organizing, and maintaining digital records.',
        skills: ['Data Entry', 'Microsoft Office', 'Computer Literacy', 'Customer Service'],
        educationRequirement: 'College Graduate or Vocational',
        experienceRequirement: '0\u20131 year',
        functionalRequirements: ['Computer-based tasks', 'Seated work', 'Data encoding'],
        accessibilityFeatures: ['Wheelchair ramp access', 'Accessible restroom'],
        accommodationSupport: 'Available upon request',
      }),
    )!
    expect(rec.skills.coverage).toBe(1)
    expect(rec.skills.missing).toHaveLength(0)
    expect(rec.score).toBeGreaterThanOrEqual(50)
  })

  it('does not over-match: unrelated extra skills stay neutral', () => {
    const itApplicant = user({
      skills: ['Computer Literacy', 'HTML', 'CSS', 'Network Troubleshooting'],
      jobInterests: ['IT Support'],
    })
    const withCooking = scoreJob(
      user({ ...itApplicant, skills: ['Computer Literacy', 'HTML', 'CSS', 'Network Troubleshooting', 'Cooking'] }),
      job({ id: 'JOB-002', title: 'IT Support Staff', category: 'Technology', skills: ['Computer Literacy', 'HTML', 'CSS'] }),
    )!
    const withoutCooking = scoreJob(itApplicant, job({ id: 'JOB-002', title: 'IT Support Staff', category: 'Technology', skills: ['Computer Literacy', 'HTML', 'CSS'] }))!
    expect(withCooking.score).toBe(withoutCooking.score)
  })
})

describe('field-weighted scoring', () => {
  it('mismatched skills score far below matched skills for the same job', () => {
    const strong = scoreJob(
      user({ skills: ['Computer Literacy', 'HTML', 'CSS', 'Network Troubleshooting', 'Microsoft Office'], jobInterests: ['IT Support'] }),
      job({ id: 'JOB-002', title: 'IT Support Staff', category: 'Technology', skills: ['Computer Literacy', 'HTML', 'CSS', 'Network Troubleshooting', 'Microsoft Office'] }),
    )!
    const weak = scoreJob(
      user({ skills: ['Cooking', 'Baking', 'Food Processing'], jobInterests: ['Kitchen Staff'], functionalCapabilities: ['Standing work for short periods'] }),
      job({ id: 'JOB-002', title: 'IT Support Staff', category: 'Technology', skills: ['Computer Literacy', 'HTML', 'CSS', 'Network Troubleshooting', 'Microsoft Office'] }),
    )!
    expect(strong.score).toBeGreaterThan(weak.score + 30)
    expect(weak.skills.missing).toContain('HTML')
  })

  it('reports qualification status Met / Partly met / Not met', () => {
    const met = scoreJob(maria, jobOfficeAdmin)!
    expect(met.qualification.status).toBe('Met')

    const partly = scoreJob(
      user({ education: 'Vocational — Computer Servicing', skills: ['Microsoft Office', 'Computer Literacy'] }),
      job({ id: 'JOB-001', title: 'Data Entry Assistant', category: 'Administrative', skills: ['Microsoft Office'], educationRequirement: 'College level' }),
    )!
    expect(partly.qualification.status).toBe('Partly met')
  })

  it('experience is a boost, never a hard filter, for entry-level roles', () => {
    const freshIdo = scoreJob(
      user({ workExperience: 'Intern at a records office', yearsOfExperience: 0, skills: ['Data Entry', 'Microsoft Office'] }),
      job({ id: 'JOB-001', title: 'Data Entry Assistant', category: 'Administrative', skills: ['Data Entry', 'Microsoft Office'], experienceRequirement: '0\u20131 year' }),
    )!
    expect(freshIdo.components.experience).toBe(10)
    expect(freshIdo.score).toBeGreaterThanOrEqual(50)
  })
})

describe('job-family alignment', () => {
  it('boosts same-family matches and prefers exact preferred-job title matches', () => {
    const exact = scoreJob(
      user({ jobInterests: ['Administrative Assistant'], skills: ['Microsoft Office'] }),
      job({ id: 'JOB-004', title: 'Office Administrative Assistant', category: 'Administrative', skills: ['Microsoft Office'] }),
    )!
    const sameFamily = scoreJob(
      user({ jobInterests: ['Office Clerk'], skills: ['Microsoft Office'] }),
      job({ id: 'JOB-004', title: 'Office Administrative Assistant', category: 'Administrative', skills: ['Microsoft Office'] }),
    )!
    const differentFamily = scoreJob(
      user({ jobInterests: ['Call Center Agent'], skills: ['Microsoft Office'] }),
      job({ id: 'JOB-004', title: 'Office Administrative Assistant', category: 'Administrative', skills: ['Microsoft Office'] }),
    )!
    expect(exact.components.family).toBe(15)
    expect(sameFamily.components.family).toBe(9)
    expect(differentFamily.components.family).toBe(2.25)
  })
})

describe('accessibility-fit layer', () => {
  it('skips entirely ("Not assessed") when no accessibility fields are volunteered', () => {
    const rec = scoreJob(
      user({ skills: ['Microsoft Office'], preferredWorkSetup: ['Office'] }),
      job({ id: 'JOB-001', title: 'Data Entry Assistant', skills: ['Microsoft Office'] }),
    )!
    expect(rec.accessibility.fit).toBe('Not assessed')
    expect(rec.accessibility.adjustment).toBe(0)
    expect(rec.accessibility.needsAssessed).toBe(false)
  })

  it('excludes jobs that explicitly conflict with a stated need', () => {
    const result = getRecommendations(
      user({
        skills: ['Microsoft Office', 'Data Entry'],
        accessibilityNeeds: ['Wheelchair accessible entrance', 'Accessible restroom'],
      }),
      [
        job({
          id: 'JOB-100',
          title: 'Warehouse Assistant',
          skills: ['Microsoft Office'],
          physicalRequirements: ['Heavy lifting', 'Standing for long periods', 'Climbing stairs'],
          accessibilityFeatures: [],
          accommodationSupport: 'None',
        }),
      ],
    )
    expect(result.recommendations).toHaveLength(0)
    expect(result.excludedCount).toBe(1)
  })

  it('defaults to "Needs confirmation" (adjustment -8) when the job data is silent, never "Not compatible"', () => {
    const rec = scoreJob(
      user({
        skills: ['Microsoft Office'],
        accessibilityNeeds: ['Screen reader compatible software'],
      }),
      job({
        id: 'JOB-200',
        title: 'Admin Clerk',
        skills: ['Microsoft Office'],
        description: 'Performs general clerical duties.',
        accessibilityFeatures: [],
        accommodationSupport: '',
      }),
    )!
    expect(rec.accessibility.fit).toBe('Needs confirmation')
    expect(rec.accessibility.adjustment).toBe(-8)
    expect(rec.accessibility.questionsToConfirm[0]).toMatch(/screen reader/i)
  })

  it('marks explicit offers that meet a stated need as Compatible with a +5 adjustment', () => {
    const rec = scoreJob(
      user({
        skills: ['Microsoft Office'],
        accessibilityNeeds: ['Wheelchair accessible entrance', 'Screen reader compatible software'],
        accommodationRequirements: ['Screen reader software'],
      }),
      job({
        id: 'JOB-201',
        title: 'Admin Clerk',
        skills: ['Microsoft Office'],
        accessibilityFeatures: ['Wheelchair accessible entrance', 'Screen reader compatible software'],
        accommodationSupport: 'Yes',
      }),
    )!
    expect(rec.accessibility.fit).toBe('Compatible')
    expect(rec.accessibility.adjustment).toBe(5)
  })

  it('scores "Compatible with accommodation" with -3 when needs are silent but the job advertises accessibility', () => {
    const rec = scoreJob(
      user({ skills: ['Microsoft Office'], accessibilityNeeds: ['Quiet workspace', 'Rest breaks'] }),
      job({
        id: 'JOB-202',
        title: 'Records Assistant',
        skills: ['Microsoft Office'],
        accessibilityFeatures: ['Wheelchair ramp access'],
        accommodationSupport: 'Available upon request',
      }),
    )!
    expect(rec.accessibility.fit).toBe('Compatible with accommodation')
    expect(rec.accessibility.adjustment).toBe(-3)
  })

  it('counts remote only as a positive when the applicant explicitly prefers it', () => {
    const remotePref = scoreJob(
      user({ skills: ['Writing'], preferredWorkSetup: ['Remote'] }),
      job({ id: 'JOB-300', title: 'Content Writer', workSetup: 'Remote', skills: ['Writing'], accessibilityFeatures: [] }),
    )!
    const noRemotePref = scoreJob(
      user({ skills: ['Writing'], preferredWorkSetup: ['Office'] }),
      job({ id: 'JOB-300', title: 'Content Writer', workSetup: 'Remote', skills: ['Writing'], accessibilityFeatures: [] }),
    )!
    expect(remotePref.accessibility.adjustment).toBe(5)
    expect(remotePref.accessibility.fit).toBe('Compatible')
    expect(noRemotePref.accessibility.adjustment).toBe(0)
    expect(noRemotePref.accessibility.fit).toBe('Not assessed')
  })

  it('never surfaces a disability label in recommendation text', () => {
    const rec = scoreJob(
      user({ disabilityType: 'Visual Disability', accessibilityNeeds: ['Screen reader software'] }),
      job({
        id: 'JOB-203',
        title: 'Clerk',
        skills: ['Microsoft Office'],
        accessibilityFeatures: [],
        accommodationSupport: ''
      }),
    )!
    const text = [rec.accessibility.note, ...rec.accessibility.questionsToConfirm, rec.qualification.note].join(' ')
    expect(text).not.toContain('Disability')
    expect(text).not.toContain('visual')
  })
})

describe('deduplication, ranking & banding', () => {
  it('merges duplicate postings (same title + content) into one recommendation', () => {
    const jobA = job({ id: 'JOB-401', title: 'Data Entry Assistant', skills: ['Data Entry', 'Microsoft Office'], description: 'Encoding and records work.' })
    const jobB = job({ id: 'JOB-402', title: 'Data Entry Assistant', skills: ['Data Entry', 'Microsoft Office'], description: 'Encoding and records work.' })
    const result = getRecommendations(user({ skills: ['Data Entry', 'Microsoft Office'] }), [jobA, jobB])
    expect(result.recommendations).toHaveLength(1)
    expect(result.recommendations[0].duplicateJobIds).toContain('JOB-402')
  })

  it('returns at most one recommendation per job title', () => {
    const result = getRecommendations(user({ skills: ['Data Entry'] }), [
      job({ id: 'JOB-501', title: 'Data Entry Assistant', skills: ['Data Entry'] }),
      job({ id: 'JOB-502', title: 'Data Entry Assistant', skills: ['Data Entry'], description: 'Different content here.' }),
    ])
    expect(new Set(result.recommendations.map((r) => r.job.title)).size).toBe(result.recommendations.length)
  })

  it('flags a weak overall result (best < 50) and lists missing skills', () => {
    const result = getRecommendations(
      user({ skills: ['Cooking', 'Baking'], jobInterests: ['Kitchen Staff'] }),
      [jobOfficeAdmin, job({ id: 'JOB-002', title: 'IT Support Staff', category: 'Technology', skills: ['HTML', 'CSS', 'Network Troubleshooting'] })],
    )
    expect(result.weakMatch).toBe(true)
    expect(result.suggestedImprovements.length).toBeGreaterThan(0)
    for (const rec of result.recommendations) expect(rec.score).toBeLessThan(50)
  })

  it('uses the stated location preference as a tie-break at equal scores', () => {
    const target = user({ skills: ['Data Entry'], preferredLocation: 'Los Baños' })
    const local = job({ id: 'JOB-601', title: 'Data Clerk', location: 'Los Baños, Laguna', description: 'Helps the records section in town.', skills: ['Data Entry'] })
    const distant = job({ id: 'JOB-602', title: 'Data Clerk B', location: 'Bay, Bulacan', description: 'Helps the records section in town.', skills: ['Data Entry'] })
    const result = getRecommendations(target, [local, distant])
    expect(result.recommendations[0].job.id).toBe('JOB-601')
  })

  it('sorts by final score descending and applies the correct score bands', () => {
    const strongJob = job({ id: 'JOB-701', title: 'Data Entry Assistant', category: 'Administrative', skills: ['Data Entry', 'Microsoft Office'] })
    const weakJob = job({ id: 'JOB-702', title: 'Graphic Designer', category: 'Media & Communications', skills: ['Design', 'Photography'] })
    const result = getRecommendations(user({ skills: ['Data Entry', 'Microsoft Office'], jobInterests: ['Data Entry'] }), [weakJob, strongJob])
    expect(result.recommendations[0].job.id).toBe('JOB-701')
    for (const rec of result.recommendations) {
      expect(rec.band).toBe(bandForScore(rec.score))
    }
  })
})