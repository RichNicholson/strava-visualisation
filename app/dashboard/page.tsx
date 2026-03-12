'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'

// Matches d3.schemeTableau10 — stable colour palette for roster/series
const TABLEAU10 = [
  '#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f',
  '#edc949', '#af7aa1', '#ff9da7', '#9c755f', '#bab0ac',
]
import { FilterPanel } from '../../components/filter/FilterPanel'
import { ScatterPlot, DEFAULT_SCATTER_VIEW_STATE } from '../../components/plots/ScatterPlot'
import type { ScatterViewState } from '../../components/plots/ScatterPlot'
import { SeriesPlot } from '../../components/plots/SeriesPlot'
import { RouteMap } from '../../components/plots/RouteMap'
import { RosterPanel, ROSTER_CAPACITY } from '../../components/roster/RosterPanel'
import { ActivityTable } from '../../components/table/ActivityTable'
import { useAllActivities, useAthlete } from '../../hooks/useActivities'
import { useStravaSync } from '../../hooks/useStravaSync'
import { useStreams, useStream } from '../../hooks/useStreams'
import { applyFilter } from '../../lib/analysis/filter'
import type { FilterState, StravaActivity, ViewType, LayoutMode, WorkspaceState, WorkspaceTab, Channel } from '../../lib/strava/types'
import { DEFAULT_WORKSPACE, DEFAULT_CHANNEL, defaultSlot } from '../../lib/strava/types'
import { SettingsPanel } from './SettingsPanel'
import { SyncDialog } from '../../components/ui/SyncDialog'

const DEFAULT_FILTER: FilterState = {
  dateRange: null,
  distanceRange: null,
  sport: ['Run'],
  pace: { average: { min: 3 * 60, max: 10 * 60 } },
  heartrate: null,
  elevationGain: null,
  sufferScore: null,
  movingTime: null,
  elapsedTime: null,
}

const VIEW_LABELS: Record<ViewType, string> = {
  scatter: 'Scatter',
  table: 'Table',
  series: 'Series',
  map: 'Map',
}

const LAYOUT_LABELS = { single: 'Single', double: 'Double', quad: 'Quad' } as const

export default function Dashboard() {
  const allActivities = useAllActivities()
  const athlete = useAthlete()
  const { progress, isSyncing, startSync, clearProgress } = useStravaSync()
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER)
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState>(DEFAULT_WORKSPACE)
  const [showSettings, setShowSettings] = useState(false)
  const [showWMA, setShowWMA] = useState(true)
  const [roster, setRoster] = useState<Set<number>>(new Set())
  const [hiddenRoster, setHiddenRoster] = useState<Set<number>>(new Set())
  const [baselineActivityId, setBaselineActivityId] = useState<number | null>(null)
  // Scatter plot view state — persisted across tab switches
  const [scatterViewState, setScatterViewState] = useState<ScatterViewState>(DEFAULT_SCATTER_VIEW_STATE)
  // Stable color assignments: activityId -> colorIndex (0-9)
  const [colorAssignments, setColorAssignments] = useState<Map<number, number>>(new Map())
  // Series crosshair hover — shared between SeriesPlot and RouteMap
  const [hoveredSeriesPoint, setHoveredSeriesPoint] = useState<{ activityId: number; streamIndex: number } | null>(null)

  // Restore UI state after OAuth redirect / page reload
  useEffect(() => {
    try {
      const saved = localStorage.getItem('dash:workspaceState')
      if (saved) setWorkspaceState(JSON.parse(saved))
    } catch { /* ignore */ }
    try {
      const savedScatter = sessionStorage.getItem('dash:scatterView')
      if (savedScatter) {
        const parsed = JSON.parse(savedScatter)
        setScatterViewState((prev) => ({ ...prev, ...parsed, viewDomain: null }))
      }
    } catch { /* ignore */ }
  }, [])

  // Persist workspace state to localStorage (survives page close/reopen)
  useEffect(() => { localStorage.setItem('dash:workspaceState', JSON.stringify(workspaceState)) }, [workspaceState])
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { viewDomain: _vd, ...toSave } = scatterViewState
    sessionStorage.setItem('dash:scatterView', JSON.stringify(toSave))
  }, [scatterViewState])

  // Derived: active workspace tab and its layout config (re-computed each render)
  const activeTab = workspaceState.tabs.find((t) => t.id === workspaceState.activeTabId) ?? workspaceState.tabs[0]
  const layoutConfig = activeTab.layoutConfig

  const filteredActivities = useMemo(
    () => applyFilter(allActivities, filter),
    [allActivities, filter]
  )

  const rosterActivities = useMemo<StravaActivity[]>(
    () => allActivities.filter((a) => roster.has(a.id)),
    [allActivities, roster]
  )

  const colorMap = useMemo<Map<number, string>>(
    () => new Map(
      Array.from(colorAssignments.entries()).map(([id, idx]) => [id, TABLEAU10[idx]])
    ),
    [colorAssignments]
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
    // Remove from hidden when removed from roster
    setHiddenRoster((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    setColorAssignments((prev) => {
      const next = new Map(prev)
      if (next.has(id)) {
        // Remove: free up this color
        next.delete(id)
      } else if (roster.size < ROSTER_CAPACITY) {
        // Add: assign next available color index
        const usedIndices = new Set(next.values())
        let colorIdx = 0
        while (usedIndices.has(colorIdx) && colorIdx < TABLEAU10.length) {
          colorIdx++
        }
        next.set(id, colorIdx)
      }
      return next
    })
  }, [roster.size])

  const clearRoster = useCallback(() => {
    setRoster(new Set())
    setHiddenRoster(new Set())
    setColorAssignments(new Map())
    setBaselineActivityId(null)
  }, [])

  // Clear baseline when its activity is removed from the roster
  useEffect(() => {
    if (baselineActivityId !== null && !roster.has(baselineActivityId)) {
      setBaselineActivityId(null)
    }
  }, [roster, baselineActivityId])

  const toggleHidden = useCallback((id: number) => {
    setHiddenRoster((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // Switch the layout mode of the active workspace tab, carrying over as many slots as possible
  const switchLayoutMode = useCallback((mode: LayoutMode) => {
    setWorkspaceState((prev) => {
      const tabs = prev.tabs.map((t) => {
        if (t.id !== prev.activeTabId) return t
        const existing = t.layoutConfig.slots
        const defaults: ViewType[] = ['scatter', 'series', 'map', 'table']
        const count = mode === 'single' ? 1 : mode === 'double' ? 2 : 4
        const slots = Array.from({ length: count }, (_, i) =>
          existing[i] ?? defaultSlot(defaults[i])
        )
        return { ...t, layoutConfig: { mode, slots } }
      })
      return { ...prev, tabs }
    })
  }, [])

  // Change the view type shown in a specific slot of the active workspace tab
  const setSlotViewType = useCallback((slotIndex: number, viewType: ViewType) => {
    setWorkspaceState((prev) => {
      const tabs = prev.tabs.map((t) => {
        if (t.id !== prev.activeTabId) return t
        const slots = [...t.layoutConfig.slots]
        const existing = slots[slotIndex]
        // Initialise channels when switching to series view
        const channels = viewType === 'series' && (!existing.channels || existing.channels.length === 0)
          ? [{ ...DEFAULT_CHANNEL }]
          : existing.channels
        slots[slotIndex] = { ...existing, viewType, channels }
        return { ...t, layoutConfig: { ...t.layoutConfig, slots } }
      })
      return { ...prev, tabs }
    })
  }, [])

  // Update channels for a specific slot of the active workspace tab
  const setSlotChannels = useCallback((slotIndex: number, channels: Channel[]) => {
    setWorkspaceState((prev) => {
      const tabs = prev.tabs.map((t) => {
        if (t.id !== prev.activeTabId) return t
        const slots = [...t.layoutConfig.slots]
        slots[slotIndex] = { ...slots[slotIndex], channels }
        return { ...t, layoutConfig: { ...t.layoutConfig, slots } }
      })
      return { ...prev, tabs }
    })
  }, [])

  // Add a new workspace tab
  const addWorkspaceTab = useCallback(() => {
    setWorkspaceState((prev) => {
      const newId = `tab-${Date.now()}`
      const newTab: WorkspaceTab = {
        id: newId,
        name: `Tab ${prev.tabs.length + 1}`,
        layoutConfig: { mode: 'single', slots: [defaultSlot('scatter')] },
      }
      return { tabs: [...prev.tabs, newTab], activeTabId: newId }
    })
  }, [])

  // Remove a workspace tab (cannot remove the last one)
  const removeWorkspaceTab = useCallback((id: string) => {
    setWorkspaceState((prev) => {
      if (prev.tabs.length <= 1) return prev
      const idx = prev.tabs.findIndex((t) => t.id === id)
      const tabs = prev.tabs.filter((t) => t.id !== id)
      const activeTabId = prev.activeTabId === id
        ? (tabs[idx - 1] ?? tabs[0]).id
        : prev.activeTabId
      return { tabs, activeTabId }
    })
  }, [])

  // Switch to a different workspace tab
  const setActiveWorkspaceTab = useCallback((id: string) => {
    setWorkspaceState((prev) => ({ ...prev, activeTabId: id }))
  }, [])

  // Derive which view types are currently visible (across all slots)
  const isSeriesVisible = layoutConfig.slots.some((s) => s.viewType === 'series')
  const isMapVisible = layoutConfig.slots.some((s) => s.viewType === 'map')

  // Fetch streams for series mode — uses roster if non-empty
  const streamActivityIds = useMemo(
    () => (isSeriesVisible && roster.size > 0 ? rosterActivities.map((a) => a.id) : []),
    [rosterActivities, roster.size, isSeriesVisible]
  )
  const { streams, loading: streamsLoading, error: streamsError } = useStreams(streamActivityIds)

  // Fetch single stream for map mode
  const mapActivityId = baselineActivityId ?? rosterActivities[0]?.id ?? null
  const { stream: mapStream, loading: mapStreamLoading, error: mapStreamError } = useStream(
    isMapVisible && roster.size > 0 ? mapActivityId : null
  )

  const mapSource = roster.size > 0 ? rosterActivities : []
  const selectedActivity = mapSource.find((a) => a.id === mapActivityId) ?? null

  const showSyncDialog = isSyncing || (progress !== null && progress.phase !== 'error')

  // Render the body of a single panel slot (no outer shell, fills whatever container it is in)
  const renderPanelBody = (viewType: ViewType, slotIndex: number) => {
    if (viewType === 'scatter') {
      return (
        <ScatterPlot
          activities={filteredActivities}
          athlete={athlete ?? null}
          showWMA={showWMA}
          roster={roster}
          onToggleRoster={toggleRoster}
          colorMap={colorMap}
          viewState={scatterViewState}
          onViewStateChange={setScatterViewState}
        />
      )
    }
    if (viewType === 'table') {
      return (
        <ActivityTable
          activities={filteredActivities}
          roster={roster}
          onToggleRoster={toggleRoster}
        />
      )
    }
    if (viewType === 'series') {
      if (roster.size === 0) {
        return (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm text-center px-8">
            Add runs to the roster to compare them here.
            <br />
            <span className="text-xs mt-1">Use the Scatter or Table view to select runs.</span>
          </div>
        )
      }
      if (streamsError) {
        return (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-red-500">
              {streamsError === 'RATE_LIMITED'
                ? 'Strava rate limit reached — wait a few minutes and try again'
                : streamsError === 'UNAUTHORIZED'
                ? 'Session expired — reconnect with Strava'
                : `Failed to load streams: ${streamsError}`}
            </p>
          </div>
        )
      }
      return (
        <SeriesPlot
          activities={rosterActivities.filter((a) => !hiddenRoster.has(a.id))}
          streams={streams}
          loading={streamsLoading}
          colorMap={colorMap}
          athlete={athlete ?? null}
          baselineId={baselineActivityId}
          channels={layoutConfig.slots[slotIndex]?.channels}
          onChannelsChange={(ch) => setSlotChannels(slotIndex, ch)}
          onHoverIndex={(activityId, streamIndex) =>
            setHoveredSeriesPoint(activityId != null && streamIndex != null ? { activityId, streamIndex } : null)
          }
        />
      )
    }
    if (viewType === 'map') {
      if (roster.size === 0) {
        return (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm text-center px-8">
            Add runs to the roster to view them on the map.
            <br />
            <span className="text-xs mt-1">Use the Scatter or Table view to select runs.</span>
          </div>
        )
      }
      if (mapStreamError) {
        return (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-red-500">
              {mapStreamError === 'RATE_LIMITED'
                ? 'Strava rate limit reached — wait a few minutes and try again'
                : mapStreamError === 'UNAUTHORIZED'
                ? 'Session expired — reconnect with Strava'
                : `Failed to load route: ${mapStreamError}`}
            </p>
          </div>
        )
      }
      if (selectedActivity) {
        return (
          <RouteMap
            activity={selectedActivity}
            stream={mapStream}
            loading={mapStreamLoading}
            color={mapActivityId != null ? colorMap.get(mapActivityId) : undefined}
            hoveredStreamIndex={hoveredSeriesPoint?.activityId === mapActivityId ? hoveredSeriesPoint.streamIndex : undefined}
          />
        )
      }
      return null
    }
    return null
  }

  // Show scatter WMA toggle when any visible slot is a scatter view
  const isScatterVisible = layoutConfig.slots.some((s) => s.viewType === 'scatter')

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 flex-shrink-0">
        <h1 className="font-bold text-orange-500 text-lg">StravaViz</h1>

        {/* Workspace tabs */}
        <div className="flex items-center gap-0.5">
          {workspaceState.tabs.map((tab) => (
            <div key={tab.id} className="flex items-center">
              <button
                onClick={() => setActiveWorkspaceTab(tab.id)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors border ${
                  tab.id === workspaceState.activeTabId
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'text-gray-600 border-gray-200 hover:bg-gray-50'
                } ${
                  workspaceState.tabs.length === 1 ? 'rounded-lg' : 'rounded-l-lg'
                }`}
              >
                {tab.name}
              </button>
              {workspaceState.tabs.length > 1 && (
                <button
                  onClick={() => removeWorkspaceTab(tab.id)}
                  className={`px-1.5 py-1.5 text-xs rounded-r-lg border-y border-r transition-colors ${
                    tab.id === workspaceState.activeTabId
                      ? 'bg-orange-500 text-white border-orange-500 hover:bg-orange-600'
                      : 'text-gray-400 border-gray-200 hover:bg-gray-50 hover:text-red-500'
                  }`}
                  title="Close tab"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addWorkspaceTab}
            className="px-2 py-1.5 text-sm text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            title="Add new tab"
          >
            +
          </button>
        </div>

        {/* Layout mode switcher: Single | Double | Quad */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {(['single', 'double', 'quad'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => switchLayoutMode(mode)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                layoutConfig.mode === mode
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {LAYOUT_LABELS[mode]}
            </button>
          ))}
        </div>

        {/* In Single mode: view type selector (identical to the original tab strip) */}
        {layoutConfig.mode === 'single' && (
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {(['scatter', 'table', 'series', 'map'] as ViewType[]).map((viewType) => (
              <button
                key={viewType}
                onClick={() => setSlotViewType(0, viewType)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  layoutConfig.slots[0].viewType === viewType
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {VIEW_LABELS[viewType]}
              </button>
            ))}
          </div>
        )}

        {isScatterVisible && (
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
            onClick={(e) => startSync(e.shiftKey)}
            disabled={isSyncing}
            className="px-3 py-1.5 text-sm bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-lg transition-colors"
            title={isSyncing ? 'Syncing...' : 'Sync new activities (Shift+Click for full resync)'}
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

          <RosterPanel
            rosterActivities={rosterActivities}
            onRemove={toggleRoster}
            onClearAll={clearRoster}
            colorMap={colorMap}
            hiddenIds={hiddenRoster}
            onToggleHidden={toggleHidden}
            baselineId={baselineActivityId}
            onSetBaseline={setBaselineActivityId}
          />
        </aside>

        {/* Plot area */}
        {allActivities.length === 0 && !isSyncing ? (
          <main className="flex-1 min-w-0 flex items-center justify-center">
            <div className="text-center space-y-4">
              <p className="text-gray-500">No activities yet. Click &quot;Sync Activities&quot; to load your Strava data.</p>
              <button
                onClick={(e) => startSync(e.shiftKey)}
                className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors"
                title="Sync activities from Strava (Shift+Click for full resync)"
              >
                Sync from Strava
              </button>
            </div>
          </main>
        ) : layoutConfig.mode === 'single' ? (
          /* ── Single mode: one panel, no panel chrome ─────────────────── */
          <main className="flex-1 min-w-0">
            {renderPanelBody(layoutConfig.slots[0].viewType, 0)}
          </main>
        ) : (
          /* ── Double / Quad mode: multiple panels, each with its own tab strip ── */
          <main
            className={`flex-1 min-w-0 grid gap-2 p-2 ${
              layoutConfig.mode === 'double'
                ? 'grid-cols-2'
                : 'grid-cols-2 grid-rows-2'
            }`}
          >
            {layoutConfig.slots.map((slot, slotIndex) => (
              <div
                key={slotIndex}
                className="flex flex-col min-h-0 bg-white rounded-lg border border-gray-200 overflow-hidden"
              >
                {/* Per-panel view type tab strip */}
                <div className="flex border-b border-gray-100 flex-shrink-0">
                  {(['scatter', 'table', 'series', 'map'] as ViewType[]).map((viewType) => (
                    <button
                      key={viewType}
                      onClick={() => setSlotViewType(slotIndex, viewType)}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors border-b-2 ${
                        slot.viewType === viewType
                          ? 'border-orange-500 text-orange-600 bg-orange-50'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {VIEW_LABELS[viewType]}
                    </button>
                  ))}
                </div>
                {/* Panel body */}
                <div className="flex-1 min-h-0 overflow-hidden">
                  {renderPanelBody(slot.viewType, slotIndex)}
                </div>
              </div>
            ))}
          </main>
        )}
      </div>

      {/* Settings modal */}
      {showSettings && (
        <SettingsPanel
          athlete={athlete ?? null}
          rosterIds={[...roster]}
          onClose={() => setShowSettings(false)}
          onFullResync={() => { setShowSettings(false); startSync(true) }}
        />
      )}

      {/* Sync progress dialog */}
      {showSyncDialog && progress && (
        <SyncDialog progress={progress} isSyncing={isSyncing} onDismiss={clearProgress} />
      )}
    </div>
  )
}
