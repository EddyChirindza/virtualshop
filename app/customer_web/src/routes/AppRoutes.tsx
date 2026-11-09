import { Route, Routes } from 'react-router-dom';
import Home from '../pages/Home';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import ProductDetail from '../pages/ProductDetail';
import Cart from '../pages/Cart';
import ProtectedRoute from './ProtectedRoute';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/produto/:id" element={<ProductDetail />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/carrinho" element={<Cart />} />
      </Route>
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
