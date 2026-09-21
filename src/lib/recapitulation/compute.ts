import { BARANGAYS } from '../catalog'
import type { RecapInput, RecapPrpwd, RecapReport, RecapRow, RecapTotals } from './types'

export const DEFAULT_REPORT_TITLE = 'Total Number Strength of Persons With Disabilities in Los Baños'

/** The 14 official barangays in report order: 001 Anos … 014 Timugan. */
export const OFFICIAL_BARANGAYS = BARANGAYS.map((name, i) => ({ code: String(i + 1).padStart(3, '0'), name }))

/** A row's total is always the sum of its two age brackets. */
export const rowTotal = (r: { age0to59: number; age60above: number }): number => r.age0to59 + r.age60above

/** Same rounding as the database (half up; counts are never negative). 0 when there are no PWDs. */
export const prpwdPercent = (totalPwds: number, totalEncoded: number): number =>
  totalPwds > 0 ? Math.round((totalEncoded * 100) / totalPwds) : 0

export function sumRows(rows: { age0to59: number; age60above: number }[]): RecapTotals {
  const age0to59 = rows.reduce((a, r) => a + r.age0to59, 0)
  const age60above = rows.reduce((a, r) => a + r.age60above, 0)
  return { age0to59, age60above, total: age0to59 + age60above }
}

/** Share of the grand total, as a percentage with one decimal (15.2). */
export const sharePercent = (part: number, whole: number): number => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0)

/** Codes of the barangay(s) with the highest and lowest total. Empty when there is nothing to compare. */
export function extremes(rows: RecapRow[]): { highest: string[]; lowest: string[] } {
  if (rows.length < 2) return { highest: [], lowest: [] }
  const totals = rows.map(rowTotal)
  const max = Math.max(...totals)
  const min = Math.min(...totals)
  if (max === min) return { highest: [], lowest: [] }
  return {
    highest: rows.filter((r) => rowTotal(r) === max).map((r) => r.code),
    lowest: rows.filter((r) => rowTotal(r) === min).map((r) => r.code),
  }
}

/** "April 30, 2026" from "2026-04-30", without going through Date/time zones. */
export function formatAsOf(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return iso
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return `${months[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`
}

export const isIsoDate = (s: string): boolean => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return false
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3])
}

/** A blank report: the 14 barangays at zero. */
export function blankInput(asOfDate = ''): RecapInput {
  return {
    title: DEFAULT_REPORT_TITLE,
    asOfDate,
    status: 'draft',
    showOnLanding: false,
    rows: OFFICIAL_BARANGAYS.map((b) => ({ ...b, age0to59: 0, age60above: 0 })),
    prpwd: [{ label: 'DOH PRPWD ENCODED', referenceDate: asOfDate || null, totalPwds: 0, totalEncoded: 0 }],
  }
}

/** Editable copy of a saved report. */
export function inputFromReport(report: RecapReport, keepId = true): RecapInput {
  return {
    ...(keepId ? { id: report.id } : {}),
    title: report.title,
    asOfDate: report.asOfDate,
    status: report.status,
    showOnLanding: report.showOnLanding,
    rows: report.rows.map((r) => ({ code: r.code, name: r.name, age0to59: r.age0to59, age60above: r.age60above })),
    prpwd: report.prpwd.map((p) => ({ label: p.label, referenceDate: p.referenceDate, totalPwds: p.totalPwds, totalEncoded: p.totalEncoded })),
  }
}

/** Fill in every derived number, exactly as the database does. */
export function withDerived(input: RecapInput): Pick<RecapReport, 'rows' | 'prpwd'> {
  const rows: RecapRow[] = input.rows.map((r) => ({ ...r, total: rowTotal(r) }))
  const prpwd: RecapPrpwd[] = input.prpwd.map((p) => ({ ...p, percentage: prpwdPercent(p.totalPwds, p.totalEncoded) }))
  return { rows, prpwd }
}

const isCount = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0

/**
 * Everything the database will also enforce, checked up front so the admin sees the problem next to the
 * field. `others` is the list of saved reports (used for the one-report-per-date rule).
 */
export function validateInput(input: RecapInput, others: Pick<RecapReport, 'id' | 'asOfDate'>[] = []): string[] {
  const errors: string[] = []
  if (!input.asOfDate) errors.push('The "as of" date is required.')
  else if (!isIsoDate(input.asOfDate)) errors.push('The "as of" date is not a valid date.')
  else if (others.some((o) => o.asOfDate === input.asOfDate && o.id !== input.id)) {
    errors.push(`A report as of ${formatAsOf(input.asOfDate)} already exists.`)
  }
  if (input.rows.length !== 14) errors.push('A report needs all 14 barangays.')
  for (const r of input.rows) {
    if (!isCount(r.age0to59)) errors.push(`${r.name}: Age 0-59 must be a whole number of 0 or more.`)
    if (!isCount(r.age60above)) errors.push(`${r.name}: Age 60-above must be a whole number of 0 or more.`)
  }
  for (const [i, p] of input.prpwd.entries()) {
    const name = p.label.trim() || `PRPWD row ${i + 1}`
    if (!p.label.trim()) errors.push(`PRPWD row ${i + 1} needs a label.`)
    if (!isCount(p.totalPwds)) errors.push(`${name}: Total PWDs must be a whole number of 0 or more.`)
    if (!isCount(p.totalEncoded)) errors.push(`${name}: Total encoded must be a whole number of 0 or more.`)
    if (isCount(p.totalPwds) && isCount(p.totalEncoded) && p.totalEncoded > p.totalPwds) {
      errors.push(`${name}: encoded (${p.totalEncoded.toLocaleString('en-US')}) cannot exceed total PWDs (${p.totalPwds.toLocaleString('en-US')}).`)
    }
    if (p.referenceDate && !isIsoDate(p.referenceDate)) errors.push(`${name}: the reference date is not a valid date.`)
  }
  return errors
}

const fmt = (v: number) => v.toLocaleString('en-US')

/** Short, human-readable list of what changed between two versions (for the audit log). */
export function describeChanges(before: RecapInput | null, after: RecapInput): string {
  if (!before) {
    const t = sumRows(after.rows)
    return `total ${fmt(t.total)} (0-59: ${fmt(t.age0to59)}, 60-above: ${fmt(t.age60above)})`
  }
  const changes: string[] = []
  if (before.asOfDate !== after.asOfDate) changes.push(`as-of date ${before.asOfDate} → ${after.asOfDate}`)
  if (before.status !== after.status) changes.push(`status ${before.status} → ${after.status}`)
  for (const row of after.rows) {
    const old = before.rows.find((r) => r.code === row.code)
    if (!old) continue
    if (old.age0to59 !== row.age0to59) changes.push(`${row.name} 0-59 ${fmt(old.age0to59)} → ${fmt(row.age0to59)}`)
    if (old.age60above !== row.age60above) changes.push(`${row.name} 60-above ${fmt(old.age60above)} → ${fmt(row.age60above)}`)
  }
  if (JSON.stringify(before.prpwd) !== JSON.stringify(after.prpwd)) changes.push('PRPWD status edited')
  const shown = changes.slice(0, 6)
  const more = changes.length - shown.length
  const tb = sumRows(before.rows).total
  const ta = sumRows(after.rows).total
  const head = tb !== ta ? `total ${fmt(tb)} → ${fmt(ta)}` : `total ${fmt(ta)}`
  return [head, ...shown].join('; ') + (more > 0 ? `; +${more} more` : '')
}
