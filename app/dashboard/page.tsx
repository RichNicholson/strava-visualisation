'use client'

import { useState, useMemo } from 'react'
import { FilterPanel } from '../../components/filter/FilterPanel'
import { ScatterPlot } from '../../components/plots/ScatterPlot'
import { SeriesPlot } from '../../components/plots/SeriesPlot'
import { useAllActivities, useAthlete } from '../../hooks/useActivities'
import { useStravaSync } from '../../hooks/useStravaSync'
import { useStreams } from '../../hooks/useStreams'
import { applyFilter } from '../../lib/analysis/filter'
import type { FilterState } from '../../lib/strava/types'
import { SettingsPanel } from './SettingsPanel'

const DEFAULT_FILTER: FilterState = {
  dateRange: null,
  distanceRange: null,
  sport: ['Run'],
  pace: null,
}

type PlotMode = 'scatter' | 'series'

export default function Dashboard() {
  const allActivities = useAllActivities()
  const athlete = useAthlete()
  const { progress, isSyncing, startSync } = useStravaSync()
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER)
  const [plotMode, setPlotMode] = useState<PlotMode>('scatter')
  const [showSettings, setShowSettings] = useState(false)
  const [showWMA, setShowWMA] = useState(true)

  const filteredActivities = useMemo(
    () => applyFilter(allActivities, filter),
    [allActivities, filter]
  )

  // Limit stream fetching to first 20 filtered activities for series plot
  const streamActivityIds = useMemo(
    () => (plotMode === 'series' ? filteredActivities.slice(0, 20).map((a) => a.id) : []),
    [filteredActivities, plotMode]
  )

  const { streams, loading: streamsLoading } = useStreams(streamActivityIds)

  const isConnected = allActivities.length > 0 || isSyncing

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 flex-shrink-0">
        <h1 className="font-bold text-orange-500 text-lg">StravaViz</h1>

        {/* Plot mode toggle */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {(['scatter', 'series'] as PlotMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setPlotMode(mode)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                plotMode === mode
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {mode === 'scatter' ? 'Scatter' : 'Series'}
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
          {isSyncing && progress && (
            <span className="text-sm text-gray-500">
              {progress.phase === 'activities'
                ? `Syncing... ${progress.activitiesFetched} activities`
                : progress.phase === 'done'
                ? 'Sync complete'
                : progress.phase}
            </span>
          )}

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

          {/* Activity list preview */}
          {filteredActivities.length > 0 && (
            <div className="mt-4 space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Recent matches
              </p>
              {filteredActivities.slice(0, 8).map((a) => (
                <div key={a.id} className="text-xs py-1.5 px-2 rounded hover:bg-gray-50">
                  <p className="font-medium text-gray-700 truncate">{a.name}</p>
                  <p className="text-gray-400">
                    {new Date(a.start_date).toLocaleDateString()} ·{' '}
                    {(a.distance / 1000).toFixed(1)} km
                  </p>
                </div>
              ))}
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
            />
          ) : (
            <SeriesPlot
              activities={filteredActivities}
              streams={streams}
              loading={streamsLoading}
            />
          )}
        </main>
      </div>

      {/* Settings modal */}
      {showSettings && (
        <SettingsPanel athlete={athlete ?? null} onClose={() => setShowSettings(false)} />
      )}
    </div>
  )
}
