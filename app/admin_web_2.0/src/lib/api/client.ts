import axios, {
  type AxiosError,
  type AxiosInstance,
  type CreateAxiosDefaults,
  type InternalAxiosRequestConfig,
} from 'axios'
import type { ApiEnvelope, AuthPayload } from '../../features/auth/types/auth'
import { parseAuthPayload } from '../../features/auth/types/auth'
import { AuthSession } from '../../features/auth/services/authSession'

const baseURL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:3000/api'

const defaultOptions: CreateAxiosDefaults = {
  baseURL,
  timeout: 15_000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
}

const sessionTransport = axios.create(defaultOptions)

export const authSession = new AuthSession({
  refresh: async () => {
    const response = await sessionTransport.post<ApiEnvelope<AuthPayload>>(
      '/auth/refresh',
      { adminOnly: true },
    )
    const payload = parseAuthPayload(response.data)
    if (payload.user.role !== 'admin') {
      throw new Error('A conta já não tem acesso ao painel administrativo.')
    }
    return payload
  },
  logout: async () => {
    await sessionTransport.post('/auth/logout', {})
  },
})

interface AuthRequestConfig extends InternalAxiosRequestConfig {
  authGeneration?: number
  authToken?: string | null
  authRetried?: boolean
}

export function createApiClient(
  session: AuthSession,
  options: CreateAxiosDefaults = {},
): AxiosInstance {
  const client = axios.create({ ...defaultOptions, ...options })

  client.interceptors.request.use((config) => {
    const request = config as AuthRequestConfig
    if (
      request.authGeneration !== undefined &&
      request.authGeneration !== session.currentGeneration
    ) {
      throw new Error('O pedido pertence a uma sessão terminada.')
    }

    request.authGeneration ??= session.currentGeneration
    const token = session.currentAccessToken
    request.authToken = token

    if (isAuthRequest(request.url)) {
      request.headers.delete('Authorization')
    } else if (token) {
      request.headers.set('Authorization', `Bearer ${token}`)
    } else {
      request.headers.delete('Authorization')
    }
    return request
  })

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const request = error.config as AuthRequestConfig | undefined
      if (
        error.response?.status !== 401 ||
        !request ||
        request.authRetried ||
        isAuthRequest(request.url) ||
        request.authGeneration !== session.currentGeneration ||
        !request.authToken
      ) {
        return Promise.reject(error)
      }

      if (
        request.authToken === session.currentAccessToken &&
        !(await session.refresh())
      ) {
        return Promise.reject(error)
      }

      if (
        request.authGeneration !== session.currentGeneration ||
        !session.currentAccessToken
      ) {
        return Promise.reject(error)
      }

      request.authRetried = true
      request.headers.set(
        'Authorization',
        `Bearer ${session.currentAccessToken}`,
      )
      return client.request(request)
    },
  )

  return client
}

export const apiClient = createApiClient(authSession)

function isAuthRequest(url: string | undefined): boolean {
  if (!url) return false
  const path = new URL(url, baseURL).pathname.replace(/\/+$/, '')
  const route = path.split('/').slice(-2).join('/')
  return [
    'auth/login',
    'auth/register',
    'auth/refresh',
    'auth/logout',
  ].includes(route)
}
