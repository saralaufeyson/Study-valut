import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { acknowledge, mergeRemote, putChange, transact } from './database'
import { emptyWorkspace } from './model'
import type { Subject } from './model'
const row: Subject = {
  id: 's',
  name: 'Math',
  description: '',
  color: 'sage',
  icon: 'math',
  revision: 2,
  updated_at: '2026-11-07',
  deleted_at: null,
}
describe('offline queue and synchronization', () => {
  it('persists concurrent edits without losing a record', async () => {
    const scope = crypto.randomUUID()
    await Promise.all(
      Array.from({ length: 15 }, (_, i) =>
        transact(scope, (w) =>
          putChange(w, 'subjects', String(i), { name: `Subject ${i}` }, true),
        ),
      ),
    )
    const loaded = await transact(scope)
    expect(Object.keys(loaded.subjects)).toHaveLength(15)
    expect(Object.keys(loaded.pending)).toHaveLength(15)
  })
  it('coalesces offline edits while preserving the original expected revision', () => {
    const w = emptyWorkspace()
    w.subjects.s = row
    putChange(w, 'subjects', 's', { name: 'New' }, true)
    putChange(w, 'subjects', 's', { description: 'Offline note' }, true)
    expect(w.pending.s.baseRevision).toBe(2)
    expect(w.pending.s.patch).toEqual({
      name: 'New',
      description: 'Offline note',
    })
  })
  it('preserves an edit made while a request was in flight', () => {
    const w = emptyWorkspace()
    w.subjects.s = row
    putChange(w, 'subjects', 's', { name: 'First' }, true)
    const sent = structuredClone(w.pending.s)
    putChange(w, 'subjects', 's', { name: 'Second' }, true)
    acknowledge(w, sent, { ...row, name: 'First', revision: 3 })
    expect(w.subjects.s.name).toBe('Second')
    expect(w.pending.s.baseRevision).toBe(3)
    expect(w.pending.s.patch.name).toBe('Second')
  })
  it('does not replace local pending changes during a pull', () => {
    const w = emptyWorkspace()
    w.subjects.s = row
    putChange(w, 'subjects', 's', { name: 'Mine' }, true)
    mergeRemote(w, 'subjects', [{ ...row, name: 'Other device', revision: 4 }])
    expect(w.subjects.s.name).toBe('Mine')
  })
  it('clears an acknowledged change and applies remote tombstones', () => {
    const w = emptyWorkspace()
    w.subjects.s = row
    putChange(w, 'subjects', 's', { name: 'Synced' }, true)
    acknowledge(w, w.pending.s, { ...row, name: 'Synced', revision: 3 })
    expect(w.pending.s).toBeUndefined()
    mergeRemote(w, 'subjects', [
      { ...row, deleted_at: '2026-11-07', revision: 4 },
    ])
    expect(w.subjects.s.deleted_at).toBeTruthy()
  })
  it('isolates account data from local data and other accounts', async () => {
    await transact('account-a', (w) =>
      putChange(w, 'subjects', 'private', { name: 'Private' }, true),
    )
    expect((await transact('account-b')).subjects.private).toBeUndefined()
    expect((await transact('guest')).subjects.private).toBeUndefined()
  })
})
