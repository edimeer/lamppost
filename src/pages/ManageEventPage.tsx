import { ArrowLeft, Eye, Pencil } from 'lucide-react'
import { useState, type CSSProperties, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { CATEGORY_STOCK } from '../components/events/categoryStyle'
import { StatusStamp } from '../components/events/StatusStamp'
import { TearTabs } from '../components/events/TearTabs'
import { RsvpList } from '../components/organizer/RsvpList'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Dialog } from '../components/ui/Dialog'
import { TextAreaField, TextField } from '../components/ui/Field'
import { EmptyState, ErrorState, ListSkeleton } from '../components/ui/States'
import { useTimeZone } from '../context/timeZone'
import { useToast } from '../context/toast'
import type { EventDetails } from '../data/types'
import {
  useCancelEvent,
  useDeleteEvent,
  useEvent,
  usePublishEvent,
  useReopenEvent,
  useUnpublishEvent,
  useUpdateCapacity,
} from '../hooks/queries'
import { errorMessage, isNotFound } from '../lib/errors'
import { getEventState } from '../lib/eventState'
import { formatLongDate, formatShortDate, formatTimeRange, pluralize } from '../lib/format'
import { usePageTitle } from '../lib/usePageTitle'
import { LIMITS } from '../lib/validation'

function CancelEventDialog({ event, onClose }: { event: EventDetails; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string>()
  const cancelEvent = useCancelEvent()
  const { showToast } = useToast()

  const onSubmit = (formEvent: FormEvent) => {
    formEvent.preventDefault()
    if (!reason.trim()) {
      setError('Tell people why the event is canceled.')
      return
    }
    cancelEvent.mutate(
      { id: event.id, reason },
      {
        onSuccess: () => {
          showToast('Event canceled.')
          onClose()
        },
        onError: (failure) => setError(errorMessage(failure)),
      },
    )
  }

  return (
    <Dialog title="Cancel this event?" onClose={onClose}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <p className="m-0">
          The flyer stays up with a Canceled stamp and your note, so the{' '}
          {pluralize(event.goingCount, 'person', 'people')} who RSVPed can see what happened.
        </p>
        <TextAreaField
          label="What should people know?"
          required
          rows={4}
          value={reason}
          error={error}
          hint="Say why, and whether a new date or refund is coming."
          onChange={(changed) => {
            setReason(changed.target.value)
            setError(undefined)
          }}
        />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Keep event
          </button>
          <button type="submit" className="btn btn-danger-solid" disabled={cancelEvent.isPending}>
            Cancel event
          </button>
        </div>
      </form>
    </Dialog>
  )
}

function CapacityEditor({ event }: { event: EventDetails }) {
  const [value, setValue] = useState(String(event.capacity))
  const [error, setError] = useState<string>()
  const update = useUpdateCapacity()
  const { showToast } = useToast()

  const onSubmit = (formEvent: FormEvent) => {
    formEvent.preventDefault()
    const capacity = Number(value)
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > LIMITS.capacity) {
      setError(`Enter a whole number from 1 to ${LIMITS.capacity.toLocaleString('en-US')}.`)
      return
    }
    update.mutate(
      { id: event.id, capacity },
      {
        onSuccess: (updated) =>
          showToast(
            updated.waitlistCount < event.waitlistCount
              ? 'Capacity updated. People moved up from the waitlist.'
              : 'Capacity updated.',
          ),
        onError: (failure) => setError(errorMessage(failure)),
      },
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <TextField
          label="Capacity"
          required
          type="number"
          inputMode="numeric"
          min={Math.max(1, event.goingCount)}
          value={value}
          error={error}
          onChange={(changed) => {
            setValue(changed.target.value)
            setError(undefined)
          }}
        />
      </div>
      <button
        type="submit"
        className="btn btn-primary mt-[1.9rem]"
        disabled={update.isPending || value === String(event.capacity)}
      >
        Update
      </button>
    </form>
  )
}

/** The event's capacity as a flyer: tabs still attached are the spots still open. */
function CapacityFlyer({ event }: { event: EventDetails }) {
  const { timeZone } = useTimeZone()
  const details = [
    `${pluralize(event.spotsLeft, 'spot')} left`,
    event.waitlistCount > 0 ? `${event.waitlistCount.toLocaleString('en-US')} on the waitlist` : '',
  ].filter(Boolean)

  return (
    <section
      aria-label="Capacity"
      className="flyer mt-7"
      style={{ '--stock': CATEGORY_STOCK[event.category] } as CSSProperties}
    >
      <div className="flyer-sheet grid items-center gap-4 p-5 md:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0">
          <h2 className="m-0 text-[2rem] sm:text-[2.5rem]">
            {event.goingCount.toLocaleString('en-US')} of {event.capacity.toLocaleString('en-US')} spots
            taken
          </h2>
          <p className="mt-1 mb-0 text-lg font-semibold">{details.join(', ')}</p>
        </div>
        <CapacityEditor key={event.capacity} event={event} />
      </div>
      <TearTabs
        count={16}
        spotsLeft={event.spotsLeft}
        capacity={event.capacity}
        text={formatShortDate(event.startsAt, timeZone).replace(',', '')}
      />
    </section>
  )
}

type PendingDialog = 'cancel' | 'delete' | 'unpublish' | null

function Actions({ event }: { event: EventDetails }) {
  const [dialog, setDialog] = useState<PendingDialog>(null)
  const publish = usePublishEvent()
  const unpublish = useUnpublishEvent()
  const reopen = useReopenEvent()
  const remove = useDeleteEvent()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const onError = (error: unknown) => showToast(errorMessage(error), 'error')

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <Link to={`/organize/${event.id}/edit`} className="btn btn-secondary">
        <Pencil aria-hidden className="size-5" />
        Edit details
      </Link>
      <Link to={`/events/${event.id}`} className="btn btn-secondary">
        <Eye aria-hidden className="size-5" />
        {event.status === 'draft' ? 'Preview page' : 'View public page'}
      </Link>
      {event.status === 'draft' && (
        <button
          type="button"
          className="btn btn-sun"
          disabled={publish.isPending}
          onClick={() =>
            publish.mutate(event.id, { onSuccess: () => showToast('Event published.'), onError })
          }
        >
          Publish event
        </button>
      )}
      {event.status === 'published' && (
        <>
          <button type="button" className="btn btn-secondary" onClick={() => setDialog('unpublish')}>
            Move back to draft
          </button>
          <button type="button" className="btn btn-danger" onClick={() => setDialog('cancel')}>
            Cancel event
          </button>
        </>
      )}
      {event.status === 'canceled' && (
        <button
          type="button"
          className="btn btn-sun"
          disabled={reopen.isPending}
          onClick={() =>
            reopen.mutate(event.id, {
              onSuccess: () => showToast('Event reopened. RSVPs kept their places.'),
              onError,
            })
          }
        >
          Reopen event
        </button>
      )}
      <button type="button" className="btn btn-danger" onClick={() => setDialog('delete')}>
        Delete event
      </button>

      {dialog === 'cancel' && <CancelEventDialog event={event} onClose={() => setDialog(null)} />}

      {dialog === 'unpublish' && (
        <ConfirmDialog
          title="Move back to draft?"
          confirmLabel="Move to draft"
          cancelLabel="Keep published"
          busy={unpublish.isPending}
          onClose={() => setDialog(null)}
          onConfirm={() =>
            unpublish.mutate(event.id, {
              onSuccess: () => {
                setDialog(null)
                showToast('Moved back to draft.')
              },
              onError: (error) => {
                setDialog(null)
                onError(error)
              },
            })
          }
        >
          The flyer comes off the board until you publish it again. Events with RSVPs must be
          canceled instead.
        </ConfirmDialog>
      )}

      {dialog === 'delete' && (
        <ConfirmDialog
          title="Delete this event?"
          confirmLabel="Delete event"
          danger
          busy={remove.isPending}
          onClose={() => setDialog(null)}
          onConfirm={() =>
            remove.mutate(event.id, {
              onSuccess: () => {
                showToast('Event deleted.')
                navigate('/organize')
              },
              onError: (error) => {
                setDialog(null)
                onError(error)
              },
            })
          }
        >
          {event.goingCount + event.waitlistCount > 0
            ? `This also removes the RSVP list of ${pluralize(event.goingCount + event.waitlistCount, 'person', 'people')}. `
            : ''}
          You cannot undo this.
          {event.status === 'published' && ' To tell attendees what happened, cancel it instead.'}
        </ConfirmDialog>
      )}
    </div>
  )
}

export function ManageEventPage() {
  const { id = '' } = useParams()
  const eventQuery = useEvent(id)
  const { timeZone } = useTimeZone()
  const event = eventQuery.data
  usePageTitle(event ? `Manage ${event.title}` : 'Manage event')

  const back = (
    <Link to="/organize" className="inline-flex min-h-11 items-center gap-1.5 font-bold underline-offset-2 hover:underline">
      <ArrowLeft aria-hidden className="size-5" />
      Your events
    </Link>
  )

  if (eventQuery.isPending) {
    return (
      <div className="wrap py-6">
        <ListSkeleton />
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
              <Link to="/organize" className="btn btn-primary">
                Back to your events
              </Link>
            }
          />
        ) : (
          <ErrorState error={eventQuery.error} onRetry={() => eventQuery.refetch()} />
        )}
      </div>
    )
  }
  if (!event.viewer.canManage) {
    return (
      <div className="wrap py-10">
        <EmptyState
          title="Only the organizer can manage this event"
          action={
            <Link to={`/events/${id}`} className="btn btn-primary">
              View event
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="wrap pt-2 pb-10">
      {back}
      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="m-0 text-[2.125rem] sm:text-[2.75rem]">{event.title}</h1>
          <p className="mt-1 mb-0 font-semibold">
            {formatLongDate(event.startsAt, timeZone)},{' '}
            {formatTimeRange(event.startsAt, event.endsAt, timeZone)}
          </p>
        </div>
        <StatusStamp state={getEventState(event)} />
      </div>

      {event.cancellation && (
        <p className="sheet mt-4 mb-0 border-l-8 border-danger p-4 [overflow-wrap:anywhere]">
          <strong>Your cancellation note:</strong> {event.cancellation.reason}
        </p>
      )}

      <Actions event={event} />

      <CapacityFlyer event={event} />

      <RsvpList event={event} />
    </div>
  )
}
