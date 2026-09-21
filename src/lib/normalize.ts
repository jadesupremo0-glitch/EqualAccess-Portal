// Readers that turn stored rows (from localStorage or the database) into the current
// data model. Older records used different job fields and vocabulary; they are read
// tolerantly here so existing data keeps working without a destructive rewrite.

import {
  EMPLOYMENT_TYPES,
  JOB_STATUSES,
  WORK_ARRANGEMENTS,
  type EmploymentType,
  type JobStatus,
  type WorkArrangement,
} from './catalog'
import { canonicalAccommodations } from './recommend/accommodations'
import { lowestEducationLabel } from './recommend/education'
import type { Job, PWDUser } from '../data'

type Row = Record<string, unknown>

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

function pick<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return allowed.find((a) => a.toLowerCase() === str(value).trim().toLowerCase())
}

const LEGACY_EMPLOYMENT: Record<string, EmploymentType> = { contract: 'Contractual', remote: 'Full-time' }
const LEGACY_ARRANGEMENT: Record<string, WorkArrangement> = { office: 'On-site', 'on site': 'On-site', onsite: 'On-site' }
const LEGACY_JOB_STATUS: Record<string, JobStatus> = { active: 'Open', inactive: 'Closed' }

export function normalizeEmploymentType(v: unknown): EmploymentType | undefined {
  return pick(v, EMPLOYMENT_TYPES) ?? LEGACY_EMPLOYMENT[str(v).trim().toLowerCase()]
}

export function normalizeWorkArrangement(v: unknown): WorkArrangement | undefined {
  return pick(v, WORK_ARRANGEMENTS) ?? LEGACY_ARRANGEMENT[str(v).trim().toLowerCase()]
}

export function normalizeJobStatus(v: unknown): JobStatus {
  return pick(v, JOB_STATUSES) ?? LEGACY_JOB_STATUS[str(v).trim().toLowerCase()] ?? 'Draft'
}

/** Read a job in either the current or the pre-v3 shape. */
export function normalizeJob(raw: Row): Job {
  const legacyType = str(raw.type)
  const arrangement =
    normalizeWorkArrangement(raw.workArrangement) ??
    (legacyType.toLowerCase() === 'remote' ? 'Remote' : normalizeWorkArrangement(raw.workSetup)) ??
    'On-site'

  const accommodations = strList(raw.accommodations)
  const legacyAccommodations = [
    ...strList(raw.accessibilityFeatures),
    ...strList(raw.workplaceConditions),
    ...(str(raw.accommodationSupport) ? [str(raw.accommodationSupport)] : []),
  ]

  return {
    id: str(raw.id),
    title: str(raw.title),
    company: str(raw.company),
    description: str(raw.description),
    location: str(raw.location),
    employmentType: normalizeEmploymentType(raw.employmentType) ?? normalizeEmploymentType(legacyType) ?? 'Full-time',
    workArrangement: arrangement,
    skills: strList(raw.skills),
    minEducation: str(raw.minEducation) || lowestEducationLabel(str(raw.educationRequirement)),
    suitableDisabilities: strList(raw.suitableDisabilities),
    accommodations: accommodations.length > 0 ? accommodations : canonicalAccommodations(legacyAccommodations),
    slots: Number.isFinite(Number(raw.slots)) && Number(raw.slots) > 0 ? Number(raw.slots) : 1,
    deadline: str(raw.deadline),
    status: normalizeJobStatus(raw.status),
    postedDate: str(raw.postedDate),
    ...(str(raw.salary) ? { salary: str(raw.salary) } : {}),
    ...(str(raw.category) ? { category: str(raw.category) } : {}),
    ...(str(raw.accessibilityInfo) ? { accessibilityInfo: str(raw.accessibilityInfo) } : {}),
  }
}

/** Read a PWD user, upgrading legacy preference vocabulary. Other fields are left as stored. */
export function normalizeUser(u: PWDUser): PWDUser {
  const types = (u.preferredJobTypes as string[] | undefined)?.map((t) => normalizeEmploymentType(t) ?? (t as EmploymentType))
  const setups = (u.preferredWorkSetup as string[] | undefined)?.map((t) => normalizeWorkArrangement(t) ?? (t as WorkArrangement))
  return {
    ...u,
    ...(types ? { preferredJobTypes: types } : {}),
    ...(setups ? { preferredWorkSetup: setups } : {}),
  }
}
