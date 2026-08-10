import { useState } from 'react'
import { PWDLayout, AdminLayout } from './components/Layout'
import { SessionContext, type AppSession } from './context'
import { StoreProvider, useStore } from './store'

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

type Page =
  | 'landing' | 'login' | 'register'
  | 'pwd-dashboard' | 'pwd-profile' | 'pwd-benefits' | 'pwd-requests'
  | 'pwd-tracking' | 'pwd-feedback' | 'pwd-notifications' | 'pwd-jobs' | 'pwd-settings'
  | 'admin-dashboard' | 'admin-pwd' | 'admin-benefits' | 'admin-requests'
  | 'admin-reports' | 'admin-users' | 'admin-feedback' | 'admin-settings'

const PWD_PAGES: Page[] = [
  'pwd-dashboard', 'pwd-profile', 'pwd-benefits', 'pwd-requests',
  'pwd-tracking', 'pwd-feedback', 'pwd-notifications', 'pwd-jobs', 'pwd-settings',
]

const ADMIN_PAGES: Page[] = [
  'admin-dashboard', 'admin-pwd', 'admin-benefits', 'admin-requests',
  'admin-reports', 'admin-users', 'admin-feedback', 'admin-settings',
]

function AppInner() {
  const [page, setPage] = useState<Page>('landing')
  const [session, setSession] = useState<AppSession>(null)
  const { pwdUsers, adminUsers } = useStore()

  const navigate = (p: string) => setPage(p as Page)

  const validateCredentials = (tab: 'user' | 'admin', username: string, password: string): AppSession => {
    if (tab === 'user') {
      const user = pwdUsers.find(
        (u) => (u.username === username || u.id === username) && u.password === password && u.active !== false
      )
      if (user) return { type: 'pwd', userId: user.id }
    } else {
      const admin = adminUsers.find(
        (a) => a.username === username && a.password === password && a.status === 'Active'
      )
      if (admin) return { type: 'admin', adminId: admin.id, role: admin.role }
    }
    return null
  }

  const handleLogin = (tab: 'user' | 'admin', username: string, password: string): string | null => {
    const newSession = validateCredentials(tab, username, password)
    if (!newSession) return 'Invalid username or password. Please check your credentials.'
    setSession(newSession)
    if (newSession.type === 'pwd') setPage('pwd-dashboard')
    else setPage('admin-dashboard')
    return null
  }

  const logout = () => {
    setSession(null)
    setPage('landing')
  }

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
        case 'pwd-jobs': return <Jobs />
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
