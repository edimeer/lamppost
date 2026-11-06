import { RepositoryError } from '../data/repository'

/** Turns anything thrown into a sentence the visitor can act on. */
export function errorMessage(error: unknown): string {
  if (error instanceof RepositoryError) return error.message
  return 'Something went wrong while loading your data. Reload the page and try again.'
}

export function isNotFound(error: unknown): boolean {
  return error instanceof RepositoryError && error.code === 'not_found'
}
