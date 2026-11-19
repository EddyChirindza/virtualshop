import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, Truck } from 'lucide-react';
import Layout from '../components/Layout';
import { api, imageUrl } from '../services/api';
import type { CartItem } from '../types';
import { money } from '../utils/format';
import { usePreferences } from '../preferences';
import { customerErrorMessage } from '../utils/customerMessages';

// Campos de apresentação que o backend pode enviar junto de cada item do carrinho.
type Line = CartItem & { name?: string; product_name?: string; image_url?: string };

export default function Cart() {
  const { t } = usePreferences();
  const nav = useNavigate();
  const [items, setItems] = useState<Line[]>([]);
  const [discount, setDiscount] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const load = async () => {
    try {
      const c = await api.cart();
      setItems((c.items || []) as Line[]);
      setDiscount(Number(c.discount ?? 0));
      setStatus('ok');
    } catch (e) {
      setError(customerErrorMessage(e, t));
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
    catch (e) { setNotice(customerErrorMessage(e, t)); }
    finally { setBusy(false); }
  };

  const remove = async (item: Line) => {
    setBusy(true);
    try { await api.remove(item.id); await load(); }
    catch (e) { setNotice(customerErrorMessage(e, t)); }
    finally { setBusy(false); }
  };

  const clear = async () => {
    if (!window.confirm(t('Remover todos os produtos do carrinho?'))) return;
    setBusy(true);
    try { await api.clearCart(); await load(); }
    catch (e) { setNotice(customerErrorMessage(e, t)); }
    finally { setBusy(false); }
  };

  const count = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + Number(i.unit_price) * i.quantity, 0);
  const total = Math.max(subtotal - discount, 0);
  return (
    <Layout>
      <div className="vs-wrap">
        <div className="vs-section-head">
          <h1>{t('Carrinho')}{status === 'ok' && count > 0 && <small style={{ color: 'var(--vs-muted)', fontWeight: 500 }}> ({count})</small>}</h1>
          {status === 'ok' && items.length > 0 && <button className="vs-link" disabled={busy} onClick={() => void clear()}>{t('Esvaziar carrinho')}</button>}
        </div>

        {status === 'loading' && (
          <div className="vs-split" aria-busy="true" aria-label={t('A carregar o carrinho')}>
            <div style={{ display: 'grid', gap: 12 }}>
              {[0, 1, 2].map(i => <div key={i} className="vs-skel" style={{ height: 116 }} />)}
            </div>
            <div className="vs-skel" style={{ height: 260 }} />
          </div>
        )}
        {status === 'error' && (
          <div className="vs-state vs-err">
            <h3>{t('Não foi possível abrir o carrinho')}</h3><p>{error}</p>
            <button className="vs-btn" onClick={load}>{t('Tentar de novo')}</button>
          </div>
        )}

        {status === 'ok' && !items.length && (
          <div className="vs-state vs-state-big">
            <h3>{t('O carrinho está vazio')}</h3>
            <p>{t('Adicione produtos para continuar.')}</p>
            <Link className="vs-btn" to="/">{t('Ver produtos')}</Link>
          </div>
        )}

        {status === 'ok' && items.length > 0 && (
          <div className="vs-split">
            <section>
              <div className="vs-free">
                <span><Truck size={18} />{t('Entrega ao domicílio')}: <b>{money(50)}</b>. {t('Levantamento na loja grátis.')}</span>
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
                        <small>{money(i.unit_price)} {t('cada')}</small>
                      </div>
                      <div className="vs-qty" role="group" aria-label={`${t('Quantidade de')} ${name}`}>
                        <button aria-label={t('Diminuir')} disabled={busy || i.quantity <= 1} onClick={() => change(i, i.quantity - 1)}><Minus size={16} /></button>
                        <span aria-live="polite">{i.quantity}</span>
                        <button aria-label={t('Aumentar')} disabled={busy} onClick={() => change(i, i.quantity + 1)}><Plus size={16} /></button>
                      </div>
                      <b className="vs-line-total">{money(Number(i.unit_price) * i.quantity)}</b>
                      <button className="vs-line-remove" aria-label={`${t('Remover')} ${name}`} disabled={busy} onClick={() => remove(i)}><Trash2 size={18} /></button>
                    </li>
                  );
                })}
              </ul>
            </section>

            <aside className="vs-panel">
              <h3>{t('Resumo da compra')}</h3>
              <ul className="vs-list vs-sum">
                <li><span>{t('Subtotal')} ({count} {t(count === 1 ? 'artigo' : 'artigos')})</span><b>{money(subtotal)}</b></li>
                {discount > 0 && <li><span>{t('Desconto')}</span><b>-{money(discount)}</b></li>}
                <li><span>{t('Entrega')}</span><b>{t('Calculada no checkout')}</b></li>
                <li className="vs-sum-total"><span>{t('Total parcial')}</span><b>{money(total)}</b></li>
              </ul>
              {/* O pagamento e o endereço escolhem-se no checkout */}
              <button className="vs-btn vs-block" disabled={busy} onClick={() => nav('/checkout')}>{t('Finalizar compra')}</button>
              <Link className="vs-link" to="/">{t('Continuar a comprar')}</Link>
            </aside>
          </div>
        )}
      </div>

      {notice && <div className="vs-toast" role="status">{notice}</div>}
    </Layout>
  );
}