import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { differenceInCalendarDays, format } from 'date-fns'
import { BookmarkPlus, FilterX, Search, Users } from 'lucide-react'
import type { CaseRecord, HumanRole } from '@/data/schemas'
import { useCasePilotStore } from '@/store/useCasePilotStore'
import { evaluateCaseSla } from '@/engine/slaEngine'
import { assignCase } from '@/engine/assignmentEngine'
import { Button, Card, DataTable, EmptyState, Input, Select, StatusChip } from '@/components/ui'

type SavedView = { name: string; params: string }

function readSavedViews(): SavedView[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem('casepilot-case-views') ?? '[]')
    return Array.isArray(value) ? value.filter((item): item is SavedView => typeof item?.name === 'string' && typeof item?.params === 'string') : []
  } catch { return [] }
}

function dueLabel(record: CaseRecord, now: Date): string {
  if (record.status === 'Closed') return 'Closed'
  const { daysRemaining } = evaluateCaseSla(record, now)
  return daysRemaining < 0 ? `${Math.abs(daysRemaining)}d overdue` : daysRemaining === 0 ? 'Due today' : `${daysRemaining}d left`
}

export default function CasesPage({ role }: { role: HumanRole }) {
  const [params, setParams] = useSearchParams()
  const allCases = useCasePilotStore((state) => state.cases)
  const institutions = useCasePilotStore((state) => state.institutions)
  const officers = useCasePilotStore((state) => state.officers)
  const demoNow = useCasePilotStore((state) => state.demoNow)
  const saveCaseBatch = useCasePilotStore((state) => state.saveCaseBatch)
  const [selected, setSelected] = useState<string[]>([])
  const [saveName, setSaveName] = useState('')
  const [savedViews, setSavedViews] = useState(readSavedViews)
  const now = useMemo(() => new Date(demoNow), [demoNow])
  const current = (key: string) => params.get(key) ?? ''
  const setFilter = (key: string, value: string) => setParams((old) => { const next = new URLSearchParams(old); if (value) next.set(key, value); else next.delete(key); return next }, { replace: true })

  const scopedCases = allCases.filter((record) => {
    if (role === 'Institution') return record.institutionId === 'inst-001'
    if (role === 'Regional Officer') return record.region === 'Northern'
    if (role === 'Committee') return record.assignedCommitteeId === 'com-01' && record.route.steps.includes('SAC/SHC')
    return true
  })

  const filtered = scopedCases.filter((record) => {
    const institution = institutions.find((item) => item.id === record.institutionId)
    const owner = officers.find((item) => item.id === record.assignedOfficerId)
    const haystack = `${record.id} ${record.title} ${institution?.name ?? ''} ${institution?.shortName ?? ''}`.toLowerCase()
    const age = differenceInCalendarDays(now, new Date(record.stages.find((item) => item.label === record.currentStage)?.enteredAt ?? record.submittedAt))
    return (!current('q') || haystack.includes(current('q').toLowerCase()))
      && (!current('region') || record.region === current('region'))
      && (!current('stage') || record.currentStage === current('stage'))
      && (!current('route') || record.route.category === current('route'))
      && (!current('institution') || record.institutionId === current('institution'))
      && (!current('owner') || record.assignedOfficerId === current('owner'))
      && (!current('status') || record.status === current('status'))
      && (!current('age') || (current('age') === '0-7' ? age <= 7 : current('age') === '8-15' ? age >= 8 && age <= 15 : current('age') === '16-30' ? age >= 16 && age <= 30 : age >= 31))
      && (role === 'Bureau Officer' || !current('owner') || Boolean(owner))
  })

  const columns = useMemo(() => [
    { id: 'select', header: () => <input aria-label="Select all cases on this page" type="checkbox" checked={filtered.length > 0 && filtered.every((item) => selected.includes(item.id))} onChange={(event) => setSelected(event.target.checked ? [...new Set([...selected, ...filtered.map((item) => item.id)])] : selected.filter((id) => !filtered.some((item) => item.id === id)))} />, cell: ({ row }: { row: { original: CaseRecord } }) => <input aria-label={`Select ${row.original.id}`} type="checkbox" checked={selected.includes(row.original.id)} onChange={(event) => setSelected((items) => event.target.checked ? [...items, row.original.id] : items.filter((id) => id !== row.original.id))} /> },
    { id: 'case', header: 'Case reference', cell: ({ row }: { row: { original: CaseRecord } }) => <Link className="mono font-semibold text-forest hover:underline" to={`/app/cases/${row.original.id}`}>{row.original.id}</Link> },
    { id: 'institution', header: 'Institution / application', cell: ({ row }: { row: { original: CaseRecord } }) => { const institution = institutions.find((item) => item.id === row.original.institutionId); return <div><div className="font-semibold text-ink">{institution?.shortName} <span className="font-normal text-sage">· {institution?.city}</span></div><div className="mt-1 max-w-[280px] truncate text-xs text-sage">{row.original.title}</div></div> } },
    { id: 'region', header: 'Region', cell: ({ row }: { row: { original: CaseRecord } }) => <span className="text-xs">{row.original.region}</span> },
    { id: 'route', header: 'Route', cell: ({ row }: { row: { original: CaseRecord } }) => <span className="text-xs">{row.original.route.category}</span> },
    { id: 'stage', header: 'Stage / owner', cell: ({ row }: { row: { original: CaseRecord } }) => <div><div>{row.original.currentStage}</div><div className="mt-1 text-[10px] text-sage">{officers.find((item) => item.id === row.original.assignedOfficerId)?.name ?? 'Unassigned'}</div></div> },
    { id: 'sla', header: 'SLA countdown', cell: ({ row }: { row: { original: CaseRecord } }) => <span className={`mono text-[10px] font-semibold ${row.original.status === 'Overdue' ? 'text-rust' : row.original.status === 'Due soon' ? 'text-[#8A641C]' : 'text-sage'}`}>{dueLabel(row.original, now)}</span> },
    { id: 'status', header: 'Status', cell: ({ row }: { row: { original: CaseRecord } }) => <StatusChip status={row.original.status} /> },
  ], [filtered, institutions, now, officers, selected])

  const saveCurrentView = () => {
    if (!saveName.trim()) return
    const next = [...savedViews.filter((view) => view.name !== saveName.trim()), { name: saveName.trim(), params: params.toString() }]
    setSavedViews(next); localStorage.setItem('casepilot-case-views', JSON.stringify(next)); setSaveName('')
  }
  const bulkAssign = () => {
    const officer = role === 'Regional Officer' ? officers.find((item) => item.id === 'off-01') : officers.find((item) => item.id === 'off-05')
    if (!officer || !['Regional Officer', 'Bureau Officer'].includes(role)) return
    const actorName = role === 'Regional Officer' ? 'Ritika Anand' : 'Dr. A. K. Sinha'
    const results = allCases.filter((record) => selected.includes(record.id)).map((record) => assignCase(record, { officerId: officer.id, officerName: actorName, role, now }))
    saveCaseBatch(results.map((item) => item.caseRecord), results.map((item) => item.auditEvent)); setSelected([])
  }
  const applySavedView = (view: SavedView) => setParams(new URLSearchParams(view.params), { replace: true })
  const clear = () => { setParams(new URLSearchParams(), { replace: true }); setSelected([]) }
  const canBulkAssign = role === 'Regional Officer' || role === 'Bureau Officer'

  return <>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><div className="eyebrow">02 / CASE REGISTER</div><h1 className="page-title">{role === 'Institution' ? 'My applications' : role === 'Committee' ? 'Assigned cases' : 'Case queue'}</h1><p className="mt-2 text-sm text-sage">Filter by route, stage, ownership and ageing. Current selections stay in the URL.</p></div><div className="flex gap-2"><Button variant="secondary" onClick={clear}><FilterX size={14} /> Clear filters</Button>{role === 'Institution' && <Link to="/app/apply" className="button button-primary">New application</Link>}</div></div>
    <Card className="overflow-hidden"><div className="grid gap-2 border-b border-[var(--hairline)] p-4 sm:grid-cols-2 xl:grid-cols-4">
      <label className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-sage" /><Input aria-label="Search cases and institutions" value={current('q')} onChange={(event) => setFilter('q', event.target.value)} placeholder="Case ID, institution, application" className="w-full pl-9" /></label>
      <Select aria-label="Filter by Region" value={current('region')} onChange={(event) => setFilter('region', event.target.value)}><option value="">All Regions</option>{['Northern', 'Southern', 'Eastern', 'Western', 'Central', 'South-Western', 'South-Central', 'North-Eastern'].map((item) => <option key={item}>{item}</option>)}</Select>
      <Select aria-label="Filter by stage" value={current('stage')} onChange={(event) => setFilter('stage', event.target.value)}><option value="">All stages</option>{['Scrutiny', 'EVC', 'SAC/SHC', 'Authority Decision'].map((item) => <option key={item}>{item}</option>)}</Select>
      <Select aria-label="Filter by route" value={current('route')} onChange={(event) => setFilter('route', event.target.value)}><option value="">All routes</option>{['Only Scrutiny', 'Scrutiny+EVC', 'EVC+SAC/SHC', 'Only EVC', 'Configurable combo'].map((item) => <option key={item}>{item}</option>)}</Select>
      <Select aria-label="Filter by institution" value={current('institution')} onChange={(event) => setFilter('institution', event.target.value)}><option value="">All institutions</option>{institutions.map((item) => <option key={item.id} value={item.id}>{item.shortName} · {item.city}</option>)}</Select>
      <Select aria-label="Filter by owner" value={current('owner')} onChange={(event) => setFilter('owner', event.target.value)}><option value="">All owners</option>{officers.filter((item) => ['Regional Officer', 'Bureau Officer'].includes(item.role)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
      <Select aria-label="Filter by status" value={current('status')} onChange={(event) => setFilter('status', event.target.value)}><option value="">All statuses</option>{['On track', 'Due soon', 'Overdue', 'Escalated', 'Closed'].map((item) => <option key={item}>{item}</option>)}</Select>
      <Select aria-label="Filter by stage age" value={current('age')} onChange={(event) => setFilter('age', event.target.value)}><option value="">All ageing</option><option value="0-7">0–7 days</option><option value="8-15">8–15 days</option><option value="16-30">16–30 days</option><option value="31+">31+ days</option></Select>
    </div>
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--hairline)] bg-cream/35 px-4 py-3"><span className="section-label">SAVED VIEWS</span>{savedViews.map((view) => <button key={view.name} className="rounded-lg bg-paper px-2.5 py-1.5 text-xs font-semibold text-sage" onClick={() => applySavedView(view)}>{view.name}</button>)}<div className="ml-auto flex gap-2"><Input aria-label="Saved view name" value={saveName} onChange={(event) => setSaveName(event.target.value)} placeholder="Name this view" className="!w-36 !py-1.5 !text-xs" /><Button variant="quiet" className="!px-2 !py-1" onClick={saveCurrentView}><BookmarkPlus size={14} /> Save</Button></div></div>
      <div className="flex flex-wrap items-center gap-3 px-4 py-2.5"><span className="text-xs text-sage">{filtered.length} records · {format(now, 'dd MMM yyyy')} clock</span>{selected.length > 0 && <div className="ml-auto flex items-center gap-2"><span className="text-xs text-sage">{selected.length} selected</span>{canBulkAssign && <Button variant="secondary" className="!py-1.5 !text-xs" onClick={bulkAssign}><Users size={14} /> Assign to me</Button>}</div>}</div>
      {filtered.length ? <DataTable data={filtered} columns={columns} /> : <EmptyState title="No cases match these filters" description="Adjust the URL-backed filters or clear them to see the full queue." />}
    </Card>
  </>
}
