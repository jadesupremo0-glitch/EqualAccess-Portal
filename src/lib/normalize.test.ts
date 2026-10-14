import { describe, expect, it } from 'vitest'
import { normalizeRequest } from './normalize'
import type { AssistanceRequest } from '../data'

const request = (patch: Partial<AssistanceRequest>): AssistanceRequest => ({
  id: 'REQ-LB-2026-TEST01',
  pwdName: 'Test User',
  pwdId: 'PWD-LB-2026-0001',
  type: 'Medical Assistance',
  title: 'Test',
  description: 'I need help.',
  dateSubmitted: '2026-10-01',
  lastUpdated: '2026-10-01',
  status: 'Pending',
  assignedStaff: 'Unassigned',
  comments: [],
  timeline: [],
  ...patch,
})

describe('normalizeRequest', () => {
  it('moves a reason stored inside the description into its own field', () => {
    const r = normalizeRequest(request({ description: 'I need help.\n\nReason for request: My medicine\nis expensive.' }))
    expect(r.description).toBe('I need help.')
    expect(r.reason).toBe('My medicine\nis expensive.')
  })

  it('keeps the assistive device line in the description', () => {
    const r = normalizeRequest(request({ description: 'I need help.\n\nReason for request: Cannot walk far.\n\nAssistive device needed: Wheelchair' }))
    expect(r.description).toBe('I need help.\n\nAssistive device needed: Wheelchair')
    expect(r.reason).toBe('Cannot walk far.')
  })

  it('leaves current requests untouched', () => {
    const plain = request({})
    const split = request({ reason: 'Already separate', description: 'Text\n\nReason for request: quoted' })
    expect(normalizeRequest(plain)).toBe(plain)
    expect(normalizeRequest(split)).toBe(split)
  })
})
