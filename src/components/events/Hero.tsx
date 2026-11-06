import { Search, X } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { useTimeZone } from '../../context/timeZone'
import type { EventDetails } from '../../data/types'
import { formatShortDate } from '../../lib/format'

/** Every tab on the hero flyer is a real upcoming event. */
function NextUpTabs({ events }: { events: EventDetails[] }) {
  const { timeZone } = useTimeZone()
  return (
    <ul className="hero-tabs" aria-label="Next up">
      {events.map((event, index) => {
        const date = formatShortDate(event.startsAt, timeZone).replace(',', '')
        return (
          <li key={event.id}>
            <Link
              to={`/events/${event.id}`}
              aria-label={`${date}: ${event.title}`}
              title={event.title}
              className="hero-tab"
              style={{ '--index': index } as CSSProperties}
            >
              <span className="hero-tab-line text-[0.8125rem] font-extrabold">{date}</span>
              <span className="hero-tab-line hero-tab-title font-display text-[1.0625rem]">
                {event.title}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

interface HeroProps {
  search: string
  onSearch: (value: string) => void
  upcoming: EventDetails[]
}

export function Hero({ search, onSearch, upcoming }: HeroProps) {
  const [text, setText] = useState(search)
  const lastSent = useRef(search)

  // The URL can change without typing (Clear filters, the back button).
  useEffect(() => {
    if (search !== lastSent.current) {
      lastSent.current = search
      setText(search)
    }
  }, [search])

  // Wait for a pause in typing before updating the results.
  useEffect(() => {
    if (text === lastSent.current) return
    const timer = window.setTimeout(() => {
      lastSent.current = text
      onSearch(text)
    }, 220)
    return () => window.clearTimeout(timer)
  }, [text, onSearch])

  return (
    <section className="wrap pt-6 pb-2 md:pt-8">
      <div className="hero-flyer">
        <div className="hero-sheet">
          <h1 className="m-0 text-[2.75rem] leading-none sm:text-[3.75rem] lg:text-[4.75rem]">
            What's on around here?
          </h1>
          <div className="mt-3 grid items-center gap-x-8 gap-y-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <p className="m-0 hidden text-[1.1875rem] leading-snug text-balance sm:block">
              Flyers from neighbors, clubs and community groups, all on one board.
            </p>
            <div role="search" className="relative">
              <label htmlFor="event-search" className="sr-only">
                Search by name, description, organizer or location
              </label>
              <Search aria-hidden className="absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ink" />
              <input
                id="event-search"
                type="search"
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Search events and places"
                className="input h-13 border-ink pr-12 pl-10 [&::-webkit-search-cancel-button]:hidden"
              />
              {text && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setText('')}
                  className="absolute top-1/2 right-1 grid size-11 -translate-y-1/2 place-items-center rounded-lg border-0 bg-transparent text-ink hover:bg-paper"
                >
                  <X aria-hidden className="size-5" />
                </button>
              )}
            </div>
          </div>
        </div>
        <NextUpTabs events={upcoming} />
      </div>
    </section>
  )
}
