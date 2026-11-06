import { Bookmark } from 'lucide-react'
import { useToast } from '../../context/toast'
import type { EventDetails } from '../../data/types'
import { useToggleSaved } from '../../hooks/queries'
import { errorMessage } from '../../lib/errors'

interface SaveButtonProps {
  event: Pick<EventDetails, 'id' | 'title' | 'viewer'>
  /** "icon" for flyers, "full" where there is room for the words. */
  variant?: 'icon' | 'full'
}

export function SaveButton({ event, variant = 'icon' }: SaveButtonProps) {
  const toggle = useToggleSaved()
  const { showToast } = useToast()
  // Show the new state straight away while the write finishes.
  const saved = toggle.isPending ? (toggle.variables?.saved ?? false) : event.viewer.saved

  const onClick = () => {
    const next = !saved
    toggle.mutate(
      { eventId: event.id, saved: next },
      {
        onSuccess: () => showToast(next ? 'Saved to your plans.' : 'Removed from your plans.'),
        onError: (error) => showToast(errorMessage(error), 'error'),
      },
    )
  }

  if (variant === 'full') {
    return (
      <button type="button" className="btn btn-secondary" aria-pressed={saved} onClick={onClick}>
        <Bookmark aria-hidden className={`size-5 ${saved ? 'fill-current' : ''}`} />
        {saved ? 'Saved' : 'Save for later'}
      </button>
    )
  }

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={`Save ${event.title}`}
      title={saved ? 'Saved' : 'Save for later'}
      onClick={onClick}
      className="relative z-[2] grid size-11 place-items-center rounded-full border-2 border-ink bg-white text-ink hover:bg-paper"
    >
      <Bookmark aria-hidden className={`size-5 ${saved ? 'fill-current' : ''}`} />
    </button>
  )
}
