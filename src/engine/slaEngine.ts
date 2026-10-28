import { addDays, differenceInCalendarDays } from 'date-fns'
import type { Alert, AuditEvent, CaseRecord, RouteStep, WorkflowRuleConfig } from '@/data/schemas'
import { ENGINE_ACTOR, makeAuditEvent } from './audit'

export const stageTimelines: Record<RouteStep, number> = {
  Scrutiny: 12, EVC: 18, 'SAC/SHC': 15, 'Authority Decision': 10,
}

export type SlaEvaluation = { caseRecord: CaseRecord; ageDays: number; daysRemaining: number; status: CaseRecord['status'] }
export type SlaRun = { cases: CaseRecord[]; alerts: Alert[]; auditEvents: AuditEvent[] }

export function evaluateCaseSla(caseRecord: CaseRecord, now = new Date(), dueSoonWithinDays = 5, timelines: WorkflowRuleConfig['stageTimelines'] = stageTimelines): SlaEvaluation {
  const current = caseRecord.stages.find((stage) => stage.label === caseRecord.currentStage)
  const referenceDate = current?.enteredAt ?? caseRecord.submittedAt
  const ageDays = Math.max(0, differenceInCalendarDays(now, new Date(referenceDate)))
  const configuredDays = current ? timelines[current.label] ?? stageTimelines[current.label] : undefined
  const dueAt = current ? configuredDays === stageTimelines[current.label] ? new Date(current.dueAt) : addDays(new Date(current.enteredAt), configuredDays ?? stageTimelines[current.label]) : undefined
  const daysRemaining = dueAt ? differenceInCalendarDays(dueAt, now) : 0
  const status: CaseRecord['status'] = caseRecord.status === 'Closed' ? 'Closed'
    : caseRecord.escalationLevel !== 'None' ? 'Escalated'
      : daysRemaining < 0 ? 'Overdue'
        : daysRemaining <= dueSoonWithinDays ? 'Due soon' : 'On track'
  return { caseRecord, ageDays, daysRemaining, status }
}

export function runSlaEngine(cases: CaseRecord[], now = new Date(), timelines: WorkflowRuleConfig['stageTimelines'] = stageTimelines, channels: WorkflowRuleConfig['channels'] = ['In-app']): SlaRun {
  const alerts: Alert[] = []
  const auditEvents: AuditEvent[] = []
  const updated = cases.map((caseRecord) => {
    const result = evaluateCaseSla(caseRecord, now, 5, timelines)
    if (result.status === 'Closed') return caseRecord
    const currentStage = caseRecord.stages.find((stage) => stage.label === caseRecord.currentStage)
    const configuredDays = currentStage ? timelines[currentStage.label] ?? stageTimelines[currentStage.label] : undefined
    const expectedDueAt = currentStage ? configuredDays === stageTimelines[currentStage.label] ? currentStage.dueAt : addDays(new Date(currentStage.enteredAt), configuredDays ?? stageTimelines[currentStage.label]).toISOString() : undefined
    const deadlineChanged = Boolean(currentStage && expectedDueAt !== currentStage.dueAt)
    if (result.status === caseRecord.status && !deadlineChanged) return caseRecord
    const nextCase = {
      ...caseRecord,
      status: result.status,
      updatedAt: now.toISOString(),
      stages: deadlineChanged && currentStage ? caseRecord.stages.map((stage) => stage.id === currentStage.id ? { ...stage, dueAt: expectedDueAt! } : stage) : caseRecord.stages,
    }
    const action = `SLA status changed to ${result.status}`
    auditEvents.push(makeAuditEvent({
      id: deadlineChanged && result.status === caseRecord.status ? `sla-deadline:${caseRecord.id}:${expectedDueAt}` : `sla-audit:${caseRecord.id}:${result.status}`, at: now.toISOString(), ...ENGINE_ACTOR,
      action: deadlineChanged && result.status === caseRecord.status ? 'SLA deadline recalculated' : action,
      entityType: 'Case', entityId: caseRecord.id, detail: deadlineChanged && result.status === caseRecord.status
        ? `${caseRecord.currentStage} deadline changed from ${currentStage?.dueAt} to ${expectedDueAt} under the active workflow rule version.`
        : `${caseRecord.id} entered ${result.status.toLowerCase()} status with ${result.daysRemaining} days remaining in ${caseRecord.currentStage}.`,
    }))
    if (result.status === 'Due soon' || result.status === 'Overdue') {
      alerts.push({
        id: `sla:${caseRecord.id}:${result.status}`, type: 'SLA', severity: result.status === 'Overdue' ? 'Critical' : 'Warning',
        title: result.status === 'Overdue' ? 'Stage SLA overdue' : 'Stage due soon',
        message: `${caseRecord.id} is ${result.status === 'Overdue' ? `${Math.abs(result.daysRemaining)} days past` : `due in ${result.daysRemaining} days`} its ${caseRecord.currentStage} timeline.`,
        caseId: caseRecord.id, createdAt: now.toISOString(), read: false, isDemoData: true,
        channels,
      })
    }
    return nextCase
  })
  return { cases: updated, alerts, auditEvents }
}
