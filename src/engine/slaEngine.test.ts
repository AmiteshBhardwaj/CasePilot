import { describe, expect, it } from 'vitest'
import type { CaseRecord } from '@/data/schemas'
import { evaluateCaseSla, runSlaEngine } from './slaEngine'

const now = new Date('2026-10-28T00:00:00Z')
const caseRecord: CaseRecord = {
  id: 'CP-2026-NR-04821', institutionId: 'inst-001', applicationType: 'Extension of Approval', title: 'Approval renewal', region: 'Northern',
  route: { steps: ['Scrutiny', 'EVC', 'Authority Decision'], category: 'Scrutiny+EVC', ruleCode: 'RT-EOA-02', reason: 'Test route', version: '2026.1' },
  stages: [{ id: 's1', label: 'Scrutiny', status: 'In progress', enteredAt: '2026-10-10T00:00:00Z', dueAt: '2026-10-31T00:00:00Z' }],
  currentStage: 'Scrutiny', status: 'On track', submittedAt: '2026-10-10T00:00:00Z', updatedAt: now.toISOString(), assignedOfficerId: 'off-01', returnedCount: 0, escalationLevel: 'None', evidenceVerified: false,
}

describe('slaEngine', () => {
  it('calculates ageing and due-soon state using the injected clock', () => {
    const result = evaluateCaseSla(caseRecord, now)
    expect(result.ageDays).toBe(18)
    expect(result.daysRemaining).toBe(3)
    expect(result.status).toBe('Due soon')
  })

  it('emits an alert and audit event when the case enters overdue status', () => {
    const overdue = { ...caseRecord, stages: [{ ...caseRecord.stages[0], dueAt: '2026-10-27T00:00:00Z' }] }
    const result = runSlaEngine([overdue], now)
    expect(result.cases[0].status).toBe('Overdue')
    expect(result.alerts[0].type).toBe('SLA')
    expect(result.auditEvents[0].actorRole).toBe('System')
  })

  it('uses an approved timeline override during the next evaluation', () => {
    const result = runSlaEngine([caseRecord], now, { Scrutiny: 6, EVC: 18, 'SAC/SHC': 15, 'Authority Decision': 10 })
    expect(result.cases[0].status).toBe('Overdue')
    expect(result.cases[0].stages[0].dueAt).toBe('2026-10-16T00:00:00.000Z')
    expect(result.auditEvents.length).toBeGreaterThan(0)
  })
})
