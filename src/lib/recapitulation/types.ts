/** One barangay line of the recapitulation. `total` is always age0to59 + age60above (computed, never typed in). */
export interface RecapRow {
  code: string
  name: string
  age0to59: number
  age60above: number
  total: number
}

/** DOH PRPWD encoding progress. `percentage` is round(totalEncoded / totalPwds × 100), 0 when there are no PWDs. */
export interface RecapPrpwd {
  label: string
  referenceDate: string | null
  totalPwds: number
  totalEncoded: number
  percentage: number
}

export type RecapStatus = 'draft' | 'published'

/** One disability-type line of the Disability Data matrix: counts by age bracket and sex. `total` is
 * always the sum of all eight cells (computed, never typed in). */
export interface RecapDisabilityRow {
  disabilityType: string
  female0to17: number
  male0to17: number
  female18to30: number
  male18to30: number
  female31to59: number
  male31to59: number
  female60above: number
  male60above: number
  total: number
}

/** A saved snapshot, as returned by the database. */
export interface RecapReport {
  id: string
  title: string
  /** YYYY-MM-DD */
  asOfDate: string
  status: RecapStatus
  showOnLanding: boolean
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
  rows: RecapRow[]
  prpwd: RecapPrpwd[]
  disabilityRows: RecapDisabilityRow[]
}

/** What the editor submits. Only raw counts: totals and percentages are derived. */
export interface RecapInput {
  /** Present when updating an existing report. */
  id?: string
  title: string
  asOfDate: string
  status: RecapStatus
  showOnLanding: boolean
  rows: { code: string; name: string; age0to59: number; age60above: number }[]
  prpwd: { label: string; referenceDate: string | null; totalPwds: number; totalEncoded: number }[]
  disabilityRows: Omit<RecapDisabilityRow, 'total'>[]
}

export interface RecapTotals {
  age0to59: number
  age60above: number
  total: number
}

export const AGE_GROUPS = ['0-17', '18-30', '31-59', '60+'] as const
export type AgeGroup = (typeof AGE_GROUPS)[number]

export const AGE_GROUP_LABEL: Record<AgeGroup, string> = {
  '0-17': '0 mo.–17 yrs',
  '18-30': '18–30 yrs',
  '31-59': '31–59 yrs',
  '60+': '60 yrs and above',
}

/** Totals of the Disability Data matrix: grand total, per sex, and per age group (both sexes). */
export interface RecapDisabilityTotals {
  grandTotal: number
  female: number
  male: number
  byAgeGroup: Record<AgeGroup, number>
}
