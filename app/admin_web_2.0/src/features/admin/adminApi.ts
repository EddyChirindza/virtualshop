import { apiClient } from '../../lib/api/client'

export interface ApiEnvelope<T> {
  success: boolean
  message: string
  data: T
}

export interface DashboardData {
  period: '7d' | '30d' | '90d'
  metrics: {
    revenue: number
    orders: number
    pendingOrders: number
    lowStockProducts: number
    customers: number
    products: number
  }
  revenueSeries: Array<{ label: string; value: number }>
  recentOrders: Array<{
    id: number
    customer: string
    status: string
    total: number
    createdAt: string
  }>
  lowStockProducts: Array<{
    id: number
    name: string
    stock_status: 'out_of_stock' | 'low_stock' | 'in_stock'
  }>
}

export interface Product {
  id: number
  name: string
  description: string | null
  price: number | string
  stock: number
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock'
  image_url: string | null
  image_urls: string[]
  category_id: number | null
  category_name: string | null
  is_popular: boolean
  is_new_arrival: boolean
}

export interface Category {
  id: number
  name: string
  slug: string
  icon_url: string | null
  parent_id: number | null
}

export interface PageResult<T> {
  items: T[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface AdminOrder {
  id: number
  userId: number
  status: string
  paymentStatus: string
  deliveryMethod: 'home_delivery' | 'store_pickup'
  total: number
  subtotal: number
  discount: number
  deliveryFee: number
  notes: string | null
  rejectionReason: string | null
  createdAt: string
  updatedAt: string
  customer?: {
    id: number
    name: string
    email: string | null
    phone: string
    avatarUrl: string | null
  }
  items: Array<{
    id: number
    productId: number
    quantity: number
    unitPrice: number
    subtotal: number
    product: { id: number; name: string; image: string | null }
  }>
}

export interface Customer {
  id: number
  fullName: string
  email: string | null
  phone: string
  avatarUrl: string | null
  createdAt: string
}

export interface AdminNotification {
  id: number
  title: string
  message: string
  type: string
  product_id: number | null
  order_id: number | null
  status: 'draft' | 'published' | 'archived'
  recipient_scope: 'all_customers' | 'user'
  recipient_user_id: number | null
  starts_at: string | null
  expires_at: string | null
  published_at: string | null
  created_at: string
  product_name: string | null
}

interface ProductListEnvelope {
  success: boolean
  message: string
  data: Product[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export const adminApi = {
  async getDashboard(period: DashboardData['period']) {
    const response = await apiClient.get<ApiEnvelope<DashboardData>>(
      '/admin/dashboard',
      { params: { period } },
    )
    return response.data.data
  },

  async listProducts(params: {
    q?: string
    category?: number
    page: number
    limit: number
  }) {
    const response = await apiClient.get<ProductListEnvelope>('/products', {
      params,
    })
    return {
      items: response.data.data,
      page: response.data.page,
      limit: response.data.limit,
      total: response.data.total,
      totalPages: response.data.totalPages,
    } satisfies PageResult<Product>
  },

  async getProduct(id: number) {
    const response = await apiClient.get<ApiEnvelope<Product>>(`/products/${id}`)
    return response.data.data
  },

  async createProduct(fields: ProductFields) {
    const response = await apiClient.post<ApiEnvelope<Product>>(
      '/products',
      fields,
    )
    return response.data.data
  },

  async updateProduct(id: number, fields: Partial<ProductFields>) {
    const response = await apiClient.patch<ApiEnvelope<Product>>(
      `/products/${id}`,
      fields,
    )
    return response.data.data
  },

  async deleteProduct(id: number) {
    await apiClient.delete(`/products/${id}`)
  },

  async uploadProductImage(base64: string) {
    const response = await apiClient.post<
      ApiEnvelope<{ image_url: string }>
    >('/admin/products/image', { base64 })
    return response.data.data.image_url
  },

  async listCategories() {
    const response = await apiClient.get<ApiEnvelope<Category[]>>('/categories')
    return response.data.data
  },

  async createCategory(fields: CategoryFields) {
    const response = await apiClient.post<ApiEnvelope<Category>>(
      '/categories',
      fields,
    )
    return response.data.data
  },

  async updateCategory(id: number, fields: CategoryFields) {
    const response = await apiClient.patch<ApiEnvelope<Category>>(
      `/categories/${id}`,
      fields,
    )
    return response.data.data
  },

  async deleteCategory(id: number) {
    await apiClient.delete(`/categories/${id}`)
  },

  async listOrders(params: {
    status?: string
    search?: string
    page: number
    limit: number
  }) {
    const response = await apiClient.get<ApiEnvelope<PageResult<AdminOrder>>>(
      '/admin/orders',
      { params },
    )
    return response.data.data
  },

  async getOrder(id: number) {
    const response = await apiClient.get<ApiEnvelope<AdminOrder>>(
      `/admin/orders/${id}`,
    )
    return response.data.data
  },

  async acceptOrder(id: number) {
    const response = await apiClient.post<ApiEnvelope<AdminOrder>>(
      `/admin/orders/${id}/accept`,
    )
    return response.data.data
  },

  async rejectOrder(id: number, reason: string) {
    const response = await apiClient.post<ApiEnvelope<AdminOrder>>(
      `/admin/orders/${id}/reject`,
      { reason },
    )
    return response.data.data
  },

  async updateOrderStatus(id: number, status: string) {
    const response = await apiClient.patch<ApiEnvelope<AdminOrder>>(
      `/admin/orders/${id}/status`,
      { status },
    )
    return response.data.data
  },

  async listCustomers() {
    const response = await apiClient.get<ApiEnvelope<Customer[]>>(
      '/admin/customers',
    )
    return response.data.data
  },

  async listNotifications(params: { page: number; limit: number }) {
    const response = await apiClient.get<
      ApiEnvelope<PageResult<AdminNotification>>
    >('/admin/notifications', { params })
    return response.data.data
  },

  async createNotification(fields: NotificationFields) {
    const response = await apiClient.post<ApiEnvelope<AdminNotification>>(
      '/admin/notifications',
      fields,
    )
    return response.data.data
  },

  async archiveNotification(id: number) {
    const response = await apiClient.patch<
      ApiEnvelope<{ id: number; status: 'archived' }>
    >(`/admin/notifications/${id}/archive`)
    return response.data.data
  },
}

export interface ProductFields {
  name: string
  description: string | null
  price: number
  stock: number
  image_urls: string[]
  category_id: number | null
  is_popular: boolean
  is_new_arrival: boolean
}

export interface CategoryFields {
  name: string
  slug: string
  icon_url: string | null
  parent_id: number | null
}

export interface NotificationFields {
  title: string
  message: string
  type:
    | 'general'
    | 'promotion'
    | 'discount'
    | 'new_product'
    | 'product_alert'
    | 'order_update'
  recipient_scope: 'all_customers' | 'user'
  recipient_user_id?: number
  status: 'draft' | 'published'
}

export function resolveAssetUrl(path: string | null): string | null {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path

  const apiBase = apiClient.defaults.baseURL
  if (!apiBase) return path

  try {
    const base = new URL(apiBase, window.location.origin)
    return new URL(path, base).toString()
  } catch {
    return path
  }
}
