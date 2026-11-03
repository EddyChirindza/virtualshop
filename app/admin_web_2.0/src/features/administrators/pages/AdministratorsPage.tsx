import { ShieldCheck } from 'lucide-react'
import { Card } from '../../../components/ui/Card'
import { DataTablePlaceholder } from '../../../components/ui/DataTablePlaceholder'
import { useAuth } from '../../auth/context/useAuth'

export function AdministratorsPage() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <Card
        description="Informação da conta que está actualmente autenticada no painel."
        title="Sessão actual"
      >
        <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
              Nome
            </dt>
            <dd className="mt-1 text-sm font-medium text-ink">
              {user?.full_name ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
              Email
            </dt>
            <dd className="mt-1 truncate text-sm font-medium text-ink">
              {user?.email ?? 'Não definido'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
              Telefone
            </dt>
            <dd className="mt-1 text-sm font-medium text-ink">
              {user?.phone ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
              Perfil
            </dt>
            <dd className="mt-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-end">
                <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
                Administrador
              </span>
            </dd>
          </div>
        </dl>
      </Card>

      <Card
        description="Gere os utilizadores que podem aceder a este painel administrativo."
        title="Administradores"
      >
        <DataTablePlaceholder
          columns={[
            { label: 'Administrador' },
            { label: 'Email' },
            { label: 'Perfil' },
            { label: 'Estado', align: 'right' },
          ]}
          description="A gestão de contas administrativas ficará disponível nesta secção quando a API fornecer os endpoints necessários."
          icon={ShieldCheck}
          title="Gestão de administradores em preparação"
        />
      </Card>
    </div>
  )
}
