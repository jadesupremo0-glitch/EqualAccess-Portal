import type { ReactNode } from 'react'
import { BarChart3, RefreshCw, AlertTriangle } from 'lucide-react'
import { Card } from './ui'
import type { LiveStats } from '../lib/useDashboardStats'

/**
 * A titled card around a chart, with a text alternative: the chart is announced as a single
 * image with a summary, and the same numbers are available as a table for screen readers.
 */
export function ChartCard({
  title,
  summary,
  empty,
  emptyMessage = 'No data yet',
  columns,
  rows,
  className = '',
  footer,
  children,
}: {
  title: string
  summary: string
  empty: boolean
  emptyMessage?: string
  columns: [string, string]
  rows: (string | number)[][]
  className?: string
  footer?: ReactNode
  children: ReactNode
}) {
  return (
    <Card className={`p-5 ${className}`}>
      <h3 className="font-display font-bold text-gray-900 mb-4">{title}</h3>
      {empty ? (
        <div className="h-[200px] flex flex-col items-center justify-center text-center text-slate-500" role="status">
          <BarChart3 size={28} className="text-slate-300 mb-2" aria-hidden="true" />
          <p className="text-sm font-semibold text-slate-600">{emptyMessage}</p>
          <p className="text-xs mt-0.5">This chart fills in as records are added.</p>
        </div>
      ) : (
        <div role="img" aria-label={summary}>
          {children}
        </div>
      )}
      {footer && <p className="text-xs text-slate-500 mt-3">{footer}</p>}
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">{columns[0]}</th>
            <th scope="col">{columns[1]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={String(r[0])}>
              <th scope="row">{r[0]}</th>
              <td>{r[1]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

/** Placeholder shown while the first database read is in flight. */
export function DashboardSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="space-y-6" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading dashboard statistics…</span>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: cards }, (_, i) => (
          <div key={i} className="card-glass rounded-2xl p-5 animate-pulse">
            <div className="h-3 w-24 bg-slate-200 rounded mb-3" />
            <div className="h-7 w-16 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 card-glass rounded-2xl p-5 animate-pulse h-[280px]" />
        <div className="lg:col-span-2 card-glass rounded-2xl p-5 animate-pulse h-[280px]" />
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card-glass rounded-2xl p-5 animate-pulse h-[280px]" />
        <div className="card-glass rounded-2xl p-5 animate-pulse h-[280px]" />
      </div>
    </div>
  )
}

/** Data-source / freshness line with a manual refresh; shows the error state when the aggregate failed. */
export function LiveStatusBar({ live }: { live: LiveStats }) {
  const time = live.updatedAt?.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  return (
    <div className="space-y-2">
      {live.status === 'error' && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle size={17} className="shrink-0 text-amber-600" aria-hidden="true" />
          <p className="flex-1 min-w-48">
            Live statistics from the database are unavailable right now, so these numbers come from the data loaded in this session.
            {live.error ? <span className="block text-xs text-amber-700 mt-0.5">{live.error}</span> : null}
          </p>
          <button
            onClick={live.refetch}
            className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            Try again
          </button>
        </div>
      )}
      <div className="flex items-center justify-end gap-2 text-xs text-slate-500">
        <span aria-live="off">
          {live.source === 'database' ? `Live from the database${time ? ` · updated ${time}` : ''}` : 'Based on data loaded in this session'}
        </span>
        <button
          onClick={live.refetch}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-ea-teal-700 hover:bg-white/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-ea-teal-500"
          aria-label="Refresh statistics"
        >
          <RefreshCw size={12} aria-hidden="true" /> Refresh
        </button>
      </div>
    </div>
  )
}
