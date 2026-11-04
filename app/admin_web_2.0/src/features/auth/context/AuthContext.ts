import { createContext } from 'react'
import type { AdminUser } from '../types/auth'

export type AuthSessionStatus =
  | 'initializing'
  | 'authenticated'
  | 'anonymous'
  | 'unavailable'

export interface AuthContextValue {
  user: AdminUser | null
  isAuthenticated: boolean
  isLoading: boolean
  isInitializing: boolean
  sessionStatus: AuthSessionStatus
  sessionError: string | null
  login: (identifier: string, password: string) => Promise<void>
  logout: () => Promise<void>
  retrySessionRestore: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
