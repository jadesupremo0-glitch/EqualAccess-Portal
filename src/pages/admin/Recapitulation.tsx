import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowDown, ArrowUp, ArrowUpDown, CheckCircle, FileSpreadsheet, FileText, Filter, Percent, Plus, Printer,
  ShieldAlert, Table2, Trash2, TrendingDown, TrendingUp, Users, XCircle, Hourglass, UserRound,
} from 'lucide-react'
import { Alert, Badge, Button, Card, EmptyState, Modal, PageHeader, SearchBar, Select, StatsCard, Tabs } from '../../components/ui'
import RecapEditor from '../../components/recapitulation/RecapEditor'
import RecapCharts from '../../components/recapitulation/RecapCharts'
import RecapPrintView from '../../components/recapitulation/RecapPrintView'
import DisabilityRecapCharts from '../../components/recapitulation/DisabilityRecapCharts'
import DisabilityPrintView from '../../components/recapitulation/DisabilityPrintView'
import { useAdminSession } from '../../context'
import { useStore } from '../../store'
import { manilaDate } from '../../lib/catalog'
import {
  RecapDuplicateError, deleteRecapReport, fetchRecapReports, saveRecapReport, type RecapAuth,
} from '../../lib/recapitulation/api'
import {
  AGE_GROUPS, AGE_GROUP_LABEL, DISABILITY_FIELDS, DISABILITY_REPORT_TITLE,
  blankInput, describeChanges, disabilityExtremes, extremes, formatAsOf, inputFromReport, sharePercent, sumDisabilityRows, sumRows,
} from '../../lib/recapitulation/compute'
import { downloadCsv, downloadDisabilityCsv, downloadDisabilityXlsx, downloadXlsx, prpwdLabel } from '../../lib/recapitulation/export'
import type { AgeGroup, RecapDisabilityRow, RecapInput, RecapReport, RecapStatus } from '../../lib/recapitulation/types'

const n = (v: number) => v.toLocaleString('en-US')

type SortKey = 'order' | 'name' | 'age0to59' | 'age60above' | 'total' | 'share'
type Toast = { type: 'success' | 'error'; message: string } | null
type RecapTab = 'By Barangay' | 'By Disability Type'
type SexFilter = 'both' | 'female' | 'male'

const messageOf = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Please try again.')

/** Admin-only page. The guard sits outside the data hooks so a PWD user or guest never triggers a request. */
export default function Recapitulation({ onNavigate }: { onNavigate: (p: string) => void }) {
  const session = useAdminSession()
  const { adminUsers } = useStore()
  const admin = session ? adminUsers.find((a) => a.id === session.adminId && a.status === 'Active') : undefined

  if (!admin) {
    return (
      <Card>
        <EmptyState
          icon={<ShieldAlert size={26} />}
          title="Administrators only"
          message="The PWD Recapitulation is available to signed-in PDAO administrators."
          action={<Button variant="outline" size="sm" onClick={() => onNavigate('landing')}>Back to home</Button>}
        />
      </Card>
    )
  }
  return <RecapitulationPage adminId={admin.id} secret={admin.password} username={admin.username} />
}

function RecapitulationPage({ adminId, secret, username }: { adminId: string; secret: string; username: string }) {
  const { logActivity } = useStore()
  // Stable across renders, so the load effect below only runs once per sign-in.
  const auth = useMemo<RecapAuth>(() => ({ adminId, secret }), [adminId, secret])

  const [reports, setReports] = useState<RecapReport[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dateProbe, setDateProbe] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'order', dir: 'asc' })
  const [includeAnalytics, setIncludeAnalytics] = useState(false)
  const [exporting, setExporting] = useState(false)

  const [tab, setTab] = useState<RecapTab>('By Barangay')
  const [dSearch, setDSearch] = useState('')
  const [ageGroupFilter, setAgeGroupFilter] = useState<Set<AgeGroup>>(new Set(AGE_GROUPS))
  const [sexFilter, setSexFilter] = useState<SexFilter>('both')
  const [dExporting, setDExporting] = useState(false)

  const [editor, setEditor] = useState<{ key: number; input: RecapInput } | null>(null)
  const [busy, setBusy] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [duplicateOf, setDuplicateOf] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<RecapReport | null>(null)
  const [toast, setToast] = useState<Toast>(null)

  const notify = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message })
  }, [])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [toast])

  const reload = useCallback(
    async (selectId?: string) => {
      setLoading(true)
      setLoadError(null)
      try {
        const list = await fetchRecapReports(auth)
        setReports(list)
        setSelectedId((prev) => selectId ?? (list.some((r) => r.id === prev) ? prev : (list[0]?.id ?? null)))
      } catch (e) {
        setLoadError(messageOf(e))
      } finally {
        setLoading(false)
      }
    },
    [auth],
  )
  useEffect(() => {
    void reload()
  }, [reload])

  const selected = reports.find((r) => r.id === selectedId) ?? null
  const totals = useMemo(() => (selected ? sumRows(selected.rows) : null), [selected])
  const ext = useMemo(() => (selected ? extremes(selected.rows) : { highest: [], lowest: [] }), [selected])
  // Falls back to [] for a report saved before the Disability Data migration/seed ran, so an older
  // snapshot never crashes this tab.
  const selectedDisabilityRows = selected?.disabilityRows ?? []

  const tableRows = useMemo(() => {
    if (!selected || !totals) return []
    const q = search.trim().toLowerCase()
    const rows = selected.rows
      .map((r, i) => ({ ...r, order: i + 1, share: sharePercent(r.total, totals.total) }))
      .filter((r) => !q || r.name.toLowerCase().includes(q))
    const dir = sort.dir === 'asc' ? 1 : -1
    return rows.sort((a, b) => {
      const av = a[sort.key]
      const bv = b[sort.key]
      return (typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number)) * dir
    })
  }, [selected, totals, search, sort])

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'name' || key === 'order' ? 'asc' : 'desc' }))

  // ── Disability Data (By Disability Type tab) ──
  // Age-group and sex filters are view-only: they zero out the columns the admin hid, so the on-screen
  // table, its totals and the charts all agree, without touching the saved report. Print and Export
  // always use the full, unfiltered report — the official record should never depend on a forgotten filter.
  const visibleAgeGroups = AGE_GROUPS.filter((g) => ageGroupFilter.has(g))
  const filteredDisabilityRows: RecapDisabilityRow[] = useMemo(() => {
    return selectedDisabilityRows.map((r) => {
      const row = { ...r }
      for (const g of AGE_GROUPS) {
        const { female, male } = DISABILITY_FIELDS[g]
        if (!ageGroupFilter.has(g)) {
          row[female] = 0
          row[male] = 0
        } else {
          if (sexFilter === 'male') row[female] = 0
          if (sexFilter === 'female') row[male] = 0
        }
      }
      row.total = AGE_GROUPS.reduce((t, g) => t + row[DISABILITY_FIELDS[g].female] + row[DISABILITY_FIELDS[g].male], 0)
      return row
    })
  }, [selectedDisabilityRows, ageGroupFilter, sexFilter])

  const dTotals = useMemo(() => sumDisabilityRows(filteredDisabilityRows), [filteredDisabilityRows])
  const dExt = useMemo(() => disabilityExtremes(filteredDisabilityRows), [filteredDisabilityRows])
  const dTableRows = useMemo(() => {
    const q = dSearch.trim().toLowerCase()
    return filteredDisabilityRows
      .map((r, i) => ({ ...r, order: i + 1 }))
      .filter((r) => !q || r.disabilityType.toLowerCase().includes(q))
  }, [filteredDisabilityRows, dSearch])

  const toggleAgeGroup = (g: AgeGroup) =>
    setAgeGroupFilter((set) => {
      const next = new Set(set)
      if (next.has(g)) next.delete(g)
      else next.add(g)
      return next.size === 0 ? new Set(AGE_GROUPS) : next
    })

  const mostCommonDisability = [...selectedDisabilityRows].sort((a, b) => b.total - a.total)[0]
  const disabilityGrandForShare = sumDisabilityRows(selectedDisabilityRows).grandTotal
  const largestAgeGroup = selected
    ? AGE_GROUPS.map((g) => ({ g, total: sumDisabilityRows(selectedDisabilityRows).byAgeGroup[g] })).sort((a, b) => b.total - a.total)[0]
    : null

  // ── Actions ──

  const openEditor = (input: RecapInput) => {
    setServerError(null)
    setDuplicateOf(null)
    setEditor({ key: Date.now(), input })
  }

  const handleSave = async (input: RecapInput, status: RecapStatus) => {
    setBusy(true)
    setServerError(null)
    setDuplicateOf(null)
    try {
      const before = input.id ? reports.find((r) => r.id === input.id) : undefined
      const id = await saveRecapReport(auth, input)
      await reload(id)
      const action =
        status === 'published' && before?.status !== 'published' ? 'Published Recapitulation Report' : before ? 'Updated Recapitulation Report' : 'Created Recapitulation Report'
      logActivity(action, `${action.split(' ')[0]} recapitulation report as of ${formatAsOf(input.asOfDate)} (${status}): ${describeChanges(before ? inputFromReport(before) : null, input)}`, username)
      setEditor(null)
      notify('success', status === 'published' ? 'Report published.' : 'Draft saved.')
    } catch (e) {
      if (e instanceof RecapDuplicateError) {
        setDuplicateOf(e.existingId)
        setServerError(`A report as of ${formatAsOf(input.asOfDate)} already exists. You can update that one instead.`)
      } else {
        setServerError(messageOf(e))
      }
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setBusy(true)
    try {
      await deleteRecapReport(auth, confirmDelete.id)
      logActivity('Deleted Recapitulation Report', `Deleted recapitulation report as of ${formatAsOf(confirmDelete.asOfDate)} (${confirmDelete.status}, total ${n(sumRows(confirmDelete.rows).total)})`, username)
      setConfirmDelete(null)
      setEditor(null)
      await reload()
      notify('success', 'Report deleted.')
    } catch (e) {
      notify('error', messageOf(e))
      setConfirmDelete(null)
    } finally {
      setBusy(false)
    }
  }

  const exportCsv = () => {
    if (!selected) return
    downloadCsv(selected, { includeAnalytics })
    notify('success', 'CSV downloaded.')
  }

  const exportXlsx = async () => {
    if (!selected) return
    setExporting(true)
    try {
      await downloadXlsx(selected, { includeAnalytics })
      notify('success', 'Excel file downloaded.')
    } catch (e) {
      notify('error', `Excel export failed: ${messageOf(e)}`)
    } finally {
      setExporting(false)
    }
  }

  const exportDisabilityCsv = () => {
    if (!selected) return
    downloadDisabilityCsv(selected)
    notify('success', 'CSV downloaded.')
  }

  const exportDisabilityXlsx = async () => {
    if (!selected) return
    setDExporting(true)
    try {
      await downloadDisabilityXlsx(selected)
      notify('success', 'Excel file downloaded.')
    } catch (e) {
      notify('error', `Excel export failed: ${messageOf(e)}`)
    } finally {
      setDExporting(false)
    }
  }

  const onDateProbe = (value: string) => {
    if (!value) return
    const match = reports.find((r) => r.asOfDate === value)
    if (match) {
      setSelectedId(match.id)
      setDateProbe(null)
    } else {
      setDateProbe(value)
    }
  }

  const startForDate = (date: string) => {
    const base = selected ? { ...inputFromReport(selected, false), asOfDate: date, status: 'draft' as const, showOnLanding: false } : blankInput(date)
    openEditor(base)
    setDateProbe(null)
  }

  // ── Render ──

  const primaryPrpwd = selected?.prpwd[0]
  const sortIcon = (key: SortKey) =>
    sort.key !== key ? <ArrowUpDown size={12} aria-hidden="true" /> : sort.dir === 'asc' ? <ArrowUp size={12} aria-hidden="true" /> : <ArrowDown size={12} aria-hidden="true" />
  const ariaSort = (key: SortKey) => (sort.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none')

  // A plain render function (not a component) so the header buttons keep focus across re-renders.
  const sortHead = (k: SortKey, label: string, align: 'left' | 'right' = 'right') => (
    <th key={k} scope="col" aria-sort={ariaSort(k)} className={`px-4 py-3 ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className={`inline-flex items-center gap-1 font-semibold uppercase tracking-wide text-xs text-slate-600 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-ea-teal-500 rounded ${align === 'right' ? 'flex-row-reverse' : ''}`}
      >
        {label}
        <span className="sr-only">, sort {sort.key === k && sort.dir === 'asc' ? 'descending' : 'ascending'}</span>
        {sortIcon(k)}
      </button>
    </th>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={tab === 'By Barangay' ? 'PWD Recapitulation' : 'DISABILITY DATA OF LOS BAÑOS'}
        subtitle={
          tab === 'By Barangay'
            ? 'Total number strength of persons with disabilities in Los Baños, by barangay and age bracket'
            : 'Based on the Encoded Data from LGU Masterlist'
        }
        actions={
          <Button icon={<Plus size={16} />} onClick={() => openEditor(selected ? inputFromReport(selected) : blankInput(manilaDate()))}>
            <span className="ml-1.5">Edit Data</span>
          </Button>
        }
      />

      <Tabs tabs={['By Barangay', 'By Disability Type']} active={tab} onChange={(t) => setTab(t as RecapTab)} />

      {loadError && (
        <Alert type="error" title="Could not load the recapitulation" message={`${loadError} If this is the first time, make sure the latest migration was applied (supabase db push).`} />
      )}

      {loading && reports.length === 0 && !loadError && (
        <Card className="p-8 text-center text-slate-600">
          <p role="status" className="text-sm">Loading recapitulation…</p>
        </Card>
      )}

      {!loading && !loadError && reports.length === 0 && (
        <Card>
          <EmptyState
            icon={<Table2 size={26} />}
            title="No report yet"
            message="Add the first recapitulation snapshot to see the totals, charts and exports."
            action={<Button size="sm" onClick={() => openEditor(blankInput(manilaDate()))}>Add report</Button>}
          />
        </Card>
      )}

      {selected && totals && tab === 'By Barangay' && (
        <>
          {/* Selector, date and export toolbar */}
          <Card className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="min-w-56 flex-1">
                <Select
                  label="Report"
                  options={reports.map((r) => ({ value: r.id, label: `${formatAsOf(r.asOfDate)} — ${r.status === 'published' ? 'Published' : 'Draft'}` }))}
                  value={selected.id}
                  onChange={(v) => {
                    setSelectedId(v)
                    setDateProbe(null)
                  }}
                />
              </div>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                As of
                <input
                  type="date"
                  value={dateProbe ?? selected.asOfDate}
                  onChange={(e) => onDateProbe(e.target.value)}
                  className="border border-white/70 shadow-sm rounded-xl text-sm text-slate-900 bg-white/70 px-3.5 py-2.5 focus:outline-none focus:ring-4 focus:ring-ea-teal-500/20 focus:border-ea-teal-400"
                />
              </label>
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-slate-700">Status</span>
                <span className="py-2"><Badge variant={selected.status === 'published' ? 'success' : 'warning'}>{selected.status === 'published' ? 'Published' : 'Draft'}</Badge></span>
              </div>
            </div>

            {dateProbe && (
              <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-sky-50 border border-sky-200 px-4 py-3 text-sm text-sky-900" role="status">
                <span>No report exists as of {formatAsOf(dateProbe)}.</span>
                <Button size="sm" variant="outline" onClick={() => startForDate(dateProbe)}>Create one for this date</Button>
                <Button size="sm" variant="ghost" onClick={() => setDateProbe(null)}>Dismiss</Button>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
              <Button variant="outline" size="sm" icon={<FileText size={15} />} onClick={exportCsv}>
                <span className="ml-1.5">Export CSV</span>
              </Button>
              <Button variant="outline" size="sm" icon={<FileSpreadsheet size={15} />} onClick={exportXlsx} disabled={exporting}>
                <span className="ml-1.5">{exporting ? 'Preparing…' : 'Export Excel'}</span>
              </Button>
              <Button variant="outline" size="sm" icon={<Printer size={15} />} onClick={() => window.print()}>
                <span className="ml-1.5">Print</span>
              </Button>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-ea-teal-600" checked={includeAnalytics} onChange={(e) => setIncludeAnalytics(e.target.checked)} />
                Include analytics columns
              </label>
              <span className="ml-auto text-xs text-slate-500">Last updated {new Date(selected.updatedAt).toLocaleString('en-PH')}{selected.updatedBy ? ` by ${selected.updatedBy}` : ''}</span>
            </div>
          </Card>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatsCard label="Total PWDs" value={n(totals.total)} icon={<Users size={20} className="text-blue-600" />} color="bg-blue-50" />
            <StatsCard label="Age 0-59" value={n(totals.age0to59)} icon={<UserRound size={20} className="text-teal-600" />} color="bg-teal-50" />
            <StatsCard label="Age 60-above" value={n(totals.age60above)} icon={<UserRound size={20} className="text-amber-600" />} color="bg-amber-50" />
            <StatsCard label="Seniors (60+)" value={`${sharePercent(totals.age60above, totals.total)}%`} icon={<Percent size={20} className="text-purple-600" />} color="bg-purple-50" note="Share of all PWDs" />
            <StatsCard label="PRPWD encoded" value={primaryPrpwd ? `${primaryPrpwd.percentage}%` : '—'} icon={<CheckCircle size={20} className="text-emerald-600" />} color="bg-emerald-50" note={primaryPrpwd ? primaryPrpwd.label : 'No PRPWD row'} />
            <StatsCard label="Not yet encoded" value={primaryPrpwd ? n(primaryPrpwd.totalPwds - primaryPrpwd.totalEncoded) : '—'} icon={<Hourglass size={20} className="text-rose-600" />} color="bg-rose-50" note={primaryPrpwd ? 'Total PWDs − encoded' : undefined} />
          </div>

          {/* Recapitulation table */}
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-3">
              <div>
                <h2 className="font-display font-bold text-gray-900">{selected.title}</h2>
                <p className="text-sm text-slate-500">As of {formatAsOf(selected.asOfDate)}</p>
              </div>
              <div className="w-full sm:w-64"><SearchBar value={search} onChange={setSearch} placeholder="Search barangay..." /></div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <caption className="sr-only">Persons with disabilities per barangay by age bracket, as of {formatAsOf(selected.asOfDate)}</caption>
                <thead className="bg-slate-50/80 border-y border-slate-100">
                  <tr>
                    {sortHead('order', 'No.', 'left')}
                    {sortHead('name', 'Barangay', 'left')}
                    {sortHead('age0to59', 'Age 0-59')}
                    {sortHead('age60above', 'Age 60-above')}
                    {sortHead('total', 'Total')}
                    {sortHead('share', 'Share of total')}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tableRows.map((r) => {
                    const high = ext.highest.includes(r.code)
                    const low = ext.lowest.includes(r.code)
                    return (
                      <tr key={r.code} className={high ? 'bg-emerald-50/70' : low ? 'bg-amber-50/70' : ''}>
                        <td className="px-4 py-2.5 text-slate-500">{r.order}</td>
                        <th scope="row" className="px-4 py-2.5 text-left font-medium text-slate-900">
                          {r.name}
                          {high && <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-800"><TrendingUp size={12} aria-hidden="true" />Highest</span>}
                          {low && <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-800"><TrendingDown size={12} aria-hidden="true" />Lowest</span>}
                        </th>
                        <td className="px-4 py-2.5 text-right tabular-nums">{n(r.age0to59)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{n(r.age60above)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-semibold">{n(r.total)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{r.share.toFixed(1)}%</td>
                      </tr>
                    )
                  })}
                  {tableRows.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No barangay matches “{search}”.</td></tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200">
                  <tr>
                    <td className="px-4 py-3" colSpan={2}>TOTAL{search.trim() ? ' (all barangays)' : ''}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{n(totals.age0to59)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{n(totals.age60above)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{n(totals.total)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">100.0%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="px-5 py-3 text-xs text-slate-500 border-t border-slate-100">
              The share column is for analysis only: it is left out of the exports unless “Include analytics columns” is ticked.
            </p>
          </Card>

          {/* DOH PRPWD encoding status */}
          <Card className="p-5">
            <h2 className="font-display font-bold text-gray-900 mb-3">DOH PRPWD Encoding Status</h2>
            {selected.prpwd.length === 0 ? (
              <p className="text-sm text-slate-500">No PRPWD rows in this report.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[560px]">
                  <caption className="sr-only">DOH PRPWD encoding progress</caption>
                  <thead className="text-xs uppercase tracking-wide text-slate-600 border-b border-slate-100">
                    <tr>
                      <th scope="col" className="py-2 pr-4 text-left">Label</th>
                      <th scope="col" className="py-2 px-4 text-right">Total PWDs</th>
                      <th scope="col" className="py-2 px-4 text-right">Total Encoded</th>
                      <th scope="col" className="py-2 pl-4 text-right">Percentage</th>
                      <th scope="col" className="py-2 pl-6 text-left w-1/3"><span className="sr-only">Progress</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selected.prpwd.map((p, i) => {
                      const color = p.percentage >= 80 ? 'bg-emerald-500' : p.percentage >= 50 ? 'bg-sky-500' : 'bg-amber-500'
                      return (
                        <tr key={i}>
                          <th scope="row" className="py-3 pr-4 text-left font-medium text-slate-900">
                            {p.label}
                            {p.referenceDate && <span className="block text-xs font-normal text-slate-500">as of {formatAsOf(p.referenceDate)}</span>}
                          </th>
                          <td className="py-3 px-4 text-right tabular-nums">{n(p.totalPwds)}</td>
                          <td className="py-3 px-4 text-right tabular-nums">{n(p.totalEncoded)}</td>
                          <td className="py-3 pl-4 text-right tabular-nums font-semibold">{p.percentage}%</td>
                          <td className="py-3 pl-6">
                            <div
                              role="progressbar"
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={p.percentage}
                              aria-label={`${prpwdLabel(p)}: ${p.percentage}% encoded`}
                              className="h-2.5 rounded-full bg-slate-100 overflow-hidden"
                            >
                              <div className={`h-full rounded-full ${color}`} style={{ width: `${p.percentage}%` }} />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <RecapCharts report={selected} reports={reports} />
          <RecapPrintView report={selected} />
        </>
      )}

      {selected && tab === 'By Disability Type' && (
        <>
          {/* Report selector + export toolbar */}
          <Card className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="min-w-56 flex-1">
                <Select
                  label="Report"
                  options={reports.map((r) => ({ value: r.id, label: `${formatAsOf(r.asOfDate)} — ${r.status === 'published' ? 'Published' : 'Draft'}` }))}
                  value={selected.id}
                  onChange={setSelectedId}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-slate-700">As of</span>
                <span className="py-2 text-sm font-semibold text-slate-900">{formatAsOf(selected.asOfDate)}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-slate-700">Status</span>
                <span className="py-2"><Badge variant={selected.status === 'published' ? 'success' : 'warning'}>{selected.status === 'published' ? 'Published' : 'Draft'}</Badge></span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
              <Button variant="outline" size="sm" icon={<FileText size={15} />} onClick={exportDisabilityCsv}>
                <span className="ml-1.5">Export CSV</span>
              </Button>
              <Button variant="outline" size="sm" icon={<FileSpreadsheet size={15} />} onClick={exportDisabilityXlsx} disabled={dExporting}>
                <span className="ml-1.5">{dExporting ? 'Preparing…' : 'Export Excel'}</span>
              </Button>
              <Button variant="outline" size="sm" icon={<Printer size={15} />} onClick={() => window.print()}>
                <span className="ml-1.5">Print</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={<FileText size={15} />}
                onClick={() => window.print()}
                title="Opens the print dialog — choose “Save as PDF” as the destination"
              >
                <span className="ml-1.5">Export PDF</span>
              </Button>
              <span className="ml-auto text-xs text-slate-500">Last updated {new Date(selected.updatedAt).toLocaleString('en-PH')}{selected.updatedBy ? ` by ${selected.updatedBy}` : ''}</span>
            </div>
          </Card>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
            <StatsCard label="Total Registered PWDs" value={n(disabilityGrandForShare)} icon={<Users size={20} className="text-blue-600" />} color="bg-blue-50" />
            <StatsCard label="Total Female" value={n(sumDisabilityRows(selectedDisabilityRows).female)} icon={<UserRound size={20} className="text-rose-600" />} color="bg-rose-50" />
            <StatsCard label="Total Male" value={n(sumDisabilityRows(selectedDisabilityRows).male)} icon={<UserRound size={20} className="text-sky-600" />} color="bg-sky-50" />
            {mostCommonDisability && (
              <StatsCard
                label="Most Common Disability Type"
                value={mostCommonDisability.disabilityType}
                icon={<TrendingUp size={20} className="text-emerald-600" />}
                color="bg-emerald-50"
                note={`${n(mostCommonDisability.total)} (${sharePercent(mostCommonDisability.total, disabilityGrandForShare)}%)`}
              />
            )}
            {largestAgeGroup && (
              <StatsCard
                label="Largest Age Group"
                value={AGE_GROUP_LABEL[largestAgeGroup.g]}
                icon={<Percent size={20} className="text-purple-600" />}
                color="bg-purple-50"
                note={`${n(largestAgeGroup.total)} (${sharePercent(largestAgeGroup.total, disabilityGrandForShare)}%)`}
              />
            )}
          </div>

          {/* Filters */}
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Filter size={14} className="text-slate-500" aria-hidden="true" />
              <span className="text-sm font-semibold text-slate-700">Filters</span>
              <span className="text-xs text-slate-500">— view only; exports always use the full official data</span>
            </div>
            <div className="flex flex-wrap items-start gap-6">
              <fieldset>
                <legend className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Age group</legend>
                <div className="flex flex-wrap gap-3">
                  {AGE_GROUPS.map((g) => (
                    <label key={g} className="flex items-center gap-1.5 text-sm text-slate-700">
                      <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-ea-teal-600" checked={ageGroupFilter.has(g)} onChange={() => toggleAgeGroup(g)} />
                      {AGE_GROUP_LABEL[g]}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Sex</legend>
                <div className="flex gap-3">
                  {(['both', 'female', 'male'] as SexFilter[]).map((s) => (
                    <label key={s} className="flex items-center gap-1.5 text-sm text-slate-700">
                      <input type="radio" name="sex-filter" className="h-4 w-4 border-slate-300 text-ea-teal-600" checked={sexFilter === s} onChange={() => setSexFilter(s)} />
                      {s === 'both' ? 'Both' : s === 'female' ? 'Female' : 'Male'}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="flex-1 min-w-56">
                <SearchBar value={dSearch} onChange={setDSearch} placeholder="Search disability type..." />
              </div>
            </div>
          </Card>

          {/* Disability Data matrix */}
          <Card>
            <div className="p-5 pb-3">
              <h2 className="font-display font-bold text-gray-900">{DISABILITY_REPORT_TITLE}</h2>
              <p className="text-sm text-slate-500">As of {formatAsOf(selected.asOfDate)}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <caption className="sr-only">Persons with disabilities per type, by age group and sex, as of {formatAsOf(selected.asOfDate)}</caption>
                <thead className="bg-slate-50/80 border-y border-slate-100 text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th scope="col" rowSpan={2} className="px-3 py-2 text-left align-bottom">No.</th>
                    <th scope="col" rowSpan={2} className="px-3 py-2 text-left align-bottom">Type of Disability</th>
                    {visibleAgeGroups.map((g) => (
                      <th key={g} scope="colgroup" colSpan={sexFilter === 'both' ? 2 : 1} className="px-2 py-2 text-center border-l border-slate-200">{AGE_GROUP_LABEL[g]}</th>
                    ))}
                    <th scope="col" rowSpan={2} className="px-3 py-2 text-right align-bottom border-l border-slate-200">TOTAL</th>
                  </tr>
                  <tr>
                    {visibleAgeGroups.flatMap((g) => [
                      sexFilter !== 'male' && <th key={`${g}-f`} scope="col" className="px-2 py-1.5 text-right border-l border-slate-200">Female</th>,
                      sexFilter !== 'female' && <th key={`${g}-m`} scope="col" className={`px-2 py-1.5 text-right ${sexFilter === 'both' ? '' : 'border-l border-slate-200'}`}>Male</th>,
                    ])}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dTableRows.map((r) => {
                    const high = dExt.highest.includes(r.disabilityType)
                    const low = dExt.lowest.includes(r.disabilityType)
                    return (
                      <tr key={r.disabilityType} className={high ? 'bg-emerald-50/70' : low ? 'bg-amber-50/70' : ''}>
                        <td className="px-3 py-2.5 text-slate-500">{r.order}</td>
                        <th scope="row" className="px-3 py-2.5 text-left font-medium text-slate-900">
                          {r.disabilityType}
                          {high && <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-800"><TrendingUp size={12} aria-hidden="true" />Highest</span>}
                          {low && <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-800"><TrendingDown size={12} aria-hidden="true" />Lowest</span>}
                        </th>
                        {visibleAgeGroups.flatMap((g) => [
                          sexFilter !== 'male' && <td key={`${g}-f`} className="px-2 py-2.5 text-right tabular-nums border-l border-slate-100">{n(r[DISABILITY_FIELDS[g].female])}</td>,
                          sexFilter !== 'female' && <td key={`${g}-m`} className="px-2 py-2.5 text-right tabular-nums">{n(r[DISABILITY_FIELDS[g].male])}</td>,
                        ])}
                        <td className="px-3 py-2.5 text-right tabular-nums font-semibold border-l border-slate-100">{n(r.total)}</td>
                      </tr>
                    )
                  })}
                  {dTableRows.length === 0 && (
                    <tr><td colSpan={3 + visibleAgeGroups.length * (sexFilter === 'both' ? 2 : 1)} className="px-4 py-8 text-center text-slate-500">No disability type matches “{dSearch}”.</td></tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200">
                  <tr>
                    <td className="px-3 py-3" colSpan={2}>TOTAL{dSearch.trim() ? ' (all types)' : ''}</td>
                    {visibleAgeGroups.flatMap((g) => [
                      sexFilter !== 'male' && <td key={`${g}-f`} className="px-2 py-3 text-right tabular-nums border-l border-slate-200">{n(filteredDisabilityRows.reduce((a, r) => a + r[DISABILITY_FIELDS[g].female], 0))}</td>,
                      sexFilter !== 'female' && <td key={`${g}-m`} className="px-2 py-3 text-right tabular-nums">{n(filteredDisabilityRows.reduce((a, r) => a + r[DISABILITY_FIELDS[g].male], 0))}</td>,
                    ])}
                    <td className="px-3 py-3 text-right tabular-nums border-l border-slate-200">{n(dTotals.grandTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="px-5 py-3 text-xs text-slate-500 border-t border-slate-100">
              Age group, sex and search are view filters only — they narrow the table and charts below but never change the saved data or the exported/printed files.
            </p>
          </Card>

          <DisabilityRecapCharts rows={filteredDisabilityRows} asOfDate={selected.asOfDate} />
          <DisabilityPrintView rows={selectedDisabilityRows} asOfDate={selected.asOfDate} />
        </>
      )}

      {editor && (
        <RecapEditor
          key={editor.key}
          initial={editor.input}
          reports={reports}
          busy={busy}
          serverError={serverError}
          duplicateOf={duplicateOf}
          onSave={handleSave}
          onRequestDelete={(id) => {
            const target = reports.find((r) => r.id === id)
            if (target) setConfirmDelete(target)
          }}
          onOpenExisting={(id, typed) => {
            setServerError(null)
            setDuplicateOf(null)
            setEditor({ key: Date.now(), input: { ...typed, id } })
          }}
          onClose={() => setEditor(null)}
        />
      )}

      <Modal open={confirmDelete !== null} onClose={() => setConfirmDelete(null)} title="Delete this report?" size="sm">
        {confirmDelete && (
          <div className="space-y-4">
            <p className="text-sm text-slate-700">
              This permanently deletes the recapitulation report as of <strong>{formatAsOf(confirmDelete.asOfDate)}</strong>
              {' '}({confirmDelete.status}) with all of its barangay and PRPWD rows. This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setConfirmDelete(null)} disabled={busy}>Cancel</Button>
              <Button variant="danger" icon={<Trash2 size={15} />} onClick={handleDelete} disabled={busy}>
                <span className="ml-1.5">{busy ? 'Deleting…' : 'Delete report'}</span>
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Success / error messages, announced to screen readers */}
      <div className="fixed bottom-4 right-4 z-[60] max-w-sm" aria-live="polite" role="status">
        {toast && (
          <div className={`flex items-start gap-2.5 rounded-xl px-4 py-3 shadow-lg text-sm font-medium ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
            {toast.type === 'success' ? <CheckCircle size={18} aria-hidden="true" /> : <XCircle size={18} aria-hidden="true" />}
            <span>{toast.message}</span>
          </div>
        )}
      </div>
    </div>
  )
}
