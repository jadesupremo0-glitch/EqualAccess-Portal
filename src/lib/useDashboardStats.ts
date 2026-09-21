import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store'
import { isSupabaseConfigured } from './supabase'
import { fetchDashboardStats } from './db'
import { computeStats, shapeStats, statsViolations, type DashboardStats } from './stats'

const POLL_MS = 30_000

export interface LiveStats {
  /** loading = first database read in flight; error = the database aggregate failed (fallback numbers are shown). */
  status: 'loading' | 'ready' | 'error'
  stats: DashboardStats
  /** database = computed by the server-side dashboard_stats(); session = computed from the data loaded in this browser. */
  source: 'database' | 'session'
  error: string | null
  updatedAt: Date | null
  refetch: () => void
}

/**
 * Live dashboard numbers. With a database configured, every metric comes from the
 * `dashboard_stats()` Postgres function; it is re-run
 *   - whenever a change made here has been written (store.dataVersion),
 *   - whenever a background refresh brings in someone else's change,
 *   - every 30 s, and when the tab regains focus.
 * Without a database (or if the aggregate fails) the same metrics are computed from the
 * in-memory data, so the page never shows made-up numbers and never goes blank.
 */
export function useDashboardStats(): LiveStats {
  const { pwdUsers, assistanceRequests, dataVersion } = useStore()
  const useServer = isSupabaseConfigured()

  const [remote, setRemote] = useState<{ stats: DashboardStats; at: Date } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(useServer)
  const inFlight = useRef(false)
  const again = useRef(false)

  const load = useCallback(async () => {
    if (!useServer) return
    if (inFlight.current) {
      again.current = true // a change landed mid-request: run once more afterwards
      return
    }
    inFlight.current = true
    try {
      const raw = await fetchDashboardStats()
      setRemote({ stats: shapeStats(raw), at: new Date() })
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reach the database.')
    } finally {
      inFlight.current = false
      setLoading(false)
      if (again.current) {
        again.current = false
        void load()
      }
    }
  }, [useServer])

  useEffect(() => {
    void load()
  }, [load, dataVersion])

  useEffect(() => {
    if (!useServer) return
    const tick = () => void load()
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick()
    }
    const id = window.setInterval(tick, POLL_MS)
    window.addEventListener('focus', tick)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('focus', tick)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [useServer, load])

  const local = useMemo(() => computeStats(pwdUsers, assistanceRequests), [pwdUsers, assistanceRequests])

  const stats = remote?.stats ?? local
  const source: LiveStats['source'] = useServer && remote ? 'database' : 'session'
  const status: LiveStats['status'] = loading && !remote ? 'loading' : error && !remote ? 'error' : 'ready'

  // Dev assertion: the numbers on screen must always reconcile.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const problems = statsViolations(stats)
    if (problems.length > 0) console.error('[dashboard] statistics do not reconcile:', problems)
  }, [stats])

  return { status, stats, source, error, updatedAt: remote?.at ?? null, refetch: () => void load() }
}
