/**
 * Exports the PWD/job dataset and every applicant×job scoring breakdown from the
 * recommendation engine to an .xlsx workbook, for thesis documentation of the
 * variables the engine checks (not just the final match score).
 *
 * Usage: npx tsx scripts/export-recommend-dataset.ts [out-file.xlsx]
 */
import ExcelJS from 'exceljs'
import { pwdUsers, jobs } from '../src/data'
import { scoreJob, isOpenAndCurrent, isRestrictedAgainst, DEFAULT_WEIGHTS } from '../src/lib/recommend/score'
import { canRecommend } from '../src/lib/recommend/profile'

const outFile = process.argv[2] ?? 'recommendation-dataset.xlsx'

async function main() {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'EqualAccess Portal'
  wb.created = new Date()

  // ── Sheet 1: PWD applicants (input variables) ──────────────────────
  const pwdSheet = wb.addWorksheet('PWD Applicants')
  pwdSheet.columns = [
    { header: 'PWD ID', key: 'id', width: 18 },
    { header: 'Name', key: 'name', width: 22 },
    { header: 'Barangay', key: 'barangay', width: 16 },
    { header: 'Age', key: 'age', width: 8 },
    { header: 'Disability Type', key: 'disabilityType', width: 22 },
    { header: 'Skills', key: 'skills', width: 40 },
    { header: 'Education Level', key: 'educationLevel', width: 20 },
    { header: 'Education (free text)', key: 'education', width: 24 },
    { header: 'Years of Experience', key: 'yearsOfExperience', width: 10 },
    { header: 'Certifications', key: 'certifications', width: 30 },
    { header: 'Job Interests', key: 'jobInterests', width: 30 },
    { header: 'Preferred Job Types', key: 'preferredJobTypes', width: 24 },
    { header: 'Preferred Work Setup', key: 'preferredWorkSetup', width: 24 },
    { header: 'Recommendations Unlocked?', key: 'canRecommend', width: 14 },
  ]
  pwdSheet.getRow(1).font = { bold: true }
  for (const u of pwdUsers) {
    pwdSheet.addRow({
      id: u.id,
      name: u.name,
      barangay: u.barangay,
      age: u.age ?? '',
      disabilityType: u.disabilityType,
      skills: (u.skills ?? []).join(', '),
      educationLevel: u.educationLevel ?? '',
      education: u.education ?? '',
      yearsOfExperience: u.yearsOfExperience ?? '',
      certifications: (u.certifications ?? []).join(', '),
      jobInterests: (u.jobInterests ?? []).join(', '),
      preferredJobTypes: (u.preferredJobTypes ?? []).join(', '),
      preferredWorkSetup: (u.preferredWorkSetup ?? []).join(', '),
      canRecommend: canRecommend(u) ? 'Yes' : 'No (missing skills/education)',
    })
  }

  // ── Sheet 2: Job listings (input variables) ────────────────────────
  const jobSheet = wb.addWorksheet('Job Listings')
  jobSheet.columns = [
    { header: 'Job ID', key: 'id', width: 12 },
    { header: 'Title', key: 'title', width: 26 },
    { header: 'Company', key: 'company', width: 22 },
    { header: 'Location', key: 'location', width: 20 },
    { header: 'Employment Type', key: 'employmentType', width: 16 },
    { header: 'Work Arrangement', key: 'workArrangement', width: 16 },
    { header: 'Required Skills', key: 'skills', width: 40 },
    { header: 'Min. Education', key: 'minEducation', width: 18 },
    { header: 'Suitable Disabilities', key: 'suitableDisabilities', width: 30 },
    { header: 'Accommodations Offered', key: 'accommodations', width: 40 },
    { header: 'Slots', key: 'slots', width: 8 },
    { header: 'Deadline', key: 'deadline', width: 12 },
    { header: 'Status', key: 'status', width: 10 },
  ]
  jobSheet.getRow(1).font = { bold: true }
  for (const j of jobs) {
    jobSheet.addRow({
      id: j.id,
      title: j.title,
      company: j.company,
      location: j.location,
      employmentType: j.employmentType,
      workArrangement: j.workArrangement,
      skills: j.skills.join(', '),
      minEducation: j.minEducation || '(none)',
      suitableDisabilities: j.suitableDisabilities.length ? j.suitableDisabilities.join(', ') : '(open to all)',
      accommodations: j.accommodations.join(', '),
      slots: j.slots,
      deadline: j.deadline,
      status: j.status,
    })
  }

  // ── Sheet 3: Weights / thresholds used by the engine ───────────────
  const weightSheet = wb.addWorksheet('Model Parameters')
  weightSheet.columns = [
    { header: 'Parameter', key: 'k', width: 34 },
    { header: 'Value', key: 'v', width: 14 },
    { header: 'Description', key: 'd', width: 70 },
  ]
  weightSheet.getRow(1).font = { bold: true }
  weightSheet.addRows([
    { k: 'Weight: Skills', v: DEFAULT_WEIGHTS.skills, d: 'Points for the share of required skills the applicant has (exact or synonym match; related skills earn 0.4 credit).' },
    { k: 'Weight: Suitability', v: DEFAULT_WEIGHTS.suitability, d: 'Points for disability-type fit + accommodation fit. Listed disability = full credit, open-to-all = 0.7 credit.' },
    { k: 'Weight: Education', v: DEFAULT_WEIGHTS.education, d: "Points for how the applicant's highest education compares to the job's minimum requirement." },
    { k: 'Weight: Location', v: DEFAULT_WEIGHTS.location, d: 'Points for proximity: remote > same barangay > same municipality > same province > far.' },
    { k: 'Weight: Preference', v: DEFAULT_WEIGHTS.preference, d: 'Points for matching the applicant\'s preferred employment type and work arrangement.' },
    { k: 'Minimum match score', v: 40, d: 'Listings scoring below this are hidden from the recommended list.' },
    { k: 'Minimum skill coverage', v: '40%', d: 'A listing must be covered by at least this share of the required skills to be shown at all.' },
    { k: 'Related-skill credit', v: '0.4', d: 'A close-but-not-identical skill (e.g. Typing vs. Data Entry) counts as this fraction of an exact match.' },
    { k: 'Open-to-all credit', v: '0.7', d: 'Disability-fit credit when the employer did not restrict the listing to specific disability types.' },
  ])

  // ── Sheet 4: Applicant × Job scoring matrix (the variables actually checked) ──
  const matrixSheet = wb.addWorksheet('Scoring Matrix (all pairs)')
  matrixSheet.columns = [
    { header: 'PWD ID', key: 'pwdId', width: 16 },
    { header: 'PWD Name', key: 'pwdName', width: 20 },
    { header: 'Disability Type', key: 'disabilityType', width: 20 },
    { header: 'Job ID', key: 'jobId', width: 10 },
    { header: 'Job Title', key: 'jobTitle', width: 24 },
    { header: 'Restricted (disability mismatch)?', key: 'restricted', width: 14 },
    { header: 'Open & Current?', key: 'openCurrent', width: 12 },
    { header: 'Skills Matched', key: 'skillsMatched', width: 30 },
    { header: 'Skills Related (partial)', key: 'skillsRelated', width: 26 },
    { header: 'Skills Missing', key: 'skillsMissing', width: 26 },
    { header: 'Skill Coverage (0-1)', key: 'skillCoverage', width: 12 },
    { header: 'Skills Points (/35)', key: 'skillsPts', width: 12 },
    { header: 'Disability Listed?', key: 'disabilityListed', width: 12 },
    { header: 'Accommodations Met', key: 'accMet', width: 26 },
    { header: 'Accommodations Unmet', key: 'accUnmet', width: 26 },
    { header: 'Suitability Points (/25)', key: 'suitabilityPts', width: 14 },
    { header: 'Education Status', key: 'eduStatus', width: 14 },
    { header: 'Education Fraction (0-1)', key: 'eduFraction', width: 14 },
    { header: 'Education Points (/15)', key: 'eduPts', width: 12 },
    { header: 'Location Level', key: 'locLevel', width: 14 },
    { header: 'Location Fraction (0-1)', key: 'locFraction', width: 12 },
    { header: 'Location Points (/15)', key: 'locPts', width: 12 },
    { header: 'Preference Points (/10)', key: 'prefPts', width: 12 },
    { header: 'TOTAL SCORE (0-100)', key: 'score', width: 14 },
    { header: 'Match Band', key: 'band', width: 12 },
    { header: 'Meets Min. Skill Coverage (40%)?', key: 'meetsCoverage', width: 14 },
    { header: 'Shown as Recommendation?', key: 'shown', width: 14 },
  ]
  matrixSheet.getRow(1).font = { bold: true }
  matrixSheet.views = [{ state: 'frozen', ySplit: 1, xSplit: 5 }]

  const now = new Date('2026-09-22T04:00:00Z') // matches accuracy.test.ts fixture clock

  for (const u of pwdUsers) {
    for (const j of jobs) {
      const restricted = isRestrictedAgainst(u, j)
      const openCurrent = isOpenAndCurrent(j, now)
      const rec = canRecommend(u) && !restricted ? scoreJob(u, j, DEFAULT_WEIGHTS) : null

      matrixSheet.addRow({
        pwdId: u.id,
        pwdName: u.name,
        disabilityType: u.disabilityType,
        jobId: j.id,
        jobTitle: j.title,
        restricted: restricted ? 'Yes' : 'No',
        openCurrent: openCurrent ? 'Yes' : 'No',
        skillsMatched: rec ? rec.skills.matched.join(', ') : '',
        skillsRelated: rec ? rec.skills.related.join(', ') : '',
        skillsMissing: rec ? rec.skills.missing.join(', ') : '',
        skillCoverage: rec ? Number(rec.skills.coverage.toFixed(3)) : '',
        skillsPts: rec ? Number(rec.components.skills.toFixed(2)) : '',
        disabilityListed: rec ? (rec.disabilityListed ? 'Yes' : 'No') : '',
        accMet: rec ? rec.accommodation.met.join(', ') : '',
        accUnmet: rec ? rec.accommodation.unmet.join(', ') : '',
        suitabilityPts: rec ? Number(rec.components.suitability.toFixed(2)) : '',
        eduStatus: rec ? rec.education.status : '',
        eduFraction: rec ? Number(rec.education.fraction.toFixed(3)) : '',
        eduPts: rec ? Number(rec.components.education.toFixed(2)) : '',
        locLevel: rec ? rec.location.level : '',
        locFraction: rec ? Number(rec.location.fraction.toFixed(3)) : '',
        locPts: rec ? Number(rec.components.location.toFixed(2)) : '',
        prefPts: rec ? Number(rec.components.preference.toFixed(2)) : '',
        score: rec ? rec.score : '',
        band: rec ? rec.band : '',
        meetsCoverage: rec ? (j.skills.length === 0 || rec.skills.coverage >= 0.4 ? 'Yes' : 'No') : '',
        shown:
          rec && openCurrent && rec.score >= 40 && (j.skills.length === 0 || rec.skills.coverage >= 0.4)
            ? 'Yes'
            : 'No',
      })
    }
  }

  await wb.xlsx.writeFile(outFile)
  console.log(`Wrote ${outFile} (${pwdUsers.length} applicants x ${jobs.length} jobs = ${pwdUsers.length * jobs.length} rows in the scoring matrix)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
