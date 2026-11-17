import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Heart, Home, Search, ShoppingCart, User } from 'lucide-react';
import { api, session } from '../services/api';
import '../styles/theme.css';

type Props = { children: React.ReactNode; query?: string; onQuery?: (v: string) => void };

export default function Layout({ children, query, onQuery }: Props) {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const logged = !!session.token;
  const [unread, setUnread] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [local, setLocal] = useState('');

  // Na Home a pesquisa filtra ao escrever; nas outras páginas leva à Home com o termo.
  const value = onQuery ? (query ?? '') : local;
  const change = (v: string) => (onQuery ? onQuery(v) : setLocal(v));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (onQuery) return document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
    const q = local.trim();
    nav(q ? `/?q=${encodeURIComponent(q)}` : '/');
  };

  const goAccount = () => nav(logged ? '/dashboard' : '/login');

  useEffect(() => {
    if (!logged) return;
    api.unreadCount().then(d => setUnread(Number(d?.count) || 0)).catch(() => {});
    api.cart()
      .then(c => setCartCount((c.items || []).reduce((s, i) => s + Number(i.quantity || 0), 0)))
      .catch(() => {});
  }, [logged]);

  const tabs: [string, string, React.ReactNode, boolean, number][] = [
    ['/', 'Início', <Home size={22} />, pathname === '/', 0],
    ['/favoritos', 'Favoritos', <Heart size={22} />, pathname.startsWith('/favoritos'), 0],
    ['/carrinho', 'Carrinho', <ShoppingCart size={22} />, /^\/(carrinho|checkout)/.test(pathname), cartCount],
    [logged ? '/dashboard' : '/login', logged ? 'Conta' : 'Entrar', <User size={22} />,
      /^\/(dashboard|pedidos|encomenda|enderecos|perfil|notificacoes|login)/.test(pathname), unread],
  ];

  const badge = (n: number) => (n > 0 ? <i className="vs-badge">{n > 9 ? '9+' : n}</i> : null);

  return (
    <div className="vs-root">
      <div className="vs-top">Entrega grátis em compras acima de 2000 MT</div>
      <header className="vs-header">
        <div className="vs-wrap">
          <Link to="/" className="vs-brand"><b>V</b><span>virtual<em>shop</em></span></Link>

          <form className="vs-search" role="search" onSubmit={submit}>
            <input value={value} onChange={e => change(e.target.value)} placeholder="Pesquisar produtos, marcas e categorias" aria-label="Pesquisar produtos" />
            <button type="submit"><Search size={18} /><span>Pesquisar</span></button>
          </form>

          <nav className="vs-nav">
            <button onClick={goAccount}><User size={22} /><span>{logged ? 'Conta' : 'Entrar'}</span></button>
            <button onClick={() => nav('/favoritos')}><Heart size={22} /><span>Favoritos</span></button>
            {logged && (
              <button onClick={() => nav('/notificacoes')} aria-label={unread ? `Avisos, ${unread} por ler` : 'Avisos'}>
                <Bell size={22} /><span>Avisos</span>{badge(unread)}
              </button>
            )}
            <button onClick={() => nav('/carrinho')} aria-label={cartCount ? `Carrinho, ${cartCount} artigos` : 'Carrinho'}>
              <ShoppingCart size={22} /><span>Carrinho</span>{badge(cartCount)}
            </button>
          </nav>
        </div>
      </header>

      {children}

      <nav className="vs-tabbar" aria-label="Navegação principal">
        {tabs.map(([to, label, icon, active, count]) => (
          <Link key={to} to={to} aria-current={active ? 'page' : undefined}>{icon}<span>{label}</span>{badge(count)}</Link>
        ))}
      </nav>

      <footer className="vs-footer">
        <div className="vs-wrap">
          <div>
            <Link to="/">Loja</Link>
            <Link to="/dashboard">A minha conta</Link>
            <Link to="/pedidos">Os meus pedidos</Link>
            <Link to="/favoritos">Favoritos</Link>
            <Link to="/perfil">Perfil</Link>
          </div>
          <div>Feito em Moçambique. © VirtualShop</div>
        </div>
      </footer>
    </div>
  );
}