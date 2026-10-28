import type { CasePilotDataset } from './schemas'
import { createDefaultWorkflowRules } from '@/engine/ruleConfig'

/** Start with no institutional records until an approved data service supplies them. */
export function createEmptyDataset(): CasePilotDataset {
  return {
    institutions: [],
    cases: [],
    officers: [],
    committees: [],
    documents: [],
    observations: [],
    undertakings: [],
    alerts: [],
    auditEvents: [],
    ruleVersions: [],
    activeWorkflowRules: createDefaultWorkflowRules(),
    ruleProposals: [],
  }
}
