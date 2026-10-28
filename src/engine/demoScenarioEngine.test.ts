import { addDays } from 'date-fns'
import { describe, expect, it } from 'vitest'
import { createDemoDataset } from '@/data/seed'
import { seedDemoScenario } from './demoScenarioEngine'

const now = new Date('2026-10-28T09:00:00+05:30')

describe('demo scenario engine', () => {
  const base = createDemoDataset()
  const actor = { actorName: 'Ritika Anand', actorRole: 'Regional Officer' as const, now }

  it('seeds a routed new-institution case with system and human audit events', () => {
    const result = seedDemoScenario({ scenario: 'new-institution', ...base, ...actor })
    expect(result.cases).toHaveLength(1)
    expect(result.cases[0].applicationType).toBe('New Institution')
    expect(result.cases[0].currentStage).toBe('Scrutiny')
    expect(result.auditEvents.map((event) => event.actorRole)).toContain('System')
    expect(result.auditEvents.map((event) => event.actorName)).toContain(actor.actorName)
  })

  it('seeds an overdue EVC with a past due date and a linked SLA alert', () => {
    const result = seedDemoScenario({ scenario: 'overdue-evc', ...base, ...actor })
    expect(result.cases[0].currentStage).toBe('EVC')
    expect(result.cases[0].status).toBe('Overdue')
    expect(new Date(result.cases[0].stages[1].dueAt).getTime()).toBeLessThan(now.getTime())
    expect(result.alerts[0].caseId).toBe(result.cases[0].id)
  })

  it('seeds an expiring lease with owner, due date, channels and an audit event', () => {
    const result = seedDemoScenario({ scenario: 'lease-expiring', ...base, ...actor })
    const document = result.documents[0]
    expect(document.kind).toBe('Lease deed')
    expect(document.expiresAt).toBe(addDays(now, 7).toISOString())
    expect(result.alerts[0].ownerId).toBeTruthy()
    expect(result.alerts[0].channels).toEqual(['In-app', 'Email', 'SMS'])
    expect(result.auditEvents[0].entityId).toBe(document.id)
  })
})
