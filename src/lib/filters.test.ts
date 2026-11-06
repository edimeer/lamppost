import { describe, expect, it } from 'vitest'
import {
  activeFilterCount,
  calendarDays,
  DEFAULT_FILTERS,
  dateRange,
  parseFilters,
  serializeFilters,
  shiftMonth,
} from './filters'
import { toWallClock } from './time'

const LA = 'America/Los_Angeles'

describe('URL filters', () => {
  it('round-trips through the URL', () => {
    const filters = {
      ...DEFAULT_FILTERS,
      search: 'choir',
      categories: ['music' as const, 'arts' as const],
      when: 'custom' as const,
      from: '2026-11-10',
      to: '2026-11-12',
      location: 'Camas',
      availability: 'open' as const,
      includePast: true,
      view: 'agenda' as const,
    }
    expect(parseFilters(serializeFilters(filters))).toEqual(filters)
  })

  it('ignores junk in the URL', () => {
    const filters = parseFilters(new URLSearchParams('categories=nope,music&when=later&view=map&from=soon'))
    expect(filters.categories).toEqual(['music'])
    expect(filters.when).toBe('upcoming')
    expect(filters.view).toBe('flyers')
    expect(filters.from).toBe('')
  })

  it('rejects a month that does not exist', () => {
    expect(parseFilters(new URLSearchParams('month=2026-13')).month).toBe('')
    expect(parseFilters(new URLSearchParams('month=2026-12')).month).toBe('2026-12')
  })

  it('counts active filters', () => {
    expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0)
    expect(
      activeFilterCount({ ...DEFAULT_FILTERS, categories: ['music'], location: 'Camas', when: 'today' }),
    ).toBe(3)
  })
})

describe('dateRange', () => {
  const dayIn = (iso: string | undefined) => toWallClock(iso as string, LA).date

  it('ends "today" at midnight in the visitor zone', () => {
    const now = new Date('2026-11-05T02:00:00Z') // Nov 4, 6 PM in Los Angeles.
    const range = dateRange({ when: 'today', from: '', to: '' }, LA, now)
    expect(range.from).toBe(now.toISOString())
    expect(toWallClock(range.to as string, LA)).toEqual({ date: '2026-11-05', time: '00:00' })
  })

  it('finds the coming weekend midweek', () => {
    const now = new Date('2026-11-04T18:00:00Z') // Wednesday.
    const range = dateRange({ when: 'weekend', from: '', to: '' }, LA, now)
    expect(dayIn(range.from)).toBe('2026-11-07')
    expect(dayIn(range.to)).toBe('2026-11-09')
  })

  it('treats Sunday as the rest of this weekend', () => {
    const now = new Date('2026-11-08T18:00:00Z') // Sunday.
    const range = dateRange({ when: 'weekend', from: '', to: '' }, LA, now)
    expect(range.from).toBe(now.toISOString())
    expect(dayIn(range.to)).toBe('2026-11-09')
  })

  it('includes the whole last day of a custom range', () => {
    const range = dateRange({ when: 'custom', from: '2026-11-10', to: '2026-11-12' }, LA, new Date())
    expect(dayIn(range.from)).toBe('2026-11-10')
    expect(dayIn(range.to)).toBe('2026-11-13')
  })
})

describe('calendar helpers', () => {
  it('fills whole weeks starting on Sunday', () => {
    const days = calendarDays('2026-11')
    expect(days[0]).toBe('2026-11-01')
    expect(days.length % 7).toBe(0)
    expect(days).toContain('2026-11-30')
    expect(days.at(-1)).toBe('2026-12-05')
  })

  it('includes trailing days of the previous month', () => {
    const days = calendarDays('2026-12')
    expect(days[0]).toBe('2026-11-29')
    expect(days).toContain('2026-12-31')
    expect(days.length % 7).toBe(0)
  })

  it('handles a month that ends on a Saturday', () => {
    const days = calendarDays('2026-10')
    expect(days.at(-1)).toBe('2026-10-31')
  })

  it('shifts across a year', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
  })
})
