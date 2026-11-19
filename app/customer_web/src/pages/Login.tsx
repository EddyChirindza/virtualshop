import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Package, ShieldCheck, Truck } from 'lucide-react';
import { api, session } from '../services/api';
import { usePreferences } from '../preferences';
import { customerErrorMessage } from '../utils/customerMessages';
import PreferenceControls from '../components/PreferenceControls';
import '../styles/theme.css';

export default function Login() {
  const { t } = usePreferences();
  const nav = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const state = location.state as { from?: string; notice?: string } | null;
  const from = state?.from || '/dashboard';
  const notice = state?.notice || (
    searchParams.get('notice') === 'session-expired'
      ? t('A sua sessão terminou. Entre novamente para continuar.')
      : ''
  );
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  useEffect(() => { if (session.token) nav(from, { replace: true }); }, []);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? '');
    setBusy(true); setError('');
    try {
      if (mode === 'login') await api.login(get('identifier'), get('password'));
      else await api.register(get('name'), get('phone'), get('email'), get('password'));
      nav(from, { replace: true });
    } catch (err) {
      setError(customerErrorMessage(err, t));
    } finally {
      setBusy(false);
    }
  };

  const isLogin = mode === 'login';
  const switchTo = (m: 'login' | 'register') => { setMode(m); setError(''); setShowPass(false); };

  return (
    <div className="vs-root vs-auth">
      <aside className="vs-auth-side">
        <Link to="/" className="vs-brand"><b>V</b><span>virtual<em>shop</em></span></Link>
        <div>
          <h2>{t('Compre com calma, receba sem pressa.')}</h2>
          <p>{t('Guarde o carrinho, acompanhe encomendas e veja as novidades numa só conta.')}</p>
          <ul className="vs-auth-perks">
            <li><i><Truck size={18} /></i>{t('Entrega grátis em compras acima de 2000 MT')}</li>
            <li><i><Package size={18} /></i>{t('Acompanhe cada encomenda')}</li>
            <li><i><ShieldCheck size={18} /></i>{t('Os seus dados protegidos')}</li>
          </ul>
        </div>
        <small>© VirtualShop</small>
      </aside>

      <main className="vs-auth-main">
        <form className="vs-form" onSubmit={submit}>
          <PreferenceControls />
          <div className="vs-seg" role="tablist" aria-label={t('Entrar ou criar conta')}>
            <button type="button" role="tab" aria-selected={isLogin} onClick={() => switchTo('login')}>{t('Entrar')}</button>
            <button type="button" role="tab" aria-selected={!isLogin} onClick={() => switchTo('register')}>{t('Criar conta')}</button>
          </div>

          <div>
            <h1>{t(isLogin ? 'Bem-vindo de volta' : 'Crie a sua conta')}</h1>
            <p>{t(isLogin ? 'Use o seu email ou telemóvel.' : 'Leva menos de um minuto.')}</p>
          </div>

          {notice && !error && <div className="vs-ok" role="status">{notice}</div>}
          {error && <div className="vs-error" role="alert">{error}</div>}

          {!isLogin && <>
            <label className="vs-field">{t('Nome completo')}<input name="name" minLength={3} required autoComplete="name" /></label>
            <label className="vs-field">{t('Telemóvel')}<input name="phone" type="tel" inputMode="tel" pattern="(?:[0-9]{9,15}|\+[1-9][0-9]{7,14})" required autoComplete="tel" /></label>
            <label className="vs-field">{t('Email (opcional)')}<input name="email" type="email" autoComplete="email" /></label>
          </>}
          {isLogin && <label className="vs-field">{t('Email ou telemóvel')}<input name="identifier" required minLength={3} autoComplete="username" /></label>}

          <div className="vs-field">
            <label htmlFor="vs-password">{t('Palavra-passe')}</label>
            <div className="vs-pass">
              <input
                id="vs-password"
                name="password"
                type={showPass ? 'text' : 'password'}
                required
                minLength={isLogin ? 1 : 8}
                pattern={isLogin ? undefined : '(?=.*[a-z])(?=.*[A-Z]).{8,}'}
                title={isLogin ? undefined : t('Mínimo 8 caracteres, com letra maiúscula e minúscula')}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
              <button type="button" aria-label={t(showPass ? 'Esconder palavra-passe' : 'Mostrar palavra-passe')} onClick={() => setShowPass(v => !v)}>
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {!isLogin && <small>{t('Mínimo 8 caracteres, com letra maiúscula e minúscula.')}</small>}
          </div>

          <button className="vs-btn vs-block" disabled={busy}>{busy ? t('A processar…') : t(isLogin ? 'Entrar' : 'Criar conta')}</button>
          <p className="vs-auth-back"><Link className="vs-link" to="/">{t('← Continuar sem conta')}</Link></p>
        </form>
      </main>
    </div>
  );
}