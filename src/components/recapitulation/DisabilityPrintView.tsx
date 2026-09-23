import { createPortal } from 'react-dom'
import { AGE_GROUPS, AGE_GROUP_LABEL, DISABILITY_FIELDS, DISABILITY_REPORT_TITLE, formatAsOf, sumDisabilityRows } from '../../lib/recapitulation/compute'
import type { RecapDisabilityRow } from '../../lib/recapitulation/types'

const n = (v: number) => v.toLocaleString('en-US')

/**
 * The official printed Disability Data sheet: A4 landscape (the table is 11 columns wide), a light-blue
 * subtitle band like the paper original. Lives outside the app shell, hidden on screen; when printing,
 * everything else is hidden and only this is shown — no sidebar, buttons or charts.
 */
export default function DisabilityPrintView({ rows, asOfDate }: { rows: RecapDisabilityRow[]; asOfDate: string }) {
  const totals = sumDisabilityRows(rows)
  return createPortal(
    <div id="disability-print-root" aria-hidden="true">
      <style>{`
        @media screen { #disability-print-root { display: none; } }
        @media print {
          @page { size: A4 landscape; margin: 12mm; }
          body > *:not(#disability-print-root) { display: none !important; }
          #disability-print-root { display: block; color: #000; font-family: Georgia, 'Times New Roman', serif; }
          #disability-print-root h1 { font-size: 15pt; text-align: center; margin: 0 0 4pt; }
          #disability-print-root .band { text-align: center; margin: 0 0 4pt; font-size: 10pt; background: #dbeafe; padding: 3pt; }
          #disability-print-root .asof { text-align: center; margin: 0 0 10pt; font-size: 10.5pt; }
          #disability-print-root table { width: 100%; border-collapse: collapse; margin-bottom: 10pt; font-size: 9.5pt; }
          #disability-print-root th, #disability-print-root td { border: 1px solid #000; padding: 3pt 5pt; }
          #disability-print-root th { background: #eee; }
          #disability-print-root .num { text-align: right; }
          #disability-print-root tr { break-inside: avoid; }
        }
      `}</style>
      <h1>{DISABILITY_REPORT_TITLE}</h1>
      <p className="band">Based on the Encoded Data from LGU Masterlist</p>
      <p className="asof">As of {formatAsOf(asOfDate)}</p>
      <table>
        <thead>
          <tr>
            <th rowSpan={2}>No.</th>
            <th rowSpan={2}>Type of Disability</th>
            {AGE_GROUPS.map((g) => (
              <th key={g} colSpan={2}>{AGE_GROUP_LABEL[g]}</th>
            ))}
            <th rowSpan={2}>TOTAL</th>
          </tr>
          <tr>
            {AGE_GROUPS.flatMap((g) => [
              <th key={`${g}-f`}>Female</th>,
              <th key={`${g}-m`}>Male</th>,
            ])}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.disabilityType}>
              <td>{i + 1}</td>
              <td>{r.disabilityType}</td>
              {AGE_GROUPS.flatMap((g) => [
                <td className="num" key={`${g}-f`}>{n(r[DISABILITY_FIELDS[g].female])}</td>,
                <td className="num" key={`${g}-m`}>{n(r[DISABILITY_FIELDS[g].male])}</td>,
              ])}
              <td className="num">{n(r.total)}</td>
            </tr>
          ))}
          <tr style={{ fontWeight: 700 }}>
            <td colSpan={2}>TOTAL</td>
            {AGE_GROUPS.flatMap((g) => [
              <td className="num" key={`${g}-f`}>{n(rows.reduce((a, r) => a + r[DISABILITY_FIELDS[g].female], 0))}</td>,
              <td className="num" key={`${g}-m`}>{n(rows.reduce((a, r) => a + r[DISABILITY_FIELDS[g].male], 0))}</td>,
            ])}
            <td className="num">{n(totals.grandTotal)}</td>
          </tr>
        </tbody>
      </table>
    </div>,
    document.body,
  )
}
