import { BARANGAYS, DISABILITY_TYPES } from '../catalog'
import { AGE_GROUPS, AGE_GROUP_LABEL, type AgeGroup, type RecapDisabilityRow, type RecapDisabilityTotals, type RecapInput, type RecapPrpwd, type RecapReport, type RecapRow, type RecapTotals } from './types'

export { AGE_GROUPS, AGE_GROUP_LABEL }

export const DEFAULT_REPORT_TITLE = 'Total Number Strength of Persons With Disabilities in Los Baños'
export const DISABILITY_REPORT_TITLE = 'Disability Data of Los Baños'

/** The 14 official barangays in report order: 001 Anos … 014 Timugan. */
export const OFFICIAL_BARANGAYS = BARANGAYS.map((name, i) => ({ code: String(i + 1).padStart(3, '0'), name }))

/** The 10 official disability types, in the order the report is printed (from src/lib/catalog.ts). */
export const OFFICIAL_DISABILITY_TYPES = DISABILITY_TYPES

/** The eight female0to17/male0to17/… fields, keyed by age group so the table/chart code can loop over them. */
export const DISABILITY_FIELDS: Record<AgeGroup, { female: keyof Omit<RecapDisabilityRow, 'total' | 'disabilityType'>; male: keyof Omit<RecapDisabilityRow, 'total' | 'disabilityType'> }> = {
  '0-17': { female: 'female0to17', male: 'male0to17' },
  '18-30': { female: 'female18to30', male: 'male18to30' },
  '31-59': { female: 'female31to59', male: 'male31to59' },
  '60+': { female: 'female60above', male: 'male60above' },
}

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

/** A disability row's total is always the sum of its eight age/sex cells. */
export function disabilityRowTotal(r: Omit<RecapDisabilityRow, 'total'>): number {
  return r.female0to17 + r.male0to17 + r.female18to30 + r.male18to30 + r.female31to59 + r.male31to59 + r.female60above + r.male60above
}

/** Grand total, per-sex totals, and per-age-group (both sexes) totals across every disability row. */
export function sumDisabilityRows(rows: Omit<RecapDisabilityRow, 'total'>[]): RecapDisabilityTotals {
  const byAgeGroup = Object.fromEntries(AGE_GROUPS.map((g) => [g, 0])) as Record<AgeGroup, number>
  let female = 0
  let male = 0
  for (const r of rows) {
    for (const g of AGE_GROUPS) {
      const f = r[DISABILITY_FIELDS[g].female]
      const m = r[DISABILITY_FIELDS[g].male]
      byAgeGroup[g] += f + m
      female += f
      male += m
    }
  }
  return { grandTotal: female + male, female, male, byAgeGroup }
}

/** Disability type(s) with the highest and lowest total. Empty when there is nothing to compare. */
export function disabilityExtremes(rows: RecapDisabilityRow[]): { highest: string[]; lowest: string[] } {
  if (rows.length < 2) return { highest: [], lowest: [] }
  const totals = rows.map((r) => r.total)
  const max = Math.max(...totals)
  const min = Math.min(...totals)
  if (max === min) return { highest: [], lowest: [] }
  return {
    highest: rows.filter((r) => r.total === max).map((r) => r.disabilityType),
    lowest: rows.filter((r) => r.total === min).map((r) => r.disabilityType),
  }
}

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
    disabilityRows: OFFICIAL_DISABILITY_TYPES.map((disabilityType) => ({
      disabilityType, female0to17: 0, male0to17: 0, female18to30: 0, male18to30: 0,
      female31to59: 0, male31to59: 0, female60above: 0, male60above: 0,
    })),
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
    // Falls back to a blank set of the 10 official types for a report saved before the Disability Data
    // migration/seed ran, so opening the editor on an old snapshot never crashes.
    disabilityRows: report.disabilityRows?.length
      ? report.disabilityRows.map(({ total: _total, ...r }) => r)
      : blankInput().disabilityRows,
  }
}

/** Fill in every derived number, exactly as the database does. */
export function withDerived(input: RecapInput): Pick<RecapReport, 'rows' | 'prpwd' | 'disabilityRows'> {
  const rows: RecapRow[] = input.rows.map((r) => ({ ...r, total: rowTotal(r) }))
  const prpwd: RecapPrpwd[] = input.prpwd.map((p) => ({ ...p, percentage: prpwdPercent(p.totalPwds, p.totalEncoded) }))
  const disabilityRows: RecapDisabilityRow[] = input.disabilityRows.map((r) => ({ ...r, total: disabilityRowTotal(r) }))
  return { rows, prpwd, disabilityRows }
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
  if (input.disabilityRows.length !== OFFICIAL_DISABILITY_TYPES.length) errors.push(`Disability Data needs all ${OFFICIAL_DISABILITY_TYPES.length} disability types.`)
  const fields: (keyof Omit<RecapDisabilityRow, 'total' | 'disabilityType'>)[] = [
    'female0to17', 'male0to17', 'female18to30', 'male18to30', 'female31to59', 'male31to59', 'female60above', 'male60above',
  ]
  for (const r of input.disabilityRows) {
    for (const f of fields) {
      if (!isCount(r[f])) errors.push(`${r.disabilityType}: ${f} must be a whole number of 0 or more.`)
    }
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
  if (JSON.stringify(before.disabilityRows) !== JSON.stringify(after.disabilityRows)) changes.push('Disability Data edited')
  const shown = changes.slice(0, 6)
  const more = changes.length - shown.length
  const tb = sumRows(before.rows).total
  const ta = sumRows(after.rows).total
  const head = tb !== ta ? `total ${fmt(tb)} → ${fmt(ta)}` : `total ${fmt(ta)}`
  return [head, ...shown].join('; ') + (more > 0 ? `; +${more} more` : '')
}
