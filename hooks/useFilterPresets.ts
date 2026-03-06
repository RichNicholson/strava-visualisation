'use client'

import { useState } from 'react'
import type { FilterState } from '../lib/strava/types'

interface FilterPreset {
  name: string
  filter: FilterState
}

const KEY = 'strava-filter-presets'

export function useFilterPresets() {
  const [presets, setPresets] = useState<FilterPreset[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? '[]')
    } catch {
      return []
    }
  })

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
