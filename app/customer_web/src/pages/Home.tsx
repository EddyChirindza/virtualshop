import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Heart, ShoppingBag, X } from 'lucide-react';
import Layout from '../components/Layout';
import { api, imageUrl, session } from '../services/api';
import type { Banner, Category, Product, ProductSort } from '../types';
import { money } from '../utils/format';
import { usePreferences } from '../preferences';

export default function Home() {
  const { t, language } = usePreferences();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [popular, setPopular] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [isBannerHovered, setIsBannerHovered] = useState(false);
  const [isBannerFocused, setIsBannerFocused] = useState(false);
  const [bannerError, setBannerError] = useState('');
  const [clock, setClock] = useState(() => Date.now());
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [category, setCategory] = useState<number>();
  const [categoriesOpen, setCategoriesOpen] = useState(false);
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
    let active = true;
    api.banners()
      .then(items => {
        if (!active) return;
        setBanners(items);
        setBannerIndex(0);
      })
      .catch(e => {
        if (active) setBannerError((e as Error).message);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (banners.length <= 1 || isBannerHovered || isBannerFocused) return;
    const timer = window.setTimeout(
      () => setBannerIndex(index => (index + 1) % banners.length),
      6000,
    );
    return () => window.clearTimeout(timer);
  }, [bannerIndex, banners.length, isBannerFocused, isBannerHovered]);

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

  const activateBanner = (banner: Banner) => {
    const destination = banner.destination;
    if (destination.type === 'product' && destination.product?.id) {
      nav(`/produto/${destination.product.id}`);
      return;
    }
    if (destination.type === 'category' && destination.category?.id) {
      setCategory(destination.category.id);
      document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (destination.type === 'url' && destination.url && /^https?:\/\//i.test(destination.url)) {
      window.open(destination.url, '_blank', 'noopener,noreferrer');
      return;
    }
    document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
  };

  const addToCart = async (p: Product) => {
    if (!session.token) return needLogin();
    try { await api.add(p.id); setNotice(t('Produto adicionado ao carrinho.')); }
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
        <button className="vs-card-img" aria-label={`${t('Ver produto')} ${p.name}`} onClick={() => openProduct(p.id)}>
          <img src={imageUrl(p.image_urls?.[0] || p.image_url || '')} alt={p.name} loading="lazy" />
        </button>
        {!stock && <span className="vs-tag vs-tag-off">{t('Esgotado')}</span>}
        {stock > 0 && stock <= 5 && <span className="vs-tag">{t('Restam')} {stock}</span>}
        <button className="vs-fav" aria-label={t('Guardar nos favoritos')} aria-pressed={favs.includes(p.id)} onClick={() => toggleFav(p.id)}>
          <Heart size={17} fill={favs.includes(p.id) ? 'currentColor' : 'none'} />
        </button>
        <div className="vs-card-cat">{p.category_name || t('Essenciais')}</div>
        <h3 className="vs-card-title">
          <Link to={`/produto/${p.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{p.name}</Link>
        </h3>
        <div className="vs-card-foot">
          <b>{money(p.price)}</b>
          <button aria-label={t('Adicionar ao carrinho')} disabled={!stock} onClick={() => addToCart(p)}><ShoppingBag size={17} /></button>
        </div>
      </article>
    );
  });

  const title = query
    ? `${t('Resultados para')} “${query}”`
    : category ? categories.find(c => c.id === category)?.name : t('Os mais procurados');
  const showFeatured = !query && !category && !minPrice && !maxPrice && page === 1;
  const activeBanner = banners[bannerIndex];
  const bannerAlignment = activeBanner?.style.alignment ?? 'left';
  const bannerTitle = activeBanner?.title[language] || activeBanner?.title.pt || activeBanner?.title.en || t('Destaque');
  const bannerSubtitle = activeBanner?.subtitle[language] || activeBanner?.subtitle.pt || activeBanner?.subtitle.en;
  const bannerButton = activeBanner?.button_text[language] || activeBanner?.button_text.pt || activeBanner?.button_text.en;
  const expiresAt = activeBanner?.expires_at ? new Date(activeBanner.expires_at).getTime() : NaN;
  const remainingSeconds = Number.isFinite(expiresAt)
    ? Math.max(0, Math.floor((expiresAt - clock) / 1000))
    : null;
  const countdown = remainingSeconds === null ? null : {
    days: Math.floor(remainingSeconds / 86400),
    hours: Math.floor((remainingSeconds % 86400) / 3600),
    minutes: Math.floor((remainingSeconds % 3600) / 60),
    seconds: remainingSeconds % 60,
  };
  const bannerDateFormatter = new Intl.DateTimeFormat(language === 'pt' ? 'pt-MZ' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const formatBannerDate = (value: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : bannerDateFormatter.format(date);
  };

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
          <nav className="vs-catside" aria-label={t('Categorias')}>
            <h3>{t('Categorias')}</h3>
            <button
              aria-current={!category}
              aria-expanded={categoriesOpen}
              aria-controls="vs-category-list"
              onClick={() => {
                setCategory(undefined);
                setCategoriesOpen(open => !open);
              }}
            >
              {t('Todas as categorias')}
            </button>
            {categoriesOpen && (
              <ul className="vs-category-list" id="vs-category-list">
                {categories.map(c => (
                  <li key={c.id}><button title={c.name} aria-current={category === c.id} onClick={() => setCategory(c.id)}>{c.name}</button></li>
                ))}
              </ul>
            )}
          </nav>

          {activeBanner ? (
            <section
              className={`vs-banner vs-banner--image${activeBanner.starts_at || activeBanner.expires_at ? ' vs-banner--timed' : ''} vs-banner-${bannerAlignment}`}
              aria-label={t('Banner promocional')}
              style={{ backgroundColor: activeBanner.style.background_color }}
              onMouseEnter={() => setIsBannerHovered(true)}
              onMouseLeave={() => setIsBannerHovered(false)}
              onFocusCapture={() => setIsBannerFocused(true)}
              onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setIsBannerFocused(false);
                }
              }}
            >
              <picture key={activeBanner.id} className="vs-banner-media">
                <source media="(max-width: 768px)" srcSet={imageUrl(activeBanner.mobile_image_url || activeBanner.image_url)} />
                <img src={imageUrl(activeBanner.image_url)} alt="" />
              </picture>
              <span
                className="vs-banner-overlay"
                style={{ background: `rgba(0, 0, 0, ${activeBanner.style.overlay_opacity})` }}
              />
              <span className="vs-pill">
                {t(activeBanner.banner_type === 'promotion' ? 'Promoção' :
                  activeBanner.banner_type === 'announcement' ? 'Novidade' :
                    activeBanner.banner_type === 'category' ? 'Categoria em destaque' : 'Produto em destaque')}
              </span>
              <h1 style={{ color: activeBanner.style.title_color }}>{bannerTitle}</h1>
              {bannerSubtitle && (
                <p style={{ color: activeBanner.style.subtitle_color || undefined }}>{bannerSubtitle}</p>
              )}
              {(activeBanner.starts_at || activeBanner.expires_at) && (
                <div className="vs-banner-timing">
                  <div className="vs-banner-dates">
                    {formatBannerDate(activeBanner.starts_at) && (
                      <span>{t('Início:')} {formatBannerDate(activeBanner.starts_at)}</span>
                    )}
                    {formatBannerDate(activeBanner.expires_at) && (
                      <span>{t('Fim:')} {formatBannerDate(activeBanner.expires_at)}</span>
                    )}
                  </div>
                  {countdown && remainingSeconds !== null && remainingSeconds > 0 && (
                    <p className="vs-banner-countdown" role="timer">
                      <strong>{t('Termina em')}:</strong>{' '}
                      {countdown.days} {t('dias')} {String(countdown.hours).padStart(2, '0')} {t('horas')}{' '}
                      {String(countdown.minutes).padStart(2, '0')} {t('minutos')}{' '}
                      {String(countdown.seconds).padStart(2, '0')} {t('segundos')}
                    </p>
                  )}
                  {countdown && remainingSeconds === 0 && (
                    <p className="vs-banner-countdown">{t('Promoção terminada')}</p>
                  )}
                </div>
              )}
              <button
                className="vs-btn vs-light"
                style={{
                  backgroundColor: activeBanner.style.button_color || undefined,
                  color: activeBanner.style.button_text_color || undefined,
                }}
                onClick={() => activateBanner(activeBanner)}
              >
                {bannerButton || t('Ver produtos')} <ArrowRight size={18} />
              </button>
              {banners.length > 1 && (
                <div className="vs-banner-controls" aria-label={t('Navegação dos banners')}>
                  <button
                    className="vs-banner-arrow"
                    aria-label={t('Banner anterior')}
                    onClick={() => setBannerIndex(index => (index - 1 + banners.length) % banners.length)}
                  ><ChevronLeft size={18} /></button>
                  {banners.map((banner, index) => (
                    <button
                      key={banner.id}
                      className={`vs-banner-dot${index === bannerIndex ? ' is-active' : ''}`}
                      aria-label={`${t('Mostrar banner')} ${index + 1}`}
                      aria-current={index === bannerIndex ? 'true' : undefined}
                      onClick={() => setBannerIndex(index)}
                    />
                  ))}
                  <button
                    className="vs-banner-arrow"
                    aria-label={t('Próximo banner')}
                    onClick={() => setBannerIndex(index => (index + 1) % banners.length)}
                  ><ChevronRight size={18} /></button>
                </div>
              )}
            </section>
          ) : (
            <section className="vs-banner">
              <span className="vs-pill">{t('Entrega ao domicílio: 50 MT · Levantamento grátis')}</span>
              <h1>{t('Tudo o que precisa, entregue em casa.')}</h1>
              <p>{t('Milhares de produtos com os melhores preços, escolhidos a pensar em si.')}</p>
              <button className="vs-btn vs-light" onClick={() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })}>
                {t('Ver produtos')} <ArrowRight size={18} />
              </button>
            </section>
          )}
        </div>
        {bannerError && <p className="vs-error" role="alert">{t('Não foi possível carregar os banners:')} {bannerError}</p>}

      </div>

      {status === 'ok' && showFeatured && (popular.length > 0 || newArrivals.length > 0 || featuredError) && (
        <section className="vs-wrap" aria-label={t('Destaques')}>
          {featuredError && <p className="vs-error" role="alert">{featuredError}</p>}
          {popular.length > 0 && <>
            <div className="vs-section-head"><h2>{t('Mais populares')}</h2></div>
            <div className="vs-grid">{renderProducts(popular)}</div>
          </>}
          {newArrivals.length > 0 && <>
            <div className="vs-section-head" style={{ marginTop: 28 }}><h2>{t('Novidades')}</h2></div>
            <div className="vs-grid">{renderProducts(newArrivals)}</div>
          </>}
        </section>
      )}

      <section className="vs-wrap" id="catalogo">
        <div className="vs-section-head">
          <h2>{title}</h2>
          <span>{status === 'ok' ? `${total} ${t('produtos')}` : ''}</span>
        </div>
        <div className="vs-grid">
          {status === 'loading' && <div className="vs-state">{t('A carregar produtos…')}</div>}
          {status === 'error' && (
            <div className="vs-state vs-err">
              <h3>{t('Não foi possível carregar os produtos')}</h3>
              <p>{error}. Confirme se a API está a correr e se o endereço em VITE_API_BASE_URL está certo.</p>
              <button className="vs-btn" onClick={() => load()}>{t('Tentar de novo')}</button>
            </div>
          )}
          {status === 'ok' && !products.length && (
            <div className="vs-state"><h3>{t('Nenhum produto encontrado')}</h3><p>{t('Experimente outro termo ou escolha outra categoria.')}</p></div>
          )}
          {status === 'ok' && renderProducts(products)}
        </div>
        {status === 'ok' && totalPages > 1 && (
          <div className="vs-inline" style={{ justifyContent: 'center', marginTop: 20 }}>
            <button className="vs-btn vs-ghost" disabled={page <= 1} onClick={() => setPage(current => current - 1)}>{t('Anterior')}</button>
            <span>{t('Página')} {page} {t('de')} {totalPages}</span>
            <button className="vs-btn vs-ghost" disabled={page >= totalPages} onClick={() => setPage(current => current + 1)}>{t('Seguinte')}</button>
          </div>
        )}
      </section>

      {notice && (
        <div className="vs-toast" role="status">{notice}
          <button aria-label={t('Fechar')} onClick={() => setNotice('')}><X size={16} /></button>
        </div>
      )}
    </Layout>
  );
}