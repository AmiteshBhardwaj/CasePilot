import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { AlertTriangle, CalendarClock, Check, FileText, Forward, MessageSquareText, RotateCcw, ShieldCheck, Sparkles, UserRound } from 'lucide-react'
import type { AuditEvent, CaseRecord, HumanRole, RouteStep } from '@/data/schemas'
import { demoActorName } from '@/data/demoActors'
import { useCasePilotStore } from '@/store/useCasePilotStore'
import { completeCurrentStage, resubmitReturnedCase, returnCase, revertCase } from '@/engine/stageMachine'
import { recordDecision, verifyDocument } from '@/engine/humanActions'
import { confirmCaseSummary, createObservation, draftCaseSummary, recordCommitteeOutcome, recordEvcOutcome, scheduleEvc } from '@/engine/workflowActions'
import { evaluateCaseSla } from '@/engine/slaEngine'
import { Button, Card, Dialog, EmptyState, Input, Select, StageTracker, StatusChip, Tabs, Timeline, Tooltip } from '@/components/ui'

type ActionResult = { caseRecord: CaseRecord; auditEvent?: AuditEvent; auditEvents?: AuditEvent[] }

export default function CaseDetailPage({ role }: { role: HumanRole }) {
  const { caseId = '' } = useParams()
  const record = useCasePilotStore((state) => state.cases.find((item) => item.id === caseId))
  const institution = useCasePilotStore((state) => state.institutions.find((item) => item.id === record?.institutionId))
  const officers = useCasePilotStore((state) => state.officers)
  const documents = useCasePilotStore((state) => state.documents.filter((item) => item.caseId === caseId))
  const observations = useCasePilotStore((state) => state.observations.filter((item) => item.caseId === caseId))
  const undertakings = useCasePilotStore((state) => state.undertakings.filter((item) => item.caseId === caseId))
  const alerts = useCasePilotStore((state) => state.alerts.filter((item) => item.caseId === caseId))
  const events = useCasePilotStore((state) => state.auditEvents.filter((item) => item.entityId === caseId || item.entityId.startsWith(`${caseId}-`)).sort((a, b) => b.at.localeCompare(a.at)))
  const demoNow = useCasePilotStore((state) => state.demoNow)
  const activeWorkflowRules = useCasePilotStore((state) => state.activeWorkflowRules)
  const saveCaseAction = useCasePilotStore((state) => state.saveCaseAction)
  const saveDocumentAction = useCasePilotStore((state) => state.saveDocumentAction)
  const saveObservation = useCasePilotStore((state) => state.saveObservation)
  const [tab, setTab] = useState('Overview')
  const [message, setMessage] = useState('')
  const [reason, setReason] = useState('')
  const [outcome, setOutcome] = useState<'Recommended' | 'Not recommended' | 'Deferred'>('Recommended')
  const [committeeNotes, setCommitteeNotes] = useState('')
  const [decisionReason, setDecisionReason] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [evcNotes, setEvcNotes] = useState('')
  const [observationText, setObservationText] = useState('')
  const [summaryDraft, setSummaryDraft] = useState('')
  const now = new Date(demoNow)

  const recordIsVisible = Boolean(record && (role !== 'Institution' || record.institutionId === 'inst-001') && (role !== 'Regional Officer' || record.region === 'Northern') && (role !== 'Committee' || record.assignedCommitteeId === 'com-01'))
  if (!record || !recordIsVisible) return <EmptyState title="Case not found" description="This record is unavailable in the current demo role or may have been reset." action={<Link to="/app/cases" className="button button-secondary">Back to cases</Link>} />

  const actor = { name: demoActorName[role], role }
  const current = record.stages.find((stage) => stage.label === record.currentStage)
  const sla = evaluateCaseSla(record, now, 5, activeWorkflowRules.stageTimelines)
  const officer = officers.find((item) => item.id === record.assignedOfficerId)
  const canReviewStage = (record.currentStage === 'Scrutiny' || record.currentStage === 'EVC') && ['Regional Officer', 'Bureau Officer'].includes(role)
    || record.currentStage === 'SAC/SHC' && role === 'Committee'
  const canReturn = ['Regional Officer', 'Bureau Officer', 'Committee', 'Authority'].includes(role) && current?.status !== 'Completed'
  const canRevert = ['Bureau Officer', 'Authority'].includes(role) && record.route.steps.indexOf(record.currentStage) > 0
  const canDecide = role === 'Authority' && record.currentStage === 'Authority Decision'
  const tabs = ['Overview', 'Documents', 'Observations', 'Timeline / Audit', 'Compliance', 'Alerts']

  const persistResult = (result: ActionResult) => {
    saveCaseAction(result.caseRecord, result.auditEvents ?? (result.auditEvent ? [result.auditEvent] : []))
    setMessage(result.auditEvent?.detail ?? result.auditEvents?.[0]?.detail ?? 'Action recorded in the audit trail.')
  }
  const runAction = (action: () => ActionResult) => {
    try { persistResult(action()); setReason(''); setDecisionReason('') }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Action could not be recorded.') }
  }
  const submitObservation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      const result = createObservation({ id: `obs-${Date.now()}`, caseId, text: observationText, actor, now })
      saveObservation(result.observation, result.auditEvent); setObservationText(''); setMessage('Observation recorded with a named actor.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Observation could not be recorded.') }
  }

  return <>
    <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-sage"><Link to="/app/cases" className="hover:text-forest">Cases</Link><span>/</span><span className="mono text-forest">{record.id}</span></div>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><div className="eyebrow">CASE RECORD · {record.applicationType.toUpperCase()}</div><h1 className="page-title">{institution?.name ?? 'Institution record'}</h1><div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-sage"><span>{institution?.city}, {institution?.state}</span><span>·</span><span>{record.region} Region</span><span>·</span><span>{record.applicationType}</span></div></div><StatusChip status={record.status} /></div>
    <Card className="mb-5 overflow-hidden"><div className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-start"><div><div className="mono text-sm font-semibold text-forest">{record.id}</div><p className="mt-2 max-w-3xl text-sm leading-6 text-sage">{record.title}</p><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-sage"><span className="flex items-center gap-1.5"><UserRound size={13} />Owner: {officer?.name ?? 'Unassigned'}</span><span className="flex items-center gap-1.5"><ShieldCheck size={13} />{record.currentStage}</span><span className="flex items-center gap-1.5"><CalendarClock size={13} />{sla.status === 'Closed' ? 'Workflow closed' : sla.daysRemaining < 0 ? `${Math.abs(sla.daysRemaining)} days overdue` : `${sla.daysRemaining} days remaining`}</span></div></div><div className="md:text-right"><div className="section-label">ROUTE · {record.route.ruleCode} · v{record.route.version}</div><div className="mt-1 text-xs font-semibold text-sage">{record.route.category} + Authority Decision</div><p className="mt-1 max-w-md text-xs leading-5 text-sage">{record.route.reason} <span className="font-semibold">Reference: AICTE Approval Process Handbook 2024–27 route mapping.</span></p></div></div><div className="overflow-x-auto border-t border-[var(--hairline)] px-5 py-5"><StageTracker steps={record.route.steps} current={record.currentStage} completed={record.stages.filter((stage) => stage.status === 'Completed').map((stage) => stage.label)} /></div></Card>

    <Card className="overflow-hidden"><div className="px-5 pt-3"><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>
      {tab === 'Overview' && <div className="grid gap-5 p-5 xl:grid-cols-[1fr_.8fr]"><section><div className="section-label">01 / CURRENT DECISION POINT</div><h2 className="mt-1 font-heading text-2xl text-forest">{record.currentStage}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-sage">The workflow can coordinate assignments, due dates and notifications. This stage advances only after an authorized human action.</p>{message && <div role="status" className="mt-4 rounded-xl bg-pale-sage px-3 py-2 text-xs leading-5 text-forest">{message}</div>}
          <div className="mt-5 flex flex-wrap gap-2">
            {role === 'Institution' && current?.status === 'Returned' && <Button onClick={() => runAction(() => resubmitReturnedCase(record, actor, now))}><Check size={14} /> Submit response</Button>}
            {canReviewStage && record.currentStage === 'Scrutiny' && <Button onClick={() => runAction(() => completeCurrentStage(record, actor, now))}><Forward size={14} /> Forward to next stage</Button>}
            {canReviewStage && record.currentStage === 'EVC' && <form className="w-full max-w-xl space-y-2" onSubmit={(event) => { event.preventDefault(); runAction(() => recordEvcOutcome(record, { actor, notes: evcNotes, now })) }}><label className="block text-xs font-semibold text-sage">EVC inspection report summary<textarea aria-label="EVC inspection report summary" className="control mt-1.5 min-h-20 w-full" value={evcNotes} onChange={(event) => setEvcNotes(event.target.value)} placeholder="Summarize the inspection record for the next human review stage." /></label><Button type="submit"><Forward size={14} /> Record EVC report and forward</Button></form>}
            {record.currentStage === 'SAC/SHC' && role === 'Committee' && <form className="w-full max-w-xl space-y-2" onSubmit={(event) => { event.preventDefault(); runAction(() => recordCommitteeOutcome(record, { actor, outcome, notes: committeeNotes, now })) }}><Select aria-label="Committee recommendation" value={outcome} onChange={(event) => setOutcome(event.target.value as typeof outcome)}><option>Recommended</option><option>Not recommended</option><option>Deferred</option></Select><textarea aria-label="Committee notes" className="control min-h-24 w-full" value={committeeNotes} onChange={(event) => setCommitteeNotes(event.target.value)} placeholder="Record the committee’s review notes and recommendation rationale." /><Button type="submit">Record committee outcome</Button></form>}
            {record.currentStage === 'EVC' && ['Regional Officer', 'Bureau Officer'].includes(role) && <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => { event.preventDefault(); try { const result = scheduleEvc(record, { actor, scheduledAt: new Date(scheduledAt), now }); persistResult(result); setMessage('EVC schedule recorded in the audit trail.') } catch (error) { setMessage(error instanceof Error ? error.message : 'EVC could not be scheduled.') } }}><label className="text-xs font-semibold text-sage">Schedule EVC<Input aria-label="EVC date and time" type="datetime-local" className="mt-1 block" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} required /></label><Button type="submit"><CalendarClock size={14} /> Save schedule</Button></form>}
            {canDecide && <form className="w-full max-w-xl space-y-2" onSubmit={(event) => event.preventDefault()}><label className="block text-xs font-semibold text-sage">Statutory decision reason<textarea aria-label="Decision reason" className="control mt-1.5 min-h-20 w-full" value={decisionReason} onChange={(event) => setDecisionReason(event.target.value)} placeholder="Record the Authority’s reasons for this decision." /></label><div className="flex gap-2"><Button onClick={() => runAction(() => recordDecision(record, { officerName: actor.name, role, decision: 'Approved', reason: decisionReason }, now))}><Check size={14} /> Record approval</Button><Button variant="secondary" onClick={() => runAction(() => recordDecision(record, { officerName: actor.name, role, decision: 'Rejected', reason: decisionReason }, now))}>Record rejection</Button></div></form>}
            {record.currentStage === 'Authority Decision' && role !== 'Authority' && <Tooltip text="Only the competent Authority can record this statutory decision."><Button disabled variant="secondary"><ShieldCheck size={14} /> Record decision · Authority only</Button></Tooltip>}
            {canReturn && <Dialog title="Return case with a reason" description="The institution will see this reason and the case will remain in the audit trail." trigger={<Button variant="secondary">Return with reason</Button>}>{(close) => <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); try { persistResult(returnCase(record, actor, reason, now)); close() } catch (error) { setMessage(error instanceof Error ? error.message : 'Return failed.') } }}><label className="block text-xs font-semibold text-sage">Mandatory return reason<textarea className="control mt-1.5 min-h-24 w-full" required value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Name the missing or inconsistent evidence and the required correction." /></label><Button type="submit">Confirm return</Button></form>}</Dialog>}
            {canRevert && <Dialog title="Revert to an earlier stage" description="Choose an earlier route stage and record why the work must be repeated." trigger={<Button variant="secondary"><RotateCcw size={14} /> Revert stage</Button>}>{(close) => <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); const target = record.route.steps[record.route.steps.indexOf(record.currentStage) - 1] as RouteStep; try { persistResult(revertCase(record, actor, target, reason, now)); close() } catch (error) { setMessage(error instanceof Error ? error.message : 'Revert failed.') } }}><label className="block text-xs font-semibold text-sage">Mandatory reason<textarea className="control mt-1.5 min-h-24 w-full" required value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain what needs a second review." /></label><Button type="submit">Confirm revert</Button></form>}</Dialog>}
            {role !== 'Institution' && <Dialog title="Officer-confirmed case summary" description="Review the draft and confirm it before it is saved." trigger={<Button variant="quiet"><Sparkles size={14} /> Generate case summary</Button>}>{(close) => <div className="space-y-3"><textarea aria-label="Draft case summary" className="control min-h-56 w-full font-mono text-xs leading-5" value={summaryDraft || draftCaseSummary(record, institution?.name ?? 'Institution')} onChange={(event) => setSummaryDraft(event.target.value)} /><Button onClick={() => { try { persistResult(confirmCaseSummary(record, { actor, summary: summaryDraft || draftCaseSummary(record, institution?.name ?? 'Institution'), now })); close() } catch (error) { setMessage(error instanceof Error ? error.message : 'Summary was not saved.') } }}>Confirm and save summary</Button></div>}</Dialog>}
          </div>
          {record.decision && <p className="mt-4 rounded-xl bg-pale-sage px-3 py-2 text-xs text-forest">Decision: <strong>{record.decision}</strong> · recorded by {record.decidedBy}</p>}
          {record.caseSummary && <details className="mt-4 rounded-xl bg-cream/65 p-3"><summary className="cursor-pointer text-xs font-semibold text-forest">Saved officer-confirmed summary · {record.summarySavedBy}</summary><pre className="mt-3 whitespace-pre-wrap font-sans text-xs leading-5 text-sage">{record.caseSummary}</pre></details>}
        </section><aside className="rounded-2xl bg-cream/60 p-4"><div className="section-label">ROUTE & ASSIGNMENT</div><div className="mt-3 space-y-3 text-xs"><div><div className="text-sage">Routing rule</div><div className="mono mt-1 font-semibold text-forest">{record.route.ruleCode} · {record.route.category}</div></div><div><div className="text-sage">Route rationale</div><p className="mt-1 leading-5 text-forest">{record.route.reason}</p></div><div><div className="text-sage">Assigned owner</div><div className="mt-1 font-semibold text-forest">{officer?.name ?? 'Unassigned'}</div></div><div><div className="text-sage">Returned {record.returnedCount} times</div><div className="mono mt-1 text-forest">Submitted {format(new Date(record.submittedAt), 'dd MMM yyyy')}</div></div></div></aside></div>}

      {tab === 'Documents' && <div className="divide-y divide-[var(--hairline)]">{documents.length ? documents.map((document) => <div key={document.id} className="flex flex-wrap items-center gap-3 px-5 py-4"><span className="grid h-9 w-9 place-items-center rounded-xl bg-pale-sage text-forest"><FileText size={16} /></span><div className="min-w-0 flex-1"><div className="text-sm font-semibold text-forest">{document.name}</div><div className="mt-1 text-xs text-sage">{document.kind} · {document.verification}{document.expiresAt ? ` · expires ${format(new Date(document.expiresAt), 'dd MMM yyyy')}` : ''}</div></div><span className={`status-chip ${document.verification === 'Verified' ? 'status-on-track' : document.verification === 'Rejected' ? 'status-overdue' : 'status-due-soon'}`}>{document.verification}</span>{['Regional Officer', 'Bureau Officer', 'Authority'].includes(role) && document.verification !== 'Verified' && <Button variant="secondary" className="!px-2.5 !py-1.5 !text-[11px]" onClick={() => { try { const result = verifyDocument(document, { officerName: actor.name, role, outcome: 'Verified' }, now); saveDocumentAction(result.document, result.auditEvent); setMessage(`Verified by ${actor.name}; audit event recorded.`) } catch (error) { setMessage(error instanceof Error ? error.message : 'Verification failed.') } }}><Check size={13} /> Verify</Button>}</div>) : <EmptyState title="No documents linked" description="Case evidence will appear here after upload." />}</div>}

      {tab === 'Observations' && <div className="grid gap-5 p-5 xl:grid-cols-[1fr_.8fr]"><div className="space-y-3">{observations.length ? observations.map((item) => <article key={item.id} className="rounded-xl border border-[var(--hairline)] bg-paper p-4"><div className="flex items-start justify-between gap-3"><p className="text-sm leading-6 text-ink">{item.text}</p><span className="status-chip status-neutral">{item.status}</span></div><p className="mono mt-2 text-[10px] text-sage">{item.raisedBy} · {format(new Date(item.raisedAt), 'dd MMM yyyy')}</p></article>) : <EmptyState title="No observations recorded" description="Case observations will appear here with a named officer." />}</div><form className="rounded-2xl bg-cream/60 p-4" onSubmit={submitObservation}><div className="section-label">ADD AN OBSERVATION</div><label className="mt-3 block text-xs font-semibold text-sage">Review note<textarea className="control mt-1.5 min-h-28 w-full" value={observationText} onChange={(event) => setObservationText(event.target.value)} placeholder="State the specific evidence or clarification required." /></label><Button className="mt-3"><MessageSquareText size={14} /> Record note</Button></form></div>}

      {tab === 'Timeline / Audit' && <div className="p-5">{events.length ? <Timeline items={events.map((event) => ({ title: event.action, detail: `${event.actorName} · ${event.detail}`, at: format(new Date(event.at), 'dd MMM yyyy · HH:mm'), done: event.actorRole !== 'System' }))} /> : <EmptyState title="No case events" description="Every workflow action will appear here in chronological order." />}</div>}

      {tab === 'Compliance' && <div className="grid gap-5 p-5 md:grid-cols-2"><section><div className="section-label">TIME-BOUND CONDITIONS</div><h2 className="mt-1 font-heading text-lg text-forest">Undertakings</h2>{undertakings.length ? undertakings.map((item) => <div key={item.id} className="mt-3 rounded-xl bg-cream/65 p-3"><div className="text-xs font-semibold text-forest">{item.title}</div><div className="mono mt-1 text-[10px] text-sage">Due {format(new Date(item.dueAt), 'dd MMM yyyy')} · {item.status}</div></div>) : <p className="mt-3 text-xs text-sage">No undertakings linked to this case.</p>}</section><section><div className="section-label">DOCUMENT VALIDITY</div><h2 className="mt-1 font-heading text-lg text-forest">Expiry and verification</h2>{documents.map((item) => <div key={item.id} className="mt-3 rounded-xl bg-cream/65 p-3"><div className="text-xs font-semibold text-forest">{item.name}</div><div className="mono mt-1 text-[10px] text-sage">{item.expiresAt ? `Expires ${format(new Date(item.expiresAt), 'dd MMM yyyy')}` : 'No expiry date'} · {item.verification}</div></div>)}</section></div>}

      {tab === 'Alerts' && <div className="divide-y divide-[var(--hairline)]">{alerts.length ? alerts.map((item) => <div key={item.id} className="flex items-start gap-3 px-5 py-4"><span className="grid h-8 w-8 place-items-center rounded-xl bg-[#F1C1B2] text-rust"><AlertTriangle size={15} /></span><div><div className="text-sm font-semibold text-forest">{item.title}</div><div className="mt-1 text-xs text-sage">{item.message}</div><time className="mono mt-1 block text-[10px] text-sage/70">{format(new Date(item.createdAt), 'dd MMM yyyy · HH:mm')}</time></div></div>) : <EmptyState title="No case alerts" description="SLA, evidence and compliance signals linked to this case appear here." />}</div>}
    </Card>
  </>
}
