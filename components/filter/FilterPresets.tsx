'use client'

import { useEffect, useRef, useState } from 'react'
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

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (detailsRef.current && !detailsRef.current.contains(e.target as Node)) {
        detailsRef.current.open = false
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const trimmedName = name.trim()
  const isUpdate = trimmedName.length > 0 && presets.some((p) => p.name === trimmedName)

  function handleSave() {
    if (!trimmedName) return
    save(trimmedName, currentFilter)
    setName('')
  }

  function handleLoad(preset: { name: string; filter: FilterState }) {
    onLoad(preset.filter)
    // Populate the name field so the user can immediately overwrite with one click
    setName(preset.name)
    if (detailsRef.current) detailsRef.current.open = false
  }

  function handleDelete(presetName: string, e: React.MouseEvent) {
    e.stopPropagation()
    remove(presetName)
    // Clear the name field if it was pointing at the deleted preset
    if (name.trim() === presetName) setName('')
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
                className="flex items-center gap-1 px-2 py-1.5 hover:bg-orange-50 group/row"
              >
                <button
                  onClick={() => handleLoad(preset)}
                  className="flex-1 text-left text-sm text-gray-700 truncate"
                >
                  {preset.name}
                </button>
                <button
                  onClick={(e) => handleDelete(preset.name, e)}
                  className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover/row:opacity-100 transition-opacity"
                  aria-label={`Delete preset ${preset.name}`}
                  title="Delete preset"
                >
                  <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5.5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                    <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </details>

      {/* Save / update current filter as a preset */}
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
          disabled={!trimmedName}
          className="px-2 py-1 text-xs bg-orange-500 text-white rounded disabled:bg-orange-300 whitespace-nowrap"
        >
          {isUpdate ? 'Update' : 'Save'}
        </button>
      </div>
    </div>
  )
}
