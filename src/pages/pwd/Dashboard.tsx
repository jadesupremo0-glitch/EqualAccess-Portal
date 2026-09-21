import { Gift, FileText, ClipboardList, MessageSquare, CheckCircle, Clock, Briefcase, ArrowRight, Sparkles } from 'lucide-react'
import { Card, StatsCard, statusBadge, Button } from '../../components/ui'
import { usePWDSession } from '../../context'
import { useStore } from '../../store'
import { useMemo } from 'react'
import { getRecommendations } from '../../lib/recommend/score'

export default function PWDDashboard({ onNavigate }: { onNavigate: (p: string) => void }) {
  const session = usePWDSession()
  const { pwdUsers, benefits, assistanceRequests, notifications, jobs } = useStore()
  const user = session ? pwdUsers.find((u) => u.id === session.userId) : pwdUsers[0]
  const currentUser = user ?? pwdUsers[0]

  const userRequests = assistanceRequests.filter((r) => r.pwdId === currentUser.id)
  const unread = notifications.filter((n) => !n.read && (!n.userId || n.userId === currentUser.id))
  const matchResult = useMemo(() => getRecommendations(currentUser, jobs), [currentUser, jobs])
  const topJobRec = matchResult.recommendations[0]

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-3xl bg-brand-glow p-6 lg:p-8 text-white shadow-xl animate-fade-up">
        <div className="absolute inset-0 bg-decor-grid opacity-15" aria-hidden="true" />
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 blur-2xl animate-blob" aria-hidden="true" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <p className="text-teal-200 text-sm mb-1">Welcome back,</p>
            <h1 className="font-display text-2xl font-extrabold tracking-tight">{currentUser.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {currentUser.verificationStatus === 'Verified' ? (
                <span className="inline-flex items-center gap-1.5 glass-dark text-green-200 text-xs font-semibold px-2.5 py-1 rounded-full">
                  <CheckCircle size={11} />Verified · {currentUser.pwdIdNumber}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 bg-amber-500/20 border border-amber-400/30 text-amber-200 text-xs font-semibold px-2.5 py-1 rounded-full">
                  <Clock size={11} />Pending Verification
                </span>
              )}
              <span className="text-teal-300 text-xs font-mono">{currentUser.id}</span>
            </div>
          </div>
          <div className="glass-dark rounded-2xl p-4 min-w-[200px] shadow-lg">
            <p className="text-teal-200 text-xs font-semibold mb-2 uppercase tracking-wide">Profile</p>
            <p className="text-white text-xs leading-relaxed">
              {currentUser.address}, {currentUser.barangay}
            </p>
            <p className="text-teal-200 text-xs mt-1">{currentUser.disabilityType}</p>
            <p className="text-teal-300 text-xs font-mono mt-0.5">{currentUser.pwdIdNumber}</p>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'View Benefits', icon: <Gift size={20} />, page: 'pwd-benefits', bg: 'bg-teal-50 text-teal-700 hover:bg-teal-100', border: 'border-teal-100' },
            { label: 'New Request', icon: <FileText size={20} />, page: 'pwd-requests', bg: 'bg-blue-50 text-blue-700 hover:bg-blue-100', border: 'border-blue-100' },
            { label: 'Track Request', icon: <ClipboardList size={20} />, page: 'pwd-tracking', bg: 'bg-amber-50 text-amber-700 hover:bg-amber-100', border: 'border-amber-100' },
            { label: 'Send Feedback', icon: <MessageSquare size={20} />, page: 'pwd-feedback', bg: 'bg-purple-50 text-purple-700 hover:bg-purple-100', border: 'border-purple-100' },
          ].map((a) => (
            <button
              key={a.label}
              onClick={() => onNavigate(a.page)}
              className={`flex flex-col items-center gap-2.5 p-4 rounded-2xl font-semibold text-sm transition-all border backdrop-blur hover:-translate-y-0.5 hover:shadow-lift ${a.bg} ${a.border}`}
            >
              {a.icon}
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Available Programs" value={benefits.filter((b) => b.status === 'Active' || b.status === 'Approved').length} icon={<Gift size={20} className="text-teal-600" />} color="bg-teal-50" />
        <StatsCard label="Pending Requests" value={userRequests.filter((r) => r.status === 'Pending' || r.status === 'Under Review').length} icon={<Clock size={20} className="text-amber-600" />} color="bg-amber-50" />
        <StatsCard label="Approved Requests" value={userRequests.filter((r) => r.status === 'Approved' || r.status === 'Completed').length} icon={<CheckCircle size={20} className="text-green-600" />} color="bg-green-50" />
        <StatsCard label="Job Matches" value={matchResult.locked ? '—' : matchResult.recommendations.filter((r) => r.score >= 70).length} note={matchResult.locked ? 'Add your skills first' : undefined} icon={<Briefcase size={20} className="text-blue-600" />} color="bg-blue-50" />
      </div>

      <div className="grid lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-gray-900">Recommended Programs</h2>
            <button onClick={() => onNavigate('pwd-benefits')} className="text-sm text-teal-700 font-medium flex items-center gap-1 hover:text-teal-800">
              View all <ArrowRight size={13} />
            </button>
          </div>
          <div className="space-y-3">
            {benefits.filter((b) => b.status === 'Active' || b.status === 'Approved').slice(0, 3).map((b) => (
              <Card key={b.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-semibold text-teal-700">{b.category}</span>
                      {statusBadge(b.status)}
                    </div>
                    <h3 className="font-semibold text-gray-900 text-sm">{b.name}</h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{b.description}</p>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
                      <span>📍 {b.barangay}</span>
                      <span>📅 Deadline: {b.applicationDeadline}</span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => onNavigate('pwd-benefits')}>View</Button>
                </div>
              </Card>
            ))}
          </div>

          {matchResult.locked && (
            <Card className="p-4 border-teal-100">
              <div className="flex items-start gap-3">
                <Sparkles size={16} className="text-teal-600 mt-0.5 shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">Get job recommendations</p>
                  <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">Tell us your skills and highest education, then we&apos;ll show jobs that fit you.</p>
                </div>
                <Button size="sm" onClick={() => onNavigate('pwd-jobs')}>Start</Button>
              </div>
            </Card>
          )}

          {topJobRec && (
            <Card className="p-4 border-teal-100">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={14} className="text-teal-600" />
                <p className="text-xs font-bold text-teal-700 uppercase tracking-wide">Top Job Match for You</p>
              </div>
              <div className="flex items-start gap-4">
                <div className="relative w-12 h-12 shrink-0">
                  <svg viewBox="0 0 50 50" className="w-12 h-12 -rotate-90">
                    <circle cx="25" cy="25" r="22" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                    <circle cx="25" cy="25" r="22" fill="none" stroke="#0d9488" strokeWidth="4"
                      strokeDasharray={`${(topJobRec.score / 100) * 138} 138`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-extrabold text-teal-700">{Math.round(topJobRec.score)}%</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{topJobRec.job.title}</p>
                  <p className="text-xs text-teal-700 font-medium">{topJobRec.job.company}</p>
                  <p className="text-xs text-gray-400 mt-0.5">📍 {topJobRec.job.location} · {topJobRec.job.employmentType}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => onNavigate('pwd-jobs')}>View</Button>
              </div>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-gray-900">Recent Requests</h2>
            <button onClick={() => onNavigate('pwd-tracking')} className="text-sm text-teal-700 font-medium flex items-center gap-1 hover:text-teal-800">
              Track <ArrowRight size={13} />
            </button>
          </div>

          {userRequests.length === 0 ? (
            <Card className="p-6 text-center">
              <FileText size={28} className="text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No requests yet.</p>
              <button onClick={() => onNavigate('pwd-requests')} className="text-xs text-teal-600 font-medium mt-1 hover:underline">Submit your first request →</button>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {userRequests.slice(0, 4).map((r) => (
                <Card key={r.id} className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-[10px] font-mono text-gray-400">{r.id}</p>
                    {statusBadge(r.status)}
                  </div>
                  <p className="text-sm font-semibold text-gray-900 truncate">{r.type}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Submitted: {r.dateSubmitted}</p>
                </Card>
              ))}
            </div>
          )}

          {unread.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-gray-900">Notifications</h2>
                <button onClick={() => onNavigate('pwd-notifications')} className="text-sm text-teal-700 font-medium flex items-center gap-1 hover:text-teal-800">
                  View all <ArrowRight size={13} />
                </button>
              </div>
              <div className="space-y-2">
                {unread.slice(0, 3).map((n) => (
                  <div key={n.id} className="flex gap-3 p-3 bg-sky-50/80 rounded-xl border border-sky-100 backdrop-blur">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-sky-500 to-ea-teal-500 shrink-0 mt-1.5" />
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{n.title}</p>
                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{n.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
