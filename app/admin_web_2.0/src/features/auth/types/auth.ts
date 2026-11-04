export interface AdminUser {
  id: number
  full_name: string
  phone: string
  email: string | null
  role: string
}

export interface AuthTokens {
  accessToken: string
}

export interface AuthPayload extends AuthTokens {
  user: AdminUser
}

export interface ApiEnvelope<T> {
  success: boolean
  message: string
  data: T
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export function parseAdminUser(value: unknown): AdminUser {
  if (
    !isRecord(value) ||
    typeof value.id !== 'number' ||
    !Number.isSafeInteger(value.id) ||
    typeof value.full_name !== 'string' ||
    typeof value.phone !== 'string' ||
    (typeof value.email !== 'string' && value.email !== null) ||
    typeof value.role !== 'string'
  ) {
    throw new AuthenticationError('A resposta de autenticação é inválida.')
  }

  return {
    id: value.id,
    full_name: value.full_name,
    phone: value.phone,
    email: value.email,
    role: value.role,
  }
}

export function parseAuthPayload(response: unknown): AuthPayload {
  if (!isRecord(response) || !isRecord(response.data)) {
    throw new AuthenticationError('A resposta de autenticação é inválida.')
  }

  const { data } = response
  const accessToken = data.token

  if (typeof accessToken !== 'string' || accessToken.length === 0) {
    throw new AuthenticationError('A resposta de autenticação é inválida.')
  }

  return {
    user: parseAdminUser(data.user),
    accessToken,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
