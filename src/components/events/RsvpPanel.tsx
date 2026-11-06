import { CalendarPlus, Link2, Ticket } from 'lucide-react'
import type { CSSProperties } from 'react'
import { useToast } from '../../context/toast'
import { useTimeZone } from '../../context/timeZone'
import type { EventDetails } from '../../data/types'
import { downloadFile, slugify } from '../../lib/download'
import {
  acceptsRsvps,
  availabilityLabel,
  getEventState,
  rsvpButtonLabel,
  rsvpStatusLabel,
} from '../../lib/eventState'
import { formatShortDate, pluralize } from '../../lib/format'
import { buildIcs } from '../../lib/ics'
import { CATEGORY_STOCK } from './categoryStyle'
import { SaveButton } from './SaveButton'
import { TearTabs } from './TearTabs'

interface RsvpPanelProps {
  event: EventDetails
  justReserved: boolean
  onRsvp: () => void
  onCancelRsvp: () => void
}

function closedMessage(event: EventDetails): string {
  switch (getEventState(event)) {
    case 'canceled':
      return 'This event is canceled, so RSVPs are closed.'
    case 'past':
      return 'This event has ended.'
    case 'happening':
      return 'This event has started, so RSVPs are closed.'
    default:
      return 'RSVPs open once this event is published.'
  }
}

export function RsvpPanel({ event, justReserved, onRsvp, onCancelRsvp }: RsvpPanelProps) {
  const { timeZone } = useTimeZone()
  const { showToast } = useToast()
  const state = getEventState(event)
  const open = acceptsRsvps(state)
  const rsvp = event.viewer.rsvp
  const shortDate = formatShortDate(event.startsAt, timeZone)

  const addToCalendar = () => {
    downloadFile(
      `${slugify(event.title)}.ics`,
      buildIcs(event, window.location.href),
      'text/calendar;charset=utf-8',
    )
    showToast('Calendar file downloaded.')
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      showToast('Link copied.')
    } catch {
      showToast('Your browser blocked copying. Copy the address from the address bar.', 'error')
    }
  }

  return (
    <aside aria-label="RSVP" className="lg:sticky lg:top-4">
      <div
        className="flyer"
        style={{ '--stock': CATEGORY_STOCK[event.category] } as CSSProperties}
      >
        <div className="flyer-sheet p-5">
          <h2 className="m-0 text-2xl">{availabilityLabel(event)}</h2>
          <p className="mt-1 mb-0">
            {pluralize(event.goingCount, 'person', 'people')} going
            {event.waitlistCount > 0 ? `, ${event.waitlistCount.toLocaleString('en-US')} waiting` : ''}
            , room for {event.capacity.toLocaleString('en-US')}.
          </p>

          {rsvp && (
            <div className={`stub mt-4 ${justReserved ? 'stub-new' : ''}`}>
              <p className="m-0 flex items-center gap-2 font-display text-xl">
                <Ticket aria-hidden className="size-5" />
                {rsvpStatusLabel(event)}
              </p>
              <p className="m-0 text-[0.9375rem]">
                {pluralize(rsvp.partySize, 'spot')} {rsvp.status === 'going' ? 'held' : 'requested'} for{' '}
                {shortDate}.
                {rsvp.status === 'waitlisted' && open && ' We will move you up if a spot opens.'}
              </p>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2">
            {open ? (
              <>
                <button type="button" className="btn btn-primary w-full" onClick={onRsvp}>
                  {rsvpButtonLabel(event)}
                </button>
                {rsvp && (
                  <button type="button" className="btn btn-secondary w-full" onClick={onCancelRsvp}>
                    Cancel my RSVP
                  </button>
                )}
              </>
            ) : (
              <p className="m-0 font-bold">{closedMessage(event)}</p>
            )}
            <SaveButton event={event} variant="full" />
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-x-2">
            {state !== 'draft' && state !== 'canceled' && state !== 'past' && (
              <button type="button" className="btn btn-ghost" onClick={addToCalendar}>
                <CalendarPlus aria-hidden className="size-5" />
                Add to calendar
              </button>
            )}
            <button type="button" className="btn btn-ghost" onClick={copyLink}>
              <Link2 aria-hidden className="size-5" />
              Copy link
            </button>
          </div>
        </div>
        <TearTabs
          count={8}
          spotsLeft={open ? event.spotsLeft : 0}
          capacity={event.capacity}
          text={shortDate.replace(',', '')}
        />
      </div>
    </aside>
  )
}
