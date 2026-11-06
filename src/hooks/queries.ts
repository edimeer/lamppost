import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { repository } from '../data'
import type { EventInput, EventQuery, ProfileInput, RsvpInput } from '../data/types'

/**
 * Screens read and write through these hooks. React Query keeps a cache of each
 * result and tracks its loading and error state, which is the same job it would
 * do for a real API.
 */
export function useEvents(query: EventQuery) {
  return useQuery({ queryKey: ['events', query], queryFn: () => repository.listEvents(query) })
}

export function useLocations() {
  return useQuery({ queryKey: ['locations'], queryFn: () => repository.listLocations() })
}

export function useEvent(id: string) {
  return useQuery({ queryKey: ['event', id], queryFn: () => repository.getEvent(id) })
}

export function useSession() {
  return useQuery({ queryKey: ['session'], queryFn: () => repository.getSession() })
}

export function useSavedEvents() {
  return useQuery({ queryKey: ['saved'], queryFn: () => repository.listSavedEvents() })
}

export function useMyRsvpEvents() {
  return useQuery({ queryKey: ['my-rsvps'], queryFn: () => repository.listMyRsvpEvents() })
}

export function useManagedEvents() {
  return useQuery({ queryKey: ['managed'], queryFn: () => repository.listManagedEvents() })
}

export function useEventRsvps(eventId: string) {
  return useQuery({
    queryKey: ['rsvps', eventId],
    queryFn: () => repository.listEventRsvps(eventId),
  })
}

/** A change can affect any list, so every write refreshes everything on screen. */
function useWrite<Input, Result>(write: (input: Input) => Promise<Result>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: write,
    onSettled: () => queryClient.invalidateQueries(),
  })
}

export function useSubmitRsvp() {
  return useWrite(({ eventId, input }: { eventId: string; input: RsvpInput }) =>
    repository.submitRsvp(eventId, input),
  )
}

export function useCancelRsvp() {
  return useWrite((eventId: string) => repository.cancelRsvp(eventId))
}

export function useToggleSaved() {
  return useWrite(({ eventId, saved }: { eventId: string; saved: boolean }) =>
    saved ? repository.saveEvent(eventId) : repository.unsaveEvent(eventId),
  )
}

export function useCreateEvent() {
  return useWrite(({ input, publish }: { input: EventInput; publish: boolean }) =>
    repository.createEvent(input, { publish }),
  )
}

export function useUpdateEvent() {
  return useWrite(({ id, input }: { id: string; input: EventInput }) =>
    repository.updateEvent(id, input),
  )
}

export function useUpdateCapacity() {
  return useWrite(({ id, capacity }: { id: string; capacity: number }) =>
    repository.updateCapacity(id, capacity),
  )
}

export function usePublishEvent() {
  return useWrite((id: string) => repository.publishEvent(id))
}

export function useUnpublishEvent() {
  return useWrite((id: string) => repository.unpublishEvent(id))
}

export function useCancelEvent() {
  return useWrite(({ id, reason }: { id: string; reason: string }) =>
    repository.cancelEvent(id, reason),
  )
}

export function useReopenEvent() {
  return useWrite((id: string) => repository.reopenEvent(id))
}

export function useDeleteEvent() {
  return useWrite((id: string) => repository.deleteEvent(id))
}

export function useAddGuest() {
  return useWrite(({ eventId, input }: { eventId: string; input: RsvpInput }) =>
    repository.addGuest(eventId, input),
  )
}

export function useRemoveRsvp() {
  return useWrite((rsvpId: string) => repository.removeRsvp(rsvpId))
}

export function usePromoteRsvp() {
  return useWrite((rsvpId: string) => repository.promoteRsvp(rsvpId))
}

export function useUpdateProfile() {
  return useWrite((input: ProfileInput) => repository.updateProfile(input))
}

export function useResetDemoData() {
  return useWrite(() => repository.resetDemoData())
}
