'use client'

import { useState } from 'react'
import { db, clearAll, exportFixture } from '../../lib/db/schema'
import type { Athlete } from '../../lib/strava/types'
import { useTheme } from '../../hooks/useTheme'

interface SettingsPanelProps {
  athlete: Athlete | null
  rosterIds?: number[]
  onClose: () => void
  onFullResync: () => void
}

export function SettingsPanel({ athlete, rosterIds = [], onClose, onFullResync }: SettingsPanelProps) {
  const { isDark, setTheme } = useTheme()
  const [dateOfBirth, setDateOfBirth] = useState(athlete?.dateOfBirth ?? '')
  const [sex, setSex] = useState<'M' | 'F'>(athlete?.sex ?? 'M')
  const [units, setUnits] = useState<'metric' | 'imperial'>(athlete?.units ?? 'metric')
  const [saving, setSaving] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [exporting, setExporting] = useState(false)

  async function handleExportFixture() {
    setExporting(true)
    try {
      const fixture = await exportFixture(rosterIds)
      if (!fixture) return
      const json = JSON.stringify(fixture, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `stravaviz-fixture-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  async function handleClearData() {
    setClearing(true)
    await clearAll()
    window.location.href = '/'
  }

  function handleFullResync() {
    onClose()
    onFullResync()
  }

  async function save() {
    if (!athlete) return
    setSaving(true)
    await db.athlete.update(athlete.id, {
      dateOfBirth: dateOfBirth || undefined,
      sex,
      units,
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100 text-lg">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Date of birth and gender are used to compute WMA age-grade contours and
            per-activity age grades. Stored only in your browser.
          </p>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date of birth</label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            {dateOfBirth && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {(() => {
                  const dob = new Date(dateOfBirth)
                  const today = new Date()
                  const years = today.getFullYear() - dob.getFullYear()
                  const bday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate())
                  return `Age: ${today >= bday ? years : years - 1}`
                })()}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Units</label>
            <div className="flex gap-3">
              {(['metric', 'imperial'] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => setUnits(u)}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    units === u
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-orange-300'
                  }`}
                >
                  {u === 'metric' ? 'km' : 'miles'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Gender</label>
            <div className="flex gap-3">
              {(['M', 'F'] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setSex(g)}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    sex === g
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-orange-300'
                  }`}
                >
                  {g === 'M' ? 'Male' : 'Female'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {athlete ? (
          <button
            onClick={save}
            disabled={saving}
            className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold rounded-xl transition-colors"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center">
            Connect with Strava first to save settings.
          </p>
        )}

        {/* Appearance */}
        <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-2">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Appearance</p>
          <div className="flex gap-3">
            {(['light', 'dark'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  (t === 'dark') === isDark
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-orange-300'
                }`}
              >
                {t === 'light' ? 'Light' : 'Dark'}
              </button>
            ))}
          </div>
        </div>

        {/* Data management */}
        <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-2">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Data</p>

          <button
            onClick={handleFullResync}
            className="w-full py-2 border border-gray-200 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Re-sync all
          </button>

          <button
            onClick={handleExportFixture}
            disabled={exporting}
            className="w-full py-2 border border-gray-200 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            title={rosterIds.length > 0 ? `Exports all activities + streams for ${rosterIds.length} rostered run(s)` : 'Exports all activities (add runs to roster to include their streams)'}
          >
            {exporting ? 'Exporting…' : `Export test fixture${rosterIds.length > 0 ? ` (${rosterIds.length} streams)` : ''}`}
          </button>

          {!confirmClear ? (
            <button
              onClick={() => setConfirmClear(true)}
              className="w-full py-2 border border-red-200 text-sm text-red-600 rounded-xl hover:bg-red-50 transition-colors"
            >
              Clear data
            </button>
          ) : (
            <div className="rounded-xl border border-red-200 p-3 space-y-2 bg-red-50 dark:bg-red-950">
              <p className="text-sm text-red-700 dark:text-red-300">
                This will delete all local activities, streams, and your profile. Are you sure?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmClear(false)}
                  disabled={clearing}
                  className="flex-1 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearData}
                  disabled={clearing}
                  className="flex-1 py-1.5 text-sm bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg transition-colors"
                >
                  {clearing ? 'Clearing…' : 'Yes, clear all'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
