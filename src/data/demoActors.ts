import type { HumanRole } from './schemas'

export const demoActorName: Record<HumanRole, string> = {
  Institution: 'Sanjay Prasad',
  'Regional Officer': 'Ritika Anand',
  'Bureau Officer': 'Dr. A. K. Sinha',
  Committee: 'Prof. Shalini Rao',
  Authority: 'Vikram Bedi',
}

export const demoOfficerId: Partial<Record<HumanRole, string>> = {
  'Regional Officer': 'off-01',
  'Bureau Officer': 'off-05',
}
