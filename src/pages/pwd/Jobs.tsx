import { useState, useMemo } from 'react'
import { Briefcase, MapPin, Clock, CheckCircle, Star, Info } from 'lucide-react'
import { type Job, type PWDUser } from '../../data'
import { Card, Button, SearchBar, Select, Modal } from '../../components/ui'
import { usePWDSession } from '../../context'
import { useStore } from '../../store'

// ── TF-IDF + Cosine Similarity Job Recommendation Engine ──────────────

/** Tokenize and normalize text into lowercase terms */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1)
}

/** Compute term frequency for a document */
function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>()
  for (const t of tokens) {
    tf.set(t, (tf.get(t) ?? 0) + 1)
  }
  const max = Math.max(...tf.values(), 1)
  for (const [k, v] of tf) {
    tf.set(k, v / max)
  }
  return tf
}

/** Build IDF map from a corpus of documents */
function inverseDocumentFrequency(docs: string[][]): Map<string, number> {
  const df = new Map<string, number>()
  const n = docs.length
  for (const tokens of docs) {
    const seen = new Set(tokens)
    for (const t of seen) {
      df.set(t, (df.get(t) ?? 0) + 1)
    }
  }
  const idf = new Map<string, number>()
  for (const [term, freq] of df) {
    idf.set(term, Math.log((n + 1) / (freq + 1)) + 1) // smoothed IDF
  }
  return idf
}

/** Compute TF-IDF vector for a document given IDF map */
function tfidfVector(tf: Map<string, number>, idf: Map<string, number>): Map<string, number> {
  const vec = new Map<string, number>()
  for (const [term, idfVal] of idf) {
    const tfVal = tf.get(term) ?? 0
    if (tfVal > 0) vec.set(term, tfVal * idfVal)
  }
  return vec
}

/** Cosine similarity between two sparse vectors */
function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0
  let normA = 0
  let normB = 0
  for (const [k, v] of a) {
    normA += v * v
    const bv = b.get(k)
    if (bv) dot += v * bv
  }
  for (const [, v] of b) normB += v * v
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

/** Build profile text from PWD user data */
function profileText(u: PWDUser): string {
  const parts: string[] = []
  if (u.skills?.length) parts.push(u.skills.join(' '))
  if (u.education) parts.push(u.education)
  if (u.workExperience) parts.push(u.workExperience)
  if (u.certifications?.length) parts.push(u.certifications.join(' '))
  if (u.jobInterests?.length) parts.push(u.jobInterests.join(' '))
  if (u.functionalCapabilities?.length) parts.push(u.functionalCapabilities.join(' '))
  return parts.join(' ')
}

/** Build job text for TF-IDF */
function jobText(j: Job): string {
  const parts: string[] = []
  parts.push(j.title)
  if (j.description) parts.push(j.description)
  parts.push(j.skills.join(' '))
  if (j.preferredSkills?.length) parts.push(j.preferredSkills.join(' '))
  if (j.educationRequirement) parts.push(j.educationRequirement)
  if (j.functionalRequirements?.length) parts.push(j.functionalRequirements.join(' '))
  return parts.join(' ')
}

/**
 * Capability-based filtering:
 * Exclude jobs whose physical/functional requirements conflict with
 * the PWD's accessibility needs and functional capabilities.
 */
function capabilityFilter(user: PWDUser, job: Job): boolean {
  const userCaps = (user.functionalCapabilities ?? []).map((c) => c.toLowerCase())
  const userNeeds = (user.accessibilityNeeds ?? []).map((n) => n.toLowerCase())
  const jobPhys = (job.physicalRequirements ?? []).map((p) => p.toLowerCase())
  const jobFunc = (job.functionalRequirements ?? []).map((f) => f.toLowerCase())
  const jobAccess = (job.accessibilityFeatures ?? []).map((a) => a.toLowerCase())

  // If user has mobility-related needs and job requires heavy physical work
  const mobilityKeywords = ['wheelchair', 'mobility', 'walking', 'standing', 'climbing']
  const heavyKeywords = ['heavy lifting', 'standing for long', 'climbing', 'physical labor', 'outdoor physical']

  const hasMobilityLimit = userNeeds.some((n) => mobilityKeywords.some((k) => n.includes(k))) ||
    user.disabilityType === 'Physical Disability'
  const isHeavyJob = jobPhys.some((p) => heavyKeywords.some((k) => p.includes(k)))

  if (hasMobilityLimit && isHeavyJob) return false

  // If user needs visual accommodation and job requires visual tasks without support
  const visualKeywords = ['screen reader', 'visual', 'braille', 'blind']
  const hasVisualLimit = userNeeds.some((n) => visualKeywords.some((k) => n.includes(k))) ||
    user.disabilityType === 'Visual Disability'
  const visualJobReqs = jobFunc.some((f) => ['visual inspection', 'driving', 'color coding'].some((k) => f.includes(k)))
  const hasVisualSupport = jobAccess.some((a) => ['screen reader', 'braille', 'assistive technology'].some((k) => a.includes(k)))

  if (hasVisualLimit && visualJobReqs && !hasVisualSupport) return false

  // If user has hearing needs and job requires verbal communication without support
  const hearingKeywords = ['sign language', 'hearing', 'deaf', 'verbal']
  const hasHearingLimit = userNeeds.some((n) => hearingKeywords.some((k) => n.includes(k))) ||
    user.disabilityType === 'Deaf or Hard of Hearing'
  const verbalJobReqs = jobFunc.some((f) => ['verbal communication', 'phone', 'call'].some((k) => f.includes(k)))
  const hasHearingSupport = jobAccess.some((a) => ['sign language', 'written', 'visual', 'chat'].some((k) => a.includes(k)))

  if (hasHearingLimit && verbalJobReqs && !hasHearingSupport) return false

  // Check overlap between user capabilities and job functional requirements
  if (jobFunc.length > 0 && userCaps.length > 0) {
    const overlap = jobFunc.filter((jf) => userCaps.some((uc) => uc.includes(jf) || jf.includes(uc)))
    // If less than 30% of job requirements match user capabilities, filter out
    if (overlap.length / jobFunc.length < 0.3) return false
  }

  return true
}

/** Find matching skills between user and job */
function findMatchReasons(user: PWDUser, job: Job): string[] {
  const reasons: string[] = []
  const userSkills = (user.skills ?? []).map((s) => s.toLowerCase())
  const jobSkills = job.skills.map((s) => s.toLowerCase())
  const matchedSkills = jobSkills.filter((js) => userSkills.some((us) => us.includes(js) || js.includes(us)))
  if (matchedSkills.length > 0) {
    reasons.push(`Matches your skills: ${matchedSkills.map((s) => s.replace(/^\w/, (c) => c.toUpperCase())).join(', ')}`)
  }
  if (user.education && job.educationRequirement) {
    reasons.push(`Education: ${user.education}`)
  }
  const userSetup = (user.preferredWorkSetup ?? []).map((s) => s.toLowerCase())
  if (job.workSetup && userSetup.includes(job.workSetup.toLowerCase())) {
    reasons.push(`Preferred work setup: ${job.workSetup}`)
  }
  return reasons
}

/** Run the full recommendation pipeline */
function recommendJobs(user: PWDUser, allJobs: Job[]): (Job & { matchPercent: number; matchReasons: string[] })[] {
  // Step 1: Capability-based filtering
  const eligible = allJobs.filter((j) => j.status !== 'Closed' && j.status !== 'Inactive').filter((j) => capabilityFilter(user, j))

  if (eligible.length === 0) return []

  // Step 2: Build corpus for TF-IDF
  const userTokens = tokenize(profileText(user))
  const jobTokenSets = eligible.map((j) => tokenize(jobText(j)))
  const corpus = [userTokens, ...jobTokenSets]

  // Step 3: Compute IDF
  const idf = inverseDocumentFrequency(corpus)

  // Step 4: Compute TF-IDF vectors
  const userTF = termFrequency(userTokens)
  const userVec = tfidfVector(userTF, idf)

  // Step 5: Compute cosine similarity for each job
  const scored = eligible.map((job, i) => {
    const jobTF = termFrequency(jobTokenSets[i])
    const jobVec = tfidfVector(jobTF, idf)
    const score = cosineSimilarity(userVec, jobVec)
    const matchPercent = Math.round(score * 100)
    const matchReasons = findMatchReasons(user, job)
    return { ...job, matchPercent, matchReasons }
  })

  // Step 6: Rank by similarity score
  scored.sort((a, b) => b.matchPercent - a.matchPercent)

  return scored
}

// ── UI Components ─────────────────────────────────────────────────────

function MatchRing({ percent }: { percent: number }) {
  const r = 22
  const c = 2 * Math.PI * r
  const dash = (percent / 100) * c
  const color = percent >= 70 ? '#0d9488' : percent >= 40 ? '#2563eb' : '#d97706'
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

function FitBadge({ percent }: { percent: number }) {
  const label = percent >= 70 ? 'High Fit' : percent >= 40 ? 'Moderate Fit' : 'Low Fit'
  const color = percent >= 70 ? 'bg-teal-50 text-teal-700 border-teal-200' : percent >= 40 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200'
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${color}`}>
      {label}
    </span>
  )
}

function JobCard({ job, onView }: { job: Job & { matchPercent: number; matchReasons: string[] }; onView: () => void }) {
  const typeColor: Record<string, string> = {
    'Full-time': 'bg-blue-50 text-blue-700',
    'Part-time': 'bg-purple-50 text-purple-700',
    'Contract': 'bg-amber-50 text-amber-700',
    'Remote': 'bg-green-50 text-green-700',
  }

  return (
    <Card className="p-5 flex flex-col hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3 mb-4">
        <MatchRing percent={job.matchPercent} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColor[job.type] ?? 'bg-gray-100 text-gray-600'}`}>
              {job.type}
            </span>
            <FitBadge percent={job.matchPercent} />
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

      {job.matchReasons.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Why Recommended</p>
          <div className="flex flex-wrap gap-1.5">
            {job.matchReasons.map((r, i) => (
              <span key={i} className="text-[11px] bg-teal-50 text-teal-700 border border-teal-100 px-2 py-0.5 rounded-full font-medium">
                {r.replace('Matches your ', '')}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 mb-4">
        {job.skills.slice(0, 5).map((s) => (
          <span key={s} className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s}</span>
        ))}
      </div>

      <Button size="sm" variant="outline" onClick={onView} fullWidth>
        View Details
      </Button>
    </Card>
  )
}

function JobDetail({ job, onClose }: { job: Job & { matchPercent: number; matchReasons: string[] }; onClose: () => void }) {
  return (
    <Modal open title={job.title} onClose={onClose} size="lg">
      <div className="space-y-5">
        {/* Match banner */}
        <div className="flex items-center gap-4 p-4 bg-teal-50 rounded-xl border border-teal-100">
          <MatchRing percent={job.matchPercent} />
          <div>
            <p className="font-bold text-teal-800 text-sm">{job.matchPercent}% Similarity Score</p>
            <p className="text-teal-600 text-xs mt-0.5">TF-IDF + Cosine Similarity recommendation based on your profile.</p>
            {job.matchReasons.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {job.matchReasons.map((r, i) => (
                  <span key={i} className="text-[11px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full font-medium">{r}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <p className="text-base font-bold text-teal-700">{job.company}</p>
          <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
            <span className="flex items-center gap-1"><MapPin size={13} />{job.location}</span>
            <span className="flex items-center gap-1"><Briefcase size={13} />{job.type}</span>
            <span className="flex items-center gap-1"><Clock size={13} />Deadline: {job.deadline}</span>
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide font-bold text-gray-400 mb-2">Job Description</p>
          <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-4 leading-relaxed">{job.description}</p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide font-bold text-gray-400 mb-2">Why This Job Matches Your Profile</p>
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 space-y-2">
            <ul className="space-y-1">
              {job.matchReasons.map((r, i) => (
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
  const [selected, setSelected] = useState<(Job & { matchPercent: number; matchReasons: string[] }) | null>(null)

  const jobTypes = ['Full-time', 'Part-time', 'Contract', 'Remote'].map((t) => ({ value: t, label: t }))

  // Run ML recommendation pipeline
  const recommended = useMemo(() => recommendJobs(currentUser, jobs), [currentUser, jobs])

  // Apply UI filters
  let filtered = recommended.filter((j) => {
    const q = search.toLowerCase()
    return (!search || j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q) || j.location.toLowerCase().includes(q))
      && (!typeFilter || j.type === typeFilter)
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Job Recommendations</h1>
        <p className="text-gray-500 text-sm mt-0.5">AI-powered job suggestions matched to your skills and profile — for reference only</p>
      </div>

      {/* ML info banner */}
      <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 flex gap-3">
        <Star size={18} className="text-teal-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-teal-800">ML-Powered Recommendations</p>
          <p className="text-xs text-teal-600 mt-0.5">
            Jobs are matched using TF-IDF vectorization and Cosine Similarity based on your registered skills, education, experience, and functional capabilities.
            {filtered.length > 0 && ` Found ${filtered.length} recommendation${filtered.length !== 1 ? 's' : ''}.`}
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
          {filtered.map((j) => <JobCard key={j.id} job={j} onView={() => setSelected(j)} />)}
        </div>
      )}

      {selected && <JobDetail job={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
