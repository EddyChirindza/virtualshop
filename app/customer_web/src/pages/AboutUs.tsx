import { MapPin, ShieldCheck, Truck } from 'lucide-react';
import Layout from '../components/Layout';
import { usePreferences } from '../preferences';

export default function AboutUs() {
  const { t } = usePreferences();

  return (
    <Layout>
      <main className="vs-wrap vs-about">
        <h1>{t('Sobre nós')}</h1>
        <p className="vs-about-intro">{t('Conheça os nossos compromissos com a sua experiência de compra.')}</p>
        <section className="vs-perks" aria-label={t('Os nossos compromissos')}>
          <article className="vs-perk">
            <i><Truck size={20} /></i>
            <div><b>{t('Entrega ao domicílio')}</b><small>{t('Taxa fixa de 50 MT · levantamento grátis')}</small></div>
          </article>
          <article className="vs-perk">
            <i><ShieldCheck size={20} /></i>
            <div><b>{t('Compra segura')}</b><small>{t('Os seus dados protegidos')}</small></div>
          </article>
          <article className="vs-perk">
            <i><MapPin size={20} /></i>
            <div><b>{t('Feito em Moçambique')}</b><small>{t('Entregamos em todo o país')}</small></div>
          </article>
        </section>
      </main>
    </Layout>
  );
}
