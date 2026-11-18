import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Heart, ShieldCheck, ShoppingBag, Truck, X, MapPin } from 'lucide-react';
import Layout from '../components/Layout';
import { api, imageUrl, session } from '../services/api';
import type { Category, Product, ProductSort } from '../types';
import { money } from '../utils/format';

export default function Home() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [popular, setPopular] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [category, setCategory] = useState<number>();
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState<ProductSort>('relevance');
  const [draftMinPrice, setDraftMinPrice] = useState('');
  const [draftMaxPrice, setDraftMaxPrice] = useState('');
  const [draftSort, setDraftSort] = useState<ProductSort>('relevance');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [favs, setFavs] = useState<number[]>([]);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [error, setError] = useState('');
  const [featuredError, setFeaturedError] = useState('');
  const [notice, setNotice] = useState('');

  // Vindo de outra página com /?q=termo
  useEffect(() => { setQuery(params.get('q') ?? ''); }, [params]);

  const load = async (alive = { current: true }) => {
    setStatus('loading');
    try {
      const p = await api.products(query, category, {
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        sort,
        page,
        limit: 50,
      });
      if (!alive.current) return;
      setProducts(p.items);
      setTotalPages(p.totalPages);
      setTotal(p.total);
      setError('');
      setStatus('ok');
    } catch (e) {
      if (!alive.current) return;
      setError((e as Error).message); setStatus('error');
    }
  };

  useEffect(() => { setPage(1); }, [query, category, minPrice, maxPrice, sort]);

  useEffect(() => {
    const alive = { current: true };
    const t = setTimeout(() => load(alive), 250);
    return () => { alive.current = false; clearTimeout(t); };
  }, [query, category, minPrice, maxPrice, sort, page]);

  useEffect(() => {
    let active = true;
    const loadHomeSections = async () => {
      const results = await Promise.allSettled([
        api.categories(),
        api.popular(),
        api.newArrivals(),
      ]);
      if (!active) return;
      if (results[0].status === 'fulfilled') setCategories(results[0].value);
      if (results[1].status === 'fulfilled') setPopular(results[1].value);
      if (results[2].status === 'fulfilled') setNewArrivals(results[2].value);
      const failed = results.find(result => result.status === 'rejected');
      setFeaturedError(
        failed?.status === 'rejected'
          ? failed.reason instanceof Error ? failed.reason.message : String(failed.reason)
          : '',
      );
    };
    void loadHomeSections();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!session.token) {
      setFavs([]);
      return;
    }
    api.favorites()
      .then(items => setFavs(items.map(item => item.id)))
      .catch(e => setNotice((e as Error).message));
  }, []);

  // O aviso fecha sozinho ao fim de 3,5 segundos.
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const needLogin = () => { nav('/login'); };
  const openProduct = (id: number) => nav(`/produto/${id}`);
  const applySearchFilters = () => {
    setMinPrice(draftMinPrice);
    setMaxPrice(draftMaxPrice);
    setSort(draftSort);
  };
  const clearSearchFilters = () => {
    setDraftMinPrice('');
    setDraftMaxPrice('');
    setDraftSort('relevance');
    setMinPrice('');
    setMaxPrice('');
    setSort('relevance');
  };

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

  const renderProducts = (items: Product[]) => items.map(p => {
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
  });

  const title = query
    ? `Resultados para “${query}”`
    : category ? categories.find(c => c.id === category)?.name : 'Os mais procurados';
  const showFeatured = !query && !category && !minPrice && !maxPrice && page === 1;

  return (
    <Layout
      query={query}
      onQuery={setQuery}
      searchFilters={{
        minPrice: draftMinPrice,
        maxPrice: draftMaxPrice,
        sort: draftSort,
        onMinPriceChange: setDraftMinPrice,
        onMaxPriceChange: setDraftMaxPrice,
        onSortChange: setDraftSort,
        onApply: applySearchFilters,
        onClear: clearSearchFilters,
      }}
    >
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
            <span className="vs-pill">Entrega ao domicílio: 50 MT · Levantamento grátis</span>
            <h1>Tudo o que precisa, entregue em casa.</h1>
            <p>Milhares de produtos com os melhores preços, escolhidos a pensar em si.</p>
            <button className="vs-btn vs-light" onClick={() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })}>
              Ver produtos <ArrowRight size={18} />
            </button>
          </section>
        </div>

        <div className="vs-perks">
          <div className="vs-perk"><i><Truck size={20} /></i><div><b>Entrega ao domicílio</b><small>Taxa fixa de 50 MT · levantamento grátis</small></div></div>
          <div className="vs-perk"><i><ShieldCheck size={20} /></i><div><b>Compra segura</b><small>Os seus dados protegidos</small></div></div>
          <div className="vs-perk"><i><MapPin size={20} /></i><div><b>Feito em Moçambique</b><small>Entregamos em todo o país</small></div></div>
        </div>
      </div>

      {status === 'ok' && showFeatured && (popular.length > 0 || newArrivals.length > 0 || featuredError) && (
        <section className="vs-wrap" aria-label="Destaques">
          {featuredError && <p className="vs-error" role="alert">{featuredError}</p>}
          {popular.length > 0 && <>
            <div className="vs-section-head"><h2>Mais populares</h2></div>
            <div className="vs-grid">{renderProducts(popular)}</div>
          </>}
          {newArrivals.length > 0 && <>
            <div className="vs-section-head" style={{ marginTop: 28 }}><h2>Novidades</h2></div>
            <div className="vs-grid">{renderProducts(newArrivals)}</div>
          </>}
        </section>
      )}

      <section className="vs-wrap" id="catalogo">
        <div className="vs-section-head">
          <h2>{title}</h2>
          <span>{status === 'ok' ? `${total} produtos` : ''}</span>
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
          {status === 'ok' && renderProducts(products)}
        </div>
        {status === 'ok' && totalPages > 1 && (
          <div className="vs-inline" style={{ justifyContent: 'center', marginTop: 20 }}>
            <button className="vs-btn vs-ghost" disabled={page <= 1} onClick={() => setPage(current => current - 1)}>Anterior</button>
            <span>Página {page} de {totalPages}</span>
            <button className="vs-btn vs-ghost" disabled={page >= totalPages} onClick={() => setPage(current => current + 1)}>Seguinte</button>
          </div>
        )}
      </section>

      {notice && (
        <div className="vs-toast" role="status">{notice}
          <button aria-label="Fechar" onClick={() => setNotice('')}><X size={16} /></button>
        </div>
      )}
    </Layout>
  );
}