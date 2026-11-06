import { Plus } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { CATEGORY_STOCK } from '../components/events/categoryStyle'
import { StatusStamp } from '../components/events/StatusStamp'
import { TearTabs } from '../components/events/TearTabs'
import { EmptyState, ErrorState, ListSkeleton } from '../components/ui/States'
import { useTimeZone } from '../context/timeZone'
import type { EventDetails } from '../data/types'
import { useManagedEvents } from '../hooks/queries'
import { getEventState, type EventState } from '../lib/eventState'
import { formatShortDate, formatTimeRange } from '../lib/format'
import { usePageTitle } from '../lib/usePageTitle'

type Tab = 'upcoming' | 'draft' | 'past' | 'canceled' | 'all'

const TABS: { value: Tab; label: string }[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'draft', label: 'Drafts' },
  { value: 'past', label: 'Past' },
  { value: 'canceled', label: 'Canceled' },
  { value: 'all', label: 'All' },
]

function inTab(tab: Tab, state: EventState): boolean {
  if (tab === 'all') return true
  if (tab === 'draft' || tab === 'past' || tab === 'canceled') return state === tab
  return state === 'open' || state === 'limited' || state === 'full' || state === 'happening'
}

function monthAndDay(iso: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone }).formatToParts(
    new Date(iso),
  )
  return {
    month: parts.find((part) => part.type === 'month')?.value ?? '',
    day: parts.find((part) => part.type === 'day')?.value ?? '',
  }
}

function ManagedRow({ event }: { event: EventDetails }) {
  const { timeZone } = useTimeZone()
  const state = getEventState(event)
  const stock = { '--stock': CATEGORY_STOCK[event.category] } as CSSProperties
  return (
    <li
      style={stock}
      className="grid grid-cols-[4.75rem_minmax(0,1fr)] border-t-2 border-dashed border-ink/30 bg-(--stock) text-ink first:border-t-0"
    >
      <p className="m-0 flex flex-col items-center justify-center border-r-2 border-dashed border-ink/30 px-1 py-3 text-center leading-tight">
        <span className="text-[0.9375rem] font-bold">{monthAndDay(event.startsAt, timeZone).month}</span>
        <span className="font-display text-[2rem]">{monthAndDay(event.startsAt, timeZone).day}</span>
      </p>
      <div className="flex min-w-0 flex-col gap-3 p-4 md:flex-row md:items-center">
        <div className="min-w-0 flex-1">
          <h2 className="m-0 text-[1.375rem] [overflow-wrap:anywhere]">
            <Link to={`/organize/${event.id}`} className="underline-offset-2 hover:underline">
              {event.title}
            </Link>
          </h2>
          <p className="m-0 text-[0.9375rem]">
            {formatShortDate(event.startsAt, timeZone)},{' '}
            {formatTimeRange(event.startsAt, event.endsAt, timeZone)}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.9375rem] font-semibold">
            <TearTabs
              className="tabs-mini"
              count={10}
              spotsLeft={event.spotsLeft}
              capacity={event.capacity}
              text=""
            />
            <span>
              {event.spotsLeft.toLocaleString('en-US')} of {event.capacity.toLocaleString('en-US')} spots
              left
              {event.waitlistCount > 0 &&
                `, ${event.waitlistCount.toLocaleString('en-US')} on the waitlist`}
            </span>
          </div>
        </div>
        <StatusStamp state={state} className="self-start md:self-center" />
        <Link to={`/organize/${event.id}`} className="btn btn-primary shrink-0">
          Manage
        </Link>
      </div>
    </li>
  )
}

export function OrganizePage() {
  usePageTitle('Organize')
  const events = useManagedEvents()
  const [tab, setTab] = useState<Tab>('upcoming')
  const all = events.data ?? []
  const count = (value: Tab) => all.filter((event) => inTab(value, getEventState(event))).length
  const visible = all.filter((event) => inTab(tab, getEventState(event)))

  return (
    <div className="wrap py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 text-[2.25rem] sm:text-5xl">Your events</h1>
        <Link to="/organize/new" className="btn btn-sun">
          <Plus aria-hidden className="size-5" />
          Create event
        </Link>
      </div>

      <div role="group" aria-label="Filter your events" className="mt-5 flex flex-wrap gap-2">
        {TABS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className="paper-chip"
            style={{ '--stock': 'var(--color-stock-butter)' } as CSSProperties}
            aria-pressed={tab === value}
            onClick={() => setTab(value)}
          >
            {label} ({count(value)})
          </button>
        ))}
      </div>

      <div className="mt-4">
        {events.isPending ? (
          <ListSkeleton />
        ) : events.isError ? (
          <ErrorState error={events.error} onRetry={() => events.refetch()} />
        ) : visible.length > 0 ? (
          <ul className="m-0 flex list-none flex-col p-0 shadow-paper">
            {visible.map((event) => (
              <ManagedRow key={event.id} event={event} />
            ))}
          </ul>
        ) : (
          <EmptyState
            title={all.length === 0 ? 'Put up your first flyer' : 'Nothing here yet'}
            action={
              <Link to="/organize/new" className="btn btn-primary">
                Create event
              </Link>
            }
          >
            {all.length === 0
              ? 'Create an event and it will show up on the board once you publish it.'
              : 'Events you create will appear here as their status changes.'}
          </EmptyState>
        )}
      </div>
    </div>
  )
}
