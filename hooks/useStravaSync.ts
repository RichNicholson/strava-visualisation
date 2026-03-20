'use client'

import { useState, useCallback } from 'react'
import { syncActivities, getAccessToken, type SyncProgress } from '../lib/db/sync'

export function useStravaSync() {
  const [progress, setProgress] = useState<SyncProgress | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  const startSync = useCallback(async (forceFullSync = false) => {
    const token = getAccessToken()
    if (!token) {
      setProgress({
        phase: 'error',
        activitiesFetched: 0,
        importedActivities: [],
        error: 'UNAUTHORIZED',
      })
      return
    }

    setIsSyncing(true)
    try {
      await syncActivities(token, setProgress, forceFullSync)
    } catch (err) {
      setProgress({
        phase: 'error',
        activitiesFetched: 0,
        importedActivities: [],
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    } finally {
      setIsSyncing(false)
    }
  }, [])

  const clearProgress = useCallback(() => setProgress(null), [])

  return { progress, isSyncing, startSync, clearProgress }
}
