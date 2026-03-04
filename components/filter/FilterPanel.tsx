'use client'

import { useMemo } from 'react'
import type { FilterState, StravaActivity } from '../../lib/strava/types'
import { getSportTypes, getDistanceBounds, getDateBounds } from '../../lib/analysis/filter'
import { RangeSlider } from './RangeSlider'
import { PaceFilterRow } from './PaceFilterRow'

interface FilterPanelProps {
  filter: FilterState
  onChange: (filter: FilterState) => void
  allActivities: StravaActivity[]
  filteredCount: number
}

function formatDistance(metres: number): string {
  return `${(metres / 1000).toFixed(1)} km`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { year: 'numeric', month: 'short' })
}

export function FilterPanel({ filter, onChange, allActivities, filteredCount }: FilterPanelProps) {
  const sportTypes = useMemo(() => getSportTypes(allActivities), [allActivities])
  const distBounds = useMemo(() => getDistanceBounds(allActivities), [allActivities])
  const dateBounds = useMemo(() => getDateBounds(allActivities), [allActivities])

  function setDateRange(range: [number, number]) {
    const from = new Date(range[0]).toISOString()
    const to = new Date(range[1]).toISOString()
    onChange({ ...filter, dateRange: { from, to } })
  }

  function setDistRange(range: [number, number]) {
    onChange({ ...filter, distanceRange: { min: range[0], max: range[1] } })
  }

  function toggleSport(sport: string) {
    const current = filter.sport
    const next = current.includes(sport)
      ? current.filter((s) => s !== sport)
      : [...current, sport]
    onChange({ ...filter, sport: next })
  }

  function resetFilter() {
    onChange({ dateRange: null, distanceRange: null, sport: [], pace: null })
  }

  const dateMin = new Date(dateBounds.min).getTime()
  const dateMax = new Date(dateBounds.max).getTime()
  const currentDateRange: [number, number] = filter.dateRange
    ? [new Date(filter.dateRange.from).getTime(), new Date(filter.dateRange.to).getTime()]
    : [dateMin, dateMax]

  const currentDistRange: [number, number] = filter.distanceRange
    ? [filter.distanceRange.min, filter.distanceRange.max]
    : [distBounds.min, distBounds.max]

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
          <div className="flex flex-wrap gap-1.5">
            {sportTypes.map((sport) => (
              <button
                key={sport}
                onClick={() => toggleSport(sport)}
                className={`px-2.5 py-0.5 text-sm rounded-full border transition-colors ${
                  filter.sport.length === 0 || filter.sport.includes(sport)
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'border-gray-300 text-gray-500 hover:border-orange-300'
                }`}
              >
                {sport}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Date range */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date range</p>
        <RangeSlider
          min={dateMin}
          max={dateMax}
          step={(dateMax - dateMin) / 200}
          value={currentDateRange}
          onChange={setDateRange}
          formatValue={(v) => formatDate(new Date(v).toISOString())}
        />
      </div>

      {/* Distance range */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Distance</p>
        <RangeSlider
          min={distBounds.min}
          max={distBounds.max}
          step={500}
          value={currentDistRange}
          onChange={setDistRange}
          formatValue={formatDistance}
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
    </div>
  )
}
