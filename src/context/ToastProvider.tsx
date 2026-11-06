import { CheckCircle2, CircleAlert, X } from 'lucide-react'
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { ToastContext, type ToastTone } from './toast'

interface Toast {
  id: number
  message: string
  tone: ToastTone
}

const TOAST_MS = 5000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      const id = nextId.current
      nextId.current += 1
      setToasts((current) => [...current.slice(-2), { id, message, tone }])
      window.setTimeout(() => dismiss(id), TOAST_MS)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex w-full max-w-md items-start gap-2 rounded-md border-2 border-ink bg-white px-3 py-2 text-ink shadow-lifted"
          >
            {toast.tone === 'success' ? (
              <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0 text-ok" />
            ) : (
              <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-danger" />
            )}
            <p className="m-0 flex-1 font-semibold">{toast.message}</p>
            <button
              type="button"
              aria-label="Dismiss message"
              onClick={() => dismiss(toast.id)}
              className="-m-1 grid size-8 shrink-0 place-items-center rounded border-0 bg-transparent"
            >
              <X aria-hidden className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
