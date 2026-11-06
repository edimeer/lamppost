/**
 * Time zone helpers built on the browser's Intl API.
 *
 * Events are stored as UTC instants plus the IANA zone they happen in. Organizers
 * type wall-clock times ("7:00 PM in Chicago"), so we need to convert between
 * the two. Plain Date objects only know UTC and the device's own zone, which is
 * why these helpers exist.
 */

export interface WallClock {
  /** YYYY-MM-DD */
  date: string
  /** HH:mm, 24-hour */
  time: string
}

const partFormatters = new Map<string, Intl.DateTimeFormat>()

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = partFormatters.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    partFormatters.set(timeZone, formatter)
  }
  return formatter
}

function zonedFields(instant: Date, timeZone: string) {
  const fields: Record<string, number> = {}
  for (const part of formatterFor(timeZone).formatToParts(instant)) {
    if (part.type !== 'literal') fields[part.type] = Number(part.value)
  }
  return fields as Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', number>
}

/** Minutes the zone is ahead of UTC at that instant (-480 for PST). */
export function offsetMinutes(instant: Date, timeZone: string): number {
  const f = zonedFields(instant, timeZone)
  const asIfUtc = Date.UTC(f.year, f.month - 1, f.day, f.hour, f.minute, f.second)
  const truncated = Math.floor(instant.getTime() / 1000) * 1000
  return Math.round((asIfUtc - truncated) / 60000)
}

/** Reads an instant as wall-clock date and time in a zone. */
export function toWallClock(iso: string | Date, timeZone: string): WallClock {
  const f = zonedFields(new Date(iso), timeZone)
  const pad = (n: number, width = 2) => String(n).padStart(width, '0')
  return {
    date: `${pad(f.year, 4)}-${pad(f.month)}-${pad(f.day)}`,
    time: `${pad(f.hour)}:${pad(f.minute)}`,
  }
}

/**
 * Finds the instant that a wall-clock time in a zone refers to.
 *
 * A zone's offset depends on the instant, which is what we are solving for. So
 * we measure the offset a day either side, since a daylight saving change can
 * only sit between those two, and keep whichever one gives back the same wall
 * clock. A time skipped by the clocks going forward (2:30 AM) lands an hour
 * later, and a time that happens twice picks the first.
 */
export function fromWallClock({ date, time }: WallClock, timeZone: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  const asIfUtc = Date.UTC(year, month - 1, day, hour, minute)

  const candidates = [-1440, 1440].map((probe) =>
    offsetMinutes(new Date(asIfUtc + probe * 60000), timeZone),
  )
  const matches = [...new Set(candidates)]
    .map((offset) => new Date(asIfUtc - offset * 60000))
    .filter((guess) => {
      const wall = toWallClock(guess, timeZone)
      return wall.date === date && wall.time === time
    })
    .sort((a, b) => a.getTime() - b.getTime())
  if (matches.length > 0) return matches[0]

  // No match means the time was skipped: use the offset from before the change.
  return new Date(asIfUtc - candidates[0] * 60000)
}

/** Adds calendar days to a YYYY-MM-DD string. */
export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

/** 0 is Sunday, 6 is Saturday. */
export function weekdayOf(date: string): number {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

/** The first instant of a calendar day in a zone. */
export function startOfDay(date: string, timeZone: string): Date {
  return fromWallClock({ date, time: '00:00' }, timeZone)
}

export function detectTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
    return true
  } catch {
    return false
  }
}

const FALLBACK_ZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Vancouver',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Australia/Sydney',
]

/** Every zone the browser knows, always including the ones passed in. */
export function listTimeZones(...include: string[]): string[] {
  let zones: string[]
  try {
    zones = Intl.supportedValuesOf('timeZone')
  } catch {
    zones = FALLBACK_ZONES
  }
  return [...new Set([...zones, 'UTC', ...include])].sort((a, b) => a.localeCompare(b))
}
