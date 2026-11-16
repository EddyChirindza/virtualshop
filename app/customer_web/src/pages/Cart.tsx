import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2 } from 'lucide-react';
import Layout from '../components/Layout';
import { api, imageUrl } from '../services/api';
import type { CartItem } from '../types';
import { money } from '../utils/format';

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

  const checkout = async () => {
    setBusy(true);
    try { await api.checkout(); setNotice('Encomenda criada com sucesso.'); await load(); nav('/dashboard', { replace: true }); }
    catch (e) { setNotice((e as Error).message); }
    finally { setBusy(false); }
  };

  const subtotal = items.reduce((s, i) => s + Number(i.unit_price) * i.quantity, 0);
  const total = Math.max(subtotal - discount + deliveryFee, 0);

  return (
    <Layout>
      <div className="vs-wrap">
        <h1>Carrinho</h1>

        {status === 'loading' && <div className="vs-state">A carregar o carrinho…</div>}
        {status === 'error' && (
          <div className="vs-state vs-err">
            <h3>Não foi possível abrir o carrinho</h3><p>{error}</p>
            <button className="vs-btn" onClick={load}>Tentar de novo</button>
          </div>
        )}

        {status === 'ok' && !items.length && (
          <div className="vs-state">
            <h3>O carrinho está vazio</h3>
            <p>Adicione produtos para continuar.</p>
            <Link className="vs-btn" to="/">Ver produtos</Link>
          </div>
        )}

        {status === 'ok' && items.length > 0 && (
          <div className="vs-dash">
            <section>
              <ul className="vs-list">
                {items.map(i => (
                  <li key={i.id}>
                    {i.image_url && <img src={imageUrl(i.image_url)} alt="" width={64} height={64} loading="lazy" />}
                    <b>{i.name || i.product_name || `Produto #${i.id}`}</b><br />
                    <small>{money(i.unit_price)} cada</small>
                    <div className="vs-inline">
                      <button aria-label="Diminuir" disabled={busy || i.quantity <= 1} onClick={() => change(i, i.quantity - 1)}><Minus size={16} /></button>
                      <b>{i.quantity}</b>
                      <button aria-label="Aumentar" disabled={busy} onClick={() => change(i, i.quantity + 1)}><Plus size={16} /></button>
                      <span>{money(Number(i.unit_price) * i.quantity)}</span>
                      <button aria-label="Remover" disabled={busy} onClick={() => remove(i)}><Trash2 size={16} /></button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <aside className="vs-panel">
              <h3>Resumo</h3>
              <ul className="vs-list">
                <li>Subtotal <b>{money(subtotal)}</b></li>
                {discount > 0 && <li>Desconto <b>-{money(discount)}</b></li>}
                <li>Entrega <b>{deliveryFee ? money(deliveryFee) : 'Grátis'}</b></li>
                <li>Total <b>{money(total)}</b></li>
              </ul>
              <button className="vs-btn" disabled={busy} onClick={checkout}>{busy ? 'A processar…' : 'Finalizar compra'}</button>
            </aside>
          </div>
        )}
      </div>

      {notice && <div className="vs-toast" role="status">{notice}</div>}
    </Layout>
  );
}
