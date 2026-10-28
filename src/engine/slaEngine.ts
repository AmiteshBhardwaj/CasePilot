import { differenceInCalendarDays } from 'date-fns'
import type { Alert, AuditEvent, CaseRecord, RouteStep } from '@/data/schemas'
import { ENGINE_ACTOR, makeAuditEvent } from './audit'

export const stageTimelines: Record<RouteStep, number> = {
  Scrutiny: 12, EVC: 18, 'SAC/SHC': 15, 'Authority Decision': 10,
}

export type SlaEvaluation = { caseRecord: CaseRecord; ageDays: number; daysRemaining: number; status: CaseRecord['status'] }
export type SlaRun = { cases: CaseRecord[]; alerts: Alert[]; auditEvents: AuditEvent[] }

export function evaluateCaseSla(caseRecord: CaseRecord, now = new Date(), dueSoonWithinDays = 5): SlaEvaluation {
  const current = caseRecord.stages.find((stage) => stage.label === caseRecord.currentStage)
  const referenceDate = current?.enteredAt ?? caseRecord.submittedAt
  const ageDays = Math.max(0, differenceInCalendarDays(now, new Date(referenceDate)))
  const daysRemaining = current ? differenceInCalendarDays(new Date(current.dueAt), now) : 0
  const status: CaseRecord['status'] = caseRecord.status === 'Closed' ? 'Closed'
    : caseRecord.escalationLevel !== 'None' ? 'Escalated'
      : daysRemaining < 0 ? 'Overdue'
        : daysRemaining <= dueSoonWithinDays ? 'Due soon' : 'On track'
  return { caseRecord, ageDays, daysRemaining, status }
}

export function runSlaEngine(cases: CaseRecord[], now = new Date()): SlaRun {
  const alerts: Alert[] = []
  const auditEvents: AuditEvent[] = []
  const updated = cases.map((caseRecord) => {
    const result = evaluateCaseSla(caseRecord, now)
    if (result.status === caseRecord.status || result.status === 'Closed') return caseRecord
    const nextCase = { ...caseRecord, status: result.status, updatedAt: now.toISOString() }
    const action = `SLA status changed to ${result.status}`
    auditEvents.push(makeAuditEvent({
      id: `sla-audit:${caseRecord.id}:${result.status}`, at: now.toISOString(), ...ENGINE_ACTOR, action,
      entityType: 'Case', entityId: caseRecord.id, detail: `${caseRecord.id} entered ${result.status.toLowerCase()} status with ${result.daysRemaining} days remaining in ${caseRecord.currentStage}.`,
    }))
    if (result.status === 'Due soon' || result.status === 'Overdue') {
      alerts.push({
        id: `sla:${caseRecord.id}:${result.status}`, type: 'SLA', severity: result.status === 'Overdue' ? 'Critical' : 'Warning',
        title: result.status === 'Overdue' ? 'Stage SLA overdue' : 'Stage due soon',
        message: `${caseRecord.id} is ${result.status === 'Overdue' ? `${Math.abs(result.daysRemaining)} days past` : `due in ${result.daysRemaining} days`} its ${caseRecord.currentStage} timeline.`,
        caseId: caseRecord.id, createdAt: now.toISOString(), read: false, isDemoData: true,
        channels: ['In-app'],
      })
    }
    return nextCase
  })
  return { cases: updated, alerts, auditEvents }
}
