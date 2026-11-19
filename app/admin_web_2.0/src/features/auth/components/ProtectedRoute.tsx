import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LoadingState } from '../../../components/ui/LoadingState'
import { useAuth } from '../context/useAuth'
import { SessionRecovery } from './SessionRecovery'
import type { AdminRole } from '../types/auth'

interface ProtectedRouteProps {
  allowedRoles?: readonly AdminRole[]
}

export function ProtectedRoute({ allowedRoles = ['admin'] }: ProtectedRouteProps) {
  const {
    user,
    sessionStatus,
    sessionError,
    retrySessionRestore,
  } = useAuth()
  const location = useLocation()

  if (sessionStatus === 'initializing') {
    return <LoadingState label="A recuperar a sessão..." />
  }

  if (sessionStatus === 'unavailable') {
    return (
      <SessionRecovery
        message={sessionError}
        onRetry={retrySessionRestore}
      />
    )
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
