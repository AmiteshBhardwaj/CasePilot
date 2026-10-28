import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MotionConfig, motion } from 'framer-motion'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Activity, ArrowDown, ArrowRight, ArrowUpRight, Bell, BookOpen, Building2, CalendarClock, Check, CircleHelp, ClipboardCheck, FileCheck2, FileClock, GitBranch, Landmark, Layers3, LockKeyhole, Menu, ShieldCheck, Workflow, X } from 'lucide-react'
import type { HumanRole } from '@/data/schemas'
import SplitText from '@/components/reactbits/SplitText'
import BlurText from '@/components/reactbits/BlurText'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
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

function StoryFragment({ kind }: { kind: string }) {
  return <div className={`story-fragment story-fragment-${kind}`}>
    <div className="fragment-topline"><span className="fragment-dot" /><span>CASEPILOT / WORKFLOW</span><span className="mono">PROCESS</span></div>
    {kind === 'submission' && <><div className="fragment-head"><span className="fragment-kicker">APPLICATION INTAKE</span><span className="fragment-tag">Source record</span></div><div className="fragment-form"><span>Institution</span><strong>Loaded from connected service</strong><span>Application type</span><strong>Provided with application</strong></div><div className="fragment-bottom"><span>Evidence</span><span className="fragment-check"><Check size={13} /> Human review</span></div></>}
    {kind === 'routing' && <><div className="fragment-head"><span className="fragment-kicker">ROUTE RESOLUTION</span><span className="mono">APPROVED RULE</span></div><div className="fragment-route"><span className="route-pip active">Scrutiny</span><span className="route-line" /><span className="route-pip active">Verification</span><span className="route-line" /><span className="route-pip">Decision</span></div><p className="fragment-callout">Route and reason come from the approved rule set.</p></>}
    {kind === 'scrutiny' && <><div className="fragment-head"><span className="fragment-kicker">HUMAN SCRUTINY</span><span className="fragment-tag">Officer action</span></div><strong className="fragment-institution">Review submitted evidence</strong><p className="fragment-callout">Forward, request clarification or return with a recorded reason.</p><div className="fragment-bottom"><span>Decision owner</span><span className="mono">Assigned official</span></div></>}
    {kind === 'evc' && <><div className="fragment-head"><span className="fragment-kicker">SITE VERIFICATION</span><span className="fragment-tag">Coordinated</span></div><div className="fragment-visit"><span className="visit-date">EVC</span><span><strong>External verification</strong><small>Schedule and report from assigned officials</small></span></div><div className="fragment-bottom"><span>Inspection record</span><span className="fragment-check"><Check size={13} /> Human outcome</span></div></>}
    {kind === 'decision' && <><div className="fragment-head"><span className="fragment-kicker">AUTHORITY DECISION</span><span className="fragment-tag">Human action</span></div><div className="locked-action"><LockKeyhole size={17} /><span><strong>Competent authority</strong><small>Decision entered by the responsible official</small></span><button aria-label="Human authority action required" disabled>Record</button></div><div className="fragment-bottom"><span>Automation role</span><span className="mono">Coordination only</span></div></>}
    {kind === 'compliance' && <><div className="fragment-head"><span className="fragment-kicker">POST-APPROVAL REGISTER</span><span className="mono">SOURCE RECORD</span></div><div className="fragment-obligation"><span className="obligation-mark">01</span><span><strong>Undertaking and evidence</strong><small>Deadlines and status from the connected record</small></span><span className="fragment-tag">Review</span></div><div className="fragment-obligation"><span className="obligation-mark">02</span><span><strong>Document validity</strong><small>Expiry date and verification from source record</small></span><span className="fragment-tag">Review</span></div></>}
  </div>
}

function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [mobileMenu, setMobileMenu] = useState(false)
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
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
          <Link className="nav-launch" to="/login">Open workspace <ArrowUpRight size={15} /></Link>
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
            <div className="hero-actions"><Magnet disabled={prefersReducedMotion} padding={38} magnetStrength={2} maxOffset={6}><Link to="/login" className="landing-button button-primary">Open role picker <ArrowRight size={16} /></Link></Magnet><button className="landing-button button-outline" onClick={scrollToLifecycle}>See how a case moves <ArrowDown size={15} /></button></div>
            <p className="hero-footnote"><span className="live-dot" /> Operational data is loaded only from an approved service</p>
          </div>
          <div className="hero-visual" aria-label="Illustration of a case record moving through approval stages">
            <div className="visual-caption"><span className="mono">CASE FLOW / 01</span><span>From submission to compliance</span></div>
            <div className="visual-stage-strip"><span>SCRUTINY</span><i /><span>EVC</span><i /><span>SAC / SHC</span><i /><span>DECISION</span><i /><span>COMPLIANCE</span></div>
            {prefersReducedMotion ? <img className="hero-static-scene" src="/images/case-flow.svg" alt="Case file records pass through scrutiny, EVC, committee, decision and compliance stages. One record is returned with a reason." /> : <Suspense fallback={<img className="hero-static-scene" src="/images/case-flow.svg" alt="Case file records pass through scrutiny, EVC, committee, decision and compliance stages. One record is returned with a reason." />}><CaseFlowScene /></Suspense>}
            <div className="hero-scroll-note"><span className="scroll-line" /> Scroll to follow a record</div>
          </div>
          <div className="hero-lower-label"><span>02 / THE WORKFLOW</span><span>WORKFLOW OVERVIEW</span></div>
        </section>

        <section className="problem-section section-wrap" aria-labelledby="problem-title">
          <div className="section-heading problem-heading"><div><div className="section-kicker">03 / OPERATIONAL SIGNALS</div><h2 id="problem-title">One record.<br className="desktop-break" /> A clear next action.</h2></div><p>Queue counts, deadlines and compliance status belong to the connected service. This public page contains no institutional records or operational metrics.</p></div>
          <div className="metrics-row">{["Case stage", "Evidence review", "EVC coordination", "Post-approval obligations"].map((label, index) => <div className="live-metric" key={label}><span className="metric-index">0{index + 1}</span><strong>Live source</strong><span className="metric-name">{label}</span><span className="metric-detail">No public record displayed</span></div>)}</div>
        </section>

        <section className="lifecycle-section" id="lifecycle" aria-labelledby="lifecycle-title">
          <div className="section-wrap lifecycle-intro"><div className="section-kicker">04 / ONE RECORD, MANY HAND-OFFS</div><div className="section-heading"><h2 id="lifecycle-title">The case keeps moving.<br /><em>The history stays with it.</em></h2><p>See each workflow step from the role responsible for the next action. The connected service supplies approved routes and stage rules.</p></div>
            <div className="route-control"><span className="section-kicker">ROUTE CONTROL</span><strong>Approved rule set</strong><p>Route decisions load from the connected service configuration.</p></div>
          </div>
          <ScrollStack className="lifecycle-stack" useWindowScroll smoothScroll={false} itemDistance={120} itemStackDistance={23} stackPosition="18%" itemScale={0.025} baseScale={0.95} dimAmount={0.1} blurAmount={0} tiltAmount={0} rotationAmount={0} holdDistance={180}>
            {lifecycle.map((step, index) => <ScrollStackItem key={step.kind} itemClassName={`story-step story-step-${step.kind}`} style={{ background: 'var(--paper)', color: 'var(--ink)', border: '1px solid rgba(79,65,48,.16)', boxShadow: '0 18px 50px rgba(69,53,35,.10)' }}>
              <div className="story-card-copy"><div className="section-kicker">{step.title}</div><h3>{step.label}</h3><p>{step.body}</p><span className="story-card-link">{index < lifecycle.length - 1 ? 'Continue through the workflow' : 'A continuous case record'} <ArrowRight size={15} /></span></div>
              <StoryFragment kind={step.kind} />
            </ScrollStackItem>)}
          </ScrollStack>
        </section>

        <section className="roles-section section-wrap" id="workspaces" aria-labelledby="roles-title">
          <div className="section-heading"><div><div className="section-kicker">05 / ROLE WORKSPACES</div><h2 id="roles-title">A clear next step<br />for every role.</h2></div><p>The role picker changes the workspace view. It is not authentication; a connected service must enforce permissions on the server.</p></div>
          <div className="roles-layout"><div className="role-list">{roles.map(({ name, icon: Icon, metric, bullets }, index) => <motion.article key={name} className={`role-card role-card-${index}`} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-10% 0px' }} transition={{ duration: 0.42, delay: index * 0.04 }}>
            <div className="role-card-top"><span className="role-icon"><Icon size={18} /></span><span className="section-kicker">0{index + 1} / {name.toUpperCase()}</span><span className="role-open"><ArrowUpRight size={15} /></span></div><h3>{metric}</h3><ul>{bullets.map((bullet) => <li key={bullet}><Check size={13} />{bullet}</li>)}</ul>
          </motion.article>)}</div><div className="role-dashboard" aria-label="Data access note"><div className="dashboard-window"><div className="dashboard-window-bar"><span className="window-dots"><i /><i /><i /></span><span>Role workspace</span><span className="window-role">DATA ACCESS</span></div><div className="dashboard-window-body"><div className="dashboard-title"><span className="section-kicker">CONNECTED SERVICE REQUIRED</span></div><h3>Operational records are not published here.</h3><p>After an approved service connects, server-authorized records appear inside the appropriate workspace.</p></div></div></div>
          </div>
        </section>

        <section className="features-section" id="features" aria-labelledby="features-title"><div className="section-wrap"><div className="section-heading"><div><div className="section-kicker">06 / WORKFLOW CAPABILITIES</div><h2 id="features-title">Small signals.<br /><em>One accountable trail.</em></h2></div><p>Rules, reminders and queue coordination bring the next action forward while accountable officials keep control of the process.</p></div><div className="feature-bento">{featureCards.map(({ n, icon: Icon, title, body }, index) => <SpotlightCard key={n} theme="light" spotlightColor="#E5AE48" intensity={0.13} borderGlow={0.34} proximity={70} flare={false} grain={0} className={`feature-card feature-card-${index}`} style={{ '--spotlight-card-surface': 'var(--paper)', '--spotlight-card-border': 'rgba(79,65,48,.17)', '--spotlight-card-shadow': '0 8px 28px rgba(69,53,35,.07)' } as React.CSSProperties}>
              <div className="feature-card-top"><span>{n} / SIGNAL</span><Icon size={18} /></div><h3>{title}</h3><p>{body}</p><span className="feature-card-rule" />
            </SpotlightCard>)}</div></div></section>

        <section className="alerts-section section-wrap" aria-labelledby="alerts-title"><div className="alerts-copy"><div className="section-kicker">07 / ATTENTION WITH CONTEXT</div><h2 id="alerts-title">An alert should say<br />what comes next.</h2><p>Alerts are generated from live stage deadlines, document validity and undertaking records returned by the connected service.</p><div className="alert-channel-row"><span>In-app</span><span>Configured email</span><span>Configured SMS</span></div><Link className="text-link" to="/login">Open the alert center <ArrowRight size={14} /></Link></div>
          <div className="alerts-board"><div className="alerts-board-head"><div><span className="section-kicker">ALERT WORKSPACE</span><h3>Live service records</h3></div></div><div className="landing-alert-empty"><Bell size={18} /><p>No operational alerts are shown on this public page.</p></div></div></section>

        <section className="human-section" aria-labelledby="human-title"><div className="human-grain" /><div className="human-content"><div className="human-lock"><LockKeyhole size={22} /></div><div className="section-kicker">08 / AUTOMATION WITH HUMAN AUTHORITY</div><h2 id="human-title"><BlurText text="The system can coordinate." animateBy="words" direction="bottom" delay={90} stepDuration={0.45} className="human-blur" /></h2><p>Only an authorized person can scrutinize evidence, verify records, conduct or record inspections, and make the competent authority’s decision.</p><div className="human-action-preview"><span><ShieldCheck size={18} /></span><span><strong>Authority decision</strong><small>Waiting for a human officer to act</small></span><button disabled aria-label="Decision action disabled until a human Authority officer acts"><LockKeyhole size={13} /> Locked</button></div><div className="human-footline"><span>Named actor</span><i /><span>Recorded reason</span><i /><span>Append-only event</span></div></div></section>

        <section className="pilot-section section-wrap" aria-labelledby="pilot-title"><div className="pilot-top"><div><div className="section-kicker">09 / A MEASURED PILOT</div><h2 id="pilot-title">Start with one Region.<br /><em>Learn from the workflow.</em></h2><p className="pilot-lede">A pilot can validate operational fit and reveal where the process needs adjustment. The measures below are questions to test, not achieved results.</p></div><div className="pilot-stamp"><span>PROPOSED</span><strong>01</strong><small>REGION<br />PILOT</small></div></div><div className="pilot-metrics">{[
          ['Case ageing', 'Are hand-offs and time in stage easier to see?'], ['Routing accuracy', 'Do configured routes reflect the approved rules?'], ['Alert timeliness', 'Do reminders reach the right owner at the right time?'], ['Overdue closure', 'Does escalation help teams resolve ageing work?'], ['Evidence verification', 'Can reviewers see what is submitted and still unverified?'],
        ].map(([title, question], index) => <div className="pilot-metric" key={title}><span className="mono">0{index + 1}</span><strong>{title}</strong><p>{question}</p></div>)}</div><span className="pilot-note"><CircleHelp size={14} /> To validate during pilot · no performance outcome is claimed</span></section>

        <section className="tech-section"><div className="section-wrap tech-layout"><div><div className="section-kicker">10 / TECH & SECURITY DIRECTION</div><h2>Prototype today.<br /><em>Built for a service boundary.</em></h2><p>The app has an empty data state and a Zod-validated REST client seam. Connect an approved service and identity provider before loading or changing operational records.</p></div><div className="tech-grid"><div className="tech-card"><span className="tech-index">IN THIS PROTOTYPE</span><div className="tech-tags"><span>React 18</span><span>TypeScript</span><span>Rule engines</span><span>Zod schemas</span><span>REST client seam</span><span>Role picker</span><span>Audit events</span><span>Empty local workspace</span></div></div><div className="tech-card tech-card-planned"><span className="tech-index">FUTURE INTEGRATION TARGETS</span><div className="tech-tags"><span>Node.js service</span><span>PostgreSQL</span><span>Identity & access</span><span>Encrypted document store</span><span>Approved email / SMS</span></div><p>Targets are architecture considerations, not implemented security controls or live integrations.</p></div></div></div></section>

        <section className="references-section section-wrap" id="references" aria-labelledby="references-title"><div className="section-heading"><div><div className="section-kicker">11 / PUBLIC REFERENCE POINTS</div><h2 id="references-title">Start from the<br />published guidance.</h2></div><p>These primary references inform the prototype’s workflow and design direction. Their inclusion does not establish compliance or legal interpretation.</p></div><div className="references-grid">{publicReferences.map((reference, index) => <a key={reference.name} className="reference-item" href={reference.href} target="_blank" rel="noreferrer"><span className="reference-number">0{index + 1}</span><span><strong>{reference.name}</strong><small>{reference.note}</small></span><ArrowUpRight size={16} /></a>)}</div></section>
      </main>

      <footer className="landing-footer"><span className="footer-kicker">12 / PROJECT FOOTER</span><div className="footer-top"><div className="footer-brand"><span className="brand-symbol"><Workflow size={18} /></span><span><strong>CasePilot</strong><small>Tracks AICTE approval cases from submission through compliance.</small></span></div><div className="footer-project"><span>TEAM</span><strong>Vague_Sense</strong><span>SMART INDIA HACKATHON 2026</span><strong>PS 26262</strong></div><Link className="footer-launch" to="/login">Open the workspace <ArrowRight size={15} /></Link></div><div className="footer-bottom"><span>Prototype only; not an official AICTE system.</span><span>No institutional records are published here.</span><span>© CasePilot · SIH 2026</span></div></footer>
    </div>
  </MotionConfig>
}

export default LandingPage
