import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { apiClient } from '../../lib/api/client'
import {
  adminApi,
  createProductWithOptionalNotification,
  type ProductFields,
} from './adminApi'

describe('adminApi', () => {
  const originalAdapter = apiClient.defaults.adapter
  const requests: Array<{
    url: string
    method: string
    params: unknown
    data: unknown
  }> = []
  let adapter: AxiosAdapter
  let notificationFails = false
  let productCreationFails = false

  beforeEach(() => {
    requests.length = 0
    notificationFails = false
    productCreationFails = false
    adapter = async (config: InternalAxiosRequestConfig) => {
      requests.push({
        url: config.url ?? '',
        method: config.method ?? '',
        params: config.params,
        data: config.data,
      })
      if (
        (config.url === '/admin/notifications' && notificationFails) ||
        (config.url === '/products' && config.method === 'post' && productCreationFails)
      ) {
        const error = new Error('Notification request failed') as Error & {
          config: InternalAxiosRequestConfig
          response: AxiosResponse
          isAxiosError: boolean
        }
        error.config = config
        error.response = {
          data: { success: false, message: 'Request failed' },
          status: 500,
          statusText: 'Internal Server Error',
          headers: {},
          config,
        }
        error.isAxiosError = true
        throw error
      }
      const product = {
        id: 27,
        name: 'Café',
        description: null,
        price: '125.50',
        stock: 7,
        stock_status: 'in_stock',
        image_url: null,
        image_urls: [],
        category_id: null,
        category_name: null,
        is_popular: false,
        is_new_arrival: true,
      }
      const administrator = {
        id: 9,
        full_name: 'Ana Admin',
        phone: '+258841234567',
        email: 'ana@example.com',
        role: 'admin',
        is_active: true,
        created_at: '2026-11-05T10:00:00.000Z',
        last_login_at: null,
      }
      const data = config.url === '/products' && config.method === 'post'
        ? product
        : config.url === '/admin/administrators' && config.method === 'get'
          ? [administrator]
          : config.url === '/admin/administrators' && config.method === 'post'
            ? { ...administrator, ...JSON.parse(String(config.data)) }
            : config.url?.startsWith('/admin/administrators/') && config.method === 'patch'
              ? { ...administrator, ...JSON.parse(String(config.data)) }
              : config.url === '/admin/orders'
                ? { items: [], page: 1, limit: 50, total: 0, totalPages: 0 }
                : config.url === '/admin/notifications' && config.method === 'post'
                  ? { id: 54, ...JSON.parse(String(config.data)) }
                  : [
              {
              id: 3,
              name: 'Café',
              description: null,
              price: '125.50',
              stock: 7,
              stock_status: 'in_stock',
              image_url: null,
              image_urls: [],
              category_id: null,
              category_name: null,
              is_popular: false,
              is_new_arrival: true,
              },
            ]
      const response: AxiosResponse = {
        data: {
          success: true,
          message: 'OK',
          data,
          page: 2,
          limit: 10,
          total: 11,
          totalPages: 2,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      }
      return response
    }
    apiClient.defaults.adapter = adapter
  })

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter
  })

  it('uses the existing product query contract and maps its page response', async () => {
    const result = await adminApi.listProducts({
      q: 'café',
      category: 4,
      page: 2,
      limit: 10,
    })

    expect(requests[0]).toMatchObject({
      url: '/products',
      method: 'get',
      params: { q: 'café', category: 4, page: 2, limit: 10 },
    })
    expect(result).toMatchObject({
      page: 2,
      limit: 10,
      total: 11,
      totalPages: 2,
      items: [{ id: 3, name: 'Café', price: '125.50' }],
    })
  })

  it('lists administrators from the admin endpoint', async () => {
    const result = await adminApi.listAdministrators()

    expect(requests[0]).toMatchObject({
      url: '/admin/administrators',
      method: 'get',
    })
    expect(result).toMatchObject([
      { id: 9, full_name: 'Ana Admin', role: 'admin', is_active: true },
    ])
  })

  it('creates and updates administrators through the admin endpoints', async () => {
    await adminApi.createAdministrator({
      full_name: 'Ana Admin',
      phone: '+258841234567',
      email: 'ana@example.com',
      password: 'Password1',
    })
    await adminApi.updateAdministrator(9, { is_active: false })

    expect(requests[0]).toMatchObject({
      url: '/admin/administrators',
      method: 'post',
      data: JSON.stringify({
        full_name: 'Ana Admin',
        phone: '+258841234567',
        email: 'ana@example.com',
        password: 'Password1',
      }),
    })
    expect(requests[1]).toMatchObject({
      url: '/admin/administrators/9',
      method: 'patch',
      data: JSON.stringify({ is_active: false }),
    })
  })

  it('accepts an order through the server-managed transition endpoint', async () => {
    await adminApi.acceptOrder(42)

    expect(requests[0]).toMatchObject({
      url: '/admin/orders/42/accept',
      method: 'post',
    })
  })

  it('sends date filters to the existing order endpoint', async () => {
    await adminApi.listOrders({
      from: '2026-10-01',
      to: '2026-10-31',
      page: 1,
      limit: 50,
    })

    expect(requests[0]).toMatchObject({
      url: '/admin/orders',
      method: 'get',
      params: {
        from: '2026-10-01',
        to: '2026-10-31',
        page: 1,
        limit: 50,
      },
    })
  })

  const productFields: ProductFields = {
    name: 'Café',
    description: null,
    price: 125.5,
    stock: 7,
    image_urls: [],
    category_id: null,
    is_popular: false,
    is_new_arrival: true,
  }

  it('creates a product before its idempotent customer notification', async () => {
    const result = await createProductWithOptionalNotification(productFields, true)

    expect(result.product.id).toBe(27)
    expect(requests.map(({ url, method }) => [url, method])).toEqual([
      ['/products', 'post'],
      ['/admin/notifications', 'post'],
    ])
    expect(JSON.parse(String(requests[1].data))).toMatchObject({
      type: 'new_product',
      product_id: 27,
      recipient_scope: 'all_customers',
      status: 'published',
      idempotency_key: 'product:27:new_product',
    })
  })

  it('keeps product creation successful when its notification fails', async () => {
    notificationFails = true

    const result = await createProductWithOptionalNotification(productFields, true)

    expect(result.product.id).toBe(27)
    expect(result.notificationError).toBeDefined()
    expect(requests.map(({ url, method }) => [url, method])).toEqual([
      ['/products', 'post'],
      ['/admin/notifications', 'post'],
    ])
  })

  it('does not send a notification when product creation is not opted in', async () => {
    const result = await createProductWithOptionalNotification(productFields, false)

    expect(result.product.id).toBe(27)
    expect(requests).toHaveLength(1)
  })

  it('does not send a notification when product creation fails', async () => {
    productCreationFails = true

    await expect(
      createProductWithOptionalNotification(productFields, true),
    ).rejects.toBeDefined()

    expect(requests).toHaveLength(1)
    expect(requests[0].url).toBe('/products')
  })

  it('forwards supported notification fields without changing the contract', async () => {
    await adminApi.createNotification({
      title: 'Evento',
      message: 'Aviso',
      type: 'new_product',
      status: 'published',
      recipient_scope: 'all_customers',
      product_id: 27,
      starts_at: '2026-11-06T08:00:00.000Z',
      expires_at: '2026-11-07T08:00:00.000Z',
    })

    expect(JSON.parse(String(requests[0].data))).toMatchObject({
      product_id: 27,
      starts_at: '2026-11-06T08:00:00.000Z',
      expires_at: '2026-11-07T08:00:00.000Z',
    })
  })
})
