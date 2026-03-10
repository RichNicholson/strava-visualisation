'use client'

import { useRef, useState } from 'react'
import type { FilterState } from '../../lib/strava/types'
import { useFilterPresets } from '../../hooks/useFilterPresets'

interface FilterPresetsProps {
  currentFilter: FilterState
  onLoad: (filter: FilterState) => void
}

export function FilterPresets({ currentFilter, onLoad }: FilterPresetsProps) {
  const { presets, save, remove } = useFilterPresets()
  const [name, setName] = useState('')
  const detailsRef = useRef<HTMLDetailsElement>(null)

  function handleSave() {
    if (!name.trim()) return
    save(name.trim(), currentFilter)
    setName('')
  }

  function handleLoad(filter: FilterState) {
    onLoad(filter)
    if (detailsRef.current) detailsRef.current.open = false
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Presets</p>

      {/* Preset dropdown */}
      <details ref={detailsRef} className="relative group">
        <summary className="flex items-center justify-between cursor-pointer select-none rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:border-orange-300 list-none">
          <span className="truncate text-gray-500 italic">
            {presets.length === 0 ? 'No saved presets yet' : 'Select a preset…'}
          </span>
          <svg
            className="ml-2 h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-180"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </summary>
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
          {presets.length === 0 ? (
            <p className="px-3 py-2 text-xs text-gray-400 italic">
              Save your current filter as a preset using the field below.
            </p>
          ) : (
            presets.map((preset) => (
              <div
                key={preset.name}
                className="flex items-center gap-1 px-3 py-1.5 hover:bg-orange-50"
              >
                <button
                  onClick={() => handleLoad(preset.filter)}
                  className="flex-1 text-left text-sm text-gray-700 truncate"
                >
                  {preset.name}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    remove(preset.name)
                  }}
                  className="text-xs text-gray-400 hover:text-red-500 px-1 shrink-0"
                  aria-label={`Delete preset ${preset.name}`}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </details>

      {/* Save current filter as a new preset */}
      <div className="flex gap-1">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder="Name this filter…"
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
    </div>
  )
}
