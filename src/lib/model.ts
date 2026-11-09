export const colors = ['sage', 'sand', 'blue', 'rose', 'violet'] as const
export type Color = (typeof colors)[number]
export type Table = 'subjects' | 'topics' | 'lessons'
export interface Base {
  id: string
  revision: number
  updated_at: string
  deleted_at: string | null
}
export interface Subject extends Base {
  name: string
  description: string
  color: Color
  icon: string
}
export interface Topic extends Base {
  subject_id: string
  name: string
  position: number
}
export interface Lesson extends Base {
  topic_id: string
  title: string
  url: string
  video_id: string
  position: number
  completed: boolean
  notes: string
  last_opened_at: string | null
}
export type Entity = Subject | Topic | Lesson
export interface Pending {
  table: Table
  record_id: string
  baseRevision: number
  patch: Record<string, unknown>
  mutation_id: string
  conflict?: { row: Entity | null; reason?: string }
}
export interface Workspace {
  subjects: Record<string, Subject>
  topics: Record<string, Topic>
  lessons: Record<string, Lesson>
  pending: Record<string, Pending>
  lastSynced: string | null
}
export const emptyWorkspace = (): Workspace => ({
  subjects: {},
  topics: {},
  lessons: {},
  pending: {},
  lastSynced: null,
})
export const ordered = <T extends { position: number; id: string }>(
  items: T[],
) =>
  [...items].sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
export const subjectsOf = (w: Workspace) =>
  Object.values(w.subjects).filter((s) => !s.deleted_at)
export const topicsOf = (w: Workspace, subjectId: string) =>
  w.subjects[subjectId]?.deleted_at === null
    ? ordered(
        Object.values(w.topics).filter(
          (t) => t.subject_id === subjectId && !t.deleted_at,
        ),
      )
    : []
export const lessonsOf = (w: Workspace, topicId: string) => {
  const topic = w.topics[topicId]
  return topic &&
    !topic.deleted_at &&
    w.subjects[topic.subject_id]?.deleted_at === null
    ? ordered(
        Object.values(w.lessons).filter(
          (l) => l.topic_id === topicId && !l.deleted_at,
        ),
      )
    : []
}
export const subjectLessons = (w: Workspace, id: string) =>
  topicsOf(w, id).flatMap((t) => lessonsOf(w, t.id))
export const allLessons = (w: Workspace) =>
  subjectsOf(w).flatMap((s) => subjectLessons(w, s.id))
export function progress(lessons: Lesson[]) {
  const completed = lessons.filter((l) => l.completed).length
  return {
    completed,
    total: lessons.length,
    percent: lessons.length
      ? Math.round((completed / lessons.length) * 100)
      : 0,
  }
}
export function resumeLesson(lessons: Lesson[]) {
  const unfinished = lessons.filter((l) => !l.completed)
  return [...unfinished].sort((a, b) =>
    (b.last_opened_at || '').localeCompare(a.last_opened_at || ''),
  )[0]
}
export function youtubeId(input: string): string | null {
  try {
    const url = new URL(input.trim())
    if (!['https:', 'http:'].includes(url.protocol)) return null
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    let id: string | null = null
    if (host === 'youtu.be') id = url.pathname.split('/')[1]
    if (
      [
        'youtube.com',
        'm.youtube.com',
        'music.youtube.com',
        'youtube-nocookie.com',
      ].includes(host)
    ) {
      const parts = url.pathname.split('/')
      id =
        url.pathname === '/watch'
          ? url.searchParams.get('v')
          : ['shorts', 'embed', 'live'].includes(parts[1])
            ? parts[2]
            : null
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null
  } catch {
    return null
  }
}
