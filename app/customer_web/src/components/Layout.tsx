import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Heart, Home, Search, ShoppingCart, SlidersHorizontal, User } from 'lucide-react';
import { api, session } from '../services/api';
import type { ProductSort } from '../types';
import '../styles/theme.css';

type SearchFilters = {
  minPrice: string;
  maxPrice: string;
  sort: ProductSort;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  onSortChange: (value: ProductSort) => void;
  onApply: () => void;
  onClear: () => void;
};

type Props = {
  children: React.ReactNode;
  query?: string;
  onQuery?: (v: string) => void;
  searchFilters?: SearchFilters;
};

export default function Layout({ children, query, onQuery, searchFilters }: Props) {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const logged = !!session.token;
  const [unread, setUnread] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [headerError, setHeaderError] = useState('');
  const [local, setLocal] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Na Home a pesquisa filtra ao escrever; nas outras páginas leva à Home com o termo.
  const value = onQuery ? (query ?? '') : local;
  const change = (v: string) => (onQuery ? onQuery(v) : setLocal(v));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (onQuery) return document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
    const q = local.trim();
    nav(q ? `/?q=${encodeURIComponent(q)}` : '/');
  };

  const applyFilters = (e: FormEvent) => {
    e.preventDefault();
    searchFilters?.onApply();
    setFiltersOpen(false);
    document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
  };

  const clearFilters = () => {
    searchFilters?.onClear();
    setFiltersOpen(false);
  };

  const goAccount = () => nav(logged ? '/dashboard' : '/login');

  useEffect(() => {
    if (!logged) {
      setUnread(0);
      setCartCount(0);
      setHeaderError('');
      return;
    }
    Promise.allSettled([api.unreadCount(), api.cart()]).then(([notifications, cart]) => {
      if (notifications.status === 'fulfilled') {
        setUnread(Number(notifications.value?.count) || 0);
      }
      if (cart.status === 'fulfilled') {
        setCartCount(cart.value.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0));
      }
      const failures = [notifications, cart].filter(result => result.status === 'rejected');
      setHeaderError(failures.length
        ? failures.map(result => result.status === 'rejected'
          ? result.reason instanceof Error ? result.reason.message : String(result.reason)
          : '').join(' · ')
        : '');
    });
  }, [logged]);

  const tabs: [string, string, React.ReactNode, boolean, number][] = [
    ['/', 'Início', <Home size={22} />, pathname === '/', 0],
    ['/favoritos', 'Favoritos', <Heart size={22} />, pathname.startsWith('/favoritos'), 0],
    ['/carrinho', 'Carrinho', <ShoppingCart size={22} />, /^\/(carrinho|checkout)/.test(pathname), cartCount],
    [logged ? '/dashboard' : '/login', logged ? 'Conta' : 'Entrar', <User size={22} />,
      /^\/(dashboard|pedidos|encomenda|enderecos|metodos-pagamento|perfil|notificacoes|login)/.test(pathname), unread],
  ];

  const badge = (n: number) => (n > 0 ? <i className="vs-badge">{n > 9 ? '9+' : n}</i> : null);

  return (
    <div className="vs-root">
      <div className="vs-top">Entrega ao domicílio: 50 MT · Levantamento na loja: grátis</div>
      <header className="vs-header">
        <div className="vs-wrap">
          <Link to="/" className="vs-brand"><b>V</b><span>virtual<em>shop</em></span></Link>

          <div className="vs-search-area">
            <form className="vs-search" role="search" onSubmit={submit}>
              <input value={value} onChange={e => change(e.target.value)} placeholder="Pesquisar produtos, marcas e categorias" aria-label="Pesquisar produtos" />
              {searchFilters && (
                <button
                  type="button"
                  className="vs-search-filter-toggle"
                  aria-label="Filtros de pesquisa"
                  aria-expanded={filtersOpen}
                  aria-controls="vs-search-filters"
                  onClick={() => setFiltersOpen(open => !open)}
                >
                  <SlidersHorizontal size={18} /><span>Filtros</span>
                </button>
              )}
              <button type="submit" className="vs-search-submit"><Search size={18} /><span>Pesquisar</span></button>
            </form>
            {searchFilters && filtersOpen && (
              <form id="vs-search-filters" className="vs-search-popover" aria-label="Filtros de pesquisa" onSubmit={applyFilters}>
                <div className="vs-search-filter-fields">
                  <label className="vs-field" htmlFor="vs-min-price">Preço mínimo
                    <input id="vs-min-price" type="number" min="0" step="0.01" value={searchFilters.minPrice} onChange={event => searchFilters.onMinPriceChange(event.target.value)} />
                  </label>
                  <label className="vs-field" htmlFor="vs-max-price">Preço máximo
                    <input id="vs-max-price" type="number" min={searchFilters.minPrice || 0} step="0.01" value={searchFilters.maxPrice} onChange={event => searchFilters.onMaxPriceChange(event.target.value)} />
                  </label>
                  <label className="vs-field" htmlFor="vs-sort">Relevância
                    <select id="vs-sort" value={searchFilters.sort} onChange={event => searchFilters.onSortChange(event.target.value as ProductSort)}>
                      <option value="relevance">Mais relevantes</option>
                      <option value="newest">Mais recentes</option>
                      <option value="price_asc">Menor preço</option>
                      <option value="price_desc">Maior preço</option>
                    </select>
                  </label>
                </div>
                <div className="vs-search-filter-actions">
                  <button type="button" className="vs-link" onClick={clearFilters}>Limpar filtros</button>
                  <button type="submit" className="vs-btn">Pesquisar</button>
                </div>
              </form>
            )}
          </div>

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

      {headerError && <p className="vs-error" role="alert" style={{ margin: '8px auto', maxWidth: 1200 }}>{headerError}</p>}
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