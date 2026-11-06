import type { CommunityEvent } from '../data/types'
import { formatVenueLine } from './format'

function icsDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/** Calendar files use a backslash before commas, semicolons and backslashes. */
function icsText(text: string): string {
  const backslash = String.fromCharCode(92)
  return text
    .replace(/[;,\\]/g, (character) => backslash + character)
    .replace(/\r?\n/g, `${backslash}n`)
}

/** The calendar format understood by Apple, Google and Outlook calendars. */
export function buildIcs(event: CommunityEvent, pageUrl: string, now: Date = new Date()): string {
  const location = event.venue
    ? `${event.venue.name}, ${formatVenueLine(event.venue)}`
    : (event.onlineUrl ?? '')
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lamppost//Community Events//EN',
    'BEGIN:VEVENT',
    `UID:${event.id}@lamppost`,
    `DTSTAMP:${icsDate(now.toISOString())}`,
    `DTSTART:${icsDate(event.startsAt)}`,
    `DTEND:${icsDate(event.endsAt)}`,
    `SUMMARY:${icsText(event.title)}`,
    `DESCRIPTION:${icsText(event.description)}`,
    `LOCATION:${icsText(location)}`,
    `URL:${pageUrl}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n')
}
