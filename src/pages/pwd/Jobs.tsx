import { useMemo, useState } from 'react'
import {
  Briefcase, Clock, CheckCircle, Bookmark, BookmarkCheck, AlertTriangle, Info, Pencil,
} from 'lucide-react'
import { Card, Button, SearchBar, Select, Modal, Tabs, EmptyState } from '../../components/ui'
import { usePWDSession } from '../../context'
import { useStore } from '../../store'
import { EMPLOYMENT_TYPES, WORK_ARRANGEMENTS } from '../../lib/catalog'
import { DEFAULT_WEIGHTS, MIN_MATCH_SCORE, MIN_SKILL_COVERAGE, getRecommendations, isOpenAndCurrent, scoreJob } from '../../lib/recommend/score'
import { profileGaps } from '../../lib/recommend/profile'
import type { ComponentKey, MatchBand, Recommendation } from '../../lib/recommend/types'
import type { Job } from '../../data'
import RecommendationSetup from './RecommendationSetup'

// ── Presentation helpers ────────────────────────────────────────────

const BAND_STYLE: Record<MatchBand, string> = {
  Excellent: 'bg-teal-50 text-teal-800 border-teal-200',
  Good: 'bg-blue-50 text-blue-800 border-blue-200',
  Fair: 'bg-amber-50 text-amber-800 border-amber-200',
}

const BAND_COLOR: Record<MatchBand, string> = {
  Excellent: '#0f766e',
  Good: '#1d4ed8',
  Fair: '#b45309',
}

const COMPONENT_LABEL: Record<ComponentKey, string> = {
  skills: 'Skills match',
  suitability: 'Suitability & accommodations',
  education: 'Education fit',
  semantic: 'Overall fit (AI-matched)',
}

const formatDate = (iso: string) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : 'No end date'

const LOCATION_FILTERS = [
  { value: 'mine', label: 'My barangay' },
  { value: 'losbanos', label: 'Anywhere in Los Baños' },
  { value: 'outside', label: 'Outside Los Baños' },
  { value: 'remote', label: 'Work from home' },
]

function matchesLocation(rec: Recommendation | null, filter: string): boolean {
  if (!filter) return true
  if (!rec) return false
  const level = rec.location.level
  if (filter === 'mine') return level === 'barangay'
  if (filter === 'losbanos') return level === 'barangay' || level === 'municipality'
  if (filter === 'outside') return level === 'province' || level === 'far'
  return level === 'remote'
}

function MatchRing({ percent, band }: { percent: number; band: MatchBand }) {
  const r = 22
  const c = 2 * Math.PI * r
  return (
    <div className="relative w-14 h-14 shrink-0" role="img" aria-label={`${percent} percent match, ${band} fit`}>
      <svg viewBox="0 0 50 50" className="w-14 h-14 -rotate-90" aria-hidden="true">
        <circle cx="25" cy="25" r={r} fill="none" stroke="#e2e8f0" strokeWidth="4" />
        <circle cx="25" cy="25" r={r} fill="none" stroke={BAND_COLOR[band]} strokeWidth="4" strokeDasharray={`${(percent / 100) * c} ${c}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
        <span className="text-xs font-extrabold" style={{ color: BAND_COLOR[band] }}>{percent}%</span>
      </div>
    </div>
  )
}

function ReasonChips({ rec, limit }: { rec: Recommendation; limit?: number }) {
  const reasons = limit ? rec.reasons.slice(0, limit) : rec.reasons
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Why this match">
      {reasons.map((r) => (
        <li
          key={r.label}
          className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${
            r.tone === 'positive' ? 'bg-teal-50 text-teal-800 border-teal-200' : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}
        >
          {r.tone === 'caution' && <span className="sr-only">Check: </span>}
          {r.label}
        </li>
      ))}
    </ul>
  )
}

// ── Cards ───────────────────────────────────────────────────────────

function JobCard({ job, rec, saved, onView, onToggleSave }: {
  job: Job
  rec: Recommendation | null
  saved: boolean
  onView: () => void
  onToggleSave: () => void
}) {
  const open = isOpenAndCurrent(job)
  return (
    <Card className="p-5 flex flex-col hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3 mb-3">
        {rec ? (
          <MatchRing percent={rec.score} band={rec.band} />
        ) : (
          <div className="w-14 h-14 shrink-0 rounded-full bg-slate-100 flex items-center justify-center" aria-hidden="true">
            <Briefcase size={20} className="text-slate-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm leading-snug">{job.title}</h3>
          <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{job.description}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {rec && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${BAND_STYLE[rec.band]}`}>{rec.band} match</span>}
            {!open && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-slate-100 text-slate-700 border-slate-200">No longer open</span>}
          </div>
        </div>
        <button
          onClick={onToggleSave}
          aria-pressed={saved}
          aria-label={saved ? `Remove ${job.title} from saved jobs` : `Save ${job.title}`}
          className={`p-2 rounded-lg transition-colors ${saved ? 'text-ea-teal-700 bg-ea-teal-50' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          {saved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
        </button>
      </div>

      <ul className="space-y-1 mb-3 text-xs text-gray-600">
        <li className="flex items-center gap-1.5"><Briefcase size={12} className="shrink-0 text-gray-600" aria-hidden="true" />{job.employmentType} · {job.workArrangement}</li>
        <li className="flex items-center gap-1.5"><Clock size={12} className="shrink-0 text-gray-600" aria-hidden="true" />Open until {formatDate(job.deadline)}</li>
      </ul>

      {rec && rec.reasons.length > 0 && (
        <div className="mb-4 flex-1">
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wide mb-1.5">Why this match</p>
          <ReasonChips rec={rec} limit={5} />
        </div>
      )}
      {!rec && <div className="flex-1" />}

      <Button size="sm" variant="outline" onClick={onView} fullWidth>View Details</Button>
    </Card>
  )
}

function JobDetail({ job, rec, saved, onClose, onToggleSave }: {
  job: Job
  rec: Recommendation | null
  saved: boolean
  onClose: () => void
  onToggleSave: () => void
}) {
  const open = isOpenAndCurrent(job)
  return (
    <Modal open title={job.title} onClose={onClose} size="lg">
      <div className="space-y-5">
        {rec && (
          <div className="flex items-center gap-4 p-4 bg-teal-50 rounded-xl border border-teal-100">
            <MatchRing percent={rec.score} band={rec.band} />
            <div className="flex-1">
              <p className="font-bold text-teal-900 text-sm">{rec.score}% match — {rec.band} fit</p>
              <p className="text-teal-800 text-xs mt-0.5">Your skills, accommodations and education compared with this listing.</p>
            </div>
          </div>
        )}

        <div>
          <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-gray-700">
            <li className="flex items-center gap-1.5"><Briefcase size={14} aria-hidden="true" />{job.employmentType} · {job.workArrangement}</li>
          </ul>
        </div>

        {rec && (
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <h3 className="text-xs uppercase tracking-wide font-bold text-gray-600 mb-2">Why this match</h3>
              <ReasonChips rec={rec} />
            </div>
            <div>
              <h3 className="text-xs uppercase tracking-wide font-bold text-gray-600 mb-2">How the score is built</h3>
              <ul className="space-y-2">
                {(Object.keys(COMPONENT_LABEL) as ComponentKey[]).map((k) => {
                  const max = DEFAULT_WEIGHTS[k]
                  const pts = Math.round(rec.components[k] * 10) / 10
                  return (
                    <li key={k}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-700 font-medium">{COMPONENT_LABEL[k]}</span>
                        <span className="text-gray-600">{pts} / {max}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden" role="presentation">
                        <div className="h-full rounded-full bg-teal-600" style={{ width: `${Math.min(100, (pts / max) * 100)}%` }} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        )}

        <div>
          <h3 className="text-xs uppercase tracking-wide font-bold text-gray-600 mb-2">Job description</h3>
          <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-4 leading-relaxed">{job.description}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <h3 className="text-xs uppercase tracking-wide font-bold text-gray-600 mb-2">Required skills</h3>
            {job.skills.length === 0 ? (
              <p className="text-sm text-gray-600">No specific skills listed.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {job.skills.map((s) => {
                  const have = rec?.skills.matched.includes(s)
                  const close = rec?.skills.related.includes(s)
                  return (
                    <li key={s} className={`text-sm px-3 py-1 rounded-full border ${have ? 'bg-teal-50 text-teal-800 border-teal-200' : close ? 'bg-sky-50 text-sky-800 border-sky-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                      {have && <CheckCircle size={12} className="inline mr-1 -mt-0.5" aria-hidden="true" />}
                      {s}
                      {have && <span className="sr-only"> (you have this skill)</span>}
                      {close && <span className="text-xs"> · related to your skills</span>}
                    </li>
                  )
                })}
              </ul>
            )}
            <p className="text-xs text-gray-600 mt-3">
              <span className="font-semibold">Minimum education:</span> {job.minEducation || 'None required'}
            </p>
          </div>
          <div>
            <h3 className="text-xs uppercase tracking-wide font-bold text-gray-600 mb-2">Accommodations offered</h3>
            {job.accommodations.length === 0 ? (
              <p className="text-sm text-gray-600">The employer has not listed any. Worth asking about if you need one.</p>
            ) : (
              <ul className="space-y-1">
                {job.accommodations.map((a) => (
                  <li key={a} className="flex items-start gap-2 text-sm text-gray-800">
                    <CheckCircle size={15} className="text-green-700 shrink-0 mt-0.5" aria-hidden="true" />{a}
                  </li>
                ))}
              </ul>
            )}
            {job.accessibilityInfo && <p className="text-xs text-gray-600 mt-3 leading-relaxed">{job.accessibilityInfo}</p>}
          </div>
        </div>

        {rec && rec.accommodation.unmet.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
            <AlertTriangle size={17} className="text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm text-amber-900">
              Not listed by the employer: <strong>{rec.accommodation.unmet.join(', ')}</strong>. PDAO can help you ask about these.
            </p>
          </div>
        )}

        <div className="border-t border-gray-100 pt-4 space-y-3">
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 flex gap-3">
            <Info size={17} className="text-sky-700 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-xs text-sky-900 leading-relaxed">
              This is a recommendation only. Applications are not taken on this portal{open ? '' : ', and this listing is no longer open'}.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button size="lg" variant="outline" onClick={onToggleSave} aria-pressed={saved} icon={saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}>
              <span className="ml-1.5">{saved ? 'Saved' : 'Save'}</span>
            </Button>
            <Button size="lg" variant="ghost" onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ── Page ────────────────────────────────────────────────────────────

export default function Jobs({ onNavigate }: { onNavigate: (p: string) => void }) {
  const session = usePWDSession()
  const { pwdUsers, jobs, toggleSavedJob } = useStore()
  const user = (session ? pwdUsers.find((u) => u.id === session.userId) : undefined) ?? pwdUsers[0]

  const [tab, setTab] = useState<'Recommended' | 'Saved'>('Recommended')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [arrangementFilter, setArrangementFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingSetup, setEditingSetup] = useState(false)

  // Recomputed whenever the profile or the listings change.
  const result = useMemo(() => getRecommendations(user, jobs), [user, jobs])
  const gaps = useMemo(() => profileGaps(user), [user])
  const saved = user.savedJobIds ?? []

  const header = (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Job Recommendations</h1>
      <p className="text-gray-600 text-sm mt-0.5">
        Jobs matched to your skills, accommodations and education. These are suggestions only — you can&apos;t apply here. Your disability type is never used to hide a job.
      </p>
    </div>
  )

  // Nothing is listed until the PWD has entered their skills and education.
  if (result.locked) {
    return (
      <div className="space-y-5">
        {header}
        <RecommendationSetup user={user} />
      </div>
    )
  }

  const recFor = (job: Job): Recommendation | null =>
    result.recommendations.find((r) => r.job.id === job.id) ?? scoreJob(user, job)

  const passesFilters = (job: Job, rec: Recommendation | null) => {
    const q = search.trim().toLowerCase()
    return (
      (!q || job.title.toLowerCase().includes(q) || job.company.toLowerCase().includes(q) || job.location.toLowerCase().includes(q)) &&
      (!typeFilter || job.employmentType === typeFilter) &&
      (!arrangementFilter || job.workArrangement === arrangementFilter) &&
      matchesLocation(rec, locationFilter)
    )
  }

  const recommended = result.recommendations.filter((r) => passesFilters(r.job, r))
  const savedJobs = saved
    .map((id) => jobs.find((j) => j.id === id))
    .filter((j): j is Job => Boolean(j))
    .map((job) => ({ job, rec: recFor(job) }))
    .filter(({ job, rec }) => passesFilters(job, rec))

  const filtersActive = Boolean(search || typeFilter || arrangementFilter || locationFilter)
  const clearFilters = () => { setSearch(''); setTypeFilter(''); setArrangementFilter(''); setLocationFilter('') }

  const selectedJob = selectedId ? jobs.find((j) => j.id === selectedId) : undefined
  const tabLabels = [`Recommended (${result.recommendations.length})`, `Saved (${saved.length})`]
  const activeLabel = tabLabels[['Recommended', 'Saved'].indexOf(tab)]

  const renderCard = (job: Job, rec: Recommendation | null) => (
    <JobCard
      key={job.id}
      job={job}
      rec={rec}
      saved={saved.includes(job.id)}
      onView={() => setSelectedId(job.id)}
      onToggleSave={() => toggleSavedJob(user.id, job.id)}
    />
  )

  return (
    <div className="space-y-5">
      {header}

      {editingSetup ? (
        <RecommendationSetup user={user} editing onCancel={() => setEditingSetup(false)} onSaved={() => setEditingSetup(false)} />
      ) : (
        <div className="card-glass rounded-2xl p-4 flex flex-wrap items-center gap-4" role="region" aria-label="Your skills and education">
          <div className="flex-1 min-w-56 space-y-1">
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Matched using</p>
            <p className="text-sm text-gray-900"><span className="font-semibold">Skills:</span> {(user.skills ?? []).join(', ')}</p>
            <p className="text-sm text-gray-900">
              <span className="font-semibold">Education:</span> {user.educationLevel || 'Set from your course'}{user.education ? ` — ${user.education}` : ''}
            </p>
          </div>
          <Button size="sm" variant="outline" icon={<Pencil size={13} />} onClick={() => setEditingSetup(true)}>
            <span className="ml-1.5">Update skills &amp; education</span>
          </Button>
        </div>
      )}

      {gaps.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-wrap items-center gap-4" role="region" aria-label="Improve your matches">
          <AlertTriangle size={20} className="text-amber-700 shrink-0" aria-hidden="true" />
          <div className="flex-1 min-w-56">
            <p className="text-sm font-semibold text-amber-900">Add more to your profile for sharper matches</p>
            <p className="text-xs text-amber-900 mt-0.5">Optional: {gaps.map((g) => g.label.toLowerCase()).join(', ')}.</p>
          </div>
          <Button size="sm" onClick={() => onNavigate('pwd-profile')}>Open my profile</Button>
        </div>
      )}

      <details className="card-glass rounded-2xl px-5 py-3 text-sm">
        <summary className="cursor-pointer font-semibold text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-ea-teal-500 rounded">How is my match score calculated?</summary>
        <div className="mt-3 text-gray-700 space-y-2">
          <p>Every open listing is scored from 0 to 100. Only matches of {MIN_MATCH_SCORE}% or more are shown, and you must have at least {Math.round(MIN_SKILL_COVERAGE * 100)}% of the skills a job asks for (a closely related skill counts as part of one).</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Skills match ({DEFAULT_WEIGHTS.skills}):</strong> how many of the required skills you have. Different wordings count as the same skill (for example &quot;MS Excel&quot; and &quot;Microsoft Office&quot;), and a closely related skill earns partial credit.</li>
            <li><strong>Suitability &amp; accommodations ({DEFAULT_WEIGHTS.suitability}):</strong> whether the employer offers the accommodations you asked for, with a boost when they list your disability type as suitable.</li>
            <li><strong>Education fit ({DEFAULT_WEIGHTS.education}):</strong> your highest level against the minimum.</li>
            <li><strong>Overall fit ({DEFAULT_WEIGHTS.semantic}):</strong> how closely your skills, education and work experience match this listing's description, computed automatically from the wording of both.</li>
          </ul>
          <p>A job is left out only if the employer has restricted it to specific disability types that don&apos;t include yours.</p>
        </div>
      </details>

      <Tabs tabs={tabLabels} active={activeLabel} onChange={(l) => setTab((['Recommended', 'Saved'] as const)[tabLabels.indexOf(l)])} />

      <div className="flex gap-3 flex-wrap items-end" role="group" aria-label="Filter jobs">
        <div className="flex-1 min-w-52"><SearchBar value={search} onChange={setSearch} placeholder="Search jobs, employers, locations..." /></div>
        <div className="min-w-36"><Select label="" ariaLabel="Filter by employment type" options={EMPLOYMENT_TYPES.map((t) => ({ value: t, label: t }))} value={typeFilter} onChange={setTypeFilter} placeholder="All Types" /></div>
        <div className="min-w-36"><Select label="" ariaLabel="Filter by work arrangement" options={WORK_ARRANGEMENTS.map((t) => ({ value: t, label: t }))} value={arrangementFilter} onChange={setArrangementFilter} placeholder="All Arrangements" /></div>
        <div className="min-w-44"><Select label="" ariaLabel="Filter by location" options={LOCATION_FILTERS} value={locationFilter} onChange={setLocationFilter} placeholder="Any Location" /></div>
        {filtersActive && <Button variant="ghost" size="sm" onClick={clearFilters}>Clear</Button>}
      </div>

      {tab === 'Recommended' && (
        <>
          <p className="text-sm text-gray-600" role="status">
            {recommended.length} job{recommended.length !== 1 ? 's' : ''} found
            {result.hidden > 0 && ` · ${result.hidden} weaker match${result.hidden === 1 ? '' : 'es'} hidden`}
          </p>
          {recommended.length === 0 ? (
            <Card>
              {filtersActive && result.recommendations.length > 0 ? (
                <EmptyState icon={<Briefcase size={26} />} title="No jobs match these filters" message="Try removing a filter to see more of your recommendations." action={<Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button>} />
              ) : (
                <EmptyState
                  icon={<Briefcase size={26} />}
                  title={result.considered === 0 ? 'No open jobs right now' : 'No strong matches yet'}
                  message={result.considered === 0 ? 'There are no open listings at the moment. New jobs appear here as soon as they are posted.' : `${result.considered} listing${result.considered === 1 ? ' is' : 's are'} open, but none match your skills closely enough yet. Adding more skills usually helps.`}
                  action={<Button size="sm" onClick={() => setEditingSetup(true)}>Update skills &amp; education</Button>}
                />
              )}
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{recommended.map((r) => renderCard(r.job, r))}</div>
          )}
        </>
      )}

      {tab === 'Saved' && (
        <>
          <p className="text-sm text-gray-600" role="status">{savedJobs.length} saved job{savedJobs.length !== 1 ? 's' : ''}</p>
          {savedJobs.length === 0 ? (
            <Card>
              <EmptyState icon={<Bookmark size={26} />} title={saved.length === 0 ? 'Nothing saved yet' : 'No saved jobs match these filters'} message={saved.length === 0 ? 'Use the bookmark on any job to keep it here for later.' : 'Try removing a filter.'} />
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{savedJobs.map(({ job, rec }) => renderCard(job, rec))}</div>
          )}
        </>
      )}

      {selectedJob && (
        <JobDetail
          job={selectedJob}
          rec={recFor(selectedJob)}
          saved={saved.includes(selectedJob.id)}
          onClose={() => setSelectedId(null)}
          onToggleSave={() => toggleSavedJob(user.id, selectedJob.id)}
        />
      )}
    </div>
  )
}
