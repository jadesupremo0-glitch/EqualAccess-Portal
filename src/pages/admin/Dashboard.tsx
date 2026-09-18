import { Users, UserCheck, Clock, FileText, CheckCircle, Star, TrendingUp } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts'
import { pwdUsers, assistanceRequests, feedbackTickets, benefits, chartData, adminUsers } from '../../data'
import { Card, StatsCard, statusBadge } from '../../components/ui'
import { useAdminSession } from '../../context'

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

function AdministratorView() {
  const pending = assistanceRequests.filter((r) => r.status === 'Pending')
  const verifiedPWDs = pwdUsers.filter((u) => u.verificationStatus === 'Verified').length
  const pendingVerification = pwdUsers.filter((u) => u.verificationStatus === 'Pending').length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatsCard label="Total PWDs" value={pwdUsers.length} icon={<Users size={20} className="text-blue-700" />} color="bg-blue-50" delta="+12 this month" />
        <StatsCard label="Verified PWDs" value={verifiedPWDs} icon={<UserCheck size={20} className="text-green-700" />} color="bg-green-50" />
        <StatsCard label="Pending Verification" value={pendingVerification} icon={<Clock size={20} className="text-amber-700" />} color="bg-amber-50" />
        <StatsCard label="Total Requests" value={assistanceRequests.length} icon={<FileText size={20} className="text-gray-700" />} color="bg-gray-100" />
        <StatsCard label="Pending Requests" value={pending.length} icon={<Clock size={20} className="text-orange-700" />} color="bg-orange-50" />
        <StatsCard label="Approved Requests" value={assistanceRequests.filter((r) => r.status === 'Approved' || r.status === 'Completed').length} icon={<CheckCircle size={20} className="text-emerald-700" />} color="bg-emerald-50" />
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3 p-5">
          <h3 className="font-display font-bold text-gray-900 mb-4">Assistance Requests Over Time</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData.requestsTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip />
              <Line type="monotone" dataKey="requests" stroke="#2563eb" strokeWidth={2.5} dot={{ fill: '#2563eb', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="lg:col-span-2 p-5">
          <h3 className="font-display font-bold text-gray-900 mb-4">Approval Rate</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={chartData.approvalRate} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                {chartData.approvalRate.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip formatter={(v) => `${v}%`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {chartData.approvalRate.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                <div className="w-3 h-3 rounded-full" style={{ background: PIE_COLORS[i] }} />
                {d.name}: {d.value}%
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="font-display font-bold text-gray-900 mb-4">PWD Distribution by Barangay</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData.byBarangay} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b' }} width={100} />
              <Tooltip />
              <Bar dataKey="count" fill="#2563eb" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <h3 className="font-display font-bold text-gray-900 mb-4">Requests by Assistance Type</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData.byAssistanceType}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip />
              <Bar dataKey="count" fill="#16a34a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <SharedBottomTables />
    </div>
  )
}

function BenefitsOfficerView() {
  const approved = assistanceRequests.filter((r) => r.status === 'Approved' || r.status === 'Completed').length
  const medicalReqs = assistanceRequests.filter((r) => r.type.toLowerCase().includes('medical')).length
  const activePrograms = benefits.filter((b) => b.status === 'Active').length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Active Programs" value={activePrograms} icon={<Star size={20} className="text-teal-600" />} color="bg-teal-50" />
        <StatsCard label="Approved Requests" value={approved} icon={<CheckCircle size={20} className="text-green-700" />} color="bg-green-50" />
        <StatsCard label="Medical Requests" value={medicalReqs} icon={<FileText size={20} className="text-blue-700" />} color="bg-blue-50" />
        <StatsCard label="Upcoming Programs" value={benefits.filter((b) => b.status === 'Approved' || b.status === 'Pending Approval').length} icon={<TrendingUp size={20} className="text-amber-700" />} color="bg-amber-50" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="font-display font-bold text-gray-900 mb-4">Requests by Assistance Type</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData.byAssistanceType}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip />
              <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <h3 className="font-display font-bold text-gray-900 mb-4">Approval Rate</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={chartData.approvalRate} cx="50%" cy="50%" innerRadius={60} outerRadius={88} dataKey="value" paddingAngle={3}>
                {chartData.approvalRate.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip formatter={(v) => `${v}%`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {chartData.approvalRate.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                <div className="w-3 h-3 rounded-full" style={{ background: PIE_COLORS[i] }} />
                {d.name}: {d.value}%
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Active Benefit Programs</h3>
        </div>
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
      </Card>

      <SharedBottomTables />
    </div>
  )
}

function SocialWorkerView() {
  const pending = assistanceRequests.filter((r) => r.status === 'Pending' || r.status === 'Under Review')
  const requirementsNeeded = assistanceRequests.filter((r) => r.status === 'Requirements Needed')
  const myAssigned = assistanceRequests.filter((r) => r.assignedStaff === 'Ronaldo Agustin')

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Pending / Under Review" value={pending.length} icon={<Clock size={20} className="text-amber-600" />} color="bg-amber-50" />
        <StatsCard label="Requirements Needed" value={requirementsNeeded.length} icon={<FileText size={20} className="text-orange-700" />} color="bg-orange-50" />
        <StatsCard label="My Assigned Cases" value={myAssigned.length} icon={<Users size={20} className="text-blue-700" />} color="bg-blue-50" />
        <StatsCard label="Total PWD Clients" value={pwdUsers.length} icon={<UserCheck size={20} className="text-green-700" />} color="bg-green-50" />
      </div>

      <Card>
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Pending & Under Review Requests</h3>
          <p className="text-xs text-gray-400 mt-0.5">Requires immediate attention</p>
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
                  <td className="px-4 py-3 text-xs text-gray-400">{r.dateSubmitted}</td>
                </tr>
              ))}
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
                <button className="text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-lg hover:bg-green-100 transition-colors font-medium">Verify</button>
                <button className="text-xs bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-100 transition-colors font-medium">Reject</button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function RecordsOfficerView() {
  const pendingVerification = pwdUsers.filter((u) => u.verificationStatus === 'Pending')
  const verified = pwdUsers.filter((u) => u.verificationStatus === 'Verified').length
  const rejected = pwdUsers.filter((u) => u.verificationStatus === 'Rejected').length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Total Registered" value={pwdUsers.length} icon={<Users size={20} className="text-blue-700" />} color="bg-blue-50" />
        <StatsCard label="Verified PWDs" value={verified} icon={<CheckCircle size={20} className="text-green-700" />} color="bg-green-50" />
        <StatsCard label="Pending Verification" value={pendingVerification.length} icon={<Clock size={20} className="text-amber-700" />} color="bg-amber-50" />
        <StatsCard label="Rejected / Inactive" value={rejected} icon={<FileText size={20} className="text-red-700" />} color="bg-red-50" />
      </div>

      <Card className="p-5">
        <h3 className="font-semibold text-gray-900 mb-4">PWD Distribution by Barangay</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData.byBarangay} layout="vertical" margin={{ left: 110 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b' }} width={110} />
            <Tooltip />
            <Bar dataKey="count" fill="#4f46e5" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Pending PWD Verifications</h3>
          <p className="text-xs text-gray-400 mt-0.5">Review and verify PWD registrations</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
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
                        <button className="text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-lg hover:bg-green-100 font-medium">Verify</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function SharedBottomTables() {
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
              {assistanceRequests.slice(0, 5).map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{r.pwdName}</td>
                  <td className="px-4 py-3">{statusBadge(r.status)}</td>
                </tr>
              ))}
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
        </div>
      </Card>
    </div>
  )
}

export default function AdminDashboard() {
  const session = useAdminSession()
  const admin = session ? adminUsers.find((a) => a.id === session.adminId) : adminUsers[0]
  const currentAdmin = admin ?? adminUsers[0]
  const role = currentAdmin.role

  return (
    <div className="space-y-6">
      <AdminBanner name={currentAdmin.name} role={role} />

      {role === 'Administrator' && <AdministratorView />}
      {role === 'Benefits Officer' && <BenefitsOfficerView />}
      {role === 'Social Worker' && <SocialWorkerView />}
      {role === 'Records Officer' && <RecordsOfficerView />}
    </div>
  )
}
