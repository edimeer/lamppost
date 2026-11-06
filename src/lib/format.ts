import type { AccessibilityFeature, EventCategory, Venue } from '../data/types'
import { toWallClock } from './time'

/**
 * All dates, times and addresses go through this file so they read the same on
 * every screen. The interface copy is English, so the locale is fixed too.
 */
const LOCALE = 'en-US'

function formatter(options: Intl.DateTimeFormatOptions, timeZone: string) {
  return new Intl.DateTimeFormat(LOCALE, { ...options, timeZone })
}

/** "Sat, Nov 14" */
export function formatShortDate(iso: string, timeZone: string): string {
  return formatter({ weekday: 'short', month: 'short', day: 'numeric' }, timeZone).format(
    new Date(iso),
  )
}

/** "Saturday, November 14, 2026" */
export function formatLongDate(iso: string, timeZone: string): string {
  return formatter(
    { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
    timeZone,
  ).format(new Date(iso))
}

/** "7:00 PM" */
export function formatTime(iso: string, timeZone: string): string {
  // Newer browsers put a narrow no-break space before PM. Keep it a plain space.
  return formatter({ hour: 'numeric', minute: '2-digit' }, timeZone)
    .format(new Date(iso))
    .replaceAll('\u202f', ' ')
}

/** "PST", or "GMT+1" for zones without a common short name in en-US. */
export function formatZoneAbbreviation(iso: string, timeZone: string): string {
  const parts = formatter({ timeZoneName: 'short' }, timeZone).formatToParts(new Date(iso))
  return parts.find((part) => part.type === 'timeZoneName')?.value ?? timeZone
}

/** "7:00 - 9:30 PM PST", "11:00 AM - 1:00 PM PST", "10:00 PM - 1:00 AM PST (next day)" */
export function formatTimeRange(startIso: string, endIso: string, timeZone: string): string {
  const start = formatTime(startIso, timeZone)
  const end = formatTime(endIso, timeZone)
  const zone = formatZoneAbbreviation(startIso, timeZone)
  const crossesMidnight =
    toWallClock(startIso, timeZone).date !== toWallClock(endIso, timeZone).date
  const sameMeridiem = !crossesMidnight && start.slice(-2) === end.slice(-2)
  const startLabel = sameMeridiem ? start.slice(0, -3) : start
  return `${startLabel} - ${end} ${zone}${crossesMidnight ? ' (next day)' : ''}`
}

/** "America/Los_Angeles" -> "Los Angeles" */
export function zoneCity(timeZone: string): string {
  const last = timeZone.split('/').pop() ?? timeZone
  return last.replaceAll('_', ' ')
}

/** "America/Los_Angeles" -> "Los Angeles (PST, UTC-8)" */
export function formatZoneLabel(timeZone: string, at: Date = new Date()): string {
  const abbreviation = formatZoneAbbreviation(at.toISOString(), timeZone)
  const longOffset = formatter({ timeZoneName: 'longOffset' }, timeZone)
    .formatToParts(at)
    .find((part) => part.type === 'timeZoneName')
    ?.value.replace('GMT', 'UTC')
    .replace(/^UTC$/, 'UTC+0')
    .replace(/^UTC([+-])0?(\d+):00$/, 'UTC$1$2')
    .replace(/^UTC([+-])0?(\d+:\d+)$/, 'UTC$1$2')
  if (abbreviation.startsWith('GMT') || abbreviation === 'UTC') {
    return `${zoneCity(timeZone)} (${longOffset})`
  }
  return `${zoneCity(timeZone)} (${abbreviation}, ${longOffset})`
}

export function formatVenueLine(venue: Venue): string {
  return `${venue.street}, ${venue.city}, ${venue.region} ${venue.postalCode}`
}

/** "Mt. Tabor, Portland" or "Portland" */
export function formatVenueArea(venue: Venue): string {
  return venue.neighborhood ? `${venue.neighborhood}, ${venue.city}` : venue.city
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count.toLocaleString(LOCALE)} ${count === 1 ? singular : plural}`
}

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  music: 'Music',
  food: 'Food and markets',
  arts: 'Arts and crafts',
  outdoors: 'Outdoors',
  family: 'Family',
  learning: 'Classes and talks',
  volunteering: 'Volunteering',
  wellness: 'Health and movement',
  neighborhood: 'Neighborhood',
}

/** Shorter names for the filter row, where every character costs width. */
export const CATEGORY_SHORT_LABELS: Record<EventCategory, string> = {
  music: 'Music',
  food: 'Food',
  arts: 'Arts',
  outdoors: 'Outdoors',
  family: 'Family',
  learning: 'Classes',
  volunteering: 'Volunteering',
  wellness: 'Health',
  neighborhood: 'Neighborhood',
}

export const ACCESSIBILITY_LABELS: Record<AccessibilityFeature, string> = {
  step_free_entrance: 'Step-free entrance',
  accessible_restroom: 'Accessible restroom',
  seating_available: 'Seating available',
  asl_interpretation: 'ASL interpretation',
  live_captions: 'Live captions',
  assistive_listening: 'Assistive listening',
  quiet_space: 'Quiet space',
  service_animals_welcome: 'Service animals welcome',
  accessible_parking: 'Accessible parking',
  transit_nearby: 'Transit nearby',
}
