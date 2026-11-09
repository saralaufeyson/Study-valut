import { describe, expect, it } from 'vitest'
import { parseSyncResult } from './sync-result'
const row = {
  id: 'lesson-id',
  revision: 2,
  updated_at: '2026-11-07T00:00:00Z',
  deleted_at: null,
}
describe('cloud sync responses', () => {
  it('accepts a saved record for the requested change', () =>
    expect(parseSyncResult({ conflict: false, row }, row.id)).toEqual({
      conflict: false,
      row,
    }))
  it('preserves a conflict and the other device’s version', () =>
    expect(
      parseSyncResult({ conflict: true, row, reason: 'revision' }, row.id),
    ).toEqual({ conflict: true, row, reason: 'revision' }))
  it('supports a blocked create under a deleted parent', () =>
    expect(
      parseSyncResult(
        { conflict: true, row: null, reason: 'parent_deleted' },
        row.id,
      ),
    ).toEqual({ conflict: true, row: null, reason: 'parent_deleted' }))
  it.each([
    null,
    {},
    { conflict: false, row: null },
    { conflict: false, row: { ...row, revision: 0 } },
    { conflict: false, row: { ...row, id: 'different-id' } },
  ])(
    'rejects a response that would incorrectly acknowledge offline data: %j',
    (value) =>
      expect(() => parseSyncResult(value, row.id)).toThrow('remain saved'),
  )
})
