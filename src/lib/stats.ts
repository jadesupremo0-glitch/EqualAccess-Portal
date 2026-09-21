// Dashboard / reports metrics.
//
// Every number shown on the admin Dashboard and Reports pages comes from here.
// `computeRawStats` aggregates PWD and request rows in memory (used offline and by
// Reports); the `dashboard_stats()` Postgres function in
// supabase/migrations/20260921000000_jobs_and_live_stats.sql performs the same
// aggregation inside the database and returns the same `RawStats` shape.
// `shapeStats` turns either source into the display model, so both always agree.

import type { PWDUser, AssistanceRequest, RequestStatus, VerificationStatus } from '../data'
import {
  ASSISTANCE_TYPES,
  BARANGAYS,
  DISABILITY_TYPES,
  OTHER_DISABILITY,
  manilaDate,
  normalizeAssistanceType,
  normalizeDisability,
  officialBarangay,
} from './catalog'

// ── Status buckets ─────────────────────────────────────────────────
// Requests move through eight statuses; for reporting they fall into three outcomes.
export type RequestBucket = 'approved' | 'rejected' | 'pending'

// approved = Approved, Available, Claimed, Completed; rejected = Rejected;
// pending = Pending, Under Review, Requirements Needed (still awaiting a decision).
const APPROVED_STATUSES: readonly RequestStatus[] = ['Approved', 'Available', 'Claimed', 'Completed']

export function requestBucket(status: RequestStatus | string): RequestBucket {
  if (status === 'Rejected') return 'rejected'
  if ((APPROVED_STATUSES as readonly string[]).includes(status)) return 'approved'
  return 'pending'
}

export type VerificationBucket = 'verified' | 'rejected' | 'pending'

export function verificationBucket(status: VerificationStatus | string): VerificationBucket {
  if (status === 'Verified') return 'verified'
  if (status === 'Rejected') return 'rejected'
  return 'pending' // Pending and Unverified both await PDAO verification
}

// ── Raw aggregates (identical shape from SQL and from memory) ──────
export interface CountRow {
  name: string
  count: number
}

export interface RawStats {
  totalPwds: number
  verifiedPwds: number
  pendingPwds: number
  rejectedPwds: number
  newThisMonth: number
  totalRequests: number
  approvedRequests: number
  pendingRequests: number
  rejectedRequests: number
  /** Requests grouped by submission month (YYYY-MM); only months that have data. */
  requestsByMonth: CountRow[]
  /** PWDs grouped by the stored barangay value (unnormalised). */
  pwdsByBarangay: CountRow[]
  /** PWDs grouped by the stored disability type (unnormalised). */
  pwdsByDisability: CountRow[]
  /** Requests grouped by the stored request type (unnormalised). */
  requestsByType: CountRow[]
}

export interface StatsFilter {
  /** Official barangay name, e.g. "Malinta". */
  barangay?: string
  /** Canonical disability label. */
  disability?: string
  /** Only requests submitted on/after this date (YYYY-MM-DD). */
  fromDate?: string
}

const monthOf = (isoDate: string) => (isoDate ?? '').slice(0, 7)

function tally(values: string[]): CountRow[] {
  const map = new Map<string, number>()
  for (const v of values) map.set(v, (map.get(v) ?? 0) + 1)
  return [...map.entries()].map(([name, count]) => ({ name, count }))
}

/** In-memory equivalent of the `dashboard_stats()` database function. */
export function computeRawStats(
  pwds: PWDUser[],
  requests: AssistanceRequest[],
  now: Date = new Date(),
  filter: StatsFilter = {},
): RawStats {
  const thisMonth = monthOf(manilaDate(now))
  const live = pwds.filter((u) => !u.deletedAt)
  const scopedPwds = live.filter(
    (u) =>
      (!filter.barangay || officialBarangay(u.barangay) === filter.barangay) &&
      (!filter.disability || normalizeDisability(u.disabilityType) === filter.disability),
  )
  const scoped = Boolean(filter.barangay || filter.disability)
  const scopedIds = new Set(scopedPwds.map((u) => u.id))
  const scopedRequests = requests.filter(
    (r) => (!scoped || scopedIds.has(r.pwdId)) && (!filter.fromDate || r.dateSubmitted >= filter.fromDate),
  )

  const count = (pred: (u: PWDUser) => boolean) => scopedPwds.filter(pred).length
  const reqCount = (bucket: RequestBucket) => scopedRequests.filter((r) => requestBucket(r.status) === bucket).length

  return {
    totalPwds: scopedPwds.length,
    verifiedPwds: count((u) => verificationBucket(u.verificationStatus) === 'verified'),
    pendingPwds: count((u) => verificationBucket(u.verificationStatus) === 'pending'),
    rejectedPwds: count((u) => verificationBucket(u.verificationStatus) === 'rejected'),
    newThisMonth: count((u) => monthOf(u.dateRegistered) === thisMonth),
    totalRequests: scopedRequests.length,
    approvedRequests: reqCount('approved'),
    pendingRequests: reqCount('pending'),
    rejectedRequests: reqCount('rejected'),
    requestsByMonth: tally(scopedRequests.map((r) => monthOf(r.dateSubmitted)).filter(Boolean)),
    pwdsByBarangay: tally(scopedPwds.map((u) => u.barangay ?? '')),
    pwdsByDisability: tally(scopedPwds.map((u) => u.disabilityType ?? '')),
    requestsByType: tally(scopedRequests.map((r) => r.type ?? '')),
  }
}

// ── Display model ──────────────────────────────────────────────────
export interface SliceStat {
  name: 'Approved' | 'Rejected' | 'Pending'
  count: number
  /** Whole-number share; the three slices always sum to exactly 100 (or 0 when empty). */
  percent: number
}

export interface MonthStat {
  key: string
  label: string
  count: number
}

export interface DashboardStats {
  totalPwds: number
  verifiedPwds: number
  pendingPwds: number
  rejectedPwds: number
  newThisMonth: number
  totalRequests: number
  approvedRequests: number
  pendingRequests: number
  rejectedRequests: number
  requestsOverTime: MonthStat[]
  approvalRate: SliceStat[]
  byBarangay: CountRow[]
  /** PWDs whose stored barangay is not on the official list (reported, never rewritten). */
  unlistedBarangayCount: number
  byDisability: CountRow[]
  requestsByType: CountRow[]
}

/** Largest-remainder rounding so the shares add up to exactly 100. */
export function percentagesSumTo100(counts: number[]): number[] {
  const total = counts.reduce((a, b) => a + b, 0)
  if (total === 0) return counts.map(() => 0)
  const exact = counts.map((c) => (c / total) * 100)
  const floors = exact.map(Math.floor)
  let remaining = 100 - floors.reduce((a, b) => a + b, 0)
  const order = exact
    .map((v, i) => ({ i, rem: v - Math.floor(v) }))
    .sort((a, b) => b.rem - a.rem || a.i - b.i)
  for (const { i } of order) {
    if (remaining <= 0) break
    floors[i] += 1
    remaining -= 1
  }
  return floors
}

/** The current Asia/Manila month plus the five before it, oldest first. */
export function lastSixMonthKeys(now: Date = new Date()): string[] {
  const [y, m] = manilaDate(now).split('-').map(Number)
  const keys: string[] = []
  for (let back = 5; back >= 0; back--) {
    const idx = y * 12 + (m - 1) - back
    const year = Math.floor(idx / 12)
    const month = (idx % 12) + 1
    keys.push(`${year}-${String(month).padStart(2, '0')}`)
  }
  return keys
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
}

const num = (v: unknown): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export function shapeStats(raw: RawStats, now: Date = new Date()): DashboardStats {
  const byMonth = new Map(raw.requestsByMonth.map((r) => [r.name, num(r.count)]))
  const requestsOverTime = lastSixMonthKeys(now).map((key) => ({ key, label: monthLabel(key), count: byMonth.get(key) ?? 0 }))

  const slices: [SliceStat['name'], number][] = [
    ['Approved', num(raw.approvedRequests)],
    ['Rejected', num(raw.rejectedRequests)],
    ['Pending', num(raw.pendingRequests)],
  ]
  const percents = percentagesSumTo100(slices.map(([, c]) => c))
  const approvalRate = slices.map(([name, count], i) => ({ name, count, percent: percents[i] }))

  const barangayCounts = new Map<string, number>(BARANGAYS.map((b) => [b, 0]))
  let unlisted = 0
  for (const row of raw.pwdsByBarangay) {
    const official = officialBarangay(row.name)
    if (official) barangayCounts.set(official, (barangayCounts.get(official) ?? 0) + num(row.count))
    else unlisted += num(row.count)
  }
  const byBarangay = BARANGAYS.map((name) => ({ name: name as string, count: barangayCounts.get(name) ?? 0 }))

  const disabilityCounts = new Map<string, number>(DISABILITY_TYPES.map((d) => [d as string, 0]))
  let otherDisability = 0
  for (const row of raw.pwdsByDisability) {
    const canonical = normalizeDisability(row.name)
    if (disabilityCounts.has(canonical)) disabilityCounts.set(canonical, (disabilityCounts.get(canonical) ?? 0) + num(row.count))
    else otherDisability += num(row.count)
  }
  const byDisability: CountRow[] = DISABILITY_TYPES.map((name) => ({ name: name as string, count: disabilityCounts.get(name) ?? 0 }))
  if (otherDisability > 0) byDisability.push({ name: OTHER_DISABILITY, count: otherDisability })

  const typeCounts = new Map<string, number>(ASSISTANCE_TYPES.map((t) => [t as string, 0]))
  for (const row of raw.requestsByType) {
    const canonical = normalizeAssistanceType(row.name) || 'Other Service Assistance'
    typeCounts.set(canonical, (typeCounts.get(canonical) ?? 0) + num(row.count))
  }
  const requestsByType = [...typeCounts.entries()].map(([name, count]) => ({ name, count }))

  return {
    totalPwds: num(raw.totalPwds),
    verifiedPwds: num(raw.verifiedPwds),
    pendingPwds: num(raw.pendingPwds),
    rejectedPwds: num(raw.rejectedPwds),
    newThisMonth: num(raw.newThisMonth),
    totalRequests: num(raw.totalRequests),
    approvedRequests: num(raw.approvedRequests),
    pendingRequests: num(raw.pendingRequests),
    rejectedRequests: num(raw.rejectedRequests),
    requestsOverTime,
    approvalRate,
    byBarangay,
    unlistedBarangayCount: unlisted,
    byDisability,
    requestsByType,
  }
}

/** Convenience: in-memory aggregate straight to the display model. */
export function computeStats(
  pwds: PWDUser[],
  requests: AssistanceRequest[],
  now: Date = new Date(),
  filter: StatsFilter = {},
): DashboardStats {
  return shapeStats(computeRawStats(pwds, requests, now, filter), now)
}

// ── Consistency checks ─────────────────────────────────────────────
const sum = (rows: { count: number }[]) => rows.reduce((a, r) => a + r.count, 0)

/** Returns a list of violated invariants (empty = everything reconciles). */
export function statsViolations(s: DashboardStats): string[] {
  const problems: string[] = []
  if (s.verifiedPwds + s.pendingPwds + s.rejectedPwds !== s.totalPwds) {
    problems.push(`verified (${s.verifiedPwds}) + pending (${s.pendingPwds}) + rejected (${s.rejectedPwds}) ≠ total PWDs (${s.totalPwds})`)
  }
  if (s.approvedRequests + s.rejectedRequests + s.pendingRequests !== s.totalRequests) {
    problems.push(`approved (${s.approvedRequests}) + rejected (${s.rejectedRequests}) + pending (${s.pendingRequests}) ≠ total requests (${s.totalRequests})`)
  }
  if (sum(s.byBarangay) + s.unlistedBarangayCount !== s.totalPwds) {
    problems.push(`barangay distribution (${sum(s.byBarangay)} + ${s.unlistedBarangayCount} unlisted) ≠ total PWDs (${s.totalPwds})`)
  }
  if (sum(s.byDisability) !== s.totalPwds) {
    problems.push(`disability distribution (${sum(s.byDisability)}) ≠ total PWDs (${s.totalPwds})`)
  }
  if (sum(s.requestsByType) !== s.totalRequests) {
    problems.push(`requests by type (${sum(s.requestsByType)}) ≠ total requests (${s.totalRequests})`)
  }
  if (sum(s.requestsOverTime) > s.totalRequests) {
    problems.push(`requests over time (${sum(s.requestsOverTime)}) exceeds total requests (${s.totalRequests})`)
  }
  const pct = s.approvalRate.reduce((a, r) => a + r.percent, 0)
  if (s.totalRequests > 0 && pct !== 100) problems.push(`approval-rate percentages sum to ${pct}, not 100`)
  if (s.newThisMonth > s.totalPwds) problems.push(`new this month (${s.newThisMonth}) exceeds total PWDs (${s.totalPwds})`)
  return problems
}
