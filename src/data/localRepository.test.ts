import { beforeEach, describe, expect, it } from 'vitest'
import { LocalRepository } from './localRepository'
import { RepositoryError } from './repository'
import { buildSeedDatabase } from './seed'
import { createMemoryStore } from './storage'
import type { EventInput } from './types'

const NOW = new Date('2026-11-04T18:00:00Z') // A Wednesday.

function eventInput(overrides: Partial<EventInput> = {}): EventInput {
  return {
    title: 'Test Picnic',
    description: 'Sandwiches in the park.',
    category: 'food',
    startsAt: '2026-11-20T20:00:00.000Z',
    endsAt: '2026-11-20T22:00:00.000Z',
    timeZone: 'America/Los_Angeles',
    venue: {
      name: 'Test Park',
      street: '1 Main St',
      city: 'Portland',
      region: 'OR',
      postalCode: '97201',
      neighborhood: null,
    },
    onlineUrl: null,
    capacity: 2,
    accessibility: { features: [], notes: '' },
    coverImageUrl: null,
    coverImageAlt: null,
    ...overrides,
  }
}

const guest = (name: string, partySize = 1) => ({
  name,
  email: `${name.toLowerCase()}@example.com`,
  partySize,
})

async function expectCode(promise: Promise<unknown>, code: RepositoryError['code']) {
  await expect(promise).rejects.toSatisfy(
    (error) => error instanceof RepositoryError && error.code === code,
  )
}

describe('LocalRepository', () => {
  let repository: LocalRepository
  let now: Date

  beforeEach(() => {
    now = NOW
    let id = 0
    repository = new LocalRepository({
      store: createMemoryStore(),
      now: () => now,
      generateId: () => `test-${(id += 1)}`,
    })
  })

  describe('seed data', () => {
    it('covers every state a visitor can run into', async () => {
      const managed = await repository.listManagedEvents()
      const statuses = new Set(managed.map((event) => event.status))
      expect(statuses).toEqual(new Set(['draft', 'published', 'canceled']))

      const all = await repository.listEvents({ includePast: true })
      expect(all.some((event) => event.spotsLeft === 0)).toBe(true)
      expect(all.some((event) => new Date(event.endsAt) < now)).toBe(true)
      expect(all.some((event) => event.status === 'canceled')).toBe(true)
    })

    it('never fills past capacity', () => {
      const database = buildSeedDatabase(NOW)
      for (const event of database.events) {
        const going = database.rsvps
          .filter((rsvp) => rsvp.eventId === event.id && rsvp.status === 'going')
          .reduce((sum, rsvp) => sum + rsvp.partySize, 0)
        expect(going, event.title).toBeLessThanOrEqual(event.capacity)
      }
    })

    it('keeps every title within the limit', () => {
      for (const event of buildSeedDatabase(NOW).events) {
        expect(event.title.length, event.title).toBeLessThanOrEqual(120)
      }
    })
  })

  describe('listing and search', () => {
    it('hides drafts and past events by default', async () => {
      const events = await repository.listEvents({})
      expect(events.every((event) => event.status !== 'draft')).toBe(true)
      expect(events.every((event) => new Date(event.endsAt) > now)).toBe(true)
    })

    it('searches title, organizer and location, ignoring case and accents', async () => {
      expect((await repository.listEvents({ search: 'BIKE repair' }))[0].id).toBe('evt-bike-clinic')
      const byOrganizer = await repository.listEvents({ search: 'fern hill makers' })
      expect(byOrganizer.every((e) => e.organizer.name === 'Fern Hill Makers Co-op')).toBe(true)
      expect((await repository.listEvents({ search: 'hood river' })).length).toBeGreaterThan(0)
      const accented = await repository.listEvents({ search: 'spánish' })
      expect(accented.map((event) => event.id)).toContain('evt-spanish-circle')
    })

    it('filters by category, location and availability', async () => {
      const music = await repository.listEvents({ categories: ['music'] })
      expect(music.every((event) => event.category === 'music')).toBe(true)

      const online = await repository.listEvents({ location: 'online' })
      expect(online.length).toBeGreaterThan(0)
      expect(online.every((event) => event.onlineUrl)).toBe(true)

      const camas = await repository.listEvents({ location: 'Camas' })
      expect(camas.every((event) => event.venue?.city === 'Camas')).toBe(true)

      const full = await repository.listEvents({ availability: 'full' })
      expect(full.length).toBeGreaterThan(0)
      expect(full.every((event) => event.spotsLeft === 0)).toBe(true)
    })

    it('filters by date range', async () => {
      const from = '2026-11-14T00:00:00.000Z'
      const to = '2026-11-16T00:00:00.000Z'
      const events = await repository.listEvents({ from, to })
      expect(events.length).toBeGreaterThan(0)
      for (const event of events) {
        expect(event.startsAt < to).toBe(true)
        expect(event.endsAt >= from).toBe(true)
      }
    })
  })

  describe('RSVPs', () => {
    it('takes a spot, then frees it on cancel', async () => {
      const event = await repository.createEvent(eventInput(), { publish: true })
      const going = await repository.submitRsvp(event.id, guest('Jordan', 2))
      expect(going.viewer.rsvp?.status).toBe('going')
      expect(going.spotsLeft).toBe(0)

      const canceled = await repository.cancelRsvp(event.id)
      expect(canceled.viewer.rsvp).toBeNull()
      expect(canceled.spotsLeft).toBe(2)
    })

    it('puts you on the waitlist when your party does not fit', async () => {
      const event = await repository.createEvent(eventInput(), { publish: true })
      await repository.addGuest(event.id, guest('Ada'))
      const result = await repository.submitRsvp(event.id, guest('Jordan', 2))
      expect(result.viewer.rsvp?.status).toBe('waitlisted')
      expect(result.goingCount).toBe(1)
      expect(result.waitlistCount).toBe(2)
    })

    it('moves the waitlist up in order when a spot opens', async () => {
      const event = await repository.createEvent(eventInput({ capacity: 1 }), { publish: true })
      await repository.addGuest(event.id, guest('Ada'))
      await repository.addGuest(event.id, guest('Ben'))
      await repository.addGuest(event.id, guest('Cy'))

      const list = await repository.listEventRsvps(event.id)
      await repository.removeRsvp(list[0].id)

      const updated = await repository.listEventRsvps(event.id)
      expect(updated.map((r) => [r.attendee.name, r.status])).toEqual([
        ['Ben', 'going'],
        ['Cy', 'waitlisted'],
      ])
    })

    it('skips a party that is too big instead of blocking smaller ones', async () => {
      const event = await repository.createEvent(eventInput({ capacity: 1 }), { publish: true })
      await repository.addGuest(event.id, guest('Ada'))
      await repository.addGuest(event.id, guest('Ben', 3))
      await repository.addGuest(event.id, guest('Cy'))

      const list = await repository.listEventRsvps(event.id)
      await repository.removeRsvp(list[0].id)

      const updated = await repository.listEventRsvps(event.id)
      expect(updated.find((r) => r.attendee.name === 'Ben')?.status).toBe('waitlisted')
      expect(updated.find((r) => r.attendee.name === 'Cy')?.status).toBe('going')
    })

    it('rejects a party size change that does not fit', async () => {
      const event = await repository.createEvent(eventInput(), { publish: true })
      await repository.submitRsvp(event.id, guest('Jordan', 1))
      await repository.addGuest(event.id, guest('Ada'))
      await expectCode(repository.submitRsvp(event.id, guest('Jordan', 2)), 'conflict')
    })

    it('refuses RSVPs on canceled and finished events', async () => {
      const event = await repository.createEvent(eventInput(), { publish: true })
      await repository.cancelEvent(event.id, 'Rain')
      await expectCode(repository.submitRsvp(event.id, guest('Jordan')), 'conflict')
      await repository.reopenEvent(event.id)

      now = new Date('2026-12-01T00:00:00Z')
      await expectCode(repository.submitRsvp(event.id, guest('Jordan')), 'conflict')
    })
  })

  describe('capacity', () => {
    it('refuses to drop below the spots already taken', async () => {
      const event = await repository.createEvent(eventInput({ capacity: 5 }), { publish: true })
      await repository.addGuest(event.id, guest('Ada', 3))
      await expectCode(repository.updateCapacity(event.id, 2), 'conflict')
    })

    it('moves the waitlist up when capacity rises', async () => {
      const event = await repository.createEvent(eventInput({ capacity: 1 }), { publish: true })
      await repository.addGuest(event.id, guest('Ada'))
      await repository.addGuest(event.id, guest('Ben'))
      const updated = await repository.updateCapacity(event.id, 2)
      expect(updated.goingCount).toBe(2)
      expect(updated.waitlistCount).toBe(0)
    })
  })

  describe('organizer actions', () => {
    it('runs an event through draft, publish, cancel, reopen and delete', async () => {
      const draft = await repository.createEvent(eventInput(), { publish: false })
      expect(draft.status).toBe('draft')
      expect((await repository.listEvents({ search: 'Test Picnic' })).length).toBe(0)

      const published = await repository.publishEvent(draft.id)
      expect(published.publishedAt).not.toBeNull()
      expect((await repository.listEvents({ search: 'Test Picnic' })).length).toBe(1)

      const canceled = await repository.cancelEvent(draft.id, 'Storm warning')
      expect(canceled.status).toBe('canceled')
      expect(canceled.cancellation?.reason).toBe('Storm warning')

      const reopened = await repository.reopenEvent(draft.id)
      expect(reopened.status).toBe('published')
      expect(reopened.cancellation).toBeNull()

      await repository.deleteEvent(draft.id)
      await expectCode(repository.getEvent(draft.id), 'not_found')
    })

    it('blocks moving an event with RSVPs back to draft', async () => {
      const event = await repository.createEvent(eventInput(), { publish: true })
      await repository.submitRsvp(event.id, guest('Jordan'))
      await expectCode(repository.unpublishEvent(event.id), 'conflict')
    })

    it("does not let you change someone else's event", async () => {
      await expectCode(repository.cancelEvent('evt-bike-clinic', 'Nope'), 'forbidden')
      await expectCode(repository.deleteEvent('evt-bike-clinic'), 'forbidden')
      await expectCode(repository.listEventRsvps('evt-bike-clinic'), 'forbidden')
    })

    it('rejects invalid input even if a form lets it through', async () => {
      await expectCode(
        repository.createEvent(eventInput({ endsAt: '2026-11-20T19:00:00.000Z' }), { publish: true }),
        'validation',
      )
      await expectCode(
        repository.createEvent(eventInput({ venue: null, onlineUrl: null }), { publish: true }),
        'validation',
      )
    })
  })

  describe('saved events', () => {
    it('adds and removes', async () => {
      await repository.saveEvent('evt-bike-clinic')
      expect((await repository.getEvent('evt-bike-clinic')).viewer.saved).toBe(true)
      await repository.unsaveEvent('evt-bike-clinic')
      expect((await repository.getEvent('evt-bike-clinic')).viewer.saved).toBe(false)
    })
  })

  describe('persistence', () => {
    it('survives a reload', async () => {
      const store = createMemoryStore()
      const first = new LocalRepository({ store, now: () => NOW })
      const created = await first.createEvent(eventInput(), { publish: true })
      await first.submitRsvp(created.id, guest('Jordan'))

      const second = new LocalRepository({ store, now: () => NOW })
      const reloaded = await second.getEvent(created.id)
      expect(reloaded.title).toBe('Test Picnic')
      expect(reloaded.viewer.rsvp?.status).toBe('going')
    })

    it('rebuilds from sample data when storage is corrupt', async () => {
      const store = createMemoryStore()
      store.set('lamppost:database', '{not json')
      const recovered = new LocalRepository({ store, now: () => NOW })
      expect((await recovered.listEvents({})).length).toBeGreaterThan(0)
      expect(store.get('lamppost:database:corrupt')).toBe('{not json')
    })
  })
})
