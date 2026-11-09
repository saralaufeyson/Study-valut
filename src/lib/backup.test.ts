import { describe, expect, it } from 'vitest'
import { makeBackup, parseBackup } from './backup'
import { emptyWorkspace } from './model'
import { putChange } from './database'
function sample() {
  const w = emptyWorkspace(),
    s = crypto.randomUUID(),
    t = crypto.randomUUID(),
    l = crypto.randomUUID()
  putChange(
    w,
    'subjects',
    s,
    { name: 'Math', description: '', color: 'sage', icon: 'book' },
    false,
  )
  putChange(
    w,
    'topics',
    t,
    { subject_id: s, name: 'Algebra', position: 0 },
    false,
  )
  putChange(
    w,
    'lessons',
    l,
    {
      topic_id: t,
      title: 'Lesson',
      url: 'https://youtu.be/dQw4w9WgXcQ',
      video_id: 'dQw4w9WgXcQ',
      position: 0,
      completed: true,
      notes: 'Keep this',
      last_opened_at: null,
    },
    false,
  )
  return makeBackup(w)
}
describe('JSON backups', () => {
  it('rejects invalid ordering before it reaches the sync queue', () => {
    const backup = sample()
    backup.topics[0].position = -1
    expect(() => parseBackup(JSON.stringify(backup))).toThrow('Invalid topic')
  })
  it('round trips notes and completion', () => {
    const backup = sample()
    expect(parseBackup(JSON.stringify(backup))).toEqual(backup)
  })
  it('rejects broken hierarchy', () => {
    const backup = sample()
    backup.topics[0].subject_id = crypto.randomUUID()
    expect(() => parseBackup(JSON.stringify(backup))).toThrow('Invalid topic')
  })
  it('rejects repeated IDs', () => {
    const backup = sample()
    backup.subjects.push(backup.subjects[0])
    expect(() => parseBackup(JSON.stringify(backup))).toThrow('repeated ID')
  })
  it('rejects malicious video URLs', () => {
    const backup = sample()
    backup.lessons[0].url = 'javascript:alert(1)'
    expect(() => parseBackup(JSON.stringify(backup))).toThrow('Invalid lesson')
  })
  it('rejects non-backups without mutating anything', () =>
    expect(() => parseBackup('{"subjects":[]}')).toThrow('valid StudyVault'))
})
