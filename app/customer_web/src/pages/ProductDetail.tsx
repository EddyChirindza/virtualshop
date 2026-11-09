import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Minus, Plus, ShoppingBag } from 'lucide-react';
import Layout from '../components/Layout';
import { api, imageUrl, session } from '../services/api';
import type { Product } from '../types';
import { money } from '../utils/format';

type ProductWithDetails = Product & { description?: string };

export default function ProductDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [product, setProduct] = useState<ProductWithDetails>();
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [photo, setPhoto] = useState(0);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setStatus('loading');
    try {
      setProduct(await api.product(Number(id)));
      setStatus('ok');
    } catch (e) {
      setError((e as Error).message);
      setStatus('error');
    }
  };
  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const images = product ? (product.image_urls?.length ? product.image_urls : product.image_url ? [product.image_url] : []) : [];
  const maxQty = product?.stock ? Number(product.stock) : 1;

  const add = async () => {
    if (!product) return;
    if (!session.token) return nav('/login');
    setBusy(true);
    try {
      await api.add(product.id, quantity);
      setNotice('Produto adicionado ao carrinho.');
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout>
      <div className="vs-wrap">
        <Link to="/" className="vs-link"><ArrowLeft size={16} /> Voltar aos produtos</Link>

        {status === 'loading' && <div className="vs-state">A carregar produto…</div>}
        {status === 'error' && (
          <div className="vs-state vs-err">
            <h3>Não foi possível carregar o produto</h3><p>{error}</p>
            <button className="vs-btn" onClick={load}>Tentar de novo</button>
          </div>
        )}

        {status === 'ok' && product && (
          <div className="vs-detail">
            <div>
              <img className="vs-hero-img" src={imageUrl(images[photo] || '')} alt={product.name} />
              {images.length > 1 && (
                <div className="vs-thumbs">
                  {images.map((src, i) => (
                    <button key={src} aria-current={photo === i} onClick={() => setPhoto(i)}>
                      <img src={imageUrl(src)} alt="" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="vs-card-cat">{product.category_name || 'Essenciais'}</div>
              <h1>{product.name}</h1>
              <h2>{money(product.price)}</h2>
              {product.description && <p>{product.description}</p>}
              <p><small>{product.stock ? `${product.stock} em stock` : 'Sem stock'}</small></p>

              <div className="vs-inline">
                <button aria-label="Diminuir" disabled={quantity <= 1} onClick={() => setQuantity(q => q - 1)}><Minus size={16} /></button>
                <b>{quantity}</b>
                <button aria-label="Aumentar" disabled={quantity >= maxQty} onClick={() => setQuantity(q => q + 1)}><Plus size={16} /></button>
                <button className="vs-btn" disabled={!product.stock || busy} onClick={add}>
                  <ShoppingBag size={18} /> {busy ? 'A adicionar…' : 'Adicionar ao carrinho'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {notice && <div className="vs-toast" role="status">{notice}</div>}
    </Layout>
  );
}
