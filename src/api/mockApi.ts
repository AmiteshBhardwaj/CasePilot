import { caseSchema, demoDatasetSchema, type AuditEvent, type CaseRecord, type DemoDataset } from '@/data/schemas'
import { createDemoDataset } from '@/data/seed'

// REST-shaped mock boundary: swap these methods for fetch calls when a server is available.
let database: DemoDataset = demoDatasetSchema.parse(createDemoDataset())

export const mockApi = {
  async getDataset(): Promise<DemoDataset> { return demoDatasetSchema.parse(structuredClone(database)) },
  async listCases(): Promise<CaseRecord[]> { return structuredClone(database.cases) },
  async getCase(id: string): Promise<CaseRecord | undefined> { return structuredClone(database.cases.find((item) => item.id === id)) },
  async updateCase(updated: CaseRecord): Promise<CaseRecord> {
    const validated = caseSchema.parse(updated)
    database = { ...database, cases: database.cases.map((item) => item.id === validated.id ? validated : item) }
    return structuredClone(validated)
  },
  async listAuditEvents(): Promise<AuditEvent[]> { return structuredClone(database.auditEvents) },
  async reset(): Promise<DemoDataset> { database = demoDatasetSchema.parse(createDemoDataset()); return structuredClone(database) },
}
