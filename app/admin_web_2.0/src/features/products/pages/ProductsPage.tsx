import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CircleAlert, Eye, ImagePlus, LoaderCircle, Package, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { EmptyState } from '../../../components/ui/EmptyState'
import { getApiErrorMessage } from '../../../lib/api/errors'
import {
  adminApi,
  createProductWithOptionalNotification,
  resolveAssetUrl,
  type Product,
  type ProductFields,
} from '../../admin/adminApi'

const blankProduct: ProductFields = {
  name: '',
  description: null,
  price: 0,
  stock: 0,
  image_urls: [],
  category_id: null,
  is_popular: false,
  is_new_arrival: true,
}

export function ProductsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Product | null>(null)
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)
  const [form, setForm] = useState<ProductFields>(blankProduct)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [notifyCustomers, setNotifyCustomers] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [saveMessageIsError, setSaveMessageIsError] = useState(false)

  const categories = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: adminApi.listCategories,
  })
  const products = useQuery({
    queryKey: ['admin', 'products', { search, category, page }],
    queryFn: () =>
      adminApi.listProducts({
        q: search || undefined,
        category: category ? Number(category) : undefined,
        page,
        limit: 20,
      }),
  })
  const productDetail = useQuery({
    queryKey: ['admin', 'product', selectedProductId],
    queryFn: () => adminApi.getProduct(selectedProductId!),
    enabled: selectedProductId !== null,
  })

  const saveProduct = useMutation({
    mutationFn: async ({
      id,
      fields,
      files,
      notify,
    }: {
      id: number | null
      fields: ProductFields
      files: File[]
      notify: boolean
    }) => {
      const imageUrls = [...fields.image_urls]
      if (files.length > 20) {
        throw new Error('Um produto pode ter no máximo 20 imagens.')
      }
      if (files.some((file) => file.size > 5 * 1024 * 1024)) {
        throw new Error('Cada imagem deve ter no máximo 5 MB.')
      }
      if (files.length > 0) {
        imageUrls.splice(0, imageUrls.length)
        for (const file of files) {
          imageUrls.push(
            await adminApi.uploadProductImage(await readAsDataUrl(file)),
          )
        }
      }
      const productFields = { ...fields, image_urls: imageUrls }
      if (id) {
        return { product: await adminApi.updateProduct(id, productFields) }
      }
      return createProductWithOptionalNotification(productFields, notify)
    },
    onSuccess: async (result, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
      setFormOpen(false)
      const notificationFailed = 'notificationError' in result && result.notificationError
      setSaveMessageIsError(Boolean(notificationFailed))
      setSaveMessage(
        notificationFailed
          ? `Produto “${result.product.name}” criado, mas a notificação falhou: ${getApiErrorMessage(result.notificationError)}`
          : variables.id
            ? `Produto “${result.product.name}” actualizado.`
            : variables.notify
              ? `Produto “${result.product.name}” criado e notificação publicada.`
              : `Produto “${result.product.name}” criado.`,
      )
    },
  })
  const deleteProduct = useMutation({
    mutationFn: adminApi.deleteProduct,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }),
  })

  function openCreateForm() {
    setEditing(null)
    setForm(blankProduct)
    setImageFiles([])
    setNotifyCustomers(false)
    saveProduct.reset()
    setSaveMessage('')
    setFormOpen(true)
  }

  function openEditForm(product: Product) {
    setEditing(product)
    setForm({
      name: product.name,
      description: product.description,
      price: Number(product.price),
      stock: product.stock,
      image_urls: product.image_urls ?? [],
      category_id: product.category_id,
      is_popular: product.is_popular,
      is_new_arrival: product.is_new_arrival,
    })
    setImageFiles([])
    setNotifyCustomers(false)
    saveProduct.reset()
    setFormOpen(true)
  }

  async function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await saveProduct.mutateAsync({
      id: editing?.id ?? null,
      fields: form,
      files: imageFiles,
      notify: notifyCustomers,
    }).catch(() => undefined)
  }

  function searchProducts(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPage(1)
    setSearch(searchInput.trim())
  }

  async function removeProduct(product: Product) {
    if (!window.confirm(`Eliminar o produto “${product.name}”?`)) return
    await deleteProduct.mutateAsync(product.id).catch(() => undefined)
  }

  const currency = new Intl.NumberFormat('pt-MZ', {
    style: 'currency',
    currency: 'MZN',
    maximumFractionDigits: 2,
  })

  return (
    <>
      <Card
        actions={
          <Button onClick={openCreateForm} variant="primary">
            <Plus aria-hidden="true" className="h-4 w-4" />
            Adicionar produto
          </Button>
        }
        description="Consulta e organiza os produtos, o stock e a disponibilidade do catálogo."
        title="Catálogo de produtos"
      >
        {saveMessage && (
          <p
            className={`mb-4 rounded-xl px-3.5 py-3 text-sm ${saveMessageIsError ? 'bg-warning-surface text-warning' : 'bg-success-surface text-success'}`}
            role={saveMessageIsError ? 'alert' : 'status'}
          >
            {saveMessage}
          </p>
        )}
        <div className="mb-5 flex flex-wrap gap-3">
          <form className="relative min-w-56 flex-1" onSubmit={searchProducts} role="search">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              aria-label="Pesquisar produtos"
              className="w-full rounded-xl border border-line bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-200"
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Pesquisar produtos..."
              value={searchInput}
            />
          </form>
          <select
            aria-label="Filtrar por categoria"
            className="rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink"
            onChange={(event) => {
              setCategory(event.target.value)
              setPage(1)
            }}
            value={category}
          >
            <option value="">Todas as categorias</option>
            {categories.data?.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </div>

        {(products.isError || deleteProduct.isError) && (
          <p className="mb-4 flex items-center gap-2 rounded-xl bg-danger-surface px-3.5 py-3 text-sm text-danger" role="alert">
            <CircleAlert aria-hidden="true" className="h-4 w-4 shrink-0" />
            {getApiErrorMessage(products.error ?? deleteProduct.error)}
          </p>
        )}

        {products.isLoading ? (
          <p className="py-12 text-center text-sm text-muted">A carregar produtos...</p>
        ) : products.data?.items.length ? (
          <>
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-canvas text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Produto</th>
                    <th className="px-4 py-3 font-semibold">Categoria</th>
                    <th className="px-4 py-3 text-right font-semibold">Preço</th>
                    <th className="px-4 py-3 text-right font-semibold">Stock</th>
                    <th className="px-4 py-3 text-right font-semibold">Estado</th>
                    <th className="px-4 py-3 text-right font-semibold">Acções</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {products.data.items.map((product) => {
                    const image = resolveAssetUrl(product.image_url)
                    return (
                      <tr key={product.id}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {image ? (
                              <img alt="" className="h-10 w-10 rounded-lg object-cover" src={image} />
                            ) : (
                              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-canvas text-muted"><Package aria-hidden="true" className="h-5 w-5" /></span>
                            )}
                            <span className="font-medium text-ink">{product.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted">{product.category_name ?? 'Sem categoria'}</td>
                        <td className="px-4 py-3 text-right text-ink">{currency.format(Number(product.price))}</td>
                        <td className="px-4 py-3 text-right text-ink">{product.stock}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="rounded-full bg-canvas px-2.5 py-1 text-xs text-muted">
                            {product.stock_status === 'out_of_stock' ? 'Sem stock' : product.stock_status === 'low_stock' ? 'Stock baixo' : 'Disponível'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <Button aria-label={`Ver ${product.name}`} onClick={() => setSelectedProductId(product.id)} size="sm" variant="ghost">
                              <Eye aria-hidden="true" className="h-4 w-4" />
                            </Button>
                            <Button aria-label={`Editar ${product.name}`} onClick={() => openEditForm(product)} size="sm" variant="ghost">
                              <Pencil aria-hidden="true" className="h-4 w-4" />
                            </Button>
                            <Button aria-label={`Eliminar ${product.name}`} disabled={deleteProduct.isPending} onClick={() => void removeProduct(product)} size="sm" variant="ghost">
                              <Trash2 aria-hidden="true" className="h-4 w-4 text-danger" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted">
              <span>{products.data.total} produto(s)</span>
              <div className="flex items-center gap-2">
                <Button disabled={page <= 1} onClick={() => setPage((current) => current - 1)} size="sm">Anterior</Button>
                <span>Página {products.data.page} de {Math.max(products.data.totalPages, 1)}</span>
                <Button disabled={page >= products.data.totalPages} onClick={() => setPage((current) => current + 1)} size="sm">Seguinte</Button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState
            description={search ? 'Não foram encontrados produtos para esta pesquisa.' : 'Ainda não existem produtos no catálogo.'}
            icon={Package}
            title={search ? 'Sem resultados' : 'Ainda sem produtos'}
          />
        )}
      </Card>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/40 p-4" role="presentation">
          <section aria-labelledby="product-form-title" aria-modal="true" className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-xl" role="dialog">
            <header className="flex items-start justify-between border-b border-line px-5 py-4">
              <div>
                <h2 className="font-semibold text-ink" id="product-form-title">{editing ? 'Editar produto' : 'Adicionar produto'}</h2>
                <p className="mt-1 text-xs text-muted">As alterações serão guardadas no catálogo da loja.</p>
              </div>
              <Button aria-label="Fechar" onClick={() => setFormOpen(false)} size="sm" variant="ghost"><X aria-hidden="true" className="h-4 w-4" /></Button>
            </header>
            <form className="space-y-4 p-5" onSubmit={(event) => void submitProduct(event)}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-semibold text-ink">
                  Nome
                  <input className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-sm font-normal" maxLength={150} minLength={2} onChange={(event) => setForm({ ...form, name: event.target.value })} required value={form.name} />
                </label>
                <label className="text-xs font-semibold text-ink">
                  Categoria
                  <select className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-normal" onChange={(event) => setForm({ ...form, category_id: event.target.value ? Number(event.target.value) : null })} value={form.category_id ?? ''}>
                    <option value="">Sem categoria</option>
                    {categories.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>
                <label className="text-xs font-semibold text-ink">
                  Preço (MZN)
                  <input className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-sm font-normal" min="0" onChange={(event) => setForm({ ...form, price: Number(event.target.value) })} required step="0.01" type="number" value={form.price} />
                </label>
                <label className="text-xs font-semibold text-ink">
                  Stock
                  <input className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-sm font-normal" min="0" onChange={(event) => setForm({ ...form, stock: Number(event.target.value) })} required step="1" type="number" value={form.stock} />
                </label>
              </div>
              <label className="block text-xs font-semibold text-ink">
                Descrição
                <textarea className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-sm font-normal" onChange={(event) => setForm({ ...form, description: event.target.value || null })} rows={3} value={form.description ?? ''} />
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-line p-3 text-sm text-ink">
                <ImagePlus aria-hidden="true" className="h-5 w-5 text-brand-end" />
                <span className="flex-1">
                  Imagens do produto (até 20; cada uma até 5 MB)
                  <input accept="image/png,image/jpeg,image/webp" className="mt-1 block w-full text-xs text-muted" multiple onChange={(event) => setImageFiles(Array.from(event.target.files ?? []))} type="file" />
                  {editing?.image_urls.length ? <span className="mt-1 block text-[11px] font-normal text-muted">Imagens actuais: {editing.image_urls.length}. Seleccionar novas imagens substitui todas.</span> : null}
                </span>
              </label>
              <div className="flex flex-wrap gap-5">
                <label className="flex items-center gap-2 text-sm text-ink"><input checked={form.is_popular} onChange={(event) => setForm({ ...form, is_popular: event.target.checked })} type="checkbox" /> Popular</label>
                <label className="flex items-center gap-2 text-sm text-ink"><input checked={form.is_new_arrival} onChange={(event) => setForm({ ...form, is_new_arrival: event.target.checked })} type="checkbox" /> Novidade</label>
              </div>
              {!editing && (
                <label className="flex items-start gap-2 rounded-xl border border-line p-3 text-sm text-ink">
                  <input
                    checked={notifyCustomers}
                    className="mt-0.5"
                    onChange={(event) => setNotifyCustomers(event.target.checked)}
                    type="checkbox"
                  />
                  <span>
                    Notificar os clientes quando o produto for criado
                    <span className="mt-0.5 block text-xs font-normal text-muted">
                      A notificação só será publicada depois de o produto ser guardado.
                    </span>
                  </span>
                </label>
              )}
              {saveProduct.isError && <p className="flex items-center gap-2 rounded-lg bg-danger-surface px-3 py-2.5 text-sm text-danger" role="alert"><CircleAlert aria-hidden="true" className="h-4 w-4" />{getApiErrorMessage(saveProduct.error)}</p>}
              <footer className="flex justify-end gap-2 border-t border-line pt-4">
                <Button onClick={() => setFormOpen(false)}>Cancelar</Button>
                <Button disabled={saveProduct.isPending} type="submit" variant="primary">
                  {saveProduct.isPending && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}
                  {saveProduct.isPending ? 'A guardar...' : 'Guardar produto'}
                </Button>
              </footer>
            </form>
          </section>
        </div>
      )}
      {selectedProductId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/40 p-4" role="presentation">
          <section aria-labelledby="product-detail-title" aria-modal="true" className="my-auto w-full max-w-xl rounded-2xl bg-white shadow-xl" role="dialog">
            <header className="flex items-start justify-between border-b border-line px-5 py-4">
              <div>
                <h2 className="font-semibold text-ink" id="product-detail-title">Detalhes do produto</h2>
                <p className="mt-1 text-xs text-muted">Informação actualizada do catálogo.</p>
              </div>
              <Button aria-label="Fechar" onClick={() => setSelectedProductId(null)} size="sm" variant="ghost"><X aria-hidden="true" className="h-4 w-4" /></Button>
            </header>
            {productDetail.isLoading ? (
              <p className="p-10 text-center text-sm text-muted">A carregar detalhes...</p>
            ) : productDetail.isError ? (
              <p className="m-5 rounded-xl bg-danger-surface px-3.5 py-3 text-sm text-danger" role="alert">{getApiErrorMessage(productDetail.error)}</p>
            ) : productDetail.data ? (
              <div className="space-y-4 p-5">
                {productDetail.data.image_urls.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto">
                    {productDetail.data.image_urls.map((url) => {
                      const image = resolveAssetUrl(url)
                      return image ? <img alt={productDetail.data!.name} className="h-28 w-28 rounded-xl object-cover" key={url} src={image} /> : null
                    })}
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold text-ink">{productDetail.data.name}</h3>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted">{productDetail.data.description || 'Sem descrição.'}</p>
                </div>
                <dl className="grid gap-3 rounded-xl bg-canvas p-4 sm:grid-cols-2">
                  <div><dt className="text-xs text-muted">Preço</dt><dd className="mt-1 text-sm font-medium text-ink">{currency.format(Number(productDetail.data.price))}</dd></div>
                  <div><dt className="text-xs text-muted">Stock</dt><dd className="mt-1 text-sm font-medium text-ink">{productDetail.data.stock}</dd></div>
                  <div><dt className="text-xs text-muted">Categoria</dt><dd className="mt-1 text-sm font-medium text-ink">{productDetail.data.category_name ?? 'Sem categoria'}</dd></div>
                  <div><dt className="text-xs text-muted">Estado</dt><dd className="mt-1 text-sm font-medium text-ink">{productDetail.data.stock_status === 'out_of_stock' ? 'Sem stock' : productDetail.data.stock_status === 'low_stock' ? 'Stock baixo' : 'Disponível'}</dd></div>
                </dl>
                <div className="flex justify-end border-t border-line pt-4">
                  <Button onClick={() => { openEditForm(productDetail.data!); setSelectedProductId(null) }} variant="primary"><Pencil aria-hidden="true" className="h-4 w-4" />Editar produto</Button>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      )}
    </>
  )
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Não foi possível ler o ficheiro de imagem.'))
    })
    reader.addEventListener('error', () => reject(new Error('Não foi possível ler o ficheiro de imagem.')))
    reader.readAsDataURL(file)
  })
}
