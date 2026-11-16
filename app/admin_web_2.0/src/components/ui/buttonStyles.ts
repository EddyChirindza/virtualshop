import { cn } from '../../lib/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'
type ButtonSize = 'sm' | 'md'

interface ButtonStyleOptions {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
}

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-brand-start to-brand-end text-white shadow-sm shadow-brand-end/20 hover:brightness-110 active:brightness-95',
  secondary:
    'border border-line bg-white text-ink shadow-sm hover:border-brand-200 hover:bg-brand-50 hover:text-brand-end',
  ghost: 'text-muted hover:bg-brand-50 hover:text-brand-end',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
}

export function buttonStyles({
  variant = 'secondary',
  size = 'md',
  className,
}: ButtonStyleOptions = {}): string {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-end/40 focus-visible:ring-offset-2 disabled:opacity-50',
    variants[variant],
    sizes[size],
    className,
  )
}
