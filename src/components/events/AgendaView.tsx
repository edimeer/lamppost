import { useTimeZone } from '../../context/timeZone'
import type { EventDetails } from '../../data/types'
import { formatLongDate } from '../../lib/format'
import { toWallClock } from '../../lib/time'
import { EventRow } from './EventRow'

export function AgendaView({ events }: { events: EventDetails[] }) {
  const { timeZone } = useTimeZone()

  const days = new Map<string, EventDetails[]>()
  for (const event of events) {
    const day = toWallClock(event.startsAt, timeZone).date
    days.set(day, [...(days.get(day) ?? []), event])
  }

  return (
    <div className="flex flex-col gap-5">
      {[...days.entries()].map(([day, dayEvents]) => (
        <section key={day} className="sheet overflow-hidden" aria-label={formatLongDate(dayEvents[0].startsAt, timeZone)}>
          <h3 className="m-0 bg-stock-butter px-4 py-2 text-xl">
            {formatLongDate(dayEvents[0].startsAt, timeZone)}
          </h3>
          <ul className="m-0 list-none p-0">
            {dayEvents.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
