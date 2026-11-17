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
type NotificationsResponse = { items?: Notice[]; page?: number; totalPages?: number; total?: number };

export type AddressInput = {
  label: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  province: string;
};
export type ProfileInput = { fullName: string; phone: string; email?: string };
export type CheckoutInput = {
  addressId: number;
  payment: 'cash' | 'mpesa' | 'emola';
  phone?: string;
  notes?: string;
};

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

/** O backend devolve o perfil em camelCase (fullName, avatarUrl); o site usa snake_case. Aceita os dois. */
const normalizeUser = (u: any) =>
  u ? { ...u, full_name: u.full_name ?? u.fullName, avatar_url: u.avatar_url ?? u.avatarUrl ?? null, birth_date: u.birth_date ?? u.birthDate } : u;

/** Aceita uma lista directa ou `{ items: [...] }`. */
const asList = <T>(body: unknown): T[] => {
  if (Array.isArray(body)) return body as T[];
  const items = (body as { items?: T[] } | null)?.items;
  return Array.isArray(items) ? items : [];
};

/** Sessão sem renovação possível: limpa-a e, em páginas privadas, leva ao login. */
const PUBLIC_PATHS = /^\/($|login|produto\/)/;
function expireSession() {
  session.clear();
  if (!PUBLIC_PATHS.test(window.location.pathname)) window.location.replace('/login');
}

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

  const hadToken = !!session.token;
  let response = await send();
  if (response.status === 401 && !path.startsWith('/auth/')) {
    if (await refreshSession()) response = await send();
    else if (hadToken) expireSession();
  }

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
    const params = new URLSearchParams({ limit: '50' });
    if (q) params.set('q', q);
    if (category) params.set('category', String(category));
    return fetchData<Product[]>(`/products?${params}`);
  },
  product: (id: number) => fetchData<Product>(`/products/${id}`),
  categories: () => fetchData<Category[]>('/categories'),

  /* Favoritos */
  favorites: async () => asList<Product>(unwrap(await request('/favorites'))),
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
  checkout: (input: Partial<CheckoutInput> = {}) =>
    fetchData<Order>('/orders', { method: 'POST', body: JSON.stringify(input) }),
  orders: async () => asList<Order>(unwrap(await request('/orders'))),
  order: (id: number) => fetchData<Order>(`/orders/${id}`),

  /* Conta */
  profile: async () => normalizeUser(await fetchData<any>('/users/me')) as User & { avatar_url?: string | null },
  updateProfile: async (input: ProfileInput) =>
    normalizeUser(await fetchData<any>('/users/me', { method: 'PATCH', body: JSON.stringify(input) })) as User & { avatar_url?: string | null },

  /**
   * Muda a palavra-passe. O backend termina todas as sessões ao mudá-la; devolve true só se
   * enviar tokens novos (sessão mantida), caso contrário é preciso entrar de novo.
   */
  changePassword: async (currentPassword: string, newPassword: string): Promise<boolean> => {
    const r = await fetchData<TokenPayload | null>('/users/me/password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (r && (r.token || r.accessToken)) { saveTokens(r); return true; }
    return false;
  },
  /** Envia a fotografia (campo multipart "avatar"). Devolve o utilizador ou { avatar_url }. */
  uploadAvatar: (file: Blob) => {
    const form = new FormData();
    form.append('avatar', file, 'avatar.jpg');
    return fetchData<{ avatar_url?: string | null }>('/users/me/avatar', { method: 'POST', body: form });
  },
  deleteAvatar: () => request('/users/me/avatar', { method: 'DELETE' }),

  addresses: () => fetchData<Address[]>('/users/me/addresses'),
  addAddress: (input: AddressInput) => post('/users/me/addresses', input),
  updateAddress: (id: number, input: AddressInput) => patch(`/users/me/addresses/${id}`, input),
  deleteAddress: (id: number) => request(`/users/me/addresses/${id}`, { method: 'DELETE' }),

  notifications: (page = 1) => fetchData<NotificationsResponse>(`/notifications?page=${page}&limit=30`),
  unreadCount: () => fetchData<{ count: number }>('/notifications/unread-count'),
  markRead: (id: number) => patch(`/notifications/${id}/read`, {}),
  markAllRead: () => patch('/notifications/read-all', {}),
};