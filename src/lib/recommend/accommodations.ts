import { ACCOMMODATIONS } from '../catalog'
import type { PWDUser, Job } from '../../data'
import type { AccommodationFit } from './types'

type AccommodationLabel = (typeof ACCOMMODATIONS)[number]

// Free-text needs / offers → canonical accommodation. Existing records use free text
// ("Accessible entrance", "Screen reader software"), so match by keyword.
const RULES: { label: AccommodationLabel; pattern: RegExp }[] = [
  { label: 'Wheelchair-accessible workplace', pattern: /wheelchair|\bramp\b|elevator|accessible (entrance|restroom|workstation|route)|mobility/i },
  { label: 'Screen-reader-compatible tools', pattern: /screen.?reader|braille|magnif|high contrast|text-to-speech/i },
  { label: 'Sign-language interpreter', pattern: /sign.?language|interpret|deaf|hard of hearing|visual (alert|notification)|caption/i },
  { label: 'Flexible hours', pattern: /flexible|rest break|schedule/i },
  { label: 'Remote work', pattern: /remote|work from home|\bwfh\b/i },
  { label: 'Quiet workspace', pattern: /quiet|noise|sensory/i },
  { label: 'Written instructions', pattern: /written|instructions|checklist/i },
  { label: 'Assistive technology provided', pattern: /assistive tech|assistive device/i },
]

/** Canonical accommodations implied by a list of free-text entries. */
export function canonicalAccommodations(texts: string[]): AccommodationLabel[] {
  const found = new Set<AccommodationLabel>()
  for (const text of texts) {
    for (const rule of RULES) if (rule.pattern.test(text)) found.add(rule.label)
  }
  return ACCOMMODATIONS.filter((a) => found.has(a))
}

/** What the PWD says they need. Optional: an empty list means "not stated". */
export function accommodationNeeds(user: PWDUser): AccommodationLabel[] {
  return canonicalAccommodations([...(user.accommodationRequirements ?? []), ...(user.accessibilityNeeds ?? [])])
}

/** What the listing offers, including what its work arrangement implies. */
export function accommodationsOffered(job: Job): AccommodationLabel[] {
  const offered = new Set<AccommodationLabel>(canonicalAccommodations(job.accommodations ?? []))
  if (job.workArrangement === 'Remote') offered.add('Remote work')
  return ACCOMMODATIONS.filter((a) => offered.has(a))
}

/**
 * Compare needs with offers. Physical-access needs do not apply to a fully remote job.
 * `applicable` is false when the PWD has stated no needs (nothing to fit).
 */
export function computeAccommodationFit(user: PWDUser, job: Job): AccommodationFit {
  const needs = accommodationNeeds(user)
  const offered = accommodationsOffered(job)
  const remote = job.workArrangement === 'Remote'

  const met: string[] = []
  const unmet: string[] = []
  for (const need of needs) {
    const physicalAccess = need === 'Wheelchair-accessible workplace'
    if (offered.includes(need) || (remote && physicalAccess)) met.push(need)
    else unmet.push(need)
  }
  const fraction = needs.length === 0 ? 1 : met.length / needs.length
  return { applicable: needs.length > 0, needs, met, unmet, fraction }
}
