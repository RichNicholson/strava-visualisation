/**
 * Incremental sync engine.
 * Fetches activities from Strava and stores them in IndexedDB.
 * Activity data never reaches the server.
 */

import { db } from './schema'
import { fetchActivitiesPage, fetchAthlete, fetchActivityStreams } from '../strava/client'
import type { StravaActivity, ActivityStream } from '../strava/types'

export interface SyncProgress {
  phase: 'athlete' | 'activities' | 'streams' | 'done' | 'error'
  activitiesFetched: number
  activitiesTotal?: number
  error?: string
}

export type SyncProgressCallback = (progress: SyncProgress) => void

/**
 * Get access token from cookie (set by server after OAuth exchange).
 */
export function getAccessToken(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|; )strava_access_token=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : null
}

export async function syncActivities(
  accessToken: string,
  onProgress?: SyncProgressCallback,
  forceFullSync = false
): Promise<void> {
  onProgress?.({ phase: 'athlete', activitiesFetched: 0 })

  // Sync athlete profile — merge with existing record to preserve user-set fields (age, dateOfBirth)
  const athleteData = await fetchAthlete(accessToken) as Record<string, unknown>
  const existingAthlete = await db.athlete.get(athleteData.id as number)
  await db.athlete.put({
    ...(existingAthlete ?? {}),
    id: athleteData.id as number,
    firstname: athleteData.firstname as string,
    lastname: athleteData.lastname as string,
    ...(athleteData.sex ? { sex: athleteData.sex as 'M' | 'F' } : {}),
    last_synced: new Date().toISOString(),
  })

  // Find the most recent activity we have to support incremental sync
  // Subtract 1 hour safety margin to ensure we don't miss activities due to timing/timezone issues
  // If forceFullSync=true, clear all data and fetch everything
  if (forceFullSync) {
    await db.activities.clear()
    await db.streams.clear()
  }

  const mostRecent = await db.activities.orderBy('start_date').last()
  const after = mostRecent
    ? Math.floor(new Date(mostRecent.start_date).getTime() / 1000) - 3600 // 1 hour buffer
    : undefined

  let page = 1
  let totalFetched = 0
  const allActivities: StravaActivity[] = []

  onProgress?.({ phase: 'activities', activitiesFetched: 0 })

  while (true) {
    const batch = await fetchActivitiesPage(accessToken, page, 100, after) as StravaActivity[]
    if (batch.length === 0) break

    allActivities.push(...batch)
    totalFetched += batch.length
    onProgress?.({ phase: 'activities', activitiesFetched: totalFetched })

    try {
      await db.activities.bulkPut(batch)
    } catch (err) {
      console.error('[Sync] bulkPut failed:', err)
      throw err
    }
    
    page++

    if (batch.length < 100) break
  }

  onProgress?.({ phase: 'done', activitiesFetched: totalFetched })
}

export async function syncStreamsForActivity(
  accessToken: string,
  activityId: number
): Promise<ActivityStream | null> {
  // Check cache first
  const cached = await db.streams.get(activityId)
  if (cached) return cached

  const raw = await fetchActivityStreams(accessToken, activityId) as Record<string, { data: unknown[] }>

  const stream: ActivityStream = {
    activityId,
    time: (raw.time?.data ?? []) as number[],
    distance: (raw.distance?.data ?? []) as number[],
    latlng: (raw.latlng?.data ?? []) as [number, number][],
    altitude: (raw.altitude?.data ?? []) as number[],
    heartrate: (raw.heartrate?.data ?? []) as number[],
    velocity_smooth: (raw.velocity_smooth?.data ?? []) as number[],
    cadence: (raw.cadence?.data ?? []) as number[],
  }

  await db.streams.put(stream)

  return stream
}
