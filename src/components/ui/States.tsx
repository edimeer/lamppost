import { CircleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { errorMessage } from '../../lib/errors'

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="sheet mx-auto max-w-xl px-6 py-10 text-center text-ink">
      <h2 className="m-0 text-2xl">{title}</h2>
      {children && <p className="mt-2 mb-0">{children}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  )
}

export function ErrorState({
  error,
  title = 'This page could not load',
  onRetry,
}: {
  error: unknown
  title?: string
  onRetry?: () => void
}) {
  return (
    <div role="alert" className="sheet mx-auto max-w-xl px-6 py-10 text-center text-ink">
      <CircleAlert aria-hidden className="mx-auto mb-2 size-8 text-danger" />
      <h2 className="m-0 text-2xl">{title}</h2>
      <p className="mt-2 mb-0">{errorMessage(error)}</p>
      {onRetry && (
        <button type="button" className="btn btn-primary mt-5" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

export function FlyerGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading events" className="grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} aria-hidden className="skeleton h-96 rounded-sm" />
      ))}
    </div>
  )
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} aria-hidden className="skeleton h-20 rounded-sm" />
      ))}
    </div>
  )
}
