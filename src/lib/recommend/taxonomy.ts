import raw from './taxonomy.json'

export interface FamilyDefinition {
  family: string
  categories: string[]
  keywords: string[]
}

export interface EducationLevelDefinition {
  level: string
  rank: number
  keywords: string[]
}

export interface AccessibilityDomain {
  need: string[]
  demand: string[]
  support: string[]
}

export interface Taxonomy {
  synonyms: Record<string, string[]>
  families: FamilyDefinition[]
  educationLevels: EducationLevelDefinition[]
  stopwords: string[]
  accessibilityDomains: Record<string, AccessibilityDomain>
}

/** Typed view of the editable taxonomy config (see taxonomy.json). */
export const taxonomy = raw as Taxonomy

const STOPWORDS = new Set(taxonomy.stopwords.map((s) => s.toLowerCase()))

/** Normalize a phrase for comparison (case + whitespace). */
export function normalizePhrase(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim()
}

/** Map a phrase to its canonical skill name using the synonym table. */
export function canonicalOf(term: string): string {
  const t = normalizePhrase(term)
  if (!t) return ''
  if (t in taxonomy.synonyms) return t
  const ordered = Object.entries(taxonomy.synonyms).sort((a, b) => b[1][0].length - a[1][0].length)
  for (const [canonical, variants] of ordered) {
    const pool = [canonical, ...variants].sort((a, b) => b.length - a.length)
    for (const variant of pool) {
      if (t === variant) return canonical
      if (variant.length >= 4 && (t.includes(variant) || variant.includes(t))) return canonical
    }
  }
  return t
}

/** Tokenize free text into lowercase normalized tokens, dropping stopwords. */
export function tokenize(text: string, minLength = 3): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= minLength && !STOPWORDS.has(t))
}

/** Word set for phrase-level containment checks. */
export function wordsOf(phrase: string): Set<string> {
  return new Set(phrase.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean))
}

/** Letter-case fix for display labels that were stored all lowercase. */
export function displayCase(value: string): string {
  return value
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}