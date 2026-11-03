import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface CardProps {
  title?: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}

export function Card({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: CardProps) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-line bg-white shadow-sm shadow-ink/5',
        className,
      )}
    >
      {(title || description || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
          <div className="min-w-0">
            {title && (
              <h2 className="text-sm font-semibold text-ink sm:text-base">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 text-xs leading-5 text-muted sm:text-sm">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn('p-5 sm:p-6', bodyClassName)}>{children}</div>
    </section>
  )
}
