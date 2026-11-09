import type { Address, CartItem, Category, Notice, Order, Product, User } from '../types';

/* ───────────────────────── Configuração ───────────────────────── */

const API_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api').replace(/\/$/, '');
const SERVER_URL = API_URL.replace(/\/api$/, '');

const ACCESS_KEY = 'vs.access';
const REFRESH_KEY = 'vs.refresh';

/* ───────────────────────── Tipos da API ───────────────────────── */

type TokenPayload = { token?: string; accessToken?: string; refreshToken?: string };
type AuthPayload = TokenPayload & { user: User };
type CartResponse = { items: CartItem[]; discount?: number; deliveryFee?: number };
type NotificationsResponse = { items?: Notice[] };

/* ───────────────────────── Imagens ───────────────────────── */

/** Converte o caminho de uma imagem devolvido pela API num URL completo. */
export const imageUrl = (path?: string | null): string => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${SERVER_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

/* ───────────────────────── Sessão ───────────────────────── */

let accessToken = localStorage.getItem(ACCESS_KEY);

export const session = {
  get token() {
    return accessToken;
  },
  get refreshToken() {
    return localStorage.getItem(REFRESH_KEY);
  },
  /** Guarda os tokens. Chamar sem argumentos termina a sessão. */
  set(access?: string, refresh?: string) {
    accessToken = access || null;
    if (accessToken) localStorage.setItem(ACCESS_KEY, accessToken);
    else localStorage.removeItem(ACCESS_KEY);

    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
    if (!access) localStorage.removeItem(REFRESH_KEY);
  },
  clear() {
    session.set();
  },
};

const saveTokens = (payload: TokenPayload) => {
  session.set(payload.token ?? payload.accessToken, payload.refreshToken);
};

/* ───────────────────────── Cliente HTTP ───────────────────────── */

/** A API pode responder com `{ data: ... }` ou com o objecto directo. */
const unwrap = <T>(body: unknown): T => {
  const envelope = body as { data?: T } | null;
  return (envelope?.data ?? body) as T;
};

/** Pede um novo token de acesso com o refresh token. Devolve true se renovou. */
async function refreshSession(): Promise<boolean> {
  const refreshToken = session.refreshToken;
  if (!refreshToken) return false;

  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) return false;

  saveTokens(unwrap<TokenPayload>(await response.json()));
  return true;
}

async function request<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');

  const send = () => {
    if (session.token) headers.set('Authorization', `Bearer ${session.token}`);
    return fetch(`${API_URL}${path}`, { ...init, headers, credentials: 'include' });
  };

  let response = await send();
  if (response.status === 401 && (await refreshSession())) response = await send();

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message || `Erro ${response.status}: não foi possível concluir o pedido.`);
  }
  return body as T;
}

/** Pedido que devolve só o conteúdo útil da resposta. */
const fetchData = async <T>(path: string, init?: RequestInit) => unwrap<T>(await request(path, init));

const post = (path: string, body: unknown) => request(path, { method: 'POST', body: JSON.stringify(body) });
const patch = (path: string, body: unknown) => request(path, { method: 'PATCH', body: JSON.stringify(body) });

/* ───────────────────────── Endpoints ───────────────────────── */

export const api = {
  /* Autenticação */
  login: async (identifier: string, password: string) => {
    const auth = await fetchData<AuthPayload>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    saveTokens(auth);
    return auth.user;
  },

  register: async (full_name: string, phone: string, email: string, password: string) => {
    const auth = await fetchData<AuthPayload>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ full_name, phone, email, password }),
    });
    saveTokens(auth);
    return auth.user;
  },

  /* Catálogo */
  products: async (q = '', category?: number) => {
    const params = new URLSearchParams({ limit: '60' });
    if (q) params.set('q', q);
    if (category) params.set('category', String(category));
    return fetchData<Product[]>(`/products?${params}`);
  },
  product: (id: number) => fetchData<Product>(`/products/${id}`),
  categories: () => fetchData<Category[]>('/categories'),

  /* Favoritos */
  favorite: (productId: number, enabled: boolean) =>
    enabled
      ? post('/favorites', { productId })
      : request(`/favorites/${productId}`, { method: 'DELETE' }),

  /* Carrinho */
  cart: () => fetchData<CartResponse>('/cart'),
  add: (productId: number, quantity = 1) => post('/cart/items', { productId, quantity }),
  quantity: (id: number, quantity: number) => patch(`/cart/items/${id}`, { quantity }),
  remove: (id: number) => request(`/cart/items/${id}`, { method: 'DELETE' }),

  /* Encomendas */
  checkout: () => post('/orders', {}),
  order: (id: number) => fetchData<Order>(`/orders/${id}`),

  /* Conta */
  profile: () => fetchData<User>('/users/me'),
  addresses: () => fetchData<Address[]>('/users/me/addresses'),
  notifications: () => fetchData<NotificationsResponse>('/notifications'),
};