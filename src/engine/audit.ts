import type { AuditEvent, Role } from '@/data/schemas'

export function makeAuditEvent(input: {
  id: string; at: string; actorName: string; actorRole: Role; action: string;
  entityType: AuditEvent['entityType']; entityId: string; detail: string; before?: string; after?: string; reason?: string;
}): AuditEvent {
  return { ...input, isDemoData: true }
}

export const ENGINE_ACTOR = { actorName: 'CasePilot workflow engine', actorRole: 'System' as const }
