'use client'

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import type { WorkspaceState } from '../../lib/strava/types'
import { useSavedLayouts } from '../../hooks/useSavedLayouts'

interface LayoutPresetsProps {
  currentWorkspace: WorkspaceState
  defaultName?: string
  onLoad: (workspace: WorkspaceState) => void
}

export function LayoutPresets({ currentWorkspace, defaultName = '', onLoad }: LayoutPresetsProps) {
  const { layouts, saveLayout, loadLayout, deleteLayout } = useSavedLayouts()
  const [name, setName] = useState(defaultName)
  const detailsRef = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    setName(defaultName)
  }, [defaultName])

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
  const isUpdate = trimmedName.length > 0 && layouts.some((l) => l.name === trimmedName)

  function handleSave() {
    if (!trimmedName) return
    saveLayout(trimmedName, currentWorkspace)
    setName('')
  }

  function handleLoad(id: string) {
    const layout = loadLayout(id)
    if (layout) {
      onLoad(layout.workspace)
      setName(layout.name)
    }
    if (detailsRef.current) detailsRef.current.open = false
  }

  function handleDelete(id: string, e: ReactMouseEvent) {
    e.stopPropagation()
    deleteLayout(id)
    const layout = loadLayout(id)
    if (layout && name.trim() === layout.name) setName('')
  }

  return (
    <div className="flex items-center gap-1">
      {/* Preset dropdown */}
      <details ref={detailsRef} className="relative">
        <summary className="flex items-center gap-1 cursor-pointer select-none rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:border-orange-300 list-none">
          <span>Layouts</span>
          <svg
            className="h-3 w-3 shrink-0 text-gray-400 dark:text-gray-500"
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
        <div className="absolute z-30 mt-1 w-56 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-lg max-h-64 overflow-y-auto">
          {layouts.length === 0 ? (
            <p className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500 italic">
              No saved layouts yet.
            </p>
          ) : (
            layouts.map((layout) => (
              <div
                key={layout.id}
                className="flex items-center gap-1 px-2 py-1.5 hover:bg-orange-50 dark:hover:bg-orange-900/20 group/row"
              >
                <button
                  onClick={() => handleLoad(layout.id)}
                  className="flex-1 text-left text-xs text-gray-700 dark:text-gray-200 truncate"
                >
                  {layout.name}
                </button>
                <button
                  onClick={(e) => handleDelete(layout.id, e)}
                  className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover/row:opacity-100 transition-opacity"
                  aria-label={`Delete layout ${layout.name}`}
                  title="Delete layout"
                >
                  <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5.5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                    <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                  </svg>
                </button>
              </div>
            ))
          )}
          {/* Save current layout */}
          <div className="flex gap-1 p-2 border-t border-gray-100 dark:border-gray-600">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="Name this layout…"
              className="flex-1 text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded outline-none focus:border-orange-400"
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
      </details>
    </div>
  )
}
