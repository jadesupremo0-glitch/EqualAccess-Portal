import { supabase } from '../supabase'
import { validateInput, withDerived } from './compute'
import { SEED_REPORT } from './seedData'
import type { RecapInput, RecapReport } from './types'

/**
 * Data access for the recapitulation module.
 *
 * Online, everything goes through the admin-only Postgres functions from
 * 20260922010000_recapitulation.sql (they re-check the admin's credentials and write in one
 * transaction). Without Supabase configured, reports live in this browser's localStorage so the
 * page still works in development.
 */

/** The signed-in admin's id and password, re-verified by the database on every call. */
export interface RecapAuth {
  adminId: string
  secret: string
}

/** Another report already uses this as-of date. */
export class RecapDuplicateError extends Error {
  constructor(public existingId: string | null) {
    super('A report for this "as of" date already exists.')
    this.name = 'RecapDuplicateError'
  }
}

/** The database rejected the admin credentials (or the role has no access). */
export class RecapAuthError extends Error {
  constructor() {
    super('You are not authorized to manage the recapitulation. Please sign in again as an administrator.')
    this.name = 'RecapAuthError'
  }
}

interface DbError {
  code?: string
  message: string
  details?: string | null
}

function toError(e: DbError): Error {
  if (e.code === '42501') return new RecapAuthError()
  if (e.code === '23505' && e.message === 'duplicate_as_of') return new RecapDuplicateError(e.details ?? null)
  return new Error(e.message)
}

// ── Local fallback ─────────────────────────────────────────────────

const LOCAL_KEY = 'equalaccess-portal:recap'

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `local-${Date.now()}-${Math.random().toString(16).slice(2)}`

function fromInput(input: RecapInput, id: string, by: string, previous?: RecapReport): RecapReport {
  const now = new Date().toISOString()
  return {
    id,
    title: input.title.trim() || SEED_REPORT.title,
    asOfDate: input.asOfDate,
    status: input.status,
    showOnLanding: input.showOnLanding && input.status === 'published',
    createdBy: previous?.createdBy ?? by,
    updatedBy: by,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    ...withDerived(input),
  }
}

function localLoad(): RecapReport[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY)
    if (raw) return JSON.parse(raw) as RecapReport[]
  } catch {
    // fall through to the seed
  }
  const seeded = [fromInput(SEED_REPORT, 'seed-2026-04-30', 'seed')]
  localPersist(seeded)
  return seeded
}

function localPersist(reports: RecapReport[]): void {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(reports))
  } catch {
    // storage unavailable: changes last for this page view only
  }
}

const byNewest = (a: RecapReport, b: RecapReport) => b.asOfDate.localeCompare(a.asOfDate)

// ── Admin API ──────────────────────────────────────────────────────

/** Every snapshot (drafts included), newest first. */
export async function fetchRecapReports(auth: RecapAuth): Promise<RecapReport[]> {
  if (!supabase) return localLoad().sort(byNewest)
  const { data, error } = await supabase.rpc('get_recap_reports', { p_admin_id: auth.adminId, p_secret: auth.secret })
  if (error) throw toError(error)
  return (data ?? []) as RecapReport[]
}

/** Create (no id) or replace (id) a report with all its rows in one transaction. Returns the report id. */
export async function saveRecapReport(auth: RecapAuth, input: RecapInput): Promise<string> {
  if (!supabase) {
    const problems = validateInput(input)
    if (problems.length > 0) throw new Error(problems[0])
    const all = localLoad()
    const clash = all.find((r) => r.asOfDate === input.asOfDate && r.id !== input.id)
    if (clash) throw new RecapDuplicateError(clash.id)
    const previous = all.find((r) => r.id === input.id)
    const saved = fromInput(input, previous?.id ?? newId(), auth.adminId, previous)
    const next = all
      .filter((r) => r.id !== saved.id)
      .map((r) => (saved.showOnLanding ? { ...r, showOnLanding: false } : r))
    localPersist([...next, saved].sort(byNewest))
    return saved.id
  }

  const { data, error } = await supabase.rpc('save_recap_report', {
    p_admin_id: auth.adminId,
    p_secret: auth.secret,
    p_report_id: input.id ?? null,
    p_title: input.title,
    p_as_of: input.asOfDate,
    p_status: input.status,
    p_show_on_landing: input.showOnLanding,
    p_rows: input.rows.map((r) => ({ code: r.code, name: r.name, age0to59: r.age0to59, age60above: r.age60above })),
    p_prpwd: input.prpwd.map((p) => ({
      label: p.label,
      referenceDate: p.referenceDate || null,
      totalPwds: p.totalPwds,
      totalEncoded: p.totalEncoded,
    })),
  })
  if (error) throw toError(error)
  return data as string
}

export async function deleteRecapReport(auth: RecapAuth, id: string): Promise<void> {
  if (!supabase) {
    localPersist(localLoad().filter((r) => r.id !== id))
    return
  }
  const { error } = await supabase.rpc('delete_recap_report', { p_admin_id: auth.adminId, p_secret: auth.secret, p_report_id: id })
  if (error) throw toError(error)
}

// ── Public (landing page) ──────────────────────────────────────────

interface DbReportRow {
  id: string
  report_title: string
  as_of_date: string
  status: 'draft' | 'published'
  show_on_landing: boolean
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
  rows: { barangay_code: string; barangay_name: string; age_0_59: number; age_60_above: number; total: number; sort_order: number }[]
  prpwd: { label: string; reference_date: string | null; total_pwds: number; total_encoded: number; percentage: number; sort_order: number }[]
}

/**
 * The one published report flagged "show on landing page", or null. Read-only and public; it never
 * throws, so a missing table or a network problem simply hides the landing section.
 */
export async function fetchLandingReport(): Promise<RecapReport | null> {
  try {
    if (!supabase) return localLoad().find((r) => r.status === 'published' && r.showOnLanding) ?? null
    const { data, error } = await supabase
      .from('recapitulation_reports')
      .select('*, rows:recapitulation_barangay_rows(*), prpwd:recapitulation_prpwd_status(*)')
      .eq('status', 'published')
      .eq('show_on_landing', true)
      .limit(1)
    if (error || !data || data.length === 0) return null
    const r = data[0] as unknown as DbReportRow
    return {
      id: r.id,
      title: r.report_title,
      asOfDate: r.as_of_date,
      status: r.status,
      showOnLanding: r.show_on_landing,
      createdBy: r.created_by,
      updatedBy: r.updated_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      rows: [...r.rows]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((b) => ({ code: b.barangay_code, name: b.barangay_name, age0to59: b.age_0_59, age60above: b.age_60_above, total: b.total })),
      prpwd: [...r.prpwd]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((p) => ({ label: p.label, referenceDate: p.reference_date, totalPwds: p.total_pwds, totalEncoded: p.total_encoded, percentage: p.percentage })),
    }
  } catch {
    return null
  }
}
