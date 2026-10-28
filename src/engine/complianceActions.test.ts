import { describe, expect, it } from 'vitest'
import type { Undertaking } from '@/data/schemas'
import { submitDocumentRenewal, submitUndertakingEvidence, verifyUndertakingEvidence } from './complianceActions'

const now = new Date('2026-10-28T09:00:00+05:30')
const undertaking: Undertaking = { id: 'und-001', institutionId: 'inst-001', title: 'Fire safety renewal undertaking', dueAt: '2026-11-15T00:00:00.000Z', status: 'Pending', }

describe('compliance actions', () => {
  it('keeps an undertaking open after submission until a named officer verifies it', () => {
    const submitted = submitUndertakingEvidence(undertaking, { actor: { name: 'Sanjay Prasad', role: 'Institution' }, evidenceName: 'fire-certificate.pdf', now })
    expect(submitted.undertaking.status).toBe('Submitted')
    expect(submitted.auditEvent.actorName).toBe('Sanjay Prasad')
    expect(() => verifyUndertakingEvidence(submitted.undertaking, { actor: { name: 'Prof. Shalini Rao', role: 'Committee' }, outcome: 'Verified', now })).toThrow(/authorized officer/i)
    const verified = verifyUndertakingEvidence(submitted.undertaking, { actor: { name: 'Ritika Anand', role: 'Regional Officer' }, outcome: 'Verified', now })
    expect(verified.undertaking.status).toBe('Accepted')
    expect(verified.undertaking.verifiedBy).toBe('Ritika Anand')
    expect(verified.auditEvent.entityType).toBe('Undertaking')
  })

  it('creates a pending renewal with an explicit human submission event', () => {
    const result = submitDocumentRenewal({ id: 'renewal-1', institutionId: 'inst-001', name: 'lease-renewal.pdf', kind: 'Lease deed', expiresAt: new Date('2030-10-28T23:59:00.000Z'), actor: { name: 'Sanjay Prasad', role: 'Institution' }, now })
    expect(result.document.verification).toBe('Pending')
    expect(result.document.expiresAt).toBe('2030-10-28T23:59:00.000Z')
    expect(result.auditEvent.actorName).toBe('Sanjay Prasad')
  })
})
