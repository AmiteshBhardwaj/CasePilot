import { describe, expect, it } from 'vitest'
import type { CaseRecord, EscalationRule } from '@/data/schemas'
import { escalationLevelForAge, runEscalationEngine } from './escalationEngine'

const rule: EscalationRule = { stage: 'EVC', regionalAfterDays: 5, bureauAfterDays: 9, authorityAfterDays: 14 }
const caseRecord: CaseRecord = {
  id: 'CP-2026-SR-04822', institutionId: 'inst-002', applicationType: 'Extension of Approval', title: 'Approval renewal', region: 'Southern',
  route: { steps: ['Scrutiny', 'EVC', 'Authority Decision'], category: 'Scrutiny+EVC', ruleCode: 'RT-EOA-02', reason: 'Test route', version: '2026.1' },
  stages: [{ id: 's2', label: 'EVC', status: 'In progress', enteredAt: '2026-10-01T00:00:00Z', dueAt: '2026-10-20T00:00:00Z' }],
  currentStage: 'EVC', status: 'Overdue', submittedAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z', assignedOfficerId: 'off-02', returnedCount: 0, escalationLevel: 'None', evidenceVerified: true,
}

describe('escalationEngine', () => {
  it('walks the configurable escalation ladder', () => {
    expect(escalationLevelForAge(4, rule)).toBe('None')
    expect(escalationLevelForAge(5, rule)).toBe('Regional Officer')
    expect(escalationLevelForAge(9, rule)).toBe('Bureau Officer')
    expect(escalationLevelForAge(14, rule)).toBe('Authority')
  })

  it('updates case level and emits both alert and audit event', () => {
    const result = runEscalationEngine([caseRecord], new Date('2026-10-11T00:00:00Z'), [rule])
    expect(result.cases[0].escalationLevel).toBe('Bureau Officer')
    expect(result.alerts[0].type).toBe('Escalation')
    expect(result.auditEvents[0].action).toContain('Bureau Officer')
  })
})
