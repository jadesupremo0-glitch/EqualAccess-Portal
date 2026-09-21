import { supabase } from './supabase'
import { normalizeJob, normalizeUser } from './normalize'
import type { RawStats } from './stats'
import type {
  PWDUser,
  Benefit,
  AssistanceRequest,
  Notification,
  Job,
  AdminUser,
  FeedbackTicket,
} from '../data'

export interface DataActivityEntry {
  user: string
  action: string
  date: string
  time: string
  activity: string
}

// ── Field maps (entity key → database column) ─────────────────────

const PWD_USER_MAP: Record<string, string> = {
  id: 'id',
  username: 'username',
  password: 'password',
  name: 'name',
  address: 'address',
  barangay: 'barangay',
  age: 'age',
  contact: 'contact',
  email: 'email',
  disabilityType: 'disability_type',
  verificationStatus: 'verification_status',
  dateRegistered: 'date_registered',
  pwdIdNumber: 'pwd_id_number',
  avatar: 'avatar',
  active: 'active',
  deletedAt: 'deleted_at',
  skills: 'skills',
  educationLevel: 'education_level',
  education: 'education',
  workExperience: 'work_experience',
  yearsOfExperience: 'years_of_experience',
  certifications: 'certifications',
  jobInterests: 'job_interests',
  preferredJobTypes: 'preferred_job_types',
  preferredWorkSetup: 'preferred_work_setup',
  preferredLocation: 'preferred_location',
  functionalCapabilities: 'functional_capabilities',
  accessibilityNeeds: 'accessibility_needs',
  accommodationRequirements: 'accommodation_requirements',
  savedJobIds: 'saved_job_ids',
}

const BENEFIT_MAP: Record<string, string> = {
  id: 'id',
  name: 'name',
  category: 'category',
  description: 'description',
  eligibility: 'eligibility',
  barangay: 'barangay',
  applicationDeadline: 'application_deadline',
  date: 'date',
  time: 'time',
  status: 'status',
  requirements: 'requirements',
  benefits: 'benefits',
  contactPerson: 'contact_person',
  contactNumber: 'contact_number',
}

const REQUEST_MAP: Record<string, string> = {
  id: 'id',
  pwdName: 'pwd_name',
  pwdId: 'pwd_id',
  type: 'type',
  title: 'title',
  description: 'description',
  dateSubmitted: 'date_submitted',
  lastUpdated: 'last_updated',
  status: 'status',
  assignedStaff: 'assigned_staff',
  comments: 'comments',
  timeline: 'timeline',
}

const NOTIFICATION_MAP: Record<string, string> = {
  id: 'id',
  type: 'type',
  title: 'title',
  message: 'message',
  date: 'date',
  read: 'read',
  userId: 'user_id',
}

const JOB_MAP: Record<string, string> = {
  id: 'id',
  title: 'title',
  company: 'company',
  description: 'description',
  location: 'location',
  employmentType: 'employment_type',
  workArrangement: 'work_arrangement',
  skills: 'skills',
  minEducation: 'min_education',
  suitableDisabilities: 'suitable_disabilities',
  accommodations: 'accommodations',
  slots: 'slots',
  deadline: 'deadline',
  status: 'status',
  postedDate: 'posted_date',
  salary: 'salary',
  category: 'category',
  accessibilityInfo: 'accessibility_info',
}

// Columns from the pre-v3 job schema. Read-only: they let an un-migrated row be understood,
// but they are never written back.
const JOB_LEGACY_READ_MAP: Record<string, string> = {
  type: 'type',
  workSetup: 'work_setup',
  educationRequirement: 'education_requirement',
  accessibilityFeatures: 'accessibility_features',
  workplaceConditions: 'workplace_conditions',
  accommodationSupport: 'accommodation_support',
}

const ADMIN_USER_MAP: Record<string, string> = {
  id: 'id',
  name: 'name',
  position: 'position',
  username: 'username',
  password: 'password',
  contact: 'contact',
  email: 'email',
  role: 'role',
  status: 'status',
  lastLogin: 'last_login',
  dateCreated: 'date_created',
}

const FEEDBACK_MAP: Record<string, string> = {
  id: 'id',
  pwdName: 'pwd_name',
  isAnonymous: 'is_anonymous',
  subject: 'subject',
  category: 'category',
  message: 'message',
  dateSubmitted: 'date_submitted',
  status: 'status',
  assignedStaff: 'assigned_staff',
  responses: 'responses',
  userId: 'user_id',
}

// ── Generic converters ─────────────────────────────────────────────

function toRow(obj: Record<string, unknown>, map: Record<string, string>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  for (const [key, column] of Object.entries(map)) {
    const value = obj[key]
    if (value !== undefined) row[column] = value
  }
  return row
}

/** SQL NULLs are read as "absent" so a round trip matches what the app holds in memory. */
function fromRow(row: Record<string, unknown>, map: Record<string, string>): Record<string, unknown> {
  const obj: Record<string, unknown> = {}
  for (const [key, column] of Object.entries(map)) {
    const value = row[column]
    if (value !== null && value !== undefined) obj[key] = value
  }
  return obj
}

export interface LoadedState {
  pwdUsers: PWDUser[]
  benefits: Benefit[]
  assistanceRequests: AssistanceRequest[]
  notifications: Notification[]
  jobs: Job[]
  adminUsers: AdminUser[]
  feedbackTickets: FeedbackTicket[]
  activityLog: DataActivityEntry[]
}

export const EMPTY_STATE: LoadedState = {
  pwdUsers: [],
  benefits: [],
  assistanceRequests: [],
  notifications: [],
  jobs: [],
  adminUsers: [],
  feedbackTickets: [],
  activityLog: [],
}

const activityToRow = (a: DataActivityEntry): Record<string, unknown> => ({
  user: a.user,
  action: a.action,
  date: a.date,
  time: a.time,
  activity: a.activity,
})

const activityFromRow = (r: Record<string, unknown>): DataActivityEntry => ({
  user: (r.user as string) ?? '',
  action: (r.action as string) ?? '',
  date: (r.date as string) ?? '',
  time: (r.time as string) ?? '',
  activity: (r.activity as string) ?? '',
})

// ── Load ───────────────────────────────────────────────────────────

export async function loadStateFromSupabase(): Promise<{ state: LoadedState; seeded: boolean } | null> {
  if (!supabase) return null

  const [pwds, benefits, requests, notifications, jobs, admins, feedback, activity] =
    await Promise.all([
      supabase.from('pwd_users').select('*'),
      supabase.from('benefits').select('*'),
      supabase.from('assistance_requests').select('*'),
      supabase.from('notifications').select('*').order('date', { ascending: false }),
      supabase.from('jobs').select('*'),
      supabase.from('admin_users').select('*'),
      supabase.from('feedback_tickets').select('*'),
      supabase.from('activity_log').select('*').order('id', { ascending: false }),
    ])

  // A failed read must never look like "the database is empty" — that would trigger a re-seed.
  const failed = [pwds, benefits, requests, notifications, jobs, admins, feedback, activity].find((r) => r.error)
  if (failed?.error) throw new Error(failed.error.message)

  const seeded =
    (pwds.data?.length ?? 0) > 0 && (benefits.data?.length ?? 0) > 0 && (jobs.data?.length ?? 0) > 0

  return {
    state: {
      pwdUsers: (pwds.data ?? []).map((r) => normalizeUser(fromRow(r, PWD_USER_MAP) as unknown as PWDUser)),
      benefits: (benefits.data ?? []).map((r) => fromRow(r, BENEFIT_MAP) as unknown as Benefit),
      assistanceRequests: (requests.data ?? []).map((r) => fromRow(r, REQUEST_MAP) as unknown as AssistanceRequest),
      notifications: (notifications.data ?? []).map((r) => fromRow(r, NOTIFICATION_MAP) as unknown as Notification),
      jobs: (jobs.data ?? []).map((r) => normalizeJob({ ...fromRow(r, JOB_LEGACY_READ_MAP), ...fromRow(r, JOB_MAP) })),
      adminUsers: (admins.data ?? []).map((r) => fromRow(r, ADMIN_USER_MAP) as unknown as AdminUser),
      feedbackTickets: (feedback.data ?? []).map((r) => fromRow(r, FEEDBACK_MAP) as unknown as FeedbackTicket),
      activityLog: (activity.data ?? []).map(activityFromRow),
    },
    seeded,
  }
}

// ── Aggregates (server-side) ───────────────────────────────────────

/** Runs the `dashboard_stats()` Postgres function: every dashboard number, computed in the database. */
export async function fetchDashboardStats(): Promise<RawStats> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.rpc('dashboard_stats')
  if (error) throw new Error(error.message)
  const raw = data as Partial<RawStats> | null
  if (!raw || typeof raw.totalPwds !== 'number' || typeof raw.totalRequests !== 'number') {
    throw new Error('dashboard_stats() returned an unexpected payload.')
  }
  return {
    totalPwds: raw.totalPwds,
    verifiedPwds: Number(raw.verifiedPwds ?? 0),
    pendingPwds: Number(raw.pendingPwds ?? 0),
    rejectedPwds: Number(raw.rejectedPwds ?? 0),
    newThisMonth: Number(raw.newThisMonth ?? 0),
    totalRequests: raw.totalRequests,
    approvedRequests: Number(raw.approvedRequests ?? 0),
    pendingRequests: Number(raw.pendingRequests ?? 0),
    rejectedRequests: Number(raw.rejectedRequests ?? 0),
    requestsByMonth: raw.requestsByMonth ?? [],
    pwdsByBarangay: raw.pwdsByBarangay ?? [],
    pwdsByDisability: raw.pwdsByDisability ?? [],
    requestsByType: raw.requestsByType ?? [],
  }
}

// ── Sync ───────────────────────────────────────────────────────────

interface TableSpec {
  table: string
  key: Exclude<keyof LoadedState, 'activityLog'>
  map: Record<string, string>
}

const TABLES: TableSpec[] = [
  { table: 'pwd_users', key: 'pwdUsers', map: PWD_USER_MAP },
  { table: 'benefits', key: 'benefits', map: BENEFIT_MAP },
  { table: 'assistance_requests', key: 'assistanceRequests', map: REQUEST_MAP },
  { table: 'notifications', key: 'notifications', map: NOTIFICATION_MAP },
  { table: 'jobs', key: 'jobs', map: JOB_MAP },
  { table: 'admin_users', key: 'adminUsers', map: ADMIN_USER_MAP },
  { table: 'feedback_tickets', key: 'feedbackTickets', map: FEEDBACK_MAP },
]

/**
 * Push only what changed between two states: rows whose object identity changed are
 * upserted, rows that disappeared are deleted. Unchanged rows are never rewritten, so a
 * stale browser can no longer overwrite other people's edits to rows it didn't touch.
 * Throws if any table failed, leaving the caller free to retry the same diff.
 */
export async function syncStateToSupabase(prev: LoadedState, next: LoadedState): Promise<void> {
  if (!supabase) return
  const client = supabase

  const tasks: PromiseLike<{ error: { message: string } | null }>[] = []
  for (const { table, key, map } of TABLES) {
    const before = new Map((prev[key] as { id: string }[]).map((r) => [r.id, r]))
    const after = next[key] as { id: string }[]
    const changed = after.filter((r) => before.get(r.id) !== r)
    const nextIds = new Set(after.map((r) => r.id))
    const removed = [...before.keys()].filter((id) => !nextIds.has(id))

    if (changed.length > 0) {
      tasks.push(client.from(table).upsert(changed.map((r) => toRow(r as unknown as Record<string, unknown>, map)), { onConflict: 'id' }))
    }
    if (removed.length > 0) tasks.push(client.from(table).delete().in('id', removed))
  }

  const results = await Promise.all(tasks)
  const errors = results.map((r) => r.error?.message).filter((m): m is string => Boolean(m))

  // The activity log has an auto-generated id, so it is replaced wholesale when it changed.
  if (prev.activityLog !== next.activityLog) {
    const cleared = await client.from('activity_log').delete().neq('id', 0)
    if (cleared.error) errors.push(cleared.error.message)
    else if (next.activityLog.length > 0) {
      const inserted = await client.from('activity_log').insert(next.activityLog.map(activityToRow))
      if (inserted.error) errors.push(inserted.error.message)
    }
  }

  if (errors.length > 0) throw new Error([...new Set(errors)].join('; '))
}

export async function resetSupabaseData(seed: LoadedState): Promise<void> {
  if (!supabase) return
  const results = await Promise.all([
    ...TABLES.map(({ table }) => supabase!.from(table).delete().neq('id', '')),
    supabase.from('activity_log').delete().neq('id', 0),
  ])
  for (const r of results) {
    if (r.error) console.error('[resetSupabaseData] table reset failed:', r.error.message)
  }
  await syncStateToSupabase(EMPTY_STATE, seed)
}
