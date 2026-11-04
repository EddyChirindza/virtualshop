import {
  Bell,
  ChevronDown,
  LoaderCircle,
  LogOut,
  Menu,
  Search,
  Settings,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getApiErrorMessage } from '../../lib/api/errors'
import { cn } from '../../lib/cn'
import { useAuth } from '../../features/auth/context/useAuth'
import { Avatar } from '../ui/Avatar'
import { Breadcrumbs, type BreadcrumbItem } from './Breadcrumbs'

interface HeaderProps {
  title: string
  description: string
  breadcrumbs: BreadcrumbItem[]
  onOpenMenu: () => void
}

function GlobalSearch({ className }: { className?: string }) {
  return (
    <form
      className={cn('relative', className)}
      onSubmit={(event) => event.preventDefault()}
      role="search"
    >
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
      />
      <input
        aria-label="Pesquisa global"
        className="w-full rounded-xl border border-line bg-canvas py-2.5 pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-muted/80 focus:border-brand-200 focus:bg-white focus:ring-4 focus:ring-brand-end/10"
        name="q"
        placeholder="Pesquisar na loja..."
        type="search"
      />
    </form>
  )
}

export function Header({
  title,
  description,
  breadcrumbs,
  onOpenMenu,
}: HeaderProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [profileOpen, setProfileOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  const displayName = user?.full_name?.trim() || 'Administrador'
  const displayContact = user?.email ?? user?.phone ?? 'Conta administrativa'

  useEffect(() => {
    if (!profileOpen) return

    function handlePointerDown(event: MouseEvent) {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setProfileOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [profileOpen])

  async function handleLogout() {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch (error) {
      navigate('/login', {
        replace: true,
        state: { logoutError: getApiErrorMessage(error) },
      })
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
      <div className="flex items-center gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
        <button
          aria-label="Abrir menu de navegação"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-muted transition hover:bg-canvas hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-end/40 lg:hidden"
          onClick={onOpenMenu}
          type="button"
        >
          <Menu aria-hidden="true" className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          {breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}
          <h1
            className={cn(
              'truncate text-base font-semibold tracking-tight text-ink sm:text-lg',
              breadcrumbs.length > 0 && 'mt-1',
            )}
          >
            {title}
          </h1>
          <p className="mt-0.5 hidden truncate text-xs text-muted sm:block">
            {description}
          </p>
        </div>

        <GlobalSearch className="hidden w-64 shrink-0 lg:block xl:w-80" />

        <Link
          aria-label="Ver notificações"
          className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-muted transition hover:bg-canvas hover:text-brand-end focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-end/40"
          to="/notifications"
        >
          <Bell aria-hidden="true" className="h-5 w-5" />
        </Link>

        <div className="relative shrink-0" ref={profileRef}>
          <button
            aria-expanded={profileOpen}
            aria-haspopup="menu"
            aria-label="Abrir menu do perfil"
            className="flex items-center gap-2 rounded-xl border border-transparent p-1 pr-1.5 transition hover:border-line hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-end/40 md:pr-2"
            onClick={() => setProfileOpen((open) => !open)}
            type="button"
          >
            <Avatar name={displayName} />
            <span className="hidden min-w-0 text-left md:block">
              <span className="block max-w-36 truncate text-xs font-semibold text-ink">
                {displayName}
              </span>
              <span className="block text-[11px] text-muted">
                Administrador
              </span>
            </span>
            <ChevronDown
              aria-hidden="true"
              className={cn(
                'hidden h-4 w-4 text-muted transition-transform md:block',
                profileOpen && 'rotate-180',
              )}
            />
          </button>

          {profileOpen && (
            <div
              aria-label="Menu do perfil"
              className="animate-fade-in absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-line bg-white p-2 shadow-xl shadow-ink/10"
              role="menu"
            >
              <div className="flex items-center gap-3 rounded-xl px-3 py-3">
                <Avatar name={displayName} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">
                    {displayName}
                  </p>
                  <p className="truncate text-xs text-muted">{displayContact}</p>
                </div>
              </div>
              <div className="my-1 h-px bg-line" />
              <Link
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-muted transition hover:bg-brand-50 hover:text-brand-end focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-end/40"
                onClick={() => setProfileOpen(false)}
                role="menuitem"
                to="/settings"
              >
                <Settings aria-hidden="true" className="h-4 w-4" />
                Configurações
              </Link>
              <button
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-danger transition hover:bg-danger-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/30 disabled:opacity-60"
                disabled={isLoggingOut}
                onClick={handleLogout}
                role="menuitem"
                type="button"
              >
                {isLoggingOut ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin"
                  />
                ) : (
                  <LogOut aria-hidden="true" className="h-4 w-4" />
                )}
                {isLoggingOut ? 'A terminar sessão...' : 'Terminar sessão'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pb-3 sm:px-6 lg:hidden">
        <GlobalSearch />
      </div>
    </header>
  )
}
