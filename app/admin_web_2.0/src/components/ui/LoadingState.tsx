import { LoaderCircle } from 'lucide-react'

interface LoadingStateProps {
  label?: string
}

export function LoadingState({ label = 'A carregar...' }: LoadingStateProps) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-3 bg-canvas px-6 text-center"
      role="status"
      aria-live="polite"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-end">
        <LoaderCircle aria-hidden="true" className="h-6 w-6 animate-spin" />
      </span>
      <p className="text-sm font-medium text-muted">{label}</p>
    </div>
  )
}
