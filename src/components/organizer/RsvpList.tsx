import { Download, UserPlus } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { useToast } from '../../context/toast'
import { useTimeZone } from '../../context/timeZone'
import type { EventDetails, RsvpWithAttendee } from '../../data/types'
import { useAddGuest, useEventRsvps, usePromoteRsvp, useRemoveRsvp } from '../../hooks/queries'
import { rsvpsToCsv } from '../../lib/csv'
import { downloadFile, slugify } from '../../lib/download'
import { errorMessage } from '../../lib/errors'
import { formatShortDate, pluralize } from '../../lib/format'
import { LIMITS, validateRsvpForm, type RsvpFormErrors } from '../../lib/validation'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { Dialog } from '../ui/Dialog'
import { SelectField, TextField } from '../ui/Field'
import { ErrorState, ListSkeleton } from '../ui/States'

function AddGuestDialog({ event, onClose }: { event: EventDetails; onClose: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [partySize, setPartySize] = useState('1')
  const [errors, setErrors] = useState<RsvpFormErrors>({})
  const addGuest = useAddGuest()
  const { showToast } = useToast()

  const onSubmit = (formEvent: FormEvent) => {
    formEvent.preventDefault()
    const nextErrors = validateRsvpForm({ name, email, partySize })
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    addGuest.mutate(
      { eventId: event.id, input: { name, email, partySize: Number(partySize) } },
      {
        onSuccess: () => {
          showToast(`${name.trim()} added to the list.`)
          onClose()
        },
      },
    )
  }

  return (
    <Dialog title="Add a guest" onClose={onClose}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <p className="m-0">
          For people who signed up by phone or in person. If the event is full they join the
          waitlist.
        </p>
        <TextField label="Name" required value={name} error={errors.name} onChange={(e) => setName(e.target.value)} />
        <TextField
          label="Email"
          type="email"
          required
          value={email}
          error={errors.email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <SelectField
          label="Party size"
          required
          value={partySize}
          error={errors.partySize}
          onChange={(e) => setPartySize(e.target.value)}
        >
          {Array.from({ length: LIMITS.partySize }, (_, index) => (
            <option key={index + 1} value={index + 1}>
              {index + 1}
            </option>
          ))}
        </SelectField>
        {addGuest.isError && (
          <p role="alert" className="m-0 font-bold text-danger">
            {errorMessage(addGuest.error)}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Go back
          </button>
          <button type="submit" className="btn btn-primary" disabled={addGuest.isPending}>
            Add guest
          </button>
        </div>
      </form>
    </Dialog>
  )
}

interface RowProps {
  rsvp: RsvpWithAttendee
  onRemove: () => void
  onPromote?: () => void
  promoteDisabled: boolean
}

function RsvpRow({ rsvp, onRemove, onPromote, promoteDisabled }: RowProps) {
  const { timeZone } = useTimeZone()
  return (
    <li className="flex flex-col gap-2 border-t-2 border-line px-4 py-3 first:border-t-0 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="m-0 font-bold [overflow-wrap:anywhere]">{rsvp.attendee.name}</p>
        <p className="m-0 text-[0.9375rem] [overflow-wrap:anywhere]">
          <a href={`mailto:${rsvp.attendee.email}`} className="underline underline-offset-2">
            {rsvp.attendee.email}
          </a>
        </p>
      </div>
      <p className="m-0 text-[0.9375rem] sm:w-56">
        {pluralize(rsvp.partySize, 'spot')}, joined {formatShortDate(rsvp.createdAt, timeZone)}
      </p>
      <div className="flex gap-2">
        {onPromote && (
          <button
            type="button"
            className="btn btn-primary"
            disabled={promoteDisabled}
            onClick={onPromote}
            aria-label={`Give ${rsvp.attendee.name} a spot`}
          >
            Give a spot
          </button>
        )}
        <button
          type="button"
          className="btn btn-danger"
          onClick={onRemove}
          aria-label={`Remove ${rsvp.attendee.name}`}
        >
          Remove
        </button>
      </div>
    </li>
  )
}

export function RsvpList({ event }: { event: EventDetails }) {
  const rsvps = useEventRsvps(event.id)
  const remove = useRemoveRsvp()
  const promote = usePromoteRsvp()
  const { showToast } = useToast()
  const [filter, setFilter] = useState('')
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<RsvpWithAttendee | null>(null)

  const list = useMemo(() => rsvps.data ?? [], [rsvps.data])
  const visible = useMemo(() => {
    const term = filter.trim().toLowerCase()
    if (!term) return list
    return list.filter((rsvp) => `${rsvp.attendee.name} ${rsvp.attendee.email}`.toLowerCase().includes(term))
  }, [list, filter])
  const going = visible.filter((rsvp) => rsvp.status === 'going')
  const waiting = visible.filter((rsvp) => rsvp.status === 'waitlisted')

  const exportCsv = () => {
    downloadFile(`${slugify(event.title)}-rsvps.csv`, rsvpsToCsv(list), 'text/csv;charset=utf-8')
    showToast('RSVP list downloaded.')
  }

  const giveSpot = (rsvp: RsvpWithAttendee) =>
    promote.mutate(rsvp.id, {
      onSuccess: () => showToast(`${rsvp.attendee.name} has a spot.`),
      onError: (error) => showToast(errorMessage(error), 'error'),
    })

  const canAdd = event.status === 'published'

  return (
    <section aria-labelledby="rsvp-list-heading" className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="rsvp-list-heading" className="m-0 text-3xl">
          RSVP list
        </h2>
        <div className="flex flex-wrap gap-2">
          {canAdd && (
            <button type="button" className="btn btn-sun" onClick={() => setAdding(true)}>
              <UserPlus aria-hidden className="size-5" />
              Add a guest
            </button>
          )}
          <button type="button" className="btn btn-secondary" disabled={list.length === 0} onClick={exportCsv}>
            <Download aria-hidden className="size-5" />
            Download CSV
          </button>
        </div>
      </div>

      {rsvps.isPending ? (
        <div className="mt-4">
          <ListSkeleton />
        </div>
      ) : rsvps.isError ? (
        <div className="mt-4">
          <ErrorState error={rsvps.error} onRetry={() => rsvps.refetch()} />
        </div>
      ) : list.length === 0 ? (
        <p className="sheet mt-4 mb-0 p-5">
          {canAdd
            ? 'No RSVPs yet. They will appear here as people sign up.'
            : 'People can RSVP once the event is published.'}
        </p>
      ) : (
        <>
          <div className="mt-4 max-w-md">
            <TextField
              label="Find a guest"
              required
              type="search"
              value={filter}
              onChange={(changed) => setFilter(changed.target.value)}
            />
          </div>

          <h3 className="mt-5 mb-2 text-2xl">Going ({going.length})</h3>
          {going.length > 0 ? (
            <ul className="sheet m-0 list-none p-0">
              {going.map((rsvp) => (
                <RsvpRow
                  key={rsvp.id}
                  rsvp={rsvp}
                  promoteDisabled={false}
                  onRemove={() => setRemoving(rsvp)}
                />
              ))}
            </ul>
          ) : (
            <p className="m-0">No one matches.</p>
          )}

          {(waiting.length > 0 || event.waitlistCount > 0) && (
            <>
              <h3 className="mt-5 mb-1 text-2xl">Waitlist ({waiting.length})</h3>
              <p className="mt-0 mb-2 text-[0.9375rem]">
                People move up automatically, in order, when a spot opens or you raise capacity.
              </p>
              {waiting.length > 0 ? (
                <ul className="sheet m-0 list-none p-0">
                  {waiting.map((rsvp) => (
                    <RsvpRow
                      key={rsvp.id}
                      rsvp={rsvp}
                      promoteDisabled={promote.isPending}
                      onPromote={() => giveSpot(rsvp)}
                      onRemove={() => setRemoving(rsvp)}
                    />
                  ))}
                </ul>
              ) : (
                <p className="m-0">No one matches.</p>
              )}
            </>
          )}
        </>
      )}

      {adding && <AddGuestDialog event={event} onClose={() => setAdding(false)} />}

      {removing && (
        <ConfirmDialog
          title={`Remove ${removing.attendee.name}?`}
          confirmLabel="Remove from list"
          danger
          busy={remove.isPending}
          onClose={() => setRemoving(null)}
          onConfirm={() =>
            remove.mutate(removing.id, {
              onSuccess: () => {
                showToast(`${removing.attendee.name} removed.`)
                setRemoving(null)
              },
              onError: (error) => {
                showToast(errorMessage(error), 'error')
                setRemoving(null)
              },
            })
          }
        >
          {removing.status === 'going'
            ? `This frees ${pluralize(removing.partySize, 'spot')} and moves the waitlist up if anyone fits.`
            : 'They will leave the waitlist.'}
        </ConfirmDialog>
      )}
    </section>
  )
}
