import { useState } from 'react'
import { Briefcase, MapPin, Clock, CheckCircle, Star } from 'lucide-react'
import { jobs, pwdUsers, type Job } from '../../data'
import { Card, Button, SearchBar, Select, Modal } from '../../components/ui'
import { usePWDSession } from '../../context'

function MatchRing({ percent }: { percent: number }) {
  const r = 22
  const c = 2 * Math.PI * r
  const dash = (percent / 100) * c
  const color = percent >= 85 ? '#0d9488' : percent >= 70 ? '#2563eb' : '#d97706'
  return (
    <div className="relative w-14 h-14 shrink-0">
      <svg viewBox="0 0 50 50" className="w-14 h-14 -rotate-90">
        <circle cx="25" cy="25" r={r} fill="none" stroke="#e2e8f0" strokeWidth="4" />
        <circle cx="25" cy="25" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${dash} ${c}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs font-extrabold" style={{ color }}>{percent}%</span>
      </div>
    </div>
  )
}

function JobCard({ job, onView }: { job: Job; onView: () => void }) {
  const typeColor: Record<string, string> = {
    'Full-time': 'bg-blue-50 text-blue-700',
    'Part-time': 'bg-purple-50 text-purple-700',
    'Contract': 'bg-amber-50 text-amber-700',
    'Remote': 'bg-green-50 text-green-700',
  }
  const pct = job.matchPercent ?? 0

  return (
    <Card className="p-5 flex flex-col hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3 mb-4">
        <MatchRing percent={pct} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColor[job.type] ?? 'bg-gray-100 text-gray-600'}`}>
              {job.type}
            </span>
            <span className="text-xs text-gray-400">{job.deadline}</span>
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
      </div>

      {/* Matched skills */}
      {job.matchReasons && job.matchReasons.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Skill Matches</p>
          <div className="flex flex-wrap gap-1.5">
            {job.matchReasons.map((r, i) => (
              <span key={i} className="text-[11px] bg-teal-50 text-teal-700 border border-teal-100 px-2 py-0.5 rounded-full font-medium">
                ✓ {r.replace('Matches your ', '')}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 mb-4">
        {job.skills.map((s) => (
          <span key={s} className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s}</span>
        ))}
      </div>

      <div className="flex gap-2">
        <Button size="sm" fullWidth onClick={onView} className="bg-teal-600 hover:bg-teal-700 text-white border-0">
          Apply Now
        </Button>
        <Button size="sm" variant="outline" onClick={onView}>Details</Button>
      </div>
    </Card>
  )
}

function JobDetail({ job, onClose }: { job: Job; onClose: () => void }) {
  return (
    <Modal open title={job.title} onClose={onClose} size="lg">
      <div className="space-y-5">
        {/* Match banner */}
        {job.matchPercent != null && (
          <div className="flex items-center gap-4 p-4 bg-teal-50 rounded-xl border border-teal-100">
            <MatchRing percent={job.matchPercent} />
            <div>
              <p className="font-bold text-teal-800 text-sm">{job.matchPercent}% Profile Match</p>
              <p className="text-teal-600 text-xs mt-0.5">This job is recommended based on your skills and disability profile.</p>
              {job.matchReasons && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {job.matchReasons.map((r, i) => (
                    <span key={i} className="text-[11px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full font-medium">{r}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div>
          <p className="text-base font-bold text-teal-700">{job.company}</p>
          <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
            <span className="flex items-center gap-1"><MapPin size={13} />{job.location}</span>
            <span className="flex items-center gap-1"><Briefcase size={13} />{job.type}</span>
            <span className="flex items-center gap-1"><Clock size={13} />Deadline: {job.deadline}</span>
          </div>
        </div>

        {/* Why it matches */}
        <div>
          <p className="text-xs uppercase tracking-wide font-bold text-gray-400 mb-2">Why This Job Matches Your Profile</p>
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 space-y-2">
            <p>Based on your registered skills (<strong>{currentUser.skills?.join(', ')}</strong>), this position aligns well with your qualifications and accessibility needs.</p>
            <ul className="space-y-1 mt-2">
              {job.matchReasons?.map((r, i) => (
                <li key={i} className="flex items-center gap-2">
                  <CheckCircle size={13} className="text-teal-600 shrink-0" />{r}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide font-bold text-gray-400 mb-2">Accessibility & PWD Support</p>
          <div className="flex gap-2 bg-green-50 rounded-xl p-4 border border-green-100">
            <CheckCircle size={17} className="text-green-600 shrink-0 mt-0.5" />
            <p className="text-sm text-green-800">{job.accessibilityInfo}</p>
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide font-bold text-gray-400 mb-2">Required Skills</p>
          <div className="flex flex-wrap gap-2">
            {job.skills.map((s) => (
              <span key={s} className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full">{s}</span>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            className="flex-1 py-3 text-sm font-semibold bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors"
            onClick={onClose}
          >
            Apply for This Position
          </button>
          <Button size="lg" variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  )
}

export default function Jobs() {
  const session = usePWDSession()
  const currentUser = session ? (pwdUsers.find((u) => u.id === session.userId) ?? pwdUsers[0]) : pwdUsers[0]
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [selected, setSelected] = useState<Job | null>(null)
  const [sortByMatch, setSortByMatch] = useState(true)

  const jobTypes = ['Full-time', 'Part-time', 'Contract', 'Remote'].map((t) => ({ value: t, label: t }))

  let filtered = jobs.filter((j) => {
    const q = search.toLowerCase()
    return (!search || j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q) || j.location.toLowerCase().includes(q))
      && (!typeFilter || j.type === typeFilter)
  })

  if (sortByMatch) filtered = [...filtered].sort((a, b) => (b.matchPercent ?? 0) - (a.matchPercent ?? 0))

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Job Matching</h1>
        <p className="text-gray-500 text-sm mt-0.5">PWD-friendly jobs matched to your skills and profile</p>
      </div>

      {/* Profile-based match notice */}
      <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 flex gap-3">
        <Star size={18} className="text-teal-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-teal-800">Jobs matched to your profile</p>
          <p className="text-xs text-teal-600 mt-0.5">
            Based on your registered skills ({currentUser.skills?.join(', ')}), we found {filtered.length} matching job{filtered.length !== 1 ? 's' : ''}. Jobs are ranked by match percentage.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex-1 min-w-52">
          <SearchBar value={search} onChange={setSearch} placeholder="Search jobs, companies, locations..." />
        </div>
        <div className="min-w-36">
          <Select label="" options={jobTypes} value={typeFilter} onChange={setTypeFilter} placeholder="All Types" />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer shrink-0">
          <input type="checkbox" checked={sortByMatch} onChange={(e) => setSortByMatch(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
          Sort by match %
        </label>
      </div>

      <p className="text-sm text-gray-500">{filtered.length} job{filtered.length !== 1 ? 's' : ''} found</p>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Briefcase size={48} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No jobs found</p>
          <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((j) => <JobCard key={j.id} job={j} onView={() => setSelected(j)} />)}
        </div>
      )}

      {selected && <JobDetail job={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
