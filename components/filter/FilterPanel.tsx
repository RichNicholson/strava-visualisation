'use client'

import { useMemo } from 'react'
import type { FilterState, StravaActivity } from '../../lib/strava/types'
import { getSportTypes, getDateBounds, getHeartRateBounds } from '../../lib/analysis/filter'
import { RangeSlider } from './RangeSlider'
import { PaceFilterRow } from './PaceFilterRow'
import { FilterPresets } from './FilterPresets'

interface FilterPanelProps {
  filter: FilterState
  onChange: (filter: FilterState) => void
  allActivities: StravaActivity[]
  filteredCount: number
}

// Distance slider constants (metres). The usable range is 0–100 km.
// One extra step beyond 100 km acts as a sentinel meaning "no upper limit".
const DIST_STEP = 1000           // 1 km
const DIST_MIN = 0
const DIST_MAX = 100 * 1000      // 100 km
const DIST_SLIDER_MAX = DIST_MAX + DIST_STEP  // 101 km — sentinel position
const DIST_NO_MAX = Number.MAX_SAFE_INTEGER
const TEN_K_DIST = 10_500      // 10 km + tolerance for slightly long runs
const MARATHON_DIST = 45_000   // marathon + tolerance for slightly long efforts

const DATE_PRESETS: { label: string; months: number | null }[] = [
  { label: '6 mo', months: 6 },
  { label: '1 yr', months: 12 },
  { label: '2 yr', months: 24 },
  { label: 'All', months: null },
]

function formatDistance(metres: number): string {
  if (metres >= DIST_SLIDER_MAX) return '100+ km'
  return `${(metres / 1000).toFixed(1)} km`
}

function parseDistance(raw: string): number | null {
  const km = parseFloat(raw.replace(/km/i, '').trim())
  if (isNaN(km)) return null
  return km * 1000
}

function formatDateInput(v: number): string {
  return new Date(v).toISOString().slice(0, 10)
}

function parseDateInput(raw: string): number | null {
  const d = new Date(raw)
  if (isNaN(d.getTime())) return null
  return d.getTime()
}

export function FilterPanel({ filter, onChange, allActivities, filteredCount }: FilterPanelProps) {
  const sportTypes = useMemo(() => getSportTypes(allActivities), [allActivities])
  // Compute distance/date bounds only for the selected sport types so sliders
  // reflect the actual range of the filtered activity type.
  const sportFilteredActivities = useMemo(
    () =>
      filter.sport.length > 0
        ? allActivities.filter((a) => filter.sport.includes(a.sport_type || a.type))
        : allActivities,
    [allActivities, filter.sport]
  )
  const dateBounds = useMemo(() => getDateBounds(sportFilteredActivities), [sportFilteredActivities])
  const hrBounds = useMemo(() => getHeartRateBounds(sportFilteredActivities), [sportFilteredActivities])

  function setDateRange(range: [number, number]) {
    const from = new Date(range[0]).toISOString()
    const to = new Date(range[1]).toISOString()
    onChange({ ...filter, dateRange: { from, to } })
  }

  function setDistRange(range: [number, number]) {
    const effectiveMax = range[1] >= DIST_SLIDER_MAX ? DIST_NO_MAX : range[1]
    onChange({ ...filter, distanceRange: { min: range[0], max: effectiveMax } })
  }

  function toggleSport(sport: string) {
    const current = filter.sport.length === 0 ? sportTypes : filter.sport
    const next = current.includes(sport)
      ? current.filter((s) => s !== sport)
      : [...current, sport]
    // Normalise "all sports explicitly selected" back to [] (the "no filter" sentinel).
    // Never allow an empty selection — ignore the click if it would leave nothing checked.
    if (next.length === 0) return
    const normalised = next.length === sportTypes.length ? [] : next
    onChange({ ...filter, sport: normalised })
  }

  function resetFilter() {
    onChange({ dateRange: null, distanceRange: null, sport: [], pace: { average: { min: 3 * 60, max: 10 * 60 } }, heartrate: null })
  }

  function setDatePreset(months: number | null) {
    if (months === null) {
      onChange({ ...filter, dateRange: null })
      return
    }
    const from = new Date()
    from.setMonth(from.getMonth() - months)
    from.setHours(0, 0, 0, 0)
    const to = new Date()
    to.setHours(23, 59, 59, 999)
    onChange({ ...filter, dateRange: { from: from.toISOString(), to: to.toISOString() } })
  }

  function isDatePresetActive(months: number | null): boolean {
    if (months === null) return filter.dateRange === null
    if (!filter.dateRange) return false
    const expected = new Date()
    expected.setMonth(expected.getMonth() - months)
    // Compare at day granularity — preset is active if from-date matches today - N months
    return new Date(filter.dateRange.from).toDateString() === expected.toDateString()
  }

  const isTenKPresetActive = filter.distanceRange?.min === 0 && filter.distanceRange?.max === TEN_K_DIST
  const isMarathonPresetActive = filter.distanceRange?.min === 0 && filter.distanceRange?.max === MARATHON_DIST

  const dateMin = new Date(dateBounds.min).getTime()
  const dateMax = new Date(dateBounds.max).getTime()
  const currentDateRange: [number, number] = filter.dateRange
    ? [new Date(filter.dateRange.from).getTime(), new Date(filter.dateRange.to).getTime()]
    : [dateMin, dateMax]

  const currentDistRange: [number, number] = filter.distanceRange
    ? [
        filter.distanceRange.min,
        filter.distanceRange.max >= DIST_SLIDER_MAX ? DIST_SLIDER_MAX : filter.distanceRange.max,
      ]
    : [DIST_MIN, DIST_MAX]

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">
          Filters
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({filteredCount} / {allActivities.length})
          </span>
        </h2>
        <button
          onClick={resetFilter}
          className="text-xs text-orange-500 hover:text-orange-600 underline"
        >
          Reset
        </button>
      </div>

      {/* Sport types */}
      {sportTypes.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sport</p>
          <details className="relative group">
            <summary className="flex items-center justify-between cursor-pointer select-none rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:border-orange-300 list-none">
              <span className="truncate">
                {filter.sport.length === 0
                  ? 'All sports'
                  : filter.sport.length <= 2
                  ? filter.sport.join(', ')
                  : `${filter.sport.length} selected`}
              </span>
              <svg className="ml-2 h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </summary>
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
              {sportTypes.map((sport) => (
                <label
                  key={sport}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-orange-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={filter.sport.length === 0 || filter.sport.includes(sport)}
                    onChange={() => toggleSport(sport)}
                    className="accent-orange-500"
                  />
                  {sport}
                </label>
              ))}
            </div>
          </details>
        </div>
      )}

      {/* Date range */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date range</p>
        <div className="grid grid-cols-4 gap-1">
          {DATE_PRESETS.map(({ label, months }) => (
            <button
              key={label}
              onClick={() => setDatePreset(months)}
              className={`py-0.5 text-xs rounded border transition-colors text-center ${
                isDatePresetActive(months)
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'border-gray-300 text-gray-500 hover:border-orange-400 hover:text-orange-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <RangeSlider
          min={dateMin}
          max={dateMax}
          step={(dateMax - dateMin) / 200}
          value={currentDateRange}
          onChange={setDateRange}
          formatValue={formatDateInput}
          parseValue={parseDateInput}
        />
      </div>

      {/* Distance range */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Distance</p>
        <div className="flex gap-1.5">
          <button
            onClick={() => onChange({ ...filter, distanceRange: { min: 0, max: TEN_K_DIST } })}
            className={`px-2 py-0.5 text-xs rounded border transition-colors ${
              isTenKPresetActive
                ? 'bg-orange-500 text-white border-orange-500'
                : 'border-gray-300 text-gray-500 hover:border-orange-400 hover:text-orange-600'
            }`}
          >
            &lt; 10k
          </button>
          <button
            onClick={() => onChange({ ...filter, distanceRange: { min: 0, max: MARATHON_DIST } })}
            className={`px-2 py-0.5 text-xs rounded border transition-colors ${
              isMarathonPresetActive
                ? 'bg-orange-500 text-white border-orange-500'
                : 'border-gray-300 text-gray-500 hover:border-orange-400 hover:text-orange-600'
            }`}
          >
            &lt; Marathon
          </button>
        </div>
        <RangeSlider
          min={DIST_MIN}
          max={DIST_SLIDER_MAX}
          step={DIST_STEP}
          value={currentDistRange}
          onChange={setDistRange}
          formatValue={formatDistance}
          parseValue={parseDistance}
        />
      </div>

      {/* Pace */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pace</p>
        <PaceFilterRow
          pace={filter.pace}
          onChange={(pace) => onChange({ ...filter, pace })}
        />
      </div>

      {/* Presets */}
      <FilterPresets
        currentFilter={filter}
        onLoad={onChange}
      />

      {/* Heart rate */}
      {hrBounds && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Heart Rate</p>
          <RangeSlider
            min={hrBounds.min}
            max={hrBounds.max}
            step={1}
            value={[
              filter.heartrate?.min ?? hrBounds.min,
              filter.heartrate?.max ?? hrBounds.max,
            ]}
            onChange={([min, max]) =>
              onChange({
                ...filter,
                heartrate: { min, max, includeNoHR: filter.heartrate?.includeNoHR ?? true },
              })
            }
            formatValue={(v) => `${Math.round(v)} bpm`}
            parseValue={(raw) => { const n = parseInt(raw); return isNaN(n) ? null : n }}
          />
          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filter.heartrate?.includeNoHR ?? true}
              onChange={(e) =>
                onChange({
                  ...filter,
                  heartrate: {
                    min: filter.heartrate?.min ?? hrBounds.min,
                    max: filter.heartrate?.max ?? hrBounds.max,
                    includeNoHR: e.target.checked,
                  },
                })
              }
              className="accent-orange-500"
            />
            Include runs without heart rate data
          </label>
        </div>
      )}
    </div>
  )
}
