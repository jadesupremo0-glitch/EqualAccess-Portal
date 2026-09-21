import { useMemo, useState } from 'react'
import { Download, FileText, Table2 } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Cell,
} from 'recharts'
import { Card, Button, Select } from '../../components/ui'
import { ChartCard } from '../../components/charts'
import { useStore } from '../../store'
import { BARANGAYS, DISABILITY_TYPES, ALL_BARANGAYS_LABEL, manilaDate, barangayLabel } from '../../lib/catalog'
import { computeStats, type StatsFilter } from '../../lib/stats'

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#8b5cf6', '#0891b2']

const DATE_RANGES = [
  { value: 'all', label: 'All Time', days: 0 },
  { value: 'last7', label: 'Last 7 Days', days: 7 },
  { value: 'last30', label: 'Last 30 Days', days: 30 },
  { value: 'last90', label: 'Last 90 Days', days: 90 },
  { value: 'last12m', label: 'Last 12 Months', days: 365 },
]

const pct = (part: number, whole: number) => (whole === 0 ? '—' : `${Math.round((part / whole) * 100)}%`)

export default function Reports() {
  const { pwdUsers, assistanceRequests, benefits } = useStore()
  const [dateRange, setDateRange] = useState('all')
  const [barangay, setBarangay] = useState('')
  const [disabilityType, setDisabilityType] = useState('')

  const days = DATE_RANGES.find((r) => r.value === dateRange)?.days ?? 0
  const fromDate = days > 0 ? manilaDate(new Date(Date.now() - days * 86_400_000)) : undefined

  const filter = useMemo<StatsFilter>(
    () => ({ barangay: barangay || undefined, disability: disabilityType || undefined, fromDate }),
    [barangay, disabilityType, fromDate],
  )

  const stats = useMemo(() => computeStats(pwdUsers, assistanceRequests, new Date(), filter), [pwdUsers, assistanceRequests, filter])

  // One row per official barangay, from the same aggregation as everything else.
  const barangayRows = useMemo(() => {
    const rows = BARANGAYS.map((name) => {
      const s = computeStats(pwdUsers, assistanceRequests, new Date(), { ...filter, barangay: name })
      return { name, pwds: s.totalPwds, requests: s.totalRequests, approved: s.approvedRequests, pending: s.pendingRequests, rejected: s.rejectedRequests }
    })
    const sum = (k: 'pwds' | 'requests' | 'approved' | 'pending' | 'rejected') => rows.reduce((a, r) => a + r[k], 0)
    const other = {
      name: 'Other / unlisted barangay',
      pwds: stats.totalPwds - sum('pwds'),
      requests: stats.totalRequests - sum('requests'),
      approved: stats.approvedRequests - sum('approved'),
      pending: stats.pendingRequests - sum('pending'),
      rejected: stats.rejectedRequests - sum('rejected'),
    }
    return { rows, other: other.pwds > 0 || other.requests > 0 ? other : null }
  }, [pwdUsers, assistanceRequests, filter, stats])

  const activePrograms = benefits.filter((b) => b.status === 'Active').length

  const summary = [
    { label: 'Total Registered PWDs', value: stats.totalPwds, note: stats.newThisMonth > 0 ? `+${stats.newThisMonth} this month` : 'No new registrations this month' },
    { label: 'Verified PWDs', value: stats.verifiedPwds, note: `${pct(stats.verifiedPwds, stats.totalPwds)} of registered` },
    { label: 'Active Programs', value: activePrograms, note: 'Currently open to applicants' },
    { label: dateRange !== 'all' ? 'Requests in Range' : 'Total Requests', value: stats.totalRequests, note: `${stats.pendingRequests} pending` },
    { label: 'Approved Requests', value: stats.approvedRequests, note: `${pct(stats.approvedRequests, stats.totalRequests)} of requests` },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-500 text-sm mt-0.5">Live data insights and statistics for PWD programs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={<FileText size={15} />} size="sm">Export PDF</Button>
          <Button variant="outline" icon={<Table2 size={15} />} size="sm">Export Excel</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-end bg-gray-50 p-4 rounded-xl border border-gray-200" role="group" aria-label="Report filters">
        <div className="min-w-36">
          <Select
            label="Date Range"
            options={DATE_RANGES.map((r) => ({ value: r.value, label: r.label }))}
            value={dateRange}
            onChange={setDateRange}
          />
        </div>
        <div className="min-w-40">
          <Select
            label="Barangay"
            options={BARANGAYS.map((b) => ({ value: b, label: barangayLabel(b) }))}
            value={barangay}
            onChange={setBarangay}
            placeholder={ALL_BARANGAYS_LABEL}
          />
        </div>
        <div className="min-w-44">
          <Select
            label="Disability Type"
            options={DISABILITY_TYPES.map((d) => ({ value: d, label: d }))}
            value={disabilityType}
            onChange={setDisabilityType}
            placeholder="All Types"
          />
        </div>
        <Button variant="ghost" size="sm" onClick={() => { setDateRange('all'); setBarangay(''); setDisabilityType('') }}>Reset Filters</Button>
      </div>
      <p className="text-xs text-gray-500 -mt-3">
        The date range applies to requests (by submission date); barangay and disability type narrow both PWDs and their requests.
      </p>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {summary.map((s) => (
          <Card key={s.label} className="p-5">
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-sm font-medium text-gray-700 mt-0.5">{s.label}</p>
            <p className="text-xs text-gray-500 mt-1">{s.note}</p>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard
          title="Registered PWDs by Barangay"
          summary={`Bar chart of registered PWDs in each of the 14 barangays. ${stats.byBarangay.map((b) => `${b.name}: ${b.count}`).join(', ')}.`}
          empty={stats.totalPwds === 0}
          emptyMessage="No PWD records match these filters"
          columns={['Barangay', 'PWDs']}
          rows={stats.byBarangay.map((b) => [barangayLabel(b.name), b.count])}
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats.byBarangay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" interval={0} angle={-40} textAnchor="end" height={70} tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip />
              <Bar dataKey="count" name="PWDs" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="PWD Distribution by Disability Type"
          summary={`Bar chart of PWDs by disability type. ${stats.byDisability.map((d) => `${d.name}: ${d.count}`).join(', ')}.`}
          empty={stats.totalPwds === 0}
          emptyMessage="No PWD records match these filters"
          columns={['Disability type', 'PWDs']}
          rows={stats.byDisability.map((d) => [d.name, d.count])}
        >
          <ResponsiveContainer width="100%" height={stats.byDisability.length * 26 + 20}>
            <BarChart data={stats.byDisability} layout="vertical" margin={{ right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis dataKey="name" type="category" interval={0} width={170} tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip />
              <Bar dataKey="count" name="PWDs" radius={[0, 4, 4, 0]}>
                {stats.byDisability.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Monthly Request Trends"
          summary={`Line chart of assistance requests per month over the last six months. ${stats.requestsOverTime.map((m) => `${m.label}: ${m.count}`).join(', ')}.`}
          empty={stats.requestsOverTime.every((m) => m.count === 0)}
          emptyMessage="No requests in the last 6 months"
          columns={['Month', 'Requests']}
          rows={stats.requestsOverTime.map((m) => [m.label, m.count])}
        >
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={stats.requestsOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" name="Requests" stroke="#2563eb" strokeWidth={2.5} dot={{ fill: '#2563eb', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Requests by Assistance Type"
          summary={`Bar chart of assistance requests by type. ${stats.requestsByType.map((t) => `${t.name}: ${t.count}`).join(', ')}.`}
          empty={stats.totalRequests === 0}
          emptyMessage="No requests match these filters"
          columns={['Assistance type', 'Requests']}
          rows={stats.requestsByType.map((t) => [t.name, t.count])}
        >
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.requestsByType}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" interval={0} tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip />
              <Bar dataKey="count" name="Requests" radius={[4, 4, 0, 0]}>
                {stats.requestsByType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Data table */}
      <Card>
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Assistance Requests by Barangay</h3>
          <Button variant="outline" size="sm" icon={<Download size={14} />}>Download</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Assistance requests by barangay">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left">
                {['Barangay', 'Total PWDs', 'Total Requests', 'Approved', 'Pending', 'Rejected', 'Approval Rate'].map((h) => (
                  <th key={h} scope="col" className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[...barangayRows.rows, ...(barangayRows.other ? [barangayRows.other] : [])].map((b) => (
                <tr key={b.name} className="hover:bg-gray-50">
                  <th scope="row" className="px-4 py-3 font-medium text-gray-900 text-left">{b.name.startsWith('Other') ? b.name : barangayLabel(b.name)}</th>
                  <td className="px-4 py-3 text-gray-700">{b.pwds}</td>
                  <td className="px-4 py-3 text-gray-700">{b.requests}</td>
                  <td className="px-4 py-3 text-green-700 font-medium">{b.approved}</td>
                  <td className="px-4 py-3 text-amber-700">{b.pending}</td>
                  <td className="px-4 py-3 text-red-600">{b.rejected}</td>
                  <td className="px-4 py-3 text-gray-700">{pct(b.approved, b.requests)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t border-gray-200 font-semibold text-gray-900">
                <th scope="row" className="px-4 py-3 text-left">All barangays</th>
                <td className="px-4 py-3">{stats.totalPwds}</td>
                <td className="px-4 py-3">{stats.totalRequests}</td>
                <td className="px-4 py-3 text-green-700">{stats.approvedRequests}</td>
                <td className="px-4 py-3 text-amber-700">{stats.pendingRequests}</td>
                <td className="px-4 py-3 text-red-600">{stats.rejectedRequests}</td>
                <td className="px-4 py-3">{pct(stats.approvedRequests, stats.totalRequests)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  )
}
