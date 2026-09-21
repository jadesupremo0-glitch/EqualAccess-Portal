import { OFFICIAL_BARANGAYS, blankInput } from './compute'
import type { RecapInput } from './types'

/** Official snapshot as of April 30, 2026. Mirrors seed_recapitulation_snapshot() in the migration (a test keeps them in step). */
export const SEED_AS_OF = '2026-04-30'

const COUNTS: Record<string, [number, number]> = {
  '001': [613, 125],
  '002': [28, 7],
  '003': [413, 63],
  '004': [1001, 207],
  '005': [98, 26],
  '006': [514, 84],
  '007': [271, 40],
  '008': [440, 86],
  '009': [390, 44],
  '010': [1058, 200],
  '011': [543, 95],
  '012': [796, 117],
  '013': [151, 23],
  '014': [411, 90],
}

export const SEED_REPORT: RecapInput = {
  ...blankInput(SEED_AS_OF),
  status: 'published',
  rows: OFFICIAL_BARANGAYS.map((b) => ({ ...b, age0to59: COUNTS[b.code][0], age60above: COUNTS[b.code][1] })),
  prpwd: [
    { label: 'DOH PRPWD ENCODED', referenceDate: '2026-04-30', totalPwds: 7934, totalEncoded: 6869 },
    { label: 'Request Overtime', referenceDate: '2024-02-14', totalPwds: 6110, totalEncoded: 1787 },
  ],
}
