import { Link } from 'react-router'
import { FlyerGrid } from '../components/events/FlyerGrid'
import { EmptyState, ErrorState, FlyerGridSkeleton } from '../components/ui/States'
import { useMyRsvpEvents, useSavedEvents } from '../hooks/queries'
import { getEventState } from '../lib/eventState'
import { usePageTitle } from '../lib/usePageTitle'

export function PlansPage() {
  usePageTitle('Your plans')
  const rsvps = useMyRsvpEvents()
  const saved = useSavedEvents()

  const isOver = (state: string) => state === 'past'
  const upcoming = (rsvps.data ?? []).filter((event) => !isOver(getEventState(event)))
  const been = (rsvps.data ?? []).filter((event) => isOver(getEventState(event)))
  const browse = (
    <Link to="/" className="btn btn-primary">
      Browse events
    </Link>
  )

  return (
    <div className="wrap py-6">
      <h1 className="m-0 text-[2.5rem] sm:text-5xl">Your plans</h1>

      <section className="mt-6" aria-labelledby="going-heading">
        <h2 id="going-heading" className="mt-0 mb-4 text-3xl">
          Your RSVPs
        </h2>
        {rsvps.isPending ? (
          <FlyerGridSkeleton count={3} />
        ) : rsvps.isError ? (
          <ErrorState error={rsvps.error} onRetry={() => rsvps.refetch()} />
        ) : upcoming.length > 0 ? (
          <FlyerGrid events={upcoming} />
        ) : (
          <EmptyState title="No RSVPs yet" action={browse}>
            RSVP to an event and it will show up here.
          </EmptyState>
        )}
      </section>

      <section className="mt-10" aria-labelledby="saved-heading">
        <h2 id="saved-heading" className="mt-0 mb-4 text-3xl">
          Saved for later
        </h2>
        {saved.isPending ? (
          <FlyerGridSkeleton count={3} />
        ) : saved.isError ? (
          <ErrorState error={saved.error} onRetry={() => saved.refetch()} />
        ) : (saved.data ?? []).length > 0 ? (
          <FlyerGrid events={saved.data ?? []} />
        ) : (
          <EmptyState title="Nothing saved yet" action={browse}>
            Use the bookmark on a flyer to keep it here while you decide.
          </EmptyState>
        )}
      </section>

      {been.length > 0 && (
        <section className="mt-10" aria-labelledby="past-heading">
          <h2 id="past-heading" className="mt-0 mb-4 text-3xl">
            Events you went to
          </h2>
          <FlyerGrid events={been} />
        </section>
      )}
    </div>
  )
}
