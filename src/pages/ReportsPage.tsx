import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Download, Printer } from 'lucide-react'
import { regionSchema, type HumanRole } from '@/data/schemas'
import { downloadCsv } from '@/utils/exportCsv'
import { useCasePilotStore } from '@/store/useCasePilotStore'
import { Button, Card, EmptyState, Select, StatusChip } from '@/components/ui'

const chartPalette = { forest: '#1B3D33', sage: '#4A6552', pale: '#DCE5D9', rust: '#B85C42', mustard: '#E5AE48' }

export default function ReportsPage({ role }: { role: HumanRole }) {
  const cases = useCasePilotStore((state) => state.cases)
  const institutions = useCasePilotStore((state) => state.institutions)
  const documents = useCasePilotStore((state) => state.documents)
  const undertakings = useCasePilotStore((state) => state.undertakings)
  const demoNow = useCasePilotStore((state) => state.demoNow)
  const [region, setRegion] = useState('All Regions')
  const [report, setReport] = useState('Pendency')
  const now = useMemo(() => new Date(demoNow), [demoNow])
  const visibleCases = cases.filter((item) => region === 'All Regions' || item.region === region)
  const visibleUndertakings = undertakings.filter((item) => region === 'All Regions' || institutions.find((institution) => institution.id === item.institutionId)?.region === region)
  const visibleDocuments = documents.filter((item) => region === 'All Regions' || institutions.find((institution) => institution.id === item.institutionId)?.region === region)
  const regionData = regionSchema.options.map((item) => ({ region: item.replace('-', ' '), pendency: cases.filter((record) => record.region === item && record.status !== 'Closed').length, overdue: cases.filter((record) => record.region === item && record.status === 'Overdue').length, escalated: cases.filter((record) => record.region === item && record.status === 'Escalated').length }))
  const evcCases = visibleCases.filter((item) => item.route.steps.includes('EVC'))
  const expiringDocs = visibleDocuments.filter((item) => item.expiresAt && new Date(item.expiresAt) < new Date(now.getTime() + 30 * 86_400_000))
  const openUndertakings = visibleUndertakings.filter((item) => item.status !== 'Accepted')
  const rows = report === 'EVC status' ? evcCases.map((item) => ({ record: item.id, institution: institutions.find((entry) => entry.id === item.institutionId)?.shortName ?? '', region: item.region, stage: item.currentStage, status: item.currentStage === 'EVC' ? item.evcScheduledAt ? 'Scheduled' : 'Awaiting date' : item.stages.find((stage) => stage.label === 'EVC')?.status ?? 'Not reached', due: item.stages.find((stage) => stage.label === 'EVC')?.dueAt ?? '' }))
    : report === 'Undertaking compliance' ? visibleUndertakings.map((item) => ({ record: item.id, institution: institutions.find((entry) => entry.id === item.institutionId)?.shortName ?? '', region: institutions.find((entry) => entry.id === item.institutionId)?.region ?? '', stage: item.title, status: item.status, due: item.dueAt }))
      : report === 'Document validity' ? visibleDocuments.map((item) => ({ record: item.id, institution: institutions.find((entry) => entry.id === item.institutionId)?.shortName ?? '', region: institutions.find((entry) => entry.id === item.institutionId)?.region ?? '', stage: item.kind, status: item.verification, due: item.expiresAt ?? '' }))
        : visibleCases.filter((item) => report === 'Overdue cases' ? item.status === 'Overdue' || item.status === 'Escalated' : true).map((item) => ({ record: item.id, institution: institutions.find((entry) => entry.id === item.institutionId)?.shortName ?? '', region: item.region, stage: item.currentStage, status: item.status, due: item.stages.find((stage) => stage.label === item.currentStage)?.dueAt ?? '' }))
  const exportCsv = () => downloadCsv(`casepilot-${report.toLowerCase().replaceAll(' ', '-')}-${format(now, 'yyyyMMdd')}.csv`, rows)

  if (role !== 'Bureau Officer' && role !== 'Authority') return <Card className="p-8"><div className="mx-auto max-w-lg text-center"><h1 className="font-heading text-2xl text-forest">Reports access is restricted</h1><p className="mt-2 text-sm text-sage">Switch to an authorized Bureau Officer or Authority demo role to view operational reports.</p></div></Card>

  return <>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 print:hidden"><div><div className="eyebrow">10 / OPERATIONAL REPORTING</div><h1 className="page-title">Reports & performance</h1><p className="mt-2 text-sm text-sage">Filtered snapshots of pendency, EVC, compliance and document validity.</p></div><div className="flex gap-2"><Button variant="secondary" onClick={() => window.print()}><Printer size={14} /> Print / Save PDF</Button><Button onClick={exportCsv}><Download size={14} /> Export CSV</Button></div></div>
    <Card className="mb-5 flex flex-wrap items-center gap-3 p-4 print:hidden"><label className="text-xs font-semibold text-sage">Report<Select className="ml-2" value={report} onChange={(event) => setReport(event.target.value)}>{['Pendency', 'EVC status', 'Undertaking compliance', 'Document validity', 'Overdue cases'].map((item) => <option key={item}>{item}</option>)}</Select></label><label className="text-xs font-semibold text-sage">Region<Select className="ml-2" value={region} onChange={(event) => setRegion(event.target.value)}><option>All Regions</option>{regionSchema.options.map((item) => <option key={item}>{item}</option>)}</Select></label><span className="ml-auto text-xs text-sage">As of {format(now, 'dd MMM yyyy')} · demo data</span></Card>
    <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Metric label="Open pendency" value={visibleCases.filter((item) => item.status !== 'Closed').length} /><Metric label="EVC awaiting date" value={evcCases.filter((item) => item.currentStage === 'EVC' && !item.evcScheduledAt).length} /><Metric label="Open undertakings" value={openUndertakings.length} /><Metric label="Documents due <30d" value={expiringDocs.length} /><Metric label="Overdue / escalated" value={visibleCases.filter((item) => item.status === 'Overdue' || item.status === 'Escalated').length} /></div>
    <div className="grid gap-5 xl:grid-cols-[1fr_.8fr]"><Card className="p-5"><div className="section-label">ALL-REGION COMPARISON</div><h2 className="mt-1 font-heading text-xl text-forest">Pendency and overdue caseload</h2><div className="mt-4 h-72" aria-label="Case pendency and overdue comparison across eight Regions"><ResponsiveContainer width="100%" height="100%"><BarChart data={regionData}><CartesianGrid strokeDasharray="3 3" stroke={chartPalette.pale} /><XAxis dataKey="region" angle={-20} textAnchor="end" height={55} tick={{ fill: chartPalette.sage, fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fill: chartPalette.sage, fontSize: 11 }} /><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="pendency" name="Open pendency" fill={chartPalette.sage} radius={[5, 5, 0, 0]} /><Bar dataKey="overdue" name="Overdue" fill={chartPalette.rust} radius={[5, 5, 0, 0]} /><Bar dataKey="escalated" name="Escalated" fill={chartPalette.mustard} radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div></Card><Card className="p-5"><div className="section-label">REPORT NOTES</div><h2 className="mt-1 font-heading text-xl text-forest">Current view</h2><div className="mt-4 space-y-3 text-xs leading-5 text-sage"><p><strong className="text-forest">{report}</strong> · {rows.length} records in {region}.</p><p>Region performance is shown across all eight Regions regardless of the selected table filter, so cross-region comparisons remain visible.</p><p>Metrics are calculated from illustrative CasePilot demo data and do not describe current AICTE operations.</p></div></Card></div>
    <Card className="mt-5 overflow-hidden"><div className="flex items-center justify-between p-4"><div><div className="section-label">FILTERED EXTRACT</div><h2 className="mt-1 font-heading text-lg text-forest">{report}</h2></div><span className="mono text-[10px] text-sage">{rows.length} rows</span></div>{rows.length ? <div className="table-wrap"><table><thead><tr><th>Record</th><th>Institution</th><th>Region</th><th>Stage / condition</th><th>Status</th><th>Due / expiry</th></tr></thead><tbody>{rows.map((row) => <tr key={row.record}><td className="mono text-[10px]">{row.record}</td><td>{row.institution}</td><td>{row.region}</td><td>{row.stage}</td><td><StatusChip status={row.status === 'Scheduled' || row.status === 'Completed' || row.status === 'Accepted' ? 'Closed' : row.status === 'Overdue' || row.status === 'Escalated' || row.status === 'Expired' ? 'Overdue' : row.status === 'Due soon' ? 'Due soon' : 'On track'} /></td><td className="mono whitespace-nowrap text-[10px]">{row.due ? format(new Date(row.due), 'dd MMM yyyy') : '—'}</td></tr>)}</tbody></table></div> : <EmptyState title="No report rows" description="There are no records in this report for the selected Region." />}</Card>
  </>
}

function Metric({ label, value }: { label: string; value: number }) {
  return <Card className="p-4"><div className="section-label">{label}</div><div className="mt-2 font-heading text-3xl text-forest">{value.toLocaleString('en-IN')}</div></Card>
}
