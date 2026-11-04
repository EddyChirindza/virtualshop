import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, CircleAlert, LoaderCircle, Plus, Send, Trash2, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { EmptyState } from '../../../components/ui/EmptyState'
import { getApiErrorMessage } from '../../../lib/api/errors'
import { adminApi, type NotificationFields } from '../../admin/adminApi'

type NotificationFilter = 'all' | 'draft' | 'published' | 'archived'

const emptyForm: NotificationFields = {
  title: '',
  message: '',
  type: 'general',
  recipient_scope: 'all_customers',
  status: 'draft',
}

export function NotificationsPage() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<NotificationFilter>('all')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<NotificationFields>(emptyForm)
  const [recipientId, setRecipientId] = useState('')

  const notifications = useQuery({
    queryKey: ['admin', 'notifications', page],
    queryFn: () => adminApi.listNotifications({ page, limit: 30 }),
  })
  const customers = useQuery({
    queryKey: ['admin', 'customers'],
    queryFn: adminApi.listCustomers,
    enabled: formOpen && form.recipient_scope === 'user',
  })
  const createNotification = useMutation({
    mutationFn: adminApi.createNotification,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'notifications'] })
      setFormOpen(false)
      setForm(emptyForm)
      setRecipientId('')
    },
  })
  const archiveNotification = useMutation({
    mutationFn: adminApi.archiveNotification,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['admin', 'notifications'] }),
  })

  const items = (notifications.data?.items ?? []).filter((item) =>
    filter === 'all' ? true : item.status === filter,
  )

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const payload: NotificationFields = {
      ...form,
      ...(form.recipient_scope === 'user' && recipientId
        ? { recipient_user_id: Number(recipientId) }
        : {}),
    }
    await createNotification.mutateAsync(payload).catch(() => undefined)
  }

  async function archive(id: number) {
    if (!window.confirm('Arquivar esta notificação?')) return
    await archiveNotification.mutateAsync(id).catch(() => undefined)
  }

  return (
    <>
      <Card
        actions={
          <Button
            onClick={() => {
              createNotification.reset()
              setForm(emptyForm)
              setRecipientId('')
              setFormOpen(true)
            }}
            variant="primary"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Nova notificação
          </Button>
        }
        description="Consulta e cria notificações enviadas aos clientes."
        title="Notificações"
      >
        <div aria-label="Filtrar notificações" className="mb-5 flex flex-wrap items-center gap-1 rounded-xl border border-line bg-canvas p-1" role="group">
          {([
            ['all', 'Todas'],
            ['published', 'Publicadas'],
            ['draft', 'Rascunhos'],
            ['archived', 'Arquivadas'],
          ] as const).map(([id, label]) => (
            <button
              aria-pressed={filter === id}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-end/40 ${filter === id ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
              key={id}
              onClick={() => {
                setFilter(id)
                setPage(1)
              }}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        {(notifications.isError || archiveNotification.isError) && (
          <p className="mb-4 flex items-center gap-2 rounded-xl bg-danger-surface px-3.5 py-3 text-sm text-danger" role="alert">
            <CircleAlert aria-hidden="true" className="h-4 w-4 shrink-0" />
            {getApiErrorMessage(notifications.error ?? archiveNotification.error)}
          </p>
        )}
        {notifications.isLoading ? (
          <p className="py-12 text-center text-sm text-muted">A carregar notificações...</p>
        ) : items.length ? (
          <ul className="divide-y divide-line">
            {items.map((item) => (
              <li className="flex flex-wrap items-start justify-between gap-4 py-4" key={item.id}>
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-end">
                    <Bell aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
                      <span className="rounded-full bg-canvas px-2 py-0.5 text-[10px] font-medium text-muted">{notificationStatus(item.status)}</span>
                      <span className="rounded-full bg-canvas px-2 py-0.5 text-[10px] font-medium text-muted">{notificationType(item.type)}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted">{item.message}</p>
                    <p className="mt-2 text-xs text-muted">
                      {item.recipient_scope === 'all_customers' ? 'Todos os clientes' : `Cliente #${item.recipient_user_id}`}
                      {' · '}
                      {new Date(item.created_at).toLocaleString('pt-MZ')}
                    </p>
                  </div>
                </div>
                {item.status !== 'archived' && (
                  <Button aria-label={`Arquivar ${item.title}`} disabled={archiveNotification.isPending} onClick={() => void archive(item.id)} size="sm" variant="ghost">
                    <Trash2 aria-hidden="true" className="h-4 w-4 text-muted" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            description={filter === 'all' ? 'Ainda não existem notificações registadas.' : `Não existem notificações ${notificationStatus(filter).toLowerCase()}.`}
            icon={Bell}
            title="Sem notificações"
          />
        )}
        {notifications.data && notifications.data.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4 text-xs text-muted">
            <span>{notifications.data.total} notificação(ões)</span>
            <div className="flex items-center gap-2">
              <Button disabled={page <= 1} onClick={() => setPage((current) => current - 1)} size="sm">Anterior</Button>
              <span>Página {notifications.data.page} de {notifications.data.totalPages}</span>
              <Button disabled={page >= notifications.data.totalPages} onClick={() => setPage((current) => current + 1)} size="sm">Seguinte</Button>
            </div>
          </div>
        )}
        <p className="mt-4 rounded-xl bg-canvas px-3.5 py-3 text-xs leading-5 text-muted">
          A API administrativa não disponibiliza estado de leitura nem contagem de notificações não lidas. A marcação como lida existente é exclusiva de contas de cliente e não é usada neste painel.
        </p>
      </Card>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/40 p-4" role="presentation">
          <section aria-labelledby="notification-form-title" aria-modal="true" className="my-auto w-full max-w-xl rounded-2xl bg-white shadow-xl" role="dialog">
            <header className="flex items-start justify-between border-b border-line px-5 py-4">
              <div>
                <h2 className="font-semibold text-ink" id="notification-form-title">Nova notificação</h2>
                <p className="mt-1 text-xs text-muted">Podes guardar como rascunho ou publicar para os clientes.</p>
              </div>
              <Button aria-label="Fechar" onClick={() => setFormOpen(false)} size="sm" variant="ghost"><X aria-hidden="true" className="h-4 w-4" /></Button>
            </header>
            <form className="space-y-4 p-5" onSubmit={(event) => void submit(event)}>
              <label className="block text-xs font-semibold text-ink">
                Título
                <input className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-sm font-normal" maxLength={100} onChange={(event) => setForm({ ...form, title: event.target.value })} required value={form.title} />
              </label>
              <label className="block text-xs font-semibold text-ink">
                Mensagem
                <textarea className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-sm font-normal" maxLength={500} onChange={(event) => setForm({ ...form, message: event.target.value })} required rows={4} value={form.message} />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-ink">
                  Tipo
                  <select className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-normal" onChange={(event) => setForm({ ...form, type: event.target.value as NotificationFields['type'] })} value={form.type}>
                    <option value="general">Geral</option>
                    <option value="promotion">Promoção</option>
                    <option value="discount">Desconto</option>
                    <option value="new_product">Novo produto</option>
                    <option value="product_alert">Alerta de produto</option>
                  </select>
                </label>
                <label className="block text-xs font-semibold text-ink">
                  Destinatários
                  <select className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-normal" onChange={(event) => setForm({ ...form, recipient_scope: event.target.value as NotificationFields['recipient_scope'] })} value={form.recipient_scope}>
                    <option value="all_customers">Todos os clientes</option>
                    <option value="user">Um cliente</option>
                  </select>
                </label>
              </div>
              {form.recipient_scope === 'user' && (
                <label className="block text-xs font-semibold text-ink">
                  Cliente
                  <select className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-normal" onChange={(event) => setRecipientId(event.target.value)} required value={recipientId}>
                    <option value="">Selecciona um cliente</option>
                    {customers.data?.map((customer) => <option key={customer.id} value={customer.id}>{customer.fullName} · {customer.phone}</option>)}
                  </select>
                </label>
              )}
              <label className="block text-xs font-semibold text-ink">
                Publicação
                <select className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-normal" onChange={(event) => setForm({ ...form, status: event.target.value as NotificationFields['status'] })} value={form.status}>
                  <option value="draft">Guardar como rascunho</option>
                  <option value="published">Publicar agora</option>
                </select>
              </label>
              {(createNotification.isError || customers.isError) && (
                <p className="flex items-center gap-2 rounded-lg bg-danger-surface px-3 py-2.5 text-sm text-danger" role="alert">
                  <CircleAlert aria-hidden="true" className="h-4 w-4" />
                  {getApiErrorMessage(createNotification.error ?? customers.error)}
                </p>
              )}
              <footer className="flex justify-end gap-2 border-t border-line pt-4">
                <Button onClick={() => setFormOpen(false)}>Cancelar</Button>
                <Button disabled={createNotification.isPending || (form.recipient_scope === 'user' && customers.isLoading)} type="submit" variant="primary">
                  {createNotification.isPending ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Send aria-hidden="true" className="h-4 w-4" />}
                  {createNotification.isPending ? 'A guardar...' : 'Guardar'}
                </Button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </>
  )
}

function notificationStatus(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Rascunho',
    published: 'Publicada',
    archived: 'Arquivada',
  }
  return labels[status] ?? status
}

function notificationType(type: string): string {
  const labels: Record<string, string> = {
    general: 'Geral',
    promotion: 'Promoção',
    discount: 'Desconto',
    new_product: 'Novo produto',
    product_alert: 'Alerta de produto',
    order_update: 'Actualização de encomenda',
  }
  return labels[type] ?? type
}
