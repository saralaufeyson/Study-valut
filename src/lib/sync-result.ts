import type { Entity } from './model'

type SyncResult =
  | { conflict: false; row: Entity }
  | { conflict: true; row: Entity | null; reason?: string }

// A malformed response must never acknowledge or remove an offline change.
export function parseSyncResult(
  value: unknown,
  expectedId: string,
): SyncResult {
  if (
    !value ||
    typeof value !== 'object' ||
    !('conflict' in value) ||
    typeof value.conflict !== 'boolean' ||
    !('row' in value)
  )
    throw new Error(
      'The server returned an invalid sync response. Your changes remain saved on this device.',
    )
  const row = value.row
  if (row === null && value.conflict)
    return {
      conflict: true,
      row: null,
      ...('reason' in value && typeof value.reason === 'string'
        ? { reason: value.reason }
        : {}),
    }
  if (
    !row ||
    typeof row !== 'object' ||
    !('id' in row) ||
    row.id !== expectedId ||
    !('revision' in row) ||
    typeof row.revision !== 'number' ||
    !Number.isInteger(row.revision) ||
    row.revision < 1 ||
    !('updated_at' in row) ||
    typeof row.updated_at !== 'string' ||
    !('deleted_at' in row) ||
    (row.deleted_at !== null && typeof row.deleted_at !== 'string')
  )
    throw new Error(
      'The server returned an invalid saved record. Your changes remain saved on this device.',
    )
  return value.conflict
    ? {
        conflict: true,
        row: row as Entity,
        ...('reason' in value && typeof value.reason === 'string'
          ? { reason: value.reason }
          : {}),
      }
    : { conflict: false, row: row as Entity }
}
