import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { session } from '../services/api';

export default function ProtectedRoute() {
  const location = useLocation();
  if (!session.token) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
