import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  pwdUsers as seedPWDUsers,
  benefits as seedBenefits,
  assistanceRequests as seedRequests,
  notifications as seedNotifications,
  jobs as seedJobs,
  adminUsers as seedAdminUsers,
  feedbackTickets as seedFeedback,
  activityLog as seedActivityLog,
  type PWDUser,
  type Benefit,
  type AssistanceRequest,
  type Notification,
  type Job,
  type AdminUser,
  type FeedbackTicket,
  type RequestStatus,
  type VerificationStatus,
  type DisabilityType,
  type BenefitCategory,
} from './data'

// ── Persistence ────────────────────────────────────────────────────
const STORAGE_KEY = 'equalaccess-portal:v1'

export interface ActivityEntry {
  user: string
  action: string
  date: string
  time: string
  activity: string
}

export interface JobApplication {
  id: string
  userId: string
  jobId: string
  jobTitle: string
  company: string
  appliedDate: string
}

interface AppState {
  pwdUsers: PWDUser[]
  benefits: Benefit[]
  assistanceRequests: AssistanceRequest[]
  notifications: Notification[]
  jobs: Job[]
  adminUsers: AdminUser[]
  feedbackTickets: FeedbackTicket[]
  activityLog: ActivityEntry[]
  jobApplications: JobApplication[]
}

function today(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function nowTime(): string {
  const d = new Date()
  let h = d.getHours()
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${String(h).padStart(2, '0')}:${m} ${ampm}`
}

function nextId(prefix: string, items: { id: string }[]): string {
  const re = new RegExp(`^${prefix}-(\\d+)$`)
  let max = 0
  for (const it of items) {
    const m = it.id.match(re)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return `${prefix}-${String(max + 1).padStart(3, '0')}`
}

function nextPWDId(): string {
  const year = new Date().getFullYear()
  const prefix = `PWD-LB-${year}-`
  const max = seedPWDUsers
    .filter((u) => u.id.startsWith(prefix))
    .reduce((m, u) => {
      const n = parseInt(u.id.slice(prefix.length), 10)
      return Number.isFinite(n) ? Math.max(m, n) : m
    }, 0)
  return `${prefix}${String(max + 1).padStart(4, '0')}`
}

function nextPWDIdNumber(disability: DisabilityType): string {
  const year = new Date().getFullYear()
  const code: Partial<Record<DisabilityType, string>> = {
    'Visual Impairment': 'VIS',
    'Hearing Impairment': 'HEA',
    'Physical Disability': 'PHY',
    'Mental Disability': 'MEN',
    'Chronic Illness': 'CHR',
    'Learning Disability': 'LEA',
    'Psychosocial Disability': 'PSY',
    Other: 'OTH',
  }
  const n = Math.floor(100 + Math.random() * 900)
  return `LB-${code[disability] ?? 'OTH'}-${year}-${String(n).padStart(5, '0')}`
}

const DISABILITY_LABELS: Record<string, DisabilityType> = {
  visual: 'Visual Impairment',
  hearing: 'Hearing Impairment',
  physical: 'Physical Disability',
  mental: 'Mental Disability',
  chronic: 'Chronic Illness',
  learning: 'Learning Disability',
  psychosocial: 'Psychosocial Disability',
  other: 'Other',
}

function makeTimeline(status: RequestStatus, date: string) {
  const order = ['Submitted', 'Under Review', 'Requirements Needed', 'Approved / Rejected', 'Processing', 'Completed']
  let done = 0
  let active: number | null = 0
  switch (status) {
    case 'Pending': done = 0; active = 0; break
    case 'Under Review': done = 1; active = 1; break
    case 'Requirements Needed': done = 2; active = 2; break
    case 'Approved': done = 3; active = 4; break
    case 'Rejected': done = 3; active = null; break
    case 'Completed': done = 5; active = null; break
  }
  return order.map((step, i) => ({
    step,
    date: i <= done ? date : '',
    completed: i <= done,
    active: i === active,
  }))
}

function mergeTimeline(prev: AssistanceRequest['timeline'], status: RequestStatus, date: string) {
  const order = ['Submitted', 'Under Review', 'Requirements Needed', 'Approved / Rejected', 'Processing', 'Completed']
  let done = 0
  let active: number | null = 0
  switch (status) {
    case 'Pending': done = 0; active = 0; break
    case 'Under Review': done = 1; active = 1; break
    case 'Requirements Needed': done = 2; active = 2; break
    case 'Approved': done = 3; active = 4; break
    case 'Rejected': done = 3; active = null; break
    case 'Completed': done = 5; active = null; break
  }
  return order.map((step, i) => {
    const completed = i <= done
    const prevStep = prev.find((s) => s.step === step)
    return {
      step,
      date: completed ? (prevStep?.date || date) : '',
      completed,
      active: i === active,
    }
  })
}

// ── Seed / load ────────────────────────────────────────────────────
function loadState(): AppState {
  const fallback: AppState = {
    pwdUsers: seedPWDUsers,
    benefits: seedBenefits,
    assistanceRequests: seedRequests,
    notifications: seedNotifications,
    jobs: seedJobs,
    adminUsers: seedAdminUsers,
    feedbackTickets: seedFeedback,
    activityLog: seedActivityLog,
    jobApplications: [],
  }
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<AppState>
    return {
      pwdUsers: parsed.pwdUsers ?? seedPWDUsers,
      benefits: parsed.benefits ?? seedBenefits,
      assistanceRequests: parsed.assistanceRequests ?? seedRequests,
      notifications: parsed.notifications ?? seedNotifications,
      jobs: parsed.jobs ?? seedJobs,
      adminUsers: parsed.adminUsers ?? seedAdminUsers,
      feedbackTickets: parsed.feedbackTickets ?? seedFeedback,
      activityLog: parsed.activityLog ?? seedActivityLog,
      jobApplications: parsed.jobApplications ?? [],
    }
  } catch {
    return fallback
  }
}

// ── Inputs ─────────────────────────────────────────────────────────
export interface RegisterInput {
  fullName: string
  address: string
  barangay: string
  contact: string
  email: string
  disabilityType: string
  otherDisability?: string
  username: string
  password: string
}

export interface BenefitInput {
  name: string
  category: BenefitCategory
  description: string
  eligibility: string
  barangay: string
  date: string
  time: string
  deadline: string
  status: 'Active' | 'Inactive' | 'Upcoming'
  requirements: string[]
  benefits: string[]
  contactPerson: string
  contactNumber: string
}

export interface AdminUserInput {
  name: string
  position: string
  username: string
  password: string
  role: AdminUser['role']
}

// ── Store context ──────────────────────────────────────────────────
interface StoreContextValue extends AppState {
  // navigation / search helpers
  globalSearch: string
  setGlobalSearch: (v: string) => void
  requestDraft: { type?: string; title?: string } | null
  setRequestDraft: (draft: { type?: string; title?: string } | null) => void

  // PWD
  registerPWD: (input: RegisterInput) => { ok: boolean; error?: string }
  updateProfile: (userId: string, patch: Partial<PWDUser>) => void
  changePassword: (userId: string, current: string, next: string) => string | null
  addRequest: (userId: string, input: { type: string; title: string; description: string }) => AssistanceRequest
  submitFeedback: (userId: string, input: { category: string; subject: string; message: string; anonymous: boolean }) => FeedbackTicket
  addFeedbackReply: (ticketId: string, author: string, message: string) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  applyToJob: (userId: string, job: Job) => void

  // Admin — PWD
  verifyPWD: (userId: string, status: 'Verified' | 'Rejected') => void
  updatePWD: (userId: string, patch: Partial<PWDUser>) => void
  deactivatePWD: (userId: string) => void
  reactivatePWD: (userId: string) => void

  // Admin — benefits
  addBenefit: (input: BenefitInput) => void
  updateBenefit: (id: string, patch: Partial<Benefit>) => void
  deleteBenefit: (id: string) => void
  toggleBenefitStatus: (id: string) => void

  // Admin — requests
  updateRequestStatus: (requestId: string, status: RequestStatus, comment?: string) => void
  addRequestComment: (requestId: string, author: string, message: string) => void

  // Admin — feedback
  addFeedbackResponse: (ticketId: string, input: { author: string; message: string; isInternal?: boolean }) => void
  setFeedbackStatus: (ticketId: string, status: FeedbackTicket['status']) => void

  // Admin — users
  addAdminUser: (input: AdminUserInput) => string | null
  updateAdminUser: (id: string, patch: Partial<AdminUser>) => void
  toggleAdminStatus: (id: string) => void
  resetAdminPassword: (id: string, password?: string) => void
  deleteAdminUser: (id: string) => void

  // Admin — misc
  logActivity: (action: string, activity: string) => void
  resetData: () => void
}

const StoreContext = createContext<StoreContextValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState)
  const [globalSearch, setGlobalSearch] = useState('')
  const [requestDraft, setRequestDraft] = useState<{ type?: string; title?: string } | null>(null)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // storage unavailable — run in-memory
    }
  }, [state])

  const addNotification = (s: AppState, title: string, message: string, type: Notification['type'], userId?: string): AppState => ({
    ...s,
    notifications: [
      {
        id: nextId('NOT', s.notifications),
        type,
        title,
        message,
        date: today(),
        read: false,
        ...(userId ? { userId } : {}),
      },
      ...s.notifications,
    ],
  })

  const log = (s: AppState, user: string, action: string, activity: string): AppState => ({
    ...s,
    activityLog: [{ user, action, date: today(), time: nowTime(), activity }, ...s.activityLog],
  })

  const value: StoreContextValue = {
    ...state,
    globalSearch,
    setGlobalSearch,
    requestDraft,
    setRequestDraft,

    registerPWD(input) {
      let error = ''
      setState((s) => {
        if (s.pwdUsers.some((u) => u.username === input.username.trim())) {
          error = 'That username is already taken. Please choose another.'
          return s
        }
        const disability = DISABILITY_LABELS[input.disabilityType] ?? (input.otherDisability?.trim() ? 'Other' as DisabilityType : 'Other')
        const user: PWDUser = {
          id: nextPWDId(),
          username: input.username.trim(),
          password: input.password,
          name: input.fullName.trim(),
          address: input.address.trim(),
          barangay: input.barangay.trim(),
          contact: input.contact.trim(),
          email: input.email.trim(),
          disabilityType: disability,
          verificationStatus: 'Pending',
          dateRegistered: today(),
          pwdIdNumber: nextPWDIdNumber(disability),
          skills: [],
        }
        let next: AppState = { ...s, pwdUsers: [...s.pwdUsers, user] }
        next = addNotification(
          next,
          'Welcome to EqualAccess Portal',
          `Your registration has been received. PDAO will verify your account within 3–5 business days. Your reference ID is ${user.id}.`,
          'info',
          user.id,
        )
        next = log(next, user.username, 'Registered', `New PWD registration submitted for ${user.name} (${user.id})`)
        return next
      })
      return error ? { ok: false, error } : { ok: true }
    },

    updateProfile(userId, patch) {
      setState((s) => {
        const name = patch.name
        return {
          ...s,
          pwdUsers: s.pwdUsers.map((u) => (u.id === userId ? { ...u, ...patch } : u)),
          assistanceRequests: name
            ? s.assistanceRequests.map((r) => (r.pwdId === userId ? { ...r, pwdName: name } : r))
            : s.assistanceRequests,
          feedbackTickets: name
            ? s.feedbackTickets.map((t) => (t.pwdName === s.pwdUsers.find((u) => u.id === userId)?.name ? { ...t, pwdName: name } : t))
            : s.feedbackTickets,
        }
      })
    },

    changePassword(userId, current, next) {
      const user = state.pwdUsers.find((u) => u.id === userId)
      if (!user) return 'User not found.'
      if (user.password !== current) return 'Current password is incorrect.'
      if (next.length < 8) return 'New password must be at least 8 characters.'
      setState((s) => ({ ...s, pwdUsers: s.pwdUsers.map((u) => (u.id === userId ? { ...u, password: next } : u)) }))
      return null
    },

    addRequest(userId, input) {
      const user = state.pwdUsers.find((u) => u.id === userId) ?? state.pwdUsers[0]
      const req: AssistanceRequest = {
        id: nextId('REQ-LB-' + new Date().getFullYear(), state.assistanceRequests),
        pwdName: user?.name ?? 'PWD User',
        pwdId: userId,
        type: input.type,
        title: input.title,
        description: input.description,
        dateSubmitted: today(),
        lastUpdated: today(),
        status: 'Pending',
        assignedStaff: 'Unassigned',
        comments: [],
        timeline: makeTimeline('Pending', today()),
      }
      setState((s) => {
        let next: AppState = { ...s, assistanceRequests: [req, ...s.assistanceRequests] }
        next = addNotification(next, 'Request Submitted', `Your request "${input.title}" (${req.id}) has been received and is pending review.`, 'info', userId)
        next = log(next, user?.username ?? userId, 'Submitted Request', `New assistance request ${req.id} submitted by ${user?.name ?? userId}`)
        return next
      })
      return req
    },

    submitFeedback(userId, input) {
      const user = state.pwdUsers.find((u) => u.id === userId) ?? state.pwdUsers[0]
      const ticket: FeedbackTicket = {
        id: nextId('TKT-LB-' + new Date().getFullYear(), state.feedbackTickets),
        pwdName: input.anonymous ? 'Anonymous' : (user?.name ?? 'PWD User'),
        isAnonymous: input.anonymous,
        subject: input.subject,
        category: input.category as FeedbackTicket['category'],
        message: input.message,
        dateSubmitted: today(),
        status: 'Open',
        assignedStaff: 'Unassigned',
        responses: [],
        ...(input.anonymous && user ? { userId } : {}),
        ...(!input.anonymous && user ? { userId } : {}),
      }
      setState((s) => ({
        ...s,
        feedbackTickets: [ticket, ...s.feedbackTickets],
      }))
      return ticket
    },

    addFeedbackReply(ticketId, author, message) {
      setState((s) => ({
        ...s,
        feedbackTickets: s.feedbackTickets.map((t) =>
          t.id === ticketId
            ? {
                ...t,
                status: t.status === 'Closed' ? t.status : 'In Progress',
                responses: [...t.responses, { author, date: today(), message }],
              }
            : t,
        ),
      }))
    },

    markNotificationRead(id) {
      setState((s) => ({ ...s, notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }))
    },

    markAllNotificationsRead() {
      setState((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) }))
    },

    applyToJob(userId, job) {
      setState((s) => {
        let next: AppState = {
          ...s,
          jobApplications: [
            {
              id: nextId('APP', s.jobApplications),
              userId,
              jobId: job.id,
              jobTitle: job.title,
              company: job.company,
              appliedDate: today(),
            },
            ...s.jobApplications,
          ],
        }
        next = addNotification(next, 'Application Submitted', `Your application for ${job.title} at ${job.company} has been submitted.`, 'success', userId)
        return next
      })
    },

    verifyPWD(userId, status) {
      setState((s) => {
        const user = s.pwdUsers.find((u) => u.id === userId)
        let next: AppState = {
          ...s,
          pwdUsers: s.pwdUsers.map((u) =>
            u.id === userId ? { ...u, verificationStatus: status as VerificationStatus, ...(status === 'Verified' ? { active: true } : {}) } : u,
          ),
        }
        next = addNotification(
          next,
          status === 'Verified' ? 'Account Verified' : 'Verification Rejected',
          status === 'Verified'
            ? `Your EqualAccess Portal account has been verified. You now have full access to all benefits and programs.`
            : `Your registration was not approved. Please contact the PDAO office for assistance.`,
          status === 'Verified' ? 'success' : 'error',
          userId,
        )
        next = log(
          next,
          'pdao.admin',
          status === 'Verified' ? 'Verified PWD Account' : 'Rejected PWD Verification',
          `${status === 'Verified' ? 'Verified' : 'Rejected'} account for ${userId} (${user?.name ?? 'Unknown'})`,
        )
        return next
      })
    },

    updatePWD(userId, patch) {
      setState((s) => ({
        ...s,
        pwdUsers: s.pwdUsers.map((u) => (u.id === userId ? { ...u, ...patch } : u)),
      }))
    },

    deactivatePWD(userId) {
      setState((s) => {
        const user = s.pwdUsers.find((u) => u.id === userId)
        let next: AppState = { ...s, pwdUsers: s.pwdUsers.map((u) => (u.id === userId ? { ...u, active: false } : u)) }
        next = log(next, 'pdao.admin', 'Deactivated Account', `Deactivated PWD account ${userId} (${user?.name ?? 'Unknown'})`)
        return next
      })
    },

    reactivatePWD(userId) {
      setState((s) => {
        const user = s.pwdUsers.find((u) => u.id === userId)
        let next: AppState = {
          ...s,
          pwdUsers: s.pwdUsers.map((u) => (u.id === userId ? { ...u, active: true, verificationStatus: 'Verified' as VerificationStatus } : u)),
        }
        next = log(next, 'pdao.admin', 'Reactivated Account', `Reactivated PWD account ${userId} (${user?.name ?? 'Unknown'})`)
        return next
      })
    },

    addBenefit(input) {
      setState((s) => {
        const benefit: Benefit = {
          id: nextId('BEN', s.benefits),
          name: input.name,
          category: input.category,
          description: input.description,
          eligibility: input.eligibility || 'All verified PWDs of Los Baños',
          barangay: input.barangay || 'All Barangays',
          applicationDeadline: input.deadline,
          date: input.date,
          time: input.time,
          status: input.status,
          requirements: input.requirements,
          benefits: input.benefits,
          contactPerson: input.contactPerson || 'PDAO Office',
          contactNumber: input.contactNumber || '+63 49 536 0050',
        }
        let next: AppState = { ...s, benefits: [benefit, ...s.benefits] }
        next = log(next, 'pdao.admin', 'Added New Program', `Created benefit program ${benefit.name} (${benefit.id})`)
        return next
      })
    },

    updateBenefit(id, patch) {
      setState((s) => ({
        ...s,
        benefits: s.benefits.map((b) => (b.id === id ? { ...b, ...patch } : b)),
      }))
    },

    deleteBenefit(id) {
      setState((s) => {
        const b = s.benefits.find((x) => x.id === id)
        let next: AppState = { ...s, benefits: s.benefits.filter((x) => x.id !== id) }
        next = log(next, 'pdao.admin', 'Deleted Program', `Deleted benefit program ${b?.name ?? id}`)
        return next
      })
    },

    toggleBenefitStatus(id) {
      setState((s) => ({
        ...s,
        benefits: s.benefits.map((b) => (b.id === id ? { ...b, status: b.status === 'Active' ? 'Inactive' : 'Active' } : b)),
      }))
    },

    updateRequestStatus(requestId, status, comment) {
      setState((s) => {
        const req = s.assistanceRequests.find((r) => r.id === requestId)
        if (!req) return s
        let next: AppState = {
          ...s,
          assistanceRequests: s.assistanceRequests.map((r) =>
            r.id === requestId
              ? {
                  ...r,
                  status,
                  lastUpdated: today(),
                  timeline: mergeTimeline(r.timeline, status, today()),
                  comments: comment ? [...r.comments, { author: 'PDAO Staff', date: today(), message: comment }] : r.comments,
                }
              : r,
          ),
        }
        next = addNotification(
          next,
          `Request ${status}`,
          `Your request ${requestId} (${req.title}) has been updated to "${status}".`,
          status === 'Rejected' ? 'error' : status === 'Approved' || status === 'Completed' ? 'success' : 'info',
          req.pwdId,
        )
        next = log(next, 'pdao.staff', 'Updated Request Status', `Updated ${requestId} to ${status}`)
        return next
      })
    },

    addRequestComment(requestId, author, message) {
      setState((s) => {
        const req = s.assistanceRequests.find((r) => r.id === requestId)
        if (!req) return s
        let next: AppState = {
          ...s,
          assistanceRequests: s.assistanceRequests.map((r) =>
            r.id === requestId
              ? { ...r, lastUpdated: today(), comments: [...r.comments, { author, date: today(), message }] }
              : r,
          ),
        }
        next = addNotification(next, 'New Comment on Your Request', `${author} commented on request ${requestId}.`, 'info', req.pwdId)
        return next
      })
    },

    addFeedbackResponse(ticketId, input) {
      setState((s) => ({
        ...s,
        feedbackTickets: s.feedbackTickets.map((t) =>
          t.id === ticketId
            ? {
                ...t,
                status: input.isInternal ? t.status : t.status === 'Closed' ? t.status : 'In Progress',
                responses: [...t.responses, { author: input.author, date: today(), message: input.message, isInternal: input.isInternal }],
              }
            : t,
        ),
      }))
    },

    setFeedbackStatus(ticketId, status) {
      setState((s) => ({
        ...s,
        feedbackTickets: s.feedbackTickets.map((t) => (t.id === ticketId ? { ...t, status } : t)),
      }))
    },

    addAdminUser(input) {
      let error = ''
      setState((s) => {
        if (s.adminUsers.some((u) => u.username === input.username.trim())) {
          error = 'That username is already taken.'
          return s
        }
        const user: AdminUser = {
          id: nextId('ADM', s.adminUsers),
          name: input.name,
          position: input.position || input.role,
          username: input.username.trim(),
          password: input.password || 'admin123',
          role: input.role,
          status: 'Active',
          lastLogin: 'Never',
          dateCreated: today(),
        }
        let next: AppState = { ...s, adminUsers: [...s.adminUsers, user] }
        next = log(next, 'pdao.admin', 'Added Admin User', `Created admin account ${user.username} (${user.id})`)
        return next
      })
      return error ? error : null
    },

    updateAdminUser(id, patch) {
      setState((s) => ({ ...s, adminUsers: s.adminUsers.map((u) => (u.id === id ? { ...u, ...patch } : u)) }))
    },

    toggleAdminStatus(id) {
      setState((s) => {
        const u = s.adminUsers.find((x) => x.id === id)
        let next: AppState = {
          ...s,
          adminUsers: s.adminUsers.map((x) => (x.id === id ? { ...x, status: x.status === 'Active' ? 'Inactive' : 'Active' } : x)),
        }
        next = log(next, 'pdao.admin', 'Updated Admin Status', `${u?.status === 'Active' ? 'Deactivated' : 'Activated'} admin account ${u?.username ?? id}`)
        return next
      })
    },

    resetAdminPassword(id, password) {
      setState((s) => {
        const u = s.adminUsers.find((x) => x.id === id)
        let next: AppState = {
          ...s,
          adminUsers: s.adminUsers.map((x) => (x.id === id ? { ...x, password: password || 'admin123' } : x)),
        }
        next = log(next, 'pdao.admin', 'Reset Password', `Reset password for admin account ${u?.username ?? id}`)
        return next
      })
    },

    deleteAdminUser(id) {
      setState((s) => {
        const u = s.adminUsers.find((x) => x.id === id)
        let next: AppState = { ...s, adminUsers: s.adminUsers.filter((x) => x.id !== id) }
        next = log(next, 'pdao.admin', 'Deleted Admin User', `Deleted admin account ${u?.username ?? id}`)
        return next
      })
    },

    logActivity(action, activity) {
      setState((s) => log(s, 'pdao.admin', action, activity))
    },

    resetData() {
      try {
        window.localStorage.removeItem(STORAGE_KEY)
      } catch {
        // ignore
      }
      setState({
        pwdUsers: seedPWDUsers,
        benefits: seedBenefits,
        assistanceRequests: seedRequests,
        notifications: seedNotifications,
        jobs: seedJobs,
        adminUsers: seedAdminUsers,
        feedbackTickets: seedFeedback,
        activityLog: seedActivityLog,
        jobApplications: [],
      })
    },
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within a StoreProvider')
  return ctx
}
