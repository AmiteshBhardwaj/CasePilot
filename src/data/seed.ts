import { addDays, subDays } from 'date-fns'
import type { Alert, AuditEvent, CaseRecord, Committee, DemoDataset, DocumentRecord, Institution, Observation, Officer, Region, Undertaking } from './schemas'
import { resolveRoute } from '@/engine/routeResolver'
import { stageTimelines } from '@/engine/slaEngine'
import { makeAuditEvent } from '@/engine/audit'

export const DEMO_START = new Date('2026-10-28T09:00:00+05:30')
const regions: Region[] = ['Northern', 'Southern', 'Eastern', 'Western', 'Central', 'South-Western', 'South-Central', 'North-Eastern']
const regionMeta: Record<Region, { code: string; state: string; cities: string[] }> = {
  Northern: { code: 'NR', state: 'Haryana', cities: ['Rohtak', 'Sonipat', 'Gurugram'] },
  Southern: { code: 'SR', state: 'Tamil Nadu', cities: ['Coimbatore', 'Madurai', 'Chennai'] },
  Eastern: { code: 'ER', state: 'West Bengal', cities: ['Kolkata', 'Durgapur', 'Siliguri'] },
  Western: { code: 'WR', state: 'Maharashtra', cities: ['Pune', 'Nashik', 'Nagpur'] },
  Central: { code: 'CR', state: 'Madhya Pradesh', cities: ['Bhopal', 'Indore', 'Jabalpur'] },
  'South-Western': { code: 'SWR', state: 'Karnataka', cities: ['Bengaluru', 'Mysuru', 'Hubballi'] },
  'South-Central': { code: 'SCR', state: 'Telangana', cities: ['Hyderabad', 'Warangal', 'Karimnagar'] },
  'North-Eastern': { code: 'NER', state: 'Assam', cities: ['Guwahati', 'Dibrugarh', 'Silchar'] },
}

const institutionNames = [
  ['National Institute of Applied Engineering', 'NIAE', 'Engineering'],
  ['Saraswati School of Technology', 'SST', 'Engineering'],
  ['Deccan Institute of Management Studies', 'DIMS', 'Management'],
  ['Kaveri College of Pharmacy', 'KCP', 'Pharmacy'],
  ['Eastern Valley Institute of Technology', 'EVIT', 'Engineering'],
  ['Maharashtra Academy of Architecture', 'MAA', 'Architecture'],
  ['Central Bharat College of Engineering', 'CBCE', 'Engineering'],
  ['Malnad School of Management', 'MSM', 'Management'],
  ['Sahyadri Institute of Pharmaceutical Sciences', 'SIPS', 'Pharmacy'],
  ['Brahmaputra College of Engineering', 'BCE', 'Engineering'],
  ['Vidarbha Institute of Hotel Management', 'VIHM', 'Hotel Management'],
  ['Aravali Technical Campus', 'ATC', 'Engineering'],
  ['Coromandel School of Design and Architecture', 'CSDA', 'Architecture'],
  ['Narmada Institute of Advanced Studies', 'NIAS', 'Engineering'],
  ['Godavari Institute of Technology', 'GIT', 'Engineering'],
] as const

const institutionContacts = [
  'Ananya Kulkarni', 'Raghav Menon', 'Meera Iyer', 'Arjun Das', 'Priya Choudhury', 'Nikhil Patil', 'Sonal Tiwari', 'Kavya Hegde',
  'Vivek Rao', 'Ritu Sharma', 'Farhan Ali', 'Pallavi Nair', 'Karthik Reddy', 'Aditi Bose', 'Manoj Bhat',
]

const officerRows: Array<{ name: string; role: Officer['role']; designation: string; region?: Region }> = [
  { name: 'Ritika Anand', role: 'Regional Officer', designation: 'Regional Officer', region: 'Northern' },
  { name: 'S. K. Venkatesh', role: 'Regional Officer', designation: 'Regional Officer', region: 'Southern' },
  { name: 'Anupam Dutta', role: 'Regional Officer', designation: 'Regional Officer', region: 'Eastern' },
  { name: 'Nandita Joshi', role: 'Regional Officer', designation: 'Regional Officer', region: 'Western' },
  { name: 'Dr. A. K. Sinha', role: 'Bureau Officer', designation: 'Deputy Director, Approvals Bureau' },
  { name: 'Geeta Balan', role: 'Bureau Officer', designation: 'Assistant Director, Approvals Bureau' },
  { name: 'R. P. Choudhary', role: 'Bureau Officer', designation: 'Under Secretary, Approvals Bureau' },
  { name: 'Prof. Shalini Rao', role: 'Committee', designation: 'SAC Chair, Southern Region' },
  { name: 'Prof. Indrajit Sen', role: 'Committee', designation: 'SHC Chair, Eastern Region' },
  { name: 'Dr. Asha Gopal', role: 'Committee', designation: 'SAC Member, Western Region' },
  { name: 'Vikram Bedi', role: 'Authority', designation: 'Competent Authority' },
  { name: 'Sanjay Prasad', role: 'Institution', designation: 'Institution Nodal Officer' },
]

const applicationTypes: CaseRecord['applicationType'][] = ['New Institution', 'Extension of Approval', 'Increase in Intake', 'Additional Course', 'Change in Site', 'Second Shift', 'EoA with Closure', 'Trust Transfer']
const caseTitles: Record<CaseRecord['applicationType'], string> = {
  'New Institution': 'Application for establishment of a new technical institution',
  'Extension of Approval': 'Extension of Approval for academic year 2026–27',
  'Increase in Intake': 'Proposal to increase approved intake in Computer Engineering',
  'Additional Course': 'Application to add B.Tech Artificial Intelligence and Data Science',
  'Change in Site': 'Request for change of institution site and campus address',
  'Second Shift': 'Permission for a second shift in existing programmes',
  'EoA with Closure': 'Voluntary closure and surrender of approval',
  'Trust Transfer': 'Change in sponsoring trust and governing body',
}

function isoDays(date: Date, days: number): string { return addDays(date, days).toISOString() }
function makeInstitution(index: number): Institution {
  const row = institutionNames[index]
  const region = regions[index % regions.length]
  const meta = regionMeta[region]
  return {
    id: `inst-${String(index + 1).padStart(3, '0')}`, name: row[0], shortName: row[1], region, state: meta.state, city: meta.cities[index % meta.cities.length],
    institutionType: row[2], aicteId: `1-${index % 8}-${String(220000 + index * 137).padStart(6, '0')}`,
    contactName: institutionContacts[index], contactEmail: `nodal.${row[1].toLowerCase()}@demo-institute.ac.in`, isDemoData: true,
  }
}

function buildCase(index: number, institutions: Institution[], routeAudits: AuditEvent[]): CaseRecord {
  const institution = institutions[index % institutions.length]
  const type = applicationTypes[index % applicationTypes.length]
  const age = index === 7 ? 42 : index === 11 ? 36 : (index * 7) % 86
  const submitted = subDays(DEMO_START, age)
  const idNumber = 4821 + index
  const id = `CP-2026-${regionMeta[institution.region].code}-${String(idNumber).padStart(5, '0')}`
  const { route, auditEvent } = resolveRoute(type, {}, submitted, id)
  routeAudits.push(auditEvent)
  const isClosed = index % 17 === 0
  const currentIndex = isClosed ? route.steps.length - 1 : index === 7 ? Math.min(1, route.steps.length - 1) : Math.min(index % 3, route.steps.length - 1)
  const currentStage = route.steps[currentIndex]
  const currentEntered = subDays(DEMO_START, age)
  const stages = route.steps.map((step, stepIndex) => {
    const enteredAt = stepIndex <= currentIndex ? subDays(currentEntered, (currentIndex - stepIndex) * 8) : addDays(currentEntered, (stepIndex - currentIndex) * 7)
    const status: CaseRecord['stages'][number]['status'] = stepIndex < currentIndex ? 'Completed'
      : stepIndex > currentIndex ? 'Queued'
        : isClosed ? 'Completed'
          : index === 2 ? 'Returned'
            : step === 'SAC/SHC' ? 'Awaiting committee'
              : 'In progress'
    return {
      id: `${id}-stage-${stepIndex + 1}`, label: step, status, enteredAt: enteredAt.toISOString(), dueAt: isoDays(enteredAt, stageTimelines[step]),
      ...(status === 'Completed' ? { completedAt: addDays(enteredAt, 2).toISOString() } : {}),
    }
  })
  const assignedOfficer = `off-${String((index % 4) + 1).padStart(2, '0')}`
  let status: CaseRecord['status'] = isClosed ? 'Closed' : 'On track'
  if (!isClosed) {
    const current = stages.find((stage) => stage.label === currentStage)
    const remaining = current ? Math.round((new Date(current.dueAt).getTime() - DEMO_START.getTime()) / 86_400_000) : 0
    status = remaining < 0 ? 'Overdue' : remaining <= 5 ? 'Due soon' : 'On track'
  }
  if (index === 11) status = 'Escalated'
  return {
    id, institutionId: institution.id, applicationType: type, title: caseTitles[type], region: institution.region, route, stages, currentStage,
    status, submittedAt: submitted.toISOString(), updatedAt: isoDays(DEMO_START, -Math.min(age, 2)), assignedOfficerId: assignedOfficer,
    returnedCount: index === 2 ? 2 : index === 3 ? 1 : 0,
    assignedCommitteeId: `com-${String((index % 5) + 1).padStart(2, '0')}`,
    escalationLevel: index === 11 ? 'Authority' : 'None', evidenceVerified: index % 9 !== 4,
    ...(isClosed ? { decision: index % 2 === 0 ? 'Approved' as const : 'Rejected' as const, decidedBy: 'Vikram Bedi' } : {}), isDemoData: true,
  }
}

function buildDocuments(institutions: Institution[], cases: CaseRecord[]): DocumentRecord[] {
  const docs: DocumentRecord[] = []
  const kinds: DocumentRecord['kind'][] = ['Lease deed', 'Land title', 'Building plan', 'Fire safety certificate', 'Occupancy certificate', 'Structural stability certificate', 'Affidavit', 'Faculty list']
  for (let i = 0; i < 24; i += 1) {
    const inst = institutions[i % institutions.length]
    const relatedCase = cases[(i * 3) % cases.length]
    const kind = kinds[i % kinds.length]
    const expiryOffset = [-18, -3, 3, 6, 12, 19, 27, 45, 120, 240, 365, 730][i % 12]
    const verification: DocumentRecord['verification'] = i === 5 || i === 18 ? 'Pending' : i === 9 ? 'Needs clarification' : i === 14 ? 'Rejected' : 'Verified'
    docs.push({
      id: `doc-${String(i + 1).padStart(3, '0')}`, institutionId: inst.id, caseId: relatedCase.id,
      name: kind === 'Lease deed' ? `Registered lease deed — ${inst.city} campus` : `${kind} — ${inst.shortName} ${2025 + (i % 2)}`,
      kind, uploadedAt: subDays(DEMO_START, 18 + (i % 50)).toISOString(),
      ...(i % 7 !== 6 ? { expiresAt: isoDays(DEMO_START, expiryOffset) } : {}), verification,
      ...(verification === 'Verified' ? { verifiedBy: 'Ritika Anand', verifiedAt: subDays(DEMO_START, 4).toISOString() } : {}), isDemoData: true,
    })
  }
  return docs
}

function createHistory(cases: CaseRecord[], docs: DocumentRecord[], routeAudits: AuditEvent[]): AuditEvent[] {
  const names = ['Ritika Anand', 'S. K. Venkatesh', 'Anupam Dutta', 'Nandita Joshi', 'Dr. A. K. Sinha', 'Prof. Shalini Rao', 'Vikram Bedi']
  const roles: AuditEvent['actorRole'][] = ['Regional Officer', 'Regional Officer', 'Regional Officer', 'Regional Officer', 'Bureau Officer', 'Committee', 'Authority']
  const actions = ['Application submitted', 'Scrutiny checklist opened', 'Document received', 'Observation raised', 'Institution response received', 'EVC scheduled', 'Site inspection report uploaded', 'Committee agenda prepared', 'SLA status changed to Due soon', 'Compliance alert generated']
  const historical: AuditEvent[] = Array.from({ length: 90 }, (_, index) => {
    const at = subDays(DEMO_START, (index * 13) % 110).toISOString()
    const caseRecord = cases[(index * 11) % cases.length]
    const action = actions[index % actions.length]
    return makeAuditEvent({
      id: `audit-seed-${String(index + 1).padStart(3, '0')}`, at, actorName: names[index % names.length], actorRole: roles[index % roles.length], action,
      entityType: index % 8 === 0 ? 'Document' : 'Case', entityId: index % 8 === 0 ? docs[index % docs.length].id : caseRecord.id,
      detail: `${action} for ${caseRecord.id}; ${caseRecord.title.toLowerCase()}.`,
    })
  })
  return [...routeAudits, ...historical].sort((a, b) => b.at.localeCompare(a.at))
}

function createAlerts(cases: CaseRecord[], docs: DocumentRecord[], undertakings: Undertaking[]): Alert[] {
  const alerts: Alert[] = []
  const add = (alert: Omit<Alert, 'isDemoData' | 'read' | 'channels'> & { channels?: Alert['channels'] }) => alerts.push({ ...alert, channels: alert.channels ?? ['In-app'], read: false, isDemoData: true })
  const overdueCase = cases[7]
  add({ id: 'seed-alert-sla-evc', type: 'SLA', severity: 'Critical', title: 'EVC stage overdue', message: `${overdueCase.id} has exceeded its EVC review timeline.`, caseId: overdueCase.id, createdAt: DEMO_START.toISOString() })
  const escalated = cases[11]
  add({ id: 'seed-alert-authority', type: 'Escalation', severity: 'Critical', title: 'Escalated to Authority', message: `${escalated.id} crossed the configured Bureau Officer threshold and is now with the Authority.`, caseId: escalated.id, createdAt: DEMO_START.toISOString() })
  for (const doc of docs) {
    if (!doc.expiresAt) continue
    const remaining = Math.round((new Date(doc.expiresAt).getTime() - DEMO_START.getTime()) / 86_400_000)
    if (remaining <= 30) add({ id: `seed-alert-expiry-${doc.id}`, type: 'Compliance', severity: remaining <= 0 || remaining <= 7 ? 'Critical' : 'Warning', title: remaining < 0 ? 'Lease or certificate expired' : `Document expires in ${remaining} days`, message: `${doc.name} requires renewal evidence and review.`, institutionId: doc.institutionId, caseId: doc.caseId, createdAt: DEMO_START.toISOString() })
  }
  for (const undertaking of undertakings) {
    if (undertaking.status === 'Pending' && new Date(undertaking.dueAt) < DEMO_START) add({ id: `seed-alert-undertaking-${undertaking.id}`, type: 'Compliance', severity: 'Critical', title: 'Undertaking overdue', message: `${undertaking.title} is awaiting an institution response.`, institutionId: undertaking.institutionId, caseId: undertaking.caseId, createdAt: DEMO_START.toISOString() })
  }
  return alerts
}

export function createDemoDataset(): DemoDataset {
  const institutions = institutionNames.map((_, index) => makeInstitution(index))
  const officers: Officer[] = officerRows.map((row, index) => ({ id: `off-${String(index + 1).padStart(2, '0')}`, ...row, email: `${row.name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '')}@aicte-demo.gov.in`, isDemoData: true }))
  const committees: Committee[] = [
    { id: 'com-01', name: 'Southern Region Scrutiny and Appraisal Committee', kind: 'SAC', region: 'Southern', chair: 'Prof. Shalini Rao', memberCount: 7, isDemoData: true },
    { id: 'com-02', name: 'Eastern Region Scrutiny and Appraisal Committee', kind: 'SAC', region: 'Eastern', chair: 'Prof. Indrajit Sen', memberCount: 6, isDemoData: true },
    { id: 'com-03', name: 'Western Region Scrutiny and Appraisal Committee', kind: 'SAC', region: 'Western', chair: 'Dr. Asha Gopal', memberCount: 8, isDemoData: true },
    { id: 'com-04', name: 'North-Eastern State Committee', kind: 'SHC', region: 'North-Eastern', chair: 'Prof. B. C. Saikia', memberCount: 5, isDemoData: true },
    { id: 'com-05', name: 'Central Region Scrutiny and Appraisal Committee', kind: 'SAC', region: 'Central', chair: 'Prof. Neelam Verma', memberCount: 7, isDemoData: true },
  ]
  const routeAudits: AuditEvent[] = []
  const cases = Array.from({ length: 60 }, (_, index) => buildCase(index, institutions, routeAudits))
  const documents = buildDocuments(institutions, cases)
  const undertakings: Undertaking[] = Array.from({ length: 25 }, (_, index) => {
    const institution = institutions[(index * 3) % institutions.length]
    const caseRecord = cases[(index * 2) % cases.length]
    const dueOffset = [-25, -10, -2, 4, 9, 18, 35, 60][index % 8]
    const status: Undertaking['status'] = index % 7 === 0 ? 'Accepted' : index % 5 === 0 ? 'Submitted' : dueOffset < 0 ? 'Overdue' : 'Pending'
    return { id: `und-${String(index + 1).padStart(3, '0')}`, institutionId: institution.id, caseId: caseRecord.id, title: ['Faculty joining undertaking', 'Fire safety renewal undertaking', 'Land ownership compliance undertaking', 'AICTE portal data confirmation'][index % 4], dueAt: isoDays(DEMO_START, dueOffset), ...(status === 'Submitted' || status === 'Accepted' ? { submittedAt: isoDays(DEMO_START, -4 - index) } : {}), status, isDemoData: true }
  })
  const observations: Observation[] = cases.slice(0, 18).map((caseRecord, index) => ({
    id: `obs-${String(index + 1).padStart(3, '0')}`, caseId: caseRecord.id,
    text: ['Upload the certified building plan with the competent municipal authority seal.', 'Please reconcile faculty appointment dates with the university affiliation letter.', 'Provide the current fire safety certificate for the approved campus address.', 'Clarify the lease tenure and attach the registered schedule of property.'][index % 4],
    raisedBy: officers[index % 4].name, raisedAt: subDays(DEMO_START, 10 + index).toISOString(), status: index % 3 === 0 ? 'Resolved' : index % 3 === 1 ? 'Responded' : 'Open',
    ...(index % 3 === 0 ? { resolvedAt: subDays(DEMO_START, 2).toISOString() } : {}), isDemoData: true,
  }))
  const ruleVersions = [
    { code: 'RT-2026.1', name: 'Application routing matrix', version: '2026.1', effectiveFrom: new Date('2026-04-01T00:00:00Z').toISOString(), updatedBy: 'Approvals Bureau', rationale: 'Routes applications to the required human scrutiny and verification stages.', active: true, isDemoData: true as const },
    { code: 'SLA-2026.1', name: 'Stage service timelines', version: '2026.1', effectiveFrom: new Date('2026-04-01T00:00:00Z').toISOString(), updatedBy: 'Approvals Bureau', rationale: 'Defines internal workflow timelines for monitoring and alerting.', active: true, isDemoData: true as const },
  ]
  return {
    institutions, cases, officers, committees, documents, observations, undertakings, ruleVersions,
    auditEvents: createHistory(cases, documents, routeAudits), alerts: createAlerts(cases, documents, undertakings),
  }
}
