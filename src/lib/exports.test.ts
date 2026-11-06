import { describe, expect, it } from 'vitest'
import { buildSeedDatabase } from '../data/seed'
import { rsvpsToCsv } from './csv'
import { buildIcs } from './ics'

describe('buildIcs', () => {
  it('writes UTC times and escapes text', () => {
    const event = {
      ...buildSeedDatabase(new Date('2026-11-04T18:00:00Z')).events[0],
      title: 'Soup, bread; more',
      description: 'Line one\nLine two',
      startsAt: '2026-11-15T03:00:00.000Z',
      endsAt: '2026-11-15T05:30:00.000Z',
    }
    const ics = buildIcs(event, 'https://example.com/e/1', new Date('2026-11-04T18:00:00Z'))
    expect(ics).toContain('DTSTART:20261115T030000Z')
    expect(ics).toContain('DTEND:20261115T053000Z')
    expect(ics).toContain(String.raw`SUMMARY:Soup\, bread\; more`)
    expect(ics).toContain(String.raw`DESCRIPTION:Line one\nLine two`)
    expect(ics).toContain('\r\n')
  })
})

describe('rsvpsToCsv', () => {
  const rsvp = (name: string) => ({
    id: 'r1',
    eventId: 'e1',
    attendeeId: 'a1',
    partySize: 2,
    status: 'going' as const,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    attendee: { id: 'a1', name, email: 'a@example.com' },
  })

  it('quotes commas and quotes', () => {
    expect(rsvpsToCsv([rsvp('Lee, "Ada"')])).toContain('"Lee, ""Ada"""')
  })

  it('stops spreadsheets from running a name as a formula', () => {
    expect(rsvpsToCsv([rsvp('=HYPERLINK("x")')])).toContain(`"'=HYPERLINK(""x"")"`)
  })
})
