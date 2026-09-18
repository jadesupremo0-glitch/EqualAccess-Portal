import { useState, useEffect } from 'react'
import { ArrowLeft, AlertCircle, Accessibility, ChevronDown, ChevronUp, KeyRound } from 'lucide-react'
import { Input, PasswordInput, Alert, Button } from '../components/ui'
import { useStore } from '../store'
import { requestResetCode, completePasswordReset } from '../lib/passwordReset'

const PWD_DEMO_ACCOUNTS = [
  { pwdId: 'LB-VIS-2023-00421', password: 'pwd123', name: 'Maria Santos Reyes', id: 'PWD-LB-2024-0042', type: 'Visual Disability', status: 'Verified' },
  { pwdId: 'LB-PHY-2023-00312', password: 'pwd123', name: 'Juan dela Cruz', id: 'PWD-LB-2024-0043', type: 'Physical Disability', status: 'Verified' },
  { pwdId: 'LB-HEA-2024-00018', password: 'pwd123', name: 'Ana Macaraeg', id: 'PWD-LB-2024-0044', type: 'Deaf or Hard of Hearing', status: 'Pending' },
  { pwdId: 'LB-MEN-2023-00156', password: 'pwd123', name: 'Roberto Villanueva', id: 'PWD-LB-2024-0045', type: 'Mental Disability', status: 'Verified' },
  { pwdId: 'LB-CAN-2024-00007', password: 'pwd123', name: 'Liza Corpuz', id: 'PWD-LB-2024-0046', type: 'Cancer (RA 11215)', status: 'Rejected' },
  { pwdId: 'LB-LEA-2024-00043', password: 'pwd123', name: 'Felix Abad', id: 'PWD-LB-2024-0047', type: 'Learning Disability', status: 'Pending' },
  { pwdId: 'LB-PSY-2024-00029', password: 'pwd123', name: 'Carmelita Flores', id: 'PWD-LB-2024-0048', type: 'Psychosocial Disability', status: 'Verified' },
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
  const [username, setUsername] = useState('')  // stores PWD ID No. or admin username
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showDemo, setShowDemo] = useState(false)

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('equalaccess-portal:remember-user')
      if (saved) {
        const parsed = JSON.parse(saved) as { tab: 'user' | 'admin'; username: string }
        if (parsed.username && (parsed.tab === 'user' || parsed.tab === 'admin')) {
          setTab(parsed.tab)
          setUsername(parsed.username)
        }
      }
    } catch {
      // ignore malformed saved state
    }
  }, [])

  // Forgot-password flow
  const [mode, setMode] = useState<'login' | 'reset'>('login')
  const [resetStep, setResetStep] = useState<1 | 2>(1)
  const [resetIdentifier, setResetIdentifier] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [resetNewPw, setResetNewPw] = useState('')
  const [resetConfirmPw, setResetConfirmPw] = useState('')
  const [resetMsg, setResetMsg] = useState('')
  const [resetErr, setResetErr] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const { resetPassword } = useStore()

  const openReset = () => {
    setMode('reset')
    setResetStep(1)
    setResetIdentifier(tab === 'user' ? username : username)
    setResetCode('')
    setResetNewPw('')
    setResetConfirmPw('')
    setResetErr('')
    setResetMsg('')
    setNotice('')
    setError('')
  }

  const closeReset = () => {
    setMode('login')
    setResetErr('')
    setResetMsg('')
  }

  const sendResetCode = async () => {
    if (!resetIdentifier.trim()) {
      setResetErr(tab === 'user' ? 'Please enter your PWD ID No. or email address.' : 'Please enter your username or email address.')
      return
    }
    setResetErr('')
    setResetMsg('')
    setResetLoading(true)
    const res = await requestResetCode(tab === 'user' ? 'pwd' : 'admin', resetIdentifier.trim())
    setResetLoading(false)
    if (!res.ok) {
      setResetErr(res.error ?? 'Could not send the verification code.')
      return
    }
    setResetStep(2)
    setResetMsg(res.message ?? 'A verification code has been sent to your email.')
  }

  const submitReset = async () => {
    if (!resetCode.trim()) {
      setResetErr('Please enter the verification code from your email.')
      return
    }
    if (resetNewPw.length < 8) {
      setResetErr('New password must be at least 8 characters.')
      return
    }
    if (resetNewPw !== resetConfirmPw) {
      setResetErr('New passwords do not match.')
      return
    }
    setResetErr('')
    setResetMsg('')
    setResetLoading(true)
    const res = await completePasswordReset(tab === 'user' ? 'pwd' : 'admin', resetIdentifier.trim(), resetCode.trim(), resetNewPw)
    setResetLoading(false)
    if (!res.ok) {
      setResetErr(res.error ?? 'Could not reset your password.')
      return
    }
    resetPassword(tab, resetIdentifier.trim(), resetNewPw)
    setUsername(resetIdentifier.trim())
    setPassword(resetNewPw)
    setMode('login')
    setError('')
    setNotice('Password updated successfully. You can now sign in with your new password.')
  }

  const fillDemo = (u: string, p: string) => {
    setUsername(u)
    setPassword(p)
    setError('')
  }

  const statusColor: Record<string, string> = {
    Verified: 'bg-emerald-100 text-emerald-700',
    Pending: 'bg-amber-100 text-amber-700',
    Rejected: 'bg-rose-100 text-rose-700',
  }

  // For PWD login, use pwdIdNumber; for admin, use username
  const handleLoginWithTab = () => {
    if (!username || !password) { setError(tab === 'user' ? 'Please enter your PWD ID No. and password.' : 'Please enter your username and password.'); return }
    setError('')
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      const err = onLogin(tab, username, password)
      if (err) { setError(err); return }
      try {
        if (remember) {
          window.localStorage.setItem('equalaccess-portal:remember-user', JSON.stringify({ tab, username }))
        } else {
          window.localStorage.removeItem('equalaccess-portal:remember-user')
        }
      } catch {
        // storage unavailable — skip
      }
    }, 600)
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex bg-slate-50">
      {/* Decorative blobs */}
      <div className="fixed inset-0 -z-10 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-32 -left-24 w-[30rem] h-[30rem] rounded-full bg-gradient-to-br from-ea-teal-400/25 to-sky-400/20 blur-3xl animate-blob" />
        <div className="absolute bottom-0 right-0 w-[28rem] h-[28rem] rounded-full bg-gradient-to-tl from-ea-blue-500/20 to-indigo-400/15 blur-3xl animate-blob-delayed" />
      </div>

      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-brand-glow p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-decor-grid opacity-15" aria-hidden="true" />
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-16 -left-10 w-64 h-64 rounded-full bg-ea-teal-400/20 blur-3xl" aria-hidden="true" />

        <div className="relative">
          <button onClick={() => onNavigate('landing')} className="flex items-center gap-2 text-teal-200/80 hover:text-white text-sm font-medium transition-colors glass-dark rounded-xl px-3 py-2">
            <ArrowLeft size={16} />
            Back to Home
          </button>
        </div>

        <div className="relative">
          <div className="flex items-center gap-3 mb-9">
            <div className="w-13 h-13 rounded-2xl glass-dark flex items-center justify-center shadow-xl" style={{ width: 52, height: 52 }}>
              <span className="text-white font-black text-lg font-display">EA</span>
            </div>
            <div>
              <p className="font-display text-white font-bold text-base tracking-tight">EqualAccess Portal</p>
              <p className="text-teal-300/90 text-xs">PDAO — Los Baños, Laguna</p>
            </div>
          </div>

          <h1 className="font-display text-4xl font-extrabold text-white leading-tight mb-4 tracking-tight animate-fade-up">
            Access Government Benefits, <span className="bg-gradient-to-r from-teal-300 to-sky-300 bg-clip-text text-transparent">Anytime.</span>
          </h1>
          <p className="text-teal-100/90 text-base leading-relaxed mb-9">
            Sign in to explore programs, track your assistance requests, and discover employment opportunities curated for you.
          </p>

          <div className="space-y-3">
            {[
              'Real-time request tracking with visual timeline',
              'Job matches based on your skills and profile',
              'Secure messaging with PDAO staff',
              'Instant notifications on request updates',
            ].map((f, i) => (
              <div key={f} className="flex items-center gap-3 text-teal-100 text-sm glass-dark rounded-xl px-4 py-3 animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="w-5 h-5 rounded-full bg-gradient-to-r from-teal-400 to-sky-400 flex items-center justify-center shrink-0">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
                {f}
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center gap-2 text-teal-300/80 text-xs">
          <Accessibility size={14} />
          This portal complies with WCAG 2.1 Level AA accessibility standards.
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-10 overflow-y-auto">
        <div className="w-full max-w-md animate-fade-up">
          <button onClick={() => onNavigate('landing')} className="lg:hidden flex items-center gap-2 text-slate-400 hover:text-slate-600 text-sm mb-6">
            <ArrowLeft size={15} />
            Back to Home
          </button>

          <div className="flex items-center gap-2.5 mb-6 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-ea-teal-500 to-ea-blue-600 flex items-center justify-center shadow-lg shadow-ea-teal-600/25">
              <span className="text-white font-black text-sm font-display">EA</span>
            </div>
            <div>
              <p className="font-display font-bold text-slate-900 text-sm tracking-tight">EqualAccess Portal</p>
              <p className="text-slate-400 text-xs">PDAO — Los Baños, Laguna</p>
            </div>
          </div>

          <div className="mb-7">
            <h2 className="font-display text-2xl font-extrabold text-slate-900 mb-1 tracking-tight">Welcome back</h2>
            <p className="text-slate-500 text-sm">Sign in to your EqualAccess Portal account</p>
          </div>

          {/* Portal toggle */}
          <div className="flex gap-1 bg-white/60 border border-white/70 backdrop-blur rounded-xl p-1 mb-6 shadow-sm" role="tablist" aria-label="Select portal">
            <button
              role="tab" aria-selected={tab === 'user'}
              onClick={() => { setTab('user'); setError('') }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${tab === 'user' ? 'bg-white text-ea-teal-700 shadow-sm ring-1 ring-ea-teal-100' : 'text-slate-400 hover:text-slate-600'}`}
            >
              PWD User Portal
            </button>
            <button
              role="tab" aria-selected={tab === 'admin'}
              onClick={() => { setTab('admin'); setError('') }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${tab === 'admin' ? 'bg-white text-ea-blue-700 shadow-sm ring-1 ring-ea-blue-100' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Admin / PDAO Staff
            </button>
          </div>

          <div className="card-glass rounded-2xl p-7 space-y-5">
            {notice && mode === 'login' && <Alert type="success" message={notice} />}
            {error && mode === 'login' && <Alert type="error" message={error} />}

            {mode === 'login' ? (
              <>
                <form onSubmit={(e) => { e.preventDefault(); handleLoginWithTab() }} className="space-y-4">
                  <Input
                    label={tab === 'user' ? 'PWD ID No.' : 'Username'}
                    type="text"
                    placeholder={tab === 'user' ? 'Enter your PWD ID number' : 'Enter your PDAO staff username'}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete={tab === 'user' ? 'off' : 'username'}
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
                        className="w-4 h-4 rounded border-gray-300 text-ea-teal-600 focus:ring-ea-teal-500" />
                      <span className="text-sm text-slate-600">Remember me</span>
                    </label>
                    <button type="button" onClick={openReset} className="inline-flex items-center gap-1.5 -mr-2 px-2.5 py-1.5 rounded-lg text-sm font-semibold text-ea-teal-700 hover:text-ea-teal-800 hover:bg-ea-teal-50 underline decoration-ea-teal-300 underline-offset-2 transition-colors">
                      <KeyRound size={14} />
                      Forgot password?
                    </button>
                  </div>
                  <Button type="submit" size="lg" fullWidth disabled={loading}>
                    {loading ? 'Signing in...' : `Sign In${tab === 'admin' ? ' — PDAO Staff' : ''}`}
                  </Button>
                </form>

                {tab === 'user' && (
                  <p className="text-center text-sm text-slate-500">
                    Don't have an account?{' '}
                    <button onClick={() => onNavigate('register')} className="text-ea-teal-700 font-semibold hover:text-ea-teal-800">
                      Register with PDAO
                    </button>
                  </p>
                )}

                <div className="pt-3 border-t border-white/60">
                  <p className="text-xs font-semibold text-slate-500 mb-2.5">Quick demo sign-in</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => tab === 'user' ? fillDemo('LB-VIS-2023-00421', 'pwd123') : fillDemo('pdao.admin', 'admin123')}
                      className="text-xs text-slate-600 bg-white/70 border border-white/70 rounded-xl px-3 py-2 hover:border-ea-teal-300 hover:text-ea-teal-700 transition-all text-left font-medium">
                      {tab === 'user' ? '👤 Maria Reyes (PWD)' : '🛡️ PDAO Admin'}
                    </button>
                    <button onClick={() => tab === 'user' ? fillDemo('LB-PHY-2023-00312', 'pwd123') : fillDemo('pdao.benefits', 'admin123')}
                      className="text-xs text-slate-600 bg-white/70 border border-white/70 rounded-xl px-3 py-2 hover:border-ea-teal-300 hover:text-ea-teal-700 transition-all text-left font-medium">
                      {tab === 'user' ? '👤 Juan dela Cruz' : '🛡️ Benefits Officer'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <button type="button" onClick={closeReset} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm font-medium">
                  <ArrowLeft size={15} />
                  Back to sign in
                </button>

                <div>
                  <h3 className="font-display text-lg font-bold text-slate-900">Reset your password</h3>
                  <p className="text-slate-500 text-sm mt-0.5">
                    {resetStep === 1
                      ? tab === 'user'
                        ? 'Enter your PWD ID No. or email address and we will send a 6-digit verification code.'
                        : 'Enter your username or email address and we will send a 6-digit verification code.'
                      : 'Enter the 6-digit code sent to your email and choose a new password.'}
                  </p>
                </div>

                {resetErr && <Alert type="error" message={resetErr} />}
                {resetMsg && <Alert type="info" message={resetMsg} />}

                {resetStep === 1 ? (
                  <div className="space-y-4">
                    <Input
                      label={tab === 'user' ? 'PWD ID No. or Email' : 'Username or Email'}
                      type="text"
                      placeholder={tab === 'user' ? 'e.g. LB-VIS-2023-00421 or you@email.com' : 'e.g. pdao.admin or you@email.com'}
                      value={resetIdentifier}
                      onChange={(e) => setResetIdentifier(e.target.value)}
                      required
                    />
                    <Button type="button" size="lg" fullWidth disabled={resetLoading} onClick={sendResetCode}>
                      {resetLoading ? 'Sending code...' : 'Send verification code'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Input
                      label="Verification Code"
                      type="text"
                      placeholder="Enter the 6-digit code"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      required
                    />
                    <PasswordInput
                      label="New Password"
                      placeholder="At least 8 characters"
                      value={resetNewPw}
                      onChange={(e) => setResetNewPw(e.target.value)}
                      required
                    />
                    <PasswordInput
                      label="Confirm New Password"
                      placeholder="Re-enter new password"
                      value={resetConfirmPw}
                      onChange={(e) => setResetConfirmPw(e.target.value)}
                      required
                    />
                    <Button type="button" size="lg" fullWidth disabled={resetLoading} onClick={submitReset}>
                      {resetLoading ? 'Resetting...' : 'Reset password'}
                    </Button>
                    <button type="button" onClick={sendResetCode} disabled={resetLoading}
                      className="w-full text-center text-sm text-ea-teal-700 hover:text-ea-teal-800 font-medium disabled:opacity-50">
                      Didn't get a code? Send again
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {mode === 'login' && (
            <>
              {/* Demo accounts panel */}
              <div className="mt-5 border border-amber-200/80 bg-amber-50/60 rounded-2xl overflow-hidden backdrop-blur">
            <button
              onClick={() => setShowDemo((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-amber-800 text-sm font-semibold hover:bg-amber-100/60 transition-colors"
            >
              <span>Demo Accounts — {tab === 'user' ? 'PWD Users' : 'PDAO Staff'}</span>
              {showDemo ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>

            {showDemo && (
              <div className="bg-white/80 divide-y divide-slate-100 max-h-72 overflow-y-auto backdrop-blur">
                {tab === 'user'
                  ? PWD_DEMO_ACCOUNTS.map((a) => (
                    <button
                      key={a.pwdId}
                      onClick={() => fillDemo(a.pwdId, a.password)}
                      className="w-full text-left px-4 py-3 hover:bg-ea-teal-50 transition-colors group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{a.name}</p>
                          <p className="text-xs text-slate-400">{a.type}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${statusColor[a.status]}`}>{a.status}</span>
                        </div>
                      </div>
                      <div className="flex gap-3 mt-1.5">
                        <span className="text-[11px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{a.pwdId}</span>
                        <span className="text-[11px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{a.password}</span>
                        <span className="text-[11px] text-ea-teal-600 font-medium group-hover:underline ml-auto">Use →</span>
                      </div>
                    </button>
                  ))
                  : ADMIN_DEMO_ACCOUNTS.map((a) => (
                    <button
                      key={a.username}
                      onClick={() => fillDemo(a.username, a.password)}
                      className="w-full text-left px-4 py-3 hover:bg-ea-teal-50 transition-colors group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{a.name}</p>
                          <p className="text-xs text-slate-400">{a.role}</p>
                        </div>
                      </div>
                      <div className="flex gap-3 mt-1.5">
                        <span className="text-[11px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{a.username}</span>
                        <span className="text-[11px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{a.password}</span>
                        <span className="text-[11px] text-ea-teal-600 font-medium group-hover:underline ml-auto">Use →</span>
                      </div>
                    </button>
                  ))
                }
              </div>
            )}
          </div>
            </>
          )}

          <div className="mt-4 p-4 bg-ea-teal-50/80 rounded-xl border border-ea-teal-100 backdrop-blur">
            <div className="flex gap-2">
              <AlertCircle size={15} className="text-ea-teal-700 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-ea-teal-900 mb-0.5">Need help signing in?</p>
                <p className="text-xs text-ea-teal-700">Contact the PDAO at <strong>+63 49 536 0050</strong> or visit the Municipal Hall, Los Baños.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
