import axios from 'axios'
import type { AuthPayload, AuthTokens } from '../types/auth'
import { AuthenticationError } from '../types/auth'

interface AuthSessionTransport {
  refresh: () => Promise<AuthPayload>
  logout: () => Promise<void>
}

type RefreshResult = AuthPayload | null

function isAuthenticationFailure(error: unknown): boolean {
  if (error instanceof AuthenticationError) return true
  return (
    axios.isAxiosError(error) &&
    (error.response?.status === 401 || error.response?.status === 403)
  )
}

export class AuthSession {
  private readonly transport: AuthSessionTransport
  private accessToken: string | null = null
  private generation = 0
  private refreshOperation: {
    generation: number
    promise: Promise<RefreshResult>
  } | null = null
  private readonly listeners = new Set<() => void>()

  constructor(transport: AuthSessionTransport) {
    this.transport = transport
  }

  get currentAccessToken(): string | null {
    return this.accessToken
  }

  get isAuthenticated(): boolean {
    return this.accessToken !== null
  }

  get currentGeneration(): number {
    return this.generation
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  beginAuthentication(): number {
    this.invalidate()
    return this.generation
  }

  start(tokens: AuthTokens): void {
    this.generation += 1
    this.setAccessToken(tokens.accessToken)
  }

  startIfCurrent(tokens: AuthTokens, generation: number): boolean {
    if (generation !== this.generation) return false

    this.setAccessToken(tokens.accessToken)
    return true
  }

  refresh(): Promise<RefreshResult> {
    if (this.refreshOperation?.generation === this.generation) {
      return this.refreshOperation.promise
    }

    const generation = this.generation
    const operation = {
      generation,
      promise: this.performRefresh(generation),
    }
    this.refreshOperation = operation
    void operation.promise
      .catch(() => undefined)
      .then(() => {
        if (this.refreshOperation === operation) this.refreshOperation = null
      })
    return operation.promise
  }

  async logout(): Promise<void> {
    this.invalidate()
    await this.transport.logout()
  }

  private async performRefresh(generation: number): Promise<RefreshResult> {
    try {
      const payload = await this.transport.refresh()
      if (generation !== this.generation) return null
      if (payload.user.role !== 'admin') {
        throw new AuthenticationError(
          'A conta já não tem acesso ao painel administrativo.',
        )
      }

      this.setAccessToken(payload.accessToken)
      return payload
    } catch (error) {
      if (isAuthenticationFailure(error)) {
        this.invalidateIfCurrent(generation)
        return null
      }
      throw error
    }
  }

  private setAccessToken(accessToken: string): void {
    this.accessToken = accessToken
  }

  private invalidateIfCurrent(generation: number): void {
    if (generation === this.generation) this.invalidate()
  }

  private invalidate(): void {
    const hadSession = this.isAuthenticated
    this.generation += 1
    this.accessToken = null
    this.refreshOperation = null

    if (hadSession) {
      for (const listener of this.listeners) listener()
    }
  }
}
