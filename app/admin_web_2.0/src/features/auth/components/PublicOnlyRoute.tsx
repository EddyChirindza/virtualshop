import {
  Navigate,
  Outlet,
  useLocation,
  type Location,
} from 'react-router-dom'
import { LoadingState } from '../../../components/ui/LoadingState'
import { useAuth } from '../context/useAuth'

interface RedirectState {
  from?: Location
}

export function PublicOnlyRoute() {
  const { user, sessionStatus } = useAuth()
  const location = useLocation()

  if (sessionStatus === 'initializing') {
    return <LoadingState label="A recuperar a sessão..." />
  }

  if (user?.role === 'admin') {
    const from = (location.state as RedirectState | null)?.from
    const target =
      from?.pathname && from.pathname !== '/login'
        ? { pathname: from.pathname, search: from.search, hash: from.hash }
        : { pathname: '/dashboard' }

    return <Navigate to={target} replace />
  }

  return <Outlet />
}
