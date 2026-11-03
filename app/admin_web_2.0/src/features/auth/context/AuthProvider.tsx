import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { authSession } from '../../../lib/api/client'
import { authService } from '../services/authService'
import type { AdminUser } from '../types/auth'
import { AuthContext } from './AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const loginSequence = useRef(0)

  useEffect(
    () => authSession.subscribe(() => setUser(null)),
    [],
  )

  const login = useCallback(async (identifier: string, password: string) => {
    const sequence = ++loginSequence.current
    setIsLoading(true)
    setUser(null)
    try {
      const authenticatedUser = await authService.login(identifier, password)
      setUser(authenticatedUser)
    } finally {
      if (sequence === loginSequence.current) setIsLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    loginSequence.current += 1
    setIsLoading(false)
    setUser(null)
    await authSession.logout()
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: user?.role === 'admin',
      isLoading,
      login,
      logout,
    }),
    [user, isLoading, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
