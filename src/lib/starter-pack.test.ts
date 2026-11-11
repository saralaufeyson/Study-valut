import { describe, expect, it } from 'vitest'
import {
  addStarterPack,
  getStarterPack,
  starterPacks,
  topicCount,
} from './starter-pack'
import type { StarterPackId } from './starter-pack'
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

const normalize = (value: string) =>
  value.trim().replace(/\s+/g, ' ').toLowerCase()

describe('exam starter libraries', () => {
  it.each(starterPacks)(
    '$title creates a valid library with ordered topics and zero fabricated progress',
    (pack) => {
      const workspace = emptyWorkspace()
      expect(addStarterPack(workspace, false, pack.id)).toEqual({
        subjects: pack.subjects.length,
        topics: topicCount(pack),
      })
      expect(
        pack.subjects.every((subject) =>
          colors.some((color) => color === subject.color),
        ),
      ).toBe(true)
      expect(
        new Set(pack.subjects.map((subject) => normalize(subject.name))).size,
      ).toBe(pack.subjects.length)
      for (const subject of pack.subjects)
        expect(new Set(subject.topics.map(normalize)).size).toBe(
          subject.topics.length,
        )
      const backup = makeBackup(workspace)
      expect(parseBackup(JSON.stringify(backup)).topics).toHaveLength(
        topicCount(pack),
      )
      for (const subject of subjectsOf(workspace)) {
        const topics = topicsOf(workspace, subject.id)
        expect(topics.map((topic) => topic.position)).toEqual(
          topics.map((_, index) => index),
        )
      }
      expect(progress(allLessons(workspace))).toEqual({
        completed: 0,
        total: 0,
        percent: 0,
      })
      expect(workspace.pending).toEqual({})
    },
  )

  it.each(starterPacks)(
    '$title can be added twice without duplicates or changes to saved rows',
    (pack) => {
      const workspace = emptyWorkspace()
      addStarterPack(workspace, true, pack.id)
      const saved = structuredClone(workspace)
      expect(addStarterPack(workspace, true, pack.id)).toEqual({
        subjects: 0,
        topics: 0,
      })
      expect(workspace).toEqual(saved)
    },
  )

  it('keeps all three exam libraries separate when imported together', () => {
    const workspace = emptyWorkspace()
    for (const pack of starterPacks) addStarterPack(workspace, false, pack.id)
    expect(subjectsOf(workspace)).toHaveLength(
      starterPacks.reduce((sum, pack) => sum + pack.subjects.length, 0),
    )
    expect(Object.values(workspace.topics)).toHaveLength(
      starterPacks.reduce((sum, pack) => sum + topicCount(pack), 0),
    )
    for (const pack of starterPacks)
      expect(addStarterPack(workspace, false, pack.id)).toEqual({
        subjects: 0,
        topics: 0,
      })
    expect(getStarterPack('gate-2027-cs').subjects).toHaveLength(11)
    expect(topicCount(getStarterPack('gate-2027-cs'))).toBe(77)
    expect(getStarterPack('cuet-pg-coqp11').title).toContain('COQP11')
    expect(
      getStarterPack('cuet-pg-coqp11').subjects.some((subject) =>
        subject.name.includes('Hindi'),
      ),
    ).toBe(true)
    expect(getStarterPack('bank-exams-general').scope).toContain(
      'depend on the exam',
    )
  })

  it('adds missing bank topics after existing ordering while preserving personal content and completed lessons', () => {
    const workspace = emptyWorkspace(),
      pack = getStarterPack('bank-exams-general')
    const subjectId = crypto.randomUUID(),
      topicId = crypto.randomUUID(),
      lessonId = crypto.randomUUID()
    const template = pack.subjects[0]
    putChange(
      workspace,
      'subjects',
      subjectId,
      {
        name: `  ${template.name.toUpperCase()}  `,
        description: 'My personal study plan',
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
    expect(addStarterPack(workspace, false, pack.id)).toEqual({
      subjects: pack.subjects.length - 1,
      topics: topicCount(pack) - 1,
    })
    expect(workspace.subjects[subjectId]).toEqual(original.subjects[subjectId])
    expect(workspace.topics[topicId]).toEqual(original.topics[topicId])
    expect(workspace.lessons).toEqual(original.lessons)
    expect(topicsOf(workspace, subjectId)[1].position).toBe(13)
    expect(
      parseBackup(JSON.stringify(makeBackup(workspace))).lessons[0].notes,
    ).toBe('Keep my revision notes')
  })

  it('queues only the selected CUET pack for account sync and leaves the guest workspace untouched', () => {
    const account = emptyWorkspace(),
      guest = emptyWorkspace(),
      pack = getStarterPack('cuet-pg-coqp11')
    addStarterPack(account, true, pack.id)
    expect(Object.values(account.pending)).toHaveLength(
      pack.subjects.length + topicCount(pack),
    )
    expect(
      Object.values(account.pending).every(
        (change) => change.baseRevision === 0 && change.table !== 'lessons',
      ),
    ).toBe(true)
    expect(
      subjectsOf(account).every((subject) =>
        subject.name.startsWith('CUET PG'),
      ),
    ).toBe(true)
    expect(guest).toEqual(emptyWorkspace())
  })

  it('rejects an invalid selection before saving or accidentally falling back to GATE', () => {
    const workspace = emptyWorkspace()
    for (const id of ['unknown-pack', '__proto__'])
      expect(() =>
        addStarterPack(workspace, true, id as StarterPackId),
      ).toThrow('valid starter pack')
    expect(workspace).toEqual(emptyWorkspace())
  })
})
