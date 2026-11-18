import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { money } from '../utils/format';

const ORDER_STEPS: [string, string][] = [
  ['pending', 'Recebida'],
  ['accepted', 'Aceite'],
  ['preparing', 'Em preparação'],
];

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState<any>();
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [error, setError] = useState('');

  const load = async () => {
    setStatus('loading');
    try { setOrder(await api.order(Number(id))); setStatus('ok'); }
    catch (e) { setError((e as Error).message); setStatus('error'); }
  };
  useEffect(() => { load(); }, [id]);

  const cancelled = ['cancelled', 'canceled'].includes(String(order?.status).toLowerCase());
  const rejected = String(order?.status).toLowerCase() === 'rejected';
  const steps: [string, string][] = [
    ...ORDER_STEPS,
    order?.deliveryMethod === 'store_pickup'
      ? ['ready_for_pickup', 'Pronta para levantamento']
      : ['out_for_delivery', 'Em entrega'],
    ['completed', 'Concluída'],
  ];
  const currentStep = steps.findIndex(([key]) => key === String(order?.status).toLowerCase());

  return (
    <Layout>
      <div className="vs-wrap">
        <Link to="/pedidos" className="vs-link"><ArrowLeft size={16} /> Os meus pedidos</Link>

        {status === 'loading' && <div className="vs-state">A carregar encomenda…</div>}
        {status === 'error' && (
          <div className="vs-state vs-err">
            <h3>Não foi possível abrir a encomenda</h3><p>{error}</p>
            <button className="vs-btn" onClick={load}>Tentar de novo</button>
          </div>
        )}

        {status === 'ok' && order && (
          <div className="vs-split">
            <section>
              <h1>Encomenda #{order.id}</h1>
              {order.created_at && <p><small>Feita em {new Date(order.created_at).toLocaleDateString('pt-MZ')}</small></p>}

              <div className="vs-panel">
                <h3>Estado</h3>
                {cancelled ? <p><b>Encomenda cancelada</b></p> : rejected ? (
                  <p><b>Encomenda rejeitada.</b>{order.rejectionReason ? ` Motivo: ${order.rejectionReason}` : ''}</p>
                ) : currentStep >= 0 ? (
                  <ol className="vs-list">
                    {steps.map(([k, label], i) => (
                      <li key={k} aria-current={i === currentStep}>
                        {i <= currentStep ? '✓ ' : '○ '}{i === currentStep ? <b>{label}</b> : label}
                      </li>
                    ))}
                  </ol>
                ) : <p><b>{String(order.status)}</b></p>}
              </div>

              {Array.isArray(order.items) && order.items.length > 0 && (
                <div className="vs-panel" style={{ marginTop: 16 }}>
                  <h3>Produtos</h3>
                  <ul className="vs-list">
                    {order.items.map((i: any, n: number) => (
                      <li key={i.id ?? n}>
                        {i.name || i.product_name || `Produto #${i.product_id ?? n + 1}`} × {i.quantity}
                        <b> {money(Number(i.unit_price) * i.quantity)}</b>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <aside className="vs-panel">
              <h3>Resumo</h3>
              <ul className="vs-list">
                {order.delivery_fee != null && <li>Entrega <b>{Number(order.delivery_fee) ? money(order.delivery_fee) : 'Grátis'}</b></li>}
                {order.address && <li>Endereço <b>{[order.address.street, order.address.number, order.address.city].filter(Boolean).join(', ')}</b></li>}
                {order.paymentMethod && <li>Pagamento <b>{order.paymentMethod.label || order.paymentMethod.type}</b></li>}
                <li>Total <b>{money(order.total)}</b></li>
              </ul>
            </aside>
          </div>
        )}
      </div>
    </Layout>
  );
}