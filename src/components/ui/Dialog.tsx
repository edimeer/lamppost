import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'

interface DialogProps {
  title: string
  onClose: () => void
  children: ReactNode
}

/**
 * Wraps the browser's <dialog>, which traps focus, closes on Escape and returns
 * focus to the button that opened it without any extra code.
 */
export function Dialog({ title, onClose, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
    return () => dialog?.close()
  }, [])

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b-2 border-line bg-white px-5 py-3">
        <h2 id={titleId} className="m-0 text-2xl">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-mr-2 grid size-11 shrink-0 place-items-center rounded-lg border-0 bg-transparent text-ink hover:bg-paper"
        >
          <X aria-hidden className="size-5" />
        </button>
      </div>
      <div className="px-5 py-4">{children}</div>
    </dialog>
  )
}
