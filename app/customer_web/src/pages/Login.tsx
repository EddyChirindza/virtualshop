import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api, session } from '../services/api';
import '../styles/theme.css';

export default function Login() {
  const nav = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || '/dashboard';
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

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
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const isLogin = mode === 'login';
  return (
    <div className="vs-root vs-auth">
      <aside className="vs-auth-side">
        <Link to="/" className="vs-brand"><b>V</b><span>virtual<em>shop</em></span></Link>
        <div>
          <h2>Compre com calma, receba sem pressa.</h2>
          <p>Guarde o carrinho, acompanhe encomendas e veja as novidades numa só conta.</p>
        </div>
        <small>© VirtualShop</small>
      </aside>
      <main className="vs-auth-main">
        <form className="vs-form" onSubmit={submit}>
          <h1>{isLogin ? 'Entrar na conta' : 'Criar conta'}</h1>
          <p>{isLogin ? 'Use o seu email ou telemóvel.' : 'Leva menos de um minuto.'}</p>
          {error && <div className="vs-error" role="alert">{error}</div>}
          {!isLogin && <>
            <label className="vs-field">Nome completo<input name="name" minLength={3} required autoComplete="name" /></label>
            <label className="vs-field">Telemóvel<input name="phone" type="tel" pattern="(?:[0-9]{9,15}|\+[1-9][0-9]{7,14})" required autoComplete="tel" /></label>
            <label className="vs-field">Email (opcional)<input name="email" type="email" autoComplete="email" /></label>
          </>}
          {isLogin && <label className="vs-field">Email ou telemóvel<input name="identifier" required minLength={3} autoComplete="username" /></label>}
          <label className="vs-field">Palavra-passe
            <input
              name="password"
              type="password"
              required
              minLength={isLogin ? 1 : 8}
              pattern={isLogin ? undefined : '(?=.*[a-z])(?=.*[A-Z]).{8,}'}
              title={isLogin ? undefined : 'Mínimo 8 caracteres, com letra maiúscula e minúscula'}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
            {!isLogin && <small>Mínimo 8 caracteres, com letra maiúscula e minúscula.</small>}
          </label>
          <button className="vs-btn" disabled={busy}>{busy ? 'A processar…' : isLogin ? 'Entrar' : 'Criar conta'}</button>
          <button type="button" className="vs-link" onClick={() => { setMode(isLogin ? 'register' : 'login'); setError(''); }}>
            {isLogin ? 'Ainda não tem conta? Criar conta' : 'Já tem conta? Entrar'}
          </button>
        </form>
      </main>
    </div>
  );
}