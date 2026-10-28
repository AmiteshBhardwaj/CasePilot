import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MotionConfig, motion } from 'framer-motion'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Activity, ArrowDown, ArrowRight, ArrowUpRight, Bell, BookOpen, Building2, CalendarClock, Check, ChevronDown, CircleHelp, ClipboardCheck, FileCheck2, FileClock, GitBranch, Landmark, Layers3, LockKeyhole, Menu, ShieldCheck, Workflow, X } from 'lucide-react'
import { format } from 'date-fns'
import { useCasePilotStore } from '@/store/useCasePilotStore'
import type { HumanRole, RouteCategory } from '@/data/schemas'
import SplitText from '@/components/reactbits/SplitText'
import BlurText from '@/components/reactbits/BlurText'
import CountUp from '@/components/reactbits/CountUp'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import AnimatedList from '@/components/reactbits/AnimatedList'
import Magnet from '@/components/reactbits/Magnet'
import ScrollStack, { ScrollStackItem } from '@/components/reactbits/ScrollStack'
import Noise from '@/components/reactbits/Noise'
import '@/design/landing.css'

const CaseFlowScene = lazy(() => import('@/pages/CaseFlowScene'))
const roles: Array<{ name: HumanRole; icon: typeof Building2; metric: string; bullets: string[] }> = [
  { name: 'Institution', icon: Building2, metric: 'Evidence and obligations', bullets: ['Submit applications and respond to returns', 'Track next steps and statutory timelines', 'Upload evidence for time-bound undertakings'] },
  { name: 'Regional Officer', icon: ClipboardCheck, metric: 'Regional scrutiny queue', bullets: ['Review records by stage and ageing', 'Return with a recorded reason', 'Coordinate EVC scheduling and follow-up'] },
  { name: 'Bureau Officer', icon: Activity, metric: 'All-Region oversight', bullets: ['Compare regional pendency and EVC status', 'Monitor SLA exceptions and escalations', 'Propose versioned rule changes'] },
  { name: 'Committee', icon: BookOpen, metric: 'Assigned agenda', bullets: ['See only cases assigned to the committee', 'Read linked evidence and observations', 'Record a named human committee outcome'] },
  { name: 'Authority', icon: Landmark, metric: 'Decision and compliance', bullets: ['Review cases awaiting competent authority', 'Record decisions explicitly under your name', 'Monitor post-approval obligations'] },
]

const featureCards = [
  { n: '01', icon: GitBranch, title: 'APH-configured routes', body: 'Application type resolves to a route with a versioned rule code and a plain-language reason.' },
  { n: '02', icon: FileClock, title: 'Stage ageing', body: 'Timelines make due-soon, overdue and escalated work visible to the responsible role.' },
  { n: '03', icon: CalendarClock, title: 'EVC coordination', body: 'Pending and scheduled verification visits stay in a shared, time-aware queue.' },
  { n: '04', icon: FileCheck2, title: 'Evidence-linked alerts', body: 'An alert names the owner, date and evidence item that needs attention.' },
  { n: '05', icon: ShieldCheck, title: 'Undertaking register', body: 'Post-approval conditions remain open until evidence is reviewed by an officer.' },
  { n: '06', icon: Layers3, title: 'Document validity', body: 'Lease deeds and prescribed documents receive 30, 15 and 7-day reminders.' },
  { n: '07', icon: ArrowUpRight, title: 'Escalation ladder', body: 'Configured thresholds move unresolved work through named responsibility levels.' },
  { n: '08', icon: Activity, title: 'Append-only audit', body: 'Submissions, returns, verifications and decisions retain actor, time and reason.' },
]

const publicReferences = [
  { name: 'AICTE Approval Process Handbook 2024–27', href: 'https://aicte-qa.aicte-india.org/sites/default/files/APH%20Final.pdf', note: 'Approval process reference' },
  { name: 'NeSDA Way Forward', href: 'https://www.darpg.gov.in/sites/default/files/NeSDA_June_2024.pdf', note: 'Digital service design reference' },
  { name: 'GIGW 3.0', href: 'https://guidelines.india.gov.in/gigw3/', note: 'Government web guidance' },
  { name: 'CERT-In secure application guidelines', href: 'https://www.cert-in.org.in/PDF/Application_Security_Guidelines.pdf', note: 'Application security reference' },
  { name: 'CERT-In government entity security', href: 'https://www.cert-in.org.in/PDF/guidelinesgovtentities.pdf', note: 'Government entity practices' },
  { name: 'Digital Personal Data Protection Act, 2023', href: 'https://www.indiacode.nic.in/indiacode/handle/123456789/22037?view_type=browse', note: 'Primary legislation' },
  { name: 'Digital Personal Data Protection Rules, 2025', href: 'https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa?pageTitle=Digital-Personal-Data-Protection-Rules-2025%3B', note: 'Rules publication' },
]

const lifecycle = [
  { title: '01 / Submission', label: 'One accountable record', body: 'A new application begins with an institution, its application type and a document checklist. The record keeps evidence, status and history together.', kind: 'submission' },
  { title: '02 / Routing', label: 'The route follows the rule', body: 'The active APH-configured rule selects the workflow. The institution sees the rule code and the reason behind the route.', kind: 'routing' },
  { title: '03 / Scrutiny', label: 'A named officer reviews', body: 'Regional scrutiny can record an observation, forward the application or return it with a mandatory reason for response.', kind: 'scrutiny' },
  { title: '04 / EVC and committee', label: 'Visits and outcomes stay explicit', body: 'When the route includes EVC or a committee stage, scheduling and outcomes are attributed to the assigned human officials.', kind: 'evc' },
  { title: '05 / Decision', label: 'Competent authority decides', body: 'The workflow can assemble a case summary, but a named Authority officer records the statutory decision.', kind: 'decision' },
  { title: '06 / Compliance', label: 'Approval carries forward', body: 'Time-bound undertakings and document validity remain visible after approval, with evidence and verification status attached.', kind: 'compliance' },
]

function useLiveMetrics() {
  const cases = useCasePilotStore((state) => state.cases)
  const undertakings = useCasePilotStore((state) => state.undertakings)
  const documents = useCasePilotStore((state) => state.documents)
  const evc = cases.filter((item) => item.currentStage === 'EVC')
  return [
    { label: 'Cases awaiting a stage', value: cases.filter((item) => item.status !== 'Closed').length, detail: 'open demo cases' },
    { label: 'EVC coordination', value: evc.filter((item) => !item.evcScheduledAt).length, detail: 'EVC cases awaiting a date' },
    { label: 'Undertakings to track', value: undertakings.filter((item) => !['Accepted'].includes(item.status)).length, detail: 'open demo obligations' },
    { label: 'Documents with expiry dates', value: documents.filter((item) => Boolean(item.expiresAt)).length, detail: 'demo validity records' },
  ]
}

function StoryFragment({ kind, route }: { kind: string; route: RouteCategory }) {
  const counts = useCasePilotStore((state) => state.cases.length)
  return <div className={`story-fragment story-fragment-${kind}`}>
    <div className="fragment-topline"><span className="fragment-dot" /><span>CASEPILOT / WORKSPACE</span><span className="mono">DEMO</span></div>
    {kind === 'submission' && <><div className="fragment-head"><span className="fragment-kicker">NEW APPLICATION</span><span className="fragment-tag">Draft</span></div><div className="fragment-form"><span>Institution</span><strong>Shri Vidya Institute of Technology</strong><span>Application type</span><strong>New Technical Institution</strong></div><div className="fragment-bottom"><span>Documents ready for review</span><span className="fragment-check"><Check size={13} /> 4 attached</span></div></>}
    {kind === 'routing' && <><div className="fragment-head"><span className="fragment-kicker">ROUTE RESOLUTION</span><span className="mono">APH-N-04</span></div><div className="fragment-route"><span className="route-pip active">Scrutiny</span><span className="route-line" />{route !== 'Only Scrutiny' && <><span className="route-pip active">EVC</span><span className="route-line" /></>}{route === 'EVC+SAC/SHC' && <><span className="route-pip active">SAC/SHC</span><span className="route-line" /></>}<span className="route-pip">Decision</span></div><p className="fragment-callout">{route} · route selected by active rule</p></>}
    {kind === 'scrutiny' && <><div className="fragment-head"><span className="fragment-kicker">REGIONAL SCRUTINY</span><span className="fragment-tag tag-return">Returned</span></div><strong className="fragment-institution">Shri Vidya Institute of Technology</strong><p className="fragment-callout">Reason recorded · Please attach the signed fire NOC and update the building plan.</p><div className="fragment-bottom"><span>Reviewing officer</span><span className="mono">A. Kulkarni</span></div></>}
    {kind === 'evc' && <><div className="fragment-head"><span className="fragment-kicker">EVC VISIT · 19 NOV</span><span className="fragment-tag">Scheduled</span></div><div className="fragment-visit"><span className="visit-date">19</span><span><strong>On-site verification</strong><small>New institution · Jaipur, Rajasthan</small></span></div><div className="fragment-bottom"><span>Committee record</span><span className="fragment-check"><Check size={13} /> Human outcome</span></div></>}
    {kind === 'decision' && <><div className="fragment-head"><span className="fragment-kicker">AUTHORITY DECISION</span><span className="fragment-tag">Awaiting action</span></div><div className="locked-action"><LockKeyhole size={17} /><span><strong>Decision action</strong><small>Requires competent Authority role</small></span><button aria-label="Decision locked" disabled>Record</button></div><div className="fragment-bottom"><span>Summary prepared</span><span className="mono">Not a decision</span></div></>}
    {kind === 'compliance' && <><div className="fragment-head"><span className="fragment-kicker">POST-APPROVAL REGISTER</span><span className="mono">{counts} CASES</span></div><div className="fragment-obligation"><span className="obligation-mark">01</span><span><strong>Install rainwater harvesting</strong><small>Evidence requested · due 21 Dec 2026</small></span><span className="fragment-tag tag-soon">Due soon</span></div><div className="fragment-obligation"><span className="obligation-mark">02</span><span><strong>Renew lease deed</strong><small>Regional verification pending</small></span><span className="fragment-tag">Review</span></div></>}
  </div>
}

function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [route, setRoute] = useState<RouteCategory>('Scrutiny+EVC')
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const metrics = useLiveMetrics()
  const cases = useCasePilotStore((state) => state.cases)
  const alerts = useCasePilotStore((state) => state.alerts)
  const demoNow = useCasePilotStore((state) => state.demoNow)
  const liveAlerts = useMemo(() => {
    const nextAlerts = alerts.slice(0, 8).map((alert) => ({
      title: alert.title,
      description: alert.message,
      meta: `${alert.ownerId ?? 'Regional Officer'} · ${alert.dueAt ? format(new Date(alert.dueAt), 'dd MMM') : format(new Date(alert.createdAt), 'dd MMM')}`,
      icon: <Bell size={15} />,
    }))
    return nextAlerts.length ? nextAlerts : [{ title: 'No active alert', description: 'Open work remains within its current timeline.', meta: 'Demo workspace · today', icon: <Check size={15} /> }]
  }, [alerts])
  const evcOpen = cases.filter((item) => item.currentStage === 'EVC')
  const openEscalations = cases.filter((item) => item.escalationLevel !== 'None' && item.status !== 'Closed').length
  const publicRoute = useMemo(() => route, [route])

  useEffect(() => {
    if (prefersReducedMotion) return undefined
    gsap.registerPlugin(ScrollTrigger)
    const lenis = new Lenis({ autoRaf: false, smoothWheel: true, syncTouch: false })
    const tick = (time: number) => lenis.raf(time * 1000)
    lenis.on('scroll', ScrollTrigger.update)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    const context = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.story-step').forEach((step, index) => {
        gsap.fromTo(step, { opacity: 0.38, x: index % 2 ? 18 : -18 }, {
          opacity: 1, x: 0, ease: 'none',
          scrollTrigger: { trigger: step, start: 'top 78%', end: 'bottom 48%', scrub: 0.5 },
        })
      })
    }, rootRef)
    return () => { context.revert(); gsap.ticker.remove(tick); lenis.destroy() }
  }, [prefersReducedMotion])

  const scrollToLifecycle = () => document.getElementById('lifecycle')?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' })

  return <MotionConfig reducedMotion="user">
    <div ref={rootRef} className="landing-root">
      <a className="landing-skip" href="#main-content">Skip to content</a>
      <header className="landing-nav">
        <Link to="/" className="landing-brand" aria-label="CasePilot home"><span className="brand-symbol"><Workflow size={20} /></span><span>CasePilot</span><span className="brand-mark">01 / SIH 2026</span></Link>
        <nav className={`landing-links ${mobileMenu ? 'is-open' : ''}`} aria-label="Main navigation">
          <a href="#lifecycle" onClick={() => setMobileMenu(false)}>How it works</a><a href="#workspaces" onClick={() => setMobileMenu(false)}>Workspaces</a><a href="#features" onClick={() => setMobileMenu(false)}>Capabilities</a><a href="#references" onClick={() => setMobileMenu(false)}>References</a>
          <Link className="nav-launch" to="/login">Launch demo <ArrowUpRight size={15} /></Link>
        </nav>
        <button className="menu-toggle" onClick={() => setMobileMenu((value) => !value)} aria-label={mobileMenu ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={mobileMenu}>{mobileMenu ? <X size={21} /> : <Menu size={21} />}</button>
      </header>

      <main id="main-content">
        <section className="landing-hero" aria-labelledby="hero-title">
          <Noise className="hero-noise" opacity={0.045} fps={8} contrast={0.25} />
          <div className="hero-grid" aria-hidden="true" />
          <div className="hero-copy">
            <div className="hero-eyebrow"><span className="hero-eyebrow-mark" /> SMART INDIA HACKATHON 2026 <span className="hero-eyebrow-divider">/</span> PS 26262</div>
            <h1 id="hero-title"><SplitText text="Every approval case. One accountable record." className="hero-title" splitType="words" effect="rise" delay={54} duration={0.9} textAlign="left" tag="span" /></h1>
            <p className="hero-subtitle">Tracks AICTE approval cases from submission through compliance.</p>
            <p className="hero-description">A shared workflow for routing, scrutiny, verification, alerts and post-approval obligations. Automation coordinates work; officials remain responsible for statutory actions.</p>
            <div className="hero-actions"><Magnet disabled={prefersReducedMotion} padding={38} magnetStrength={2} maxOffset={6}><Link to="/login" className="landing-button button-primary">Launch live demo <ArrowRight size={16} /></Link></Magnet><button className="landing-button button-outline" onClick={scrollToLifecycle}>See how a case moves <ArrowDown size={15} /></button></div>
            <p className="hero-footnote"><span className="live-dot" /> All on-screen records are illustrative demo data</p>
          </div>
          <div className="hero-visual" aria-label="Illustration of a case record moving through approval stages">
            <div className="visual-caption"><span className="mono">CASE FLOW / 01</span><span>From submission to compliance</span></div>
            <div className="visual-stage-strip"><span>SCRUTINY</span><i /><span>EVC</span><i /><span>SAC / SHC</span><i /><span>DECISION</span><i /><span>COMPLIANCE</span></div>
            {prefersReducedMotion ? <img className="hero-static-scene" src="/images/case-flow.svg" alt="Case file records pass through scrutiny, EVC, committee, decision and compliance stages. One record is returned with a reason." /> : <Suspense fallback={<img className="hero-static-scene" src="/images/case-flow.svg" alt="Case file records pass through scrutiny, EVC, committee, decision and compliance stages. One record is returned with a reason." />}><CaseFlowScene /></Suspense>}
            <div className="hero-scroll-note"><span className="scroll-line" /> Scroll to follow a record</div>
          </div>
          <div className="hero-lower-label"><span>02 / THE WORKFLOW</span><span>PROTOTYPE · DEMO DATA</span></div>
        </section>

        <section className="problem-section section-wrap" aria-labelledby="problem-title">
          <div className="section-heading problem-heading"><div><div className="section-kicker">03 / THE DAILY CHASE</div><h2 id="problem-title">Four things teams keep<br className="desktop-break" /> looking up.</h2></div><p>Counts from the current illustrative dataset. They change with the demo clock and user actions; they are not claims about AICTE workloads.</p></div>
          <div className="metrics-row">{metrics.map((item, index) => <div className="live-metric" key={item.label}><span className="metric-index">0{index + 1}</span><strong><CountUp to={item.value} duration={1.1} trigger="view" separator="," /></strong><span className="metric-name">{item.label}</span><span className="metric-detail">{item.detail}</span></div>)}</div>
        </section>

        <section className="lifecycle-section" id="lifecycle" aria-labelledby="lifecycle-title">
          <div className="section-wrap lifecycle-intro"><div className="section-kicker">04 / ONE RECORD, MANY HAND-OFFS</div><div className="section-heading"><h2 id="lifecycle-title">The case keeps moving.<br /><em>The history stays with it.</em></h2><p>See each workflow step from the role responsible for the next action. Try another route to change the stage path.</p></div>
            <div className="route-control"><span className="section-kicker">ROUTE PREVIEW</span><label htmlFor="route-select">Application route <ChevronDown size={14} /></label><select id="route-select" value={route} onChange={(event) => setRoute(event.target.value as RouteCategory)}><option>Only Scrutiny</option><option>Scrutiny+EVC</option><option>EVC+SAC/SHC</option><option>Only EVC</option><option>Configurable combo</option></select></div>
          </div>
          <ScrollStack className="lifecycle-stack" useWindowScroll smoothScroll={false} itemDistance={120} itemStackDistance={23} stackPosition="18%" itemScale={0.025} baseScale={0.95} dimAmount={0.1} blurAmount={0} tiltAmount={0} rotationAmount={0} holdDistance={180}>
            {lifecycle.map((step, index) => <ScrollStackItem key={step.kind} itemClassName={`story-step story-step-${step.kind}`} style={{ background: 'var(--paper)', color: 'var(--ink)', border: '1px solid rgba(79,65,48,.16)', boxShadow: '0 18px 50px rgba(69,53,35,.10)' }}>
              <div className="story-card-copy"><div className="section-kicker">{step.title}</div><h3>{step.label}</h3><p>{step.body}</p><span className="story-card-link">{index < lifecycle.length - 1 ? 'Continue through the workflow' : 'A continuous case record'} <ArrowRight size={15} /></span></div>
              <StoryFragment kind={step.kind} route={publicRoute} />
            </ScrollStackItem>)}
          </ScrollStack>
        </section>

        <section className="roles-section section-wrap" id="workspaces" aria-labelledby="roles-title">
          <div className="section-heading"><div><div className="section-kicker">05 / ROLE WORKSPACES</div><h2 id="roles-title">A clear next step<br />for every role.</h2></div><p>The selected role shapes the queue, visible records and permitted actions. Role switching is available in the demo shell.</p></div>
          <div className="roles-layout"><div className="role-list">{roles.map(({ name, icon: Icon, metric, bullets }, index) => <motion.article key={name} className={`role-card role-card-${index}`} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-10% 0px' }} transition={{ duration: 0.42, delay: index * 0.04 }}>
            <div className="role-card-top"><span className="role-icon"><Icon size={18} /></span><span className="section-kicker">0{index + 1} / {name.toUpperCase()}</span><span className="role-open"><ArrowUpRight size={15} /></span></div><h3>{metric}</h3><ul>{bullets.map((bullet) => <li key={bullet}><Check size={13} />{bullet}</li>)}</ul>
          </motion.article>)}</div><div className="role-dashboard" aria-label="Example Bureau Officer dashboard fragment">
            <div className="dashboard-window"><div className="dashboard-window-bar"><span className="window-dots"><i /><i /><i /></span><span>Regional operations / demo workspace</span><span className="window-role">BUREAU OFFICER</span></div><div className="dashboard-window-body"><div className="dashboard-title"><span className="section-kicker">ALL-REGION OVERVIEW</span><span className="mono">28 OCT 2026</span></div><h3>National pendency overview</h3><div className="dashboard-mini-metrics"><div><small>Open pendency</small><strong>{cases.filter((item) => item.status !== 'Closed').length}</strong><span>cases across regions</span></div><div><small>EVC queue</small><strong>{evcOpen.length}</strong><span>visit coordination</span></div><div><small>Escalated</small><strong>{openEscalations}</strong><span>needs attention</span></div></div><div className="dashboard-chart"><div className="chart-axis"><span>0</span><span>10</span><span>20</span><span>30</span></div>{['Northern', 'Southern', 'Eastern', 'Western', 'Central', 'North-Eastern'].map((region, index) => <div className="chart-row" key={region}><span>{region}</span><i style={{ '--bar-width': `${Math.max(14, Math.min(96, cases.filter((item) => item.region === region).length * 7 + index * 4))}%`, '--bar-tone': index % 3 === 1 ? 'var(--mustard)' : 'var(--sage)' } as React.CSSProperties} /><b>{cases.filter((item) => item.region === region && item.status !== 'Closed').length}</b></div>)}</div><div className="dashboard-window-foot"><span><span className="live-dot" /> Updated with demo records</span><span>View assigned work <ArrowRight size={13} /></span></div></div></div>
          </div></div>
        </section>

        <section className="features-section" id="features" aria-labelledby="features-title"><div className="section-wrap"><div className="section-heading"><div><div className="section-kicker">06 / WORKFLOW CAPABILITIES</div><h2 id="features-title">Small signals.<br /><em>One accountable trail.</em></h2></div><p>Rules, reminders and queue coordination bring the next action forward while accountable officials keep control of the process.</p></div><div className="feature-bento">{featureCards.map(({ n, icon: Icon, title, body }, index) => <SpotlightCard key={n} theme="light" spotlightColor="#E5AE48" intensity={0.13} borderGlow={0.34} proximity={70} flare={false} grain={0} className={`feature-card feature-card-${index}`} style={{ '--spotlight-card-surface': 'var(--paper)', '--spotlight-card-border': 'rgba(79,65,48,.17)', '--spotlight-card-shadow': '0 8px 28px rgba(69,53,35,.07)' } as React.CSSProperties}>
              <div className="feature-card-top"><span>{n} / SIGNAL</span><Icon size={18} /></div><h3>{title}</h3><p>{body}</p><span className="feature-card-rule" />
            </SpotlightCard>)}</div></div></section>

        <section className="alerts-section section-wrap" aria-labelledby="alerts-title"><div className="alerts-copy"><div className="section-kicker">07 / ATTENTION WITH CONTEXT</div><h2 id="alerts-title">An alert should say<br />what comes next.</h2><p>Live sample notices show an owner, a due date and the missing evidence or action. Reminder channels are simulated in this prototype.</p><div className="alert-channel-row"><span>In-app</span><span>Email simulation</span><span>SMS simulation</span></div><Link className="text-link" to="/login">Open the alert center <ArrowRight size={14} /></Link></div>
          <div className="alerts-board"><div className="alerts-board-head"><div><span className="section-kicker">CURRENT DEMO SIGNALS</span><h3>Alert stream</h3></div><span className="mono">{format(new Date(demoNow), 'dd MMM yyyy')}</span></div><AnimatedList items={liveAlerts} theme="light" animation="slide" animateOnce={false} selectOnHover={false} enableArrowNavigation={false} showGradients={false} frame={false} displayScrollbar width="100%" maxHeight={338} radius={12} gap={7} accentColor="#4A6552" className="landing-alert-list" itemClassName="landing-alert-item" style={{ '--al-ink': 'var(--ink)', '--al-accent': 'var(--sage)', '--al-frame': 'transparent', '--al-frame-shadow': 'none', '--al-tile': 'var(--cream)', '--al-tile-shadow': 'none', '--al-tile-edge': 'rgba(79,65,48,.11)', '--al-tile-highlight': 'transparent', '--al-well': 'var(--pale-sage)', '--al-ring-fill': 'rgba(220,229,217,.3)', '--al-ring': 'var(--sage)', '--al-thumb': 'var(--sage)', '--al-hover': 'brightness(.985)', '--al-press': 'brightness(.96)', '--al-active': 'brightness(.99)' } as React.CSSProperties} renderItem={(item) => typeof item === 'string' ? item : <><span className="alert-item-icon">{item.icon}</span><span className="alert-item-copy"><strong>{item.title}</strong><small>{item.description}</small></span><span className="alert-item-meta">{item.meta}</span></>} />
            <div className="escalation-ladder"><div className="section-kicker">ESCALATION LADDER</div><div className="ladder-steps"><span className="ladder-step is-current"><i>01</i> Institution</span><span className="ladder-connector" /><span className="ladder-step"><i>02</i> Regional Officer</span><span className="ladder-connector" /><span className="ladder-step"><i>03</i> Bureau Officer</span><span className="ladder-connector" /><span className="ladder-step"><i>04</i> Authority</span></div><p>{openEscalations} current escalations · thresholds are configurable in the demo rule settings.</p></div>
          </div></section>

        <section className="human-section" aria-labelledby="human-title"><div className="human-grain" /><div className="human-content"><div className="human-lock"><LockKeyhole size={22} /></div><div className="section-kicker">08 / AUTOMATION WITH HUMAN AUTHORITY</div><h2 id="human-title"><BlurText text="The system can coordinate." animateBy="words" direction="bottom" delay={90} stepDuration={0.45} className="human-blur" /></h2><p>Only an authorized person can scrutinize evidence, verify records, conduct or record inspections, and make the competent authority’s decision.</p><div className="human-action-preview"><span><ShieldCheck size={18} /></span><span><strong>Authority decision</strong><small>Waiting for a human officer to act</small></span><button disabled aria-label="Decision action disabled until a human Authority officer acts"><LockKeyhole size={13} /> Locked</button></div><div className="human-footline"><span>Named actor</span><i /><span>Recorded reason</span><i /><span>Append-only event</span></div></div></section>

        <section className="pilot-section section-wrap" aria-labelledby="pilot-title"><div className="pilot-top"><div><div className="section-kicker">09 / A MEASURED PILOT</div><h2 id="pilot-title">Start with one Region.<br /><em>Learn from the workflow.</em></h2><p className="pilot-lede">A pilot can validate operational fit and reveal where the process needs adjustment. The measures below are questions to test, not achieved results.</p></div><div className="pilot-stamp"><span>PROPOSED</span><strong>01</strong><small>REGION<br />PILOT</small></div></div><div className="pilot-metrics">{[
          ['Case ageing', 'Are hand-offs and time in stage easier to see?'], ['Routing accuracy', 'Do configured routes reflect the approved rules?'], ['Alert timeliness', 'Do reminders reach the right owner at the right time?'], ['Overdue closure', 'Does escalation help teams resolve ageing work?'], ['Evidence verification', 'Can reviewers see what is submitted and still unverified?'],
        ].map(([title, question], index) => <div className="pilot-metric" key={title}><span className="mono">0{index + 1}</span><strong>{title}</strong><p>{question}</p></div>)}</div><span className="pilot-note"><CircleHelp size={14} /> To validate during pilot · no performance outcome is claimed</span></section>

        <section className="tech-section"><div className="section-wrap tech-layout"><div><div className="section-kicker">10 / TECH & SECURITY DIRECTION</div><h2>Prototype today.<br /><em>Built for a service boundary.</em></h2><p>The current app uses a typed mock API, local demo data and role-aware interface. A production deployment needs an approved service, identity, storage and notification design.</p></div><div className="tech-grid"><div className="tech-card"><span className="tech-index">IN THIS PROTOTYPE</span><div className="tech-tags"><span>React 18</span><span>TypeScript</span><span>Rule engines</span><span>Zod schemas</span><span>REST-shaped mock</span><span>Role picker</span><span>Audit events</span><span>Local demo store</span></div></div><div className="tech-card tech-card-planned"><span className="tech-index">FUTURE INTEGRATION TARGETS</span><div className="tech-tags"><span>Node.js service</span><span>PostgreSQL</span><span>Identity & access</span><span>Encrypted document store</span><span>Approved email / SMS</span></div><p>Targets are architecture considerations, not implemented security controls or live integrations.</p></div></div></div></section>

        <section className="references-section section-wrap" id="references" aria-labelledby="references-title"><div className="section-heading"><div><div className="section-kicker">11 / PUBLIC REFERENCE POINTS</div><h2 id="references-title">Start from the<br />published guidance.</h2></div><p>These primary references inform the prototype’s workflow and design direction. Their inclusion does not establish compliance or legal interpretation.</p></div><div className="references-grid">{publicReferences.map((reference, index) => <a key={reference.name} className="reference-item" href={reference.href} target="_blank" rel="noreferrer"><span className="reference-number">0{index + 1}</span><span><strong>{reference.name}</strong><small>{reference.note}</small></span><ArrowUpRight size={16} /></a>)}</div></section>
      </main>

      <footer className="landing-footer"><span className="footer-kicker">12 / PROJECT FOOTER</span><div className="footer-top"><div className="footer-brand"><span className="brand-symbol"><Workflow size={18} /></span><span><strong>CasePilot</strong><small>Tracks AICTE approval cases from submission through compliance.</small></span></div><div className="footer-project"><span>TEAM</span><strong>Vague_Sense</strong><span>SMART INDIA HACKATHON 2026</span><strong>PS 26262</strong></div><Link className="footer-launch" to="/login">Launch the demo <ArrowRight size={15} /></Link></div><div className="footer-bottom"><span>Prototype with demo data, not an official AICTE system.</span><span>All case details shown are illustrative.</span><span>© CasePilot · SIH 2026</span></div></footer>
    </div>
  </MotionConfig>
}

export default LandingPage
