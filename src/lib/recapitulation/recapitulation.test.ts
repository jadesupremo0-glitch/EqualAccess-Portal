import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import ExcelJS from 'exceljs'
import {
  OFFICIAL_BARANGAYS, blankInput, describeChanges, extremes, formatAsOf, inputFromReport, prpwdPercent, rowTotal,
  sharePercent, sumRows, validateInput, withDerived,
} from './compute'
import { SEED_AS_OF, SEED_REPORT } from './seedData'
import { buildCsv, buildWorkbook, recapFileName, prpwdLabel } from './export'
import type { RecapReport } from './types'

const report: RecapReport = {
  id: 'r1',
  title: SEED_REPORT.title,
  asOfDate: SEED_AS_OF,
  status: 'published',
  showOnLanding: false,
  createdBy: 'seed',
  updatedBy: 'seed',
  createdAt: '2026-04-30T00:00:00Z',
  updatedAt: '2026-04-30T00:00:00Z',
  ...withDerived(SEED_REPORT),
}

describe('seeded snapshot (as of April 30, 2026)', () => {
  it('adds up to exactly 6,727 / 1,207 / 7,934', () => {
    expect(sumRows(report.rows)).toEqual({ age0to59: 6727, age60above: 1207, total: 7934 })
  })

  it('has the 14 official barangays with the printed row totals', () => {
    const printed: Record<string, number> = {
      '001': 738, '002': 35, '003': 476, '004': 1208, '005': 124, '006': 598, '007': 311,
      '008': 526, '009': 434, '010': 1258, '011': 638, '012': 913, '013': 174, '014': 501,
    }
    expect(report.rows).toHaveLength(14)
    expect(report.rows.map((r) => r.code)).toEqual(Object.keys(printed))
    for (const r of report.rows) expect(r.total, r.name).toBe(printed[r.code])
    expect(report.rows.map((r) => r.name)).toEqual(OFFICIAL_BARANGAYS.map((b) => b.name))
  })

  it('has the PRPWD rows with their percentages (87% and 29%)', () => {
    expect(report.prpwd.map((p) => [p.label, p.referenceDate, p.totalPwds, p.totalEncoded, p.percentage])).toEqual([
      ['DOH PRPWD ENCODED', '2026-04-30', 7934, 6869, 87],
      ['Request Overtime', '2024-02-14', 6110, 1787, 29],
    ])
  })

  it('matches the numbers written into the migration seeder', () => {
    const sql = readFileSync('supabase/migrations/20260922010000_recapitulation.sql', 'utf8')
    const tuples = [...sql.matchAll(/\('(\d{3})', '([^']+)', (\d+), (\d+)\)/g)].map((m) => ({
      code: m[1], name: m[2], age0to59: Number(m[3]), age60above: Number(m[4]),
    }))
    expect(tuples).toEqual(SEED_REPORT.rows)
    expect(sql).toContain("(v_id, 'DOH PRPWD ENCODED', date '2026-04-30', 7934, 6869, 1)")
    expect(sql).toContain("(v_id, 'Request Overtime', date '2024-02-14', 6110, 1787, 2)")
  })
})

describe('derived numbers', () => {
  it('a row total is always its two brackets added', () => {
    expect(rowTotal({ age0to59: 613, age60above: 125 })).toBe(738)
    expect(withDerived({ ...blankInput('2026-01-01'), rows: [{ code: '001', name: 'Anos', age0to59: 5, age60above: 6 }] }).rows[0].total).toBe(11)
  })

  it('percentage rounds like the database and never divides by zero', () => {
    expect(prpwdPercent(7934, 6869)).toBe(87)
    expect(prpwdPercent(6110, 1787)).toBe(29)
    expect(prpwdPercent(0, 0)).toBe(0)
    expect(prpwdPercent(200, 1)).toBe(1) // 0.5 rounds up
  })

  it('shares, extremes and dates', () => {
    expect(sharePercent(1207, 7934)).toBe(15.2)
    expect(sharePercent(1, 0)).toBe(0)
    expect(extremes(report.rows)).toEqual({ highest: ['010'], lowest: ['002'] })
    expect(extremes(report.rows.map((r) => ({ ...r, age0to59: 1, age60above: 1, total: 2 })))).toEqual({ highest: [], lowest: [] })
    expect(formatAsOf('2026-04-30')).toBe('April 30, 2026')
  })
})

describe('validation', () => {
  const ok = inputFromReport(report)

  it('accepts the seeded report', () => {
    expect(validateInput(ok)).toEqual([])
  })

  it('requires a valid as-of date', () => {
    expect(validateInput({ ...ok, asOfDate: '' })).toContain('The "as of" date is required.')
    expect(validateInput({ ...ok, asOfDate: '2026-02-30' })).toContain('The "as of" date is not a valid date.')
  })

  it('rejects negative, fractional or missing counts', () => {
    for (const bad of [-1, 1.5, NaN]) {
      const rows = ok.rows.map((r, i) => (i === 0 ? { ...r, age0to59: bad } : r))
      expect(validateInput({ ...ok, rows }).join(' ')).toContain('Anos: Age 0-59')
    }
  })

  it('rejects encoded > total PWDs and blank labels', () => {
    const prpwd = [{ label: 'X', referenceDate: null, totalPwds: 10, totalEncoded: 11 }, { label: ' ', referenceDate: null, totalPwds: 1, totalEncoded: 0 }]
    const errors = validateInput({ ...ok, prpwd })
    expect(errors.some((e) => e.includes('cannot exceed'))).toBe(true)
    expect(errors).toContain('PRPWD row 2 needs a label.')
  })

  it('allows one report per as-of date, but lets a report keep its own date', () => {
    expect(validateInput({ ...ok, id: undefined }, [report])[0]).toContain('already exists')
    expect(validateInput({ ...ok, id: report.id }, [report])).toEqual([])
  })

  it('needs all 14 barangays', () => {
    expect(validateInput({ ...ok, rows: ok.rows.slice(0, 13) })).toContain('A report needs all 14 barangays.')
  })
})

describe('audit summary', () => {
  it('lists what changed and the old → new total', () => {
    const before = inputFromReport(report)
    const after = { ...before, rows: before.rows.map((r) => (r.code === '001' ? { ...r, age0to59: 620 } : r)) }
    expect(describeChanges(before, after)).toBe('total 7,934 → 7,941; Anos 0-59 613 → 620')
    expect(describeChanges(null, after)).toContain('total 7,941')
  })
})

describe('CSV export', () => {
  const csv = buildCsv(report)
  const lines = csv.replace(/^﻿/, '').split('\r\n')

  it('is UTF-8 with a BOM so "Baños" opens correctly in Excel', () => {
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(lines[0]).toBe('Total Number Strength of Persons With Disabilities in Los Baños')
  })

  it('follows the official layout', () => {
    // fields containing a comma are quoted (standard CSV); Excel shows them without the quotes
    expect(lines[1]).toBe('"As of April 30, 2026"')
    expect(lines[2]).toBe('')
    expect(lines[3]).toBe('No.,Barangay,Age 0-59,Age 60-above,Total')
    expect(lines[4]).toBe('1,Anos,613,125,738')
    expect(lines[17]).toBe('14,Timugan,411,90,501')
    expect(lines[18]).toBe(',TOTAL,6727,1207,7934')
    expect(lines[19]).toBe('')
    expect(lines[20]).toBe('Label,Total PWDs,Total Encoded,Percentage')
    expect(lines[21]).toBe('"DOH PRPWD ENCODED (as of April 30, 2026)",7934,6869,87%')
    expect(lines[22]).toBe('"Request Overtime (as of February 14, 2024)",6110,1787,29%')
  })

  it('adds the share column only when analytics are requested', () => {
    expect(csv).not.toContain('Share of total')
    const withShare = buildCsv(report, { includeAnalytics: true })
    expect(withShare).toContain('No.,Barangay,Age 0-59,Age 60-above,Total,Share of total (%)')
    expect(withShare).toContain('1,Anos,613,125,738,9.3')
  })

  it('quotes commas and neutralises formulas', () => {
    const tricky = buildCsv({ ...report, rows: report.rows.map((r, i) => (i === 0 ? { ...r, name: 'A, "B"' } : r)), prpwd: [{ ...report.prpwd[0], label: '=1+1' }] })
    expect(tricky).toContain('"A, ""B"""')
    expect(tricky).toContain("'=1+1")
  })

  it('names the file by date', () => {
    expect(recapFileName(report, 'csv')).toBe('PWD_Recapitulation_LosBanos_2026-04-30.csv')
    expect(recapFileName(report, 'xlsx')).toBe('PWD_Recapitulation_LosBanos_2026-04-30.xlsx')
    expect(prpwdLabel({ label: 'A', referenceDate: null })).toBe('A')
  })
})

describe('Excel export', () => {
  const load = async (analytics = false) => {
    const wb = await buildWorkbook(report, { includeAnalytics: analytics })
    const buffer = await wb.xlsx.writeBuffer()
    const back = new ExcelJS.Workbook()
    await back.xlsx.load(buffer as ArrayBuffer)
    return back
  }

  it('has the two sheets (three with analytics) in order', async () => {
    expect((await load()).worksheets.map((w) => w.name)).toEqual(['Recapitulation', 'PRPWD Status'])
    expect((await load(true)).worksheets.map((w) => w.name)).toEqual(['Recapitulation', 'PRPWD Status', 'Analytics'])
  })

  it('lays out the table with live formulas for every total', async () => {
    const ws = (await load()).getWorksheet('Recapitulation')!
    expect(ws.getCell('A1').value).toBe('Total Number Strength of Persons With Disabilities in Los Baños')
    expect(ws.getCell('A1').isMerged).toBe(true)
    expect(ws.getCell('A2').value).toBe('As of April 30, 2026')
    expect(ws.getRow(4).values).toEqual([undefined, 'No.', 'Barangay', 'Age 0-59', 'Age 60-above', 'Total'])

    // typed counts stay numbers; the row total is =C+D
    expect(ws.getCell('C5').value).toBe(613)
    expect(ws.getCell('D5').value).toBe(125)
    expect(ws.getCell('E5').value).toMatchObject({ formula: 'C5+D5', result: 738 })
    expect(ws.getCell('E18').value).toMatchObject({ formula: 'C18+D18', result: 501 })

    // TOTAL row is =SUM(...) over the 14 rows
    expect(ws.getCell('A19').value).toBe('TOTAL')
    expect(ws.getCell('C19').value).toMatchObject({ formula: 'SUM(C5:C18)', result: 6727 })
    expect(ws.getCell('D19').value).toMatchObject({ formula: 'SUM(D5:D18)', result: 1207 })
    expect(ws.getCell('E19').value).toMatchObject({ formula: 'SUM(E5:E18)', result: 7934 })
    expect(ws.getCell('C19').font?.bold).toBe(true)
  })

  it('formats numbers, freezes the header and sets A4 portrait fit-to-width', async () => {
    const ws = (await load()).getWorksheet('Recapitulation')!
    expect(ws.getCell('C10').numFmt).toBe('#,##0')
    expect(ws.getCell('C10').alignment?.horizontal).toBe('right')
    expect(ws.getCell('B5').border?.bottom?.style).toBe('thin')
    expect(ws.views[0]).toMatchObject({ state: 'frozen', ySplit: 4 })
    expect(ws.pageSetup).toMatchObject({ paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1 })
    expect(ws.getColumn(2).width).toBeGreaterThan(10)
  })

  it('PRPWD sheet computes the percentage with a formula', async () => {
    const ps = (await load()).getWorksheet('PRPWD Status')!
    expect(ps.getCell('A5').value).toBe('DOH PRPWD ENCODED')
    expect(ps.getCell('B6').value).toBe('February 14, 2024')
    expect(ps.getCell('E5').value).toMatchObject({ formula: 'IF(C5=0,0,ROUND(D5/C5*100,0))', result: 87 })
    expect(ps.getCell('E6').value).toMatchObject({ result: 29 })
    expect(ps.getCell('F5').value).toMatchObject({ formula: 'C5-D5', result: 1065 })
  })

  it('analytics sheet is driven by formulas that point at the main sheet', async () => {
    const as = (await load(true)).getWorksheet('Analytics')!
    expect(as.getCell('C5').value).toMatchObject({ formula: 'Recapitulation!E5', result: 738 })
    expect(as.getCell('D5').value).toMatchObject({ formula: 'IF(Recapitulation!$E$19=0,0,C5/Recapitulation!$E$19)' })
    expect(as.getCell('F14').value).toMatchObject({ result: 1 }) // Mayondon (row 14) is the largest barangay
  })
})
