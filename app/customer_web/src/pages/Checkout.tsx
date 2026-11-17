import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../services/api';
import type { Address, CartItem } from '../types';
import { money } from '../utils/format';

type Payment = 'cash' | 'mpesa' | 'emola';
const PAYMENTS: [Payment, string][] = [
  ['cash', 'Dinheiro na entrega'],
  ['mpesa', 'M-Pesa'],
  ['emola', 'e-Mola'],
];

export default function Checkout() {
  const nav = useNavigate();
  const [items, setItems] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState<number>();
  const [payment, setPayment] = useState<Payment>('cash');
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setStatus('loading');
    try {
      const [c, a] = await Promise.all([api.cart(), api.addresses()]);
      setItems(c.items || []);
      setDiscount(Number(c.discount ?? 0));
      setDeliveryFee(Number(c.deliveryFee ?? 0));
      setAddresses(a);
      setAddressId(a[0]?.id);
      setStatus('ok');
    } catch (e) {
      setError((e as Error).message);
      setStatus('error');
    }
  };
  useEffect(() => { load(); }, []);

  const subtotal = items.reduce((s, i) => s + Number(i.unit_price) * i.quantity, 0);
  const total = Math.max(subtotal - discount + deliveryFee, 0);
  const wallet = payment !== 'cash';

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!addressId) return setFormError('Escolha um endereço de entrega.');
    const f = new FormData(e.currentTarget);
    setBusy(true); setFormError('');
    try {
      const r: any = await api.checkout({
        addressId,
        payment,
        phone: String(f.get('phone') ?? ''),
        notes: String(f.get('notes') ?? ''),
      });
      nav(r?.id ? `/encomenda/${r.id}` : '/pedidos', { replace: true });
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout>
      <div className="vs-wrap">
        <h1>Finalizar compra</h1>

        {status === 'loading' && <div className="vs-state">A preparar a encomenda…</div>}
        {status === 'error' && (
          <div className="vs-state vs-err">
            <h3>Não foi possível abrir o checkout</h3><p>{error}</p>
            <button className="vs-btn" onClick={load}>Tentar de novo</button>
          </div>
        )}

        {status === 'ok' && !items.length && (
          <div className="vs-state">
            <h3>O carrinho está vazio</h3>
            <Link className="vs-btn" to="/">Ver produtos</Link>
          </div>
        )}

        {status === 'ok' && items.length > 0 && (
          <form className="vs-split" onSubmit={submit}>
            <section>
              <div className="vs-panel">
                <h3>Endereço de entrega</h3>
                {addresses.length ? (
                  <ul className="vs-list">
                    {addresses.map(a => (
                      <li key={a.id}>
                        <label>
                          <input type="radio" name="address" checked={addressId === a.id} onChange={() => setAddressId(a.id)} />{' '}
                          <b>{a.label}</b><br />
                          <small>{a.street} {a.number}, {a.neighborhood}, {a.city}, {a.province}</small>
                        </label>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Ainda não tem endereços. <Link className="vs-link" to="/enderecos">Adicionar endereço</Link></p>
                )}
              </div>

              <div className="vs-panel" style={{ marginTop: 16 }}>
                <h3>Pagamento</h3>
                <ul className="vs-list">
                  {PAYMENTS.map(([k, label]) => (
                    <li key={k}>
                      <label>
                        <input type="radio" name="payment" checked={payment === k} onChange={() => setPayment(k)} /> {label}
                      </label>
                    </li>
                  ))}
                </ul>
                {wallet && (
                  <label className="vs-field">Número {payment === 'mpesa' ? 'M-Pesa' : 'e-Mola'}
                    <input name="phone" type="tel" required inputMode="numeric" pattern="8[2-7][0-9]{7}" title="Número moçambicano com 9 dígitos, ex.: 841234567" autoComplete="tel" />
                  </label>
                )}
                <label className="vs-field">Notas para a entrega (opcional)
                  <input name="notes" maxLength={200} />
                </label>
              </div>
            </section>

            <aside className="vs-panel">
              <h3>Resumo</h3>
              <ul className="vs-list">
                {items.map((i: any) => (
                  <li key={i.id}>{i.name || i.product_name || `Produto #${i.id}`} × {i.quantity} <b>{money(Number(i.unit_price) * i.quantity)}</b></li>
                ))}
                <li>Subtotal <b>{money(subtotal)}</b></li>
                {discount > 0 && <li>Desconto <b>-{money(discount)}</b></li>}
                <li>Entrega <b>{deliveryFee ? money(deliveryFee) : 'Grátis'}</b></li>
                <li>Total <b>{money(total)}</b></li>
              </ul>
              {formError && <div className="vs-error" role="alert">{formError}</div>}
              <button className="vs-btn" disabled={busy || !addresses.length}>{busy ? 'A processar…' : 'Confirmar encomenda'}</button>
              <Link className="vs-link" to="/carrinho">Voltar ao carrinho</Link>
            </aside>
          </form>
        )}
      </div>
    </Layout>
  );
}