import type { Banner, BannerFields, BannerProductRef } from '../../admin/adminApi'

export type BannerFormState = Omit<BannerFields, 'starts_at' | 'expires_at'> & {
  starts_at: string
  expires_at: string
}

export const blankBannerFields: BannerFields = {
  name: '',
  title_pt: '',
  title_en: null,
  subtitle_pt: null,
  subtitle_en: null,
  image_url: '',
  mobile_image_url: null,
  background_color: '#111827',
  title_color: '#FFFFFF',
  subtitle_color: '#E5E7EB',
  button_text_pt: null,
  button_text_en: null,
  button_color: null,
  button_text_color: null,
  alignment: 'left',
  overlay_opacity: 0,
  banner_type: 'promotion',
  destination_type: 'none',
  product_id: null,
  category_id: null,
  destination_url: null,
  starts_at: null,
  expires_at: null,
  is_active: true,
  sort_order: 0,
  products: [],
}

export const blankBannerForm: BannerFormState = {
  ...blankBannerFields,
  starts_at: '',
  expires_at: '',
}

export function toDateTimeLocal(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16)
}

export function fromDateTimeLocal(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function toBannerFormState(banner: Banner | null): BannerFormState {
  if (!banner) return { ...blankBannerForm }
  return {
    name: banner.name,
    title_pt: banner.title_pt,
    title_en: banner.title_en,
    subtitle_pt: banner.subtitle_pt,
    subtitle_en: banner.subtitle_en,
    image_url: banner.image_url,
    mobile_image_url: banner.mobile_image_url,
    background_color: banner.background_color,
    title_color: banner.title_color,
    subtitle_color: banner.subtitle_color,
    button_text_pt: banner.button_text_pt,
    button_text_en: banner.button_text_en,
    button_color: banner.button_color,
    button_text_color: banner.button_text_color,
    alignment: banner.alignment,
    overlay_opacity: banner.overlay_opacity,
    banner_type: banner.banner_type,
    destination_type: banner.destination_type,
    product_id: banner.product_id,
    category_id: banner.category_id,
    destination_url: banner.destination_url,
    starts_at: toDateTimeLocal(banner.starts_at),
    expires_at: toDateTimeLocal(banner.expires_at),
    is_active: banner.is_active,
    sort_order: banner.sort_order,
    products: banner.products.map((item) => ({ ...item })),
  }
}

export function toBannerFields(state: BannerFormState): BannerFields {
  const { starts_at, expires_at, ...rest } = state
  const selectedProducts = rest.products ?? []
  const products: BannerProductRef[] | undefined =
    state.destination_type === 'product_list'
      ? selectedProducts.map((item, index) => ({
          product_id: item.product_id,
          sort_order: index,
        }))
      : undefined
  return {
    ...rest,
    starts_at: fromDateTimeLocal(starts_at),
    expires_at: fromDateTimeLocal(expires_at),
    products,
  }
}

export function validateBannerForm(fields: BannerFields): string | null {
  if (!fields.name.trim()) return 'Indica o nome interno do banner.'
  if (!fields.title_pt.trim()) return 'Indica o título em português.'
  if (!fields.image_url.trim()) return 'Carrega uma imagem principal ou indica o URL da imagem.'

  if (fields.starts_at && fields.expires_at) {
    if (new Date(fields.expires_at) <= new Date(fields.starts_at)) {
      return 'A data de expiração deve ser posterior à data de início.'
    }
  }

  if (fields.destination_type === 'product' && fields.product_id === null) {
    return 'Selecciona o produto de destino.'
  }
  if (fields.destination_type === 'category' && fields.category_id === null) {
    return 'Selecciona a categoria de destino.'
  }
  if (
    fields.destination_type === 'url' &&
    !(fields.destination_url ?? '').trim()
  ) {
    return 'Indica o URL de destino.'
  }
  if (fields.destination_type === 'product_list') {
    if (fields.is_active && !(fields.products?.length ?? 0)) {
      return 'Um banner ativo com lista de produtos necessita de pelo menos um produto.'
    }
    const ids = fields.products?.map((item) => item.product_id) ?? []
    if (new Set(ids).size !== ids.length) {
      return 'A lista de produtos não pode conter duplicados.'
    }
  }

  return null
}

export type BannerStatus = 'active' | 'scheduled' | 'expired' | 'inactive'

export const bannerStatusLabels: Record<BannerStatus, string> = {
  active: 'Ativo',
  scheduled: 'Agendado',
  expired: 'Expirado',
  inactive: 'Inativo',
}

export function bannerStatus(banner: Banner): BannerStatus {
  if (!banner.is_active) return 'inactive'
  const now = Date.now()
  if (banner.starts_at && new Date(banner.starts_at).getTime() > now) {
    return 'scheduled'
  }
  if (banner.expires_at && new Date(banner.expires_at).getTime() <= now) {
    return 'expired'
  }
  return 'active'
}
