import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag } from 'lucide-react';
import AccountLayout from '../components/AccountLayout';
import { api, imageUrl } from '../services/api';
import type { Product } from '../types';
import { money } from '../utils/format';
import { usePreferences } from '../preferences';

export default function Favorites() {
  const { t } = usePreferences();
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    setStatus('loading');
    try { setProducts(await api.favorites()); setStatus('ok'); }
    catch (e) { setError((e as Error).message); setStatus('error'); }
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const unfav = async (id: number) => {
    try { await api.favorite(id, false); setProducts(v => v.filter(p => p.id !== id)); }
    catch (e) { setNotice((e as Error).message); }
  };
  const addToCart = async (p: Product) => {
    try { await api.add(p.id); setNotice(t('Produto adicionado ao carrinho.')); }
    catch (e) { setNotice((e as Error).message); }
  };

  return (
    <AccountLayout>
      <div>
        <div className="vs-section-head">
          <h1>{t('Favoritos')}</h1>
          <span>{status === 'ok' ? `${products.length} ${t('produtos')}` : ''}</span>
        </div>

        {status === 'loading' && <div className="vs-state">{t('A carregar favoritos…')}</div>}
        {status === 'error' && (
          <div className="vs-state vs-err">
            <h3>{t('Não foi possível carregar os favoritos')}</h3><p>{error}</p>
            <button className="vs-btn" onClick={load}>{t('Tentar de novo')}</button>
          </div>
        )}
        {status === 'ok' && !products.length && (
          <div className="vs-state">
            <h3>{t('Ainda não guardou nenhum produto')}</h3>
            <p>{t('Toque no coração de um produto para o encontrar aqui.')}</p>
            <Link className="vs-btn" to="/">{t('Ver produtos')}</Link>
          </div>
        )}

        <div className="vs-grid">
          {status === 'ok' && products.map(p => (
            <article className="vs-card" key={p.id}>
              <Link className="vs-card-img" to={`/produto/${p.id}`} aria-label={`${t('Ver produto')} ${p.name}`}>
                <img src={imageUrl(p.image_urls?.[0] || p.image_url || '')} alt={p.name} loading="lazy" />
              </Link>
              <button className="vs-fav" aria-label={t('Remover dos favoritos')} aria-pressed onClick={() => unfav(p.id)}>
                <Heart size={18} fill="currentColor" />
              </button>
              <div className="vs-card-cat">{p.category_name || t('Essenciais')}</div>
              <h3 className="vs-card-title">
                <Link to={`/produto/${p.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{p.name}</Link>
              </h3>
              <div className="vs-card-foot">
                <b>{money(p.price)}</b>
                <button aria-label={t('Adicionar ao carrinho')} disabled={!p.stock} onClick={() => addToCart(p)}><ShoppingBag size={17} /></button>
              </div>
            </article>
          ))}
        </div>
      </div>
      {notice && <div className="vs-toast" role="status">{notice}</div>}
    </AccountLayout>
  );
}