import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { usePreferences } from '../preferences';

export default function NotFound() {
  const { t } = usePreferences();
  return (
    <Layout>
      <div className="vs-wrap">
        <div className="vs-state">
          <h1>404</h1>
          <h3>{t('Página não encontrada')}</h3>
          <p>{t('O endereço que abriu não existe ou foi movido.')}</p>
          <Link className="vs-btn" to="/">{t('Voltar à loja')}</Link>
        </div>
      </div>
    </Layout>
  );
}