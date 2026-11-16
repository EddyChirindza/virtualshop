import { LogIn, RefreshCw, WifiOff } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'

interface SessionRecoveryProps {
  message: string | null
  onRetry: () => void
}

export function SessionRecovery({ message, onRetry }: SessionRecoveryProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-5 py-10">
      <section className="w-full max-w-md rounded-2xl border border-line bg-white p-7 text-center shadow-xl shadow-ink/5 sm:p-8">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-warning-surface text-warning">
          <WifiOff aria-hidden="true" className="h-6 w-6" />
        </span>
        <h1 className="mt-5 text-xl font-semibold tracking-tight text-ink">
          Não foi possível recuperar a sessão
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          {message ??
            'Não foi possível contactar o servidor. A tua sessão pode continuar válida.'}
        </p>
        <p className="mt-2 text-xs leading-5 text-muted">
          Verifica a ligação e tenta novamente. Só serás enviado para o login
          depois de confirmarmos que a sessão já não é válida.
        </p>
        <Button
          className="mt-6 w-full"
          onClick={onRetry}
          variant="primary"
        >
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
          Tentar novamente
        </Button>
        <Link
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-muted transition hover:bg-brand-50 hover:text-brand-end focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-end/40"
          to="/login"
        >
          <LogIn aria-hidden="true" className="h-3.5 w-3.5" />
          Iniciar sessão manualmente
        </Link>
      </section>
    </main>
  )
}
