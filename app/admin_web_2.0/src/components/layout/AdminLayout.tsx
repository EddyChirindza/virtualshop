import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { getAdminNavItem } from '../../app/router/adminNavigation'
import { cn } from '../../lib/cn'
import type { BreadcrumbItem } from './Breadcrumbs'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

const SIDEBAR_STORAGE_KEY = 'virtualshop.admin.sidebar'

function getInitialCollapsed(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'collapsed'
  } catch {
    return false
  }
}

export function AdminLayout() {
  const location = useLocation()
  const navItem = getAdminNavItem(location.pathname)
  const [isCollapsed, setIsCollapsed] = useState(getInitialCollapsed)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  useEffect(() => {
    try {
      window.localStorage.setItem(
        SIDEBAR_STORAGE_KEY,
        isCollapsed ? 'collapsed' : 'expanded',
      )
    } catch {
      // A indisponibilidade de localStorage não deve bloquear o layout.
    }
  }, [isCollapsed])

  useEffect(() => {
    document.title = `${navItem.label} · VirtualShop Admin`
  }, [navItem.label])

  useEffect(() => {
    if (!isMobileOpen) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsMobileOpen(false)
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMobileOpen])

  const breadcrumbs: BreadcrumbItem[] =
    navItem.to === '/dashboard'
      ? []
      : [{ label: 'Início', to: '/dashboard' }, { label: navItem.label }]

  return (
    <div className="min-h-screen bg-canvas">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden border-r border-line transition-[width] duration-200 lg:block',
          isCollapsed ? 'w-20' : 'w-72',
        )}
      >
        <Sidebar
          collapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed((collapsed) => !collapsed)}
        />
      </aside>

      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            aria-hidden="true"
            className="animate-fade-in absolute inset-0 bg-ink/50 backdrop-blur-sm"
            onClick={() => setIsMobileOpen(false)}
          />
          <div
            aria-label="Menu de navegação"
            aria-modal="true"
            className="animate-slide-in absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl shadow-ink/20"
            role="dialog"
          >
            <Sidebar
              onClose={() => setIsMobileOpen(false)}
              onNavigate={() => setIsMobileOpen(false)}
              showClose
            />
          </div>
        </div>
      )}

      <div
        className={cn(
          'flex min-h-screen flex-col transition-[padding] duration-200',
          isCollapsed ? 'lg:pl-20' : 'lg:pl-72',
        )}
      >
        <Header
          breadcrumbs={breadcrumbs}
          description={navItem.description}
          onOpenMenu={() => setIsMobileOpen(true)}
          title={navItem.label}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1500px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
