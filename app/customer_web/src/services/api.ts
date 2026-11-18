import type {
  Address,
  Banner,
  Cart,
  CartItem,
  Category,
  Notice,
  Order,
  PaymentMethod,
  Product,
  ProductPage,
  ProductSort,
  ProductReviews,
  User,
  UserStats,
} from '../types';

/* ───────────────────────── Configuração ───────────────────────── */

const API_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api').replace(/\/$/, '');
const SERVER_URL = API_URL.replace(/\/api$/, '');

const ACCESS_KEY = 'vs.access';
const REFRESH_KEY = 'vs.refresh';

/* ───────────────────────── Tipos da API ───────────────────────── */

type TokenPayload = { token?: string; accessToken?: string; refreshToken?: string };
type AuthPayload = TokenPayload & { user: User };
type NotificationsResponse = { items?: Notice[]; page?: number; totalPages?: number; total?: number };
type FavoriteProductData = Partial<Product> & {
  image?: string | null;
  categoryName?: string | null;
};
type FavoriteData = FavoriteProductData & {
  productId?: number;
  product?: FavoriteProductData;
};

export type AddressInput = {
  label: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  province: string;
  reference?: string | null;
};
export type ProfileInput = { fullName: string; phone: string; email?: string; birthDate?: string; gender?: string };
export type CheckoutInput = {
  deliveryAddressId: number | null;
  paymentMethodId: number | null;
  deliveryMethod: 'home_delivery' | 'store_pickup';
  couponCode?: string | null;
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
  u ? {
    ...u,
    full_name: u.full_name ?? u.fullName,
    avatar_url: u.avatar_url ?? u.avatarUrl ?? null,
    birth_date: u.birth_date ?? u.birthDate,
  } : u;

const normalizeAddress = (address: any): Address => ({
  ...address,
  is_default: address.is_default ?? address.isDefault ?? false,
});

const normalizeCartItem = (item: any): CartItem => ({
  ...item,
  product_id: item.product_id ?? item.productId ?? item.product?.id,
  unit_price: item.unit_price ?? item.unitPrice ?? 0,
  name: item.name ?? item.product?.name ?? '',
  image_url: item.image_url ?? item.product?.image ?? null,
  image_urls: item.image_urls ?? item.product?.image_urls ?? [],
  stock: item.stock ?? item.product?.stock,
});

const normalizeCart = (cart: any): Cart => ({
  ...cart,
  items: asList(cart?.items).map(normalizeCartItem),
  deliveryFee: cart?.deliveryFee ?? cart?.delivery_fee ?? 0,
});

const normalizeOrder = (order: any): Order => ({
  ...order,
  created_at: order.created_at ?? order.createdAt,
  delivery_fee: order.delivery_fee ?? order.deliveryFee,
  items: asList(order?.items).map(normalizeCartItem),
});

const normalizeFavorite = (favorite: FavoriteData): Product => {
  const product = favorite.product ?? favorite;
  const id = product.id ?? favorite.productId;
  if (
    typeof id !== 'number'
    || typeof product.name !== 'string'
    || (typeof product.price !== 'number' && typeof product.price !== 'string')
    || typeof product.stock !== 'number'
  ) {
    throw new Error('A resposta dos favoritos não contém os dados esperados do produto.');
  }

  return {
    ...product,
    id,
    name: product.name,
    price: product.price,
    stock: product.stock,
    image_url: product.image_url ?? product.image ?? null,
    category_name: product.category_name ?? product.categoryName ?? undefined,
  };
};

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
  products: async (
    q = '',
    category?: number,
    filters: { minPrice?: number; maxPrice?: number; sort?: ProductSort; page?: number; limit?: number } = {},
  ): Promise<ProductPage> => {
    const limit = Math.min(50, Math.max(1, Math.floor(filters.limit ?? 50)));
    const page = Math.max(1, Math.floor(filters.page ?? 1));
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (q) params.set('q', q);
    if (category) params.set('category', String(category));
    if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
    if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
    if (filters.sort) params.set('sort', filters.sort);
    const response = await request<{
      data?: unknown;
      page?: number;
      limit?: number;
      total?: number;
      totalPages?: number;
    }>(`/products?${params}`);
    return {
      items: asList<Product>(response.data),
      page: response.page ?? page,
      limit: response.limit ?? limit,
      total: response.total ?? 0,
      totalPages: response.totalPages ?? 1,
    };
  },
  popular: () => fetchData<Product[]>('/products/popular'),
  newArrivals: () => fetchData<Product[]>('/products/new-arrivals'),
  product: (id: number) => fetchData<Product>(`/products/${id}`),
  reviews: (productId: number) => fetchData<ProductReviews>(`/products/${productId}/reviews`),
  saveReview: (productId: number, rating: number, comment?: string) =>
    fetchData<ProductReviews>(`/products/${productId}/reviews`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment: comment?.trim() || null }),
    }),
  voteReview: (
    productId: number,
    reviewId: number,
    vote: 'like' | 'dislike' | null,
  ) => fetchData<{ likeCount: number; dislikeCount: number; userVote: 'like' | 'dislike' | null }>(
    `/products/${productId}/reviews/${reviewId}/vote`,
    vote
      ? { method: 'POST', body: JSON.stringify({ vote }) }
      : { method: 'DELETE' },
  ),
  categories: () => fetchData<Category[]>('/categories'),
  banners: async () => asList<Banner>(await fetchData<{ items?: Banner[] }>('/banners')),

  /* Favoritos */
  favorites: async () => asList<FavoriteData>(unwrap(await request('/favorites'))).map(normalizeFavorite),
  favoriteStatus: async (productId: number) =>
    fetchData<{ isFavorite: boolean }>(`/favorites/${productId}`),
  favorite: (productId: number, enabled: boolean) =>
    enabled
      ? post('/favorites', { productId })
      : request(`/favorites/${productId}`, { method: 'DELETE' }),

  /* Carrinho */
  cart: async () => normalizeCart(await fetchData<Cart>('/cart')),
  add: (productId: number, quantity = 1) => post('/cart/items', { productId, quantity }),
  quantity: (id: number, quantity: number) => patch(`/cart/items/${id}`, { quantity }),
  remove: (id: number) => request(`/cart/items/${id}`, { method: 'DELETE' }),
  clearCart: () => request('/cart', { method: 'DELETE' }),

  /* Encomendas */
  checkout: (input: CheckoutInput) =>
    fetchData<Order>('/orders', { method: 'POST', body: JSON.stringify(input) }).then(normalizeOrder),
  orders: async () =>
    asList<any>(unwrap(await request('/orders'))).map(normalizeOrder),
  order: async (id: number) => normalizeOrder(await fetchData<Order>(`/orders/${id}`)),

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

  stats: () => fetchData<UserStats>('/users/me/stats'),
  addresses: async () => (await fetchData<Address[]>('/users/me/addresses')).map(normalizeAddress),
  addAddress: (input: AddressInput) => post('/users/me/addresses', input),
  updateAddress: (id: number, input: AddressInput) => patch(`/users/me/addresses/${id}`, input),
  setDefaultAddress: (id: number) => patch(`/users/me/addresses/${id}/default`, {}),
  deleteAddress: (id: number) => request(`/users/me/addresses/${id}`, { method: 'DELETE' }),

  paymentMethods: () => fetchData<PaymentMethod[]>('/users/me/payment-methods'),
  addPaymentMethod: (input: Record<string, unknown>) => post('/users/me/payment-methods', input),
  updatePaymentMethod: (id: number, input: Record<string, unknown>) =>
    patch(`/users/me/payment-methods/${id}`, input),
  setDefaultPaymentMethod: (id: number) =>
    patch(`/users/me/payment-methods/${id}/default`, {}),
  deletePaymentMethod: (id: number) =>
    request(`/users/me/payment-methods/${id}`, { method: 'DELETE' }),

  notifications: (page = 1) => fetchData<NotificationsResponse>(`/notifications?page=${page}&limit=30`),
  unreadCount: () => fetchData<{ count: number }>('/notifications/unread-count'),
  markRead: (id: number) => patch(`/notifications/${id}/read`, {}),
  markAllRead: () => patch('/notifications/read-all', {}),
  logout: async () => {
    try {
      await request('/auth/logout', {
        method: 'POST',
        body: JSON.stringify(session.refreshToken ? { refreshToken: session.refreshToken } : {}),
      });
    } finally {
      session.clear();
    }
  },
};