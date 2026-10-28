import { differenceInCalendarDays } from 'date-fns'
import type { Alert, AuditEvent, DocumentRecord, DocumentValidity, Undertaking } from '@/data/schemas'
import { ENGINE_ACTOR, makeAuditEvent } from './audit'

export type ComplianceRun = { alerts: Alert[]; auditEvents: AuditEvent[]; validity: DocumentValidity[] }

export function documentValidity(document: DocumentRecord, now = new Date()): DocumentValidity | undefined {
  if (!document.expiresAt) return undefined
  const daysRemaining = differenceInCalendarDays(new Date(document.expiresAt), now)
  const state: DocumentValidity['state'] = daysRemaining < 0 ? 'Expired'
    : daysRemaining <= 7 ? 'Due in 7 days'
      : daysRemaining <= 15 ? 'Due in 15 days'
        : daysRemaining <= 30 ? 'Due in 30 days' : 'Valid'
  return { documentId: document.id, institutionId: document.institutionId, documentName: document.name, expiresAt: document.expiresAt, daysRemaining, state, verification: document.verification }
}

export function runComplianceEngine(documents: DocumentRecord[], undertakings: Undertaking[], now = new Date()): ComplianceRun {
  const alerts: Alert[] = []
  const auditEvents: AuditEvent[] = []
  const validity: DocumentValidity[] = []
  for (const document of documents) {
    const state = documentValidity(document, now)
    if (state) {
      validity.push(state)
      if (state.state !== 'Valid') {
        const expired = state.state === 'Expired'
        const threshold = state.state === 'Due in 30 days' ? '30' : state.state === 'Due in 15 days' ? '15' : state.state === 'Due in 7 days' ? '7' : 'overdue'
        const message = expired ? `${document.name} expired ${Math.abs(state.daysRemaining)} days ago.` : `${document.name} expires in ${state.daysRemaining} days.`
        alerts.push({ id: `compliance:${document.id}:${threshold}`, type: 'Compliance', severity: expired || state.daysRemaining <= 7 ? 'Critical' : 'Warning', title: expired ? 'Document expired' : `Document expires within ${threshold} days`, message, institutionId: document.institutionId, caseId: document.caseId, createdAt: now.toISOString(), read: false, channels: ['In-app'], isDemoData: true })
      }
    }
    if (document.verification === 'Pending' || document.verification === 'Needs clarification') {
      const message = `${document.name} has ${document.verification.toLowerCase()} evidence status and needs a human verification action.`
      alerts.push({ id: `evidence:${document.id}:${document.verification}`, type: 'Evidence', severity: 'Warning', title: 'Evidence needs review', message, institutionId: document.institutionId, caseId: document.caseId, createdAt: now.toISOString(), read: false, channels: ['In-app'], isDemoData: true })
    }
  }
  for (const undertaking of undertakings) {
    if (undertaking.status === 'Pending' && differenceInCalendarDays(now, new Date(undertaking.dueAt)) > 0) {
      const overdueDays = differenceInCalendarDays(now, new Date(undertaking.dueAt))
      const message = `${undertaking.title} is ${overdueDays} days overdue.`
      alerts.push({ id: `undertaking:${undertaking.id}:overdue`, type: 'Compliance', severity: 'Critical', title: 'Undertaking overdue', message, institutionId: undertaking.institutionId, caseId: undertaking.caseId, createdAt: now.toISOString(), read: false, channels: ['In-app'], isDemoData: true })
    }
  }
  for (const alert of alerts) {
    const isDocument = alert.id.startsWith('compliance:') || alert.id.startsWith('evidence:')
    const entityType = isDocument ? 'Document' : 'Undertaking'
    const entityId = alert.id.split(':')[1] ?? alert.id
    auditEvents.push(makeAuditEvent({ id: `compliance-audit:${alert.id}`, at: now.toISOString(), ...ENGINE_ACTOR, action: 'Compliance alert generated', entityType, entityId, detail: alert.message }))
  }
  return { alerts, auditEvents, validity }
}
