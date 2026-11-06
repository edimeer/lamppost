import type {
  EventDetails,
  EventInput,
  EventQuery,
  LocationOption,
  ProfileInput,
  RsvpInput,
  RsvpWithAttendee,
  Session,
} from './types'

export type RepositoryErrorCode =
  | 'not_found'
  | 'forbidden'
  | 'conflict'
  | 'validation'
  | 'storage'

/**
 * The one error type the interface has to understand. A future API client
 * would turn HTTP responses into this: 404 -> not_found, 403 -> forbidden,
 * 409 -> conflict, 422 -> validation.
 */
export class RepositoryError extends Error {
  readonly code: RepositoryErrorCode

  constructor(code: RepositoryErrorCode, message: string) {
    super(message)
    this.name = 'RepositoryError'
    this.code = code
  }
}

/**
 * Every read and write the app performs. Screens never touch localStorage
 * directly: they call this interface, so swapping in a Rails API means writing
 * one new class and changing the export in src/data/index.ts.
 *
 * All methods are async for the same reason, even though local storage is not.
 */
export interface Repository {
  /** False when the browser refuses storage and data lasts only this visit. */
  isPersistent(): boolean

  // Session and profile
  getSession(): Promise<Session>
  updateProfile(input: ProfileInput): Promise<Session>

  // Discovery
  listEvents(query: EventQuery): Promise<EventDetails[]>
  listLocations(): Promise<LocationOption[]>
  getEvent(id: string): Promise<EventDetails>

  // Attendee actions
  submitRsvp(eventId: string, input: RsvpInput): Promise<EventDetails>
  cancelRsvp(eventId: string): Promise<EventDetails>
  saveEvent(eventId: string): Promise<void>
  unsaveEvent(eventId: string): Promise<void>
  listSavedEvents(): Promise<EventDetails[]>
  listMyRsvpEvents(): Promise<EventDetails[]>

  // Organizer actions
  listManagedEvents(): Promise<EventDetails[]>
  createEvent(input: EventInput, options: { publish: boolean }): Promise<EventDetails>
  updateEvent(id: string, input: EventInput): Promise<EventDetails>
  updateCapacity(id: string, capacity: number): Promise<EventDetails>
  publishEvent(id: string): Promise<EventDetails>
  unpublishEvent(id: string): Promise<EventDetails>
  cancelEvent(id: string, reason: string): Promise<EventDetails>
  reopenEvent(id: string): Promise<EventDetails>
  deleteEvent(id: string): Promise<void>

  // Organizer RSVP list
  listEventRsvps(eventId: string): Promise<RsvpWithAttendee[]>
  addGuest(eventId: string, input: RsvpInput): Promise<RsvpWithAttendee[]>
  removeRsvp(rsvpId: string): Promise<void>
  promoteRsvp(rsvpId: string): Promise<void>

  /** Throws away local changes and reloads the sample events. */
  resetDemoData(): Promise<void>
}
