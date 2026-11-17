

# A parte web 
#  A estrtura das pasta/arquivos
customer_web/
├── node_modules/
├── src/
│   ├── components/             
│   │   ├── Layout.tsx          
│   │   └── ProtectedRoute.tsx  
│   ├── pages/
│   │   ├── Home.tsx            
│   │   ├── Login.tsx           
│   │   └── Dashboard.tsx       
│   ├── services/
│   │   └── api.ts              
│   ├── styles/                
│   │   └── theme.css           
│   ├── main.tsx                
│   ├── types.ts                
│   └── vite-env.d.ts


# Integração das novas telas

## 1. Rotas (App.tsx / router)

```tsx
import RequireAuth from './components/RequireAuth';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Favorites from './pages/Favorites';
import Addresses from './pages/Addresses';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import NotFound from './pages/NotFound';

// dentro de <Routes>:
<Route path="/checkout"      element={<RequireAuth><Checkout /></RequireAuth>} />
<Route path="/pedidos"       element={<RequireAuth><Orders /></RequireAuth>} />
<Route path="/encomenda/:id" element={<RequireAuth><OrderDetail /></RequireAuth>} />
<Route path="/favoritos"     element={<RequireAuth><Favorites /></RequireAuth>} />
<Route path="/enderecos"     element={<RequireAuth><Addresses /></RequireAuth>} />
<Route path="/perfil"        element={<RequireAuth><Profile /></RequireAuth>} />
<Route path="/notificacoes"  element={<RequireAuth><Notifications /></RequireAuth>} />
<Route path="*"              element={<NotFound />} />
```

## 2. services/api.ts

O ficheiro `services/api.ts` desta pasta é o teu, com estas adições (o resto ficou igual):

| Método | Pedido |
|---|---|
| `api.checkout(input?)` | `POST /orders` (agora aceita `{ addressId, payment, phone, notes }` e devolve a `Order`) |
| `api.orders()` | `GET /orders` |
| `api.favorites()` | `GET /favorites` |
| `api.addAddress / updateAddress / deleteAddress` | `POST`, `PATCH`, `DELETE /users/me/addresses[/:id]` |
| `api.updateProfile(input)` | `PATCH /users/me` |
| `api.markRead(id)` / `api.markAllRead()` | `PATCH /notifications/:id/read` e `/notifications/read-all` |

Os caminhos seguem o padrão dos teus endpoints actuais, mas o backend tem de os ter. Se algum tiver outro nome, é só mudar a string em `api.ts`.

## 3. Pequenos ajustes nas páginas existentes

- **Cart.tsx**: o botão "Finalizar compra" passa a `nav('/checkout')` em vez de chamar `api.checkout()` directamente.
- **Dashboard.tsx**: o separador "Pedidos" pode ligar a `/pedidos`, e "Endereços" / "Notificações" a `/enderecos` / `/notificacoes`.
- **Layout.tsx**: adicionar links para `/favoritos` e `/perfil` no menu do utilizador.
- **OrderDetail.tsx**: confirma os valores reais de `order.status` e ajusta o array `STEPS`.