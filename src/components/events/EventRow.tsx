import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { useTimeZone } from '../../context/timeZone'
import type { EventDetails } from '../../data/types'
import { availabilityLabel, getEventState } from '../../lib/eventState'
import { CATEGORY_LABELS, formatTimeRange, formatVenueArea } from '../../lib/format'
import { CATEGORY_STOCK } from './categoryStyle'
import { SaveButton } from './SaveButton'
import { StatusStamp } from './StatusStamp'

/** One event in the agenda or under a calendar day. It has to fit a narrow column. */
export function EventRow({ event }: { event: EventDetails }) {
  const { timeZone } = useTimeZone()
  const state = getEventState(event)
  return (
    <li
      style={{ '--stock': CATEGORY_STOCK[event.category] } as CSSProperties}
      className="flex items-start gap-3 border-t-2 border-line px-4 py-3 first:border-t-0"
    >
      <span aria-hidden className="mt-1 h-10 w-2 shrink-0 border border-ink/30 bg-(--stock)" />
      <div className="min-w-0 flex-1">
        <p className="m-0 font-bold">{formatTimeRange(event.startsAt, event.endsAt, timeZone)}</p>
        <h4 className="m-0 font-display text-xl leading-tight font-normal [overflow-wrap:anywhere]">
          <Link to={`/events/${event.id}`} className="underline-offset-2 hover:underline">
            {event.title}
          </Link>
        </h4>
        <p className="m-0 text-[0.9375rem] [overflow-wrap:anywhere]">
          {event.venue ? `${event.venue.name}, ${formatVenueArea(event.venue)}` : 'Online'}
        </p>
        <p className="m-0 text-[0.9375rem] text-ink-soft">
          {CATEGORY_LABELS[event.category]}, {availabilityLabel(event).toLowerCase()}
        </p>
        <StatusStamp state={state} className="mt-2 text-[0.9375rem]" />
      </div>
      <SaveButton event={event} />
    </li>
  )
}
