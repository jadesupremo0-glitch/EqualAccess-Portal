import { useState } from 'react'
import { ArrowLeft, AlertCircle, Accessibility, ChevronDown, ChevronUp } from 'lucide-react'
import { Button, Input, PasswordInput, Alert } from '../components/ui'

const PWD_DEMO_ACCOUNTS = [
  { username: 'maria.reyes', password: 'pwd123', name: 'Maria Santos Reyes', id: 'PWD-LB-2024-0042', type: 'Visual Disability', status: 'Verified' },
  { username: 'juan.delacruz', password: 'pwd123', name: 'Juan dela Cruz', id: 'PWD-LB-2024-0043', type: 'Physical Disability', status: 'Verified' },
  { username: 'ana.macaraeg', password: 'pwd123', name: 'Ana Macaraeg', id: 'PWD-LB-2024-0044', type: 'Hearing Disability', status: 'Pending' },
  { username: 'roberto.v', password: 'pwd123', name: 'Roberto Villanueva', id: 'PWD-LB-2024-0045', type: 'Mental Disability', status: 'Verified' },
  { username: 'liza.corpuz', password: 'pwd123', name: 'Liza Corpuz', id: 'PWD-LB-2024-0046', type: 'Chronic Illness', status: 'Rejected' },
  { username: 'felix.abad', password: 'pwd123', name: 'Felix Abad', id: 'PWD-LB-2024-0047', type: 'Learning Disability', status: 'Pending' },
  { username: 'carmelita.flores', password: 'pwd123', name: 'Carmelita Flores', id: 'PWD-LB-2024-0048', type: 'Psychosocial Disability', status: 'Verified' },
]

const ADMIN_DEMO_ACCOUNTS = [
  { username: 'pdao.admin', password: 'admin123', name: 'Engr. Mario dela Vega', role: 'Administrator' },
  { username: 'pdao.benefits', password: 'admin123', name: 'Ma. Carmen Santos', role: 'Benefits Officer' },
  { username: 'pdao.socwel', password: 'admin123', name: 'Ronaldo Agustin', role: 'Social Worker' },
  { username: 'pdao.records', password: 'admin123', name: 'Janine Pascual', role: 'Records Officer' },
]

export default function Login({
  onNavigate,
  onLogin,
}: {
  onNavigate: (p: string) => void
  onLogin: (tab: 'user' | 'admin', username: string, password: string) => string | null
}) {
  const [tab, setTab] = useState<'user' | 'admin'>('user')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showDemo, setShowDemo] = useState(false)

  const handleLogin = () => {
    if (!username || !password) { setError('Please enter your username and password.'); return }
    setError('')
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      const err = onLogin(tab, username, password)
      if (err) setError(err)
    }, 600)
  }

  const fillDemo = (u: string, p: string) => {
    setUsername(u)
    setPassword(p)
    setError('')
  }

  const statusColor: Record<string, string> = {
    Verified: 'bg-green-100 text-green-700',
    Pending: 'bg-amber-100 text-amber-700',
    Rejected: 'bg-red-100 text-red-700',
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-teal-900 p-12 relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800&h=1000&fit=crop&auto=format"
            alt="People with disabilities using digital services"
            className="w-full h-full object-cover opacity-10"
          />
        </div>
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-teal-700 opacity-30" aria-hidden="true" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-teal-800 opacity-40" aria-hidden="true" />

        <div className="relative">
          <button onClick={() => onNavigate('landing')} className="flex items-center gap-2 text-teal-300 hover:text-white text-sm font-medium transition-colors">
            <ArrowLeft size={16} />
            Back to Home
          </button>
        </div>

        <div className="relative">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
              <span className="text-white font-black text-lg">EA</span>
            </div>
            <div>
              <p className="text-white font-bold text-base">EqualAccess Portal</p>
              <p className="text-teal-300 text-xs">PDAO — Los Baños, Laguna</p>
            </div>
          </div>

          <h1 className="text-4xl font-extrabold text-white leading-tight mb-4">
            Access Government Benefits, Anytime.
          </h1>
          <p className="text-teal-200 text-base leading-relaxed mb-8">
            Sign in to explore programs, track your assistance requests, and discover employment opportunities curated for you.
          </p>

          <div className="space-y-3">
            {[
              'Real-time request tracking with visual timeline',
              'Job matches based on your skills and profile',
              'Secure messaging with PDAO staff',
              'Instant notifications on request updates',
            ].map((f) => (
              <div key={f} className="flex items-center gap-2.5 text-teal-100 text-sm">
                <div className="w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center shrink-0">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
                {f}
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center gap-2 text-teal-400 text-xs">
          <Accessibility size={14} />
          This portal complies with WCAG 2.1 Level AA accessibility standards.
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-10 overflow-y-auto">
        <div className="w-full max-w-md">
          <button onClick={() => onNavigate('landing')} className="lg:hidden flex items-center gap-2 text-gray-400 hover:text-gray-600 text-sm mb-6">
            <ArrowLeft size={15} />
            Back to Home
          </button>

          <div className="flex items-center gap-2.5 mb-6 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center">
              <span className="text-white font-black text-sm">EA</span>
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">EqualAccess Portal</p>
              <p className="text-gray-400 text-xs">PDAO — Los Baños, Laguna</p>
            </div>
          </div>

          <div className="mb-7">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
            <p className="text-gray-500 text-sm">Sign in to your EqualAccess Portal account</p>
          </div>

          {/* Portal toggle */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6" role="tablist" aria-label="Select portal">
            <button
              role="tab" aria-selected={tab === 'user'}
              onClick={() => { setTab('user'); setError('') }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${tab === 'user' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              PWD User Portal
            </button>
            <button
              role="tab" aria-selected={tab === 'admin'}
              onClick={() => { setTab('admin'); setError('') }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${tab === 'admin' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Admin / PDAO Staff
            </button>
          </div>

          {error && <div className="mb-4"><Alert type="error" message={error} /></div>}

          <form onSubmit={(e) => { e.preventDefault(); handleLogin() }} className="space-y-4">
            <Input
              label="Username or PWD ID"
              type="text"
              placeholder={tab === 'user' ? 'Enter username or PWD ID number' : 'Enter your PDAO staff username'}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
            <PasswordInput
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
              <button type="button" className="text-sm text-teal-700 hover:text-teal-800 font-medium">
                Forgot password?
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-sm font-semibold bg-teal-600 text-white rounded-xl hover:bg-teal-700 active:bg-teal-800 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Signing in...' : `Sign In${tab === 'admin' ? ' — PDAO Staff' : ''}`}
            </button>
          </form>

          {tab === 'user' && (
            <p className="mt-5 text-center text-sm text-gray-500">
              Don't have an account?{' '}
              <button onClick={() => onNavigate('register')} className="text-teal-700 font-semibold hover:text-teal-800">
                Register with PDAO
              </button>
            </p>
          )}

          {/* Demo accounts panel */}
          <div className="mt-5 border border-amber-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowDemo((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-amber-50 text-amber-800 text-sm font-semibold hover:bg-amber-100 transition-colors"
            >
              <span>Demo Accounts — {tab === 'user' ? 'PWD Users' : 'PDAO Staff'}</span>
              {showDemo ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>

            {showDemo && (
              <div className="bg-white divide-y divide-gray-100 max-h-72 overflow-y-auto">
                {tab === 'user'
                  ? PWD_DEMO_ACCOUNTS.map((a) => (
                    <button
                      key={a.username}
                      onClick={() => fillDemo(a.username, a.password)}
                      className="w-full text-left px-4 py-3 hover:bg-teal-50 transition-colors group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{a.name}</p>
                          <p className="text-xs text-gray-400">{a.type}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${statusColor[a.status]}`}>{a.status}</span>
                        </div>
                      </div>
                      <div className="flex gap-3 mt-1.5">
                        <span className="text-[11px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{a.username}</span>
                        <span className="text-[11px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{a.password}</span>
                        <span className="text-[11px] text-teal-600 font-medium group-hover:underline ml-auto">Use →</span>
                      </div>
                    </button>
                  ))
                  : ADMIN_DEMO_ACCOUNTS.map((a) => (
                    <button
                      key={a.username}
                      onClick={() => fillDemo(a.username, a.password)}
                      className="w-full text-left px-4 py-3 hover:bg-teal-50 transition-colors group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{a.name}</p>
                          <p className="text-xs text-gray-400">{a.role}</p>
                        </div>
                      </div>
                      <div className="flex gap-3 mt-1.5">
                        <span className="text-[11px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{a.username}</span>
                        <span className="text-[11px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{a.password}</span>
                        <span className="text-[11px] text-teal-600 font-medium group-hover:underline ml-auto">Use →</span>
                      </div>
                    </button>
                  ))
                }
              </div>
            )}
          </div>

          <div className="mt-4 p-4 bg-teal-50 rounded-xl border border-teal-100">
            <div className="flex gap-2">
              <AlertCircle size={15} className="text-teal-700 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-teal-800 mb-0.5">Need help signing in?</p>
                <p className="text-xs text-teal-700">Contact the PDAO at <strong>+63 49 536 0050</strong> or visit the Municipal Hall, Los Baños.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
