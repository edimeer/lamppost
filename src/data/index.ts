import { LocalRepository } from './localRepository'
import type { Repository } from './repository'
import { createStore } from './storage'

/**
 * The single place that decides where data comes from. When the Rails API
 * exists, replace this with `new ApiRepository({ baseUrl })` and no screen
 * needs to change.
 */
const localRepository = new LocalRepository({ store: createStore(), latencyMs: 120 })

export const repository: Repository = localRepository

/** Another tab changed the data, so stop trusting the in-memory copy. */
export function refreshFromStorage() {
  localRepository.invalidate()
}
