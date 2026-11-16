import {
  Bell,
  LayoutDashboard,
  Package,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Tags,
  Users,
  type LucideIcon,
} from 'lucide-react'

export interface AdminNavItem {
  label: string
  to: string
  description: string
  icon: LucideIcon
}

export const adminNavItems: AdminNavItem[] = [
  {
    label: 'Dashboard',
    to: '/dashboard',
    description: 'Visão geral do estado da loja e da operação.',
    icon: LayoutDashboard,
  },
  {
    label: 'Encomendas',
    to: '/orders',
    description: 'Acompanha e gere as encomendas dos clientes.',
    icon: ShoppingCart,
  },
  {
    label: 'Produtos',
    to: '/products',
    description: 'Organiza o catálogo e o inventário da loja.',
    icon: Package,
  },
  {
    label: 'Categorias',
    to: '/categories',
    description: 'Estrutura as categorias do catálogo.',
    icon: Tags,
  },
  {
    label: 'Clientes',
    to: '/customers',
    description: 'Consulta a informação dos clientes registados.',
    icon: Users,
  },
  {
    label: 'Administradores',
    to: '/administrators',
    description: 'Gere os utilizadores com acesso ao painel.',
    icon: ShieldCheck,
  },
  {
    label: 'Notificações',
    to: '/notifications',
    description: 'Acompanha os alertas e eventos da loja.',
    icon: Bell,
  },
  {
    label: 'Configurações',
    to: '/settings',
    description: 'Ajusta as preferências gerais do sistema.',
    icon: Settings,
  },
]

const fallbackItem = adminNavItems[0]

export function getAdminNavItem(pathname: string): AdminNavItem {
  return adminNavItems.find((item) => item.to === pathname) ?? fallbackItem
}
