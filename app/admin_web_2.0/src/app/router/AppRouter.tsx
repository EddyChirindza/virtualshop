import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { LoginPage } from '../../features/auth/components/LoginPage'
import { ProtectedRoute } from '../../features/auth/components/ProtectedRoute'
import { AdministratorsPage } from '../../features/administrators/pages/AdministratorsPage'
import { CategoriesPage } from '../../features/categories/pages/CategoriesPage'
import { CustomersPage } from '../../features/customers/pages/CustomersPage'
import { DashboardPage } from '../../features/dashboard/pages/DashboardPage'
import { NotificationsPage } from '../../features/notifications/pages/NotificationsPage'
import { OrdersPage } from '../../features/orders/pages/OrdersPage'
import { ProductsPage } from '../../features/products/pages/ProductsPage'
import { SettingsPage } from '../../features/settings/pages/SettingsPage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<LoginPage />} path="/login" />
        <Route element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route element={<Navigate replace to="/dashboard" />} index />
            <Route element={<DashboardPage />} path="/dashboard" />
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
