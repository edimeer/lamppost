import { useState, type FormEvent } from 'react'
import type { EventDetails, Session } from '../../data/types'
import { useSubmitRsvp } from '../../hooks/queries'
import { errorMessage } from '../../lib/errors'
import { pluralize } from '../../lib/format'
import { LIMITS, validateRsvpForm, type RsvpFormErrors } from '../../lib/validation'
import { Dialog } from '../ui/Dialog'
import { SelectField, TextField } from '../ui/Field'

interface RsvpDialogProps {
  event: EventDetails
  session: Session
  onClose: () => void
  onDone: (outcome: EventDetails) => void
}

export function RsvpDialog({ event, session, onClose, onDone }: RsvpDialogProps) {
  const current = event.viewer.rsvp
  const [name, setName] = useState(session.attendee.name)
  const [email, setEmail] = useState(session.attendee.email)
  const [partySize, setPartySize] = useState(String(current?.partySize ?? 1))
  const [errors, setErrors] = useState<RsvpFormErrors>({})
  const submit = useSubmitRsvp()

  const size = Number(partySize)
  const heldNow = current?.status === 'going' ? current.partySize : 0
  const available = event.spotsLeft + heldNow
  const fits = size <= available
  const isGoing = current?.status === 'going'

  const label = isGoing ? 'Update RSVP' : fits ? 'Reserve my spot' : 'Join the waitlist'

  const onSubmit = (formEvent: FormEvent) => {
    formEvent.preventDefault()
    const nextErrors = validateRsvpForm({ name, email, partySize })
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    submit.mutate(
      { eventId: event.id, input: { name, email, partySize: size } },
      { onSuccess: onDone },
    )
  }

  return (
    <Dialog title={isGoing ? 'Change your RSVP' : 'RSVP'} onClose={onClose}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <p className="m-0 font-semibold [overflow-wrap:anywhere]">{event.title}</p>
        <TextField
          label="Your name"
          required
          value={name}
          autoComplete="name"
          error={errors.name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
          label="Email"
          type="email"
          required
          value={email}
          autoComplete="email"
          hint="The organizer uses this to reach you about changes."
          error={errors.email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <SelectField
          label="How many people, including you?"
          required
          value={partySize}
          error={errors.partySize}
          onChange={(e) => setPartySize(e.target.value)}
        >
          {Array.from({ length: LIMITS.partySize }, (_, index) => (
            <option key={index + 1} value={index + 1}>
              {pluralize(index + 1, 'person', 'people')}
            </option>
          ))}
        </SelectField>

        {!fits && (
          <p role="status" className="m-0 bg-stock-butter px-3 py-2 font-semibold">
            {available > 0
              ? `Only ${pluralize(available, 'spot')} left. Choose a smaller party, or join the waitlist as ${pluralize(size, 'person', 'people')}.`
              : isGoing
                ? 'There is no extra room right now.'
                : 'This event is full. Join the waitlist and we will move you up if a spot opens.'}
          </p>
        )}

        {submit.isError && (
          <p role="alert" className="m-0 font-bold text-danger">
            {errorMessage(submit.error)}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Go back
          </button>
          <button type="submit" className="btn btn-primary" disabled={submit.isPending}>
            {submit.isPending ? 'Saving your RSVP' : label}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
