import path from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  cli,
  findValue,
  readQuery,
  projectUrl,
  publicKey,
  root,
  target,
} from './lib/supabase-cloud.mjs'

export async function verifyCloud({ workflow = false } = {}) {
  if (!projectUrl || !publicKey)
    throw new Error('The public Supabase configuration is missing.')
  const auth = await fetch(new URL('/auth/v1/settings', projectUrl), {
    headers: { apikey: publicKey },
    signal: AbortSignal.timeout(20000),
  })
  const settings = await auth.json()
  if (!auth.ok || settings.external?.email !== true)
    throw new Error(
      'Supabase email authentication is not available for this public project key.',
    )
  const security = findValue(
    readQuery('supabase/checks/security.sql'),
    'studyvault_security',
  )
  if (
    !security ||
    security.tables?.length !== 4 ||
    !security.rpc_authenticated ||
    security.rpc_anonymous ||
    !security.rpc_security_definer
  )
    throw new Error(
      'The remote schema or sync function security settings did not pass verification.',
    )
  for (const table of security.tables) {
    if (
      !table.rls ||
      table.authenticated_insert ||
      table.authenticated_update ||
      table.authenticated_delete ||
      table.anonymous_select
    )
      throw new Error(
        `Unexpected remote privileges on ${table.name}. No data was changed by this check.`,
      )
    if (
      table.name !== 'study_mutation_receipts' &&
      (!table.owner_read_policy || !table.authenticated_select)
    )
      throw new Error(`The owner read policy is missing on ${table.name}.`)
  }
  for (const name of ['subjects', 'topics', 'lessons']) {
    const response = await fetch(
      new URL(`/rest/v1/${name}?select=id&limit=0`, projectUrl),
      { headers: { apikey: publicKey }, signal: AbortSignal.timeout(20000) },
    )
    const body = await response.json()
    if (![401, 403].includes(response.status) || body.code !== '42501')
      throw new Error(
        `Anonymous access to ${name} did not return the expected permission denial (${response.status}).`,
      )
  }
  console.log(
    'PASS live email provider, database schema, owner RLS policies, RPC permissions, and anonymous access checks.',
  )
  if (workflow) {
    cli([
      'db',
      'query',
      target(),
      '--file',
      path.join(root, 'supabase/checks/workflow.sql'),
      '--yes',
    ])
    console.log(
      'PASS live subject/topic/lesson CRUD, notes, ordering, completion, progress, conflict handling, idempotent retries, and cross-user isolation. All test fixtures were rolled back.',
    )
  }
  return { schema: true, security: true, emailProvider: true, workflow }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    await verifyCloud({ workflow: process.argv.includes('--workflow') })
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
