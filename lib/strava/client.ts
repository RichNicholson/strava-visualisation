/**
 * Browser-side Strava API client.
 * Activity data is fetched directly from Strava and stored in IndexedDB.
 * It never passes through our server.
 */

const STRAVA_API_BASE = 'https://www.strava.com/api/v3'

async function stravaFetch(path: string, accessToken: string): Promise<unknown> {
  const res = await fetch(`${STRAVA_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (res.status === 401) throw new Error('UNAUTHORIZED')
  if (res.status === 429) throw new Error('RATE_LIMITED')
  if (!res.ok) throw new Error(`Strava API error: ${res.status}`)
  return res.json()
}

export async function fetchAthlete(accessToken: string) {
  return stravaFetch('/athlete', accessToken)
}

export async function fetchActivitiesPage(
  accessToken: string,
  page: number,
  perPage = 100,
  after?: number // unix timestamp
): Promise<unknown[]> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    ...(after ? { after: String(after) } : {}),
  })
  const data = await stravaFetch(`/athlete/activities?${params}`, accessToken)
  return data as unknown[]
}

export async function fetchActivityStreams(
  accessToken: string,
  activityId: number
): Promise<unknown> {
  const keys = ['time', 'distance', 'latlng', 'altitude', 'heartrate', 'velocity_smooth', 'cadence', 'moving']
  const params = new URLSearchParams({
    keys: keys.join(','),
    key_by_type: 'true',
  })
  return stravaFetch(`/activities/${activityId}/streams?${params}`, accessToken)
}
