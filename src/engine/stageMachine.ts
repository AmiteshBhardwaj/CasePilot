import type { AuditEvent, CaseRecord, HumanRole, RouteStep, Stage } from '@/data/schemas'
import { makeAuditEvent } from './audit'

export type HumanActor = { name: string; role: HumanRole }
export type StageTransition = { caseRecord: CaseRecord; auditEvent: AuditEvent }

const returnRoles: HumanRole[] = ['Regional Officer', 'Bureau Officer', 'Committee', 'Authority']
const revertRoles: HumanRole[] = ['Bureau Officer', 'Authority']
const completionRoles: Partial<Record<RouteStep, HumanRole[]>> = {
  Scrutiny: ['Regional Officer', 'Bureau Officer'],
  EVC: ['Regional Officer', 'Bureau Officer'],
  'SAC/SHC': ['Committee'],
}

function requireReason(reason: string): void {
  if (!reason.trim()) throw new Error('A reason is required for return or revert actions.')
}

function event(caseRecord: CaseRecord, actor: HumanActor, action: string, detail: string, now: Date): AuditEvent {
  return makeAuditEvent({ id: `stage:${caseRecord.id}:${action}:${now.toISOString()}`, at: now.toISOString(), actorName: actor.name, actorRole: actor.role, action, entityType: 'Case', entityId: caseRecord.id, detail })
}

function updateStage(stages: Stage[], id: string, update: Partial<Stage>): Stage[] {
  return stages.map((stage) => stage.id === id ? { ...stage, ...update } : stage)
}

export function completeCurrentStage(caseRecord: CaseRecord, actor: HumanActor, now = new Date()): StageTransition {
  if (caseRecord.currentStage === 'Authority Decision') throw new Error('A competent authority decision must be recorded explicitly.')
  if (!completionRoles[caseRecord.currentStage]?.includes(actor.role)) throw new Error(`${actor.role} is not authorized to complete ${caseRecord.currentStage}.`)
  const current = caseRecord.stages.find((stage) => stage.label === caseRecord.currentStage)
  if (!current || !['In progress', 'Awaiting committee'].includes(current.status)) throw new Error('The current stage is not ready for completion.')
  if (!caseRecord.route.steps.includes(caseRecord.currentStage)) throw new Error('The current stage is not part of this case route.')
  const index = caseRecord.route.steps.indexOf(caseRecord.currentStage)
  const nextLabel = caseRecord.route.steps[index + 1]
  let stages = updateStage(caseRecord.stages, current.id, { status: 'Completed', completedAt: now.toISOString() })
  if (nextLabel) {
    const nextStage = stages.find((stage) => stage.label === nextLabel)
    if (!nextStage) throw new Error(`Missing configured stage ${nextLabel}.`)
    stages = updateStage(stages, nextStage.id, { status: nextLabel === 'SAC/SHC' ? 'Awaiting committee' : 'In progress', enteredAt: now.toISOString() })
  }
  const closed = !nextLabel
  const nextCase: CaseRecord = {
    ...caseRecord, stages, currentStage: nextLabel ?? caseRecord.currentStage,
    status: closed ? 'Closed' : caseRecord.status, updatedAt: now.toISOString(),
  }
  return { caseRecord: nextCase, auditEvent: event(nextCase, actor, 'Stage completed', `${actor.name} completed ${caseRecord.currentStage}${nextLabel ? `; workflow advanced to ${nextLabel}` : '; case workflow completed'}.`, now) }
}

export function returnCase(caseRecord: CaseRecord, actor: HumanActor, reason: string, now = new Date()): StageTransition {
  requireReason(reason)
  if (!returnRoles.includes(actor.role)) throw new Error(`${actor.role} is not authorized to return a case.`)
  const current = caseRecord.stages.find((stage) => stage.label === caseRecord.currentStage)
  if (!current || ['Completed', 'Rejected'].includes(current.status)) throw new Error('This case cannot be returned from its current state.')
  const stages = updateStage(caseRecord.stages, current.id, { status: 'Returned' })
  const nextCase = { ...caseRecord, stages, returnedCount: caseRecord.returnedCount + 1, updatedAt: now.toISOString() }
  return { caseRecord: nextCase, auditEvent: event(nextCase, actor, 'Case returned', `${actor.name} returned ${caseRecord.id} to the institution. Reason: ${reason.trim()}`, now) }
}

export function revertCase(caseRecord: CaseRecord, actor: HumanActor, target: RouteStep, reason: string, now = new Date()): StageTransition {
  requireReason(reason)
  if (!revertRoles.includes(actor.role)) throw new Error(`${actor.role} is not authorized to revert a stage.`)
  const targetIndex = caseRecord.route.steps.indexOf(target)
  const currentIndex = caseRecord.route.steps.indexOf(caseRecord.currentStage)
  if (targetIndex < 0 || targetIndex >= currentIndex) throw new Error('Revert target must be an earlier stage in this route.')
  const targetStage = caseRecord.stages.find((stage) => stage.label === target)
  if (!targetStage) throw new Error(`Missing configured stage ${target}.`)
  const stages = caseRecord.stages.map((stage) => {
    const stageIndex = caseRecord.route.steps.indexOf(stage.label)
    if (stage.label === target) return { ...stage, status: 'In progress' as const, enteredAt: now.toISOString(), completedAt: undefined }
    if (stageIndex > targetIndex) return { ...stage, status: 'Queued' as const, completedAt: undefined }
    return stage
  })
  const nextCase = { ...caseRecord, currentStage: target, stages, status: 'On track' as const, updatedAt: now.toISOString() }
  return { caseRecord: nextCase, auditEvent: event(nextCase, actor, 'Stage reverted', `${actor.name} reverted workflow to ${target}. Reason: ${reason.trim()}`, now) }
}

export function resubmitReturnedCase(caseRecord: CaseRecord, actor: HumanActor, now = new Date()): StageTransition {
  if (actor.role !== 'Institution') throw new Error('Only the institution can resubmit a returned case.')
  const current = caseRecord.stages.find((stage) => stage.label === caseRecord.currentStage)
  if (!current || current.status !== 'Returned') throw new Error('This case is not awaiting an institution response.')
  const stages = updateStage(caseRecord.stages, current.id, { status: 'In progress', enteredAt: now.toISOString() })
  const nextCase = { ...caseRecord, stages, updatedAt: now.toISOString() }
  return { caseRecord: nextCase, auditEvent: event(nextCase, actor, 'Institution response received', `${actor.name} resubmitted ${caseRecord.id} for human review.`, now) }
}
