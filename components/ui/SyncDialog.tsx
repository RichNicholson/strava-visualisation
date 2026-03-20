'use client'

import { useEffect, useRef, useState } from 'react'
import type { SyncProgress } from '../../lib/db/sync'
import type { StravaActivity } from '../../lib/strava/types'

interface SyncDialogProps {
  progress: SyncProgress
  isSyncing: boolean
  onDismiss: () => void
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatDistance(metres: number): string {
  return `${(metres / 1000).toFixed(1)} km`
}

function ActivityRow({ activity }: { activity: StravaActivity }) {
  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg odd:bg-gray-50">
      <span className="text-xs text-gray-400 w-24 shrink-0">{formatDate(activity.start_date_local)}</span>
      <span className="inline-block text-xs font-medium bg-orange-100 text-orange-700 rounded px-1.5 py-0.5 shrink-0 max-w-[6rem] truncate">
        {activity.sport_type}
      </span>
      <span className="flex-1 text-sm text-gray-800 truncate">{activity.name}</span>
      <span className="text-xs text-gray-500 shrink-0">{formatDistance(activity.distance)}</span>
    </div>
  )
}

export function SyncDialog({ progress, isSyncing, onDismiss }: SyncDialogProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Accumulate activities across pages so the dialog shows the full running list.
  const [accumulated, setAccumulated] = useState<StravaActivity[]>([])
  useEffect(() => {
    if (progress.phase === 'athlete') {
      // New sync starting — reset the accumulated list.
      setAccumulated([])
    } else if (progress.importedActivities.length > 0) {
      setAccumulated((prev) => [...prev, ...progress.importedActivities])
    }
  }, [progress.phase, progress.importedActivities])

  // Auto-scroll to the bottom whenever new activities arrive, but only if
  // the user hasn't scrolled up to browse.
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const isNearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 80
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [accumulated.length])

  const isDone = progress.phase === 'done'
  const count = progress.activitiesFetched

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <div>
            <h2 className="font-semibold text-gray-800 text-base">
              {isDone ? 'Sync complete' : 'Syncing activities…'}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {count === 0
                ? isDone
                  ? 'No new activities found.'
                  : 'Fetching activities from Strava…'
                : `${count} activit${count === 1 ? 'y' : 'ies'} imported`}
            </p>
          </div>

          {/* Spinner or close button */}
          {isSyncing ? (
            <svg
              className="w-5 h-5 text-orange-500 animate-spin shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <button
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Dismiss"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Scrolling activity list */}
        {count > 0 && (
          <div
            ref={listRef}
            className="overflow-y-auto flex-1 px-3 pb-4 min-h-0"
          >
            {accumulated.map((activity) => (
              <ActivityRow key={activity.id} activity={activity} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}

        {/* Footer action */}
        {isDone && (
          <div className="px-5 pb-5 pt-2 shrink-0 border-t border-gray-100">
            <button
              onClick={onDismiss}
              className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors text-sm"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
