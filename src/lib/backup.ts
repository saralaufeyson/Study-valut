import { allLessons, colors, subjectsOf, topicsOf, youtubeId } from './model'
import type { Lesson, Subject, Topic, Workspace } from './model'
export interface Backup {
  format: 'studyvault'
  version: 1
  exportedAt: string
  subjects: Subject[]
  topics: Topic[]
  lessons: Lesson[]
}
export function makeBackup(w: Workspace): Backup {
  const subjects = subjectsOf(w)
  return {
    format: 'studyvault',
    version: 1,
    exportedAt: new Date().toISOString(),
    subjects,
    topics: subjects.flatMap((s) => topicsOf(w, s.id)),
    lessons: allLessons(w),
  }
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const text = (value: unknown, max: number, required = false): value is string =>
  typeof value === 'string' &&
  value.length <= max &&
  (!required || value.trim().length > 0)
const validPosition = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  value >= 0 &&
  value < 1_000_000_000
export function parseBackup(input: string): Backup {
  if (input.length > 10_000_000)
    throw new Error('Backups must be smaller than 10 MB.')
  const value = JSON.parse(input)
  if (
    !value ||
    value.format !== 'studyvault' ||
    value.version !== 1 ||
    !['subjects', 'topics', 'lessons'].every((key) => Array.isArray(value[key]))
  )
    throw new Error('Choose a valid StudyVault version 1 backup.')
  const ids = new Set<string>()
  for (const key of ['subjects', 'topics', 'lessons'])
    for (const row of value[key]) {
      if (!row || !uuid.test(row.id) || ids.has(row.id))
        throw new Error('Backup contains an invalid or repeated ID.')
      ids.add(row.id)
    }
  const subjects = new Set<string>(value.subjects.map((s: Subject) => s.id))
  const topics = new Set<string>(value.topics.map((t: Topic) => t.id))
  for (const s of value.subjects)
    if (
      !text(s.name, 120, true) ||
      !text(s.description, 1000) ||
      !colors.includes(s.color) ||
      !text(s.icon, 30)
    )
      throw new Error('Invalid subject in backup.')
  for (const t of value.topics)
    if (
      !subjects.has(t.subject_id) ||
      !text(t.name, 120, true) ||
      !validPosition(t.position)
    )
      throw new Error('Invalid topic in backup.')
  for (const l of value.lessons)
    if (
      !topics.has(l.topic_id) ||
      !text(l.title, 200, true) ||
      !text(l.url, 2000) ||
      youtubeId(l.url) !== l.video_id ||
      !validPosition(l.position) ||
      typeof l.completed !== 'boolean' ||
      !text(l.notes, 20000) ||
      !(
        l.last_opened_at === null ||
        (typeof l.last_opened_at === 'string' &&
          Number.isFinite(Date.parse(l.last_opened_at)))
      )
    )
      throw new Error('Invalid lesson in backup.')
  return value as Backup
}
export function downloadBackup(w: Workspace) {
  const blob = new Blob([JSON.stringify(makeBackup(w), null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `studyvault-${new Date().toISOString().slice(0, 10)}.json`
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
