import { useQuery } from '@tanstack/react-query'
import { CircleAlert, Package, Search, UserRound, Users, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Avatar } from '../../../components/ui/Avatar'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { EmptyState } from '../../../components/ui/EmptyState'
import { getApiErrorMessage } from '../../../lib/api/errors'
import { adminApi, resolveAssetUrl, type Customer } from '../../admin/adminApi'

export function CustomersPage() {
  const [search, setSearch] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)
  const customers = useQuery({
    queryKey: ['admin', 'customers'],
    queryFn: adminApi.listCustomers,
  })
  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLocaleLowerCase()
    if (!term) return customers.data ?? []
    return (customers.data ?? []).filter((customer) =>
      [
        customer.fullName,
        customer.email ?? '',
        customer.phone,
      ].some((value) => value.toLocaleLowerCase().includes(term)),
    )
  }, [customers.data, search])

  return (
    <Card
      description="Consulta os clientes registados, os seus dados e o histórico de encomendas."
      title="Clientes registados"
    >
      <label className="relative mb-5 block max-w-lg">
        <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          aria-label="Pesquisar clientes"
          className="w-full rounded-xl border border-line bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-200"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Pesquisar por nome, email ou telefone..."
          type="search"
          value={search}
        />
      </label>

      {customers.isError && (
        <p className="mb-4 flex items-center gap-2 rounded-xl bg-danger-surface px-3.5 py-3 text-sm text-danger" role="alert">
          <CircleAlert aria-hidden="true" className="h-4 w-4 shrink-0" />
          {getApiErrorMessage(customers.error)}
        </p>
      )}
      {customers.isLoading ? (
        <p className="py-12 text-center text-sm text-muted">A carregar clientes...</p>
      ) : filteredCustomers.length ? (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-canvas text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Contacto</th>
                <th className="px-4 py-3 text-right font-semibold">Registo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td className="px-4 py-3">
                    <button
                      className="text-left focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-end/40"
                      onClick={() => setSelectedCustomerId(customer.id)}
                      type="button"
                    >
                      <span className="block font-medium text-ink">{customer.fullName || 'Sem nome'}</span>
                      <span className="text-xs text-muted">Cliente #{customer.id}</span>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className="block text-ink">{customer.email ?? 'Sem email'}</span>
                    <span className="text-xs text-muted">{customer.phone}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-muted">
                    {new Date(customer.createdAt).toLocaleDateString('pt-MZ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-line px-4 py-3 text-xs text-muted">
            {filteredCustomers.length} cliente(s){search ? ' encontrados' : ' registados'}.
          </p>
        </div>
      ) : (
        <EmptyState
          description={search ? 'Não foram encontrados clientes para esta pesquisa.' : 'Ainda não existem clientes registados.'}
          icon={Users}
          title={search ? 'Sem resultados' : 'Ainda sem clientes'}
        />
      )}
      {selectedCustomerId !== null && (
        <CustomerDetailsDialog
          customerId={selectedCustomerId}
          fallback={customers.data?.find((c) => c.id === selectedCustomerId) ?? null}
          onClose={() => setSelectedCustomerId(null)}
        />
      )}
    </Card>
  )
}

function CustomerPhoto({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const [imageFailed, setImageFailed] = useState(false)
  const image = resolveAssetUrl(avatarUrl)
  return image && !imageFailed ? (
    <img
      alt={`Fotografia de ${name || 'cliente'}`}
      className="h-20 w-20 rounded-full object-cover ring-2 ring-brand-100"
      onError={() => setImageFailed(true)}
      src={image}
    />
  ) : (
    <span className="relative">
      <Avatar className="h-20 w-20 text-xl" name={name || ''} size="md" />
      <UserRound aria-hidden="true" className="absolute bottom-1 right-0 h-5 w-5 rounded-full bg-white p-0.5 text-muted" />
    </span>
  )
}

export function CustomerDetailsDialog({
  customerId,
  fallback,
  onClose,
}: {
  customerId: number
  fallback?: Customer | null
  onClose: () => void
}) {
  const details = useQuery({
    queryKey: ['admin', 'customers', customerId],
    queryFn: () => adminApi.getCustomer(customerId),
  })
  const customer = details.data ?? fallback ?? null
  const currency = new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN', maximumFractionDigits: 2 })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/40 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      role="presentation"
    >
      <section
        aria-labelledby="customer-detail-title"
        aria-modal="true"
        className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-xl"
        role="dialog"
      >
        <header className="flex items-start justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="font-semibold text-ink" id="customer-detail-title">Detalhes do cliente</h2>
            <p className="mt-1 text-xs text-muted">Informação do cliente e histórico de encomendas.</p>
          </div>
          <Button aria-label="Fechar" onClick={onClose} size="sm" variant="ghost">
            <X aria-hidden="true" className="h-4 w-4" />
          </Button>
        </header>

        {details.isError && !customer && (
          <p className="m-5 flex items-center gap-2 rounded-xl bg-danger-surface px-3.5 py-3 text-sm text-danger" role="alert">
            <CircleAlert aria-hidden="true" className="h-4 w-4 shrink-0" />
            {getApiErrorMessage(details.error)}
          </p>
        )}

        {customer && (
          <>
            <div className="flex flex-col items-center gap-3 p-6 text-center">
              <CustomerPhoto avatarUrl={customer.avatarUrl} name={customer.fullName || ''} />
              <div>
                <h3 className="text-lg font-semibold text-ink">{customer.fullName || 'Sem nome'}</h3>
                <p className="mt-1 text-xs text-muted">Cliente #{customer.id}</p>
              </div>
            </div>
            <dl className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
              <CustomerDetail label="Email" value={customer.email} />
              <CustomerDetail label="Telefone" value={customer.phone} />
              <CustomerDetail label="Registado em" value={formatCustomerDate(customer.createdAt)} />
              {details.data && (
                <>
                  <CustomerDetail label="Encomendas" value={String(details.data.stats.orderCount)} />
                  <CustomerDetail label="Total gasto" value={currency.format(details.data.stats.totalSpent)} />
                  <CustomerDetail label="Última encomenda" value={details.data.stats.lastOrderAt ? formatCustomerDate(details.data.stats.lastOrderAt) : '—'} />
                </>
              )}
            </dl>
          </>
        )}

        <div className="border-t border-line px-5 py-4">
          <h3 className="mb-3 text-sm font-semibold text-ink">Histórico de encomendas</h3>
          {details.isLoading ? (
            <p className="py-6 text-center text-sm text-muted">A carregar histórico...</p>
          ) : details.isError && details.data == null ? (
            <p className="rounded-xl bg-danger-surface px-3.5 py-3 text-sm text-danger" role="alert">
              {getApiErrorMessage(details.error)}
            </p>
          ) : details.data?.orders.length ? (
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-canvas text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Pedido</th>
                    <th className="px-3 py-2 font-semibold">Estado</th>
                    <th className="px-3 py-2 text-right font-semibold">Itens</th>
                    <th className="px-3 py-2 text-right font-semibold">Total</th>
                    <th className="px-3 py-2 text-right font-semibold">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {details.data.orders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-3 py-2 font-medium text-ink">#{order.id}</td>
                      <td className="px-3 py-2 text-muted">{statusLabel(order.status)}</td>
                      <td className="px-3 py-2 text-right text-muted">{order.itemCount}</td>
                      <td className="px-3 py-2 text-right text-ink">{currency.format(order.total)}</td>
                      <td className="px-3 py-2 text-right text-muted">{formatCustomerDate(order.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted">
              <Package aria-hidden="true" className="h-8 w-8 text-muted/60" />
              <p>Este cliente ainda não tem encomendas.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function statusLabel(status: string): string {
  return {
    pending: 'Pendente',
    accepted: 'Aceite',
    rejected: 'Rejeitada',
    preparing: 'Em preparação',
    ready_for_pickup: 'Pronta para levantamento',
    out_for_delivery: 'Em entrega',
    completed: 'Concluída',
    cancelled: 'Cancelada',
  }[status] ?? status.replaceAll('_', ' ')
}

function CustomerDetail({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-xl bg-canvas p-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm text-ink">{value?.trim() || '—'}</dd>
    </div>
  )
}

function formatCustomerDate(value: string): string {
  const date = new Date(value)
  return Number.isFinite(date.getTime())
    ? date.toLocaleString('pt-MZ')
    : '—'
}
