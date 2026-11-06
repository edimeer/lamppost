import { useMemo, useState, type FormEvent } from 'react'
import { useTimeZone } from '../../context/timeZone'
import { formatShortDate, formatTime, formatZoneLabel } from '../../lib/format'
import { isValidTimeZone, listTimeZones } from '../../lib/time'
import { Dialog } from '../ui/Dialog'
import { TextField } from '../ui/Field'

export function TimeZoneDialog({ onClose }: { onClose: () => void }) {
  const { timeZone, deviceTimeZone, isOverridden, setTimeZone } = useTimeZone()
  const [useDevice, setUseDevice] = useState(!isOverridden)
  const [custom, setCustom] = useState(isOverridden ? timeZone : '')
  const [error, setError] = useState<string>()
  const zones = useMemo(() => listTimeZones(timeZone, deviceTimeZone), [timeZone, deviceTimeZone])

  const candidate = custom.trim().replaceAll(' ', '_')
  const customIsValid = isValidTimeZone(candidate)
  const previewZone = useDevice ? deviceTimeZone : customIsValid ? candidate : null
  const [now] = useState(() => new Date())

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (useDevice) {
      setTimeZone(null)
      onClose()
    } else if (customIsValid) {
      setTimeZone(candidate)
      onClose()
    } else {
      setError('Choose a time zone from the list, such as Europe/Paris.')
    }
  }

  return (
    <Dialog title="Show event times in" onClose={onClose}>
      <form onSubmit={onSubmit} noValidate>
        <p className="mt-0">
          Every time on Lamppost is converted to this zone. Event pages also show the local time at
          the venue when it is different.
        </p>
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="sr-only">Time zone source</legend>
          <label className="flex min-h-11 items-center gap-2">
            <input
              type="radio"
              name="zone-source"
              className="size-5 accent-ink"
              checked={useDevice}
              onChange={() => setUseDevice(true)}
            />
            <span>
              <strong>My device's time zone</strong>
              <br />
              {formatZoneLabel(deviceTimeZone, now)}
            </span>
          </label>
          <label className="flex min-h-11 items-center gap-2">
            <input
              type="radio"
              name="zone-source"
              className="size-5 accent-ink"
              checked={!useDevice}
              onChange={() => setUseDevice(false)}
            />
            <strong>A different time zone</strong>
          </label>
        </fieldset>

        {!useDevice && (
          <div className="mt-2">
            <TextField
              label="Time zone"
              required
              list="time-zone-options"
              value={custom}
              autoComplete="off"
              placeholder="Start typing a city, like Paris"
              error={error}
              onChange={(event) => {
                setCustom(event.target.value)
                setError(undefined)
              }}
            />
            <datalist id="time-zone-options">
              {zones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </datalist>
          </div>
        )}

        {previewZone && (
          <p className="mt-3 mb-0 bg-paper px-3 py-2" aria-live="polite">
            It is <strong>{formatTime(now.toISOString(), previewZone)}</strong> on{' '}
            {formatShortDate(now.toISOString(), previewZone)} in {formatZoneLabel(previewZone, now)}.
          </p>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Keep current zone
          </button>
          <button type="submit" className="btn btn-primary">
            Use this time zone
          </button>
        </div>
      </form>
    </Dialog>
  )
}
