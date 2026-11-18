import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDown,
  ArrowUp,
  CircleAlert,
  Image as ImageIcon,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { EmptyState } from '../../../components/ui/EmptyState'
import { getApiErrorMessage } from '../../../lib/api/errors'
import {
  adminApi,
  resolveAssetUrl,
  type Banner,
  type BannerAlignment,
  type BannerDestinationType,
  type BannerFields,
  type BannerType,
  type Product,
} from '../../admin/adminApi'
import {
  bannerStatus,
  bannerStatusLabels,
  blankBannerForm,
  toBannerFields,
  toBannerFormState,
  validateBannerForm,
  type BannerFormState,
  type BannerStatus,
} from '../utils/bannerForm'

const destinationLabels: Record<BannerDestinationType, string> = {
  none: 'Sem destino',
  product: 'Produto',
  category: 'Categoria',
  url: 'URL externa',
  product_list: 'Lista de produtos',
}

const bannerTypeLabels: Record<BannerType, string> = {
  promotion: 'Promoção',
  category: 'Categoria',
  product: 'Produto',
  announcement: 'Anúncio',
}

const alignmentLabels: Record<BannerAlignment, string> = {
  left: 'Esquerda',
  center: 'Centro',
  right: 'Direita',
}

const statusStyles: Record<BannerStatus, string> = {
  active: 'bg-success-surface text-success',
  scheduled: 'bg-info-surface text-info',
  expired: 'bg-warning-surface text-warning',
  inactive: 'bg-canvas text-muted',
}

const dateFormatter = new Intl.DateTimeFormat('pt-MZ', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function formatDate(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date)
}

function destinationText(banner: Banner): string {
  if (banner.destination_type === 'product') return `Produto #${banner.product_id ?? '—'}`
  if (banner.destination_type === 'category') return `Categoria #${banner.category_id ?? '—'}`
  if (banner.destination_type === 'url') return banner.destination_url || '—'
  if (banner.destination_type === 'product_list') return `${banner.products.length} produto(s)`
  return destinationLabels.none
}

interface SaveVariables {
  id: number | null
  fields: BannerFields
  image: File | null
  mobileImage: File | null
  clearMobileImage: boolean
}

export function BannersPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [form, setForm] = useState<BannerFormState>({ ...blankBannerForm })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [mobileImageFile, setMobileImageFile] = useState<File | null>(null)
  const [removeMobileImage, setRemoveMobileImage] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState('')
  const [saveMessageIsError, setSaveMessageIsError] = useState(false)

  const banners = useQuery({
    queryKey: ['admin', 'banners', { page }],
    queryFn: () => adminApi.listBanners({ page, limit: 20 }),
  })
  const categories = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: adminApi.listCategories,
  })
  const productQuery = useQuery({
    queryKey: ['admin', 'banner-product-options', productSearch.trim()],
    queryFn: () =>
      adminApi.listProducts({
        q: productSearch.trim() || undefined,
        page: 1,
        limit: 50,
      }),
  })
  const saveBanner = useMutation({
    mutationFn: async ({
      id,
      fields,
      image,
      mobileImage,
      clearMobileImage,
    }: SaveVariables) => {
      if (image || mobileImage) {
        if (!image) {
          throw new Error('Selecione a imagem principal para enviar a imagem mobile.')
        }
        const uploaded = await adminApi.uploadBannerImages(image, mobileImage)
        return id
          ? adminApi.updateBanner(id, {
              ...fields,
              image_url: uploaded.image_url,
              mobile_image_url: mobileImage
                ? uploaded.mobile_image_url
                : fields.mobile_image_url,
            })
          : adminApi.createBanner({
              ...fields,
              image_url: uploaded.image_url,
              mobile_image_url: mobileImage
                ? uploaded.mobile_image_url
                : fields.mobile_image_url,
            })
      }

      const payload: BannerFields = clearMobileImage
        ? { ...fields, mobile_image_url: null }
        : fields
      return id
        ? adminApi.updateBanner(id, payload)
        : adminApi.createBanner(payload)
    },
    onSuccess: async (_result, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] })
      setFormOpen(false)
      setEditingId(null)
      setFormError(null)
      setSaveMessageIsError(false)
      setSaveMessage(variables.id ? 'Banner atualizado.' : 'Banner criado.')
    },
  })

  const deleteBanner = useMutation({
    mutationFn: adminApi.deleteBanner,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] }),
  })

  function update<K extends keyof BannerFormState>(
    key: K,
    value: BannerFormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function openCreate() {
    setEditingId(null)
    setForm({ ...blankBannerForm })
    setImageFile(null)
    setMobileImageFile(null)
    setRemoveMobileImage(false)
    setProductSearch('')
    setFormError(null)
    setSaveMessage('')
    saveBanner.reset()
    setFormOpen(true)
  }

  async function openEdit(id: number) {
    setLoadingDetail(true)
    try {
      const detail = await queryClient.fetchQuery({
        queryKey: ['admin', 'banner', id],
        queryFn: () => adminApi.getBanner(id),
      })
      setForm(toBannerFormState(detail))
      setEditingId(id)
      setImageFile(null)
      setMobileImageFile(null)
      setRemoveMobileImage(false)
      setProductSearch('')
      setFormError(null)
      setSaveMessage('')
      saveBanner.reset()
      setFormOpen(true)
    } catch (error) {
      setSaveMessageIsError(true)
      setSaveMessage(`Não foi possível carregar o banner: ${getApiErrorMessage(error)}`)
    } finally {
      setLoadingDetail(false)
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = toBannerFields(form)
    const validationError = validateBannerForm(fields)
    if (validationError) {
      setFormError(validationError)
      return
    }
    if (
      (imageFile && imageFile.size > 5 * 1024 * 1024) ||
      (mobileImageFile && mobileImageFile.size > 5 * 1024 * 1024)
    ) {
      setFormError('Cada imagem deve ter no máximo 5 MB.')
      return
    }
    setFormError(null)
    await saveBanner.mutateAsync({
      id: editingId,
      fields,
      image: imageFile,
      mobileImage: mobileImageFile,
      clearMobileImage: removeMobileImage,
    }).catch(() => undefined)
  }

  async function remove(banner: Banner) {
    if (!window.confirm(`Eliminar o banner “${banner.name}”?`)) return
    await deleteBanner.mutateAsync(banner.id).catch(() => undefined)
  }

  const allProducts = productQuery.data?.items ?? []
  const selectedProducts = form.products ?? []
  const selectedIds = new Set(selectedProducts.map((item) => item.product_id))
  const productName = (id: number) =>
    allProducts.find((item) => item.id === id)?.name ?? `Produto #${id}`
  const availableProducts = allProducts.filter(
    (item) => !selectedIds.has(item.id),
  )
  const singleProductOptions: Product[] =
    form.product_id &&
    !allProducts.some((item) => item.id === form.product_id)
      ? [
          {
            id: form.product_id,
            name: `Produto #${form.product_id}`,
            description: null,
            price: 0,
            stock: 0,
            stock_status: 'in_stock',
            image_url: null,
            image_urls: [],
            category_id: null,
            category_name: null,
            is_popular: false,
            is_new_arrival: false,
          },
          ...allProducts,
        ]
      : allProducts

  function addProduct(id: number) {
    if (!id || selectedIds.has(id)) return
    update('products', [
      ...selectedProducts,
      { product_id: id, sort_order: selectedProducts.length },
    ])
    setProductSearch('')
  }

  function moveProduct(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= selectedProducts.length) return
    const next = [...selectedProducts]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    update(
      'products',
      next.map((product, order) => ({ ...product, sort_order: order })),
    )
  }

  function removeProduct(id: number) {
    update(
      'products',
      selectedProducts
        .filter((item) => item.product_id !== id)
        .map((product, order) => ({ ...product, sort_order: order })),
    )
  }

  const imagePreview = resolveAssetUrl(form.image_url)

  return (
    <>
      <Card
        actions={
          <Button onClick={openCreate} variant="primary">
            <Plus aria-hidden="true" className="h-4 w-4" />
            Novo banner
          </Button>
        }
        description="Cria, agenda e ordena os banners apresentados na loja."
        title="Banners promocionais"
      >
        {saveMessage && (
          <p
            className={`mb-4 rounded-xl px-3.5 py-3 text-sm ${saveMessageIsError ? 'bg-warning-surface text-warning' : 'bg-success-surface text-success'}`}
            role={saveMessageIsError ? 'alert' : 'status'}
          >
            {saveMessage}
          </p>
        )}
        {(banners.isError || deleteBanner.isError) && (
          <p className="mb-4 flex items-center gap-2 rounded-xl bg-danger-surface px-3.5 py-3 text-sm text-danger" role="alert">
            <CircleAlert aria-hidden="true" className="h-4 w-4 shrink-0" />
            {getApiErrorMessage(banners.error ?? deleteBanner.error)}
          </p>
        )}
        {banners.isLoading ? (
          <p className="py-12 text-center text-sm text-muted">A carregar banners...</p>
        ) : banners.data?.items.length ? (
          <>
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-canvas text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Banner</th>
                    <th className="px-4 py-3 font-semibold">Tipo</th>
                    <th className="px-4 py-3 font-semibold">Destino</th>
                    <th className="px-4 py-3 text-right font-semibold">Ordem</th>
                    <th className="px-4 py-3 font-semibold">Período</th>
                    <th className="px-4 py-3 font-semibold">Estado</th>
                    <th className="px-4 py-3 text-right font-semibold">Acções</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {banners.data.items.map((banner) => {
                    const image = resolveAssetUrl(banner.image_url)
                    const status = bannerStatus(banner)
                    return (
                      <tr key={banner.id}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {image ? (
                              <img alt="" className="h-10 w-16 rounded-lg object-cover" src={image} />
                            ) : (
                              <span className="flex h-10 w-16 items-center justify-center rounded-lg bg-canvas text-muted">
                                <ImageIcon aria-hidden="true" className="h-5 w-5" />
                              </span>
                            )}
                            <div className="min-w-0">
                              <span className="block font-medium text-ink">{banner.name}</span>
                              <span className="block text-xs text-muted">{banner.title_pt}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {bannerTypeLabels[banner.banner_type]}
                        </td>
                        <td className="px-4 py-3 text-muted">{destinationText(banner)}</td>
                        <td className="px-4 py-3 text-right text-ink">{banner.sort_order}</td>
                        <td className="px-4 py-3 text-xs text-muted">
                          <span>Início: {formatDate(banner.starts_at)}</span>
                          <span className="block">Fim: {formatDate(banner.expires_at)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs ${statusStyles[status]}`}>
                            {bannerStatusLabels[status]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <Button
                              aria-label={`Editar ${banner.name}`}
                              disabled={loadingDetail}
                              onClick={() => void openEdit(banner.id)}
                              size="sm"
                              variant="ghost"
                            >
                              <Pencil aria-hidden="true" className="h-4 w-4" />
                            </Button>
                            <Button
                              aria-label={`Eliminar ${banner.name}`}
                              disabled={deleteBanner.isPending}
                              onClick={() => void remove(banner)}
                              size="sm"
                              variant="ghost"
                            >
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
              <span>{banners.data.total} banner(s)</span>
              <div className="flex items-center gap-2">
                <Button
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                  size="sm"
                >
                  Anterior
                </Button>
                <span>Página {banners.data.page} de {Math.max(banners.data.totalPages, 1)}</span>
                <Button
                  disabled={page >= banners.data.totalPages}
                  onClick={() => setPage((current) => current + 1)}
                  size="sm"
                >
                  Seguinte
                </Button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState
            action={<Button onClick={openCreate} variant="primary"><Plus aria-hidden="true" className="h-4 w-4" />Criar banner</Button>}
            description="Cria banners para destacar promoções, produtos e categorias na loja."
            icon={ImageIcon}
            title="Ainda não existem banners"
          />
        )}
      </Card>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/40 p-4" role="presentation">
          <section
            aria-labelledby="banner-form-title"
            aria-modal="true"
            className="my-auto w-full max-w-4xl rounded-2xl bg-white shadow-xl"
            role="dialog"
          >
            <header className="flex items-start justify-between border-b border-line px-5 py-4">
              <div>
                <h2 className="font-semibold text-ink" id="banner-form-title">
                  {editingId === null ? 'Novo banner' : 'Editar banner'}
                </h2>
                <p className="mt-1 text-xs text-muted">
                  Configura o conteúdo, o estilo e o destino do banner.
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

            <form className="space-y-5 p-5" onSubmit={(event) => void submit(event)}>
                <fieldset className="space-y-4">
                  <legend className="text-xs font-semibold uppercase tracking-wide text-muted">Conteúdo</legend>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-xs font-semibold text-ink">
                      Nome interno
                      <input
                        className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-sm font-normal"
                        maxLength={100}
                        onChange={(event) => update('name', event.target.value)}
                        required
                        value={form.name}
                      />
                    </label>
                    <label className="text-xs font-semibold text-ink">
                      Tipo de banner
                      <select
                        className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-normal"
                        onChange={(event) => update('banner_type', event.target.value as BannerType)}
                        value={form.banner_type}
                      >
                        {Object.entries(bannerTypeLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs font-semibold text-ink">
                      Título (PT)
                      <input
                        className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-sm font-normal"
                        maxLength={150}
                        onChange={(event) => update('title_pt', event.target.value)}
                        required
                        value={form.title_pt}
                      />
                    </label>
                    <label className="text-xs font-semibold text-ink">
                      Título (EN)
                      <input
                        className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-sm font-normal"
                        maxLength={150}
                        onChange={(event) => update('title_en', event.target.value || null)}
                        value={form.title_en ?? ''}
                      />
                    </label>
                    <label className="text-xs font-semibold text-ink">
                      Subtítulo (PT)
                      <input
                        className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-sm font-normal"
                        maxLength={250}
                        onChange={(event) => update('subtitle_pt', event.target.value || null)}
                        value={form.subtitle_pt ?? ''}
                      />
                    </label>
                    <label className="text-xs font-semibold text-ink">
                      Subtítulo (EN)
                      <input
                        className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-sm font-normal"
                        maxLength={250}
                        onChange={(event) => update('subtitle_en', event.target.value || null)}
                        value={form.subtitle_en ?? ''}
                      />
                    </label>
                  </div>
                </fieldset>

                <fieldset className="space-y-4 border-t border-line pt-4">
                  <legend className="text-xs font-semibold uppercase tracking-wide text-muted">Imagens</legend>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-xs font-semibold text-ink">
                      URL da imagem principal
                      <input
                        className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-sm font-normal"
                        maxLength={2048}
                        onChange={(event) => update('image_url', event.target.value.trim())}
                        value={form.image_url}
                      />
                    </label>
                    <label className="text-xs font-semibold text-ink">
                      URL da imagem mobile
                      <input
                        className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-sm font-normal"
                        maxLength={2048}
                        onChange={(event) => update('mobile_image_url', event.target.value.trim() || null)}
                        value={form.mobile_image_url ?? ''}
                      />
                    </label>
                    <label className="text-xs font-semibold text-ink">
                      Carregar imagem principal (JPG, PNG ou WebP; até 5 MB)
                      <input
                        accept="image/png,image/jpeg,image/webp"
                        className="mt-1.5 block w-full text-xs font-normal text-muted"
                        onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
                        type="file"
                      />
                    </label>
                    <label className="text-xs font-semibold text-ink">
                      Carregar imagem mobile (opcional)
                      <input
                        accept="image/png,image/jpeg,image/webp"
                        className="mt-1.5 block w-full text-xs font-normal text-muted"
                        onChange={(event) => setMobileImageFile(event.target.files?.[0] ?? null)}
                        type="file"
                      />
                    </label>
                  </div>
                  {imagePreview && (
                    <img
                      alt="Pré-visualização do banner"
                      className="h-32 w-full rounded-xl border border-line object-cover"
                      src={imagePreview}
                    />
                  )}
                  <label className="flex items-center gap-2 text-sm text-ink">
                    <input
                      checked={removeMobileImage}
                      onChange={(event) => setRemoveMobileImage(event.target.checked)}
                      type="checkbox"
                    />
                    Remover a imagem mobile atual
                  </label>
                </fieldset>

                <fieldset className="space-y-4 border-t border-line pt-4">
                  <legend className="text-xs font-semibold uppercase tracking-wide text-muted">Estilo</legend>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <label className="text-xs font-semibold text-ink">
                      Fundo
                      <input className="mt-1.5 h-10 w-full rounded-xl border border-line" onChange={(event) => update('background_color', event.target.value)} type="color" value={form.background_color} />
                    </label>
                    <label className="text-xs font-semibold text-ink">
                      Título
                      <input className="mt-1.5 h-10 w-full rounded-xl border border-line" onChange={(event) => update('title_color', event.target.value)} type="color" value={form.title_color} />
                    </label>
                    <label className="text-xs font-semibold text-ink">
                      Subtítulo
                      <input className="mt-1.5 h-10 w-full rounded-xl border border-line" onChange={(event) => update('subtitle_color', event.target.value)} type="color" value={form.subtitle_color ?? '#E5E7EB'} />
                    </label>
                    <label className="text-xs font-semibold text-ink">
                      Botão
                      <input className="mt-1.5 h-10 w-full rounded-xl border border-line" onChange={(event) => update('button_color', event.target.value)} type="color" value={form.button_color ?? '#2563EB'} />
                    </label>
                    <label className="text-xs font-semibold text-ink">
                      Texto do botão
                      <input className="mt-1.5 h-10 w-full rounded-xl border border-line" onChange={(event) => update('button_text_color', event.target.value)} type="color" value={form.button_text_color ?? '#FFFFFF'} />
                    </label>
                    <label className="text-xs font-semibold text-ink">
                      Alinhamento
                      <select
                        className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-normal"
                        onChange={(event) => update('alignment', event.target.value as BannerAlignment)}
                        value={form.alignment}
                      >
                        {Object.entries(alignmentLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs font-semibold text-ink">
                      Opacidade da camada ({Math.round(form.overlay_opacity * 100)}%)
                      <input
                        className="mt-1.5 w-full"
                        max="1"
                        min="0"
                        onChange={(event) => update('overlay_opacity', Number(event.target.value))}
                        step="0.05"
                        type="range"
                        value={form.overlay_opacity}
                      />
                    </label>
                    <label className="text-xs font-semibold text-ink">
                      Ordem de exibição
                      <input
                        className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-sm font-normal"
                        onChange={(event) => update('sort_order', Number(event.target.value))}
                        step="1"
                        type="number"
                        value={form.sort_order}
                      />
                    </label>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-xs font-semibold text-ink">
                      Texto do botão (PT)
                      <input className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-sm font-normal" maxLength={50} onChange={(event) => update('button_text_pt', event.target.value || null)} value={form.button_text_pt ?? ''} />
                    </label>
                    <label className="text-xs font-semibold text-ink">
                      Texto do botão (EN)
                      <input className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-sm font-normal" maxLength={50} onChange={(event) => update('button_text_en', event.target.value || null)} value={form.button_text_en ?? ''} />
                    </label>
                  </div>
                </fieldset>

                <fieldset className="space-y-4 border-t border-line pt-4">
                  <legend className="text-xs font-semibold uppercase tracking-wide text-muted">Destino</legend>
                  <label className="block text-xs font-semibold text-ink">
                    Tipo de destino
                    <select
                      className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-normal"
                      onChange={(event) => {
                        const destinationType = event.target.value as BannerDestinationType
                        setForm((current) => ({
                          ...current,
                          destination_type: destinationType,
                          product_id: destinationType === 'product' ? current.product_id : null,
                          category_id: destinationType === 'category' ? current.category_id : null,
                          destination_url: destinationType === 'url' ? current.destination_url : null,
                          products: destinationType === 'product_list' ? current.products : [],
                        }))
                      }}
                      value={form.destination_type}
                    >
                      {Object.entries(destinationLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </label>

                  {form.destination_type === 'product' && (
                    <label className="block text-xs font-semibold text-ink">
                      Produto
                      <select
                        className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-normal"
                        onChange={(event) => update('product_id', event.target.value ? Number(event.target.value) : null)}
                        value={form.product_id ?? ''}
                      >
                        <option value="">Selecciona um produto</option>
                        {singleProductOptions.map((item) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </label>
                  )}

                  {form.destination_type === 'category' && (
                    <label className="block text-xs font-semibold text-ink">
                      Categoria
                      <select
                        className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-normal"
                        onChange={(event) => update('category_id', event.target.value ? Number(event.target.value) : null)}
                        value={form.category_id ?? ''}
                      >
                        <option value="">Selecciona uma categoria</option>
                        {categories.data?.map((item) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </label>
                  )}

                  {form.destination_type === 'url' && (
                    <label className="block text-xs font-semibold text-ink">
                      URL de destino
                      <input
                        className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-sm font-normal"
                        maxLength={2048}
                        onChange={(event) => update('destination_url', event.target.value.trim() || null)}
                        placeholder="https://exemplo.pt/promocao"
                        value={form.destination_url ?? ''}
                      />
                    </label>
                  )}

                  {form.destination_type === 'product_list' && (
                    <div className="space-y-3 rounded-xl border border-line p-3">
                      <p className="text-xs text-muted">
                        Produtos associados (máximo 100). A ordem da lista define a ordem na vitrine.
                      </p>
                      <div className="flex gap-2">
                        <input
                          aria-label="Pesquisar produto para associar"
                          className="w-full rounded-xl border border-line px-3 py-2 text-sm"
                          onChange={(event) => setProductSearch(event.target.value)}
                          placeholder="Pesquisar produto..."
                          value={productSearch}
                        />
                        <select
                          aria-label="Produto a associar"
                          className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm"
                          disabled={productQuery.isFetching}
                          onChange={(event) => addProduct(Number(event.target.value))}
                          value=""
                        >
                          <option value="">
                            {productQuery.isFetching ? 'A pesquisar...' : 'Adicionar produto...'}
                          </option>
                          {availableProducts.map((item) => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                          ))}
                        </select>
                      </div>
                      {productQuery.isError && (
                        <p className="text-xs text-danger" role="alert">
                          Não foi possível carregar os produtos: {getApiErrorMessage(productQuery.error)}
                        </p>
                      )}
                      {selectedProducts.length ? (
                        <ul className="space-y-2">
                          {selectedProducts.map((item, index) => (
                            <li className="flex items-center gap-2 rounded-lg bg-canvas px-3 py-2 text-sm text-ink" key={item.product_id}>
                              <span className="w-6 text-xs text-muted">{index + 1}</span>
                              <span className="flex-1">{productName(item.product_id)}</span>
                              <Button
                                aria-label={`Subir ${productName(item.product_id)}`}
                                disabled={index === 0}
                                onClick={() => moveProduct(index, -1)}
                                size="sm"
                                variant="ghost"
                              >
                                <ArrowUp aria-hidden="true" className="h-4 w-4" />
                              </Button>
                              <Button
                                aria-label={`Descer ${productName(item.product_id)}`}
                                disabled={index === selectedProducts.length - 1}
                                onClick={() => moveProduct(index, 1)}
                                size="sm"
                                variant="ghost"
                              >
                                <ArrowDown aria-hidden="true" className="h-4 w-4" />
                              </Button>
                              <Button
                                aria-label={`Remover ${productName(item.product_id)}`}
                                onClick={() => removeProduct(item.product_id)}
                                size="sm"
                                variant="ghost"
                              >
                                <X aria-hidden="true" className="h-4 w-4 text-danger" />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-muted">Ainda não há produtos associados.</p>
                      )}
                    </div>
                  )}
                </fieldset>

                <fieldset className="space-y-4 border-t border-line pt-4">
                  <legend className="text-xs font-semibold uppercase tracking-wide text-muted">Publicação</legend>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-xs font-semibold text-ink">
                      Início
                      <input
                        className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-sm font-normal"
                        onChange={(event) => update('starts_at', event.target.value)}
                        type="datetime-local"
                        value={form.starts_at}
                      />
                    </label>
                    <label className="text-xs font-semibold text-ink">
                      Expiração
                      <input
                        className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-sm font-normal"
                        onChange={(event) => update('expires_at', event.target.value)}
                        type="datetime-local"
                        value={form.expires_at}
                      />
                    </label>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-ink">
                    <input
                      checked={form.is_active}
                      onChange={(event) => update('is_active', event.target.checked)}
                      type="checkbox"
                    />
                    Banner ativo
                  </label>
                </fieldset>

                {formError && (
                  <p className="flex items-center gap-2 rounded-lg bg-warning-surface px-3 py-2.5 text-sm text-warning" role="alert">
                    <CircleAlert aria-hidden="true" className="h-4 w-4" />
                    {formError}
                  </p>
                )}
                {saveBanner.isError && (
                  <p className="flex items-center gap-2 rounded-lg bg-danger-surface px-3 py-2.5 text-sm text-danger" role="alert">
                    <CircleAlert aria-hidden="true" className="h-4 w-4" />
                    {getApiErrorMessage(saveBanner.error)}
                  </p>
                )}
                <footer className="flex justify-end gap-2 border-t border-line pt-4">
                  <Button onClick={() => setFormOpen(false)}>Cancelar</Button>
                  <Button
                    disabled={saveBanner.isPending}
                    type="submit"
                    variant="primary"
                  >
                    {saveBanner.isPending && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}
                    {saveBanner.isPending ? 'A guardar...' : 'Guardar banner'}
                  </Button>
                </footer>
            </form>
          </section>
        </div>
      )}
    </>
  )
}
