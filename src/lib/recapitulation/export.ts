import { DISABILITY_FIELDS, DISABILITY_REPORT_TITLE, disabilityRowTotal, formatAsOf, rowTotal, sharePercent, sumDisabilityRows, sumRows } from './compute'
import { AGE_GROUPS, AGE_GROUP_LABEL, type RecapReport } from './types'

/**
 * CSV and Excel export of one recapitulation snapshot. Both are built from the saved report the admin is
 * looking at (totals and percentages come from the database), so the files always match the screen.
 */

export interface ExportOptions {
  /** Add the share-of-total analytics (an extra CSV column, and a third "Analytics" sheet in Excel). */
  includeAnalytics?: boolean
}

export const CSV_MIME = 'text/csv;charset=utf-8'
export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/** PWD_Recapitulation_LosBanos_2026-04-30.csv */
export const recapFileName = (report: Pick<RecapReport, 'asOfDate'>, ext: 'csv' | 'xlsx'): string =>
  `PWD_Recapitulation_LosBanos_${report.asOfDate}.${ext}`

/** "DOH PRPWD ENCODED (as of April 30, 2026)" — the label as shown on screen. */
export const prpwdLabel = (p: { label: string; referenceDate: string | null }): string =>
  p.referenceDate ? `${p.label} (as of ${formatAsOf(p.referenceDate)})` : p.label

// ── CSV ────────────────────────────────────────────────────────────

/**
 * Quote a field when needed. Text that a spreadsheet would run as a formula (= + - @) is prefixed with an
 * apostrophe, so an edited label can never execute when the file is opened.
 */
function csvField(value: string | number): string {
  let s = String(value)
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const csvLine = (cells: (string | number)[]): string => cells.map(csvField).join(',')

/** UTF-8 with a byte-order mark, so Excel shows "Baños" correctly. Lines end in CRLF. */
export function buildCsv(report: RecapReport, options: ExportOptions = {}): string {
  const analytics = options.includeAnalytics ?? false
  const totals = sumRows(report.rows)
  const lines: string[] = []

  lines.push(csvLine([report.title]))
  lines.push(csvLine([`As of ${formatAsOf(report.asOfDate)}`]))
  lines.push('')

  lines.push(csvLine(['No.', 'Barangay', 'Age 0-59', 'Age 60-above', 'Total', ...(analytics ? ['Share of total (%)'] : [])]))
  report.rows.forEach((r, i) => {
    lines.push(csvLine([i + 1, r.name, r.age0to59, r.age60above, rowTotal(r), ...(analytics ? [sharePercent(rowTotal(r), totals.total)] : [])]))
  })
  lines.push(csvLine(['', 'TOTAL', totals.age0to59, totals.age60above, totals.total, ...(analytics ? [totals.total > 0 ? 100 : 0] : [])]))

  lines.push('')
  lines.push(csvLine(['Label', 'Total PWDs', 'Total Encoded', 'Percentage']))
  for (const p of report.prpwd) lines.push(csvLine([prpwdLabel(p), p.totalPwds, p.totalEncoded, `${p.percentage}%`]))

  return '﻿' + lines.join('\r\n') + '\r\n'
}

// ── Excel ──────────────────────────────────────────────────────────

/** Rough auto-fit: the longest text in each column, plus padding. */
function fitColumns(ws: import('exceljs').Worksheet, fromRow: number, widths: number[]): void {
  ws.eachRow((row, rowNumber) => {
    if (rowNumber < fromRow) return
    row.eachCell((cell, col) => {
      if (cell.isMerged && cell.master !== cell) return
      const v = cell.value
      const text = v == null ? '' : typeof v === 'object' ? String((v as { result?: unknown }).result ?? '') : String(v)
      widths[col - 1] = Math.max(widths[col - 1] ?? 0, text.length)
    })
  })
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = Math.max(8, Math.min(60, w + 3))
  })
}

/** Workbook: "Recapitulation" (live formulas), "PRPWD Status", and optionally "Analytics". */
export async function buildWorkbook(report: RecapReport, options: ExportOptions = {}): Promise<import('exceljs').Workbook> {
  // Loaded on demand: the library is large and only admins who export ever need it.
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = 'EqualAccess Portal — PDAO Los Baños'
  wb.created = new Date()

  const thin = { style: 'thin' as const, color: { argb: 'FF475569' } }
  const border = { top: thin, left: thin, bottom: thin, right: thin }
  const headerFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFE2E8F0' } }
  const totalFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFF1F5F9' } }
  const NUMBER = '#,##0'
  const asOfText = `As of ${formatAsOf(report.asOfDate)}`
  const a4 = {
    paperSize: 9,
    orientation: 'portrait' as const,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
  }

  const titleBlock = (ws: import('exceljs').Worksheet, title: string, lastCol: string) => {
    ws.mergeCells(`A1:${lastCol}1`)
    ws.getCell('A1').value = title
    ws.getCell('A1').font = { bold: true, size: 14 }
    ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    ws.getRow(1).height = 34
    ws.mergeCells(`A2:${lastCol}2`)
    ws.getCell('A2').value = asOfText
    ws.getCell('A2').font = { italic: true, size: 11 }
    ws.getCell('A2').alignment = { horizontal: 'center' }
  }

  const headerRow = (ws: import('exceljs').Worksheet, rowNumber: number, labels: string[], numericFrom: number) => {
    const row = ws.getRow(rowNumber)
    labels.forEach((label, i) => {
      const c = row.getCell(i + 1)
      c.value = label
      c.font = { bold: true }
      c.fill = headerFill
      c.border = border
      c.alignment = { horizontal: i + 1 >= numericFrom ? 'right' : i === 0 ? 'center' : 'left', vertical: 'middle', wrapText: true }
    })
    row.height = 22
  }

  // ── Sheet 1: Recapitulation ──
  const ws = wb.addWorksheet('Recapitulation', { pageSetup: a4, views: [{ state: 'frozen', ySplit: 4 }] })
  titleBlock(ws, report.title, 'E')
  headerRow(ws, 4, ['No.', 'Barangay', 'Age 0-59', 'Age 60-above', 'Total'], 3)

  const first = 5
  const last = first + report.rows.length - 1
  report.rows.forEach((r, i) => {
    const n = first + i
    const row = ws.getRow(n)
    row.getCell(1).value = i + 1
    row.getCell(2).value = r.name
    row.getCell(3).value = r.age0to59
    row.getCell(4).value = r.age60above
    // The row total is a live formula, so editing a count in Excel updates it.
    row.getCell(5).value = { formula: `C${n}+D${n}`, result: rowTotal(r) }
    for (let c = 1; c <= 5; c++) {
      const cell = row.getCell(c)
      cell.border = border
      if (c === 1) cell.alignment = { horizontal: 'center' }
      if (c >= 3) {
        cell.numFmt = NUMBER
        cell.alignment = { horizontal: 'right' }
      }
    }
  })

  const totals = sumRows(report.rows)
  const totalRowNumber = last + 1
  const totalRow = ws.getRow(totalRowNumber)
  ws.mergeCells(`A${totalRowNumber}:B${totalRowNumber}`)
  totalRow.getCell(1).value = 'TOTAL'
  totalRow.getCell(1).alignment = { horizontal: 'center' }
  const sums: [number, string, number][] = [
    [3, 'C', totals.age0to59],
    [4, 'D', totals.age60above],
    [5, 'E', totals.total],
  ]
  for (const [col, letter, result] of sums) {
    totalRow.getCell(col).value = { formula: `SUM(${letter}${first}:${letter}${last})`, result }
    totalRow.getCell(col).numFmt = NUMBER
    totalRow.getCell(col).alignment = { horizontal: 'right' }
  }
  for (let c = 1; c <= 5; c++) {
    const cell = totalRow.getCell(c)
    cell.font = { bold: true }
    cell.fill = totalFill
    cell.border = border
  }
  fitColumns(ws, 4, [])
  ws.getColumn(1).width = 8

  // ── Sheet 2: PRPWD Status ──
  const ps = wb.addWorksheet('PRPWD Status', { pageSetup: a4, views: [{ state: 'frozen', ySplit: 4 }] })
  titleBlock(ps, 'DOH PRPWD Encoding Status', 'F')
  headerRow(ps, 4, ['Label', 'Reference date', 'Total PWDs', 'Total Encoded', 'Percentage', 'Not yet encoded'], 3)
  report.prpwd.forEach((p, i) => {
    const n = 5 + i
    const row = ps.getRow(n)
    row.getCell(1).value = p.label
    row.getCell(2).value = p.referenceDate ? formatAsOf(p.referenceDate) : ''
    row.getCell(3).value = p.totalPwds
    row.getCell(4).value = p.totalEncoded
    // round(encoded / total × 100), 0 when there are no PWDs — the same rule the database uses.
    row.getCell(5).value = { formula: `IF(C${n}=0,0,ROUND(D${n}/C${n}*100,0))`, result: p.percentage }
    row.getCell(6).value = { formula: `C${n}-D${n}`, result: p.totalPwds - p.totalEncoded }
    for (let c = 1; c <= 6; c++) {
      const cell = row.getCell(c)
      cell.border = border
      if (c >= 3) cell.alignment = { horizontal: 'right' }
    }
    row.getCell(3).numFmt = NUMBER
    row.getCell(4).numFmt = NUMBER
    row.getCell(5).numFmt = '0"%"'
    row.getCell(6).numFmt = NUMBER
  })
  fitColumns(ps, 4, [])

  // ── Sheet 3: Analytics (optional) ──
  if (options.includeAnalytics) {
    const as = wb.addWorksheet('Analytics', { pageSetup: a4, views: [{ state: 'frozen', ySplit: 4 }] })
    titleBlock(as, `${report.title} — Analytics`, 'F')
    headerRow(as, 4, ['No.', 'Barangay', 'Total', 'Share of total', '60-above share', 'Rank'], 3)
    const grand = `Recapitulation!$E$${totalRowNumber}`
    report.rows.forEach((r, i) => {
      const n = 5 + i
      const src = first + i
      const t = rowTotal(r)
      const row = as.getRow(n)
      row.getCell(1).value = i + 1
      row.getCell(2).value = r.name
      row.getCell(3).value = { formula: `Recapitulation!E${src}`, result: t }
      row.getCell(4).value = { formula: `IF(${grand}=0,0,C${n}/${grand})`, result: totals.total > 0 ? t / totals.total : 0 }
      row.getCell(5).value = { formula: `IF(C${n}=0,0,Recapitulation!D${src}/C${n})`, result: t > 0 ? r.age60above / t : 0 }
      row.getCell(6).value = { formula: `RANK(C${n},$C$5:$C$${4 + report.rows.length})`, result: 1 + report.rows.filter((o) => rowTotal(o) > t).length }
      for (let c = 1; c <= 6; c++) {
        const cell = row.getCell(c)
        cell.border = border
        if (c === 1) cell.alignment = { horizontal: 'center' }
        if (c >= 3) cell.alignment = { horizontal: 'right' }
      }
      row.getCell(3).numFmt = NUMBER
      row.getCell(4).numFmt = '0.0%'
      row.getCell(5).numFmt = '0.0%'
    })
    fitColumns(as, 4, [])
    as.getColumn(1).width = 8
  }

  return wb
}

export async function buildXlsx(report: RecapReport, options: ExportOptions = {}): Promise<Blob> {
  const wb = await buildWorkbook(report, options)
  const buffer = await wb.xlsx.writeBuffer()
  return new Blob([buffer], { type: XLSX_MIME })
}

// ── Disability Data (age × sex, by disability type) ─────────────────
// A separate export pipeline from the barangay recap above: its own file, its own sheet, its own
// two-level (age group → Female/Male) header. Kept apart so the barangay CSV/Excel layout never
// shifts when this section changes.

/** Disability_Data_LosBanos_2026-04-30.csv */
export const disabilityFileName = (report: Pick<RecapReport, 'asOfDate'>, ext: 'csv' | 'xlsx'): string =>
  `Disability_Data_LosBanos_${report.asOfDate}.${ext}`

const AGE_SEX_PAIRS = AGE_GROUPS.flatMap((g) => [
  { group: g, sex: 'Female' as const, key: DISABILITY_FIELDS[g].female },
  { group: g, sex: 'Male' as const, key: DISABILITY_FIELDS[g].male },
])

export function buildDisabilityCsv(report: RecapReport): string {
  const totals = sumDisabilityRows(report.disabilityRows)
  const lines: string[] = []

  lines.push(csvLine([DISABILITY_REPORT_TITLE]))
  lines.push(csvLine([`As of ${formatAsOf(report.asOfDate)}`]))
  lines.push('')

  // Two header lines emulate the merged age-group header: the group name once, then Female/Male.
  lines.push(csvLine(['No.', 'Type of Disability', ...AGE_GROUPS.flatMap((g) => [AGE_GROUP_LABEL[g], '']), 'TOTAL']))
  lines.push(csvLine(['', '', ...AGE_SEX_PAIRS.map((p) => p.sex), '']))
  report.disabilityRows.forEach((r, i) => {
    lines.push(csvLine([i + 1, r.disabilityType, ...AGE_SEX_PAIRS.map((p) => r[p.key]), disabilityRowTotal(r)]))
  })
  lines.push(csvLine(['', 'TOTAL', ...AGE_SEX_PAIRS.map((p) => report.disabilityRows.reduce((a, r) => a + r[p.key], 0)), totals.grandTotal]))

  return '﻿' + lines.join('\r\n') + '\r\n'
}

/** Workbook with one sheet, "Disability Data", A4 landscape (the official sheet is wide: 11 columns). */
export async function buildDisabilityWorkbook(report: RecapReport): Promise<import('exceljs').Workbook> {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = 'EqualAccess Portal — PDAO Los Baños'
  wb.created = new Date()

  const thin = { style: 'thin' as const, color: { argb: 'FF475569' } }
  const border = { top: thin, left: thin, bottom: thin, right: thin }
  const headerFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFE2E8F0' } }
  const totalFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFF1F5F9' } }
  const NUMBER = '#,##0'
  const lastCol = 'K' // No. | Type | 4 age groups × 2 sexes (8 cols) | TOTAL = 11 columns

  const ws = wb.addWorksheet('Disability Data', {
    pageSetup: {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
    },
    views: [{ state: 'frozen', ySplit: 5 }],
  })

  ws.mergeCells(`A1:${lastCol}1`)
  ws.getCell('A1').value = DISABILITY_REPORT_TITLE
  ws.getCell('A1').font = { bold: true, size: 14 }
  ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(1).height = 30
  ws.mergeCells(`A2:${lastCol}2`)
  ws.getCell('A2').value = `As of ${formatAsOf(report.asOfDate)}`
  ws.getCell('A2').font = { italic: true, size: 11 }
  ws.getCell('A2').alignment = { horizontal: 'center' }
  ws.mergeCells(`A3:${lastCol}3`)
  ws.getCell('A3').value = 'Based on the Encoded Data from LGU Masterlist'
  ws.getCell('A3').font = { size: 10, color: { argb: 'FF1E40AF' } }
  ws.getCell('A3').alignment = { horizontal: 'center' }

  // Two-level header: row 4 has "No.", "Type of Disability" and each age group merged over 2 columns;
  // row 5 spells out Female / Male under every age group.
  ws.mergeCells('A4:A5')
  ws.mergeCells('B4:B5')
  ws.getCell('A4').value = 'No.'
  ws.getCell('B4').value = 'Type of Disability'
  AGE_GROUPS.forEach((g, i) => {
    const start = 3 + i * 2
    const startCol = ws.getColumn(start).letter
    const endCol = ws.getColumn(start + 1).letter
    ws.mergeCells(`${startCol}4:${endCol}4`)
    ws.getCell(`${startCol}4`).value = AGE_GROUP_LABEL[g]
    ws.getCell(`${startCol}5`).value = 'Female'
    ws.getCell(`${endCol}5`).value = 'Male'
  })
  ws.mergeCells('K4:K5')
  ws.getCell('K4').value = 'TOTAL'
  for (const addr of ['A4', 'B4', 'C4', 'E4', 'G4', 'I4', 'K4', 'C5', 'D5', 'E5', 'F5', 'G5', 'H5', 'I5', 'J5']) {
    const cell = ws.getCell(addr)
    cell.font = { bold: true }
    cell.fill = headerFill
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  }
  for (let r = 4; r <= 5; r++) for (let c = 1; c <= 11; c++) ws.getRow(r).getCell(c).border = border
  ws.getRow(4).height = 22
  ws.getRow(5).height = 18

  const first = 6
  report.disabilityRows.forEach((row, i) => {
    const n = first + i
    const wsRow = ws.getRow(n)
    wsRow.getCell(1).value = i + 1
    wsRow.getCell(2).value = row.disabilityType
    AGE_SEX_PAIRS.forEach((p, j) => {
      wsRow.getCell(3 + j).value = row[p.key]
    })
    wsRow.getCell(11).value = { formula: `SUM(C${n}:J${n})`, result: disabilityRowTotal(row) }
    for (let c = 1; c <= 11; c++) {
      const cell = wsRow.getCell(c)
      cell.border = border
      if (c === 1) cell.alignment = { horizontal: 'center' }
      if (c >= 3) {
        cell.numFmt = NUMBER
        cell.alignment = { horizontal: 'right' }
      }
    }
  })

  const last = first + report.disabilityRows.length - 1
  const totalRowNumber = last + 1
  const totalRow = ws.getRow(totalRowNumber)
  ws.mergeCells(`A${totalRowNumber}:B${totalRowNumber}`)
  totalRow.getCell(1).value = 'TOTAL'
  totalRow.getCell(1).alignment = { horizontal: 'center' }
  AGE_SEX_PAIRS.forEach((p, j) => {
    const c = 3 + j
    const letter = ws.getColumn(c).letter
    totalRow.getCell(c).value = { formula: `SUM(${letter}${first}:${letter}${last})`, result: report.disabilityRows.reduce((a, r) => a + r[p.key], 0) }
  })
  totalRow.getCell(11).value = { formula: `SUM(K${first}:K${last})`, result: sumDisabilityRows(report.disabilityRows).grandTotal }
  for (let c = 1; c <= 11; c++) {
    const cell = totalRow.getCell(c)
    cell.font = { bold: true }
    cell.fill = totalFill
    cell.border = border
    if (c >= 3) {
      cell.numFmt = NUMBER
      cell.alignment = { horizontal: 'right' }
    }
  }
  fitColumns(ws, 6, [])
  ws.getColumn(1).width = 6
  ws.getColumn(2).width = 26

  return wb
}

export async function buildDisabilityXlsx(report: RecapReport): Promise<Blob> {
  const wb = await buildDisabilityWorkbook(report)
  const buffer = await wb.xlsx.writeBuffer()
  return new Blob([buffer], { type: XLSX_MIME })
}

// ── Download ───────────────────────────────────────────────────────

/** Hand a file to the browser's download flow. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadCsv(report: RecapReport, options: ExportOptions = {}): void {
  downloadBlob(new Blob([buildCsv(report, options)], { type: CSV_MIME }), recapFileName(report, 'csv'))
}

export async function downloadXlsx(report: RecapReport, options: ExportOptions = {}): Promise<void> {
  downloadBlob(await buildXlsx(report, options), recapFileName(report, 'xlsx'))
}

export function downloadDisabilityCsv(report: RecapReport): void {
  downloadBlob(new Blob([buildDisabilityCsv(report)], { type: CSV_MIME }), disabilityFileName(report, 'csv'))
}

export async function downloadDisabilityXlsx(report: RecapReport): Promise<void> {
  downloadBlob(await buildDisabilityXlsx(report), disabilityFileName(report, 'xlsx'))
}
