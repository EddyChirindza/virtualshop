import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Check, Circle, Eye, EyeOff } from 'lucide-react';
import AccountLayout from '../components/AccountLayout';
import { api, imageUrl, session } from '../services/api';
import { initials, toSquareBlob } from '../utils/avatar';

const MAX_FILE = 10 * 1024 * 1024;

// Os valores (1.º item) têm de ser os que o backend aceita em `gender`; o texto (2.º) é o que o cliente vê.
const GENDERS: [string, string][] = [
  ['male', 'Masculino'],
  ['female', 'Feminino'],
  ['other', 'Outro'],
  ['prefer_not_to_say', 'Prefiro não dizer'],
];

const pad = (n: number) => String(n).padStart(2, '0');
const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** Converte o que o backend envia (YYYY-MM-DD ou data ISO) para o formato do campo de data. */
const toDateInput = (v: unknown) => {
  if (!v) return '';
  const text = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const d = new Date(text);
  return Number.isNaN(+d) ? '' : fmt(d);
};

function PasswordField(props: { id: string; label: string; value: string; onChange: (v: string) => void; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="vs-field">
      <label htmlFor={props.id}>{props.label}</label>
      <div className="vs-pass">
        <input id={props.id} type={show ? 'text' : 'password'} required value={props.value} autoComplete={props.autoComplete}
          onChange={e => props.onChange(e.target.value)} />
        <button type="button" aria-label={show ? 'Esconder palavra-passe' : 'Mostrar palavra-passe'} onClick={() => setShow(v => !v)}>
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

export default function Profile() {
  const nav = useNavigate();
  const [user, setUser] = useState<any>();
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // dados pessoais
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  // fotografia
  const fileRef = useRef<HTMLInputElement>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState('');
  const [busyPhoto, setBusyPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');

  // palavra-passe
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busyPass, setBusyPass] = useState(false);
  const [passError, setPassError] = useState('');

  const load = async () => {
    setStatus('loading');
    try { setUser(await api.profile()); setStatus('ok'); }
    catch (e) { setError((e as Error).message); setStatus('error'); }
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  /* ── dados pessoais ── */
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? '').trim();
    setBusy(true); setFormError('');
    try {
      const email = get('email');
      const updated = await api.updateProfile({
        fullName: get('name'),
        phone: get('phone'),
        // o backend não deixa mudar um email que já foi guardado
        ...(!user?.email && email ? { email } : {}),
        ...(get('gender') ? { gender: get('gender') } : {}),
        ...(get('birthDate') ? { birthDate: get('birthDate') } : {}),
      });
      setUser((u: any) => ({ ...u, ...updated }));
      setNotice('Dados actualizados.');
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  /* ── fotografia ── */
  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoError('');
    if (!file.type.startsWith('image/')) return setPhotoError('Escolha um ficheiro de imagem.');
    if (file.size > MAX_FILE) return setPhotoError('A imagem é demasiado grande (máximo 10 MB).');
    try {
      const out = await toSquareBlob(file);
      setBlob(out);
      setPreview(URL.createObjectURL(out));
    } catch {
      setPhotoError('Não foi possível ler esta imagem. Experimente um ficheiro JPG ou PNG.');
    }
  };

  const cancelPhoto = () => { setBlob(null); setPreview(''); setPhotoError(''); };

  const savePhoto = async () => {
    if (!blob) return;
    setBusyPhoto(true); setPhotoError('');
    try {
      const r = await api.uploadAvatar(blob);
      const fresh = r?.avatar_url ? { ...user, avatar_url: r.avatar_url } : await api.profile();
      setUser(fresh);
      cancelPhoto();
      setNotice('Fotografia actualizada.');
    } catch (err) {
      setPhotoError((err as Error).message);
    } finally {
      setBusyPhoto(false);
    }
  };

  const removePhoto = async () => {
    if (!window.confirm('Remover a sua fotografia?')) return;
    setBusyPhoto(true); setPhotoError('');
    try { await api.deleteAvatar(); setUser((u: any) => ({ ...u, avatar_url: null })); setNotice('Fotografia removida.'); }
    catch (err) { setPhotoError((err as Error).message); }
    finally { setBusyPhoto(false); }
  };

  /* ── palavra-passe ── */
  const rules: [string, boolean][] = [
    ['Pelo menos 8 caracteres', next.length >= 8],
    ['Uma letra maiúscula', /[A-Z]/.test(next)],
    ['Uma letra minúscula', /[a-z]/.test(next)],
  ];
  const rulesOk = rules.every(r => r[1]);
  const score = !next ? 0 : rules.filter(r => r[1]).length + (/\d|[^A-Za-z0-9]/.test(next) ? 1 : 0);
  const match = next !== '' && next === confirm;
  const same = next !== '' && next === current;
  const canSave = !!current && rulesOk && match && !same && !busyPass;

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setBusyPass(true); setPassError('');
    try {
      const keptSession = await api.changePassword(current, next);
      setCurrent(''); setNext(''); setConfirm('');
      if (keptSession) { setNotice('Palavra-passe alterada com sucesso.'); return; }
      // Por segurança o backend terminou todas as sessões: é preciso entrar de novo.
      session.clear();
      nav('/login', { replace: true, state: { from: '/perfil', notice: 'Palavra-passe alterada. Entre com a nova palavra-passe.' } });
    } catch (err) {
      setPassError((err as Error).message);
    } finally {
      setBusyPass(false);
    }
  };

  const name: string = user?.full_name || user?.name || '';
  const shown = preview || (user?.avatar_url ? imageUrl(user.avatar_url) : '');

  return (
    <AccountLayout>
      <div>
        <h1>Dados pessoais</h1>

        {status === 'loading' && (
          <div aria-busy="true"><div className="vs-skel" style={{ height: 300, marginBottom: 16 }} /><div className="vs-skel" style={{ height: 260 }} /></div>
        )}
        {status === 'error' && (
          <div className="vs-state vs-err">
            <h3>Não foi possível abrir o perfil</h3><p>{error}</p>
            <button className="vs-btn" onClick={load}>Tentar de novo</button>
          </div>
        )}

        {status === 'ok' && <>
          <div className="vs-prof">
            <section className="vs-panel vs-photo">
              <h3>Fotografia</h3>
              <div className="vs-photo-box">
                {shown ? <img src={shown} alt="A sua fotografia" /> : <span aria-hidden>{initials(name)}</span>}
              </div>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={pick} />

              {!blob ? <>
                <button className="vs-btn vs-ghost vs-block" disabled={busyPhoto} onClick={() => fileRef.current?.click()}>
                  <Camera size={18} /> {user?.avatar_url ? 'Alterar fotografia' : 'Adicionar fotografia'}
                </button>
                {user?.avatar_url && <button className="vs-link vs-danger-link" disabled={busyPhoto} onClick={removePhoto}>Remover fotografia</button>}
              </> : <>
                <button className="vs-btn vs-block" disabled={busyPhoto} onClick={savePhoto}>{busyPhoto ? 'A enviar…' : 'Guardar fotografia'}</button>
                <button className="vs-link" disabled={busyPhoto} onClick={cancelPhoto}>Cancelar</button>
              </>}

              {photoError && <div className="vs-error" role="alert">{photoError}</div>}
              <small>JPG, PNG ou WebP. A imagem é cortada em quadrado.</small>
            </section>

            <form className="vs-panel" onSubmit={submit}>
              <h3>Informação da conta</h3>
              <div className="vs-fgrid">
                {formError && <div className="vs-error" role="alert">{formError}</div>}
                <label className="vs-field">Nome completo
                  <input name="name" required minLength={3} autoComplete="name" defaultValue={user?.full_name || user?.name || ''} />
                </label>
                <label className="vs-field">Telemóvel
                  <input name="phone" type="tel" inputMode="tel" required pattern="(?:[0-9]{9,15}|\+[1-9][0-9]{7,14})" autoComplete="tel" defaultValue={user?.phone || ''} />
                </label>
                <label className="vs-field">Email{user?.email ? '' : ' (opcional)'}
                  <input name="email" type="email" autoComplete="email" defaultValue={user?.email || ''} disabled={!!user?.email} />
                  {user?.email && <small>O email não pode ser alterado depois de guardado.</small>}
                </label>
                <div className="vs-two">
                  <label className="vs-field">Género
                    <select name="gender" defaultValue={user?.gender ?? ''}>
                      <option value="">Seleccionar</option>
                      {GENDERS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      {/* valor já guardado que não está na lista: mantém-no visível */}
                      {user?.gender && !GENDERS.some(([v]) => v === user.gender) && <option value={user.gender}>{String(user.gender)}</option>}
                    </select>
                  </label>
                  <label className="vs-field">Data de nascimento
                    <input name="birthDate" type="date" min="1900-01-01" max={fmt(new Date())} autoComplete="bday"
                      defaultValue={toDateInput(user?.birth_date)} />
                  </label>
                </div>
                <div><button className="vs-btn" disabled={busy}>{busy ? 'A guardar…' : 'Guardar alterações'}</button></div>
              </div>
            </form>
          </div>

          <form className="vs-panel" onSubmit={savePassword}>
            <h3>Segurança e palavra-passe</h3>
            <div className="vs-fgrid">
              {passError && <div className="vs-error" role="alert">{passError}</div>}
              <PasswordField id="vs-cur" label="Palavra-passe actual" value={current} onChange={setCurrent} autoComplete="current-password" />
              <PasswordField id="vs-new" label="Nova palavra-passe" value={next} onChange={setNext} autoComplete="new-password" />

              {next && <>
                <div className="vs-meter" data-level={score} aria-hidden><i /><i /><i /><i /></div>
                <small className="vs-meter-label">Força: <b>{['', 'Fraca', 'Razoável', 'Boa', 'Forte'][score]}</b></small>
              </>}
              <ul className="vs-rules">
                {rules.map(([text, ok]) => (
                  <li key={text} className={ok ? 'ok' : ''}>{ok ? <Check size={14} /> : <Circle size={14} />}{text}</li>
                ))}
              </ul>

              <PasswordField id="vs-conf" label="Confirmar nova palavra-passe" value={confirm} onChange={setConfirm} autoComplete="new-password" />
              {confirm && !match && <div className="vs-error" role="alert">As palavras-passe não coincidem.</div>}
              {same && <div className="vs-error" role="alert">A nova palavra-passe tem de ser diferente da actual.</div>}

              <div><button className="vs-btn" disabled={!canSave}>{busyPass ? 'A alterar…' : 'Alterar palavra-passe'}</button></div>
            </div>
          </form>
        </>}
      </div>
      {notice && <div className="vs-toast" role="status">{notice}</div>}
    </AccountLayout>
  );
}