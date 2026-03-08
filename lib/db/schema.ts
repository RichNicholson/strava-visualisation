import Dexie, { Table } from 'dexie'
import type { StravaActivity, ActivityStream, Athlete } from '../strava/types'

export class StravaDB extends Dexie {
  activities!: Table<StravaActivity>
  streams!: Table<ActivityStream>
  athlete!: Table<Athlete>

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
