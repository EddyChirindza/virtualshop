import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CircleAlert,
  LoaderCircle,
  Pencil,
  Plus,
  ShieldCheck,
  UserCheck,
  UserX,
  X,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { EmptyState } from '../../../components/ui/EmptyState'
import { getApiErrorMessage } from '../../../lib/api/errors'
import {
  adminApi,
  type Administrator,
} from '../../admin/adminApi'
import { useAuth } from '../../auth/context/useAuth'

interface AdministratorForm {
  full_name: string
  phone: string
  email: string
  password: string
  is_active: boolean
}

const blankForm: AdministratorForm = {
  full_name: '',
  phone: '',
  email: '',
  password: '',
  is_active: true,
}

const inputClassName =
  'mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-sm font-normal text-ink outline-none transition focus:border-brand-200 focus:ring-4 focus:ring-brand-end/10'

const labelClassName = 'block text-xs font-semibold text-ink'

const dateFormatter = new Intl.DateTimeFormat('pt-MZ', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function AdministratorsPage() {
  const { user, retrySessionRestore } = useAuth()
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Administrator | null>(null)
  const [form, setForm] = useState<AdministratorForm>(blankForm)
  const [successMessage, setSuccessMessage] = useState('')

  const administrators = useQuery({
    queryKey: ['admin', 'administrators'],
    queryFn: adminApi.listAdministrators,
  })

  const saveAdministrator = useMutation({
    mutationFn: () =>
      editing
        ? adminApi.updateAdministrator(editing.id, {
            full_name: form.full_name,
            phone: form.phone,
            email: form.email.trim() || null,
            is_active: form.is_active,
          })
        : adminApi.createAdministrator({
            full_name: form.full_name,
            phone: form.phone,
            email: form.email.trim() || null,
            password: form.password,
          }),
    onSuccess: async (administrator) => {
      await queryClient.invalidateQueries({
        queryKey: ['admin', 'administrators'],
      })
      setFormOpen(false)
      setSuccessMessage(
        editing
          ? `Administrador “${administrator.full_name}” actualizado.`
          : `Administrador “${administrator.full_name}” criado.`,
      )
      if (editing?.id === user?.id) await retrySessionRestore()
    },
  })

  const toggleStatus = useMutation({
    mutationFn: (administrator: Administrator) =>
      adminApi.updateAdministrator(administrator.id, {
        is_active: !administrator.is_active,
      }),
    onSuccess: async (administrator) => {
      await queryClient.invalidateQueries({
        queryKey: ['admin', 'administrators'],
      })
      setSuccessMessage(
        administrator.is_active
          ? `Administrador “${administrator.full_name}” activado.`
          : `Administrador “${administrator.full_name}” desactivado.`,
      )
    },
  })

  function openCreate() {
    setEditing(null)
    setForm(blankForm)
    saveAdministrator.reset()
    setSuccessMessage('')
    setFormOpen(true)
  }

  function openEdit(administrator: Administrator) {
    setEditing(administrator)
    setForm({
      full_name: administrator.full_name,
      phone: administrator.phone,
      email: administrator.email ?? '',
      password: '',
      is_active: administrator.is_active,
    })
    saveAdministrator.reset()
    setSuccessMessage('')
    setFormOpen(true)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await saveAdministrator.mutateAsync().catch(() => undefined)
  }

  async function toggle(administrator: Administrator) {
    if (administrator.id === user?.id) return
    const action = administrator.is_active ? 'desactivar' : 'activar'
    if (
      !window.confirm(
        `Queres ${action} a conta de “${administrator.full_name}”?`,
      )
    ) {
      return
    }
    await toggleStatus.mutateAsync(administrator).catch(() => undefined)
  }

  const editingSelf = editing?.id === user?.id

  return (
    <>
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
          actions={
            <Button onClick={openCreate} variant="primary">
              <Plus aria-hidden="true" className="h-4 w-4" />
              Novo administrador
            </Button>
          }
          description="Gere as contas que podem aceder a este painel administrativo."
          title="Administradores"
        >
          {successMessage && (
            <p
              className="mb-4 rounded-xl bg-success-surface px-3.5 py-3 text-sm text-success"
              role="status"
            >
              {successMessage}
            </p>
          )}

          {(administrators.isError || toggleStatus.isError) && (
            <p
              className="mb-4 flex items-center gap-2 rounded-xl bg-danger-surface px-3.5 py-3 text-sm text-danger"
              role="alert"
            >
              <CircleAlert aria-hidden="true" className="h-4 w-4 shrink-0" />
              {getApiErrorMessage(
                administrators.error ?? toggleStatus.error,
              )}
            </p>
          )}

          {administrators.isLoading ? (
            <p className="py-12 text-center text-sm text-muted">
              A carregar administradores...
            </p>
          ) : administrators.data?.length ? (
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-canvas text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Administrador</th>
                    <th className="px-4 py-3 font-semibold">Contacto</th>
                    <th className="px-4 py-3 font-semibold">Estado</th>
                    <th className="px-4 py-3 font-semibold">Último acesso</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Acções
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {administrators.data.map((administrator) => (
                    <tr key={administrator.id}>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-ink">
                            {administrator.full_name}
                          </span>
                          {administrator.id === user?.id && (
                            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-end">
                              Tu
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted">
                        <span className="block">{administrator.phone}</span>
                        <span className="block text-xs">
                          {administrator.email ?? 'Sem email'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            administrator.is_active
                              ? 'bg-success-surface text-success'
                              : 'bg-danger-surface text-danger'
                          }`}
                        >
                          {administrator.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {administrator.last_login_at
                          ? dateFormatter.format(
                              new Date(administrator.last_login_at),
                            )
                          : 'Nunca'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            aria-label={`Editar ${administrator.full_name}`}
                            onClick={() => openEdit(administrator)}
                            size="sm"
                            variant="ghost"
                          >
                            <Pencil aria-hidden="true" className="h-4 w-4" />
                          </Button>
                          <Button
                            aria-label={
                              administrator.is_active
                                ? `Desactivar ${administrator.full_name}`
                                : `Activar ${administrator.full_name}`
                            }
                            disabled={
                              toggleStatus.isPending ||
                              administrator.id === user?.id
                            }
                            onClick={() => void toggle(administrator)}
                            size="sm"
                            variant="ghost"
                          >
                            {administrator.is_active ? (
                              <UserX
                                aria-hidden="true"
                                className="h-4 w-4 text-danger"
                              />
                            ) : (
                              <UserCheck
                                aria-hidden="true"
                                className="h-4 w-4 text-success"
                              />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              action={
                <Button onClick={openCreate} variant="primary">
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  Criar administrador
                </Button>
              }
              description="Cria contas administrativas para a equipa."
              icon={ShieldCheck}
              title="Ainda não existem administradores"
            />
          )}
        </Card>
      </div>

      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/40 p-4"
          role="presentation"
        >
          <section
            aria-labelledby="administrator-form-title"
            aria-modal="true"
            className="my-auto w-full max-w-lg rounded-2xl bg-white shadow-xl"
            role="dialog"
          >
            <header className="flex items-start justify-between border-b border-line px-5 py-4">
              <div>
                <h2
                  className="font-semibold text-ink"
                  id="administrator-form-title"
                >
                  {editing ? 'Editar administrador' : 'Novo administrador'}
                </h2>
                <p className="mt-1 text-xs text-muted">
                  {editing
                    ? 'Actualiza os dados e o estado da conta.'
                    : 'Cria uma conta com acesso ao painel administrativo.'}
                </p>
              </div>
              <Button
                aria-label="Fechar"
                onClick={() => setFormOpen(false)}
                size="sm"
                variant="ghost"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </Button>
            </header>

            <form
              className="space-y-4 p-5"
              onSubmit={(event) => void submit(event)}
            >
              <label className={labelClassName}>
                Nome completo
                <input
                  className={inputClassName}
                  maxLength={150}
                  minLength={3}
                  onChange={(event) =>
                    setForm({ ...form, full_name: event.target.value })
                  }
                  required
                  value={form.full_name}
                />
              </label>

              <label className={labelClassName}>
                Telemóvel
                <input
                  className={inputClassName}
                  maxLength={16}
                  onChange={(event) =>
                    setForm({ ...form, phone: event.target.value })
                  }
                  placeholder="+258841234567"
                  required
                  type="tel"
                  value={form.phone}
                />
              </label>

              <label className={labelClassName}>
                Email (opcional)
                <input
                  className={inputClassName}
                  maxLength={150}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                  type="email"
                  value={form.email}
                />
              </label>

              {!editing && (
                <label className={labelClassName}>
                  Password inicial
                  <input
                    autoComplete="new-password"
                    className={inputClassName}
                    minLength={8}
                    onChange={(event) =>
                      setForm({ ...form, password: event.target.value })
                    }
                    required
                    type="password"
                    value={form.password}
                  />
                  <span className="mt-1 block text-[11px] font-normal text-muted">
                    Mínimo de 8 caracteres, com maiúscula, minúscula e número.
                  </span>
                </label>
              )}

              {editing && (
                <label className="flex items-start gap-3 rounded-xl border border-line p-3 text-sm text-ink">
                  <input
                    checked={form.is_active}
                    className="mt-0.5"
                    disabled={editingSelf}
                    onChange={(event) =>
                      setForm({ ...form, is_active: event.target.checked })
                    }
                    type="checkbox"
                  />
                  <span>
                    Conta activa
                    <span className="mt-0.5 block text-xs font-normal text-muted">
                      {editingSelf
                        ? 'Não podes desactivar a tua própria conta.'
                        : 'Contas inactivas perdem imediatamente o acesso ao painel.'}
                    </span>
                  </span>
                </label>
              )}

              {saveAdministrator.isError && (
                <p
                  className="flex items-center gap-2 rounded-lg bg-danger-surface px-3 py-2.5 text-sm text-danger"
                  role="alert"
                >
                  <CircleAlert aria-hidden="true" className="h-4 w-4" />
                  {getApiErrorMessage(saveAdministrator.error)}
                </p>
              )}

              <footer className="flex justify-end gap-2 border-t border-line pt-4">
                <Button onClick={() => setFormOpen(false)}>Cancelar</Button>
                <Button
                  disabled={saveAdministrator.isPending}
                  type="submit"
                  variant="primary"
                >
                  {saveAdministrator.isPending && (
                    <LoaderCircle
                      aria-hidden="true"
                      className="h-4 w-4 animate-spin"
                    />
                  )}
                  {saveAdministrator.isPending
                    ? 'A guardar...'
                    : 'Guardar administrador'}
                </Button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </>
  )
}
