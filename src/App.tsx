import { useEffect, useState } from 'react'
import { PWDLayout, AdminLayout } from './components/Layout'
import { SessionContext, type AppSession } from './context'
import { StoreProvider, useStore } from './store'
import { isSupabaseConfigured } from './lib/supabase'
import { restoredAccount, signIn, signOut, type SignedInAccount } from './lib/auth'
import type { LoadedState } from './lib/db'

// Public
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'

// PWD portal
import PWDDashboard from './pages/pwd/Dashboard'
import Profile from './pages/pwd/Profile'
import Benefits from './pages/pwd/Benefits'
import Requests from './pages/pwd/Requests'
import RequestTracking from './pages/pwd/RequestTracking'
import FeedbackPage from './pages/pwd/Feedback'
import Notifications from './pages/pwd/Notifications'
import Jobs from './pages/pwd/Jobs'
import PWDSettings from './pages/pwd/Settings'

// Admin portal
import AdminDashboard from './pages/admin/Dashboard'
import PWDManagement from './pages/admin/PWDManagement'
import BenefitsManagement from './pages/admin/BenefitsManagement'
import RequestManagement from './pages/admin/RequestManagement'
import Reports from './pages/admin/Reports'
import UserManagement from './pages/admin/UserManagement'
import FeedbackAdmin from './pages/admin/FeedbackAdmin'
import AdminSettings from './pages/admin/Settings'
import Recapitulation from './pages/admin/Recapitulation'

type Page =
  | 'landing' | 'login' | 'register'
  | 'pwd-dashboard' | 'pwd-profile' | 'pwd-benefits' | 'pwd-requests'
  | 'pwd-tracking' | 'pwd-feedback' | 'pwd-notifications' | 'pwd-jobs' | 'pwd-settings'
  | 'admin-dashboard' | 'admin-pwd' | 'admin-benefits' | 'admin-requests'
  | 'admin-reports' | 'admin-recapitulation' | 'admin-users' | 'admin-feedback' | 'admin-settings'

const PWD_PAGES: Page[] = [
  'pwd-dashboard', 'pwd-profile', 'pwd-benefits', 'pwd-requests',
  'pwd-tracking', 'pwd-feedback', 'pwd-notifications', 'pwd-jobs', 'pwd-settings',
]

const ADMIN_PAGES: Page[] = [
  'admin-dashboard', 'admin-pwd', 'admin-benefits', 'admin-requests',
  'admin-reports', 'admin-recapitulation', 'admin-users', 'admin-feedback', 'admin-settings',
]

function AppInner() {
  const [page, setPage] = useState<Page>('landing')
  const [session, setSession] = useState<AppSession>(null)
  const { pwdUsers, adminUsers, setActor, recordAdminLogin, reloadFromServer, clearData } = useStore()
  const online = isSupabaseConfigured()

  const navigate = (p: string) => setPage(p as Page)

  // A portal page is only shown while its session still points at an active account. If the
  // account is deactivated, deleted or removed mid-session (here or by another admin), the user
  // is signed out instead of the page silently showing another person's record.
  const sessionValid =
    session?.type === 'pwd'
      ? pwdUsers.some((u) => u.id === session.userId && u.active !== false)
      : session?.type === 'admin'
        ? adminUsers.some((a) => a.id === session.adminId && a.status === 'Active')
        : false
  const isPWDPage = PWD_PAGES.includes(page)
  const isAdminPage = ADMIN_PAGES.includes(page)
  const allowed =
    (!isPWDPage && !isAdminPage) || (sessionValid && (isPWDPage ? session?.type === 'pwd' : session?.type === 'admin'))

  const endSession = (next: Page) => {
    setSession(null)
    setActor(null)
    setPage(next)
    if (online) {
      clearData()
      void signOut()
    }
  }

  useEffect(() => {
    if (allowed) return
    endSession('login')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed])

  /** Opens the portal for a signed-in account, if its record is present and active in `data`. */
  const openSession = (account: SignedInAccount, data: Pick<LoadedState, 'pwdUsers' | 'adminUsers'>): boolean => {
    if (account.kind === 'pwd') {
      const user = data.pwdUsers.find((u) => u.id === account.accountId && u.active !== false && !u.deletedAt)
      if (!user) return false
      setSession({ type: 'pwd', userId: user.id })
      setActor(null)
      setPage('pwd-dashboard')
    } else {
      const admin = data.adminUsers.find((a) => a.id === account.accountId && a.status === 'Active')
      if (!admin) return false
      setSession({ type: 'admin', adminId: admin.id, role: admin.role })
      setActor(admin.username)
      recordAdminLogin(admin.id)
      setPage('admin-dashboard')
    }
    return true
  }

  // Keep people signed in across page reloads (supabase-js remembers the Auth session).
  useEffect(() => {
    if (!online) return
    let cancelled = false
    void (async () => {
      const account = await restoredAccount()
      if (!account || cancelled) return
      const data = await reloadFromServer().catch(() => null)
      if (cancelled) return
      if (!data || !openSession(account, data)) void signOut()
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Offline demo only: passwords are checked against the local demo data. */
  const validateLocally = (tab: 'user' | 'admin', username: string, password: string): SignedInAccount | null => {
    if (tab === 'user') {
      const user = pwdUsers.find(
        (u) => (u.pwdIdNumber === username || u.username === username || u.id === username) && u.password === password && u.active !== false && !u.deletedAt
      )
      return user ? { kind: 'pwd', accountId: user.id } : null
    }
    const admin = adminUsers.find((a) => a.username === username && a.password === password && a.status === 'Active')
    return admin ? { kind: 'admin', accountId: admin.id } : null
  }

  const handleLogin = async (tab: 'user' | 'admin', rawUsername: string, password: string): Promise<string | null> => {
    const invalid = tab === 'user' ? 'Invalid PWD ID No. or password. Please check your credentials.' : 'Invalid username or password. Please check your credentials.'
    const username = rawUsername.trim()
    if (!online) {
      const account = validateLocally(tab, username, password)
      return account && openSession(account, { pwdUsers, adminUsers }) ? null : invalid
    }
    let account: SignedInAccount | null = null
    try {
      account = await signIn(tab === 'user' ? 'pwd' : 'admin', username, password)
    } catch {
      return 'Could not reach the server. Please check your connection and try again.'
    }
    if (!account) return invalid
    const data = await reloadFromServer().catch(() => null)
    if (!data || !openSession(account, data)) {
      await signOut()
      clearData()
      return invalid
    }
    return null
  }

  const logout = () => endSession('landing')

  if (!allowed) return null

  if (page === 'landing') return (
    <SessionContext.Provider value={session}>
      <Landing onNavigate={navigate} />
    </SessionContext.Provider>
  )
  if (page === 'login') return (
    <SessionContext.Provider value={session}>
      <Login onNavigate={navigate} onLogin={handleLogin} />
    </SessionContext.Provider>
  )
  if (page === 'register') return (
    <SessionContext.Provider value={session}>
      <Register onNavigate={navigate} />
    </SessionContext.Provider>
  )

  if (PWD_PAGES.includes(page)) {
    const content = () => {
      switch (page) {
        case 'pwd-dashboard': return <PWDDashboard onNavigate={navigate} />
        case 'pwd-profile': return <Profile />
        case 'pwd-benefits': return <Benefits onNavigate={navigate} />
        case 'pwd-requests': return <Requests />
        case 'pwd-tracking': return <RequestTracking />
        case 'pwd-feedback': return <FeedbackPage />
        case 'pwd-notifications': return <Notifications />
        case 'pwd-jobs': return <Jobs onNavigate={navigate} />
        default: return <PWDSettings />
      }
    }
    return (
      <SessionContext.Provider value={session}>
        <PWDLayout current={page} onNavigate={navigate} onLogout={logout}>{content()}</PWDLayout>
      </SessionContext.Provider>
    )
  }

  if (ADMIN_PAGES.includes(page)) {
    const content = () => {
      switch (page) {
        case 'admin-dashboard': return <AdminDashboard />
        case 'admin-pwd': return <PWDManagement />
        case 'admin-benefits': return <BenefitsManagement />
        case 'admin-requests': return <RequestManagement />
        case 'admin-reports': return <Reports />
        case 'admin-recapitulation': return <Recapitulation onNavigate={navigate} />
        case 'admin-users': return <UserManagement />
        case 'admin-feedback': return <FeedbackAdmin />
        default: return <AdminSettings />
      }
    }
    return (
      <SessionContext.Provider value={session}>
        <AdminLayout current={page} onNavigate={navigate} onLogout={logout}>{content()}</AdminLayout>
      </SessionContext.Provider>
    )
  }

  return (
    <SessionContext.Provider value={session}>
      <Landing onNavigate={navigate} />
    </SessionContext.Provider>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <AppInner />
    </StoreProvider>
  )
}
