import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, Truck } from 'lucide-react';
import Layout from '../components/Layout';
import { api, imageUrl } from '../services/api';
import type { CartItem } from '../types';
import { money } from '../utils/format';

// Mesmo valor do aviso no topo do site.
const FREE_DELIVERY_FROM = 2000;

// Campos de apresentação que o backend pode enviar junto de cada item do carrinho.
type Line = CartItem & { name?: string; product_name?: string; image_url?: string };

export default function Cart() {
  const nav = useNavigate();
  const [items, setItems] = useState<Line[]>([]);
  const [discount, setDiscount] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const load = async () => {
    try {
      const c = await api.cart();
      setItems((c.items || []) as Line[]);
      setDiscount(Number(c.discount ?? 0));
      setDeliveryFee(Number(c.deliveryFee ?? 0));
      setStatus('ok');
    } catch (e) {
      setError((e as Error).message);
      setStatus('error');
    }
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const change = async (item: Line, quantity: number) => {
    if (quantity < 1) return;
    setBusy(true);
    try { await api.quantity(item.id, quantity); await load(); }
    catch (e) { setNotice((e as Error).message); }
    finally { setBusy(false); }
  };

  const remove = async (item: Line) => {
    setBusy(true);
    try { await api.remove(item.id); await load(); }
    catch (e) { setNotice((e as Error).message); }
    finally { setBusy(false); }
  };

  const count = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + Number(i.unit_price) * i.quantity, 0);
  const total = Math.max(subtotal - discount + deliveryFee, 0);
  const missing = Math.max(FREE_DELIVERY_FROM - subtotal, 0);

  return (
    <Layout>
      <div className="vs-wrap">
        <h1>Carrinho{status === 'ok' && count > 0 && <small style={{ color: 'var(--vs-muted)', fontWeight: 500 }}> ({count})</small>}</h1>

        {status === 'loading' && (
          <div className="vs-split" aria-busy="true" aria-label="A carregar o carrinho">
            <div style={{ display: 'grid', gap: 12 }}>
              {[0, 1, 2].map(i => <div key={i} className="vs-skel" style={{ height: 116 }} />)}
            </div>
            <div className="vs-skel" style={{ height: 260 }} />
          </div>
        )}
        {status === 'error' && (
          <div className="vs-state vs-err">
            <h3>Não foi possível abrir o carrinho</h3><p>{error}</p>
            <button className="vs-btn" onClick={load}>Tentar de novo</button>
          </div>
        )}

        {status === 'ok' && !items.length && (
          <div className="vs-state vs-state-big">
            <h3>O carrinho está vazio</h3>
            <p>Adicione produtos para continuar.</p>
            <Link className="vs-btn" to="/">Ver produtos</Link>
          </div>
        )}

        {status === 'ok' && items.length > 0 && (
          <div className="vs-split">
            <section>
              <div className="vs-free">
                <span><Truck size={18} />
                  {missing > 0 ? <>Faltam <b>{money(missing)}</b> para ter entrega grátis</> : <b>Tem entrega grátis nesta compra</b>}
                </span>
                <div className="vs-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(Math.round((subtotal / FREE_DELIVERY_FROM) * 100), 100)}>
                  <i style={{ width: `${Math.min((subtotal / FREE_DELIVERY_FROM) * 100, 100)}%` }} />
                </div>
              </div>

              <ul className="vs-cartlist">
                {items.map(i => {
                  const name = i.name || i.product_name || `Produto #${i.id}`;
                  const productId = (i as any).product_id as number | undefined;
                  return (
                    <li className="vs-line" key={i.id}>
                      <div className="vs-line-img">{i.image_url && <img src={imageUrl(i.image_url)} alt="" loading="lazy" />}</div>
                      <div className="vs-line-info">
                        {productId
                          ? <Link className="vs-line-name" to={`/produto/${productId}`}>{name}</Link>
                          : <b className="vs-line-name">{name}</b>}
                        <small>{money(i.unit_price)} cada</small>
                      </div>
                      <div className="vs-qty" role="group" aria-label={`Quantidade de ${name}`}>
                        <button aria-label="Diminuir" disabled={busy || i.quantity <= 1} onClick={() => change(i, i.quantity - 1)}><Minus size={16} /></button>
                        <span aria-live="polite">{i.quantity}</span>
                        <button aria-label="Aumentar" disabled={busy} onClick={() => change(i, i.quantity + 1)}><Plus size={16} /></button>
                      </div>
                      <b className="vs-line-total">{money(Number(i.unit_price) * i.quantity)}</b>
                      <button className="vs-line-remove" aria-label={`Remover ${name}`} disabled={busy} onClick={() => remove(i)}><Trash2 size={18} /></button>
                    </li>
                  );
                })}
              </ul>
            </section>

            <aside className="vs-panel">
              <h3>Resumo da compra</h3>
              <ul className="vs-list vs-sum">
                <li><span>Subtotal ({count} {count === 1 ? 'artigo' : 'artigos'})</span><b>{money(subtotal)}</b></li>
                {discount > 0 && <li><span>Desconto</span><b>-{money(discount)}</b></li>}
                <li><span>Entrega</span><b>{deliveryFee ? money(deliveryFee) : 'Grátis'}</b></li>
                <li className="vs-sum-total"><span>Total</span><b>{money(total)}</b></li>
              </ul>
              {/* O pagamento e o endereço escolhem-se no checkout */}
              <button className="vs-btn vs-block" disabled={busy} onClick={() => nav('/checkout')}>Finalizar compra</button>
              <Link className="vs-link" to="/">Continuar a comprar</Link>
            </aside>
          </div>
        )}
      </div>

      {notice && <div className="vs-toast" role="status">{notice}</div>}
    </Layout>
  );
}