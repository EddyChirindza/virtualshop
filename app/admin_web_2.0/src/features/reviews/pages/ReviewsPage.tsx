import { useState } from 'react'
import { CircleAlert, MessageSquareText, Package, Search, Star, Trash2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Card } from '../../../components/ui/Card'
import { EmptyState } from '../../../components/ui/EmptyState'
import { StatCard } from '../../../components/ui/StatCard'
import { getApiErrorMessage } from '../../../lib/api/errors'
import { adminApi, resolveAssetUrl } from '../../admin/adminApi'

const pageSize = 50

export function ReviewsPage() {
  const [page, setPage] = useState(1)
  const [rating, setRating] = useState<number | undefined>()
  const [productId, setProductId] = useState<number | undefined>()
  const [query, setQuery] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const report = useQuery({
    queryKey: ['admin', 'product-reviews', page, rating, productId, query],
    queryFn: () => adminApi.listProductReviews({ page, limit: pageSize, rating, productId, q: query || undefined }),
  })

  const data = report.data
  const average = data?.summary.average ?? 0
  const deleteReview = async (reviewId: number) => {
    if (!window.confirm('Eliminar esta avaliação? Os votos associados também serão removidos.')) return
    setDeletingId(reviewId)
    setDeleteError('')
    try {
      await adminApi.deleteProductReview(reviewId)
      await report.refetch()
    } catch (error) {
      setDeleteError(getApiErrorMessage(error))
    } finally {
      setDeletingId(null)
    }
  }
  const dateFormat = new Intl.DateTimeFormat('pt-MZ', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  return (
    <div className="space-y-6">
      {report.isError && (
        <p className="flex items-center gap-2 rounded-xl bg-danger-surface px-3.5 py-3 text-sm text-danger" role="alert">
          <CircleAlert aria-hidden="true" className="h-4 w-4 shrink-0" />
          {getApiErrorMessage(report.error)}
        </p>
      )}
      {deleteError && (
        <p className="flex items-center gap-2 rounded-xl bg-danger-surface px-3.5 py-3 text-sm text-danger" role="alert">
          <CircleAlert aria-hidden="true" className="h-4 w-4 shrink-0" />
          {deleteError}
        </p>
      )}

      <Card description="Filtre as avaliações por classificação, produto ou texto." title="Filtros">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="grid gap-1 text-sm text-muted">
            Classificação
            <select
              className="rounded-lg border border-line bg-white px-3 py-2 text-ink"
              value={rating ?? ''}
              onChange={(event) => {
                setPage(1)
                setRating(event.target.value ? Number(event.target.value) : undefined)
              }}
            >
              <option value="">Todas</option>
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>{value} estrelas</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm text-muted">
            Produto
            <select
              className="rounded-lg border border-line bg-white px-3 py-2 text-ink"
              value={productId ?? ''}
              onChange={(event) => {
                setPage(1)
                setProductId(event.target.value ? Number(event.target.value) : undefined)
              }}
            >
              <option value="">Todos</option>
              {data?.products.map((product) => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm text-muted">
            Pesquisa
            <div className="flex items-center gap-2 rounded-lg border border-line bg-white px-3">
              <Search aria-hidden="true" className="h-4 w-4 text-muted" />
              <input
                className="min-w-0 flex-1 py-2 text-ink outline-none"
                value={query}
                placeholder="Cliente, produto ou comentário"
                onChange={(event) => {
                  setPage(1)
                  setQuery(event.target.value)
                }}
              />
            </div>
          </label>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          hint="Avaliações enviadas pelos clientes."
          icon={MessageSquareText}
          label="Total de avaliações"
          value={String(data?.summary.total ?? 0)}
        />
        <StatCard
          hint="Média geral de todos os produtos avaliados."
          icon={Star}
          label="Classificação média"
          value={`${average.toFixed(1)} / 5`}
          tone="warning"
        />
        <StatCard
          hint="Produtos que já receberam pelo menos uma avaliação."
          icon={Package}
          label="Produtos avaliados"
          value={String(data?.summary.reviewedProducts ?? 0)}
          tone="blue"
        />
      </div>

      <Card
        description="Distribuição das classificações considerando todas as avaliações registadas."
        title="Balanço geral"
      >
        {report.isLoading ? (
          <p className="py-6 text-center text-sm text-muted">A carregar balanço...</p>
        ) : (
          <div className="space-y-3">
            {data?.summary.distribution.map((item) => {
              const percentage = data.summary.total
                ? (item.count / data.summary.total) * 100
                : 0
              return (
                <div className="grid grid-cols-[2.5rem_1fr_3rem] items-center gap-3" key={item.rating}>
                  <span className="flex items-center gap-1 text-sm font-medium text-ink">
                    {item.rating}<Star aria-hidden="true" className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  </span>
                  <div
                    aria-label={`${item.count} avaliação(ões), ${percentage.toFixed(0)}%`}
                    className="h-2.5 overflow-hidden rounded-full bg-canvas"
                    role="img"
                  >
                    <div className="h-full rounded-full bg-amber-400" style={{ width: `${percentage}%` }} />
                  </div>
                  <span className="text-right text-sm text-muted">{item.count}</span>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Card
        description="Média e quantidade de avaliações agrupadas por produto."
        title="Balanço por produto"
      >
        {report.isLoading ? (
          <p className="py-6 text-center text-sm text-muted">A carregar produtos avaliados...</p>
        ) : data?.products.length ? (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-canvas text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Produto</th>
                  <th className="px-4 py-3 text-right font-semibold">Média</th>
                  <th className="px-4 py-3 text-right font-semibold">Avaliações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.products.map((product) => {
                  const image = resolveAssetUrl(product.image_url)
                  return (
                    <tr key={product.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {image ? (
                            <img alt="" className="h-10 w-10 rounded-lg object-cover" src={image} />
                          ) : (
                            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-canvas text-muted">
                              <Package aria-hidden="true" className="h-4 w-4" />
                            </span>
                          )}
                          <span className="font-medium text-ink">{product.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center justify-end gap-1 font-semibold text-ink">
                          {product.averageRating.toFixed(1)}
                          <Star aria-hidden="true" className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-muted">{product.reviewCount}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            description="Quando os clientes avaliarem produtos, o balanço por produto aparecerá aqui."
            icon={Package}
            title="Ainda não há produtos avaliados"
          />
        )}
      </Card>

      <Card
        description="Avaliações recentes, incluindo o produto e o cliente que as enviou."
        title="Avaliações dos clientes"
      >
        {report.isLoading ? (
          <p className="py-6 text-center text-sm text-muted">A carregar avaliações...</p>
        ) : data?.reviews.length ? (
          <>
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-canvas text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Produto</th>
                    <th className="px-4 py-3 font-semibold">Cliente</th>
                    <th className="px-4 py-3 text-right font-semibold">Classificação</th>
                    <th className="px-4 py-3 font-semibold">Comentário</th>
                    <th className="px-4 py-3 text-right font-semibold">Data</th>
                    <th className="px-4 py-3 text-right font-semibold">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.reviews.map((review) => (
                    <tr key={review.id}>
                      <td className="px-4 py-3 font-medium text-ink">{review.product.name}</td>
                      <td className="px-4 py-3 text-muted">{review.customer.name}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center justify-end gap-1 font-semibold text-ink">
                          {review.rating}
                          <Star aria-hidden="true" className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        </span>
                      </td>
                      <td className="max-w-sm whitespace-pre-wrap px-4 py-3 text-muted">
                        {review.comment || '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-muted">
                        {dateFormat.format(new Date(review.createdAt))}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg border border-danger px-2.5 py-1.5 text-xs text-danger disabled:opacity-50"
                          disabled={deletingId === review.id}
                          onClick={() => void deleteReview(review.id)}
                        >
                          <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                          {deletingId === review.id ? 'A eliminar...' : 'Eliminar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted">
              <span>{data.total} avaliação(ões)</span>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-lg border border-line px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                  type="button"
                >
                  Anterior
                </button>
                <span>Página {data.page} de {Math.max(data.totalPages, 1)}</span>
                <button
                  className="rounded-lg border border-line px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((current) => current + 1)}
                  type="button"
                >
                  Seguinte
                </button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState
            description="Ainda não foram enviadas avaliações pelos clientes."
            icon={MessageSquareText}
            title="Ainda não há avaliações"
          />
        )}
      </Card>
    </div>
  )
}
