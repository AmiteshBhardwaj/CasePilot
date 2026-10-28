import { describe, expect, it } from 'vitest'
import { caseSchema, committeeSchema, documentSchema, institutionSchema, officerSchema, ruleVersionSchema, undertakingSchema } from './schemas'
import { createDemoDataset } from './seed'

describe('illustrative demo dataset', () => {
  const data = createDemoDataset()

  it('contains the requested scale and geographic coverage', () => {
    expect(data.cases).toHaveLength(60)
    expect(data.institutions).toHaveLength(15)
    expect(data.officers).toHaveLength(12)
    expect(data.committees).toHaveLength(5)
    expect(data.undertakings).toHaveLength(25)
    expect(data.documents.length).toBeGreaterThanOrEqual(20)
    expect(data.auditEvents).toHaveLength(150)
    expect(new Set(data.cases.map((item) => item.region)).size).toBe(8)
  })

  it('validates every seeded contract and exposes the requested workflow edge cases', () => {
    data.cases.forEach((record) => caseSchema.parse(record))
    data.institutions.forEach((record) => institutionSchema.parse(record))
    data.officers.forEach((record) => officerSchema.parse(record))
    data.committees.forEach((record) => committeeSchema.parse(record))
    data.documents.forEach((record) => documentSchema.parse(record))
    data.undertakings.forEach((record) => undertakingSchema.parse(record))
    data.ruleVersions.forEach((record) => ruleVersionSchema.parse(record))
    expect(data.cases.find((item) => item.returnedCount === 2)?.returnedCount).toBe(2)
    expect(data.cases.find((item) => item.escalationLevel === 'Authority')).toBeDefined()
    expect(data.cases.find((item) => item.id === 'CP-2026-NER-04828')?.currentStage).toBe('EVC')
    expect(data.documents.some((item) => item.kind === 'Lease deed' && item.expiresAt && new Date(item.expiresAt) < new Date('2026-10-28T03:30:00Z'))).toBe(true)
    expect(data.documents.some((item) => item.verification === 'Pending' || item.verification === 'Needs clarification')).toBe(true)
    expect(data.ruleVersions.every((item) => item.isDemoData)).toBe(true)
  })
})
