import { CalendarDays, LayoutGrid, List, SlidersHorizontal } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { AgendaView } from '../components/events/AgendaView'
import { CalendarView } from '../components/events/CalendarView'
import { EventFilters } from '../components/events/EventFilters'
import { FlyerGrid } from '../components/events/FlyerGrid'
import { Hero } from '../components/events/Hero'
import { Dialog } from '../components/ui/Dialog'
import { EmptyState, ErrorState, FlyerGridSkeleton, ListSkeleton } from '../components/ui/States'
import { useTimeZone } from '../context/timeZone'
import { useEvents, useLocations } from '../hooks/queries'
import { acceptsRsvps, getEventState } from '../lib/eventState'
import {
  activeFilterCount,
  currentMonth,
  DEFAULT_FILTERS,
  parseFilters,
  serializeFilters,
  toEventQuery,
  type DiscoverFilters,
  type DiscoverView,
} from '../lib/filters'
import { formatZoneLabel, pluralize } from '../lib/format'
import { usePageTitle } from '../lib/usePageTitle'

const VIEWS: { value: DiscoverView; label: string; Icon: typeof List }[] = [
  { value: 'flyers', label: 'Flyers', Icon: LayoutGrid },
  { value: 'agenda', label: 'Agenda', Icon: List },
  { value: 'calendar', label: 'Calendar', Icon: CalendarDays },
]

export function DiscoverPage() {
  usePageTitle(undefined)
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => parseFilters(params), [params])
  const { timeZone, openPicker } = useTimeZone()
  // Held still so the query, and with it the cache key, stays the same between renders.
  const [now] = useState(() => new Date())
  const [filtersOpen, setFiltersOpen] = useState(false)

  const results = useEvents(toEventQuery(filters, timeZone, now))
  const allUpcoming = useEvents({})
  const locations = useLocations()

  const update = useCallback(
    (changes: Partial<DiscoverFilters>) => {
      setParams(
        (current) => serializeFilters({ ...parseFilters(current), ...changes }),
        { replace: true, preventScrollReset: true },
      )
    },
    [setParams],
  )

  const onSearch = useCallback((search: string) => update({ search }), [update])

  const events = results.data ?? []
  const filterCount = activeFilterCount(filters)
  const canClear = filterCount > 0 || filters.search !== ''
  const clear = () => update({ ...DEFAULT_FILTERS, view: filters.view, month: filters.month })
  const month = filters.month || currentMonth(timeZone, now)
  const nextUp = (allUpcoming.data ?? [])
    .filter((event) => acceptsRsvps(getEventState(event)))
    .slice(0, 12)

  return (
    <>
      <Hero search={filters.search} onSearch={onSearch} upcoming={nextUp} />

      <section className="wrap pb-10" aria-labelledby="results-heading">
        <div className="mt-5 hidden md:block">
          <EventFilters filters={filters} locations={locations.data ?? []} onChange={update} />
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 md:mt-7">
          <div className="min-w-0">
            <h2 id="results-heading" className="m-0 text-3xl" aria-live="polite">
              {results.isPending ? 'Finding events' : pluralize(events.length, 'event')}
            </h2>
            <p className="m-0 text-[0.9375rem]">
              Times shown in {formatZoneLabel(timeZone, now)}.{' '}
              <button
                type="button"
                onClick={openPicker}
                className="-my-2 border-0 bg-transparent py-2 font-bold text-inherit underline underline-offset-2"
              >
                Change time zone
              </button>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canClear && (
              <button type="button" className="btn btn-ghost" onClick={clear}>
                Clear filters
              </button>
            )}
            <button
              type="button"
              className="btn btn-sun md:hidden"
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal aria-hidden className="size-5" />
              Filters{filterCount > 0 ? ` (${filterCount})` : ''}
            </button>
            <div role="group" aria-label="Choose a view" className="flex rounded-[10px] bg-white p-1">
              {VIEWS.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={filters.view === value}
                  aria-label={label}
                  onClick={() => update({ view: value })}
                  className={`flex min-h-10 items-center gap-1.5 rounded-lg border-0 px-3 font-bold text-ink ${
                    filters.view === value ? 'bg-ink text-white' : 'bg-transparent hover:bg-paper'
                  }`}
                >
                  <Icon aria-hidden className="size-5" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6">
          {results.isError ? (
            <ErrorState error={results.error} onRetry={() => results.refetch()} />
          ) : filters.view === 'calendar' ? (
            <CalendarView
              month={month}
              events={events}
              isLoading={results.isPending}
              onMonthChange={(next) => update({ month: next })}
            />
          ) : results.isPending ? (
            filters.view === 'agenda' ? <ListSkeleton /> : <FlyerGridSkeleton />
          ) : events.length === 0 ? (
            <EmptyState
              title="No events match"
              action={
                <button type="button" className="btn btn-primary" onClick={clear}>
                  Clear filters
                </button>
              }
            >
              Try fewer filters, a wider date range or a different search.
            </EmptyState>
          ) : filters.view === 'agenda' ? (
            <AgendaView events={events} />
          ) : (
            <FlyerGrid events={events} />
          )}
        </div>
      </section>

      {filtersOpen && (
        <Dialog title="Filters" onClose={() => setFiltersOpen(false)}>
          <EventFilters
            stacked
            filters={filters}
            locations={locations.data ?? []}
            onChange={update}
          />
          <div className="sticky bottom-0 -mx-5 mt-4 flex gap-2 border-t-2 border-line bg-white px-5 py-3">
            {canClear && (
              <button type="button" className="btn btn-secondary" onClick={clear}>
                Clear
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary flex-1"
              onClick={() => setFiltersOpen(false)}
            >
              Show {pluralize(events.length, 'event')}
            </button>
          </div>
        </Dialog>
      )}
    </>
  )
}
