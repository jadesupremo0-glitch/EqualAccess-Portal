import raw from './taxonomy.json'

export interface EducationLevelDefinition {
  level: string
  rank: number
  keywords: string[]
}

export interface Taxonomy {
  synonyms: Record<string, string[]>
  /** Clusters of canonical skills that are close but not interchangeable (e.g. data entry ↔ typing). */
  related: string[][]
  educationLevels: EducationLevelDefinition[]
}

/** Typed view of the editable taxonomy config (see taxonomy.json). */
export const taxonomy = raw as Taxonomy

/** Normalize a phrase for comparison (case + whitespace). */
export function normalizePhrase(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim()
}

/** Lower-cased words only — punctuation becomes a space, so "Detail-oriented" and "detail oriented" agree. */
function words(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}+#]+/gu, ' ').trim()
}

interface Variant {
  text: string
  canonical: string
}

// Built once: every spelling the taxonomy knows, longest first so "microsoft excel" wins over "excel".
const VARIANTS: Variant[] = Object.entries(taxonomy.synonyms)
  .flatMap(([canonical, list]) => [canonical, ...list].map((v) => ({ text: words(v), canonical })))
  .filter((v) => v.text)
  .sort((a, b) => b.text.length - a.text.length)

const EXACT = new Map<string, string>()
for (const v of VARIANTS) if (!EXACT.has(v.text)) EXACT.set(v.text, v.canonical)

/**
 * Map a phrase to its canonical skill. Order of trust:
 *  1. the whole phrase is a known spelling;
 *  2. a known spelling appears in it as whole words ("Advanced Microsoft Excel" → microsoft office;
 *     "excellent listener" does NOT match "excel");
 *  3. the phrase is a whole-word fragment of exactly one canonical's spellings ("photo" ≠ ambiguous,
 *     but "editing" is, so it stays unresolved).
 * Anything else comes back normalized and only matches itself.
 */
export function canonicalOf(term: string): string {
  const w = words(term)
  if (!w) return ''
  const exact = EXACT.get(w)
  if (exact) return exact

  const padded = ` ${w} `
  const contained = VARIANTS.find((v) => padded.includes(` ${v.text} `))
  if (contained) return contained.canonical

  if (w.length >= 4) {
    const owners = new Set(VARIANTS.filter((v) => ` ${v.text} `.includes(padded)).map((v) => v.canonical))
    if (owners.size === 1) return [...owners][0]
  }
  return w
}

const RELATED = taxonomy.related ?? []

/** Two different canonical skills that sit in the same related cluster. */
export function areRelatedSkills(a: string, b: string): boolean {
  const ca = canonicalOf(a)
  const cb = canonicalOf(b)
  if (!ca || !cb || ca === cb) return false
  return RELATED.some((group) => group.includes(ca) && group.includes(cb))
}

const ACRONYMS = new Set(['it', 'hr'])

/** Display name for a canonical skill ("it support" → "IT Support"). */
export function skillLabel(canonical: string): string {
  return canonical
    .split(' ')
    .map((w) => (ACRONYMS.has(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
}

/** Skills offered as one-tap suggestions, so entries use the same vocabulary the matcher knows. */
export const SKILL_SUGGESTIONS: string[] = Object.keys(taxonomy.synonyms).map(skillLabel)
