import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'
const owner = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'
const other = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'
let db: PGlite
async function actAs(id: string) {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id])
}
async function apply(
  table: string,
  id: string,
  revision: number,
  patch: object,
  mutation = crypto.randomUUID(),
) {
  const { rows } = await db.query<{
    result: { conflict: boolean; row: Record<string, unknown>; reason: string }
  }>('select public.apply_study_change($1,$2,$3,$4,$5) as result', [
    table,
    id,
    revision,
    JSON.stringify(patch),
    mutation,
  ])
  return rows[0].result
}
describe('PostgreSQL migration and sync RPC', () => {
  beforeAll(async () => {
    db = new PGlite()
    await db.exec(
      "create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$; grant usage on schema public, auth to authenticated;",
    )
    // Reproduce Supabase's direct default grants, not just PostgreSQL's PUBLIC grant.
    await db.exec(
      'alter default privileges in schema public grant execute on functions to anon, authenticated;',
    )
    for (const migration of readdirSync('supabase/migrations')
      .filter((name) => name.endsWith('.sql'))
      .sort()) {
      await db.exec(readFileSync(`supabase/migrations/${migration}`, 'utf8'))
    }
  }, 30000)
  beforeEach(async () => {
    await db.exec(
      'reset role; truncate public.study_mutation_receipts, public.lessons, public.topics, public.subjects, auth.users cascade;',
    )
    await db.query('insert into auth.users values ($1), ($2)', [owner, other])
    await actAs(owner)
  })
  afterAll(async () => {
    await db?.close()
  })
  it('creates and updates parents without breaking foreign keys', async () => {
    const s = crypto.randomUUID(),
      t = crypto.randomUUID(),
      l = crypto.randomUUID()
    expect((await apply('subjects', s, 0, { name: 'Math' })).row.revision).toBe(
      1,
    )
    await apply('topics', t, 0, { subject_id: s, name: 'Algebra', position: 0 })
    await apply('lessons', l, 0, {
      topic_id: t,
      title: 'Lesson',
      url: 'https://youtu.be/dQw4w9WgXcQ',
      video_id: 'dQw4w9WgXcQ',
    })
    expect(
      (await apply('subjects', s, 1, { name: 'Mathematics' })).row.name,
    ).toBe('Mathematics')
    expect(
      (await apply('lessons', l, 1, { completed: true })).row.completed,
    ).toBe(true)
  })
  it('rejects stale device writes and preserves the server version', async () => {
    const id = crypto.randomUUID()
    await apply('subjects', id, 0, { name: 'First' })
    await apply('subjects', id, 1, { name: 'Laptop A' })
    const result = await apply('subjects', id, 1, { name: 'Laptop B' })
    expect(result.conflict).toBe(true)
    expect(result.row.name).toBe('Laptop A')
    expect(result.row.revision).toBe(2)
  })
  it('retries an accepted mutation idempotently', async () => {
    const id = crypto.randomUUID(),
      mutation = crypto.randomUUID()
    const first = await apply('subjects', id, 0, { name: 'Once' }, mutation)
    const retry = await apply('subjects', id, 0, { name: 'Once' }, mutation)
    expect(retry).toEqual(first)
    expect((await db.query('select * from public.subjects')).rows).toHaveLength(
      1,
    )
  })
  it('enforces private reads and rejects direct writes that bypass revisions', async () => {
    const id = crypto.randomUUID()
    await apply('subjects', id, 0, { name: 'Private' })
    await db.exec('set role authenticated')
    await actAs(other)
    expect((await db.query('select * from public.subjects')).rows).toHaveLength(
      0,
    )
    await expect(
      db.query('update public.subjects set name = $1 where id = $2', [
        'Bypass',
        id,
      ]),
    ).rejects.toThrow('permission denied')
    await actAs(owner)
    expect((await db.query('select * from public.subjects')).rows).toHaveLength(
      1,
    )
  })
  it('does not let another account attach children to a private subject', async () => {
    const s = crypto.randomUUID()
    await apply('subjects', s, 0, { name: 'Private' })
    await actAs(other)
    expect(
      (
        await apply('topics', crypto.randomUUID(), 0, {
          subject_id: s,
          name: 'Intruder',
        })
      ).reason,
    ).toBe('parent_deleted')
  })
  it('blocks children being created or edited under deleted parents', async () => {
    const s = crypto.randomUUID()
    await apply('subjects', s, 0, { name: 'Deleted later' })
    await apply('subjects', s, 1, { deleted_at: new Date().toISOString() })
    expect(
      (
        await apply('topics', crypto.randomUUID(), 0, {
          subject_id: s,
          name: 'Offline topic',
        })
      ).reason,
    ).toBe('parent_deleted')
  })
  it('requires authentication and rejects reserved-field injection', async () => {
    await expect(
      apply('subjects', crypto.randomUUID(), 0, { name: 'No', user_id: other }),
    ).rejects.toThrow('Invalid field')
    await actAs('')
    await expect(
      apply('subjects', crypto.randomUUID(), 0, { name: 'No' }),
    ).rejects.toThrow('Authentication required')
  })
  it('removes direct anonymous function grants inherited from Supabase defaults', async () => {
    const result = await db.query<{ allowed: boolean }>(
      "select has_function_privilege('anon', 'public.apply_study_change(text,uuid,integer,jsonb,uuid)', 'EXECUTE') as allowed",
    )
    expect(result.rows[0].allowed).toBe(false)
  })
  it('keeps tombstones and rejects late edits to existing children of deleted parents', async () => {
    const s = crypto.randomUUID(),
      t = crypto.randomUUID(),
      l = crypto.randomUUID()
    await apply('subjects', s, 0, { name: 'Course' })
    await apply('topics', t, 0, { subject_id: s, name: 'Topic' })
    await apply('lessons', l, 0, {
      topic_id: t,
      title: 'Lesson',
      url: 'https://youtu.be/dQw4w9WgXcQ',
      video_id: 'dQw4w9WgXcQ',
      notes: 'Server notes',
    })
    await apply('subjects', s, 1, { deleted_at: new Date().toISOString() })
    const child = await apply('lessons', l, 1, { completed: true })
    expect(child.conflict).toBe(true)
    expect(child.reason).toBe('parent_deleted')
    expect(child.row.notes).toBe('Server notes')
    const staleParent = await apply('subjects', s, 1, { name: 'Offline name' })
    expect(staleParent.conflict).toBe(true)
    expect(staleParent.row.deleted_at).toBeTruthy()
  })
})
