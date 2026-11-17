import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import AccountLayout from '../components/AccountLayout';
import { api } from '../services/api';
import type { Address } from '../types';

const PROVINCES = ['Maputo Cidade', 'Maputo Província', 'Gaza', 'Inhambane', 'Sofala', 'Manica', 'Tete', 'Zambézia', 'Nampula', 'Cabo Delgado', 'Niassa'];
const FIELDS: [keyof AddressForm, string, boolean][] = [
  ['label', 'Nome do endereço (ex.: Casa, Trabalho)', true],
  ['street', 'Rua / Avenida', true],
  ['number', 'Número', false],
  ['neighborhood', 'Bairro', true],
  ['city', 'Cidade', true],
];
type AddressForm = { label: string; street: string; number: string; neighborhood: string; city: string; province: string };

export default function Addresses() {
  const [list, setList] = useState<Address[]>([]);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Address | 'new' | null>(null);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try { setList(await api.addresses()); setStatus('ok'); }
    catch (e) { setError((e as Error).message); setStatus('error'); }
  };
  useEffect(() => { load(); }, []);

  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? '').trim();
    const data: AddressForm = {
      label: get('label'), street: get('street'), number: get('number'),
      neighborhood: get('neighborhood'), city: get('city'), province: get('province'),
    };
    setBusy(true); setFormError('');
    try {
      if (editing && editing !== 'new') await api.updateAddress(editing.id, data);
      else await api.addAddress(data);
      setEditing(null);
      await load();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (a: Address) => {
    if (!window.confirm(`Apagar o endereço "${a.label}"?`)) return;
    try { await api.deleteAddress(a.id); await load(); }
    catch (e) { setError((e as Error).message); setStatus('error'); }
  };

  const current: Partial<AddressForm> = editing && editing !== 'new' ? (editing as any) : { province: 'Maputo Cidade' };

  return (
    <AccountLayout>
      <div>
        <div className="vs-section-head">
          <h1>Os meus endereços</h1>
          {!editing && <button className="vs-btn" onClick={() => setEditing('new')}><Plus size={18} /> Novo endereço</button>}
        </div>

        {status === 'loading' && <div className="vs-state">A carregar endereços…</div>}
        {status === 'error' && (
          <div className="vs-state vs-err">
            <h3>Não foi possível carregar os endereços</h3><p>{error}</p>
            <button className="vs-btn" onClick={() => { setStatus('loading'); load(); }}>Tentar de novo</button>
          </div>
        )}

        {editing && (
          <form className="vs-panel vs-form" onSubmit={save} key={editing === 'new' ? 'new' : editing.id}>
            <h3>{editing === 'new' ? 'Novo endereço' : 'Editar endereço'}</h3>
            {formError && <div className="vs-error" role="alert">{formError}</div>}
            {FIELDS.map(([name, label, required]) => (
              <label className="vs-field" key={name}>{label}
                <input name={name} required={required} defaultValue={current[name] ?? ''} />
              </label>
            ))}
            <label className="vs-field">Província
              <select name="province" defaultValue={current.province}>
                {PROVINCES.map(p => <option key={p}>{p}</option>)}
              </select>
            </label>
            <div className="vs-inline">
              <button className="vs-btn" disabled={busy}>{busy ? 'A guardar…' : 'Guardar'}</button>
              <button type="button" className="vs-link" onClick={() => { setEditing(null); setFormError(''); }}>Cancelar</button>
            </div>
          </form>
        )}

        {status === 'ok' && !list.length && !editing && (
          <div className="vs-state"><h3>Ainda não tem endereços guardados</h3><p>Adicione um para finalizar compras mais depressa.</p></div>
        )}
        {status === 'ok' && list.length > 0 && (
          <ul className="vs-list">
            {list.map(a => (
              <li key={a.id}>
                <b>{a.label}</b><br />
                {a.street} {a.number}, {a.neighborhood}<br />
                <small>{a.city}, {a.province}</small>
                <div className="vs-inline">
                  <button aria-label="Editar" onClick={() => setEditing(a)}><Pencil size={16} /></button>
                  <button aria-label="Apagar" onClick={() => remove(a)}><Trash2 size={16} /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AccountLayout>
  );
}