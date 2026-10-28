import type { Region } from './schemas'

const regionCodes: Record<Region, string> = {
  Northern: 'NR', Southern: 'SR', Eastern: 'ER', Western: 'WR', Central: 'CR',
  'South-Western': 'SWR', 'South-Central': 'SCR', 'North-Eastern': 'NER',
}

export function nextCaseId(region: Region, existingIds: string[]): string {
  const prefix = `CP-2026-${regionCodes[region]}-`
  const max = existingIds.filter((id) => id.startsWith(prefix)).map((id) => Number(id.slice(prefix.length))).filter(Number.isFinite).reduce((value, next) => Math.max(value, next), 4820)
  return `${prefix}${String(max + 1).padStart(5, '0')}`
}
