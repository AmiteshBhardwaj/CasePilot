import { z } from 'zod'

export const regionSchema = z.enum(['Northern', 'Southern', 'Eastern', 'Western', 'Central', 'South-Western', 'South-Central', 'North-Eastern'])
export const roleSchema = z.enum(['Institution', 'Regional Officer', 'Bureau Officer', 'Committee', 'Authority', 'System'])
export const humanRoleSchema = roleSchema.exclude(['System'])
export const applicationTypeSchema = z.enum(['New Institution', 'Extension of Approval', 'Increase in Intake', 'Additional Course', 'Change in Site', 'Second Shift', 'EoA with Closure', 'Trust Transfer'])
export const stageStatusSchema = z.enum(['Queued', 'In progress', 'Awaiting institution', 'Awaiting committee', 'Completed', 'Returned', 'Rejected'])
export const caseStatusSchema = z.enum(['On track', 'Due soon', 'Overdue', 'Escalated', 'Closed'])
export const routeStepSchema = z.enum(['Scrutiny', 'EVC', 'SAC/SHC', 'Authority Decision'])
export const routeCategorySchema = z.enum(['Only Scrutiny', 'Scrutiny+EVC', 'EVC+SAC/SHC', 'Only EVC', 'Configurable combo'])
export const verificationStatusSchema = z.enum(['Pending', 'Verified', 'Rejected', 'Needs clarification'])
export const alertChannelSchema = z.enum(['In-app', 'Email', 'SMS'])
export const documentKindSchema = z.enum(['Lease deed', 'Land title', 'Building plan', 'Fire safety certificate', 'Occupancy certificate', 'Structural stability certificate', 'Affidavit', 'Undertaking', 'Faculty list', 'AICTE application'])

export const institutionSchema = z.object({
  id: z.string(), name: z.string(), shortName: z.string(), region: regionSchema, state: z.string(), city: z.string(), institutionType: z.enum(['Engineering', 'Management', 'Pharmacy', 'Architecture', 'Hotel Management']),
  aicteId: z.string(), contactName: z.string(), contactEmail: z.string().email(), isDemoData: z.literal(true),
})

export const routeSchema = z.object({
  steps: z.array(routeStepSchema).min(1), category: routeCategorySchema, ruleCode: z.string(), reason: z.string(), version: z.string(),
})

export const stageSchema = z.object({
  id: z.string(), label: routeStepSchema, status: stageStatusSchema, enteredAt: z.string().datetime(), dueAt: z.string().datetime(), completedAt: z.string().datetime().optional(),
})

export const caseSchema = z.object({
  id: z.string(), institutionId: z.string(), applicationType: applicationTypeSchema, title: z.string(), region: regionSchema,
  route: routeSchema, stages: z.array(stageSchema), currentStage: routeStepSchema, status: caseStatusSchema,
  submittedAt: z.string().datetime(), updatedAt: z.string().datetime(), assignedOfficerId: z.string(), returnedCount: z.number().int().nonnegative(),
  assignedCommitteeId: z.string().optional(), evcScheduledAt: z.string().datetime().optional(),
  committeeOutcome: z.enum(['Recommended', 'Not recommended', 'Deferred']).optional(), committeeNotes: z.string().optional(),
  caseSummary: z.string().optional(), summarySavedBy: z.string().optional(), summarySavedAt: z.string().datetime().optional(),
  escalationLevel: z.enum(['None', 'Regional Officer', 'Bureau Officer', 'Authority']).default('None'), evidenceVerified: z.boolean(),
  decision: z.enum(['Approved', 'Rejected']).optional(), decidedBy: z.string().optional(), isDemoData: z.literal(true),
})

export const officerSchema = z.object({ id: z.string(), name: z.string(), role: humanRoleSchema, region: regionSchema.optional(), designation: z.string(), email: z.string().email(), isDemoData: z.literal(true) })
export const committeeSchema = z.object({ id: z.string(), name: z.string(), kind: z.enum(['SAC', 'SHC']), region: regionSchema, chair: z.string(), memberCount: z.number().int().positive(), isDemoData: z.literal(true) })
export const documentSchema = z.object({ id: z.string(), institutionId: z.string(), caseId: z.string().optional(), name: z.string(), kind: documentKindSchema, uploadedAt: z.string().datetime(), expiresAt: z.string().datetime().optional(), verification: verificationStatusSchema, verifiedBy: z.string().optional(), verifiedAt: z.string().datetime().optional(), isDemoData: z.literal(true) })
export const observationSchema = z.object({ id: z.string(), caseId: z.string(), text: z.string(), raisedBy: z.string(), raisedAt: z.string().datetime(), resolvedAt: z.string().datetime().optional(), status: z.enum(['Open', 'Responded', 'Resolved']), isDemoData: z.literal(true) })
export const undertakingSchema = z.object({ id: z.string(), institutionId: z.string(), caseId: z.string().optional(), title: z.string(), dueAt: z.string().datetime(), submittedAt: z.string().datetime().optional(), status: z.enum(['Pending', 'Submitted', 'Overdue', 'Accepted']), isDemoData: z.literal(true) })
export const documentValiditySchema = z.object({ documentId: z.string(), institutionId: z.string(), documentName: z.string(), expiresAt: z.string().datetime(), daysRemaining: z.number().int(), state: z.enum(['Valid', 'Due in 30 days', 'Due in 15 days', 'Due in 7 days', 'Expired']), verification: verificationStatusSchema })
export const alertSchema = z.object({ id: z.string(), type: z.enum(['SLA', 'Compliance', 'Escalation', 'Evidence']), severity: z.enum(['Info', 'Warning', 'Critical']), title: z.string(), message: z.string(), caseId: z.string().optional(), institutionId: z.string().optional(), ownerId: z.string().optional(), dueAt: z.string().datetime().optional(), missingEvidence: z.array(z.string()).optional(), channels: z.array(alertChannelSchema).default(['In-app']), createdAt: z.string().datetime(), read: z.boolean(), acknowledgedBy: z.string().optional(), acknowledgedAt: z.string().datetime().optional(), snoozedUntil: z.string().datetime().optional(), isDemoData: z.literal(true) })
export const escalationRuleSchema = z.object({ stage: routeStepSchema, regionalAfterDays: z.number().positive(), bureauAfterDays: z.number().positive(), authorityAfterDays: z.number().positive() })
export const auditEventSchema = z.object({ id: z.string(), at: z.string().datetime(), actorName: z.string(), actorRole: roleSchema, action: z.string(), entityType: z.enum(['Case', 'Document', 'Undertaking', 'Alert', 'Rule']), entityId: z.string(), detail: z.string(), isDemoData: z.literal(true) })
export const ruleVersionSchema = z.object({ code: z.string(), name: z.string(), version: z.string(), effectiveFrom: z.string().datetime(), updatedBy: z.string(), rationale: z.string(), active: z.boolean(), isDemoData: z.literal(true) })

export type Region = z.infer<typeof regionSchema>
export type Role = z.infer<typeof roleSchema>
export type HumanRole = z.infer<typeof humanRoleSchema>
export type ApplicationType = z.infer<typeof applicationTypeSchema>
export type StageStatus = z.infer<typeof stageStatusSchema>
export type CaseStatus = z.infer<typeof caseStatusSchema>
export type RouteStep = z.infer<typeof routeStepSchema>
export type RouteCategory = z.infer<typeof routeCategorySchema>
export type VerificationStatus = z.infer<typeof verificationStatusSchema>
export type AlertChannel = z.infer<typeof alertChannelSchema>
export type Institution = z.infer<typeof institutionSchema>
export type Route = z.infer<typeof routeSchema>
export type Stage = z.infer<typeof stageSchema>
export type CaseRecord = z.infer<typeof caseSchema>
export type Officer = z.infer<typeof officerSchema>
export type Committee = z.infer<typeof committeeSchema>
export type DocumentRecord = z.infer<typeof documentSchema>
export type Observation = z.infer<typeof observationSchema>
export type Undertaking = z.infer<typeof undertakingSchema>
export type DocumentValidity = z.infer<typeof documentValiditySchema>
export type Alert = z.infer<typeof alertSchema>
export type EscalationRule = z.infer<typeof escalationRuleSchema>
export type AuditEvent = z.infer<typeof auditEventSchema>
export type RuleVersion = z.infer<typeof ruleVersionSchema>

export type DemoDataset = {
  institutions: Institution[]; cases: CaseRecord[]; officers: Officer[]; committees: Committee[]; documents: DocumentRecord[];
  observations: Observation[]; undertakings: Undertaking[]; alerts: Alert[]; auditEvents: AuditEvent[]; ruleVersions: RuleVersion[];
}
