import type { EventState } from '../../lib/eventState'

const STAMPS: Partial<Record<EventState, { label: string; className: string }>> = {
  draft: { label: 'Draft', className: 'stamp-draft' },
  canceled: { label: 'Canceled', className: 'stamp-canceled' },
  past: { label: 'Past', className: 'stamp-past' },
  happening: { label: 'Happening now', className: 'stamp-happening' },
  full: { label: 'Full', className: 'stamp-full' },
}

/** A rubber stamp. The word carries the meaning, so status never relies on color. */
export function StatusStamp({ state, className = '' }: { state: EventState; className?: string }) {
  const stamp = STAMPS[state]
  if (!stamp) return null
  return <span className={`stamp ${stamp.className} ${className}`}>{stamp.label}</span>
}
