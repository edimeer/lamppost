import type { EventDetails } from '../../data/types'
import { Flyer } from './Flyer'

export function FlyerGrid({
  events,
  headingLevel,
}: {
  events: EventDetails[]
  headingLevel?: 'h2' | 'h3'
}) {
  return (
    // Flyers keep their natural height, so the board stays uneven like a real one.
    <ul className="m-0 grid list-none items-start gap-x-6 gap-y-9 p-0 pt-2 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <li key={event.id} className="min-w-0">
          <Flyer event={event} headingLevel={headingLevel} />
        </li>
      ))}
    </ul>
  )
}
