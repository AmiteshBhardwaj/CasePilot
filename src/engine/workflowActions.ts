import { addDays } from 'date-fns'
import type { Alert, ApplicationType, AuditEvent, CaseRecord, DocumentRecord, HumanRole, Institution, Observation } from '@/data/schemas'
import { resolveRoute, type RouteOverride } from './routeResolver'
import { stageTimelines } from './slaEngine'
import { completeCurrentStage, type HumanActor } from './stageMachine'
import { makeAuditEvent } from './audit'

const summaryRoles: HumanRole[] = ['Regional Officer', 'Bureau Officer', 'Committee', 'Authority']

function humanEvent(at: Date, actor: HumanActor, action: string, entityType: AuditEvent['entityType'], entityId: string, detail: string): AuditEvent {
  return makeAuditEvent({ id: `action:${entityId}:${action}:${at.toISOString()}`, at: at.toISOString(), actorName: actor.name, actorRole: actor.role, action, entityType, entityId, detail })
}

export function submitApplication(input: {
  caseId: string; institution: Institution; applicationType: ApplicationType; assignedOfficerId: string; assignedCommitteeId: string;
  actor: HumanActor; now?: Date; routeOverrides?: RouteOverride;
}): { caseRecord: CaseRecord; auditEvents: AuditEvent[] } {
  const now = input.now ?? new Date()
  if (input.actor.role !== 'Institution') throw new Error('Only an institution can submit a new application.')
  const { route, auditEvent } = resolveRoute(input.applicationType, input.routeOverrides, now, input.caseId)
  const stages: CaseRecord['stages'] = route.steps.map((step, index) => {
    const enteredAt = addDays(now, index * 7)
    return { id: `${input.caseId}-stage-${index + 1}`, label: step, status: index === 0 ? 'In progress' : 'Queued', enteredAt: enteredAt.toISOString(), dueAt: addDays(enteredAt, stageTimelines[step]).toISOString() }
  })
  const caseRecord: CaseRecord = {
    id: input.caseId, institutionId: input.institution.id, applicationType: input.applicationType, title: `${input.applicationType} application`, region: input.institution.region,
    route, stages, currentStage: route.steps[0], status: 'On track', submittedAt: now.toISOString(), updatedAt: now.toISOString(), assignedOfficerId: input.assignedOfficerId,
    assignedCommitteeId: input.assignedCommitteeId, returnedCount: 0, escalationLevel: 'None', evidenceVerified: false, isDemoData: true,
  }
  const event = humanEvent(now, input.actor, 'Application submitted', 'Case', caseRecord.id, `${input.actor.name} submitted ${input.applicationType}; routing applied ${route.ruleCode} (${route.category}) because ${route.reason}`)
  return { caseRecord, auditEvents: [event, auditEvent] }
}

export function scheduleEvc(caseRecord: CaseRecord, input: { actor: HumanActor; scheduledAt: Date; now?: Date }): { caseRecord: CaseRecord; auditEvent: AuditEvent } {
  const now = input.now ?? new Date()
  if (!['Regional Officer', 'Bureau Officer'].includes(input.actor.role)) throw new Error('Only a Regional Officer or Bureau Officer can schedule an EVC.')
  if (!caseRecord.route.steps.includes('EVC') || caseRecord.currentStage !== 'EVC') throw new Error('EVC can only be scheduled when the case is at its EVC stage.')
  if (input.scheduledAt.getTime() <= now.getTime()) throw new Error('Choose an EVC date and time after the demo clock.')
  const nextCase = { ...caseRecord, evcScheduledAt: input.scheduledAt.toISOString(), updatedAt: now.toISOString() }
  const auditEvent = humanEvent(now, input.actor, 'EVC scheduled', 'Case', caseRecord.id, `${input.actor.name} scheduled the EVC for ${input.scheduledAt.toISOString()}.`)
  return { caseRecord: nextCase, auditEvent }
}

export function recordCommitteeOutcome(caseRecord: CaseRecord, input: {
  actor: HumanActor; outcome: 'Recommended' | 'Not recommended' | 'Deferred'; notes: string; now?: Date;
}): { caseRecord: CaseRecord; auditEvents: AuditEvent[] } {
  const now = input.now ?? new Date()
  if (input.actor.role !== 'Committee') throw new Error('Only a Committee member can record a committee outcome.')
  if (caseRecord.currentStage !== 'SAC/SHC' || !caseRecord.route.steps.includes('SAC/SHC')) throw new Error('This case is not at an SAC/SHC stage.')
  if (!input.notes.trim()) throw new Error('Committee notes are required with an outcome.')
  const transition = completeCurrentStage(caseRecord, input.actor, now)
  const nextCase = { ...transition.caseRecord, committeeOutcome: input.outcome, committeeNotes: input.notes.trim() }
  const auditEvent = humanEvent(now, input.actor, `Committee outcome: ${input.outcome}`, 'Case', caseRecord.id, `${input.actor.name} recorded ${input.outcome.toLowerCase()}. Notes: ${input.notes.trim()}`)
  return { caseRecord: nextCase, auditEvents: [auditEvent, transition.auditEvent] }
}

export function draftCaseSummary(caseRecord: CaseRecord, institutionName: string): string {
  const completed = caseRecord.stages.filter((stage) => stage.status === 'Completed').map((stage) => stage.label)
  const pending = caseRecord.route.steps.filter((step) => !completed.includes(step) && step !== caseRecord.currentStage)
  return [
    `CASE SUMMARY — ${caseRecord.id}`,
    `Institution: ${institutionName} (${caseRecord.region} Region)`,
    `Application: ${caseRecord.applicationType}`,
    `Route: ${caseRecord.route.category}; rule ${caseRecord.route.ruleCode}, version ${caseRecord.route.version}`,
    `Current stage: ${caseRecord.currentStage} (${caseRecord.status})`,
    `Stages completed: ${completed.length ? completed.join(', ') : 'None recorded'}`,
    `Remaining stages: ${[caseRecord.currentStage, ...pending].join(', ')}`,
    `Returns: ${caseRecord.returnedCount}; evidence verified: ${caseRecord.evidenceVerified ? 'Yes' : 'Pending human verification'}`,
    `Route rationale: ${caseRecord.route.reason}`,
    'Draft generated for officer review. It is not a statutory decision or substitute for scrutiny.',
  ].join('\n')
}

export function confirmCaseSummary(caseRecord: CaseRecord, input: { actor: HumanActor; summary: string; now?: Date }): { caseRecord: CaseRecord; auditEvent: AuditEvent } {
  const now = input.now ?? new Date()
  if (!summaryRoles.includes(input.actor.role)) throw new Error('An authorized officer must review and save the case summary.')
  if (input.summary.trim().length < 40) throw new Error('The officer-confirmed summary is too short to save.')
  const nextCase = { ...caseRecord, caseSummary: input.summary.trim(), summarySavedBy: input.actor.name, summarySavedAt: now.toISOString(), updatedAt: now.toISOString() }
  const auditEvent = humanEvent(now, input.actor, 'Case summary confirmed', 'Case', caseRecord.id, `${input.actor.name} reviewed and saved an electronic case summary.`)
  return { caseRecord: nextCase, auditEvent }
}

export function uploadEvidence(input: {
  caseId: string; institutionId: string; files: Array<{ name: string; kind: DocumentRecord['kind'] }>;
  actor: HumanActor; now?: Date;
}): { documents: DocumentRecord[]; auditEvents: AuditEvent[] } {
  const now = input.now ?? new Date()
  if (input.actor.role !== 'Institution') throw new Error('Only the institution can submit its evidence files.')
  const documents = input.files.filter((file) => file.name.trim()).map((file, index) => ({
    id: `upload-${input.caseId}-${index + 1}`, institutionId: input.institutionId, caseId: input.caseId,
    name: file.name.trim(), kind: file.kind, uploadedAt: now.toISOString(), verification: 'Pending' as const, isDemoData: true as const,
  }))
  const auditEvents = documents.map((document) => humanEvent(now, input.actor, 'Evidence uploaded', 'Document', document.id, `${input.actor.name} attached ${document.name} to ${input.caseId}; human verification is pending.`))
  return { documents, auditEvents }
}

export function acknowledgeAlert(alert: Alert, actor: HumanActor, now = new Date()): { alert: Alert; auditEvent: AuditEvent } {
  if (alert.read) throw new Error('This alert has already been acknowledged.')
  const at = now.toISOString()
  const updated: Alert = { ...alert, read: true, acknowledgedBy: actor.name, acknowledgedAt: at }
  const auditEvent = humanEvent(now, actor, 'Alert acknowledged', 'Alert', alert.id, `${actor.name} acknowledged: ${alert.title}`)
  return { alert: updated, auditEvent }
}

export function snoozeAlert(alert: Alert, actor: HumanActor, days: number, now = new Date()): { alert: Alert; auditEvent: AuditEvent } {
  if (!Number.isFinite(days) || days <= 0) throw new Error('Snooze duration must be a positive number of days.')
  const until = addDays(now, days)
  const updated: Alert = { ...alert, snoozedUntil: until.toISOString() }
  const auditEvent = humanEvent(now, actor, 'Alert snoozed', 'Alert', alert.id, `${actor.name} snoozed “${alert.title}” until ${until.toISOString()}.`)
  return { alert: updated, auditEvent }
}

export function createObservation(input: {
  id: string; caseId: string; text: string; actor: HumanActor; now?: Date;
}): { observation: Observation; auditEvent: AuditEvent } {
  const now = input.now ?? new Date()
  if (!input.text.trim()) throw new Error('Observation text is required.')
  const observation: Observation = { id: input.id, caseId: input.caseId, text: input.text.trim(), raisedBy: input.actor.name, raisedAt: now.toISOString(), status: 'Open', isDemoData: true }
  const auditEvent = humanEvent(now, input.actor, 'Observation raised', 'Case', input.caseId, `${input.actor.name} raised an observation: ${observation.text}`)
  return { observation, auditEvent }
}
