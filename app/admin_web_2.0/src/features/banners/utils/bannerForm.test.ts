import { describe, expect, it } from 'vitest'
import type { Banner } from '../../admin/adminApi'
import {
  bannerStatus,
  blankBannerFields,
  fromDateTimeLocal,
  toBannerFields,
  toDateTimeLocal,
  toBannerFormState,
  validateBannerForm,
} from './bannerForm'

const banner: Banner = {
  ...blankBannerFields,
  id: 7,
  products: [{ product_id: 3, sort_order: 5 }],
  starts_at: '2026-11-18T10:00:00.000Z',
  expires_at: null,
}

describe('bannerForm', () => {
  it('converts an admin banner to local datetime inputs and back to ISO', () => {
    const state = toBannerFormState(banner)

    expect(state.starts_at).toContain('T')
    expect(state.expires_at).toBe('')
    expect(fromDateTimeLocal(state.starts_at)).toBe(banner.starts_at)
  })

  it('omits products unless the destination is a product list', () => {
    const state = toBannerFormState(banner)

    expect(toBannerFields(state).products).toBeUndefined()

    const listState = {
      ...state,
      destination_type: 'product_list' as const,
      products: [
        { product_id: 9, sort_order: 8 },
        { product_id: 4, sort_order: 2 },
      ],
    }
    expect(toBannerFields(listState).products).toEqual([
      { product_id: 9, sort_order: 0 },
      { product_id: 4, sort_order: 1 },
    ])
  })

  it('validates required fields, date range and product list rules', () => {
    expect(validateBannerForm(blankBannerFields)).toContain('nome')

    const withTitle = {
      ...blankBannerFields,
      name: 'Banner',
      title_pt: 'Título',
      image_url: '/uploads/banners/main.png',
    }
    expect(validateBannerForm(withTitle)).toBeNull()

    expect(
      validateBannerForm({
        ...withTitle,
        starts_at: '2026-11-19T10:00:00.000Z',
        expires_at: '2026-11-18T10:00:00.000Z',
      }),
    ).toContain('expiração')

    expect(
      validateBannerForm({
        ...withTitle,
        destination_type: 'product_list',
        products: [],
      }),
    ).toContain('produto')

    expect(
      validateBannerForm({
        ...withTitle,
        destination_type: 'product_list',
        products: [{ product_id: 3, sort_order: 0 }],
      }),
    ).toBeNull()
  })

  it('derives publication status from dates and active flag', () => {
    expect(bannerStatus({ ...banner, is_active: false })).toBe('inactive')
    expect(
      bannerStatus({
        ...banner,
        starts_at: new Date(Date.now() + 60_000).toISOString(),
      }),
    ).toBe('scheduled')
    expect(
      bannerStatus({
        ...banner,
        starts_at: null,
        expires_at: new Date(Date.now() - 60_000).toISOString(),
      }),
    ).toBe('expired')
    expect(bannerStatus({ ...banner, starts_at: null })).toBe('active')
  })

  it('handles empty datetime values', () => {
    expect(toDateTimeLocal(null)).toBe('')
    expect(fromDateTimeLocal('')).toBeNull()
  })
})
