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
  moving?: boolean[]  // per-sample boolean from Strava's MovingStream
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
  heartrate: { min: number; max: number; includeNoHR: boolean } | null // bpm; null = inactive
  elevationGain: { min: number; max: number } | null // metres; null = inactive
  sufferScore: { min: number; max: number } | null // Strava suffer score; null = inactive
  movingTime: { min: number; max: number } | null // seconds; null = inactive
  elapsedTime: { min: number; max: number } | null // seconds; null = inactive
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

// ── Layout types ─────────────────────────────────────────────────────────────

export type ViewType = 'scatter' | 'table' | 'series' | 'map'
export type LayoutMode = 'single' | 'double' | 'quad'

/** All metrics that can be plotted on the Series y-axis. */
export type SeriesMetric = 'cumulative' | 'rolling' | 'raw' | 'heartrate' | 'elevation' | 'cadence' | 'delta'

/**
 * One metric channel rendered in a Series slot.
 *
 * `yTop` and `yBottom` are percentages (0–100) of the plot height from the top edge.
 * Non-overlapping bands render as stacked swimlanes; fully-overlapping bands render as
 * a dual-axis overlay (secondary channels are drawn dashed at 0.7 opacity).
 */
export interface Channel {
  metric: SeriesMetric
  side: 'left' | 'right'    // which side the y-axis is drawn on
  yTop: number               // 0–100
  yBottom: number            // 0–100
  scaleMode: 'auto' | '1min' | '2min' | 'fixed'
  scaleMin?: number | null   // data-layer units; only active when scaleMode === 'fixed'
  scaleMax?: number | null
  colorIndex?: number        // stable index into CHANNEL_PALETTE; assigned on creation
}

export const DEFAULT_CHANNEL: Channel = {
  metric: 'cumulative',
  side: 'left',
  yTop: 0,
  yBottom: 100,
  scaleMode: 'auto',
  colorIndex: 0,
}

/** Configuration for a single panel slot in the dashboard layout. */
export interface SlotConfig {
  viewType: ViewType
  channels: Channel[]  // non-empty when viewType === 'series'
}

/**
 * Layout configuration for one workspace tab.
 * - single: 1 slot  — top bar buttons select the view (identical to legacy behaviour)
 * - double: 2 slots — each panel has its own view-type tab strip
 * - quad:   4 slots — 2×2 grid, each panel independently tabbed
 */
export interface LayoutConfig {
  mode: LayoutMode
  slots: SlotConfig[]
}

/** A named workspace tab, each with its own independent layout configuration. */
export interface WorkspaceTab {
  id: string
  name: string
  layoutConfig: LayoutConfig
}

/** Full workspace state — multiple named tabs, each with an independent layout. */
export interface WorkspaceState {
  tabs: WorkspaceTab[]
  activeTabId: string
}

export const DEFAULT_WORKSPACE: WorkspaceState = {
  tabs: [{ id: 'tab-1', name: 'Tab 1', layoutConfig: { mode: 'single', slots: [{ viewType: 'scatter', channels: [] }] } }],
  activeTabId: 'tab-1',
}

/** Return a default SlotConfig for a given viewType. */
export function defaultSlot(viewType: ViewType): SlotConfig {
  return {
    viewType,
    channels: viewType === 'series' ? [{ ...DEFAULT_CHANNEL }] : [],
  }
}

// ─────────────────────────────────────────────────────────────────────────────

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
