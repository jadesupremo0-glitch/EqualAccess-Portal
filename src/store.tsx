import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
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
  type BenefitStatus,
} from './data'
import { isSupabaseConfigured } from './lib/supabase'
import { loadStateFromSupabase, syncStateToSupabase, resetSupabaseData, EMPTY_STATE, type LoadedState } from './lib/db'
import { APP_TIME_ZONE, DISABILITY_LABEL_BY_SLUG, OTHER_DISABILITY, manilaDate } from './lib/catalog'
import { normalizeJob, normalizeUser } from './lib/normalize'

// ── Persistence ────────────────────────────────────────────────────
// v2: structured job postings and PWD employment-profile fields for the job
// recommendation engine. Older shapes are upgraded on read (src/lib/normalize.ts),
// so the key does not change.
const STORAGE_KEY = 'equalaccess-portal:v2'

/** How often the app re-reads the database in the background (also on window focus). */
const REFRESH_INTERVAL_MS = 30_000

export interface ActivityEntry {
  user: string
  action: string
  date: string
  time: string
  activity: string
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
}

/** Today's date (YYYY-MM-DD) in Asia/Manila, so month boundaries match the dashboard's. */
function today(): string {
  return manilaDate()
}

const manilaClock = new Intl.DateTimeFormat('en-US', { timeZone: APP_TIME_ZONE, hour: '2-digit', minute: '2-digit', hour12: true })

/** Current time ("09:05 AM") in Asia/Manila, matching `today()`. */
function nowTime(): string {
  return manilaClock.format(new Date())
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

function nextPWDId(items: PWDUser[]): string {
  const year = new Date().getFullYear()
  const prefix = `PWD-LB-${year}-`
  const max = items
    .filter((u) => u.id.startsWith(prefix))
    .reduce((m, u) => {
      const n = parseInt(u.id.slice(prefix.length), 10)
      return Number.isFinite(n) ? Math.max(m, n) : m
    }, 0)
  return `${prefix}${String(max + 1).padStart(4, '0')}`
}

const TIMELINE_STEPS = ['Submitted', 'Under Review', 'Requirements Needed', 'Approved / Rejected', 'Processing', 'Completed']

/** Index of the last completed step and of the active step (null = nothing in progress) for a status. */
const TIMELINE_PROGRESS: Record<RequestStatus, { done: number; active: number | null }> = {
  Pending: { done: 0, active: 0 },
  'Under Review': { done: 1, active: 1 },
  'Requirements Needed': { done: 2, active: 2 },
  Approved: { done: 3, active: 4 },
  Available: { done: 3, active: 4 },
  Claimed: { done: 4, active: 4 },
  Rejected: { done: 3, active: null },
  Completed: { done: 5, active: null },
}

/** Timeline for a status; steps already completed in `prev` keep their original dates. */
function buildTimeline(status: RequestStatus, date: string, prev: AssistanceRequest['timeline'] = []) {
  const { done, active } = TIMELINE_PROGRESS[status] ?? TIMELINE_PROGRESS.Pending
  return TIMELINE_STEPS.map((step, i) => {
    const completed = i <= done
    return {
      step,
      date: completed ? (prev.find((s) => s.step === step)?.date || date) : '',
      completed,
      active: i === active,
    }
  })
}

// ── Seed / load ────────────────────────────────────────────────────
const seedState = (): AppState => ({
  pwdUsers: seedPWDUsers,
  benefits: seedBenefits,
  assistanceRequests: seedRequests,
  notifications: seedNotifications,
  jobs: seedJobs,
  adminUsers: seedAdminUsers,
  feedbackTickets: seedFeedback,
  activityLog: seedActivityLog,
})

function loadState(): AppState {
  const fallback = seedState()
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<AppState>
    return {
      pwdUsers: (parsed.pwdUsers ?? seedPWDUsers).map(normalizeUser),
      benefits: parsed.benefits ?? seedBenefits,
      assistanceRequests: parsed.assistanceRequests ?? seedRequests,
      notifications: parsed.notifications ?? seedNotifications,
      jobs: (parsed.jobs ?? seedJobs).map((j) => normalizeJob(j as unknown as Record<string, unknown>)),
      adminUsers: parsed.adminUsers ?? seedAdminUsers,
      feedbackTickets: parsed.feedbackTickets ?? seedFeedback,
      activityLog: parsed.activityLog ?? seedActivityLog,
    }
  } catch {
    return fallback
  }
}

// ── Inputs ─────────────────────────────────────────────────────────
export interface RegisterInput {
  fullName: string
  age: number
  address: string
  barangay: string
  contact: string
  email: string
  disabilityType: string
  otherDisability?: string
  pwdIdNumber: string
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
  status: BenefitStatus
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
  contact?: string
  email?: string
  role: AdminUser['role']
}

// ── Store context ──────────────────────────────────────────────────
interface StoreContextValue extends AppState {
  /**
   * Bumps every time the database and this browser are known to agree again: after a
   * local change has been written, or after a background refresh brought in someone
   * else's change. Aggregates that live outside the store re-read when it changes.
   */
  dataVersion: number
  /** Re-reads the database now (no-op offline, or while local changes are still being written). */
  refreshFromServer: () => Promise<void>

  // navigation / search helpers
  globalSearch: string
  setGlobalSearch: (v: string) => void
  requestDraft: { type?: string; title?: string } | null
  setRequestDraft: (draft: { type?: string; title?: string } | null) => void

  // PWD
  registerPWD: (input: RegisterInput) => { ok: boolean; error?: string }
  updateProfile: (userId: string, patch: Partial<PWDUser>) => void
  changePassword: (userId: string, current: string, next: string) => string | null
  resetPassword: (kind: 'user' | 'admin', identifier: string, next: string) => { ok: boolean; error?: string }
  addRequest: (userId: string, input: { type: string; title: string; description: string }) => AssistanceRequest
  submitFeedback: (userId: string, input: { category: string; subject: string; message: string; anonymous: boolean }) => FeedbackTicket
  /** A reply from the PWD who owns the ticket (shown under their name, or "Anonymous User"). */
  addFeedbackReply: (ticketId: string, message: string) => void
  markNotificationRead: (id: string) => void
  /** Marks this PWD's own notifications and the broadcast ones as read — never other users'. */
  markAllNotificationsRead: (userId: string) => void
  toggleSavedJob: (userId: string, jobId: string) => void

  // Admin — PWD
  verifyPWD: (userId: string, status: 'Verified' | 'Rejected') => void
  updatePWD: (userId: string, patch: Partial<PWDUser>) => void
  deactivatePWD: (userId: string) => void
  reactivatePWD: (userId: string) => void
  /** Soft delete: the record disappears from every list and count but is kept in the database. */
  deletePWD: (userId: string) => void

  // Admin — benefits
  addBenefit: (input: BenefitInput) => void
  updateBenefit: (id: string, patch: Partial<Benefit>) => void
  deleteBenefit: (id: string) => void
  toggleBenefitStatus: (id: string) => void

  // Admin — requests
  updateRequestStatus: (requestId: string, status: RequestStatus) => void
  addRequestComment: (requestId: string, author: string, message: string) => void

  // Admin — feedback
  addFeedbackResponse: (ticketId: string, input: { author: string; message: string; isInternal?: boolean }) => void
  setFeedbackStatus: (ticketId: string, status: FeedbackTicket['status']) => void

  // Admin — users
  addAdminUser: (input: AdminUserInput) => string | null
  /** Returns an error message (e.g. username taken) or null when saved. */
  updateAdminUser: (id: string, patch: Partial<AdminUser>) => string | null
  toggleAdminStatus: (id: string) => void
  resetAdminPassword: (id: string, password?: string) => void
  deleteAdminUser: (id: string) => void
  /** Stamps the admin's "Last Login" with the current Asia/Manila date and time. */
  recordAdminLogin: (id: string) => void

  // Admin — misc
  /** Append to the admin activity log. `user` defaults to the signed-in admin (see setActor). */
  logActivity: (action: string, activity: string, user?: string) => void
  /** Username that admin actions are attributed to in the activity log (null when signed out). */
  setActor: (username: string | null) => void
  resetData: () => void
}

const StoreContext = createContext<StoreContextValue | null>(null)

let warnedSyncError = ''

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState)
  const [dbReady, setDbReady] = useState(false)
  const [dataVersion, setDataVersion] = useState(0)
  const [globalSearch, setGlobalSearch] = useState('')
  const [requestDraft, setRequestDraft] = useState<{ type?: string; title?: string } | null>(null)

  // `synced` is the last state known to be in the database. Changes are written as a diff
  // against it, one write at a time, so overlapping edits can never reorder or clobber each other.
  const stateRef = useRef(state)
  stateRef.current = state
  const synced = useRef<LoadedState>(EMPTY_STATE)
  const queue = useRef<Promise<void>>(Promise.resolve())
  const inFlight = useRef(0)
  const actorRef = useRef<string | null>(null)
  const actor = () => actorRef.current ?? 'pdao.admin'

  function flush() {
    inFlight.current += 1
    queue.current = queue.current
      .then(async () => {
        const next = stateRef.current
        if (next === synced.current) return
        await syncStateToSupabase(synced.current, next)
        synced.current = next
        setDataVersion((v) => v + 1)
      })
      .catch((err: unknown) => {
        // Keep `synced` as-is: the next change retries the same diff.
        const message = err instanceof Error ? err.message : String(err)
        if (message !== warnedSyncError) {
          warnedSyncError = message
          console.warn(
            `[sync] Could not write changes to the database: ${message}. ` +
              'If this mentions a missing column or function, apply the latest migrations with `supabase db push`.',
          )
        }
      })
      .finally(() => {
        inFlight.current -= 1
      })
  }

  async function refreshFromServer() {
    if (!isSupabaseConfigured() || !dbReady) return
    // Never replace state while local edits are unwritten: they would be lost.
    if (inFlight.current > 0 || stateRef.current !== synced.current) return
    let result: Awaited<ReturnType<typeof loadStateFromSupabase>> = null
    try {
      result = await loadStateFromSupabase()
    } catch {
      return // offline or schema behind: keep what we have
    }
    if (!result || !result.seeded) return
    if (inFlight.current > 0 || stateRef.current !== synced.current) return // edited while we were reading
    const remote = result.state
    if (JSON.stringify(remote) === JSON.stringify(stateRef.current)) return
    synced.current = remote
    stateRef.current = remote
    setState(remote)
    setDataVersion((v) => v + 1)
  }
  const refreshRef = useRef(refreshFromServer)
  refreshRef.current = refreshFromServer

  // Load from Supabase when the app starts. If the remote database has no
  // rows yet, the local seed data is written to it so it is provisioned on first run.
  useEffect(() => {
    let cancelled = false
    async function init() {
      if (!isSupabaseConfigured()) {
        setDbReady(true)
        return
      }
      let result: { state: LoadedState; seeded: boolean } | null = null
      try {
        result = await loadStateFromSupabase()
      } catch {
        // network/client error: fall back to the local copy
      }
      if (cancelled) return
      if (result && result.seeded) {
        synced.current = result.state
        stateRef.current = result.state
        setState(result.state)
      }
      // Otherwise `synced` stays empty, so the first flush writes everything we have.
      setDbReady(true)
    }
    void init()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // storage unavailable: run in-memory
    }
    if (!dbReady || !isSupabaseConfigured()) return
    flush()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, dbReady])

  // Keep every open page current: re-read on a timer and whenever the tab regains focus.
  useEffect(() => {
    if (!dbReady || !isSupabaseConfigured()) return
    const tick = () => void refreshRef.current()
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick()
    }
    const id = window.setInterval(tick, REFRESH_INTERVAL_MS)
    window.addEventListener('focus', tick)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('focus', tick)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [dbReady])

  // Soft-deleted PWDs are invisible everywhere; the full list stays in `state` for syncing.
  const visiblePwdUsers = useMemo(() => state.pwdUsers.filter((u) => !u.deletedAt), [state.pwdUsers])

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
    pwdUsers: visiblePwdUsers,
    dataVersion,
    refreshFromServer,
    globalSearch,
    setGlobalSearch,
    requestDraft,
    setRequestDraft,

    registerPWD(input) {
      // Checked here, not inside the updater: React may run updaters after setState returns,
      // so an error set in one would be read too late and a rejected sign-up reported as a success.
      const pwdIdNumber = input.pwdIdNumber.trim()
      const isTaken = (users: PWDUser[]) => users.some((u) => u.pwdIdNumber.toLowerCase() === pwdIdNumber.toLowerCase())
      if (isTaken(stateRef.current.pwdUsers)) {
        return { ok: false, error: 'That PWD ID No. is already registered. Please check your ID number.' }
      }
      setState((s) => {
        if (isTaken(s.pwdUsers)) return s
        const disability: DisabilityType = DISABILITY_LABEL_BY_SLUG[input.disabilityType] ?? OTHER_DISABILITY
        const user: PWDUser = {
          id: nextPWDId(s.pwdUsers),
          username: input.pwdIdNumber.trim(),
          password: input.password,
          name: input.fullName.trim(),
          age: input.age,
          address: input.address.trim(),
          barangay: input.barangay.trim(),
          contact: input.contact.trim(),
          email: input.email.trim(),
          disabilityType: disability,
          verificationStatus: 'Pending',
          dateRegistered: today(),
          pwdIdNumber: input.pwdIdNumber.trim(),
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
      return { ok: true }
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
          // Match by owner id — matching by the old name would also rename other people who share it.
          // Anonymous tickets keep "Anonymous".
          feedbackTickets: name
            ? s.feedbackTickets.map((t) => (t.userId === userId && !t.isAnonymous ? { ...t, pwdName: name } : t))
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

    resetPassword(kind, identifier, next) {
      const id = identifier.trim()
      let ok = false
      if (kind === 'admin') {
        const admin = state.adminUsers.find((a) => a.username === id || (a.email ?? '') === id)
        if (!admin) return { ok: false, error: 'No admin account found with that username or email.' }
        setState((s) => ({
          ...s,
          adminUsers: s.adminUsers.map((a) => (a.id === admin.id ? { ...a, password: next } : a)),
        }))
        ok = true
      } else {
        const user = state.pwdUsers.find(
          (u) => u.pwdIdNumber === id || u.username === id || u.id === id || (u.email ?? '').toLowerCase() === id.toLowerCase(),
        )
        if (!user) return { ok: false, error: 'No PWD account found with that email or ID.' }
        setState((s) => ({
          ...s,
          pwdUsers: s.pwdUsers.map((u) => (u.id === user.id ? { ...u, password: next } : u)),
        }))
        ok = true
      }
      return ok ? { ok: true } : { ok: false }
    },

    addRequest(userId, input) {
      const user = state.pwdUsers.find((u) => u.id === userId)
      const req: AssistanceRequest = {
        id: nextId('REQ-LB-' + today().slice(0, 4), stateRef.current.assistanceRequests),
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
        timeline: buildTimeline('Pending', today()),
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
      const user = state.pwdUsers.find((u) => u.id === userId)
      const ticket: FeedbackTicket = {
        id: nextId('TKT-LB-' + today().slice(0, 4), stateRef.current.feedbackTickets),
        pwdName: input.anonymous ? 'Anonymous' : (user?.name ?? 'PWD User'),
        isAnonymous: input.anonymous,
        subject: input.subject,
        category: input.category as FeedbackTicket['category'],
        message: input.message,
        dateSubmitted: today(),
        status: 'Open',
        assignedStaff: 'Unassigned',
        responses: [],
        // Kept for anonymous tickets too, so the sender can still find their own conversation;
        // admin screens never show it (they only ever display "Anonymous User").
        userId,
      }
      setState((s) => ({
        ...s,
        feedbackTickets: [ticket, ...s.feedbackTickets],
      }))
      return ticket
    },

    addFeedbackReply(ticketId, message) {
      setState((s) => ({
        ...s,
        feedbackTickets: s.feedbackTickets.map((t) =>
          t.id === ticketId
            ? {
                ...t,
                status: t.status === 'Closed' ? t.status : 'In Progress',
                responses: [...t.responses, { author: t.isAnonymous ? 'Anonymous User' : t.pwdName, date: today(), message, fromUser: true }],
              }
            : t,
        ),
      }))
    },

    markNotificationRead(id) {
      setState((s) => ({ ...s, notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }))
    },

    markAllNotificationsRead(userId) {
      setState((s) => ({
        ...s,
        notifications: s.notifications.map((n) => (!n.read && (!n.userId || n.userId === userId) ? { ...n, read: true } : n)),
      }))
    },

    toggleSavedJob(userId, jobId) {
      setState((s) => ({
        ...s,
        pwdUsers: s.pwdUsers.map((u) => {
          if (u.id !== userId) return u
          const saved = u.savedJobIds ?? []
          return { ...u, savedJobIds: saved.includes(jobId) ? saved.filter((id) => id !== jobId) : [...saved, jobId] }
        }),
      }))
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
          actor(),
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
        next = log(next, actor(), 'Deactivated Account', `Deactivated PWD account ${userId} (${user?.name ?? 'Unknown'})`)
        return next
      })
    },

    reactivatePWD(userId) {
      setState((s) => {
        const user = s.pwdUsers.find((u) => u.id === userId)
        let next: AppState = {
          ...s,
          // Only lifts the deactivation: a Pending or Rejected record must not become Verified by it.
          pwdUsers: s.pwdUsers.map((u) => (u.id === userId ? { ...u, active: true } : u)),
        }
        next = log(next, actor(), 'Reactivated Account', `Reactivated PWD account ${userId} (${user?.name ?? 'Unknown'})`)
        return next
      })
    },

    deletePWD(userId) {
      setState((s) => {
        const user = s.pwdUsers.find((u) => u.id === userId)
        if (!user || user.deletedAt) return s
        let next: AppState = {
          ...s,
          pwdUsers: s.pwdUsers.map((u) => (u.id === userId ? { ...u, deletedAt: today(), active: false } : u)),
        }
        next = log(next, actor(), 'Deleted PWD Record', `Deleted PWD record ${userId} (${user.name})`)
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
        next = log(next, actor(), 'Added New Program', `Created benefit program ${benefit.name} (${benefit.id})`)
        return next
      })
    },

    updateBenefit(id, patch) {
      setState((s) => {
        const b = s.benefits.find((x) => x.id === id)
        if (!b) return s
        const next: AppState = { ...s, benefits: s.benefits.map((x) => (x.id === id ? { ...x, ...patch } : x)) }
        return log(next, actor(), 'Updated Program', `Updated benefit program ${patch.name ?? b.name} (${id})`)
      })
    },

    deleteBenefit(id) {
      setState((s) => {
        const b = s.benefits.find((x) => x.id === id)
        let next: AppState = { ...s, benefits: s.benefits.filter((x) => x.id !== id) }
        next = log(next, actor(), 'Deleted Program', `Deleted benefit program ${b?.name ?? id}`)
        return next
      })
    },

    toggleBenefitStatus(id) {
      setState((s) => ({
        ...s,
        benefits: s.benefits.map((b) => (b.id === id ? { ...b, status: b.status === 'Active' ? 'Closed' as BenefitStatus : 'Active' as BenefitStatus } : b)),
      }))
    },

    updateRequestStatus(requestId, status) {
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
                  timeline: buildTimeline(status, today(), r.timeline),
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
        next = log(next, actor(), 'Updated Request Status', `Updated ${requestId} to ${status}`)
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
      // Checked before setState for the same reason as registerPWD.
      const username = input.username.trim()
      const isTaken = (users: AdminUser[]) => users.some((u) => u.username.toLowerCase() === username.toLowerCase())
      if (isTaken(stateRef.current.adminUsers)) return 'That username is already taken.'
      setState((s) => {
        if (isTaken(s.adminUsers)) return s
        const user: AdminUser = {
          id: nextId('ADM', s.adminUsers),
          name: input.name,
          position: input.position || input.role,
          username: input.username.trim(),
          password: input.password || 'admin123',
          contact: input.contact,
          email: input.email,
          role: input.role,
          status: 'Active',
          lastLogin: 'Never',
          dateCreated: today(),
        }
        let next: AppState = { ...s, adminUsers: [...s.adminUsers, user] }
        next = log(next, actor(), 'Added Admin User', `Created admin account ${user.username} (${user.id})`)
        return next
      })
      return null
    },

    updateAdminUser(id, patch) {
      const username = patch.username?.trim()
      if (username && stateRef.current.adminUsers.some((u) => u.id !== id && u.username.toLowerCase() === username.toLowerCase())) {
        return 'That username is already taken.'
      }
      setState((s) => ({ ...s, adminUsers: s.adminUsers.map((u) => (u.id === id ? { ...u, ...patch } : u)) }))
      return null
    },

    toggleAdminStatus(id) {
      setState((s) => {
        const u = s.adminUsers.find((x) => x.id === id)
        let next: AppState = {
          ...s,
          adminUsers: s.adminUsers.map((x) => (x.id === id ? { ...x, status: x.status === 'Active' ? 'Inactive' : 'Active' } : x)),
        }
        next = log(next, actor(), 'Updated Admin Status', `${u?.status === 'Active' ? 'Deactivated' : 'Activated'} admin account ${u?.username ?? id}`)
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
        next = log(next, actor(), 'Reset Password', `Reset password for admin account ${u?.username ?? id}`)
        return next
      })
    },

    deleteAdminUser(id) {
      setState((s) => {
        const u = s.adminUsers.find((x) => x.id === id)
        let next: AppState = { ...s, adminUsers: s.adminUsers.filter((x) => x.id !== id) }
        next = log(next, actor(), 'Deleted Admin User', `Deleted admin account ${u?.username ?? id}`)
        return next
      })
    },

    recordAdminLogin(id) {
      const lastLogin = `${today()} ${nowTime()}`
      setState((s) => ({ ...s, adminUsers: s.adminUsers.map((u) => (u.id === id ? { ...u, lastLogin } : u)) }))
    },

    logActivity(action, activity, user = actor()) {
      setState((s) => log(s, user, action, activity))
    },

    setActor(username) {
      actorRef.current = username
    },

    resetData() {
      try {
        window.localStorage.removeItem(STORAGE_KEY)
      } catch {
        // ignore
      }
      const seed = seedState()
      stateRef.current = seed
      setState(seed)
      if (isSupabaseConfigured()) {
        // The reset rewrites the whole database, so the state we set is now the synced state.
        // It runs on the write queue so a write already in flight cannot land after the wipe.
        synced.current = seed
        queue.current = queue.current
          .then(() => resetSupabaseData(seed))
          .then(() => setDataVersion((v) => v + 1))
          .catch((err) => console.warn('[sync] Reset failed:', err))
      }
    },
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within a StoreProvider')
  return ctx
}
