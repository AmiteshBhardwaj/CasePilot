import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'
import { differenceInCalendarDays, format } from 'date-fns'
import { Activity, AlertTriangle, ArrowRight, Building2, CalendarDays, CircleHelp, Clock3, FileClock, FileText, Gauge, ShieldCheck, Users } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { CaseRecord, HumanRole, RouteStep } from '@/data/schemas'
import { useCasePilotStore } from '@/store/useCasePilotStore'
import { Card, EmptyState, StatusChip } from '@/components/ui'

const palette = { forest: '#1B3D33', sage: '#4A6552', paleSage: '#DCE5D9', mustard: '#E5AE48', terracotta: '#E0866B', rust: '#B85C42', oxblood: '#7D3F33', cream: '#F4EFE2' }

function AnimatedCount({ value }: { value: number }) {
  const [count, setCount] = useState(value)
  const countRef = useRef(value)
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) { setCount(value); countRef.current = value; return }
    const start = performance.now()
    const from = countRef.current
    const duration = 440
    let frame = 0
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const next = Math.round(from + (value - from) * (1 - (1 - progress) ** 3))
      setCount(next); countRef.current = next
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value])
  return <>{count.toLocaleString('en-IN')}</>
}

function Heading({ label, title, action }: { label: string; title: string; action?: React.ReactNode }) {
  return <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><div className="eyebrow">{label}</div><h1 className="page-title">{title}</h1></div>{action}</div>
}

function Stat({ label, value, note, icon: Icon, tone = 'sage' }: { label: string; value: number; note: string; icon: typeof Gauge; tone?: 'sage' | 'mustard' | 'terracotta' | 'oxblood' }) {
  const toneStyle = { sage: 'bg-pale-sage text-forest', mustard: 'bg-[#F4E1B8] text-[#513C18]', terracotta: 'bg-[#F1C1B2] text-[#482219]', oxblood: 'bg-oxblood text-paper' }[tone]
  return <Card className="p-4 sm:p-5"><div className="flex items-start justify-between gap-2"><div><div className="text-xs font-semibold uppercase tracking-wider text-sage">{label}</div><div className="mt-3 font-heading text-3xl text-forest"><AnimatedCount value={value} /></div></div><span className={`grid h-9 w-9 place-items-center rounded-xl ${toneStyle}`}><Icon size={17} /></span></div><div className="mt-3 text-xs text-sage">{note}</div></Card>
}

function CaseLine({ record, subtitle }: { record: CaseRecord; subtitle?: string }) {
  const institution = useCasePilotStore((state) => state.institutions.find((item) => item.id === record.institutionId))
  return <Link to={`/app/cases/${record.id}`} className="flex flex-wrap items-center gap-3 border-b border-[var(--hairline)] px-4 py-3 transition hover:bg-cream/55 last:border-0"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-pale-sage text-forest"><FileText size={16} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-forest">{institution?.shortName} · {record.currentStage}</span><span className="mt-0.5 block truncate text-xs text-sage">{subtitle ?? record.title}</span><span className="mono mt-1 block text-[10px] text-sage">{record.id}</span></span><StatusChip status={record.status} /><ArrowRight size={15} className="text-sage" /></Link>
}

function AlertList({ max = 5 }: { max?: number }) {
  const alerts = useCasePilotStore((state) => state.alerts)
  const cases = useCasePilotStore((state) => state.cases)
  const visible = alerts.filter((alert) => !alert.read).slice(0, max)
  return <div className="divide-y divide-[var(--hairline)]">{visible.map((alert) => {
    const record = cases.find((item) => item.id === alert.caseId)
    return <Link key={alert.id} to={alert.caseId ? `/app/cases/${alert.caseId}` : '/app/alerts'} className="flex gap-3 px-4 py-3 hover:bg-cream/50"><span className={`mt-0.5 grid h-7 w-7 place-items-center rounded-lg ${alert.severity === 'Critical' ? 'bg-[#F1C1B2] text-oxblood' : 'bg-[#F4E1B8] text-[#513C18]'}`}><AlertTriangle size={14} /></span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-forest">{alert.title}</span><span className="mt-1 block text-xs leading-4 text-sage">{alert.message}</span><span className="mono mt-1 block text-[9px] text-sage">{record?.assignedOfficerId ?? alert.ownerId ?? 'Institution'} · {format(new Date(alert.createdAt), 'dd MMM')}</span></span></Link>
  })}{visible.length === 0 && <p className="px-4 py-8 text-center text-xs text-sage">No new alerts. The workflow is up to date.</p>}</div>
}

function CaseTableCard({ title, records, detail }: { title: string; records: CaseRecord[]; detail?: string }) {
  return <Card className="overflow-hidden"><div className="flex items-center justify-between px-4 pb-3 pt-4"><div><div className="section-label">CASE QUEUE</div><h2 className="mt-1 font-heading text-lg text-forest">{title}</h2>{detail && <p className="mt-1 text-xs text-sage">{detail}</p>}</div><Link to="/app/cases" className="text-xs font-semibold text-sage hover:text-forest">Open queue →</Link></div>{records.length ? <div>{records.slice(0, 7).map((record) => <CaseLine key={record.id} record={record} />)}</div> : <EmptyState title="No cases in this queue" description="New assignments will appear here." />}</Card>
}

export default function DashboardPage({ role }: { role: HumanRole }) {
  const dataSourceStatus = useCasePilotStore((state) => state.dataSourceStatus)
  if (dataSourceStatus !== 'connected') return <Card className="p-8"><div className="mx-auto max-w-xl text-center"><div className="section-label">01 / WORKSPACE STATUS</div><h1 className="mt-2 font-heading text-2xl text-forest">No operational records loaded</h1><p className="mt-2 text-sm leading-6 text-sage">This workspace contains no institution or case records. Connect an approved data service to view records scoped by the authenticated service session.</p></div></Card>
  switch (role) {
    case 'Institution': return <InstitutionDashboard />
    case 'Regional Officer': return <RegionalDashboard />
    case 'Bureau Officer': return <BureauDashboard />
    case 'Committee': return <CommitteeDashboard />
    case 'Authority': return <AuthorityDashboard />
  }
}

function InstitutionDashboard() {
  const cases = useCasePilotStore((state) => state.cases)
  const undertakings = useCasePilotStore((state) => state.undertakings)
  const documents = useCasePilotStore((state) => state.documents)
  const now = new Date()
  const outstanding = cases.find((item) => item.status !== 'Closed' && item.stages.some((stage) => stage.status === 'Returned'))
  const next = outstanding ?? [...cases].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))[0]
  const missing = documents.filter((item) => item.verification === 'Pending' || item.verification === 'Needs clarification')
  const dueObligations = undertakings.filter((item) => ['Pending', 'Overdue'].includes(item.status))
  return <>
    <Heading label="01 / INSTITUTION WORKSPACE" title="Your approval work" action={<Link to="/app/apply" className="button button-primary"><FileText size={15} /> Start application</Link>} />
    <div className="grid gap-4 xl:grid-cols-[1.5fr_.85fr]">
      <Card className="overflow-hidden bg-forest text-paper"><div className="grid gap-5 p-6 sm:grid-cols-[1fr_auto] sm:items-end"><div><div className="font-mono text-[10px] uppercase tracking-[.16em] text-paper/60">NEXT ACTION · HUMAN RESPONSE</div><h2 className="mt-2 max-w-xl font-heading text-3xl leading-tight">{outstanding ? 'Respond to the returned application' : next?.title ?? 'Start a new application'}</h2><p className="mt-2 max-w-lg text-sm leading-6 text-paper/70">{outstanding ? 'A regional officer returned this case with a reason. Review the observations and submit updated evidence.' : 'Keep application records, evidence and time-bound obligations together.'}</p></div><Link to={outstanding ? `/app/cases/${outstanding.id}` : '/app/apply'} className="button bg-mustard text-ink hover:bg-[#efbd61]">{outstanding ? 'Review and respond' : 'Begin application'} <ArrowRight size={15} /></Link></div><div className="grid grid-cols-3 border-t border-paper/15"><div className="px-5 py-3"><div className="text-[10px] uppercase tracking-wider text-paper/60">Stage</div><div className="mt-1 text-sm font-semibold">{outstanding?.currentStage ?? next?.currentStage ?? 'Not started'}</div></div><div className="border-l border-paper/15 px-5 py-3"><div className="text-[10px] uppercase tracking-wider text-paper/60">Deadline</div><div className="mono mt-1 text-xs">{outstanding ? format(new Date(outstanding.stages.find((stage) => stage.label === outstanding.currentStage)?.dueAt ?? now), 'dd MMM yyyy') : '—'}</div></div><div className="border-l border-paper/15 px-5 py-3"><div className="text-[10px] uppercase tracking-wider text-paper/60">Returns</div><div className="mono mt-1 text-xs">{String(outstanding?.returnedCount ?? 0).padStart(2, '0')}</div></div></div></Card>
      <Card className="p-5"><div className="section-label">EVIDENCE & OBLIGATIONS</div><h2 className="mt-1 font-heading text-xl text-forest">Items needing your attention</h2><div className="mt-4 space-y-3"><div className="flex items-center gap-3 rounded-xl bg-cream/70 p-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#F4E1B8] text-[#513C18]"><FileText size={15} /></span><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-forest">Evidence to clarify</p><p className="mt-0.5 text-xs text-sage">{missing.length} document records need officer review</p></div><span className="mono text-sm text-forest">{missing.length}</span></div><div className="flex items-center gap-3 rounded-xl bg-cream/70 p-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#F1C1B2] text-[#482219]"><CalendarDays size={15} /></span><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-forest">Open obligations</p><p className="mt-0.5 text-xs text-sage">Due dates and evidence status</p></div><span className="mono text-sm text-forest">{dueObligations.length}</span></div></div><Link to="/app/compliance" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-sage">Review compliance items <ArrowRight size={13} /></Link></Card>
    </div>
    <div className="two-column mt-5"><CaseTableCard title="My applications" records={cases} detail="Stage, returned items and next deadlines" /><Card className="overflow-hidden"><div className="px-4 pb-3 pt-4"><div className="section-label">OBLIGATIONS</div><h2 className="mt-1 font-heading text-lg text-forest">Upcoming undertakings</h2></div>{dueObligations.slice(0, 5).map((item) => <div key={item.id} className="flex items-center gap-3 border-t border-[var(--hairline)] px-4 py-3"><Clock3 size={15} className="text-sage" /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-forest">{item.title}</span><span className="mono mt-0.5 block text-[10px] text-sage">Due {format(new Date(item.dueAt), 'dd MMM yyyy')}</span></span><span className={`text-[10px] font-semibold ${item.status === 'Overdue' ? 'text-oxblood' : 'text-sage'}`}>{item.status}</span></div>)}<div className="px-4 py-3"><Link to="/app/compliance" className="text-xs font-semibold text-sage">All obligations →</Link></div></Card></div>
  </>
}

function RegionalDashboard() {
  const cases = useCasePilotStore((state) => state.cases)
  const officers = useCasePilotStore((state) => state.officers.filter((item) => item.role === 'Regional Officer'))
  const now = new Date()
  const open = cases.filter((item) => item.status !== 'Closed')
  const overdue = open.filter((item) => item.status === 'Overdue')
  const stageData = (['Scrutiny', 'EVC', 'SAC/SHC', 'Authority Decision'] as RouteStep[]).map((stage) => ({ name: stage, cases: open.filter((item) => item.currentStage === stage).length }))
  const aging = [{ name: '0–7 days', value: 0 }, { name: '8–15 days', value: 0 }, { name: '16–30 days', value: 0 }, { name: '31+ days', value: 0 }]
  for (const record of open) { const stage = record.stages.find((item) => item.label === record.currentStage); const age = differenceInCalendarDays(now, new Date(stage?.enteredAt ?? record.submittedAt)); const bucket = age <= 7 ? 0 : age <= 15 ? 1 : age <= 30 ? 2 : 3; aging[bucket].value += 1 }
  const ownerWork = officers.map((officer) => ({ name: officer.name.split(' ')[0], cases: open.filter((item) => item.assignedOfficerId === officer.id).length }))
  const region = cases[0]?.region ?? 'Assigned Region'
  const bottleneck = [...stageData].sort((a, b) => b.cases - a.cases)[0]
  return <>
    <Heading label="02 / REGIONAL OFFICER WORKSPACE" title="Regional operations" action={<span className="status-chip status-neutral">{region}</span>} />
    <div className="metric-grid"><Stat label="Open in region" value={open.length} note={`${cases.length - open.length} cases closed`} icon={FileClock} /><Stat label="Overdue" value={overdue.length} note="Prioritise SLA follow-up" icon={AlertTriangle} tone="terracotta" /><Stat label="EVC pending" value={open.filter((item) => item.currentStage === 'EVC').length} note="Scheduling and inspection status" icon={CalendarDays} tone="mustard" /><Stat label="Bottleneck" value={bottleneck?.cases ?? 0} note={`${bottleneck?.name ?? 'No stage'} has highest pendency`} icon={Activity} tone="oxblood" /></div>
    <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]"><Card className="p-5"><div className="section-label">STAGE FUNNEL</div><h2 className="mt-1 font-heading text-xl text-forest">Cases by stage</h2><div className="mt-4 h-64" aria-label="Bar chart of cases per approval stage"><ResponsiveContainer width="100%" height="100%"><BarChart data={stageData} layout="vertical" margin={{ left: 8, right: 15 }}><CartesianGrid stroke={palette.paleSage} horizontal={false} /><XAxis type="number" tick={{ fill: palette.sage, fontSize: 11 }} allowDecimals={false} /><YAxis type="category" dataKey="name" width={118} tick={{ fill: palette.forest, fontSize: 11 }} /><Tooltip cursor={{ fill: '#F4EFE2' }} /><Bar dataKey="cases" fill={palette.sage} radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></div></Card>
      <Card className="p-5"><div className="section-label">AGEING PROFILE</div><h2 className="mt-1 font-heading text-xl text-forest">Open case ageing</h2><div className="mt-4 h-64" aria-label="Donut chart of open case ageing"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={aging} dataKey="value" nameKey="name" innerRadius={62} outerRadius={94} paddingAngle={3}>{aging.map((entry, index) => <Cell key={entry.name} fill={[palette.sage, palette.mustard, palette.terracotta, palette.oxblood][index]} />)}</Pie><Tooltip /><Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 11, color: palette.sage }} /></PieChart></ResponsiveContainer></div></Card></div>
    <div className="two-column mt-5"><Card className="p-5"><div className="section-label">WORKLOAD DISTRIBUTION</div><h2 className="mt-1 font-heading text-xl text-forest">Cases by regional officer</h2><div className="mt-4 h-52" aria-label="Regional officer case workload chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={ownerWork}><CartesianGrid strokeDasharray="3 3" stroke={palette.paleSage} /><XAxis dataKey="name" tick={{ fill: palette.sage, fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fill: palette.sage, fontSize: 11 }} /><Tooltip /><Bar dataKey="cases" name="Assigned cases" fill={palette.forest} radius={[7, 7, 0, 0]} /></BarChart></ResponsiveContainer></div></Card><CaseTableCard title="Overdue queue" records={overdue} detail="Oldest stage SLA items in this Region" /></div>
  </>
}

function BureauDashboard() {
  const cases = useCasePilotStore((state) => state.cases)
  const institutions = useCasePilotStore((state) => state.institutions)
  const open = cases.filter((item) => item.status !== 'Closed')
  const regions = [...new Set(cases.map((item) => item.region))]
  const regionData = regions.map((region) => ({ name: region.replace('-', ' '), pendency: cases.filter((item) => item.region === region && item.status !== 'Closed').length, overdue: cases.filter((item) => item.region === region && item.status === 'Overdue').length }))
  const evcData = [{ name: 'Scheduled', value: cases.filter((item) => item.currentStage === 'EVC' && item.evcScheduledAt).length }, { name: 'Awaiting date', value: cases.filter((item) => item.currentStage === 'EVC' && !item.evcScheduledAt).length }, { name: 'Completed', value: cases.filter((item) => item.stages.some((stage) => stage.label === 'EVC' && stage.status === 'Completed')).length }]
  return <>
    <Heading label="03 / APPROVALS BUREAU" title="National pendency overview" action={<span className="status-chip status-neutral">All 8 Regions</span>} />
    <div className="metric-grid"><Stat label="Open pendency" value={open.length} note={`${cases.length} total registered cases`} icon={FileClock} /><Stat label="EVC queue" value={cases.filter((item) => item.currentStage === 'EVC').length} note="Scheduling and site visit follow-up" icon={CalendarDays} tone="mustard" /><Stat label="Overdue" value={cases.filter((item) => item.status === 'Overdue').length} note="Current stage exceeds SLA" icon={AlertTriangle} tone="terracotta" /><Stat label="Institutions" value={institutions.length} note="In the assigned scope" icon={Building2} /></div>
    <div className="grid gap-5 xl:grid-cols-[1.4fr_.7fr]"><Card className="p-5"><div className="section-label">REGION PERFORMANCE</div><h2 className="mt-1 font-heading text-xl text-forest">Pendency and overdue cases</h2><div className="mt-4 h-72" aria-label="Comparison chart by AICTE Region"><ResponsiveContainer width="100%" height="100%"><BarChart data={regionData}><CartesianGrid strokeDasharray="3 3" stroke={palette.paleSage} /><XAxis dataKey="name" angle={-24} textAnchor="end" height={55} tick={{ fill: palette.sage, fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fill: palette.sage, fontSize: 11 }} /><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="pendency" name="Open cases" fill={palette.sage} radius={[5, 5, 0, 0]} /><Bar dataKey="overdue" name="Overdue" fill={palette.terracotta} radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
      <Card className="p-5"><div className="section-label">EVC STATUS</div><h2 className="mt-1 font-heading text-xl text-forest">Verification visits</h2><div className="mt-4 h-56" aria-label="EVC scheduling status chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={evcData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={84} paddingAngle={3}>{evcData.map((entry, index) => <Cell key={entry.name} fill={[palette.sage, palette.mustard, palette.forest][index]} />)}</Pie><Tooltip /><Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 10 }} /></PieChart></ResponsiveContainer></div><p className="mt-3 text-xs leading-5 text-sage">Site verification outcomes remain human reviewed and recorded.</p></Card></div>
    <div className="two-column mt-5"><Card className="overflow-hidden"><div className="px-4 pb-3 pt-4"><div className="section-label">REGION SCORECARD</div><h2 className="mt-1 font-heading text-lg text-forest">All-Region performance</h2></div><div className="table-wrap"><table><thead><tr><th>Region</th><th>Open</th><th>Overdue</th><th>Due soon</th><th>Escalated</th></tr></thead><tbody>{regionData.map((row) => <tr key={row.name}><td className="font-semibold text-forest">{row.name}</td><td className="mono">{row.pendency}</td><td className="mono text-oxblood">{row.overdue}</td><td>{cases.filter((item) => item.region.replace('-', ' ') === row.name && item.status === 'Due soon').length}</td><td>{cases.filter((item) => item.region.replace('-', ' ') === row.name && item.status === 'Escalated').length}</td></tr>)}</tbody></table></div></Card><AlertPanel role="Bureau Officer" /></div>
  </>
}

function CommitteeDashboard() {
  const cases = useCasePilotStore(useShallow((state) => state.cases.filter((item) => item.route.steps.includes('SAC/SHC'))))
  const observations = useCasePilotStore((state) => state.observations)
  const documents = useCasePilotStore((state) => state.documents)
  const queue = cases.filter((item) => item.currentStage === 'SAC/SHC' || item.stages.some((stage) => stage.label === 'SAC/SHC' && stage.status === 'Completed'))
  return <>
    <Heading label="04 / COMMITTEE WORKSPACE" title="Committee workspace" action={<span className="status-chip status-neutral">Assigned agenda only</span>} />
    <div className="metric-grid"><Stat label="Assigned cases" value={cases.length} note="Routed to this committee" icon={FileText} /><Stat label="Awaiting outcome" value={cases.filter((item) => item.currentStage === 'SAC/SHC').length} note="Committee record required" icon={Users} tone="mustard" /><Stat label="Open notes" value={observations.filter((item) => cases.some((record) => record.id === item.caseId) && item.status === 'Open').length} note="Observations linked to cases" icon={CircleHelp} /><Stat label="Linked documents" value={documents.filter((doc) => cases.some((record) => record.id === doc.caseId)).length} note="Evidence available to review" icon={FileText} /></div>
    <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_.72fr]"><Card className="overflow-hidden"><div className="flex items-end justify-between px-4 pb-3 pt-4"><div><div className="section-label">ASSIGNED WORK</div><h2 className="mt-1 font-heading text-xl text-forest">Committee review list</h2></div><span className="text-xs text-sage">{queue.length} agenda records</span></div>{queue.length ? queue.map((record) => <CaseLine key={record.id} record={record} subtitle={`${record.applicationType} · ${documents.filter((doc) => doc.caseId === record.id).length} documents · ${observations.filter((item) => item.caseId === record.id).length} notes`} />) : <EmptyState title="No assigned agenda items" description="Cases assigned to this committee appear here after preliminary processing." />}</Card><Card className="p-5"><div className="section-label">REVIEW STANDARD</div><h2 className="mt-1 font-heading text-xl text-forest">Committee notes</h2><div className="mt-4 space-y-3">{['Agenda note and technical observations stay linked to the case.', 'A committee outcome requires named Committee member input.', 'The Authority records the final statutory decision separately.'].map((item, index) => <div key={item} className="flex gap-3 rounded-xl bg-cream/70 p-3"><span className="mono text-xs font-semibold text-sage">0{index + 1}</span><p className="text-xs leading-5 text-sage">{item}</p></div>)}</div></Card></div>
  </>
}

function AuthorityDashboard() {
  const cases = useCasePilotStore((state) => state.cases)
  const documents = useCasePilotStore((state) => state.documents)
  const undertakings = useCasePilotStore((state) => state.undertakings)
  const awaiting = cases.filter((item) => item.currentStage === 'Authority Decision' && item.status !== 'Closed')
  const escalated = cases.filter((item) => item.escalationLevel !== 'None' && item.status !== 'Closed')
  const unhealthyDocs = documents.filter((item) => item.verification !== 'Verified' || (item.expiresAt && new Date(item.expiresAt) < new Date()))
  const openObligations = undertakings.filter((item) => ['Pending', 'Overdue'].includes(item.status))
  return <>
    <Heading label="05 / COMPETENT AUTHORITY" title="Decision & compliance oversight" action={<span className="status-chip status-neutral">Human decision workspace</span>} />
    <div className="metric-grid"><Stat label="Awaiting decision" value={awaiting.length} note="Authority Decision stage" icon={ShieldCheck} tone="mustard" /><Stat label="Escalated cases" value={escalated.length} note="At or above Authority ladder" icon={AlertTriangle} tone="oxblood" /><Stat label="Evidence health" value={unhealthyDocs.length} note="Expired or not human verified" icon={FileText} tone="terracotta" /><Stat label="Open obligations" value={openObligations.length} note="Undertakings still to close" icon={CalendarDays} /></div>
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_.85fr]"><CaseTableCard title="Cases awaiting your decision" records={awaiting} detail="Only the competent Authority can record the decision" /><Card className="overflow-hidden"><div className="px-4 pb-3 pt-4"><div className="section-label">ESCALATION REVIEW</div><h2 className="mt-1 font-heading text-lg text-forest">Authority ladder</h2></div>{escalated.length ? escalated.map((record) => <CaseLine key={record.id} record={record} subtitle={`Escalated to ${record.escalationLevel} · ${record.currentStage}`} />) : <EmptyState title="No escalations" description="Cases that exceed configured thresholds appear here." />}</Card></div>
    <div className="two-column mt-5"><Card className="p-5"><div className="section-label">COMPLIANCE HEALTH</div><h2 className="mt-1 font-heading text-xl text-forest">Post-approval status</h2><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-cream/70 p-3"><div className="text-xs text-sage">Documents needing review</div><div className="mono mt-2 text-xl text-forest"><AnimatedCount value={unhealthyDocs.length} /></div></div><div className="rounded-xl bg-cream/70 p-3"><div className="text-xs text-sage">Open undertakings</div><div className="mono mt-2 text-xl text-forest"><AnimatedCount value={openObligations.length} /></div></div></div><Link to="/app/compliance" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-sage">View compliance register <ArrowRight size={13} /></Link></Card><AlertPanel role="Authority" /></div>
  </>
}

function AlertPanel({ role }: { role: HumanRole }) {
  return <Card className="overflow-hidden"><div className="flex items-center justify-between px-4 pb-3 pt-4"><div><div className="section-label">LIVE ALERTS</div><h2 className="mt-1 font-heading text-lg text-forest">Monitoring signals</h2></div><Link to="/app/alerts" className="text-xs font-semibold text-sage">All alerts →</Link></div><AlertList max={4} /><div className="border-t border-[var(--hairline)] px-4 py-2 text-[10px] text-sage">{role} · alerts support human review</div></Card>
}
