import type { ReactNode } from 'react'
import { Dialog } from './Dialog'

interface ConfirmDialogProps {
  title: string
  children: ReactNode
  confirmLabel: string
  cancelLabel?: string
  danger?: boolean
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  cancelLabel = 'Keep it',
  danger = false,
  busy = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Dialog title={title} onClose={onClose}>
      <div>{children}</div>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`btn ${danger ? 'btn-danger-solid' : 'btn-primary'}`}
          onClick={onConfirm}
          disabled={busy}
        >
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  )
}
