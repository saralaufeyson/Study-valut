import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { loadEnv } from 'vite'

export const root = fileURLToPath(new URL('../../', import.meta.url))
export const env = loadEnv('development', root, '')
export const projectUrl = env.VITE_SUPABASE_URL?.trim()
export const publicKey = (
  env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY
)?.trim()
export const projectRef =
  env.SUPABASE_PROJECT_REF ||
  (projectUrl &&
    new URL(projectUrl).hostname.match(/^([a-z]{20})\.supabase\.co$/)?.[1])

export function cli(args, { json = true, cwd = root } = {}) {
  const childEnv = { ...process.env }
  for (const name of ['SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD']) {
    if (env[name]) childEnv[name] = env[name]
  }
  const result = spawnSync(
    process.execPath,
    [
      path.join(root, 'node_modules/supabase/dist/supabase.js'),
      ...args,
      '--agent=yes',
      '--output-format=' + (json ? 'json' : 'text'),
    ],
    {
      cwd,
      env: childEnv,
      encoding: 'utf8',
      windowsHide: true,
      maxBuffer: 20 * 1024 * 1024,
      timeout: 180000,
    },
  )
  if (result.status !== 0 || result.error) {
    let code = 'CLI_ERROR'
    try {
      code = JSON.parse(result.stdout || result.stderr).error?.code || code
    } catch {
      /* Never echo raw CLI errors that could contain credentials. */
    }
    throw new Error(
      `Supabase ${args.slice(0, 2).join(' ')} failed (${code}). Check CLI login and project permissions; no credentials were printed.`,
    )
  }
  const output = result.stdout.trim()
  if (!json) return output
  try {
    return JSON.parse(output)
  } catch {
    for (const line of output.split('\n').reverse()) {
      try {
        return JSON.parse(line)
      } catch {
        /* Some CLI commands emit a status line before JSON. */
      }
    }
    return { message: output }
  }
}
export function target() {
  if (!projectRef || !/^[a-z]{20}$/.test(projectRef))
    throw new Error(
      'Set a valid cloud project URL in .env, or a server-only SUPABASE_PROJECT_REF for a custom domain.',
    )
  return `--remote=${projectRef}`
}
export function findValue(value, key) {
  if (!value || typeof value !== 'object') return undefined
  if (Object.hasOwn(value, key)) return value[key]
  for (const nested of Object.values(value)) {
    const result = findValue(nested, key)
    if (result !== undefined) return result
  }
}
export function readQuery(file) {
  return cli([
    'db',
    'query',
    target(),
    '--read-only',
    '--file',
    path.join(root, file),
  ])
}
