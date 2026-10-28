import { addDays } from 'date-fns'
import { describe, expect, it } from 'vitest'
import type { Committee, Institution, Officer } from '@/data/schemas'
import { completeCurrentStage } from './stageMachine'
import { confirmCaseSummary, draftCaseSummary, recordCommitteeOutcome, scheduleEvc, submitApplication } from './workflowActions'

const now = new Date('2026-10-28T09:00:00+05:30')
const institution: Institution = { id: 'test-institution', name: 'Test Technical Institute', shortName: 'Test Institute', region: 'Northern', state: 'Delhi', city: 'New Delhi', institutionType: 'Engineering', aicteId: 'TEST-ID', contactName: 'Test Applicant', contactEmail: 'applicant@example.test' }
const officer: Officer = { id: 'test-regional-officer', name: 'Test Regional Officer', role: 'Regional Officer', region: 'Northern', designation: 'Regional Officer', email: 'officer@example.test' }
const committee: Committee = { id: 'test-committee', name: 'Test SAC', kind: 'SAC', region: 'Northern', chair: 'Test Chair', memberCount: 3 }

describe('workflow actions', () => {
  it('routes a submitted application and records the human submitter and system rule event', () => {
    const result = submitApplication({
      caseId: 'CP-TEST-90001', institution, applicationType: 'New Institution',
      assignedOfficerId: officer.id, assignedCommitteeId: committee.id,
      actor: { name: 'Sanjay Prasad', role: 'Institution' }, now,
    })
    expect(result.caseRecord.route.steps).toEqual(['Scrutiny', 'EVC', 'SAC/SHC', 'Authority Decision'])
    expect(result.caseRecord.stages[0].status).toBe('In progress')
    expect(result.auditEvents.map((event) => event.actorRole)).toEqual(['Institution', 'System'])
    expect(result.auditEvents[0].actorName).toBe('Sanjay Prasad')
  })

  it('schedules EVC and requires a named Committee member with notes for an outcome', () => {
    const submitted = submitApplication({
      caseId: 'CP-TEST-90002', institution, applicationType: 'New Institution', assignedOfficerId: officer.id,
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
    const record = submitApplication({
      caseId: 'CP-TEST-90003', institution, applicationType: 'New Institution', assignedOfficerId: officer.id,
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
