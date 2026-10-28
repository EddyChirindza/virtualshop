import type { Address, CartItem, Category, Product } from '../types';
const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api').replace(/\/$/, '');
export const imageUrl = (path?: string | null) => !path ? '' : /^https?:\/\//i.test(path) ? path : `${base.replace(/\/api$/, '')}${path.startsWith('/') ? '' : '/'}${path}`;
let token = localStorage.getItem('vs.access');
export const session = { get token() { return token; }, set(access?: string, refresh?: string) { token = access || null; if (token) localStorage.setItem('vs.access', token); else localStorage.removeItem('vs.access'); if (refresh) localStorage.setItem('vs.refresh', refresh); if (!access) localStorage.removeItem('vs.refresh'); } };
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers); if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json'); if (token) headers.set('Authorization', `Bearer ${token}`);
  let response = await fetch(`${base}${path}`, { ...init, headers, credentials: 'include' });
  if (response.status === 401 && localStorage.getItem('vs.refresh')) {
    const refreshToken = localStorage.getItem('vs.refresh');
    const renewed = await fetch(`${base}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken }) });
    if (renewed.ok) { const body = await renewed.json(); const d = body.data ?? body; session.set(d.token ?? d.accessToken, d.refreshToken); headers.set('Authorization', `Bearer ${token}`); response = await fetch(`${base}${path}`, { ...init, headers, credentials: 'include' }); }
  }
  const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.message || `Erro ${response.status}: não foi possível concluir o pedido.`); return body;
}
const data = <T,>(body: any): T => body.data ?? body;
export const api = {
  products: async (q = '', category?: number) => { const p = new URLSearchParams({ limit: '60' }); if (q) p.set('q', q); if (category) p.set('category', `${category}`); return data<Product[]>(await request(`/products?${p}`)); },
  product: async (id: number) => data<Product>(await request(`/products/${id}`)),
  categories: async () => data<Category[]>(await request('/categories')),
  cart: async () => data<{ items: CartItem[]; discount?: number; deliveryFee?: number }>(await request('/cart')),
  add: async (productId: number, quantity = 1) => request('/cart/items', { method: 'POST', body: JSON.stringify({ productId, quantity }) }),
  quantity: async (id: number, quantity: number) => request(`/cart/items/${id}`, { method: 'PATCH', body: JSON.stringify({ quantity }) }),
  remove: async (id: number) => request(`/cart/items/${id}`, { method: 'DELETE' }),
  checkout: async () => request('/orders', { method: 'POST', body: JSON.stringify({}) }),
  login: async (identifier: string, password: string) => { const d: any = data(await request('/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) })); session.set(d.token ?? d.accessToken, d.refreshToken); return d.user; },
  register: async (full_name: string, phone: string, email: string, password: string) => { const d: any = data(await request('/auth/register', { method: 'POST', body: JSON.stringify({ full_name, phone, email, password }) })); session.set(d.token ?? d.accessToken, d.refreshToken); return d.user; },
  profile: async () => data<any>(await request('/users/me')),
  addresses: async () => data<Address[]>(await request('/users/me/addresses')),
  notifications: async () => data<any>(await request('/notifications')),
  favorite: async (productId: number, enabled: boolean) => request(enabled ? '/favorites' : `/favorites/${productId}`, { method: enabled ? 'POST' : 'DELETE', ...(enabled ? { body: JSON.stringify({ productId }) } : {}) }),
  order: async (id: number) => data<any>(await request(`/orders/${id}`)),
};
