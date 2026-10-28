import { lazy, Suspense, useState, type ReactNode } from 'react'
import { BrowserRouter, Link, Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Bell, BookOpen, Building2, CalendarClock, ChartNoAxesCombined, ChevronDown, ClipboardCheck, Clock3, FileText, Files, LayoutDashboard, Menu, RotateCcw, Search, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Users, Workflow, X } from 'lucide-react'
import { format } from 'date-fns'
import type { HumanRole } from '@/data/schemas'
import { useCasePilotStore } from '@/store/useCasePilotStore'
import { Button, Card, Select, Timeline } from '@/components/ui'
import { Skeleton } from '@/components/ui'
const LandingPage = lazy(() => import('@/pages/LandingPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const CasesPage = lazy(() => import('@/pages/CasesPage'))
const CaseDetailPage = lazy(() => import('@/pages/CaseDetailPage'))
const ApplicationWizardPage = lazy(() => import('@/pages/ApplicationWizardPage'))
const AlertsPage = lazy(() => import('@/pages/AlertsPage'))
const EvcPage = lazy(() => import('@/pages/EvcPage'))
const ComplianceWorkspace = lazy(() => import('@/pages/CompliancePage'))
const DocumentsPage = lazy(() => import('@/pages/DocumentsPage'))
const AuditTrailWorkspace = lazy(() => import('@/pages/AuditTrailPage'))
const RulesPage = lazy(() => import('@/pages/RulesPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const ReportsPage = lazy(() => import('@/pages/ReportsPage'))

function permittedNavigation(role: HumanRole) {
  const core = [{ to: '/app', label: 'Overview', icon: LayoutDashboard }, { to: '/app/cases', label: role === 'Institution' ? 'My cases' : 'Cases', icon: FileText }]
  if (role === 'Institution') core.push({ to: '/app/apply', label: 'New application', icon: Building2 })
  if (role === 'Institution' || role === 'Regional Officer' || role === 'Bureau Officer' || role === 'Authority') core.push({ to: '/app/compliance', label: 'Compliance', icon: ShieldCheck })
  if (role === 'Regional Officer' || role === 'Bureau Officer') core.push({ to: '/app/evc', label: 'EVC board', icon: CalendarClock })
  if (role === 'Institution' || role === 'Regional Officer' || role === 'Bureau Officer' || role === 'Authority') core.push({ to: '/app/documents', label: 'Documents', icon: Files })
  if (role === 'Bureau Officer' || role === 'Authority') core.push({ to: '/app/reports', label: 'Reports', icon: ChartNoAxesCombined })
  core.push({ to: '/app/alerts', label: 'Alerts', icon: Bell })
  if (role !== 'Institution') core.push({ to: '/app/audit', label: 'Audit trail', icon: Activity })
  if (role === 'Bureau Officer' || role === 'Authority') { core.push({ to: '/app/rules', label: 'Rulebook', icon: BookOpen }); core.push({ to: '/app/settings', label: 'Notifications', icon: Settings2 }); core.push({ to: '/app/debug', label: 'Engine console', icon: SlidersHorizontal }) }
  return core
}

function App() {
  return <BrowserRouter><Suspense fallback={<PublicLoading />}><Routes><Route path="/" element={<LandingPage />} /><Route path="/login" element={<LoginPage />} /><Route path="/app/*" element={<ProtectedShell />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></Suspense></BrowserRouter>
}

function PublicLoading() {
  return <main className="min-h-screen bg-cream p-8"><div className="mx-auto max-w-5xl space-y-5"><Skeleton className="h-12 w-48" /><Skeleton className="h-64 w-full" /><div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div></div></main>
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
      <main className="page-content"><Suspense fallback={<PageLoading />}><Routes>
        <Route path="/" element={<DashboardPage role={role} />} />
        <Route path="cases" element={<CasesPage role={role} />} />
        <Route path="cases/:caseId" element={<CaseDetailPage role={role} />} />
        <Route path="apply" element={<ApplicationWizardPage role={role} />} />
        <Route path="compliance" element={<CompliancePage role={role} />} />
        <Route path="evc" element={<EvcPage role={role} />} />
        <Route path="documents" element={<DocumentsPage role={role} />} />
        <Route path="alerts" element={<AlertsPage role={role} />} />
        <Route path="audit" element={<AuditPage role={role} />} />
        <Route path="reports" element={<ReportsPage role={role} />} />
        <Route path="rules" element={<RulesWorkspace role={role} />} />
        <Route path="settings" element={<SettingsPage role={role} />} />
        <Route path="debug" element={<DebugPage />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes></Suspense></main>
      <footer className="app-footer">Alerts and recommendations support the approval process; they do not replace statutory scrutiny, verification, inspection or decisions by the competent authority.</footer>
    </div>
  </div>
}

function PageHeading({ section, title, children }: { section: string; title: string; children?: ReactNode }) {
  return <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><div className="eyebrow">{section}</div><h1 className="page-title">{title}</h1></div>{children}</div>
}

function PageLoading() {
  return <div className="space-y-4" aria-label="Loading workspace"><Skeleton className="h-7 w-44" /><Skeleton className="h-12 w-80 max-w-full" /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div><Skeleton className="h-80 w-full" /></div>
}

function CompliancePage({ role }: { role: HumanRole }) { return <ComplianceWorkspace role={role} /> }

function AuditPage({ role }: { role: HumanRole }) { return <AuditTrailWorkspace role={role} /> }

function RulesWorkspace({ role }: { role: HumanRole }) { return <RulesPage role={role} /> }

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
