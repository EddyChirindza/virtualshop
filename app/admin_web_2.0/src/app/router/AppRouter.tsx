import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { LoadingState } from '../../components/ui/LoadingState'
import { LoginPage } from '../../features/auth/components/LoginPage'
import { ProtectedRoute } from '../../features/auth/components/ProtectedRoute'
import { PublicOnlyRoute } from '../../features/auth/components/PublicOnlyRoute'
import { AdministratorsPage } from '../../features/administrators/pages/AdministratorsPage'
import { CategoriesPage } from '../../features/categories/pages/CategoriesPage'
import { CustomersPage } from '../../features/customers/pages/CustomersPage'
import { NotificationsPage } from '../../features/notifications/pages/NotificationsPage'
import { OrdersPage } from '../../features/orders/pages/OrdersPage'
import { ProductsPage } from '../../features/products/pages/ProductsPage'
import { SettingsPage } from '../../features/settings/pages/SettingsPage'

const DashboardPage = lazy(() =>
  import('../../features/dashboard/pages/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  })),
)

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route element={<LoginPage />} path="/login" />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route element={<Navigate replace to="/dashboard" />} index />
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
            <Route element={<CategoriesPage />} path="/categories" />
            <Route element={<CustomersPage />} path="/customers" />
            <Route element={<AdministratorsPage />} path="/administrators" />
            <Route element={<NotificationsPage />} path="/notifications" />
            <Route element={<SettingsPage />} path="/settings" />
          </Route>
        </Route>
        <Route element={<Navigate replace to="/dashboard" />} path="*" />
      </Routes>
    </BrowserRouter>
  )
}
