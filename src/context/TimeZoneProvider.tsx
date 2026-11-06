import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { TimeZoneDialog } from '../components/events/TimeZoneDialog'
import { detectTimeZone, isValidTimeZone } from '../lib/time'
import { TimeZoneContext } from './timeZone'

/** A display preference for this browser, so it sits outside the repository. */
const STORAGE_KEY = 'lamppost:time-zone'

function readStoredZone(): string | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored && isValidTimeZone(stored) ? stored : null
  } catch {
    return null
  }
}

function writeStoredZone(timeZone: string | null) {
  try {
    if (timeZone) window.localStorage.setItem(STORAGE_KEY, timeZone)
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // The choice still applies for this visit.
  }
}

export function TimeZoneProvider({ children }: { children: ReactNode }) {
  const [deviceTimeZone] = useState(detectTimeZone)
  const [override, setOverride] = useState(readStoredZone)
  const [pickerOpen, setPickerOpen] = useState(false)

  const setTimeZone = useCallback((timeZone: string | null) => {
    setOverride(timeZone)
    writeStoredZone(timeZone)
  }, [])

  const openPicker = useCallback(() => setPickerOpen(true), [])

  const value = useMemo(
    () => ({
      timeZone: override ?? deviceTimeZone,
      deviceTimeZone,
      isOverridden: override !== null && override !== deviceTimeZone,
      setTimeZone,
      openPicker,
    }),
    [override, deviceTimeZone, setTimeZone, openPicker],
  )

  return (
    <TimeZoneContext.Provider value={value}>
      {children}
      {pickerOpen && <TimeZoneDialog onClose={() => setPickerOpen(false)} />}
    </TimeZoneContext.Provider>
  )
}
