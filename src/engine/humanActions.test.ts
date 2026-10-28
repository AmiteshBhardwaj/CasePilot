import { describe, expect, it } from 'vitest'
import type { CaseRecord, DocumentRecord } from '@/data/schemas'
import { recordDecision, recordDecisionWithUndertaking, verifyDocument } from './humanActions'

const now = new Date('2026-10-28T00:00:00Z')
const decisionCase: CaseRecord = {
  id: 'CP-2026-NR-04821', institutionId: 'inst-001', applicationType: 'Extension of Approval', title: 'Approval renewal', region: 'Northern',
  route: { steps: ['Authority Decision'], category: 'Only Scrutiny', ruleCode: 'RT-TEST', reason: 'Test route', version: '2026.1' },
  stages: [{ id: 's1', label: 'Authority Decision', status: 'In progress', enteredAt: now.toISOString(), dueAt: now.toISOString() }],
  currentStage: 'Authority Decision', status: 'On track', submittedAt: now.toISOString(), updatedAt: now.toISOString(), assignedOfficerId: 'off-11', returnedCount: 0, escalationLevel: 'None', evidenceVerified: false, isDemoData: true,
}
const document: DocumentRecord = { id: 'doc-001', institutionId: 'inst-001', name: 'Lease deed', kind: 'Lease deed', uploadedAt: now.toISOString(), verification: 'Pending', isDemoData: true }

describe('explicit human actions', () => {
  it('requires Authority role and records the officer name for decisions', () => {
    expect(() => recordDecision(decisionCase, { officerName: 'Ritika Anand', role: 'Regional Officer', decision: 'Approved', reason: 'Complete' }, now)).toThrow('competent Authority')
    const result = recordDecision(decisionCase, { officerName: 'Vikram Bedi', role: 'Authority', decision: 'Approved', reason: 'Statutory conditions satisfied.' }, now)
    expect(result.caseRecord.decision).toBe('Approved')
    expect(result.auditEvent.actorName).toBe('Vikram Bedi')
  })

  it('records evidence verification by a human official', () => {
    const result = verifyDocument(document, { officerName: 'Ritika Anand', role: 'Regional Officer', outcome: 'Verified' }, now)
    expect(result.document.verification).toBe('Verified')
    expect(result.document.verifiedBy).toBe('Ritika Anand')
    expect(result.auditEvent.actorRole).toBe('Regional Officer')
  })

  it('creates a linked undertaking as part of an explicit Authority approval', () => {
    const result = recordDecisionWithUndertaking(decisionCase, {
      officerName: 'Vikram Bedi', role: 'Authority', reason: 'Approval granted subject to faculty evidence.',
      undertakingTitle: 'Submit faculty qualification evidence', undertakingDueAt: new Date('2026-11-27T23:59:00Z'),
    }, now)
    expect(result.caseRecord.decision).toBe('Approved')
    expect(result.undertaking.caseId).toBe(decisionCase.id)
    expect(result.undertaking.status).toBe('Pending')
    expect(result.auditEvents.map((event) => event.actorName)).toEqual(['Vikram Bedi', 'Vikram Bedi'])
    expect(result.auditEvents.map((event) => event.action)).toContain('Approval undertaking created')
    expect(() => recordDecisionWithUndertaking(decisionCase, {
      officerName: 'Vikram Bedi', role: 'Authority', reason: 'Decision reason.',
      undertakingTitle: 'Expired condition', undertakingDueAt: now,
    }, now)).toThrow('must be after')
  })
})
