import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { adminNavItems } from '../../app/router/adminNavigation'
import { cn } from '../../lib/cn'
import { BrandMark } from '../ui/BrandMark'

interface SidebarProps {
  collapsed?: boolean
  onToggleCollapse?: () => void
  onNavigate?: () => void
  showClose?: boolean
  onClose?: () => void
}

export function Sidebar({
  collapsed = false,
  onToggleCollapse,
  onNavigate,
  showClose = false,
  onClose,
}: SidebarProps) {
  return (
    <div className="flex h-full flex-col bg-white">
      <div
        className={cn(
          'flex h-20 items-center gap-3 border-b border-line',
          collapsed ? 'justify-center px-3' : 'px-5',
        )}
      >
        <BrandMark className="h-10 w-10" iconClassName="h-5 w-5" />
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold tracking-tight text-ink">
              VirtualShop
            </p>
            <p className="truncate text-[11px] font-medium text-muted">
              Painel administrativo
            </p>
          </div>
        )}
        {showClose && (
          <button
            aria-label="Fechar menu de navegação"
            autoFocus
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted transition hover:bg-canvas hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-end/40"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        )}
      </div>

      {onToggleCollapse && !showClose && (
        <div className={cn('px-3 pt-3', collapsed && 'px-2')}>
          <button
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            className={cn(
              'flex w-full items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-xs font-medium text-muted transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-end focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-end/40',
              collapsed && 'justify-center px-0',
            )}
            onClick={onToggleCollapse}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            type="button"
          >
            {collapsed ? (
              <PanelLeftOpen aria-hidden="true" className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose aria-hidden="true" className="h-4 w-4" />
                <span>Recolher menu</span>
              </>
            )}
          </button>
        </div>
      )}

      <nav
        aria-label="Navegação principal"
        className="flex-1 overflow-y-auto px-3 py-4"
      >
        {!collapsed && (
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
            Menu
          </p>
        )}
        <ul className="space-y-1">
          {adminNavItems.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.to}>
                <NavLink
                  aria-label={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-end/40',
                      collapsed && 'justify-center px-0',
                      isActive
                        ? 'bg-gradient-to-r from-brand-start to-brand-end text-white shadow-md shadow-brand-end/20'
                        : 'text-muted hover:bg-brand-50 hover:text-brand-end',
                    )
                  }
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  to={item.to}
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        aria-hidden="true"
                        className={cn(
                          'h-5 w-5 shrink-0 transition-colors',
                          isActive
                            ? 'text-white'
                            : 'text-muted group-hover:text-brand-end',
                        )}
                      />
                      {!collapsed && (
                        <span className="truncate font-medium">
                          {item.label}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-line p-3">
        {collapsed ? (
          <p className="text-center text-[10px] font-medium text-muted">v2.0</p>
        ) : (
          <div className="rounded-xl bg-canvas px-3 py-3">
            <p className="text-xs font-semibold text-ink">
              VirtualShop Admin
            </p>
            <p className="mt-0.5 text-[11px] text-muted">
              Versão 2.0 · Fase 1
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
