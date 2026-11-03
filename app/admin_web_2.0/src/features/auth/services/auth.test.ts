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
  refreshToken: 'refresh-new',
}

function createSession(
  refresh: (token: string) => Promise<AuthPayload> = async () => adminPayload,
  logout: (token: string) => Promise<void> = async () => {},
): AuthSession {
  return new AuthSession({ refresh, logout })
}

function responseAdapter(
  respond: (
    request: InternalAxiosRequestConfig,
  ) => Promise<{ status: number; data: unknown }> | { status: number; data: unknown },
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
  return { success: true, message: 'OK', data: {
    user: payload.user,
    token: payload.accessToken,
    refreshToken: payload.refreshToken,
  } }
}

describe('autenticação', () => {
  it('inicia sessão após login bem-sucedido de administrador', async () => {
    const session = createSession()
    let requestBody: unknown
    const client = axios.create({
      adapter: responseAdapter((request) => {
        requestBody = JSON.parse(String(request.data))
        return { status: 200, data: loginEnvelope(adminPayload) }
      }),
    })
    const service = new AuthService(client, session)

    await expect(service.login('admin@example.com', 'password')).resolves.toEqual(
      adminPayload.user,
    )
    expect(session.currentAccessToken).toBe('access-new')
    expect(requestBody).toEqual({
      identifier: 'admin@example.com',
      password: 'password',
      adminOnly: true,
    })
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

    await expect(new AuthService(client, session).login('customer', 'password'))
      .rejects.toThrow('não tem acesso')
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

    await expect(new AuthService(client, session).login('admin', 'wrong'))
      .rejects.toMatchObject({ response: { status: 401 } })
    expect(session.isAuthenticated).toBe(false)
  })

  it('renova e substitui ambos os tokens durante a rotação', async () => {
    const refresh = vi.fn(async (token: string) => {
      expect(token).toBe('refresh-old')
      return adminPayload
    })
    const session = createSession(refresh)
    session.start({ accessToken: 'access-old', refreshToken: 'refresh-old' })

    await expect(session.refresh()).resolves.toBe(true)
    expect(session.currentAccessToken).toBe('access-new')
    await session.refresh()
    expect(refresh).toHaveBeenLastCalledWith('refresh-new')
  })

  it('partilha uma única renovação entre vários pedidos 401', async () => {
    let refreshCalls = 0
    const session = createSession(async () => {
      refreshCalls += 1
      await new Promise((resolve) => setTimeout(resolve, 10))
      return adminPayload
    })
    session.start({ accessToken: 'access-old', refreshToken: 'refresh-old' })
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

  it('invalida a sessão e notifica o contexto se o refresh falhar', async () => {
    const session = createSession(async () => {
      throw new Error('Refresh inválido.')
    })
    const onExpired = vi.fn()
    session.subscribe(onExpired)
    session.start({ accessToken: 'access-old', refreshToken: 'refresh-old' })

    await expect(session.refresh()).resolves.toBe(false)
    expect(session.isAuthenticated).toBe(false)
    expect(onExpired).toHaveBeenCalledOnce()
  })

  it('limpa os tokens localmente antes de concluir o pedido de logout', async () => {
    let finishLogout: (() => void) | undefined
    const session = createSession(
      async () => adminPayload,
      () => new Promise<void>((resolve) => {
        finishLogout = resolve
      }),
    )
    session.start({ accessToken: 'access', refreshToken: 'refresh' })

    const logout = session.logout()
    expect(session.isAuthenticated).toBe(false)
    finishLogout?.()
    await logout
  })

  it('não restaura sessão com resposta de refresh atrasada após logout', async () => {
    let finishRefresh: ((payload: AuthPayload) => void) | undefined
    const session = createSession(
      () => new Promise((resolve) => {
        finishRefresh = resolve
      }),
    )
    session.start({ accessToken: 'access-old', refreshToken: 'refresh-old' })

    const refresh = session.refresh()
    await session.logout()
    finishRefresh?.(adminPayload)

    await expect(refresh).resolves.toBe(false)
    expect(session.currentAccessToken).toBeNull()
  })

  it('ignora resposta atrasada de uma sessão anterior após nova autenticação', async () => {
    let finishRefresh: ((payload: AuthPayload) => void) | undefined
    const session = createSession(
      () => new Promise((resolve) => {
        finishRefresh = resolve
      }),
    )
    session.start({ accessToken: 'access-old', refreshToken: 'refresh-old' })

    const refresh = session.refresh()
    session.start({ accessToken: 'access-current', refreshToken: 'refresh-current' })
    finishRefresh?.(adminPayload)

    await expect(refresh).resolves.toBe(false)
    expect(session.currentAccessToken).toBe('access-current')
  })

  it('não desencadeia refresh após uma resposta 403', async () => {
    const refresh = vi.fn(async () => adminPayload)
    const session = createSession(refresh)
    session.start({ accessToken: 'access', refreshToken: 'refresh' })
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
    session.start({ accessToken: 'access-old', refreshToken: 'refresh-old' })
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
})
