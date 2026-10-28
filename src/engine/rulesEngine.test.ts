import { describe, expect, it } from 'vitest'
import { createDefaultWorkflowRules } from './ruleConfig'
import { approveWorkflowRules, proposeWorkflowRules } from './rulesEngine'

const now = new Date('2026-10-28T09:00:00+05:30')

describe('workflow rule versioning', () => {
  it('requires a second authorized officer before activating a version', () => {
    const active = createDefaultWorkflowRules()
    const proposal = proposeWorkflowRules(active, { ...active, stageTimelines: { ...active.stageTimelines, Scrutiny: 9 } }, { actor: { name: 'Dr. A. K. Sinha', role: 'Bureau Officer' }, rationale: 'Reduce internal scrutiny timeline for the next pilot review.', now }).proposal
    expect(proposal.config.version).toBe('2026.2')
    expect(proposal.status).toBe('Pending approval')
    expect(() => approveWorkflowRules(proposal, active, { name: 'Dr. A. K. Sinha', role: 'Bureau Officer' }, now)).toThrow(/second authorized officer/i)
    const approved = approveWorkflowRules(proposal, active, { name: 'Vikram Bedi', role: 'Authority' }, now)
    expect(approved.active.version).toBe('2026.2')
    expect(approved.active.stageTimelines.Scrutiny).toBe(9)
    expect(approved.proposal.status).toBe('Approved')
    expect(approved.auditEvent.actorName).toBe('Vikram Bedi')
  })

  it('rejects invalid or unexplained rule proposals', () => {
    const active = createDefaultWorkflowRules()
    expect(() => proposeWorkflowRules(active, active, { actor: { name: 'Ritika Anand', role: 'Regional Officer' }, rationale: 'Change', now })).toThrow(/authorized/i)
    expect(() => proposeWorkflowRules(active, active, { actor: { name: 'Dr. A. K. Sinha', role: 'Bureau Officer' }, rationale: '  ', now })).toThrow(/rationale/i)
  })
})
