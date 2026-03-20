'use client'

import type { MetricKey } from '../../lib/strava/types'
import { METRIC_LABELS } from '../../lib/strava/types'

interface AxisSelectorProps {
  label: string
  value: MetricKey
  onChange: (v: MetricKey) => void
  exclude?: MetricKey[]
}

export function AxisSelector({ label, value, onChange, exclude = [] }: AxisSelectorProps) {
  const options = (Object.keys(METRIC_LABELS) as MetricKey[]).filter(
    (k) => !exclude.includes(k)
  ).sort((a, b) => METRIC_LABELS[a].localeCompare(METRIC_LABELS[b]))

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide w-4">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as MetricKey)}
        className="text-sm border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-orange-400"
      >
        {options.map((k) => (
          <option key={k} value={k}>
            {METRIC_LABELS[k]}
          </option>
        ))}
      </select>
    </div>
  )
}
