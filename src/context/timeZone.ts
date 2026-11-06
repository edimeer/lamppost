import { createContext, useContext } from 'react'

export interface TimeZoneContextValue {
  /** The zone every time on screen is shown in. */
  timeZone: string
  /** The zone the device reports. */
  deviceTimeZone: string
  /** True when the visitor picked a zone instead of using the device's. */
  isOverridden: boolean
  setTimeZone: (timeZone: string | null) => void
  openPicker: () => void
}

export const TimeZoneContext = createContext<TimeZoneContextValue | null>(null)

export function useTimeZone(): TimeZoneContextValue {
  const value = useContext(TimeZoneContext)
  if (!value) throw new Error('useTimeZone must be used inside TimeZoneProvider')
  return value
}
