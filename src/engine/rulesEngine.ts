import { workflowRuleConfigSchema, type AuditEvent, type HumanRole, type RuleProposal, type WorkflowRuleConfig } from '@/data/schemas'
import { makeAuditEvent } from './audit'

const authorizedRoles: HumanRole[] = ['Bureau Officer', 'Authority']

export function proposeWorkflowRules(active: WorkflowRuleConfig, draft: WorkflowRuleConfig, input: { actor: { name: string; role: HumanRole }; rationale: string; now?: Date }): { proposal: RuleProposal; auditEvent: AuditEvent } {
  const now = input.now ?? new Date()
  if (!authorizedRoles.includes(input.actor.role)) throw new Error('Only an authorized Bureau Officer or Authority can propose a workflow rule version.')
  if (!input.rationale.trim()) throw new Error('A rationale is required for a workflow rule proposal.')
  const version = nextVersion(active.version)
  const config = workflowRuleConfigSchema.parse({ ...draft, version, effectiveFrom: now.toISOString() })
  const proposal: RuleProposal = {
    id: `rule-proposal:${version}:${now.getTime()}`, config, rationale: input.rationale.trim(), proposedBy: input.actor.name,
    proposedByRole: input.actor.role, proposedAt: now.toISOString(), status: 'Pending approval', isDemoData: true,
  }
  const auditEvent = makeAuditEvent({ id: `rule-proposed:${proposal.id}`, at: now.toISOString(), actorName: input.actor.name, actorRole: input.actor.role, action: `Workflow rule ${version} proposed`, entityType: 'Rule', entityId: proposal.id, detail: `${input.actor.name} proposed ${version}: ${proposal.rationale}`, before: `Active ${active.version}`, after: `Pending approval ${version}`, reason: proposal.rationale })
  return { proposal, auditEvent }
}

export function approveWorkflowRules(proposal: RuleProposal, active: WorkflowRuleConfig, actor: { name: string; role: HumanRole }, now = new Date()): { proposal: RuleProposal; active: WorkflowRuleConfig; auditEvent: AuditEvent } {
  if (proposal.status !== 'Pending approval') throw new Error('Only a pending workflow rule proposal can be approved.')
  if (!authorizedRoles.includes(actor.role)) throw new Error('Only an authorized Bureau Officer or Authority can approve a workflow rule version.')
  if (actor.name === proposal.proposedBy || actor.role === proposal.proposedByRole) throw new Error('A second authorized officer in a different role must approve this version.')
  if (proposal.config.version === active.version) throw new Error('The proposed version is already active.')
  const verifiedConfig = workflowRuleConfigSchema.parse(proposal.config)
  const approved: RuleProposal = { ...proposal, status: 'Approved', approvedBy: actor.name, approvedByRole: actor.role, approvedAt: now.toISOString() }
  const auditEvent = makeAuditEvent({ id: `rule-approved:${proposal.id}`, at: now.toISOString(), actorName: actor.name, actorRole: actor.role, action: `Workflow rule ${verifiedConfig.version} activated`, entityType: 'Rule', entityId: proposal.id, detail: `${actor.name} approved ${verifiedConfig.version} proposed by ${proposal.proposedBy}. Previous active version: ${active.version}; rationale: ${proposal.rationale}`, before: `Active ${active.version}`, after: `Active ${verifiedConfig.version}`, reason: proposal.rationale })
  return { proposal: approved, active: verifiedConfig, auditEvent }
}

function nextVersion(version: string): string {
  const match = /^(\d{4})\.(\d+)$/.exec(version)
  if (!match) return `${version}.next`
  return `${match[1]}.${Number(match[2]) + 1}`
}
