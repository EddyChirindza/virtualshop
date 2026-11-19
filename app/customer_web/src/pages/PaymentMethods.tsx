import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { CreditCard, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import AccountLayout from '../components/AccountLayout';
import { api } from '../services/api';
import type { PaymentMethod } from '../types';
import { usePreferences } from '../preferences';
import { customerErrorMessage } from '../utils/customerMessages';

type PaymentType = PaymentMethod['type'];

export default function PaymentMethods() {
  const { t } = usePreferences();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [type, setType] = useState<PaymentType>('mpesa');
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setStatus('loading');
    try {
      setMethods(await api.paymentMethods());
      setStatus('ok');
    } catch (e) {
      setError(customerErrorMessage(e, t));
      setStatus('error');
    }
  };
  useEffect(() => { void load(); }, []);

  const closeForm = () => {
    setEditing(null);
    setShowForm(false);
    setFormError('');
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const label = String(form.get('label') ?? '').trim();
    const input: Record<string, unknown> = {
      ...(label ? { label } : { label: null }),
    };
    if (editing?.type === 'mpesa' || (!editing && type === 'mpesa')) {
      const phone = String(form.get('phone') ?? '').trim();
      input.phone = phone;
    } else if (!editing) {
      input.cardNumber = String(form.get('cardNumber') ?? '').trim();
      input.cardHolder = String(form.get('cardHolder') ?? '').trim();
      input.expiryMonth = Number(form.get('expiryMonth'));
      input.expiryYear = Number(form.get('expiryYear'));
    }

    setBusy(true);
    setFormError('');
    try {
      if (editing) await api.updatePaymentMethod(editing.id, input);
      else await api.addPaymentMethod({ type, ...input });
      closeForm();
      await load();
    } catch (e) {
      setFormError(customerErrorMessage(e, t));
    } finally {
      setBusy(false);
    }
  };

  const setDefault = async (method: PaymentMethod) => {
    try {
      await api.setDefaultPaymentMethod(method.id);
      await load();
    } catch (e) {
      setError(customerErrorMessage(e, t));
      setStatus('error');
    }
  };

  const remove = async (method: PaymentMethod) => {
    if (!window.confirm(`${t('Remover o método')} "${method.label || method.type}"?`)) return;
    try {
      await api.deletePaymentMethod(method.id);
      await load();
    } catch (e) {
      setError(customerErrorMessage(e, t));
      setStatus('error');
    }
  };

  const startEditing = (method: PaymentMethod) => {
    setEditing(method);
    setType(method.type);
    setShowForm(true);
    setFormError('');
  };

  const formType = editing?.type ?? type;

  return (
    <AccountLayout>
      <div>
        <div className="vs-section-head">
          <h1>{t('Métodos de pagamento')}</h1>
          {!showForm && (
            <button className="vs-btn" onClick={() => setShowForm(true)}>
              <Plus size={18} /> {t('Adicionar')}
            </button>
          )}
        </div>

        <p style={{ color: 'var(--vs-muted)', marginBottom: 16 }}>
          {t('Os métodos guardados são associados apenas à sua conta. A API atual usa um processador de demonstração e não realiza cobranças reais.')}
        </p>

        {status === 'loading' && <div className="vs-state">{t('A carregar métodos de pagamento…')}</div>}
        {status === 'error' && (
          <div className="vs-state vs-err">
            <h3>{t('Não foi possível carregar os métodos')}</h3>
            <p>{error}</p>
            <button className="vs-btn" onClick={() => void load()}>{t('Tentar de novo')}</button>
          </div>
        )}

        {showForm && (
          <form className="vs-panel vs-form" onSubmit={submit} key={editing?.id ?? 'new'}>
            <h3>{t(editing ? 'Editar método' : 'Adicionar método')}</h3>
            {!editing && (
              <label className="vs-field">{t('Tipo')}
                <select value={type} onChange={event => setType(event.target.value as PaymentType)}>
                  <option value="mpesa">M-Pesa</option>
                  <option value="visa">Visa</option>
                </select>
              </label>
            )}
            {formError && <div className="vs-error" role="alert">{formError}</div>}
            <label className="vs-field">{t('Nome (opcional)')}
              <input name="label" maxLength={50} defaultValue={editing?.label ?? ''} placeholder={formType === 'mpesa' ? 'Ex.: M-Pesa pessoal' : 'Ex.: Cartão pessoal'} />
            </label>
            {formType === 'mpesa' ? (
              <label className="vs-field">{t('Número M-Pesa')}
                <input name="phone" type="tel" required defaultValue={editing?.phone ?? ''} autoComplete="tel" />
              </label>
            ) : !editing && (
              <>
                <label className="vs-field">{t('Número Visa')}
                  <input name="cardNumber" type="text" inputMode="numeric" autoComplete="cc-number" maxLength={23} required />
                </label>
                <label className="vs-field">{t('Nome no cartão')}
                  <input name="cardHolder" autoComplete="cc-name" maxLength={150} required />
                </label>
                <div className="vs-two">
                  <label className="vs-field">{t('Mês de validade')}
                    <input name="expiryMonth" type="number" min={1} max={12} autoComplete="cc-exp-month" required />
                  </label>
                  <label className="vs-field">{t('Ano de validade')}
                    <input name="expiryYear" type="number" min={new Date().getFullYear()} autoComplete="cc-exp-year" required />
                  </label>
                </div>
                <small>{t('A API guarda apenas os últimos quatro dígitos do cartão; não introduza o código CVV.')}</small>
              </>
            )}
            <div className="vs-inline">
              <button className="vs-btn" disabled={busy}>{busy ? t('A guardar…') : t('Guardar')}</button>
              <button type="button" className="vs-link" onClick={closeForm}>{t('Cancelar')}</button>
            </div>
          </form>
        )}

        {status === 'ok' && !methods.length && !showForm && (
          <div className="vs-state">
            <h3>{t('Não tem métodos guardados')}</h3>
            <p>{t('Adicione um método para o selecionar no checkout.')}</p>
          </div>
        )}
        {status === 'ok' && methods.length > 0 && (
          <ul className="vs-list">
            {methods.map(method => (
              <li key={method.id}>
                <div className="vs-row">
                  <div>
                    <b>{method.label || (method.type === 'mpesa' ? 'M-Pesa' : 'Visa')}</b>
                    {method.isDefault && <small> · {t('Padrão')}</small>}
                    <br />
                    <small>
                      {method.type === 'mpesa'
                        ? `M-Pesa · ${method.phone}`
                        : `${t('Visa terminando em')} ${method.cardLast4} · ${String(method.expiryMonth).padStart(2, '0')}/${method.expiryYear}`}
                    </small>
                  </div>
                  <div className="vs-inline">
                    {!method.isDefault && (
                      <button className="vs-link" aria-label={t('Definir método padrão')} onClick={() => void setDefault(method)}>
                        <Star size={16} /> {t('Padrão')}
                      </button>
                    )}
                    <button aria-label={t('Editar método')} onClick={() => startEditing(method)}><Pencil size={16} /></button>
                    <button aria-label={t('Remover método')} onClick={() => void remove(method)}><Trash2 size={16} /></button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="vs-inline" style={{ marginTop: 16 }}>
          <CreditCard size={18} />
          <Link className="vs-link" to="/checkout">{t('Ir para o checkout')}</Link>
        </div>
      </div>
    </AccountLayout>
  );
}
