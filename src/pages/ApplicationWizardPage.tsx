import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileCheck2, FileText, FileUp, ShieldCheck, Trash2 } from 'lucide-react'
import type { ApplicationType, DocumentRecord, HumanRole } from '@/data/schemas'
import { applicationTypeSchema } from '@/data/schemas'
import { demoActorName } from '@/data/demoActors'
import { nextCaseId } from '@/data/ids'
import { resolveRoute } from '@/engine/routeResolver'
import { submitApplication, uploadEvidence } from '@/engine/workflowActions'
import { useCasePilotStore } from '@/store/useCasePilotStore'
import { Button, Card, Select, StageTracker } from '@/components/ui'

const evidenceChecklist: Array<{ id: string; label: string; kind: DocumentRecord['kind']; required: boolean }> = [
  { id: 'application', label: 'Signed AICTE application form', kind: 'AICTE application', required: true },
  { id: 'land', label: 'Land title or registered lease deed', kind: 'Lease deed', required: true },
  { id: 'building', label: 'Approved building plan', kind: 'Building plan', required: true },
  { id: 'fire', label: 'Current fire safety certificate', kind: 'Fire safety certificate', required: false },
  { id: 'occupancy', label: 'Occupancy certificate', kind: 'Occupancy certificate', required: false },
]

export default function ApplicationWizardPage({ role }: { role: HumanRole }) {
  const navigate = useNavigate()
  const institutions = useCasePilotStore((state) => state.institutions)
  const officers = useCasePilotStore((state) => state.officers)
  const committees = useCasePilotStore((state) => state.committees)
  const cases = useCasePilotStore((state) => state.cases)
  const workflowRules = useCasePilotStore((state) => state.activeWorkflowRules)
  const demoNow = useCasePilotStore((state) => state.demoNow)
  const createCase = useCasePilotStore((state) => state.createCase)
  const [institutionId, setInstitutionId] = useState('inst-001')
  const [applicationType, setApplicationType] = useState<ApplicationType>('New Institution')
  const [checked, setChecked] = useState<string[]>(['application', 'land', 'building'])
  const [files, setFiles] = useState<Array<{ name: string; kind: DocumentRecord['kind'] }>>([])
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const now = useMemo(() => new Date(demoNow), [demoNow])
  const institution = institutions.find((item) => item.id === institutionId) ?? institutions[0]
  const preview = resolveRoute(applicationType, workflowRules.routeOverrides, now, 'route-preview', workflowRules.version).route

  if (role !== 'Institution') return <Card className="p-8"><div className="mx-auto max-w-lg text-center"><ShieldCheck size={32} className="mx-auto text-sage" /><h1 className="mt-3 font-heading text-2xl text-forest">Institution role required</h1><p className="mt-2 text-sm text-sage">Only an Institution role can submit a new application. Switch roles in the top bar to continue.</p></div></Card>

  const submit = () => {
    try {
      applicationTypeSchema.parse(applicationType)
      if (!institution) throw new Error('Choose an institution before continuing.')
      const checkedFiles = checked.map((item) => evidenceChecklist.find((entry) => entry.id === item)).filter((item): item is typeof evidenceChecklist[number] => Boolean(item)).map((item) => ({ name: item.label, kind: item.kind }))
      const evidenceFiles = [...checkedFiles, ...files]
      if (evidenceFiles.length < 1) throw new Error('Attach at least one evidence item before submission.')
      const id = nextCaseId(institution.region, cases.map((item) => item.id))
      const officer = officers.find((item) => item.role === 'Regional Officer' && item.region === institution.region) ?? officers.find((item) => item.role === 'Regional Officer')
      const committee = committees.find((item) => item.region === institution.region) ?? committees[0]
      if (!officer || !committee) throw new Error('The demo workspace has no regional officer or committee configured.')
      const actor = { name: demoActorName.Institution, role: 'Institution' as const }
      const application = submitApplication({ caseId: id, institution, applicationType, assignedOfficerId: officer.id, assignedCommitteeId: committee.id, actor, now, workflowRules })
      const upload = uploadEvidence({ caseId: id, institutionId: institution.id, files: evidenceFiles, actor, now })
      const resultEvents = [...application.auditEvents, ...upload.auditEvents]
      createCase(application.caseRecord, upload.documents, resultEvents)
      navigate(`/app/cases/${id}`)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The application could not be submitted.') }
  }

  return <>
    <div className="mb-6"><div className="eyebrow">03 / INSTITUTION SUBMISSION</div><h1 className="page-title">New application</h1><p className="mt-2 text-sm text-sage">Complete the institution details and evidence review. Submission creates a routed case and an audit trail.</p></div>
    <Card className="overflow-hidden"><div className="border-b border-[var(--hairline)] px-5 py-5"><div className="overflow-x-auto"><StageTracker steps={['Institution', 'Documents', 'Review']} current={['Institution', 'Documents', 'Review'][step]} completed={['Institution', 'Documents', 'Review'].slice(0, step)} /></div></div>
      {step === 0 && <section className="max-w-2xl p-5 sm:p-7"><div className="section-label">01 / APPLICANT DETAILS</div><h2 className="mt-1 font-heading text-2xl text-forest">Who is applying?</h2><label className="mt-5 block text-xs font-semibold text-sage">Demo institution<Select className="mt-1.5 block w-full" value={institutionId} onChange={(event) => setInstitutionId(event.target.value)}>{institutions.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.city}, {item.state}</option>)}</Select></label><div className="mt-4 grid gap-3 rounded-xl bg-cream/65 p-4 sm:grid-cols-3"><div><div className="section-label">AICTE ID</div><div className="mono mt-1 text-xs text-forest">{institution.aicteId}</div></div><div><div className="section-label">REGION</div><div className="mt-1 text-xs text-forest">{institution.region}</div></div><div><div className="section-label">NODAL CONTACT</div><div className="mt-1 text-xs text-forest">{institution.contactName}</div></div></div><label className="mt-5 block text-xs font-semibold text-sage">Application type<Select className="mt-1.5 block w-full" value={applicationType} onChange={(event) => setApplicationType(event.target.value as ApplicationType)}>{applicationTypeSchema.options.map((item) => <option key={item}>{item}</option>)}</Select></label></section>}
      {step === 1 && <section className="p-5 sm:p-7"><div className="section-label">02 / DOCUMENT CHECKLIST</div><h2 className="mt-1 font-heading text-2xl text-forest">Evidence for the application</h2><p className="mt-2 text-sm text-sage">The sample file picker records names and evidence metadata in this prototype; document contents stay on this device.</p><div className="mt-5 grid gap-2 md:grid-cols-2">{evidenceChecklist.map((item) => <label key={item.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--hairline)] bg-white/40 p-3"><input type="checkbox" checked={checked.includes(item.id)} onChange={(event) => setChecked((items) => event.target.checked ? [...items, item.id] : items.filter((id) => id !== item.id))} className="mt-0.5 accent-[var(--forest)]" /><span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-forest">{item.label}</span><span className="mt-1 block text-[10px] text-sage">{item.required ? 'Required checklist item' : 'Additional evidence'} · {item.kind}</span></span><FileCheck2 size={15} className="text-sage" /></label>)}</div><label className="mt-5 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-sage/50 bg-pale-sage/25 p-4"><FileUp size={18} className="text-forest" /><span className="flex-1"><span className="block text-xs font-semibold text-forest">Attach supporting files</span><span className="mt-1 block text-[10px] text-sage">PDF, DOCX or image files · names saved as demo evidence records</span></span><input type="file" multiple className="sr-only" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={(event) => setFiles((current) => [...current, ...Array.from(event.target.files ?? []).map((file) => ({ name: file.name, kind: 'Undertaking' as const }))])} /></label>{files.length > 0 && <ul className="mt-3 space-y-2">{files.map((file, index) => <li key={`${file.name}-${index}`} className="flex items-center gap-2 text-xs text-sage"><FileText size={13} /><span className="flex-1">{file.name}</span><button aria-label={`Remove ${file.name}`} onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={13} /></button></li>)}</ul>}</section>}
      {step === 2 && <section className="grid gap-5 p-5 sm:p-7 xl:grid-cols-[1fr_.85fr]"><div><div className="section-label">03 / REVIEW BEFORE SUBMISSION</div><h2 className="mt-1 font-heading text-2xl text-forest">Check the route</h2><p className="mt-2 text-sm leading-6 text-sage">CasePilot applies a configurable demo route. The mapping explains where human scrutiny and verification take place; officials retain each statutory action.</p><div className="mt-4 rounded-2xl bg-pale-sage/55 p-4"><div className="mono text-xs font-semibold text-forest">{preview.ruleCode} · v{preview.version} · {preview.category}</div><p className="mt-2 text-sm leading-6 text-forest">{preview.reason}</p><div className="mt-3 flex flex-wrap gap-2">{preview.steps.map((item, index) => <span key={item} className="rounded-lg bg-paper px-2.5 py-1.5 text-[10px] text-forest">{String(index + 1).padStart(2, '0')} · {item}</span>)}</div></div><p className="mt-3 text-xs leading-5 text-sage">Reference label: AICTE Approval Process Handbook 2024–27. Production deployment requires a verified handbook clause and authorized rule version.</p></div><div className="rounded-2xl bg-cream/70 p-4"><div className="section-label">APPLICATION SUMMARY</div><dl className="mt-3 space-y-3 text-xs"><div><dt className="text-sage">Institution</dt><dd className="mt-1 font-semibold text-forest">{institution.name}</dd></div><div><dt className="text-sage">Application type</dt><dd className="mt-1 font-semibold text-forest">{applicationType}</dd></div><div><dt className="text-sage">Region</dt><dd className="mt-1 font-semibold text-forest">{institution.region} · {institution.state}</dd></div><div><dt className="text-sage">Checklist and attachments</dt><dd className="mt-1 font-semibold text-forest">{checked.length + files.length} evidence records</dd></div><div><dt className="text-sage">Human review reminder</dt><dd className="mt-1 leading-5 text-forest">This route does not verify evidence or make an approval decision.</dd></div></dl></div></section>}
      {error && <p role="alert" className="mx-5 mb-4 rounded-xl bg-[#F1C1B2] px-3 py-2 text-xs text-[#482219]">{error}</p>}
      <div className="flex flex-wrap justify-between gap-2 border-t border-[var(--hairline)] bg-cream/35 px-5 py-4"><Button variant="secondary" disabled={step === 0} onClick={() => { setError(''); setStep((value) => Math.max(0, value - 1)) }}>Back</Button>{step < 2 ? <Button onClick={() => { setError(''); setStep((value) => value + 1) }}>Continue</Button> : <Button onClick={submit}>Submit application</Button>}</div>
    </Card>
  </>
}
