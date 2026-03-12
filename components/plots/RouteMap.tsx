'use client'

import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'
import type { StravaActivity, ActivityStream } from '../../lib/strava/types'

interface RouteMapProps {
  activity: StravaActivity
  stream: ActivityStream | null
  loading?: boolean
}

export function RouteMap({ activity, stream, loading }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // Store map instance in a ref to clean up on unmount or activity change
  const mapRef = useRef<{ remove: () => void } | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Tear down any existing map instance before creating a new one
    mapRef.current?.remove()
    mapRef.current = null

    let cancelled = false

    import('leaflet').then((L) => {
      if (cancelled || !containerRef.current) return

      // Prevent Leaflet's default icon resolver from producing webpack:/// paths
      // that Chrome DevTools can't handle ("Unable to add filesystem: <illegal path>")
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl

      const map = L.map(containerRef.current)
      mapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map)

      if (stream?.latlng && stream.latlng.length > 0) {
        const line = L.polyline(stream.latlng, { color: '#f97316', weight: 3, opacity: 0.85 })
        line.addTo(map)
        map.fitBounds(line.getBounds(), { padding: [24, 24] })

        // Start marker
        L.circleMarker(stream.latlng[0], { radius: 6, color: '#fff', fillColor: '#22c55e', fillOpacity: 1, weight: 2 }).addTo(map)
        // End marker
        L.circleMarker(stream.latlng[stream.latlng.length - 1], { radius: 6, color: '#fff', fillColor: '#ef4444', fillOpacity: 1, weight: 2 }).addTo(map)
      } else {
        // No GPS data — centre on a default view
        map.setView([51.5, -0.1], 10)
      }
    })

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [activity.id, stream])

  return (
    <div className="h-full flex flex-col">
      {/* Activity info bar */}
      <div className="flex-shrink-0 px-4 py-2 border-b border-gray-100 flex items-center gap-4 text-sm text-gray-600">
        <span className="font-medium text-gray-800 truncate max-w-xs">{activity.name}</span>
        <span>{new Date(activity.start_date_local).toLocaleDateString()}</span>
        <span>{(activity.distance / 1000).toFixed(2)} km</span>
        {activity.moving_time && (
          <span>
            {Math.floor(activity.moving_time / 60)}:{String(activity.moving_time % 60).padStart(2, '0')}
          </span>
        )}
      </div>

      {/* Map container */}
      <div className="flex-1 relative min-h-0">
        <div ref={containerRef} className="absolute inset-0" />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10">
            <span className="text-gray-500 text-sm">Loading route...</span>
          </div>
        )}
        {!loading && !stream?.latlng?.length && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
            <span className="text-gray-400 text-sm">No GPS data for this activity</span>
          </div>
        )}
      </div>
    </div>
  )
}
