import type { AuditEvent, CaseRecord, HumanRole } from '@/data/schemas'
import { makeAuditEvent } from './audit'

export function assignCase(caseRecord: CaseRecord, input: { officerId: string; officerName: string; role: HumanRole; now?: Date }): { caseRecord: CaseRecord; auditEvent: AuditEvent } {
  if (!['Regional Officer', 'Bureau Officer'].includes(input.role)) throw new Error('Only a Regional Officer or Bureau Officer can assign a case.')
  if (!input.officerId.trim() || !input.officerName.trim()) throw new Error('Choose an officer before assigning cases.')
  const now = input.now ?? new Date()
  const next = { ...caseRecord, assignedOfficerId: input.officerId, updatedAt: now.toISOString() }
  const auditEvent = makeAuditEvent({ id: `assignment:${caseRecord.id}:${input.officerId}:${now.toISOString()}`, at: now.toISOString(), actorName: input.officerName, actorRole: input.role, action: 'Case assigned', entityType: 'Case', entityId: caseRecord.id, detail: `${input.officerName} assigned ${caseRecord.id} to ${input.officerId}.` })
  return { caseRecord: next, auditEvent }
}
