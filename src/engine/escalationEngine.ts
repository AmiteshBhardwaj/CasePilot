import { differenceInCalendarDays } from 'date-fns'
import type { Alert, AuditEvent, CaseRecord, EscalationRule, RouteStep, WorkflowRuleConfig } from '@/data/schemas'
import { ENGINE_ACTOR, makeAuditEvent } from './audit'

export const defaultEscalationRules: EscalationRule[] = [
  { stage: 'Scrutiny', regionalAfterDays: 12, bureauAfterDays: 18, authorityAfterDays: 25 },
  { stage: 'EVC', regionalAfterDays: 18, bureauAfterDays: 25, authorityAfterDays: 35 },
  { stage: 'SAC/SHC', regionalAfterDays: 15, bureauAfterDays: 22, authorityAfterDays: 30 },
  { stage: 'Authority Decision', regionalAfterDays: 10, bureauAfterDays: 16, authorityAfterDays: 22 },
]

const rank = { None: 0, 'Regional Officer': 1, 'Bureau Officer': 2, Authority: 3 } as const

export type EscalationRun = { cases: CaseRecord[]; alerts: Alert[]; auditEvents: AuditEvent[] }

export function escalationLevelForAge(ageDays: number, rule: EscalationRule): CaseRecord['escalationLevel'] {
  if (ageDays >= rule.authorityAfterDays) return 'Authority'
  if (ageDays >= rule.bureauAfterDays) return 'Bureau Officer'
  if (ageDays >= rule.regionalAfterDays) return 'Regional Officer'
  return 'None'
}

export function runEscalationEngine(cases: CaseRecord[], now = new Date(), rules: EscalationRule[] = defaultEscalationRules, channels: WorkflowRuleConfig['channels'] = ['In-app']): EscalationRun {
  const alerts: Alert[] = []
  const auditEvents: AuditEvent[] = []
  const updated = cases.map((caseRecord) => {
    if (caseRecord.status === 'Closed') return caseRecord
    const rule = rules.find((candidate) => candidate.stage === caseRecord.currentStage)
    if (!rule) return caseRecord
    const stage = caseRecord.stages.find((candidate) => candidate.label === caseRecord.currentStage)
    const ageDays = differenceInCalendarDays(now, new Date(stage?.enteredAt ?? caseRecord.submittedAt))
    const nextLevel = escalationLevelForAge(ageDays, rule)
    if (rank[nextLevel] <= rank[caseRecord.escalationLevel]) return caseRecord
    const nextCase: CaseRecord = { ...caseRecord, escalationLevel: nextLevel, status: 'Escalated', updatedAt: now.toISOString() }
    const message = `${caseRecord.id} aged ${ageDays} days in ${caseRecord.currentStage}; escalation moved to ${nextLevel}.`
    auditEvents.push(makeAuditEvent({ id: `escalation-audit:${caseRecord.id}:${nextLevel}`, at: now.toISOString(), ...ENGINE_ACTOR, action: `Escalated to ${nextLevel}`, entityType: 'Case', entityId: caseRecord.id, detail: message }))
    alerts.push({ id: `escalation:${caseRecord.id}:${nextLevel}`, type: 'Escalation', severity: nextLevel === 'Authority' ? 'Critical' : 'Warning', title: `Escalated to ${nextLevel}`, message, caseId: caseRecord.id, escalationLevel: nextLevel, createdAt: now.toISOString(), read: false, channels, })
    return nextCase
  })
  return { cases: updated, alerts, auditEvents }
}

export function rulesForStages(stages: RouteStep[], thresholds: Partial<Record<RouteStep, Omit<EscalationRule, 'stage'>>> = {}): EscalationRule[] {
  return stages.map((stage) => ({ stage, ...(thresholds[stage] ?? defaultEscalationRules.find((rule) => rule.stage === stage) ?? { regionalAfterDays: 12, bureauAfterDays: 18, authorityAfterDays: 25 }) }))
}
