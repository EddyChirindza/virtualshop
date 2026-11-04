import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { apiClient } from '../../lib/api/client'
import { adminApi } from './adminApi'

describe('adminApi', () => {
  const originalAdapter = apiClient.defaults.adapter
  const requests: Array<{
    url: string
    method: string
    params: unknown
    data: unknown
  }> = []
  let adapter: AxiosAdapter

  beforeEach(() => {
    requests.length = 0
    adapter = async (config: InternalAxiosRequestConfig) => {
      requests.push({
        url: config.url ?? '',
        method: config.method ?? '',
        params: config.params,
        data: config.data,
      })
      const response: AxiosResponse = {
        data: {
          success: true,
          message: 'OK',
          data: [
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
          ],
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

  it('accepts an order through the server-managed transition endpoint', async () => {
    await adminApi.acceptOrder(42)

    expect(requests[0]).toMatchObject({
      url: '/admin/orders/42/accept',
      method: 'post',
    })
  })
})
