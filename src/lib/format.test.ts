import { describe, expect, it } from 'vitest'
import { formatLongDate, formatShortDate, formatTime, formatTimeRange, formatZoneLabel } from './format'

const LA = 'America/Los_Angeles'

describe('date and time formatting', () => {
  it('shows the date in the visitor zone, not UTC', () => {
    // 3 AM UTC on the 15th is still the evening of the 14th in Los Angeles.
    expect(formatShortDate('2026-11-15T03:00:00Z', LA)).toBe('Sat, Nov 14')
    expect(formatLongDate('2026-11-15T03:00:00Z', LA)).toBe('Saturday, November 14, 2026')
  })

  it('uses plain spaces in times', () => {
    expect(formatTime('2026-11-15T03:00:00Z', LA)).toBe('7:00 PM')
  })

  it('shortens a range within one half of the day', () => {
    expect(formatTimeRange('2026-11-15T03:00:00Z', '2026-11-15T05:30:00Z', LA)).toBe(
      '7:00 - 9:30 PM PST',
    )
  })

  it('keeps both meridiems when the range crosses noon', () => {
    expect(formatTimeRange('2026-11-14T19:00:00Z', '2026-11-14T21:00:00Z', LA)).toBe(
      '11:00 AM - 1:00 PM PST',
    )
  })

  it('flags a range that runs past midnight', () => {
    expect(formatTimeRange('2026-11-15T06:00:00Z', '2026-11-15T09:00:00Z', LA)).toBe(
      '10:00 PM - 1:00 AM PST (next day)',
    )
  })

  it('labels time zones', () => {
    const at = new Date('2026-11-15T03:00:00Z')
    expect(formatZoneLabel(LA, at)).toBe('Los Angeles (PST, UTC-8)')
    expect(formatZoneLabel('Asia/Kolkata', at)).toBe('Kolkata (UTC+5:30)')
    expect(formatZoneLabel('UTC', at)).toBe('UTC (UTC+0)')
  })
})
