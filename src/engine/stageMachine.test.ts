import { describe, expect, it } from 'vitest'
import type { CaseRecord } from '@/data/schemas'
import { completeCurrentStage, returnCase, revertCase, resubmitReturnedCase } from './stageMachine'

const instant = new Date('2026-10-28T00:00:00Z')
const baseCase: CaseRecord = {
  id: 'CP-2026-NR-04821', institutionId: 'inst-001', applicationType: 'Extension of Approval', title: 'Approval renewal', region: 'Northern',
  route: { steps: ['Scrutiny', 'EVC', 'Authority Decision'], category: 'Scrutiny+EVC', ruleCode: 'RT-EOA-02', reason: 'Test route', version: '2026.1' },
  stages: [
    { id: 's1', label: 'Scrutiny', status: 'In progress', enteredAt: instant.toISOString(), dueAt: instant.toISOString() },
    { id: 's2', label: 'EVC', status: 'Queued', enteredAt: instant.toISOString(), dueAt: instant.toISOString() },
    { id: 's3', label: 'Authority Decision', status: 'Queued', enteredAt: instant.toISOString(), dueAt: instant.toISOString() },
  ], currentStage: 'Scrutiny', status: 'On track', submittedAt: instant.toISOString(), updatedAt: instant.toISOString(), assignedOfficerId: 'off-01', returnedCount: 0, escalationLevel: 'None', evidenceVerified: false,
}

describe('stageMachine', () => {
  it('advances to the next stage and emits a named human audit event', () => {
    const result = completeCurrentStage(baseCase, { name: 'Ritika Anand', role: 'Regional Officer' }, instant)
    expect(result.caseRecord.currentStage).toBe('EVC')
    expect(result.caseRecord.stages[0].status).toBe('Completed')
    expect(result.caseRecord.stages[1].status).toBe('In progress')
    expect(result.auditEvent.actorName).toBe('Ritika Anand')
    expect(() => completeCurrentStage(baseCase, { name: 'Sanjay Prasad', role: 'Institution' }, instant)).toThrow('not authorized')
  })

  it('requires an authorized role and reason to return; institution can resubmit', () => {
    expect(() => returnCase(baseCase, { name: 'Sanjay Prasad', role: 'Institution' }, 'missing evidence', instant)).toThrow('not authorized')
    expect(() => returnCase(baseCase, { name: 'Ritika Anand', role: 'Regional Officer' }, '  ', instant)).toThrow('reason is required')
    const returned = returnCase(baseCase, { name: 'Ritika Anand', role: 'Regional Officer' }, 'Upload the signed plan.', instant)
    expect(returned.caseRecord.returnedCount).toBe(1)
    expect(returned.caseRecord.stages[0].status).toBe('Returned')
    const resubmitted = resubmitReturnedCase(returned.caseRecord, { name: 'Sanjay Prasad', role: 'Institution' }, instant)
    expect(resubmitted.caseRecord.stages[0].status).toBe('In progress')
    expect(resubmitted.auditEvent.actorName).toBe('Sanjay Prasad')
  })

  it('rejects illegal stage transitions and permits authorized revert only to an earlier route step', () => {
    expect(() => completeCurrentStage({ ...baseCase, stages: baseCase.stages.map((stage) => ({ ...stage, status: 'Queued' })) }, { name: 'Ritika Anand', role: 'Regional Officer' }, instant)).toThrow('not ready')
    const atEvc = { ...baseCase, currentStage: 'EVC' as const, stages: baseCase.stages.map((stage) => stage.id === 's1' ? { ...stage, status: 'Completed' as const } : stage.id === 's2' ? { ...stage, status: 'In progress' as const } : stage) }
    expect(() => revertCase(atEvc, { name: 'Ritika Anand', role: 'Regional Officer' }, 'Scrutiny', 'recheck', instant)).toThrow('not authorized')
    expect(revertCase(atEvc, { name: 'Dr. A. K. Sinha', role: 'Bureau Officer' }, 'Scrutiny', 'Reconcile certificate dates.', instant).caseRecord.currentStage).toBe('Scrutiny')
  })
})
