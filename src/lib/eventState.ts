import type { EventDetails } from '../data/types'
import { pluralize } from './format'

/**
 * One event can be several things at once (published, full, starting soon).
 * The interface needs one answer to "what do I tell the visitor?", so this file
 * ranks them. Every card, stamp and button reads from here.
 */
export type EventState =
  | 'draft'
  | 'canceled'
  | 'past'
  | 'happening'
  | 'full'
  | 'limited'
  | 'open'

type EventTiming = Pick<EventDetails, 'status' | 'startsAt' | 'endsAt' | 'spotsLeft' | 'capacity'>

/** "Filling up" means at most three spots or 15 percent of the room is left. */
export function isLimited(spotsLeft: number, capacity: number): boolean {
  return spotsLeft > 0 && spotsLeft <= Math.max(3, Math.floor(capacity * 0.15))
}

export function getEventState(event: EventTiming, now: Date = new Date()): EventState {
  if (event.status === 'draft') return 'draft'
  if (event.status === 'canceled') return 'canceled'
  if (new Date(event.endsAt) <= now) return 'past'
  if (new Date(event.startsAt) <= now) return 'happening'
  if (event.spotsLeft <= 0) return 'full'
  if (isLimited(event.spotsLeft, event.capacity)) return 'limited'
  return 'open'
}

/** True when the visitor can still claim a spot or join the waitlist. */
export function acceptsRsvps(state: EventState): boolean {
  return state === 'open' || state === 'limited' || state === 'full'
}

export function rsvpButtonLabel(event: EventDetails): string {
  if (event.viewer.rsvp?.status === 'going') return 'Change RSVP'
  if (event.viewer.rsvp?.status === 'waitlisted') return 'Change waitlist request'
  return event.spotsLeft > 0 ? 'RSVP' : 'Join the waitlist'
}

/** What the visitor's RSVP means now, including after the event has closed. */
export function rsvpStatusLabel(event: EventDetails, now: Date = new Date()): string | null {
  const { rsvp } = event.viewer
  if (!rsvp) return null
  const state = getEventState(event, now)
  if (state === 'canceled') return 'You had RSVPed'
  if (state === 'past') return rsvp.status === 'going' ? 'You went' : 'You were on the waitlist'
  return rsvp.status === 'going' ? "You're going" : "You're on the waitlist"
}

/** Availability in words. Pairs with the tear-off tabs so tabs are never the only signal. */
export function availabilityLabel(event: EventDetails, now: Date = new Date()): string {
  const state = getEventState(event, now)
  switch (state) {
    case 'draft':
      return `Not published, room for ${event.capacity.toLocaleString('en-US')}`
    case 'canceled':
      return 'Canceled'
    case 'past':
      return `${pluralize(event.goingCount, 'person', 'people')} went`
    case 'happening':
      return 'Happening now'
    case 'full':
      return event.waitlistCount > 0
        ? `Full, ${event.waitlistCount.toLocaleString('en-US')} on the waitlist`
        : 'Full, waitlist open'
    case 'limited':
      return `Filling up, ${pluralize(event.spotsLeft, 'spot')} left of ${event.capacity.toLocaleString('en-US')}`
    default:
      return `${pluralize(event.spotsLeft, 'spot')} left of ${event.capacity.toLocaleString('en-US')}`
  }
}

/** How many of the tabs on a flyer are still attached. Rounds up so 1 spot shows 1 tab. */
export function tabsRemaining(spotsLeft: number, capacity: number, totalTabs: number): number {
  if (capacity <= 0 || spotsLeft <= 0) return 0
  return Math.min(totalTabs, Math.ceil((spotsLeft / capacity) * totalTabs))
}
