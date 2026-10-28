import { describe, expect, it } from 'vitest'
import type { DocumentRecord, Undertaking } from '@/data/schemas'
import { documentValidity, runComplianceEngine } from './complianceEngine'

const now = new Date('2026-10-28T00:00:00Z')
const document: DocumentRecord = { id: 'doc-001', institutionId: 'inst-001', name: 'Registered lease deed', kind: 'Lease deed', uploadedAt: '2026-01-01T00:00:00Z', expiresAt: '2026-11-02T00:00:00Z', verification: 'Pending', }
const undertaking: Undertaking = { id: 'und-001', institutionId: 'inst-001', title: 'Fire safety renewal undertaking', dueAt: '2026-10-20T00:00:00Z', status: 'Pending', }

describe('complianceEngine', () => {
  it('assigns the seven-day document expiry band', () => {
    expect(documentValidity(document, now)?.state).toBe('Due in 7 days')
  })

  it('alerts on expiry, unverified evidence and overdue undertakings', () => {
    const result = runComplianceEngine([document], [undertaking], now)
    expect(result.alerts.map((alert) => alert.type)).toEqual(expect.arrayContaining(['Compliance', 'Evidence']))
    expect(result.alerts.some((alert) => alert.message.includes('overdue'))).toBe(true)
    expect(result.auditEvents).toHaveLength(result.alerts.length + 1)
    expect(result.auditEvents.some((event) => event.entityType === 'Document' && event.entityId === 'doc-001')).toBe(true)
    expect(result.auditEvents.some((event) => event.entityType === 'Undertaking' && event.entityId === 'und-001')).toBe(true)
  })

  it('uses active reminder windows and notification channels during reevaluation', () => {
    const dueSoon = { ...document, verification: 'Verified' as const, expiresAt: '2026-11-05T00:00:00Z' }
    const result = runComplianceEngine([dueSoon], [], now, { complianceAlertDays: [60, 30, 10], complianceEscalationDays: [7, 14, 21], channels: ['In-app', 'Email'] })
    expect(result.alerts[0].title).toBe('Document expires within 10 days')
    expect(result.alerts[0].channels).toEqual(['In-app', 'Email'])
    expect(result.auditEvents[0].actorRole).toBe('System')
  })

  it('escalates expired documents and undertakings through configured levels with audit events', () => {
    const expiredDocument = { ...document, verification: 'Verified' as const, expiresAt: '2026-10-10T00:00:00Z' }
    const oldUndertaking = { ...undertaking, dueAt: '2026-10-10T00:00:00Z' }
    const result = runComplianceEngine([expiredDocument], [oldUndertaking], now, {
      complianceAlertDays: [30, 15, 7], complianceEscalationDays: [3, 6, 9], channels: ['In-app'],
    })
    const escalations = result.alerts.filter((alert) => alert.type === 'Escalation')
    expect(escalations).toHaveLength(2)
    expect(escalations.every((alert) => alert.escalationLevel === 'Authority')).toBe(true)
    expect(result.auditEvents.filter((event) => event.action === 'Compliance item escalated to Authority')).toHaveLength(2)
    expect(result.auditEvents.every((event) => event.actorRole === 'System')).toBe(true)
  })
})
