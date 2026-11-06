import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useBlocker } from 'react-router'
import { useTimeZone } from '../../context/timeZone'
import {
  ACCESSIBILITY_FEATURES,
  EVENT_CATEGORIES,
  type AccessibilityFeature,
  type EventDetails,
  type EventInput,
  type Organizer,
} from '../../data/types'
import { errorMessage } from '../../lib/errors'
import { formToInput, hasValidDateTime, previewEvent } from '../../lib/eventForm'
import {
  ACCESSIBILITY_LABELS,
  CATEGORY_LABELS,
  formatShortDate,
  formatTimeRange,
  formatZoneLabel,
} from '../../lib/format'
import { listTimeZones } from '../../lib/time'
import {
  eventInstants,
  LIMITS,
  validateEventForm,
  type EventFormErrors,
  type EventFormField,
  type EventFormValues,
  type LocationMode,
} from '../../lib/validation'
import { Flyer } from '../events/Flyer'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { SelectField, TextAreaField, TextField } from '../ui/Field'

const LOCATION_MODES: { value: LocationMode; label: string }[] = [
  { value: 'in_person', label: 'In person' },
  { value: 'online', label: 'Online' },
  { value: 'hybrid', label: 'Both' },
]

const FIELD_LABELS: Partial<Record<EventFormField, string>> = {
  title: 'Title',
  description: 'Description',
  category: 'Category',
  date: 'Date',
  startTime: 'Start time',
  endTime: 'End time',
  timeZone: 'Time zone',
  venueName: 'Venue name',
  street: 'Street address',
  city: 'City',
  region: 'State or region',
  postalCode: 'Postal code',
  onlineUrl: 'Online link',
  capacity: 'Capacity',
  coverImageUrl: 'Cover image link',
  coverImageAlt: 'Image description',
}

const fieldId = (field: EventFormField) => `field-${field}`

interface EventFormProps {
  initial: EventFormValues
  /** The event being edited. Absent when creating. */
  event?: EventDetails
  organizer: Organizer
  /** Saves, and publishes too when asked. Resolves once everything is written. */
  onSave: (input: EventInput, publish: boolean) => Promise<void>
  onCancel: () => void
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t-2 border-line px-5 py-5 first:border-t-0">
      <h2 className="mt-0 mb-3 text-2xl">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  )
}

export function EventForm({ initial, event, organizer, onSave, onCancel }: EventFormProps) {
  const { timeZone: viewerZone } = useTimeZone()
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState<EventFormErrors>({})
  const [saveError, setSaveError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const summaryRef = useRef<HTMLDivElement>(null)
  const [summaryFocusRequests, setSummaryFocusRequests] = useState(0)
  const leavingOnPurpose = useRef(false)
  const zones = useMemo(() => listTimeZones(initial.timeZone), [initial.timeZone])

  const isDirty = JSON.stringify(values) !== JSON.stringify(initial)
  const isDraft = !event || event.status === 'draft'

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && !leavingOnPurpose.current && currentLocation.pathname !== nextLocation.pathname,
  )

  // Runs after the summary has rendered, so there is something to focus.
  useEffect(() => {
    if (summaryFocusRequests > 0) summaryRef.current?.focus()
  }, [summaryFocusRequests])

  useEffect(() => {
    if (!isDirty) return
    const warn = (unload: BeforeUnloadEvent) => unload.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [isDirty])

  const set = <Field extends EventFormField>(field: Field, value: EventFormValues[Field]) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  /** The props that wire a text input to its value and error. */
  const bind = (field: EventFormField) => ({
    id: fieldId(field),
    value: values[field] as string,
    error: errors[field],
    onChange: (changed: { target: { value: string } }) =>
      set(field, changed.target.value as EventFormValues[typeof field]),
  })

  const toggleFeature = (feature: AccessibilityFeature) => {
    const list = values.accessibilityFeatures
    set(
      'accessibilityFeatures',
      list.includes(feature) ? list.filter((item) => item !== feature) : [...list, feature],
    )
  }

  const save = async (publish: boolean) => {
    const nextErrors = validateEventForm(values, {
      now: new Date(),
      publishing: publish || event?.status === 'published',
      originalStartsAt: event?.startsAt,
      spotsTaken: event?.goingCount,
    })
    setErrors(nextErrors)
    setSaveError(undefined)
    if (Object.keys(nextErrors).length > 0) {
      setSummaryFocusRequests((count) => count + 1)
      return
    }
    setSaving(true)
    leavingOnPurpose.current = true
    try {
      await onSave(formToInput(values), publish)
    } catch (error) {
      leavingOnPurpose.current = false
      setSaveError(errorMessage(error))
      setSummaryFocusRequests((count) => count + 1)
    } finally {
      setSaving(false)
    }
  }

  const onSubmit = (formEvent: FormEvent) => {
    formEvent.preventDefault()
    // Enter in a text box saves. Publishing only ever comes from its own button.
    void save(false)
  }

  const errorEntries = Object.entries(errors) as [EventFormField, string][]
  const hasErrors = errorEntries.length > 0 || saveError
  const schedule = (() => {
    if (!hasValidDateTime(values)) return null
    const { start, end } = eventInstants(values)
    if (end <= start) return null
    return {
      day: formatShortDate(start.toISOString(), viewerZone),
      range: formatTimeRange(start.toISOString(), end.toISOString(), viewerZone),
    }
  })()

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
      <form onSubmit={onSubmit} noValidate className="min-w-0">
        <div
          ref={summaryRef}
          tabIndex={-1}
          role={hasErrors ? 'alert' : undefined}
          className={hasErrors ? 'sheet mb-4 border-l-8 border-danger p-4' : ''}
        >
          {saveError && <p className="m-0 font-bold text-danger">{saveError}</p>}
          {errorEntries.length > 0 && (
            <>
              <h2 className="m-0 text-xl text-danger">
                Fix {errorEntries.length === 1 ? 'this field' : `these ${errorEntries.length} fields`} to
                continue
              </h2>
              <ul className="mt-2 mb-0 pl-5">
                {errorEntries.map(([field, message]) => (
                  <li key={field}>
                    <a href={`#${fieldId(field)}`} className="font-semibold underline">
                      {FIELD_LABELS[field]}:
                    </a>{' '}
                    {message}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="sheet">
          <FormSection title="The basics">
            <TextField
              {...bind('title')}
              label="Title"
              required
              maxLength={LIMITS.title + 20}
              hint={`${values.title.trim().length} of ${LIMITS.title} characters`}
            />
            <SelectField {...bind('category')} label="Category" required>
              <option value="">Choose a category</option>
              {EVENT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {CATEGORY_LABELS[category]}
                </option>
              ))}
            </SelectField>
            <TextAreaField
              {...bind('description')}
              label="Description"
              required
              rows={6}
              hint="Say what will happen, who it suits, and what to bring."
            />
          </FormSection>

          <FormSection title="Date and time">
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField {...bind('date')} label="Date" type="date" required />
              <TextField {...bind('startTime')} label="Start time" type="time" required />
              <TextField {...bind('endTime')} label="End time" type="time" required />
            </div>
            <label className="flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                className="size-5 accent-ink"
                checked={values.endsNextDay}
                onChange={(changed) => set('endsNextDay', changed.target.checked)}
              />
              Ends the next day
            </label>
            <SelectField
              {...bind('timeZone')}
              label="Event time zone"
              required
              hint="Enter times as they will read on a clock at the event."
            >
              {zones.map((zone) => (
                <option key={zone} value={zone}>
                  {formatZoneLabel(zone)}
                </option>
              ))}
            </SelectField>
            {schedule && (
              <p className="m-0 bg-paper px-3 py-2">
                Anyone in your time zone will see <strong>{schedule.day}</strong>,{' '}
                <strong>{schedule.range}</strong>. Visitors elsewhere see it in their own time.
              </p>
            )}
          </FormSection>

          <FormSection title="Location">
            <fieldset className="m-0 border-0 p-0">
              <legend className="mb-1 p-0 font-bold">How will people attend?</legend>
              <div className="flex flex-wrap gap-2">
                {LOCATION_MODES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    className="chip"
                    aria-pressed={values.locationMode === value}
                    onClick={() => set('locationMode', value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            {values.locationMode !== 'online' && (
              <>
                <TextField {...bind('venueName')} label="Venue name" required autoComplete="organization" />
                <TextField {...bind('street')} label="Street address" required autoComplete="street-address" />
                <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
                  <TextField {...bind('city')} label="City" required autoComplete="address-level2" />
                  <TextField {...bind('region')} label="State or region" required autoComplete="address-level1" />
                  <TextField {...bind('postalCode')} label="Postal code" required autoComplete="postal-code" />
                </div>
                <TextField {...bind('neighborhood')} label="Neighborhood" />
              </>
            )}

            {values.locationMode !== 'in_person' && (
              <TextField
                {...bind('onlineUrl')}
                label="Online link"
                type="url"
                required
                placeholder="https://"
                hint="Only people with a spot see this link."
              />
            )}
          </FormSection>

          <FormSection title="Capacity">
            <TextField
              {...bind('capacity')}
              label="How many people can attend?"
              type="number"
              inputMode="numeric"
              min={Math.max(1, event?.goingCount ?? 1)}
              max={LIMITS.capacity}
              required
              hint={
                event && event.goingCount > 0
                  ? `${event.goingCount.toLocaleString('en-US')} spots are already taken.`
                  : 'Once the event is full, people can join a waitlist.'
              }
            />
          </FormSection>

          <FormSection title="Accessibility">
            <fieldset className="m-0 border-0 p-0">
              <legend className="mb-1 p-0 font-bold">
                What is available? <span className="font-normal text-ink-soft">(optional)</span>
              </legend>
              <div className="grid gap-x-4 sm:grid-cols-2">
                {ACCESSIBILITY_FEATURES.map((feature) => (
                  <label key={feature} className="flex min-h-11 items-center gap-2">
                    <input
                      type="checkbox"
                      className="size-5 accent-ink"
                      checked={values.accessibilityFeatures.includes(feature)}
                      onChange={() => toggleFeature(feature)}
                    />
                    {ACCESSIBILITY_LABELS[feature]}
                  </label>
                ))}
              </div>
            </fieldset>
            <TextAreaField
              {...bind('accessibilityNotes')}
              label="Access notes"
              rows={3}
              hint="Anything that helps people plan: entrances, lighting, noise, where to park."
            />
          </FormSection>

          <FormSection title="Cover image">
            <TextField
              {...bind('coverImageUrl')}
              label="Image link"
              type="url"
              placeholder="https://"
              hint="Leave this empty and your flyer gets poster art for its category."
            />
            {values.coverImageUrl.trim() && (
              <TextField {...bind('coverImageAlt')} label="Image description" required />
            )}
          </FormSection>

          <div className="sticky bottom-16 z-10 flex flex-col-reverse gap-2 border-t-2 border-line bg-white px-5 py-3 sm:flex-row sm:justify-end md:bottom-0">
            <button type="button" className="btn btn-ghost" onClick={onCancel}>
              Cancel
            </button>
            {isDraft ? (
              <>
                <button type="submit" className="btn btn-secondary" disabled={saving}>
                  Save draft
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={saving}
                  onClick={() => void save(true)}
                >
                  Publish event
                </button>
              </>
            ) : (
              <button type="submit" className="btn btn-primary" disabled={saving}>
                Save changes
              </button>
            )}
          </div>
        </div>
      </form>

      <aside aria-label="Flyer preview" className="hidden lg:sticky lg:top-4 lg:block">
        <h2 className="mt-0 mb-4 text-xl">Flyer preview</h2>
        <Flyer event={previewEvent(values, organizer)} preview headingLevel="h3" />
      </aside>

      {blocker.state === 'blocked' && (
        <ConfirmDialog
          title="Leave without saving?"
          confirmLabel="Discard changes"
          cancelLabel="Keep editing"
          danger
          onClose={() => blocker.reset()}
          onConfirm={() => blocker.proceed()}
        >
          The changes you made to this event will be lost.
        </ConfirmDialog>
      )}
    </div>
  )
}
