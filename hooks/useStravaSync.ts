'use client'

import { useState, useCallback } from 'react'
import { syncActivities, getAccessToken, type SyncProgress } from '../lib/db/sync'

export function useStravaSync() {
  const [progress, setProgress] = useState<SyncProgress | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  const startSync = useCallback(async () => {
    const token = getAccessToken()
    if (!token) return

    setIsSyncing(true)
    try {
      await syncActivities(token, setProgress)
    } catch (err) {
      setProgress({
        phase: 'error',
        activitiesFetched: 0,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    } finally {
      setIsSyncing(false)
    }
  }, [])

  return { progress, isSyncing, startSync }
}
