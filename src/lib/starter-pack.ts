import gate from '../data/gate-2027-cs.json'
import cuet from '../data/cuet-pg-coqp11.json'
import bank from '../data/bank-exams-general.json'
import { putChange } from './database'
import { subjectsOf, topicsOf } from './model'
import type { Workspace } from './model'

const packsById = {
  'gate-2027-cs': { ...gate, id: 'gate-2027-cs' },
  'cuet-pg-coqp11': { ...cuet, id: 'cuet-pg-coqp11' },
  'bank-exams-general': { ...bank, id: 'bank-exams-general' },
} as const
export type StarterPackId = keyof typeof packsById
export const starterPacks = Object.values(packsById)
export type StarterPack = (typeof starterPacks)[number]
export const getStarterPack = (id: StarterPackId): StarterPack => {
  if (!Object.prototype.hasOwnProperty.call(packsById, id))
    throw new Error('Choose a valid starter pack.')
  return packsById[id]
}
export const topicCount = (pack: StarterPack) =>
  pack.subjects.reduce((total, subject) => total + subject.topics.length, 0)
const normalized = (name: string) =>
  name.trim().replace(/\s+/g, ' ').toLowerCase()

// Called inside the workspace transaction: add missing rows, preserving all edits.
export function addStarterPack(
  workspace: Workspace,
  cloud: boolean,
  id: StarterPackId,
) {
  const pack = getStarterPack(id)
  let subjects = 0
  let topics = 0
  for (const template of pack.subjects) {
    let subject = subjectsOf(workspace).find(
      (row) => normalized(row.name) === normalized(template.name),
    )
    if (!subject) {
      const id = crypto.randomUUID()
      putChange(
        workspace,
        'subjects',
        id,
        {
          name: template.name,
          description: template.description,
          color: template.color,
          icon: template.icon,
        },
        cloud,
      )
      subject = workspace.subjects[id]
      subjects++
    }
    const existing = topicsOf(workspace, subject.id)
    const names = new Set(existing.map((row) => normalized(row.name)))
    let position = existing.reduce(
      (max, row) => Math.max(max, row.position + 1),
      0,
    )
    for (const name of template.topics) {
      if (names.has(normalized(name))) continue
      putChange(
        workspace,
        'topics',
        crypto.randomUUID(),
        {
          subject_id: subject.id,
          name,
          position: position++,
        },
        cloud,
      )
      names.add(normalized(name))
      topics++
    }
  }
  return { subjects, topics }
}
