import type { ApplicationType, AuditEvent, Route, RouteCategory, RouteStep } from '@/data/schemas'
import { makeAuditEvent } from './audit'

export type RouteOverride = Partial<Record<ApplicationType, RouteStep[]>>

const defaults: Record<ApplicationType, { steps: RouteStep[]; category: RouteCategory; code: string; reason: string }> = {
  'New Institution': { steps: ['Scrutiny', 'EVC', 'SAC/SHC', 'Authority Decision'], category: 'Configurable combo', code: 'RT-NEW-01', reason: 'New institution applications require document scrutiny, a mandatory EVC, committee review and a competent authority decision.' },
  'Extension of Approval': { steps: ['Scrutiny', 'EVC', 'Authority Decision'], category: 'Scrutiny+EVC', code: 'RT-EOA-02', reason: 'Extension of Approval follows document scrutiny and EVC before the competent authority decision.' },
  'Increase in Intake': { steps: ['Scrutiny', 'EVC', 'SAC/SHC', 'Authority Decision'], category: 'Configurable combo', code: 'RT-INT-03', reason: 'Intake changes require evidence scrutiny, EVC and committee review before a decision.' },
  'Additional Course': { steps: ['EVC', 'SAC/SHC', 'Authority Decision'], category: 'EVC+SAC/SHC', code: 'RT-COURSE-04', reason: 'Additional course requests are routed through EVC and committee review before a decision.' },
  'Change in Site': { steps: ['EVC', 'Authority Decision'], category: 'Only EVC', code: 'RT-SITE-05', reason: 'A proposed site change requires on-site verification before the competent authority decision.' },
  'Second Shift': { steps: ['Scrutiny', 'Authority Decision'], category: 'Only Scrutiny', code: 'RT-SHIFT-06', reason: 'Second-shift requests use scrutiny only before the competent authority decision.' },
  'EoA with Closure': { steps: ['Scrutiny', 'Authority Decision'], category: 'Only Scrutiny', code: 'RT-CLOSE-07', reason: 'Closure requests receive document scrutiny and competent authority review.' },
  'Trust Transfer': { steps: ['Scrutiny', 'EVC', 'SAC/SHC', 'Authority Decision'], category: 'Configurable combo', code: 'RT-TRUST-08', reason: 'A trust transfer requires scrutiny, site verification and committee review.' },
}

export function resolveRoute(applicationType: ApplicationType, overrides: RouteOverride = {}, now = new Date(), entityId = 'route-resolution'): { route: Route; auditEvent: AuditEvent } {
  const configured = defaults[applicationType]
  const override = overrides[applicationType]
  const steps = override?.length ? override : configured.steps
  const route: Route = {
    steps,
    category: override?.length ? 'Configurable combo' : configured.category,
    ruleCode: override?.length ? `${configured.code}-CFG` : configured.code,
    reason: override?.length ? `Configured workflow for ${applicationType}: ${steps.join(' → ')}.` : configured.reason,
    version: '2026.1',
  }
  const auditEvent = makeAuditEvent({
    id: `route:${entityId}:${now.toISOString()}`, at: now.toISOString(), actorName: 'CasePilot workflow engine', actorRole: 'System',
    action: 'Route resolved', entityType: 'Rule', entityId: route.ruleCode, detail: `${applicationType} routed via ${route.ruleCode}: ${route.reason}`,
  })
  return { route, auditEvent }
}

export const routeDefinitions = defaults
