import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

export default function NotFound() {
  return (
    <Layout>
      <div className="vs-wrap">
        <div className="vs-state">
          <h1>404</h1>
          <h3>Página não encontrada</h3>
          <p>O endereço que abriu não existe ou foi movido.</p>
          <Link className="vs-btn" to="/">Voltar à loja</Link>
        </div>
      </div>
    </Layout>
  );
}