import { differenceInCalendarDays } from 'date-fns'
import type { Alert, AuditEvent, DocumentRecord, DocumentValidity, Undertaking, WorkflowRuleConfig } from '@/data/schemas'
import { ENGINE_ACTOR, makeAuditEvent } from './audit'

export type ComplianceRun = { alerts: Alert[]; auditEvents: AuditEvent[]; validity: DocumentValidity[]; undertakings: Undertaking[] }

export function documentValidity(document: DocumentRecord, now = new Date()): DocumentValidity | undefined {
  if (!document.expiresAt) return undefined
  const daysRemaining = differenceInCalendarDays(new Date(document.expiresAt), now)
  const state: DocumentValidity['state'] = daysRemaining < 0 ? 'Expired'
    : daysRemaining <= 7 ? 'Due in 7 days'
      : daysRemaining <= 15 ? 'Due in 15 days'
        : daysRemaining <= 30 ? 'Due in 30 days' : 'Valid'
  return { documentId: document.id, institutionId: document.institutionId, documentName: document.name, expiresAt: document.expiresAt, daysRemaining, state, verification: document.verification }
}

export function runComplianceEngine(documents: DocumentRecord[], undertakings: Undertaking[], now = new Date(), config?: Pick<WorkflowRuleConfig, 'complianceAlertDays' | 'complianceEscalationDays' | 'channels'>): ComplianceRun {
  const alerts: Alert[] = []
  const auditEvents: AuditEvent[] = []
  const validity: DocumentValidity[] = []
  const alertDays = [...(config?.complianceAlertDays ?? [30, 15, 7])].sort((a, b) => b - a)
  const escalationDays = config?.complianceEscalationDays ?? [7, 14, 21]
  const channels = config?.channels ?? ['In-app']
  const escalationFor = (daysPastDue: number): Alert['escalationLevel'] | undefined => daysPastDue >= escalationDays[2] ? 'Authority'
    : daysPastDue >= escalationDays[1] ? 'Bureau Officer'
      : daysPastDue >= escalationDays[0] ? 'Regional Officer' : undefined
  const addEscalation = (input: { id: string; name: string; institutionId: string; caseId?: string; dueAt: string; daysPastDue: number }) => {
    const escalationLevel = escalationFor(input.daysPastDue)
    if (!escalationLevel) return
    alerts.push({
      id: `compliance:${input.id}:escalated:${escalationLevel}`, type: 'Escalation', severity: escalationLevel === 'Authority' ? 'Critical' : 'Warning',
      title: `Compliance escalated to ${escalationLevel}`,
      message: `${input.name} is ${input.daysPastDue} days overdue; follow-up has moved to ${escalationLevel}.`,
      institutionId: input.institutionId, caseId: input.caseId, escalationLevel, dueAt: input.dueAt,
      createdAt: now.toISOString(), read: false, channels, isDemoData: true,
    })
  }
  for (const document of documents) {
    const state = documentValidity(document, now)
    if (state) {
      validity.push(state)
      const expired = state.daysRemaining < 0
      const threshold = alertDays.filter((days) => state.daysRemaining <= days).sort((a, b) => a - b)[0]
      if (expired || threshold !== undefined) {
        const window = expired ? 'overdue' : String(threshold)
        const message = expired ? `${document.name} expired ${Math.abs(state.daysRemaining)} days ago.` : `${document.name} expires in ${state.daysRemaining} days.`
        alerts.push({ id: `compliance:${document.id}:${window}`, type: 'Compliance', severity: expired || state.daysRemaining <= (alertDays.at(-1) ?? 7) ? 'Critical' : 'Warning', title: expired ? 'Document expired' : `Document expires within ${window} days`, message, institutionId: document.institutionId, caseId: document.caseId, createdAt: now.toISOString(), read: false, channels, isDemoData: true })
      }
      if (state.daysRemaining < 0 && document.expiresAt) addEscalation({ id: document.id, name: document.name, institutionId: document.institutionId, caseId: document.caseId, dueAt: document.expiresAt, daysPastDue: Math.abs(state.daysRemaining) })
    }
    if (document.verification === 'Pending' || document.verification === 'Needs clarification') {
      const message = `${document.name} has ${document.verification.toLowerCase()} evidence status and needs a human verification action.`
      alerts.push({ id: `evidence:${document.id}:${document.verification}`, type: 'Evidence', severity: 'Warning', title: 'Evidence needs review', message, institutionId: document.institutionId, caseId: document.caseId, createdAt: now.toISOString(), read: false, channels, isDemoData: true })
    }
  }
  const updatedUndertakings = undertakings.map((undertaking) => {
    if (undertaking.status === 'Accepted' || undertaking.status === 'Submitted') return undertaking
    const daysRemaining = differenceInCalendarDays(new Date(undertaking.dueAt), now)
    const overdue = daysRemaining < 0
    const nextStatus = overdue ? 'Overdue' as const : undertaking.status === 'Overdue' ? 'Pending' as const : undertaking.status
    if (overdue || daysRemaining >= 0 && alertDays.some((days) => daysRemaining <= days)) {
      const threshold = alertDays.filter((days) => daysRemaining <= days).sort((a, b) => a - b)[0]
      const alertLevel = overdue ? 'overdue' : String(threshold)
      const message = overdue ? `${undertaking.title} is ${Math.abs(daysRemaining)} days overdue.` : `${undertaking.title} is due in ${daysRemaining} days and remains open until human review accepts the evidence.`
      alerts.push({ id: `undertaking:${undertaking.id}:${alertLevel}`, type: 'Compliance', severity: overdue || daysRemaining <= (alertDays.at(-1) ?? 7) ? 'Critical' : 'Warning', title: overdue ? 'Undertaking overdue' : `Undertaking due within ${alertLevel} days`, message, institutionId: undertaking.institutionId, caseId: undertaking.caseId, createdAt: now.toISOString(), read: false, channels, isDemoData: true })
    }
    if (overdue) addEscalation({ id: undertaking.id, name: undertaking.title, institutionId: undertaking.institutionId, caseId: undertaking.caseId, dueAt: undertaking.dueAt, daysPastDue: Math.abs(daysRemaining) })
    if (nextStatus !== undertaking.status) {
      auditEvents.push(makeAuditEvent({ id: `undertaking-status:${undertaking.id}:${nextStatus}`, at: now.toISOString(), ...ENGINE_ACTOR, action: `Undertaking status changed to ${nextStatus}`, entityType: 'Undertaking', entityId: undertaking.id, detail: `${undertaking.title} passed its due date and remains open for institution response.` }))
    }
    return nextStatus === undertaking.status ? undertaking : { ...undertaking, status: nextStatus }
  })
  for (const alert of alerts) {
    const rawEntityId = alert.id.includes(':') ? alert.id.split(':').slice(1, 2)[0] : alert.id
    const isUndertaking = alert.id.startsWith('undertaking:') || undertakings.some((undertaking) => undertaking.id === rawEntityId)
    const entityType = isUndertaking ? 'Undertaking' : 'Document'
    const entityId = rawEntityId || alert.id
    const escalated = Boolean(alert.escalationLevel && alert.escalationLevel !== 'None')
    auditEvents.push(makeAuditEvent({
      id: `compliance-audit:${alert.id}`, at: now.toISOString(), ...ENGINE_ACTOR,
      action: escalated ? `Compliance item escalated to ${alert.escalationLevel}` : 'Compliance alert generated', entityType, entityId, detail: alert.message,
    }))
  }
  return { alerts, auditEvents, validity, undertakings: updatedUndertakings }
}
