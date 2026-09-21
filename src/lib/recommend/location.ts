import { officialBarangay } from '../catalog'
import type { PWDUser, Job } from '../../data'
import type { LocationFit } from './types'

const inLosBanos = (text: string) => /los\s*ba(ñ|n)os/i.test(text)

/**
 * Proximity of a listing to the PWD. There is no distance data, so it is rule-based:
 * same barangay → in Los Baños → elsewhere in Laguna → further away. Remote jobs have no commute.
 */
export function computeLocationFit(user: PWDUser, job: Job): LocationFit {
  if (job.workArrangement === 'Remote') {
    return { fraction: 1, level: 'remote', note: 'Work from home — no commute.' }
  }

  const userBarangay = officialBarangay(user.barangay)
  const jobBarangay = officialBarangay(job.location)

  if (jobBarangay) {
    if (userBarangay && userBarangay === jobBarangay) {
      return { fraction: 1, level: 'barangay', note: `Located in your barangay (${jobBarangay}).` }
    }
    // Every official barangay is in Los Baños, and PWD accounts are Los Baños residents.
    return { fraction: 0.7, level: 'municipality', note: `Located in Brgy. ${jobBarangay}, Los Baños.` }
  }
  if (inLosBanos(job.location)) {
    return { fraction: 0.7, level: 'municipality', note: 'Located in Los Baños.' }
  }
  if (/laguna/i.test(job.location)) {
    return { fraction: 0.35, level: 'province', note: `Located in ${job.location}.` }
  }
  return { fraction: 0.15, level: 'far', note: `Located in ${job.location || 'an unspecified location'}.` }
}
