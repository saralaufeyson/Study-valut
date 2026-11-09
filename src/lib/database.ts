import { emptyWorkspace } from './model'
import type { Entity, Pending, Table, Workspace } from './model'

let connection: Promise<IDBDatabase> | undefined
function open() {
  if (!connection)
    connection = new Promise((resolve, reject) => {
      const request = indexedDB.open('studyvault', 1)
      request.onupgradeneeded = () =>
        request.result.createObjectStore('workspaces')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => {
        connection = undefined
        reject(request.error)
      }
    })
  return connection
}
// A read/write transaction serializes edits across browser tabs. Never await inside its callback.
export async function transact(
  scope: string,
  update?: (workspace: Workspace) => void,
): Promise<Workspace> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      'workspaces',
      update ? 'readwrite' : 'readonly',
    )
    const store = transaction.objectStore('workspaces')
    const request = store.get(scope)
    let workspace: Workspace
    request.onsuccess = () => {
      workspace = request.result || emptyWorkspace()
      try {
        if (update) {
          update(workspace)
          store.put(workspace, scope)
        }
      } catch (error) {
        transaction.abort()
        reject(error)
      }
    }
    transaction.oncomplete = () => resolve(workspace)
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () =>
      reject(transaction.error || new Error('Local save was interrupted.'))
  })
}
export function putChange(
  w: Workspace,
  table: Table,
  id: string,
  patch: Record<string, unknown>,
  cloud: boolean,
) {
  const records = w[table] as Record<string, Entity>
  const old = records[id]
  const now = new Date().toISOString()
  records[id] = {
    ...(old || { revision: 0, deleted_at: null }),
    ...patch,
    id,
    updated_at: now,
  } as Entity
  if (cloud) {
    const pending = w.pending[id]
    w.pending[id] = {
      table,
      record_id: id,
      baseRevision: pending?.baseRevision ?? old?.revision ?? 0,
      patch: { ...pending?.patch, ...patch },
      mutation_id: crypto.randomUUID(),
      ...(pending?.conflict ? { conflict: pending.conflict } : {}),
    }
  }
}
export function acknowledge(w: Workspace, sent: Pending, row: Entity) {
  const current = w.pending[sent.record_id]
  const records = w[sent.table] as Record<string, Entity>
  if (current && current.mutation_id !== sent.mutation_id) {
    records[row.id] = { ...row, ...current.patch } as Entity
    current.baseRevision = row.revision
  } else {
    records[row.id] = row
    delete w.pending[row.id]
  }
}
export function mergeRemote(w: Workspace, table: Table, rows: Entity[]) {
  const records = w[table] as Record<string, Entity>
  for (const row of rows) if (!w.pending[row.id]) records[row.id] = row
}
