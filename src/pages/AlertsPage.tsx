import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { Bell, Check, Clock3, Mail, MessageSquare } from 'lucide-react'
import type { AlertChannel, HumanRole } from '@/data/schemas'
import { demoActorName } from '@/data/demoActors'
import { acknowledgeAlert, snoozeAlert } from '@/engine/workflowActions'
import { useCasePilotStore } from '@/store/useCasePilotStore'
import { Button, Card, EmptyState, Select } from '@/components/ui'

const channelIcons = { 'In-app': Bell, Email: Mail, SMS: MessageSquare }
const escalationLevels = ['Institution', 'Regional Officer', 'Bureau Officer', 'Authority']

export default function AlertsPage({ role }: { role: HumanRole }) {
  const alerts = useCasePilotStore((state) => state.alerts)
  const cases = useCasePilotStore((state) => state.cases)
  const institutions = useCasePilotStore((state) => state.institutions)
  const officers = useCasePilotStore((state) => state.officers)
  const documents = useCasePilotStore((state) => state.documents)
  const demoNow = useCasePilotStore((state) => state.demoNow)
  const saveAlertAction = useCasePilotStore((state) => state.saveAlertAction)
  const [type, setType] = useState('All alert types')
  const [channel, setChannel] = useState('All channels')
  const [readState, setReadState] = useState('Open and acknowledged')
  const now = useMemo(() => new Date(demoNow), [demoNow])
  const visible = alerts.filter((alert) => {
    const channels = alert.channels ?? ['In-app']
    const activeSnooze = alert.snoozedUntil && new Date(alert.snoozedUntil) > now
    return !activeSnooze && (type === 'All alert types' || alert.type === type)
      && (channel === 'All channels' || channels.includes(channel as AlertChannel))
      && (readState === 'Open and acknowledged' || readState === 'Open only' && !alert.read || readState === 'Acknowledged' && alert.read)
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const act = (id: string, action: 'acknowledge' | 'snooze') => {
    const alert = alerts.find((item) => item.id === id)
    if (!alert) return
    try {
      const result = action === 'acknowledge' ? acknowledgeAlert(alert, { name: demoActorName[role], role }, now) : snoozeAlert(alert, { name: demoActorName[role], role }, 7, now)
      saveAlertAction(result.alert, result.auditEvent)
    } catch { /* controls are hidden for already acknowledged alerts */ }
  }

  return <>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><div className="eyebrow">04 / ALERT MANAGEMENT</div><h1 className="page-title">Alerts center</h1><p className="mt-2 text-sm text-sage">Delivery channels are simulated. Alerts guide follow-up and do not make statutory determinations.</p></div><div className="flex gap-2"><span className="status-chip status-due-soon">30 / 15 / 7-day reminders</span><span className="status-chip status-neutral">{alerts.filter((item) => !item.read).length} open</span></div></div>
    <Card className="overflow-hidden"><div className="grid gap-2 border-b border-[var(--hairline)] p-4 md:grid-cols-3"><Select aria-label="Filter alert type" value={type} onChange={(event) => setType(event.target.value)}><option>All alert types</option>{['SLA', 'Compliance', 'Escalation', 'Evidence'].map((item) => <option key={item}>{item}</option>)}</Select><Select aria-label="Filter alert channel" value={channel} onChange={(event) => setChannel(event.target.value)}><option>All channels</option>{['In-app', 'Email', 'SMS'].map((item) => <option key={item}>{item}</option>)}</Select><Select aria-label="Filter acknowledgement state" value={readState} onChange={(event) => setReadState(event.target.value)}><option>Open and acknowledged</option><option>Open only</option><option>Acknowledged</option></Select></div>
      {visible.length === 0 ? <EmptyState title="No alerts in this view" description="Change the filters or advance the demo clock to generate follow-up alerts." /> : <div className="divide-y divide-[var(--hairline)]">{visible.map((alert) => {
        const record = cases.find((item) => item.id === alert.caseId)
        const institution = institutions.find((item) => item.id === (alert.institutionId ?? record?.institutionId))
        const owner = officers.find((item) => item.id === (alert.ownerId ?? record?.assignedOfficerId))
        const stage = record?.stages.find((item) => item.label === record.currentStage)
        const missing = documents.filter((document) => document.caseId === record?.id && document.verification !== 'Verified').map((document) => document.name)
        const channels = alert.channels ?? ['In-app']
        const currentLevel = record?.escalationLevel && record.escalationLevel !== 'None' ? record.escalationLevel : alert.ownerId ? 'Regional Officer' : 'Institution'
        const currentLevelIndex = escalationLevels.indexOf(currentLevel)
        return <article key={alert.id} className={`grid gap-3 px-5 py-4 xl:grid-cols-[auto_1fr_auto] ${alert.read ? 'bg-cream/20' : ''}`}>
          <span className={`grid h-10 w-10 place-items-center rounded-xl ${alert.severity === 'Critical' ? 'bg-[#F1C1B2] text-[#482219]' : 'bg-[#F4E1B8] text-[#513C18]'}`}><Bell size={17} /></span>
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold text-forest">{alert.title}</h2><span className="section-label">{alert.type}</span><span className={`status-chip ${alert.severity === 'Critical' ? 'status-overdue' : alert.severity === 'Warning' ? 'status-due-soon' : 'status-on-track'}`}>{alert.severity}</span>{alert.read && <span className="status-chip status-neutral">Acknowledged</span>}</div><p className="mt-1.5 text-xs leading-5 text-sage">{alert.message}</p><div className="mt-3 grid gap-x-4 gap-y-2 text-[10px] text-sage sm:grid-cols-2 xl:grid-cols-4"><span><strong className="text-forest">Institution</strong><br />{institution?.shortName ?? 'Workflow-wide'}</span><span><strong className="text-forest">Owner</strong><br />{owner?.name ?? alert.ownerId ?? 'Regional Officer queue'}</span><span><strong className="text-forest">Due date</strong><br />{alert.dueAt ? format(new Date(alert.dueAt), 'dd MMM yyyy') : stage ? format(new Date(stage.dueAt), 'dd MMM yyyy') : 'Review now'}</span><span><strong className="text-forest">Missing evidence</strong><br />{alert.missingEvidence?.join(', ') ?? (missing.length ? missing.join(', ') : 'None recorded')}</span></div><div className="mt-3 flex flex-wrap items-center gap-1.5"><span className="section-label mr-1">SIMULATED CHANNELS</span>{channels.map((item) => { const Icon = channelIcons[item]; return <span key={item} className="inline-flex items-center gap-1 rounded-lg bg-cream px-2 py-1 text-[10px] text-sage"><Icon size={11} />{item}</span> })}</div><div className="mt-3 flex flex-wrap items-center gap-1.5" aria-label={`Escalation path; current level ${currentLevel}`}><span className="section-label mr-1">ESCALATION PATH</span>{escalationLevels.map((level, index) => <span key={level} className="inline-flex items-center gap-1.5"><span className={`rounded-lg px-2 py-1 text-[10px] ${index === currentLevelIndex ? 'bg-oxblood font-semibold text-paper' : index < currentLevelIndex ? 'bg-pale-sage text-forest' : 'bg-cream text-sage'}`}>{level}</span>{index < escalationLevels.length - 1 && <span aria-hidden="true" className="text-sage/60">→</span>}</span>)}</div><time className="mono mt-2 block text-[9px] text-sage/65">{format(new Date(alert.createdAt), 'dd MMM yyyy · HH:mm')}{alert.acknowledgedBy ? ` · acknowledged by ${alert.acknowledgedBy}` : ''}</time></div>
          <div className="flex flex-wrap items-start gap-2 xl:justify-end">{alert.caseId && <Link to={`/app/cases/${alert.caseId}`} className="button button-secondary !px-2.5 !py-1.5 !text-[11px]">Open case</Link>}{!alert.read && <Button variant="secondary" className="!px-2.5 !py-1.5 !text-[11px]" onClick={() => act(alert.id, 'acknowledge')}><Check size={13} /> Acknowledge</Button>}<Button variant="quiet" className="!px-2.5 !py-1.5 !text-[11px]" onClick={() => act(alert.id, 'snooze')}><Clock3 size={13} /> Snooze 7 days</Button></div>
        </article>
      })}</div>}
    </Card>
  </>
}
