'use client'

import type { FilterState } from '../../lib/strava/types'
import { formatPace } from '../../lib/analysis/bestSplit'
import { RangeSlider } from './RangeSlider'

function parsePaceInput(raw: string): number | null {
  const match = raw.match(/^(\d+):(\d{2})$/)
  if (!match) return null
  return parseInt(match[1]) * 60 + parseInt(match[2])
}

// Pace filter constants.
// The usable range is 3:00–10:00 /km. The slider extends one step (15s) beyond
// each end so that 3:00 and 10:00 are normal filter values and the outermost
// notches act as sentinels meaning "no limit in that direction".
const PACE_STEP = 15             // seconds — slider step size
const PACE_MIN  = 3 * 60        // 3:00 /km — lowest normal value
const PACE_MAX  = 10 * 60       // 10:00 /km — highest normal value
const SLIDER_MIN = PACE_MIN - PACE_STEP  // 2:45 — sentinel position (displays "3:00-")
const SLIDER_MAX = PACE_MAX + PACE_STEP  // 10:15 — sentinel position (displays "10:00+")

interface PaceFilterRowProps {
  pace: FilterState['pace']
  onChange: (pace: FilterState['pace']) => void
}

export function PaceFilterRow({ pace, onChange }: PaceFilterRowProps) {
  // Shared formatting: show sentinels at extremes
  function formatPaceWithSentinels(v: number): string {
    if (v <= SLIDER_MIN) return `${formatPace(PACE_MIN)}-`
    if (v >= SLIDER_MAX) return `${formatPace(PACE_MAX)}+`
    return formatPace(v)
  }

  // Map a stored value back to slider position (sentinels → slider extremes)
  function toSliderMin(stored: number): number {
    return stored <= 0 ? SLIDER_MIN : Math.max(stored, SLIDER_MIN)
  }
  function toSliderMax(stored: number): number {
    return stored >= SLIDER_MAX ? SLIDER_MAX : Math.min(stored, SLIDER_MAX)
  }

  // Map a slider position to effective filter value (extremes → sentinels)
  function fromSliderMin(v: number): number {
    return v <= SLIDER_MIN ? 0 : v
  }
  function fromSliderMax(v: number): number {
    return v >= SLIDER_MAX ? Number.MAX_SAFE_INTEGER : v
  }

  const avgRange = pace.average ?? { min: PACE_MIN, max: PACE_MAX }

  function setAvgRange(range: [number, number]) {
    onChange({ ...pace, average: { min: fromSliderMin(range[0]), max: fromSliderMax(range[1]) } })
  }

  return (
    <div className="space-y-3">
      <RangeSlider
        min={SLIDER_MIN}
        max={SLIDER_MAX}
        step={PACE_STEP}
        value={[toSliderMin(avgRange.min), toSliderMax(avgRange.max)]}
        onChange={setAvgRange}
        formatValue={formatPaceWithSentinels}
        parseValue={parsePaceInput}
      />
    </div>
  )
}
