import Dexie, { Table } from 'dexie'
import type { StravaActivity, ActivityStream, Athlete, WorkspaceState } from '../strava/types'

export interface SavedLayout {
  id: string
  name: string
  workspace: WorkspaceState
}

// ── E2E fixture types ─────────────────────────────────────────────────────────

export interface E2EFixture {
  /** Schema version — increment when the shape changes */
  version: number
  athlete: Athlete
  activities: StravaActivity[]
  /** Streams for a subset of activities (e.g. rostered runs only) */
  streams: ActivityStream[]
}

export class StravaDB extends Dexie {
  activities!: Table<StravaActivity>
  streams!: Table<ActivityStream>
  athlete!: Table<Athlete>
  savedLayouts!: Table<SavedLayout>

  constructor() {
    super('StravaViz')

    this.version(1).stores({
      activities: 'id, type, sport_type, start_date, distance, moving_time, average_speed, average_heartrate',
      streams: 'activityId',
      athlete: 'id',
    })

    // Version bumped to align with existing dev database; schema is unchanged.
    this.version(10).stores({
      activities: 'id, type, sport_type, start_date, distance, moving_time, average_speed, average_heartrate',
      streams: 'activityId',
      athlete: 'id',
    })

    // Version 11: add savedLayouts table for named layout presets.
    this.version(11).stores({
      activities: 'id, type, sport_type, start_date, distance, moving_time, average_speed, average_heartrate',
      streams: 'activityId',
      athlete: 'id',
      savedLayouts: 'id, name',
    })
  }
}

export const db = new StravaDB()

/**
 * Clear all local data — activities, streams, and athlete profile.
 * After calling this the app has no locally persisted state.
 */
export async function clearAll(): Promise<void> {
  await Promise.all([
    db.activities.clear(),
    db.streams.clear(),
    db.athlete.clear(),
  ])
}

/**
 * Export a fixture containing all activities and streams for the given activity
 * IDs (e.g. rostered runs). Returns null if no athlete record exists.
 */
export async function exportFixture(streamActivityIds: number[]): Promise<E2EFixture | null> {
  const [athlete, activities, streams] = await Promise.all([
    db.athlete.toArray(),
    db.activities.toArray(),
    streamActivityIds.length > 0
      ? db.streams.where('activityId').anyOf(streamActivityIds).toArray()
      : Promise.resolve([]),
  ])
  if (!athlete[0]) return null
  return { version: 1, athlete: athlete[0], activities, streams }
}

/**
 * Seed the local database from an E2E fixture.
 * Existing data is cleared first so tests start from a known state.
 */
export async function seedFromFixture(fixture: E2EFixture): Promise<void> {
  await clearAll()
  await Promise.all([
    db.athlete.put(fixture.athlete),
    db.activities.bulkPut(fixture.activities),
    fixture.streams.length > 0 ? db.streams.bulkPut(fixture.streams) : Promise.resolve(),
  ])
}
