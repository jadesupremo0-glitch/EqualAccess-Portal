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
}

export interface RecapTotals {
  age0to59: number
  age60above: number
  total: number
}
