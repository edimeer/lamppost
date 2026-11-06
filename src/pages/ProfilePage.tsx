import { useState, type FormEvent } from 'react'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { TextAreaField, TextField } from '../components/ui/Field'
import { ErrorState, ListSkeleton } from '../components/ui/States'
import { useTimeZone } from '../context/timeZone'
import { useToast } from '../context/toast'
import type { Session } from '../data/types'
import { useResetDemoData, useSession, useUpdateProfile } from '../hooks/queries'
import { errorMessage } from '../lib/errors'
import { formatZoneLabel } from '../lib/format'
import { usePageTitle } from '../lib/usePageTitle'
import { validateProfileForm, type ProfileFormErrors, type ProfileFormValues } from '../lib/validation'

function toForm({ attendee, organizer }: Session): ProfileFormValues {
  return {
    attendeeName: attendee.name,
    attendeeEmail: attendee.email,
    organizerName: organizer.name,
    organizerEmail: organizer.contactEmail,
    organizerPhone: organizer.phone ?? '',
    organizerWebsite: organizer.website ?? '',
    organizerBio: organizer.bio,
  }
}

function ProfileForm({ session }: { session: Session }) {
  const [values, setValues] = useState(() => toForm(session))
  const [errors, setErrors] = useState<ProfileFormErrors>({})
  const update = useUpdateProfile()
  const { showToast } = useToast()

  const bind = (field: keyof ProfileFormValues) => ({
    value: values[field],
    error: errors[field],
    onChange: (changed: { target: { value: string } }) => {
      setValues((current) => ({ ...current, [field]: changed.target.value }))
      setErrors((current) => ({ ...current, [field]: undefined }))
    },
  })

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const nextErrors = validateProfileForm(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    update.mutate(
      {
        ...values,
        organizerPhone: values.organizerPhone || null,
        organizerWebsite: values.organizerWebsite || null,
      },
      {
        onSuccess: () => showToast('Profile saved.'),
        onError: (error) => showToast(errorMessage(error), 'error'),
      },
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="sheet flex flex-col gap-4 p-5">
      <h2 className="m-0 text-2xl">You</h2>
      <p className="m-0 text-[0.9375rem] text-ink-soft">Filled in for you when you RSVP.</p>
      <TextField {...bind('attendeeName')} label="Your name" required autoComplete="name" />
      <TextField {...bind('attendeeEmail')} label="Email" type="email" required autoComplete="email" />

      <h2 className="mt-3 mb-0 text-2xl">Your organizer profile</h2>
      <p className="m-0 text-[0.9375rem] text-ink-soft">Shown on every event you run.</p>
      <TextField {...bind('organizerName')} label="Organizer name" required />
      <TextField {...bind('organizerEmail')} label="Contact email" type="email" required />
      <TextField {...bind('organizerPhone')} label="Phone" type="tel" />
      <TextField {...bind('organizerWebsite')} label="Website" type="url" placeholder="https://" />
      <TextAreaField {...bind('organizerBio')} label="About your group" rows={3} />

      <div>
        <button type="submit" className="btn btn-primary" disabled={update.isPending}>
          Save profile
        </button>
      </div>
    </form>
  )
}

export function ProfilePage() {
  usePageTitle('Profile')
  const session = useSession()
  const reset = useResetDemoData()
  const { timeZone, openPicker } = useTimeZone()
  const { showToast } = useToast()
  const [confirmReset, setConfirmReset] = useState(false)
  // Bumped after a reset so the form reloads the sample profile.
  const [formVersion, setFormVersion] = useState(0)

  return (
    <div className="wrap py-6">
      <h1 className="mt-0 mb-5 text-[2.25rem] sm:text-5xl">Profile</h1>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {session.isPending ? (
          <ListSkeleton />
        ) : session.isError || !session.data ? (
          <ErrorState error={session.error} onRetry={() => session.refetch()} />
        ) : (
          <ProfileForm key={formVersion} session={session.data} />
        )}

        <div className="flex flex-col gap-4">
          <section className="sheet p-5" aria-labelledby="zone-heading">
            <h2 id="zone-heading" className="m-0 text-2xl">
              Time zone
            </h2>
            <p className="mt-1 mb-3">{formatZoneLabel(timeZone)}</p>
            <button type="button" className="btn btn-secondary" onClick={openPicker}>
              Change time zone
            </button>
          </section>

          <section className="sheet p-5" aria-labelledby="reset-heading">
            <h2 id="reset-heading" className="m-0 text-2xl">
              Sample data
            </h2>
            <p className="mt-1 mb-3">
              Clear your changes and reload the sample events with fresh dates.
            </p>
            <button type="button" className="btn btn-danger" onClick={() => setConfirmReset(true)}>
              Reset sample data
            </button>
          </section>
        </div>
      </div>

      {confirmReset && (
        <ConfirmDialog
          title="Reset sample data?"
          confirmLabel="Reset data"
          danger
          busy={reset.isPending}
          onClose={() => setConfirmReset(false)}
          onConfirm={() =>
            reset.mutate(undefined, {
              onSuccess: () => {
                setConfirmReset(false)
                setFormVersion((version) => version + 1)
                showToast('Sample data restored.')
              },
              onError: (error) => {
                setConfirmReset(false)
                showToast(errorMessage(error), 'error')
              },
            })
          }
        >
          Events you created, your RSVPs and your saved list on this browser will be erased. You
          cannot undo this.
        </ConfirmDialog>
      )}
    </div>
  )
}
