import { describe, expect, it } from 'vitest'
import { resolveRoute } from './routeResolver'

describe('routeResolver', () => {
  it('resolves supported workflow shapes and returns a rule code and reason', () => {
    const scrutinyOnly = resolveRoute('Second Shift')
    const scrutinyEvc = resolveRoute('Extension of Approval')
    const evcCommittee = resolveRoute('Additional Course')
    const evcOnly = resolveRoute('Change in Site')
    expect(scrutinyOnly.route.steps).toEqual(['Scrutiny', 'Authority Decision'])
    expect(scrutinyOnly.route.category).toBe('Only Scrutiny')
    expect(scrutinyEvc.route.steps).toEqual(['Scrutiny', 'EVC', 'Authority Decision'])
    expect(scrutinyEvc.route.category).toBe('Scrutiny+EVC')
    expect(evcCommittee.route.steps).toEqual(['EVC', 'SAC/SHC', 'Authority Decision'])
    expect(evcCommittee.route.category).toBe('EVC+SAC/SHC')
    expect(evcOnly.route.steps).toEqual(['EVC', 'Authority Decision'])
    expect(evcOnly.route.category).toBe('Only EVC')
    expect(evcOnly.route.ruleCode).toMatch(/^RT-/)
    expect(evcOnly.route.reason).toContain('verification')
    expect(evcOnly.auditEvent.action).toBe('Route resolved')
  })

  it('uses configurable route combinations and identifies the configured rule', () => {
    const result = resolveRoute('Trust Transfer', { 'Trust Transfer': ['Scrutiny', 'SAC/SHC', 'Authority Decision'] })
    expect(result.route.steps).toEqual(['Scrutiny', 'SAC/SHC', 'Authority Decision'])
    expect(result.route.category).toBe('Configurable combo')
    expect(result.route.ruleCode).toContain('-CFG')
    expect(result.route.reason).toContain('Configured workflow')
  })
})
