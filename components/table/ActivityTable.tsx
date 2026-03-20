'use client'

import { useState, useMemo } from 'react'
import type { StravaActivity } from '../../lib/strava/types'
import { formatDistance, formatPace, paceUnit, type UnitSystem } from '../../lib/format'
import { ROSTER_CAPACITY } from '../roster/RosterPanel'

type SortCol = 'date' | 'name' | 'distance' | 'pace' | 'elevation' | 'hr'
type SortDir = 'asc' | 'desc'

interface ActivityTableProps {
  activities: StravaActivity[]
  roster: Set<number>
  onToggleRoster: (id: number) => void
  units?: UnitSystem
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function ActivityTable({ activities, roster, onToggleRoster, units = 'metric' }: ActivityTableProps) {
  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir }>({ col: 'date', dir: 'desc' })
  const [nameFilter, setNameFilter] = useState('')

  const hasHR = useMemo(() => activities.some((a) => a.average_heartrate != null), [activities])
  const rosterFull = roster.size >= ROSTER_CAPACITY

  function toggleSort(col: SortCol) {
    setSort((prev) =>
      prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: col === 'date' ? 'desc' : 'asc' }
    )
  }

  const sorted = useMemo(() => {
    const needle = nameFilter.trim().toLowerCase()
    const copy = needle ? activities.filter((a) => a.name.toLowerCase().includes(needle)) : [...activities]
    const { col, dir } = sort
    copy.sort((a, b) => {
      let diff = 0
      if (col === 'date')      diff = new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      if (col === 'name')      diff = a.name.localeCompare(b.name)
      if (col === 'distance')  diff = a.distance - b.distance
      if (col === 'pace')      diff = (a.average_speed || 0) - (b.average_speed || 0)  // higher speed = lower pace
      if (col === 'elevation') diff = (a.total_elevation_gain || 0) - (b.total_elevation_gain || 0)
      if (col === 'hr')        diff = (a.average_heartrate || 0) - (b.average_heartrate || 0)
      return dir === 'asc' ? diff : -diff
    })
    return copy
  }, [activities, sort, nameFilter])

  function SortTh({ col, label, className = '' }: { col: SortCol; label: string; className?: string }) {
    const active = sort.col === col
    return (
      <th
        onClick={() => toggleSort(col)}
        className={`px-3 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide cursor-pointer select-none whitespace-nowrap hover:text-gray-800 dark:hover:text-gray-200 transition-colors ${className}`}
      >
        {label}
        <span className="ml-1 text-gray-300 dark:text-gray-600">
          {active ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </th>
    )
  }

  return (
    <div className="flex flex-col h-full select-none">
      {/* Count bar */}
      <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3 flex-shrink-0 bg-white dark:bg-gray-800">
        <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {sorted.length}{sorted.length !== activities.length ? ` / ${activities.length}` : ''} {activities.length === 1 ? 'activity' : 'activities'}
        </span>
        {roster.size > 0 && (
          <span className="text-sm text-orange-600 font-medium whitespace-nowrap">
            · {roster.size} in roster
          </span>
        )}
        <input
          type="text"
          placeholder="Filter by name…"
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          className="ml-auto w-48 px-2 py-1 text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="text-sm border-collapse table-fixed">
          <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10 border-b border-gray-200 dark:border-gray-700">
            <tr>
              {/* Roster toggle column */}
              <th className="px-3 py-2.5 w-8" />
              <SortTh col="date"      label="Date"      className="w-28" />
              <SortTh col="name"      label="Name"      className="w-64" />
              <SortTh col="distance"  label={`Distance`}  className="w-28 text-right" />
              <SortTh col="pace"      label={`Avg Pace`}  className="w-28 text-right" />
              <SortTh col="elevation" label="Elev (m)"  className="w-24 text-right" />
              {hasHR && <SortTh col="hr" label="Avg HR" className="w-20 text-right" />}
            </tr>
          </thead>
          <tbody>
            {sorted.map((a) => {
              const inRoster = roster.has(a.id)
              const pace = a.average_speed > 0 ? 1000 / a.average_speed : null
              const canAdd = inRoster || !rosterFull

              return (
                <tr
                  key={a.id}
                  className={`border-b border-gray-100 dark:border-gray-700 transition-colors ${
                    inRoster ? 'bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  {/* Toggle button */}
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => onToggleRoster(a.id)}
                      disabled={!canAdd}
                      title={inRoster ? 'Remove from roster' : rosterFull ? 'Roster full (10 max)' : 'Add to roster'}
                      className={`w-6 h-6 rounded-full text-xs font-bold transition-colors flex items-center justify-center mx-auto ${
                        inRoster
                          ? 'bg-orange-500 text-white hover:bg-orange-600'
                          : canAdd
                          ? 'border-2 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:border-orange-400 hover:text-orange-500'
                          : 'border-2 border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600 cursor-not-allowed'
                      }`}
                    >
                      {inRoster ? '✓' : '+'}
                    </button>
                  </td>

                  <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">
                    {fmtDate(a.start_date)}
                  </td>

                  <td className="px-3 py-2 max-w-0">
                    <span className={`font-medium truncate block ${inRoster ? 'text-orange-800 dark:text-orange-300' : 'text-gray-800 dark:text-gray-100'}`}>
                      {a.name}
                    </span>
                  </td>

                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap text-right">
                    {formatDistance(a.distance, units)}
                  </td>

                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap font-mono text-xs text-right">
                    {pace !== null ? formatPace(pace, units) : '—'}
                  </td>

                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300 text-right">
                    {a.total_elevation_gain != null ? Math.round(a.total_elevation_gain) : '—'}
                  </td>

                  {hasHR && (
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300 text-right">
                      {a.average_heartrate != null ? Math.round(a.average_heartrate) : '—'}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>

        {sorted.length === 0 && (
          <div className="flex items-center justify-center h-40 text-gray-400 dark:text-gray-500 text-sm">
            No activities match the current filters
          </div>
        )}
      </div>
    </div>
  )
}
