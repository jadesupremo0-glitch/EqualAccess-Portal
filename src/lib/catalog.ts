// Single source of truth for the reference lists used across the portal
// (registration, profile, PWD Management filters, dashboard, reports, jobs).
// Do not redefine these lists anywhere else — import them from here.

// ── Barangays ──────────────────────────────────────────────────────
// Official barangays of Los Baños, Laguna, alphabetical.
export const BARANGAYS = [
  'Anos',
  'Bagong Silang',
  'Bambang',
  'Batong Malake',
  'Baybayin',
  'Bayog',
  'Lalakay',
  'Maahas',
  'Malinta',
  'Mayondon',
  'Putho-Tuntungin',
  'San Antonio',
  'Tadlac',
  'Timugan',
] as const

export type Barangay = (typeof BARANGAYS)[number]

export const ALL_BARANGAYS_LABEL = 'All Barangays'

/** Display / storage label, e.g. "Brgy. Malinta" (existing records already use this form). */
export const barangayLabel = (name: string): string => `Brgy. ${name}`

const BARANGAY_LOOKUP = new Map<string, Barangay>(BARANGAYS.map((b) => [b.toLowerCase(), b]))

/**
 * Resolve a stored barangay value ("Brgy. Malinta", "malinta", …) to its official
 * name, or null when it is not on the official list. Never rewrites the record.
 */
export function officialBarangay(stored: string | undefined | null): Barangay | null {
  if (!stored) return null
  const bare = stored.trim().replace(/^brgy\.?\s*/i, '').toLowerCase()
  return BARANGAY_LOOKUP.get(bare) ?? null
}

/** Select options for barangay dropdowns. Value = stored label ("Brgy. X"). */
export const BARANGAY_OPTIONS = BARANGAYS.map((b) => ({ value: barangayLabel(b), label: barangayLabel(b) }))

// ── Disability types ───────────────────────────────────────────────
// `value` is the slug used by the registration form; `label` is what is stored.
export const DISABILITY_OPTIONS = [
  { value: 'cancer', label: 'Cancer (RA 11215)' },
  { value: 'deaf', label: 'Deaf or Hard of Hearing' },
  { value: 'intellectual', label: 'Intellectual Disability' },
  { value: 'learning', label: 'Learning Disability' },
  { value: 'mental', label: 'Mental Disability' },
  { value: 'physical', label: 'Physical Disability' },
  { value: 'psychosocial', label: 'Psychosocial Disability' },
  { value: 'rare', label: 'Rare Disease (RA 10747)' },
  { value: 'speech', label: 'Speech & Language Impairment' },
  { value: 'visual', label: 'Visual Disability' },
] as const

export const OTHER_DISABILITY = 'Other'

export type NamedDisabilityType = (typeof DISABILITY_OPTIONS)[number]['label']
export type DisabilityType = NamedDisabilityType | typeof OTHER_DISABILITY

/** Named disability types in display order (the list shown in filters and charts). */
export const DISABILITY_TYPES: readonly NamedDisabilityType[] = DISABILITY_OPTIONS.map((o) => o.label)

/** Registration / profile options: the named types plus "Other". */
export const DISABILITY_FORM_OPTIONS = [
  ...DISABILITY_OPTIONS.map((o) => ({ value: o.value as string, label: o.label as string })),
  { value: 'other', label: OTHER_DISABILITY },
]

/** Registration slug → stored label. */
export const DISABILITY_LABEL_BY_SLUG: Record<string, DisabilityType> = Object.fromEntries([
  ...DISABILITY_OPTIONS.map((o) => [o.value, o.label]),
  ['other', OTHER_DISABILITY],
])

// Spellings used by records created before the current labels were fixed. Stored
// values are left untouched; comparisons go through normalizeDisability().
const LEGACY_DISABILITY_ALIASES: Record<string, DisabilityType> = {
  'speech and language impairment': 'Speech & Language Impairment',
}

/** Canonical label for a stored disability value (accepts legacy spellings). */
export function normalizeDisability(stored: string | undefined | null): DisabilityType | string {
  const v = (stored ?? '').trim()
  return LEGACY_DISABILITY_ALIASES[v.toLowerCase()] ?? v
}

// ── Assistance request types ───────────────────────────────────────
export const ASSISTANCE_TYPES = [
  'Financial Assistance',
  'Medical Assistance',
  'Assistive Devices',
  'Educational Assistance',
  'Livelihood Training',
  'Other Service Assistance',
] as const

const LEGACY_ASSISTANCE_ALIASES: Record<string, string> = {
  'assistive device': 'Assistive Devices',
}

/** Canonical assistance type for a stored request type (accepts legacy spellings). */
export function normalizeAssistanceType(stored: string | undefined | null): string {
  const v = (stored ?? '').trim()
  return LEGACY_ASSISTANCE_ALIASES[v.toLowerCase()] ?? v
}

// ── Job vocabulary ─────────────────────────────────────────────────
export const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contractual', 'Freelance'] as const
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number]

export const WORK_ARRANGEMENTS = ['On-site', 'Hybrid', 'Remote'] as const
export type WorkArrangement = (typeof WORK_ARRANGEMENTS)[number]

export const JOB_STATUSES = ['Draft', 'Open', 'Closed', 'Archived'] as const
export type JobStatus = (typeof JOB_STATUSES)[number]

/** Highest-education levels, lowest to highest. Rank is what the matcher compares. */
export const EDUCATION_LEVELS = [
  { label: 'Elementary', rank: 1 },
  { label: 'High School Level', rank: 2 },
  { label: 'High School Graduate', rank: 3 },
  { label: 'Senior High School Graduate', rank: 4 },
  { label: 'Vocational', rank: 5 },
  { label: 'College Level', rank: 6 },
  { label: 'College Graduate', rank: 7 },
  { label: 'Post Graduate', rank: 8 },
] as const

/** Accommodations an employer can offer / a PWD can ask for. */
export const ACCOMMODATIONS = [
  'Wheelchair-accessible workplace',
  'Screen-reader-compatible tools',
  'Sign-language interpreter',
  'Flexible hours',
  'Remote work',
  'Quiet workspace',
  'Written instructions',
  'Assistive technology provided',
] as const

// ── Time zone ──────────────────────────────────────────────────────
export const APP_TIME_ZONE = 'Asia/Manila'

const manilaParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Calendar date (YYYY-MM-DD) in Asia/Manila for the given instant. */
export function manilaDate(now: Date = new Date()): string {
  return manilaParts.format(now)
}
