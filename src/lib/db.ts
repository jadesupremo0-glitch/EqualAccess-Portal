import { supabase } from './supabase'
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

export interface JobApplicationState {
  id: string
  userId: string
  jobId: string
  jobTitle: string
  company: string
  appliedDate: string
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
  skills: 'skills',
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
  location: 'location',
  type: 'type',
  category: 'category',
  salary: 'salary',
  description: 'description',
  skills: 'skills',
  preferredSkills: 'preferred_skills',
  educationRequirement: 'education_requirement',
  experienceRequirement: 'experience_requirement',
  workSetup: 'work_setup',
  workplaceConditions: 'workplace_conditions',
  screenOrVisualDemands: 'screen_or_visual_demands',
  accessibilityInfo: 'accessibility_info',
  accessibilityFeatures: 'accessibility_features',
  physicalRequirements: 'physical_requirements',
  communicationRequirements: 'communication_requirements',
  functionalRequirements: 'functional_requirements',
  accommodationSupport: 'accommodation_support',
  postedDate: 'posted_date',
  deadline: 'deadline',
  status: 'status',
  matchPercent: 'match_percent',
  matchReasons: 'match_reasons',
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

const JOB_APPLICATION_MAP: Record<string, string> = {
  id: 'id',
  userId: 'user_id',
  jobId: 'job_id',
  jobTitle: 'job_title',
  company: 'company',
  appliedDate: 'applied_date',
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

function fromRow(row: Record<string, unknown>, map: Record<string, string>): Record<string, unknown> {
  const obj: Record<string, unknown> = {}
  for (const [key, column] of Object.entries(map)) {
    obj[key] = row[column]
  }
  return obj as Record<string, unknown>
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
  jobApplications: JobApplicationState[]
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

  const [pwds, benefits, requests, notifications, jobs, admins, feedback, activity, applications] =
    await Promise.all([
      supabase.from('pwd_users').select('*'),
      supabase.from('benefits').select('*'),
      supabase.from('assistance_requests').select('*'),
      supabase.from('notifications').select('*').order('date', { ascending: false }),
      supabase.from('jobs').select('*'),
      supabase.from('admin_users').select('*'),
      supabase.from('feedback_tickets').select('*'),
      supabase.from('activity_log').select('*').order('id', { ascending: false }),
      supabase.from('job_applications').select('*'),
    ])

  const seeded =
    (pwds.data?.length ?? 0) > 0 && (benefits.data?.length ?? 0) > 0 && (jobs.data?.length ?? 0) > 0

  return {
    state: {
      pwdUsers: (pwds.data ?? []).map((r) => fromRow(r, PWD_USER_MAP) as unknown as PWDUser),
      benefits: (benefits.data ?? []).map((r) => fromRow(r, BENEFIT_MAP) as unknown as Benefit),
      assistanceRequests: (requests.data ?? []).map((r) => fromRow(r, REQUEST_MAP) as unknown as AssistanceRequest),
      notifications: (notifications.data ?? []).map((r) => fromRow(r, NOTIFICATION_MAP) as unknown as Notification),
      jobs: (jobs.data ?? []).map((r) => fromRow(r, JOB_MAP) as unknown as Job),
      adminUsers: (admins.data ?? []).map((r) => fromRow(r, ADMIN_USER_MAP) as unknown as AdminUser),
      feedbackTickets: (feedback.data ?? []).map((r) => fromRow(r, FEEDBACK_MAP) as unknown as FeedbackTicket),
      activityLog: (activity.data ?? []).map(activityFromRow),
      jobApplications: (applications.data ?? []).map((r) => fromRow(r, JOB_APPLICATION_MAP) as unknown as JobApplicationState),
    },
    seeded,
  }
}

// ── Sync ───────────────────────────────────────────────────────────

export async function syncStateToSupabase(state: LoadedState): Promise<void> {
  if (!supabase) return

  const tasks = [
    supabase.from('pwd_users').upsert(state.pwdUsers.map((u) => toRow(u as unknown as Record<string, unknown>, PWD_USER_MAP)), { onConflict: 'id' }),
    supabase.from('benefits').upsert(state.benefits.map((b) => toRow(b as unknown as Record<string, unknown>, BENEFIT_MAP)), { onConflict: 'id' }),
    supabase.from('assistance_requests').upsert(state.assistanceRequests.map((r) => toRow(r as unknown as Record<string, unknown>, REQUEST_MAP)), { onConflict: 'id' }),
    supabase.from('notifications').upsert(state.notifications.map((n) => toRow(n as unknown as Record<string, unknown>, NOTIFICATION_MAP)), { onConflict: 'id' }),
    supabase.from('jobs').upsert(state.jobs.map((j) => toRow(j as unknown as Record<string, unknown>, JOB_MAP)), { onConflict: 'id' }),
    supabase.from('admin_users').upsert(state.adminUsers.map((a) => toRow(a as unknown as Record<string, unknown>, ADMIN_USER_MAP)), { onConflict: 'id' }),
    supabase.from('feedback_tickets').upsert(state.feedbackTickets.map((t) => toRow(t as unknown as Record<string, unknown>, FEEDBACK_MAP)), { onConflict: 'id' }),
    supabase.from('job_applications').upsert(state.jobApplications.map((a) => toRow(a as unknown as Record<string, unknown>, JOB_APPLICATION_MAP)), { onConflict: 'id' }),
    // Activity log has an auto-generated id, so replace wholesale.
    supabase.from('activity_log').delete().neq('id', 0),
  ]

  const results = await Promise.all(tasks)
  for (const r of results) {
    if (r.error) console.error('[syncStateToSupabase] table sync failed:', r.error.message)
  }
  const { error: activityErr } = await supabase.from('activity_log').insert(state.activityLog.map(activityToRow))
  if (activityErr) console.error('[syncStateToSupabase] activity_log sync failed:', activityErr.message)
}

export async function resetSupabaseData(seed: LoadedState): Promise<void> {
  if (!supabase) return
  const results = await Promise.all([
    supabase.from('pwd_users').delete().neq('id', ''),
    supabase.from('benefits').delete().neq('id', ''),
    supabase.from('assistance_requests').delete().neq('id', ''),
    supabase.from('notifications').delete().neq('id', ''),
    supabase.from('jobs').delete().neq('id', ''),
    supabase.from('admin_users').delete().neq('id', ''),
    supabase.from('feedback_tickets').delete().neq('id', ''),
    supabase.from('job_applications').delete().neq('id', ''),
    supabase.from('activity_log').delete().neq('id', 0),
  ])
  for (const r of results) {
    if (r.error) console.error('[resetSupabaseData] table reset failed:', r.error.message)
  }
  await syncStateToSupabase(seed)
}