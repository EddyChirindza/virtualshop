import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Heart, ShieldCheck, ShoppingBag, Truck, X, MapPin } from 'lucide-react';
import Layout from '../components/Layout';
import { api, imageUrl, session } from '../services/api';
import type { Category, Product } from '../types';
import { money } from '../utils/format';

export default function Home() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [category, setCategory] = useState<number>();
  const [favs, setFavs] = useState<number[]>([]);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Vindo de outra página com /?q=termo
  useEffect(() => { setQuery(params.get('q') ?? ''); }, [params]);

  const load = async (alive = { current: true }) => {
    setStatus('loading');
    try {
      const [p, c] = await Promise.all([api.products(query, category), api.categories()]);
      if (!alive.current) return;
      setProducts(p); setCategories(c); setStatus('ok');
    } catch (e) {
      if (!alive.current) return;
      setError((e as Error).message); setStatus('error');
    }
  };

  useEffect(() => {
    const alive = { current: true };
    const t = setTimeout(() => load(alive), 250);
    return () => { alive.current = false; clearTimeout(t); };
  }, [query, category]);

  // O aviso fecha sozinho ao fim de 3,5 segundos.
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const needLogin = () => { nav('/login'); };
  const openProduct = (id: number) => nav(`/produto/${id}`);

  const addToCart = async (p: Product) => {
    if (!session.token) return needLogin();
    try { await api.add(p.id); setNotice('Produto adicionado ao carrinho.'); }
    catch (e) { setNotice((e as Error).message); }
  };

  const toggleFav = async (id: number) => {
    if (!session.token) return needLogin();
    const on = !favs.includes(id);
    try { await api.favorite(id, on); setFavs(v => on ? [...v, id] : v.filter(x => x !== id)); }
    catch (e) { setNotice((e as Error).message); }
  };

  const title = query
    ? `Resultados para “${query}”`
    : category ? categories.find(c => c.id === category)?.name : 'Os mais procurados';

  return (
    <Layout query={query} onQuery={setQuery}>
      <div className="vs-wrap" id="inicio">
        <div className="vs-front">
          <nav className="vs-catside" aria-label="Categorias">
            <h3>Categorias</h3>
            <ul>
              <li><button aria-current={!category} onClick={() => setCategory(undefined)}>Todas as categorias</button></li>
              {categories.map(c => (
                <li key={c.id}><button aria-current={category === c.id} onClick={() => setCategory(c.id)}>{c.name}</button></li>
              ))}
            </ul>
          </nav>

          <section className="vs-banner">
            <span className="vs-pill">Entrega grátis acima de 2000 MT</span>
            <h1>Tudo o que precisa, entregue em casa.</h1>
            <p>Milhares de produtos com os melhores preços, escolhidos a pensar em si.</p>
            <button className="vs-btn vs-light" onClick={() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })}>
              Ver produtos <ArrowRight size={18} />
            </button>
          </section>
        </div>

        <div className="vs-perks">
          <div className="vs-perk"><i><Truck size={20} /></i><div><b>Entrega grátis</b><small>Em compras acima de 2000 MT</small></div></div>
          <div className="vs-perk"><i><ShieldCheck size={20} /></i><div><b>Compra segura</b><small>Os seus dados protegidos</small></div></div>
          <div className="vs-perk"><i><MapPin size={20} /></i><div><b>Feito em Moçambique</b><small>Entregamos em todo o país</small></div></div>
        </div>
      </div>

      <section className="vs-wrap" id="catalogo">
        <div className="vs-section-head">
          <h2>{title}</h2>
          <span>{status === 'ok' ? `${products.length} produtos` : ''}</span>
        </div>
        <div className="vs-grid">
          {status === 'loading' && <div className="vs-state">A carregar produtos…</div>}
          {status === 'error' && (
            <div className="vs-state vs-err">
              <h3>Não foi possível carregar os produtos</h3>
              <p>{error}. Confirme se a API está a correr e se o endereço em VITE_API_BASE_URL está certo.</p>
              <button className="vs-btn" onClick={() => load()}>Tentar de novo</button>
            </div>
          )}
          {status === 'ok' && !products.length && (
            <div className="vs-state"><h3>Nenhum produto encontrado</h3><p>Experimente outro termo ou escolha outra categoria.</p></div>
          )}
          {status === 'ok' && products.map(p => {
            const stock = Number(p.stock);
            return (
              <article className="vs-card" key={p.id}>
                <button className="vs-card-img" aria-label={`Ver ${p.name}`} onClick={() => openProduct(p.id)}>
                  <img src={imageUrl(p.image_urls?.[0] || p.image_url || '')} alt={p.name} loading="lazy" />
                </button>
                {!stock && <span className="vs-tag vs-tag-off">Esgotado</span>}
                {stock > 0 && stock <= 5 && <span className="vs-tag">Restam {stock}</span>}
                <button className="vs-fav" aria-label="Guardar nos favoritos" aria-pressed={favs.includes(p.id)} onClick={() => toggleFav(p.id)}>
                  <Heart size={17} fill={favs.includes(p.id) ? 'currentColor' : 'none'} />
                </button>
                <div className="vs-card-cat">{p.category_name || 'Essenciais'}</div>
                <h3 className="vs-card-title">
                  <Link to={`/produto/${p.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{p.name}</Link>
                </h3>
                <div className="vs-card-foot">
                  <b>{money(p.price)}</b>
                  <button aria-label="Adicionar ao carrinho" disabled={!stock} onClick={() => addToCart(p)}><ShoppingBag size={17} /></button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {notice && (
        <div className="vs-toast" role="status">{notice}
          <button aria-label="Fechar" onClick={() => setNotice('')}><X size={16} /></button>
        </div>
      )}
    </Layout>
  );
}