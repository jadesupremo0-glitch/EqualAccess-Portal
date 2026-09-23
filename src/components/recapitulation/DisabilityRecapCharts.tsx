import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts'
import { ChartCard } from '../charts'
import { AGE_GROUPS, AGE_GROUP_LABEL, DISABILITY_FIELDS, formatAsOf, sharePercent, sumDisabilityRows } from '../../lib/recapitulation/compute'
import type { RecapDisabilityRow } from '../../lib/recapitulation/types'

const TEAL = '#0f766e'
const BLUE = '#2563eb'
const AMBER = '#d97706'
const PALETTE = ['#0f766e', '#2563eb', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#65a30d', '#db2777', '#4338ca', '#ea580c']

const n = (v: number) => v.toLocaleString('en-US')

/** The three Disability Data charts. Each is also available as a table for screen readers (see ChartCard). */
export default function DisabilityRecapCharts({ rows, asOfDate }: { rows: RecapDisabilityRow[]; asOfDate: string }) {
  const totals = useMemo(() => sumDisabilityRows(rows), [rows])

  const perType = useMemo(() => [...rows].sort((a, b) => b.total - a.total).map((r) => ({ name: r.disabilityType, total: r.total })), [rows])

  const perAgeGroup = useMemo(
    () =>
      AGE_GROUPS.map((g) => ({
        name: AGE_GROUP_LABEL[g],
        Female: rows.reduce((a, r) => a + r[DISABILITY_FIELDS[g].female], 0),
        Male: rows.reduce((a, r) => a + r[DISABILITY_FIELDS[g].male], 0),
      })),
    [rows],
  )

  const shareByType = useMemo(
    () => [...rows].sort((a, b) => b.total - a.total).map((r) => ({ name: r.disabilityType, value: r.total, share: sharePercent(r.total, totals.grandTotal) })),
    [rows, totals.grandTotal],
  )

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <ChartCard
        className="lg:col-span-2"
        title="Total PWDs per disability type"
        summary={`Horizontal bar chart of the ${perType.length} disability types, sorted highest to lowest, as of ${formatAsOf(asOfDate)}. Total ${n(totals.grandTotal)}.`}
        empty={perType.length === 0}
        columns={['Disability type', 'Total']}
        rows={perType.map((r) => [r.name, r.total])}
      >
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={perType} layout="vertical" margin={{ left: 24, right: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={n} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={190} />
            <Tooltip formatter={(v) => [n(Number(v)), 'PWDs']} />
            <Bar dataKey="total" name="PWDs" fill={TEAL} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Female vs Male per age group"
        summary={`Grouped bar chart comparing female and male counts across the four age groups, as of ${formatAsOf(asOfDate)}. Total female ${n(totals.female)}, total male ${n(totals.male)}.`}
        empty={totals.grandTotal === 0}
        columns={['Age group', 'Female']}
        rows={perAgeGroup.map((a) => [a.name, a.Female])}
      >
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={perAgeGroup} margin={{ bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={n} />
            <Tooltip formatter={(v) => n(Number(v))} />
            <Legend />
            <Bar dataKey="Female" fill={AMBER} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Male" fill={BLUE} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Percentage share per disability type"
        summary={`Donut chart: percentage share of each disability type out of ${n(totals.grandTotal)} total PWDs, as of ${formatAsOf(asOfDate)}.`}
        empty={shareByType.length === 0}
        columns={['Disability type', 'Share (%)']}
        rows={shareByType.map((r) => [r.name, r.share])}
      >
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={shareByType} dataKey="value" nameKey="name" innerRadius={55} outerRadius={100} paddingAngle={1.5}>
              {shareByType.map((r, i) => (
                <Cell key={r.name} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v, _n, item) => [`${n(Number(v))} (${item.payload.share}%)`, item.payload.name]} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}
