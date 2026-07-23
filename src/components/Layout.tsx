import { type ReactNode, useState } from 'react'
import {
  LayoutDashboard, User, Gift, FileText, MessageSquare, Briefcase,
  Bell, Settings, LogOut, Menu, X, ChevronDown, Search,
  Users, BarChart2, Shield, ClipboardList, HelpCircle,
} from 'lucide-react'
import { useSession } from '../context'
import { pwdUsers, adminUsers } from '../data'

type Page = string

interface NavItem {
  label: string
  page: Page
  icon: ReactNode
  badge?: number
}

const pwdNav: NavItem[] = [
  { label: 'Dashboard', page: 'pwd-dashboard', icon: <LayoutDashboard size={17} /> },
  { label: 'My Profile', page: 'pwd-profile', icon: <User size={17} /> },
  { label: 'Benefits & Programs', page: 'pwd-benefits', icon: <Gift size={17} /> },
  { label: 'Assistance Requests', page: 'pwd-requests', icon: <FileText size={17} /> },
  { label: 'Request Tracking', page: 'pwd-tracking', icon: <ClipboardList size={17} /> },
  { label: 'Job Matching', page: 'pwd-jobs', icon: <Briefcase size={17} /> },
  { label: 'Feedback & Support', page: 'pwd-feedback', icon: <MessageSquare size={17} /> },
  { label: 'Notifications', page: 'pwd-notifications', icon: <Bell size={17} />, badge: 4 },
  { label: 'Settings', page: 'pwd-settings', icon: <Settings size={17} /> },
]

const adminNav: NavItem[] = [
  { label: 'Dashboard', page: 'admin-dashboard', icon: <LayoutDashboard size={17} /> },
  { label: 'PWD Management', page: 'admin-pwd', icon: <Users size={17} /> },
  { label: 'Benefits & Programs', page: 'admin-benefits', icon: <Gift size={17} /> },
  { label: 'Assistance Requests', page: 'admin-requests', icon: <FileText size={17} /> },
  { label: 'Reports & Analytics', page: 'admin-reports', icon: <BarChart2 size={17} /> },
  { label: 'Feedback & Support', page: 'admin-feedback', icon: <MessageSquare size={17} /> },
  { label: 'User Management', page: 'admin-users', icon: <Shield size={17} /> },
  { label: 'Settings', page: 'admin-settings', icon: <Settings size={17} /> },
]

function EALogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-label="EqualAccess Portal logo">
      <rect width="32" height="32" rx="8" fill="white" fillOpacity="0.15" />
      <text x="50%" y="22" textAnchor="middle" fontSize="15" fontWeight="800" fill="white" fontFamily="Inter, sans-serif">EA</text>
    </svg>
  )
}

function SidebarNav({
  items, current, onNavigate, onLogout,
  isAdmin = false, isMobile = false, onClose,
  userLabel, userSub,
}: {
  items: NavItem[]
  current: Page
  onNavigate: (p: Page) => void
  onLogout: () => void
  isAdmin?: boolean
  isMobile?: boolean
  onClose?: () => void
  userLabel: string
  userSub: string
}) {
  const activeClass = 'bg-white/15 text-white'
  const inactiveClass = 'text-white/70 hover:bg-white/10 hover:text-white'

  return (
    <nav className="flex flex-col h-full" aria-label="Main navigation">
      <div className={`flex items-center justify-between px-5 py-4 ${isAdmin ? 'bg-slate-900' : 'bg-[#0f766e]'}`}>
        <div className="flex items-center gap-3 min-w-0">
          <EALogo size={34} />
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-tight">EqualAccess Portal</p>
            <p className="text-white/60 text-[11px] truncate">PDAO — Los Baños, Laguna</p>
          </div>
        </div>
        {isMobile && (
          <button onClick={onClose} className="text-white/60 hover:text-white ml-2" aria-label="Close menu">
            <X size={20} />
          </button>
        )}
      </div>

      <div className={`flex-1 overflow-y-auto ${isAdmin ? 'bg-slate-800' : 'bg-[#0d9488]'}`}>
        <ul className="py-3 px-2.5 space-y-0.5" role="list">
          {items.map((item) => {
            const active = current === item.page
            return (
              <li key={item.page}>
                <button
                  onClick={() => { onNavigate(item.page); onClose?.() }}
                  aria-current={active ? 'page' : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? activeClass : inactiveClass}`}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge != null && (
                    <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[17px] h-[17px] flex items-center justify-center px-1">
                      {item.badge}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <div className={`p-4 border-t border-white/10 ${isAdmin ? 'bg-slate-900' : 'bg-[#0f766e]'}`}>
        <div className="flex items-center gap-3 mb-3 px-1">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {userLabel.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-semibold truncate">{userLabel}</p>
            <p className="text-white/50 text-[11px] truncate">{userSub}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut size={15} />
          Logout
        </button>
      </div>
    </nav>
  )
}

export function PWDLayout({ children, current, onNavigate, onLogout }: {
  children: ReactNode; current: Page; onNavigate: (p: Page) => void; onLogout: () => void
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [search, setSearch] = useState('')
  const session = useSession()

  const user = session?.type === 'pwd'
    ? pwdUsers.find((u) => u.id === session.userId)
    : null

  const userLabel = user ? user.name.split(' ').slice(0, 2).join(' ') : 'PWD User'
  const userSub = user ? user.id : ''
  const initial = userLabel.charAt(0)

  const sidebarProps = {
    items: pwdNav, current, onNavigate, onLogout,
    userLabel, userSub,
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <aside className="hidden lg:flex flex-col w-64 shrink-0" aria-label="Sidebar">
        <SidebarNav {...sidebarProps} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 flex flex-col z-50">
            <SidebarNav {...sidebarProps} isMobile onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-100 px-4 lg:px-6 py-3 flex items-center gap-4" role="banner">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700 p-1" aria-label="Open navigation">
            <Menu size={22} />
          </button>
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="search" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search benefits, programs, requests..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={() => onNavigate('pwd-notifications')} className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg" aria-label="Notifications">
              <Bell size={19} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" aria-hidden="true" />
            </button>
            <button onClick={() => onNavigate('pwd-profile')} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
              <div className="w-7 h-7 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-xs">{initial}</div>
              <span className="hidden sm:block font-medium text-gray-800">{userLabel}</span>
              <ChevronDown size={13} className="text-gray-400" />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6" role="main" id="main-content">
          {children}
        </main>
      </div>
    </div>
  )
}

export function AdminLayout({ children, current, onNavigate, onLogout }: {
  children: ReactNode; current: Page; onNavigate: (p: Page) => void; onLogout: () => void
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const session = useSession()

  const admin = session?.type === 'admin'
    ? adminUsers.find((a) => a.id === session.adminId)
    : null

  const userLabel = admin ? admin.name : 'Admin'
  const userSub = admin ? admin.role : 'PDAO Staff'
  const initial = userLabel.charAt(0)

  const sidebarProps = {
    items: adminNav, current, onNavigate, onLogout, isAdmin: true,
    userLabel, userSub,
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <aside className="hidden lg:flex flex-col w-64 shrink-0" aria-label="Admin sidebar">
        <SidebarNav {...sidebarProps} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 flex flex-col z-50">
            <SidebarNav {...sidebarProps} isMobile onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-100 px-4 lg:px-6 py-3 flex items-center gap-4" role="banner">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700 p-1" aria-label="Open navigation">
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-medium text-gray-400 hidden sm:block">EqualAccess Portal</span>
            <span className="text-gray-200 hidden sm:block">›</span>
            <span className="text-xs font-semibold text-gray-600 hidden sm:block">Admin Portal</span>
            {admin && (
              <>
                <span className="text-gray-200 hidden sm:block">›</span>
                <span className="text-xs font-semibold text-teal-700 hidden sm:block">{admin.role}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg" aria-label="Help">
              <HelpCircle size={19} />
            </button>
            <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg" aria-label="Notifications">
              <Bell size={19} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" aria-hidden="true" />
            </button>
            <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
              <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-xs">{initial}</div>
              <span className="hidden sm:block font-medium text-gray-800">{userLabel.split(' ')[0]}</span>
              <ChevronDown size={13} className="text-gray-400" />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6" role="main" id="main-content">
          {children}
        </main>
      </div>
    </div>
  )
}
