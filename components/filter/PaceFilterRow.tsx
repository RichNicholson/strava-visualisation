'use client'

import type { FilterState } from '../../lib/strava/types'
import { formatPace, parsePace } from '../../lib/analysis/bestSplit'
import { RangeSlider } from './RangeSlider'

interface PaceFilterRowProps {
  pace: FilterState['pace']
  onChange: (pace: FilterState['pace']) => void
}

// Common split distances in metres
const SPLIT_DISTANCES = [
  { label: '1 km', metres: 1000 },
  { label: '1 mi', metres: 1609 },
  { label: '3 mi', metres: 4828 },
  { label: '5 km', metres: 5000 },
  { label: '10 km', metres: 10000 },
]

const MIN_PACE = 2 * 60  // 2:00 /km
const MAX_PACE = 12 * 60 // 12:00 /km

export function PaceFilterRow({ pace, onChange }: PaceFilterRowProps) {
  const isEnabled = pace !== null

  function toggle() {
    if (isEnabled) {
      onChange(null)
    } else {
      onChange({
        mode: 'average',
        range: { min: MIN_PACE, max: MAX_PACE },
      })
    }
  }

  function setMode(mode: 'average' | 'best_split') {
    if (!pace) return
    onChange({
      ...pace,
      mode,
      splitDistance: mode === 'best_split' ? (pace.splitDistance ?? 5000) : undefined,
    })
  }

  function setSplitDistance(metres: number) {
    if (!pace) return
    onChange({ ...pace, splitDistance: metres })
  }

  function setRange(range: [number, number]) {
    if (!pace) return
    onChange({ ...pace, range: { min: range[0], max: range[1] } })
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="pace-enabled"
          checked={isEnabled}
          onChange={toggle}
          className="w-4 h-4 accent-orange-500"
        />
        <label htmlFor="pace-enabled" className="text-sm font-medium text-gray-700">
          Pace filter
        </label>
      </div>

      {isEnabled && pace && (
        <div className="pl-6 space-y-3">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setMode('average')}
              className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                pace.mode === 'average'
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'border-gray-300 text-gray-600 hover:border-orange-300'
              }`}
            >
              Average pace
            </button>
            <button
              onClick={() => setMode('best_split')}
              className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                pace.mode === 'best_split'
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'border-gray-300 text-gray-600 hover:border-orange-300'
              }`}
            >
              Best split
            </button>
          </div>

          {/* Split distance selector */}
          {pace.mode === 'best_split' && (
            <div className="flex flex-wrap gap-1">
              {SPLIT_DISTANCES.map(({ label, metres }) => (
                <button
                  key={metres}
                  onClick={() => setSplitDistance(metres)}
                  className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                    pace.splitDistance === metres
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'border-gray-300 text-gray-500 hover:border-orange-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Pace range slider */}
          <RangeSlider
            min={MIN_PACE}
            max={MAX_PACE}
            step={15}
            value={[pace.range.min, pace.range.max]}
            onChange={setRange}
            formatValue={formatPace}
          />
        </div>
      )}
    </div>
  )
}
