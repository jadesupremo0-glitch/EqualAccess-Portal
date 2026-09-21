import { createPortal } from 'react-dom'
import { formatAsOf, sumRows } from '../../lib/recapitulation/compute'
import { prpwdLabel } from '../../lib/recapitulation/export'
import type { RecapReport } from '../../lib/recapitulation/types'

const n = (v: number) => v.toLocaleString('en-US')

/**
 * The official printed layout. It lives outside the app shell (a direct child of <body>) and is hidden
 * on screen; when printing, everything else is hidden and only this is shown — no sidebar, buttons or charts.
 */
export default function RecapPrintView({ report }: { report: RecapReport }) {
  const totals = sumRows(report.rows)
  return createPortal(
    <div id="recap-print-root" aria-hidden="true">
      <style>{`
        @media screen { #recap-print-root { display: none; } }
        @media print {
          @page { size: A4 portrait; margin: 15mm; }
          body > *:not(#recap-print-root) { display: none !important; }
          #recap-print-root { display: block; color: #000; font-family: Georgia, 'Times New Roman', serif; }
          #recap-print-root h1 { font-size: 15pt; text-align: center; margin: 0 0 4pt; }
          #recap-print-root .asof { text-align: center; margin: 0 0 12pt; font-size: 11pt; }
          #recap-print-root table { width: 100%; border-collapse: collapse; margin-bottom: 14pt; font-size: 10.5pt; }
          #recap-print-root th, #recap-print-root td { border: 1px solid #000; padding: 3pt 6pt; }
          #recap-print-root th { background: #eee; }
          #recap-print-root .num { text-align: right; }
          #recap-print-root tr { break-inside: avoid; }
        }
      `}</style>
      <h1>{report.title}</h1>
      <p className="asof">As of {formatAsOf(report.asOfDate)}</p>
      <table>
        <thead>
          <tr>
            <th>No.</th>
            <th>Barangay</th>
            <th>Age 0-59</th>
            <th>Age 60-above</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {report.rows.map((r, i) => (
            <tr key={r.code}>
              <td>{i + 1}</td>
              <td>{r.name}</td>
              <td className="num">{n(r.age0to59)}</td>
              <td className="num">{n(r.age60above)}</td>
              <td className="num">{n(r.total)}</td>
            </tr>
          ))}
          <tr style={{ fontWeight: 700 }}>
            <td colSpan={2}>TOTAL</td>
            <td className="num">{n(totals.age0to59)}</td>
            <td className="num">{n(totals.age60above)}</td>
            <td className="num">{n(totals.total)}</td>
          </tr>
        </tbody>
      </table>
      {report.prpwd.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Label</th>
              <th>Total PWDs</th>
              <th>Total Encoded</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody>
            {report.prpwd.map((p, i) => (
              <tr key={i}>
                <td>{prpwdLabel(p)}</td>
                <td className="num">{n(p.totalPwds)}</td>
                <td className="num">{n(p.totalEncoded)}</td>
                <td className="num">{p.percentage}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>,
    document.body,
  )
}
