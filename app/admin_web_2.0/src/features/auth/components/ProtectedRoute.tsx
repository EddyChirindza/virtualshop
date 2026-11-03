import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LoadingState } from '../../../components/ui/LoadingState'
import { useAuth } from '../context/useAuth'

export function ProtectedRoute() {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <LoadingState label="A validar a sessão..." />
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
