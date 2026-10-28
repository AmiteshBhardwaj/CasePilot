import type { WorkflowRuleConfig } from '@/data/schemas'
import { defaultEscalationRules } from './escalationEngine'
import { routeDefinitions } from './routeResolver'
import { stageTimelines } from './slaEngine'

export function createDefaultWorkflowRules(): WorkflowRuleConfig {
  const routeOverrides = Object.fromEntries(Object.entries(routeDefinitions).map(([applicationType, route]) => [applicationType, [...route.steps]])) as WorkflowRuleConfig['routeOverrides']
  return {
    version: '2026.1',
    effectiveFrom: new Date('2026-04-01T00:00:00.000Z').toISOString(),
    routeOverrides,
    stageTimelines: { ...stageTimelines },
    escalationRules: defaultEscalationRules.map((rule) => ({ ...rule })),
    complianceAlertDays: [30, 15, 7],
    complianceEscalationDays: [7, 14, 21],
    channels: ['In-app', 'Email', 'SMS'],
  }
}
