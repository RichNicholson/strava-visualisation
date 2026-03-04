'use client'

import { useState, useEffect } from 'react'
import { db } from '../lib/db/schema'
import { syncStreamsForActivity } from '../lib/db/sync'
import { getAccessToken } from '../lib/db/sync'
import type { ActivityStream } from '../lib/strava/types'

export function useStream(activityId: number | null): {
  stream: ActivityStream | null
  loading: boolean
  error: string | null
} {
  const [stream, setStream] = useState<ActivityStream | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!activityId) return

    setLoading(true)
    setError(null)

    db.streams.get(activityId).then(async (cached) => {
      if (cached) {
        setStream(cached)
        setLoading(false)
        return
      }

      const token = getAccessToken()
      if (!token) {
        setError('Not authenticated')
        setLoading(false)
        return
      }

      try {
        const fetched = await syncStreamsForActivity(token, activityId)
        setStream(fetched)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch stream')
      } finally {
        setLoading(false)
      }
    })
  }, [activityId])

  return { stream, loading, error }
}

export function useStreams(activityIds: number[]): {
  streams: Map<number, ActivityStream>
  loading: boolean
} {
  const [streams, setStreams] = useState<Map<number, ActivityStream>>(new Map())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (activityIds.length === 0) return

    setLoading(true)
    const token = getAccessToken()

    Promise.all(
      activityIds.map(async (id) => {
        const cached = await db.streams.get(id)
        if (cached) return [id, cached] as [number, ActivityStream]

        if (!token) return null

        const fetched = await syncStreamsForActivity(token, id)
        return fetched ? [id, fetched] as [number, ActivityStream] : null
      })
    ).then((results) => {
      const map = new Map<number, ActivityStream>()
      for (const r of results) {
        if (r) map.set(r[0], r[1])
      }
      setStreams(map)
      setLoading(false)
    })
  }, [activityIds.join(',')])  // eslint-disable-line react-hooks/exhaustive-deps

  return { streams, loading }
}
