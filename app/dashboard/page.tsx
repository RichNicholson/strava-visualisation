'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { FilterPanel } from '../../components/filter/FilterPanel'
import { ScatterPlot } from '../../components/plots/ScatterPlot'
import { SeriesPlot } from '../../components/plots/SeriesPlot'
import { RouteMap } from '../../components/plots/RouteMap'
import { RosterPanel, ROSTER_CAPACITY } from '../../components/roster/RosterPanel'
import { ActivityTable } from '../../components/table/ActivityTable'
import { useAllActivities, useAthlete } from '../../hooks/useActivities'
import { useStravaSync } from '../../hooks/useStravaSync'
import { useStreams, useStream } from '../../hooks/useStreams'
import { applyFilter } from '../../lib/analysis/filter'
import type { FilterState, StravaActivity } from '../../lib/strava/types'
import { SettingsPanel } from './SettingsPanel'

const DEFAULT_FILTER: FilterState = {
  dateRange: null,
  distanceRange: null,
  sport: ['Run'],
  pace: { average: { min: 3 * 60, max: 10 * 60 } },
}

type PlotMode = 'scatter' | 'table' | 'series' | 'map'

const MODE_LABELS: Record<PlotMode, string> = {
  scatter: 'Scatter',
  table: 'Table',
  series: 'Series',
  map: 'Map',
}

export default function Dashboard() {
  const allActivities = useAllActivities()
  const athlete = useAthlete()
  const { progress, isSyncing, startSync } = useStravaSync()
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER)
  const [plotMode, setPlotMode] = useState<PlotMode>('scatter')
  const [showSettings, setShowSettings] = useState(false)
  const [showWMA, setShowWMA] = useState(true)
  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null)
  const [roster, setRoster] = useState<Set<number>>(new Set())

  const filteredActivities = useMemo(
    () => applyFilter(allActivities, filter),
    [allActivities, filter]
  )

  const rosterActivities = useMemo<StravaActivity[]>(
    () => allActivities.filter((a) => roster.has(a.id)),
    [allActivities, roster]
  )

  const toggleRoster = useCallback((id: number) => {
    setRoster((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < ROSTER_CAPACITY) {
        next.add(id)
      }
      return next
    })
  }, [])

  // Auto-select first activity when entering map mode or when roster changes
  useEffect(() => {
    if (plotMode === 'map') {
      const source = roster.size > 0 ? rosterActivities : filteredActivities
      setSelectedActivityId((prev) =>
        source.find((a) => a.id === prev) ? prev : (source[0]?.id ?? null)
      )
    }
  }, [plotMode, filteredActivities, rosterActivities, roster])

  // Fetch streams for series mode — uses roster if non-empty
  const streamActivityIds = useMemo(
    () => (plotMode === 'series' && roster.size > 0 ? rosterActivities.map((a) => a.id) : []),
    [rosterActivities, roster.size, plotMode]
  )
  const { streams, loading: streamsLoading, error: streamsError } = useStreams(streamActivityIds)

  // Fetch single stream for map mode
  const { stream: mapStream, loading: mapStreamLoading, error: mapStreamError } = useStream(
    plotMode === 'map' && roster.size > 0 ? selectedActivityId : null
  )

  const mapSource = roster.size > 0 ? rosterActivities : []
  const selectedActivity = mapSource.find((a) => a.id === selectedActivityId) ?? null

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 flex-shrink-0">
        <h1 className="font-bold text-orange-500 text-lg">StravaViz</h1>

        {/* Plot mode toggle */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {(['scatter', 'table', 'series', 'map'] as PlotMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setPlotMode(mode)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                plotMode === mode
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {MODE_LABELS[mode]}
            </button>
          ))}
        </div>

        {plotMode === 'scatter' && (
          <button
            onClick={() => setShowWMA((v) => !v)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              showWMA
                ? 'bg-green-50 border-green-300 text-green-700'
                : 'border-gray-200 text-gray-500'
            }`}
          >
            WMA contours
          </button>
        )}

        <div className="ml-auto flex items-center gap-3">
          {/* Sync status */}
          {progress?.phase === 'error' ? (
            progress.error === 'UNAUTHORIZED' ? (
              <a href="/api/auth/strava" className="text-sm text-orange-600 underline">
                Session expired — reconnect with Strava
              </a>
            ) : (
              <span className="text-sm text-red-500">{progress.error ?? 'Sync failed'}</span>
            )
          ) : isSyncing && progress ? (
            <span className="text-sm text-gray-500">
              {progress.phase === 'activities'
                ? `Syncing... ${progress.activitiesFetched} activities`
                : progress.phase === 'done'
                ? 'Sync complete'
                : null}
            </span>
          ) : null}

          <button
            onClick={startSync}
            disabled={isSyncing}
            className="px-3 py-1.5 text-sm bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-lg transition-colors"
          >
            {isSyncing ? 'Syncing...' : allActivities.length === 0 ? 'Sync Activities' : 'Re-sync'}
          </button>

          <button
            onClick={() => setShowSettings((v) => !v)}
            className="p-1.5 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            title="Settings"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path
                fillRule="evenodd"
                d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Filter sidebar */}
        <aside className="w-72 flex-shrink-0 overflow-y-auto border-r border-gray-200 bg-white p-4">
          <FilterPanel
            filter={filter}
            onChange={setFilter}
            allActivities={allActivities}
            filteredCount={filteredActivities.length}
          />

          <RosterPanel rosterActivities={rosterActivities} onRemove={toggleRoster} />

          {/* Activity list — map mode: select from roster; scatter/table modes: hide (table IS the list) */}
          {plotMode === 'map' && (
            <div className="mt-4 space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Select activity
              </p>
              {rosterActivities.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Add runs to the roster first.</p>
              ) : (
                rosterActivities.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => setSelectedActivityId(a.id)}
                    className={`text-xs py-1.5 px-2 rounded cursor-pointer ${
                      a.id === selectedActivityId
                        ? 'bg-orange-50 border border-orange-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <p className="font-medium text-gray-700 truncate">{a.name}</p>
                    <p className="text-gray-400">
                      {new Date(a.start_date).toLocaleDateString()} ·{' '}
                      {(a.distance / 1000).toFixed(1)} km
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </aside>

        {/* Plot area */}
        <main className="flex-1 min-w-0">
          {allActivities.length === 0 && !isSyncing ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-4">
                <p className="text-gray-500">No activities yet. Click &quot;Sync Activities&quot; to load your Strava data.</p>
                <button
                  onClick={startSync}
                  className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors"
                >
                  Sync from Strava
                </button>
              </div>
            </div>
          ) : plotMode === 'scatter' ? (
            <ScatterPlot
              activities={filteredActivities}
              athlete={athlete ?? null}
              showWMA={showWMA}
              roster={roster}
              onToggleRoster={toggleRoster}
            />
          ) : plotMode === 'table' ? (
            <ActivityTable
              activities={filteredActivities}
              roster={roster}
              onToggleRoster={toggleRoster}
            />
          ) : plotMode === 'series' ? (
            roster.size === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm text-center px-8">
                Add runs to the roster to compare them here.
                <br />
                <span className="text-xs mt-1">Use the Scatter or Table view to select runs.</span>
              </div>
            ) : streamsError ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-red-500">
                  {streamsError === 'RATE_LIMITED'
                    ? 'Strava rate limit reached — wait a few minutes and try again'
                    : streamsError === 'UNAUTHORIZED'
                    ? 'Session expired — reconnect with Strava'
                    : `Failed to load streams: ${streamsError}`}
                </p>
              </div>
            ) : (
              <SeriesPlot
                activities={rosterActivities}
                streams={streams}
                loading={streamsLoading}
              />
            )
          ) : plotMode === 'map' ? (
            roster.size === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm text-center px-8">
                Add runs to the roster to view them on the map.
                <br />
                <span className="text-xs mt-1">Use the Scatter or Table view to select runs.</span>
              </div>
            ) : mapStreamError ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-red-500">
                  {mapStreamError === 'RATE_LIMITED'
                    ? 'Strava rate limit reached — wait a few minutes and try again'
                    : mapStreamError === 'UNAUTHORIZED'
                    ? 'Session expired — reconnect with Strava'
                    : `Failed to load route: ${mapStreamError}`}
                </p>
              </div>
            ) : selectedActivity ? (
              <RouteMap
                activity={selectedActivity}
                stream={mapStream}
                loading={mapStreamLoading}
              />
            ) : null
          ) : null}
        </main>
      </div>

      {/* Settings modal */}
      {showSettings && (
        <SettingsPanel athlete={athlete ?? null} onClose={() => setShowSettings(false)} />
      )}
    </div>
  )
}
