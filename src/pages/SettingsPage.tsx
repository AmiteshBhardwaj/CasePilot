import { useEffect, useMemo, useState } from 'react'
import { BellRing, Check, ShieldCheck } from 'lucide-react'
import type { AlertChannel, HumanRole, RouteStep, WorkflowRuleConfig } from '@/data/schemas'
import { alertChannelSchema } from '@/data/schemas'
import { demoActorName } from '@/data/demoActors'
import { useCasePilotStore } from '@/store/useCasePilotStore'
import { Button, Card, Input } from '@/components/ui'

export default function SettingsPage({ role }: { role: HumanRole }) {
  const active = useCasePilotStore((state) => state.activeWorkflowRules)
  const proposals = useCasePilotStore((state) => state.ruleProposals)
  const propose = useCasePilotStore((state) => state.proposeRuleVersion)
  const approve = useCasePilotStore((state) => state.approveRuleVersion)
  const [draft, setDraft] = useState<WorkflowRuleConfig>(active)
  const [rationale, setRationale] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const canEdit = role === 'Bureau Officer' || role === 'Authority'
  useEffect(() => setDraft(active), [active])
  const pending = proposals.find((item) => item.status === 'Pending approval')
  const actor = { name: demoActorName[role], role }
  const differences = useMemo(() => {
    const result: string[] = []
    if (draft.complianceAlertDays.join(',') !== active.complianceAlertDays.join(',')) result.push(`Reminder windows: ${active.complianceAlertDays.join('/')} → ${draft.complianceAlertDays.join('/')} days`)
    if (draft.complianceEscalationDays.join(',') !== active.complianceEscalationDays.join(',')) result.push(`Compliance escalation: ${active.complianceEscalationDays.join('/')} → ${draft.complianceEscalationDays.join('/')} days overdue`)
    if (draft.channels.join(',') !== active.channels.join(',')) result.push(`Delivery channels: ${active.channels.join(', ')} → ${draft.channels.join(', ') || 'none'}`)
    for (const item of draft.escalationRules) {
      const before = active.escalationRules.find((rule) => rule.stage === item.stage)
      if (before && ['regionalAfterDays', 'bureauAfterDays', 'authorityAfterDays'].some((key) => before[key as keyof typeof before] !== item[key as keyof typeof item])) result.push(`${item.stage}: RO ${item.regionalAfterDays}d / Bureau ${item.bureauAfterDays}d / Authority ${item.authorityAfterDays}d`)
    }
    return result
  }, [active, draft])

  const submit = () => {
    try {
      if (!differences.length) throw new Error('Make a notification or escalation change before proposing a version.')
      if (!draft.channels.length) throw new Error('Select at least one simulated delivery channel.')
      propose(draft, rationale, actor)
      setRationale(''); setError(''); setNotice('Notification settings are pending second approval. Active delivery settings remain in place.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Settings proposal failed.') }
  }
  const approvePending = () => {
    if (!pending) return
    try { approve(pending.id, actor); setError(''); setNotice(`Notification and escalation settings in ${pending.config.version} are active.`) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Settings approval failed.') }
  }
  const toggleChannel = (channel: AlertChannel) => setDraft((current) => ({ ...current, channels: current.channels.includes(channel) ? current.channels.filter((item) => item !== channel) : [...current.channels, channel] }))
  const editEscalation = (stage: RouteStep, key: 'regionalAfterDays' | 'bureauAfterDays' | 'authorityAfterDays', value: number) => setDraft((current) => ({ ...current, escalationRules: current.escalationRules.map((item) => item.stage === stage ? { ...item, [key]: Math.max(1, value) } : item) }))
  const editComplianceEscalation = (index: number, value: number) => setDraft((current) => ({ ...current, complianceEscalationDays: current.complianceEscalationDays.map((item, itemIndex) => itemIndex === index ? Math.max(1, value) : item) }))

  if (!canEdit) return <Card className="p-8"><div className="mx-auto max-w-lg text-center"><h1 className="font-heading text-2xl text-forest">Authorized officer workspace</h1><p className="mt-2 text-sm text-sage">Only Bureau Officer and Authority roles can access notification settings.</p></div></Card>

  return <>
    <div className="mb-6"><div className="eyebrow">12 / ALERT MANAGEMENT CONFIGURATION</div><h1 className="page-title">Notification settings</h1><p className="mt-2 text-sm text-sage">Thresholds, channels and escalation timings are versioned and require a second officer’s approval.</p></div>
    {error && <div role="alert" className="mb-3 rounded-xl bg-[#F1C1B2] px-3 py-2 text-xs text-[#482219]">{error}</div>}{notice && <div role="status" className="mb-3 rounded-xl bg-pale-sage px-3 py-2 text-xs text-forest">{notice}</div>}
    {pending && <Card className="mb-5 border-oxblood/35 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="section-label">PENDING VERSION · {pending.config.version}</div><h2 className="mt-1 font-heading text-xl text-forest">Second approval required</h2><p className="mt-2 text-xs text-sage">Proposed by {pending.proposedBy} · {pending.proposedByRole}</p><p className="mt-2 text-sm text-ink">{pending.rationale}</p><div className="mt-3 flex flex-wrap gap-2">{pending.config.channels.map((item) => <span key={item} className="status-chip status-neutral">{item}</span>)}<span className="status-chip status-due-soon">{pending.config.complianceAlertDays.join(' / ')}-day reminders</span><span className="status-chip status-escalated">Compliance escalation · {pending.config.complianceEscalationDays.join(' / ')} days</span></div></div><Button onClick={approvePending} disabled={!canEdit || role === pending.proposedByRole}><Check size={14} /> Approve and activate</Button></div>{role === pending.proposedByRole && <p className="mt-3 text-xs text-rust">Switch to the other authorized officer role to approve this version.</p>}</Card>}
    <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]"><Card className="p-5"><div className="section-label">01 / ADVANCE ALERT WINDOWS</div><h2 className="mt-1 font-heading text-xl text-forest">Document and undertaking reminders</h2><p className="mt-2 text-xs leading-5 text-sage">Reminders are emitted once per configured window and again when an item becomes overdue.</p><div className="mt-5 grid grid-cols-3 gap-3">{draft.complianceAlertDays.map((days, index) => <label key={`${index}-${days}`} className="text-xs font-semibold text-sage">Window {index + 1}<div className="mt-1 flex items-center gap-2"><Input type="number" min={1} max={365} aria-label={`Reminder window ${index + 1} days`} className="w-full mono" value={days} disabled={!canEdit || Boolean(pending)} onChange={(event) => setDraft((current) => ({ ...current, complianceAlertDays: current.complianceAlertDays.map((item, itemIndex) => itemIndex === index ? Math.max(1, Number(event.target.value)) : item) }))} /><span>days</span></div></label>)}</div><div className="mt-5 border-t border-[var(--hairline)] pt-4"><div className="section-label">SIMULATED CHANNELS</div><div className="mt-3 space-y-2">{alertChannelSchema.options.map((channel) => <label key={channel} className="flex items-center gap-2 rounded-xl bg-cream/55 px-3 py-2 text-xs text-forest"><input type="checkbox" checked={draft.channels.includes(channel)} disabled={!canEdit || Boolean(pending)} onChange={() => toggleChannel(channel)} className="accent-[var(--forest)]" />{channel}{channel === 'In-app' ? ' notifications' : ' delivery'}</label>)}</div><p className="mt-3 text-[10px] text-sage">Email and SMS are simulated in this prototype; no external messages are sent.</p></div></Card>
      <Card className="overflow-hidden"><div className="border-b border-[var(--hairline)] p-5"><div className="section-label">02 / ESCALATION TIMINGS</div><h2 className="mt-1 font-heading text-xl text-forest">Stage ageing ladder</h2><p className="mt-1 text-xs text-sage">Aged cases advance through Institution → Regional Officer → Bureau Officer → Authority.</p></div><div className="table-wrap"><table><thead><tr><th>Stage</th><th>Regional Officer</th><th>Bureau Officer</th><th>Authority</th></tr></thead><tbody>{draft.escalationRules.map((rule) => <tr key={rule.stage}><td className="font-semibold text-forest">{rule.stage}</td>{(['regionalAfterDays', 'bureauAfterDays', 'authorityAfterDays'] as const).map((key) => <td key={key}><Input aria-label={`${rule.stage} ${key} threshold`} className="!w-20 !py-1.5 mono" type="number" min={1} max={365} value={rule[key]} disabled={!canEdit || Boolean(pending)} onChange={(event) => editEscalation(rule.stage, key, Number(event.target.value))} /></td>)}</tr>)}</tbody></table></div></Card></div>
    <Card className="mt-5 p-5"><div className="section-label">03 / COMPLIANCE ESCALATION TIMINGS</div><h2 className="mt-1 font-heading text-xl text-forest">Escalate expired documents and undertakings</h2><p className="mt-2 text-xs leading-5 text-sage">Overdue records advance through Regional Officer, Bureau Officer and Authority levels. These timings are versioned with the notification settings.</p><div className="mt-4 grid max-w-xl grid-cols-3 gap-3">{['Regional Officer', 'Bureau Officer', 'Authority'].map((level, index) => <label key={level} className="text-[10px] font-semibold text-sage">{level}<div className="mt-1 flex items-center gap-1"><Input type="number" min={1} max={365} aria-label={`${level} compliance escalation days`} className="w-full mono" value={draft.complianceEscalationDays[index]} disabled={!canEdit || Boolean(pending)} onChange={(event) => editComplianceEscalation(index, Number(event.target.value))} /><span>d</span></div></label>)}</div><p className="mt-2 text-[9px] text-sage/75">Use increasing thresholds in level order.</p></Card>
    {!pending && <Card className="mt-5 p-5"><div className="section-label">04 / PROPOSE SETTINGS CHANGE</div><h2 className="mt-1 font-heading text-xl text-forest">Submit for second approval</h2>{differences.length ? <ul className="mt-3 space-y-1 rounded-xl bg-cream/65 p-3 text-xs leading-5 text-sage">{differences.map((item) => <li key={item}>• {item}</li>)}</ul> : <p className="mt-2 text-xs text-sage">No changes from active settings.</p>}<label className="mt-4 block text-xs font-semibold text-sage">Rationale<textarea className="control mt-1.5 min-h-20 w-full" value={rationale} onChange={(event) => setRationale(event.target.value)} disabled={!canEdit} placeholder="Explain the operational basis for the threshold or channel change." /></label><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="text-[10px] text-sage">Active version {active.version} · {role} · {demoActorName[role]}</p><Button onClick={submit} disabled={!canEdit || !differences.length}><BellRing size={14} /> Propose settings version</Button></div></Card>}
    <p className="mt-4 flex items-center gap-2 text-xs text-sage"><ShieldCheck size={14} />Rules are monitoring aids. Statutory duties and decisions remain with competent human officials.</p>
  </>
}
