'use client'

import { useEffect, useState } from 'react'
import type { FilterState } from '../lib/strava/types'

interface FilterPreset {
  name: string
  filter: FilterState
}

const KEY = 'strava-filter-presets'

/** Fill in any fields added after a preset was saved so old presets stay valid. */
function migrateFilter(f: FilterState): FilterState {
  return {
    ...f,
    elevationGain: f.elevationGain ?? null,
    sufferScore: f.sufferScore ?? null,
    movingTime: f.movingTime ?? null,
    elapsedTime: f.elapsedTime ?? null,
  }
}

export function useFilterPresets() {
  const [presets, setPresets] = useState<FilterPreset[]>([])

  useEffect(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stored: any[] = JSON.parse(localStorage.getItem(KEY) ?? '[]')
      setPresets(stored.map((p) => ({ ...p, filter: migrateFilter(p.filter) })))
    } catch {
      // nothing stored
    }
  }, [])

  const save = (name: string, filter: FilterState) => {
    const next = [...presets.filter((p) => p.name !== name), { name, filter }]
    setPresets(next)
    localStorage.setItem(KEY, JSON.stringify(next))
  }

  const remove = (name: string) => {
    const next = presets.filter((p) => p.name !== name)
    setPresets(next)
    localStorage.setItem(KEY, JSON.stringify(next))
  }

  return { presets, save, remove }
}
