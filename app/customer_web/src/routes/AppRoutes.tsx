import { Route, Routes } from 'react-router-dom';
import Home from '../pages/Home';
import AboutUs from '../pages/AboutUs';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import ProductDetail from '../pages/ProductDetail';
import Cart from '../pages/Cart';
import Checkout from '../pages/Checkout';
import Orders from '../pages/Orders';
import OrderDetail from '../pages/OrderDetail';
import Favorites from '../pages/Favorites';
import Addresses from '../pages/Addresses';
import Profile from '../pages/Profile';
import Notifications from '../pages/Notifications';
import PaymentMethods from '../pages/PaymentMethods';
import SupportChat from '../pages/SupportChat';
import NotFound from '../pages/NotFound';
import ProtectedRoute from './ProtectedRoute';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/sobre-nos" element={<AboutUs />} />
      <Route path="/login" element={<Login />} />
      <Route path="/produto/:id" element={<ProductDetail />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/carrinho" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/pedidos" element={<Orders />} />
        <Route path="/encomenda/:id" element={<OrderDetail />} />
        <Route path="/favoritos" element={<Favorites />} />
        <Route path="/enderecos" element={<Addresses />} />
        <Route path="/metodos-pagamento" element={<PaymentMethods />} />
        <Route path="/perfil" element={<Profile />} />
        <Route path="/notificacoes" element={<Notifications />} />
        <Route path="/assistencia" element={<SupportChat />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}