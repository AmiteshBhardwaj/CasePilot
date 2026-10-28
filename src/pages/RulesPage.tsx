import { useEffect, useMemo, useState } from 'react'
import { Check, GitCompareArrows, ShieldCheck } from 'lucide-react'
import type { ApplicationType, HumanRole, RouteStep, WorkflowRuleConfig } from '@/data/schemas'
import { applicationTypeSchema } from '@/data/schemas'
import { useCasePilotStore } from '@/store/useCasePilotStore'
import { Button, Card, Input } from '@/components/ui'

const routeChoices: Array<{ label: string; steps: RouteStep[] }> = [
  { label: 'Only Scrutiny + Authority', steps: ['Scrutiny', 'Authority Decision'] },
  { label: 'Scrutiny + EVC + Authority', steps: ['Scrutiny', 'EVC', 'Authority Decision'] },
  { label: 'EVC + SAC/SHC + Authority', steps: ['EVC', 'SAC/SHC', 'Authority Decision'] },
  { label: 'EVC + Authority', steps: ['EVC', 'Authority Decision'] },
  { label: 'Scrutiny + EVC + SAC/SHC + Authority', steps: ['Scrutiny', 'EVC', 'SAC/SHC', 'Authority Decision'] },
]
const sameSteps = (a: RouteStep[], b: RouteStep[]) => a.length === b.length && a.every((step, index) => step === b[index])

export default function RulesPage({ role }: { role: HumanRole }) {
  const actorName = useCasePilotStore((state) => state.actorName)
  const active = useCasePilotStore((state) => state.activeWorkflowRules)
  const proposals = useCasePilotStore((state) => state.ruleProposals)
  const versions = useCasePilotStore((state) => state.ruleVersions)
  const dataSourceStatus = useCasePilotStore((state) => state.dataSourceStatus)
  const propose = useCasePilotStore((state) => state.proposeRuleVersion)
  const approve = useCasePilotStore((state) => state.approveRuleVersion)
  const [draft, setDraft] = useState<WorkflowRuleConfig>(active)
  const [rationale, setRationale] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const canEdit = role === 'Bureau Officer' || role === 'Authority'
  useEffect(() => setDraft(active), [active])
  const differences = useMemo(() => {
    const changes: string[] = []
    for (const applicationType of applicationTypeSchema.options) {
      const before = active.routeOverrides[applicationType] ?? []
      const after = draft.routeOverrides[applicationType] ?? []
      if (!sameSteps(before, after)) changes.push(`${applicationType}: ${before.join(' → ')} → ${after.join(' → ')}`)
    }
    for (const [stage, days] of Object.entries(draft.stageTimelines)) {
      const before = active.stageTimelines[stage as RouteStep]
      if (before !== days) changes.push(`${stage} service timeline: ${before} → ${days} days`)
    }
    return changes
  }, [active, draft])
  const pending = proposals.find((item) => item.status === 'Pending approval')
  const actor = { name: actorName, role }

  const updateRoute = (applicationType: ApplicationType, label: string) => {
    const choice = routeChoices.find((item) => item.label === label)
    if (choice) setDraft((current) => ({ ...current, routeOverrides: { ...current.routeOverrides, [applicationType]: choice.steps } }))
  }
  const proposeDraft = () => {
    try {
      if (!differences.length) throw new Error('Make at least one rule change before creating a proposal.')
      propose(draft, rationale, actor)
      setRationale(''); setError(''); setNotice('A new version is pending a second authorized approval. The active version remains unchanged.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Rule proposal could not be saved.') }
  }
  const approvePending = () => {
    if (!pending) return
    try { approve(pending.id, actor); setError(''); setNotice(`${pending.config.version} is active. New applications and future clock evaluations will read this version.`) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Rule proposal could not be approved.') }
  }

  if (!canEdit) return <Card className="p-8"><div className="mx-auto max-w-lg text-center"><h1 className="font-heading text-2xl text-forest">Authorized officer workspace</h1><p className="mt-2 text-sm text-sage">Only Bureau Officer and Authority roles can access workflow rules.</p></div></Card>
  if (dataSourceStatus !== 'connected') return <Card className="p-8"><div className="mx-auto max-w-lg text-center"><h1 className="font-heading text-2xl text-forest">Approved rules are not loaded</h1><p className="mt-2 text-sm leading-6 text-sage">Local engine defaults are not an authorized AICTE rule configuration. Connect a service that supplies the approved, versioned rules before reviewing or changing them.</p></div></Card>

  return <>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><div className="eyebrow">11 / GOVERNED CONFIGURATION</div><h1 className="page-title">Workflow rules</h1><p className="mt-2 text-sm text-sage">Proposed routes and timelines need a second authorized officer before they become active.</p></div><span className="status-chip status-on-track">Active · {active.version}</span></div>
    {error && <div role="alert" className="mb-3 rounded-xl bg-[#F1C1B2] px-3 py-2 text-xs text-[#482219]">{error}</div>}{notice && <div role="status" className="mb-3 rounded-xl bg-pale-sage px-3 py-2 text-xs text-forest">{notice}</div>}
    <div className="grid gap-5 xl:grid-cols-[1.3fr_.7fr]"><Card className="overflow-hidden"><div className="border-b border-[var(--hairline)] p-5"><div className="section-label">01 / APH-REFERENCED ROUTE MAPPING</div><h2 className="mt-1 font-heading text-xl text-forest">Application types and human stages</h2><p className="mt-1 text-xs leading-5 text-sage">Review the source rule, handbook clause and approval history supplied by the connected service.</p></div><div className="divide-y divide-[var(--hairline)]">{applicationTypeSchema.options.map((applicationType) => {
      const steps = draft.routeOverrides[applicationType] ?? []
      const selected = routeChoices.find((choice) => sameSteps(choice.steps, steps))?.label ?? routeChoices[0].label
      return <label key={applicationType} className="grid gap-2 px-5 py-3 sm:grid-cols-[.8fr_1.2fr] sm:items-center"><span><span className="block text-xs font-semibold text-forest">{applicationType}</span><span className="mono mt-1 block text-[9px] text-sage">{steps.join(' → ')}</span></span><select aria-label={`Route for ${applicationType}`} disabled={!canEdit || Boolean(pending)} className="control text-xs" value={selected} onChange={(event) => updateRoute(applicationType, event.target.value)}>{routeChoices.map((choice) => <option key={choice.label}>{choice.label}</option>)}</select></label>
    })}</div></Card>
      <div className="space-y-5"><Card className="p-5"><div className="section-label">02 / SERVICE TIMELINES</div><h2 className="mt-1 font-heading text-xl text-forest">Calendar-day targets</h2><div className="mt-4 space-y-3">{Object.entries(draft.stageTimelines).map(([stage, days]) => <label key={stage} className="flex items-center justify-between gap-3 border-b border-[var(--hairline)] pb-3 text-xs"><span className="font-semibold text-forest">{stage}</span><span className="flex items-center gap-2 text-sage"><Input aria-label={`${stage} timeline days`} type="number" min={1} max={180} className="!w-20 !py-1.5 text-right mono" value={days} disabled={!canEdit || Boolean(pending)} onChange={(event) => setDraft((current) => ({ ...current, stageTimelines: { ...current.stageTimelines, [stage]: Math.max(1, Number(event.target.value)) } }))} /> days</span></label>)}</div><p className="mt-3 text-[10px] leading-4 text-sage">Activation updates future route decisions and recalculates current SLA deadlines on the next engine evaluation.</p></Card>
        <Card className="p-5"><div className="section-label">03 / VERSION HISTORY</div><h2 className="mt-1 font-heading text-xl text-forest">Active rule versions</h2><div className="mt-3 space-y-3">{versions.filter((item) => item.active).map((item) => <div key={item.code} className="rounded-xl bg-pale-sage/60 p-3"><div className="flex justify-between gap-3"><strong className="text-xs text-forest">{item.name}</strong><span className="mono text-[10px] text-sage">{item.version}</span></div><p className="mt-1 text-[10px] leading-4 text-sage">Effective {new Date(item.effectiveFrom).toLocaleDateString('en-IN')} · {item.updatedBy}</p></div>)}<div className="border-t border-[var(--hairline)] pt-3"><span className="mono text-xs font-semibold text-forest">Workflow config {active.version}</span><p className="mt-1 text-[10px] text-sage">Effective {new Date(active.effectiveFrom).toLocaleDateString('en-IN')}</p></div></div></Card></div>
    </div>
    {pending && <Card className="mt-5 border-oxblood/35 p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="section-label">04 / SECOND APPROVAL REQUIRED</div><h2 className="mt-1 font-heading text-xl text-forest">Proposed version {pending.config.version}</h2><p className="mt-2 text-xs text-sage">Proposed by {pending.proposedBy} · {pending.proposedByRole} · {new Date(pending.proposedAt).toLocaleString('en-IN')}</p><p className="mt-2 max-w-3xl text-sm text-ink">{pending.rationale}</p></div><Button onClick={approvePending} disabled={!canEdit || role === pending.proposedByRole}><Check size={14} /> Approve and activate</Button></div><div className="mt-4 rounded-xl bg-cream/65 p-3"><div className="flex items-center gap-2 text-xs font-semibold text-forest"><GitCompareArrows size={14} /> Proposed configuration preview</div><div className="mt-2 space-y-1 text-xs text-sage">{pending.config.version !== active.version ? <RuleDiff current={active} next={pending.config} /> : 'No version difference found.'}</div>{role === pending.proposedByRole && <p className="mt-3 text-[10px] text-oxblood">Switch to the other authorized role to complete second approval.</p>}</div></Card>}
    {!pending && <Card className="mt-5 p-5"><div className="section-label">05 / PROPOSE A CHANGE</div><h2 className="mt-1 font-heading text-xl text-forest">Prepare the next route version</h2>{differences.length ? <div className="mt-3 rounded-xl bg-cream/65 p-3"><div className="section-label">DIFF PREVIEW · {differences.length} CHANGES</div><ul className="mt-2 space-y-1 text-xs leading-5 text-sage">{differences.map((item) => <li key={item}>• {item}</li>)}</ul></div> : <p className="mt-2 text-xs text-sage">No changes to active route or stage timeline values.</p>}<label className="mt-4 block text-xs font-semibold text-sage">Change rationale<textarea className="control mt-1.5 min-h-20 w-full" value={rationale} onChange={(event) => setRationale(event.target.value)} placeholder="Cite the governing clause or approved pilot adjustment and explain the operational reason." disabled={!canEdit} /></label><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="text-[10px] text-sage">Only Bureau Officer and Authority roles can propose or approve.</p><Button onClick={proposeDraft} disabled={!canEdit || !differences.length}><ShieldCheck size={14} /> Submit for second approval</Button></div></Card>}
    <p className="mt-4 text-xs leading-5 text-sage">Workflow automation reads the active version. A route does not perform scrutiny, inspection, evidence verification or a statutory decision.</p>
  </>
}

function RuleDiff({ current, next }: { current: WorkflowRuleConfig; next: WorkflowRuleConfig }) {
  const changes = applicationTypeSchema.options.flatMap((applicationType) => { const before = current.routeOverrides[applicationType] ?? []; const after = next.routeOverrides[applicationType] ?? []; return sameSteps(before, after) ? [] : [`${applicationType}: ${after.join(' → ')}`] })
  for (const [stage, days] of Object.entries(next.stageTimelines)) if (current.stageTimelines[stage as RouteStep] !== days) changes.push(`${stage}: ${current.stageTimelines[stage as RouteStep]} → ${days} days`)
  return changes.length ? <>{changes.map((item) => <p key={item}>{item}</p>)}</> : <>No route or timeline differences.</>
}
