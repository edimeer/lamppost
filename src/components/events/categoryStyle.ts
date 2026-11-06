import type { EventCategory } from '../../data/types'

/** Each category has its own paper stock, like a stack of colored copier paper. */
export const CATEGORY_STOCK: Record<EventCategory, string> = {
  music: 'var(--color-stock-lilac)',
  food: 'var(--color-stock-butter)',
  arts: 'var(--color-stock-blush)',
  outdoors: 'var(--color-stock-mint)',
  family: 'var(--color-stock-peach)',
  learning: 'var(--color-stock-sky)',
  volunteering: 'var(--color-stock-lime)',
  wellness: 'var(--color-stock-aqua)',
  neighborhood: 'var(--color-stock-white)',
}

/** A small stable number from a string, so an event keeps the same look. */
export function hashString(text: string): number {
  let hash = 0
  for (let index = 0; index < text.length; index += 1) {
    hash = (Math.imul(hash, 31) + text.charCodeAt(index)) | 0
  }
  return Math.abs(hash)
}

/**
 * Real noticeboards mix pictures with flyers that are nothing but big type, so
 * about a third of the events without a cover image go type-only.
 */
export function isTypeOnlyFlyer(id: string, hasCover: boolean): boolean {
  return !hasCover && hashString(id) % 3 === 0
}

/** A slight lean, as if each flyer was put up by a different hand. */
export function flyerTilt(id: string): string {
  const steps = [-1.1, -0.7, -0.35, 0.35, 0.7, 1.1]
  return `${steps[hashString(id) % steps.length]}deg`
}
