import { describe, it, expect } from 'vitest'
import { pwdUsers as seedPwds, assistanceRequests as seedRequests } from '../data'
import type { PWDUser, AssistanceRequest, RequestStatus, VerificationStatus } from '../data'
import { BARANGAYS, DISABILITY_TYPES, officialBarangay, normalizeDisability } from './catalog'
import {
  computeStats,
  computeRawStats,
  shapeStats,
  percentagesSumTo100,
  lastSixMonthKeys,
  requestBucket,
  statsViolations,
} from './stats'

// 2026-09-30 23:30 UTC is already 2026-10-01 in Asia/Manila (UTC+8).
const NOW = new Date('2026-09-22T04:00:00Z')

const pwd = (o: Partial<PWDUser>): PWDUser => ({
  id: 'P-' + Math.random().toString(36).slice(2, 8),
  username: 'u',
  password: 'x',
  name: 'N',
  address: '',
  barangay: 'Brgy. Malinta',
  contact: '',
  email: '',
  disabilityType: 'Physical Disability',
  verificationStatus: 'Verified',
  dateRegistered: '2026-01-01',
  pwdIdNumber: '',
  ...o,
})

const req = (status: RequestStatus, o: Partial<AssistanceRequest> = {}): AssistanceRequest => ({
  id: 'R-' + Math.random().toString(36).slice(2, 8),
  pwdName: 'N',
  pwdId: 'P-1',
  type: 'Financial Assistance',
  title: 't',
  description: 'd',
  dateSubmitted: '2026-09-01',
  lastUpdated: '2026-09-01',
  status,
  assignedStaff: 'Unassigned',
  comments: [],
  timeline: [],
  ...o,
})

describe('empty database', () => {
  const stats = computeStats([], [], NOW)
  it('is all zeros with every chart bucket present', () => {
    expect(stats.totalPwds).toBe(0)
    expect(stats.totalRequests).toBe(0)
    expect(stats.byBarangay).toHaveLength(14)
    expect(stats.byBarangay.every((b) => b.count === 0)).toBe(true)
    expect(stats.requestsOverTime).toHaveLength(6)
    expect(stats.approvalRate.map((s) => s.percent)).toEqual([0, 0, 0])
    expect(statsViolations(stats)).toEqual([])
  })
})

describe('the demo seed data', () => {
  const stats = computeStats(seedPwds, seedRequests, NOW)

  it('counts exactly what is in the data, not sample numbers', () => {
    expect(stats.totalPwds).toBe(seedPwds.length)
    expect(stats.totalRequests).toBe(seedRequests.length)
    expect(stats.verifiedPwds).toBe(seedPwds.filter((u) => u.verificationStatus === 'Verified').length)
  })

  it('approved / rejected / pending add up to the total (the old donut claimed 71%)', () => {
    expect(stats.approvedRequests + stats.rejectedRequests + stats.pendingRequests).toBe(stats.totalRequests)
    expect(stats.approvedRequests).toBe(4)
    expect(stats.totalRequests).toBe(11)
    expect(stats.approvalRate.find((s) => s.name === 'Approved')!.percent).toBe(36)
    expect(stats.approvalRate.reduce((a, s) => a + s.percent, 0)).toBe(100)
  })

  it('is internally consistent', () => {
    expect(statsViolations(stats)).toEqual([])
  })

  it('never shows more requests over time than exist', () => {
    const shown = stats.requestsOverTime.reduce((a, m) => a + m.count, 0)
    expect(shown).toBeLessThanOrEqual(stats.totalRequests)
  })

  it('reports (does not drop) PWDs whose barangay is not on the official list', () => {
    expect(seedPwds.some((u) => officialBarangay(u.barangay) === null)).toBe(true)
    expect(stats.unlistedBarangayCount).toBe(seedPwds.filter((u) => officialBarangay(u.barangay) === null).length)
  })
})

describe('reconciliation across states', () => {
  const statuses: VerificationStatus[] = ['Verified', 'Pending', 'Rejected', 'Unverified']
  const reqStatuses: RequestStatus[] = ['Pending', 'Under Review', 'Requirements Needed', 'Approved', 'Rejected', 'Available', 'Claimed', 'Completed']

  it('verified + pending + rejected = total PWDs for every verification status', () => {
    const pwds = statuses.flatMap((v) => [pwd({ verificationStatus: v }), pwd({ verificationStatus: v })])
    const s = computeStats(pwds, [], NOW)
    expect(s.verifiedPwds + s.pendingPwds + s.rejectedPwds).toBe(s.totalPwds)
    expect(s.totalPwds).toBe(8)
  })

  it('approved + rejected + pending = total requests for every request status', () => {
    const s = computeStats([], reqStatuses.map((r) => req(r)), NOW)
    expect(s.approvedRequests + s.rejectedRequests + s.pendingRequests).toBe(s.totalRequests)
    expect(requestBucket('Completed')).toBe('approved')
    expect(requestBucket('Requirements Needed')).toBe('pending')
    expect(statsViolations(s)).toEqual([])
  })

  it('reacts to changes: create, verify, reject, approve, delete', () => {
    const a = pwd({ id: 'P-A', verificationStatus: 'Pending' })
    const r = req('Pending', { pwdId: 'P-A' })
    let s = computeStats([a], [r], NOW)
    expect([s.totalPwds, s.pendingPwds, s.verifiedPwds]).toEqual([1, 1, 0])
    expect(s.pendingRequests).toBe(1)

    s = computeStats([{ ...a, verificationStatus: 'Verified' }], [{ ...r, status: 'Approved' }], NOW)
    expect([s.pendingPwds, s.verifiedPwds, s.approvedRequests, s.pendingRequests]).toEqual([0, 1, 1, 0])

    s = computeStats([{ ...a, verificationStatus: 'Rejected' }], [{ ...r, status: 'Rejected' }], NOW)
    expect([s.rejectedPwds, s.rejectedRequests]).toEqual([1, 1])

    s = computeStats([{ ...a, deletedAt: '2026-09-22' }], [r], NOW)
    expect(s.totalPwds).toBe(0)
    expect(statsViolations(s)).toEqual([])
  })
})

describe('"+N this month" (Asia/Manila)', () => {
  it('counts PWDs registered in the current calendar month', () => {
    const s = computeStats([pwd({ dateRegistered: '2026-09-03' }), pwd({ dateRegistered: '2026-08-31' }), pwd({ dateRegistered: '2025-09-10' })], [], NOW)
    expect(s.newThisMonth).toBe(1)
  })

  it('uses the Manila calendar, not UTC, at the month boundary', () => {
    // 2026-09-30T20:00Z is 2026-10-01 04:00 in Manila.
    const boundary = new Date('2026-09-30T20:00:00Z')
    const s = computeStats([pwd({ dateRegistered: '2026-10-01' }), pwd({ dateRegistered: '2026-09-15' })], [], boundary)
    expect(s.newThisMonth).toBe(1)
    expect(lastSixMonthKeys(boundary).at(-1)).toBe('2026-10')
  })

  it('is 0 (so the UI hides it) when nobody registered this month', () => {
    expect(computeStats(seedPwds, seedRequests, NOW).newThisMonth).toBe(0)
  })
})

describe('charts', () => {
  it('lists the last six Manila months, oldest first, spanning year ends', () => {
    expect(lastSixMonthKeys(new Date('2026-02-10T00:00:00Z'))).toEqual(['2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02'])
  })

  it('groups requests by month and ignores older ones', () => {
    const s = computeStats([], [req('Pending', { dateSubmitted: '2026-09-02' }), req('Pending', { dateSubmitted: '2026-09-20' }), req('Approved', { dateSubmitted: '2026-07-04' }), req('Approved', { dateSubmitted: '2025-01-04' })], NOW)
    expect(s.requestsOverTime.map((m) => m.count)).toEqual([0, 0, 0, 1, 0, 2])
    expect(s.totalRequests).toBe(4)
  })

  it('includes all 14 official barangays, including those at zero, and merges spellings', () => {
    const s = computeStats([pwd({ barangay: 'Brgy. Anos' }), pwd({ barangay: 'anos' }), pwd({ barangay: 'Brgy. Timugan' })], [], NOW)
    expect(s.byBarangay.map((b) => b.name)).toEqual([...BARANGAYS])
    expect(s.byBarangay.find((b) => b.name === 'Anos')!.count).toBe(2)
    expect(s.byBarangay.find((b) => b.name === 'Bayog')!.count).toBe(0)
  })

  it('treats the legacy "Speech and Language Impairment" spelling as the new label', () => {
    expect(normalizeDisability('Speech and Language Impairment')).toBe('Speech & Language Impairment')
    const s = computeStats([pwd({ disabilityType: 'Speech and Language Impairment' as never }), pwd({ disabilityType: 'Speech & Language Impairment' }), pwd({ disabilityType: 'Rare Disease (RA 10747)' })], [], NOW)
    expect(s.byDisability.find((d) => d.name === 'Speech & Language Impairment')!.count).toBe(2)
    expect(s.byDisability.find((d) => d.name === 'Rare Disease (RA 10747)')!.count).toBe(1)
    expect(s.byDisability.map((d) => d.name).slice(0, DISABILITY_TYPES.length)).toEqual([...DISABILITY_TYPES])
    expect(statsViolations(s)).toEqual([])
  })

  it('groups custom disability values under "Other" so the chart still reconciles', () => {
    const s = computeStats([pwd({ disabilityType: 'Other' })], [], NOW)
    expect(s.byDisability.at(-1)).toEqual({ name: 'Other', count: 1 })
    expect(statsViolations(s)).toEqual([])
  })

  it('applies report filters to PWDs and to their requests', () => {
    const a = pwd({ id: 'P-A', barangay: 'Brgy. Anos' })
    const b = pwd({ id: 'P-B', barangay: 'Brgy. Bayog' })
    const s = computeStats([a, b], [req('Approved', { pwdId: 'P-A' }), req('Pending', { pwdId: 'P-B' })], NOW, { barangay: 'Anos' })
    expect(s.totalPwds).toBe(1)
    expect(s.totalRequests).toBe(1)
    expect(s.approvedRequests).toBe(1)
  })
})

describe('approval-rate rounding', () => {
  it.each([
    [[4, 2, 5], 100],
    [[1, 1, 1], 100],
    [[1, 0, 0], 100],
    [[0, 0, 0], 0],
    [[333, 333, 334], 100],
    [[2, 3, 7], 100],
  ])('%j sums to %i', (counts, expected) => {
    expect(percentagesSumTo100(counts).reduce((a, b) => a + b, 0)).toBe(expected)
  })
})

describe('server / local parity', () => {
  it('shapes a database-style payload exactly like the in-memory aggregate', () => {
    const pwds = [pwd({ barangay: 'Brgy. Anos' }), pwd({ verificationStatus: 'Pending', dateRegistered: '2026-09-10' })]
    const requests = [req('Approved'), req('Rejected'), req('Pending', { type: 'Assistive Device' })]
    const raw = computeRawStats(pwds, requests, NOW)
    // What supabase.rpc('dashboard_stats') returns: JSON with numeric strings tolerated.
    const wire = JSON.parse(JSON.stringify(raw))
    expect(shapeStats(wire, NOW)).toEqual(computeStats(pwds, requests, NOW))
  })
})
