'use client'

import { useState } from 'react'
import { db } from '../../lib/db/schema'
import type { Athlete } from '../../lib/strava/types'

interface SettingsPanelProps {
  athlete: Athlete | null
  onClose: () => void
}

export function SettingsPanel({ athlete, onClose }: SettingsPanelProps) {
  const [dateOfBirth, setDateOfBirth] = useState(athlete?.dateOfBirth ?? '')
  const [sex, setSex] = useState<'M' | 'F'>(athlete?.sex ?? 'M')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!athlete) return
    setSaving(true)
    await db.athlete.update(athlete.id, {
      dateOfBirth: dateOfBirth || undefined,
      sex,
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 text-lg">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
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
          <p className="text-sm text-gray-600">
            Date of birth and gender are used to compute WMA age-grade contours and
            per-activity age grades. Stored only in your browser.
          </p>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Date of birth</label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            {dateOfBirth && (
              <p className="text-xs text-gray-400">
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
            <label className="text-sm font-medium text-gray-700">Gender</label>
            <div className="flex gap-3">
              {(['M', 'F'] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setSex(g)}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    sex === g
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'border-gray-200 text-gray-600 hover:border-orange-300'
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
          <p className="text-sm text-gray-400 text-center">
            Connect with Strava first to save settings.
          </p>
        )}
      </div>
    </div>
  )
}
