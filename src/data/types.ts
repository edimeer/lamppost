/**
 * Domain models. These are the shapes the interface works with, and the same
 * shapes a future Rails API would return as JSON (see docs/rails-api.md).
 * Dates are ISO 8601 strings in UTC. Time zones are IANA names such as
 * "America/Los_Angeles".
 */

export type IsoDateTime = string

export const EVENT_CATEGORIES = [
  'music',
  'food',
  'arts',
  'outdoors',
  'family',
  'learning',
  'volunteering',
  'wellness',
  'neighborhood',
] as const

export type EventCategory = (typeof EVENT_CATEGORIES)[number]

export const ACCESSIBILITY_FEATURES = [
  'step_free_entrance',
  'accessible_restroom',
  'seating_available',
  'asl_interpretation',
  'live_captions',
  'assistive_listening',
  'quiet_space',
  'service_animals_welcome',
  'accessible_parking',
  'transit_nearby',
] as const

export type AccessibilityFeature = (typeof ACCESSIBILITY_FEATURES)[number]

export type PublicationStatus = 'draft' | 'published' | 'canceled'

export interface Venue {
  name: string
  street: string
  city: string
  region: string
  postalCode: string
  neighborhood: string | null
}

export interface Organizer {
  id: string
  name: string
  contactEmail: string
  phone: string | null
  website: string | null
  bio: string
}

export interface Attendee {
  id: string
  name: string
  email: string
}

export interface EventAccessibility {
  features: AccessibilityFeature[]
  notes: string
}

export interface EventCancellation {
  reason: string
  canceledAt: IsoDateTime
}

/** An event as it is stored. */
export interface CommunityEvent {
  id: string
  title: string
  description: string
  category: EventCategory
  startsAt: IsoDateTime
  endsAt: IsoDateTime
  /** Where the event happens. Used for the "local time at the venue" line. */
  timeZone: string
  /** Null for online-only events. */
  venue: Venue | null
  onlineUrl: string | null
  organizerId: string
  capacity: number
  accessibility: EventAccessibility
  status: PublicationStatus
  cancellation: EventCancellation | null
  coverImageUrl: string | null
  coverImageAlt: string | null
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
  publishedAt: IsoDateTime | null
}

export type RsvpStatus = 'going' | 'waitlisted' | 'canceled'

export interface Rsvp {
  id: string
  eventId: string
  attendeeId: string
  /** Number of spots this RSVP takes, including the attendee. */
  partySize: number
  status: RsvpStatus
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}

/** An RSVP with its attendee, as shown on the organizer's list. */
export interface RsvpWithAttendee extends Rsvp {
  attendee: Attendee
}

/** What the current visitor has done with an event. */
export interface EventViewerState {
  rsvp: Rsvp | null
  saved: boolean
  canManage: boolean
}

/** An event with everything the interface needs to display it. */
export interface EventDetails extends CommunityEvent {
  organizer: Organizer
  goingCount: number
  waitlistCount: number
  spotsLeft: number
  viewer: EventViewerState
}

/** The person using the app. Stands in for a signed-in account. */
export interface Session {
  attendee: Attendee
  organizer: Organizer
}

export type DateFilter = { from?: IsoDateTime; to?: IsoDateTime }

export type AvailabilityFilter = 'any' | 'open' | 'limited' | 'full'

export interface EventQuery extends DateFilter {
  /** Free text matched against title, description, organizer and location. */
  search?: string
  categories?: EventCategory[]
  /** A city name, or ONLINE_LOCATION for events with an online link. */
  location?: string
  availability?: AvailabilityFilter
  includePast?: boolean
}

export const ONLINE_LOCATION = 'online'

export interface LocationOption {
  value: string
  label: string
  eventCount: number
}

/** The fields an organizer fills in. Server-owned fields are left out. */
export interface EventInput {
  title: string
  description: string
  category: EventCategory
  startsAt: IsoDateTime
  endsAt: IsoDateTime
  timeZone: string
  venue: Venue | null
  onlineUrl: string | null
  capacity: number
  accessibility: EventAccessibility
  coverImageUrl: string | null
  coverImageAlt: string | null
}

export interface RsvpInput {
  name: string
  email: string
  partySize: number
}

export interface ProfileInput {
  attendeeName: string
  attendeeEmail: string
  organizerName: string
  organizerEmail: string
  organizerPhone: string | null
  organizerWebsite: string | null
  organizerBio: string
}
