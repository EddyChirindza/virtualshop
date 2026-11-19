import { useEffect, useRef, useState, type FormEvent } from 'react';
import { MessageCircle, Send, UserRound } from 'lucide-react';
import AccountLayout from '../components/AccountLayout';
import { api } from '../services/api';
import type { SupportConversationData, SupportMessage } from '../types/support';
import { usePreferences } from '../preferences';
import { customerErrorMessage } from '../utils/customerMessages';

const emptyConversation: SupportConversationData = { conversation: null, messages: [] };
const quickQuestions = [
  'Como acompanho a minha encomenda?',
  'Quanto custa a entrega?',
  'Quais métodos de pagamento estão disponíveis?',
];

export default function SupportChat() {
  const { t, language } = usePreferences();
  const [data, setData] = useState<SupportConversationData>(emptyConversation);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const messageEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    let requestInFlight = false;
    const refresh = async () => {
      if (!active || requestInFlight) return;
      requestInFlight = true;
      try {
        const result = await api.supportConversation();
        if (active) {
          setData(result);
          setError('');
        }
      } catch (reason) {
        if (active) setError(customerErrorMessage(reason, t));
      } finally {
        requestInFlight = false;
        if (active) setLoading(false);
      }
    };

    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [t]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data.messages.length]);

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = message.trim();
    if (!text || busy) return;

    setBusy(true);
    setError('');
    try {
      setData(await api.sendSupportMessage(text, language));
      setMessage('');
    } catch (reason) {
      setError(customerErrorMessage(reason, t));
    } finally {
      setBusy(false);
    }
  };

  const requestAgent = async () => {
    if (!data.conversation || busy) return;
    setBusy(true);
    setError('');
    try {
      setData(await api.requestSupportAgent());
    } catch (reason) {
      setError(customerErrorMessage(reason, t));
    } finally {
      setBusy(false);
    }
  };

  const formatMessageTime = (value: string) => new Intl.DateTimeFormat(
    language === 'pt' ? 'pt-MZ' : 'en-GB',
    { hour: '2-digit', minute: '2-digit' },
  ).format(new Date(value));

  const renderMessage = (item: SupportMessage) => {
    const isCustomer = item.sender_type === 'customer';
    const sender = item.sender_type === 'bot'
      ? t('Assistente virtual')
      : item.sender_type === 'support'
        ? t('Assistente')
        : t('Você');

    return (
      <article
        className={`vs-support-message${isCustomer ? ' is-customer' : ''}`}
        key={item.id}
      >
        <div className="vs-support-message-meta">
          {!isCustomer && (item.sender_type === 'bot' ? <MessageCircle size={15} /> : <UserRound size={15} />)}
          <strong>{sender}</strong>
          <time dateTime={item.created_at}>{formatMessageTime(item.created_at)}</time>
        </div>
        <p>{item.body}</p>
      </article>
    );
  };

  const conversation = data.conversation;
  const canRequestAgent = conversation?.status === 'bot';
  const isWaiting = conversation?.status === 'waiting';
  const isWithAgent = conversation?.status === 'active';

  return (
    <AccountLayout>
      <section className="vs-support-page" aria-labelledby="support-chat-title">
        <header className="vs-support-heading">
          <span className="vs-support-icon"><MessageCircle size={21} /></span>
          <div>
            <h1 id="support-chat-title">{t('Chat com a assistência')}</h1>
            <p>{t('Pergunte ao nosso robô ou peça ajuda a uma pessoa da equipa.')}</p>
          </div>
        </header>

        {error && <p className="vs-error" role="alert">{error}</p>}

        <div className="vs-support-chat">
          <div className="vs-support-chat-status" role="status">
            {isWaiting
              ? t('O seu pedido foi encaminhado. Um assistente responderá aqui assim que estiver disponível.')
              : isWithAgent
                ? t('Está a falar com um assistente. Pode continuar a conversa por aqui.')
                : t('Assistente virtual')}
          </div>

          <div className="vs-support-messages" role="log" aria-live="polite" aria-relevant="additions text">
            {loading && <p className="vs-support-loading">{t('A carregar conversa…')}</p>}
            {!loading && data.messages.length === 0 && (
              <article className="vs-support-message">
                <div className="vs-support-message-meta">
                  <MessageCircle size={15} />
                  <strong>{t('Assistente virtual')}</strong>
                </div>
                <p>{t('Ainda não há mensagens. Como podemos ajudar?')}</p>
              </article>
            )}
            {data.messages.map(renderMessage)}
            <div ref={messageEndRef} />
          </div>

          {!conversation && (
            <div className="vs-support-quick-questions" aria-label={t('Perguntas frequentes')}>
              {quickQuestions.map(question => (
                <button key={question} type="button" onClick={() => setMessage(t(question))}>
                  {t(question)}
                </button>
              ))}
            </div>
          )}

          {canRequestAgent && (
            <div className="vs-support-handoff">
              <span>{t('Pode pedir para falar com uma pessoa da equipa.')}</span>
              <button
                className="vs-btn vs-ghost"
                disabled={busy}
                onClick={() => void requestAgent()}
                type="button"
              >
                {t('Pedir ajuda de um assistente')}
              </button>
            </div>
          )}

          <form className="vs-support-compose" onSubmit={event => void sendMessage(event)}>
            <label className="vs-support-compose-label" htmlFor="support-message">
              {t('Escreva a sua mensagem…')}
            </label>
            <textarea
              id="support-message"
              maxLength={2000}
              onChange={event => setMessage(event.target.value)}
              placeholder={t('Escreva a sua mensagem…')}
              rows={2}
              value={message}
            />
            <button className="vs-btn" disabled={busy || !message.trim()} type="submit">
              <Send size={17} />
              {t('Enviar mensagem')}
            </button>
          </form>
        </div>
      </section>
    </AccountLayout>
  );
}
