import type { RsvpWithAttendee } from '../data/types'

function csvCell(value: string | number): string {
  let text = String(value)
  // Spreadsheets run cells that start with these as formulas.
  if (/^[=+\-@]/.test(text)) text = `'${text}`
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function rsvpsToCsv(rsvps: RsvpWithAttendee[]): string {
  const header = ['Name', 'Email', 'Party size', 'Status', 'RSVP date']
  const rows = rsvps.map((rsvp) => [
    rsvp.attendee.name,
    rsvp.attendee.email,
    rsvp.partySize,
    rsvp.status,
    rsvp.createdAt,
  ])
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n') + '\n'
}
