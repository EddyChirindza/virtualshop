import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import { EmptyState } from './EmptyState'

interface DataTableColumn {
  label: string
  align?: 'left' | 'right'
}

interface DataTablePlaceholderProps {
  columns: DataTableColumn[]
  icon: LucideIcon
  title: string
  description: string
}

export function DataTablePlaceholder({
  columns,
  icon,
  title,
  description,
}: DataTablePlaceholderProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-canvas">
          <tr>
            {columns.map((column) => (
              <th
                className={cn(
                  'whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted',
                  column.align === 'right' ? 'text-right' : 'text-left',
                )}
                key={column.label}
                scope="col"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={columns.length}>
              <EmptyState
                description={description}
                icon={icon}
                title={title}
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
