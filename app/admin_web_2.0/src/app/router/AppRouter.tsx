import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { LoadingState } from '../../components/ui/LoadingState'
import { LoginPage } from '../../features/auth/components/LoginPage'
import { ProtectedRoute } from '../../features/auth/components/ProtectedRoute'
import { PublicOnlyRoute } from '../../features/auth/components/PublicOnlyRoute'
import { AdministratorsPage } from '../../features/administrators/pages/AdministratorsPage'
import { BannersPage } from '../../features/banners/pages/BannersPage'
import { CategoriesPage } from '../../features/categories/pages/CategoriesPage'
import { CustomersPage } from '../../features/customers/pages/CustomersPage'
import { NotificationsPage } from '../../features/notifications/pages/NotificationsPage'
import { OrdersPage } from '../../features/orders/pages/OrdersPage'
import { ProductsPage } from '../../features/products/pages/ProductsPage'
import { ReviewsPage } from '../../features/reviews/pages/ReviewsPage'
import { SettingsPage } from '../../features/settings/pages/SettingsPage'
import { SupportInboxPage } from '../../features/support/pages/SupportInboxPage'
import { useAuth } from '../../features/auth/context/useAuth'

const DashboardPage = lazy(() =>
  import('../../features/dashboard/pages/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  })),
)

function RoleHomeRedirect() {
  const { user } = useAuth()
  return (
    <Navigate
      replace
      to={user?.role === 'support' ? '/support' : user?.role === 'admin' ? '/dashboard' : '/login'}
    />
  )
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route element={<LoginPage />} path="/login" />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={['admin', 'support']} />}>
          <Route element={<AdminLayout />}>
            <Route element={<RoleHomeRedirect />} index />
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route
                element={
                  <Suspense fallback={<LoadingState label="A carregar dashboard..." />}>
                    <DashboardPage />
                  </Suspense>
                }
                path="/dashboard"
              />
              <Route element={<OrdersPage />} path="/orders" />
              <Route element={<ProductsPage />} path="/products" />
              <Route element={<ReviewsPage />} path="/reviews" />
              <Route element={<BannersPage />} path="/banners" />
              <Route element={<CategoriesPage />} path="/categories" />
              <Route element={<CustomersPage />} path="/customers" />
              <Route element={<AdministratorsPage />} path="/administrators" />
              <Route element={<NotificationsPage />} path="/notifications" />
              <Route element={<SettingsPage />} path="/settings" />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={['admin', 'support']} />}>
              <Route element={<SupportInboxPage />} path="/support" />
            </Route>
          </Route>
        </Route>
        <Route element={<RoleHomeRedirect />} path="*" />
      </Routes>
    </BrowserRouter>
  )
}
