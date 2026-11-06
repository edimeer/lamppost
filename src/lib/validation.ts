import type { EventCategory } from '../data/types'
import { EVENT_CATEGORIES } from '../data/types'
import { addDays, fromWallClock, isValidTimeZone } from './time'

export type LocationMode = 'in_person' | 'online' | 'hybrid'

/** The event form's values, all kept as strings the way inputs report them. */
export interface EventFormValues {
  title: string
  description: string
  category: EventCategory | ''
  date: string
  startTime: string
  endTime: string
  endsNextDay: boolean
  timeZone: string
  locationMode: LocationMode
  venueName: string
  street: string
  city: string
  region: string
  postalCode: string
  neighborhood: string
  onlineUrl: string
  capacity: string
  accessibilityFeatures: string[]
  accessibilityNotes: string
  coverImageUrl: string
  coverImageAlt: string
}

export type EventFormField = keyof EventFormValues
export type EventFormErrors = Partial<Record<EventFormField, string>>

export const LIMITS = {
  title: 120,
  description: 4000,
  capacity: 100000,
  partySize: 6,
  maxDurationHours: 24,
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.includes('.')
  } catch {
    return false
  }
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

/** Sample covers ship with the site, so their paths are relative. */
function isBundledCover(value: string): boolean {
  return value.startsWith('covers/')
}

export function eventInstants(values: EventFormValues): { start: Date; end: Date } {
  const start = fromWallClock({ date: values.date, time: values.startTime }, values.timeZone)
  const end = fromWallClock(
    {
      date: values.endsNextDay ? addDays(values.date, 1) : values.date,
      time: values.endTime,
    },
    values.timeZone,
  )
  return { start, end }
}

export interface ValidationContext {
  now: Date
  /** People already holding a spot. Capacity cannot drop below this. */
  spotsTaken?: number
  /** Set when editing. A past event can be fixed up without changing its date. */
  originalStartsAt?: string
  /** True when the event is, or is about to be, visible to the public. */
  publishing: boolean
}

export function validateEventForm(
  values: EventFormValues,
  context: ValidationContext,
): EventFormErrors {
  const errors: EventFormErrors = {}
  const title = values.title.trim()
  const description = values.description.trim()

  if (!title) errors.title = 'Enter a title.'
  else if (title.length > LIMITS.title) {
    errors.title = `Keep the title to ${LIMITS.title} characters. It is ${title.length} now.`
  }

  if (!description) errors.description = 'Describe what will happen at the event.'
  else if (description.length > LIMITS.description) {
    errors.description = `Keep the description to ${LIMITS.description} characters. It is ${description.length} now.`
  }

  if (!EVENT_CATEGORIES.includes(values.category as EventCategory)) {
    errors.category = 'Choose a category.'
  }

  if (!values.timeZone || !isValidTimeZone(values.timeZone)) {
    errors.timeZone = 'Choose a time zone from the list.'
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.date)) errors.date = 'Enter the date of the event.'
  if (!/^\d{2}:\d{2}$/.test(values.startTime)) errors.startTime = 'Enter a start time.'
  if (!/^\d{2}:\d{2}$/.test(values.endTime)) errors.endTime = 'Enter an end time.'

  if (!errors.timeZone && !errors.date && !errors.startTime && !errors.endTime) {
    const { start, end } = eventInstants(values)
    if (end <= start) {
      errors.endTime = 'End time must be after the start time. For a late finish, tick "Ends the next day".'
    } else if (end.getTime() - start.getTime() > LIMITS.maxDurationHours * 3600000) {
      errors.endTime = `Events can run for up to ${LIMITS.maxDurationHours} hours.`
    }
    const dateChanged = start.toISOString() !== context.originalStartsAt
    if (context.publishing && dateChanged && start <= context.now) {
      errors.date = 'The start time has already passed. Choose a future date or time.'
    }
  }

  if (values.locationMode !== 'online') {
    if (!values.venueName.trim()) errors.venueName = 'Enter the name of the venue.'
    if (!values.street.trim()) errors.street = 'Enter the street address.'
    if (!values.city.trim()) errors.city = 'Enter the city.'
    if (!values.region.trim()) errors.region = 'Enter the state or region.'
    if (!values.postalCode.trim()) errors.postalCode = 'Enter the postal code.'
  }

  const onlineUrl = values.onlineUrl.trim()
  if (values.locationMode !== 'in_person' && !onlineUrl) {
    errors.onlineUrl = 'Enter the link people use to join.'
  } else if (onlineUrl && !isHttpUrl(onlineUrl)) {
    errors.onlineUrl = 'Enter a full link that starts with https://'
  }

  const capacityText = values.capacity.trim()
  const capacity = Number(capacityText)
  if (!capacityText) errors.capacity = 'Enter how many people can attend.'
  else if (!Number.isInteger(capacity) || capacity < 1) {
    errors.capacity = 'Capacity must be a whole number of 1 or more.'
  } else if (capacity > LIMITS.capacity) {
    errors.capacity = `Capacity can be at most ${LIMITS.capacity.toLocaleString('en-US')}.`
  } else if (context.spotsTaken && capacity < context.spotsTaken) {
    errors.capacity = capacityBelowTakenMessage(context.spotsTaken)
  }

  const coverImageUrl = values.coverImageUrl.trim()
  if (coverImageUrl && !isHttpUrl(coverImageUrl) && !isBundledCover(coverImageUrl)) {
    errors.coverImageUrl = 'Enter a full image link that starts with https://'
  }
  if (coverImageUrl && !values.coverImageAlt.trim()) {
    errors.coverImageAlt = 'Describe the image for people using screen readers.'
  }

  return errors
}

export function capacityBelowTakenMessage(spotsTaken: number): string {
  return `${spotsTaken.toLocaleString('en-US')} spots are already taken. Remove RSVPs before lowering capacity below that.`
}

export interface RsvpFormValues {
  name: string
  email: string
  partySize: string
}

export type RsvpFormErrors = Partial<Record<keyof RsvpFormValues, string>>

export function validateRsvpForm(values: RsvpFormValues): RsvpFormErrors {
  const errors: RsvpFormErrors = {}
  if (!values.name.trim()) errors.name = 'Enter your name.'
  if (!values.email.trim()) errors.email = 'Enter your email address.'
  else if (!isEmail(values.email)) errors.email = 'Enter an email address like name@example.com.'
  const partySize = Number(values.partySize)
  if (!Number.isInteger(partySize) || partySize < 1 || partySize > LIMITS.partySize) {
    errors.partySize = `Choose between 1 and ${LIMITS.partySize} people.`
  }
  return errors
}

export interface ProfileFormValues {
  attendeeName: string
  attendeeEmail: string
  organizerName: string
  organizerEmail: string
  organizerPhone: string
  organizerWebsite: string
  organizerBio: string
}

export type ProfileFormErrors = Partial<Record<keyof ProfileFormValues, string>>

export function validateProfileForm(values: ProfileFormValues): ProfileFormErrors {
  const errors: ProfileFormErrors = {}
  if (!values.attendeeName.trim()) errors.attendeeName = 'Enter your name.'
  if (!isEmail(values.attendeeEmail)) errors.attendeeEmail = 'Enter an email address like name@example.com.'
  if (!values.organizerName.trim()) errors.organizerName = 'Enter the name people will see on your events.'
  if (!isEmail(values.organizerEmail)) errors.organizerEmail = 'Enter an email address like name@example.com.'
  const website = values.organizerWebsite.trim()
  if (website && !isHttpUrl(website)) errors.organizerWebsite = 'Enter a full link that starts with https://'
  return errors
}
