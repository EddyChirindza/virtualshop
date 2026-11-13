import {
  ArrowRight,
  Bell,
  CircleAlert,
  Package,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Tags,
  Users,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { StatCard } from '../../../components/ui/StatCard'
import { getApiErrorMessage } from '../../../lib/api/errors'
import { useAuth } from '../../auth/context/useAuth'
import { adminApi } from '../../admin/adminApi'

const shortcuts = [
  {
    label: 'Encomendas',
    description: 'Acompanhar pedidos',
    to: '/orders',
    icon: ShoppingCart,
  },
  {
    label: 'Produtos',
    description: 'Gerir catálogo',
    to: '/products',
    icon: Package,
  },
  {
    label: 'Categorias',
    description: 'Organizar secções',
    to: '/categories',
    icon: Tags,
  },
  {
    label: 'Clientes',
    description: 'Consultar contas',
    to: '/customers',
    icon: Users,
  },
  {
    label: 'Administradores',
    description: 'Controlar acessos',
    to: '/administrators',
    icon: ShieldCheck,
  },
  {
    label: 'Notificações',
    description: 'Ver alertas',
    to: '/notifications',
    icon: Bell,
  },
]

export function DashboardPage() {
  const { user } = useAuth()
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d')
  const dashboard = useQuery({
    queryKey: ['admin', 'dashboard', period],
    queryFn: () => adminApi.getDashboard(period),
  })
  const firstName = user?.full_name?.trim().split(/\s+/)[0] ?? 'administrador'
  const data = dashboard.data
  const currency = new Intl.NumberFormat('pt-MZ', {
    style: 'currency',
    currency: 'MZN',
    maximumFractionDigits: 2,
  })
  const date = new Intl.DateTimeFormat('pt-MZ', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-start via-brand-600 to-brand-end p-6 text-white shadow-lg shadow-brand-end/20 sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 right-24 h-56 w-56 rounded-full bg-white/10 blur-2xl"
        />
        <div className="relative z-10 max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">
            Visão geral
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Bem-vindo, {firstName}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/80">
            Acompanha a actividade recente e os indicadores reais da loja.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-end shadow-sm transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-end"
              to="/orders"
            >
              Ver encomendas
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-end"
              to="/products"
            >
              Gerir produtos
            </Link>
          </div>
        </div>
      </section>

      {dashboard.isError && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/20 bg-danger-surface px-4 py-3 text-sm text-danger"
          role="alert"
        >
          <span className="flex items-center gap-2">
            <CircleAlert aria-hidden="true" className="h-4 w-4 shrink-0" />
            {getApiErrorMessage(dashboard.error)}
          </span>
          <Button
            onClick={() => void dashboard.refetch()}
            size="sm"
            variant="ghost"
          >
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          hint={`${data?.metrics.pendingOrders ?? '—'} por aceitar`}
          icon={ShoppingCart}
          label="Encomendas"
          tone="brand"
          value={data ? data.metrics.orders.toLocaleString('pt-MZ') : '—'}
        />
        <StatCard
          hint="No catálogo"
          icon={Package}
          label="Produtos"
          tone="blue"
          value={data ? data.metrics.products.toLocaleString('pt-MZ') : '—'}
        />
        <StatCard
          hint="Contas activas"
          icon={Users}
          label="Clientes"
          tone="success"
          value={data ? data.metrics.customers.toLocaleString('pt-MZ') : '—'}
        />
        <StatCard
          hint={`Período de ${period}`}
          icon={Tags}
          label="Receita"
          tone="warning"
          value={data ? currency.format(data.metrics.revenue) : '—'}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card
          actions={
            <select
              aria-label="Período do gráfico"
              className="rounded-lg border border-line bg-white px-2.5 py-2 text-xs text-ink"
              onChange={(event) =>
                setPeriod(event.target.value as '7d' | '30d' | '90d')
              }
              value={period}
            >
              <option value="7d">7 dias</option>
              <option value="30d">30 dias</option>
              <option value="90d">90 dias</option>
            </select>
          }
          description="Receita diária, excluindo encomendas canceladas e rejeitadas."
          title="Receita"
        >
          {dashboard.isLoading ? (
            <div className="flex h-64 items-center justify-center text-sm text-muted">
              A carregar indicadores...
            </div>
          ) : data?.revenueSeries.length ? (
            <div className="h-64 w-full">
              <ResponsiveContainer height="100%" width="100%">
                <AreaChart data={data.revenueSeries} margin={{ left: 0, right: 12, top: 8 }}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#5268e8" stopOpacity={0.24} />
                      <stop offset="95%" stopColor="#5268e8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e8eaf0" strokeDasharray="3 3" vertical={false} />
                  <XAxis axisLine={false} dataKey="label" tickLine={false} tick={{ fontSize: 11 }} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value: number) => value.toLocaleString('pt-MZ')}
                    width={56}
                  />
                  <Tooltip
                    formatter={(value) => [currency.format(Number(value)), 'Receita']}
                    labelStyle={{ color: '#202536' }}
                  />
                  <Area
                    dataKey="value"
                    fill="url(#revenueFill)"
                    stroke="#5268e8"
                    strokeWidth={2}
                    type="monotone"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-16 text-center text-sm text-muted">
              Ainda não há dados de receita para este período.
            </p>
          )}
        </Card>

        <Card
          description="Produtos que necessitam de reposição."
          title="Stock baixo"
        >
          {data?.lowStockProducts.length ? (
            <ul className="divide-y divide-line">
              {data.lowStockProducts.map((product) => (
                <li className="flex items-center justify-between gap-3 py-3" key={product.id}>
                  <span className="min-w-0 truncate text-sm font-medium text-ink">{product.name}</span>
                  <span className="shrink-0 rounded-full bg-warning-surface px-2.5 py-1 text-xs font-semibold text-warning">
                    {product.stock_status === 'out_of_stock' ? 'Sem stock' : 'Stock baixo'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-10 text-center text-sm text-muted">
              {dashboard.isLoading ? 'A carregar...' : 'Não há produtos com stock baixo.'}
            </p>
          )}
          <Link className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-end" to="/products">
            Gerir produtos <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        </Card>
      </div>

      <Card
        actions={
          <Link className="text-xs font-semibold text-brand-end" to="/orders">
            Ver todas
          </Link>
        }
        description="As encomendas mais recentes registadas na loja."
        title="Encomendas recentes"
      >
        {dashboard.isLoading ? (
          <p className="py-10 text-center text-sm text-muted">A carregar encomendas...</p>
        ) : data?.recentOrders.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="pb-3 pr-4 font-semibold">Encomenda</th>
                  <th className="pb-3 pr-4 font-semibold">Cliente</th>
                  <th className="pb-3 pr-4 font-semibold">Estado</th>
                  <th className="pb-3 pr-4 text-right font-semibold">Total</th>
                  <th className="pb-3 text-right font-semibold">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="py-3 pr-4 font-semibold text-ink">#{order.id}</td>
                    <td className="py-3 pr-4 text-ink">{order.customer}</td>
                    <td className="py-3 pr-4 text-muted">{order.status.replaceAll('_', ' ')}</td>
                    <td className="py-3 pr-4 text-right text-ink">{currency.format(order.total)}</td>
                    <td className="py-3 text-right text-muted">{date.format(new Date(order.createdAt))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-10 text-center text-sm text-muted">
            {dashboard.isError ? 'Não foi possível carregar as encomendas.' : 'Ainda não existem encomendas.'}
          </p>
        )}
      </Card>

      <Card
        description="Acesso rápido aos módulos principais do painel."
        title="Atalhos"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shortcuts.map((shortcut) => {
            const Icon = shortcut.icon
            return (
              <Link
                className="group flex items-center gap-3 rounded-xl border border-line bg-white p-3 transition hover:border-brand-200 hover:bg-brand-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-end/40"
                key={shortcut.to}
                to={shortcut.to}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-end transition group-hover:bg-white">
                  <Icon aria-hidden="true" className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold leading-snug text-ink">
                    {shortcut.label}
                  </span>
                  <span className="mt-0.5 block text-[10px] leading-snug text-muted">
                    {shortcut.description}
                  </span>
                </span>
              </Link>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
