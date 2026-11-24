import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Heart, Minus, Plus, ShoppingBag, Star, ThumbsDown, ThumbsUp } from 'lucide-react';
import Layout from '../components/Layout';
import { api, imageUrl, session } from '../services/api';
import type { Product, ProductReviews } from '../types';
import { money } from '../utils/format';
import { usePreferences } from '../preferences';
import { customerErrorMessage } from '../utils/customerMessages';

type ProductWithDetails = Product & { description?: string };

export default function ProductDetail() {
  const { t } = usePreferences();
  const { id } = useParams();
  const nav = useNavigate();
  const [product, setProduct] = useState<ProductWithDetails>();
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [photo, setPhoto] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [reviews, setReviews] = useState<ProductReviews>();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [editingReview, setEditingReview] = useState(false);
  const [deletingReview, setDeletingReview] = useState(false);
  const [votingReviewId, setVotingReviewId] = useState<number | null>(null);

  const load = async () => {
    setStatus('loading');
    try {
      const loadedProduct = await api.product(Number(id));
      setProduct(loadedProduct);
      setStatus('ok');
      if (session.token) {
        try {
          setIsFavorite((await api.favoriteStatus(loadedProduct.id)).isFavorite);
        } catch (e) {
          setNotice(customerErrorMessage(e, t));
        }
      } else {
        setIsFavorite(false);
      }
    } catch (e) {
      setError(customerErrorMessage(e, t));
      setStatus('error');
    }
  };
  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (!product) return;
    setReviewLoading(true);
    api.reviews(product.id).then((data) => {
      setReviews(data);
      setRating(data.ownReview?.rating || 0);
      setComment(data.ownReview?.comment || '');
      setEditingReview(Boolean(data.ownReview));
    }).catch((e) => setNotice(customerErrorMessage(e, t)))
      .finally(() => setReviewLoading(false));
  }, [product?.id]);

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
      setNotice(t('Produto adicionado ao carrinho.'));
    } catch (e) {
      setNotice(customerErrorMessage(e, t));
    } finally {
      setBusy(false);
    }
  };

  const toggleFavorite = async () => {
    if (!product) return;
    if (!session.token) return nav('/login');
    try {
      await api.favorite(product.id, !isFavorite);
      setIsFavorite(value => !value);
    } catch (e) {
      setNotice(customerErrorMessage(e, t));
    }
  };

  const saveReview = async () => {
    if (!product) return;
    if (!session.token) return nav('/login');
    if (!rating) {
      setNotice(t('Escolha uma classificação.'));
      return;
    }
    setReviewBusy(true);
    try {
      const data = await api.saveReview(product.id, rating, comment);
      setReviews(data);
      setEditingReview(true);
      setNotice(t('Avaliação guardada.'));
    } catch (e) {
      setNotice(customerErrorMessage(e, t));
    } finally {
      setReviewBusy(false);
    }
  };

  const cancelReviewEdit = () => {
    setRating(reviews?.ownReview?.rating || 0);
    setComment(reviews?.ownReview?.comment || '');
  };

  const deleteReview = async () => {
    if (!product || !reviews?.ownReview) return;
    if (!window.confirm(t('Tem a certeza que pretende eliminar a sua avaliação?'))) return;
    setDeletingReview(true);
    try {
      const data = await api.deleteReview(product.id);
      setReviews(data);
      setRating(0);
      setComment('');
      setEditingReview(false);
      setNotice(t('Avaliação eliminada.'));
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setDeletingReview(false);
    }
  };

  const toggleReviewVote = async (reviewId: number, currentVote: 'like' | 'dislike' | null, vote: 'like' | 'dislike') => {
    if (!product) return;
    if (!session.token) return nav('/login');
    setVotingReviewId(reviewId);
    try {
      const result = await api.voteReview(product.id, reviewId, currentVote === vote ? null : vote);
      setReviews(current => current && ({
        ...current,
        items: current.items.map(review => review.id === reviewId
          ? { ...review, ...result }
          : review),
      }));
    } catch (e) {
      setNotice(customerErrorMessage(e, t));
    } finally {
      setVotingReviewId(null);
    }
  };

  return (
    <Layout>
      <div className="vs-wrap">
        <Link to="/" className="vs-link"><ArrowLeft size={16} /> {t('Voltar aos produtos')}</Link>

        {status === 'loading' && <div className="vs-state">{t('A carregar produto…')}</div>}
        {status === 'error' && (
          <div className="vs-state vs-err">
            <h3>{t('Não foi possível carregar o produto')}</h3><p>{error}</p>
            <button className="vs-btn" onClick={load}>{t('Tentar de novo')}</button>
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
              <div className="vs-card-cat">{product.category_name || t('Essenciais')}</div>
              <h1>{product.name}</h1>
              <h2>{money(product.price)}</h2>
              {product.description && <p>{product.description}</p>}
              <p><small>{product.stock ? `${product.stock} ${t('em stock')}` : t('Sem stock')}</small></p>
              {reviews && (
                <div className="vs-product-rating" aria-label={t('Avaliação do produto')}>
                  <span className="vs-stars" aria-hidden="true">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <Star key={value} size={16} fill={value <= reviews.average ? 'currentColor' : 'none'} />
                    ))}
                  </span>
                  <strong>{reviews.average.toFixed(1)}</strong>
                  <small>({reviews.count} {reviews.count === 1 ? t('avaliação') : t('avaliações')})</small>
                </div>
              )}

              <div className="vs-inline">
                <button className="vs-link" aria-pressed={isFavorite} onClick={() => void toggleFavorite()}>
                  <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
                  {t(isFavorite ? 'Remover dos favoritos' : 'Guardar nos favoritos')}
                </button>
                <button aria-label={t('Diminuir')} disabled={quantity <= 1} onClick={() => setQuantity(q => q - 1)}><Minus size={16} /></button>
                <b>{quantity}</b>
                <button aria-label={t('Aumentar')} disabled={quantity >= maxQty} onClick={() => setQuantity(q => q + 1)}><Plus size={16} /></button>
                <button className="vs-btn" disabled={!product.stock || busy} onClick={add}>
                  <ShoppingBag size={18} /> {busy ? t('A adicionar…') : t('Adicionar ao carrinho')}
                </button>
              </div>
            </div>
          </div>
        )}

        {status === 'ok' && product && (
          <section className="vs-reviews">
            <div className="vs-section-head">
              <h2>{t('Avaliações')}</h2>
              <span>{reviews?.count || 0} {t('avaliações')}</span>
            </div>

            <div className="vs-review-form">
              <h3>{editingReview && reviews?.ownReview ? t('Editar a minha avaliação') : t('Avaliar este produto')}</h3>
              {reviewLoading && <div className="vs-state">{t('A carregar avaliações…')}</div>}
              {reviews?.distribution && reviews.count > 0 && (
                <div className="vs-rating-distribution" aria-label={t('Distribuição das classificações')}>
                  {reviews.distribution.map((item) => (
                    <div key={item.rating}>
                      <span>{item.rating}★</span>
                      <div><i style={{ width: `${reviews.count ? (item.count / reviews.count) * 100 : 0}%` }} /></div>
                      <b>{item.count}</b>
                    </div>
                  ))}
                </div>
              )}
              <div className="vs-review-stars" role="radiogroup" aria-label={t('Classificação')}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={rating === value}
                    aria-label={`${value} ${value === 1 ? t('estrela') : t('estrelas')}`}
                    onClick={() => setRating(value)}
                  >
                    <Star size={26} fill={value <= rating ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
              <label className="vs-field">
                <span>{t('Comentário')} <small>{t('(opcional)')}</small></span>
                <textarea
                  value={comment}
                  maxLength={1000}
                  rows={4}
                  placeholder={t('Conte-nos a sua experiência com este produto')}
                  onChange={(event) => setComment(event.target.value)}
                />
              </label>
              <button className="vs-btn" disabled={reviewBusy} onClick={() => void saveReview()}>
                {reviewBusy ? t('A guardar…') : t('Guardar avaliação')}
              </button>
              {reviews?.ownReview && (
                <div className="vs-review-actions">
                  <button type="button" className="vs-link" disabled={deletingReview} onClick={cancelReviewEdit}>
                    {t('Cancelar')}
                  </button>
                  <button type="button" className="vs-link vs-review-delete" disabled={deletingReview} onClick={() => void deleteReview()}>
                    {deletingReview ? t('A eliminar…') : t('Eliminar avaliação')}
                  </button>
                </div>
              )}
            </div>

            <div className="vs-review-column">
              <h3>{t('Comentários')}</h3>
              <div className="vs-review-list" aria-label={t('Comentários')} role="region" tabIndex={0}>
                {reviews?.items.length ? reviews.items.map((review) => (
                  <article className="vs-review" key={review.id}>
                    <div className="vs-review-meta">
                      <strong>{review.isOwn ? t('EU') : review.user.name}</strong>
                      <span className="vs-stars" aria-label={`${review.rating} ${t('estrelas')}`}>
                        {[1, 2, 3, 4, 5].map((value) => (
                          <Star key={value} size={14} fill={value <= review.rating ? 'currentColor' : 'none'} />
                        ))}
                      </span>
                    </div>
                    {review.comment && <p>{review.comment}</p>}
                    {review.comment && !review.isOwn && (
                      <div className="vs-review-votes" aria-label={t('Votos no comentário')}>
                        <button
                          type="button"
                          aria-label={`${t('Gostei')} (${review.likeCount})`}
                          aria-pressed={review.userVote === 'like'}
                          disabled={votingReviewId === review.id}
                          onClick={() => void toggleReviewVote(review.id, review.userVote, 'like')}
                        >
                          <ThumbsUp size={16} /> {review.likeCount}
                        </button>
                        <button
                          type="button"
                          aria-label={`${t('Não gostei')} (${review.dislikeCount})`}
                          aria-pressed={review.userVote === 'dislike'}
                          disabled={votingReviewId === review.id}
                          onClick={() => void toggleReviewVote(review.id, review.userVote, 'dislike')}
                        >
                          <ThumbsDown size={16} /> {review.dislikeCount}
                        </button>
                      </div>
                    )}
                  </article>
                )) : (
                  <div className="vs-state">{t('Ainda não há avaliações para este produto.')}</div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>

      {notice && <div className="vs-toast" role="status">{notice}</div>}
    </Layout>
  );
}
