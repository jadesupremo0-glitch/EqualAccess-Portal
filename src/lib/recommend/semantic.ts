import type { PWDUser, Job } from '../../data'
import type { SemanticFit } from './types'

/**
 * Free-text semantic matching via TF-IDF + Cosine Similarity — the method validated offline in
 * ml/train_tfidf_model.py against the capstone dataset (dataset/mldataset.xlsx), implemented here
 * in plain TypeScript so it runs live, in the browser, on the portal's real profile/listing text.
 *
 * This is deliberately hand-rolled rather than a port of a scikit-learn object: TF-IDF and cosine
 * similarity are just arithmetic over term-frequency vectors, so no ML runtime is needed client-side.
 *
 * Scope: this captures similarity the structured matchers (skill.ts, education.ts, accommodations.ts)
 * don't — job title/description vs. the applicant's course/degree and work-experience blurb — not a
 * replacement for taxonomy-aware skill matching, which handles synonyms and Tagalog terms TF-IDF
 * word-overlap alone would miss.
 */

// A small, pragmatic English stopword list — mirrors TfidfVectorizer(stop_words='english').
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'to', 'in', 'on', 'at', 'for', 'with', 'is', 'are', 'was',
  'were', 'be', 'been', 'being', 'as', 'by', 'it', 'its', 'this', 'that', 'these', 'those', 'from',
  'into', 'your', 'you', 'i', 'we', 'they', 'he', 'she', 'their', 'our', 'will', 'can', 'may', 'not',
  'no', 'do', 'does', 'did', 'has', 'have', 'had', 'so', 'if', 'than', 'then', 'also',
])

export function tokenize(text: string): string[] {
  return (text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
}

/** Applicant free-text profile: skills + education + work experience. */
export function applicantDocument(user: PWDUser): string {
  return [...(user.skills ?? []), user.education ?? '', user.workExperience ?? ''].join(' ')
}

/** Job free-text listing: title + required skills + description. */
export function jobDocument(job: Job): string {
  return [job.title, ...(job.skills ?? []), job.description ?? ''].join(' ')
}

interface TfidfSpace {
  /** Smoothed IDF per term, sklearn-style: ln((1+n)/(1+df)) + 1. */
  idf: Map<string, number>
}

function buildTfidfSpace(tokenizedDocs: string[][]): TfidfSpace {
  const df = new Map<string, number>()
  for (const tokens of tokenizedDocs) {
    for (const term of new Set(tokens)) df.set(term, (df.get(term) ?? 0) + 1)
  }
  const n = tokenizedDocs.length
  const idf = new Map<string, number>()
  for (const [term, count] of df) idf.set(term, Math.log((1 + n) / (1 + count)) + 1)
  return { idf }
}

/** TF-IDF vector for one document, L2-normalized (matches sklearn's default norm='l2'). */
function tfidfVector(tokens: string[], space: TfidfSpace): Map<string, number> {
  const tf = new Map<string, number>()
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1)

  const vec = new Map<string, number>()
  for (const [term, count] of tf) {
    const idf = space.idf.get(term)
    if (idf !== undefined) vec.set(term, count * idf)
  }
  const norm = Math.sqrt([...vec.values()].reduce((s, v) => s + v * v, 0))
  if (norm > 0) for (const [term, v] of vec) vec.set(term, v / norm)
  return vec
}

export function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  const [small, large] = a.size <= b.size ? [a, b] : [b, a]
  let dot = 0
  for (const [term, v] of small) {
    const w = large.get(term)
    if (w !== undefined) dot += v * w
  }
  return dot
}

/**
 * Semantic similarity between one applicant and one job. `corpusJobs` — typically every open,
 * current candidate job in the recommendation request — gives the TF-IDF space a richer, more
 * realistic vocabulary; when omitted (e.g. a standalone unit test), the space is fit from just this
 * one applicant/job pair.
 *
 * Raw cosine similarity on short profile text tends to sit well under 1 even for a clearly-best
 * match — TF-IDF vectors over a handful of words are sparse, so absolute magnitude is not
 * meaningful on its own. What matters for ranking is this applicant's similarity to this job
 * *relative to* their similarity to the other candidates, so the reported `similarity` is scaled
 * against this applicant's best match across `corpusJobs` (their top match reaches 1.0).
 */
export function computeSemanticFit(user: PWDUser, job: Job, corpusJobs?: Job[]): SemanticFit {
  const applicantDoc = applicantDocument(user)
  const candidateJobs = corpusJobs && corpusJobs.length > 0 ? corpusJobs : [job]
  const allJobs = candidateJobs.some((j) => j.id === job.id) ? candidateJobs : [...candidateJobs, job]

  const space = buildTfidfSpace([tokenize(applicantDoc), ...allJobs.map((j) => tokenize(jobDocument(j)))])
  const applicantVec = tfidfVector(tokenize(applicantDoc), space)

  let rawSimilarity = 0
  let maxSimilarity = 0
  let jobVecForTarget = new Map<string, number>()
  for (const j of allJobs) {
    const vec = tfidfVector(tokenize(jobDocument(j)), space)
    const sim = cosineSimilarity(applicantVec, vec)
    if (sim > maxSimilarity) maxSimilarity = sim
    if (j.id === job.id) {
      rawSimilarity = sim
      jobVecForTarget = vec
    }
  }
  const similarity = maxSimilarity > 0 ? rawSimilarity / maxSimilarity : 0

  const sharedTerms = [...applicantVec.entries()]
    .filter(([term]) => jobVecForTarget.has(term))
    .map(([term, weight]) => [term, weight * (jobVecForTarget.get(term) ?? 0)] as const)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([term]) => term)

  return { similarity, sharedTerms }
}
