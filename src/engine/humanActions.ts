import type { AuditEvent, CaseRecord, DocumentRecord, HumanRole } from '@/data/schemas'
import { makeAuditEvent } from './audit'

const verificationRoles: HumanRole[] = ['Regional Officer', 'Bureau Officer', 'Authority']

export function recordDecision(caseRecord: CaseRecord, input: {
  officerName: string; role: HumanRole; decision: 'Approved' | 'Rejected'; reason: string;
}, now = new Date()): { caseRecord: CaseRecord; auditEvent: AuditEvent } {
  if (input.role !== 'Authority') throw new Error('Only the competent Authority can record a statutory decision.')
  if (caseRecord.currentStage !== 'Authority Decision') throw new Error('The case is not at the Authority Decision stage.')
  if (!input.reason.trim()) throw new Error('A written reason is required for a decision.')
  const stage = caseRecord.stages.find((item) => item.label === 'Authority Decision')
  if (!stage || stage.status === 'Completed' || stage.status === 'Rejected') throw new Error('The decision stage is not available.')
  const at = now.toISOString()
  const caseUpdated = {
    ...caseRecord, decision: input.decision, decidedBy: input.officerName,
    status: 'Closed' as const, updatedAt: at,
    stages: caseRecord.stages.map((item) => item.id === stage.id ? { ...item, status: 'Completed' as const, completedAt: at } : item),
  }
  const auditEvent = makeAuditEvent({ id: `decision:${caseRecord.id}:${at}`, at, actorName: input.officerName, actorRole: input.role, action: `Decision ${input.decision}`, entityType: 'Case', entityId: caseRecord.id, detail: `${input.officerName} recorded ${input.decision.toLowerCase()} for ${caseRecord.id}. Reason: ${input.reason.trim()}`, before: `${caseRecord.currentStage}: ${stage.status}`, after: `Closed · ${input.decision}`, reason: input.reason.trim() })
  return { caseRecord: caseUpdated, auditEvent }
}

export function verifyDocument(document: DocumentRecord, input: {
  officerName: string; role: HumanRole; outcome: 'Verified' | 'Rejected' | 'Needs clarification'; reason?: string;
}, now = new Date()): { document: DocumentRecord; auditEvent: AuditEvent } {
  if (!verificationRoles.includes(input.role)) throw new Error(`${input.role} is not authorized to verify evidence.`)
  if (document.verification === 'Verified') throw new Error('This document has already been verified.')
  if (input.outcome !== 'Verified' && !input.reason?.trim()) throw new Error('A reason is required when evidence is not verified.')
  const at = now.toISOString()
  const updated = { ...document, verification: input.outcome, verifiedBy: input.officerName, verifiedAt: at }
  const detail = input.outcome === 'Verified'
    ? `${input.officerName} verified ${document.name}.`
    : `${input.officerName} marked ${document.name} as ${input.outcome.toLowerCase()}. Reason: ${input.reason?.trim()}`
  const auditEvent = makeAuditEvent({ id: `verification:${document.id}:${at}`, at, actorName: input.officerName, actorRole: input.role, action: `Evidence ${input.outcome.toLowerCase()}`, entityType: 'Document', entityId: document.id, detail, before: document.verification, after: input.outcome, reason: input.outcome === 'Verified' ? undefined : input.reason?.trim() })
  return { document: updated, auditEvent }
}
