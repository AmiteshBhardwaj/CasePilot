import type { AuditEvent, CaseRecord, DemoDataset } from '@/data/schemas'
import { createDemoDataset } from '@/data/seed'

// REST-shaped mock boundary: swap these methods for fetch calls when a server is available.
let database: DemoDataset = createDemoDataset()

export const mockApi = {
  async getDataset(): Promise<DemoDataset> { return structuredClone(database) },
  async listCases(): Promise<CaseRecord[]> { return structuredClone(database.cases) },
  async getCase(id: string): Promise<CaseRecord | undefined> { return structuredClone(database.cases.find((item) => item.id === id)) },
  async updateCase(updated: CaseRecord): Promise<CaseRecord> {
    database = { ...database, cases: database.cases.map((item) => item.id === updated.id ? updated : item) }
    return structuredClone(updated)
  },
  async listAuditEvents(): Promise<AuditEvent[]> { return structuredClone(database.auditEvents) },
  async reset(): Promise<DemoDataset> { database = createDemoDataset(); return structuredClone(database) },
}
