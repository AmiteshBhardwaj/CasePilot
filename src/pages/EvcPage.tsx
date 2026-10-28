import { useState, type FormEvent } from 'react'
import { addDays, addMonths, eachDayOfInterval, endOfMonth, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, FileText, MapPin, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { CaseRecord, HumanRole } from '@/data/schemas'
import { evaluateCaseSla } from '@/engine/slaEngine'
import { recordEvcOutcome, scheduleEvc } from '@/engine/workflowActions'
import { useCasePilotStore } from '@/store/useCasePilotStore'
import { Button, Card, Dialog, EmptyState, Input, StatusChip } from '@/components/ui'

function localDateTime(value: Date): string { return format(value, "yyyy-MM-dd'T'HH:mm") }

export default function EvcPage({ role }: { role: HumanRole }) {
  const actorName = useCasePilotStore((state) => state.actorName)
  const cases = useCasePilotStore((state) => state.cases)
  const institutions = useCasePilotStore((state) => state.institutions)
  const officers = useCasePilotStore((state) => state.officers)
  const activeRules = useCasePilotStore((state) => state.activeWorkflowRules)
  const saveCaseAction = useCasePilotStore((state) => state.saveCaseAction)
  const [view, setView] = useState<'Queue' | 'Calendar'>('Queue')
  const [monthOffset, setMonthOffset] = useState(0)
  const [dateByCase, setDateByCase] = useState<Record<string, string>>({})
  const [notesByCase, setNotesByCase] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const now = new Date()
  const month = addMonths(startOfMonth(now), monthOffset)
  const routeCases = cases.filter((item) => item.route.steps.includes('EVC'))
  const queue = routeCases.filter((item) => item.currentStage === 'EVC')
  const completed = routeCases.filter((item) => item.stages.some((stage) => stage.label === 'EVC' && stage.status === 'Completed'))
  const calendarStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
  const calendarEnd = startOfWeek(endOfMonth(month), { weekStartsOn: 1 })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: addDays(calendarEnd, 6) })
  const canCoordinate = role === 'Regional Officer' || role === 'Bureau Officer'
  const actor = { name: actorName, role }

  const persist = (record: CaseRecord, auditEvents: Parameters<typeof saveCaseAction>[1]) => saveCaseAction(record, auditEvents)
  const schedule = (record: CaseRecord, close: () => void, event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      const result = scheduleEvc(record, { actor, scheduledAt: new Date(dateByCase[record.id] ?? localDateTime(addDays(now, 14))), now })
      persist(result.caseRecord, result.auditEvent)
      setError('')
      close()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'EVC scheduling failed.') }
  }
  const complete = (record: CaseRecord, close: () => void, event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      const result = recordEvcOutcome(record, { actor, notes: notesByCase[record.id] ?? '', now })
      persist(result.caseRecord, result.auditEvents)
      setError('')
      close()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'EVC outcome could not be saved.') }
  }

  const renderCase = (record: CaseRecord) => {
    const institution = institutions.find((item) => item.id === record.institutionId)
    const owner = officers.find((item) => item.id === record.assignedOfficerId)
    const evcStage = record.stages.find((item) => item.label === 'EVC')
    const daysRemaining = evaluateCaseSla(record, now, 5, activeRules.stageTimelines).daysRemaining
    const isNew = record.applicationType === 'New Institution'
    return <article key={record.id} className={`grid gap-3 border-b border-[var(--hairline)] p-4 last:border-0 lg:grid-cols-[1fr_auto] ${isNew ? 'bg-pale-sage/30' : ''}`}>
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="mono text-xs font-semibold text-forest">{record.id}</span>{isNew && <span className="status-chip status-on-track">New institution priority</span>}<StatusChip status={record.status} /></div><h3 className="mt-2 truncate text-sm font-semibold text-forest">{institution?.shortName} · {institution?.city}</h3><p className="mt-1 text-xs text-sage">{record.applicationType} · {record.region} Region · assigned to {owner?.name ?? 'Regional queue'}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-sage"><span className="inline-flex items-center gap-1"><Clock3 size={12} />{daysRemaining < 0 ? `${Math.abs(daysRemaining)} days delayed` : daysRemaining <= 5 ? `Due in ${daysRemaining} days` : `${daysRemaining} days remaining`}</span><span className="inline-flex items-center gap-1"><CalendarDays size={12} />{record.evcScheduledAt ? `Visit ${format(new Date(record.evcScheduledAt), 'dd MMM yyyy, HH:mm')}` : 'Visit not scheduled'}</span><span className="inline-flex items-center gap-1"><FileText size={12} />{record.evcReportNotes ? 'Report recorded' : 'Report pending'}</span></div></div>
      <div className="flex flex-wrap items-start gap-2 lg:justify-end">
        {canCoordinate && record.currentStage === 'EVC' && <Dialog title="Schedule EVC" description={`Set a future site verification date for ${institution?.shortName ?? record.id}.`} trigger={<Button variant="secondary"><CalendarDays size={14} /> Schedule visit</Button>}>{(close) => <form className="space-y-3" onSubmit={(event) => schedule(record, close, event)}><label className="block text-xs font-semibold text-sage">Visit date and time<Input className="mt-1.5 block w-full" type="datetime-local" min={localDateTime(addDays(now, 1))} value={dateByCase[record.id] ?? localDateTime(addDays(now, 14))} onChange={(event) => setDateByCase((current) => ({ ...current, [record.id]: event.target.value }))} required /></label><p className="text-xs leading-5 text-sage">Scheduling coordinates the visit; inspection findings must be entered by a human official.</p><Button type="submit">Save EVC schedule</Button></form>}</Dialog>}
        {canCoordinate && record.currentStage === 'EVC' && <Dialog title="Record EVC completion" description="Add the report summary, then move the case to its next configured human review stage." trigger={<Button><ShieldCheck size={14} /> Record outcome</Button>}>{(close) => <form className="space-y-3" onSubmit={(event) => complete(record, close, event)}><label className="block text-xs font-semibold text-sage">Inspection report summary<textarea className="control mt-1.5 min-h-24 w-full" value={notesByCase[record.id] ?? ''} onChange={(event) => setNotesByCase((current) => ({ ...current, [record.id]: event.target.value }))} required placeholder="Record the completed inspection and evidence reviewed." /></label><Button type="submit">Record report and advance</Button></form>}</Dialog>}
        {record.currentStage !== 'EVC' && evcStage?.status === 'Completed' && <span className="rounded-xl bg-cream px-3 py-2 text-[11px] text-sage">Completed by {record.evcCompletedBy ?? 'human officer'}{record.evcCompletedAt ? ` · ${format(new Date(record.evcCompletedAt), 'dd MMM')}` : ''}</span>}
      </div>
    </article>
  }

  if (!canCoordinate && role !== 'Authority') return <Card className="p-8"><div className="mx-auto max-w-xl text-center"><ShieldCheck size={30} className="mx-auto text-sage" /><h1 className="mt-3 font-heading text-2xl text-forest">EVC coordination workspace</h1><p className="mt-2 text-sm leading-6 text-sage">Regional and Bureau Officers coordinate EVC scheduling and record inspection outcomes. This role can review EVC progress from assigned cases.</p></div></Card>

  return <>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><div className="eyebrow">06 / SITE VERIFICATION</div><h1 className="page-title">EVC board</h1><p className="mt-2 text-sm text-sage">Coordinate External Verification Committee visits; inspection outcomes remain human records.</p></div><div className="flex items-center gap-2"><span className="status-chip status-due-soon">{queue.length} awaiting EVC</span><div className="flex rounded-xl border border-[var(--hairline)] bg-paper p-1"><button className={`rounded-lg px-3 py-1.5 text-xs ${view === 'Queue' ? 'bg-forest text-paper' : 'text-sage'}`} aria-pressed={view === 'Queue'} onClick={() => setView('Queue')}>Queue</button><button className={`rounded-lg px-3 py-1.5 text-xs ${view === 'Calendar' ? 'bg-forest text-paper' : 'text-sage'}`} aria-pressed={view === 'Calendar'} onClick={() => setView('Calendar')}>Calendar</button></div></div></div>
    {error && <div role="alert" className="mb-4 rounded-xl bg-[#F1C1B2] px-3 py-2 text-xs text-[#482219]">{error}</div>}
    <div className="grid gap-4 md:grid-cols-3"><Card className="p-4"><div className="section-label">AWAITING VISIT</div><div className="mt-2 font-heading text-3xl text-forest">{queue.length}</div><p className="mt-1 text-xs text-sage">Cases currently in EVC stage</p></Card><Card className="p-4"><div className="section-label">APPROACHING / DUE</div><div className="mt-2 font-heading text-3xl text-forest">{queue.filter((item) => evaluateCaseSla(item, now, 5, activeRules.stageTimelines).daysRemaining <= 5 && evaluateCaseSla(item, now, 5, activeRules.stageTimelines).daysRemaining >= 0).length}</div><p className="mt-1 text-xs text-sage">Within five calendar days</p></Card><Card className="p-4"><div className="section-label">DELAYED</div><div className="mt-2 font-heading text-3xl text-oxblood">{queue.filter((item) => item.status === 'Overdue' || item.status === 'Escalated').length}</div><p className="mt-1 text-xs text-sage">Ageing status follows the configured escalation rules</p></Card></div>
    {view === 'Queue' ? <div className="mt-5 grid gap-5 xl:grid-cols-[1.3fr_.7fr]"><Card className="overflow-hidden"><div className="border-b border-[var(--hairline)] px-4 py-4"><div className="section-label">AUTO-QUEUED AFTER PRELIMINARY PROCESSING</div><h2 className="mt-1 font-heading text-xl text-forest">Cases requiring EVC</h2></div>{queue.length ? queue.map(renderCase) : <EmptyState title="No cases awaiting EVC" description="Cases enter this queue when the configured route reaches the EVC stage." />}</Card><Card className="overflow-hidden"><div className="border-b border-[var(--hairline)] px-4 py-4"><div className="section-label">COMPLETION TRACKING</div><h2 className="mt-1 font-heading text-xl text-forest">Completed EVC records</h2></div>{completed.length ? completed.slice(0, 10).map(renderCase) : <EmptyState title="No completed visits yet" description="Completed inspection reports remain linked to their case records." />}</Card></div> : <Card className="mt-5 overflow-hidden"><div className="flex items-center justify-between border-b border-[var(--hairline)] px-4 py-4"><div><div className="section-label">SCHEDULED SITE VISITS</div><h2 className="mt-1 font-heading text-xl text-forest">{format(month, 'MMMM yyyy')}</h2></div><div className="flex gap-1"><Button variant="quiet" aria-label="Previous month" onClick={() => setMonthOffset((value) => value - 1)}><ChevronLeft size={17} /></Button><Button variant="quiet" aria-label="Next month" onClick={() => setMonthOffset((value) => value + 1)}><ChevronRight size={17} /></Button></div></div><div className="grid grid-cols-7 border-b border-[var(--hairline)] bg-cream/55">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <div key={day} className="px-2 py-2 text-center font-mono text-[9px] uppercase tracking-wider text-sage">{day}</div>)}</div><div className="grid grid-cols-7">{calendarDays.map((day) => { const scheduled = routeCases.filter((item) => item.evcScheduledAt && isSameDay(new Date(item.evcScheduledAt), day)); return <div key={day.toISOString()} className={`min-h-24 border-b border-r border-[var(--hairline)] p-1.5 ${isSameMonth(day, month) ? 'bg-paper' : 'bg-cream/25'} ${isSameDay(day, now) ? 'ring-1 ring-inset ring-mustard' : ''}`}><div className={`mono text-[10px] ${isSameMonth(day, month) ? 'text-forest' : 'text-sage'}`}>{format(day, 'd')}</div><div className="mt-1 space-y-1">{scheduled.map((record) => <Link key={record.id} to={`/app/cases/${record.id}`} className="block truncate rounded-md bg-pale-sage px-1.5 py-1 text-[9px] font-semibold text-forest" title={`${record.id} · ${record.evcScheduledAt ? format(new Date(record.evcScheduledAt), 'HH:mm') : ''}`}><MapPin size={9} className="mr-1 inline" />{record.id.slice(-5)}</Link>)}</div></div> })}</div><div className="border-t border-[var(--hairline)] p-4">{routeCases.some((item) => item.evcScheduledAt) ? routeCases.filter((item) => item.evcScheduledAt).map(renderCase) : <EmptyState title="No EVC visits scheduled" description="Schedule an EVC from the queue to add it to this calendar." />}</div></Card>}
    <p className="mt-4 text-xs leading-5 text-sage">New institution cases are highlighted for follow-up. Calendar entries are coordination aids; they do not record inspection findings or statutory verification by themselves.</p>
  </>
}
