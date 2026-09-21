import { useEffect, useState } from 'react'
import { fetchLandingReport } from '../../lib/recapitulation/api'
import { formatAsOf, sumRows } from '../../lib/recapitulation/compute'
import type { RecapReport } from '../../lib/recapitulation/types'

const n = (v: number) => v.toLocaleString('en-US')

/**
 * Read-only recapitulation for the landing page: the one published report an admin flagged
 * "Show on the public landing page". Renders nothing when there is none (or it can't be loaded),
 * so the landing page is unchanged until an admin turns it on. No admin controls and no export.
 */
export default function PublicRecap() {
  const [report, setReport] = useState<RecapReport | null>(null)

  useEffect(() => {
    let live = true
    fetchLandingReport().then((r) => {
      if (live) setReport(r)
    })
    return () => {
      live = false
    }
  }, [])

  if (!report) return null
  const totals = sumRows(report.rows)

  return (
    <section className="py-16 px-4" aria-labelledby="recap-heading">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h2 id="recap-heading" className="font-display text-2xl lg:text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">{report.title}</h2>
          <p className="text-slate-600 text-sm">As of {formatAsOf(report.asOfDate)}</p>
        </div>

        <dl className="grid grid-cols-3 gap-3 mb-6 text-center">
          {[
            ['Total PWDs', totals.total],
            ['Age 0-59', totals.age0to59],
            ['Age 60-above', totals.age60above],
          ].map(([label, value]) => (
            <div key={label as string} className="card-glass rounded-2xl p-4">
              <dt className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</dt>
              <dd className="font-display text-2xl font-extrabold text-slate-900 mt-1">{n(value as number)}</dd>
            </div>
          ))}
        </dl>

        <div className="card-glass rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Number of persons with disabilities per barangay in Los Baños, by age bracket</caption>
            <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th scope="col" className="px-4 py-3 text-left w-14">No.</th>
                <th scope="col" className="px-4 py-3 text-left">Barangay</th>
                <th scope="col" className="px-4 py-3 text-right">Age 0-59</th>
                <th scope="col" className="px-4 py-3 text-right">Age 60-above</th>
                <th scope="col" className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.rows.map((r, i) => (
                <tr key={r.code}>
                  <td className="px-4 py-2.5 text-slate-500">{i + 1}</td>
                  <th scope="row" className="px-4 py-2.5 text-left font-medium text-slate-900">{r.name}</th>
                  <td className="px-4 py-2.5 text-right tabular-nums">{n(r.age0to59)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{n(r.age60above)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold">{n(r.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50/80 font-bold">
              <tr>
                <td className="px-4 py-3" colSpan={2}>TOTAL</td>
                <td className="px-4 py-3 text-right tabular-nums">{n(totals.age0to59)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{n(totals.age60above)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{n(totals.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </section>
  )
}
