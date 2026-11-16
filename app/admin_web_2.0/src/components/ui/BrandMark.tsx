import { Store } from 'lucide-react'
import { cn } from '../../lib/cn'

type BrandMarkTone = 'brand' | 'glass'

interface BrandMarkProps {
  tone?: BrandMarkTone
  className?: string
  iconClassName?: string
}

const tones: Record<BrandMarkTone, string> = {
  brand:
    'bg-gradient-to-br from-brand-start to-brand-end text-white shadow-lg shadow-brand-end/25',
  glass:
    'border border-white/20 bg-white/15 text-white shadow-none backdrop-blur',
}

export function BrandMark({
  tone = 'brand',
  className,
  iconClassName,
}: BrandMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-xl',
        tones[tone],
        className,
      )}
    >
      <Store className={cn('h-5 w-5', iconClassName)} strokeWidth={2} />
    </span>
  )
}
