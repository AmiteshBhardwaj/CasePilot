import { useState, type FormEvent } from 'react'
import { format } from 'date-fns'
import { Check, ClipboardCheck, FileUp, ShieldCheck } from 'lucide-react'
import type { HumanRole, Undertaking } from '@/data/schemas'
import { submitUndertakingEvidence, verifyUndertakingEvidence } from '@/engine/complianceActions'
import { useCasePilotStore } from '@/store/useCasePilotStore'
import { Button, Card, Dialog, EmptyState, Input, Tabs } from '@/components/ui'

export default function CompliancePage({ role }: { role: HumanRole }) {
  const actorName = useCasePilotStore((state) => state.actorName)
  const undertakings = useCasePilotStore((state) => state.undertakings)
  const institutions = useCasePilotStore((state) => state.institutions)
  const saveUndertakingAction = useCasePilotStore((state) => state.saveUndertakingAction)
  const [tab, setTab] = useState('Open obligations')
  const [evidenceNames, setEvidenceNames] = useState<Record<string, string>>({})
  const [outcomes, setOutcomes] = useState<Record<string, 'Verified' | 'Rejected' | 'Needs clarification'>>({})
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const now = new Date()
  const records = undertakings
  const open = records.filter((item) => item.status !== 'Accepted')
  const closed = records.filter((item) => item.status === 'Accepted')
  const visible = (tab === 'Open obligations' ? open : closed).slice().sort((a, b) => a.dueAt.localeCompare(b.dueAt))
  const canVerify = ['Regional Officer', 'Bureau Officer', 'Authority'].includes(role)
  const actor = { name: actorName, role }

  const upload = (item: Undertaking, close: () => void, event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      const result = submitUndertakingEvidence(item, { actor, evidenceName: evidenceNames[item.id] ?? '', now })
      saveUndertakingAction(result.undertaking, result.auditEvent)
      setError('')
      close()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Evidence could not be submitted.') }
  }
  const verify = (item: Undertaking, close: () => void, event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      const result = verifyUndertakingEvidence(item, { actor, outcome: outcomes[item.id] ?? 'Verified', reason: reasons[item.id], now })
      saveUndertakingAction(result.undertaking, result.auditEvent)
      setError('')
      close()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Verification could not be recorded.') }
  }

  if (role === 'Committee') return <Card className="p-8"><div className="mx-auto max-w-lg text-center"><h1 className="font-heading text-2xl text-forest">Compliance register access</h1><p className="mt-2 text-sm text-sage">Committee members see assigned case evidence and notes from their committee workspace.</p></div></Card>

  return <>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><div className="eyebrow">07 / POST-APPROVAL CONDITIONS</div><h1 className="page-title">Compliance & undertakings</h1><p className="mt-2 text-sm text-sage">Time-bound conditions remain open until an authorized officer verifies submitted evidence.</p></div><span className="status-chip status-due-soon">30 / 15 / 7-day windows</span></div>
    {error && <div role="alert" className="mb-4 rounded-xl bg-[#F1C1B2] px-3 py-2 text-xs text-[#482219]">{error}</div>}
    <div className="mb-4 grid gap-3 sm:grid-cols-3"><Card className="p-4"><div className="section-label">OPEN OBLIGATIONS</div><div className="mt-2 font-heading text-3xl text-forest">{open.length}</div><p className="mt-1 text-xs text-sage">Pending a submission or officer verification</p></Card><Card className="p-4"><div className="section-label">OVERDUE</div><div className="mt-2 font-heading text-3xl text-oxblood">{open.filter((item) => item.status === 'Overdue').length}</div><p className="mt-1 text-xs text-sage">Reminders continue until closure</p></Card><Card className="p-4"><div className="section-label">CLOSED</div><div className="mt-2 font-heading text-3xl text-forest">{closed.length}</div><p className="mt-1 text-xs text-sage">Evidence verified and accepted by an officer</p></Card></div>
    <Card className="overflow-hidden"><div className="px-5 pt-4"><Tabs tabs={['Open obligations', 'Closed']} active={tab} onChange={setTab} /></div>{visible.length ? <div className="divide-y divide-[var(--hairline)]">{visible.map((item) => {
      const institution = institutions.find((entry) => entry.id === item.institutionId)
      const days = Math.ceil((new Date(item.dueAt).getTime() - now.getTime()) / 86_400_000)
      const needsEvidence = role === 'Institution' && item.status !== 'Accepted'
      return <article key={item.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_auto]">
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="mono text-[10px] text-sage">{item.id}</span><span className={`status-chip ${item.status === 'Accepted' ? 'status-closed' : item.status === 'Overdue' ? 'status-overdue' : item.status === 'Submitted' ? 'status-on-track' : 'status-due-soon'}`}>{item.status}</span>{item.verification && <span className="status-chip status-neutral">Evidence: {item.verification}</span>}</div><h2 className="mt-2 text-sm font-semibold text-forest">{item.title}</h2><p className="mt-1 text-xs text-sage">{institution?.shortName} · {institution?.city} · {institution?.region} Region{item.caseId ? ` · ${item.caseId}` : ''}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-sage"><span>Due {format(new Date(item.dueAt), 'dd MMM yyyy')}</span><span className={days < 0 ? 'font-semibold text-oxblood' : days <= 7 ? 'font-semibold text-[#705019]' : ''}>{days < 0 ? `${Math.abs(days)} days overdue` : `${days} days remaining`}</span>{item.evidenceName && <span>Evidence: {item.evidenceName}</span>}{item.verifiedBy && <span>Reviewed by {item.verifiedBy}{item.verifiedAt ? ` · ${format(new Date(item.verifiedAt), 'dd MMM yyyy')}` : ''}</span>}</div></div>
        <div className="flex flex-wrap items-start gap-2 lg:justify-end">{needsEvidence && <Dialog title="Submit undertaking evidence" description="This stores evidence metadata in the local workspace. The obligation stays open until an officer reviews it." trigger={<Button variant="secondary"><FileUp size={14} /> {item.status === 'Submitted' ? 'Replace evidence' : 'Upload proof'}</Button>}>{(close) => <form className="space-y-3" onSubmit={(event) => upload(item, close, event)}><label className="block text-xs font-semibold text-sage">Evidence file name<input className="control mt-1.5 block w-full" type="file" onChange={(event) => setEvidenceNames((current) => ({ ...current, [item.id]: event.target.files?.[0]?.name ?? '' }))} /></label><label className="block text-xs font-semibold text-sage">Or enter the evidence file name<Input className="mt-1.5 block w-full" value={evidenceNames[item.id] ?? ''} onChange={(event) => setEvidenceNames((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Evidence file name" /></label><Button type="submit">Submit for human verification</Button></form>}</Dialog>}{canVerify && (item.status === 'Submitted' || item.status === 'Needs clarification') && <Dialog title="Verify undertaking evidence" description="The selected officer’s identity and verification outcome will be recorded." trigger={<Button><ClipboardCheck size={14} /> Review evidence</Button>}>{(close) => <form className="space-y-3" onSubmit={(event) => verify(item, close, event)}><p className="rounded-xl bg-cream/70 p-3 text-xs text-forest">{item.evidenceName ?? 'Evidence file'} · submitted {item.submittedAt ? format(new Date(item.submittedAt), 'dd MMM yyyy') : 'date not recorded'}</p><label className="block text-xs font-semibold text-sage">Review outcome<select className="control mt-1.5 block w-full" value={outcomes[item.id] ?? 'Verified'} onChange={(event) => setOutcomes((current) => ({ ...current, [item.id]: event.target.value as typeof outcomes[string] }))}><option>Verified</option><option>Needs clarification</option><option>Rejected</option></select></label>{(outcomes[item.id] ?? 'Verified') !== 'Verified' && <label className="block text-xs font-semibold text-sage">Reason<textarea className="control mt-1.5 min-h-20 w-full" value={reasons[item.id] ?? ''} onChange={(event) => setReasons((current) => ({ ...current, [item.id]: event.target.value }))} required placeholder="Explain what evidence or correction is needed." /></label>}<Button type="submit"><Check size={14} /> Save human review</Button></form>}</Dialog>}</div>
      </article>
    })}</div> : <EmptyState title={tab === 'Closed' ? 'No obligations closed yet' : 'No open obligations'} description={tab === 'Closed' ? 'Officer-verified conditions will appear here.' : 'New approval conditions and submitted evidence will appear here.'} />}</Card>
    <p className="mt-4 inline-flex items-center gap-2 text-xs leading-5 text-sage"><ShieldCheck size={14} />The workflow tracks due dates and evidence state. It does not accept or reject statutory compliance automatically.</p>
  </>
}
