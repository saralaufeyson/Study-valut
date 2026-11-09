import pack from '../data/gate-2027-cs.json'
import { putChange } from './database'
import { subjectsOf, topicsOf } from './model'
import type { Color, Workspace } from './model'

export const gateCS = pack
export const starterTopicCount = pack.subjects.reduce(
  (total, subject) => total + subject.topics.length,
  0,
)
const normalized = (name: string) =>
  name.trim().replace(/\s+/g, ' ').toLowerCase()

// Called inside the workspace transaction: add missing rows, preserving all edits.
export function addGateCSStarter(workspace: Workspace, cloud: boolean) {
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
          color: template.color as Color,
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
