'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db/schema'
import { applyFilter } from '../lib/analysis/filter'
import type { FilterState, StravaActivity } from '../lib/strava/types'

export function useActivities(filter?: FilterState): StravaActivity[] {
  const activities = useLiveQuery(
    () => db.activities.toArray(),
    [],
    []
  )

  if (!filter || !activities) return activities ?? []
  return applyFilter(activities, filter)
}

export function useAllActivities(): StravaActivity[] {
  return useLiveQuery(() => db.activities.orderBy('start_date').reverse().toArray(), [], []) ?? []
}

export function useAthlete() {
  return useLiveQuery(() => db.athlete.toCollection().first(), [], null)
}
