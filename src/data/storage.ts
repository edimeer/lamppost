import { RepositoryError } from './repository'

/**
 * A thin wrapper over localStorage that keeps working when the browser says no.
 * Private windows and strict settings can throw on any access, so a failed
 * check falls back to an in-memory copy that lasts until the tab closes.
 */
export interface KeyValueStore {
  readonly persistent: boolean
  get(key: string): string | null
  set(key: string, value: string): void
  remove(key: string): void
}

class MemoryStore implements KeyValueStore {
  readonly persistent = false
  private values = new Map<string, string>()

  get(key: string) {
    return this.values.get(key) ?? null
  }

  set(key: string, value: string) {
    this.values.set(key, value)
  }

  remove(key: string) {
    this.values.delete(key)
  }
}

class BrowserStore implements KeyValueStore {
  readonly persistent = true
  private storage: Storage

  constructor(storage: Storage) {
    this.storage = storage
  }

  get(key: string) {
    return this.storage.getItem(key)
  }

  set(key: string, value: string) {
    try {
      this.storage.setItem(key, value)
    } catch {
      throw new RepositoryError(
        'storage',
        'Your browser storage is full, so this change was not saved. Clear some site data and try again.',
      )
    }
  }

  remove(key: string) {
    this.storage.removeItem(key)
  }
}

export function createStore(): KeyValueStore {
  try {
    const probe = '__lamppost_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return new BrowserStore(window.localStorage)
  } catch {
    return new MemoryStore()
  }
}

export function createMemoryStore(): KeyValueStore {
  return new MemoryStore()
}
