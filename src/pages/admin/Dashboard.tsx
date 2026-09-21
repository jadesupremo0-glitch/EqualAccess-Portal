import { Users, UserCheck, Clock, FileText, CheckCircle, Star, TrendingUp } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts'
import { Card, StatsCard, statusBadge } from '../../components/ui'
import { ChartCard, DashboardSkeleton, LiveStatusBar } from '../../components/charts'
import { useAdminSession } from '../../context'
import { useStore } from '../../store'
import { useDashboardStats } from '../../lib/useDashboardStats'
import type { DashboardStats } from '../../lib/stats'

const PIE_COLORS = ['#16a34a', '#dc2626', '#d97706']

function AdminBanner({ name, role }: { name: string; role: string }) {
  const roleColor: Record<string, string> = {
    Administrator: 'from-slate-800 via-slate-800 to-ea-blue-900',
    'Benefits Officer': 'from-ea-teal-900 via-ea-teal-900 to-ea-blue-950',
    'Social Worker': 'from-ea-blue-900 via-ea-blue-900 to-indigo-950',
    'Records Officer': 'from-indigo-900 via-indigo-900 to-ea-blue-950',
  }
  const roleDesc: Record<string, string> = {
    Administrator: 'Full system access — all modules and analytics available.',
    'Benefits Officer': 'Manage and monitor benefit programs and medical assistance.',
    'Social Worker': 'Handle PWD cases, pending requests, and welfare assessments.',
    'Records Officer': 'Manage PWD registrations, verifications, and documentation.',
  }
  return (
    <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${roleColor[role] ?? 'from-slate-800 via-slate-800 to-ea-blue-900'} p-5 text-white shadow-xl animate-fade-up`}>
      <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-white/50 text-xs mb-0.5 uppercase tracking-wide">Logged in as</p>
          <h1 className="font-display text-xl font-extrabold tracking-tight">{name}</h1>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs bg-white/15 border border-white/20 px-2.5 py-0.5 rounded-full font-semibold backdrop-blur">{role}</span>
          </div>
        </div>
        <div className="glass-dark rounded-2xl p-3 max-w-xs shadow-lg">
          <p className="text-white/80 text-xs leading-relaxed">{roleDesc[role] ?? ''}</p>
        </div>
      </div>
    </div>
  )
}

// ── Shared charts ──────────────────────────────────────────────────

function RequestsOverTimeChart({ stats, height = 200 }: { stats: DashboardStats; height?: number }) {
  const shown = stats.requestsOverTime.reduce((a, m) => a + m.count, 0)
  return (
    <ChartCard
      title="Assistance Requests Over Time"
      summary={`Line chart: assistance requests per month over the last six months. ${stats.requestsOverTime.map((m) => `${m.label}: ${m.count}`).join(', ')}.`}
      empty={shown === 0}
      emptyMessage="No requests in the last 6 months"
      columns={['Month', 'Requests']}
      rows={stats.requestsOverTime.map((m) => [m.label, m.count])}
      className="lg:col-span-3"
    >
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={stats.requestsOverTime}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
          <Tooltip />
          <Line type="monotone" dataKey="count" name="Requests" stroke="#2563eb" strokeWidth={2.5} dot={{ fill: '#2563eb', r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

function ApprovalRateChart({ stats, height = 200, inner = 55, outer = 80, className = 'lg:col-span-2' }: { stats: DashboardStats; height?: number; inner?: number; outer?: number; className?: string }) {
  return (
    <ChartCard
      title="Approval Rate"
      summary={`Donut chart of ${stats.totalRequests} assistance requests: ${stats.approvalRate.map((s) => `${s.name} ${s.percent}% (${s.count})`).join(', ')}.`}
      empty={stats.totalRequests === 0}
      emptyMessage="No requests yet"
      columns={['Outcome', 'Requests (share)']}
      rows={stats.approvalRate.map((s) => [s.name, `${s.count} (${s.percent}%)`])}
      className={className}
    >
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={stats.approvalRate} cx="50%" cy="50%" innerRadius={inner} outerRadius={outer} dataKey="count" nameKey="name" paddingAngle={3}>
            {stats.approvalRate.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
          </Pie>
          <Tooltip formatter={(v, _n, item) => [`${v} request${v === 1 ? '' : 's'} (${(item.payload as { percent: number }).percent}%)`, (item.payload as { name: string }).name]} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-3 justify-center mt-2">
        {stats.approvalRate.map((d, i) => (
          <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600">
            <div className="w-3 h-3 rounded-full" style={{ background: PIE_COLORS[i] }} aria-hidden="true" />
            {d.name}: {d.percent}%
          </div>
        ))}
      </div>
    </ChartCard>
  )
}

function BarangayChart({ stats, color = '#2563eb', className = '' }: { stats: DashboardStats; color?: string; className?: string }) {
  return (
    <ChartCard
      title="PWD Distribution by Barangay"
      summary={`Bar chart of PWDs in each of the 14 barangays. ${stats.byBarangay.map((b) => `${b.name}: ${b.count}`).join(', ')}.`}
      empty={stats.totalPwds === 0}
      emptyMessage="No PWD records yet"
      columns={['Barangay', 'PWDs']}
      rows={[...stats.byBarangay.map((b) => [`Brgy. ${b.name}`, b.count]), ...(stats.unlistedBarangayCount > 0 ? [['Not on the official list', stats.unlistedBarangayCount]] : [])]}
      className={className}
      footer={stats.unlistedBarangayCount > 0 ? `${stats.unlistedBarangayCount} record${stats.unlistedBarangayCount === 1 ? ' has' : 's have'} a barangay that is not on the official list and ${stats.unlistedBarangayCount === 1 ? 'is' : 'are'} not shown in the bars.` : undefined}
    >
      <ResponsiveContainer width="100%" height={stats.byBarangay.length * 26 + 20}>
        <BarChart data={stats.byBarangay} layout="vertical" margin={{ left: 0, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
          <YAxis dataKey="name" type="category" interval={0} tick={{ fontSize: 11, fill: '#64748b' }} width={110} />
          <Tooltip />
          <Bar dataKey="count" name="PWDs" fill={color} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

function RequestsByTypeChart({ stats, color = '#16a34a', height = 200 }: { stats: DashboardStats; color?: string; height?: number }) {
  return (
    <ChartCard
      title="Requests by Assistance Type"
      summary={`Bar chart of assistance requests by type. ${stats.requestsByType.map((t) => `${t.name}: ${t.count}`).join(', ')}.`}
      empty={stats.totalRequests === 0}
      emptyMessage="No requests yet"
      columns={['Assistance type', 'Requests']}
      rows={stats.requestsByType.map((t) => [t.name, t.count])}
    >
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={stats.requestsByType}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" interval={0} tick={{ fontSize: 10, fill: '#64748b' }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
          <Tooltip />
          <Bar dataKey="count" name="Requests" fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

// ── Role views ─────────────────────────────────────────────────────

function AdministratorView({ stats }: { stats: DashboardStats }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatsCard label="Total PWDs" value={stats.totalPwds} icon={<Users size={20} className="text-blue-700" />} color="bg-blue-50" delta={stats.newThisMonth > 0 ? `+${stats.newThisMonth} this month` : undefined} />
        <StatsCard label="Verified PWDs" value={stats.verifiedPwds} icon={<UserCheck size={20} className="text-green-700" />} color="bg-green-50" />
        <StatsCard label="Pending Verification" value={stats.pendingPwds} icon={<Clock size={20} className="text-amber-700" />} color="bg-amber-50" />
        <StatsCard label="Total Requests" value={stats.totalRequests} icon={<FileText size={20} className="text-gray-700" />} color="bg-gray-100" />
        <StatsCard label="Pending Requests" value={stats.pendingRequests} icon={<Clock size={20} className="text-orange-700" />} color="bg-orange-50" note="Incl. under review" />
        <StatsCard label="Approved Requests" value={stats.approvedRequests} icon={<CheckCircle size={20} className="text-emerald-700" />} color="bg-emerald-50" note="Incl. completed" />
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <RequestsOverTimeChart stats={stats} />
        <ApprovalRateChart stats={stats} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <BarangayChart stats={stats} />
        <RequestsByTypeChart stats={stats} />
      </div>

      <SharedBottomTables />
    </div>
  )
}

function BenefitsOfficerView({ stats }: { stats: DashboardStats }) {
  const { benefits, assistanceRequests } = useStore()
  const medicalReqs = assistanceRequests.filter((r) => r.type.toLowerCase().includes('medical')).length
  const activePrograms = benefits.filter((b) => b.status === 'Active').length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Active Programs" value={activePrograms} icon={<Star size={20} className="text-teal-600" />} color="bg-teal-50" />
        <StatsCard label="Approved Requests" value={stats.approvedRequests} icon={<CheckCircle size={20} className="text-green-700" />} color="bg-green-50" note="Incl. completed" />
        <StatsCard label="Medical Requests" value={medicalReqs} icon={<FileText size={20} className="text-blue-700" />} color="bg-blue-50" />
        <StatsCard label="Upcoming Programs" value={benefits.filter((b) => b.status === 'Approved' || b.status === 'Pending Approval').length} icon={<TrendingUp size={20} className="text-amber-700" />} color="bg-amber-50" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <RequestsByTypeChart stats={stats} color="#0d9488" height={220} />
        <ApprovalRateChart stats={stats} height={220} inner={60} outer={88} className="" />
      </div>

      <Card>
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Active Benefit Programs</h3>
        </div>
        {benefits.filter((b) => b.status === 'Active').length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">No active programs right now.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {benefits.filter((b) => b.status === 'Active').map((b) => (
              <div key={b.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{b.name}</p>
                  <p className="text-xs text-gray-500">{b.category} · {b.barangay} · Deadline: {b.applicationDeadline}</p>
                </div>
                {statusBadge(b.status)}
              </div>
            ))}
          </div>
        )}
      </Card>

      <SharedBottomTables />
    </div>
  )
}

function SocialWorkerView({ stats }: { stats: DashboardStats }) {
  const { assistanceRequests, pwdUsers, verifyPWD } = useStore()
  const pending = assistanceRequests.filter((r) => r.status === 'Pending' || r.status === 'Under Review')
  const requirementsNeeded = assistanceRequests.filter((r) => r.status === 'Requirements Needed')
  const myAssigned = assistanceRequests.filter((r) => r.assignedStaff === 'Ronaldo Agustin')

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Pending / Under Review" value={pending.length} icon={<Clock size={20} className="text-amber-600" />} color="bg-amber-50" />
        <StatsCard label="Requirements Needed" value={requirementsNeeded.length} icon={<FileText size={20} className="text-orange-700" />} color="bg-orange-50" />
        <StatsCard label="My Assigned Cases" value={myAssigned.length} icon={<Users size={20} className="text-blue-700" />} color="bg-blue-50" />
        <StatsCard label="Total PWD Clients" value={stats.totalPwds} icon={<UserCheck size={20} className="text-green-700" />} color="bg-green-50" />
      </div>

      <Card>
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Pending & Under Review Requests</h3>
          <p className="text-xs text-gray-500 mt-0.5">Requires immediate attention</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Pending requests">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Request ID</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">PWD Name</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pending.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{r.pwdName}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{r.type}</td>
                  <td className="px-4 py-3">{statusBadge(r.status)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{r.dateSubmitted}</td>
                </tr>
              ))}
              {pending.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Nothing waiting for review.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">PWD Clients Needing Follow-up</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {pwdUsers.filter((u) => u.verificationStatus === 'Pending').map((u) => (
            <div key={u.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-900">{u.name}</p>
                <p className="text-xs text-gray-500">{u.barangay} · {u.disabilityType}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => verifyPWD(u.id, 'Verified')} className="text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-lg hover:bg-green-100 transition-colors font-medium" aria-label={`Verify ${u.name}`}>Verify</button>
                <button onClick={() => verifyPWD(u.id, 'Rejected')} className="text-xs bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-100 transition-colors font-medium" aria-label={`Reject ${u.name}`}>Reject</button>
              </div>
            </div>
          ))}
          {pwdUsers.filter((u) => u.verificationStatus === 'Pending').length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-gray-500">No clients are waiting for verification.</p>
          )}
        </div>
      </Card>
    </div>
  )
}

function RecordsOfficerView({ stats }: { stats: DashboardStats }) {
  const { pwdUsers, verifyPWD } = useStore()

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Total Registered" value={stats.totalPwds} icon={<Users size={20} className="text-blue-700" />} color="bg-blue-50" delta={stats.newThisMonth > 0 ? `+${stats.newThisMonth} this month` : undefined} />
        <StatsCard label="Verified PWDs" value={stats.verifiedPwds} icon={<CheckCircle size={20} className="text-green-700" />} color="bg-green-50" />
        <StatsCard label="Pending Verification" value={stats.pendingPwds} icon={<Clock size={20} className="text-amber-700" />} color="bg-amber-50" />
        <StatsCard label="Rejected" value={stats.rejectedPwds} icon={<FileText size={20} className="text-red-700" />} color="bg-red-50" />
      </div>

      <BarangayChart stats={stats} color="#4f46e5" />

      <Card>
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">PWD Records & Verification</h3>
          <p className="text-xs text-gray-500 mt-0.5">Review and verify PWD registrations</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="PWD records">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">PWD ID</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Barangay</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Disability</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pwdUsers.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{u.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{u.barangay}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{u.disabilityType}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {statusBadge(u.verificationStatus)}
                      {u.verificationStatus === 'Pending' && (
                        <button onClick={() => verifyPWD(u.id, 'Verified')} className="text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-lg hover:bg-green-100 font-medium" aria-label={`Verify ${u.name}`}>Verify</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {pwdUsers.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No PWD records yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function SharedBottomTables() {
  const { assistanceRequests, feedbackTickets } = useStore()
  const recent = [...assistanceRequests].sort((a, b) => b.dateSubmitted.localeCompare(a.dateSubmitted)).slice(0, 5)
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Recent Assistance Requests</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Recent assistance requests">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Request ID</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">PWD Name</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recent.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{r.pwdName}</td>
                  <td className="px-4 py-3">{statusBadge(r.status)}</td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-500">No requests yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Recent Feedback Tickets</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {feedbackTickets.slice(0, 4).map((t) => (
            <div key={t.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{t.subject}</p>
                <p className="text-xs text-gray-500">{t.isAnonymous ? 'Anonymous' : t.pwdName} · {t.category}</p>
              </div>
              {statusBadge(t.status)}
            </div>
          ))}
          {feedbackTickets.length === 0 && <p className="px-5 py-8 text-center text-sm text-gray-500">No feedback yet.</p>}
        </div>
      </Card>
    </div>
  )
}

export default function AdminDashboard() {
  const session = useAdminSession()
  const { adminUsers } = useStore()
  const live = useDashboardStats()

  const admin = session ? adminUsers.find((a) => a.id === session.adminId) : adminUsers[0]
  const currentAdmin = admin ?? adminUsers[0]
  const role = currentAdmin?.role ?? 'Administrator'

  return (
    <div className="space-y-6">
      <AdminBanner name={currentAdmin?.name ?? 'Administrator'} role={role} />

      <LiveStatusBar live={live} />

      {live.status === 'loading' ? (
        <DashboardSkeleton cards={role === 'Administrator' ? 6 : 4} />
      ) : (
        <>
          {role === 'Administrator' && <AdministratorView stats={live.stats} />}
          {role === 'Benefits Officer' && <BenefitsOfficerView stats={live.stats} />}
          {role === 'Social Worker' && <SocialWorkerView stats={live.stats} />}
          {role === 'Records Officer' && <RecordsOfficerView stats={live.stats} />}
        </>
      )}
    </div>
  )
}
