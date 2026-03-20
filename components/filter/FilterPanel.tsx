'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { FilterState, StravaActivity } from '../../lib/strava/types'
import { getSportTypes, getDateBounds, getHeartRateBounds, getElevationGainBounds, getSufferScoreBounds, getMovingTimeBounds, getElapsedTimeBounds } from '../../lib/analysis/filter'
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

// Optional filters that can be added/removed by the user
const OPTIONAL_FILTER_DEFS = [
  { key: 'heartrate' as const, label: 'Heart Rate' },
  { key: 'elevationGain' as const, label: 'Elevation Gain' },
  { key: 'sufferScore' as const, label: 'Suffer Score' },
  { key: 'movingTime' as const, label: 'Moving Time' },
  { key: 'elapsedTime' as const, label: 'Elapsed Time' },
] satisfies { key: keyof FilterState; label: string }[]

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function parseDuration(raw: string): number | null {
  // Accept "Xh Ym", "Xh", "Ym", or plain minutes
  const hm = raw.match(/(\d+)h\s*(\d*)m?/)
  if (hm) return parseInt(hm[1]) * 3600 + (parseInt(hm[2]) || 0) * 60
  const m = raw.match(/(\d+)\s*m/)
  if (m) return parseInt(m[1]) * 60
  const plain = parseInt(raw)
  return isNaN(plain) ? null : plain * 60
}

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
  const sportDetailsRef = useRef<HTMLDetailsElement>(null)
  const addFilterRef = useRef<HTMLDetailsElement>(null)

  // Track which optional filters are currently shown.
  // Pre-populate with any that already have a non-null value in the filter state.
  const [activeOptionals, setActiveOptionals] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    if (filter.heartrate !== null) initial.add('heartrate')
    if (filter.elevationGain !== null) initial.add('elevationGain')
    if (filter.sufferScore !== null) initial.add('sufferScore')
    if (filter.movingTime !== null) initial.add('movingTime')
    if (filter.elapsedTime !== null) initial.add('elapsedTime')
    return initial
  })

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sportDetailsRef.current && !sportDetailsRef.current.contains(e.target as Node)) {
        sportDetailsRef.current.open = false
      }
      if (addFilterRef.current && !addFilterRef.current.contains(e.target as Node)) {
        addFilterRef.current.open = false
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
  const elevBounds = useMemo(() => getElevationGainBounds(sportFilteredActivities), [sportFilteredActivities])
  const sufferBounds = useMemo(() => getSufferScoreBounds(sportFilteredActivities), [sportFilteredActivities])
  const movingTimeBounds = useMemo(() => getMovingTimeBounds(sportFilteredActivities), [sportFilteredActivities])
  const elapsedTimeBounds = useMemo(() => getElapsedTimeBounds(sportFilteredActivities), [sportFilteredActivities])

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
    setActiveOptionals(new Set())
    onChange({ dateRange: null, distanceRange: null, sport: [], pace: { average: { min: 3 * 60, max: 10 * 60 } }, heartrate: null, elevationGain: null, sufferScore: null, movingTime: null, elapsedTime: null })
  }

  function addOptionalFilter(key: string) {
    setActiveOptionals((prev) => new Set([...prev, key]))
    if (addFilterRef.current) addFilterRef.current.open = false
  }

  function removeOptionalFilter(key: string) {
    setActiveOptionals((prev) => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
    if (key === 'heartrate') onChange({ ...filter, heartrate: null })
    else if (key === 'elevationGain') onChange({ ...filter, elevationGain: null })
    else if (key === 'sufferScore') onChange({ ...filter, sufferScore: null })
    else if (key === 'movingTime') onChange({ ...filter, movingTime: null })
    else if (key === 'elapsedTime') onChange({ ...filter, elapsedTime: null })
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

  const isAllDistanceActive = filter.distanceRange === null
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
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">
          Filters
          <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
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

      {/* ── Presets ─────────────────────────────────────────────── */}
      <hr className="border-t border-gray-200 dark:border-gray-600" />
      <div>
        <FilterPresets
          currentFilter={filter}
          onLoad={onChange}
        />
      </div>

      {/* ── Sport ───────────────────────────────────────────────── */}
      {sportTypes.length > 0 && (
        <>
          <hr className="border-t border-gray-200 dark:border-gray-600" />
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Sport</p>
            <details ref={sportDetailsRef} className="relative group">
              <summary className="flex items-center justify-between cursor-pointer select-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-100 hover:border-orange-300 list-none">
                <span className="truncate">
                  {filter.sport.length === 0
                    ? 'All sports'
                    : filter.sport.length <= 2
                    ? filter.sport.join(', ')
                    : `${filter.sport.length} selected`}
                </span>
                <svg className="ml-2 h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </summary>
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-lg max-h-48 overflow-y-auto">
                {sportTypes.map((sport) => (
                  <label
                    key={sport}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-orange-50 cursor-pointer"
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
        </>
      )}

      {/* ── Filters (Date / Distance / Pace / HR) ───────────────── */}
      <hr className="border-t border-gray-200 dark:border-gray-600" />
      <div className="space-y-4">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Filters</p>

        {/* Date range */}
        <div className="space-y-1.5">
          <p className="text-xs text-gray-500 dark:text-gray-400">Date range</p>
          <div className="grid grid-cols-4 gap-1">
            {DATE_PRESETS.map(({ label, months }) => (
              <button
                key={label}
                onClick={() => setDatePreset(months)}
                className={`py-0.5 text-xs rounded border transition-colors text-center ${
                  isDatePresetActive(months)
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-orange-400 hover:text-orange-600'
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
          <p className="text-xs text-gray-500 dark:text-gray-400">Distance</p>
          <div className="flex gap-1.5">
            <button
              onClick={() => onChange({ ...filter, distanceRange: { min: 0, max: TEN_K_DIST } })}
              className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                isTenKPresetActive
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-orange-400 hover:text-orange-600'
              }`}
            >
              &lt; 10k
            </button>
            <button
              onClick={() => onChange({ ...filter, distanceRange: { min: 0, max: MARATHON_DIST } })}
              className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                isMarathonPresetActive
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-orange-400 hover:text-orange-600'
              }`}
            >
              &lt; Marathon
            </button>
            <button
              onClick={() => onChange({ ...filter, distanceRange: null })}
              className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                isAllDistanceActive
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-orange-400 hover:text-orange-600'
              }`}
            >
              All
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
          <p className="text-xs text-gray-500 dark:text-gray-400">Pace</p>
          <PaceFilterRow
            pace={filter.pace}
            onChange={(pace) => onChange({ ...filter, pace })}
          />
        </div>

        {/* Active optional filters */}
        {activeOptionals.has('elevationGain') && elevBounds && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">Elevation Gain</p>
              <button
                onClick={() => removeOptionalFilter('elevationGain')}
                aria-label="Remove elevation gain filter"
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 leading-none"
              >
                ×
              </button>
            </div>
            <RangeSlider
              min={elevBounds.min}
              max={elevBounds.max}
              step={1}
              value={[
                filter.elevationGain?.min ?? elevBounds.min,
                filter.elevationGain?.max ?? elevBounds.max,
              ]}
              onChange={([min, max]) => onChange({ ...filter, elevationGain: { min, max } })}
              formatValue={(v) => `${Math.round(v)} m`}
              parseValue={(raw) => { const n = parseFloat(raw); return isNaN(n) ? null : n }}
            />
          </div>
        )}

        {activeOptionals.has('sufferScore') && sufferBounds && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">Suffer Score</p>
              <button
                onClick={() => removeOptionalFilter('sufferScore')}
                aria-label="Remove suffer score filter"
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 leading-none"
              >
                ×
              </button>
            </div>
            <RangeSlider
              min={sufferBounds.min}
              max={sufferBounds.max}
              step={1}
              value={[
                filter.sufferScore?.min ?? sufferBounds.min,
                filter.sufferScore?.max ?? sufferBounds.max,
              ]}
              onChange={([min, max]) => onChange({ ...filter, sufferScore: { min, max } })}
              formatValue={(v) => `${Math.round(v)}`}
              parseValue={(raw) => { const n = parseInt(raw); return isNaN(n) ? null : n }}
            />
          </div>
        )}

        {activeOptionals.has('movingTime') && movingTimeBounds && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">Moving Time</p>
              <button
                onClick={() => removeOptionalFilter('movingTime')}
                aria-label="Remove moving time filter"
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 leading-none"
              >
                ×
              </button>
            </div>
            <RangeSlider
              min={movingTimeBounds.min}
              max={movingTimeBounds.max}
              step={60}
              value={[
                filter.movingTime?.min ?? movingTimeBounds.min,
                filter.movingTime?.max ?? movingTimeBounds.max,
              ]}
              onChange={([min, max]) => onChange({ ...filter, movingTime: { min, max } })}
              formatValue={formatDuration}
              parseValue={parseDuration}
            />
          </div>
        )}

        {activeOptionals.has('elapsedTime') && elapsedTimeBounds && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">Elapsed Time</p>
              <button
                onClick={() => removeOptionalFilter('elapsedTime')}
                aria-label="Remove elapsed time filter"
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 leading-none"
              >
                ×
              </button>
            </div>
            <RangeSlider
              min={elapsedTimeBounds.min}
              max={elapsedTimeBounds.max}
              step={60}
              value={[
                filter.elapsedTime?.min ?? elapsedTimeBounds.min,
                filter.elapsedTime?.max ?? elapsedTimeBounds.max,
              ]}
              onChange={([min, max]) => onChange({ ...filter, elapsedTime: { min, max } })}
              formatValue={formatDuration}
              parseValue={parseDuration}
            />
          </div>
        )}

        {activeOptionals.has('heartrate') && hrBounds && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">Heart Rate</p>
              <button
                onClick={() => removeOptionalFilter('heartrate')}
                aria-label="Remove heart rate filter"
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 leading-none"
              >
                ×
              </button>
            </div>
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
            <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 cursor-pointer select-none">
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

        {/* Add filter button */}
        {OPTIONAL_FILTER_DEFS.some((f) => !activeOptionals.has(f.key)) && (
          <details ref={addFilterRef} className="relative">
            <summary className="flex items-center gap-1 cursor-pointer select-none list-none text-xs text-orange-500 hover:text-orange-600 w-fit">
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add filter
            </summary>
            <div className="absolute z-10 mt-1 min-w-[140px] rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-lg">
              {OPTIONAL_FILTER_DEFS.filter((f) => !activeOptionals.has(f.key)).map((f) => (
                <button
                  key={f.key}
                  onClick={() => addOptionalFilter(f.key)}
                  className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-orange-50"
                >
                  {f.label}
                </button>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  )
}
