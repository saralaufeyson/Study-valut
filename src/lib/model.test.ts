import { describe, expect, it } from 'vitest'
import {
  allLessons,
  emptyWorkspace,
  progress,
  resumeLesson,
  youtubeId,
} from './model'
import { putChange } from './database'
const video = 'dQw4w9WgXcQ'
describe('YouTube links', () => {
  it.each([
    `https://youtube.com/watch?v=${video}&list=PL123`,
    `https://youtu.be/${video}?t=20`,
    `https://www.youtube.com/shorts/${video}`,
    `https://m.youtube.com/watch?v=${video}`,
    `https://youtube.com/live/${video}`,
  ])('accepts a video URL: %s', (input) => expect(youtubeId(input)).toBe(video))
  it.each([
    'javascript:alert(1)',
    `https://youtube.com.evil.test/watch?v=${video}`,
    `https://evil.test/${video}`,
    'https://youtube.com/playlist?list=abc',
    'https://youtube.com/watch?v=short',
    'not a URL',
  ])('rejects invalid or unrelated URLs: %s', (input) =>
    expect(youtubeId(input)).toBeNull(),
  )
})
describe('computed progress and resume', () => {
  const w = emptyWorkspace()
  putChange(w, 'subjects', 's', { name: 'Math' }, false)
  putChange(
    w,
    'topics',
    't',
    { subject_id: 's', name: 'Algebra', position: 0 },
    false,
  )
  putChange(
    w,
    'lessons',
    'a',
    {
      topic_id: 't',
      completed: true,
      position: 0,
      last_opened_at: '2026-11-07',
    },
    false,
  )
  putChange(
    w,
    'lessons',
    'b',
    {
      topic_id: 't',
      completed: false,
      position: 1,
      last_opened_at: '2026-11-06',
    },
    false,
  )
  putChange(
    w,
    'lessons',
    'c',
    { topic_id: 't', completed: false, position: 2 },
    false,
  )
  it('calculates completion from lessons', () =>
    expect(progress(allLessons(w))).toEqual({
      total: 3,
      completed: 1,
      percent: 33,
    }))
  it('resumes the most recently opened unfinished lesson', () =>
    expect(resumeLesson(allLessons(w))?.id).toBe('b'))
  it('handles empty and finished libraries', () => {
    expect(progress([]).percent).toBe(0)
    expect(
      resumeLesson(allLessons(w).filter((l) => l.completed)),
    ).toBeUndefined()
  })
  it('excludes lessons under deleted parents', () => {
    const copy = structuredClone(w)
    copy.subjects.s.deleted_at = '2026-11-07'
    expect(allLessons(copy)).toEqual([])
  })
})
