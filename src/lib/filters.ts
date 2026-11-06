import {
  EVENT_CATEGORIES,
  type AvailabilityFilter,
  type EventCategory,
  type EventQuery,
} from '../data/types'
import { addDays, startOfDay, toWallClock, weekdayOf } from './time'

export type DatePreset = 'upcoming' | 'today' | 'weekend' | 'week' | 'month' | 'custom'
export type DiscoverView = 'flyers' | 'agenda' | 'calendar'

/** Everything on the Discover page that lives in the URL, so results can be shared. */
export interface DiscoverFilters {
  search: string
  categories: EventCategory[]
  when: DatePreset
  from: string
  to: string
  location: string
  availability: AvailabilityFilter
  includePast: boolean
  view: DiscoverView
  /** YYYY-MM, the month open in the calendar. Empty means the current month. */
  month: string
}

export const DEFAULT_FILTERS: DiscoverFilters = {
  search: '',
  categories: [],
  when: 'upcoming',
  from: '',
  to: '',
  location: '',
  availability: 'any',
  includePast: false,
  view: 'flyers',
  month: '',
}

export const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  upcoming: 'Any upcoming date',
  today: 'Today',
  weekend: 'This weekend',
  week: 'Next 7 days',
  month: 'Next 30 days',
  custom: 'Choose dates',
}

export const AVAILABILITY_LABELS: Record<AvailabilityFilter, string> = {
  any: 'Any availability',
  open: 'Has spots left',
  limited: 'Filling up',
  full: 'Full, waitlist only',
}

const isDate = (value: string | null): value is string =>
  value !== null && /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value)

function oneOf<T extends string>(value: string | null, options: readonly T[], fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback
}

export function parseFilters(params: URLSearchParams): DiscoverFilters {
  const month = params.get('month')
  return {
    search: params.get('q') ?? '',
    categories: (params.get('categories') ?? '')
      .split(',')
      .filter((value): value is EventCategory => EVENT_CATEGORIES.includes(value as EventCategory)),
    when: oneOf(params.get('when'), Object.keys(DATE_PRESET_LABELS) as DatePreset[], 'upcoming'),
    from: isDate(params.get('from')) ? (params.get('from') as string) : '',
    to: isDate(params.get('to')) ? (params.get('to') as string) : '',
    location: params.get('location') ?? '',
    availability: oneOf(
      params.get('availability'),
      Object.keys(AVAILABILITY_LABELS) as AvailabilityFilter[],
      'any',
    ),
    includePast: params.get('past') === '1',
    view: oneOf(params.get('view'), ['flyers', 'agenda', 'calendar'] as const, 'flyers'),
    month: month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? month : '',
  }
}

export function serializeFilters(filters: DiscoverFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.search) params.set('q', filters.search)
  if (filters.categories.length > 0) params.set('categories', filters.categories.join(','))
  if (filters.when !== 'upcoming') params.set('when', filters.when)
  if (filters.when === 'custom' && filters.from) params.set('from', filters.from)
  if (filters.when === 'custom' && filters.to) params.set('to', filters.to)
  if (filters.location) params.set('location', filters.location)
  if (filters.availability !== 'any') params.set('availability', filters.availability)
  if (filters.includePast) params.set('past', '1')
  if (filters.view !== 'flyers') params.set('view', filters.view)
  if (filters.view === 'calendar' && filters.month) params.set('month', filters.month)
  return params
}

/** The filters inside the filter panel, for the count on the mobile button. */
export function activeFilterCount(filters: DiscoverFilters): number {
  return (
    filters.categories.length +
    (filters.when !== 'upcoming' ? 1 : 0) +
    (filters.location ? 1 : 0) +
    (filters.availability !== 'any' ? 1 : 0) +
    (filters.includePast ? 1 : 0)
  )
}

export function hasCustomRangeError(filters: DiscoverFilters): boolean {
  return filters.when === 'custom' && !!filters.from && !!filters.to && filters.from > filters.to
}

/**
 * Turns a preset into exact instants. "Today" depends on who is asking, so the
 * calculation uses the visitor's time zone and the API only ever sees UTC.
 */
export function dateRange(
  filters: Pick<DiscoverFilters, 'when' | 'from' | 'to'>,
  timeZone: string,
  now: Date,
): { from?: string; to?: string } {
  const today = toWallClock(now, timeZone).date
  const fromNow = now.toISOString()
  const dayStart = (date: string) => startOfDay(date, timeZone).toISOString()

  switch (filters.when) {
    case 'today':
      return { from: fromNow, to: dayStart(addDays(today, 1)) }
    case 'weekend': {
      const weekday = weekdayOf(today)
      // On Saturday and Sunday the weekend has already begun.
      if (weekday === 6 || weekday === 0) {
        const monday = addDays(today, weekday === 6 ? 2 : 1)
        return { from: fromNow, to: dayStart(monday) }
      }
      const saturday = addDays(today, 6 - weekday)
      return { from: dayStart(saturday), to: dayStart(addDays(saturday, 2)) }
    }
    case 'week':
      return { from: fromNow, to: dayStart(addDays(today, 8)) }
    case 'month':
      return { from: fromNow, to: dayStart(addDays(today, 31)) }
    case 'custom':
      return {
        from: filters.from ? dayStart(filters.from) : undefined,
        to: filters.to ? dayStart(addDays(filters.to, 1)) : undefined,
      }
    default:
      return {}
  }
}

/** First and last instants of the month grid, including days from nearby months. */
export function calendarRange(month: string, timeZone: string): { from: string; to: string } {
  const days = calendarDays(month)
  return {
    from: startOfDay(days[0], timeZone).toISOString(),
    to: startOfDay(addDays(days[days.length - 1], 1), timeZone).toISOString(),
  }
}

/** Every day shown for a month, Sunday first, in whole weeks. */
export function calendarDays(month: string): string[] {
  const first = `${month}-01`
  const start = addDays(first, -weekdayOf(first))
  const days: string[] = []
  let day = start
  do {
    for (let i = 0; i < 7; i += 1) {
      days.push(day)
      day = addDays(day, 1)
    }
  } while (day.slice(0, 7) <= month)
  return days
}

export function shiftMonth(month: string, delta: number): string {
  const [year, monthIndex] = month.split('-').map(Number)
  return new Date(Date.UTC(year, monthIndex - 1 + delta, 1)).toISOString().slice(0, 7)
}

export function currentMonth(timeZone: string, now: Date): string {
  return toWallClock(now, timeZone).date.slice(0, 7)
}

export function toEventQuery(filters: DiscoverFilters, timeZone: string, now: Date): EventQuery {
  const base: EventQuery = {
    search: filters.search.trim() || undefined,
    categories: filters.categories.length > 0 ? filters.categories : undefined,
    location: filters.location || undefined,
    availability: filters.availability === 'any' ? undefined : filters.availability,
  }

  if (filters.view === 'calendar') {
    const month = filters.month || currentMonth(timeZone, now)
    return { ...base, ...calendarRange(month, timeZone), includePast: true }
  }

  if (hasCustomRangeError(filters)) return { ...base, includePast: filters.includePast }
  return { ...base, ...dateRange(filters, timeZone, now), includePast: filters.includePast }
}
