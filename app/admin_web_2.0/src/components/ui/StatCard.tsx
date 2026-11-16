import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'

type StatTone = 'brand' | 'blue' | 'success' | 'warning'

interface StatCardProps {
  label: string
  value: string
  hint: string
  icon: LucideIcon
  tone?: StatTone
}

const toneStyles: Record<StatTone, { icon: string; value: string }> = {
  brand: {
    icon: 'bg-brand-50 text-brand-end',
    value: 'text-ink',
  },
  blue: {
    icon: 'bg-info-surface text-info',
    value: 'text-ink',
  },
  success: {
    icon: 'bg-success-surface text-success',
    value: 'text-ink',
  },
  warning: {
    icon: 'bg-warning-surface text-warning',
    value: 'text-ink',
  },
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'brand',
}: StatCardProps) {
  const styles = toneStyles[tone]

  return (
    <article className="rounded-2xl border border-line bg-white p-5 shadow-sm shadow-ink/5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {label}
          </p>
          <p className={cn('mt-2 text-2xl font-semibold', styles.value)}>
            {value}
          </p>
        </div>
        <span
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
            styles.icon,
          )}
        >
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 text-xs text-muted">{hint}</p>
    </article>
  )
}
