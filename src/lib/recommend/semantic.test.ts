import { describe, it, expect } from 'vitest'
import { applicantDocument, computeSemanticFit, cosineSimilarity, jobDocument, tokenize } from './semantic'
import type { PWDUser, Job } from '../../data'

const baseUser: PWDUser = {
  id: 'PWD-1', username: 'tester', password: 'pwd123', name: 'Test Applicant', address: 'Test St.',
  barangay: 'Brgy. Malinta', contact: '+63 900 000 0000', email: 'tester@example.com',
  disabilityType: 'Physical Disability', verificationStatus: 'Verified', dateRegistered: '2026-01-01',
  pwdIdNumber: 'LB-TST-2026-00001',
}
const baseJob: Job = {
  id: 'JOB-900', title: 'Generic Job', company: 'ACME Corp', description: 'A job.', location: 'Los Baños, Laguna',
  employmentType: 'Full-time', workArrangement: 'On-site', skills: [], minEducation: '', suitableDisabilities: [],
  accommodations: [], slots: 1, deadline: '2026-12-31', postedDate: '2026-06-01', status: 'Open',
}
const user = (o: Partial<PWDUser> = {}): PWDUser => ({ ...baseUser, ...o })
const job = (o: Partial<Job> = {}): Job => ({ ...baseJob, ...o })

describe('tokenize', () => {
  it('lowercases, strips punctuation, and drops stopwords and single letters', () => {
    expect(tokenize('Data-Entry, and the Filing of Documents!')).toEqual(['data', 'entry', 'filing', 'documents'])
  })

  it('handles empty/undefined input without throwing', () => {
    expect(tokenize('')).toEqual([])
  })
})

describe('applicantDocument / jobDocument', () => {
  it('joins skills, education and work experience for an applicant', () => {
    const doc = applicantDocument(user({ skills: ['Data Entry', 'Typing'], education: 'BS IT', workExperience: 'Records assistant' }))
    expect(doc).toBe('Data Entry Typing BS IT Records assistant')
  })

  it('joins title, required skills and description for a job', () => {
    const doc = jobDocument(job({ title: 'Data Entry Clerk', skills: ['Data Entry'], description: 'Encoding documents.' }))
    expect(doc).toBe('Data Entry Clerk Data Entry Encoding documents.')
  })
})

describe('cosineSimilarity', () => {
  it('is 1 for identical vectors and 0 for disjoint ones', () => {
    const a = new Map([['x', 0.6], ['y', 0.8]])
    expect(cosineSimilarity(a, a)).toBeCloseTo(1, 5)
    const b = new Map([['z', 1]])
    expect(cosineSimilarity(a, b)).toBe(0)
  })
})

describe('computeSemanticFit', () => {
  const dataEntryJob = job({
    id: 'JOB-A', title: 'Data Entry Clerk', skills: ['Data Entry', 'Microsoft Office'],
    description: 'Encoding documents and organizing office files.',
  })
  const landscapingJob = job({
    id: 'JOB-B', title: 'Landscaping Helper', skills: ['Horticulture', 'Manual Labor'],
    description: 'Gardening, planting and maintaining outdoor grounds.',
  })

  it('scores a matching-background applicant higher against the relevant job than an unrelated one', () => {
    const applicant = user({
      skills: ['Data Entry', 'Microsoft Office', 'Typing'],
      education: 'BS Office Administration',
      workExperience: 'Encoded records and organized office files for two years',
    })
    const corpus = [dataEntryJob, landscapingJob]
    const relevant = computeSemanticFit(applicant, dataEntryJob, corpus)
    const unrelated = computeSemanticFit(applicant, landscapingJob, corpus)
    expect(relevant.similarity).toBeGreaterThan(unrelated.similarity)
    expect(relevant.similarity).toBeGreaterThan(0)
  })

  it('surfaces the overlapping terms that drove the similarity', () => {
    const applicant = user({ skills: ['Data Entry'], workExperience: 'Encoding documents' })
    const fit = computeSemanticFit(applicant, dataEntryJob, [dataEntryJob, landscapingJob])
    expect(fit.sharedTerms.length).toBeGreaterThan(0)
    expect(fit.sharedTerms).toContain('data')
  })

  it('is 0, not an error, when the applicant has no free text at all', () => {
    const blank = user({ skills: [], education: '', workExperience: '' })
    const fit = computeSemanticFit(blank, dataEntryJob, [dataEntryJob, landscapingJob])
    expect(fit.similarity).toBe(0)
    expect(fit.sharedTerms).toEqual([])
  })

  it('works standalone (no corpusJobs) by fitting the TF-IDF space from just the one pair', () => {
    const applicant = user({ skills: ['Data Entry'], workExperience: 'Encoding documents' })
    const fit = computeSemanticFit(applicant, dataEntryJob)
    expect(fit.similarity).toBeGreaterThan(0)
  })
})
