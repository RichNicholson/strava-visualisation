'use client'

import type { StravaActivity } from '../../lib/strava/types'
import { formatPace } from '../../lib/analysis/bestSplit'

export const ROSTER_CAPACITY = 10

interface RosterPanelProps {
  rosterActivities: StravaActivity[]
  onRemove: (id: number) => void
}

export function RosterPanel({ rosterActivities, onRemove }: RosterPanelProps) {
  const count = rosterActivities.length

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Roster</p>
        <span
          className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
            count >= ROSTER_CAPACITY
              ? 'bg-orange-100 text-orange-700'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          {count} / {ROSTER_CAPACITY}
        </span>
      </div>

      {count === 0 ? (
        <p className="text-xs text-gray-400 italic">
          Add runs from the scatter plot or table view.
        </p>
      ) : (
        <ul className="space-y-1">
          {rosterActivities.map((a) => {
            const pace = a.average_speed > 0 ? 1000 / a.average_speed : null
            return (
              <li
                key={a.id}
                className="flex items-center gap-1.5 group py-1 px-2 rounded hover:bg-orange-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate">{a.name}</p>
                  <p className="text-xs text-gray-400">
                    {(a.distance / 1000).toFixed(1)} km
                    {pace !== null && ` · ${formatPace(pace)}`}
                  </p>
                </div>
                <button
                  onClick={() => onRemove(a.id)}
                  title="Remove from roster"
                  className="flex-shrink-0 text-gray-300 hover:text-red-400 transition-colors text-base leading-none"
                >
                  ×
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
