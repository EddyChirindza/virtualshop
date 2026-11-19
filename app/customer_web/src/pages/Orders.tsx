import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import AccountLayout from '../components/AccountLayout';
import { api } from '../services/api';
import { money } from '../utils/format';
import { orderStatus } from '../utils/orderStatus';
import { usePreferences } from '../preferences';
import { customerErrorMessage } from '../utils/customerMessages';

export default function Orders() {
  const { t, language } = usePreferences();
  const [orders, setOrders] = useState<any[]>([]);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [error, setError] = useState('');

  const load = async () => {
    setStatus('loading');
    try { setOrders(await api.orders()); setStatus('ok'); }
    catch (e) { setError(customerErrorMessage(e, t)); setStatus('error'); }
  };
  useEffect(() => { load(); }, []);

  return (
    <AccountLayout>
      <div>
        <div className="vs-section-head"><h1>{t('Os meus pedidos')}</h1><span>{status === 'ok' ? `${orders.length} ${t('pedidos')}` : ''}</span></div>

        {status === 'loading' && <div className="vs-state">{t('A carregar pedidos…')}</div>}
        {status === 'error' && (
          <div className="vs-state vs-err">
            <h3>{t('Não foi possível carregar os pedidos')}</h3><p>{error}</p>
            <button className="vs-btn" onClick={load}>{t('Tentar de novo')}</button>
          </div>
        )}
        {status === 'ok' && !orders.length && (
          <div className="vs-state">
            <h3>{t('Ainda não fez nenhuma encomenda')}</h3>
            <Link className="vs-btn" to="/">{t('Ver produtos')}</Link>
          </div>
        )}
        {status === 'ok' && orders.length > 0 && (
          <ul className="vs-list vs-cardlist">
            {orders.map(o => {
              const st = orderStatus(o.status);
              return (
                <li className="vs-row" key={o.id}>
                  <div>
                    <Link to={`/encomenda/${o.id}`} className="vs-link"><b>{t('Pedido #')}{o.id}</b></Link><br />
                    <small>{o.created_at ? new Date(o.created_at).toLocaleDateString(language === 'pt' ? 'pt-PT' : 'en-GB') : ''}</small>
                  </div>
                  <div className="vs-row-end">
                    <span className={`vs-chip ${st.tone}`}>{t(st.label)}</span>
                    <b>{money(o.total)}</b>
                    <Link className="vs-link" to={`/encomenda/${o.id}`} aria-label={`${t('Abrir pedido')} ${o.id}`}><ChevronRight size={18} /></Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AccountLayout>
  );
}