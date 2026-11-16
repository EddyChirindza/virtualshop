import axios, {
  AxiosError,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { describe, expect, it, vi } from 'vitest'
import { createApiClient } from '../../../lib/api/client'
import { AuthService } from './authService'
import { AuthSession } from './authSession'
import type { AuthPayload } from '../types/auth'

const adminPayload: AuthPayload = {
  user: {
    id: 8,
    full_name: 'Admin User',
    phone: '123456789',
    email: 'admin@example.com',
    role: 'admin',
  },
  accessToken: 'access-new',
}

function createSession(
  refresh: () => Promise<AuthPayload> = async () => adminPayload,
  logout: () => Promise<void> = async () => {},
): AuthSession {
  return new AuthSession({ refresh, logout })
}

function responseAdapter(
  respond: (
    request: InternalAxiosRequestConfig,
  ) =>
    | Promise<{ status: number; data: unknown }>
    | { status: number; data: unknown },
): AxiosAdapter {
  return async (config) => {
    const result = await respond(config)
    const response: AxiosResponse = {
      data: result.data,
      status: result.status,
      statusText: '',
      headers: {},
      config,
    }

    if (result.status >= 400) {
      throw new AxiosError(
        `Request failed with status code ${result.status}`,
        undefined,
        config,
        undefined,
        response,
      )
    }
    return response
  }
}

function loginEnvelope(payload: AuthPayload): unknown {
  return {
    success: true,
    message: 'OK',
    data: {
      user: payload.user,
      token: payload.accessToken,
      refreshToken: 'refresh-token-handled-by-http-only-cookie',
    },
  }
}

function authFailure(status: 401 | 403): AxiosError {
  const config = {} as InternalAxiosRequestConfig
  const response: AxiosResponse = {
    data: { success: false, message: 'Sessão inválida.' },
    status,
    statusText: '',
    headers: {},
    config,
  }
  return new AxiosError(
    'Request failed',
    undefined,
    config,
    undefined,
    response,
  )
}

function networkFailure(): AxiosError {
  return new AxiosError(
    'Network Error',
    'ERR_NETWORK',
    {} as InternalAxiosRequestConfig,
  )
}

describe('autenticação', () => {
  it('inicia sessão após login bem-sucedido de administrador', async () => {
    const session = createSession()
    let requestBody: unknown
    let withCredentials: boolean | undefined
    const client = createApiClient(session, {
      adapter: responseAdapter((request) => {
        requestBody = JSON.parse(String(request.data))
        withCredentials = request.withCredentials
        return { status: 200, data: loginEnvelope(adminPayload) }
      }),
    })
    const service = new AuthService(client, session)

    await expect(
      service.login('admin@example.com', 'password'),
    ).resolves.toEqual(adminPayload.user)
    expect(session.currentAccessToken).toBe('access-new')
    expect(withCredentials).toBe(true)
    expect(requestBody).toEqual({
      identifier: 'admin@example.com',
      password: 'password',
      adminOnly: true,
    })
    expect(Object.keys(session)).not.toContain('refreshToken')
  })

  it('aceita resposta de login sem refresh token no corpo', async () => {
    const session = createSession()
    const client = axios.create({
      adapter: responseAdapter(() => ({
        status: 200,
        data: {
          success: true,
          message: 'OK',
          data: {
            user: adminPayload.user,
            token: adminPayload.accessToken,
          },
        },
      })),
    })

    await expect(
      new AuthService(client, session).login('admin', 'password'),
    ).resolves.toEqual(adminPayload.user)
    expect(session.currentAccessToken).toBe('access-new')
  })

  it('rejeita utilizador que não seja administrador', async () => {
    const session = createSession()
    const customer = {
      ...adminPayload,
      user: { ...adminPayload.user, role: 'customer' },
    }
    const client = axios.create({
      adapter: responseAdapter(() => ({
        status: 200,
        data: loginEnvelope(customer),
      })),
    })

    await expect(
      new AuthService(client, session).login('customer', 'password'),
    ).rejects.toThrow('não tem acesso')
    expect(session.isAuthenticated).toBe(false)
  })

  it('propaga erro de credenciais inválidas sem iniciar sessão', async () => {
    const session = createSession()
    const client = axios.create({
      adapter: responseAdapter(() => ({
        status: 401,
        data: { success: false, message: 'Credenciais inválidas.' },
      })),
    })

    await expect(
      new AuthService(client, session).login('admin', 'wrong'),
    ).rejects.toMatchObject({ response: { status: 401 } })
    expect(session.isAuthenticated).toBe(false)
  })

  it('renova a sessão usando o cookie, sem argumentos de refresh token', async () => {
    const refresh = vi.fn(async () => adminPayload)
    const session = createSession(refresh)
    session.start({ accessToken: 'access-old' })

    const payload = await session.refresh()

    expect(refresh).toHaveBeenCalledWith()
    expect(payload?.user).toEqual(adminPayload.user)
    expect(session.currentAccessToken).toBe('access-new')
  })

  it('recupera o utilizador durante a inicialização da aplicação', async () => {
    const session = createSession()
    const service = new AuthService(axios.create(), session)

    await expect(service.restoreSession()).resolves.toEqual(adminPayload.user)
    expect(session.currentAccessToken).toBe('access-new')
  })

  it('partilha uma única renovação entre vários pedidos 401', async () => {
    let refreshCalls = 0
    const session = createSession(async () => {
      refreshCalls += 1
      await new Promise((resolve) => setTimeout(resolve, 10))
      return adminPayload
    })
    session.start({ accessToken: 'access-old' })
    const client = createApiClient(session, {
      adapter: responseAdapter((request) => {
        if (request.headers.get('Authorization') === 'Bearer access-new') {
          return { status: 200, data: { success: true } }
        }
        return { status: 401, data: { message: 'Token expirado.' } }
      }),
    })

    await Promise.all([client.get('/products'), client.get('/orders')])
    expect(refreshCalls).toBe(1)
  })

  it('invalida a sessão e notifica o contexto se o refresh for rejeitado', async () => {
    const session = createSession(async () => {
      throw authFailure(401)
    })
    const onExpired = vi.fn()
    session.subscribe(onExpired)
    session.start({ accessToken: 'access-old' })

    await expect(session.refresh()).resolves.toBeNull()
    expect(session.isAuthenticated).toBe(false)
    expect(onExpired).toHaveBeenCalledOnce()
  })

  it('não invalida a sessão em falha de rede durante a renovação', async () => {
    const session = createSession(async () => {
      throw networkFailure()
    })
    const onExpired = vi.fn()
    session.subscribe(onExpired)
    session.start({ accessToken: 'access-old' })

    await expect(session.refresh()).rejects.toMatchObject({
      code: 'ERR_NETWORK',
    })
    expect(session.currentAccessToken).toBe('access-old')
    expect(onExpired).not.toHaveBeenCalled()
  })

  it('limpa os dados em memória com logout e comunica com o servidor', async () => {
    let finishLogout: (() => void) | undefined
    const logout = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishLogout = resolve
        }),
    )
    const session = createSession(async () => adminPayload, logout)
    session.start({ accessToken: 'access' })

    const logoutOperation = session.logout()
    expect(session.isAuthenticated).toBe(false)
    expect(logout).toHaveBeenCalledWith()
    finishLogout?.()
    await logoutOperation
  })

  it('não restaura sessão com resposta de refresh atrasada após logout', async () => {
    let finishRefresh: ((payload: AuthPayload) => void) | undefined
    const session = createSession(
      () =>
        new Promise((resolve) => {
          finishRefresh = resolve
        }),
    )
    session.start({ accessToken: 'access-old' })

    const refresh = session.refresh()
    await session.logout()
    finishRefresh?.(adminPayload)

    await expect(refresh).resolves.toBeNull()
    expect(session.currentAccessToken).toBeNull()
  })

  it('ignora resposta atrasada de uma sessão anterior após novo login', async () => {
    let finishRefresh: ((payload: AuthPayload) => void) | undefined
    const session = createSession(
      () =>
        new Promise((resolve) => {
          finishRefresh = resolve
        }),
    )
    session.start({ accessToken: 'access-old' })

    const refresh = session.refresh()
    session.start({ accessToken: 'access-current' })
    finishRefresh?.(adminPayload)

    await expect(refresh).resolves.toBeNull()
    expect(session.currentAccessToken).toBe('access-current')
  })

  it('não desencadeia refresh após uma resposta 403', async () => {
    const refresh = vi.fn(async () => adminPayload)
    const session = createSession(refresh)
    session.start({ accessToken: 'access' })
    const client = createApiClient(session, {
      adapter: responseAdapter(() => ({
        status: 403,
        data: { message: 'Acesso negado.' },
      })),
    })

    await expect(client.get('/admin')).rejects.toMatchObject({
      response: { status: 403 },
    })
    expect(refresh).not.toHaveBeenCalled()
  })

  it('repete o pedido original com o novo access token após refresh', async () => {
    let requestCount = 0
    const session = createSession()
    session.start({ accessToken: 'access-old' })
    const client = createApiClient(session, {
      adapter: responseAdapter((request) => {
        requestCount += 1
        if (request.headers.get('Authorization') === 'Bearer access-new') {
          return { status: 200, data: { ok: true } }
        }
        return { status: 401, data: { message: 'Token expirado.' } }
      }),
    })

    await expect(client.get('/admin')).resolves.toMatchObject({
      data: { ok: true },
    })
    expect(requestCount).toBe(2)
  })

  it('não repete o pedido original quando a renovação falha', async () => {
    let requestCount = 0
    const session = createSession(async () => {
      throw authFailure(401)
    })
    session.start({ accessToken: 'access-old' })
    const client = createApiClient(session, {
      adapter: responseAdapter(() => {
        requestCount += 1
        return { status: 401, data: { message: 'Token expirado.' } }
      }),
    })

    await expect(client.get('/admin')).rejects.toMatchObject({
      response: { status: 401 },
    })
    expect(requestCount).toBe(1)
    expect(session.isAuthenticated).toBe(false)
  })
})
