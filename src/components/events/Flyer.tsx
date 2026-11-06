import { Link } from 'react-router'
import type { CSSProperties } from 'react'
import { useTimeZone } from '../../context/timeZone'
import type { EventDetails } from '../../data/types'
import { availabilityLabel, getEventState, rsvpStatusLabel } from '../../lib/eventState'
import {
  CATEGORY_LABELS,
  formatShortDate,
  formatTimeRange,
  formatVenueArea,
} from '../../lib/format'
import { CATEGORY_STOCK, flyerTilt, isTypeOnlyFlyer } from './categoryStyle'
import { CoverArt } from './CoverArt'
import { SaveButton } from './SaveButton'
import { StatusStamp } from './StatusStamp'
import { TearTabs } from './TearTabs'

interface FlyerProps {
  event: EventDetails
  headingLevel?: 'h2' | 'h3'
  /** A non-interactive version for the organizer's live preview. */
  preview?: boolean
}

function flyerLocation(event: EventDetails): string {
  if (!event.venue) return 'Online'
  return [event.venue.name, formatVenueArea(event.venue), event.onlineUrl ? 'and online' : '']
    .filter(Boolean)
    .join(', ')
}

export function Flyer({ event, headingLevel: Heading = 'h3', preview = false }: FlyerProps) {
  const { timeZone } = useTimeZone()
  const state = getEventState(event)
  const dimmed = state === 'canceled' || state === 'past'
  const shortDate = formatShortDate(event.startsAt, timeZone)
  const showsTabs = state === 'open' || state === 'limited' || state === 'full' || state === 'draft'
  const typeOnly = isTypeOnlyFlyer(event.id, Boolean(event.coverImageUrl))

  return (
    <article
      className={`flyer ${preview ? '' : 'flyer-hover'} ${dimmed ? 'flyer-faded' : ''}`}
      style={{ '--stock': CATEGORY_STOCK[event.category], '--tilt': flyerTilt(event.id) } as CSSProperties}
    >
      <div className="flyer-sheet">
        {!typeOnly && (
          <div className="flyer-art relative aspect-[16/7] overflow-hidden">
            <CoverArt event={event} />
            <StatusStamp state={state} className="absolute top-3 left-3 z-[1]" />
          </div>
        )}

        <div className="flex flex-1 flex-col px-4 pt-3 pb-3">
          {typeOnly && <StatusStamp state={state} className="mt-1 mb-2 self-start" />}

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="m-0 text-[1.1875rem] leading-snug font-extrabold">{shortDate}</p>
              <p className="m-0 text-[0.9375rem] font-semibold">
                {formatTimeRange(event.startsAt, event.endsAt, timeZone)}
              </p>
            </div>
            {!preview && <SaveButton event={event} />}
          </div>

          <Heading
            className={`flyer-title clamp-3 mb-1 ${
              typeOnly ? 'mt-4 text-[2.375rem]' : 'mt-2 text-[1.625rem]'
            }`}
            title={event.title}
          >
            {preview ? (
              event.title || 'Your event title'
            ) : (
              <Link to={`/events/${event.id}`} className="flyer-link">
                {event.title}
              </Link>
            )}
          </Heading>

          <p className="m-0 clamp-2 text-[0.9375rem] [overflow-wrap:anywhere]">{flyerLocation(event)}</p>
          <p className="m-0 clamp-2 text-[0.9375rem] text-ink-soft [overflow-wrap:anywhere]">
            {CATEGORY_LABELS[event.category]}, by {event.organizer.name}
          </p>

          <div className="mt-auto pt-3">
            {event.viewer.rsvp && <p className="m-0 font-bold">{rsvpStatusLabel(event)}</p>}
            {/* The stamp already says these two, so the words would only repeat it. */}
            {state !== 'canceled' && state !== 'happening' && (
              <p className="m-0 font-bold">{availabilityLabel(event)}</p>
            )}
          </div>
        </div>
      </div>
      <TearTabs
        count={8}
        spotsLeft={showsTabs ? event.spotsLeft : 0}
        capacity={event.capacity}
        text={shortDate.replace(',', '')}
      />
    </article>
  )
}
