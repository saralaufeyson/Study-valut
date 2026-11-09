import { describe, expect, it } from 'vitest'
import { addGateCSStarter, gateCS, starterTopicCount } from './starter-pack'
import {
  allLessons,
  colors,
  emptyWorkspace,
  progress,
  subjectsOf,
  topicsOf,
} from './model'
import { putChange } from './database'
import { makeBackup, parseBackup } from './backup'

describe('GATE CS starter library', () => {
  it('creates a valid importable library with ordered topics and zero lesson progress', () => {
    const workspace = emptyWorkspace()
    const added = addGateCSStarter(workspace, false)
    expect(added).toEqual({ subjects: 11, topics: starterTopicCount })
    expect(
      gateCS.subjects.every((s) =>
        colors.includes(s.color as (typeof colors)[number]),
      ),
    ).toBe(true)
    expect(
      parseBackup(JSON.stringify(makeBackup(workspace))).topics,
    ).toHaveLength(starterTopicCount)
    for (const subject of subjectsOf(workspace)) {
      const topics = topicsOf(workspace, subject.id)
      expect(topics.map((t) => t.position)).toEqual(topics.map((_, i) => i))
    }
    expect(progress(allLessons(workspace))).toEqual({
      completed: 0,
      total: 0,
      percent: 0,
    })
    expect(workspace.pending).toEqual({})
  })

  it('adds only missing rows and preserves existing edits, ordering, lessons, and progress', () => {
    const workspace = emptyWorkspace()
    const subjectId = crypto.randomUUID(),
      topicId = crypto.randomUUID(),
      lessonId = crypto.randomUUID()
    const template = gateCS.subjects.find((s) => s.name === 'Algorithms')!
    putChange(
      workspace,
      'subjects',
      subjectId,
      {
        name: '  ALGORITHMS  ',
        description: 'My study plan',
        color: 'rose',
        icon: 'art',
      },
      false,
    )
    putChange(
      workspace,
      'topics',
      topicId,
      { subject_id: subjectId, name: template.topics[0], position: 12 },
      false,
    )
    putChange(
      workspace,
      'lessons',
      lessonId,
      {
        topic_id: topicId,
        title: 'My own lesson',
        url: 'https://youtu.be/fNk_zzaMoSs',
        video_id: 'fNk_zzaMoSs',
        position: 0,
        completed: true,
        notes: 'Keep my revision notes',
        last_opened_at: null,
      },
      false,
    )
    const original = structuredClone(workspace)
    expect(addGateCSStarter(workspace, false)).toEqual({
      subjects: 10,
      topics: starterTopicCount - 1,
    })
    expect(workspace.subjects[subjectId]).toEqual(original.subjects[subjectId])
    expect(workspace.topics[topicId]).toEqual(original.topics[topicId])
    expect(workspace.lessons).toEqual(original.lessons)
    expect(topicsOf(workspace, subjectId)[1].position).toBe(13)
    const after = structuredClone(workspace)
    expect(addGateCSStarter(workspace, false)).toEqual({
      subjects: 0,
      topics: 0,
    })
    expect(workspace).toEqual(after)
  })

  it('queues every new record for account sync while leaving other workspaces untouched', () => {
    const account = emptyWorkspace(),
      guest = emptyWorkspace()
    addGateCSStarter(account, true)
    expect(Object.values(account.pending)).toHaveLength(11 + starterTopicCount)
    expect(
      Object.values(account.pending).every(
        (p) => p.baseRevision === 0 && p.table !== 'lessons',
      ),
    ).toBe(true)
    expect(guest).toEqual(emptyWorkspace())
  })
})
