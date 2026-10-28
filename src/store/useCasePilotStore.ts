import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { z } from 'zod'
import { alertSchema, auditEventSchema, caseSchema, committeeSchema, casePilotDatasetSchema, documentSchema, humanRoleSchema, institutionSchema, observationSchema, ruleProposalSchema, ruleVersionSchema, undertakingSchema, workflowRuleConfigSchema, officerSchema, type Alert, type AuditEvent, type CaseRecord, type CasePilotDataset, type DocumentRecord, type HumanRole, type Observation, type Undertaking, type WorkflowRuleConfig } from '@/data/schemas'
import { createEmptyDataset } from '@/data/emptyDataset'
import { casePilotApi, DataSourceUnavailableError } from '@/api/casePilotApi'
import { approveWorkflowRules, proposeWorkflowRules } from '@/engine/rulesEngine'

type StoreState = CasePilotDataset & {
  role: HumanRole | null
  actorName: string
  sidebarCollapsed: boolean
  dataSourceStatus: 'not-configured' | 'loading' | 'connected' | 'error'
  dataSourceError: string
  now: () => Date
  setRole: (role: HumanRole | null) => void
  setActorName: (name: string) => void
  toggleSidebar: () => void
  loadDataset: () => Promise<void>
  saveCaseAction: (caseRecord: CaseRecord, auditEvent: AuditEvent | AuditEvent[]) => void
  saveDocumentAction: (document: DocumentRecord, auditEvent: AuditEvent) => void
  createCase: (caseRecord: CaseRecord, documents: DocumentRecord[], auditEvents: AuditEvent[]) => void
  saveObservation: (observation: Observation, auditEvent: AuditEvent) => void
  saveAlertAction: (alert: Alert, auditEvent: AuditEvent) => void
  saveCaseBatch: (cases: CaseRecord[], auditEvents: AuditEvent[]) => void
  createDocumentAction: (document: DocumentRecord, auditEvent: AuditEvent) => void
  saveUndertakingAction: (undertaking: Undertaking, auditEvent: AuditEvent) => void
  saveDecisionAction: (caseRecord: CaseRecord, undertaking: Undertaking, auditEvents: AuditEvent[]) => void
  proposeRuleVersion: (draft: WorkflowRuleConfig, rationale: string, actor: { name: string; role: HumanRole }) => void
  approveRuleVersion: (proposalId: string, actor: { name: string; role: HumanRole }) => void
}

function initialState(): Pick<StoreState, keyof CasePilotDataset | 'role' | 'actorName' | 'sidebarCollapsed' | 'dataSourceStatus' | 'dataSourceError'> {
  return { ...casePilotDatasetSchema.parse(createEmptyDataset()), role: null, actorName: '', sidebarCollapsed: false, dataSourceStatus: 'not-configured', dataSourceError: '' }
}

const persistedStateSchema = z.object({
  institutions: z.array(institutionSchema).optional(), cases: z.array(caseSchema).optional(), officers: z.array(officerSchema).optional(),
  committees: z.array(committeeSchema).optional(), documents: z.array(documentSchema).optional(), observations: z.array(observationSchema).optional(),
  undertakings: z.array(undertakingSchema).optional(), alerts: z.array(alertSchema).optional(), auditEvents: z.array(auditEventSchema).optional(),
  ruleVersions: z.array(ruleVersionSchema).optional(), activeWorkflowRules: workflowRuleConfigSchema.optional(), ruleProposals: z.array(ruleProposalSchema).optional(),
  role: humanRoleSchema.nullable().optional(), actorName: z.string().optional(), sidebarCollapsed: z.boolean().optional(),
}).passthrough()

function restorePersistedState(value: unknown): Pick<StoreState, keyof CasePilotDataset | 'role' | 'actorName' | 'sidebarCollapsed' | 'dataSourceStatus' | 'dataSourceError'> {
  const defaults = initialState()
  const parsed = persistedStateSchema.safeParse(value)
  if (!parsed.success) return defaults
  const saved = parsed.data
  return {
    institutions: saved.institutions ?? defaults.institutions,
    cases: saved.cases ?? defaults.cases,
    officers: saved.officers ?? defaults.officers,
    committees: saved.committees ?? defaults.committees,
    documents: saved.documents ?? defaults.documents,
    observations: saved.observations ?? defaults.observations,
    undertakings: saved.undertakings ?? defaults.undertakings,
    alerts: saved.alerts ?? defaults.alerts,
    auditEvents: saved.auditEvents ?? defaults.auditEvents,
    ruleVersions: saved.ruleVersions ?? defaults.ruleVersions,
    activeWorkflowRules: saved.activeWorkflowRules ?? defaults.activeWorkflowRules,
    ruleProposals: saved.ruleProposals ?? defaults.ruleProposals,
    role: saved.role === undefined ? defaults.role : saved.role,
    actorName: saved.actorName ?? defaults.actorName,
    sidebarCollapsed: saved.sidebarCollapsed ?? defaults.sidebarCollapsed,
    dataSourceStatus: defaults.dataSourceStatus,
    dataSourceError: defaults.dataSourceError,
  }
}

const guardedStorage: StateStorage = {
  getItem: (name) => {
    try {
      if (name === 'casepilot-workspace-v1') localStorage.removeItem('casepilot-demo-v1')
      const value = localStorage.getItem(name)
      if (value === null) return null
      JSON.parse(value)
      return value
    } catch {
      try { localStorage.removeItem(name) } catch { /* storage can be disabled by the browser */ }
      return null
    }
  },
  setItem: (name, value) => {
    try { localStorage.setItem(name, value) } catch { /* in-memory workspace remains usable when storage is full */ }
  },
  removeItem: (name) => {
    try { localStorage.removeItem(name) } catch { /* storage can be disabled by the browser */ }
  },
}

export const useCasePilotStore = create<StoreState>()(persist((set, get) => ({
  ...initialState(),
  now: () => new Date(),
  setRole: (role) => set({ role }),
  setActorName: (actorName) => set({ actorName: actorName.trim() }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  loadDataset: async () => {
    if (!casePilotApi.isConfigured()) {
      set({ dataSourceStatus: 'not-configured', dataSourceError: 'Connect an approved data service to load institutional records.' })
      return
    }
    set({ dataSourceStatus: 'loading', dataSourceError: '' })
    try {
      const dataset = casePilotDatasetSchema.parse(await casePilotApi.getDataset())
      set({ ...dataset, dataSourceStatus: 'connected', dataSourceError: '' })
    } catch (error) {
      set({ dataSourceStatus: 'error', dataSourceError: error instanceof DataSourceUnavailableError ? error.message : error instanceof Error ? error.message : 'The data service could not be reached.' })
    }
  },
  saveCaseAction: (caseRecord, auditEvents) => set((state) => ({ cases: state.cases.map((item) => item.id === caseRecord.id ? caseRecord : item), auditEvents: [...(Array.isArray(auditEvents) ? auditEvents : [auditEvents]), ...state.auditEvents] })),
  saveDocumentAction: (document, auditEvent) => set((state) => ({
    documents: state.documents.map((item) => item.id === document.id ? document : item),
    alerts: document.verification === 'Verified' ? state.alerts.map((alert) => alert.id.startsWith(`evidence:${document.id}:`) ? { ...alert, read: true } : alert) : state.alerts,
    auditEvents: [auditEvent, ...state.auditEvents],
  })),
  createCase: (caseRecord, documents, auditEvents) => set((state) => ({ cases: [caseRecord, ...state.cases], documents: [...documents, ...state.documents], auditEvents: [...auditEvents, ...state.auditEvents] })),
  saveObservation: (observation, auditEvent) => set((state) => ({ observations: [observation, ...state.observations], auditEvents: [auditEvent, ...state.auditEvents] })),
  saveAlertAction: (alert, auditEvent) => set((state) => ({ alerts: state.alerts.map((item) => item.id === alert.id ? alert : item), auditEvents: [auditEvent, ...state.auditEvents] })),
  saveCaseBatch: (cases, auditEvents) => set((state) => ({ cases: state.cases.map((record) => cases.find((item) => item.id === record.id) ?? record), auditEvents: [...auditEvents, ...state.auditEvents] })),
  createDocumentAction: (document, auditEvent) => set((state) => ({ documents: [document, ...state.documents], auditEvents: [auditEvent, ...state.auditEvents] })),
  saveUndertakingAction: (undertaking, auditEvent) => set((state) => ({ undertakings: state.undertakings.map((item) => item.id === undertaking.id ? undertaking : item), auditEvents: [auditEvent, ...state.auditEvents] })),
  saveDecisionAction: (caseRecord, undertaking, auditEvents) => set((state) => ({
    cases: state.cases.map((item) => item.id === caseRecord.id ? caseRecord : item),
    undertakings: [undertaking, ...state.undertakings],
    auditEvents: [...auditEvents, ...state.auditEvents],
  })),
  proposeRuleVersion: (draft, rationale, actor) => {
    const state = get()
    if (state.ruleProposals.some((item) => item.status === 'Pending approval')) throw new Error('Approve or reject the existing draft before proposing another version.')
    const result = proposeWorkflowRules(state.activeWorkflowRules, draft, { actor, rationale, now: get().now() })
    set((current) => ({ ruleProposals: [result.proposal, ...current.ruleProposals], auditEvents: [result.auditEvent, ...current.auditEvents] }))
  },
  approveRuleVersion: (proposalId, actor) => {
    const state = get()
    const proposal = state.ruleProposals.find((item) => item.id === proposalId)
    if (!proposal) throw new Error('The workflow rule proposal no longer exists.')
    const result = approveWorkflowRules(proposal, state.activeWorkflowRules, actor, get().now())
    set((current) => ({
      activeWorkflowRules: result.active,
      ruleProposals: current.ruleProposals.map((item) => item.id === proposalId ? result.proposal : item),
      ruleVersions: [
        ...current.ruleVersions.map((item) => ({ ...item, active: false })),
        { code: `WF-${result.active.version}`, name: 'Active workflow rule set', version: result.active.version, effectiveFrom: result.active.effectiveFrom, updatedBy: actor.name, rationale: proposal.rationale, active: true, },
      ],
      auditEvents: [result.auditEvent, ...current.auditEvents],
    }))
  },
}), {
  name: 'casepilot-workspace-v1',
  version: 1,
  storage: createJSONStorage(() => guardedStorage),
  migrate: (persistedState) => restorePersistedState(persistedState),
  merge: (persistedState, currentState) => ({ ...currentState, ...restorePersistedState(persistedState) }),
  partialize: (state) => ({
    institutions: state.institutions,
    cases: state.cases,
    officers: state.officers,
    committees: state.committees,
    documents: state.documents,
    observations: state.observations,
    undertakings: state.undertakings,
    alerts: state.alerts,
    auditEvents: state.auditEvents,
    ruleVersions: state.ruleVersions,
    activeWorkflowRules: state.activeWorkflowRules,
    ruleProposals: state.ruleProposals,
    role: state.role,
    actorName: state.actorName,
    sidebarCollapsed: state.sidebarCollapsed,
  }),
}))
