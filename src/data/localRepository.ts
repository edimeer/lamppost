import { getEventState } from '../lib/eventState'
import { capacityBelowTakenMessage, isEmail, isHttpUrl, LIMITS } from '../lib/validation'
import { RepositoryError, type Repository } from './repository'
import { buildSeedDatabase, DATABASE_VERSION, type Database } from './seed'
import type { KeyValueStore } from './storage'
import {
  ONLINE_LOCATION,
  type Attendee,
  type CommunityEvent,
  type EventDetails,
  type EventInput,
  type EventQuery,
  type LocationOption,
  type Organizer,
  type ProfileInput,
  type Rsvp,
  type RsvpInput,
  type RsvpWithAttendee,
  type Session,
} from './types'

const STORAGE_KEY = 'lamppost:database'
const CORRUPT_BACKUP_KEY = 'lamppost:database:corrupt'

interface LocalRepositoryOptions {
  store: KeyValueStore
  /** Fake network delay so loading states behave like they will with an API. */
  latencyMs?: number
  now?: () => Date
  generateId?: () => string
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

function isActive(rsvp: Rsvp): boolean {
  return rsvp.status !== 'canceled'
}

function byOldestFirst(a: Rsvp, b: Rsvp): number {
  return a.createdAt.localeCompare(b.createdAt)
}

/**
 * The Repository interface, backed by the browser's localStorage.
 *
 * It behaves like a small server on purpose. Rules such as "only the organizer
 * can edit" and "the waitlist moves up when a spot opens" live here, not in the
 * components, so each one has a clear home in the Rails app later.
 */
export class LocalRepository implements Repository {
  private store: KeyValueStore
  private latencyMs: number
  private now: () => Date
  private generateId: () => string
  private cache: Database | null = null

  constructor({ store, latencyMs = 0, now, generateId }: LocalRepositoryOptions) {
    this.store = store
    this.latencyMs = latencyMs
    this.now = now ?? (() => new Date())
    this.generateId = generateId ?? (() => crypto.randomUUID())
  }

  isPersistent() {
    return this.store.persistent
  }

  /** Drops the in-memory copy, used when another tab has changed the data. */
  invalidate() {
    this.cache = null
  }

  private async pause() {
    if (this.latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.latencyMs))
    }
  }

  private load(): Database {
    if (this.cache) return this.cache
    const raw = this.store.get(STORAGE_KEY)
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Database
        if (parsed.version === DATABASE_VERSION && Array.isArray(parsed.events)) {
          this.cache = parsed
          return parsed
        }
      } catch {
        // Fall through to rebuild below.
      }
      // Keep the unreadable copy rather than destroying it outright.
      this.store.set(CORRUPT_BACKUP_KEY, raw)
    }
    const fresh = buildSeedDatabase(this.now())
    this.persist(fresh)
    return fresh
  }

  private persist(database: Database) {
    this.cache = database
    this.store.set(STORAGE_KEY, JSON.stringify(database))
  }

  private session(database: Database) {
    const attendee = database.attendees.find((a) => a.id === database.sessionAttendeeId)
    const organizer = database.organizers.find((o) => o.id === database.sessionOrganizerId)
    if (!attendee || !organizer) {
      throw new RepositoryError('storage', 'Your saved profile could not be read.')
    }
    return { attendee, organizer }
  }

  private spotsTaken(database: Database, eventId: string): number {
    return database.rsvps
      .filter((rsvp) => rsvp.eventId === eventId && rsvp.status === 'going')
      .reduce((total, rsvp) => total + rsvp.partySize, 0)
  }

  private details(database: Database, event: CommunityEvent): EventDetails {
    const { attendee, organizer: you } = this.session(database)
    const organizer = database.organizers.find((o) => o.id === event.organizerId)
    if (!organizer) {
      throw new RepositoryError('storage', `The organizer of "${event.title}" is missing.`)
    }
    const rsvps = database.rsvps.filter((rsvp) => rsvp.eventId === event.id)
    const goingCount = this.spotsTaken(database, event.id)
    return {
      ...event,
      organizer,
      goingCount,
      waitlistCount: rsvps
        .filter((rsvp) => rsvp.status === 'waitlisted')
        .reduce((total, rsvp) => total + rsvp.partySize, 0),
      spotsLeft: Math.max(0, event.capacity - goingCount),
      viewer: {
        rsvp: rsvps.find((rsvp) => rsvp.attendeeId === attendee.id && isActive(rsvp)) ?? null,
        saved: database.savedEventIds.includes(event.id),
        canManage: event.organizerId === you.id,
      },
    }
  }

  /** Finds an event the visitor may see. Other people's drafts look like they do not exist. */
  private visibleEvent(database: Database, id: string): CommunityEvent {
    const event = database.events.find((e) => e.id === id)
    const { organizer } = this.session(database)
    if (!event || (event.status === 'draft' && event.organizerId !== organizer.id)) {
      throw new RepositoryError('not_found', 'This event does not exist or is no longer available.')
    }
    return event
  }

  private managedEvent(database: Database, id: string): CommunityEvent {
    const event = this.visibleEvent(database, id)
    if (event.organizerId !== this.session(database).organizer.id) {
      throw new RepositoryError('forbidden', 'Only the organizer of this event can change it.')
    }
    return event
  }

  private checkInput(input: EventInput) {
    if (!input.title.trim() || input.title.length > LIMITS.title) {
      throw new RepositoryError('validation', 'The event needs a title.')
    }
    if (new Date(input.endsAt) <= new Date(input.startsAt)) {
      throw new RepositoryError('validation', 'The event must end after it starts.')
    }
    if (!Number.isInteger(input.capacity) || input.capacity < 1 || input.capacity > LIMITS.capacity) {
      throw new RepositoryError('validation', 'Capacity must be a positive whole number.')
    }
    if (!input.venue && !input.onlineUrl) {
      throw new RepositoryError('validation', 'The event needs a venue or an online link.')
    }
    if (input.onlineUrl && !isHttpUrl(input.onlineUrl)) {
      throw new RepositoryError('validation', 'The online link is not a valid URL.')
    }
  }

  /**
   * Moves people off the waitlist in the order they joined. A party too big for
   * the open spots is skipped, not blocked, so a smaller party behind it can
   * still get in. The skipped party stays first in line for the next opening.
   */
  private promoteWaitlist(database: Database, event: CommunityEvent) {
    let spotsLeft = event.capacity - this.spotsTaken(database, event.id)
    const waiting = database.rsvps
      .filter((rsvp) => rsvp.eventId === event.id && rsvp.status === 'waitlisted')
      .sort(byOldestFirst)
    for (const rsvp of waiting) {
      if (rsvp.partySize <= spotsLeft) {
        rsvp.status = 'going'
        rsvp.updatedAt = this.now().toISOString()
        spotsLeft -= rsvp.partySize
      }
    }
  }

  /** Reuses a person's record when the email matches, so one person has one list entry. */
  private findOrCreateAttendee(database: Database, input: RsvpInput): Attendee {
    const email = input.email.trim().toLowerCase()
    const existing = database.attendees.find((a) => a.email.toLowerCase() === email)
    if (existing) return existing
    const attendee: Attendee = {
      id: `att-${this.generateId()}`,
      name: input.name.trim(),
      email: input.email.trim(),
    }
    database.attendees.push(attendee)
    return attendee
  }

  private checkRsvpInput(input: RsvpInput) {
    if (!input.name.trim() || !isEmail(input.email)) {
      throw new RepositoryError('validation', 'Enter a name and a valid email address.')
    }
    if (!Number.isInteger(input.partySize) || input.partySize < 1 || input.partySize > LIMITS.partySize) {
      throw new RepositoryError('validation', `Party size must be between 1 and ${LIMITS.partySize}.`)
    }
  }

  private placeRsvp(database: Database, event: CommunityEvent, attendee: Attendee, partySize: number) {
    const timestamp = this.now().toISOString()
    const existing = database.rsvps.find(
      (rsvp) => rsvp.eventId === event.id && rsvp.attendeeId === attendee.id && isActive(rsvp),
    )

    if (existing?.status === 'going') {
      const spotsWithoutThis = this.spotsTaken(database, event.id) - existing.partySize
      const available = event.capacity - spotsWithoutThis
      if (partySize > available) {
        throw new RepositoryError(
          'conflict',
          `Only ${available} ${available === 1 ? 'spot is' : 'spots are'} available for your party.`,
        )
      }
      existing.partySize = partySize
      existing.updatedAt = timestamp
      this.promoteWaitlist(database, event)
      return
    }

    const spotsLeft = event.capacity - this.spotsTaken(database, event.id)
    const status = partySize <= spotsLeft ? 'going' : 'waitlisted'
    if (existing) {
      existing.partySize = partySize
      existing.status = status
      existing.updatedAt = timestamp
      return
    }
    database.rsvps.push({
      id: `rsvp-${this.generateId()}`,
      eventId: event.id,
      attendeeId: attendee.id,
      partySize,
      status,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
  }

  async getSession(): Promise<Session> {
    await this.pause()
    return this.session(this.load())
  }

  async updateProfile(input: ProfileInput): Promise<Session> {
    await this.pause()
    const database = this.load()
    const { attendee, organizer } = this.session(database)
    if (!isEmail(input.attendeeEmail) || !isEmail(input.organizerEmail)) {
      throw new RepositoryError('validation', 'Enter valid email addresses.')
    }
    if (input.organizerWebsite?.trim() && !isHttpUrl(input.organizerWebsite.trim())) {
      throw new RepositoryError('validation', 'The website is not a valid URL.')
    }
    Object.assign(attendee, {
      name: input.attendeeName.trim(),
      email: input.attendeeEmail.trim(),
    } satisfies Partial<Attendee>)
    Object.assign(organizer, {
      name: input.organizerName.trim(),
      contactEmail: input.organizerEmail.trim(),
      phone: input.organizerPhone?.trim() || null,
      website: input.organizerWebsite?.trim() || null,
      bio: input.organizerBio.trim(),
    } satisfies Partial<Organizer>)
    this.persist(database)
    return this.session(database)
  }

  async listEvents(query: EventQuery): Promise<EventDetails[]> {
    await this.pause()
    const database = this.load()
    const now = this.now()
    const terms = normalize(query.search ?? '').split(/\s+/).filter(Boolean)
    const categories = query.categories ?? []
    const from = query.from ? new Date(query.from) : null
    const to = query.to ? new Date(query.to) : null

    const matches = database.events
      .filter((event) => event.status !== 'draft')
      .map((event) => this.details(database, event))
      .filter((event) => {
        const state = getEventState(event, now)
        // A date range decides for itself; otherwise past events stay hidden.
        if (!query.includePast && !from && state === 'past') return false
        if (from && new Date(event.endsAt) < from) return false
        if (to && new Date(event.startsAt) >= to) return false
        if (categories.length > 0 && !categories.includes(event.category)) return false

        if (query.location === ONLINE_LOCATION) {
          if (!event.onlineUrl) return false
        } else if (query.location && event.venue?.city !== query.location) {
          return false
        }

        switch (query.availability) {
          case 'open':
            if (state !== 'open' && state !== 'limited') return false
            break
          case 'limited':
            if (state !== 'limited') return false
            break
          case 'full':
            if (state !== 'full') return false
            break
        }

        if (terms.length > 0) {
          const haystack = normalize(
            [
              event.title,
              event.description,
              event.organizer.name,
              event.venue?.name,
              event.venue?.street,
              event.venue?.neighborhood,
              event.venue?.city,
              event.venue?.region,
              event.venue?.postalCode,
              event.onlineUrl ? 'online' : null,
            ]
              .filter(Boolean)
              .join(' '),
          )
          return terms.every((term) => haystack.includes(term))
        }
        return true
      })

    // Soonest first, with past events after everything still to come.
    const isOver = (event: EventDetails) => new Date(event.endsAt) <= now
    return matches.sort((a, b) => {
      const [aOver, bOver] = [isOver(a), isOver(b)]
      if (aOver !== bOver) return aOver ? 1 : -1
      const order = a.startsAt.localeCompare(b.startsAt)
      return aOver ? -order : order
    })
  }

  async listLocations(): Promise<LocationOption[]> {
    await this.pause()
    const database = this.load()
    const now = this.now()
    const upcoming = database.events
      .filter((event) => event.status === 'published' && new Date(event.endsAt) > now)
    const counts = new Map<string, number>()
    for (const event of upcoming) {
      if (event.venue) counts.set(event.venue.city, (counts.get(event.venue.city) ?? 0) + 1)
    }
    const cities = [...counts.entries()]
      .map(([city, eventCount]) => ({ value: city, label: city, eventCount }))
      .sort((a, b) => a.label.localeCompare(b.label))
    const onlineCount = upcoming.filter((event) => event.onlineUrl).length
    return onlineCount > 0
      ? [...cities, { value: ONLINE_LOCATION, label: 'Online', eventCount: onlineCount }]
      : cities
  }

  async getEvent(id: string): Promise<EventDetails> {
    await this.pause()
    const database = this.load()
    return this.details(database, this.visibleEvent(database, id))
  }

  async submitRsvp(eventId: string, input: RsvpInput): Promise<EventDetails> {
    await this.pause()
    this.checkRsvpInput(input)
    const database = this.load()
    const event = this.visibleEvent(database, eventId)
    const state = getEventState(this.details(database, event), this.now())
    if (state === 'canceled' || state === 'past' || state === 'happening' || state === 'draft') {
      throw new RepositoryError('conflict', 'This event is not taking RSVPs.')
    }
    const { attendee } = this.session(database)
    attendee.name = input.name.trim()
    attendee.email = input.email.trim()
    this.placeRsvp(database, event, attendee, input.partySize)
    this.persist(database)
    return this.details(database, event)
  }

  async cancelRsvp(eventId: string): Promise<EventDetails> {
    await this.pause()
    const database = this.load()
    const event = this.visibleEvent(database, eventId)
    const { attendee } = this.session(database)
    const rsvp = database.rsvps.find(
      (r) => r.eventId === eventId && r.attendeeId === attendee.id && isActive(r),
    )
    if (!rsvp) throw new RepositoryError('not_found', 'You do not have an RSVP for this event.')
    rsvp.status = 'canceled'
    rsvp.updatedAt = this.now().toISOString()
    this.promoteWaitlist(database, event)
    this.persist(database)
    return this.details(database, event)
  }

  async saveEvent(eventId: string): Promise<void> {
    await this.pause()
    const database = this.load()
    this.visibleEvent(database, eventId)
    if (!database.savedEventIds.includes(eventId)) {
      database.savedEventIds.push(eventId)
      this.persist(database)
    }
  }

  async unsaveEvent(eventId: string): Promise<void> {
    await this.pause()
    const database = this.load()
    database.savedEventIds = database.savedEventIds.filter((id) => id !== eventId)
    this.persist(database)
  }

  async listSavedEvents(): Promise<EventDetails[]> {
    await this.pause()
    const database = this.load()
    return database.events
      .filter((event) => database.savedEventIds.includes(event.id))
      .map((event) => this.details(database, event))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  }

  async listMyRsvpEvents(): Promise<EventDetails[]> {
    await this.pause()
    const database = this.load()
    return database.events
      .map((event) => this.details(database, event))
      .filter((event) => event.viewer.rsvp)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  }

  async listManagedEvents(): Promise<EventDetails[]> {
    await this.pause()
    const database = this.load()
    const { organizer } = this.session(database)
    return database.events
      .filter((event) => event.organizerId === organizer.id)
      .map((event) => this.details(database, event))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  }

  async createEvent(input: EventInput, { publish }: { publish: boolean }): Promise<EventDetails> {
    await this.pause()
    this.checkInput(input)
    const database = this.load()
    const timestamp = this.now().toISOString()
    const event: CommunityEvent = {
      ...input,
      id: `evt-${this.generateId()}`,
      organizerId: this.session(database).organizer.id,
      status: publish ? 'published' : 'draft',
      cancellation: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      publishedAt: publish ? timestamp : null,
    }
    database.events.push(event)
    this.persist(database)
    return this.details(database, event)
  }

  async updateEvent(id: string, input: EventInput): Promise<EventDetails> {
    await this.pause()
    this.checkInput(input)
    const database = this.load()
    const event = this.managedEvent(database, id)
    const taken = this.spotsTaken(database, id)
    if (input.capacity < taken) {
      throw new RepositoryError('conflict', capacityBelowTakenMessage(taken))
    }
    Object.assign(event, input, { updatedAt: this.now().toISOString() })
    this.promoteWaitlist(database, event)
    this.persist(database)
    return this.details(database, event)
  }

  async updateCapacity(id: string, capacity: number): Promise<EventDetails> {
    await this.pause()
    const database = this.load()
    const event = this.managedEvent(database, id)
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > LIMITS.capacity) {
      throw new RepositoryError('validation', 'Capacity must be a positive whole number.')
    }
    const taken = this.spotsTaken(database, id)
    if (capacity < taken) {
      throw new RepositoryError('conflict', capacityBelowTakenMessage(taken))
    }
    event.capacity = capacity
    event.updatedAt = this.now().toISOString()
    this.promoteWaitlist(database, event)
    this.persist(database)
    return this.details(database, event)
  }

  async publishEvent(id: string): Promise<EventDetails> {
    await this.pause()
    const database = this.load()
    const event = this.managedEvent(database, id)
    if (event.status !== 'draft') {
      throw new RepositoryError('conflict', 'Only a draft can be published.')
    }
    if (new Date(event.startsAt) <= this.now()) {
      throw new RepositoryError('conflict', 'This draft starts in the past. Change the date before publishing.')
    }
    const timestamp = this.now().toISOString()
    event.status = 'published'
    event.publishedAt = timestamp
    event.updatedAt = timestamp
    this.persist(database)
    return this.details(database, event)
  }

  async unpublishEvent(id: string): Promise<EventDetails> {
    await this.pause()
    const database = this.load()
    const event = this.managedEvent(database, id)
    if (event.status !== 'published') {
      throw new RepositoryError('conflict', 'Only a published event can move back to draft.')
    }
    if (database.rsvps.some((rsvp) => rsvp.eventId === id && isActive(rsvp))) {
      throw new RepositoryError(
        'conflict',
        'People have already RSVPed. Cancel the event instead so they are told.',
      )
    }
    event.status = 'draft'
    event.publishedAt = null
    event.updatedAt = this.now().toISOString()
    this.persist(database)
    return this.details(database, event)
  }

  async cancelEvent(id: string, reason: string): Promise<EventDetails> {
    await this.pause()
    const database = this.load()
    const event = this.managedEvent(database, id)
    if (event.status !== 'published') {
      throw new RepositoryError('conflict', 'Only a published event can be canceled.')
    }
    if (!reason.trim()) {
      throw new RepositoryError('validation', 'Tell people why the event is canceled.')
    }
    const timestamp = this.now().toISOString()
    event.status = 'canceled'
    event.cancellation = { reason: reason.trim(), canceledAt: timestamp }
    event.updatedAt = timestamp
    this.persist(database)
    return this.details(database, event)
  }

  async reopenEvent(id: string): Promise<EventDetails> {
    await this.pause()
    const database = this.load()
    const event = this.managedEvent(database, id)
    if (event.status !== 'canceled') {
      throw new RepositoryError('conflict', 'Only a canceled event can be reopened.')
    }
    if (new Date(event.endsAt) <= this.now()) {
      throw new RepositoryError('conflict', 'This event has already passed. Edit the date first.')
    }
    event.status = 'published'
    event.cancellation = null
    event.updatedAt = this.now().toISOString()
    this.persist(database)
    return this.details(database, event)
  }

  async deleteEvent(id: string): Promise<void> {
    await this.pause()
    const database = this.load()
    this.managedEvent(database, id)
    database.events = database.events.filter((event) => event.id !== id)
    database.rsvps = database.rsvps.filter((rsvp) => rsvp.eventId !== id)
    database.savedEventIds = database.savedEventIds.filter((savedId) => savedId !== id)
    this.persist(database)
  }

  async listEventRsvps(eventId: string): Promise<RsvpWithAttendee[]> {
    await this.pause()
    const database = this.load()
    this.managedEvent(database, eventId)
    return this.rsvpList(database, eventId)
  }

  private rsvpList(database: Database, eventId: string): RsvpWithAttendee[] {
    return database.rsvps
      .filter((rsvp) => rsvp.eventId === eventId && isActive(rsvp))
      .sort(byOldestFirst)
      .map((rsvp) => {
        const attendee = database.attendees.find((a) => a.id === rsvp.attendeeId)
        return {
          ...rsvp,
          attendee: attendee ?? { id: rsvp.attendeeId, name: 'Unknown guest', email: '' },
        }
      })
  }

  async addGuest(eventId: string, input: RsvpInput): Promise<RsvpWithAttendee[]> {
    await this.pause()
    this.checkRsvpInput(input)
    const database = this.load()
    const event = this.managedEvent(database, eventId)
    if (event.status !== 'published') {
      throw new RepositoryError('conflict', 'Publish the event before adding guests.')
    }
    const attendee = this.findOrCreateAttendee(database, input)
    const alreadyOnList = database.rsvps.some(
      (rsvp) => rsvp.eventId === eventId && rsvp.attendeeId === attendee.id && isActive(rsvp),
    )
    if (alreadyOnList) {
      throw new RepositoryError('conflict', `${attendee.name} is already on the list.`)
    }
    this.placeRsvp(database, event, attendee, input.partySize)
    this.persist(database)
    return this.rsvpList(database, eventId)
  }

  private managedRsvp(database: Database, rsvpId: string) {
    const rsvp = database.rsvps.find((r) => r.id === rsvpId && isActive(r))
    if (!rsvp) throw new RepositoryError('not_found', 'This RSVP is no longer on the list.')
    return { rsvp, event: this.managedEvent(database, rsvp.eventId) }
  }

  async removeRsvp(rsvpId: string): Promise<void> {
    await this.pause()
    const database = this.load()
    const { rsvp, event } = this.managedRsvp(database, rsvpId)
    rsvp.status = 'canceled'
    rsvp.updatedAt = this.now().toISOString()
    this.promoteWaitlist(database, event)
    this.persist(database)
  }

  async promoteRsvp(rsvpId: string): Promise<void> {
    await this.pause()
    const database = this.load()
    const { rsvp, event } = this.managedRsvp(database, rsvpId)
    if (rsvp.status !== 'waitlisted') {
      throw new RepositoryError('conflict', 'This person already has a spot.')
    }
    const spotsLeft = event.capacity - this.spotsTaken(database, event.id)
    if (rsvp.partySize > spotsLeft) {
      throw new RepositoryError(
        'conflict',
        `This party needs ${rsvp.partySize} spots and ${spotsLeft} ${spotsLeft === 1 ? 'is' : 'are'} open. Raise capacity first.`,
      )
    }
    rsvp.status = 'going'
    rsvp.updatedAt = this.now().toISOString()
    this.persist(database)
  }

  async resetDemoData(): Promise<void> {
    await this.pause()
    this.store.remove(STORAGE_KEY)
    this.store.remove(CORRUPT_BACKUP_KEY)
    this.cache = null
    this.load()
  }
}
