import { useMemo, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table'
import { ChevronDown, ChevronRight, Info } from 'lucide-react'
import type { CaseStatus } from '@/data/schemas'

export function Button({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'quiet' }) {
  return <button className={`button button-${variant} ${className}`} {...props} />
}

export function Card({ children, className = '', ...props }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return <section className={`surface ${className}`} {...props}>{children}</section>
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'sage' | 'mustard' | 'terracotta' | 'oxblood' | 'forest' }) {
  const classes = { neutral: 'status-neutral', sage: 'status-on-track', mustard: 'status-due-soon', terracotta: 'status-overdue', oxblood: 'status-escalated', forest: 'status-closed' }
  return <span className={`status-chip ${classes[tone]}`}>{children}</span>
}

const statusClass: Record<CaseStatus, string> = { 'On track': 'status-on-track', 'Due soon': 'status-due-soon', Overdue: 'status-overdue', Escalated: 'status-escalated', Closed: 'status-closed' }
export function StatusChip({ status }: { status: CaseStatus }) {
  return <span className={`status-chip ${statusClass[status]}`}><span aria-hidden="true">{status === 'Closed' ? '✓' : status === 'Escalated' ? '!' : '•'}</span>{status}</span>
}

export function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`control ${className}`} {...props} />
}

export function Select({ className = '', children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`control ${className}`} {...props}>{children}</select>
}

export function DatePicker({ value, onChange, label }: { value?: string; onChange?: (value: string) => void; label?: string }) {
  return <label className="flex flex-col gap-1.5 text-xs font-semibold text-sage">{label}<Input type="date" value={value} onChange={(event) => onChange?.(event.target.value)} /></label>
}

export function Tooltip({ text, children }: { text: string; children: ReactNode }) {
  return <span title={text} className="inline-flex items-center gap-1">{children}<Info size={13} aria-label={text} /></span>
}

export function Dialog({ title, description, trigger, children }: { title: string; description?: string; trigger: ReactNode; children: ReactNode | ((close: () => void) => ReactNode) }) {
  const [open, setOpen] = useState(false)
  return <>
    <span onClick={() => setOpen(true)}>{trigger}</span>
    {open && <div className="fixed inset-0 z-50 grid place-items-center bg-ink/35 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false) }}>
      <div role="dialog" aria-modal="true" aria-labelledby="dialog-title" className="surface w-full max-w-lg p-6">
        <div className="mb-5 flex items-start justify-between gap-4"><div><div className="eyebrow">Workflow detail</div><h2 id="dialog-title" className="mt-1 font-heading text-2xl text-forest">{title}</h2>{description && <p className="mt-2 text-sm text-sage">{description}</p>}</div><Button variant="quiet" onClick={() => setOpen(false)} aria-label="Close dialog">×</Button></div>
        {typeof children === 'function' ? children(() => setOpen(false)) : children}
      </div>
    </div>}
  </>
}

export function Tabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (tab: string) => void }) {
  return <div role="tablist" className="flex gap-1 border-b border-[var(--hairline)]">{tabs.map((tab) => <button key={tab} role="tab" aria-selected={active === tab} onClick={() => onChange(tab)} className={`px-3 py-2.5 text-sm ${active === tab ? 'border-b-2 border-forest font-semibold text-forest' : 'text-sage'}`}>{tab}</button>)}</div>
}

export function DataTable<TData>({ data, columns, emptyMessage = 'No records to show.' }: { data: TData[]; columns: ColumnDef<TData, unknown>[]; emptyMessage?: string }) {
  const stableColumns = useMemo(() => columns, [columns])
  const table = useReactTable({ data, columns: stableColumns, getCoreRowModel: getCoreRowModel() })
  return <div className="table-wrap"><table><thead>{table.getHeaderGroups().map((group) => <tr key={group.id}>{group.headers.map((header) => <th key={header.id}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</th>)}</tr>)}</thead>
    <tbody>{table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => <tr key={row.id}>{row.getVisibleCells().map((cell) => <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>) : <tr><td colSpan={columns.length} className="py-10 text-center text-sage">{emptyMessage}</td></tr>}</tbody>
  </table></div>
}

export function Timeline({ items }: { items: Array<{ title: string; detail: string; at: string; done?: boolean }> }) {
  return <ol className="space-y-0">{items.map((item, index) => <li key={`${item.at}-${index}`} className="relative flex gap-3 pb-5 last:pb-0">
    {index < items.length - 1 && <span className="absolute left-[7px] top-4 h-full w-px bg-[var(--hairline)]" />}
    <span className={`relative z-10 mt-1 h-4 w-4 rounded-full border-2 ${item.done ? 'border-sage bg-sage' : 'border-mustard bg-paper'}`} />
    <div className="min-w-0"><p className="text-sm font-semibold text-forest">{item.title}</p><p className="mt-1 text-xs leading-5 text-sage">{item.detail}</p><time className="mono mt-1 block text-[10px] text-sage/75">{item.at}</time></div>
  </li>)}</ol>
}

export function StageTracker({ steps, current, completed = [] }: { steps: string[]; current: string; completed?: string[] }) {
  const currentIndex = steps.indexOf(current)
  return <ol className="flex min-w-[520px] items-start">{steps.map((step, index) => {
    const done = completed.includes(step) || index < currentIndex
    const active = step === current
    return <li key={step} className="relative flex flex-1 flex-col items-center text-center">
      {index > 0 && <span className={`absolute right-1/2 top-3.5 h-px w-full ${done || active ? 'bg-sage' : 'bg-[var(--hairline)]'}`} />}
      <span className={`relative grid h-7 w-7 place-items-center rounded-full border text-[11px] font-semibold ${done ? 'border-sage bg-sage text-paper' : active ? 'border-forest bg-paper text-forest' : 'border-[var(--hairline)] bg-paper text-sage'}`}>{done ? '✓' : String(index + 1).padStart(2, '0')}</span>
      <span className={`mt-2 max-w-[100px] text-xs ${active ? 'font-semibold text-forest' : 'text-sage'}`}>{step}</span>
    </li>
  })}</ol>
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="grid min-h-48 place-items-center p-8 text-center"><div className="max-w-sm"><span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-pale-sage text-forest"><ChevronRight size={18} /></span><h3 className="mt-3 font-heading text-xl text-forest">{title}</h3><p className="mt-1 text-sm text-sage">{description}</p>{action && <div className="mt-4">{action}</div>}</div></div>
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-xl bg-[#E8E1D4] ${className}`} />
}

export function Disclosure({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return <div className="border-b border-[var(--hairline)]"><button onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between py-3 text-sm font-semibold text-forest">{title}{open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button>{open && <div className="pb-4 text-sm text-sage">{children}</div>}</div>
}
