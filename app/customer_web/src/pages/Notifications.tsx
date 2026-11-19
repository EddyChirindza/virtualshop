import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AccountLayout from '../components/AccountLayout';
import { api } from '../services/api';
import { usePreferences } from '../preferences';
import { customerErrorMessage } from '../utils/customerMessages';

// O backend envia order_id (estado de encomenda) e/ou product_id (novidades, promoções).
const target = (n: any): [string, string] | null =>
  n.order_id ? [`/encomenda/${n.order_id}`, 'Ver encomenda']
  : n.product_id ? [`/produto/${n.product_id}`, 'Ver produto']
  : null;

export default function Notifications() {
  const nav = useNavigate();
  const { t, language } = usePreferences();
  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [more, setMore] = useState(false);
  const [moreError, setMoreError] = useState('');

  const load = async (p = 1) => {
    if (p === 1) setStatus('loading'); else { setMore(true); setMoreError(''); }
    try {
      const r: any = await api.notifications(p);
      setItems(v => p === 1 ? (r.items || []) : [...v, ...(r.items || [])]);
      setPage(p);
      setTotalPages(r.totalPages || 1);
      setStatus('ok');
    } catch (e) {
      if (p === 1) { setError(customerErrorMessage(e, t)); setStatus('error'); }
      else setMoreError(customerErrorMessage(e, t));
    } finally {
      setMore(false);
    }
  };
  useEffect(() => { load(); }, []);

  const unread = items.filter(n => !n.is_read).length;

  const read = async (n: any) => {
    if (n.is_read) return;
    setItems(v => v.map(x => x.id === n.id ? { ...x, is_read: true } : x)); // optimista
    try { await api.markRead(n.id); }
    catch (e) {
      setItems(v => v.map(x => x.id === n.id ? { ...x, is_read: false } : x));
      setMoreError(customerErrorMessage(e, t));
    }
  };

  const readAll = async () => {
    setBusy(true);
    try { await api.markAllRead(); setItems(v => v.map(x => ({ ...x, is_read: true }))); }
    catch (e) { setMoreError(customerErrorMessage(e, t)); }
    finally { setBusy(false); }
  };

  return (
    <AccountLayout>
      <div>
        <div className="vs-section-head">
          <h1>{t('Notificações')}</h1>
          {unread > 0 && <button className="vs-btn" disabled={busy} onClick={readAll}>{t('Marcar todas como lidas')}</button>}
        </div>

        {status === 'loading' && <div className="vs-state">{t('A carregar notificações…')}</div>}
        {status === 'error' && (
          <div className="vs-state vs-err">
            <h3>{t('Não foi possível carregar as notificações')}</h3><p>{error}</p>
            <button className="vs-btn" onClick={() => load()}>{t('Tentar de novo')}</button>
          </div>
        )}
        {status === 'ok' && !items.length && <div className="vs-state"><h3>{t('Sem notificações por agora')}</h3></div>}

        {status === 'ok' && items.length > 0 && (
          <ul className="vs-list">
            {items.map(n => {
              const action = target(n);
              return (
                <li key={n.id} onClick={() => read(n)} style={{ cursor: n.is_read ? 'default' : 'pointer' }}>
                  <b>{n.title}</b>{!n.is_read && <small> {t('(nova)')}</small>}<br />
                  {n.message}
                  <br /><small>{new Date(n.published_at || n.created_at).toLocaleString(language === 'pt' ? 'pt-PT' : 'en-GB')}</small>
                  {action && <div><button className="vs-link" onClick={e => { e.stopPropagation(); read(n); nav(action[0]); }}>{t(action[1])}</button></div>}
                </li>
              );
            })}
          </ul>
        )}

        {moreError && <div className="vs-error" role="alert" style={{ marginTop: 14 }}>{moreError}</div>}
        {status === 'ok' && page < totalPages && (
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <button className="vs-btn vs-ghost" disabled={more} onClick={() => load(page + 1)}>{more ? t('A carregar…') : t('Carregar mais')}</button>
          </div>
        )}
      </div>
    </AccountLayout>
  );
}