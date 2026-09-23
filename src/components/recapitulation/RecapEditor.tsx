import { useMemo, useState } from 'react'
import { Copy, Plus, Save, Send, Trash2 } from 'lucide-react'
import { Alert, Button, Modal, Select } from '../ui'
import { AGE_GROUPS, DISABILITY_FIELDS, formatAsOf, inputFromReport, prpwdPercent, validateInput } from '../../lib/recapitulation/compute'
import { AGE_GROUP_LABEL, type RecapInput, type RecapReport, type RecapStatus } from '../../lib/recapitulation/types'

/** A count typed into a box: whole numbers only. Anything else becomes NaN, which validation rejects. */
const toCount = (s: string): number => (/^\d+$/.test(s.trim()) ? Number(s.trim()) : NaN)
const fmt = (n: number) => (Number.isFinite(n) ? n.toLocaleString('en-US') : '—')

interface FormRow {
  code: string
  name: string
  a: string
  b: string
}
interface FormPrpwd {
  label: string
  referenceDate: string
  total: string
  encoded: string
}
/** One Disability Data row: 8 age/sex counts, keyed the same as RecapDisabilityRow minus `total`. */
interface FormDisabilityRow {
  disabilityType: string
  female0to17: string
  male0to17: string
  female18to30: string
  male18to30: string
  female31to59: string
  male31to59: string
  female60above: string
  male60above: string
}

const cell = 'w-full text-right border rounded-lg text-sm px-2.5 py-1.5 bg-white/80 focus:outline-none focus:ring-4 focus:ring-ea-teal-500/20 focus:border-ea-teal-400'
const field = 'w-full border rounded-lg text-sm px-2.5 py-1.5 bg-white/80 border-slate-200 focus:outline-none focus:ring-4 focus:ring-ea-teal-500/20 focus:border-ea-teal-400'

function toForm(input: RecapInput): { rows: FormRow[]; prpwd: FormPrpwd[]; disabilityRows: FormDisabilityRow[] } {
  return {
    rows: input.rows.map((r) => ({ code: r.code, name: r.name, a: String(r.age0to59), b: String(r.age60above) })),
    prpwd: input.prpwd.map((p) => ({ label: p.label, referenceDate: p.referenceDate ?? '', total: String(p.totalPwds), encoded: String(p.totalEncoded) })),
    disabilityRows: input.disabilityRows.map((r) => ({
      disabilityType: r.disabilityType,
      female0to17: String(r.female0to17), male0to17: String(r.male0to17),
      female18to30: String(r.female18to30), male18to30: String(r.male18to30),
      female31to59: String(r.female31to59), male31to59: String(r.male31to59),
      female60above: String(r.female60above), male60above: String(r.male60above),
    })),
  }
}

/**
 * Create or edit a report: 14 barangay rows with live totals, plus the PRPWD encoding rows.
 * Only raw counts are submitted; the database derives every total and percentage.
 */
export default function RecapEditor({ initial, reports, busy, serverError, duplicateOf, onSave, onRequestDelete, onOpenExisting, onClose }: {
  initial: RecapInput
  reports: RecapReport[]
  busy: boolean
  serverError: string | null
  /** Set when the database says another report already has this as-of date. */
  duplicateOf: string | null
  onSave: (input: RecapInput, status: RecapStatus) => void
  onRequestDelete: (id: string) => void
  /** Switch to editing the report that already has this date, carrying over what was typed. */
  onOpenExisting: (id: string, typed: RecapInput) => void
  onClose: () => void
}) {
  const start = useMemo(() => toForm(initial), [initial])
  const [id, setId] = useState(initial.id)
  const [title, setTitle] = useState(initial.title)
  const [asOfDate, setAsOfDate] = useState(initial.asOfDate)
  const [showOnLanding, setShowOnLanding] = useState(initial.showOnLanding)
  const [rows, setRows] = useState<FormRow[]>(start.rows)
  const [prpwd, setPrpwd] = useState<FormPrpwd[]>(start.prpwd)
  const [disabilityRows, setDisabilityRows] = useState<FormDisabilityRow[]>(start.disabilityRows)
  const [errors, setErrors] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)

  const grand = useMemo(() => {
    const sum = (k: 'a' | 'b') => rows.reduce((t, r) => t + (Number.isFinite(toCount(r[k])) ? toCount(r[k]) : 0), 0)
    const a = sum('a')
    const b = sum('b')
    return { a, b, total: a + b }
  }, [rows])

  const disabilityFields: (keyof FormDisabilityRow)[] = [
    'female0to17', 'male0to17', 'female18to30', 'male18to30', 'female31to59', 'male31to59', 'female60above', 'male60above',
  ]
  const disabilityGrand = useMemo(() => {
    const perField = Object.fromEntries(disabilityFields.map((f) => [f, 0])) as Record<keyof FormDisabilityRow, number>
    let total = 0
    for (const r of disabilityRows) {
      for (const f of disabilityFields) {
        const v = Number.isFinite(toCount(r[f])) ? toCount(r[f]) : 0
        perField[f] += v
        total += v
      }
    }
    return { perField, total }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabilityRows])

  const build = (status: RecapStatus): RecapInput => ({
    ...(id ? { id } : {}),
    title,
    asOfDate,
    status,
    showOnLanding: status === 'published' && showOnLanding,
    rows: rows.map((r) => ({ code: r.code, name: r.name, age0to59: toCount(r.a), age60above: toCount(r.b) })),
    prpwd: prpwd.map((p) => ({ label: p.label, referenceDate: p.referenceDate || null, totalPwds: toCount(p.total), totalEncoded: toCount(p.encoded) })),
    disabilityRows: disabilityRows.map((r) => ({
      disabilityType: r.disabilityType,
      female0to17: toCount(r.female0to17), male0to17: toCount(r.male0to17),
      female18to30: toCount(r.female18to30), male18to30: toCount(r.male18to30),
      female31to59: toCount(r.female31to59), male31to59: toCount(r.male31to59),
      female60above: toCount(r.female60above), male60above: toCount(r.male60above),
    })),
  })

  const submit = (status: RecapStatus) => {
    setSubmitted(true)
    const input = build(status)
    const problems = validateInput(input, reports)
    setErrors(problems)
    if (problems.length === 0) onSave(input, status)
  }

  const copyFrom = (reportId: string) => {
    const source = reports.find((r) => r.id === reportId)
    if (!source) return
    const f = toForm(inputFromReport(source, false))
    setRows(f.rows)
    setPrpwd(f.prpwd)
    setDisabilityRows(f.disabilityRows)
    setErrors([])
  }

  const startNew = () => {
    setId(undefined)
    setAsOfDate('')
    setShowOnLanding(false)
    setErrors([])
  }

  const bad = (s: string) => submitted && !Number.isFinite(toCount(s))
  const patchRow = (i: number, k: 'a' | 'b', v: string) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: v } : r)))
  const patchPrpwd = (i: number, patch: Partial<FormPrpwd>) => setPrpwd((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)))
  const patchDisability = (i: number, k: keyof FormDisabilityRow, v: string) => setDisabilityRows((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: v } : r)))
  const dateBad = submitted && !asOfDate

  return (
    <Modal open onClose={onClose} title={id ? `Update report — ${formatAsOf(asOfDate) || 'as of date'}` : 'Add report'} size="xl">
      <div className="space-y-5">
        {(errors.length > 0 || serverError) && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-900">
            <p className="font-semibold mb-1">{serverError ? 'The report could not be saved' : 'Please fix the following'}</p>
            {serverError && <p>{serverError}</p>}
            {errors.length > 0 && <ul className="list-disc pl-5 space-y-0.5">{errors.slice(0, 8).map((e) => <li key={e}>{e}</li>)}{errors.length > 8 && <li>…and {errors.length - 8} more.</li>}</ul>}
            {duplicateOf && <div className="mt-3"><Button size="sm" variant="outline" onClick={() => onOpenExisting(duplicateOf, build(initial.status))}>Update the existing report instead</Button></div>}
          </div>
        )}

        <div className="grid sm:grid-cols-3 gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
            Report title
            <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            As of <span className="sr-only">(required)</span>
            <input type="date" required aria-invalid={dateBad || undefined} className={`${field} ${dateBad ? 'border-red-400' : ''}`} value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
          </label>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          {reports.length > 0 && (
            <div className="min-w-64">
              <Select
                label="Start from another report"
                ariaLabel="Copy values from another report"
                options={reports.map((r) => ({ value: r.id, label: `Copy of ${formatAsOf(r.asOfDate)} (${r.status})` }))}
                value=""
                onChange={copyFrom}
                placeholder="Keep the values below"
              />
            </div>
          )}
          {id && (
            <Button variant="outline" size="sm" icon={<Copy size={14} />} onClick={startNew}>
              <span className="ml-1.5">Save as a new report instead</span>
            </Button>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <caption className="sr-only">Number of persons with disabilities per barangay, by age bracket</caption>
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th scope="col" className="px-3 py-2 text-left w-12">No.</th>
                <th scope="col" className="px-3 py-2 text-left">Barangay</th>
                <th scope="col" className="px-3 py-2 text-right w-36">Age 0-59</th>
                <th scope="col" className="px-3 py-2 text-right w-36">Age 60-above</th>
                <th scope="col" className="px-3 py-2 text-right w-28">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r, i) => (
                <tr key={r.code}>
                  <td className="px-3 py-1.5 text-slate-500">{i + 1}</td>
                  <th scope="row" className="px-3 py-1.5 text-left font-medium text-slate-900">{r.name}</th>
                  <td className="px-3 py-1.5">
                    <input inputMode="numeric" aria-label={`${r.name}, age 0 to 59`} aria-invalid={bad(r.a) || undefined} className={`${cell} ${bad(r.a) ? 'border-red-400' : 'border-slate-200'}`} value={r.a} onChange={(e) => patchRow(i, 'a', e.target.value)} />
                  </td>
                  <td className="px-3 py-1.5">
                    <input inputMode="numeric" aria-label={`${r.name}, age 60 and above`} aria-invalid={bad(r.b) || undefined} className={`${cell} ${bad(r.b) ? 'border-red-400' : 'border-slate-200'}`} value={r.b} onChange={(e) => patchRow(i, 'b', e.target.value)} />
                  </td>
                  <td className="px-3 py-1.5 text-right font-semibold tabular-nums" aria-live="polite">{fmt(toCount(r.a) + toCount(r.b))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-bold">
              <tr>
                <td className="px-3 py-2" colSpan={2}>TOTAL</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(grand.a)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(grand.b)}</td>
                <td className="px-3 py-2 text-right tabular-nums" aria-live="polite">{fmt(grand.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <fieldset>
          <legend className="text-sm font-semibold text-slate-800 mb-2">DOH PRPWD encoding status</legend>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <caption className="sr-only">DOH PRPWD encoding progress</caption>
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left">Label</th>
                  <th scope="col" className="px-3 py-2 text-left w-40">Reference date</th>
                  <th scope="col" className="px-3 py-2 text-right w-32">Total PWDs</th>
                  <th scope="col" className="px-3 py-2 text-right w-32">Total encoded</th>
                  <th scope="col" className="px-3 py-2 text-right w-20">%</th>
                  <th scope="col" className="px-3 py-2 w-12"><span className="sr-only">Remove</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {prpwd.map((p, i) => {
                  const total = toCount(p.total)
                  const encoded = toCount(p.encoded)
                  const over = Number.isFinite(total) && Number.isFinite(encoded) && encoded > total
                  return (
                    <tr key={i}>
                      <td className="px-3 py-1.5"><input aria-label={`PRPWD row ${i + 1} label`} className={`${field} ${submitted && !p.label.trim() ? 'border-red-400' : ''}`} value={p.label} onChange={(e) => patchPrpwd(i, { label: e.target.value })} /></td>
                      <td className="px-3 py-1.5"><input type="date" aria-label={`PRPWD row ${i + 1} reference date`} className={field} value={p.referenceDate} onChange={(e) => patchPrpwd(i, { referenceDate: e.target.value })} /></td>
                      <td className="px-3 py-1.5"><input inputMode="numeric" aria-label={`PRPWD row ${i + 1} total PWDs`} aria-invalid={bad(p.total) || undefined} className={`${cell} ${bad(p.total) ? 'border-red-400' : 'border-slate-200'}`} value={p.total} onChange={(e) => patchPrpwd(i, { total: e.target.value })} /></td>
                      <td className="px-3 py-1.5"><input inputMode="numeric" aria-label={`PRPWD row ${i + 1} total encoded`} aria-invalid={bad(p.encoded) || over || undefined} className={`${cell} ${bad(p.encoded) || over ? 'border-red-400' : 'border-slate-200'}`} value={p.encoded} onChange={(e) => patchPrpwd(i, { encoded: e.target.value })} /></td>
                      <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{Number.isFinite(total) && Number.isFinite(encoded) ? `${prpwdPercent(total, encoded)}%` : '—'}</td>
                      <td className="px-3 py-1.5 text-right">
                        <button type="button" onClick={() => setPrpwd((ps) => ps.filter((_, j) => j !== i))} aria-label={`Remove PRPWD row ${i + 1}`} className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400">
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {prpwd.length === 0 && <tr><td colSpan={6} className="px-3 py-4 text-center text-slate-500">No PRPWD rows. Add one below if this report needs it.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="mt-2">
            <Button variant="outline" size="sm" icon={<Plus size={14} />} onClick={() => setPrpwd((ps) => [...ps, { label: '', referenceDate: asOfDate, total: '0', encoded: '0' }])}>
              <span className="ml-1.5">Add PRPWD row</span>
            </Button>
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-semibold text-slate-800 mb-2">Disability Data — by age group and sex</legend>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm min-w-[900px]">
              <caption className="sr-only">Number of persons with disabilities per type, by age group and sex</caption>
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th scope="col" rowSpan={2} className="px-3 py-2 text-left w-8 align-bottom">No.</th>
                  <th scope="col" rowSpan={2} className="px-3 py-2 text-left align-bottom">Type of Disability</th>
                  {AGE_GROUPS.map((g) => (
                    <th key={g} scope="colgroup" colSpan={2} className="px-2 py-1.5 text-center border-l border-slate-200">{AGE_GROUP_LABEL[g]}</th>
                  ))}
                  <th scope="col" rowSpan={2} className="px-3 py-2 text-right w-24 align-bottom border-l border-slate-200">Total</th>
                </tr>
                <tr>
                  {AGE_GROUPS.flatMap((g) => [
                    <th key={`${g}-f`} scope="col" className="px-2 py-1.5 text-right w-20 border-l border-slate-200">F</th>,
                    <th key={`${g}-m`} scope="col" className="px-2 py-1.5 text-right w-20">M</th>,
                  ])}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {disabilityRows.map((r, i) => {
                  const rowTotal = disabilityFields.reduce((t, f) => t + (Number.isFinite(toCount(r[f])) ? toCount(r[f]) : 0), 0)
                  return (
                    <tr key={r.disabilityType}>
                      <td className="px-3 py-1.5 text-slate-500">{i + 1}</td>
                      <th scope="row" className="px-3 py-1.5 text-left font-medium text-slate-900">{r.disabilityType}</th>
                      {AGE_GROUPS.flatMap((g) => {
                        const fKey = DISABILITY_FIELDS[g].female
                        const mKey = DISABILITY_FIELDS[g].male
                        return [
                          <td key={`${g}-f`} className="px-1.5 py-1.5 border-l border-slate-100">
                            <input
                              inputMode="numeric"
                              aria-label={`${r.disabilityType}, ${AGE_GROUP_LABEL[g]}, female`}
                              aria-invalid={bad(r[fKey]) || undefined}
                              className={`${cell} ${bad(r[fKey]) ? 'border-red-400' : 'border-slate-200'}`}
                              value={r[fKey]}
                              onChange={(e) => patchDisability(i, fKey, e.target.value)}
                            />
                          </td>,
                          <td key={`${g}-m`} className="px-1.5 py-1.5">
                            <input
                              inputMode="numeric"
                              aria-label={`${r.disabilityType}, ${AGE_GROUP_LABEL[g]}, male`}
                              aria-invalid={bad(r[mKey]) || undefined}
                              className={`${cell} ${bad(r[mKey]) ? 'border-red-400' : 'border-slate-200'}`}
                              value={r[mKey]}
                              onChange={(e) => patchDisability(i, mKey, e.target.value)}
                            />
                          </td>,
                        ]
                      })}
                      <td className="px-3 py-1.5 text-right font-semibold tabular-nums border-l border-slate-100" aria-live="polite">{fmt(rowTotal)}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="bg-slate-50 font-bold">
                <tr>
                  <td className="px-3 py-2" colSpan={2}>TOTAL</td>
                  {AGE_GROUPS.flatMap((g) => [
                    <td key={`${g}-f`} className="px-2 py-2 text-right tabular-nums border-l border-slate-200">{fmt(disabilityGrand.perField[DISABILITY_FIELDS[g].female])}</td>,
                    <td key={`${g}-m`} className="px-2 py-2 text-right tabular-nums">{fmt(disabilityGrand.perField[DISABILITY_FIELDS[g].male])}</td>,
                  ])}
                  <td className="px-3 py-2 text-right tabular-nums border-l border-slate-200" aria-live="polite">{fmt(disabilityGrand.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </fieldset>

        <label className="flex items-start gap-2.5 text-sm text-slate-700">
          <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-ea-teal-600" checked={showOnLanding} onChange={(e) => setShowOnLanding(e.target.checked)} />
          <span>
            <span className="font-medium">Show on the public landing page</span>
            <span className="block text-xs text-slate-500">Read-only table, no export. Only applies when you Publish, and replaces any other report shown there.</span>
          </span>
        </label>

        <Alert type="info" message="Row totals, the grand total and percentages are calculated for you and saved by the server; you only enter the counts." />

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div>
            {id && (
              <Button variant="danger" icon={<Trash2 size={15} />} onClick={() => onRequestDelete(id)} disabled={busy}>
                <span className="ml-1.5">Delete</span>
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button variant="outline" icon={<Save size={15} />} onClick={() => submit('draft')} disabled={busy}>
              <span className="ml-1.5">Save as Draft</span>
            </Button>
            <Button icon={<Send size={15} />} onClick={() => submit('published')} disabled={busy}>
              <span className="ml-1.5">{busy ? 'Saving…' : 'Publish'}</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
