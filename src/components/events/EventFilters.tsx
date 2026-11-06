import { Check } from 'lucide-react'
import type { CSSProperties } from 'react'
import { EVENT_CATEGORIES, type AvailabilityFilter, type LocationOption } from '../../data/types'
import {
  AVAILABILITY_LABELS,
  DATE_PRESET_LABELS,
  hasCustomRangeError,
  type DatePreset,
  type DiscoverFilters,
} from '../../lib/filters'
import { CATEGORY_SHORT_LABELS } from '../../lib/format'
import { SelectField, TextField } from '../ui/Field'
import { CATEGORY_STOCK } from './categoryStyle'

interface EventFiltersProps {
  filters: DiscoverFilters
  locations: LocationOption[]
  onChange: (changes: Partial<DiscoverFilters>) => void
  /** Stacks everything in one column for the phone filter sheet. */
  stacked?: boolean
}

function PastToggle({ filters, onChange }: Pick<EventFiltersProps, 'filters' | 'onChange'>) {
  return (
    <label className="flex min-h-11 items-center gap-2 font-semibold md:self-end">
      <input
        type="checkbox"
        className="size-5 accent-ink"
        checked={filters.includePast}
        onChange={(event) => onChange({ includePast: event.target.checked })}
      />
      Include past events
    </label>
  )
}

export function EventFilters({ filters, locations, onChange, stacked = false }: EventFiltersProps) {
  const calendarOpen = filters.view === 'calendar'
  const rangeError = hasCustomRangeError(filters)

  // A shared link might name a town with no upcoming events, so keep it selectable.
  const hasLocation = !filters.location || locations.some((l) => l.value === filters.location)

  return (
    <div className={`flex flex-col ${stacked ? 'gap-4' : 'gap-3'}`}>
      <fieldset className="m-0 border-0 p-0">
        <legend className={stacked ? 'mb-1 p-0 font-bold' : 'sr-only'}>Category</legend>
        <div className="flex flex-wrap gap-2">
          {EVENT_CATEGORIES.map((category) => {
            const pressed = filters.categories.includes(category)
            return (
              <button
                key={category}
                type="button"
                className="paper-chip"
                aria-pressed={pressed}
                style={{ '--stock': CATEGORY_STOCK[category] } as CSSProperties}
                onClick={() =>
                  onChange({
                    categories: pressed
                      ? filters.categories.filter((c) => c !== category)
                      : [...filters.categories, category],
                  })
                }
              >
                {pressed ? (
                  <Check aria-hidden className="size-4" />
                ) : (
                  <span aria-hidden className="paper-chip-swatch" />
                )}
                {CATEGORY_SHORT_LABELS[category]}
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className={stacked ? 'flex flex-col gap-4' : 'grid items-start gap-4 md:grid-cols-4'}>
        {calendarOpen ? (
          <p className="m-0 self-end text-[0.9375rem] md:pb-2">
            Dates follow the month shown in the calendar.
          </p>
        ) : (
          <SelectField
            label="Date"
            required
            value={filters.when}
            onChange={(event) => onChange({ when: event.target.value as DatePreset })}
          >
            {Object.entries(DATE_PRESET_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>
        )}

        <SelectField
          label="Location"
          required
          value={filters.location}
          onChange={(event) => onChange({ location: event.target.value })}
        >
          <option value="">All locations</option>
          {locations.map((location) => (
            <option key={location.value} value={location.value}>
              {location.label} ({location.eventCount})
            </option>
          ))}
          {!hasLocation && <option value={filters.location}>{filters.location}</option>}
        </SelectField>

        <SelectField
          label="Availability"
          required
          value={filters.availability}
          onChange={(event) => onChange({ availability: event.target.value as AvailabilityFilter })}
        >
          {Object.entries(AVAILABILITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>

        {!calendarOpen && !stacked && <PastToggle filters={filters} onChange={onChange} />}
      </div>

      {!calendarOpen && filters.when === 'custom' && (
        <div className={stacked ? 'flex flex-col gap-4' : 'sheet grid gap-4 p-4 sm:grid-cols-2 md:max-w-xl'}>
          <TextField
            label="From"
            type="date"
            value={filters.from}
            max={filters.to || undefined}
            onChange={(event) => onChange({ from: event.target.value })}
          />
          <TextField
            label="To"
            type="date"
            value={filters.to}
            min={filters.from || undefined}
            error={rangeError ? 'The end date must be on or after the start date.' : undefined}
            onChange={(event) => onChange({ to: event.target.value })}
          />
        </div>
      )}

      {!calendarOpen && stacked && <PastToggle filters={filters} onChange={onChange} />}
    </div>
  )
}
