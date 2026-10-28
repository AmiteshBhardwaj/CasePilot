import { useState, type ReactNode } from 'react'
import { BrowserRouter, Link, Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Bell, BookOpen, Building2, CalendarClock, Check, ChevronDown, ClipboardCheck, Clock3, FileText, LayoutDashboard, Menu, RotateCcw, Search, ShieldCheck, SlidersHorizontal, Sparkles, Users, Workflow, X } from 'lucide-react'
import { format } from 'date-fns'
import type { HumanRole } from '@/data/schemas'
import { useCasePilotStore } from '@/store/useCasePilotStore'
import { verifyDocument } from '@/engine/humanActions'
import { defaultEscalationRules } from '@/engine/escalationEngine'
import { acknowledgeAlert } from '@/engine/workflowActions'
import { Button, Card, EmptyState, Select, Tabs, Timeline } from '@/components/ui'
import DashboardPage from '@/pages/DashboardPage'
import CasesPage from '@/pages/CasesPage'
import CaseDetailPage from '@/pages/CaseDetailPage'
import ApplicationWizardPage from '@/pages/ApplicationWizardPage'
import AlertsPage from '@/pages/AlertsPage'

const roleNames: Record<HumanRole, string> = {
  Institution: 'Sanjay Prasad', 'Regional Officer': 'Ritika Anand', 'Bureau Officer': 'Dr. A. K. Sinha', Committee: 'Prof. Shalini Rao', Authority: 'Vikram Bedi',
}

function permittedNavigation(role: HumanRole) {
  const core = [{ to: '/app', label: 'Overview', icon: LayoutDashboard }, { to: '/app/cases', label: role === 'Institution' ? 'My cases' : 'Cases', icon: FileText }]
  if (role === 'Institution') core.push({ to: '/app/apply', label: 'New application', icon: Building2 })
  if (role === 'Institution' || role === 'Regional Officer' || role === 'Bureau Officer' || role === 'Authority') core.push({ to: '/app/compliance', label: 'Compliance', icon: ShieldCheck })
  core.push({ to: '/app/alerts', label: 'Alerts', icon: Bell })
  if (role !== 'Institution') core.push({ to: '/app/audit', label: 'Audit trail', icon: Activity })
  if (role === 'Bureau Officer' || role === 'Authority') { core.push({ to: '/app/rules', label: 'Rulebook', icon: BookOpen }); core.push({ to: '/app/debug', label: 'Engine console', icon: SlidersHorizontal }) }
  return core
}

function App() {
  return <BrowserRouter><Routes><Route path="/login" element={<LoginPage />} /><Route path="/app/*" element={<ProtectedShell />} /><Route path="*" element={<Navigate to="/login" replace />} /></Routes></BrowserRouter>
}

function LoginPage() {
  const role = useCasePilotStore((state) => state.role)
  const setRole = useCasePilotStore((state) => state.setRole)
  const navigate = useNavigate()
  const choose = (nextRole: HumanRole) => { setRole(nextRole); navigate('/app', { replace: true }) }
  if (role) return <Navigate to="/app" replace />
  const roles: Array<{ role: HumanRole; detail: string; icon: typeof Building2 }> = [
    { role: 'Institution', detail: 'Submit responses and monitor obligations', icon: Building2 },
    { role: 'Regional Officer', detail: 'Review applications and coordinate EVC', icon: ClipboardCheck },
    { role: 'Bureau Officer', detail: 'Monitor workflow, rules and escalations', icon: Workflow },
    { role: 'Committee', detail: 'Review agenda items and committee stages', icon: Users },
    { role: 'Authority', detail: 'Record competent authority decisions', icon: ShieldCheck },
  ]
  return <main className="login-shell"><Card className="login-card">
    <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-forest text-paper"><Workflow size={23} /></span><div><div className="eyebrow">Smart India Hackathon 2026 · PS 26262</div><h1 className="font-heading text-3xl text-forest">CasePilot</h1></div></div>
    <p className="mt-4 text-sm leading-6 text-sage">Choose a demo role to enter the approval workflow. This prototype has no real authentication.</p>
    <div className="mt-6 space-y-2">{roles.map(({ role: itemRole, detail, icon: Icon }) => <button key={itemRole} onClick={() => choose(itemRole)} className="flex w-full items-center gap-3 rounded-2xl border border-[var(--hairline)] bg-white/40 p-3 text-left transition hover:border-sage hover:bg-pale-sage/50"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-pale-sage text-forest"><Icon size={18} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-forest">{itemRole}</span><span className="mt-0.5 block text-xs text-sage">{detail}</span></span><ArrowUpRight size={16} className="text-sage" /></button>)}</div>
    <p className="mt-6 border-t border-[var(--hairline)] pt-4 text-xs leading-5 text-sage">Demo data only. Statutory scrutiny, verification, inspection and decisions remain with human officials.</p>
  </Card></main>
}

function ProtectedShell() {
  const role = useCasePilotStore((state) => state.role)
  if (!role) return <Navigate to="/login" replace />
  return <Shell role={role} />
}

function Shell({ role }: { role: HumanRole }) {
  const [demoControlsOpen, setDemoControlsOpen] = useState(false)
  const [collapsed, toggleSidebar] = [useCasePilotStore((state) => state.sidebarCollapsed), useCasePilotStore((state) => state.toggleSidebar)]
  const demoNow = useCasePilotStore((state) => state.demoNow)
  const advance = useCasePilotStore((state) => state.advance)
  const resetClock = useCasePilotStore((state) => state.reset)
  const resetDemoData = useCasePilotStore((state) => state.resetDemoData)
  const seedScenario = useCasePilotStore((state) => state.seedScenario)
  const setRole = useCasePilotStore((state) => state.setRole)
  const unread = useCasePilotStore((state) => state.alerts.filter((alert) => !alert.read).length)
  const navigation = permittedNavigation(role)
  return <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
    <aside className="sidebar">
      <Link to="/app" className="brand mb-8 flex items-center gap-3 px-2"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-paper text-forest"><Workflow size={20} /></span><span className="brand-copy"><span className="block font-heading text-xl leading-none">CasePilot</span><span className="mt-1 block text-[10px] text-paper/60">APPROVAL WORKFLOW</span></span></Link>
      <div className="sidebar-section-title mb-2 px-3 font-mono text-[9px] uppercase tracking-[.16em] text-paper/45">Workspace</div>
      <nav className="sidebar-nav flex flex-col gap-1">{navigation.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/app'} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} title={collapsed ? label : undefined}><Icon size={18} /><span className="nav-copy">{label}</span></NavLink>)}</nav>
      <div className="mt-auto">
        <div className="sidebar-note mb-3 rounded-2xl border border-white/10 bg-white/5 p-3"><div className="flex items-center gap-2 text-xs font-semibold"><Sparkles size={14} className="text-mustard" />Demo workspace</div><p className="mt-1.5 text-[11px] leading-4 text-paper/60">Every record is clearly marked as illustrative sample data.</p></div>
        <button onClick={resetDemoData} className="nav-link w-full text-left" title="Reset demo data"><RotateCcw size={17} /><span className="nav-copy">Reset demo data</span></button>
        <button onClick={toggleSidebar} className="sidebar-toggle nav-link mt-1 w-full" title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}><Menu size={17} /><span className="nav-copy">Collapse menu</span></button>
      </div>
    </aside>
    <div className="workspace">
      <header className="topbar">
        <Link to="/app/cases" className="hidden min-w-56 items-center gap-2 rounded-xl border border-[var(--hairline)] bg-paper px-3 py-2 text-left text-xs text-sage md:flex"><Search size={15} /><span className="flex-1">Search cases, institutions…</span><span className="mono rounded-md bg-cream px-1.5 py-0.5 text-[9px]">⌘ K</span></Link>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <Link to="/app/alerts" className="relative grid h-10 w-10 place-items-center rounded-xl border border-[var(--hairline)] bg-paper text-forest" aria-label={`Alerts, ${unread} unread`}><Bell size={17} />{unread > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rust px-1 text-[9px] font-bold text-white">{unread > 99 ? '99+' : unread}</span>}</Link>
          <button onClick={() => setDemoControlsOpen(true)} aria-haspopup="dialog" aria-expanded={demoControlsOpen} className="flex items-center gap-2 rounded-xl border border-[var(--hairline)] bg-paper px-3 py-2 text-left"><Clock3 size={15} className="text-sage" /><span className="mono text-[10px] text-forest">{format(new Date(demoNow), 'dd MMM · HH:mm')}</span><span className="hidden rounded-lg bg-pale-sage px-2 py-1 text-[10px] font-semibold text-forest sm:inline">Demo controls</span></button>
          <label className="flex items-center gap-2 rounded-xl border border-[var(--hairline)] bg-paper px-2.5 py-2"><span className="hidden text-[10px] text-sage sm:inline">Viewing as</span><Select aria-label="Switch demo role" value={role} onChange={(event) => setRole(event.target.value as HumanRole)} className="!border-0 !bg-transparent !p-0 !text-xs !font-semibold !text-forest focus:!ring-0">{['Institution', 'Regional Officer', 'Bureau Officer', 'Committee', 'Authority'].map((item) => <option key={item}>{item}</option>)}</Select><ChevronDown size={12} className="text-sage" /></label>
        </div>
      </header>
      {demoControlsOpen && <div className="fixed inset-0 z-50 bg-ink/25" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDemoControlsOpen(false) }}>
        <section role="dialog" aria-modal="true" aria-labelledby="demo-controls-title" className="surface absolute right-3 top-3 max-h-[calc(100vh-24px)] w-[min(420px,calc(100vw-24px))] overflow-y-auto p-5 shadow-[0_24px_70px_rgba(35,43,38,.22)] sm:right-6 sm:top-6">
          <div className="flex items-start justify-between gap-4"><div><div className="eyebrow">DEMO WORKSPACE</div><h2 id="demo-controls-title" className="mt-1 font-heading text-2xl text-forest">Clock & scenarios</h2><p className="mt-1 text-xs text-sage">Move the injected clock to recalculate SLA, escalation and compliance alerts.</p></div><button onClick={() => setDemoControlsOpen(false)} className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--hairline)] text-sage" aria-label="Close demo controls"><X size={16} /></button></div>
          <div className="mt-5 rounded-2xl bg-cream/70 p-4"><div className="section-label">CURRENT DEMO DATE</div><div className="mono mt-1 text-sm font-semibold text-forest">{format(new Date(demoNow), 'EEEE, dd MMM yyyy · HH:mm')}</div><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{[1, 7, 30].map((days) => <Button key={days} variant="secondary" className="justify-center !px-2 !py-2 !text-xs" onClick={() => advance(days)}>+{days} day{days > 1 ? 's' : ''}</Button>)}<Button variant="quiet" className="justify-center !px-2 !py-2 !text-xs" onClick={resetClock}><RotateCcw size={13} /> Reset clock</Button></div></div>
          <div className="mt-5"><div className="section-label">SCENARIO SEEDS</div><p className="mt-1 text-xs leading-5 text-sage">Add one illustrative record and audit trail entry for a guided walkthrough.</p><div className="mt-3 space-y-2">{[
            { key: 'new-institution' as const, title: 'New institution case', detail: 'Submission, route selection and scrutiny queue', icon: Building2 },
            { key: 'lease-expiring' as const, title: 'Lease expiring in 7 days', detail: 'Document validity alert with owner and channels', icon: CalendarClock },
            { key: 'overdue-evc' as const, title: 'Overdue EVC', detail: 'Past-due verification stage and SLA alert', icon: AlertTriangle },
          ].map(({ key, title, detail, icon: Icon }) => <button key={key} onClick={() => seedScenario(key, role)} className="flex w-full items-center gap-3 rounded-xl border border-[var(--hairline)] bg-paper p-3 text-left transition hover:border-sage"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-pale-sage text-forest"><Icon size={16} /></span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-forest">{title}</span><span className="mt-1 block text-[11px] leading-4 text-sage">{detail}</span></span><ArrowUpRight size={14} className="text-sage" /></button>)}</div></div>
          <p className="mt-4 border-t border-[var(--hairline)] pt-3 text-[10px] leading-4 text-sage">Scenario seeds are demo data. They do not represent real submissions, inspections or statutory outcomes.</p>
        </section>
      </div>}
      <main className="page-content"><Routes>
        <Route path="/app" element={<DashboardPage role={role} />} />
        <Route path="/app/cases" element={<CasesPage role={role} />} />
        <Route path="/app/cases/:caseId" element={<CaseDetailPage role={role} />} />
        <Route path="/app/apply" element={<ApplicationWizardPage role={role} />} />
        <Route path="/app/compliance" element={<CompliancePage role={role} />} />
        <Route path="/app/alerts" element={<AlertsPage role={role} />} />
        <Route path="/app/audit" element={<AuditPage role={role} />} />
        <Route path="/app/rules" element={<RulesPage />} />
        <Route path="/app/debug" element={<DebugPage />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes></main>
      <footer className="app-footer">Alerts and recommendations support the approval process; they do not replace statutory scrutiny, verification, inspection or decisions by the competent authority.</footer>
    </div>
  </div>
}

function PageHeading({ section, title, children }: { section: string; title: string; children?: ReactNode }) {
  return <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><div className="eyebrow">{section}</div><h1 className="page-title">{title}</h1></div>{children}</div>
}

function CompliancePage({ role }: { role: HumanRole }) {
  const documents = useCasePilotStore((state) => state.documents)
  const undertakings = useCasePilotStore((state) => state.undertakings)
  const institutions = useCasePilotStore((state) => state.institutions)
  const demoNow = useCasePilotStore((state) => state.demoNow)
  const saveDocumentAction = useCasePilotStore((state) => state.saveDocumentAction)
  const [tab, setTab] = useState('Documents')
  const [expiryFilter, setExpiryFilter] = useState('All records')
  const canVerify = ['Regional Officer', 'Bureau Officer', 'Authority'].includes(role)
  const docsView = documents.filter((doc) => expiryFilter === 'All records' || (expiryFilter === 'Unverified' ? doc.verification !== 'Verified' : doc.kind === 'Lease deed'))
  const verify = (docId: string) => {
    const doc = documents.find((item) => item.id === docId)
    if (!doc) return
    try { const result = verifyDocument(doc, { officerName: roleNames[role], role, outcome: 'Verified' }, new Date(demoNow)); saveDocumentAction(result.document, result.auditEvent) } catch { /* role-gated control */ }
  }
  return <>
    <PageHeading section="04 / POST-APPROVAL MONITORING" title="Compliance watch"><div className="flex items-center gap-2 text-xs text-sage"><ShieldCheck size={15} />Advance alerts at 30 / 15 / 7 days</div></PageHeading>
    <Card className="overflow-hidden"><div className="px-5 pt-4"><Tabs tabs={['Documents', 'Undertakings']} active={tab} onChange={setTab} /></div>{tab === 'Documents' ? <><div className="flex flex-wrap items-center gap-2 px-5 py-3"><Select aria-label="Filter documents" value={expiryFilter} onChange={(event) => setExpiryFilter(event.target.value)}><option>All records</option><option>Lease deeds</option><option>Unverified</option></Select><span className="ml-auto text-xs text-sage">{docsView.length} document records · checked {format(new Date(demoNow), 'dd MMM yyyy')}</span></div><div className="table-wrap"><table><thead><tr><th>Document / institution</th><th>Type</th><th>Expires</th><th>Verification</th><th>Action</th></tr></thead><tbody>{docsView.map((doc) => { const institution = institutions.find((item) => item.id === doc.institutionId); const days = doc.expiresAt ? Math.ceil((new Date(doc.expiresAt).getTime() - new Date(demoNow).getTime()) / 86_400_000) : null; return <tr key={doc.id}><td><div className="font-semibold text-forest">{doc.name}</div><div className="mt-1 text-xs text-sage">{institution?.shortName} · {institution?.city}</div></td><td>{doc.kind}</td><td>{days === null ? <span className="text-sage">No expiry date</span> : <span className={`mono text-xs ${days < 0 ? 'text-rust' : days <= 30 ? 'text-[#8A641C]' : 'text-sage'}`}>{days < 0 ? `Expired ${Math.abs(days)}d ago` : `${days} days`}</span>}</td><td><span className={`status-chip ${doc.verification === 'Verified' ? 'status-on-track' : doc.verification === 'Rejected' ? 'status-overdue' : 'status-due-soon'}`}>{doc.verification}</span></td><td>{canVerify && doc.verification !== 'Verified' ? <Button variant="secondary" className="!px-2.5 !py-1.5 !text-[11px]" onClick={() => verify(doc.id)}><Check size={13} /> Verify</Button> : <span className="text-xs text-sage">{doc.verifiedBy ? `By ${doc.verifiedBy}` : 'Human review pending'}</span>}</td></tr> })}</tbody></table></div></> : <div className="table-wrap"><table><thead><tr><th>Undertaking</th><th>Institution</th><th>Due date</th><th>Status</th></tr></thead><tbody>{undertakings.map((item) => <tr key={item.id}><td><div className="font-semibold text-forest">{item.title}</div><div className="mono mt-1 text-[10px] text-sage">{item.id}</div></td><td>{institutions.find((institution) => institution.id === item.institutionId)?.shortName}</td><td className="mono text-xs">{format(new Date(item.dueAt), 'dd MMM yyyy')}</td><td><span className={`status-chip ${item.status === 'Accepted' ? 'status-closed' : item.status === 'Overdue' ? 'status-overdue' : item.status === 'Submitted' ? 'status-on-track' : 'status-due-soon'}`}>{item.status}</span></td></tr>)}</tbody></table></div>}</Card>
    <p className="mt-4 text-xs text-sage">Verification controls record the selected human officer in the audit log. Expiry monitoring only recommends follow-up.</p>
  </>
}

function AuditPage({ role }: { role: HumanRole }) {
  const alerts = useCasePilotStore((state) => state.alerts)
  const auditEvents = useCasePilotStore((state) => state.auditEvents)
  const saveAlertAction = useCasePilotStore((state) => state.saveAlertAction)
  const [tab, setTab] = useState('Alerts')
  const [type, setType] = useState('All events')
  const sortedEvents = [...auditEvents].filter((event) => type === 'All events' || event.entityType === type).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 100)
  const acknowledge = (id: string) => { const alert = alerts.find((item) => item.id === id); if (!alert) return; try { const result = acknowledgeAlert(alert, { name: roleNames[role], role }); saveAlertAction(result.alert, result.auditEvent) } catch { /* stale alert */ } }
  return <>
    <PageHeading section="05 / OVERSIGHT" title="Audit & alerts"><div className="flex items-center gap-2 text-xs text-sage"><Activity size={15} />{auditEvents.length} recorded events</div></PageHeading>
    <Card className="overflow-hidden"><div className="px-5 pt-4"><Tabs tabs={['Alerts', 'Audit log']} active={tab} onChange={setTab} /></div>{tab === 'Alerts' ? <div className="divide-y divide-[var(--hairline)]">{alerts.length ? [...alerts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((alert) => <article key={alert.id} className={`flex flex-wrap items-start gap-3 px-5 py-4 ${alert.read ? 'opacity-65' : ''}`}><span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl ${alert.severity === 'Critical' ? 'bg-[#F1C1B2] text-rust' : 'bg-[#F4E1B8] text-[#705019]'}`}><AlertTriangle size={15} /></span><div className="min-w-[220px] flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-forest">{alert.title}</h3><span className="section-label">{alert.type}</span>{!alert.read && <span className="h-1.5 w-1.5 rounded-full bg-rust" />}</div><p className="mt-1 text-xs leading-5 text-sage">{alert.message}</p><time className="mono mt-2 block text-[10px] text-sage/70">{format(new Date(alert.createdAt), 'dd MMM yyyy · HH:mm')}</time></div><div className="flex items-center gap-2">{alert.caseId && <Link to={`/app/cases/${alert.caseId}`} className="text-xs font-semibold text-sage hover:text-forest">Open case</Link>}{!alert.read && <Button variant="quiet" className="!px-2 !py-1" onClick={() => acknowledge(alert.id)}>Acknowledge</Button>}</div></article>) : <EmptyState title="No active alerts" description="SLA, escalation and compliance alerts will appear here." />}</div> : <><div className="flex items-center gap-2 px-5 py-3"><Select aria-label="Filter audit events" value={type} onChange={(event) => setType(event.target.value)}><option>All events</option><option>Case</option><option>Document</option><option>Undertaking</option><option>Rule</option></Select><span className="ml-auto text-xs text-sage">Showing latest {sortedEvents.length} events</span></div><div className="table-wrap"><table><thead><tr><th>Timestamp</th><th>Action</th><th>Actor</th><th>Record</th><th>Detail</th></tr></thead><tbody>{sortedEvents.map((event) => <tr key={event.id}><td className="mono whitespace-nowrap text-[10px]">{format(new Date(event.at), 'dd MMM · HH:mm')}</td><td className="font-semibold text-forest">{event.action}</td><td><div className="text-xs text-ink">{event.actorName}</div><div className="mt-1 text-[10px] text-sage">{event.actorRole}</div></td><td className="mono text-[10px]">{event.entityId}</td><td className="max-w-[360px] text-xs text-sage">{event.detail}</td></tr>)}</tbody></table></div></>}</Card>
  </>
}

function RulesPage() {
  const ruleVersions = useCasePilotStore((state) => state.ruleVersions)
  const cases = useCasePilotStore((state) => state.cases)
  const routeCounts = new Map<string, number>()
  for (const item of cases) routeCounts.set(item.route.ruleCode, (routeCounts.get(item.route.ruleCode) ?? 0) + 1)
  return <>
    <PageHeading section="06 / CONFIGURATION" title="Workflow rulebook"><span className="status-chip status-on-track">Human governed · v2026.1</span></PageHeading>
    <div className="two-column"><Card className="overflow-hidden"><div className="border-b border-[var(--hairline)] p-5"><div className="section-label">01 / ACTIVE ROUTES</div><h2 className="mt-1 font-heading text-xl text-forest">Application routing</h2></div><div className="divide-y divide-[var(--hairline)]">{[...new Set(cases.map((item) => item.route.ruleCode))].map((code) => { const item = cases.find((entry) => entry.route.ruleCode === code); return <div key={code} className="px-5 py-4"><div className="flex flex-wrap items-center justify-between gap-2"><span className="mono text-xs font-semibold text-forest">{code}</span><span className="text-xs text-sage">{routeCounts.get(code)} cases</span></div><p className="mt-1 text-sm font-semibold text-ink">{item?.applicationType}</p><p className="mt-1 text-xs leading-5 text-sage">{item?.route.reason}</p><div className="mt-2 flex flex-wrap gap-1.5">{item?.route.steps.map((step, index) => <span key={step} className="rounded-lg bg-cream px-2 py-1 text-[10px] text-sage">{String(index + 1).padStart(2, '0')} · {step}</span>)}</div></div> })}</div></Card>
      <div className="space-y-5"><Card className="p-5"><div className="section-label">02 / STAGE SERVICE TIMELINES</div><h2 className="mt-1 font-heading text-xl text-forest">SLA configuration</h2><div className="mt-4 space-y-3">{Object.entries({ Scrutiny: 12, EVC: 18, 'SAC/SHC': 15, 'Authority Decision': 10 }).map(([stage, days]) => <div key={stage} className="flex items-center justify-between border-b border-[var(--hairline)] pb-3 text-sm"><span className="text-ink">{stage}</span><span className="mono text-xs font-semibold text-sage">{days} calendar days</span></div>)}</div><p className="mt-4 text-xs leading-5 text-sage">Due soon begins five days before the configured stage due date. SLA flags are monitoring signals.</p></Card>
        <Card className="p-5"><div className="section-label">03 / ESCALATION LADDER</div><h2 className="mt-1 font-heading text-xl text-forest">Configurable thresholds</h2><div className="mt-4 space-y-3">{defaultEscalationRules.map((rule) => <div key={rule.stage} className="rounded-xl bg-cream/70 p-3"><p className="text-sm font-semibold text-forest">{rule.stage}</p><p className="mono mt-1 text-[10px] text-sage">RO {rule.regionalAfterDays}d → Bureau {rule.bureauAfterDays}d → Authority {rule.authorityAfterDays}d</p></div>)}</div></Card>
        <Card className="p-5"><div className="section-label">04 / RULE VERSIONS</div><h2 className="mt-1 font-heading text-xl text-forest">Change record</h2>{ruleVersions.map((item) => <div key={item.code} className="mt-3 border-t border-[var(--hairline)] pt-3"><div className="flex justify-between"><span className="font-semibold text-forest">{item.name}</span><span className="mono text-[10px] text-sage">{item.version}</span></div><p className="mt-1 text-xs text-sage">{item.rationale}</p></div>)}</Card></div>
    </div>
  </>
}

function DebugPage() {
  const cases = useCasePilotStore((state) => state.cases)
  const documents = useCasePilotStore((state) => state.documents)
  const undertakings = useCasePilotStore((state) => state.undertakings)
  const alerts = useCasePilotStore((state) => state.alerts)
  const events = useCasePilotStore((state) => state.auditEvents)
  const demoNow = useCasePilotStore((state) => state.demoNow)
  const advance = useCasePilotStore((state) => state.advance)
  const resetClock = useCasePilotStore((state) => state.reset)
  const resetData = useCasePilotStore((state) => state.resetDemoData)
  const complianceAlerts = alerts.filter((alert) => alert.type === 'Compliance' || alert.type === 'Evidence').length
  const engineStats = [
    { label: 'SLA monitor', value: `${cases.length} cases`, detail: `${cases.filter((item) => item.status === 'Overdue').length} overdue · ${cases.filter((item) => item.status === 'Due soon').length} due soon` },
    { label: 'Escalation ladder', value: `${cases.filter((item) => item.escalationLevel !== 'None').length} escalated`, detail: 'Regional Officer → Bureau Officer → Authority' },
    { label: 'Compliance engine', value: `${documents.length + undertakings.length} records`, detail: `${complianceAlerts} current compliance and evidence alerts` },
    { label: 'Audit stream', value: `${events.length} events`, detail: `${alerts.length} total alerts in the demo store` },
  ]
  const timelineItems = events.slice(0, 8).map((event) => ({
    title: event.action,
    detail: `${event.actorName} · ${event.entityId}`,
    at: format(new Date(event.at), 'dd MMM HH:mm'),
    done: event.actorRole !== 'System',
  }))
  return <>
    <PageHeading section="07 / INTERNAL DIAGNOSTICS" title="Engine console"><span className="status-chip status-neutral">Pure TypeScript rules · Demo clock</span></PageHeading>
    <Card className="mb-5 flex flex-wrap items-center justify-between gap-4 p-5"><div><div className="section-label">CLOCK INJECTION</div><div className="mono mt-1 text-sm font-semibold text-forest">{format(new Date(demoNow), 'EEEE, dd MMM yyyy · HH:mm:ss')}</div><p className="mt-1 text-xs text-sage">Advancing time re-runs SLA, escalation and compliance evaluation; resulting records persist locally.</p></div><div className="flex gap-2"><Button variant="secondary" onClick={resetClock}><RotateCcw size={14} /> Reset clock</Button><Button variant="secondary" onClick={() => advance(7)}>Advance 7 days</Button><Button onClick={() => advance(30)}><ArrowDownRight size={14} /> Advance 30 days</Button></div></Card>
    <div className="metric-grid">{engineStats.map((item, index) => <Card key={item.label} className="p-4"><div className="section-label">0{index + 1} / ENGINE</div><h2 className="mt-2 font-heading text-2xl text-forest">{item.value}</h2><p className="mt-2 text-xs leading-5 text-sage">{item.detail}</p></Card>)}</div>
    <div className="two-column mt-5">
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div><div className="section-label">LATEST EVENT OUTPUT</div><h2 className="mt-1 font-heading text-xl text-forest">Audit stream</h2></div>
          <Link to="/app/audit" className="text-xs font-semibold text-sage">Open full log →</Link>
        </div>
        <div className="mt-4"><Timeline items={timelineItems} /></div>
      </Card>
      <Card className="p-5">
        <div className="section-label">CURRENT ALERT OUTPUT</div>
        <h2 className="mt-1 font-heading text-xl text-forest">Recent alerts</h2>
        <div className="mt-4 space-y-2">
          {[...alerts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 7).map((alert) => (
            <div key={alert.id} className="rounded-xl bg-cream/70 p-3">
              <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-forest">{alert.title}</span><span className="section-label">{alert.type}</span></div>
              <p className="mt-1 text-xs leading-4 text-sage">{alert.message}</p>
            </div>
          ))}
        </div>
        <Button variant="quiet" className="mt-3 !px-0" onClick={resetData}>Reset all demo data <RotateCcw size={13} /></Button>
      </Card>
    </div>
    <p className="mono mt-5 text-[10px] text-sage/70">Seed tag: isDemoData=true · localStorage key: casepilot-demo-v1 · engine clock: injectable Date</p>
  </>
}

export default App
