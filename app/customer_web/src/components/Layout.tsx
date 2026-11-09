import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, User } from 'lucide-react';
import { session } from '../services/api';
import '../styles/theme.css';

type Props = { children: React.ReactNode; query?: string; onQuery?: (v: string) => void };

export default function Layout({ children, query, onQuery }: Props) {
  const nav = useNavigate();
  const goAccount = () => nav(session.token ? '/dashboard' : '/login');
  return (
    <div className="vs-root">
      <div className="vs-top">Entrega grátis em compras acima de 2.500 MT</div>
      <header className="vs-header">
        <div className="vs-wrap">
          <Link to="/" className="vs-brand"><b>V</b><span>virtual<em>shop</em></span></Link>
          {onQuery && (
            <label className="vs-search">
              <Search size={18} />
              <input value={query ?? ''} onChange={e => onQuery(e.target.value)} placeholder="O que procura hoje?" />
            </label>
          )}
          <nav className="vs-nav">
            <button onClick={goAccount}><User size={20} /><span>{session.token ? 'A minha conta' : 'Entrar'}</span></button>
            <button onClick={goAccount}><ShoppingCart size={20} /><span>Carrinho</span></button>
          </nav>
        </div>
      </header>
      {children}
      <footer className="vs-footer">
        <div className="vs-wrap">
          <div><Link to="/">Loja</Link><Link to="/dashboard">A minha conta</Link></div>
          <div>Feito em Moçambique. © VirtualShop</div>
        </div>
      </footer>
    </div>
  );
}