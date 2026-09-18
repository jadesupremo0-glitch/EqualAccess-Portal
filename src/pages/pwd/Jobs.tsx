import { useState, useMemo } from 'react'
import { Briefcase, MapPin, Clock, CheckCircle, Star, Info, AlertTriangle } from 'lucide-react'
import { Card, Button, SearchBar, Select, Modal } from '../../components/ui'
import { usePWDSession } from '../../context'
import { useStore } from '../../store'
import { getRecommendations } from '../../lib/recommend/score'
import { type JobRecommendation, type ScoreBreakdown } from '../../lib/recommend/types'

type Rec = JobRecommendation

// ── Presentation helpers ────────────────────────────────────────────

const BAND_STYLE: Record<Rec['band'], string> = {
  Excellent: 'bg-teal-50 text-teal-700 border-teal-200',
  Good: 'bg-blue-50 text-blue-700 border-blue-200',
  Fair: 'bg-amber-50 text-amber-700 border-amber-200',
  Weak: 'bg-rose-50 text-rose-700 border-rose-200',
}

const BAND_COLOR: Record<Rec['band'], string> = {
  Excellent: '#0d9488',
  Good: '#2563eb',
  Fair: '#d97706',
  Weak: '#e11d48',
}

const ACCESS_STYLE: Record<Rec['accessibility']['fit'], string> = {
  'Not assessed': 'bg-gray-100 text-gray-600 border-gray-200',
  Compatible: 'bg-green-50 text-green-700 border-green-200',
  'Compatible with accommodation': 'bg-sky-50 text-sky-700 border-sky-200',
  'Needs confirmation': 'bg-amber-50 text-amber-700 border-amber-200',
  'Not compatible': 'bg-rose-50 text-rose-700 border-rose-200',
}

function MatchRing({ percent, band }: { percent: number; band: Rec['band'] }) {
  const r = 22
  const c = 2 * Math.PI * r
  const dash = (percent / 100) * c
  return (
    <div className="relative w-14 h-14 shrink-0">
      <svg viewBox="0 0 50 50" className="w-14 h-14 -rotate-90">
        <circle cx="25" cy="25" r={r} fill="none" stroke="#e2e8f0" strokeWidth="4" />
        <circle
          cx="25" cy="25" r={r} fill="none" stroke={BAND_COLOR[band]} strokeWidth="4"
          strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs font-extrabold" style={{ color: BAND_COLOR[band] }}>{percent}%</span>
      </div>
    </div>
  )
}

function FitBadge({ band }: { band: Rec['band'] }) {
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${BAND_STYLE[band]}`}>
      {band}
    </span>
  )
}

function AccessBadge({ fit }: { fit: Rec['accessibility']['fit'] }) {
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ACCESS_STYLE[fit]}`}>
      {fit === 'Needs confirmation' ? 'Confirm accessibility' : fit === 'Not assessed' ? 'Accessibility not assessed' : fit}
    </span>
  )
}

function matchReasonChips(rec: Rec): { label: string; tone: 'teal' | 'amber' | 'blue' }[] {
  const chips: { label: string; tone: 'teal' | 'amber' | 'blue' }[] = []
  const matched = rec.skills.matched
  if (matched.length > 0) {
    chips.push({ label: `Skills: ${matched.slice(0, 4).join(', ')}${matched.length > 4 ? ' +' : ''}`, tone: 'teal' })
  }
  if (rec.family.matchLevel === 'exact') {
    chips.push({ label: 'Matches your preferred job', tone: 'blue' })
  } else if (rec.family.matchLevel === 'family') {
    chips.push({ label: `In your field: ${rec.family.jobFamily ?? 'similar roles'}`, tone: 'blue' })
  }
  if (rec.qualification.status === 'Met') {
    chips.push({ label: 'Education requirement met', tone: 'blue' })
  } else if (rec.qualification.status === 'Partly met') {
    chips.push({ label: 'Education partly met', tone: 'amber' })
  }
  if (rec.skills.missing.length > 0) {
    chips.push({ label: `Missing: ${rec.skills.missing.slice(0, 2).join(', ')}`, tone: 'amber' })
  }
  return chips
}

function BreakdownBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.round((value / max) * 100)
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600 font-medium">{label}</span>
        <span className="text-gray-400">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full bg-teal-500" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  )
}

function ScoreBreakdownPanel({ components, adjustment }: { components: ScoreBreakdown; adjustment: number }) {
  const base = components.skills + components.capabilities + components.family + components.qualifications + components.experience
  return (
    <div className="space-y-2.5">
      <BreakdownBar label="Skills fit (40%)" value={components.skills} max={40} />
      <BreakdownBar label="Capabilities vs. duties (25%)" value={components.capabilities} max={25} />
      <BreakdownBar label="Job-family alignment (15%)" value={components.family} max={15} />
      <BreakdownBar label="Qualifications (10%)" value={components.qualifications} max={10} />
      <BreakdownBar label="Experience (10%)" value={components.experience} max={10} />
      <div className="flex justify-between text-xs pt-1 border-t border-gray-100">
        <span className="text-gray-600 font-medium">Base score</span>
        <span className="text-gray-400">{Math.round(base * 10) / 10}</span>
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-gray-600 font-medium">Accessibility fit adjustment</span>
        <span className={adjustment >= 0 ? 'text-green-600 font-semibold' : 'text-amber-600 font-semibold'}>
          {adjustment === 0 ? '0' : `${adjustment > 0 ? '+' : ''}${adjustment}`}
        </span>
      </div>
    </div>
  )
}

function JobCard({ rec, onView }: { rec: Rec; onView: () => void }) {
  const job = rec.job
  const typeColor: Record<string, string> = {
    'Full-time': 'bg-blue-50 text-blue-700',
    'Part-time': 'bg-purple-50 text-purple-700',
    'Contract': 'bg-amber-50 text-amber-700',
    'Remote': 'bg-green-50 text-green-700',
  }
  const chips = matchReasonChips(rec)

  return (
    <Card className="p-5 flex flex-col hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3 mb-4">
        <MatchRing percent={Math.round(rec.score)} band={rec.band} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColor[job.type] ?? 'bg-gray-100 text-gray-600'}`}>
              {job.type}
            </span>
            <FitBadge band={rec.band} />
          </div>
          <h3 className="font-semibold text-gray-900 text-sm leading-snug">{job.title}</h3>
          <p className="text-sm text-teal-700 font-medium">{job.company}</p>
        </div>
      </div>

      <div className="space-y-1.5 mb-4 flex-1">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <MapPin size={11} className="shrink-0 text-gray-400" />{job.location}
        </div>
        <div className="flex items-start gap-1.5 text-xs text-teal-700">
          <CheckCircle size={11} className="shrink-0 mt-0.5 text-teal-500" />
          <span className="line-clamp-2">{job.accessibilityInfo}</span>
        </div>
        {rec.accessibility.needsAssessed && <AccessBadge fit={rec.accessibility.fit} />}
        {rec.duplicateJobIds.length > 0 && (
          <p className="text-[10px] text-gray-400">Also listed as: {rec.duplicateJobIds.join(', ')}</p>
        )}
      </div>

      {chips.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Why Recommended</p>
          <div className="flex flex-wrap gap-1.5">
            {chips.map((c, i) => (
              <span
                key={i}
                className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${
                  c.tone === 'teal'
                    ? 'bg-teal-50 text-teal-700 border-teal-100'
                    : c.tone === 'blue'
                      ? 'bg-blue-50 text-blue-700 border-blue-100'
                      : 'bg-amber-50 text-amber-700 border-amber-100'
                }`}
              >
                {c.label}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 mb-4">
        {rec.skills.matched.concat(rec.skills.missing).slice(0, 5).map((s) => (
          <span key={s} className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s}</span>
        ))}
      </div>

      <Button size="sm" variant="outline" onClick={onView} fullWidth>
        View Details
      </Button>
    </Card>
  )
}

function JobDetail({ rec, onClose }: { rec: Rec; onClose: () => void }) {
  const job = rec.job
  return (
    <Modal open title={job.title} onClose={onClose} size="lg">
      <div className="space-y-5">
        {/* Match banner */}
        <div className="flex items-center gap-4 p-4 bg-teal-50 rounded-xl border border-teal-100">
          <MatchRing percent={Math.round(rec.score)} band={rec.band} />
          <div className="flex-1">
            <p className="font-bold text-teal-800 text-sm">{Math.round(rec.score)}% Match — {rec.band} Fit</p>
            <p className="text-teal-600 text-xs mt-0.5">
              Hybrid scoring: skills 40% · capabilities 25% · job-family 15% · education 10% · experience 10%, plus an accessibility-fit check.
            </p>
          </div>
          {rec.duplicateJobIds.length > 0 && (
            <p className="text-[10px] text-teal-600 shrink-0">Also listed as {rec.duplicateJobIds.join(', ')}</p>
          )}
        </div>

        <div>
          <p className="text-base font-bold text-teal-700">{job.company}</p>
          <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
            <span className="flex items-center gap-1"><MapPin size={13} />{job.location}</span>
            <span className="flex items-center gap-1"><Briefcase size={13} />{job.type}</span>
            <span className="flex items-center gap-1"><Clock size={13} />Deadline: {job.deadline}</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <p className="text-xs uppercase tracking-wide font-bold text-gray-400 mb-2">How the score is built</p>
            <ScoreBreakdownPanel components={rec.components} adjustment={rec.accessibility.adjustment} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide font-bold text-gray-400 mb-2">Requirement check</p>
            <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-3">
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase">Qualifications</p>
                <p className="text-gray-700 mt-0.5">{rec.qualification.status} — {rec.qualification.note}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase">Accessibility fit</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <AccessBadge fit={rec.accessibility.fit} />
                </div>
                {rec.accessibility.needsAssessed && rec.accessibility.note && (
                  <p className="text-gray-700 mt-1 text-xs leading-relaxed">{rec.accessibility.note}</p>
                )}
              </div>
              {rec.accessibility.questionsToConfirm.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-gray-500 uppercase">Questions to confirm with the employer</p>
                  <ul className="mt-1 space-y-1">
                    {rec.accessibility.questionsToConfirm.map((q, i) => (
                      <li key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
                        <span className="text-amber-500 mt-0.5">•</span>{q}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {rec.skills.missing.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wide font-bold text-gray-400 mb-2">Skills you still need for this role</p>
            <div className="flex flex-wrap gap-2">
              {rec.skills.missing.map((s) => (
                <span key={s} className="bg-amber-50 text-amber-800 text-sm px-3 py-1 rounded-full border border-amber-200">{s}</span>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-xs uppercase tracking-wide font-bold text-gray-400 mb-2">Job Description</p>
          <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-4 leading-relaxed">{job.description}</p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide font-bold text-gray-400 mb-2">Required Skills</p>
          <div className="flex flex-wrap gap-2">
            {job.skills.map((s) => (
              <span key={s} className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full">{s}</span>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide font-bold text-gray-400 mb-2">Accessibility & PWD Support</p>
          <div className="flex gap-2 bg-green-50 rounded-xl p-4 border border-green-100">
            <CheckCircle size={17} className="text-green-600 shrink-0 mt-0.5" />
            <p className="text-sm text-green-800">{job.accessibilityInfo}</p>
          </div>
        </div>

        {/* IMPORTANT: No apply button — recommendation only */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
          <Info size={17} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">For Information & Reference Only</p>
            <p className="text-xs text-amber-700 mt-0.5">
              This is a job recommendation based on your profile. To pursue this opportunity, please coordinate directly with the employer or your local PDAO office.
            </p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button size="lg" variant="outline" onClick={onClose} fullWidth>Close</Button>
        </div>
      </div>
    </Modal>
  )
}

export default function Jobs() {
  const session = usePWDSession()
  const { pwdUsers, jobs } = useStore()
  const currentUser = session ? (pwdUsers.find((u) => u.id === session.userId) ?? pwdUsers[0]) : pwdUsers[0]
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [selected, setSelected] = useState<Rec | null>(null)

  const result = useMemo(() => getRecommendations(currentUser, jobs), [currentUser, jobs])
  const recommended = result.recommendations

  const jobTypes = ['Full-time', 'Part-time', 'Contract', 'Remote'].map((t) => ({ value: t, label: t }))

  // Apply UI filters
  let filtered = recommended.filter((rec) => {
    const j = rec.job
    const q = search.toLowerCase()
    return (!search || j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q) || j.location.toLowerCase().includes(q))
      && (!typeFilter || j.type === typeFilter)
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Job Recommendations</h1>
        <p className="text-gray-500 text-sm mt-0.5">Personalized job suggestions matched to your skills, goals, and accessibility needs — for reference only</p>
      </div>

      {/* ML info banner */}
      <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 flex gap-3">
        <Star size={18} className="text-teal-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-teal-800">Personalized Matching Engine</p>
          <p className="text-xs text-teal-600 mt-0.5">
            Jobs are scored with a weighted, synonym-aware model (skills 40% · capabilities 25% · job family 15% · education 10% · experience 10%) plus an accessibility-fit check.
            {filtered.length > 0 && ` Found ${filtered.length} recommendation${filtered.length !== 1 ? 's' : ''}.`}
            {result.excludedCount > 0 && ` ${result.excludedCount} posting${result.excludedCount !== 1 ? 's' : ''} excluded because they directly conflict with your stated accessibility needs.`}
          </p>
        </div>
      </div>

      {/* Weak-match banner */}
      {result.weakMatch && recommended.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex gap-3">
          <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-800">No strong matches found right now</p>
            <p className="text-xs text-rose-700 mt-0.5">
              The closest opportunities all score below 50%. Consider upskilling in:
              {' '}{result.suggestedImprovements.slice(0, 5).join(', ') || 'a listed skill'} — or check back when new postings arrive.
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex-1 min-w-52">
          <SearchBar value={search} onChange={setSearch} placeholder="Search jobs, companies, locations..." />
        </div>
        <div className="min-w-36">
          <Select label="" options={jobTypes} value={typeFilter} onChange={setTypeFilter} placeholder="All Types" />
        </div>
      </div>

      <p className="text-sm text-gray-500">{filtered.length} recommendation{filtered.length !== 1 ? 's' : ''} found</p>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Briefcase size={48} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No job recommendations found</p>
          <p className="text-sm text-gray-400">Try updating your profile skills or adjusting filters</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((rec) => <JobCard key={rec.job.id} rec={rec} onView={() => setSelected(rec)} />)}
        </div>
      )}

      {selected && <JobDetail rec={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}