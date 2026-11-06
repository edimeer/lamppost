import { useMemo, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { EventForm } from '../components/organizer/EventForm'
import { EmptyState, ErrorState, ListSkeleton } from '../components/ui/States'
import { useTimeZone } from '../context/timeZone'
import { useToast } from '../context/toast'
import type { EventDetails, EventInput } from '../data/types'
import { useCreateEvent, useEvent, usePublishEvent, useSession, useUpdateEvent } from '../hooks/queries'
import { isNotFound } from '../lib/errors'
import { emptyEventForm, eventToForm } from '../lib/eventForm'
import { usePageTitle } from '../lib/usePageTitle'

function Frame({ title, children }: { title: string; children: ReactNode }) {
  usePageTitle(title)
  return (
    <div className="wrap py-6">
      <h1 className="mt-0 mb-5 text-[2.25rem] sm:text-5xl">{title}</h1>
      {children}
    </div>
  )
}

function ExistingEventEditor({ id }: { id: string }) {
  const event = useEvent(id)
  const session = useSession()
  const update = useUpdateEvent()
  const publish = usePublishEvent()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const initial = useMemo(() => (event.data ? eventToForm(event.data) : null), [event.data])

  if (event.isPending || session.isPending) {
    return (
      <Frame title="Edit event">
        <ListSkeleton />
      </Frame>
    )
  }
  if (event.isError || !event.data || !initial || !session.data) {
    return (
      <Frame title="Edit event">
        {isNotFound(event.error) ? (
          <EmptyState
            title="We could not find this event"
            action={
              <Link to="/organize" className="btn btn-primary">
                Back to your events
              </Link>
            }
          />
        ) : (
          <ErrorState error={event.error ?? session.error} />
        )}
      </Frame>
    )
  }
  if (!event.data.viewer.canManage) {
    return (
      <Frame title="Edit event">
        <EmptyState
          title="Only the organizer can edit this event"
          action={
            <Link to={`/events/${id}`} className="btn btn-primary">
              View event
            </Link>
          }
        />
      </Frame>
    )
  }

  const onSave = async (input: EventInput, shouldPublish: boolean) => {
    await update.mutateAsync({ id, input })
    if (shouldPublish) await publish.mutateAsync(id)
    showToast(shouldPublish ? 'Event published.' : 'Changes saved.')
    navigate(`/organize/${id}`)
  }

  return (
    <Frame title="Edit event">
      <EventForm
        initial={initial}
        event={event.data}
        organizer={session.data.organizer}
        onSave={onSave}
        onCancel={() => navigate(`/organize/${id}`)}
      />
    </Frame>
  )
}

function NewEventEditor() {
  const { timeZone } = useTimeZone()
  const session = useSession()
  const create = useCreateEvent()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const initial = useMemo(() => emptyEventForm(timeZone), [timeZone])

  if (session.isPending) {
    return (
      <Frame title="Create an event">
        <ListSkeleton />
      </Frame>
    )
  }
  if (session.isError || !session.data) {
    return (
      <Frame title="Create an event">
        <ErrorState error={session.error} />
      </Frame>
    )
  }

  const onSave = async (input: EventInput, publish: boolean) => {
    const created: EventDetails = await create.mutateAsync({ input, publish })
    showToast(publish ? 'Event published.' : 'Draft saved.')
    navigate(`/organize/${created.id}`)
  }

  return (
    <Frame title="Create an event">
      <EventForm
        initial={initial}
        organizer={session.data.organizer}
        onSave={onSave}
        onCancel={() => navigate('/organize')}
      />
    </Frame>
  )
}

export function EventEditorPage() {
  const { id } = useParams()
  // Remount per event so the form never shows values from the previous one.
  return id ? <ExistingEventEditor key={id} id={id} /> : <NewEventEditor />
}
