'use client'

import { useState } from 'react'
import type { FilterState } from '../../lib/strava/types'
import { useFilterPresets } from '../../hooks/useFilterPresets'

interface FilterPresetsProps {
  currentFilter: FilterState
  onLoad: (filter: FilterState) => void
}

export function FilterPresets({ currentFilter, onLoad }: FilterPresetsProps) {
  const { presets, save, remove } = useFilterPresets()
  const [name, setName] = useState('')

  function handleSave() {
    if (!name.trim()) return
    save(name.trim(), currentFilter)
    setName('')
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Presets</p>
      <div className="flex gap-1">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder="Preset name"
          className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded outline-none focus:border-orange-400"
        />
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="px-2 py-1 text-xs bg-orange-500 text-white rounded disabled:bg-orange-300"
        >
          Save
        </button>
      </div>
      {presets.length > 0 && (
        <div className="max-h-24 overflow-y-auto space-y-1">
          {presets.map((preset) => (
            <div key={preset.name} className="flex items-center gap-1">
              <span className="flex-1 text-xs text-gray-700 truncate">{preset.name}</span>
              <button
                onClick={() => onLoad(preset.filter)}
                className="px-1.5 py-0.5 text-xs border border-gray-300 rounded hover:border-orange-400 text-gray-600"
              >
                Load
              </button>
              <button
                onClick={() => remove(preset.name)}
                className="text-xs text-gray-400 hover:text-red-500 px-1"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
