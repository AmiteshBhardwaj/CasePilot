import { addDays, subDays } from 'date-fns'
import type { Alert, AuditEvent, CaseRecord, DocumentRecord, HumanRole, Institution, Officer, Stage } from '@/data/schemas'
import { nextCaseId } from '@/data/ids'
import { resolveRoute } from './routeResolver'
import { makeAuditEvent } from './audit'

export type DemoScenario = 'new-institution' | 'lease-expiring' | 'overdue-evc'
export type ScenarioOutput = { cases: CaseRecord[]; documents: DocumentRecord[]; alerts: Alert[]; auditEvents: AuditEvent[] }

const routeDurations: Record<Stage['label'], number> = { Scrutiny: 12, EVC: 18, 'SAC/SHC': 15, 'Authority Decision': 10 }

function actionEvent(input: { id: string; now: Date; actorName: string; actorRole: HumanRole; action: string; entityType: AuditEvent['entityType']; entityId: string; detail: string }): AuditEvent {
  return makeAuditEvent({ ...input, at: input.now.toISOString() })
}

export function seedDemoScenario(input: {
  scenario: DemoScenario; cases: CaseRecord[]; documents: DocumentRecord[]; institutions: Institution[]; officers: Officer[];
  actorName: string; actorRole: HumanRole; now: Date;
}): ScenarioOutput {
  const empty: ScenarioOutput = { cases: [], documents: [], alerts: [], auditEvents: [] }
  const northern = input.institutions.find((item) => item.region === 'Northern') ?? input.institutions[0]
  const regionOfficer = input.officers.find((item) => item.role === 'Regional Officer' && item.region === northern.region) ?? input.officers.find((item) => item.role === 'Regional Officer')
  if (!northern || !regionOfficer) throw new Error('The demo dataset is missing a Northern Region institution or officer.')
  if (input.scenario === 'lease-expiring') {
    const base = input.documents.find((item) => item.kind === 'Lease deed')
    if (!base) throw new Error('No lease deed exists in the demo data.')
    let suffix = 1
    while (input.documents.some((item) => item.id === `scenario-lease-${input.now.getTime()}-${suffix}`)) suffix += 1
    const documentId = `scenario-lease-${input.now.getTime()}-${suffix}`
    const expiresAt = addDays(input.now, 7).toISOString()
    const document: DocumentRecord = { ...base, id: documentId, name: `Scenario lease deed — ${northern.city} campus`, institutionId: northern.id, expiresAt, uploadedAt: input.now.toISOString(), verification: 'Verified', verifiedBy: input.actorName, verifiedAt: input.now.toISOString(), isDemoData: true }
    const alert: Alert = { id: `scenario-alert-${documentId}`, type: 'Compliance', severity: 'Warning', title: 'Lease renewal due in 7 days', message: `${document.name} reaches its expiry date soon. Upload the renewed registered lease for human verification.`, institutionId: northern.id, ownerId: regionOfficer.id, dueAt: expiresAt, missingEvidence: ['Renewed registered lease deed'], channels: ['In-app', 'Email', 'SMS'], createdAt: input.now.toISOString(), read: false, isDemoData: true }
    const auditEvent = actionEvent({ id: `scenario-audit-${documentId}`, now: input.now, actorName: input.actorName, actorRole: input.actorRole, action: 'Demo scenario seeded', entityType: 'Document', entityId: document.id, detail: `${input.actorName} seeded a seven-day lease-expiry scenario for ${northern.shortName}.` })
    return { ...empty, documents: [document], alerts: [alert], auditEvents: [auditEvent] }
  }

  const scenarioRegion = input.scenario === 'overdue-evc' ? northern : input.institutions.find((item) => item.id === 'inst-001') ?? northern
  const caseId = nextCaseId(scenarioRegion.region, input.cases.map((item) => item.id))
  const appType = input.scenario === 'new-institution' ? 'New Institution' : 'Extension of Approval'
  const { route, auditEvent: routeEvent } = resolveRoute(appType, {}, input.now, caseId)
  const officer = input.officers.find((item) => item.role === 'Regional Officer' && item.region === scenarioRegion.region) ?? regionOfficer
  const committeeId = `com-${String((input.institutions.indexOf(scenarioRegion) % 5) + 1).padStart(2, '0')}`
  const currentIndex = input.scenario === 'new-institution' ? 0 : 1
  const current = route.steps[currentIndex]
  const entered = input.scenario === 'new-institution' ? input.now : subDays(input.now, 20)
  const stages: Stage[] = route.steps.map((step, index) => {
    const enteredAt = index < currentIndex ? subDays(entered, 8).toISOString() : index === currentIndex ? entered.toISOString() : addDays(input.now, (index - currentIndex) * 7).toISOString()
    const dueAt = index === currentIndex && input.scenario === 'overdue-evc' ? subDays(input.now, 2).toISOString() : addDays(new Date(enteredAt), routeDurations[step]).toISOString()
    return { id: `${caseId}-stage-${index + 1}`, label: step, status: index < currentIndex ? 'Completed' : index === currentIndex ? 'In progress' : 'Queued', enteredAt, dueAt }
  })
  const caseRecord: CaseRecord = {
    id: caseId, institutionId: scenarioRegion.id, applicationType: appType, title: input.scenario === 'new-institution' ? 'Scenario application for a new technical institution' : 'Scenario Extension of Approval awaiting EVC', region: scenarioRegion.region,
    route, stages, currentStage: current, status: input.scenario === 'overdue-evc' ? 'Overdue' : 'On track', submittedAt: entered.toISOString(), updatedAt: input.now.toISOString(), assignedOfficerId: officer.id,
    assignedCommitteeId: committeeId, returnedCount: 0, escalationLevel: 'None', evidenceVerified: input.scenario !== 'new-institution', isDemoData: true,
  }
  const scenarioEvent = actionEvent({ id: `scenario-audit-${caseId}`, now: input.now, actorName: input.actorName, actorRole: input.actorRole, action: 'Demo scenario seeded', entityType: 'Case', entityId: caseId, detail: `${input.actorName} seeded the ${input.scenario} case scenario for ${scenarioRegion.shortName}.` })
  const dueAlert: Alert[] = input.scenario === 'overdue-evc' ? [{ id: `scenario-alert-${caseId}`, type: 'SLA', severity: 'Critical', title: 'EVC stage overdue', message: `${caseId} is two days overdue for EVC scheduling.`, caseId, institutionId: scenarioRegion.id, ownerId: officer.id, dueAt: stages[currentIndex].dueAt, channels: ['In-app'], createdAt: input.now.toISOString(), read: false, isDemoData: true }] : []
  return { ...empty, cases: [caseRecord], alerts: dueAlert, auditEvents: [scenarioEvent, routeEvent] }
}
