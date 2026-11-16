import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CircleAlert, LoaderCircle, Pencil, Plus, Tags, Trash2, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { EmptyState } from '../../../components/ui/EmptyState'
import { getApiErrorMessage } from '../../../lib/api/errors'
import {
  adminApi,
  type Category,
  type CategoryFields,
} from '../../admin/adminApi'

const blankCategory: CategoryFields = {
  name: '',
  slug: '',
  icon_url: null,
  parent_id: null,
}

export function CategoriesPage() {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState<CategoryFields>(blankCategory)
  const categories = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: adminApi.listCategories,
  })

  const saveCategory = useMutation({
    mutationFn: () =>
      editing
        ? adminApi.updateCategory(editing.id, form)
        : adminApi.createCategory(form),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
      await queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
      setFormOpen(false)
    },
  })
  const deleteCategory = useMutation({
    mutationFn: adminApi.deleteCategory,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] }),
  })

  function openCreate() {
    setEditing(null)
    setForm(blankCategory)
    saveCategory.reset()
    setFormOpen(true)
  }

  function openEdit(category: Category) {
    setEditing(category)
    setForm({
      name: category.name,
      slug: category.slug,
      icon_url: category.icon_url,
      parent_id: category.parent_id,
    })
    saveCategory.reset()
    setFormOpen(true)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await saveCategory.mutateAsync().catch(() => undefined)
  }

  async function remove(category: Category) {
    if (!window.confirm(`Eliminar a categoria “${category.name}”?`)) return
    await deleteCategory.mutateAsync(category.id).catch(() => undefined)
  }

  return (
    <>
      <Card
        actions={
          <Button onClick={openCreate} variant="primary">
            <Plus aria-hidden="true" className="h-4 w-4" />
            Nova categoria
          </Button>
        }
        description="Organiza as categorias que estruturam o catálogo da loja."
        title="Categorias do catálogo"
      >
        {(categories.isError || deleteCategory.isError) && (
          <p className="mb-4 flex items-center gap-2 rounded-xl bg-danger-surface px-3.5 py-3 text-sm text-danger" role="alert">
            <CircleAlert aria-hidden="true" className="h-4 w-4 shrink-0" />
            {getApiErrorMessage(categories.error ?? deleteCategory.error)}
          </p>
        )}
        {categories.isLoading ? (
          <p className="py-12 text-center text-sm text-muted">A carregar categorias...</p>
        ) : categories.data?.length ? (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-canvas text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Categoria</th>
                  <th className="px-4 py-3 font-semibold">Slug</th>
                  <th className="px-4 py-3 font-semibold">Categoria principal</th>
                  <th className="px-4 py-3 text-right font-semibold">Acções</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {categories.data.map((category) => (
                  <tr key={category.id}>
                    <td className="px-4 py-3 font-medium text-ink">{category.name}</td>
                    <td className="px-4 py-3 text-muted">{category.slug}</td>
                    <td className="px-4 py-3 text-muted">
                      {categories.data.find((item) => item.id === category.parent_id)?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button aria-label={`Editar ${category.name}`} onClick={() => openEdit(category)} size="sm" variant="ghost">
                          <Pencil aria-hidden="true" className="h-4 w-4" />
                        </Button>
                        <Button aria-label={`Eliminar ${category.name}`} disabled={deleteCategory.isPending} onClick={() => void remove(category)} size="sm" variant="ghost">
                          <Trash2 aria-hidden="true" className="h-4 w-4 text-danger" />
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
            action={<Button onClick={openCreate} variant="primary"><Plus aria-hidden="true" className="h-4 w-4" />Criar categoria</Button>}
            description="Cria categorias para organizar o catálogo."
            icon={Tags}
            title="Ainda não existem categorias"
          />
        )}
      </Card>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/40 p-4" role="presentation">
          <section aria-labelledby="category-form-title" aria-modal="true" className="my-auto w-full max-w-lg rounded-2xl bg-white shadow-xl" role="dialog">
            <header className="flex items-start justify-between border-b border-line px-5 py-4">
              <h2 className="font-semibold text-ink" id="category-form-title">{editing ? 'Editar categoria' : 'Nova categoria'}</h2>
              <Button aria-label="Fechar" onClick={() => setFormOpen(false)} size="sm" variant="ghost"><X aria-hidden="true" className="h-4 w-4" /></Button>
            </header>
            <form className="space-y-4 p-5" onSubmit={(event) => void submit(event)}>
              <label className="block text-xs font-semibold text-ink">
                Nome
                <input
                  className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-sm font-normal"
                  maxLength={100}
                  minLength={2}
                  onChange={(event) => {
                    const name = event.target.value
                    setForm({ ...form, name, slug: slugify(name) })
                  }}
                  required
                  value={form.name}
                />
              </label>
              <label className="block text-xs font-semibold text-ink">
                Slug
                <input className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-sm font-normal" maxLength={120} minLength={2} onChange={(event) => setForm({ ...form, slug: slugify(event.target.value) })} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required value={form.slug} />
              </label>
              <label className="block text-xs font-semibold text-ink">
                Categoria principal
                <select className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-normal" onChange={(event) => setForm({ ...form, parent_id: event.target.value ? Number(event.target.value) : null })} value={form.parent_id ?? ''}>
                  <option value="">Sem categoria principal</option>
                  {categories.data?.filter((item) => item.id !== editing?.id).map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold text-ink">
                URL do ícone (opcional)
                <input className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-sm font-normal" maxLength={2048} onChange={(event) => setForm({ ...form, icon_url: event.target.value || null })} type="url" value={form.icon_url ?? ''} />
              </label>
              {saveCategory.isError && <p className="flex items-center gap-2 rounded-lg bg-danger-surface px-3 py-2.5 text-sm text-danger" role="alert"><CircleAlert aria-hidden="true" className="h-4 w-4" />{getApiErrorMessage(saveCategory.error)}</p>}
              <footer className="flex justify-end gap-2 border-t border-line pt-4">
                <Button onClick={() => setFormOpen(false)}>Cancelar</Button>
                <Button disabled={saveCategory.isPending} type="submit" variant="primary">
                  {saveCategory.isPending && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}
                  {saveCategory.isPending ? 'A guardar...' : 'Guardar categoria'}
                </Button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </>
  )
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
