import { useQueryClient } from '@tanstack/react-query'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { authSession } from '../../../lib/api/client'
import { getApiErrorMessage } from '../../../lib/api/errors'
import { authService } from '../services/authService'
import type { AdminUser } from '../types/auth'
import {
  AuthContext,
  type AuthSessionStatus,
} from './AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [sessionStatus, setSessionStatus] =
    useState<AuthSessionStatus>('initializing')
  const [sessionError, setSessionError] = useState<string | null>(null)
  const loginSequence = useRef(0)
  const restoreSequence = useRef(0)

  useEffect(() => {
    return authSession.subscribe(() => {
      queryClient.clear()
      setUser(null)
      setSessionStatus('anonymous')
      setSessionError(null)
    })
  }, [queryClient])

  const runSessionRestore = useCallback(async () => {
    const sequence = ++restoreSequence.current

    try {
      const restoredUser = await authService.restoreSession()
      if (sequence !== restoreSequence.current) return

      if (restoredUser?.role === 'admin') {
        setUser(restoredUser)
        setSessionStatus('authenticated')
      } else {
        setUser(null)
        setSessionStatus('anonymous')
      }
    } catch (error) {
      if (sequence !== restoreSequence.current) return
      setUser(null)
      setSessionError(getApiErrorMessage(error))
      setSessionStatus('unavailable')
    }
  }, [])

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      void runSessionRestore()
    }, 0)

    return () => window.clearTimeout(restoreTimer)
  }, [runSessionRestore])

  const restoreSession = useCallback(async () => {
    setSessionStatus('initializing')
    setSessionError(null)
    await runSessionRestore()
  }, [runSessionRestore])

  const login = useCallback(async (identifier: string, password: string) => {
    const sequence = ++loginSequence.current
    restoreSequence.current += 1
    setIsLoading(true)
    setSessionError(null)
    try {
      const authenticatedUser = await authService.login(identifier, password)
      if (sequence !== loginSequence.current) return
      setUser(authenticatedUser)
      setSessionStatus('authenticated')
    } finally {
      if (sequence === loginSequence.current) setIsLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    loginSequence.current += 1
    restoreSequence.current += 1
    queryClient.clear()
    setIsLoading(false)
    setUser(null)
    setSessionStatus('anonymous')
    setSessionError(null)
    await authSession.logout()
  }, [queryClient])

  const retrySessionRestore = useCallback(async () => {
    await restoreSession()
  }, [restoreSession])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: user?.role === 'admin',
      isLoading,
      isInitializing: sessionStatus === 'initializing',
      sessionStatus,
      sessionError,
      login,
      logout,
      retrySessionRestore,
    }),
    [
      user,
      isLoading,
      sessionStatus,
      sessionError,
      login,
      logout,
      retrySessionRestore,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
