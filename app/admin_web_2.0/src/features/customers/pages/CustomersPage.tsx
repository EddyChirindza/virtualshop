import { useQuery } from '@tanstack/react-query'
import { CircleAlert, Search, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card } from '../../../components/ui/Card'
import { EmptyState } from '../../../components/ui/EmptyState'
import { getApiErrorMessage } from '../../../lib/api/errors'
import { adminApi } from '../../admin/adminApi'

export function CustomersPage() {
  const [search, setSearch] = useState('')
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
      description="Consulta os clientes registados e os dados de contacto disponíveis na API."
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
                    <span className="block font-medium text-ink">{customer.fullName}</span>
                    <span className="text-xs text-muted">Cliente #{customer.id}</span>
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
      <p className="mt-4 rounded-xl bg-canvas px-3.5 py-3 text-xs leading-5 text-muted">
        A API disponibiliza a lista e os dados básicos de clientes. Não existem actualmente endpoints administrativos para consultar o histórico de encomendas individual ou alterar o estado de uma conta.
      </p>
    </Card>
  )
}
