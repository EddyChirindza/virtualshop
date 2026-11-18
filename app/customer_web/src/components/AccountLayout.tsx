import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Bell, CreditCard, Heart, LayoutDashboard, LogOut, MapPin, Package, User } from 'lucide-react';
import Layout from './Layout';
import { api } from '../services/api';

const GROUPS: { title: string; links: [string, string, ReactNode][] }[] = [
  {
    title: 'Compras',
    links: [
      ['/dashboard', 'Resumo', <LayoutDashboard size={18} />],
      ['/pedidos', 'Os meus pedidos', <Package size={18} />],
      ['/favoritos', 'Favoritos', <Heart size={18} />],
    ],
  },
  {
    title: 'Conta',
    links: [
      ['/perfil', 'Dados pessoais', <User size={18} />],
      ['/enderecos', 'Endereços', <MapPin size={18} />],
      ['/metodos-pagamento', 'Pagamentos', <CreditCard size={18} />],
      ['/notificacoes', 'Notificações', <Bell size={18} />],
    ],
  },
];

// Moldura comum a todas as páginas da conta: menu lateral + conteúdo.
export default function AccountLayout({ children }: { children: ReactNode }) {
  const nav = useNavigate();
  const logout = async () => {
    try {
      await api.logout();
      nav('/', { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido.';
      nav('/login', {
        replace: true,
        state: { notice: `Sessão terminada neste dispositivo, mas a API não confirmou o logout: ${message}` },
      });
    }
  };

  return (
    <Layout>
      <div className="vs-wrap vs-acc">
        <nav className="vs-acc-side" aria-label="A minha conta">
          {GROUPS.map(g => (
            <div key={g.title}>
              <h4>{g.title}</h4>
              {g.links.map(([to, label, icon]) => (
                <NavLink key={to} to={to}>{icon}<span>{label}</span></NavLink>
              ))}
            </div>
          ))}
          <button className="vs-acc-out" onClick={() => void logout()}><LogOut size={18} /><span>Terminar sessão</span></button>
        </nav>
        <div className="vs-acc-main">{children}</div>
      </div>
    </Layout>
  );
}