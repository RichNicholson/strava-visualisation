export interface StravaActivity {
  id: number
  name: string
  type: string
  sport_type: string
  start_date: string
  start_date_local: string
  distance: number // metres
  moving_time: number // seconds
  elapsed_time: number // seconds
  total_elevation_gain: number // metres
  average_speed: number // m/s
  max_speed: number // m/s
  average_heartrate?: number
  max_heartrate?: number
  suffer_score?: number
  map: {
    id: string
    summary_polyline: string
  }
}

export interface ActivityStream {
  activityId: number
  time: number[]
  distance: number[]
  latlng?: [number, number][]
  altitude?: number[]
  heartrate?: number[]
  velocity_smooth?: number[]
  cadence?: number[]
}

export interface Athlete {
  id: number
  firstname: string
  lastname: string
  sex?: 'M' | 'F'
  age?: number
  dateOfBirth?: string
  last_synced?: string
  access_token?: string
  refresh_token?: string
  token_expires_at?: number
}

export interface FilterState {
  dateRange: { from: string; to: string } | null
  distanceRange: { min: number; max: number } | null // metres
  sport: string[]
  pace: {
    average: { min: number; max: number } | null // seconds/km; null = disabled
  }
}

export type MetricKey =
  | 'start_date'
  | 'distance'
  | 'moving_time'
  | 'elapsed_time'
  | 'total_elevation_gain'
  | 'average_speed'
  | 'average_pace' // computed: s/km
  | 'average_heartrate'
  | 'max_heartrate'
  | 'suffer_score'
  | 'age_grade' // computed: WMA age-grade %

export const METRIC_LABELS: Record<MetricKey, string> = {
  start_date: 'Date',
  distance: 'Distance (km)',
  moving_time: 'Moving Time',
  elapsed_time: 'Elapsed Time',
  total_elevation_gain: 'Elevation Gain (m)',
  average_speed: 'Avg Speed (km/h)',
  average_pace: 'Avg Pace (min/km)',
  average_heartrate: 'Avg Heart Rate',
  max_heartrate: 'Max Heart Rate',
  suffer_score: 'Suffer Score',
  age_grade: 'Age Grade (%)',
}

export function getMetricValue(activity: StravaActivity, metric: MetricKey): number {
  switch (metric) {
    case 'start_date':
      return new Date(activity.start_date).getTime()
    case 'distance':
      return activity.distance / 1000
    case 'moving_time':
      return activity.moving_time
    case 'elapsed_time':
      return activity.elapsed_time
    case 'total_elevation_gain':
      return activity.total_elevation_gain
    case 'average_speed':
      return activity.average_speed * 3.6
    case 'average_pace':
      return activity.average_speed > 0 ? 1000 / activity.average_speed : 0
    case 'average_heartrate':
      return activity.average_heartrate ?? 0
    case 'max_heartrate':
      return activity.max_heartrate ?? 0
    case 'suffer_score':
      return activity.suffer_score ?? 0
    case 'age_grade':
      // Derived metric requiring athlete context — computed in the component layer.
      // Returning 0 here is a safe fallback that should never be reached in normal use.
      return 0
  }
}
