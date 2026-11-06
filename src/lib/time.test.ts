import { describe, expect, it } from 'vitest'
import { addDays, fromWallClock, offsetMinutes, toWallClock, weekdayOf } from './time'

describe('offsetMinutes', () => {
  it('follows daylight saving', () => {
    expect(offsetMinutes(new Date('2026-07-01T12:00:00Z'), 'America/Los_Angeles')).toBe(-420)
    expect(offsetMinutes(new Date('2026-12-01T12:00:00Z'), 'America/Los_Angeles')).toBe(-480)
  })

  it('handles half-hour zones', () => {
    expect(offsetMinutes(new Date('2026-12-01T12:00:00Z'), 'Asia/Kolkata')).toBe(330)
  })
})

describe('fromWallClock', () => {
  it('converts a local time to the right instant', () => {
    const instant = fromWallClock({ date: '2026-11-14', time: '19:00' }, 'America/Los_Angeles')
    expect(instant.toISOString()).toBe('2026-11-15T03:00:00.000Z')
  })

  it('round-trips across zones', () => {
    for (const zone of ['Asia/Tokyo', 'Europe/London', 'America/Toronto', 'Pacific/Auckland']) {
      const wall = { date: '2026-03-29', time: '12:15' }
      expect(toWallClock(fromWallClock(wall, zone), zone)).toEqual(wall)
    }
  })

  it('moves a time skipped by daylight saving forward', () => {
    // Clocks jump from 2:00 to 3:00 on March 8, 2026.
    const instant = fromWallClock({ date: '2026-03-08', time: '02:30' }, 'America/Los_Angeles')
    expect(toWallClock(instant, 'America/Los_Angeles')).toEqual({
      date: '2026-03-08',
      time: '03:30',
    })
  })

  it('picks the first of a time that happens twice', () => {
    // Clocks fall back from 2:00 to 1:00 on November 1, 2026.
    const instant = fromWallClock({ date: '2026-11-01', time: '01:30' }, 'America/Los_Angeles')
    expect(instant.toISOString()).toBe('2026-11-01T08:30:00.000Z')
  })
})

describe('calendar helpers', () => {
  it('adds days across a month boundary', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
  })

  it('finds the weekday', () => {
    expect(weekdayOf('2026-11-07')).toBe(6)
  })
})
