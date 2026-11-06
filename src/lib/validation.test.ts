import { describe, expect, it } from 'vitest'
import {
  validateEventForm,
  validateRsvpForm,
  type EventFormValues,
  type ValidationContext,
} from './validation'

const context: ValidationContext = { now: new Date('2026-11-07T12:00:00Z'), publishing: true }

const valid: EventFormValues = {
  title: 'Neighborhood Picnic',
  description: 'Bring a blanket.',
  category: 'food',
  date: '2026-12-05',
  startTime: '12:00',
  endTime: '14:00',
  endsNextDay: false,
  timeZone: 'America/Los_Angeles',
  locationMode: 'in_person',
  venueName: 'Laurel Park',
  street: '1 Park Ave',
  city: 'Portland',
  region: 'OR',
  postalCode: '97201',
  neighborhood: '',
  onlineUrl: '',
  capacity: '40',
  accessibilityFeatures: [],
  accessibilityNotes: '',
  coverImageUrl: '',
  coverImageAlt: '',
}

describe('validateEventForm', () => {
  it('accepts a complete event', () => {
    expect(validateEventForm(valid, context)).toEqual({})
  })

  it('requires the basics', () => {
    const errors = validateEventForm(
      { ...valid, title: ' ', description: '', category: '', venueName: '', capacity: '' },
      context,
    )
    expect(Object.keys(errors).sort()).toEqual([
      'capacity',
      'category',
      'description',
      'title',
      'venueName',
    ])
  })

  it('requires the end to follow the start', () => {
    const errors = validateEventForm({ ...valid, startTime: '15:00', endTime: '14:00' }, context)
    expect(errors.endTime).toContain('after the start time')
  })

  it('allows a late finish when it ends the next day', () => {
    const errors = validateEventForm(
      { ...valid, startTime: '22:00', endTime: '01:00', endsNextDay: true },
      context,
    )
    expect(errors).toEqual({})
  })

  it('rejects events that have already started when publishing', () => {
    expect(validateEventForm({ ...valid, date: '2026-01-01' }, context).date).toBeDefined()
  })

  it('lets a draft keep a past date', () => {
    const errors = validateEventForm({ ...valid, date: '2026-01-01' }, { ...context, publishing: false })
    expect(errors.date).toBeUndefined()
  })

  it('lets an organizer fix up a past event without moving it', () => {
    const errors = validateEventForm(
      { ...valid, date: '2026-01-01' },
      { ...context, originalStartsAt: '2026-01-01T20:00:00.000Z' },
    )
    expect(errors.date).toBeUndefined()
  })

  it('validates capacity', () => {
    expect(validateEventForm({ ...valid, capacity: '0' }, context).capacity).toBeDefined()
    expect(validateEventForm({ ...valid, capacity: '2.5' }, context).capacity).toBeDefined()
    expect(validateEventForm({ ...valid, capacity: '9999999' }, context).capacity).toBeDefined()
    expect(
      validateEventForm({ ...valid, capacity: '5' }, { ...context, spotsTaken: 12 }).capacity,
    ).toContain('12 spots')
  })

  it('validates links', () => {
    const online = { ...valid, locationMode: 'online' as const }
    expect(validateEventForm(online, context).onlineUrl).toBeDefined()
    expect(validateEventForm({ ...online, onlineUrl: 'javascript:alert(1)' }, context).onlineUrl).toBeDefined()
    expect(validateEventForm({ ...online, onlineUrl: 'https://meet.example.com/a' }, context)).toEqual({})
    expect(validateEventForm({ ...valid, coverImageUrl: 'not a url' }, context).coverImageUrl).toBeDefined()
  })

  it('asks for alt text with a cover image', () => {
    const errors = validateEventForm({ ...valid, coverImageUrl: 'https://example.com/a.jpg' }, context)
    expect(errors.coverImageAlt).toBeDefined()
  })

  it('does not ask for a venue when online', () => {
    const errors = validateEventForm(
      { ...valid, locationMode: 'online', venueName: '', street: '', city: '', region: '', postalCode: '', onlineUrl: 'https://meet.example.com/a' },
      context,
    )
    expect(errors).toEqual({})
  })
})

describe('validateRsvpForm', () => {
  it('checks each field', () => {
    expect(validateRsvpForm({ name: 'Ada', email: 'ada@example.com', partySize: '2' })).toEqual({})
    const errors = validateRsvpForm({ name: '', email: 'nope', partySize: '12' })
    expect(Object.keys(errors).sort()).toEqual(['email', 'name', 'partySize'])
  })
})
