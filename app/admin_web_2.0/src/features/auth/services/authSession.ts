import type { AuthPayload, AuthTokens } from '../types/auth'

interface AuthSessionTransport {
  refresh: (refreshToken: string) => Promise<AuthPayload>
  logout: (refreshToken: string) => Promise<void>
}

export class AuthSession {
  private readonly transport: AuthSessionTransport
  private accessToken: string | null = null
  private refreshToken: string | null = null
  private generation = 0
  private refreshOperation: {
    generation: number
    promise: Promise<boolean>
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
    this.setTokens(tokens)
  }

  startIfCurrent(tokens: AuthTokens, generation: number): boolean {
    if (generation !== this.generation) return false

    this.setTokens(tokens)
    return true
  }

  refresh(): Promise<boolean> {
    if (this.refreshOperation?.generation === this.generation) {
      return this.refreshOperation.promise
    }

    const generation = this.generation
    const refreshToken = this.refreshToken
    if (!refreshToken) {
      this.invalidateIfCurrent(generation)
      return Promise.resolve(false)
    }

    const operation = {
      generation,
      promise: this.performRefresh(refreshToken, generation),
    }
    this.refreshOperation = operation
    void operation.promise.then(() => {
      if (this.refreshOperation === operation) this.refreshOperation = null
    })
    return operation.promise
  }

  async logout(): Promise<void> {
    const refreshToken = this.refreshToken
    this.invalidate()

    if (refreshToken) {
      await this.transport.logout(refreshToken)
    }
  }

  private async performRefresh(
    refreshToken: string,
    generation: number,
  ): Promise<boolean> {
    try {
      const payload = await this.transport.refresh(refreshToken)
      if (generation !== this.generation || refreshToken !== this.refreshToken) {
        return false
      }
      if (payload.user.role !== 'admin') {
        throw new Error('A conta já não tem acesso ao painel administrativo.')
      }

      this.setTokens(payload)
      return true
    } catch {
      this.invalidateIfCurrent(generation)
      return false
    }
  }

  private setTokens(tokens: AuthTokens): void {
    this.accessToken = tokens.accessToken
    this.refreshToken = tokens.refreshToken
  }

  private invalidateIfCurrent(generation: number): void {
    if (generation === this.generation) this.invalidate()
  }

  private invalidate(): void {
    const hadSession = this.isAuthenticated || this.refreshToken !== null
    this.generation += 1
    this.accessToken = null
    this.refreshToken = null
    this.refreshOperation = null

    if (hadSession) {
      for (const listener of this.listeners) listener()
    }
  }
}
