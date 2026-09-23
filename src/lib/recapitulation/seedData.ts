import { OFFICIAL_BARANGAYS, OFFICIAL_DISABILITY_TYPES, blankInput } from './compute'
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

/** [female0-17, male0-17, female18-30, male18-30, female31-59, male31-59, female60+, male60+], row order = OFFICIAL_DISABILITY_TYPES.
 * Mirrors seed_recapitulation_disability_data() in 20260924000000_recapitulation_disability.sql (a test keeps them in step). */
const DISABILITY_COUNTS: Record<string, [number, number, number, number, number, number, number, number]> = {
  'Cancer (RA 11215)': [4, 2, 12, 6, 204, 30, 46, 11],
  'Deaf or Hard of Hearing': [16, 14, 30, 33, 104, 80, 21, 12],
  'Intellectual Disability': [47, 97, 43, 89, 58, 56, 4, 4],
  'Learning Disability': [14, 34, 7, 3, 3, 3, 1, 1],
  'Mental Disability': [2, 8, 32, 26, 43, 40, 8, 10],
  'Physical Disability': [65, 72, 138, 103, 675, 784, 214, 267],
  'Psychosocial Disability': [155, 237, 293, 231, 982, 858, 248, 220],
  'Rare Disease (RA 10747)': [17, 19, 16, 8, 45, 21, 1, 0],
  'Speech & Language Impairment': [39, 76, 24, 36, 48, 70, 14, 12],
  'Visual Disability': [32, 34, 66, 62, 179, 192, 76, 47],
}

export const SEED_REPORT: RecapInput = {
  ...blankInput(SEED_AS_OF),
  status: 'published',
  rows: OFFICIAL_BARANGAYS.map((b) => ({ ...b, age0to59: COUNTS[b.code][0], age60above: COUNTS[b.code][1] })),
  prpwd: [
    { label: 'DOH PRPWD ENCODED', referenceDate: '2026-04-30', totalPwds: 7934, totalEncoded: 6869 },
    { label: 'Request Overtime', referenceDate: '2024-02-14', totalPwds: 6110, totalEncoded: 1787 },
  ],
  disabilityRows: OFFICIAL_DISABILITY_TYPES.map((disabilityType) => {
    const [female0to17, male0to17, female18to30, male18to30, female31to59, male31to59, female60above, male60above] = DISABILITY_COUNTS[disabilityType]
    return { disabilityType, female0to17, male0to17, female18to30, male18to30, female31to59, male31to59, female60above, male60above }
  }),
}
