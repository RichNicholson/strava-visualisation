'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAthlete } from '../hooks/useActivities'

/**
 * Invisible component rendered on the landing page.
 * If an athlete record already exists in Dexie the user is authenticated,
 * so redirect them straight to the dashboard.
 */
export function AuthRedirect() {
  const athlete = useAthlete()
  const router = useRouter()

  useEffect(() => {
    // athlete === null  → Dexie query returned nothing (not authenticated)
    // athlete === undefined → query still loading; do nothing yet
    if (athlete) {
      router.replace('/dashboard')
    }
  }, [athlete, router])

  return null
}
