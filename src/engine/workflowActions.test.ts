import { addDays } from 'date-fns'
import { describe, expect, it } from 'vitest'
import { createDemoDataset } from '@/data/seed'
import { completeCurrentStage } from './stageMachine'
import { confirmCaseSummary, draftCaseSummary, recordCommitteeOutcome, scheduleEvc, submitApplication } from './workflowActions'

const now = new Date('2026-10-28T09:00:00+05:30')

describe('workflow actions', () => {
  it('routes a submitted application and records the human submitter and system rule event', () => {
    const data = createDemoDataset()
    const institution = data.institutions[0]
    const officer = data.officers.find((item) => item.role === 'Regional Officer' && item.region === institution.region)
    const committee = data.committees.find((item) => item.region === institution.region) ?? data.committees[0]
    expect(officer).toBeDefined()
    const result = submitApplication({
      caseId: 'CP-2026-NR-90001', institution, applicationType: 'New Institution',
      assignedOfficerId: officer!.id, assignedCommitteeId: committee.id,
      actor: { name: 'Sanjay Prasad', role: 'Institution' }, now,
    })
    expect(result.caseRecord.route.steps).toEqual(['Scrutiny', 'EVC', 'SAC/SHC', 'Authority Decision'])
    expect(result.caseRecord.stages[0].status).toBe('In progress')
    expect(result.auditEvents.map((event) => event.actorRole)).toEqual(['Institution', 'System'])
    expect(result.auditEvents[0].actorName).toBe('Sanjay Prasad')
  })

  it('schedules EVC and requires a named Committee member with notes for an outcome', () => {
    const data = createDemoDataset()
    const institution = data.institutions[0]
    const officer = data.officers.find((item) => item.role === 'Regional Officer' && item.region === institution.region)!
    const committee = data.committees.find((item) => item.region === institution.region) ?? data.committees[0]
    const submitted = submitApplication({
      caseId: 'CP-2026-NR-90002', institution, applicationType: 'New Institution', assignedOfficerId: officer.id,
      assignedCommitteeId: committee.id, actor: { name: 'Sanjay Prasad', role: 'Institution' }, now,
    }).caseRecord
    const scrutiny = completeCurrentStage(submitted, { name: officer.name, role: 'Regional Officer' }, now).caseRecord
    const scheduled = scheduleEvc(scrutiny, { actor: { name: officer.name, role: 'Regional Officer' }, scheduledAt: addDays(now, 14), now })
    expect(scheduled.caseRecord.evcScheduledAt).toBe(addDays(now, 14).toISOString())
    const evc = completeCurrentStage(scheduled.caseRecord, { name: officer.name, role: 'Regional Officer' }, now).caseRecord
    const actor = { name: 'Prof. Shalini Rao', role: 'Committee' as const }
    expect(() => recordCommitteeOutcome(evc, { actor, outcome: 'Recommended', notes: '   ', now })).toThrow(/notes are required/i)
    const outcome = recordCommitteeOutcome(evc, { actor, outcome: 'Recommended', notes: 'Site evidence reviewed; recommendation recorded for Authority consideration.', now })
    expect(outcome.caseRecord.currentStage).toBe('Authority Decision')
    expect(outcome.auditEvents[0].actorName).toBe(actor.name)
    expect(outcome.caseRecord.committeeOutcome).toBe('Recommended')
  })

  it('saves an electronic summary only after an authorized officer confirms it', () => {
    const data = createDemoDataset()
    const institution = data.institutions[0]
    const officer = data.officers.find((item) => item.role === 'Regional Officer' && item.region === institution.region)!
    const committee = data.committees.find((item) => item.region === institution.region) ?? data.committees[0]
    const record = submitApplication({
      caseId: 'CP-2026-NR-90003', institution, applicationType: 'New Institution', assignedOfficerId: officer.id,
      assignedCommitteeId: committee.id, actor: { name: 'Sanjay Prasad', role: 'Institution' }, now,
    }).caseRecord
    const summary = draftCaseSummary(record, institution.name)
    expect(() => confirmCaseSummary(record, { actor: { name: 'Sanjay Prasad', role: 'Institution' }, summary, now })).toThrow(/authorized officer/i)
    const saved = confirmCaseSummary(record, { actor: { name: officer.name, role: 'Regional Officer' }, summary, now })
    expect(saved.caseRecord.caseSummary).toBe(summary)
    expect(saved.caseRecord.summarySavedBy).toBe(officer.name)
    expect(saved.auditEvent.actorName).toBe(officer.name)
  })
})
