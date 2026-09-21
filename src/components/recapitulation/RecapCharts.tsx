import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts'
import { ChartCard } from '../charts'
import { formatAsOf, sumRows } from '../../lib/recapitulation/compute'
import type { RecapReport } from '../../lib/recapitulation/types'

const BLUE = '#2563eb'
const GREEN = '#16a34a'
const AMBER = '#d97706'

const n = (v: number) => v.toLocaleString('en-US')

/** The three recapitulation charts. Each is also available as a table for screen readers (see ChartCard). */
export default function RecapCharts({ report, reports }: { report: RecapReport; reports: RecapReport[] }) {
  const totals = useMemo(() => sumRows(report.rows), [report])
  const perBarangay = report.rows.map((r) => ({ name: r.name, total: r.total }))
  const ages = [
    { name: 'Age 0-59', value: totals.age0to59 },
    { name: 'Age 60-above', value: totals.age60above },
  ]

  // Snapshot comparison: oldest → newest, so the line reads left to right.
  const history = useMemo(
    () =>
      [...reports]
        .sort((a, b) => a.asOfDate.localeCompare(b.asOfDate))
        .map((r) => {
          const t = sumRows(r.rows)
          return { name: formatAsOf(r.asOfDate), total: t.total, age0to59: t.age0to59, age60above: t.age60above }
        }),
    [reports],
  )

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <ChartCard
        className="lg:col-span-2"
        title="Total PWDs per barangay"
        summary={`Bar chart of PWDs in each of the ${perBarangay.length} barangays as of ${formatAsOf(report.asOfDate)}. Total ${n(totals.total)}.`}
        empty={perBarangay.length === 0}
        columns={['Barangay', 'Total']}
        rows={perBarangay.map((r) => [r.name, r.total])}
      >
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={perBarangay} margin={{ bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-40} textAnchor="end" height={70} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={n} />
            <Tooltip formatter={(v) => [n(Number(v)), 'PWDs']} />
            <Bar dataKey="total" name="PWDs" fill={BLUE} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Age 0-59 vs 60-above"
        summary={`Donut chart: ${n(totals.age0to59)} PWDs aged 0 to 59 and ${n(totals.age60above)} aged 60 and above.`}
        empty={totals.total === 0}
        columns={['Age group', 'PWDs']}
        rows={ages.map((a) => [a.name, a.value])}
      >
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={ages} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
              <Cell fill={BLUE} />
              <Cell fill={AMBER} />
            </Pie>
            <Tooltip formatter={(v) => n(Number(v))} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Comparison across snapshots"
        summary={`Line chart comparing ${history.length} saved snapshots by total PWDs.`}
        empty={history.length < 2}
        emptyMessage="Add a second report to compare"
        columns={['As of', 'Total']}
        rows={history.map((h) => [h.name, h.total])}
      >
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={history}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={n} />
            <Tooltip formatter={(v) => n(Number(v))} />
            <Legend />
            <Line type="monotone" dataKey="total" name="Total" stroke={BLUE} strokeWidth={2} dot />
            <Line type="monotone" dataKey="age0to59" name="Age 0-59" stroke={GREEN} strokeWidth={2} dot />
            <Line type="monotone" dataKey="age60above" name="Age 60-above" stroke={AMBER} strokeWidth={2} dot />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}
