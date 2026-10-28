import { auditEventSchema, casePilotDatasetSchema, caseSchema, type AuditEvent, type CasePilotDataset, type CaseRecord } from '@/data/schemas'

const baseUrl = import.meta.env.VITE_CASEPILOT_API_BASE_URL?.replace(/\/$/, '')

export class DataSourceUnavailableError extends Error {
  constructor() {
    super('No approved CasePilot data service is configured. Set VITE_CASEPILOT_API_BASE_URL to connect one.')
    this.name = 'DataSourceUnavailableError'
  }
}

async function request<T>(path: string, schema: { parse: (value: unknown) => T }, init?: RequestInit): Promise<T> {
  if (!baseUrl) throw new DataSourceUnavailableError()
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: { Accept: 'application/json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
  })
  if (!response.ok) throw new Error(`CasePilot data service returned ${response.status} for ${path}.`)
  return schema.parse(await response.json())
}

const caseListSchema = { parse: (value: unknown) => casePilotDatasetSchema.pick({ cases: true }).parse({ cases: value }).cases }
const auditListSchema = { parse: (value: unknown) => auditEventSchema.array().parse(value) }
const optionalCaseSchema = { parse: (value: unknown) => value === null ? undefined : caseSchema.parse(value) }

/** REST client boundary. The configured service is the source of truth; no records are bundled here. */
export const casePilotApi = {
  isConfigured: () => Boolean(baseUrl),
  async getDataset(): Promise<CasePilotDataset> { return request('/dataset', casePilotDatasetSchema) },
  async listCases(): Promise<CaseRecord[]> { return request('/cases', caseListSchema) },
  async getCase(id: string): Promise<CaseRecord | undefined> { return request(`/cases/${encodeURIComponent(id)}`, optionalCaseSchema) },
  async updateCase(updated: CaseRecord): Promise<CaseRecord> {
    const validated = caseSchema.parse(updated)
    return request(`/cases/${encodeURIComponent(validated.id)}`, caseSchema, { method: 'PUT', body: JSON.stringify(validated) })
  },
  async listAuditEvents(): Promise<AuditEvent[]> { return request('/audit-events', auditListSchema) },
}
