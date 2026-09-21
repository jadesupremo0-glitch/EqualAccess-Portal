import { applicantEducationRank } from './education'
import type { PWDUser } from '../../data'

export interface ProfileGap {
  field: 'skills' | 'educationLevel' | 'workExperience' | 'preferredJobTypes' | 'preferredWorkSetup'
  label: string
}

const CHECKS: { field: ProfileGap['field']; label: string; required: boolean; filled: (u: PWDUser) => boolean }[] = [
  { field: 'skills', label: 'Your skills', required: true, filled: (u) => (u.skills ?? []).some((s) => s.trim()) },
  { field: 'educationLevel', label: 'Highest education level', required: true, filled: (u) => applicantEducationRank(u) > 0 },
  { field: 'workExperience', label: 'Work experience', required: false, filled: (u) => (u.workExperience ?? '').trim().length > 0 },
  { field: 'preferredJobTypes', label: 'Preferred employment type', required: false, filled: (u) => (u.preferredJobTypes ?? []).length > 0 },
  { field: 'preferredWorkSetup', label: 'Preferred work arrangement', required: false, filled: (u) => (u.preferredWorkSetup ?? []).length > 0 },
]

const toGap = ({ field, label }: (typeof CHECKS)[number]): ProfileGap => ({ field, label })

/** Profile fields the matcher can use that are still empty. Accommodation needs are optional and never listed. */
export function profileGaps(user: PWDUser): ProfileGap[] {
  return CHECKS.filter((c) => !c.filled(user)).map(toGap)
}

/** What must be filled in before any job is recommended: skills and highest education. */
export function requiredGaps(user: PWDUser): ProfileGap[] {
  return CHECKS.filter((c) => c.required && !c.filled(user)).map(toGap)
}

/** Job recommendations stay locked until the PWD has entered their skills and education. */
export function canRecommend(user: PWDUser): boolean {
  return requiredGaps(user).length === 0
}

export function profileCompleteness(user: PWDUser): number {
  return Math.round(((CHECKS.length - profileGaps(user).length) / CHECKS.length) * 100)
}
