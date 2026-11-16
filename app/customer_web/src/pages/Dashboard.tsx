import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, LogOut, MapPin, ShoppingBag, User } from 'lucide-react';
import Layout from '../components/Layout';
import { api, session } from '../services/api';
import type { Address, CartItem } from '../types';
import type { FormEvent, ReactElement } from 'react';

type Tab = 'resumo' | 'enderecos' | 'notificacoes' | 'pedidos';
const money = (v: number | string) => `${Number(v).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT`;

export default function Dashboard() {
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>('resumo');
  const [user, setUser] = useState<any>();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [error, setError] = useState('');
  const [orderId, setOrderId] = useState('');
  const [order, setOrder] = useState<any>();
  const [orderError, setOrderError] = useState('');

  const load = async () => {
    setStatus('loading');
    const [u, a, c, n] = await Promise.allSettled([api.profile(), api.addresses(), api.cart(), api.notifications()]);
    if (u.status === 'rejected') { setError(u.reason?.message || 'Falha ao carregar a conta'); setStatus('error'); return; }
    setUser(u.value);
    if (a.status === 'fulfilled') setAddresses(a.value);
    if (c.status === 'fulfilled') setCart(c.value.items || []);
    if (n.status === 'fulfilled') setNotices((n.value as any).items || []);
    setStatus('ok');
  };
  useEffect(() => { load(); }, []);
  const logout = () => { session.clear(); nav('/', { replace: true }); };
  const total = cart.reduce((s, i) => s + Number(i.unit_price) * i.quantity, 0);
  const items = cart.reduce((s, i) => s + i.quantity, 0);
  const findOrder = async (e: FormEvent) => {
    e.preventDefault(); setOrder(undefined); setOrderError('');
    try { setOrder(await api.order(Number(orderId))); }
    catch (err) { setOrderError((err as Error).message); }
  };
  
  const tabs: [Tab, string,  ReactElement][] = [
    ['resumo', 'Resumo', <User size={18} />],
    ['enderecos', 'Endereços', <MapPin size={18} />],
    ['notificacoes', 'Notificações', <Bell size={18} />],
    ['pedidos', 'Pedidos', <ShoppingBag size={18} />],
  ];

  return (
    <Layout>
      <div className="vs-wrap vs-dash">
        <aside className="vs-side">
          {tabs.map(([k, label, icon]) => (
            <button key={k} aria-current={tab === k} onClick={() => setTab(k)}>{icon}{label}</button>
          ))}
          <button onClick={logout}><LogOut size={18} />Terminar sessão</button>
        </aside>

        <section>
          {status === 'loading' && <div className="vs-state">A carregar a sua conta…</div>}
          {status === 'error' && (
            <div className="vs-state vs-err">
              <h3>Não foi possível abrir a conta</h3><p>{error}</p>
              <button className="vs-btn" onClick={load}>Tentar de novo</button>
            </div>
          )}

          {status === 'ok' && tab === 'resumo' && <>
            <h1>Olá, {(user?.full_name || user?.name || 'cliente').split(' ')[0]}</h1>
            <div className="vs-stats">
              <div className="vs-stat"><span>Itens no carrinho</span><b>{items}</b></div>
              <div className="vs-stat"><span>Valor do carrinho</span><b>{money(total)}</b></div>
              <div className="vs-stat"><span>Endereços guardados</span><b>{addresses.length}</b></div>
              <div className="vs-stat"><span>Notificações</span><b>{notices.length}</b></div>
            </div>
            <div className="vs-panel">
              <h3>Dados da conta</h3>
              <ul className="vs-list">
                <li><small>Nome</small><br />{user?.full_name || user?.name || '—'}</li>
                <li><small>Email</small><br />{user?.email || '—'}</li>
                <li><small>Telemóvel</small><br />{user?.phone || '—'}</li>
              </ul>
            </div>
          </>}

          {status === 'ok' && tab === 'enderecos' && (
            <div className="vs-panel">
              <h3>Endereços</h3>
              {addresses.length ? (
                <ul className="vs-list">{addresses.map(a => (
                  <li key={a.id}><b>{a.label}</b><br />{a.street} {a.number}, {a.neighborhood}<br /><small>{a.city}, {a.province}</small></li>
                ))}</ul>
              ) : <p>Ainda não tem endereços guardados.</p>}
            </div>
          )}

          {status === 'ok' && tab === 'notificacoes' && (
            <div className="vs-panel">
              <h3>Notificações</h3>
              {notices.length ? (
                <ul className="vs-list">{notices.map(n => (
                  <li key={n.id}><b>{n.title}</b>{!n.is_read && <small> (nova)</small>}<br />{n.message}</li>
                ))}</ul>
              ) : <p>Sem notificações por agora.</p>}
            </div>
          )}

          {status === 'ok' && tab === 'pedidos' && (
            <div className="vs-panel">
              <h3>Consultar encomenda</h3>
              <form className="vs-inline" onSubmit={findOrder}>
                <label className="vs-field">Número da encomenda
                  <input type="number" min={1} required value={orderId} onChange={e => setOrderId(e.target.value)} />
                </label>
                <button className="vs-btn">Consultar</button>
              </form>
              {orderError && <div className="vs-error" style={{ marginTop: 14 }}>{orderError}</div>}
              {order && <p style={{ marginTop: 14 }}>Pedido #{order.id}: <b>{order.status}</b>, total {money(order.total)}</p>}
              <p><small>A lista completa de pedidos fica disponível quando a API tiver um endpoint de histórico.</small></p>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}