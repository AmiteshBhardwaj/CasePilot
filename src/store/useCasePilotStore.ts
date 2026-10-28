import { addDays } from 'date-fns'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Alert, AuditEvent, CaseRecord, DemoDataset, DocumentRecord, HumanRole, Observation } from '@/data/schemas'
import { createDemoDataset, DEMO_START } from '@/data/seed'
import { runSlaEngine } from '@/engine/slaEngine'
import { runEscalationEngine, defaultEscalationRules } from '@/engine/escalationEngine'
import { runComplianceEngine } from '@/engine/complianceEngine'
import { seedDemoScenario, type DemoScenario } from '@/engine/demoScenarioEngine'
import { demoActorName } from '@/data/demoActors'

type StoreState = DemoDataset & {
  role: HumanRole | null
  demoNow: string
  sidebarCollapsed: boolean
  now: () => Date
  setRole: (role: HumanRole | null) => void
  toggleSidebar: () => void
  advance: (days: number) => void
  reset: () => void
  resetDemoData: () => void
  seedScenario: (scenario: DemoScenario, actorRole: HumanRole) => void
  saveCaseAction: (caseRecord: CaseRecord, auditEvent: AuditEvent | AuditEvent[]) => void
  saveDocumentAction: (document: DocumentRecord, auditEvent: AuditEvent) => void
  createCase: (caseRecord: CaseRecord, documents: DocumentRecord[], auditEvents: AuditEvent[]) => void
  saveObservation: (observation: Observation, auditEvent: AuditEvent) => void
  saveAlertAction: (alert: Alert, auditEvent: AuditEvent) => void
  saveCaseBatch: (cases: CaseRecord[], auditEvents: AuditEvent[]) => void
}

function appendUnique<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  const found = new Set(current.map((item) => item.id))
  return [...incoming.filter((item) => !found.has(item.id)), ...current]
}

function initialState(): Pick<StoreState, keyof DemoDataset | 'role' | 'demoNow' | 'sidebarCollapsed'> {
  return { ...createDemoDataset(), role: null, demoNow: DEMO_START.toISOString(), sidebarCollapsed: false }
}

export const useCasePilotStore = create<StoreState>()(persist((set, get) => ({
  ...initialState(),
  now: () => new Date(get().demoNow),
  setRole: (role) => set({ role }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  advance: (days) => {
    if (!Number.isFinite(days) || days <= 0) return
    const state = get()
    const now = addDays(new Date(state.demoNow), days)
    const sla = runSlaEngine(state.cases, now)
    const escalation = runEscalationEngine(sla.cases, now, defaultEscalationRules)
    const compliance = runComplianceEngine(state.documents, state.undertakings, now)
    const alerts: Alert[] = appendUnique(state.alerts, [...sla.alerts, ...escalation.alerts, ...compliance.alerts])
    const auditEvents: AuditEvent[] = appendUnique(state.auditEvents, [...sla.auditEvents, ...escalation.auditEvents, ...compliance.auditEvents])
    set({ demoNow: now.toISOString(), cases: escalation.cases, alerts, auditEvents })
  },
  reset: () => set({ demoNow: DEMO_START.toISOString() }),
  resetDemoData: () => set({ ...initialState() }),
  seedScenario: (scenario, actorRole) => {
    const state = get()
    const seeded = seedDemoScenario({
      scenario,
      cases: state.cases,
      documents: state.documents,
      institutions: state.institutions,
      officers: state.officers,
      actorName: demoActorName[actorRole],
      actorRole,
      now: new Date(state.demoNow),
    })
    set((current) => ({
      cases: appendUnique(current.cases, seeded.cases),
      documents: appendUnique(current.documents, seeded.documents),
      alerts: appendUnique(current.alerts, seeded.alerts),
      auditEvents: appendUnique(current.auditEvents, seeded.auditEvents),
    }))
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
}), {
  name: 'casepilot-demo-v1',
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({ ...state, now: undefined } as unknown as StoreState),
}))
