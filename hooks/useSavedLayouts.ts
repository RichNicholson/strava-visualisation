'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db/schema'
import type { SavedLayout } from '../lib/db/schema'
import type { WorkspaceState } from '../lib/strava/types'

export function useSavedLayouts() {
  const layouts = useLiveQuery(() => db.savedLayouts.orderBy('name').toArray(), []) ?? []

  async function saveLayout(name: string, workspace: WorkspaceState) {
    const existing = await db.savedLayouts.where('name').equals(name).first()
    if (existing) {
      await db.savedLayouts.put({ ...existing, workspace })
    } else {
      await db.savedLayouts.put({ id: crypto.randomUUID(), name, workspace })
    }
  }

  async function deleteLayout(id: string) {
    await db.savedLayouts.delete(id)
  }

  function loadLayout(id: string): SavedLayout | undefined {
    return layouts.find((l) => l.id === id)
  }

  return { layouts, saveLayout, loadLayout, deleteLayout }
}
