import {
  ArrowRight,
  Bell,
  Clock3,
  Package,
  ShieldCheck,
  ShoppingCart,
  Tags,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '../../../components/ui/Card'
import { EmptyState } from '../../../components/ui/EmptyState'
import { StatCard } from '../../../components/ui/StatCard'
import { useAuth } from '../../auth/context/useAuth'

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
  const firstName = user?.full_name?.trim().split(/\s+/)[0] ?? 'administrador'

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-start via-brand-end to-[#4167e8] p-6 text-white shadow-lg shadow-brand-end/20 sm:p-8">
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
            O painel administrativo está pronto para receber os módulos do
            VirtualShop. Os indicadores serão apresentados aqui assim que os
            dados da API estiverem disponíveis.
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          hint="Aguardando integração com a API"
          icon={ShoppingCart}
          label="Encomendas"
          tone="brand"
          value="—"
        />
        <StatCard
          hint="Aguardando integração com a API"
          icon={Package}
          label="Produtos"
          tone="blue"
          value="—"
        />
        <StatCard
          hint="Aguardando integração com a API"
          icon={Users}
          label="Clientes"
          tone="success"
          value="—"
        />
        <StatCard
          hint="Aguardando integração com a API"
          icon={Tags}
          label="Categorias"
          tone="warning"
          value="—"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card
          description="As últimas movimentações da loja aparecerão neste espaço."
          title="Actividade recente"
        >
          <EmptyState
            description="Quando a API estiver ligada, as encomendas e os eventos recentes serão apresentados aqui."
            icon={Clock3}
            title="Ainda sem actividade"
          />
        </Card>

        <Card
          description="Acesso rápido aos módulos principais do painel."
          title="Atalhos"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-2">
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
    </div>
  )
}
