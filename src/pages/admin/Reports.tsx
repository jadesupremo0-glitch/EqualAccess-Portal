import { Download, FileText, Table2 } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts'
import { chartData } from '../../data'
import { Card, Button, Select } from '../../components/ui'
import { useState } from 'react'

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#8b5cf6', '#0891b2']

export default function Reports() {
  const [dateRange, setDateRange] = useState('last30')
  const [barangay, setBarangay] = useState('')
  const [disabilityType, setDisabilityType] = useState('')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-500 text-sm mt-0.5">Data insights and statistics for PWD programs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={<FileText size={15} />} size="sm">Export PDF</Button>
          <Button variant="outline" icon={<Table2 size={15} />} size="sm">Export Excel</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-end bg-gray-50 p-4 rounded-xl border border-gray-200">
        <div className="min-w-36">
          <Select
            label="Date Range"
            options={[
              { value: 'last7', label: 'Last 7 Days' },
              { value: 'last30', label: 'Last 30 Days' },
              { value: 'last90', label: 'Last 90 Days' },
              { value: 'last12m', label: 'Last 12 Months' },
            ]}
            value={dateRange}
            onChange={setDateRange}
          />
        </div>
        <div className="min-w-40">
          <Select
            label="Barangay"
            options={['Brgy. Poblacion', 'Brgy. San Antonio', 'Brgy. Commonwealth', 'Brgy. Bagong Silang', 'Brgy. Tandang Sora', 'Brgy. Holy Spirit'].map((b) => ({ value: b, label: b }))}
            value={barangay}
            onChange={setBarangay}
            placeholder="All Barangays"
          />
        </div>
        <div className="min-w-44">
          <Select
            label="Disability Type"
            options={['Visual Impairment', 'Hearing Impairment', 'Physical Disability', 'Mental Disability', 'Chronic Illness', 'Learning Disability'].map((d) => ({ value: d, label: d }))}
            value={disabilityType}
            onChange={setDisabilityType}
            placeholder="All Types"
          />
        </div>
        <Button variant="ghost" size="sm" onClick={() => { setBarangay(''); setDisabilityType('') }}>Reset Filters</Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Registered PWDs', value: '2,417', delta: '+12 this month' },
          { label: 'Active Programs', value: '18', delta: '4 upcoming' },
          { label: 'Requests This Month', value: '38', delta: '↑ 15% vs last month' },
          { label: 'Approval Rate', value: '68%', delta: 'of processed requests' },
        ].map((s) => (
          <Card key={s.label} className="p-5">
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-sm font-medium text-gray-700 mt-0.5">{s.label}</p>
            <p className="text-xs text-green-600 mt-1">{s.delta}</p>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Registered PWDs by Barangay</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData.byBarangay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip />
              <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 mb-4">PWD Distribution by Disability Type</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={chartData.byDisability} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                {chartData.byDisability.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Monthly Request Trends</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData.requestsTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip />
              <Line type="monotone" dataKey="requests" stroke="#2563eb" strokeWidth={2.5} dot={{ fill: '#2563eb', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Requests by Assistance Type</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData.byAssistanceType}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.byAssistanceType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
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
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {chartData.byBarangay.map((b) => (
                <tr key={b.name} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{b.name}</td>
                  <td className="px-4 py-3 text-gray-700">{b.count}</td>
                  <td className="px-4 py-3 text-gray-700">{Math.floor(b.count * 1.2)}</td>
                  <td className="px-4 py-3 text-green-700 font-medium">{Math.floor(b.count * 0.8)}</td>
                  <td className="px-4 py-3 text-amber-700">{Math.floor(b.count * 0.25)}</td>
                  <td className="px-4 py-3 text-red-600">{Math.floor(b.count * 0.08)}</td>
                  <td className="px-4 py-3 text-gray-700">{Math.floor(68 + Math.random() * 10)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
