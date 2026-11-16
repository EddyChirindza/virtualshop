import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'

export interface BreadcrumbItem {
  label: string
  to?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li className="flex items-center gap-1.5" key={item.label}>
              {index > 0 && (
                <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
              )}
              {item.to && !isLast ? (
                <Link
                  className="rounded transition-colors hover:text-brand-end focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-end/40"
                  to={item.to}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={cn(isLast && 'font-medium text-ink/70')}
                >
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
