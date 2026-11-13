import {
  ArrowRight,
  CircleAlert,
  CircleCheck,
  Eye,
  EyeOff,
  LoaderCircle,
  ShieldCheck,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate, type Location } from 'react-router-dom'
import { getApiErrorMessage } from '../../../lib/api/errors'
import { BrandMark } from '../../../components/ui/BrandMark'
import { useAuth } from '../context/useAuth'

interface RedirectState {
  from?: Location
  logoutError?: string
  message?: string
}

const inputClassName =
  'w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-muted/80 focus:border-brand-200 focus:ring-4 focus:ring-brand-end/10'

export function LoginPage() {
  const { login, isLoading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const redirectState = location.state as RedirectState | null
  const successMessage = redirectState?.message
  const [errorMessage, setErrorMessage] = useState<string | null>(
    redirectState?.logoutError ?? null,
  )
  const from = redirectState?.from

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    try {
      await login(identifier, password)
      const pathname =
        from?.pathname && from.pathname !== '/login'
          ? from.pathname
          : '/dashboard'
      navigate(
        { pathname, search: from?.search, hash: from?.hash },
        { replace: true },
      )
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    }
  }

  return (
    <main className="grid min-h-screen bg-canvas lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-brand-start via-brand-600 to-brand-end p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-white/10 blur-3xl"
        />

        <div className="relative z-10 flex items-center gap-3">
          <BrandMark
            className="h-11 w-11"
            iconClassName="h-5 w-5"
            tone="glass"
          />
          <div>
            <p className="text-base font-semibold tracking-tight">VirtualShop</p>
            <p className="text-[11px] font-medium text-white/70">
              Painel administrativo
            </p>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">
            Gestão da loja
          </p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
            Tudo o que precisas para gerir o VirtualShop.
          </h2>
          <p className="mt-4 text-sm leading-6 text-white/80">
            Encomendas, catálogo, clientes e equipa administrativa num único
            espaço, desenhado para o trabalho diário.
          </p>

        </div>

        <p className="relative z-10 text-xs text-white/60">
          © VirtualShop · Acesso reservado à equipa administrativa.
        </p>
      </aside>

      <section className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <BrandMark className="h-11 w-11" iconClassName="h-5 w-5" />
            <div>
              <p className="text-base font-semibold tracking-tight text-ink">
                VirtualShop
              </p>
              <p className="text-[11px] font-medium text-muted">
                Painel administrativo
              </p>
            </div>
          </div>

          <form
            className="rounded-2xl border border-line bg-white p-6 shadow-xl shadow-ink/5 sm:p-8"
            onSubmit={handleSubmit}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-end">
              <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
              Acesso administrativo
            </span>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
              Inicia sessão
            </h1>
            <p className="mt-1.5 text-sm leading-6 text-muted">
              Usa as tuas credenciais de administrador para aceder ao painel.
            </p>

            {successMessage && (
              <p
                className="mt-5 flex items-start gap-2 rounded-xl border border-success/20 bg-success-surface px-3.5 py-3 text-sm text-success"
                role="status"
              >
                <CircleCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                {successMessage}
              </p>
            )}

            <div className="mt-7 space-y-5">
              <div>
                <label
                  className="text-xs font-semibold text-ink"
                  htmlFor="identifier"
                >
                  Email ou telefone
                </label>
                <input
                  aria-invalid={errorMessage ? true : undefined}
                  autoComplete="username"
                  className={`${inputClassName} mt-1.5`}
                  id="identifier"
                  name="identifier"
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="admin@virtualshop.co.mz"
                  required
                  value={identifier}
                />
              </div>

              <div>
                <label
                  className="text-xs font-semibold text-ink"
                  htmlFor="password"
                >
                  Password
                </label>
                <div className="relative mt-1.5">
                  <input
                    aria-invalid={errorMessage ? true : undefined}
                    autoComplete="current-password"
                    className={`${inputClassName} pr-11`}
                    id="password"
                    name="password"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Introduz a tua password"
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                  />
                  <button
                    aria-label={
                      showPassword ? 'Ocultar password' : 'Mostrar password'
                    }
                    className="absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-md p-1 text-muted transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-end/40"
                    onClick={() => setShowPassword((visible) => !visible)}
                    type="button"
                  >
                    {showPassword ? (
                      <EyeOff aria-hidden="true" className="h-4 w-4" />
                    ) : (
                      <Eye aria-hidden="true" className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {errorMessage && (
                <p
                  className="flex items-start gap-2 rounded-xl border border-danger/20 bg-danger-surface px-3.5 py-3 text-sm text-danger"
                  role="alert"
                >
                  <CircleAlert
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0"
                  />
                  {errorMessage}
                </p>
              )}

              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-start to-brand-end px-4 py-3 text-sm font-semibold text-white shadow-md shadow-brand-end/20 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-end/40 focus-visible:ring-offset-2 disabled:opacity-60"
                disabled={isLoading}
                type="submit"
              >
                {isLoading ? (
                  <>
                    <LoaderCircle
                      aria-hidden="true"
                      className="h-4 w-4 animate-spin"
                    />
                    A autenticar...
                  </>
                ) : (
                  <>
                    Entrar no painel
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>

            <p className="mt-6 text-center text-[11px] leading-5 text-muted">
              O acesso é restrito a contas com perfil de administrador.
            </p>
          </form>
        </div>
      </section>
    </main>
  )
}
