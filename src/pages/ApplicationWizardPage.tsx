import { Link } from 'react-router-dom'
import { ArrowLeft, FileText, ShieldCheck } from 'lucide-react'
import type { HumanRole } from '@/data/schemas'
import { useCasePilotStore } from '@/store/useCasePilotStore'
import { Card } from '@/components/ui'

export default function ApplicationWizardPage({ role }: { role: HumanRole }) {
  const dataSourceStatus = useCasePilotStore((state) => state.dataSourceStatus)
  const message = dataSourceStatus === 'connected'
    ? 'The configured service currently provides read access only. An approved authenticated case creation and evidence upload endpoint is required before applications can be submitted.'
    : 'Connect an approved data service before starting an application. CasePilot will not invent an institution, officer assignment, case or evidence record.'

  return <Card className="p-6 sm:p-8">
    <div className="mx-auto max-w-2xl">
      <div className="section-label">03 / INSTITUTION SUBMISSION</div>
      <div className="mt-4 grid h-12 w-12 place-items-center rounded-2xl bg-pale-sage text-forest"><FileText size={21} /></div>
      <h1 className="mt-4 font-heading text-3xl text-forest">Application intake is not connected</h1>
      <p className="mt-3 text-sm leading-6 text-sage">{role === 'Institution' ? message : 'Only an Institution role can submit an application. Switch roles in the top bar to continue.'}</p>
      <div className="mt-5 flex items-start gap-3 rounded-2xl bg-cream/70 p-4 text-xs leading-5 text-sage"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-forest" /><p>No application or evidence files are created in this workspace. Statutory scrutiny, verification, inspection and approval remain human actions.</p></div>
      <Link to="/app" className="button button-secondary mt-5"><ArrowLeft size={14} /> Return to overview</Link>
    </div>
  </Card>
}
