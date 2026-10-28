import { describe, expect, it } from 'vitest'
import type { CaseRecord, DocumentRecord } from '@/data/schemas'
import { recordDecision, verifyDocument } from './humanActions'

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
})
