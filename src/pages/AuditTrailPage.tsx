import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Download, Search } from 'lucide-react'
import type { HumanRole } from '@/data/schemas'
import { downloadCsv } from '@/utils/exportCsv'
import { useCasePilotStore } from '@/store/useCasePilotStore'
import { Button, Card, EmptyState, Input, Select } from '@/components/ui'

export default function AuditTrailPage({ role }: { role: HumanRole }) {
  const events = useCasePilotStore((state) => state.auditEvents)
  const cases = useCasePilotStore((state) => state.cases)
  const [caseQuery, setCaseQuery] = useState('')
  const [actorQuery, setActorQuery] = useState('')
  const [type, setType] = useState('All events')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const filtered = useMemo(() => [...events].filter((event) => {
    const eventDate = event.at.slice(0, 10)
    const matchesCase = !caseQuery || `${event.entityId} ${event.detail}`.toLowerCase().includes(caseQuery.toLowerCase()) || cases.some((record) => record.id.toLowerCase().includes(caseQuery.toLowerCase()) && event.detail.includes(record.id))
    return matchesCase
      && (!actorQuery || `${event.actorName} ${event.actorRole}`.toLowerCase().includes(actorQuery.toLowerCase()))
      && (type === 'All events' || event.entityType === type)
      && (!from || eventDate >= from)
      && (!to || eventDate <= to)
  }).sort((a, b) => b.at.localeCompare(a.at)), [actorQuery, caseQuery, cases, events, from, to, type])
  const exportRows = () => downloadCsv(`casepilot-audit-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`, filtered.map((event) => ({
    timestamp: event.at, action: event.action, actor: event.actorName, role: event.actorRole, recordType: event.entityType, recordId: event.entityId,
    before: event.before, after: event.after, reason: event.reason, detail: event.detail,
  })))

  if (role === 'Institution') return <Card className="p-8"><div className="mx-auto max-w-lg text-center"><h1 className="font-heading text-2xl text-forest">Audit access is restricted</h1><p className="mt-2 text-sm text-sage">The read-only audit trail is available to official demo roles.</p></div></Card>

  return <>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><div className="eyebrow">09 / RECORD INTEGRITY</div><h1 className="page-title">Append-only audit trail</h1><p className="mt-2 text-sm text-sage">Workflow events are read-only here. Filters and export never modify the underlying event record.</p></div><Button variant="secondary" onClick={exportRows}><Download size={14} /> Export CSV</Button></div>
    <Card className="overflow-hidden"><div className="grid gap-2 border-b border-[var(--hairline)] p-4 md:grid-cols-2 xl:grid-cols-5"><label className="relative xl:col-span-2"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-sage" /><Input aria-label="Filter by case or record ID" className="w-full pl-9" value={caseQuery} onChange={(event) => setCaseQuery(event.target.value)} placeholder="Case or record reference" /></label><Input aria-label="Filter by actor" value={actorQuery} onChange={(event) => setActorQuery(event.target.value)} placeholder="Actor name or role" /><Select aria-label="Filter by record type" value={type} onChange={(event) => setType(event.target.value)}><option>All events</option>{['Case', 'Document', 'Undertaking', 'Alert', 'Rule'].map((item) => <option key={item}>{item}</option>)}</Select><div className="grid grid-cols-2 gap-2"><Input aria-label="Events from date" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /><Input aria-label="Events through date" type="date" value={to} onChange={(event) => setTo(event.target.value)} /></div></div><div className="flex items-center justify-between px-4 py-3"><span className="text-xs text-sage">{filtered.length} events · {role} view</span><span className="section-label">READ ONLY · NO EDIT OR DELETE ACTIONS</span></div>{filtered.length ? <div className="table-wrap"><table><thead><tr><th>Timestamp</th><th>Action / record</th><th>Actor</th><th>Before</th><th>After</th><th>Reason / detail</th></tr></thead><tbody>{filtered.map((event) => <tr key={event.id}><td className="mono whitespace-nowrap text-[10px]">{format(new Date(event.at), 'dd MMM yyyy · HH:mm')}</td><td><div className="font-semibold text-forest">{event.action}</div><div className="mono mt-1 text-[10px] text-sage">{event.entityType} · {event.entityId}</div></td><td><div className="text-xs text-ink">{event.actorName}</div><div className="mt-1 text-[10px] text-sage">{event.actorRole}</div></td><td className="max-w-48 text-xs text-sage">{event.before ?? '—'}</td><td className="max-w-48 text-xs text-sage">{event.after ?? '—'}</td><td className="max-w-80 text-xs leading-5 text-sage">{event.reason ? <><strong>Reason: </strong>{event.reason}<br /></> : null}{event.detail}</td></tr>)}</tbody></table></div> : <EmptyState title="No audit events match" description="Adjust the case, actor, event type or date filters." />}</Card>
  </>
}
