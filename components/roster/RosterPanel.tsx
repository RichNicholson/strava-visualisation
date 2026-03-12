'use client'

import type { StravaActivity } from '../../lib/strava/types'
import { formatPace } from '../../lib/analysis/bestSplit'

export const ROSTER_CAPACITY = 10

interface RosterPanelProps {
  rosterActivities: StravaActivity[]
  onRemove: (id: number) => void
  onClearAll?: () => void
  colorMap?: Map<number, string>
  hiddenIds?: Set<number>
  onToggleHidden?: (id: number) => void
  baselineId?: number | null
  onSetBaseline?: (id: number | null) => void
}

export function RosterPanel({ rosterActivities, onRemove, onClearAll, colorMap, hiddenIds, onToggleHidden, baselineId, onSetBaseline }: RosterPanelProps) {
  const count = rosterActivities.length

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Roster</p>
        <div className="flex items-center gap-2">
          {count > 0 && onClearAll && (
            <button
              onClick={onClearAll}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              Clear all
            </button>
          )}
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
      </div>

      {count === 0 ? (
        <p className="text-xs text-gray-400 italic">
          Add runs from the scatter plot or table view.
        </p>
      ) : (
        <ul className="space-y-1">
          {rosterActivities.map((a) => {
            const pace = a.average_speed > 0 ? 1000 / a.average_speed : null
            const isBaseline = baselineId === a.id
            return (
              <li
                key={a.id}
                onClick={() => onSetBaseline?.(isBaseline ? null : a.id)}
                className={`flex items-center gap-1.5 group py-1 px-2 rounded transition-colors ${
                  isBaseline
                    ? 'bg-orange-50 border border-orange-200'
                    : onSetBaseline
                    ? 'cursor-pointer hover:bg-orange-50'
                    : 'hover:bg-orange-50'
                } ${hiddenIds?.has(a.id) ? 'opacity-50' : ''}`}
              >
                {colorMap && (
                  <span
                    className="flex-shrink-0 w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: colorMap.get(a.id) ?? '#ccc' }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate">{a.name}</p>
                  <p className="text-xs text-gray-400">
                    {(a.distance / 1000).toFixed(1)} km
                    {pace !== null && ` · ${formatPace(pace)}`}
                  </p>
                </div>
                {onSetBaseline && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onSetBaseline(baselineId === a.id ? null : a.id) }}
                    title={baselineId === a.id ? 'Clear baseline' : 'Set as delta baseline'}
                    className={`flex-shrink-0 transition-colors ${baselineId === a.id ? 'text-indigo-600' : 'text-gray-300 hover:text-indigo-400'}`}
                  >
                    <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                      <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>
                    </svg>
                  </button>
                )}
                {onToggleHidden && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleHidden(a.id) }}
                    title={hiddenIds?.has(a.id) ? 'Show in series plot' : 'Hide from series plot'}
                    className="flex-shrink-0 text-gray-300 hover:text-gray-500 transition-colors"
                  >
                    {hiddenIds?.has(a.id) ? (
                      // eye-off
                      <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                        <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/>
                        <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/>
                        <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z"/>
                      </svg>
                    ) : (
                      // eye
                      <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                        <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
                        <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
                      </svg>
                    )}
                  </button>
                )}
                <a
                  href={`https://www.strava.com/activities/${a.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title="Open in Strava"
                  className="flex-shrink-0 text-gray-300 hover:text-orange-500 transition-colors"
                >
                  <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M3 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h5.5a.5.5 0 0 0 0-1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v5.5a.5.5 0 0 0 1 0V3a2 2 0 0 0-2-2H3z" />
                    <path d="M9.354 6.354a.5.5 0 0 0-.708-.708L6 8.293 6 6.5a.5.5 0 0 0-1 0v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 0-1H6.707l2.647-2.646z" />
                    <path d="M16 12.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0zm-1.854-1.354a.5.5 0 0 0-.708 0l-1.938 1.94-.938-.94a.5.5 0 1 0-.708.708l1.293 1.293a.5.5 0 0 0 .707 0l2.293-2.293a.5.5 0 0 0 0-.708z" />
                  </svg>
                </a>
                <button
                  onClick={(e) => { e.stopPropagation(); onRemove(a.id); }}
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
