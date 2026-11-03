import { Bell, CircleCheck } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { EmptyState } from '../../../components/ui/EmptyState'
import { cn } from '../../../lib/cn'

type NotificationFilter = 'all' | 'unread'

const filters: Array<{ id: NotificationFilter; label: string }> = [
  { id: 'all', label: 'Todas' },
  { id: 'unread', label: 'Não lidas' },
]

export function NotificationsPage() {
  const [filter, setFilter] = useState<NotificationFilter>('all')

  return (
    <Card
      actions={
        <Button disabled title="Disponível após a integração com a API">
          <CircleCheck aria-hidden="true" className="h-4 w-4" />
          Marcar todas como lidas
        </Button>
      }
      description="Acompanha os alertas e eventos relevantes da operação da loja."
      title="Notificações"
    >
      <div
        aria-label="Filtrar notificações"
        className="mb-5 flex items-center gap-1 rounded-xl border border-line bg-canvas p-1"
        role="group"
      >
        {filters.map((item) => (
          <button
            aria-pressed={filter === item.id}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-end/40',
              filter === item.id
                ? 'bg-white text-ink shadow-sm'
                : 'text-muted hover:text-ink',
            )}
            key={item.id}
            onClick={() => setFilter(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      <EmptyState
        description={
          filter === 'unread'
            ? 'Não existem notificações por ler neste momento.'
            : 'As notificações da loja serão apresentadas aqui quando o módulo estiver ligado à API.'
        }
        icon={Bell}
        title={
          filter === 'unread'
            ? 'Sem notificações por ler'
            : 'Ainda não existem notificações'
        }
      />
    </Card>
  )
}
