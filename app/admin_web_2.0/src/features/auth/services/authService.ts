import type { AxiosInstance } from 'axios'
import { apiClient, authSession } from '../../../lib/api/client'
import type { AdminUser, ApiEnvelope, AuthPayload } from '../types/auth'
import {
  AuthenticationError,
  parseAdminUser,
  parseAuthPayload,
} from '../types/auth'
import { AuthSession } from './authSession'

export class AuthService {
  private readonly client: AxiosInstance
  private readonly session: AuthSession

  constructor(
    client: AxiosInstance = apiClient,
    session: AuthSession = authSession,
  ) {
    this.client = client
    this.session = session
  }

  async login(identifier: string, password: string): Promise<AdminUser> {
    const generation = this.session.beginAuthentication()
    const response = await this.client.post<ApiEnvelope<AuthPayload>>(
      '/auth/login',
      { identifier, password, adminOnly: true },
    )
    const payload = parseAuthPayload(response.data)

    if (payload.user.role !== 'admin') {
      throw new AuthenticationError(
        'Esta conta não tem acesso ao painel administrativo.',
      )
    }

    if (!this.session.startIfCurrent(payload, generation)) {
      throw new AuthenticationError(
        'O pedido de autenticação foi cancelado. Tenta novamente.',
      )
    }
    return payload.user
  }

  async restoreSession(): Promise<AdminUser | null> {
    const payload = await this.session.refresh()
    return payload?.user ?? null
  }

  async getCurrentUser(): Promise<AdminUser> {
    const response = await this.client.get<unknown>('/auth/me')
    if (!isRecord(response.data) || !isRecord(response.data.data)) {
      throw new AuthenticationError('A resposta do utilizador é inválida.')
    }

    const user = parseAdminUser(response.data.data.user)
    if (user.role !== 'admin') {
      throw new AuthenticationError(
        'Esta conta não tem acesso ao painel administrativo.',
      )
    }
    return user
  }
}

export const authService = new AuthService()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
