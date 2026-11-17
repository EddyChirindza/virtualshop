import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, ChevronRight, Heart, MapPin, ShieldAlert, ShoppingCart } from 'lucide-react';
import AccountLayout from '../components/AccountLayout';
import { api, imageUrl, session } from '../services/api';
import type { Address, CartItem } from '../types';
import { money } from '../utils/format';
import { initials } from '../utils/avatar';
import { orderStatus } from '../utils/orderStatus';

export default function Dashboard() {
  const nav = useNavigate();
  const [user, setUser] = useState<any>();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [favCount, setFavCount] = useState<number | null>(null);
  const [orders, setOrders] = useState<any[] | null>(null); // null = indisponível
  const [notices, setNotices] = useState<any[]>([]);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [error, setError] = useState('');

  const load = async () => {
    setStatus('loading');
    const [u, a, c, n, un, f, o] = await Promise.allSettled([
      api.profile(), api.addresses(), api.cart(), api.notifications(), api.unreadCount(), api.favorites(), api.orders(),
    ]);
    if (u.status === 'rejected') { setError(u.reason?.message || 'Falha ao carregar a conta.'); setStatus('error'); return; }
    setUser(u.value);
    if (a.status === 'fulfilled') setAddresses(a.value);
    if (c.status === 'fulfilled') setCart(c.value.items || []);
    if (n.status === 'fulfilled') setNotices(((n.value as any).items || []).filter((x: any) => !x.is_read).slice(0, 3));
    if (un.status === 'fulfilled') setUnread(Number(un.value?.count) || 0);
    if (f.status === 'fulfilled') setFavCount(f.value.length);
    if (o.status === 'fulfilled') {
      const list = [...o.value].sort((x: any, y: any) => +new Date(y.created_at || 0) - +new Date(x.created_at || 0));
      setOrders(list.slice(0, 3));
    }
    setStatus('ok');
  };
  useEffect(() => { load(); }, []);

  const name: string = user?.full_name || user?.name || 'Cliente';
  const cartItems = cart.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cart.reduce((s, i) => s + Number(i.unit_price) * i.quantity, 0);

  return (
    <AccountLayout>
      <div>
        {status === 'loading' && (
          <div aria-busy="true" aria-label="A carregar a sua conta">
            <div className="vs-skel" style={{ height: 108, marginBottom: 16 }} />
            <div className="vs-stats">{[0, 1, 2, 3].map(i => <div key={i} className="vs-skel" style={{ height: 112 }} />)}</div>
            <div className="vs-skel" style={{ height: 180 }} />
          </div>
        )}
        {status === 'error' && (
          <div className="vs-state vs-err vs-state-big">
            <i className="vs-state-icon"><ShieldAlert size={28} /></i>
            {/token|sess[aã]o|expirad/i.test(error) ? (<>
              <h3>A sua sessão expirou</h3>
              <p>Por segurança, termine e volte a entrar para continuar.</p>
              <button className="vs-btn" onClick={() => { session.clear(); nav('/login', { state: { from: '/dashboard' } }); }}>Entrar novamente</button>
            </>) : (<>
              <h3>Não foi possível abrir a conta</h3>
              <p>{error}</p>
              <button className="vs-btn" onClick={load}>Tentar de novo</button>
            </>)}
          </div>
        )}

        {status === 'ok' && <>
          <section className="vs-acc-hero">
            <div className="vs-avatar" aria-hidden>{user?.avatar_url ? <img src={imageUrl(user.avatar_url)} alt="" /> : initials(name)}</div>
            <div className="vs-acc-who">
              <h1>Olá, {name.split(' ')[0]}</h1>
              <p>{[user?.email, user?.phone].filter(Boolean).join(' · ') || 'Complete os seus dados para comprar mais depressa.'}</p>
            </div>
            <Link className="vs-btn vs-ghost" to="/perfil">Editar perfil</Link>
          </section>

          <div className="vs-stats">
            <Link className="vs-stat" to="/carrinho"><i><ShoppingCart size={18} /></i><span>No carrinho</span><b>{cartItems}</b></Link>
            <Link className="vs-stat" to="/favoritos"><i><Heart size={18} /></i><span>Favoritos</span><b>{favCount ?? '—'}</b></Link>
            <Link className="vs-stat" to="/notificacoes"><i><Bell size={18} /></i><span>Avisos por ler</span><b>{unread}</b></Link>
            <Link className="vs-stat" to="/enderecos"><i><MapPin size={18} /></i><span>Endereços</span><b>{addresses.length}</b></Link>
          </div>

          {cartItems > 0 && (
            <section className="vs-panel vs-cta">
              <div>
                <h3>Tem {cartItems} {cartItems === 1 ? 'artigo' : 'artigos'} à espera</h3>
                <p>Total do carrinho: <b>{money(cartTotal)}</b></p>
              </div>
              <Link className="vs-btn" to="/checkout">Finalizar compra</Link>
            </section>
          )}

          {orders && (
            <section className="vs-panel">
              <div className="vs-panel-head"><h3>Encomendas recentes</h3><Link className="vs-link" to="/pedidos">Ver todas</Link></div>
              {orders.length ? (
                <ul className="vs-list">
                  {orders.map(o => {
                    const st = orderStatus(o.status);
                    return (
                      <li className="vs-row" key={o.id}>
                        <div>
                          <b>Pedido #{o.id}</b><br />
                          <small>{o.created_at ? new Date(o.created_at).toLocaleDateString('pt-MZ') : ''}</small>
                        </div>
                        <div className="vs-row-end">
                          <span className={`vs-chip ${st.tone}`}>{st.label}</span>
                          <b>{money(o.total)}</b>
                          <Link className="vs-link" to={`/encomenda/${o.id}`} aria-label={`Abrir pedido ${o.id}`}><ChevronRight size={18} /></Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : <p className="vs-empty">Ainda não fez nenhuma encomenda. <Link className="vs-link" to="/">Descobrir produtos</Link></p>}
            </section>
          )}

          <div className="vs-cols">
            <section className="vs-panel">
              <div className="vs-panel-head"><h3>Endereço de entrega</h3><Link className="vs-link" to="/enderecos">Gerir</Link></div>
              {addresses[0] ? (
                <p><b>{addresses[0].label}</b><br />{addresses[0].street} {addresses[0].number}, {addresses[0].neighborhood}<br /><small>{addresses[0].city}, {addresses[0].province}</small></p>
              ) : <p className="vs-empty">Ainda não tem endereços. <Link className="vs-link" to="/enderecos">Adicionar</Link></p>}
            </section>

            <section className="vs-panel">
              <div className="vs-panel-head"><h3>Novidades para si</h3><Link className="vs-link" to="/notificacoes">Ver todas</Link></div>
              {notices.length ? (
                <ul className="vs-list">{notices.map(n => <li key={n.id}><b>{n.title}</b><br /><small>{n.message}</small></li>)}</ul>
              ) : <p className="vs-empty">Está tudo em dia.</p>}
            </section>
          </div>
        </>}
      </div>
    </AccountLayout>
  );
}