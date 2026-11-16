import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CircleAlert, Eye, LoaderCircle, Search, ShoppingCart, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { EmptyState } from '../../../components/ui/EmptyState'
import { getApiErrorMessage } from '../../../lib/api/errors'
import { adminApi, type AdminOrder } from '../../admin/adminApi'

const statuses = [
  'pending',
  'accepted',
  'rejected',
  'preparing',
  'ready_for_pickup',
  'out_for_delivery',
  'completed',
  'cancelled',
]

export function OrdersPage() {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const dateRangeError = from && to && from > to
  const hasFilters = Boolean(search || status || from || to)
  const orders = useQuery({
    queryKey: ['admin', 'orders', { status, search, from, to, page }],
    queryFn: () =>
      adminApi.listOrders({
        status: status || undefined,
        search: search || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        limit: 50,
      }),
    enabled: !dateRangeError,
  })
  const detail = useQuery({
    queryKey: ['admin', 'order', selectedId],
    queryFn: () => adminApi.getOrder(selectedId!),
    enabled: selectedId !== null,
  })
  const refreshOrders = async (order: AdminOrder) => {
    queryClient.setQueryData(['admin', 'order', order.id], order)
    await queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
  }
  const acceptOrder = useMutation({
    mutationFn: adminApi.acceptOrder,
    onSuccess: refreshOrders,
  })
  const rejectOrder = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      adminApi.rejectOrder(id, reason),
    onSuccess: refreshOrders,
  })
  const changeStatus = useMutation({
    mutationFn: ({ id, nextStatus }: { id: number; nextStatus: string }) =>
      adminApi.updateOrderStatus(id, nextStatus),
    onSuccess: refreshOrders,
  })

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPage(1)
    setSearch(searchInput.trim())
  }

  async function handleReject(order: AdminOrder) {
    const reason = window.prompt('Indica o motivo da rejeição (mínimo 3 caracteres):')
    if (reason === null) return
    await rejectOrder.mutateAsync({ id: order.id, reason }).catch(() => undefined)
  }

  async function handleStatusChange(order: AdminOrder, nextStatus: string) {
    await changeStatus.mutateAsync({ id: order.id, nextStatus }).catch(() => undefined)
  }

  const mutationError =
    acceptOrder.error ?? rejectOrder.error ?? changeStatus.error
  const currency = new Intl.NumberFormat('pt-MZ', {
    style: 'currency',
    currency: 'MZN',
    maximumFractionDigits: 2,
  })

  return (
    <>
      <Card
        description="Acompanha o estado, o valor e o cliente de cada encomenda."
        title="Todas as encomendas"
      >
        <div className="mb-5 flex flex-wrap items-end gap-3">
          <form className="relative min-w-56 flex-1" onSubmit={submitSearch} role="search">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              aria-label="Pesquisar encomendas"
              className="w-full rounded-xl border border-line bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-200"
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Cliente, contacto ou número..."
              value={searchInput}
            />
          </form>
          <select
            aria-label="Filtrar por estado"
            className="rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink"
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(1)
            }}
            value={status}
          >
            <option value="">Todos os estados</option>
            {statuses.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
          </select>
          <label className="grid gap-1 text-xs font-semibold text-ink">
            Data inicial
            <input
              aria-label="Data inicial"
              className="rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-normal"
              max={to || undefined}
              onChange={(event) => {
                setFrom(event.target.value)
                setPage(1)
              }}
              type="date"
              value={from}
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-ink">
            Data final
            <input
              aria-label="Data final"
              className="rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-normal"
              min={from || undefined}
              onChange={(event) => {
                setTo(event.target.value)
                setPage(1)
              }}
              type="date"
              value={to}
            />
          </label>
          {(from || to) && (
            <Button
              onClick={() => {
                setFrom('')
                setTo('')
                setPage(1)
              }}
              size="sm"
            >
              Limpar datas
            </Button>
          )}
        </div>

        {dateRangeError && (
          <p className="mb-4 rounded-xl bg-danger-surface px-3.5 py-3 text-sm text-danger" role="alert">
            A data inicial não pode ser posterior à data final.
          </p>
        )}
        {(orders.isError || mutationError) && (
          <p className="mb-4 flex items-center gap-2 rounded-xl bg-danger-surface px-3.5 py-3 text-sm text-danger" role="alert">
            <CircleAlert aria-hidden="true" className="h-4 w-4 shrink-0" />
            {getApiErrorMessage(orders.error ?? mutationError)}
          </p>
        )}

        {orders.isLoading ? (
          <p className="py-12 text-center text-sm text-muted">A carregar encomendas...</p>
        ) : orders.data?.items.length ? (
          <>
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-canvas text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Encomenda</th>
                    <th className="px-4 py-3 font-semibold">Cliente</th>
                    <th className="px-4 py-3 font-semibold">Estado</th>
                    <th className="px-4 py-3 text-right font-semibold">Total</th>
                    <th className="px-4 py-3 text-right font-semibold">Data</th>
                    <th className="px-4 py-3 text-right font-semibold">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {orders.data.items.map((order) => (
                    <tr key={order.id}>
                      <td className="px-4 py-3 font-semibold text-ink">#{order.id}</td>
                      <td className="px-4 py-3">
                        <span className="block font-medium text-ink">{order.customer?.name ?? `Cliente ${order.userId}`}</span>
                        <span className="text-xs text-muted">{order.customer?.phone ?? ''}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-canvas px-2.5 py-1 text-xs text-muted">{statusLabel(order.status)}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-ink">{currency.format(order.total)}</td>
                      <td className="px-4 py-3 text-right text-muted">{new Date(order.createdAt).toLocaleDateString('pt-MZ')}</td>
                      <td className="px-4 py-3 text-right">
                        <Button aria-label={`Ver encomenda ${order.id}`} onClick={() => setSelectedId(order.id)} size="sm" variant="ghost">
                          <Eye aria-hidden="true" className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted">
              <span>{orders.data.total} encomenda(s)</span>
              <div className="flex items-center gap-2">
                <Button disabled={page <= 1} onClick={() => setPage((current) => current - 1)} size="sm">Anterior</Button>
                <span>Página {orders.data.page} de {Math.max(orders.data.totalPages, 1)}</span>
                <Button disabled={page >= orders.data.totalPages} onClick={() => setPage((current) => current + 1)} size="sm">Seguinte</Button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState
            description={hasFilters ? 'Não foram encontradas encomendas com estes filtros.' : 'Ainda não existem encomendas registadas.'}
            icon={ShoppingCart}
            title={hasFilters ? 'Sem resultados' : 'Ainda sem encomendas'}
          />
        )}
      </Card>

      {selectedId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/40 p-4" role="presentation">
          <section aria-labelledby="order-detail-title" aria-modal="true" className="my-auto w-full max-w-3xl rounded-2xl bg-white shadow-xl" role="dialog">
            <header className="flex items-start justify-between border-b border-line px-5 py-4">
              <div>
                <h2 className="font-semibold text-ink" id="order-detail-title">Detalhes da encomenda #{selectedId}</h2>
                <p className="mt-1 text-xs text-muted">Consulta e actualiza o estado de acordo com o fluxo de entrega.</p>
              </div>
              <Button aria-label="Fechar" onClick={() => setSelectedId(null)} size="sm" variant="ghost"><X aria-hidden="true" className="h-4 w-4" /></Button>
            </header>
            {detail.isLoading ? (
              <p className="flex items-center justify-center gap-2 p-12 text-sm text-muted"><LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />A carregar detalhes...</p>
            ) : detail.isError ? (
              <p className="m-5 flex items-center gap-2 rounded-xl bg-danger-surface px-3.5 py-3 text-sm text-danger" role="alert"><CircleAlert aria-hidden="true" className="h-4 w-4" />{getApiErrorMessage(detail.error)}</p>
            ) : detail.data ? (
              <OrderDetails
                busy={acceptOrder.isPending || rejectOrder.isPending || changeStatus.isPending}
                currency={currency}
                onAccept={() => void acceptOrder.mutateAsync(detail.data!.id).catch(() => undefined)}
                onReject={() => void handleReject(detail.data!)}
                onStatusChange={(nextStatus) => void handleStatusChange(detail.data!, nextStatus)}
                order={detail.data}
              />
            ) : null}
          </section>
        </div>
      )}
    </>
  )
}

export function OrderDetails({
  order,
  busy,
  currency,
  onAccept,
  onReject,
  onStatusChange,
}: {
  order: AdminOrder
  busy: boolean
  currency: Intl.NumberFormat
  onAccept: () => void
  onReject: () => void
  onStatusChange: (status: string) => void
}) {
  const nextStatuses = (transitions[order.status] ?? []).filter((nextStatus) => {
    if (nextStatus === 'ready_for_pickup') {
      return order.deliveryMethod === 'store_pickup'
    }
    if (nextStatus === 'out_for_delivery') {
      return order.deliveryMethod === 'home_delivery'
    }
    return true
  })
  const showAccept = order.status === 'pending' && order.paymentStatus === 'paid'
  const showReject = order.status === 'pending'

  return (
    <div className="space-y-5 p-5">
      <div className="grid gap-3 rounded-xl bg-canvas p-4 sm:grid-cols-2">
        <p className="text-sm text-muted">Cliente: <span className="font-medium text-ink">{order.customer?.name ?? `#${order.userId}`}</span></p>
        <p className="text-sm text-muted">Contacto: <span className="font-medium text-ink">{order.customer?.phone ?? '—'}</span></p>
        {order.customer?.email && <p className="text-sm text-muted sm:col-span-2">Email: <span className="font-medium text-ink">{order.customer.email}</span></p>}
        <p className="text-sm text-muted">Estado: <span className="font-medium text-ink">{statusLabel(order.status)}</span></p>
        <p className="text-sm text-muted">Pagamento: <span className="font-medium text-ink">{order.paymentStatus}</span></p>
        <p className="text-sm text-muted">Entrega: <span className="font-medium text-ink">{order.deliveryMethod === 'home_delivery' ? 'Entrega ao domicílio' : 'Levantamento na loja'}</span></p>
        {order.notes && <p className="text-sm text-muted sm:col-span-2">Notas: <span className="font-medium text-ink">{order.notes}</span></p>}
        {order.rejectionReason && <p className="text-sm text-muted sm:col-span-2">Motivo da rejeição: <span className="font-medium text-ink">{order.rejectionReason}</span></p>}
      </div>
      {order.address && (
        <section aria-labelledby="order-address-title" className="rounded-xl border border-line p-4">
          <h3 className="text-sm font-semibold text-ink" id="order-address-title">Morada de entrega</h3>
          <p className="mt-2 text-sm text-muted">
            {[
              [order.address.street, order.address.number].filter(Boolean).join(', '),
              order.address.neighborhood,
              order.address.city,
              order.address.province,
            ].filter(Boolean).join(' · ') || order.address.label || 'Morada sem detalhes'}
          </p>
          {order.address.reference && <p className="mt-1 text-xs text-muted">Referência: {order.address.reference}</p>}
        </section>
      )}
      {order.paymentMethod && (
        <section aria-labelledby="order-payment-method-title" className="rounded-xl border border-line p-4">
          <h3 className="text-sm font-semibold text-ink" id="order-payment-method-title">Método de pagamento</h3>
          <p className="mt-2 text-sm text-muted">
            {[order.paymentMethod.label, order.paymentMethod.provider, order.paymentMethod.cardBrand]
              .filter(Boolean)
              .join(' · ') || paymentMethodLabel(order.paymentMethod.type)}
            {order.paymentMethod.cardLast4 ? ` · •••• ${order.paymentMethod.cardLast4}` : ''}
            {order.paymentMethod.phone ? ` · ${order.paymentMethod.phone}` : ''}
          </p>
        </section>
      )}
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-canvas text-xs uppercase tracking-wide text-muted">
            <tr><th className="px-4 py-3 font-semibold">Produto</th><th className="px-4 py-3 text-right font-semibold">Qtd.</th><th className="px-4 py-3 text-right font-semibold">Subtotal</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 text-ink">{item.product.name}</td>
                <td className="px-4 py-3 text-right text-muted">{item.quantity}</td>
                <td className="px-4 py-3 text-right text-ink">{currency.format(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="ml-auto grid w-full max-w-sm grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-canvas p-4 text-sm">
        <dt className="text-muted">Subtotal</dt><dd className="text-right text-ink">{currency.format(order.subtotal)}</dd>
        <dt className="text-muted">Desconto</dt><dd className="text-right text-ink">−{currency.format(order.discount)}</dd>
        <dt className="text-muted">Taxa de entrega</dt><dd className="text-right text-ink">{currency.format(order.deliveryFee)}</dd>
        {order.couponCode && <><dt className="text-muted">Cupão</dt><dd className="text-right text-ink">{order.couponCode}</dd></>}
        <dt className="border-t border-line pt-2 font-semibold text-ink">Total</dt><dd className="border-t border-line pt-2 text-right font-semibold text-ink">{currency.format(order.total)}</dd>
      </dl>
      <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
        {showAccept && <Button disabled={busy} onClick={onAccept} variant="primary">Aceitar encomenda</Button>}
        {showReject && <Button disabled={busy} onClick={onReject}>Rejeitar</Button>}
        {nextStatuses.map((nextStatus) => (
          <Button disabled={busy} key={nextStatus} onClick={() => onStatusChange(nextStatus)} variant="primary">
            Actualizar para {statusLabel(nextStatus)}
          </Button>
        ))}
      </div>
    </div>
  )
}

function paymentMethodLabel(type: string): string {
  const labels: Record<string, string> = { mpesa: 'M-Pesa', visa: 'Visa' }
  return labels[type] ?? type
}

const transitions: Record<string, string[]> = {
  pending: ['cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['ready_for_pickup', 'out_for_delivery', 'cancelled'],
  ready_for_pickup: ['completed'],
  out_for_delivery: ['completed'],
  completed: [],
  rejected: [],
  cancelled: [],
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pendente',
    accepted: 'Aceite',
    rejected: 'Rejeitada',
    preparing: 'Em preparação',
    ready_for_pickup: 'Pronta para levantamento',
    out_for_delivery: 'Em entrega',
    completed: 'Concluída',
    cancelled: 'Cancelada',
    paid: 'Pago',
  }
  return labels[status] ?? status.replaceAll('_', ' ')
}
