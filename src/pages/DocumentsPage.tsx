import { useMemo, useState, type FormEvent } from 'react'
import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { Check, FileClock, FileUp, ShieldCheck } from 'lucide-react'
import { documentKindSchema, type DocumentRecord, type HumanRole } from '@/data/schemas'
import { demoActorName } from '@/data/demoActors'
import { submitDocumentRenewal } from '@/engine/complianceActions'
import { documentValidity } from '@/engine/complianceEngine'
import { verifyDocument } from '@/engine/humanActions'
import { useCasePilotStore } from '@/store/useCasePilotStore'
import { Button, Card, Dialog, EmptyState, Input, Select } from '@/components/ui'

type ReviewOutcome = 'Verified' | 'Rejected' | 'Needs clarification'

export default function DocumentsPage({ role }: { role: HumanRole }) {
  const allDocuments = useCasePilotStore((state) => state.documents)
  const institutions = useCasePilotStore((state) => state.institutions)
  const demoNow = useCasePilotStore((state) => state.demoNow)
  const createDocumentAction = useCasePilotStore((state) => state.createDocumentAction)
  const saveDocumentAction = useCasePilotStore((state) => state.saveDocumentAction)
  const [kind, setKind] = useState<DocumentRecord['kind']>('Lease deed')
  const [expiresOn, setExpiresOn] = useState('')
  const [fileName, setFileName] = useState('')
  const [filter, setFilter] = useState('All records')
  const [outcomes, setOutcomes] = useState<Record<string, ReviewOutcome>>({})
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const now = useMemo(() => new Date(demoNow), [demoNow])
  const documents = allDocuments.filter((document) => role !== 'Institution' || document.institutionId === 'inst-001')
  const validity = documents.map((document) => documentValidity(document, now)).filter((item): item is NonNullable<typeof item> => Boolean(item))
  const dueSoon = validity.filter((item) => item.daysRemaining >= 0 && item.daysRemaining <= 30).length
  const expired = validity.filter((item) => item.daysRemaining < 0).length
  const pending = documents.filter((item) => item.verification !== 'Verified').length
  const visible = documents.filter((document) => {
    const state = documentValidity(document, now)
    if (filter === 'Due within 30 days') return Boolean(state && state.daysRemaining >= 0 && state.daysRemaining <= 30)
    if (filter === 'Expired') return Boolean(state && state.daysRemaining < 0)
    if (filter === 'Unverified') return document.verification !== 'Verified'
    if (filter === 'Lease deeds') return document.kind === 'Lease deed'
    return true
  }).sort((a, b) => (a.expiresAt ?? '9999').localeCompare(b.expiresAt ?? '9999'))
  const canVerify = ['Regional Officer', 'Bureau Officer', 'Authority'].includes(role)
  const actor = { name: demoActorName[role], role }

  const submitRenewal = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      if (!expiresOn) throw new Error('Choose the document expiry date.')
      const institutionId = 'inst-001'
      const result = submitDocumentRenewal({ id: `renewal-${Date.now()}`, institutionId, name: fileName, kind, expiresAt: new Date(`${expiresOn}T23:59:00`), actor, now })
      createDocumentAction(result.document, result.auditEvent)
      setFileName(''); setExpiresOn(''); setError('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Renewal evidence could not be submitted.') }
  }
  const review = (document: DocumentRecord, close: () => void, event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      const outcome = outcomes[document.id] ?? 'Verified'
      const result = verifyDocument(document, { officerName: actor.name, role, outcome, reason: reasons[document.id] }, now)
      saveDocumentAction(result.document, result.auditEvent)
      setError(''); close()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Document review could not be recorded.') }
  }

  if (role === 'Committee') return <Card className="p-8"><div className="mx-auto max-w-lg text-center"><h1 className="font-heading text-2xl text-forest">Document register access</h1><p className="mt-2 text-sm text-sage">Committee members can review linked case documents from the assigned case record.</p></div></Card>

  return <>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><div className="eyebrow">08 / DOCUMENT VALIDITY</div><h1 className="page-title">Documents & renewals</h1><p className="mt-2 text-sm text-sage">Lease deeds and prescribed records are monitored for expiry, renewal and human verification.</p></div><span className="status-chip status-due-soon">Renewal reminders: 30 / 15 / 7 days</span></div>
    {error && <div role="alert" className="mb-4 rounded-xl bg-[#F1C1B2] px-3 py-2 text-xs text-[#482219]">{error}</div>}
    <div className="mb-5 grid gap-3 sm:grid-cols-3"><Card className="p-4"><div className="section-label">DUE WITHIN 30 DAYS</div><div className="mt-2 font-heading text-3xl text-forest">{dueSoon}</div><p className="mt-1 text-xs text-sage">Advance alerts are generated by the compliance engine</p></Card><Card className="p-4"><div className="section-label">EXPIRED</div><div className="mt-2 font-heading text-3xl text-rust">{expired}</div><p className="mt-1 text-xs text-sage">Follow-up remains visible until renewed evidence is verified</p></Card><Card className="p-4"><div className="section-label">PENDING VERIFICATION</div><div className="mt-2 font-heading text-3xl text-forest">{pending}</div><p className="mt-1 text-xs text-sage">Officer review is required to accept a renewal</p></Card></div>
    {role === 'Institution' && <Card className="mb-5 p-5"><div className="section-label">RENEWAL SUBMISSION</div><h2 className="mt-1 font-heading text-xl text-forest">Upload renewed document evidence</h2><form className="mt-4 grid gap-3 md:grid-cols-[1fr_1.3fr_1fr_auto] md:items-end" onSubmit={submitRenewal}><label className="block text-xs font-semibold text-sage">Document type<Select className="mt-1.5 block w-full" value={kind} onChange={(event) => setKind(event.target.value as DocumentRecord['kind'])}>{documentKindSchema.options.filter((item) => item !== 'Undertaking').map((item) => <option key={item}>{item}</option>)}</Select></label><label className="block text-xs font-semibold text-sage">Renewal evidence file name<Input className="mt-1.5 block w-full" type="file" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? '')} /><Input className="mt-2 block w-full" value={fileName} onChange={(event) => setFileName(event.target.value)} placeholder="Choose a file or enter its demo name" /></label><label className="block text-xs font-semibold text-sage">New expiry date<Input className="mt-1.5 block w-full" type="date" min={format(now, 'yyyy-MM-dd')} value={expiresOn} onChange={(event) => setExpiresOn(event.target.value)} required /></label><Button type="submit"><FileUp size={14} /> Submit renewal</Button></form><p className="mt-3 text-[11px] text-sage">File contents are not uploaded to a server in this prototype. The record stores a file name and expiry date for officer verification.</p></Card>}
    <Card className="overflow-hidden"><div className="flex flex-wrap items-center gap-3 border-b border-[var(--hairline)] p-4"><div className="min-w-48"><div className="section-label">EXPIRY TIMELINE</div><h2 className="mt-1 font-heading text-xl text-forest">Document register</h2></div><Select className="ml-auto" aria-label="Filter document validity" value={filter} onChange={(event) => setFilter(event.target.value)}><option>All records</option><option>Lease deeds</option><option>Due within 30 days</option><option>Expired</option><option>Unverified</option></Select><span className="text-xs text-sage">Checked against {format(now, 'dd MMM yyyy')}</span></div>{visible.length ? <div className="table-wrap"><table><thead><tr><th>Institution / document</th><th>Type</th><th>Expiry</th><th>Validity</th><th>Verification</th><th>Action</th></tr></thead><tbody>{visible.map((document) => { const institution = institutions.find((item) => item.id === document.institutionId); const days = document.expiresAt ? differenceInCalendarDays(parseISO(document.expiresAt), now) : null; const state = documentValidity(document, now); return <tr key={document.id}><td><div className="font-semibold text-forest">{document.name}</div><div className="mt-1 text-xs text-sage">{institution?.shortName} · {institution?.city} · {institution?.region}</div></td><td>{document.kind}</td><td className="mono whitespace-nowrap text-[10px]">{document.expiresAt ? format(parseISO(document.expiresAt), 'dd MMM yyyy') : 'No expiry recorded'}</td><td>{days === null ? <span className="text-xs text-sage">No expiry date</span> : <span className={`status-chip ${days < 0 ? 'status-overdue' : days <= 7 ? 'status-due-soon' : days <= 30 ? 'status-due-soon' : 'status-on-track'}`}>{days < 0 ? `Expired ${Math.abs(days)}d ago` : days === 0 ? 'Expires today' : `${days} days`}</span>}{state && state.daysRemaining >= 0 && state.daysRemaining <= 30 && <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-cream"><div className="h-full rounded-full bg-mustard" style={{ width: `${Math.max(8, 100 - (state.daysRemaining / 30) * 100)}%` }} /></div>}</td><td><span className={`status-chip ${document.verification === 'Verified' ? 'status-on-track' : document.verification === 'Rejected' ? 'status-overdue' : 'status-due-soon'}`}>{document.verification}</span>{document.verifiedBy && <div className="mt-1 text-[10px] text-sage">By {document.verifiedBy}</div>}</td><td>{canVerify && document.verification !== 'Verified' ? <Dialog title="Review renewal evidence" description="Record the authorized officer’s verification outcome and reason." trigger={<Button variant="secondary" className="!px-2.5 !py-1.5 !text-[11px]"><Check size={13} /> Review</Button>}>{(close) => <form className="space-y-3" onSubmit={(event) => review(document, close, event)}><p className="rounded-xl bg-cream/70 p-3 text-xs text-forest">{document.name} · {document.expiresAt ? `expires ${format(parseISO(document.expiresAt), 'dd MMM yyyy')}` : 'validity not recorded'}</p><label className="block text-xs font-semibold text-sage">Outcome<Select className="mt-1.5 block w-full" value={outcomes[document.id] ?? 'Verified'} onChange={(event) => setOutcomes((current) => ({ ...current, [document.id]: event.target.value as ReviewOutcome }))}><option>Verified</option><option>Needs clarification</option><option>Rejected</option></Select></label>{(outcomes[document.id] ?? 'Verified') !== 'Verified' && <label className="block text-xs font-semibold text-sage">Reason<textarea className="control mt-1.5 min-h-20 w-full" value={reasons[document.id] ?? ''} onChange={(event) => setReasons((current) => ({ ...current, [document.id]: event.target.value }))} required /></label>}<Button type="submit"><ShieldCheck size={14} /> Save verification</Button></form>}</Dialog> : <span className="text-[10px] text-sage">{document.verification === 'Verified' ? `Verified by ${document.verifiedBy ?? 'officer'}` : 'Awaiting officer'}</span>}</td></tr> })}</tbody></table></div> : <EmptyState title="No documents in this view" description="Change the filter or add a renewal record to see expiry tracking." />}</Card>
    <p className="mt-4 flex items-center gap-2 text-xs leading-5 text-sage"><FileClock size={14} />Expired or unverified evidence raises follow-up alerts. CasePilot does not determine document validity.</p>
  </>
}
