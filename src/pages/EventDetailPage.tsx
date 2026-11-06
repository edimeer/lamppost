import { ArrowLeft, Ban, Check, FilePenLine, Globe, Mail, Phone, Settings2 } from 'lucide-react'
import { useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { CATEGORY_STOCK } from '../components/events/categoryStyle'
import { CoverArt } from '../components/events/CoverArt'
import { RsvpDialog } from '../components/events/RsvpDialog'
import { RsvpPanel } from '../components/events/RsvpPanel'
import { StatusStamp } from '../components/events/StatusStamp'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState, ErrorState, ListSkeleton } from '../components/ui/States'
import { useTimeZone } from '../context/timeZone'
import { useToast } from '../context/toast'
import type { EventDetails } from '../data/types'
import { useCancelRsvp, useEvent, useSession } from '../hooks/queries'
import { errorMessage, isNotFound } from '../lib/errors'
import { acceptsRsvps, availabilityLabel, getEventState, rsvpButtonLabel } from '../lib/eventState'
import {
  ACCESSIBILITY_LABELS,
  CATEGORY_LABELS,
  formatLongDate,
  formatShortDate,
  formatTimeRange,
  formatVenueLine,
  formatZoneLabel,
  zoneCity,
} from '../lib/format'
import { offsetMinutes } from '../lib/time'
import { mapsUrl } from '../lib/url'
import { usePageTitle } from '../lib/usePageTitle'

function BackLink() {
  return (
    <Link to="/" className="inline-flex min-h-11 items-center gap-1.5 font-bold underline-offset-2 hover:underline">
      <ArrowLeft aria-hidden className="size-5" />
      All events
    </Link>
  )
}

function StatusBanner({ event }: { event: EventDetails }) {
  const { timeZone } = useTimeZone()
  const state = getEventState(event)

  if (state === 'canceled' && event.cancellation) {
    return (
      <div className="sheet mb-5 flex gap-3 border-l-8 border-danger p-4 text-ink">
        <Ban aria-hidden className="mt-1 size-6 shrink-0 text-danger" />
        <div className="min-w-0">
          <h2 className="m-0 text-xl">This event is canceled</h2>
          <p className="mt-1 mb-0 [overflow-wrap:anywhere]">{event.cancellation.reason}</p>
          <p className="mt-1 mb-0 text-[0.9375rem] text-ink-soft">
            Canceled on {formatShortDate(event.cancellation.canceledAt, timeZone)}
          </p>
        </div>
      </div>
    )
  }
  if (state === 'draft') {
    return (
      <div className="sheet mb-5 flex flex-wrap items-center gap-3 border-l-8 border-[#5a2ca8] p-4 text-ink">
        <FilePenLine aria-hidden className="size-6 shrink-0" />
        <p className="m-0 min-w-0 flex-1 font-semibold">
          This is a draft. Only you can see it until you publish it.
        </p>
        <Link to={`/organize/${event.id}`} className="btn btn-primary">
          Manage event
        </Link>
      </div>
    )
  }
  return null
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t-2 border-line px-5 py-5 first:border-t-0 sm:px-7">
      <h2 className="m-0 text-2xl">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  )
}

function DetailBody({ event }: { event: EventDetails }) {
  const { timeZone, openPicker } = useTimeZone()
  const start = new Date(event.startsAt)
  const differsFromVenue = offsetMinutes(start, timeZone) !== offsetMinutes(start, event.timeZone)
  const venueAddress = event.venue ? formatVenueLine(event.venue) : null
  const { features, notes } = event.accessibility
  const { organizer } = event

  return (
    <div className="sheet min-w-0 text-ink">
      <Section title="About this event">
        <p className="prose-event m-0">{event.description}</p>
      </Section>

      <Section title="When">
        <p className="m-0 font-bold">{formatLongDate(event.startsAt, timeZone)}</p>
        <p className="m-0">{formatTimeRange(event.startsAt, event.endsAt, timeZone)}</p>
        <p className="mt-1 mb-0 text-[0.9375rem] text-ink-soft">
          Shown in your time zone, {formatZoneLabel(timeZone, start)}.{' '}
          <button
            type="button"
            onClick={openPicker}
            className="-my-2 border-0 bg-transparent py-2 font-bold text-ink underline underline-offset-2"
          >
            Change
          </button>
        </p>
        {differsFromVenue && (
          <p className="mt-2 mb-0 bg-paper px-3 py-2">
            <strong>Local time for this event ({zoneCity(event.timeZone)}):</strong>{' '}
            {formatShortDate(event.startsAt, event.timeZone)},{' '}
            {formatTimeRange(event.startsAt, event.endsAt, event.timeZone)}
          </p>
        )}
      </Section>

      <Section title="Where">
        {event.venue && venueAddress && (
          <>
            <p className="m-0 font-bold [overflow-wrap:anywhere]">{event.venue.name}</p>
            <p className="m-0 [overflow-wrap:anywhere]">{venueAddress}</p>
            {event.venue.neighborhood && <p className="m-0">{event.venue.neighborhood}</p>}
            <a
              href={mapsUrl(`${event.venue.name}, ${venueAddress}`)}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-1 inline-flex min-h-11 items-center font-bold underline underline-offset-2"
            >
              Open in maps (opens in a new tab)
            </a>
          </>
        )}
        {event.onlineUrl && (
          <p className={`mb-0 min-w-0 ${event.venue ? 'mt-2' : 'mt-0'}`}>
            {event.venue ? 'You can also join online: ' : 'Online event: '}
              {event.viewer.rsvp?.status === 'going' || event.viewer.canManage ? (
                <a
                  href={event.onlineUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-bold [overflow-wrap:anywhere] underline underline-offset-2"
                >
                  {event.onlineUrl}
                </a>
              ) : (
                'the link appears here after you RSVP.'
              )}
          </p>
        )}
      </Section>

      <Section title="Accessibility">
        {features.length > 0 ? (
          <ul className="m-0 grid list-none gap-x-4 gap-y-1 p-0 sm:grid-cols-2">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-1.5">
                <Check aria-hidden className="mt-1 size-4 shrink-0" />
                {ACCESSIBILITY_LABELS[feature]}
              </li>
            ))}
          </ul>
        ) : (
          !notes && <p className="m-0">The organizer has not listed access details yet. Ask them below.</p>
        )}
        {notes && <p className="prose-event mt-2 mb-0">{notes}</p>}
      </Section>

      <Section title="Organizer">
        <p className="m-0 font-bold [overflow-wrap:anywhere]">{organizer.name}</p>
        <p className="m-0 max-w-[68ch]">{organizer.bio}</p>
        <ul className="mt-2 mb-0 flex list-none flex-col p-0">
          <li>
            <a
              href={`mailto:${organizer.contactEmail}`}
              className="inline-flex min-h-11 items-center gap-2 [overflow-wrap:anywhere] underline underline-offset-2"
            >
              <Mail aria-hidden className="size-5 shrink-0" />
              {organizer.contactEmail}
            </a>
          </li>
          {organizer.phone && (
            <li>
              <a
                href={`tel:${organizer.phone.replace(/[^+\d]/g, '')}`}
                className="inline-flex min-h-11 items-center gap-2 underline underline-offset-2"
              >
                <Phone aria-hidden className="size-5 shrink-0" />
                {organizer.phone}
              </a>
            </li>
          )}
          {organizer.website && (
            <li>
              <a
                href={organizer.website}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex min-h-11 items-center gap-2 [overflow-wrap:anywhere] underline underline-offset-2"
              >
                <Globe aria-hidden className="size-5 shrink-0" />
                {organizer.website.replace(/^https?:\/\//, '')}
              </a>
            </li>
          )}
        </ul>
      </Section>
    </div>
  )
}

export function EventDetailPage() {
  const { id = '' } = useParams()
  const eventQuery = useEvent(id)
  const session = useSession()
  const cancelRsvp = useCancelRsvp()
  const { showToast } = useToast()
  const { timeZone } = useTimeZone()
  const [rsvpOpen, setRsvpOpen] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [justReserved, setJustReserved] = useState(false)
  const event = eventQuery.data
  usePageTitle(event?.title)

  if (eventQuery.isPending) {
    return (
      <div className="wrap py-6">
        <ListSkeleton rows={3} />
      </div>
    )
  }

  if (eventQuery.isError || !event) {
    return (
      <div className="wrap py-10">
        {isNotFound(eventQuery.error) ? (
          <EmptyState
            title="We could not find this event"
            action={
              <Link to="/" className="btn btn-primary">
                Browse events
              </Link>
            }
          >
            It may have been deleted, or the link may be wrong.
          </EmptyState>
        ) : (
          <ErrorState error={eventQuery.error} onRetry={() => eventQuery.refetch()} />
        )}
      </div>
    )
  }

  const state = getEventState(event)
  const canRsvp = acceptsRsvps(state)

  return (
    <div className="wrap pt-2 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <BackLink />
        {event.viewer.canManage && event.status !== 'draft' && (
          <Link to={`/organize/${event.id}`} className="btn btn-sun">
            <Settings2 aria-hidden className="size-5" />
            Manage event
          </Link>
        )}
      </div>

      <div className="mt-2">
        <StatusBanner event={event} />
      </div>

      <header
        className={`relative grid text-ink shadow-paper md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] ${
          state === 'canceled' || state === 'past' ? 'flyer-faded' : ''
        }`}
        style={{ background: CATEGORY_STOCK[event.category] } as CSSProperties}
      >
        <div className="min-w-0 p-5 sm:p-7">
          <p className="m-0 font-bold">{CATEGORY_LABELS[event.category]}</p>
          <h1
            className={`mt-1 mb-2 hyphens-auto ${
              event.title.length > 70
                ? 'text-[1.625rem] sm:text-[2.25rem]'
                : 'text-[2.125rem] sm:text-[2.875rem]'
            }`}
          >
            {event.title}
          </h1>
          <p className="m-0 text-xl font-extrabold">{formatShortDate(event.startsAt, timeZone)}</p>
          <p className="m-0 text-lg font-semibold">
            {formatTimeRange(event.startsAt, event.endsAt, timeZone)}
          </p>
          <StatusStamp state={state} className="mt-3" />
        </div>
        <div className="flyer-art relative order-first aspect-[16/8] min-h-full overflow-hidden md:order-none md:aspect-auto">
          <CoverArt event={event} />
        </div>
      </header>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="order-2 min-w-0 lg:order-1">
          <DetailBody event={event} />
        </div>
        <div className="order-1 min-w-0 lg:order-2">
          <RsvpPanel
            event={event}
            justReserved={justReserved}
            onRsvp={() => setRsvpOpen(true)}
            onCancelRsvp={() => setConfirmCancel(true)}
          />
        </div>
      </div>

      {canRsvp && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-line bg-white px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-ink md:hidden">
          <div className="flex items-center justify-between gap-3">
            <p className="m-0 min-w-0 text-[0.9375rem] leading-snug font-bold">
              {availabilityLabel(event)}
            </p>
            <button type="button" className="btn btn-primary shrink-0" onClick={() => setRsvpOpen(true)}>
              {rsvpButtonLabel(event)}
            </button>
          </div>
        </div>
      )}

      {rsvpOpen && session.data && (
        <RsvpDialog
          event={event}
          session={session.data}
          onClose={() => setRsvpOpen(false)}
          onDone={(updated) => {
            setRsvpOpen(false)
            setJustReserved(true)
            showToast(
              updated.viewer.rsvp?.status === 'going'
                ? `Your spot is reserved for ${formatShortDate(updated.startsAt, timeZone)}.`
                : 'You joined the waitlist.',
            )
          }}
        />
      )}

      {confirmCancel && (
        <ConfirmDialog
          title="Cancel your RSVP?"
          confirmLabel="Cancel my RSVP"
          cancelLabel="Keep my spot"
          danger
          busy={cancelRsvp.isPending}
          onClose={() => setConfirmCancel(false)}
          onConfirm={() =>
            cancelRsvp.mutate(event.id, {
              onSuccess: () => {
                setConfirmCancel(false)
                setJustReserved(false)
                showToast('Your RSVP is canceled.')
              },
              onError: (error) => {
                setConfirmCancel(false)
                showToast(errorMessage(error), 'error')
              },
            })
          }
        >
          Your spot goes to the next person on the waitlist, or back to the open pool.
        </ConfirmDialog>
      )}
    </div>
  )
}
