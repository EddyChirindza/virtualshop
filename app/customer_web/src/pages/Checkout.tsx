import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../services/api';
import type { Address, CartItem, PaymentMethod } from '../types';
import { money } from '../utils/format';
import { usePreferences } from '../preferences';

const HOME_DELIVERY_FEE = 50;

export default function Checkout() {
  const { t } = usePreferences();
  const nav = useNavigate();
  const [items, setItems] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [addressId, setAddressId] = useState<number>();
  const [deliveryMethod, setDeliveryMethod] = useState<'home_delivery' | 'store_pickup'>('home_delivery');
  const [paymentChoice, setPaymentChoice] = useState('cash');
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setStatus('loading');
    try {
      const [c, a, methods] = await Promise.all([
        api.cart(),
        api.addresses(),
        api.paymentMethods(),
      ]);
      setItems(c.items || []);
      setDiscount(Number(c.discount ?? 0));
      setAddresses(a);
      setAddressId(a.find(address => address.is_default)?.id ?? a[0]?.id);
      setPaymentMethods(methods);
      const defaultMethod = methods.find(method => method.isDefault);
      setPaymentChoice(defaultMethod ? String(defaultMethod.id) : 'cash');
      setStatus('ok');
    } catch (e) {
      setError((e as Error).message);
      setStatus('error');
    }
  };
  useEffect(() => { load(); }, []);

  const subtotal = items.reduce((s, i) => s + Number(i.unit_price) * i.quantity, 0);
  const checkoutDeliveryFee = deliveryMethod === 'home_delivery' ? HOME_DELIVERY_FEE : 0;
  const total = Math.max(subtotal - discount + checkoutDeliveryFee, 0);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (deliveryMethod === 'home_delivery' && !addressId) return setFormError(t('Escolha um endereço de entrega.'));
    const f = new FormData(e.currentTarget);
    setBusy(true); setFormError('');
    try {
      const order = await api.checkout({
        deliveryMethod,
        deliveryAddressId: deliveryMethod === 'home_delivery' ? addressId ?? null : null,
        paymentMethodId: paymentChoice === 'cash' ? null : Number(paymentChoice),
        couponCode: String(f.get('couponCode') ?? '').trim() || null,
        notes: String(f.get('notes') ?? ''),
      });
      nav(order.id ? `/encomenda/${order.id}` : '/pedidos', { replace: true });
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout>
      <div className="vs-wrap">
        <h1>{t('Finalizar compra')}</h1>

        {status === 'loading' && <div className="vs-state">{t('A preparar a encomenda…')}</div>}
        {status === 'error' && (
          <div className="vs-state vs-err">
            <h3>{t('Não foi possível abrir o checkout')}</h3><p>{error}</p>
            <button className="vs-btn" onClick={load}>{t('Tentar de novo')}</button>
          </div>
        )}

        {status === 'ok' && !items.length && (
          <div className="vs-state">
            <h3>{t('O carrinho está vazio')}</h3>
            <Link className="vs-btn" to="/">{t('Ver produtos')}</Link>
          </div>
        )}

        {status === 'ok' && items.length > 0 && (
          <form className="vs-split" onSubmit={submit}>
            <section>
              <div className="vs-panel">
                <h3>{t('Entrega')}</h3>
                <p><small>{t('Entrega ao domicílio: 50 MT. Levantamento na loja: grátis.')}</small></p>
                <ul className="vs-list">
                  <li><label><input type="radio" name="deliveryMethod" checked={deliveryMethod === 'home_delivery'} onChange={() => setDeliveryMethod('home_delivery')} /> {t('Entrega ao domicílio')}</label></li>
                  <li><label><input type="radio" name="deliveryMethod" checked={deliveryMethod === 'store_pickup'} onChange={() => setDeliveryMethod('store_pickup')} /> {t('Levantamento na loja')}</label></li>
                </ul>
                {deliveryMethod === 'home_delivery' && (addresses.length ? (
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
                  <p>{t('Ainda não tem endereços.')} <Link className="vs-link" to="/enderecos">{t('Adicionar endereço')}</Link></p>
                ))}
              </div>

              <div className="vs-panel" style={{ marginTop: 16 }}>
                <h3>{t('Pagamento')}</h3>
                <ul className="vs-list">
                  <li><label><input type="radio" name="payment" checked={paymentChoice === 'cash'} onChange={() => setPaymentChoice('cash')} /> {t('Dinheiro na entrega')}</label></li>
                  {paymentMethods.map(method => (
                    <li key={method.id}>
                      <label>
                        <input type="radio" name="payment" checked={paymentChoice === String(method.id)} onChange={() => setPaymentChoice(String(method.id))} />{' '}
                        {method.label || (method.type === 'mpesa' ? 'M-Pesa' : 'Visa')}
                        {method.type === 'mpesa' ? ` · ${method.phone}` : ` ·•••• ${method.cardLast4}`}
                        {method.isDefault ? ` · ${t('Padrão')}` : ''}
                      </label>
                    </li>
                  ))}
                </ul>
                {!paymentMethods.length && <p>{t('Adicione um método guardado em')} <Link className="vs-link" to="/metodos-pagamento">{t('métodos de pagamento')}</Link>, {t('ou pague na entrega.')}</p>}
                <Link className="vs-link" to="/metodos-pagamento">{t('Gerir métodos de pagamento')}</Link>
                <label className="vs-field">{t('Cupão (opcional)')}
                  <input name="couponCode" maxLength={50} />
                  <small>{t('Use PROMO10 para obter 10% de desconto.')}</small>
                </label>
                <label className="vs-field">{t('Notas para a entrega (opcional)')}
                  <input name="notes" maxLength={500} />
                </label>
              </div>
            </section>

            <aside className="vs-panel">
              <h3>{t('Resumo')}</h3>
              <ul className="vs-list">
                {items.map((i: any) => (
                  <li key={i.id}>{i.name || i.product_name || `Produto #${i.id}`} × {i.quantity} <b>{money(Number(i.unit_price) * i.quantity)}</b></li>
                ))}
                <li>{t('Subtotal')} <b>{money(subtotal)}</b></li>
                {discount > 0 && <li>{t('Desconto')} <b>-{money(discount)}</b></li>}
                <li>{t('Entrega')} <b>{checkoutDeliveryFee ? money(checkoutDeliveryFee) : t('Grátis')}</b></li>
                <li>{t('Total')} <b>{money(total)}</b></li>
              </ul>
              {formError && <div className="vs-error" role="alert">{formError}</div>}
              <button className="vs-btn" disabled={busy || (deliveryMethod === 'home_delivery' && !addresses.length)}>{busy ? t('A processar…') : t('Confirmar encomenda')}</button>
              <Link className="vs-link" to="/carrinho">{t('Voltar ao carrinho')}</Link>
            </aside>
          </form>
        )}
      </div>
    </Layout>
  );
}