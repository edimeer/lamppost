import {
  ACCESSIBILITY_FEATURES,
  type AccessibilityFeature,
  type EventCategory,
  type EventDetails,
  type EventInput,
  type Organizer,
} from '../data/types'
import { addDays, isValidTimeZone, toWallClock } from './time'
import { eventInstants, type EventFormValues } from './validation'

export function emptyEventForm(timeZone: string): EventFormValues {
  return {
    title: '',
    description: '',
    category: '',
    date: '',
    startTime: '18:00',
    endTime: '20:00',
    endsNextDay: false,
    timeZone,
    locationMode: 'in_person',
    venueName: '',
    street: '',
    city: '',
    region: '',
    postalCode: '',
    neighborhood: '',
    onlineUrl: '',
    capacity: '',
    accessibilityFeatures: [],
    accessibilityNotes: '',
    coverImageUrl: '',
    coverImageAlt: '',
  }
}

export function eventToForm(event: EventDetails): EventFormValues {
  const start = toWallClock(event.startsAt, event.timeZone)
  const end = toWallClock(event.endsAt, event.timeZone)
  const { venue } = event
  return {
    title: event.title,
    description: event.description,
    category: event.category,
    date: start.date,
    startTime: start.time,
    endTime: end.time,
    endsNextDay: end.date === addDays(start.date, 1),
    timeZone: event.timeZone,
    locationMode: venue && event.onlineUrl ? 'hybrid' : venue ? 'in_person' : 'online',
    venueName: venue?.name ?? '',
    street: venue?.street ?? '',
    city: venue?.city ?? '',
    region: venue?.region ?? '',
    postalCode: venue?.postalCode ?? '',
    neighborhood: venue?.neighborhood ?? '',
    onlineUrl: event.onlineUrl ?? '',
    capacity: String(event.capacity),
    accessibilityFeatures: event.accessibility.features,
    accessibilityNotes: event.accessibility.notes,
    coverImageUrl: event.coverImageUrl ?? '',
    coverImageAlt: event.coverImageAlt ?? '',
  }
}

function venueFrom(values: EventFormValues): EventInput['venue'] {
  if (values.locationMode === 'online') return null
  return {
    name: values.venueName.trim(),
    street: values.street.trim(),
    city: values.city.trim(),
    region: values.region.trim(),
    postalCode: values.postalCode.trim(),
    neighborhood: values.neighborhood.trim() || null,
  }
}

function featuresFrom(values: EventFormValues): AccessibilityFeature[] {
  return ACCESSIBILITY_FEATURES.filter((feature) => values.accessibilityFeatures.includes(feature))
}

/** Call only after validation has passed. */
export function formToInput(values: EventFormValues): EventInput {
  const { start, end } = eventInstants(values)
  const coverImageUrl = values.coverImageUrl.trim()
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    category: values.category as EventCategory,
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    timeZone: values.timeZone,
    venue: venueFrom(values),
    onlineUrl: values.locationMode === 'in_person' ? null : values.onlineUrl.trim(),
    capacity: Number(values.capacity),
    accessibility: {
      features: featuresFrom(values),
      notes: values.accessibilityNotes.trim(),
    },
    coverImageUrl: coverImageUrl || null,
    coverImageAlt: coverImageUrl ? values.coverImageAlt.trim() : null,
  }
}

export function hasValidDateTime(values: EventFormValues): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(values.date) &&
    /^\d{2}:\d{2}$/.test(values.startTime) &&
    /^\d{2}:\d{2}$/.test(values.endTime) &&
    isValidTimeZone(values.timeZone)
  )
}

/** Builds a stand-in event so the form can show a flyer while it is being filled in. */
export function previewEvent(values: EventFormValues, organizer: Organizer): EventDetails {
  const fallback = new Date(Date.now() + 7 * 86400000)
  const { start, end } = hasValidDateTime(values)
    ? eventInstants(values)
    : { start: fallback, end: fallback }
  const capacity = Math.max(0, Math.floor(Number(values.capacity)) || 0)
  const timestamp = new Date().toISOString()
  const coverImageUrl = values.coverImageUrl.trim()
  return {
    id: 'preview',
    title: values.title.trim(),
    description: values.description,
    category: (values.category || 'neighborhood') as EventCategory,
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    timeZone: values.timeZone,
    venue:
      values.locationMode === 'online'
        ? null
        : { ...venueFrom(values)!, name: values.venueName.trim() || 'Your venue' },
    onlineUrl: values.locationMode === 'in_person' ? null : values.onlineUrl.trim() || null,
    organizerId: organizer.id,
    capacity,
    accessibility: { features: [], notes: '' },
    status: 'draft',
    cancellation: null,
    coverImageUrl: coverImageUrl || null,
    coverImageAlt: values.coverImageAlt,
    createdAt: timestamp,
    updatedAt: timestamp,
    publishedAt: null,
    organizer,
    goingCount: 0,
    waitlistCount: 0,
    spotsLeft: capacity,
    viewer: { rsvp: null, saved: false, canManage: true },
  }
}
