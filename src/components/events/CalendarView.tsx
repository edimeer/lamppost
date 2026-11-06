import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useTimeZone } from '../../context/timeZone'
import type { EventDetails } from '../../data/types'
import { calendarDays, shiftMonth } from '../../lib/filters'
import { formatLongDate, pluralize } from '../../lib/format'
import { addDays, startOfDay, toWallClock } from '../../lib/time'
import { EmptyState } from '../ui/States'
import { CATEGORY_STOCK } from './categoryStyle'
import { EventRow } from './EventRow'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface CalendarViewProps {
  month: string
  events: EventDetails[]
  isLoading: boolean
  onMonthChange: (month: string) => void
}

function monthLabel(month: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${month}-15T12:00:00Z`),
  )
}

export function CalendarView({ month, events, isLoading, onMonthChange }: CalendarViewProps) {
  const { timeZone } = useTimeZone()
  const [now] = useState(() => new Date())
  const today = toWallClock(now, timeZone).date
  const days = useMemo(() => calendarDays(month), [month])
  const [selected, setSelected] = useState(today)
  const gridRef = useRef<HTMLTableElement>(null)
  const dayToFocus = useRef<string | null>(null)

  // Runs after every render because a move can also change the month shown.
  useEffect(() => {
    if (!dayToFocus.current) return
    const button = gridRef.current?.querySelector<HTMLButtonElement>(
      `[data-day="${dayToFocus.current}"]`,
    )
    if (button) {
      button.focus()
      dayToFocus.current = null
    }
  })

  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventDetails[]>()
    for (const event of events) {
      const day = toWallClock(event.startsAt, timeZone).date
      map.set(day, [...(map.get(day) ?? []), event])
    }
    return map
  }, [events, timeZone])

  // Keep the selected day on this page of the calendar.
  const activeDay = days.includes(selected)
    ? selected
    : (days.find((day) => day.startsWith(month) && eventsByDay.has(day)) ?? `${month}-01`)
  const dayEvents = eventsByDay.get(activeDay) ?? []
  const dayLabel = formatLongDate(startOfDay(activeDay, timeZone).toISOString(), timeZone)

  const weeks = useMemo(() => {
    const rows: string[][] = []
    for (let index = 0; index < days.length; index += 7) rows.push(days.slice(index, index + 7))
    return rows
  }, [days])

  /** Arrow keys move between days, so the month is one stop on the Tab order. */
  const onDayKeyDown = (keyEvent: KeyboardEvent<HTMLButtonElement>) => {
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    const move = moves[keyEvent.key]
    if (!move) return
    keyEvent.preventDefault()
    const next = addDays(activeDay, move)
    dayToFocus.current = next
    setSelected(next)
    if (!days.includes(next)) onMonthChange(next.slice(0, 7))
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="sheet min-w-0 overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <button
            type="button"
            className="btn btn-secondary px-2.5"
            aria-label={`Previous month, ${monthLabel(shiftMonth(month, -1))}`}
            onClick={() => onMonthChange(shiftMonth(month, -1))}
          >
            <ChevronLeft aria-hidden className="size-5" />
          </button>
          <h3 className="m-0 text-center text-2xl" aria-live="polite">
            {monthLabel(month)}
          </h3>
          <button
            type="button"
            className="btn btn-secondary px-2.5"
            aria-label={`Next month, ${monthLabel(shiftMonth(month, 1))}`}
            onClick={() => onMonthChange(shiftMonth(month, 1))}
          >
            <ChevronRight aria-hidden className="size-5" />
          </button>
        </div>

        <table
          ref={gridRef}
          aria-label={`${monthLabel(month)} calendar`}
          aria-busy={isLoading}
          className="w-full table-fixed border-collapse bg-line"
        >
          <thead>
            <tr>
              {WEEKDAYS.map((weekday) => (
                <th
                  key={weekday}
                  scope="col"
                  aria-label={weekday}
                  className="bg-paper py-1 text-[0.9375rem] font-bold"
                >
                  <span className="sm:hidden">{weekday[0]}</span>
                  <span className="hidden sm:inline">{weekday.slice(0, 3)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week[0]}>
                {week.map((day) => {
                  const list = eventsByDay.get(day) ?? []
                  const label = `${formatLongDate(startOfDay(day, timeZone).toISOString(), timeZone)}, ${
                    list.length ? pluralize(list.length, 'event') : 'no events'
                  }`
                  return (
                    <td key={day} className="h-px border border-line p-0 align-top">
                      <button
                        type="button"
                        data-day={day}
                        data-outside={!day.startsWith(month)}
                        aria-pressed={day === activeDay}
                        aria-label={label}
                        aria-current={day === today ? 'date' : undefined}
                        tabIndex={day === activeDay ? 0 : -1}
                        onClick={() => setSelected(day)}
                        onKeyDown={onDayKeyDown}
                        className="calendar-cell"
                      >
                        <span
                          className={`grid size-7 place-items-center rounded-full text-[0.9375rem] font-bold ${
                            day === today ? 'bg-ink text-white' : ''
                          }`}
                        >
                          {Number(day.slice(8))}
                        </span>
                        {list.length > 0 && (
                          <span className="mt-auto pl-1 text-sm font-bold lg:hidden">{list.length}</span>
                        )}
                        <span className="mt-0.5 hidden flex-col gap-0.5 lg:flex">
                          {list.slice(0, 3).map((event) => (
                            <span
                              key={event.id}
                              className={`truncate rounded-sm border border-ink/25 px-1 text-[0.8125rem] leading-snug ${
                                event.status === 'canceled' ? 'line-through' : ''
                              }`}
                              style={{ background: CATEGORY_STOCK[event.category] }}
                            >
                              {event.title}
                            </span>
                          ))}
                          {list.length > 3 && (
                            <span className="text-[0.8125rem] font-bold">{list.length - 3} more</span>
                          )}
                        </span>
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section aria-live="polite" aria-label={`Events on ${dayLabel}`} className="min-w-0">
        <h3 className="mt-0 mb-2 text-xl text-white">{dayLabel}</h3>
        {dayEvents.length > 0 ? (
          <ul className="sheet m-0 list-none overflow-hidden p-0">
            {dayEvents.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </ul>
        ) : (
          <EmptyState title="Nothing on this day">Pick another day, or change your filters.</EmptyState>
        )}
      </section>
    </div>
  )
}
