import { type ReactNode, useState } from 'react'
import {
  LayoutDashboard, User, Gift, FileText, MessageSquare, Briefcase,
  Bell, Settings, LogOut, Menu, X, ChevronDown, Search,
  Users, BarChart2, Shield, ClipboardList, HelpCircle, Phone, Mail, MapPin,
} from 'lucide-react'
import { useSession } from '../context'
import { useStore } from '../store'

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
  { label: 'Notifications', page: 'pwd-notifications', icon: <Bell size={17} /> },
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
    <div
      className="flex items-center justify-center rounded-xl bg-white/15 backdrop-blur ring-1 ring-white/25 shadow-inner shrink-0"
      style={{ width: size, height: size }}
      aria-label="EqualAccess Portal logo"
    >
      <span className="text-white font-extrabold tracking-tight" style={{ fontSize: size * 0.42, fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}>
        EA
      </span>
    </div>
  )
}

/** Decorative floating gradient blobs behind the page content. */
function DecorBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="absolute -top-32 -right-24 w-[32rem] h-[32rem] rounded-full bg-gradient-to-br from-ea-teal-400/25 to-sky-400/20 blur-3xl animate-blob" />
      <div className="absolute top-1/3 -left-32 w-[28rem] h-[28rem] rounded-full bg-gradient-to-tr from-ea-blue-500/20 to-ea-teal-400/15 blur-3xl animate-blob-delayed" />
      <div className="absolute bottom-0 right-1/4 w-[24rem] h-[24rem] rounded-full bg-gradient-to-tl from-indigo-400/15 to-ea-teal-400/10 blur-3xl animate-blob" />
    </div>
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
  const activeClass = 'bg-white/15 backdrop-blur text-white ring-1 ring-inset ring-white/20 shadow-lg shadow-black/10'
  const inactiveClass = 'text-white/60 hover:bg-white/10 hover:text-white'

  return (
    <nav className={`flex flex-col h-full ${isAdmin ? 'bg-gradient-to-b from-slate-900 via-slate-900 to-ea-blue-950' : 'bg-gradient-to-b from-ea-teal-900 via-ea-teal-900 to-ea-blue-950'}`} aria-label="Main navigation">
      <div className="relative px-5 py-5">
        <div className="absolute inset-0 overflow-hidden rounded-b-3xl" aria-hidden="true">
          <div className="absolute -top-16 -right-10 w-44 h-44 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute top-2 left-1/3 w-24 h-24 rounded-full bg-ea-teal-400/20 blur-2xl" />
        </div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <EALogo size={38} />
            <div className="min-w-0">
              <p className="font-display text-white font-extrabold text-sm leading-tight tracking-tight">EqualAccess Portal</p>
              <p className="text-white/50 text-[11px] truncate">PDAO — Los Baños, Laguna</p>
            </div>
          </div>
          {isMobile && (
            <button onClick={onClose} className="text-white/60 hover:text-white ml-2 p-1" aria-label="Close menu">
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1" role="list">
          {items.map((item) => {
            const active = current === item.page
            return (
              <li key={item.page}>
                <button
                  onClick={() => { onNavigate(item.page); onClose?.() }}
                  aria-current={active ? 'page' : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${active ? activeClass : inactiveClass} ${active ? 'translate-x-0.5' : 'hover:translate-x-0.5'}`}
                >
                  <span className={`shrink-0 ${active ? 'text-teal-300' : ''}`}>{item.icon}</span>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge != null && (
                    <span className="bg-gradient-to-r from-rose-500 to-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-md shadow-rose-500/30">
                      {item.badge}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="p-3">
        <div className="glass-dark rounded-2xl p-3">
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-ea-teal-400 to-ea-blue-600 ring-2 ring-white/20 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {userLabel.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">{userLabel}</p>
              <p className="text-white/40 text-[11px] truncate font-mono">{userSub}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors border border-white/10"
          >
            <LogOut size={15} />
            Logout
          </button>
        </div>
      </div>
    </nav>
  )
}

export function PWDLayout({ children, current, onNavigate, onLogout }: {
  children: ReactNode; current: Page; onNavigate: (p: Page) => void; onLogout: () => void
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const session = useSession()
  const { pwdUsers, notifications, globalSearch, setGlobalSearch } = useStore()

  const user = session?.type === 'pwd'
    ? pwdUsers.find((u) => u.id === session.userId)
    : null

  const userLabel = user ? user.name.split(' ').slice(0, 2).join(' ') : 'PWD User'
  const userSub = user ? user.id : ''
  const initial = userLabel.charAt(0)

  const myNotifications = notifications.filter((n) => !n.userId || n.userId === (user?.id ?? ''))
  const unread = myNotifications.filter((n) => !n.read).length

  const items = pwdNav.map((item) =>
    item.page === 'pwd-notifications' && unread > 0 ? { ...item, badge: unread } : item
  )

  const sidebarProps = {
    items, current, onNavigate, onLogout,
    userLabel, userSub,
  }

  const doSearch = () => {
    if (globalSearch.trim()) onNavigate('pwd-benefits')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <DecorBackground />
      <aside className="hidden lg:flex flex-col w-64 shrink-0" aria-label="Sidebar">
        <SidebarNav {...sidebarProps} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 flex flex-col z-50 animate-fade-in">
            <SidebarNav {...sidebarProps} isMobile onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-white/60 shadow-sm px-4 lg:px-6 py-3 flex items-center gap-4" role="banner">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden text-slate-500 hover:text-slate-700 p-1" aria-label="Open navigation">
            <Menu size={22} />
          </button>
          <div className="flex-1 max-w-md">
            <div className="relative group">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-ea-teal-600" />
              <input
                type="search" value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') doSearch() }}
                placeholder="Search benefits, programs, requests..."
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-white/70 bg-white/70 rounded-xl focus:outline-none focus:ring-4 focus:ring-ea-teal-500/20 focus:border-ea-teal-400 shadow-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <div className="relative">
              <button onClick={() => setNotifOpen((v) => !v)} className="relative p-2.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-xl transition-all" aria-label="Notifications">
                <Bell size={19} />
                {unread > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 text-[9px] font-bold bg-gradient-to-r from-rose-500 to-red-500 text-white rounded-full flex items-center justify-center shadow-md shadow-rose-500/30">
                    {unread}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 glass-strong rounded-2xl shadow-xl shadow-slate-900/10 z-50 overflow-hidden animate-scale-in">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/60">
                    <p className="text-sm font-bold text-slate-900">Notifications</p>
                    <button onClick={() => setNotifOpen(false)} className="text-slate-400 hover:text-slate-600" aria-label="Close notifications">
                      <X size={15} />
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-white/40">
                    {myNotifications.length === 0 && (
                      <p className="px-4 py-6 text-center text-sm text-slate-400">No notifications yet.</p>
                    )}
                    {myNotifications.slice(0, 5).map((n) => (
                      <div key={n.id} className={`px-4 py-3 ${n.read ? '' : 'bg-ea-teal-50/70'}`}>
                        <p className="text-xs font-semibold text-slate-800">{n.title}</p>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{n.message}</p>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => { setNotifOpen(false); onNavigate('pwd-notifications') }}
                    className="w-full px-4 py-2.5 text-xs font-semibold text-ea-teal-700 hover:bg-ea-teal-50/70 border-t border-white/60"
                  >
                    View all notifications
                  </button>
                </div>
              )}
            </div>
            <button onClick={() => onNavigate('pwd-profile')} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-white rounded-xl transition-all">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-ea-teal-500 to-ea-blue-600 ring-2 ring-ea-teal-400/30 flex items-center justify-center text-white font-bold text-xs">{initial}</div>
              <span className="hidden sm:block font-semibold text-slate-800">{userLabel}</span>
              <ChevronDown size={13} className="text-slate-400" />
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
  const [activityOpen, setActivityOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const session = useSession()
  const { adminUsers, activityLog } = useStore()

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
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <DecorBackground />
      <aside className="hidden lg:flex flex-col w-64 shrink-0" aria-label="Admin sidebar">
        <SidebarNav {...sidebarProps} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 flex flex-col z-50 animate-fade-in">
            <SidebarNav {...sidebarProps} isMobile onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-white/60 shadow-sm px-4 lg:px-6 py-3 flex items-center gap-4" role="banner">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden text-slate-500 hover:text-slate-700 p-1" aria-label="Open navigation">
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-medium text-slate-400 hidden sm:block">EqualAccess Portal</span>
            <span className="text-slate-200 hidden sm:block">›</span>
            <span className="text-xs font-semibold text-slate-600 hidden sm:block">Admin Portal</span>
            {admin && (
              <>
                <span className="text-slate-200 hidden sm:block">›</span>
                <span className="text-xs font-bold text-gradient hidden sm:block">{admin.role}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <div className="relative">
              <button onClick={() => setHelpOpen((v) => !v)} className="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-xl transition-all" aria-label="Help">
                <HelpCircle size={19} />
              </button>
              {helpOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 glass-strong rounded-2xl shadow-xl shadow-slate-900/10 z-50 p-5 space-y-3 animate-scale-in">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-900">PDAO Help Desk</p>
                    <button onClick={() => setHelpOpen(false)} className="text-slate-400 hover:text-slate-600" aria-label="Close help">
                      <X size={15} />
                    </button>
                  </div>
                  <div className="space-y-2.5 text-sm text-slate-600">
                    <p className="flex items-center gap-2"><Phone size={14} className="text-ea-teal-600" />+63 49 536 0050</p>
                    <p className="flex items-center gap-2"><Mail size={14} className="text-ea-teal-600" />pdao@losbanos.gov.ph</p>
                    <p className="flex items-center gap-2"><MapPin size={14} className="text-ea-teal-600" />Los Baños Municipal Hall, Laguna</p>
                  </div>
                </div>
              )}
            </div>
            <div className="relative">
              <button onClick={() => setActivityOpen((v) => !v)} className="relative p-2.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-xl transition-all" aria-label="Recent activity">
                <Bell size={19} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-gradient-to-r from-rose-500 to-red-500 rounded-full shadow-md shadow-rose-500/40" aria-hidden="true" />
              </button>
              {activityOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 glass-strong rounded-2xl shadow-xl shadow-slate-900/10 z-50 overflow-hidden animate-scale-in">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/60">
                    <p className="text-sm font-bold text-slate-900">Recent Activity</p>
                    <button onClick={() => setActivityOpen(false)} className="text-slate-400 hover:text-slate-600" aria-label="Close activity">
                      <X size={15} />
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-white/40">
                    {activityLog.slice(0, 6).map((a, i) => (
                      <div key={i} className="px-4 py-3">
                        <p className="text-xs font-semibold text-slate-800">{a.action}</p>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{a.activity}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{a.date} · {a.time}</p>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => { setActivityOpen(false); onNavigate('admin-users') }}
                    className="w-full px-4 py-2.5 text-xs font-semibold text-ea-teal-700 hover:bg-ea-teal-50/70 border-t border-white/60"
                  >
                    Open User Management
                  </button>
                </div>
              )}
            </div>
            <button className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-white rounded-xl transition-all">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-ea-blue-600 to-indigo-600 ring-2 ring-ea-blue-400/30 flex items-center justify-center text-white font-bold text-xs">{initial}</div>
              <span className="hidden sm:block font-semibold text-slate-800">{userLabel.split(' ')[0]}</span>
              <ChevronDown size={13} className="text-slate-400" />
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
