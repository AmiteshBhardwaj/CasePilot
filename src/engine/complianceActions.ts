import type { AuditEvent, DocumentRecord, HumanRole, Undertaking } from '@/data/schemas'
import { makeAuditEvent } from './audit'

type Actor = { name: string; role: HumanRole }

export function submitUndertakingEvidence(undertaking: Undertaking, input: { actor: Actor; evidenceName: string; now?: Date }): { undertaking: Undertaking; auditEvent: AuditEvent } {
  const now = input.now ?? new Date()
  if (input.actor.role !== 'Institution') throw new Error('Only the institution can submit undertaking evidence.')
  if (undertaking.status === 'Accepted') throw new Error('This undertaking is already closed.')
  if (!input.evidenceName.trim()) throw new Error('Choose or name the evidence file before submitting.')
  const at = now.toISOString()
  const updated: Undertaking = { ...undertaking, status: 'Submitted', evidenceName: input.evidenceName.trim(), verification: 'Pending', submittedAt: at, verifiedBy: undefined, verifiedAt: undefined }
  const auditEvent = makeAuditEvent({ id: `undertaking-submit:${undertaking.id}:${at}`, at, actorName: input.actor.name, actorRole: input.actor.role, action: 'Undertaking evidence submitted', entityType: 'Undertaking', entityId: undertaking.id, detail: `${input.actor.name} submitted ${updated.evidenceName} for “${undertaking.title}”; human verification remains pending.`, before: undertaking.status, after: 'Submitted · Pending verification' })
  return { undertaking: updated, auditEvent }
}

export function verifyUndertakingEvidence(undertaking: Undertaking, input: { actor: Actor; outcome: 'Verified' | 'Rejected' | 'Needs clarification'; reason?: string; now?: Date }): { undertaking: Undertaking; auditEvent: AuditEvent } {
  const now = input.now ?? new Date()
  if (!['Regional Officer', 'Bureau Officer', 'Authority'].includes(input.actor.role)) throw new Error('Only an authorized officer can verify undertaking evidence.')
  if (undertaking.status !== 'Submitted' && undertaking.status !== 'Needs clarification') throw new Error('The undertaking has no submitted evidence awaiting verification.')
  if (!undertaking.evidenceName) throw new Error('Submitted evidence is missing from this undertaking.')
  if (input.outcome !== 'Verified' && !input.reason?.trim()) throw new Error('A reason is required when evidence is not verified.')
  const at = now.toISOString()
  const status: Undertaking['status'] = input.outcome === 'Verified' ? 'Accepted' : 'Needs clarification'
  const updated: Undertaking = { ...undertaking, status, verification: input.outcome, verifiedBy: input.actor.name, verifiedAt: at }
  const detail = input.outcome === 'Verified'
    ? `${input.actor.name} verified ${undertaking.evidenceName}; ${undertaking.title} is closed.`
    : `${input.actor.name} marked ${undertaking.evidenceName} as ${input.outcome.toLowerCase()}. Reason: ${input.reason?.trim()}`
  const auditEvent = makeAuditEvent({ id: `undertaking-verification:${undertaking.id}:${at}`, at, actorName: input.actor.name, actorRole: input.actor.role, action: `Undertaking evidence ${input.outcome.toLowerCase()}`, entityType: 'Undertaking', entityId: undertaking.id, detail, before: `${undertaking.status} · ${undertaking.verification ?? 'unreviewed'}`, after: `${status} · ${input.outcome}`, reason: input.outcome === 'Verified' ? undefined : input.reason?.trim() })
  return { undertaking: updated, auditEvent }
}

export function submitDocumentRenewal(input: { id: string; institutionId: string; name: string; kind: DocumentRecord['kind']; expiresAt: Date; actor: Actor; now?: Date }): { document: DocumentRecord; auditEvent: AuditEvent } {
  const now = input.now ?? new Date()
  if (input.actor.role !== 'Institution') throw new Error('Only the institution can submit renewal evidence.')
  if (!input.name.trim()) throw new Error('A renewal document name is required.')
  if (input.expiresAt.getTime() <= now.getTime()) throw new Error('The renewal expiry date must be after the current demo date.')
  const at = now.toISOString()
  const document: DocumentRecord = { id: input.id, institutionId: input.institutionId, name: input.name.trim(), kind: input.kind, uploadedAt: at, expiresAt: input.expiresAt.toISOString(), verification: 'Pending', isDemoData: true }
  const auditEvent = makeAuditEvent({ id: `document-renewal:${input.id}:${at}`, at, actorName: input.actor.name, actorRole: input.actor.role, action: 'Renewal evidence submitted', entityType: 'Document', entityId: document.id, detail: `${input.actor.name} submitted ${document.name} for human verification; the new validity record is pending review.`, before: 'No renewal record', after: `Pending verification · expires ${document.expiresAt}` })
  return { document, auditEvent }
}
